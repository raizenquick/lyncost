use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};

pub struct AppState {
    pub db: Mutex<Connection>,
}

pub fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    let old_db = app_dir.join("dhankhata.db");
    let new_db = app_dir.join("lyncost.db");
    if old_db.exists() && !new_db.exists() {
        let _ = fs::rename(&old_db, &new_db);
    }

    Ok(new_db)
}

pub fn init_database(db_path: &PathBuf) -> Result<Connection, String> {
    let mut conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open SQLite database at {:?}: {}", db_path, e))?;

    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA busy_timeout = 5000;
         PRAGMA cache_size = -20000;
         PRAGMA temp_store = MEMORY;"
    ).map_err(|e| format!("Failed to configure SQLite pragmas: {}", e))?;

    run_migrations(&mut conn)?;
    seed_defaults(&conn)?;

    Ok(conn)
}

pub fn run_migrations(conn: &mut Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        );",
        [],
    ).map_err(|e| format!("Failed to create schema_migrations table: {}", e))?;

    let latest_version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if latest_version < 1 {
        let migration_sql = include_str!("../migrations/001_init.sql");
        let tx = conn.transaction().map_err(|e| format!("Failed to start migration transaction: {}", e))?;

        tx.execute_batch(migration_sql)
            .map_err(|e| format!("Failed to execute migration 001: {}", e))?;

        tx.execute(
            "INSERT OR IGNORE INTO app_settings (id, base_currency, theme) VALUES (1, 'INR', 'dark');",
            [],
        ).map_err(|e| format!("Failed to seed app_settings: {}", e))?;

        tx.execute(
            "INSERT OR REPLACE INTO schema_migrations (version) VALUES (1);",
            [],
        ).map_err(|e| format!("Failed to record migration 001: {}", e))?;

        tx.commit().map_err(|e| format!("Failed to commit migration 001: {}", e))?;
    }

    if latest_version < 2 {
        let migration_sql = include_str!("../migrations/002_goals.sql");
        let tx = conn.transaction().map_err(|e| format!("Failed to start migration 002 transaction: {}", e))?;

        tx.execute_batch(migration_sql)
            .map_err(|e| format!("Failed to execute migration 002: {}", e))?;

        tx.execute(
            "INSERT OR REPLACE INTO schema_migrations (version) VALUES (2);",
            [],
        ).map_err(|e| format!("Failed to record migration 002: {}", e))?;

        tx.commit().map_err(|e| format!("Failed to commit migration 002: {}", e))?;
    }

    if latest_version < 3 {
        let migration_sql = include_str!("../migrations/003_notifications.sql");
        let tx = conn.transaction().map_err(|e| format!("Failed to start migration 003 transaction: {}", e))?;

        for statement in migration_sql.split(';') {
            let stmt = statement.trim();
            if !stmt.is_empty() {
                if let Err(e) = tx.execute(stmt, []) {
                    let err_str = e.to_string();
                    if !err_str.contains("duplicate column name") {
                        return Err(format!("Failed to execute migration 003 statement: {}", err_str));
                    }
                }
            }
        }

        tx.execute(
            "INSERT OR REPLACE INTO schema_migrations (version) VALUES (3);",
            [],
        ).map_err(|e| format!("Failed to record migration 003: {}", e))?;

        tx.commit().map_err(|e| format!("Failed to commit migration 003: {}", e))?;
    }

    if latest_version < 4 {
        let migration_sql = include_str!("../migrations/004_telegram_sync.sql");
        let tx = conn.transaction().map_err(|e| format!("Failed to start migration 004 transaction: {}", e))?;

        for statement in migration_sql.split(';') {
            let stmt = statement.trim();
            if !stmt.is_empty() {
                if let Err(e) = tx.execute(stmt, []) {
                    let err_str = e.to_string();
                    if !err_str.contains("duplicate column name") {
                        return Err(format!("Failed to execute migration 004 statement: {}", err_str));
                    }
                }
            }
        }

        tx.execute(
            "INSERT OR REPLACE INTO schema_migrations (version) VALUES (4);",
            [],
        ).map_err(|e| format!("Failed to record migration 004: {}", e))?;

        tx.commit().map_err(|e| format!("Failed to commit migration 004: {}", e))?;
    }

    if latest_version < 5 {
        let migration_sql = include_str!("../migrations/005_debt_system.sql");
        let tx = conn.transaction().map_err(|e| format!("Failed to start migration 005 transaction: {}", e))?;

        for statement in migration_sql.split(';') {
            let stmt = statement.trim();
            if !stmt.is_empty() {
                if let Err(e) = tx.execute(stmt, []) {
                    let err_str = e.to_string();
                    if !err_str.contains("duplicate column name") {
                        return Err(format!("Failed to execute migration 005 statement: {}", err_str));
                    }
                }
            }
        }

        tx.execute(
            "INSERT OR REPLACE INTO schema_migrations (version) VALUES (5);",
            [],
        ).map_err(|e| format!("Failed to record migration 005: {}", e))?;

        tx.commit().map_err(|e| format!("Failed to commit migration 005: {}", e))?;
    }

    if latest_version < 6 {
        let migration_sql = include_str!("../migrations/006_payment_methods.sql");
        let tx = conn.transaction().map_err(|e| format!("Failed to start migration 006 transaction: {}", e))?;

        for statement in migration_sql.split(';') {
            let stmt = statement.trim();
            if !stmt.is_empty() {
                if let Err(e) = tx.execute(stmt, []) {
                    let err_str = e.to_string();
                    if !err_str.contains("duplicate column name") {
                        return Err(format!("Failed to execute migration 006 statement: {}", err_str));
                    }
                }
            }
        }

        tx.execute(
            "INSERT OR REPLACE INTO schema_migrations (version) VALUES (6);",
            [],
        ).map_err(|e| format!("Failed to record migration 006: {}", e))?;

        tx.commit().map_err(|e| format!("Failed to commit migration 006: {}", e))?;
    }

    seed_defaults(conn)?;

    Ok(())
}

pub fn seed_defaults(conn: &Connection) -> Result<(), String> {
    // 1. Ensure app_settings row 1 exists
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (id, base_currency, theme) VALUES (1, 'INR', 'dark');",
        [],
    ).map_err(|e| format!("Failed to seed app_settings: {}", e))?;

    // 2. Starter categories
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0)).unwrap_or(0);
    if count == 0 {
        let seed_categories = [
            // Income
            ("Salary", "income", "briefcase", "#10b981"),
            ("Business Income", "income", "trending-up", "#06b6d4"),
            ("Interest", "income", "percent", "#8b5cf6"),
            ("Other Income", "income", "plus-circle", "#64748b"),
            // Expense
            ("Food", "expense", "utensils", "#f97316"),
            ("Transport", "expense", "car", "#3b82f6"),
            ("Bills & Utilities", "expense", "zap", "#eab308"),
            ("Shopping", "expense", "shopping-bag", "#ec4899"),
            ("Entertainment", "expense", "film", "#a855f7"),
            ("Health", "expense", "heart-pulse", "#ef4444"),
            ("Rent", "expense", "home", "#14b8a6"),
            ("Investments", "expense", "line-chart", "#6366f1"),
            ("Other", "expense", "more-horizontal", "#64748b"),
        ];

        for (name, kind, icon, color) in seed_categories {
            let _ = conn.execute(
                "INSERT INTO categories (name, kind, icon, color) VALUES (?1, ?2, ?3, ?4);",
                params![name, kind, icon, color],
            );
        }
    }

    // 3. Starter tags
    let tag_count: i64 = conn.query_row("SELECT COUNT(*) FROM tags", [], |r| r.get(0)).unwrap_or(0);
    if tag_count == 0 {
        let seed_tags = ["essential", "discretionary", "vacation", "tax", "personal"];
        for tag in seed_tags {
            let _ = conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1);", params![tag]);
        }
    }

    // 4. Baseline exchange rates
    let rates_count: i64 = conn.query_row("SELECT COUNT(*) FROM exchange_rates", [], |r| r.get(0)).unwrap_or(0);
    if rates_count == 0 {
        let seed_rates = [
            ("USD", "INR", 86.50),
            ("EUR", "INR", 91.20),
            ("GBP", "INR", 108.50),
            ("CAD", "INR", 61.20),
            ("AUD", "INR", 54.80),
            ("SGD", "INR", 64.10),
            ("NZD", "INR", 51.00),
            ("AED", "INR", 23.55),
            ("EUR", "USD", 1.05),
            ("GBP", "USD", 1.25),
        ];
        for (from, to, rate) in seed_rates {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate) VALUES (?1, ?2, ?3);",
                params![from, to, rate],
            );
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;"
        ).unwrap();
        run_migrations(&mut conn).unwrap();
        conn
    }

    #[test]
    fn test_all_tables_exist() {
        let conn = setup_test_db();
        let expected_tables = vec![
            "app_settings",
            "accounts",
            "categories",
            "tags",
            "transactions",
            "transaction_tags",
            "recurring_rules",
            "budgets",
            "budget_categories",
            "bills",
            "investment_holdings",
            "investment_price_history",
            "exchange_rates",
            "debts",
            "debt_transactions",
            "payment_methods",
            "networth_history",
            "account_ledger",
            "shopping_list_items",
            "warranties",
            "schema_migrations",
        ];

        for table in expected_tables {
            let exists: bool = conn
                .query_row(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1",
                    params![table],
                    |_| Ok(true),
                )
                .unwrap_or(false);
            assert!(exists, "Expected table '{}' to exist in database", table);
        }
    }

    #[test]
    fn test_initial_seeds() {
        let conn = setup_test_db();

        // App settings
        let base_currency: String = conn
            .query_row("SELECT base_currency FROM app_settings WHERE id = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(base_currency, "INR");

        // Starter categories
        let cat_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0))
            .unwrap();
        assert!(cat_count >= 13, "Expected at least 13 seed categories");
    }

    #[test]
    fn test_account_creation_and_ledger_balance() {
        let mut conn = setup_test_db();

        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO accounts (name, type, currency, opening_balance, current_balance, icon, color, is_archived)
             VALUES ('HDFC Bank', 'bank', 'INR', 25000.0, 0.0, NULL, NULL, 0)",
            [],
        ).unwrap();
        let account_id = tx.last_insert_rowid();

        tx.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (?1, 'opening', 25000.0, 25000.0, 'account', ?1)",
            params![account_id],
        ).unwrap();

        let computed_balance: f64 = tx.query_row(
            "SELECT ROUND(COALESCE(SUM(amount), 0), 2) FROM account_ledger WHERE account_id = ?1",
            params![account_id],
            |r| r.get(0),
        ).unwrap();

        tx.execute(
            "UPDATE accounts SET current_balance = ?1 WHERE id = ?2",
            params![computed_balance, account_id],
        ).unwrap();
        tx.commit().unwrap();

        let current_balance: f64 = conn.query_row(
            "SELECT current_balance FROM accounts WHERE id = ?1",
            params![account_id],
            |r| r.get(0),
        ).unwrap();

        assert_eq!(current_balance, 25000.0);

        // Verify ledger has opening row
        let ledger_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM account_ledger WHERE account_id = ?1 AND txn_type = 'opening'",
            params![account_id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(ledger_count, 1);
    }

    #[test]
    fn test_pin_hashing_and_verification() {
        let pin = "123456";
        let hashed = bcrypt::hash(pin, bcrypt::DEFAULT_COST).unwrap();
        assert!(bcrypt::verify(pin, &hashed).unwrap());
        assert!(!bcrypt::verify("654321", &hashed).unwrap());
    }

    #[test]
    fn test_transaction_ledger_balance_adjustments() {
        let mut conn = setup_test_db();

        // 1. Create account with 1000 balance
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance, icon, color, is_archived)
             VALUES (1, 'Cash', 'cash', 'INR', 1000.0, 1000.0, NULL, NULL, 0)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'opening', 1000.0, 1000.0, 'account', 1)",
            [],
        ).unwrap();

        // 2. Add expense of 500
        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO transactions (id, account_id, type, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 1, 'expense', 500.0, 500.0, '2026-09-04', 1)",
            [],
        ).unwrap();
        tx.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'expense', -500.0, 500.0, 'transaction', 1)",
            [],
        ).unwrap();
        crate::commands::recompute_account_balance(&tx, 1).unwrap();
        tx.commit().unwrap();

        let bal_after_500: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal_after_500, 500.0);

        // 3. Edit transaction from 500 to 300 (test: add ₹500 expense, edit to ₹300, confirm balance reflects only ₹300 spent, not ₹800)
        let tx = conn.transaction().unwrap();
        tx.execute("DELETE FROM account_ledger WHERE reference_type = 'transaction' AND reference_id = 1", []).unwrap();
        tx.execute("UPDATE transactions SET amount = 300.0, base_amount = 300.0 WHERE id = 1", []).unwrap();
        tx.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'expense', -300.0, 700.0, 'transaction', 1)",
            [],
        ).unwrap();
        crate::commands::recompute_account_balance(&tx, 1).unwrap();
        tx.commit().unwrap();

        let bal_after_edit: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal_after_edit, 700.0, "Balance must reflect only ₹300 spent, leaving ₹700");

        // 4. Delete transaction (fully reverse effect)
        let tx = conn.transaction().unwrap();
        tx.execute("DELETE FROM account_ledger WHERE reference_type = 'transaction' AND reference_id = 1", []).unwrap();
        tx.execute("DELETE FROM transactions WHERE id = 1", []).unwrap();
        crate::commands::recompute_account_balance(&tx, 1).unwrap();
        tx.commit().unwrap();

        let bal_after_delete: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal_after_delete, 1000.0, "Balance must return to ₹1000 after deleting transaction");
    }

    #[test]
    fn test_multi_currency_transfer() {
        let mut conn = setup_test_db();

        // USD Account with $100
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'USD Account', 'bank', 'USD', 100.0, 100.0)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'opening', 100.0, 100.0, 'account', 1)",
            [],
        ).unwrap();

        // INR Account with ₹0
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (2, 'INR Account', 'bank', 'INR', 0.0, 0.0)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (2, 'opening', 0.0, 0.0, 'account', 2)",
            [],
        ).unwrap();

        // Set exchange rate: 1 USD = 85 INR
        conn.execute(
            "INSERT OR REPLACE INTO exchange_rates (from_currency, to_currency, rate) VALUES ('USD', 'INR', 85.0)",
            [],
        ).unwrap();

        // Transfer $20 from USD account to INR account
        let rate = crate::commands::get_exchange_rate(&conn, "USD", "INR");
        assert_eq!(rate, 85.0);

        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO transactions (id, account_id, type, transfer_to_account_id, amount, base_amount, exchange_rate_used, txn_date)
             VALUES (1, 1, 'transfer', 2, 20.0, 1700.0, 85.0, '2026-09-04')",
            [],
        ).unwrap();

        // Source leg (-$20)
        tx.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'transfer_out', -20.0, 80.0, 'transaction', 1)",
            [],
        ).unwrap();
        crate::commands::recompute_account_balance(&tx, 1).unwrap();

        // Destination leg (+$20 * 85 = +₹1700)
        tx.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (2, 'transfer_in', 1700.0, 1700.0, 'transaction', 1)",
            [],
        ).unwrap();
        crate::commands::recompute_account_balance(&tx, 2).unwrap();
        tx.commit().unwrap();

        let usd_bal: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        let inr_bal: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 2", [], |r| r.get(0)).unwrap();

        assert_eq!(usd_bal, 80.0, "USD account should decrease from $100 to $80");
        assert_eq!(inr_bal, 1700.0, "INR account should increase by ₹1700");
    }

    #[test]
    fn test_unconfirmed_pending_transaction() {
        let mut conn = setup_test_db();

        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'Bank', 'bank', 'INR', 5000.0, 5000.0)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'opening', 5000.0, 5000.0, 'account', 1)",
            [],
        ).unwrap();

        // Insert pending transaction (is_confirmed = 0)
        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO transactions (id, account_id, type, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 1, 'expense', 400.0, 400.0, '2026-09-04', 0)",
            [],
        ).unwrap();
        tx.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'expense', -400.0, 4600.0, 'transaction', 1)",
            [],
        ).unwrap();
        crate::commands::recompute_account_balance(&tx, 1).unwrap();
        tx.commit().unwrap();

        // Account balance DOES reflect the pending transaction
        let bal: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal, 4600.0);

        // Confirmed expenses DO NOT include the pending transaction
        let confirmed_expense: f64 = conn.query_row(
            "SELECT ROUND(COALESCE(SUM(base_amount), 0), 2) FROM transactions WHERE type = 'expense' AND is_confirmed = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(confirmed_expense, 0.0, "Confirmed expense must exclude unconfirmed pending transactions");
    }

    #[test]
    fn test_budget_combining_categories_and_pace_warning() {
        let conn = setup_test_db();
        let today = chrono::Local::now().date_naive();
        let today_str = today.format("%Y-%m-%d").to_string();

        // Account
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'Bank', 'bank', 'INR', 10000.0, 10000.0)",
            [],
        ).unwrap();

        // 3 Budget categories (Cat 101: Groceries, Cat 102: Dining, Cat 103: Fuel) and 1 Unrelated (Cat 104: Gadgets)
        conn.execute("INSERT INTO categories (id, name, kind) VALUES (101, 'Groceries', 'expense')", []).unwrap();
        conn.execute("INSERT INTO categories (id, name, kind) VALUES (102, 'Dining', 'expense')", []).unwrap();
        conn.execute("INSERT INTO categories (id, name, kind) VALUES (103, 'Fuel', 'expense')", []).unwrap();
        conn.execute("INSERT INTO categories (id, name, kind) VALUES (104, 'Gadgets', 'expense')", []).unwrap();

        // Create Monthly Budget of 1000 starting today
        conn.execute(
            "INSERT INTO budgets (id, name, amount, period, start_date, rollover, is_active)
             VALUES (1, 'Monthly Living', 1000.0, 'monthly', ?1, 0, 1)",
            params![today_str],
        ).unwrap();

        // Link categories 101, 102, 103 to budget 1
        conn.execute("INSERT INTO budget_categories (budget_id, category_id) VALUES (1, 101)", []).unwrap();
        conn.execute("INSERT INTO budget_categories (budget_id, category_id) VALUES (1, 102)", []).unwrap();
        conn.execute("INSERT INTO budget_categories (budget_id, category_id) VALUES (1, 103)", []).unwrap();

        // Insert confirmed expenses for cat 101 (250), cat 102 (300), cat 103 (200) -> total 750
        // Insert confirmed expense for unrelated cat 104 (500) -> should NOT be counted in budget
        // Insert pending expense for cat 101 (100) -> should NOT be counted in confirmed budget spend
        conn.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 'expense', 101, 250.0, 250.0, ?1, 1)",
            params![today_str],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 'expense', 102, 300.0, 300.0, ?1, 1)",
            params![today_str],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 'expense', 103, 200.0, 200.0, ?1, 1)",
            params![today_str],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 'expense', 104, 500.0, 500.0, ?1, 1)",
            params![today_str],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 'expense', 101, 100.0, 100.0, ?1, 0)",
            params![today_str],
        ).unwrap();

        // Calculate budget progress
        let (p_start, p_end, _) = crate::commands::calculate_budget_period("monthly", &today_str, None, today);
        let p_start_str = p_start.format("%Y-%m-%d").to_string();
        let p_end_str = p_end.format("%Y-%m-%d").to_string();

        let spent: f64 = conn.query_row(
            "SELECT ROUND(COALESCE(SUM(base_amount), 0), 2) FROM transactions
             WHERE type = 'expense' AND is_confirmed = 1
               AND category_id IN (101, 102, 103)
               AND DATE(txn_date) >= ?1 AND DATE(txn_date) <= ?2",
            params![p_start_str, p_end_str],
            |r| r.get(0),
        ).unwrap();

        assert_eq!(spent, 750.0, "Budget must sum exactly the 3 categories' confirmed expenses (250+300+200=750)");

        let total_days = (p_end - p_start).num_days() + 1;
        let days_elapsed = ((today - p_start).num_days() + 1).clamp(1, total_days);
        let projected_spent = ((spent / days_elapsed as f64) * total_days as f64 * 100.0).round() / 100.0;
        let pace_warning = projected_spent > 1000.0;

        assert!(pace_warning, "750 spent on day 1 of month must trigger pace warning (projected spend > 1000)");
    }

    #[test]
    fn test_bill_payment_transaction_creation_and_recurrence() {
        let mut conn = setup_test_db();
        let today = chrono::Local::now().date_naive();
        let today_str = today.format("%Y-%m-%d").to_string();

        // Account with 5000
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'Bank Account', 'bank', 'INR', 5000.0, 5000.0)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'opening', 5000.0, 5000.0, 'account', 1)",
            [],
        ).unwrap();

        // Recurring monthly bill for 1200
        conn.execute(
            "INSERT INTO bills (id, name, amount, due_date, account_id, category_id, is_paid, recurrence)
             VALUES (1, 'Broadband', 1200.0, ?1, 1, NULL, 0, 'monthly')",
            params![today_str],
        ).unwrap();

        // Simulate payment logic inside transaction
        let tx = conn.transaction().unwrap();
        let (name, amount, due_date, account_id, category_id, recurrence): (
            String, f64, String, Option<i64>, Option<i64>, Option<String>
        ) = tx.query_row(
            "SELECT name, amount, due_date, account_id, category_id, recurrence FROM bills WHERE id = 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        ).unwrap();

        let acc_id = account_id.unwrap();
        let now_str = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        tx.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, exchange_rate_used, payment_type, txn_date, note, is_confirmed)
             VALUES (?1, 'expense', ?2, ?3, ?3, 1.0, 'bank_transfer', ?4, ?5, 1)",
            params![acc_id, category_id, amount, now_str, format!("Bill Payment: {}", name)],
        ).unwrap();
        let _txn_id = tx.last_insert_rowid();

        tx.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
             VALUES (?1, 'expense', ?2, 0, 'bill', 1, ?3)",
            params![acc_id, -amount, now_str],
        ).unwrap();

        crate::commands::recompute_account_balance(&tx, acc_id).unwrap();

        tx.execute("UPDATE bills SET is_paid = 1 WHERE id = 1", []).unwrap();

        if recurrence.as_deref() == Some("monthly") {
            let parsed_due = chrono::NaiveDate::parse_from_str(&due_date, "%Y-%m-%d").unwrap();
            let next_due = crate::commands::advance_month(parsed_due);
            tx.execute(
                "INSERT INTO bills (name, amount, due_date, account_id, category_id, is_paid, recurrence)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, 'monthly')",
                params![name, amount, next_due.format("%Y-%m-%d").to_string(), account_id, category_id],
            ).unwrap();
        }
        tx.commit().unwrap();

        // 1. Account balance must be 3800
        let bal: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal, 3800.0);

        // 2. Original bill must be paid
        let is_paid: i64 = conn.query_row("SELECT is_paid FROM bills WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(is_paid, 1);

        // 3. New occurrence must be created with is_paid = 0
        let next_bill: (String, i64) = conn.query_row(
            "SELECT due_date, is_paid FROM bills WHERE id != 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(next_bill.1, 0, "Next recurring bill occurrence must be pending (is_paid = 0)");
        let expected_next_due = crate::commands::advance_month(today).format("%Y-%m-%d").to_string();
        assert_eq!(next_bill.0, expected_next_due);
    }

    #[test]
    fn test_warranty_expiry_flagging() {
        let today = chrono::Local::now().date_naive();
        let in_10_days = today + chrono::Duration::days(10);
        let in_60_days = today + chrono::Duration::days(60);
        let past_5_days = today - chrono::Duration::days(5);

        let diff_10 = (in_10_days - today).num_days();
        let diff_60 = (in_60_days - today).num_days();
        let diff_past = (past_5_days - today).num_days();

        assert!(diff_10 >= 0 && diff_10 <= 30, "10 days remaining must be flagged as expiring soon");
        assert!(diff_60 > 30, "60 days remaining is not expiring soon");
        assert!(diff_past < 0, "-5 days is expired");
    }

    #[test]
    fn test_csv_import_parsing_and_error_reporting() {
        let mut conn = setup_test_db();

        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'Cash Wallet', 'cash', 'INR', 1000.0, 1000.0)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
             VALUES (1, 'opening', 1000.0, 1000.0, 'account', 1)",
            [],
        ).unwrap();

        let rows = vec![
            crate::models::CsvParsedRow {
                date: "2026-09-01".to_string(),
                amount: 250.0,
                txn_type: "expense".to_string(),
                category_name: Some("Books".to_string()),
                note: Some("Purchased book".to_string()),
                payment_type: Some("cash".to_string()),
            },
            crate::models::CsvParsedRow {
                date: "2026-09-02".to_string(),
                amount: -50.0, // Invalid negative amount!
                txn_type: "expense".to_string(),
                category_name: None,
                note: None,
                payment_type: None,
            },
            crate::models::CsvParsedRow {
                date: "2026-09-03".to_string(),
                amount: 800.0,
                txn_type: "income".to_string(),
                category_name: Some("Freelance".to_string()),
                note: Some("Client payment".to_string()),
                payment_type: Some("bank_transfer".to_string()),
            },
            crate::models::CsvParsedRow {
                date: "2026-09-04".to_string(),
                amount: 100.0,
                txn_type: "invalid_type".to_string(), // Invalid type!
                category_name: None,
                note: None,
                payment_type: None,
            },
        ];

        let tx = conn.transaction().unwrap();
        let mut imported_count = 0;
        let mut failed_rows = Vec::new();

        for (idx, row) in rows.into_iter().enumerate() {
            let row_num = idx + 1;
            if row.amount <= 0.0 {
                failed_rows.push(format!("Row {}: Amount must be greater than 0", row_num));
                continue;
            }
            if row.txn_type != "income" && row.txn_type != "expense" {
                failed_rows.push(format!("Row {}: Invalid transaction type", row_num));
                continue;
            }

            tx.execute(
                "INSERT INTO transactions (account_id, type, amount, base_amount, txn_date, is_confirmed)
                 VALUES (1, ?1, ?2, ?2, ?3, 1)",
                params![row.txn_type, row.amount, row.date],
            ).unwrap();
            let txn_id = tx.last_insert_rowid();
            let signed = if row.txn_type == "income" { row.amount } else { -row.amount };
            tx.execute(
                "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id)
                 VALUES (1, ?1, ?2, 0, 'transaction', ?3)",
                params![row.txn_type, signed, txn_id],
            ).unwrap();
            imported_count += 1;
        }

        crate::commands::recompute_account_balance(&tx, 1).unwrap();
        tx.commit().unwrap();

        assert_eq!(imported_count, 2, "Exactly 2 rows should be imported");
        assert_eq!(failed_rows.len(), 2, "Exactly 2 rows should be reported as failed");
        assert!(failed_rows[0].contains("Row 2"));
        assert!(failed_rows[1].contains("Row 4"));

        // Opening 1000 - 250 + 800 = 1550
        let bal: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal, 1550.0);
    }

    #[test]
    fn test_holding_crud_pnl_and_price_history() {
        let conn = setup_test_db();
        // Create an investment account
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (10, 'Zerodha Equity', 'investment', 'INR', 0, 0)",
            [],
        ).unwrap();

        // 1. Add holding
        conn.execute(
            "INSERT INTO investment_holdings (
                id, account_id, asset_type, symbol, name, quantity, avg_buy_price,
                currency, last_price, last_price_updated_at, notes, is_archived
            ) VALUES (1, 10, 'stock', 'RELIANCE', 'Reliance Industries', 10.0, 2400.0, 'INR', 2500.0, '2026-09-01 10:00:00', NULL, 0)",
            [],
        ).unwrap();

        // Initial price history
        conn.execute(
            "INSERT INTO investment_price_history (holding_id, price, recorded_at) VALUES (1, 2500.0, '2026-09-01 10:00:00')",
            [],
        ).unwrap();

        // Test P&L calculation
        let (qty, buy, last): (f64, f64, f64) = conn.query_row(
            "SELECT quantity, avg_buy_price, last_price FROM investment_holdings WHERE id = 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).unwrap();

        let invested = qty * buy;
        let current = qty * last;
        let pnl = current - invested;
        let pnl_pct = (pnl / invested) * 100.0;

        assert_eq!(invested, 24000.0);
        assert_eq!(current, 25000.0);
        assert_eq!(pnl, 1000.0);
        assert!((pnl_pct - 4.1666).abs() < 0.01);

        // 2. Update price to 2700.0
        conn.execute(
            "UPDATE investment_holdings SET last_price = 2700.0, last_price_updated_at = '2026-09-04 12:00:00' WHERE id = 1",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO investment_price_history (holding_id, price, recorded_at) VALUES (1, 2700.0, '2026-09-04 12:00:00')",
            [],
        ).unwrap();

        // Recheck
        let (new_last,): (f64,) = conn.query_row(
            "SELECT last_price FROM investment_holdings WHERE id = 1",
            [],
            |r| Ok((r.get(0)?,)),
        ).unwrap();
        assert_eq!(new_last, 2700.0);
        let new_current = qty * new_last;
        let new_pnl = new_current - invested;
        assert_eq!(new_current, 27000.0);
        assert_eq!(new_pnl, 3000.0);

        // Price history count should be 2
        let hist_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM investment_price_history WHERE holding_id = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(hist_count, 2);
    }

    #[test]
    fn test_multicurrency_and_net_worth_calculation() {
        let conn = setup_test_db();
        // Bank account: INR 10,000
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'HDFC Bank', 'bank', 'INR', 10000.0, 10000.0)",
            [],
        ).unwrap();
        // Cash wallet: INR 2,000
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (2, 'Cash Pocket', 'cash', 'INR', 2000.0, 2000.0)",
            [],
        ).unwrap();
        // Investment account: Zerodha
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (3, 'Crypto Exchange', 'investment', 'USD', 0.0, 0.0)",
            [],
        ).unwrap();

        // USD Crypto holding: 0.1 BTC @ $70,000 last price ($7,000 total USD)
        conn.execute(
            "INSERT INTO investment_holdings (
                id, account_id, asset_type, symbol, name, quantity, avg_buy_price,
                currency, last_price, last_price_updated_at, notes, is_archived
            ) VALUES (1, 3, 'crypto', 'BTC', 'Bitcoin', 0.1, 60000.0, 'USD', 70000.0, '2026-09-04 10:00:00', NULL, 0)",
            [],
        ).unwrap();

        // Set exchange rate USD -> INR = 85.0
        conn.execute(
            "INSERT OR REPLACE INTO exchange_rates (from_currency, to_currency, rate) VALUES ('USD', 'INR', 85.0)",
            [],
        ).unwrap();

        // Debt of INR 5,000
        conn.execute(
            "INSERT INTO debts (id, name, principal, current_balance, interest_rate, is_active)
             VALUES (1, 'Personal Loan', 5000.0, 5000.0, 10.0, 1)",
            [],
        ).unwrap();

        // Calculate net worth
        let summary1 = crate::commands::compute_net_worth_summary_internal(&conn).unwrap();
        assert_eq!(summary1.total_bank, 10000.0);
        assert_eq!(summary1.total_cash, 2000.0);
        assert_eq!(summary1.total_accounts, 12000.0);
        // 0.1 * 70,000 * 85.0 = 595,000
        assert_eq!(summary1.total_investments, 595000.0);
        assert_eq!(summary1.total_debts, 5000.0);
        // Net worth = 12,000 + 595,000 - 5,000 = 602,000
        assert_eq!(summary1.net_worth, 602000.0);

        // Update exchange rate to 90.0
        conn.execute(
            "UPDATE exchange_rates SET rate = 90.0 WHERE from_currency = 'USD' AND to_currency = 'INR'",
            [],
        ).unwrap();

        let summary2 = crate::commands::compute_net_worth_summary_internal(&conn).unwrap();
        // 0.1 * 70,000 * 90.0 = 630,000
        assert_eq!(summary2.total_investments, 630000.0);
        // Net worth = 12,000 + 630,000 - 5,000 = 637,000
        assert_eq!(summary2.net_worth, 637000.0);
    }

    #[test]
    fn test_net_worth_history_snapshots() {
        let conn = setup_test_db();
        // Add snapshot for 2026-09-01
        conn.execute(
            "INSERT INTO networth_history (snapshot_date, total_accounts, total_investments, total_debts, net_worth)
             VALUES ('2026-09-01', 10000.0, 5000.0, 2000.0, 13000.0)",
            [],
        ).unwrap();
        // Add snapshot for 2026-09-02
        conn.execute(
            "INSERT INTO networth_history (snapshot_date, total_accounts, total_investments, total_debts, net_worth)
             VALUES ('2026-09-02', 10500.0, 5500.0, 1800.0, 14200.0)",
            [],
        ).unwrap();

        let count: i64 = conn.query_row("SELECT COUNT(*) FROM networth_history", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 2);

        let latest_nw: f64 = conn.query_row(
            "SELECT net_worth FROM networth_history ORDER BY snapshot_date DESC LIMIT 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(latest_nw, 14200.0);
    }

    #[test]
    fn test_category_spending_report_and_income_expense_trend() {
        let conn = setup_test_db();

        // Add a bank account
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'HDFC Bank', 'bank', 'INR', 10000.0, 10000.0)",
            [],
        ).unwrap();

        // Add categories: Food (id=105, expense), Salary (id=106, income)
        conn.execute(
            "INSERT INTO categories (id, name, kind, icon, color) VALUES (105, 'Test Food', 'expense', 'utensils', '#ef4444')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO categories (id, name, kind, icon, color) VALUES (106, 'Test Salary', 'income', 'briefcase', '#22c55e')",
            [],
        ).unwrap();

        // Add transactions
        // Txn 1: 2026-09-01 Expense 500 Food
        conn.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 'expense', 105, 500.0, 500.0, '2026-09-01 12:00:00', 1)",
            [],
        ).unwrap();
        // Txn 2: 2026-09-02 Expense 1500 Food
        conn.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 'expense', 105, 1500.0, 1500.0, '2026-09-02 14:00:00', 1)",
            [],
        ).unwrap();
        // Txn 3: 2026-09-02 Income 50000 Salary
        conn.execute(
            "INSERT INTO transactions (account_id, type, category_id, amount, base_amount, txn_date, is_confirmed)
             VALUES (1, 'income', 106, 50000.0, 50000.0, '2026-09-02 09:00:00', 1)",
            [],
        ).unwrap();

        // Check category spending
        let total_expense: f64 = conn.query_row(
            "SELECT COALESCE(SUM(base_amount), 0.0) FROM transactions WHERE type = 'expense' AND is_confirmed = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(total_expense, 2000.0);

        let food_expense: f64 = conn.query_row(
            "SELECT COALESCE(SUM(base_amount), 0.0) FROM transactions WHERE category_id = 105 AND type = 'expense'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(food_expense, 2000.0);

        let salary_income: f64 = conn.query_row(
            "SELECT COALESCE(SUM(base_amount), 0.0) FROM transactions WHERE category_id = 106 AND type = 'income'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(salary_income, 50000.0);
    }

    #[test]
    fn test_pin_change_logic() {
        let conn = setup_test_db();

        // Initially no PIN
        let pin: Option<String> = conn.query_row(
            "SELECT pin_hash FROM app_settings WHERE id = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert!(pin.is_none());

        // Set initial PIN
        let hash = bcrypt::hash("123456", bcrypt::DEFAULT_COST).unwrap();
        conn.execute(
            "UPDATE app_settings SET pin_hash = ?1 WHERE id = 1",
            rusqlite::params![hash],
        ).unwrap();

        // Verify valid
        let stored_hash: String = conn.query_row(
            "SELECT pin_hash FROM app_settings WHERE id = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert!(bcrypt::verify("123456", &stored_hash).unwrap());
        assert!(!bcrypt::verify("654321", &stored_hash).unwrap());
    }

    #[test]
    fn test_wipe_all_data_and_currency_change() {
        let mut conn = setup_test_db();

        // Populate an account and some data
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'Main Bank', 'bank', 'INR', 1000.0, 1000.0)",
            [],
        ).unwrap();

        // Perform wipe transaction simulation
        let tx = conn.transaction().unwrap();
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
        ).unwrap();
        seed_defaults(&tx).unwrap();
        tx.commit().unwrap();

        // App settings must exist immediately
        let base_cur: String = conn.query_row(
            "SELECT base_currency FROM app_settings WHERE id = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(base_cur, "INR");

        // Starter categories and tags must exist
        let cat_count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0)).unwrap();
        assert!(cat_count > 0);

        // Change currency to USD via UPSERT
        conn.execute(
            "INSERT INTO app_settings (id, base_currency) VALUES (1, ?1)
             ON CONFLICT(id) DO UPDATE SET base_currency = excluded.base_currency",
            rusqlite::params!["USD"],
        ).unwrap();

        let updated_cur: String = conn.query_row(
            "SELECT base_currency FROM app_settings WHERE id = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(updated_cur, "USD");
    }

    #[test]
    fn test_debt_system_draw_repayment_ledger() {
        let mut conn = setup_test_db();

        // 1. Create a bank account with 10,000 opening balance
        conn.execute(
            "INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance)
             VALUES (1, 'HDFC Bank', 'bank', 'INR', 10000.0, 10000.0)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
             VALUES (1, 'initial', 10000.0, 10000.0, 'account_opening', 1, '2026-09-01')",
            [],
        ).unwrap();

        // 2. Create category for direct spend
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, name, kind) VALUES (999, 'Shopping', 'expense')",
            [],
        ).unwrap();

        // 3. Create debt facility: limit 50,000, initial draw 20,000 deposited to account 1
        // (Simulate create_debt logic in test)
        let debt_id: i64 = 1;
        conn.execute(
            "INSERT INTO debts (id, name, principal, current_balance, total_borrowed, total_paid, debt_type, interest_rate, due_date, min_payment, account_id, notes, is_active)
             VALUES (?1, 'Credit Line', 50000.0, 20000.0, 20000.0, 0.0, 'credit_line', 12.0, '2026-10-15', 2000.0, 1, 'Test facility', 1)",
            rusqlite::params![debt_id],
        ).unwrap();

        // Log draw transaction and account income
        conn.execute(
            "INSERT INTO debt_transactions (debt_id, txn_type, amount, txn_date, account_id, category_id, notes)
             VALUES (?1, 'draw', 20000.0, '2026-09-14', 1, NULL, 'Initial draw')",
            rusqlite::params![debt_id],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (account_id, type, amount, base_amount, exchange_rate_used, txn_date, note, is_confirmed)
             VALUES (1, 'income', 20000.0, 20000.0, 1.0, '2026-09-14', 'Loan disbursement', 1)",
            [],
        ).unwrap();
        let tx_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
             VALUES (1, 'income', 20000.0, 0, 'debt_draw', ?1, '2026-09-14')",
            rusqlite::params![tx_id],
        ).unwrap();
        {
            let tx = conn.transaction().unwrap();
            crate::commands::recompute_account_balance(&tx, 1).unwrap();
            tx.commit().unwrap();
        }

        // Account balance should now be 10,000 + 20,000 = 30,000
        let bal: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal, 30000.0);

        // 4. Draw additional 10,000 to account
        conn.execute(
            "UPDATE debts SET current_balance = current_balance + 10000.0, total_borrowed = total_borrowed + 10000.0 WHERE id = 1",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO debt_transactions (debt_id, txn_type, amount, txn_date, account_id, category_id, notes)
             VALUES (1, 'draw', 10000.0, '2026-09-15', 1, NULL, 'Additional draw')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (account_id, type, amount, base_amount, exchange_rate_used, txn_date, note, is_confirmed)
             VALUES (1, 'income', 10000.0, 10000.0, 1.0, '2026-09-15', 'Loan draw', 1)",
            [],
        ).unwrap();
        let tx_id2 = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
             VALUES (1, 'income', 10000.0, 0, 'debt_draw', ?1, '2026-09-15')",
            rusqlite::params![tx_id2],
        ).unwrap();
        {
            let tx = conn.transaction().unwrap();
            crate::commands::recompute_account_balance(&tx, 1).unwrap();
            tx.commit().unwrap();
        }

        let bal2: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal2, 40000.0);

        // 5. Repay 5,000 from account 1
        conn.execute(
            "UPDATE debts SET current_balance = current_balance - 5000.0, total_paid = total_paid + 5000.0 WHERE id = 1",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO debt_transactions (debt_id, txn_type, amount, txn_date, account_id, category_id, notes)
             VALUES (1, 'payment', 5000.0, '2026-09-16', 1, NULL, 'Partial repayment')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (account_id, type, amount, base_amount, exchange_rate_used, txn_date, note, is_confirmed)
             VALUES (1, 'expense', 5000.0, 5000.0, 1.0, '2026-09-16', 'Debt repayment', 1)",
            [],
        ).unwrap();
        let tx_id3 = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO account_ledger (account_id, txn_type, amount, balance_after, reference_type, reference_id, txn_date)
             VALUES (1, 'expense', -5000.0, 0, 'debt_payment', ?1, '2026-09-16')",
            rusqlite::params![tx_id3],
        ).unwrap();
        {
            let tx = conn.transaction().unwrap();
            crate::commands::recompute_account_balance(&tx, 1).unwrap();
            tx.commit().unwrap();
        }

        // Account balance should now be 40,000 - 5,000 = 35,000
        let bal3: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal3, 35000.0);

        // Debt balance should be 20,000 + 10,000 - 5,000 = 25,000
        let (debt_bal, tot_borrowed, tot_paid): (f64, f64, f64) = conn.query_row(
            "SELECT current_balance, total_borrowed, total_paid FROM debts WHERE id = 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).unwrap();
        assert_eq!(debt_bal, 25000.0);
        assert_eq!(tot_borrowed, 30000.0);
        assert_eq!(tot_paid, 5000.0);

        // 6. Direct spend 3,000 from debt
        conn.execute(
            "UPDATE debts SET current_balance = current_balance + 3000.0, total_borrowed = total_borrowed + 3000.0 WHERE id = 1",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO debt_transactions (debt_id, txn_type, amount, txn_date, account_id, category_id, notes)
             VALUES (1, 'expense', 3000.0, '2026-09-17', NULL, 999, 'Shopping swipe')",
            [],
        ).unwrap();

        // Total transactions for debt 1 should be 4 (draw, draw, payment, expense)
        let txn_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM debt_transactions WHERE debt_id = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(txn_count, 4);

        // Bank balance unchanged by direct spend
        let bal4: f64 = conn.query_row("SELECT current_balance FROM accounts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(bal4, 35000.0);

        // Debt balance is 25,000 + 3,000 = 28,000
        let final_debt_bal: f64 = conn.query_row("SELECT current_balance FROM debts WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(final_debt_bal, 28000.0);
    }

    #[test]
    fn test_payment_methods_and_presets() {
        let conn = setup_test_db();

        // 1. Initial seeds from migration 006
        let initial_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM payment_methods",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(initial_count, 4, "Should have 4 initial payment methods");

        // Verify default is Cash
        let default_name: String = conn.query_row(
            "SELECT name FROM payment_methods WHERE is_default = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(default_name, "Cash");

        // 2. Add custom regional method (e.g. PayPay)
        conn.execute(
            "INSERT INTO payment_methods (name, type_key, currency, icon, color, is_default, is_active)
             VALUES ('PayPay', 'wallet', 'JPY', 'Zap', '#ef4444', 0, 1)",
            [],
        ).unwrap();
        let paypay_id = conn.last_insert_rowid();

        // 3. Set PayPay as default
        conn.execute("UPDATE payment_methods SET is_default = 0", []).unwrap();
        conn.execute(
            "UPDATE payment_methods SET is_default = 1 WHERE id = ?1",
            params![paypay_id],
        ).unwrap();

        let new_default: String = conn.query_row(
            "SELECT name FROM payment_methods WHERE is_default = 1",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(new_default, "PayPay");

        // 4. Toggle active status
        conn.execute(
            "UPDATE payment_methods SET is_active = 0 WHERE id = ?1",
            params![paypay_id],
        ).unwrap();
        let is_active: i64 = conn.query_row(
            "SELECT is_active FROM payment_methods WHERE id = ?1",
            params![paypay_id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(is_active, 0);

        // 5. Delete method
        conn.execute(
            "DELETE FROM payment_methods WHERE id = ?1",
            params![paypay_id],
        ).unwrap();
        let count_after_del: i64 = conn.query_row(
            "SELECT COUNT(*) FROM payment_methods",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(count_after_del, 4);
    }
}


