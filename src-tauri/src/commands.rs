use std::fs;
use std::path::{Path, PathBuf};
use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension, Transaction as SqliteTx};
use tauri::{AppHandle, Manager, State};

use crate::db::AppState;
use crate::models::{
    Account, AccountLedgerEntry, AppSettings, BackupFileInfo, BillItem, BudgetProgress,
    Category, CategorySpendingReportItem, ChangePinPayload, CreateAccountPayload,
    CreateBillPayload, CreateBudgetPayload, CreateCategoryPayload, CreateDebtPayload,
    CreateHoldingPayload, CreateRecurringRulePayload, CreateShoppingItemPayload,
    CreateTransactionPayload, CreateWarrantyPayload, CsvImportPayload, CsvImportResult,
    DebtItem, ExchangeRateItem, HoldingPerformanceItem, IncomeExpenseTrendItem,
    InvestmentHolding, InvestmentPerformanceReport, MonthSummary, NetWorthSnapshotItem,
    NetWorthSummary, PortfolioSummary, PriceHistoryPoint, RecurringRule, ReportDateFilter,
    SetExchangeRatePayload, ShoppingListItem, SinglePriceUpdatePayload, Tag, Transaction,
    TransactionFilter, UpdateAccountPayload, UpdateBillPayload, UpdateBudgetPayload,
    UpdateCategoryPayload, UpdateDebtPayload, UpdateHoldingPayload,
    UpdateRecurringRulePayload, UpdateTransactionPayload, UpdateWarrantyPayload, WarrantyItem,
    Goal, CreateGoalPayload, UpdateGoalPayload, ContributeGoalPayload,
    BillReminder, UpdateNotificationSettingsPayload, AppUpdateInfo,
    DebtTransactionItem, RecordDebtPaymentPayload, DrawDebtFundsPayload, SpendFromDebtPayload,
    PaymentMethodItem, CreatePaymentMethodPayload, UpdatePaymentMethodPayload,
};

// --- Exchange Rate Helper ---
pub fn get_exchange_rate(conn: &Connection, from_curr: &str, to_curr: &str) -> f64 {
    if from_curr.eq_ignore_ascii_case(to_curr) {
        return 1.0;
    }

    let direct: Result<f64, _> = conn.query_row(
        "SELECT rate FROM exchange_rates WHERE from_currency = ?1 AND to_currency = ?2",
        params![from_curr.to_uppercase(), to_curr.to_uppercase()],
        |r| r.get(0),
    );

    if let Ok(rate) = direct {
        if rate > 0.0 {
            return rate;
        }
    }

    let inverse: Result<f64, _> = conn.query_row(
        "SELECT rate FROM exchange_rates WHERE from_currency = ?1 AND to_currency = ?2",
        params![to_curr.to_uppercase(), from_curr.to_uppercase()],
        |r| r.get(0),
    );

    if let Ok(rate) = inverse {
        if rate > 0.0 {
            return 1.0 / rate;
        }
    }

    1.0
}

// --- Account Balance Recomputation via Ledger (AGENTS.md Section 5.1) ---
pub fn recompute_account_balance(tx: &SqliteTx, account_id: i64) -> Result<f64, rusqlite::Error> {
    let mut stmt = tx.prepare(
        "SELECT id, amount FROM account_ledger WHERE account_id = ?1 ORDER BY id ASC"
    )?;
    let entries: Vec<(i64, f64)> = stmt.query_map(params![account_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?.filter_map(|r| r.ok()).collect();

    let mut running_bal = 0.0;
    for (ledger_id, amount) in entries {
        running_bal = ((running_bal + amount) * 100.0).round() / 100.0;
        tx.execute(
            "UPDATE account_ledger SET balance_after = ?1 WHERE id = ?2",
            params![running_bal, ledger_id],
        )?;
    }

    tx.execute(
        "UPDATE accounts SET current_balance = ?1 WHERE id = ?2",
        params![running_bal, account_id],
    )?;

    Ok(running_bal)
}

// --- Date Math Helpers ---
pub fn advance_month(d: NaiveDate) -> NaiveDate {
    let mut year = d.year();
    let mut month = d.month() + 1;
    if month > 12 {
        month = 1;
        year += 1;
    }
    let day = d.day();
    for test_day in (28..=day).rev() {
        if let Some(date) = NaiveDate::from_ymd_opt(year, month, test_day) {
            return date;
        }
    }
    NaiveDate::from_ymd_opt(year, month, 28).unwrap()
}

pub fn advance_year(d: NaiveDate) -> NaiveDate {
    let year = d.year() + 1;
    let month = d.month();
    let day = d.day();
    if month == 2 && day == 29 {
        NaiveDate::from_ymd_opt(year, 2, 28).unwrap()
    } else {
        NaiveDate::from_ymd_opt(year, month, day).unwrap()
    }
}

pub fn calculate_budget_period(
    period_type: &str,
    start_date_str: &str,
    end_date_str: Option<&str>,
    today: NaiveDate,
) -> (NaiveDate, NaiveDate, Option<(NaiveDate, NaiveDate)>) {
    let start_date = NaiveDate::parse_from_str(start_date_str, "%Y-%m-%d")
        .unwrap_or_else(|_| today);

    match period_type {
        "weekly" => {
            if today < start_date {
                let p_end = start_date + Duration::days(6);
                (start_date, p_end, None)
            } else {
                let diff_days = (today - start_date).num_days();
                let cycles = diff_days / 7;
                let cur_start = start_date + Duration::days(cycles * 7);
                let cur_end = cur_start + Duration::days(6);
                let prev_period = if cycles > 0 {
                    let prev_start = cur_start - Duration::days(7);
                    let prev_end = cur_start - Duration::days(1);
                    Some((prev_start, prev_end))
                } else {
                    None
                };
                (cur_start, cur_end, prev_period)
            }
        }
        "monthly" => {
            if today < start_date {
                let cur_end = advance_month(start_date) - Duration::days(1);
                (start_date, cur_end, None)
            } else {
                let mut cur_start = start_date;
                let mut next_start = advance_month(cur_start);
                let mut prev_period: Option<(NaiveDate, NaiveDate)> = None;

                while next_start <= today {
                    let p_end = next_start - Duration::days(1);
                    prev_period = Some((cur_start, p_end));
                    cur_start = next_start;
                    next_start = advance_month(cur_start);
                }
                let cur_end = next_start - Duration::days(1);
                (cur_start, cur_end, prev_period)
            }
        }
        "custom" => {
            let end_date = end_date_str
                .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
                .unwrap_or_else(|| start_date + Duration::days(30));
            (start_date, end_date, None)
        }
        _ => (start_date, start_date + Duration::days(30), None),
    }
}

// ==========================================
// Settings & Auth Commands
// ==========================================

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Auto-seed defaults if missing (e.g. after reset or first launch)
    let _ = crate::db::seed_defaults(&conn);

    let mut stmt = conn
        .prepare(
            "SELECT id, base_currency, pin_hash, theme, last_backup_at, last_networth_snapshot_at,
                    notify_os, notify_advance_days, last_notification_check_at
             FROM app_settings WHERE id = 1"
        )
        .map_err(|e| e.to_string())?;

    let settings = stmt
        .query_row([], |row| {
            let pin_hash: Option<String> = row.get(2)?;
            let notify_os_val: i64 = row.get(6).unwrap_or(1);
            let advance_days_val: i64 = row.get(7).unwrap_or(1);

            Ok(AppSettings {
                id: row.get(0)?,
                base_currency: row.get(1)?,
                has_pin: pin_hash.map(|p| !p.trim().is_empty()).unwrap_or(false),
                theme: row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "dark".to_string()),
                last_backup_at: row.get(4)?,
                last_networth_snapshot_at: row.get(5)?,
                notify_os: notify_os_val == 1,
                notify_advance_days: advance_days_val,
                last_notification_check_at: row.get(8)?,
            })
        })
        .unwrap_or_else(|_| AppSettings::default());

    Ok(settings)
}

#[tauri::command]
pub fn set_initial_pin(state: State<'_, AppState>, pin: String) -> Result<(), String> {
    let pin_trimmed = pin.trim();
    if pin_trimmed.len() != 6 || !pin_trimmed.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be exactly 6 digits (0-9)".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = crate::db::seed_defaults(&conn);

    let existing_pin_hash: Option<String> = conn
        .query_row("SELECT pin_hash FROM app_settings WHERE id = 1", [], |r| r.get(0))
        .unwrap_or(None);

    if let Some(hash) = existing_pin_hash {
        if !hash.trim().is_empty() {
            return Err("A PIN is already configured. Use PIN verification or reset.".to_string());
        }
    }

    let hashed = bcrypt::hash(pin_trimmed, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash PIN: {}", e))?;

    conn.execute(
        "INSERT INTO app_settings (id, pin_hash) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET pin_hash = excluded.pin_hash",
        params![hashed],
    ).map_err(|e| format!("Failed to save PIN: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn verify_pin(state: State<'_, AppState>, pin: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let pin_hash: Option<String> = conn
        .query_row("SELECT pin_hash FROM app_settings WHERE id = 1", [], |r| r.get(0))
        .unwrap_or(None);

    let hash = match pin_hash {
        Some(h) if !h.trim().is_empty() => h,
        _ => return Err("No PIN has been configured yet".to_string()),
    };

    let is_valid = bcrypt::verify(pin.trim(), &hash).unwrap_or(false);
    Ok(is_valid)
}

#[tauri::command]
pub fn wipe_all_data(state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute_batch(
        "DELETE FROM transaction_tags;
         DELETE FROM transactions;
         DELETE FROM account_ledger;
         DELETE FROM budget_categories;
         DELETE FROM budgets;
         DELETE FROM bills;
         DELETE FROM investment_price_history;
         DELETE FROM investment_holdings;
         DELETE FROM exchange_rates;
         DELETE FROM debts;
         DELETE FROM networth_history;
         DELETE FROM shopping_list_items;
         DELETE FROM warranties;
         DELETE FROM recurring_rules;
         DELETE FROM goal_contributions;
         DELETE FROM goals;
         DELETE FROM tags;
         DELETE FROM categories;
         DELETE FROM accounts;
         DELETE FROM app_settings;
         DELETE FROM sqlite_sequence;"
    ).map_err(|e| format!("Failed to wipe database: {}", e))?;

    // Immediately re-seed app_settings, categories, tags, and exchange rates in the same transaction
    crate::db::seed_defaults(&tx)?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

// ==========================================
// Accounts Commands
// ==========================================

#[tauri::command]
pub fn get_accounts(state: State<'_, AppState>, include_archived: bool) -> Result<Vec<Account>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let query = if include_archived {
        "SELECT id, name, type, currency, opening_balance, current_balance, icon, color, is_archived, created_at FROM accounts ORDER BY is_archived ASC, id ASC"
    } else {
        "SELECT id, name, type, currency, opening_balance, current_balance, icon, color, is_archived, created_at FROM accounts WHERE is_archived = 0 ORDER BY id ASC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let account_iter = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                account_type: row.get(2)?,
                currency: row.get(3)?,
                opening_balance: row.get(4)?,
                current_balance: row.get(5)?,
                icon: row.get(6)?,
                color: row.get(7)?,
                is_archived: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut accounts = Vec::new();
    for acc in account_iter {
        accounts.push(acc.map_err(|e| e.to_string())?);
    }

    Ok(accounts)
}

#[tauri::command]
pub fn create_account(
    state: State<'_, AppState>,
    payload: CreateAccountPayload,
) -> Result<Account, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Account name cannot be empty".to_string());
    }

    let allowed_types = ["bank", "cash", "investment", "credit_card", "other"];
    if !allowed_types.contains(&payload.account_type.as_str()) {
        return Err(format!("Invalid account type: {}", payload.account_type));
    }

    let opening_bal = (payload.opening_balance * 100.0).round() / 100.0;
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO accounts (name, type, currency, opening_balance, current_balance, icon, color, is_archived)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0)",
        params![
            name_trimmed,
            payload.account_type,
            payload.currency.to_uppercase(),
            opening_bal,
            0.0,
            payload.icon,
            payload.color
        ],
    ).map_err(|e| format!("Failed to insert account: {}", e))?;

    let account_id = tx.last_insert_rowid();

    tx.execute(
        "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
         VALUES (?1, 'opening', ?2, ?2, 'account', ?1)",
        params![account_id, opening_bal],
    ).map_err(|e| format!("Failed to insert opening ledger row: {}", e))?;

    recompute_account_balance(&tx, account_id).map_err(|e| e.to_string())?;

    let created_account = tx.query_row(
        "SELECT id, name, type, currency, opening_balance, current_balance, icon, color, is_archived, created_at
         FROM accounts WHERE id = ?1",
        params![account_id],
        |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                account_type: row.get(2)?,
                currency: row.get(3)?,
                opening_balance: row.get(4)?,
                current_balance: row.get(5)?,
                icon: row.get(6)?,
                color: row.get(7)?,
                is_archived: row.get(8)?,
                created_at: row.get(9)?,
            })
        },
    ).map_err(|e| format!("Failed to fetch created account: {}", e))?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(created_account)
}

#[tauri::command]
pub fn update_account(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdateAccountPayload,
) -> Result<Account, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Account name cannot be empty".to_string());
    }

    let allowed_types = ["bank", "cash", "investment", "credit_card", "other"];
    if !allowed_types.contains(&payload.account_type.as_str()) {
        return Err(format!("Invalid account type: {}", payload.account_type));
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE accounts SET name = ?1, type = ?2, currency = ?3, icon = ?4, color = ?5 WHERE id = ?6",
        params![
            name_trimmed,
            payload.account_type,
            payload.currency.to_uppercase(),
            payload.icon,
            payload.color,
            id
        ],
    ).map_err(|e| format!("Failed to update account: {}", e))?;

    let updated = conn.query_row(
        "SELECT id, name, type, currency, opening_balance, current_balance, icon, color, is_archived, created_at
         FROM accounts WHERE id = ?1",
        params![id],
        |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                account_type: row.get(2)?,
                currency: row.get(3)?,
                opening_balance: row.get(4)?,
                current_balance: row.get(5)?,
                icon: row.get(6)?,
                color: row.get(7)?,
                is_archived: row.get(8)?,
                created_at: row.get(9)?,
            })
        },
    ).map_err(|e| format!("Failed to fetch updated account: {}", e))?;

    Ok(updated)
}

#[tauri::command]
pub fn archive_account(state: State<'_, AppState>, id: i64, archive: bool) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let val = if archive { 1 } else { 0 };
    conn.execute(
        "UPDATE accounts SET is_archived = ?1 WHERE id = ?2",
        params![val, id],
    ).map_err(|e| format!("Failed to archive account: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_account(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let txn_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM transactions WHERE account_id = ?1 OR transfer_to_account_id = ?1",
        params![id],
        |r| r.get(0),
    ).unwrap_or(0);

    if txn_count > 0 {
        return Err("Cannot delete account with existing transactions. Please archive it instead to preserve financial history.".to_string());
    }

    let bill_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM bills WHERE account_id = ?1",
        params![id],
        |r| r.get(0),
    ).unwrap_or(0);
    if bill_count > 0 {
        return Err("Cannot delete account associated with existing bills. Please reassign or delete those bills first.".to_string());
    }

    let recurring_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM recurring_rules WHERE account_id = ?1",
        params![id],
        |r| r.get(0),
    ).unwrap_or(0);
    if recurring_count > 0 {
        return Err("Cannot delete account associated with recurring rules. Please reassign or delete those rules first.".to_string());
    }

    let debt_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM debts WHERE account_id = ?1",
        params![id],
        |r| r.get(0),
    ).unwrap_or(0);
    if debt_count > 0 {
        return Err("Cannot delete account associated with debt tracking. Please settle or delete those debts first.".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM account_ledger WHERE account_id = ?1", params![id])
        .map_err(|e| format!("Failed to clean account ledger: {}", e))?;
    tx.execute("DELETE FROM accounts WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete account: {}", e))?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_account_ledger(
    state: State<'_, AppState>,
    account_id: i64,
) -> Result<Vec<AccountLedgerEntry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date
         FROM account_ledger WHERE account_id = ?1 ORDER BY id DESC",
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![account_id], |row| {
        Ok(AccountLedgerEntry {
            id: row.get(0)?,
            account_id: row.get(1)?,
            txn_type: row.get(2)?,
            amount: row.get(3)?,
            balance_after: row.get(4)?,
            reference_type: row.get(5)?,
            reference_id: row.get(6)?,
            txn_date: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for entry in rows {
        entries.push(entry.map_err(|e| e.to_string())?);
    }

    Ok(entries)
}

// ==========================================
// Category Commands (Task 1)
// ==========================================

#[tauri::command]
pub fn get_categories(state: State<'_, AppState>) -> Result<Vec<Category>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, name, kind, parent_id, icon, color FROM categories ORDER BY kind ASC, name ASC",
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            kind: row.get(2)?,
            parent_id: row.get(3)?,
            icon: row.get(4)?,
            color: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut categories = Vec::new();
    for c in rows {
        categories.push(c.map_err(|e| e.to_string())?);
    }

    Ok(categories)
}

#[tauri::command]
pub fn create_category(
    state: State<'_, AppState>,
    payload: CreateCategoryPayload,
) -> Result<Category, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    if payload.kind != "income" && payload.kind != "expense" {
        return Err("Category kind must be either 'income' or 'expense'".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO categories (name, kind, parent_id, icon, color) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![name_trimmed, payload.kind, payload.parent_id, payload.icon, payload.color],
    ).map_err(|e| format!("Failed to create category: {}", e))?;

    let cat_id = conn.last_insert_rowid();

    let category = conn.query_row(
        "SELECT id, name, kind, parent_id, icon, color FROM categories WHERE id = ?1",
        params![cat_id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                kind: row.get(2)?,
                parent_id: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
            })
        },
    ).map_err(|e| e.to_string())?;

    Ok(category)
}

#[tauri::command]
pub fn update_category(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdateCategoryPayload,
) -> Result<Category, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    if payload.kind != "income" && payload.kind != "expense" {
        return Err("Category kind must be either 'income' or 'expense'".to_string());
    }
    if let Some(pid) = payload.parent_id {
        if pid == id {
            return Err("A category cannot be its own parent".to_string());
        }
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE categories SET name = ?1, kind = ?2, parent_id = ?3, icon = ?4, color = ?5 WHERE id = ?6",
        params![name_trimmed, payload.kind, payload.parent_id, payload.icon, payload.color, id],
    ).map_err(|e| format!("Failed to update category: {}", e))?;

    let category = conn.query_row(
        "SELECT id, name, kind, parent_id, icon, color FROM categories WHERE id = ?1",
        params![id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                kind: row.get(2)?,
                parent_id: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
            })
        },
    ).map_err(|e| e.to_string())?;

    Ok(category)
}

#[tauri::command]
pub fn delete_category(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Check if used in transactions
    let txn_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM transactions WHERE category_id = ?1",
        params![id],
        |r| r.get(0),
    ).unwrap_or(0);

    if txn_count > 0 {
        return Err(format!(
            "Cannot delete category because it is used in {} transaction(s). Please reassign those transactions first.",
            txn_count
        ));
    }

    // Check if used in recurring rules
    let rule_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM recurring_rules WHERE category_id = ?1",
        params![id],
        |r| r.get(0),
    ).unwrap_or(0);

    if rule_count > 0 {
        return Err(format!(
            "Cannot delete category because it is used in {} recurring rule(s). Please edit or delete those rules first.",
            rule_count
        ));
    }

    // Check if has child subcategories
    let sub_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM categories WHERE parent_id = ?1",
        params![id],
        |r| r.get(0),
    ).unwrap_or(0);

    if sub_count > 0 {
        return Err(format!(
            "Cannot delete category because it has {} subcategories. Please reassign or delete the subcategories first.",
            sub_count
        ));
    }

    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete category: {}", e))?;

    Ok(())
}

// ==========================================
// Tags Commands
// ==========================================

#[tauri::command]
pub fn get_tags(state: State<'_, AppState>) -> Result<Vec<Tag>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name FROM tags ORDER BY name ASC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for t in rows {
        tags.push(t.map_err(|e| e.to_string())?);
    }

    Ok(tags)
}

// ==========================================
// Transactions Core Commands (Tasks 2, 3, 4, 5)
// ==========================================

#[tauri::command]
pub fn create_transaction(
    state: State<'_, AppState>,
    payload: CreateTransactionPayload,
) -> Result<Transaction, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    if payload.amount <= 0.0 {
        return Err("Transaction amount must be greater than zero".to_string());
    }

    let allowed_types = ["income", "expense", "transfer"];
    if !allowed_types.contains(&payload.txn_type.as_str()) {
        return Err(format!("Invalid transaction type: {}", payload.txn_type));
    }

    let rounded_amount = (payload.amount * 100.0).round() / 100.0;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Fetch Source Account Currency
    let src_currency: String = tx.query_row(
        "SELECT currency FROM accounts WHERE id = ?1",
        params![payload.account_id],
        |r| r.get(0),
    ).map_err(|_| "Source account not found".to_string())?;

    // 2. Base currency & rate calculation
    let base_currency: String = tx.query_row(
        "SELECT base_currency FROM app_settings WHERE id = 1",
        [],
        |r| r.get(0),
    ).unwrap_or_else(|_| "INR".to_string());

    let rate = get_exchange_rate(&tx, &src_currency, &base_currency);
    let base_amount = ((rounded_amount * rate) * 100.0).round() / 100.0;

    let (category_id, transfer_to_account_id) = if payload.txn_type == "transfer" {
        let dest_id = payload.transfer_to_account_id
            .ok_or_else(|| "Destination account is required for a transfer".to_string())?;

        if dest_id == payload.account_id {
            return Err("Source and destination accounts cannot be the same".to_string());
        }

        // Verify destination exists
        let _: String = tx.query_row(
            "SELECT currency FROM accounts WHERE id = ?1",
            params![dest_id],
            |r| r.get(0),
        ).map_err(|_| "Destination account not found".to_string())?;

        (None, Some(dest_id))
    } else {
        let verified_cat_id = payload.category_id.and_then(|cat_id| {
            let exists: bool = tx.query_row(
                "SELECT 1 FROM categories WHERE id = ?1",
                params![cat_id],
                |_| Ok(true),
            ).unwrap_or(false);
            if exists { Some(cat_id) } else { None }
        });
        (verified_cat_id, None)
    };

    let is_confirmed_val = if payload.is_confirmed { 1 } else { 0 };

    // 3. Insert Transaction row
    tx.execute(
        "INSERT INTO transactions (
            account_id, type, category_id, transfer_to_account_id,
            amount, base_amount, exchange_rate_used, payment_type,
            txn_date, note, is_confirmed
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            payload.account_id,
            payload.txn_type,
            category_id,
            transfer_to_account_id,
            rounded_amount,
            base_amount,
            rate,
            payload.payment_type,
            payload.txn_date,
            payload.note,
            is_confirmed_val,
        ],
    ).map_err(|e| format!("Failed to insert transaction: {}", e))?;

    let txn_id = tx.last_insert_rowid();

    // 4. Atomic Ledger Writes (AGENTS.md Section 5.1)
    match payload.txn_type.as_str() {
        "income" => {
            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'income', ?2, 0, 'transaction', ?3, ?4)",
                params![payload.account_id, rounded_amount, txn_id, payload.txn_date],
            ).map_err(|e| format!("Failed to insert ledger row: {}", e))?;
            recompute_account_balance(&tx, payload.account_id).map_err(|e| e.to_string())?;
        }
        "expense" => {
            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'expense', ?2, 0, 'transaction', ?3, ?4)",
                params![payload.account_id, -rounded_amount, txn_id, payload.txn_date],
            ).map_err(|e| format!("Failed to insert ledger row: {}", e))?;
            recompute_account_balance(&tx, payload.account_id).map_err(|e| e.to_string())?;
        }
        "transfer" => {
            let dest_id = transfer_to_account_id.unwrap();
            let dest_currency: String = tx.query_row(
                "SELECT currency FROM accounts WHERE id = ?1",
                params![dest_id],
                |r| r.get(0),
            ).unwrap();

            let dest_rate = get_exchange_rate(&tx, &src_currency, &dest_currency);
            let dest_amount = ((rounded_amount * dest_rate) * 100.0).round() / 100.0;

            // Source account decreases
            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'transfer_out', ?2, 0, 'transaction', ?3, ?4)",
                params![payload.account_id, -rounded_amount, txn_id, payload.txn_date],
            ).map_err(|e| format!("Failed to insert source transfer ledger row: {}", e))?;
            recompute_account_balance(&tx, payload.account_id).map_err(|e| e.to_string())?;

            // Destination account increases
            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'transfer_in', ?2, 0, 'transaction', ?3, ?4)",
                params![dest_id, dest_amount, txn_id, payload.txn_date],
            ).map_err(|e| format!("Failed to insert destination transfer ledger row: {}", e))?;
            recompute_account_balance(&tx, dest_id).map_err(|e| e.to_string())?;
        }
        _ => {}
    }

    // 5. Handle Tags (Create on the fly)
    for tag_str in payload.tags {
        let trimmed = tag_str.trim();
        if !trimmed.is_empty() {
            tx.execute(
                "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
                params![trimmed],
            ).map_err(|e| e.to_string())?;

            let tag_id: i64 = tx.query_row(
                "SELECT id FROM tags WHERE name = ?1",
                params![trimmed],
                |r| r.get(0),
            ).map_err(|e| e.to_string())?;

            tx.execute(
                "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?1, ?2)",
                params![txn_id, tag_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 6. Handle linked Warranty if provided
    if let Some(w) = payload.warranty {
        if !w.item_name.trim().is_empty() {
            let p_date = w.purchase_date.unwrap_or_else(|| payload.txn_date.clone());
            tx.execute(
                "INSERT INTO warranties (item_name, purchase_date, expires_on, transaction_id, notes)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![w.item_name.trim(), p_date, w.expires_on, txn_id, w.notes],
            ).map_err(|e| format!("Failed to link warranty: {}", e))?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    // Fetch full transaction details
    get_transaction_by_id(&conn, txn_id)
}

#[tauri::command]
pub fn update_transaction(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdateTransactionPayload,
) -> Result<Transaction, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    if payload.amount <= 0.0 {
        return Err("Transaction amount must be greater than zero".to_string());
    }

    let rounded_amount = (payload.amount * 100.0).round() / 100.0;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Fetch old transaction to find previously affected accounts
    let (old_account_id, old_transfer_to_id): (i64, Option<i64>) = tx.query_row(
        "SELECT account_id, transfer_to_account_id FROM transactions WHERE id = ?1",
        params![id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Transaction not found".to_string())?;

    // Revert old ledger entries
    tx.execute(
        "DELETE FROM account_ledger WHERE reference_type = 'transaction' AND reference_id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;

    // Fetch new source account currency
    let src_currency: String = tx.query_row(
        "SELECT currency FROM accounts WHERE id = ?1",
        params![payload.account_id],
        |r| r.get(0),
    ).map_err(|_| "Source account not found".to_string())?;

    let base_currency: String = tx.query_row(
        "SELECT base_currency FROM app_settings WHERE id = 1",
        [],
        |r| r.get(0),
    ).unwrap_or_else(|_| "INR".to_string());

    let rate = get_exchange_rate(&tx, &src_currency, &base_currency);
    let base_amount = ((rounded_amount * rate) * 100.0).round() / 100.0;

    let (category_id, transfer_to_account_id) = if payload.txn_type == "transfer" {
        let dest_id = payload.transfer_to_account_id
            .ok_or_else(|| "Destination account is required for a transfer".to_string())?;

        if dest_id == payload.account_id {
            return Err("Source and destination accounts cannot be the same".to_string());
        }

        (None, Some(dest_id))
    } else {
        let verified_cat_id = payload.category_id.and_then(|cat_id| {
            let exists: bool = tx.query_row(
                "SELECT 1 FROM categories WHERE id = ?1",
                params![cat_id],
                |_| Ok(true),
            ).unwrap_or(false);
            if exists { Some(cat_id) } else { None }
        });
        (verified_cat_id, None)
    };

    let is_confirmed_val = if payload.is_confirmed { 1 } else { 0 };

    // Update transactions table
    tx.execute(
        "UPDATE transactions SET
            account_id = ?1, type = ?2, category_id = ?3, transfer_to_account_id = ?4,
            amount = ?5, base_amount = ?6, exchange_rate_used = ?7, payment_type = ?8,
            txn_date = ?9, note = ?10, is_confirmed = ?11
         WHERE id = ?12",
        params![
            payload.account_id,
            payload.txn_type,
            category_id,
            transfer_to_account_id,
            rounded_amount,
            base_amount,
            rate,
            payload.payment_type,
            payload.txn_date,
            payload.note,
            is_confirmed_val,
            id,
        ],
    ).map_err(|e| format!("Failed to update transaction: {}", e))?;

    // Reapply new ledger legs
    match payload.txn_type.as_str() {
        "income" => {
            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'income', ?2, 0, 'transaction', ?3, ?4)",
                params![payload.account_id, rounded_amount, id, payload.txn_date],
            ).map_err(|e| format!("Failed to insert ledger row: {}", e))?;
        }
        "expense" => {
            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'expense', ?2, 0, 'transaction', ?3, ?4)",
                params![payload.account_id, -rounded_amount, id, payload.txn_date],
            ).map_err(|e| format!("Failed to insert ledger row: {}", e))?;
        }
        "transfer" => {
            let dest_id = transfer_to_account_id.unwrap();
            let dest_currency: String = tx.query_row(
                "SELECT currency FROM accounts WHERE id = ?1",
                params![dest_id],
                |r| r.get(0),
            ).unwrap();

            let dest_rate = get_exchange_rate(&tx, &src_currency, &dest_currency);
            let dest_amount = ((rounded_amount * dest_rate) * 100.0).round() / 100.0;

            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'transfer_out', ?2, 0, 'transaction', ?3, ?4)",
                params![payload.account_id, -rounded_amount, id, payload.txn_date],
            ).map_err(|e| e.to_string())?;

            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'transfer_in', ?2, 0, 'transaction', ?3, ?4)",
                params![dest_id, dest_amount, id, payload.txn_date],
            ).map_err(|e| e.to_string())?;
        }
        _ => {}
    }

    // Recompute balances for all touched accounts
    recompute_account_balance(&tx, old_account_id).map_err(|e| e.to_string())?;
    if let Some(old_dest) = old_transfer_to_id {
        recompute_account_balance(&tx, old_dest).map_err(|e| e.to_string())?;
    }
    recompute_account_balance(&tx, payload.account_id).map_err(|e| e.to_string())?;
    if let Some(new_dest) = transfer_to_account_id {
        recompute_account_balance(&tx, new_dest).map_err(|e| e.to_string())?;
    }

    // Re-link tags
    tx.execute("DELETE FROM transaction_tags WHERE transaction_id = ?1", params![id]).map_err(|e| e.to_string())?;
    for tag_str in payload.tags {
        let trimmed = tag_str.trim();
        if !trimmed.is_empty() {
            tx.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", params![trimmed]).map_err(|e| e.to_string())?;
            let tag_id: i64 = tx.query_row("SELECT id FROM tags WHERE name = ?1", params![trimmed], |r| r.get(0)).map_err(|e| e.to_string())?;
            tx.execute("INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?1, ?2)", params![id, tag_id]).map_err(|e| e.to_string())?;
        }
    }

    // 6. Handle linked Warranty if provided
    if let Some(w) = payload.warranty {
        if !w.item_name.trim().is_empty() {
            let p_date = w.purchase_date.unwrap_or_else(|| payload.txn_date.clone());
            let existing_w_id: Option<i64> = tx.query_row(
                "SELECT id FROM warranties WHERE transaction_id = ?1",
                params![id],
                |r| r.get(0),
            ).optional().unwrap_or(None);

            if let Some(w_id) = existing_w_id {
                tx.execute(
                    "UPDATE warranties SET item_name = ?1, purchase_date = ?2, expires_on = ?3, notes = ?4 WHERE id = ?5",
                    params![w.item_name.trim(), p_date, w.expires_on, w.notes, w_id],
                ).map_err(|e| format!("Failed to update warranty: {}", e))?;
            } else {
                tx.execute(
                    "INSERT INTO warranties (item_name, purchase_date, expires_on, transaction_id, notes)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![w.item_name.trim(), p_date, w.expires_on, id, w.notes],
                ).map_err(|e| format!("Failed to insert warranty: {}", e))?;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    get_transaction_by_id(&conn, id)
}

#[tauri::command]
pub fn delete_transaction(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (src_acc_id, dest_acc_id): (i64, Option<i64>) = tx.query_row(
        "SELECT account_id, transfer_to_account_id FROM transactions WHERE id = ?1",
        params![id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Transaction not found".to_string())?;

    let _ = tx.execute("UPDATE warranties SET transaction_id = NULL WHERE transaction_id = ?1", params![id]);
    tx.execute("DELETE FROM transaction_tags WHERE transaction_id = ?1", params![id]).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM account_ledger WHERE reference_type = 'transaction' AND reference_id = ?1", params![id]).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM transactions WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;

    // Recompute balances
    recompute_account_balance(&tx, src_acc_id).map_err(|e| e.to_string())?;
    if let Some(dest_id) = dest_acc_id {
        recompute_account_balance(&tx, dest_id).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_transactions(
    state: State<'_, AppState>,
    filter: TransactionFilter,
) -> Result<Vec<Transaction>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut query = String::from(
        "SELECT
            t.id, t.account_id, a.name, a.currency,
            t.type, t.category_id, c.name, c.icon, c.color,
            t.transfer_to_account_id, a_to.name, a_to.currency,
            t.amount, t.base_amount, t.exchange_rate_used,
            t.payment_type, t.txn_date, t.note, t.is_confirmed,
            t.recurring_rule_id, t.created_at
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         LEFT JOIN accounts a_to ON a_to.id = t.transfer_to_account_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE 1=1"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(acc_id) = filter.account_id {
        query.push_str(" AND (t.account_id = ? OR t.transfer_to_account_id = ?)");
        params_vec.push(Box::new(acc_id));
        params_vec.push(Box::new(acc_id));
    }

    if let Some(cat_id) = filter.category_id {
        query.push_str(" AND t.category_id = ?");
        params_vec.push(Box::new(cat_id));
    }

    if let Some(ref ttype) = filter.txn_type {
        if !ttype.is_empty() && ttype != "all" {
            query.push_str(" AND t.type = ?");
            params_vec.push(Box::new(ttype.clone()));
        }
    }

    if let Some(ref start) = filter.start_date {
        if !start.is_empty() {
            query.push_str(" AND t.txn_date >= ?");
            params_vec.push(Box::new(start.clone()));
        }
    }

    if let Some(ref end) = filter.end_date {
        if !end.is_empty() {
            query.push_str(" AND t.txn_date <= ?");
            params_vec.push(Box::new(format!("{} 23:59:59", end)));
        }
    }

    if let Some(is_conf) = filter.is_confirmed {
        query.push_str(" AND t.is_confirmed = ?");
        params_vec.push(Box::new(if is_conf { 1 } else { 0 }));
    }

    if let Some(ref tag) = filter.tag {
        if !tag.is_empty() {
            query.push_str(" AND t.id IN (SELECT tt.transaction_id FROM transaction_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tg.name = ?)");
            params_vec.push(Box::new(tag.clone()));
        }
    }

    if let Some(ref search) = filter.search_query {
        let trimmed = search.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND (t.note LIKE ? OR c.name LIKE ? OR a.name LIKE ?)");
            let pattern = format!("%{}%", trimmed);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
        }
    }

    query.push_str(" ORDER BY t.txn_date DESC, t.id DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let txns = stmt.query_map(param_refs.as_slice(), |row| {
        let txn_id: i64 = row.get(0)?;
        Ok(Transaction {
            id: txn_id,
            account_id: row.get(1)?,
            account_name: row.get(2)?,
            account_currency: row.get(3)?,
            txn_type: row.get(4)?,
            category_id: row.get(5)?,
            category_name: row.get(6)?,
            category_icon: row.get(7)?,
            category_color: row.get(8)?,
            transfer_to_account_id: row.get(9)?,
            transfer_to_account_name: row.get(10)?,
            transfer_to_account_currency: row.get(11)?,
            amount: row.get(12)?,
            base_amount: row.get(13)?,
            exchange_rate_used: row.get(14)?,
            payment_type: row.get(15)?,
            txn_date: row.get(16)?,
            note: row.get(17)?,
            is_confirmed: row.get(18)?,
            recurring_rule_id: row.get(19)?,
            tags: Vec::new(), // will fill tags below
            created_at: row.get(20)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for t in txns {
        let mut txn = t.map_err(|e| e.to_string())?;
        // Fetch tags for this transaction
        let mut tag_stmt = conn.prepare(
            "SELECT tg.name FROM transaction_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.transaction_id = ?1 ORDER BY tg.name ASC"
        ).map_err(|e| e.to_string())?;
        let tag_rows = tag_stmt.query_map(params![txn.id], |r| r.get(0)).map_err(|e| e.to_string())?;
        for tag in tag_rows {
            txn.tags.push(tag.map_err(|e| e.to_string())?);
        }
        results.push(txn);
    }

    Ok(results)
}

fn get_transaction_by_id(conn: &Connection, id: i64) -> Result<Transaction, String> {
    let mut stmt = conn.prepare(
        "SELECT
            t.id, t.account_id, a.name, a.currency,
            t.type, t.category_id, c.name, c.icon, c.color,
            t.transfer_to_account_id, a_to.name, a_to.currency,
            t.amount, t.base_amount, t.exchange_rate_used,
            t.payment_type, t.txn_date, t.note, t.is_confirmed,
            t.recurring_rule_id, t.created_at
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         LEFT JOIN accounts a_to ON a_to.id = t.transfer_to_account_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.id = ?1"
    ).map_err(|e| e.to_string())?;

    let mut txn = stmt.query_row(params![id], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            account_id: row.get(1)?,
            account_name: row.get(2)?,
            account_currency: row.get(3)?,
            txn_type: row.get(4)?,
            category_id: row.get(5)?,
            category_name: row.get(6)?,
            category_icon: row.get(7)?,
            category_color: row.get(8)?,
            transfer_to_account_id: row.get(9)?,
            transfer_to_account_name: row.get(10)?,
            transfer_to_account_currency: row.get(11)?,
            amount: row.get(12)?,
            base_amount: row.get(13)?,
            exchange_rate_used: row.get(14)?,
            payment_type: row.get(15)?,
            txn_date: row.get(16)?,
            note: row.get(17)?,
            is_confirmed: row.get(18)?,
            recurring_rule_id: row.get(19)?,
            tags: Vec::new(),
            created_at: row.get(20)?,
        })
    }).map_err(|e| format!("Failed to fetch transaction: {}", e))?;

    let mut tag_stmt = conn.prepare(
        "SELECT tg.name FROM transaction_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.transaction_id = ?1 ORDER BY tg.name ASC"
    ).map_err(|e| e.to_string())?;
    let tag_rows = tag_stmt.query_map(params![id], |r| r.get(0)).map_err(|e| e.to_string())?;
    for tag in tag_rows {
        txn.tags.push(tag.map_err(|e| e.to_string())?);
    }

    Ok(txn)
}

// ==========================================
// Recurring Rules Engine (Task 6, Section 5.3)
// ==========================================

fn advance_date(date: NaiveDate, frequency: &str) -> NaiveDate {
    match frequency {
        "daily" => date + chrono::Duration::days(1),
        "weekly" => date + chrono::Duration::days(7),
        "monthly" => {
            let year = date.year();
            let month = date.month();
            let day = date.day();
            let (new_year, new_month) = if month == 12 {
                (year + 1, 1)
            } else {
                (year, month + 1)
            };
            let max_day = match new_month {
                4 | 6 | 9 | 11 => 30,
                2 => {
                    if (new_year % 4 == 0 && new_year % 100 != 0) || (new_year % 400 == 0) {
                        29
                    } else {
                        28
                    }
                }
                _ => 31,
            };
            NaiveDate::from_ymd_opt(new_year, new_month, day.min(max_day)).unwrap_or(date)
        }
        "yearly" => {
            let year = date.year() + 1;
            let month = date.month();
            let day = date.day();
            let max_day = if month == 2 && ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)) {
                29
            } else if month == 2 {
                28
            } else {
                31
            };
            NaiveDate::from_ymd_opt(year, month, day.min(max_day)).unwrap_or(date)
        }
        _ => date + chrono::Duration::days(1),
    }
}

#[tauri::command]
pub fn process_recurring_rules(state: State<'_, AppState>) -> Result<i64, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let today = Local::now().date_naive();
    let today_str = today.format("%Y-%m-%d").to_string();

    let mut generated_count = 0;

    // Fetch active rules due on or before today
    let mut stmt = conn.prepare(
        "SELECT id, name, account_id, type, category_id, transfer_to_account_id, amount, payment_type, frequency, next_due_date, note
         FROM recurring_rules WHERE is_active = 1 AND next_due_date <= ?1"
    ).map_err(|e| e.to_string())?;

    struct RuleRow {
        id: i64,
        account_id: i64,
        rule_type: String,
        category_id: Option<i64>,
        transfer_to_account_id: Option<i64>,
        amount: f64,
        payment_type: Option<String>,
        frequency: String,
        next_due_date: String,
        note: Option<String>,
    }

    let rows = stmt.query_map(params![today_str], |r| {
        Ok(RuleRow {
            id: r.get(0)?,
            account_id: r.get(2)?,
            rule_type: r.get(3)?,
            category_id: r.get(4)?,
            transfer_to_account_id: r.get(5)?,
            amount: r.get(6)?,
            payment_type: r.get(7)?,
            frequency: r.get(8)?,
            next_due_date: r.get(9)?,
            note: r.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    let rules: Vec<RuleRow> = rows.filter_map(|r| r.ok()).collect();
    drop(stmt);

    for rule in rules {
        let mut current_due = match NaiveDate::parse_from_str(&rule.next_due_date, "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => continue,
        };

        // Catch up all missed cycles per AGENTS.md Section 5.3
        while current_due <= today {
            let tx = conn.transaction().map_err(|e| e.to_string())?;

            let src_currency: String = tx.query_row(
                "SELECT currency FROM accounts WHERE id = ?1",
                params![rule.account_id],
                |r| r.get(0),
            ).unwrap_or_else(|_| "INR".to_string());

            let base_currency: String = tx.query_row(
                "SELECT base_currency FROM app_settings WHERE id = 1",
                [],
                |r| r.get(0),
            ).unwrap_or_else(|_| "INR".to_string());

            let rate = get_exchange_rate(&tx, &src_currency, &base_currency);
            let base_amount = ((rule.amount * rate) * 100.0).round() / 100.0;
            let due_date_str = current_due.format("%Y-%m-%d").to_string();

            tx.execute(
                "INSERT INTO transactions (
                    account_id, type, category_id, transfer_to_account_id,
                    amount, base_amount, exchange_rate_used, payment_type,
                    txn_date, note, is_confirmed, recurring_rule_id
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11)",
                params![
                    rule.account_id,
                    rule.rule_type,
                    rule.category_id,
                    rule.transfer_to_account_id,
                    rule.amount,
                    base_amount,
                    rate,
                    rule.payment_type,
                    due_date_str,
                    rule.note,
                    rule.id,
                ],
            ).map_err(|e| e.to_string())?;

            let txn_id = tx.last_insert_rowid();

            // Ledger rows
            match rule.rule_type.as_str() {
                "income" => {
                    tx.execute(
                        "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                         VALUES (?1, 'income', ?2, 0, 'transaction', ?3, ?4)",
                        params![rule.account_id, rule.amount, txn_id, due_date_str],
                    ).map_err(|e| e.to_string())?;
                    recompute_account_balance(&tx, rule.account_id).map_err(|e| e.to_string())?;
                }
                "expense" => {
                    tx.execute(
                        "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                         VALUES (?1, 'expense', ?2, 0, 'transaction', ?3, ?4)",
                        params![rule.account_id, -rule.amount, txn_id, due_date_str],
                    ).map_err(|e| e.to_string())?;
                    recompute_account_balance(&tx, rule.account_id).map_err(|e| e.to_string())?;
                }
                "transfer" => {
                    if let Some(dest_id) = rule.transfer_to_account_id {
                        let dest_currency: String = tx.query_row(
                            "SELECT currency FROM accounts WHERE id = ?1",
                            params![dest_id],
                            |r| r.get(0),
                        ).unwrap_or_else(|_| "INR".to_string());

                        let dest_rate = get_exchange_rate(&tx, &src_currency, &dest_currency);
                        let dest_amount = ((rule.amount * dest_rate) * 100.0).round() / 100.0;

                        tx.execute(
                            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                             VALUES (?1, 'transfer_out', ?2, 0, 'transaction', ?3, ?4)",
                            params![rule.account_id, -rule.amount, txn_id, due_date_str],
                        ).map_err(|e| e.to_string())?;
                        recompute_account_balance(&tx, rule.account_id).map_err(|e| e.to_string())?;

                        tx.execute(
                            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                             VALUES (?1, 'transfer_in', ?2, 0, 'transaction', ?3, ?4)",
                            params![dest_id, dest_amount, txn_id, due_date_str],
                        ).map_err(|e| e.to_string())?;
                        recompute_account_balance(&tx, dest_id).map_err(|e| e.to_string())?;
                    }
                }
                _ => {}
            }

            // Advance date
            current_due = advance_date(current_due, &rule.frequency);
            let next_due_str = current_due.format("%Y-%m-%d").to_string();

            tx.execute(
                "UPDATE recurring_rules SET next_due_date = ?1 WHERE id = ?2",
                params![next_due_str, rule.id],
            ).map_err(|e| e.to_string())?;

            tx.commit().map_err(|e| e.to_string())?;
            generated_count += 1;
        }
    }

    Ok(generated_count)
}

#[tauri::command]
pub fn get_recurring_rules(state: State<'_, AppState>) -> Result<Vec<RecurringRule>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT
            r.id, r.name, r.account_id, a.name, r.type,
            r.category_id, c.name, r.transfer_to_account_id, a_to.name,
            r.amount, r.payment_type, r.frequency, r.next_due_date, r.is_active, r.note
         FROM recurring_rules r
         JOIN accounts a ON a.id = r.account_id
         LEFT JOIN accounts a_to ON a_to.id = r.transfer_to_account_id
         LEFT JOIN categories c ON c.id = r.category_id
         ORDER BY r.next_due_date ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(RecurringRule {
            id: row.get(0)?,
            name: row.get(1)?,
            account_id: row.get(2)?,
            account_name: row.get(3)?,
            rule_type: row.get(4)?,
            category_id: row.get(5)?,
            category_name: row.get(6)?,
            transfer_to_account_id: row.get(7)?,
            transfer_to_account_name: row.get(8)?,
            amount: row.get(9)?,
            payment_type: row.get(10)?,
            frequency: row.get(11)?,
            next_due_date: row.get(12)?,
            is_active: row.get(13)?,
            note: row.get(14)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut rules = Vec::new();
    for r in rows {
        rules.push(r.map_err(|e| e.to_string())?);
    }

    Ok(rules)
}

#[tauri::command]
pub fn create_recurring_rule(
    state: State<'_, AppState>,
    payload: CreateRecurringRulePayload,
) -> Result<RecurringRule, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Rule name cannot be empty".to_string());
    }
    if payload.amount <= 0.0 {
        return Err("Amount must be greater than zero".to_string());
    }

    let allowed_freq = ["daily", "weekly", "monthly", "yearly"];
    if !allowed_freq.contains(&payload.frequency.as_str()) {
        return Err(format!("Invalid frequency: {}", payload.frequency));
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let (cat_id, dest_id) = if payload.rule_type == "transfer" {
        (None, payload.transfer_to_account_id)
    } else {
        (payload.category_id, None)
    };

    conn.execute(
        "INSERT INTO recurring_rules (
            name, account_id, type, category_id, transfer_to_account_id,
            amount, payment_type, frequency, next_due_date, is_active, note
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10)",
        params![
            name_trimmed,
            payload.account_id,
            payload.rule_type,
            cat_id,
            dest_id,
            payload.amount,
            payload.payment_type,
            payload.frequency,
            payload.next_due_date,
            payload.note,
        ],
    ).map_err(|e| format!("Failed to create recurring rule: {}", e))?;

    let rule_id = conn.last_insert_rowid();

    // Fetch created rule
    let mut stmt = conn.prepare(
        "SELECT
            r.id, r.name, r.account_id, a.name, r.type,
            r.category_id, c.name, r.transfer_to_account_id, a_to.name,
            r.amount, r.payment_type, r.frequency, r.next_due_date, r.is_active, r.note
         FROM recurring_rules r
         JOIN accounts a ON a.id = r.account_id
         LEFT JOIN accounts a_to ON a_to.id = r.transfer_to_account_id
         LEFT JOIN categories c ON c.id = r.category_id
         WHERE r.id = ?1"
    ).map_err(|e| e.to_string())?;

    let rule = stmt.query_row(params![rule_id], |row| {
        Ok(RecurringRule {
            id: row.get(0)?,
            name: row.get(1)?,
            account_id: row.get(2)?,
            account_name: row.get(3)?,
            rule_type: row.get(4)?,
            category_id: row.get(5)?,
            category_name: row.get(6)?,
            transfer_to_account_id: row.get(7)?,
            transfer_to_account_name: row.get(8)?,
            amount: row.get(9)?,
            payment_type: row.get(10)?,
            frequency: row.get(11)?,
            next_due_date: row.get(12)?,
            is_active: row.get(13)?,
            note: row.get(14)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rule)
}

#[tauri::command]
pub fn update_recurring_rule(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdateRecurringRulePayload,
) -> Result<RecurringRule, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Rule name cannot be empty".to_string());
    }
    if payload.amount <= 0.0 {
        return Err("Amount must be greater than zero".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let (cat_id, dest_id) = if payload.rule_type == "transfer" {
        (None, payload.transfer_to_account_id)
    } else {
        (payload.category_id, None)
    };

    let active_val = if payload.is_active { 1 } else { 0 };

    conn.execute(
        "UPDATE recurring_rules SET
            name = ?1, account_id = ?2, type = ?3, category_id = ?4, transfer_to_account_id = ?5,
            amount = ?6, payment_type = ?7, frequency = ?8, next_due_date = ?9, is_active = ?10, note = ?11
         WHERE id = ?12",
        params![
            name_trimmed,
            payload.account_id,
            payload.rule_type,
            cat_id,
            dest_id,
            payload.amount,
            payload.payment_type,
            payload.frequency,
            payload.next_due_date,
            active_val,
            payload.note,
            id,
        ],
    ).map_err(|e| format!("Failed to update recurring rule: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT
            r.id, r.name, r.account_id, a.name, r.type,
            r.category_id, c.name, r.transfer_to_account_id, a_to.name,
            r.amount, r.payment_type, r.frequency, r.next_due_date, r.is_active, r.note
         FROM recurring_rules r
         JOIN accounts a ON a.id = r.account_id
         LEFT JOIN accounts a_to ON a_to.id = r.transfer_to_account_id
         LEFT JOIN categories c ON c.id = r.category_id
         WHERE r.id = ?1"
    ).map_err(|e| e.to_string())?;

    let rule = stmt.query_row(params![id], |row| {
        Ok(RecurringRule {
            id: row.get(0)?,
            name: row.get(1)?,
            account_id: row.get(2)?,
            account_name: row.get(3)?,
            rule_type: row.get(4)?,
            category_id: row.get(5)?,
            category_name: row.get(6)?,
            transfer_to_account_id: row.get(7)?,
            transfer_to_account_name: row.get(8)?,
            amount: row.get(9)?,
            payment_type: row.get(10)?,
            frequency: row.get(11)?,
            next_due_date: row.get(12)?,
            is_active: row.get(13)?,
            note: row.get(14)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rule)
}

#[tauri::command]
pub fn delete_recurring_rule(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM recurring_rules WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete recurring rule: {}", e))?;
    Ok(())
}

// ==========================================
// Dashboard Cashflow Command (Task 7)
// ==========================================

#[tauri::command]
pub fn get_month_summary(
    state: State<'_, AppState>,
    month: Option<String>,
) -> Result<MonthSummary, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let target_month = month.unwrap_or_else(|| {
        Local::now().format("%Y-%m").to_string()
    });

    let pattern = format!("{}%", target_month);

    // Confirmed income this month
    let income: f64 = conn.query_row(
        "SELECT ROUND(COALESCE(SUM(base_amount), 0), 2) FROM transactions WHERE type = 'income' AND is_confirmed = 1 AND txn_date LIKE ?1",
        params![pattern],
        |r| r.get(0),
    ).unwrap_or(0.0);

    // Confirmed expense this month
    let expense: f64 = conn.query_row(
        "SELECT ROUND(COALESCE(SUM(base_amount), 0), 2) FROM transactions WHERE type = 'expense' AND is_confirmed = 1 AND txn_date LIKE ?1",
        params![pattern],
        |r| r.get(0),
    ).unwrap_or(0.0);

    // Pending transactions count & amount
    let pending_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM transactions WHERE is_confirmed = 0 AND txn_date LIKE ?1",
        params![pattern],
        |r| r.get(0),
    ).unwrap_or(0);

    let pending_expense: f64 = conn.query_row(
        "SELECT ROUND(COALESCE(SUM(base_amount), 0), 2) FROM transactions WHERE type = 'expense' AND is_confirmed = 0 AND txn_date LIKE ?1",
        params![pattern],
        |r| r.get(0),
    ).unwrap_or(0.0);

    let net = ((income - expense) * 100.0).round() / 100.0;

    Ok(MonthSummary {
        month: target_month,
        total_income: income,
        total_expense: expense,
        net_cashflow: net,
        pending_count,
        pending_expense_total: pending_expense,
    })
}

// ==========================================
// Part 3 Commands: Budgets, Bills, Shopping, Warranties, CSV Import
// ==========================================

// --- Budgets ---

#[tauri::command]
pub fn get_budgets(state: State<'_, AppState>) -> Result<Vec<BudgetProgress>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let today = Local::now().date_naive();

    let mut stmt = conn.prepare(
        "SELECT id, name, amount, period, start_date, end_date, rollover, is_active FROM budgets ORDER BY id ASC"
    ).map_err(|e| e.to_string())?;

    let budget_rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, f64>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, i64>(6)? == 1,
            row.get::<_, i64>(7)? == 1,
        ))
    }).map_err(|e| e.to_string())?;

    let mut list = Vec::new();

    for r in budget_rows {
        let (id, name, amount, period, start_date, end_date, rollover, is_active) = r.map_err(|e| e.to_string())?;

        // Categories linked to this budget
        let mut cat_stmt = conn.prepare(
            "SELECT c.id, c.name FROM categories c
             JOIN budget_categories bc ON bc.category_id = c.id
             WHERE bc.budget_id = ?1"
        ).map_err(|e| e.to_string())?;

        let mut cat_ids = Vec::new();
        let mut cat_names = Vec::new();
        let cat_rows = cat_stmt.query_map(params![id], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        }).map_err(|e| e.to_string())?;

        for crow in cat_rows {
            let (cid, cname) = crow.map_err(|e| e.to_string())?;
            cat_ids.push(cid);
            cat_names.push(cname);
        }

        // Calculate period start and end
        let (p_start, p_end, prev_period) = calculate_budget_period(&period, &start_date, end_date.as_deref(), today);

        let p_start_str = p_start.format("%Y-%m-%d").to_string();
        let p_end_str = p_end.format("%Y-%m-%d").to_string();

        // Effective amount (including rollover if enabled and past period exists)
        let mut effective_amount = amount;
        if rollover {
            if let Some((prev_s, prev_e)) = prev_period {
                let prev_s_str = prev_s.format("%Y-%m-%d").to_string();
                let prev_e_str = prev_e.format("%Y-%m-%d").to_string();

                let prev_spent = if !cat_ids.is_empty() {
                    let placeholders: Vec<String> = (1..=cat_ids.len()).map(|i| format!("?{}", i)).collect();
                    let sql = format!(
                        "SELECT ROUND(COALESCE(SUM(base_amount), 0), 2) FROM transactions
                         WHERE type = 'expense' AND is_confirmed = 1
                           AND category_id IN ({})
                           AND DATE(txn_date) >= ?{} AND DATE(txn_date) <= ?{}",
                        placeholders.join(","),
                        cat_ids.len() + 1,
                        cat_ids.len() + 2
                    );
                    let mut p_stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
                    let mut params_vec: Vec<rusqlite::types::Value> = cat_ids.iter().map(|&cid| cid.into()).collect();
                    params_vec.push(prev_s_str.into());
                    params_vec.push(prev_e_str.into());

                    p_stmt.query_row(rusqlite::params_from_iter(params_vec), |r| r.get(0)).unwrap_or(0.0)
                } else {
                    0.0
                };

                let leftover = (amount - prev_spent).max(0.0);
                effective_amount = ((amount + leftover) * 100.0).round() / 100.0;
            }
        }

        // Calculate spent in current period
        let spent = if !cat_ids.is_empty() {
            let placeholders: Vec<String> = (1..=cat_ids.len()).map(|i| format!("?{}", i)).collect();
            let sql = format!(
                "SELECT ROUND(COALESCE(SUM(base_amount), 0), 2) FROM transactions
                 WHERE type = 'expense' AND is_confirmed = 1
                   AND category_id IN ({})
                   AND DATE(txn_date) >= ?{} AND DATE(txn_date) <= ?{}",
                placeholders.join(","),
                cat_ids.len() + 1,
                cat_ids.len() + 2
            );
            let mut s_stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
            let mut params_vec: Vec<rusqlite::types::Value> = cat_ids.iter().map(|&cid| cid.into()).collect();
            params_vec.push(p_start_str.clone().into());
            params_vec.push(p_end_str.clone().into());

            s_stmt.query_row(rusqlite::params_from_iter(params_vec), |r| r.get(0)).unwrap_or(0.0)
        } else {
            0.0
        };

        let remaining = ((effective_amount - spent) * 100.0).round() / 100.0;
        let progress_percent = if effective_amount > 0.0 {
            ((spent / effective_amount) * 10000.0).round() / 100.0
        } else {
            0.0
        };

        let total_days = (p_end - p_start).num_days() + 1;
        let days_elapsed = ((today - p_start).num_days() + 1).clamp(1, total_days);
        let days_remaining = (p_end - today).num_days().max(0);

        let projected_spent = ((spent / days_elapsed as f64) * total_days as f64 * 100.0).round() / 100.0;
        let is_pace_warning = projected_spent > effective_amount && spent <= effective_amount && days_remaining > 0;

        list.push(BudgetProgress {
            id,
            name,
            amount,
            effective_amount,
            spent,
            remaining,
            progress_percent,
            period,
            start_date,
            end_date,
            period_start: p_start_str,
            period_end: p_end_str,
            rollover,
            is_active,
            category_ids: cat_ids,
            category_names: cat_names,
            days_remaining,
            total_days,
            projected_spent,
            is_pace_warning,
        });
    }

    Ok(list)
}

#[tauri::command]
pub fn create_budget(
    state: State<'_, AppState>,
    payload: CreateBudgetPayload,
) -> Result<BudgetProgress, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Budget name cannot be empty".to_string());
    }
    if payload.amount <= 0.0 {
        return Err("Budget amount must be greater than zero".to_string());
    }
    if payload.category_ids.is_empty() {
        return Err("Please select at least one category for this budget".to_string());
    }

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let rollover_val = if payload.rollover { 1 } else { 0 };

    tx.execute(
        "INSERT INTO budgets (name, amount, period, start_date, end_date, rollover, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
        params![
            name_trimmed,
            payload.amount,
            payload.period,
            payload.start_date,
            payload.end_date,
            rollover_val,
        ],
    ).map_err(|e| format!("Failed to create budget: {}", e))?;

    let budget_id = tx.last_insert_rowid();

    for cid in payload.category_ids {
        tx.execute(
            "INSERT OR IGNORE INTO budget_categories (budget_id, category_id) VALUES (?1, ?2)",
            params![budget_id, cid],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    drop(conn);
    let all = get_budgets(state)?;
    all.into_iter().find(|b| b.id == budget_id).ok_or_else(|| "Failed to load created budget".to_string())
}

#[tauri::command]
pub fn update_budget(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdateBudgetPayload,
) -> Result<BudgetProgress, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Budget name cannot be empty".to_string());
    }
    if payload.amount <= 0.0 {
        return Err("Budget amount must be greater than zero".to_string());
    }
    if payload.category_ids.is_empty() {
        return Err("Please select at least one category for this budget".to_string());
    }

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let rollover_val = if payload.rollover { 1 } else { 0 };
    let is_active_val = if payload.is_active { 1 } else { 0 };

    tx.execute(
        "UPDATE budgets SET name = ?1, amount = ?2, period = ?3, start_date = ?4, end_date = ?5, rollover = ?6, is_active = ?7 WHERE id = ?8",
        params![
            name_trimmed,
            payload.amount,
            payload.period,
            payload.start_date,
            payload.end_date,
            rollover_val,
            is_active_val,
            id,
        ],
    ).map_err(|e| format!("Failed to update budget: {}", e))?;

    tx.execute("DELETE FROM budget_categories WHERE budget_id = ?1", params![id]).map_err(|e| e.to_string())?;

    for cid in payload.category_ids {
        tx.execute(
            "INSERT OR IGNORE INTO budget_categories (budget_id, category_id) VALUES (?1, ?2)",
            params![id, cid],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    drop(conn);
    let all = get_budgets(state)?;
    all.into_iter().find(|b| b.id == id).ok_or_else(|| "Failed to load updated budget".to_string())
}

#[tauri::command]
pub fn delete_budget(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM budgets WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete budget: {}", e))?;
    Ok(())
}

// --- Goals ---

#[tauri::command]
pub fn get_goals(state: State<'_, AppState>) -> Result<Vec<Goal>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, target_amount, current_amount, target_date, account_id, color, icon, note, is_reached, created_at
             FROM goals ORDER BY is_reached ASC, id DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let target_amount: f64 = row.get(2)?;
            let current_amount: f64 = row.get(3)?;
            let target_date: Option<String> = row.get(4)?;
            let account_id: Option<i64> = row.get(5)?;
            let color: String = row.get(6)?;
            let icon: String = row.get(7)?;
            let note: Option<String> = row.get(8)?;
            let is_reached: i64 = row.get(9)?;
            let created_at: String = row.get(10)?;

            let percentage = if target_amount > 0.0 {
                ((current_amount / target_amount) * 100.0).clamp(0.0, 100.0)
            } else {
                0.0
            };
            let remaining_amount = (target_amount - current_amount).max(0.0);

            Ok(Goal {
                id,
                name,
                target_amount,
                current_amount,
                target_date,
                account_id,
                color,
                icon,
                note,
                is_reached,
                created_at,
                percentage,
                remaining_amount,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub fn create_goal(state: State<'_, AppState>, payload: CreateGoalPayload) -> Result<Goal, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let color = payload.color.unwrap_or_else(|| "#8b5cf6".to_string());
    let icon = payload.icon.unwrap_or_else(|| "target".to_string());
    let current_amount = payload.current_amount.unwrap_or(0.0);
    let is_reached = if current_amount >= payload.target_amount && payload.target_amount > 0.0 { 1 } else { 0 };

    conn.execute(
        "INSERT INTO goals (name, target_amount, current_amount, target_date, account_id, color, icon, note, is_reached)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            payload.name,
            payload.target_amount,
            current_amount,
            payload.target_date,
            payload.account_id,
            color,
            icon,
            payload.note,
            is_reached,
        ],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    if current_amount > 0.0 {
        conn.execute(
            "INSERT INTO goal_contributions (goal_id, amount, note) VALUES (?1, ?2, 'Initial deposit')",
            params![id, current_amount],
        ).map_err(|e| e.to_string())?;
    }

    let percentage = if payload.target_amount > 0.0 {
        ((current_amount / payload.target_amount) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };
    let remaining_amount = (payload.target_amount - current_amount).max(0.0);

    Ok(Goal {
        id,
        name: payload.name,
        target_amount: payload.target_amount,
        current_amount,
        target_date: payload.target_date,
        account_id: payload.account_id,
        color,
        icon,
        note: payload.note,
        is_reached,
        created_at: Local::now().to_rfc3339(),
        percentage,
        remaining_amount,
    })
}

#[tauri::command]
pub fn update_goal(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdateGoalPayload,
) -> Result<Goal, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let color = payload.color.unwrap_or_else(|| "#8b5cf6".to_string());
    let icon = payload.icon.unwrap_or_else(|| "target".to_string());
    let is_reached = if payload.current_amount >= payload.target_amount && payload.target_amount > 0.0 { 1 } else { payload.is_reached };

    conn.execute(
        "UPDATE goals SET name = ?1, target_amount = ?2, current_amount = ?3, target_date = ?4,
         account_id = ?5, color = ?6, icon = ?7, note = ?8, is_reached = ?9 WHERE id = ?10",
        params![
            payload.name,
            payload.target_amount,
            payload.current_amount,
            payload.target_date,
            payload.account_id,
            color,
            icon,
            payload.note,
            is_reached,
            id,
        ],
    ).map_err(|e| e.to_string())?;

    let percentage = if payload.target_amount > 0.0 {
        ((payload.current_amount / payload.target_amount) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };
    let remaining_amount = (payload.target_amount - payload.current_amount).max(0.0);

    Ok(Goal {
        id,
        name: payload.name,
        target_amount: payload.target_amount,
        current_amount: payload.current_amount,
        target_date: payload.target_date,
        account_id: payload.account_id,
        color,
        icon,
        note: payload.note,
        is_reached,
        created_at: Local::now().to_rfc3339(),
        percentage,
        remaining_amount,
    })
}

#[tauri::command]
pub fn delete_goal(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM goals WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn contribute_to_goal(
    state: State<'_, AppState>,
    payload: ContributeGoalPayload,
) -> Result<Goal, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Record contribution
    conn.execute(
        "INSERT INTO goal_contributions (goal_id, amount, note) VALUES (?1, ?2, ?3)",
        params![payload.goal_id, payload.amount, payload.note],
    ).map_err(|e| e.to_string())?;

    // Update goal current_amount
    conn.execute(
        "UPDATE goals SET current_amount = MAX(0, current_amount + ?1) WHERE id = ?2",
        params![payload.amount, payload.goal_id],
    ).map_err(|e| e.to_string())?;

    // Fetch updated goal
    let mut stmt = conn.prepare(
        "SELECT id, name, target_amount, current_amount, target_date, account_id, color, icon, note, is_reached, created_at
         FROM goals WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    let mut goal = stmt.query_row(params![payload.goal_id], |row| {
        let id: i64 = row.get(0)?;
        let name: String = row.get(1)?;
        let target_amount: f64 = row.get(2)?;
        let current_amount: f64 = row.get(3)?;
        let target_date: Option<String> = row.get(4)?;
        let account_id: Option<i64> = row.get(5)?;
        let color: String = row.get(6)?;
        let icon: String = row.get(7)?;
        let note: Option<String> = row.get(8)?;
        let is_reached: i64 = row.get(9)?;
        let created_at: String = row.get(10)?;

        let percentage = if target_amount > 0.0 {
            ((current_amount / target_amount) * 100.0).clamp(0.0, 100.0)
        } else {
            0.0
        };
        let remaining_amount = (target_amount - current_amount).max(0.0);

        Ok(Goal {
            id,
            name,
            target_amount,
            current_amount,
            target_date,
            account_id,
            color,
            icon,
            note,
            is_reached,
            created_at,
            percentage,
            remaining_amount,
        })
    }).map_err(|e| e.to_string())?;

    // Auto mark reached if target met
    if goal.current_amount >= goal.target_amount && goal.target_amount > 0.0 && goal.is_reached == 0 {
        conn.execute("UPDATE goals SET is_reached = 1 WHERE id = ?1", params![goal.id]).map_err(|e| e.to_string())?;
        goal.is_reached = 1;
    }

    Ok(goal)
}

// --- Bills & Reminders ---

#[tauri::command]
pub fn get_bills(state: State<'_, AppState>) -> Result<Vec<BillItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let today_str = Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn.prepare(
        "SELECT b.id, b.name, b.amount, b.due_date, b.account_id, a.name, b.category_id, c.name, b.is_paid, b.recurrence
         FROM bills b
         LEFT JOIN accounts a ON a.id = b.account_id
         LEFT JOIN categories c ON c.id = b.category_id
         ORDER BY b.is_paid ASC, b.due_date ASC"
    ).map_err(|e| e.to_string())?;

    let bills = stmt.query_map([], |row| {
        let is_paid: i64 = row.get(8)?;
        let due_date: String = row.get(3)?;
        let is_overdue = is_paid == 0 && due_date < today_str;

        Ok(BillItem {
            id: row.get(0)?,
            name: row.get(1)?,
            amount: row.get(2)?,
            due_date,
            account_id: row.get(4)?,
            account_name: row.get(5)?,
            category_id: row.get(6)?,
            category_name: row.get(7)?,
            is_paid,
            recurrence: row.get(9)?,
            is_overdue,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    Ok(bills)
}

#[tauri::command]
pub fn create_bill(
    state: State<'_, AppState>,
    payload: CreateBillPayload,
) -> Result<BillItem, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Bill name cannot be empty".to_string());
    }
    if payload.amount <= 0.0 {
        return Err("Bill amount must be greater than zero".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO bills (name, amount, due_date, account_id, category_id, is_paid, recurrence)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
        params![
            name_trimmed,
            payload.amount,
            payload.due_date,
            payload.account_id,
            payload.category_id,
            payload.recurrence,
        ],
    ).map_err(|e| format!("Failed to create bill: {}", e))?;

    let id = conn.last_insert_rowid();
    drop(conn);

    let all = get_bills(state)?;
    all.into_iter().find(|b| b.id == id).ok_or_else(|| "Failed to load created bill".to_string())
}

#[tauri::command]
pub fn update_bill(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdateBillPayload,
) -> Result<BillItem, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Bill name cannot be empty".to_string());
    }
    if payload.amount <= 0.0 {
        return Err("Bill amount must be greater than zero".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let is_paid_val = if payload.is_paid { 1 } else { 0 };

    conn.execute(
        "UPDATE bills SET name = ?1, amount = ?2, due_date = ?3, account_id = ?4, category_id = ?5, is_paid = ?6, recurrence = ?7
         WHERE id = ?8",
        params![
            name_trimmed,
            payload.amount,
            payload.due_date,
            payload.account_id,
            payload.category_id,
            is_paid_val,
            payload.recurrence,
            id,
        ],
    ).map_err(|e| format!("Failed to update bill: {}", e))?;

    drop(conn);
    let all = get_bills(state)?;
    all.into_iter().find(|b| b.id == id).ok_or_else(|| "Failed to load updated bill".to_string())
}

#[tauri::command]
pub fn delete_bill(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let bill_info: Option<(String, Option<i64>)> = tx.query_row(
        "SELECT name, account_id FROM bills WHERE id = ?1",
        params![id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).optional().map_err(|e| e.to_string())?;

    if let Some((name, account_id)) = bill_info {
        // Clean up any transaction that was generated for this bill payment
        let note_pattern = format!("Bill Payment: {}", name);
        let txn_ids: Vec<(i64, i64)> = {
            let mut stmt = tx.prepare(
                "SELECT id, account_id FROM transactions WHERE note = ?1 OR note LIKE ?2"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![note_pattern, format!("{}%", note_pattern)], |r| {
                Ok((r.get(0)?, r.get(1)?))
            }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };

        for (txn_id, acc_id) in &txn_ids {
            tx.execute("DELETE FROM transaction_tags WHERE transaction_id = ?1", params![txn_id]).ok();
            tx.execute("DELETE FROM account_ledger WHERE reference_type = 'transaction' AND reference_id = ?1", params![txn_id]).ok();
            tx.execute("DELETE FROM transactions WHERE id = ?1", params![txn_id]).ok();
            recompute_account_balance(&tx, *acc_id).ok();
        }

        // Also clean up any legacy ledger rows referencing this bill
        tx.execute("DELETE FROM account_ledger WHERE reference_type = 'bill' AND reference_id = ?1", params![id]).ok();
        if let Some(acc_id) = account_id {
            recompute_account_balance(&tx, acc_id).ok();
        }

        tx.execute("DELETE FROM bills WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete bill: {}", e))?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn mark_bill_paid(state: State<'_, AppState>, id: i64) -> Result<Transaction, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Fetch bill details
    let (name, amount, due_date, account_id, category_id, recurrence): (
        String, f64, String, Option<i64>, Option<i64>, Option<String>
    ) = tx.query_row(
        "SELECT name, amount, due_date, account_id, category_id, recurrence FROM bills WHERE id = ?1",
        params![id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
    ).map_err(|_| "Bill not found".to_string())?;

    // Account to pay from
    let acc_id = match account_id {
        Some(aid) => aid,
        None => {
            let default_acc: Option<i64> = tx.query_row(
                "SELECT id FROM accounts WHERE is_archived = 0 AND type IN ('bank', 'cash') ORDER BY id ASC LIMIT 1",
                [],
                |r| r.get(0),
            ).optional().unwrap_or(None);
            default_acc.ok_or_else(|| "No active bank or cash account available to pay this bill".to_string())?
        }
    };

    let src_currency: String = tx.query_row(
        "SELECT currency FROM accounts WHERE id = ?1",
        params![acc_id],
        |r| r.get(0),
    ).map_err(|_| "Account not found".to_string())?;

    let base_currency: String = tx.query_row(
        "SELECT base_currency FROM app_settings WHERE id = 1",
        [],
        |r| r.get(0),
    ).unwrap_or_else(|_| "INR".to_string());

    let rate = get_exchange_rate(&tx, &src_currency, &base_currency);
    let rounded_amount = (amount * 100.0).round() / 100.0;
    let base_amount = ((rounded_amount * rate) * 100.0).round() / 100.0;
    let now_str = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 2. Insert expense transaction
    tx.execute(
        "INSERT INTO transactions (
            account_id, type, category_id, transfer_to_account_id,
            amount, base_amount, exchange_rate_used, payment_type,
            txn_date, note, is_confirmed
        ) VALUES (?1, 'expense', ?2, NULL, ?3, ?4, ?5, 'bank_transfer', ?6, ?7, 1)",
        params![
            acc_id,
            category_id,
            rounded_amount,
            base_amount,
            rate,
            now_str,
            format!("Bill Payment: {}", name),
        ],
    ).map_err(|e| format!("Failed to create transaction for bill: {}", e))?;

    let txn_id = tx.last_insert_rowid();

    // 3. Ledger entry & balance recompute — linked to transaction id for consistent atomic ledger tracking
    tx.execute(
        "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
         VALUES (?1, 'expense', ?2, 0, 'transaction', ?3, ?4)",
        params![acc_id, -rounded_amount, txn_id, now_str],
    ).map_err(|e| format!("Failed to insert ledger row: {}", e))?;

    recompute_account_balance(&tx, acc_id).map_err(|e| e.to_string())?;

    // 4. Mark this bill paid
    tx.execute("UPDATE bills SET is_paid = 1 WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to update bill status: {}", e))?;

    // 5. Generate next occurrence if recurring
    if let Some(ref rec) = recurrence {
        if rec == "monthly" || rec == "yearly" {
            let parsed_due = NaiveDate::parse_from_str(&due_date, "%Y-%m-%d")
                .unwrap_or_else(|_| Local::now().date_naive());

            let next_due = if rec == "monthly" {
                advance_month(parsed_due)
            } else {
                advance_year(parsed_due)
            };

            tx.execute(
                "INSERT INTO bills (name, amount, due_date, account_id, category_id, is_paid, recurrence)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
                params![
                    name,
                    rounded_amount,
                    next_due.format("%Y-%m-%d").to_string(),
                    account_id,
                    category_id,
                    rec,
                ],
            ).map_err(|e| format!("Failed to generate next recurring bill occurrence: {}", e))?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    get_transaction_by_id(&conn, txn_id)
}

#[tauri::command]
pub fn unmark_bill_paid(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (name, account_id): (String, Option<i64>) = tx.query_row(
        "SELECT name, account_id FROM bills WHERE id = ?1",
        params![id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Bill not found".to_string())?;

    // Find and delete the generated bill payment transaction
    let note_pattern = format!("Bill Payment: {}", name);
    let txn_ids: Vec<(i64, i64)> = {
        let mut stmt = tx.prepare(
            "SELECT id, account_id FROM transactions WHERE note = ?1 OR note LIKE ?2"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![note_pattern, format!("{}%", note_pattern)], |r| {
            Ok((r.get(0)?, r.get(1)?))
        }).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    for (txn_id, acc_id) in &txn_ids {
        tx.execute("DELETE FROM transaction_tags WHERE transaction_id = ?1", params![txn_id]).ok();
        tx.execute("DELETE FROM account_ledger WHERE reference_type = 'transaction' AND reference_id = ?1", params![txn_id]).ok();
        tx.execute("DELETE FROM transactions WHERE id = ?1", params![txn_id]).ok();
        recompute_account_balance(&tx, *acc_id).ok();
    }

    // Clean up any legacy ledger rows referencing this bill
    tx.execute("DELETE FROM account_ledger WHERE reference_type = 'bill' AND reference_id = ?1", params![id]).ok();
    if let Some(acc_id) = account_id {
        recompute_account_balance(&tx, acc_id).ok();
    }

    // Mark bill as unpaid
    tx.execute("UPDATE bills SET is_paid = 0 WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to update bill status: {}", e))?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// --- Shopping List ---

#[tauri::command]
pub fn get_shopping_items(state: State<'_, AppState>) -> Result<Vec<ShoppingListItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, name, is_checked, note, created_at FROM shopping_list_items ORDER BY is_checked ASC, id DESC"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| {
        Ok(ShoppingListItem {
            id: row.get(0)?,
            name: row.get(1)?,
            is_checked: row.get(2)?,
            note: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_shopping_item(
    state: State<'_, AppState>,
    payload: CreateShoppingItemPayload,
) -> Result<ShoppingListItem, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Item name cannot be empty".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO shopping_list_items (name, note) VALUES (?1, ?2)",
        params![name_trimmed, payload.note],
    ).map_err(|e| format!("Failed to create shopping item: {}", e))?;

    let id = conn.last_insert_rowid();

    let mut stmt = conn.prepare(
        "SELECT id, name, is_checked, note, created_at FROM shopping_list_items WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    let item = stmt.query_row(params![id], |row| {
        Ok(ShoppingListItem {
            id: row.get(0)?,
            name: row.get(1)?,
            is_checked: row.get(2)?,
            note: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(item)
}

#[tauri::command]
pub fn toggle_shopping_item(state: State<'_, AppState>, id: i64) -> Result<ShoppingListItem, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE shopping_list_items SET is_checked = 1 - is_checked WHERE id = ?1",
        params![id],
    ).map_err(|e| format!("Failed to toggle shopping item: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, name, is_checked, note, created_at FROM shopping_list_items WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    let item = stmt.query_row(params![id], |row| {
        Ok(ShoppingListItem {
            id: row.get(0)?,
            name: row.get(1)?,
            is_checked: row.get(2)?,
            note: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(item)
}

#[tauri::command]
pub fn update_shopping_item(
    state: State<'_, AppState>,
    id: i64,
    payload: CreateShoppingItemPayload,
) -> Result<ShoppingListItem, String> {
    let name_trimmed = payload.name.trim();
    if name_trimmed.is_empty() {
        return Err("Item name cannot be empty".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE shopping_list_items SET name = ?1, note = ?2 WHERE id = ?3",
        params![name_trimmed, payload.note, id],
    ).map_err(|e| format!("Failed to update shopping item: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, name, is_checked, note, created_at FROM shopping_list_items WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    let item = stmt.query_row(params![id], |row| {
        Ok(ShoppingListItem {
            id: row.get(0)?,
            name: row.get(1)?,
            is_checked: row.get(2)?,
            note: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(item)
}

#[tauri::command]
pub fn delete_shopping_item(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM shopping_list_items WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete shopping item: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn clear_completed_shopping_items(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM shopping_list_items WHERE is_checked = 1", [])
        .map_err(|e| format!("Failed to clear completed shopping items: {}", e))?;
    Ok(())
}

// --- Warranties ---

#[tauri::command]
pub fn get_warranties(state: State<'_, AppState>) -> Result<Vec<WarrantyItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let today = Local::now().date_naive();

    let mut stmt = conn.prepare(
        "SELECT id, item_name, purchase_date, expires_on, transaction_id, notes
         FROM warranties
         ORDER BY CASE WHEN expires_on IS NULL THEN 1 ELSE 0 END, expires_on ASC"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| {
        let id: i64 = row.get(0)?;
        let item_name: String = row.get(1)?;
        let purchase_date: Option<String> = row.get(2)?;
        let expires_on: Option<String> = row.get(3)?;
        let transaction_id: Option<i64> = row.get(4)?;
        let notes: Option<String> = row.get(5)?;

        let (days_remaining, is_expiring_soon, is_expired) = if let Some(ref exp_str) = expires_on {
            if let Ok(exp_date) = NaiveDate::parse_from_str(exp_str, "%Y-%m-%d") {
                let diff = (exp_date - today).num_days();
                (Some(diff), diff >= 0 && diff <= 30, diff < 0)
            } else {
                (None, false, false)
            }
        } else {
            (None, false, false)
        };

        Ok(WarrantyItem {
            id,
            item_name,
            purchase_date,
            expires_on,
            transaction_id,
            notes,
            days_remaining,
            is_expiring_soon,
            is_expired,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_warranty(
    state: State<'_, AppState>,
    payload: CreateWarrantyPayload,
) -> Result<WarrantyItem, String> {
    let name_trimmed = payload.item_name.trim();
    if name_trimmed.is_empty() {
        return Err("Item name cannot be empty".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO warranties (item_name, purchase_date, expires_on, transaction_id, notes)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            name_trimmed,
            payload.purchase_date,
            payload.expires_on,
            payload.transaction_id,
            payload.notes,
        ],
    ).map_err(|e| format!("Failed to create warranty: {}", e))?;

    let id = conn.last_insert_rowid();
    drop(conn);

    let all = get_warranties(state)?;
    all.into_iter().find(|w| w.id == id).ok_or_else(|| "Failed to load created warranty".to_string())
}

#[tauri::command]
pub fn update_warranty(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdateWarrantyPayload,
) -> Result<WarrantyItem, String> {
    let name_trimmed = payload.item_name.trim();
    if name_trimmed.is_empty() {
        return Err("Item name cannot be empty".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE warranties SET item_name = ?1, purchase_date = ?2, expires_on = ?3, notes = ?4 WHERE id = ?5",
        params![
            name_trimmed,
            payload.purchase_date,
            payload.expires_on,
            payload.notes,
            id,
        ],
    ).map_err(|e| format!("Failed to update warranty: {}", e))?;

    drop(conn);
    let all = get_warranties(state)?;
    all.into_iter().find(|w| w.id == id).ok_or_else(|| "Failed to load updated warranty".to_string())
}

#[tauri::command]
pub fn delete_warranty(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM warranties WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete warranty: {}", e))?;
    Ok(())
}

// --- CSV Import ---

#[tauri::command]
pub fn import_csv_transactions(
    state: State<'_, AppState>,
    payload: CsvImportPayload,
) -> Result<CsvImportResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let src_currency: String = tx.query_row(
        "SELECT currency FROM accounts WHERE id = ?1",
        params![payload.target_account_id],
        |r| r.get(0),
    ).map_err(|_| "Target account not found".to_string())?;

    let base_currency: String = tx.query_row(
        "SELECT base_currency FROM app_settings WHERE id = 1",
        [],
        |r| r.get(0),
    ).unwrap_or_else(|_| "INR".to_string());

    let rate = get_exchange_rate(&tx, &src_currency, &base_currency);

    let mut imported_count = 0i64;
    let mut failed_rows = Vec::new();

    for (idx, row) in payload.rows.into_iter().enumerate() {
        let row_num = idx + 1;
        if row.amount <= 0.0 {
            failed_rows.push(format!("Row {}: Amount must be greater than 0 (got {})", row_num, row.amount));
            continue;
        }

        let txn_type = row.txn_type.to_lowercase();
        if txn_type != "income" && txn_type != "expense" {
            failed_rows.push(format!("Row {}: Invalid transaction type '{}' (must be 'income' or 'expense')", row_num, row.txn_type));
            continue;
        }

        let rounded_amount = (row.amount * 100.0).round() / 100.0;
        let base_amount = ((rounded_amount * rate) * 100.0).round() / 100.0;

        // Resolve Category
        let mut resolved_cat_id = payload.default_category_id;
        if let Some(ref cat_name) = row.category_name {
            let cat_trimmed = cat_name.trim();
            if !cat_trimmed.is_empty() {
                let found_id: Option<i64> = tx.query_row(
                    "SELECT id FROM categories WHERE LOWER(name) = LOWER(?1) LIMIT 1",
                    params![cat_trimmed],
                    |r| r.get(0),
                ).optional().unwrap_or(None);

                if let Some(cid) = found_id {
                    resolved_cat_id = Some(cid);
                } else {
                    let kind = if txn_type == "income" { "income" } else { "expense" };
                    if let Ok(_) = tx.execute(
                        "INSERT INTO categories (name, kind, icon, color) VALUES (?1, ?2, 'Tag', '#10b981')",
                        params![cat_trimmed, kind],
                    ) {
                        resolved_cat_id = Some(tx.last_insert_rowid());
                    }
                }
            }
        }

        let txn_date = if row.date.trim().is_empty() {
            Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
        } else {
            row.date.trim().to_string()
        };

        let payment_type = row.payment_type.unwrap_or_else(|| "other".to_string());

        let insert_res = tx.execute(
            "INSERT INTO transactions (
                account_id, type, category_id, transfer_to_account_id,
                amount, base_amount, exchange_rate_used, payment_type,
                txn_date, note, is_confirmed
            ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, ?8, ?9, 1)",
            params![
                payload.target_account_id,
                txn_type,
                resolved_cat_id,
                rounded_amount,
                base_amount,
                rate,
                payment_type,
                txn_date,
                row.note,
            ],
        );

        match insert_res {
            Ok(_) => {
                let txn_id = tx.last_insert_rowid();
                let signed_amount = if txn_type == "income" { rounded_amount } else { -rounded_amount };
                if let Err(e) = tx.execute(
                    "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                     VALUES (?1, ?2, ?3, 0, 'transaction', ?4, ?5)",
                    params![payload.target_account_id, txn_type, signed_amount, txn_id, txn_date],
                ) {
                    failed_rows.push(format!("Row {}: Ledger insertion failed: {}", row_num, e));
                    continue;
                }
                imported_count += 1;
            }
            Err(e) => {
                failed_rows.push(format!("Row {}: Database insert failed: {}", row_num, e));
            }
        }
    }

    if imported_count > 0 {
        recompute_account_balance(&tx, payload.target_account_id).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(CsvImportResult {
        imported_count,
        failed_rows,
    })
}

// ============================================================================
// PART 4: Investments, Exchange Rates, Debts, Net Worth
// ============================================================================

// --- Investments Holdings Commands ---

#[tauri::command]
pub fn get_holdings(state: State<AppState>) -> Result<Vec<InvestmentHolding>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let base_currency: String = conn
        .query_row("SELECT base_currency FROM app_settings WHERE id = 1", [], |r| r.get(0))
        .unwrap_or_else(|_| "INR".to_string());

    let mut stmt = conn
        .prepare(
            "SELECT h.id, h.account_id, a.name, h.asset_type, h.symbol, h.name,
                    h.quantity, h.avg_buy_price, h.currency, h.last_price,
                    h.last_price_updated_at, h.notes, h.is_archived
             FROM investment_holdings h
             INNER JOIN accounts a ON a.id = h.account_id
             ORDER BY h.is_archived ASC, h.asset_type ASC, h.symbol ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let account_id: i64 = row.get(1)?;
            let account_name: String = row.get(2)?;
            let asset_type: String = row.get(3)?;
            let symbol: String = row.get(4)?;
            let name: Option<String> = row.get(5)?;
            let quantity: f64 = row.get(6)?;
            let avg_buy_price: f64 = row.get(7)?;
            let currency: String = row.get(8)?;
            let last_price: f64 = row.get(9)?;
            let last_price_updated_at: String = row.get(10)?;
            let notes: Option<String> = row.get(11)?;
            let is_archived: i64 = row.get(12)?;

            Ok((
                id, account_id, account_name, asset_type, symbol, name,
                quantity, avg_buy_price, currency, last_price,
                last_price_updated_at, notes, is_archived,
            ))
        })
        .map_err(|e| e.to_string())?;

    let today = Local::now().date_naive();
    let mut holdings = Vec::new();

    for r in rows.flatten() {
        let (
            id, account_id, account_name, asset_type, symbol, name,
            quantity, avg_buy_price, currency, last_price,
            last_price_updated_at, notes, is_archived,
        ) = r;

        let invested_val = ((quantity * avg_buy_price) * 100.0).round() / 100.0;
        let current_val = ((quantity * last_price) * 100.0).round() / 100.0;
        let unrealized_pnl = ((current_val - invested_val) * 100.0).round() / 100.0;
        let unrealized_pnl_percent = if invested_val > 0.0 {
            ((unrealized_pnl / invested_val) * 10000.0).round() / 100.0
        } else {
            0.0
        };

        let rate = get_exchange_rate(&conn, &currency, &base_currency);
        let base_invested_val = ((invested_val * rate) * 100.0).round() / 100.0;
        let base_current_val = ((current_val * rate) * 100.0).round() / 100.0;
        let base_unrealized_pnl = ((base_current_val - base_invested_val) * 100.0).round() / 100.0;

        let date_slice = if last_price_updated_at.len() >= 10 {
            &last_price_updated_at[0..10]
        } else {
            &last_price_updated_at
        };
        let days_since_update = if let Ok(parsed) = NaiveDate::parse_from_str(date_slice, "%Y-%m-%d") {
            (today - parsed).num_days().max(0)
        } else {
            0
        };

        holdings.push(InvestmentHolding {
            id,
            account_id,
            account_name,
            asset_type,
            symbol,
            name,
            quantity,
            avg_buy_price,
            currency,
            last_price,
            last_price_updated_at,
            notes,
            is_archived,
            invested_value: invested_val,
            current_value: current_val,
            unrealized_pnl,
            unrealized_pnl_percent,
            base_currency: base_currency.clone(),
            exchange_rate_used: rate,
            base_invested_value: base_invested_val,
            base_current_value: base_current_val,
            base_unrealized_pnl,
            days_since_update,
        });
    }

    Ok(holdings)
}

#[tauri::command]
pub fn get_portfolio_summary(state: State<AppState>) -> Result<PortfolioSummary, String> {
    let holdings = get_holdings(state)?;

    let mut total_invested_base = 0.0;
    let mut total_current_value_base = 0.0;
    let mut count = 0;

    for h in holdings {
        if h.is_archived == 0 {
            total_invested_base += h.base_invested_value;
            total_current_value_base += h.base_current_value;
            count += 1;
        }
    }

    total_invested_base = (total_invested_base * 100.0).round() / 100.0;
    total_current_value_base = (total_current_value_base * 100.0).round() / 100.0;
    let total_unrealized_pnl_base = ((total_current_value_base - total_invested_base) * 100.0).round() / 100.0;
    let total_unrealized_pnl_percent = if total_invested_base > 0.0 {
        ((total_unrealized_pnl_base / total_invested_base) * 10000.0).round() / 100.0
    } else {
        0.0
    };

    Ok(PortfolioSummary {
        total_invested_base,
        total_current_value_base,
        total_unrealized_pnl_base,
        total_unrealized_pnl_percent,
        holdings_count: count,
    })
}

#[tauri::command]
pub fn create_holding(state: State<AppState>, payload: CreateHoldingPayload) -> Result<i64, String> {
    if payload.symbol.trim().is_empty() {
        return Err("Symbol is required".to_string());
    }
    if payload.quantity <= 0.0 {
        return Err("Quantity must be greater than zero".to_string());
    }
    if payload.avg_buy_price < 0.0 || payload.last_price < 0.0 {
        return Err("Price cannot be negative".to_string());
    }

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    // Verify account is of type 'investment'
    let acc_type: String = conn
        .query_row(
            "SELECT type FROM accounts WHERE id = ?1",
            params![payload.account_id],
            |r| r.get(0),
        )
        .map_err(|_| "Account not found".to_string())?;

    if acc_type != "investment" {
        return Err("Holdings must be linked to an investment-type account".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let rounded_qty = (payload.quantity * 1000000.0).round() / 1000000.0;
    let rounded_buy_price = (payload.avg_buy_price * 100.0).round() / 100.0;
    let rounded_last_price = (payload.last_price * 100.0).round() / 100.0;
    let now_str = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    tx.execute(
        "INSERT INTO investment_holdings (
            account_id, asset_type, symbol, name, quantity, avg_buy_price,
            currency, last_price, last_price_updated_at, notes, is_archived
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0)",
        params![
            payload.account_id,
            payload.asset_type.to_lowercase(),
            payload.symbol.trim().to_uppercase(),
            payload.name.as_deref().map(|s| s.trim()),
            rounded_qty,
            rounded_buy_price,
            payload.currency.trim().to_uppercase(),
            rounded_last_price,
            now_str,
            payload.notes.as_deref().map(|s| s.trim()),
        ],
    ).map_err(|e| e.to_string())?;

    let holding_id = tx.last_insert_rowid();

    // Insert first price history row
    tx.execute(
        "INSERT INTO investment_price_history (holding_id, price, recorded_at) VALUES (?1, ?2, ?3)",
        params![holding_id, rounded_last_price, now_str],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(holding_id)
}

#[tauri::command]
pub fn update_holding(state: State<AppState>, id: i64, payload: UpdateHoldingPayload) -> Result<(), String> {
    if payload.symbol.trim().is_empty() {
        return Err("Symbol is required".to_string());
    }
    if payload.quantity <= 0.0 {
        return Err("Quantity must be greater than zero".to_string());
    }
    if payload.avg_buy_price < 0.0 {
        return Err("Average buy price cannot be negative".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let rounded_qty = (payload.quantity * 1000000.0).round() / 1000000.0;
    let rounded_buy_price = (payload.avg_buy_price * 100.0).round() / 100.0;

    conn.execute(
        "UPDATE investment_holdings
         SET asset_type = ?1, symbol = ?2, name = ?3, quantity = ?4,
             avg_buy_price = ?5, currency = ?6, notes = ?7
         WHERE id = ?8",
        params![
            payload.asset_type.to_lowercase(),
            payload.symbol.trim().to_uppercase(),
            payload.name.as_deref().map(|s| s.trim()),
            rounded_qty,
            rounded_buy_price,
            payload.currency.trim().to_uppercase(),
            payload.notes.as_deref().map(|s| s.trim()),
            id
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn archive_holding(state: State<AppState>, id: i64, is_archived: bool) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE investment_holdings SET is_archived = ?1 WHERE id = ?2",
        params![if is_archived { 1 } else { 0 }, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_holding(state: State<AppState>, id: i64) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM investment_price_history WHERE holding_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM investment_holdings WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_holding_price(state: State<AppState>, payload: SinglePriceUpdatePayload) -> Result<(), String> {
    if payload.price < 0.0 {
        return Err("Price cannot be negative".to_string());
    }
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let rounded_price = (payload.price * 100.0).round() / 100.0;
    let now_str = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let affected = tx.execute(
        "UPDATE investment_holdings SET last_price = ?1, last_price_updated_at = ?2 WHERE id = ?3",
        params![rounded_price, now_str, payload.holding_id],
    ).map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Holding not found".to_string());
    }

    tx.execute(
        "INSERT INTO investment_price_history (holding_id, price, recorded_at) VALUES (?1, ?2, ?3)",
        params![payload.holding_id, rounded_price, now_str],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn bulk_update_holding_prices(
    state: State<AppState>,
    updates: Vec<SinglePriceUpdatePayload>,
) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let now_str = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for item in updates {
        if item.price < 0.0 {
            continue;
        }
        let rounded_price = (item.price * 100.0).round() / 100.0;
        let affected = tx.execute(
            "UPDATE investment_holdings SET last_price = ?1, last_price_updated_at = ?2 WHERE id = ?3",
            params![rounded_price, now_str, item.holding_id],
        ).map_err(|e| e.to_string())?;

        if affected > 0 {
            tx.execute(
                "INSERT INTO investment_price_history (holding_id, price, recorded_at) VALUES (?1, ?2, ?3)",
                params![item.holding_id, rounded_price, now_str],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_holding_price_history(
    state: State<AppState>,
    holding_id: i64,
) -> Result<Vec<PriceHistoryPoint>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, holding_id, price, recorded_at
             FROM investment_price_history
             WHERE holding_id = ?1
             ORDER BY recorded_at ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;

    let points = stmt
        .query_map(params![holding_id], |row| {
            Ok(PriceHistoryPoint {
                id: row.get(0)?,
                holding_id: row.get(1)?,
                price: row.get(2)?,
                recorded_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(points)
}

// --- Exchange Rates Commands ---

#[tauri::command]
pub fn get_exchange_rates(state: State<AppState>) -> Result<Vec<ExchangeRateItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, from_currency, to_currency, rate, updated_at
             FROM exchange_rates
             ORDER BY from_currency ASC, to_currency ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            Ok(ExchangeRateItem {
                id: row.get(0)?,
                from_currency: row.get(1)?,
                to_currency: row.get(2)?,
                rate: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn set_exchange_rate(
    state: State<AppState>,
    payload: SetExchangeRatePayload,
) -> Result<(), String> {
    let from_curr = payload.from_currency.trim().to_uppercase();
    let to_curr = payload.to_currency.trim().to_uppercase();

    if from_curr.is_empty() || to_curr.is_empty() {
        return Err("Currencies cannot be empty".to_string());
    }
    if from_curr == to_curr {
        return Err("Currencies must be different".to_string());
    }
    if payload.rate <= 0.0 {
        return Err("Exchange rate must be greater than zero".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now_str = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(from_currency, to_currency) DO UPDATE SET
            rate = ?3,
            updated_at = ?4",
        params![from_curr, to_curr, payload.rate, now_str],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_exchange_rate(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM exchange_rates WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Debts Commands ---

#[tauri::command]
pub fn get_debts(state: State<AppState>) -> Result<Vec<DebtItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, principal, current_balance, total_borrowed, total_paid,
                    debt_type, interest_rate, due_date, min_payment, account_id, notes, is_active
             FROM debts
             ORDER BY is_active DESC, id DESC",
        )
        .map_err(|e| e.to_string())?;

    let debts = stmt
        .query_map([], |row| {
            Ok(DebtItem {
                id: row.get(0)?,
                name: row.get(1)?,
                principal: row.get(2)?,
                current_balance: row.get(3)?,
                total_borrowed: row.get::<_, Option<f64>>(4)?.unwrap_or(0.0),
                total_paid: row.get::<_, Option<f64>>(5)?.unwrap_or(0.0),
                debt_type: row.get::<_, Option<String>>(6)?.unwrap_or_else(|| "personal_loan".to_string()),
                interest_rate: row.get(7)?,
                due_date: row.get(8)?,
                min_payment: row.get::<_, Option<f64>>(9)?.unwrap_or(0.0),
                account_id: row.get(10)?,
                notes: row.get(11)?,
                is_active: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(debts)
}

#[tauri::command]
pub fn get_debt_transactions(state: State<AppState>, debt_id: i64) -> Result<Vec<DebtTransactionItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT dt.id, dt.debt_id, dt.txn_type, dt.amount, dt.txn_date,
                    dt.account_id, a.name AS account_name,
                    dt.category_id, c.name AS category_name,
                    dt.notes, dt.created_at
             FROM debt_transactions dt
             LEFT JOIN accounts a ON dt.account_id = a.id
             LEFT JOIN categories c ON dt.category_id = c.id
             WHERE dt.debt_id = ?1
             ORDER BY dt.txn_date DESC, dt.id DESC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![debt_id], |row| {
            Ok(DebtTransactionItem {
                id: row.get(0)?,
                debt_id: row.get(1)?,
                txn_type: row.get(2)?,
                amount: row.get(3)?,
                txn_date: row.get(4)?,
                account_id: row.get(5)?,
                account_name: row.get(6)?,
                category_id: row.get(7)?,
                category_name: row.get(8)?,
                notes: row.get(9)?,
                created_at: row.get::<_, Option<String>>(10)?.unwrap_or_default(),
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn create_debt(state: State<AppState>, payload: CreateDebtPayload) -> Result<i64, String> {
    if payload.name.trim().is_empty() {
        return Err("Debt name is required".to_string());
    }
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let principal = (payload.principal * 100.0).round() / 100.0;

    let initial_draw = payload.initial_draw
        .or(payload.current_balance)
        .unwrap_or(principal);
    let initial_draw = (initial_draw * 100.0).round() / 100.0;
    let debt_type = payload.debt_type.unwrap_or_else(|| "personal_loan".to_string());
    let min_pay = payload.min_payment.unwrap_or(0.0);

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO debts (name, principal, current_balance, total_borrowed, total_paid,
                            debt_type, interest_rate, due_date, min_payment, account_id, notes, is_active)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7, ?8, ?9, ?10, 1)",
        params![
            payload.name.trim(),
            principal,
            initial_draw,
            initial_draw,
            debt_type,
            payload.interest_rate,
            payload.due_date.as_deref().map(|s| s.trim()),
            min_pay,
            payload.deposit_account_id,
            payload.notes.as_deref().map(|s| s.trim()),
        ],
    ).map_err(|e| e.to_string())?;

    let debt_id = tx.last_insert_rowid();

    if initial_draw > 0.0 {
        let today_str = Local::now().format("%Y-%m-%d").to_string();
        let draw_date = payload.due_date.as_deref().unwrap_or(&today_str);

        tx.execute(
            "INSERT INTO debt_transactions (debt_id, txn_type, amount, txn_date, account_id, notes)
             VALUES (?1, 'draw', ?2, ?3, ?4, ?5)",
            params![
                debt_id,
                initial_draw,
                draw_date,
                payload.deposit_account_id,
                "Initial loan disbursement / drawdown",
            ],
        ).map_err(|e| e.to_string())?;

        if let Some(acc_id) = payload.deposit_account_id {
            let src_currency: Result<String, _> = tx.query_row(
                "SELECT currency FROM accounts WHERE id = ?1",
                params![acc_id],
                |r| r.get(0),
            );

            if let Ok(currency) = src_currency {
                let base_currency: String = tx.query_row(
                    "SELECT base_currency FROM app_settings WHERE id = 1",
                    [],
                    |r| r.get(0),
                ).unwrap_or_else(|_| "INR".to_string());

                let rate = get_exchange_rate(&tx, &currency, &base_currency);
                let base_amount = ((initial_draw * rate) * 100.0).round() / 100.0;
                let note = format!("Loan Disbursal: {}", payload.name.trim());

                tx.execute(
                    "INSERT INTO transactions (
                        account_id, type, amount, base_amount, exchange_rate_used,
                        txn_date, note, is_confirmed
                    ) VALUES (?1, 'income', ?2, ?3, ?4, ?5, ?6, 1)",
                    params![acc_id, initial_draw, base_amount, rate, draw_date, note],
                ).map_err(|e| format!("Failed to create deposit transaction: {}", e))?;

                let txn_id = tx.last_insert_rowid();

                tx.execute(
                    "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                     VALUES (?1, 'income', ?2, 0, 'debt_draw', ?3, ?4)",
                    params![acc_id, initial_draw, txn_id, draw_date],
                ).map_err(|e| format!("Failed to insert ledger row: {}", e))?;

                recompute_account_balance(&tx, acc_id).map_err(|e| e.to_string())?;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(debt_id)
}

#[tauri::command]
pub fn update_debt(state: State<AppState>, id: i64, payload: UpdateDebtPayload) -> Result<(), String> {
    if payload.name.trim().is_empty() {
        return Err("Debt name is required".to_string());
    }
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let principal = (payload.principal * 100.0).round() / 100.0;
    let balance = (payload.current_balance * 100.0).round() / 100.0;
    let borrowed = payload.total_borrowed.unwrap_or(principal);
    let paid = payload.total_paid.unwrap_or(0.0);
    let debt_type = payload.debt_type.unwrap_or_else(|| "personal_loan".to_string());
    let min_pay = payload.min_payment.unwrap_or(0.0);

    conn.execute(
        "UPDATE debts
         SET name = ?1, principal = ?2, current_balance = ?3, total_borrowed = ?4, total_paid = ?5,
             debt_type = ?6, interest_rate = ?7, due_date = ?8, min_payment = ?9, account_id = ?10,
             notes = ?11, is_active = ?12
         WHERE id = ?13",
        params![
            payload.name.trim(),
            principal,
            balance,
            borrowed,
            paid,
            debt_type,
            payload.interest_rate,
            payload.due_date.as_deref().map(|s| s.trim()),
            min_pay,
            payload.account_id,
            payload.notes.as_deref().map(|s| s.trim()),
            payload.is_active,
            id,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn record_debt_payment(
    state: State<AppState>,
    payload: RecordDebtPaymentPayload,
) -> Result<(), String> {
    if payload.amount <= 0.0 {
        return Err("Payment amount must be greater than zero".to_string());
    }
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let amount = (payload.amount * 100.0).round() / 100.0;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (debt_name, current_balance, total_paid): (String, f64, f64) = tx.query_row(
        "SELECT name, current_balance, COALESCE(total_paid, 0.0) FROM debts WHERE id = ?1",
        params![payload.debt_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|_| "Debt not found".to_string())?;

    let new_balance = ((current_balance - amount).max(0.0) * 100.0).round() / 100.0;
    let new_total_paid = ((total_paid + amount) * 100.0).round() / 100.0;
    let new_is_active = if new_balance <= 0.001 { 0 } else { 1 };

    tx.execute(
        "UPDATE debts
         SET current_balance = ?1, total_paid = ?2, is_active = ?3
         WHERE id = ?4",
        params![new_balance, new_total_paid, new_is_active, payload.debt_id],
    ).map_err(|e| e.to_string())?;

    // Record in debt_transactions
    tx.execute(
        "INSERT INTO debt_transactions (debt_id, txn_type, amount, txn_date, account_id, notes)
         VALUES (?1, 'payment', ?2, ?3, ?4, ?5)",
        params![
            payload.debt_id,
            amount,
            payload.txn_date.trim(),
            payload.account_id,
            payload.notes.as_deref().map(|s| s.trim()),
        ],
    ).map_err(|e| e.to_string())?;

    // If paid from an account, deduct money as an expense
    if let Some(acc_id) = payload.account_id {
        let src_currency: Result<String, _> = tx.query_row(
            "SELECT currency FROM accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        );

        if let Ok(currency) = src_currency {
            let base_currency: String = tx.query_row(
                "SELECT base_currency FROM app_settings WHERE id = 1",
                [],
                |r| r.get(0),
            ).unwrap_or_else(|_| "INR".to_string());

            let rate = get_exchange_rate(&tx, &currency, &base_currency);
            let base_amount = ((amount * rate) * 100.0).round() / 100.0;
            let note = format!("Debt Repayment: {}", debt_name);

            tx.execute(
                "INSERT INTO transactions (
                    account_id, type, amount, base_amount, exchange_rate_used,
                    txn_date, note, is_confirmed
                ) VALUES (?1, 'expense', ?2, ?3, ?4, ?5, ?6, 1)",
                params![acc_id, amount, base_amount, rate, payload.txn_date.trim(), note],
            ).map_err(|e| format!("Failed to create payment transaction: {}", e))?;

            let txn_id = tx.last_insert_rowid();

            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'expense', ?2, 0, 'debt_payment', ?3, ?4)",
                params![acc_id, -amount, txn_id, payload.txn_date.trim()],
            ).map_err(|e| format!("Failed to insert ledger row: {}", e))?;

            recompute_account_balance(&tx, acc_id).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn draw_debt_funds(
    state: State<AppState>,
    payload: DrawDebtFundsPayload,
) -> Result<(), String> {
    if payload.amount <= 0.0 {
        return Err("Draw amount must be greater than zero".to_string());
    }
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let amount = (payload.amount * 100.0).round() / 100.0;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (debt_name, current_balance, total_borrowed): (String, f64, f64) = tx.query_row(
        "SELECT name, current_balance, COALESCE(total_borrowed, 0.0) FROM debts WHERE id = ?1",
        params![payload.debt_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|_| "Debt not found".to_string())?;

    let new_balance = ((current_balance + amount) * 100.0).round() / 100.0;
    let new_total_borrowed = ((total_borrowed + amount) * 100.0).round() / 100.0;

    tx.execute(
        "UPDATE debts
         SET current_balance = ?1, total_borrowed = ?2, is_active = 1
         WHERE id = ?3",
        params![new_balance, new_total_borrowed, payload.debt_id],
    ).map_err(|e| e.to_string())?;

    // Record in debt_transactions
    tx.execute(
        "INSERT INTO debt_transactions (debt_id, txn_type, amount, txn_date, account_id, notes)
         VALUES (?1, 'draw', ?2, ?3, ?4, ?5)",
        params![
            payload.debt_id,
            amount,
            payload.txn_date.trim(),
            payload.account_id,
            payload.notes.as_deref().map(|s| s.trim()),
        ],
    ).map_err(|e| e.to_string())?;

    // If deposited into an account, credit money as income
    if let Some(acc_id) = payload.account_id {
        let src_currency: Result<String, _> = tx.query_row(
            "SELECT currency FROM accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        );

        if let Ok(currency) = src_currency {
            let base_currency: String = tx.query_row(
                "SELECT base_currency FROM app_settings WHERE id = 1",
                [],
                |r| r.get(0),
            ).unwrap_or_else(|_| "INR".to_string());

            let rate = get_exchange_rate(&tx, &currency, &base_currency);
            let base_amount = ((amount * rate) * 100.0).round() / 100.0;
            let note = format!("Loan Drawdown: {}", debt_name);

            tx.execute(
                "INSERT INTO transactions (
                    account_id, type, amount, base_amount, exchange_rate_used,
                    txn_date, note, is_confirmed
                ) VALUES (?1, 'income', ?2, ?3, ?4, ?5, ?6, 1)",
                params![acc_id, amount, base_amount, rate, payload.txn_date.trim(), note],
            ).map_err(|e| format!("Failed to create deposit transaction: {}", e))?;

            let txn_id = tx.last_insert_rowid();

            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
                 VALUES (?1, 'income', ?2, 0, 'debt_draw', ?3, ?4)",
                params![acc_id, amount, txn_id, payload.txn_date.trim()],
            ).map_err(|e| format!("Failed to insert ledger row: {}", e))?;

            recompute_account_balance(&tx, acc_id).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn spend_from_debt(
    state: State<AppState>,
    payload: SpendFromDebtPayload,
) -> Result<(), String> {
    if payload.amount <= 0.0 {
        return Err("Spend amount must be greater than zero".to_string());
    }
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let amount = (payload.amount * 100.0).round() / 100.0;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (_debt_name, current_balance, total_borrowed): (String, f64, f64) = tx.query_row(
        "SELECT name, current_balance, COALESCE(total_borrowed, 0.0) FROM debts WHERE id = ?1",
        params![payload.debt_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|_| "Debt not found".to_string())?;

    let new_balance = ((current_balance + amount) * 100.0).round() / 100.0;
    let new_total_borrowed = ((total_borrowed + amount) * 100.0).round() / 100.0;

    tx.execute(
        "UPDATE debts
         SET current_balance = ?1, total_borrowed = ?2, is_active = 1
         WHERE id = ?3",
        params![new_balance, new_total_borrowed, payload.debt_id],
    ).map_err(|e| e.to_string())?;

    // Record in debt_transactions
    tx.execute(
        "INSERT INTO debt_transactions (debt_id, txn_type, amount, txn_date, category_id, notes)
         VALUES (?1, 'expense', ?2, ?3, ?4, ?5)",
        params![
            payload.debt_id,
            amount,
            payload.txn_date.trim(),
            payload.category_id,
            payload.notes.as_deref().map(|s| s.trim()),
        ],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_debt(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = conn.execute("DELETE FROM debt_transactions WHERE debt_id = ?1", params![id]);
    conn.execute("DELETE FROM debts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Net Worth Commands ---

pub fn compute_net_worth_summary_internal(conn: &Connection) -> Result<NetWorthSummary, String> {
    let base_currency: String = conn
        .query_row("SELECT base_currency FROM app_settings WHERE id = 1", [], |r| r.get(0))
        .unwrap_or_else(|_| "INR".to_string());

    let mut total_bank = 0.0;
    let mut total_cash = 0.0;
    let mut total_other_accounts = 0.0;

    let mut stmt = conn
        .prepare("SELECT type, currency, current_balance FROM accounts WHERE is_archived = 0")
        .map_err(|e| e.to_string())?;

    let acc_rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, f64>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for acc in acc_rows.flatten() {
        let (acc_type, currency, balance) = acc;
        let rate = get_exchange_rate(conn, &currency, &base_currency);
        let converted = ((balance * rate) * 100.0).round() / 100.0;
        match acc_type.as_str() {
            "bank" => total_bank += converted,
            "cash" => total_cash += converted,
            "investment" => {
                // Section 5.6: Excluded from accounts sum because investment value is tracked via investment_holdings
            }
            _ => total_other_accounts += converted,
        }
    }

    let total_accounts = ((total_bank + total_cash + total_other_accounts) * 100.0).round() / 100.0;

    // Investment holdings (active only)
    let mut total_investments = 0.0;
    let mut hold_stmt = conn
        .prepare("SELECT quantity, last_price, currency FROM investment_holdings WHERE is_archived = 0")
        .map_err(|e| e.to_string())?;

    let hold_rows = hold_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, f64>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for hold in hold_rows.flatten() {
        let (qty, price, currency) = hold;
        let rate = get_exchange_rate(conn, &currency, &base_currency);
        let val = ((qty * price * rate) * 100.0).round() / 100.0;
        total_investments += val;
    }
    total_investments = (total_investments * 100.0).round() / 100.0;

    // Debts (active only)
    let total_debts_raw: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(current_balance), 0.0) FROM debts WHERE is_active = 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0.0);
    let total_debts = (total_debts_raw * 100.0).round() / 100.0;

    let net_worth = (((total_accounts + total_investments) - total_debts) * 100.0).round() / 100.0;

    Ok(NetWorthSummary {
        base_currency,
        total_bank: (total_bank * 100.0).round() / 100.0,
        total_cash: (total_cash * 100.0).round() / 100.0,
        total_investments,
        total_other_accounts: (total_other_accounts * 100.0).round() / 100.0,
        total_accounts,
        total_debts,
        net_worth,
    })
}

#[tauri::command]
pub fn get_net_worth_summary(state: State<AppState>) -> Result<NetWorthSummary, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    compute_net_worth_summary_internal(&conn)
}

#[tauri::command]
pub fn get_net_worth_history(
    state: State<AppState>,
    limit_days: Option<i64>,
) -> Result<Vec<NetWorthSnapshotItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = if let Some(limit) = limit_days {
        format!(
            "SELECT id, snapshot_date, total_accounts, total_investments, total_debts, net_worth
             FROM (
                 SELECT id, snapshot_date, total_accounts, total_investments, total_debts, net_worth
                 FROM networth_history
                 ORDER BY snapshot_date DESC, id DESC
                 LIMIT {}
             ) ORDER BY snapshot_date ASC, id ASC",
            limit
        )
    } else {
        "SELECT id, snapshot_date, total_accounts, total_investments, total_debts, net_worth
         FROM networth_history
         ORDER BY snapshot_date ASC, id ASC".to_string()
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let snapshots = stmt
        .query_map([], |row| {
            Ok(NetWorthSnapshotItem {
                id: row.get(0)?,
                snapshot_date: row.get(1)?,
                total_accounts: row.get(2)?,
                total_investments: row.get(3)?,
                total_debts: row.get(4)?,
                net_worth: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(snapshots)
}

#[tauri::command]
pub fn check_and_snapshot_net_worth(state: State<AppState>) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let today_str = Local::now().format("%Y-%m-%d").to_string();

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM networth_history WHERE snapshot_date = ?1",
            params![today_str],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if count > 0 {
        return Ok(false);
    }

    let summary = compute_net_worth_summary_internal(&conn)?;

    conn.execute(
        "INSERT INTO networth_history (snapshot_date, total_accounts, total_investments, total_debts, net_worth)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            today_str,
            summary.total_accounts,
            summary.total_investments,
            summary.total_debts,
            summary.net_worth
        ],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE app_settings SET last_networth_snapshot_at = CURRENT_TIMESTAMP WHERE id = 1",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn record_net_worth_snapshot(
    state: State<AppState>,
    snapshot_date: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let summary = compute_net_worth_summary_internal(&conn)?;
    let date_str = snapshot_date.unwrap_or_else(|| Local::now().format("%Y-%m-%d").to_string());

    let existing_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM networth_history WHERE snapshot_date = ?1",
            params![date_str],
            |r| r.get(0),
        )
        .optional()
        .unwrap_or(None);

    if let Some(id) = existing_id {
        conn.execute(
            "UPDATE networth_history
             SET total_accounts = ?1, total_investments = ?2, total_debts = ?3, net_worth = ?4
             WHERE id = ?5",
            params![summary.total_accounts, summary.total_investments, summary.total_debts, summary.net_worth, id],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO networth_history (snapshot_date, total_accounts, total_investments, total_debts, net_worth)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![date_str, summary.total_accounts, summary.total_investments, summary.total_debts, summary.net_worth],
        ).map_err(|e| e.to_string())?;
    }

    conn.execute(
        "UPDATE app_settings SET last_networth_snapshot_at = CURRENT_TIMESTAMP WHERE id = 1",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// PART 5: Reports, Backup & Restore, Settings
// ============================================================================

// --- Reports Commands ---

#[tauri::command]
pub fn get_category_spending_report(
    state: State<AppState>,
    filter: ReportDateFilter,
) -> Result<Vec<CategorySpendingReportItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut query = String::from(
        "SELECT t.category_id,
                COALESCE(c.name, 'Uncategorized') as cat_name,
                c.icon,
                c.color,
                SUM(t.base_amount) as total_spent,
                COUNT(t.id) as txn_count
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.type = 'expense' AND t.is_confirmed = 1",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(start) = &filter.start_date {
        if !start.trim().is_empty() {
            query.push_str(" AND t.txn_date >= ?");
            params_vec.push(Box::new(format!("{} 00:00:00", start.trim())));
        }
    }

    if let Some(end) = &filter.end_date {
        if !end.trim().is_empty() {
            query.push_str(" AND t.txn_date <= ?");
            params_vec.push(Box::new(format!("{} 23:59:59", end.trim())));
        }
    }

    query.push_str(" GROUP BY t.category_id, c.name, c.icon, c.color ORDER BY total_spent DESC");

    let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params_slice.as_slice(), |row| {
            Ok((
                row.get::<_, Option<i64>>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, f64>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    let mut total_expense_all = 0.0;

    for r in rows.flatten() {
        let (category_id, category_name, icon, color, spent, count) = r;
        let rounded_spent = (spent * 100.0).round() / 100.0;
        total_expense_all += rounded_spent;
        items.push((category_id, category_name, icon, color, rounded_spent, count));
    }

    let report_items = items
        .into_iter()
        .map(|(category_id, category_name, icon, color, total_spent, count)| {
            let percentage = if total_expense_all > 0.0 {
                ((total_spent / total_expense_all) * 10000.0).round() / 100.0
            } else {
                0.0
            };
            CategorySpendingReportItem {
                category_id,
                category_name,
                icon,
                color,
                total_spent,
                percentage,
                transaction_count: count,
            }
        })
        .collect();

    Ok(report_items)
}

#[tauri::command]
pub fn get_income_expense_trend(
    state: State<AppState>,
    filter: ReportDateFilter,
) -> Result<Vec<IncomeExpenseTrendItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let period_expr = match filter.group_by.as_deref() {
        Some("day") => "substr(t.txn_date, 1, 10)",
        _ => "substr(t.txn_date, 1, 7)", // "YYYY-MM"
    };

    let mut query = format!(
        "SELECT {} as period,
                COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.base_amount ELSE 0 END), 0) as inc,
                COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.base_amount ELSE 0 END), 0) as exp
         FROM transactions t
         WHERE t.is_confirmed = 1 AND t.type IN ('income', 'expense')",
        period_expr
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(start) = &filter.start_date {
        if !start.trim().is_empty() {
            query.push_str(" AND t.txn_date >= ?");
            params_vec.push(Box::new(format!("{} 00:00:00", start.trim())));
        }
    }

    if let Some(end) = &filter.end_date {
        if !end.trim().is_empty() {
            query.push_str(" AND t.txn_date <= ?");
            params_vec.push(Box::new(format!("{} 23:59:59", end.trim())));
        }
    }

    query.push_str(&format!(" GROUP BY {} ORDER BY period ASC", period_expr));

    let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params_slice.as_slice(), |row| {
            let period: String = row.get(0)?;
            let inc: f64 = row.get(1)?;
            let exp: f64 = row.get(2)?;
            let rounded_inc = (inc * 100.0).round() / 100.0;
            let rounded_exp = (exp * 100.0).round() / 100.0;
            let net = ((rounded_inc - rounded_exp) * 100.0).round() / 100.0;
            Ok(IncomeExpenseTrendItem {
                period,
                income: rounded_inc,
                expense: rounded_exp,
                net,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn get_investment_performance_report(
    state: State<AppState>,
) -> Result<InvestmentPerformanceReport, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let base_currency: String = conn
        .query_row("SELECT base_currency FROM app_settings WHERE id = 1", [], |r| r.get(0))
        .unwrap_or_else(|_| "INR".to_string());

    let mut stmt = conn
        .prepare(
            "SELECT h.id, h.symbol, h.name, h.asset_type, a.name as acc_name,
                    h.quantity, h.avg_buy_price, h.last_price, h.currency
             FROM investment_holdings h
             INNER JOIN accounts a ON a.id = h.account_id
             WHERE h.is_archived = 0
             ORDER BY h.asset_type ASC, h.symbol ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, f64>(5)?,
                row.get::<_, f64>(6)?,
                row.get::<_, f64>(7)?,
                row.get::<_, String>(8)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut holdings = Vec::new();
    let mut total_cost_basis = 0.0;
    let mut total_current_value = 0.0;

    for r in rows.flatten() {
        let (id, symbol, name, asset_type, account_name, qty, buy, last, cur) = r;
        let rate = get_exchange_rate(&conn, &cur, &base_currency);

        let cost_basis = ((qty * buy * rate) * 100.0).round() / 100.0;
        let current_val = ((qty * last * rate) * 100.0).round() / 100.0;
        let unrealized = ((current_val - cost_basis) * 100.0).round() / 100.0;
        let pnl_pct = if cost_basis > 0.0 {
            ((unrealized / cost_basis) * 10000.0).round() / 100.0
        } else {
            0.0
        };

        total_cost_basis += cost_basis;
        total_current_value += current_val;

        holdings.push(HoldingPerformanceItem {
            id,
            symbol,
            name,
            asset_type,
            account_name,
            quantity: qty,
            avg_buy_price: buy,
            last_price: last,
            currency: cur,
            cost_basis_base: cost_basis,
            current_value_base: current_val,
            unrealized_pnl_base: unrealized,
            pnl_percent: pnl_pct,
        });
    }

    total_cost_basis = (total_cost_basis * 100.0).round() / 100.0;
    total_current_value = (total_current_value * 100.0).round() / 100.0;
    let total_unrealized_pnl = ((total_current_value - total_cost_basis) * 100.0).round() / 100.0;
    let total_pnl_percent = if total_cost_basis > 0.0 {
        ((total_unrealized_pnl / total_cost_basis) * 10000.0).round() / 100.0
    } else {
        0.0
    };

    Ok(InvestmentPerformanceReport {
        total_cost_basis,
        total_current_value,
        total_unrealized_pnl,
        total_pnl_percent,
        holdings,
    })
}

// --- Backup & Restore Commands (AGENTS.md Section 5.7) ---

fn get_backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let backups_dir = app_dir.join("backups");
    if !backups_dir.exists() {
        fs::create_dir_all(&backups_dir)
            .map_err(|e| format!("Failed to create backups directory: {}", e))?;
    }
    Ok(backups_dir)
}

#[tauri::command]
pub fn get_backups_list(app: AppHandle) -> Result<Vec<BackupFileInfo>, String> {
    let backups_dir = get_backups_dir(&app)?;
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(&backups_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("db") {
                let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                let metadata = entry.metadata().ok();
                let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                let created_at = metadata
                    .and_then(|m| m.modified().ok())
                    .map(|st| {
                        let dt: chrono::DateTime<Local> = st.into();
                        dt.format("%Y-%m-%d %H:%M:%S").to_string()
                    })
                    .unwrap_or_else(|| "Unknown".to_string());

                files.push(BackupFileInfo {
                    filename,
                    file_path: path.to_string_lossy().to_string(),
                    size_bytes,
                    created_at,
                });
            }
        }
    }

    files.sort_by(|a, b| b.filename.cmp(&a.filename));
    Ok(files)
}

#[tauri::command]
pub fn create_backup(
    app: AppHandle,
    state: State<AppState>,
    custom_dest_folder: Option<String>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Checkpoint WAL safely
    let _: Result<i64, _> = conn.query_row("PRAGMA wal_checkpoint(TRUNCATE);", [], |r| r.get(0));

    let db_path = crate::db::get_db_path(&app)?;
    if !db_path.exists() {
        return Err("Database file does not exist to back up".to_string());
    }

    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("lyncost_{}.db", timestamp);

    let (dest_path, is_internal) = if let Some(folder) = custom_dest_folder {
        let p = PathBuf::from(folder);
        if !p.exists() {
            fs::create_dir_all(&p).map_err(|e| format!("Failed to create destination folder: {}", e))?;
        }
        (p.join(&filename), false)
    } else {
        let internal_dir = get_backups_dir(&app)?;
        (internal_dir.join(&filename), true)
    };

    fs::copy(&db_path, &dest_path)
        .map_err(|e| format!("Failed to copy database file to {:?}: {}", dest_path, e))?;

    // Update last_backup_at
    conn.execute(
        "UPDATE app_settings SET last_backup_at = CURRENT_TIMESTAMP WHERE id = 1",
        [],
    ).map_err(|e| e.to_string())?;

    // If internal backups, maintain rotation: keep newest 10
    if is_internal {
        if let Ok(files) = get_backups_list(app) {
            if files.len() > 10 {
                for file_to_delete in &files[10..] {
                    let _ = fs::remove_file(&file_to_delete.file_path);
                }
            }
        }
    }

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn check_and_run_daily_backup(
    app: AppHandle,
    state: State<AppState>,
) -> Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let last_backup_at: Option<String> = conn
        .query_row("SELECT last_backup_at FROM app_settings WHERE id = 1", [], |r| r.get(0))
        .optional()
        .unwrap_or(None);

    let today_prefix = Local::now().format("%Y-%m-%d").to_string();

    if let Some(lb) = last_backup_at {
        if lb.starts_with(&today_prefix) {
            return Ok(None); // Already backed up today
        }
    }

    drop(conn);
    let path = create_backup(app, state, None)?;
    Ok(Some(path))
}

#[tauri::command]
pub fn restore_backup(
    app: AppHandle,
    state: State<AppState>,
    backup_file_path: String,
) -> Result<(), String> {
    let src = Path::new(&backup_file_path);
    if !src.exists() {
        return Err(format!("Backup file not found at {:?}", backup_file_path));
    }

    // Verify it's a valid sqlite database by opening it
    {
        let test_conn = Connection::open(src)
            .map_err(|e| format!("Selected file is not a valid SQLite database: {}", e))?;
        let test_count: Result<i64, _> = test_conn.query_row(
            "SELECT COUNT(*) FROM app_settings",
            [],
            |r| r.get(0),
        );
        if test_count.is_err() {
            return Err("Selected file is not a valid Lyncost database backup".to_string());
        }
    }

    let db_path = crate::db::get_db_path(&app)?;

    // Lock database mutex exclusively during entire restore operation
    let mut conn_guard = state.db.lock().map_err(|e| e.to_string())?;

    // Checkpoint and flush WAL mode
    let _ = conn_guard.execute_batch("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA foreign_keys = OFF;");

    // Remove WAL and SHM files
    let wal_path = db_path.with_extension("db-wal");
    let shm_path = db_path.with_extension("db-shm");
    let _ = fs::remove_file(&wal_path);
    let _ = fs::remove_file(&shm_path);

    fs::copy(src, &db_path)
        .map_err(|e| format!("Failed to restore database file: {}", e))?;

    // Reopen restored database
    let mut new_conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to reopen restored database: {}", e))?;
    new_conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;"
    ).map_err(|e| e.to_string())?;

    crate::db::run_migrations(&mut new_conn)?;
    let _ = crate::db::seed_defaults(&new_conn);

    *conn_guard = new_conn;

    Ok(())
}

// --- Settings Commands ---

#[tauri::command]
pub fn set_base_currency(state: State<AppState>, new_currency: String) -> Result<(), String> {
    let cur = new_currency.trim().to_uppercase();
    if cur.len() < 2 || cur.len() > 5 {
        return Err("Currency code must be 3-4 letters (e.g. INR, USD, EUR)".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = crate::db::seed_defaults(&conn);

    conn.execute(
        "INSERT INTO app_settings (id, base_currency) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET base_currency = excluded.base_currency",
        params![cur],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_app_theme(state: State<AppState>, theme: String) -> Result<(), String> {
    let t = theme.trim().to_lowercase();
    if t != "dark" && t != "light" {
        return Err("Theme must be 'dark' or 'light'".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = crate::db::seed_defaults(&conn);

    conn.execute(
        "INSERT INTO app_settings (id, theme) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET theme = excluded.theme",
        params![t],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn change_pin(state: State<AppState>, payload: ChangePinPayload) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = crate::db::seed_defaults(&conn);

    let current_hash: Option<String> = conn
        .query_row("SELECT pin_hash FROM app_settings WHERE id = 1", [], |r| r.get(0))
        .optional()
        .unwrap_or(None);

    if let Some(hash) = current_hash {
        let is_valid = bcrypt::verify(payload.current_pin.trim(), &hash).unwrap_or(false);
        if !is_valid {
            return Err("Current PIN is incorrect".to_string());
        }
    }

    let new_trimmed = payload.new_pin.trim();
    if new_trimmed.len() != 6 || !new_trimmed.chars().all(|c| c.is_ascii_digit()) {
        return Err("New PIN must be exactly 6 digits".to_string());
    }

    let new_hash = bcrypt::hash(new_trimmed, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash PIN: {}", e))?;

    conn.execute(
        "INSERT INTO app_settings (id, pin_hash) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET pin_hash = excluded.pin_hash",
        params![new_hash],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// --- Notifications & Reminders ---

#[tauri::command]
pub fn update_notification_settings(
    state: State<AppState>,
    payload: UpdateNotificationSettingsPayload,
) -> Result<AppSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = crate::db::seed_defaults(&conn);
    let os_val = if payload.notify_os { 1 } else { 0 };
    let advance_days = if payload.notify_advance_days < 0 { 1 } else { payload.notify_advance_days };

    conn.execute(
        "INSERT INTO app_settings (id, notify_os, notify_advance_days) VALUES (1, ?1, ?2)
         ON CONFLICT(id) DO UPDATE SET
            notify_os = excluded.notify_os,
            notify_advance_days = excluded.notify_advance_days",
        params![os_val, advance_days],
    ).map_err(|e| format!("Failed to update notification settings: {}", e))?;

    drop(conn);
    get_app_settings(state)
}

#[tauri::command]
pub fn send_os_desktop_notification(title: String, body: String) -> Result<(), String> {
    let _ = std::process::Command::new("notify-send")
        .arg("-a")
        .arg("Lyncost")
        .arg("-u")
        .arg("normal")
        .arg(title)
        .arg(body)
        .output();
    Ok(())
}

#[tauri::command]
pub fn check_and_send_due_reminders(state: State<AppState>) -> Result<Vec<BillReminder>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let (notify_os, advance_days, base_curr, last_check): (
        i64, i64, String, Option<String>
    ) = conn.query_row(
        "SELECT notify_os, notify_advance_days, base_currency, last_notification_check_at FROM app_settings WHERE id = 1",
        [],
        |r| Ok((
            r.get(0).unwrap_or(1),
            r.get(1).unwrap_or(1),
            r.get::<_, Option<String>>(2)?.unwrap_or_else(|| "INR".to_string()),
            r.get(3)?
        )),
    ).unwrap_or((1, 1, "INR".to_string(), None));

    let today = Local::now().date_naive();
    let today_str = today.format("%Y-%m-%d").to_string();

    let mut stmt = conn.prepare(
        "SELECT b.id, b.name, b.amount, b.due_date, a.name
         FROM bills b
         LEFT JOIN accounts a ON b.account_id = a.id
         WHERE b.is_paid = 0
         ORDER BY b.due_date ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, f64>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, Option<String>>(4)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut reminders: Vec<BillReminder> = Vec::new();
    let mut alerts_to_send: Vec<(String, String)> = Vec::new();

    for r in rows.filter_map(|x| x.ok()) {
        let (id, name, amount, due_str, acc_name) = r;
        if let Ok(due) = NaiveDate::parse_from_str(&due_str, "%Y-%m-%d") {
            let days_diff = (due - today).num_days();

            let status = if days_diff < 0 {
                "overdue".to_string()
            } else if days_diff == 0 {
                "due_today".to_string()
            } else if days_diff <= advance_days {
                "due_tomorrow".to_string()
            } else {
                continue;
            };

            let reminder = BillReminder {
                bill_id: id,
                bill_name: name.clone(),
                amount,
                due_date: due_str.clone(),
                account_name: acc_name.clone(),
                status: status.clone(),
                days_until_due: days_diff,
            };
            reminders.push(reminder);

            let time_desc = if days_diff < 0 {
                format!("is OVERDUE by {} day(s)!", days_diff.abs())
            } else if days_diff == 0 {
                "is due TODAY!".to_string()
            } else if days_diff == 1 {
                "is due TOMORROW (1 day left)!".to_string()
            } else {
                format!("is due in {} days!", days_diff)
            };

            let account_label = acc_name.unwrap_or_else(|| "Default account".to_string());
            let title = format!("Lyncost: {}", name);
            let body = format!(
                "{} ({:.2} {}) {}\nPay from: {}",
                name, amount, base_curr, time_desc, account_label
            );
            alerts_to_send.push((title, body));
        }
    }

    let already_notified_today = last_check.as_deref().map(|s| s.starts_with(&today_str)).unwrap_or(false);

    if !already_notified_today && !alerts_to_send.is_empty() {
        if notify_os == 1 {
            for (title, body) in &alerts_to_send {
                let _ = std::process::Command::new("notify-send")
                    .arg("-a")
                    .arg("Lyncost")
                    .arg("-u")
                    .arg("normal")
                    .arg(title)
                    .arg(body)
                    .output();
            }
        }

        let now_full = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let _ = conn.execute(
            "UPDATE app_settings SET last_notification_check_at = ?1 WHERE id = 1",
            params![now_full],
        );
    }

    Ok(reminders)
}

// --- In-App Auto Update System ---
fn is_version_greater(latest: &str, current: &str) -> bool {
    let parse_parts = |v: &str| -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|p| p.parse::<u32>().ok())
            .collect()
    };
    let l_parts = parse_parts(latest);
    let c_parts = parse_parts(current);

    for i in 0..std::cmp::max(l_parts.len(), c_parts.len()) {
        let l = l_parts.get(i).copied().unwrap_or(0);
        let c = c_parts.get(i).copied().unwrap_or(0);
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }
    false
}

#[tauri::command]
pub fn check_app_update() -> Result<AppUpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();

    let output = std::process::Command::new("curl")
        .arg("-fsSL")
        .arg("--connect-timeout")
        .arg("4")
        .arg("--max-time")
        .arg("8")
        .arg("https://raw.githubusercontent.com/raizenquick/lyncost/main/version.json")
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            if let Ok(json_str) = String::from_utf8(out.stdout) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    let latest_ver = val["version"].as_str().unwrap_or(&current_version).to_string();
                    let release_notes = val["notes"].as_str().unwrap_or("Performance improvements and bug fixes.").to_string();
                    let published_at = val["release_date"].as_str().unwrap_or("").to_string();
                    let default_url = format!(
                        "https://raw.githubusercontent.com/raizenquick/lyncost/main/dist-packages/lyncost-{}-linux-x86_64.tar.gz",
                        latest_ver
                    );
                    let download_url = val["tarball_url"].as_str().unwrap_or(&default_url).to_string();

                    let has_update = is_version_greater(&latest_ver, &current_version);

                    return Ok(AppUpdateInfo {
                        has_update,
                        current_version: current_version.clone(),
                        latest_version: latest_ver,
                        release_notes,
                        published_at,
                        download_url,
                    });
                }
            }
        }
    }

    Ok(AppUpdateInfo {
        has_update: false,
        current_version: current_version.clone(),
        latest_version: current_version,
        release_notes: String::new(),
        published_at: String::new(),
        download_url: String::new(),
    })
}

#[tauri::command]
pub fn install_app_update(download_url: Option<String>) -> Result<String, String> {
    let url = download_url.unwrap_or_else(|| {
        format!("https://raw.githubusercontent.com/raizenquick/lyncost/main/dist-packages/lyncost-{}-linux-x86_64.tar.gz", env!("CARGO_PKG_VERSION"))
    });

    // Security Guard: Validate update package URL origin against official trusted endpoints
    let is_trusted_url = url.starts_with("https://github.com/raizenquick/lyncost/")
        || url.starts_with("https://raw.githubusercontent.com/raizenquick/lyncost/");
    if !is_trusted_url {
        return Err("Untrusted update source. Update binaries must originate from the verified official repository.".to_string());
    }

    let home = std::env::var("HOME").map_err(|_| "Could not find HOME directory".to_string())?;
    let target_bin_dir = PathBuf::from(&home).join(".local/bin");
    let target_bin = target_bin_dir.join("lyncost");
    let temp_dir = PathBuf::from("/tmp/lyncost_update_staging");

    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp directory: {}", e))?;

    let tar_file = temp_dir.join("package.tar.gz");

    let curl_status = std::process::Command::new("curl")
        .arg("-fsSL")
        .arg("--connect-timeout")
        .arg("10")
        .arg(&url)
        .arg("-o")
        .arg(&tar_file)
        .status()
        .map_err(|e| format!("Failed to download update: {}", e))?;

    if !curl_status.success() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Failed to download update package. Please verify network connection.".to_string());
    }

    let tar_status = std::process::Command::new("tar")
        .arg("-xzf")
        .arg(&tar_file)
        .arg("-C")
        .arg(&temp_dir)
        .status()
        .map_err(|e| format!("Failed to extract update package: {}", e))?;

    if !tar_status.success() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Failed to extract update archive".to_string());
    }

    let mut extracted_bin = temp_dir.join("lyncost");
    if !extracted_bin.exists() {
        if let Ok(entries) = fs::read_dir(&temp_dir) {
            for entry in entries.flatten() {
                let candidate = entry.path().join("lyncost");
                if candidate.exists() {
                    extracted_bin = candidate;
                    break;
                }
            }
        }
    }

    if !extracted_bin.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Extracted package is missing 'lyncost' executable".to_string());
    }

    fs::create_dir_all(&target_bin_dir).map_err(|e| format!("Failed to ensure ~/.local/bin exists: {}", e))?;

    let staging_bin = target_bin_dir.join("lyncost.new");
    fs::copy(&extracted_bin, &staging_bin).map_err(|e| format!("Failed to stage binary: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&staging_bin, fs::Permissions::from_mode(0o755));
    }

    fs::rename(&staging_bin, &target_bin).map_err(|e| format!("Failed to replace lyncost executable: {}", e))?;

    let _ = fs::remove_dir_all(&temp_dir);

    Ok("Update installed successfully!".to_string())
}

#[tauri::command]
pub fn restart_application(app: AppHandle) -> Result<(), String> {
    app.restart();
}

// --- Payment Methods Commands ---

#[tauri::command]
pub fn get_payment_methods(state: State<'_, AppState>) -> Result<Vec<PaymentMethodItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, type_key, currency, icon, color, is_default, is_active, created_at
             FROM payment_methods
             ORDER BY is_default DESC, id ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            Ok(PaymentMethodItem {
                id: row.get(0)?,
                name: row.get(1)?,
                type_key: row.get(2)?,
                currency: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
                is_default: row.get(6)?,
                is_active: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn create_payment_method(
    state: State<'_, AppState>,
    payload: CreatePaymentMethodPayload,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let name = payload.name.trim();
    if name.is_empty() {
        return Err("Payment method name cannot be empty".to_string());
    }

    let type_key = payload.type_key.unwrap_or_else(|| "custom".to_string());
    let icon = payload.icon.unwrap_or_else(|| "Wallet".to_string());
    let color = payload.color.unwrap_or_else(|| "#8b5cf6".to_string());
    let is_default = payload.is_default.unwrap_or(0);

    if is_default == 1 {
        let _ = conn.execute("UPDATE payment_methods SET is_default = 0", []);
    }

    conn.execute(
        "INSERT INTO payment_methods (name, type_key, currency, icon, color, is_default, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
        params![name, type_key, payload.currency, icon, color, is_default],
    )
    .map_err(|e| format!("Failed to create payment method: {}", e))?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_payment_method(
    state: State<'_, AppState>,
    id: i64,
    payload: UpdatePaymentMethodPayload,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let name = payload.name.trim();
    if name.is_empty() {
        return Err("Payment method name cannot be empty".to_string());
    }

    let type_key = payload.type_key.unwrap_or_else(|| "custom".to_string());
    let icon = payload.icon.unwrap_or_else(|| "Wallet".to_string());
    let color = payload.color.unwrap_or_else(|| "#8b5cf6".to_string());
    let is_default = payload.is_default.unwrap_or(0);

    if is_default == 1 {
        let _ = conn.execute("UPDATE payment_methods SET is_default = 0 WHERE id != ?1", params![id]);
    }

    conn.execute(
        "UPDATE payment_methods
         SET name = ?1, type_key = ?2, currency = ?3, icon = ?4, color = ?5, is_default = ?6, is_active = ?7
         WHERE id = ?8",
        params![name, type_key, payload.currency, icon, color, is_default, payload.is_active, id],
    )
    .map_err(|e| format!("Failed to update payment method: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_payment_method(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM payment_methods WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete payment method: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn apply_regional_payment_presets(
    state: State<'_, AppState>,
    currency: String,
) -> Result<Vec<PaymentMethodItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let curr = currency.trim().to_uppercase();

    // Define presets by currency
    let presets: Vec<(&str, &str, &str, &str, i64)> = match curr.as_str() {
        "INR" => vec![
            ("Cash", "cash", "Coins", "#10b981", 0),
            ("Bank Account", "bank", "Building2", "#3b82f6", 0),
            ("UPI (GPay / PhonePe)", "upi", "Smartphone", "#8b5cf6", 1),
            ("Credit Card", "credit_card", "CreditCard", "#f43f5e", 0),
            ("Debit Card", "debit_card", "CreditCard", "#06b6d4", 0),
            ("Paytm Wallet", "wallet", "Wallet", "#0284c7", 0),
            ("Net Banking", "bank", "Globe", "#4f46e5", 0),
        ],
        "USD" => vec![
            ("Cash", "cash", "Coins", "#10b981", 0),
            ("Checking Account", "bank", "Building2", "#3b82f6", 1),
            ("Credit Card", "credit_card", "CreditCard", "#f43f5e", 0),
            ("Debit Card", "debit_card", "CreditCard", "#06b6d4", 0),
            ("Apple Pay", "wallet", "Smartphone", "#94a3b8", 0),
            ("Google Pay", "wallet", "Smartphone", "#4285f4", 0),
            ("Venmo", "wallet", "Send", "#008cff", 0),
            ("Zelle", "bank", "Zap", "#7414ca", 0),
            ("PayPal", "wallet", "Wallet", "#003087", 0),
        ],
        "EUR" => vec![
            ("Cash", "cash", "Coins", "#10b981", 0),
            ("Bank Account (SEPA)", "bank", "Building2", "#3b82f6", 1),
            ("Credit Card", "credit_card", "CreditCard", "#f43f5e", 0),
            ("Debit Card", "debit_card", "CreditCard", "#06b6d4", 0),
            ("Apple Pay", "wallet", "Smartphone", "#94a3b8", 0),
            ("Google Pay", "wallet", "Smartphone", "#4285f4", 0),
            ("Revolut", "bank", "Wallet", "#0075eb", 0),
            ("PayPal", "wallet", "Wallet", "#003087", 0),
        ],
        "GBP" => vec![
            ("Cash", "cash", "Coins", "#10b981", 0),
            ("Bank Account", "bank", "Building2", "#3b82f6", 1),
            ("Credit Card", "credit_card", "CreditCard", "#f43f5e", 0),
            ("Debit Card", "debit_card", "CreditCard", "#06b6d4", 0),
            ("Apple Pay", "wallet", "Smartphone", "#94a3b8", 0),
            ("Google Pay", "wallet", "Smartphone", "#4285f4", 0),
            ("Monzo / Revolut", "bank", "Wallet", "#ff3366", 0),
        ],
        "JPY" => vec![
            ("現金 (Cash)", "cash", "Coins", "#10b981", 1),
            ("銀行振込 (Bank)", "bank", "Building2", "#3b82f6", 0),
            ("クレジットカード (Credit Card)", "credit_card", "CreditCard", "#f43f5e", 0),
            ("PayPay", "wallet", "Smartphone", "#ff0033", 0),
            ("Suica / Pasmo (交通系IC)", "wallet", "CreditCard", "#22c55e", 0),
            ("LINE Pay", "wallet", "Smartphone", "#06c755", 0),
        ],
        "BRL" => vec![
            ("Dinheiro (Cash)", "cash", "Coins", "#10b981", 0),
            ("Conta Bancária", "bank", "Building2", "#3b82f6", 0),
            ("Pix", "upi", "Zap", "#32bcad", 1),
            ("Cartão de Crédito", "credit_card", "CreditCard", "#f43f5e", 0),
            ("Cartão de Débito", "debit_card", "CreditCard", "#06b6d4", 0),
            ("Boleto", "custom", "FileText", "#f59e0b", 0),
        ],
        _ => vec![
            ("Cash", "cash", "Coins", "#10b981", 1),
            ("Bank Account", "bank", "Building2", "#3b82f6", 0),
            ("Credit Card", "credit_card", "CreditCard", "#f43f5e", 0),
            ("Debit Card", "debit_card", "CreditCard", "#06b6d4", 0),
            ("Mobile Payment", "wallet", "Smartphone", "#8b5cf6", 0),
            ("Digital Wallet", "wallet", "Wallet", "#06b6d4", 0),
        ],
    };

    // Insert or activate presets
    for (name, type_key, icon, color, is_default) in presets {
        let exists: Result<i64, _> = conn.query_row(
            "SELECT id FROM payment_methods WHERE LOWER(name) = LOWER(?1)",
            params![name],
            |r| r.get(0),
        );

        if let Ok(id) = exists {
            let _ = conn.execute(
                "UPDATE payment_methods SET is_active = 1 WHERE id = ?1",
                params![id],
            );
        } else {
            let _ = conn.execute(
                "INSERT INTO payment_methods (name, type_key, currency, icon, color, is_default, is_active)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
                params![name, type_key, curr, icon, color, is_default],
            );
        }
    }

    drop(conn);
    get_payment_methods(state)
}

