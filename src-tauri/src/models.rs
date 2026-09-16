use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub id: i64,
    pub base_currency: String,
    pub has_pin: bool,
    pub theme: String,
    pub last_backup_at: Option<String>,
    pub last_networth_snapshot_at: Option<String>,
    pub notify_os: bool,
    pub notify_advance_days: i64,
    pub last_notification_check_at: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            id: 1,
            base_currency: "INR".to_string(),
            has_pin: false,
            theme: "dark".to_string(),
            last_backup_at: None,
            last_networth_snapshot_at: None,
            notify_os: true,
            notify_advance_days: 1,
            last_notification_check_at: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNotificationSettingsPayload {
    pub notify_os: bool,
    pub notify_advance_days: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BillReminder {
    pub bill_id: i64,
    pub bill_name: String,
    pub amount: f64,
    pub due_date: String,
    pub account_name: Option<String>,
    pub status: String, // "overdue", "due_today", "due_tomorrow"
    pub days_until_due: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub currency: String,
    pub opening_balance: f64,
    pub current_balance: f64,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_archived: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAccountPayload {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub currency: String,
    pub opening_balance: f64,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAccountPayload {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub currency: String,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccountLedgerEntry {
    pub id: i64,
    pub account_id: i64,
    pub txn_type: String,
    pub amount: f64,
    pub balance_after: f64,
    pub reference_type: Option<String>,
    pub reference_id: Option<i64>,
    pub txn_date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub kind: String,
    pub parent_id: Option<i64>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoryPayload {
    pub name: String,
    pub kind: String,
    pub parent_id: Option<i64>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCategoryPayload {
    pub name: String,
    pub kind: String,
    pub parent_id: Option<i64>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: i64,
    pub account_id: i64,
    pub account_name: String,
    pub account_currency: String,
    #[serde(rename = "type")]
    pub txn_type: String,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub category_icon: Option<String>,
    pub category_color: Option<String>,
    pub transfer_to_account_id: Option<i64>,
    pub transfer_to_account_name: Option<String>,
    pub transfer_to_account_currency: Option<String>,
    pub amount: f64,
    pub base_amount: f64,
    pub exchange_rate_used: f64,
    pub payment_type: Option<String>,
    pub txn_date: String,
    pub note: Option<String>,
    pub is_confirmed: i64,
    pub recurring_rule_id: Option<i64>,
    pub tags: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTransactionPayload {
    pub account_id: i64,
    #[serde(rename = "type")]
    pub txn_type: String,
    pub category_id: Option<i64>,
    pub transfer_to_account_id: Option<i64>,
    pub amount: f64,
    pub payment_type: Option<String>,
    pub txn_date: String,
    pub note: Option<String>,
    pub is_confirmed: bool,
    pub tags: Vec<String>,
    pub warranty: Option<CreateWarrantyPayload>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTransactionPayload {
    pub account_id: i64,
    #[serde(rename = "type")]
    pub txn_type: String,
    pub category_id: Option<i64>,
    pub transfer_to_account_id: Option<i64>,
    pub amount: f64,
    pub payment_type: Option<String>,
    pub txn_date: String,
    pub note: Option<String>,
    pub is_confirmed: bool,
    pub tags: Vec<String>,
    pub warranty: Option<CreateWarrantyPayload>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct TransactionFilter {
    pub account_id: Option<i64>,
    pub category_id: Option<i64>,
    pub tag: Option<String>,
    pub txn_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_confirmed: Option<bool>,
    pub search_query: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecurringRule {
    pub id: i64,
    pub name: String,
    pub account_id: i64,
    pub account_name: String,
    #[serde(rename = "type")]
    pub rule_type: String,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub transfer_to_account_id: Option<i64>,
    pub transfer_to_account_name: Option<String>,
    pub amount: f64,
    pub payment_type: Option<String>,
    pub frequency: String,
    pub next_due_date: String,
    pub is_active: i64,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRecurringRulePayload {
    pub name: String,
    pub account_id: i64,
    #[serde(rename = "type")]
    pub rule_type: String,
    pub category_id: Option<i64>,
    pub transfer_to_account_id: Option<i64>,
    pub amount: f64,
    pub payment_type: Option<String>,
    pub frequency: String,
    pub next_due_date: String,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRecurringRulePayload {
    pub name: String,
    pub account_id: i64,
    #[serde(rename = "type")]
    pub rule_type: String,
    pub category_id: Option<i64>,
    pub transfer_to_account_id: Option<i64>,
    pub amount: f64,
    pub payment_type: Option<String>,
    pub frequency: String,
    pub next_due_date: String,
    pub is_active: bool,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonthSummary {
    pub month: String,
    pub total_income: f64,
    pub total_expense: f64,
    pub net_cashflow: f64,
    pub pending_count: i64,
    pub pending_expense_total: f64,
}

// ==========================================
// Part 3 Models: Budgets, Bills, Shopping, Warranties, CSV
// ==========================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BudgetProgress {
    pub id: i64,
    pub name: String,
    pub amount: f64,
    pub effective_amount: f64,
    pub spent: f64,
    pub remaining: f64,
    pub progress_percent: f64,
    pub period: String, // 'weekly' | 'monthly' | 'custom'
    pub start_date: String,
    pub end_date: Option<String>,
    pub period_start: String,
    pub period_end: String,
    pub rollover: bool,
    pub is_active: bool,
    pub category_ids: Vec<i64>,
    pub category_names: Vec<String>,
    pub days_remaining: i64,
    pub total_days: i64,
    pub projected_spent: f64,
    pub is_pace_warning: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBudgetPayload {
    pub name: String,
    pub amount: f64,
    pub period: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub rollover: bool,
    pub category_ids: Vec<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBudgetPayload {
    pub name: String,
    pub amount: f64,
    pub period: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub rollover: bool,
    pub is_active: bool,
    pub category_ids: Vec<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BillItem {
    pub id: i64,
    pub name: String,
    pub amount: f64,
    pub due_date: String,
    pub account_id: Option<i64>,
    pub account_name: Option<String>,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub is_paid: i64,
    pub recurrence: Option<String>, // 'none' | 'monthly' | 'yearly'
    pub is_overdue: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBillPayload {
    pub name: String,
    pub amount: f64,
    pub due_date: String,
    pub account_id: Option<i64>,
    pub category_id: Option<i64>,
    pub recurrence: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBillPayload {
    pub name: String,
    pub amount: f64,
    pub due_date: String,
    pub account_id: Option<i64>,
    pub category_id: Option<i64>,
    pub is_paid: bool,
    pub recurrence: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShoppingListItem {
    pub id: i64,
    pub name: String,
    pub is_checked: i64,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateShoppingItemPayload {
    pub name: String,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WarrantyItem {
    pub id: i64,
    pub item_name: String,
    pub purchase_date: Option<String>,
    pub expires_on: Option<String>,
    pub transaction_id: Option<i64>,
    pub notes: Option<String>,
    pub days_remaining: Option<i64>,
    pub is_expiring_soon: bool, // <= 30 days
    pub is_expired: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateWarrantyPayload {
    pub item_name: String,
    pub purchase_date: Option<String>,
    pub expires_on: Option<String>,
    pub transaction_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateWarrantyPayload {
    pub item_name: String,
    pub purchase_date: Option<String>,
    pub expires_on: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvImportPayload {
    pub target_account_id: i64,
    pub default_category_id: Option<i64>,
    pub rows: Vec<CsvParsedRow>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CsvParsedRow {
    pub date: String,
    pub amount: f64,
    pub txn_type: String, // 'income' | 'expense'
    pub category_name: Option<String>,
    pub note: Option<String>,
    pub payment_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CsvImportResult {
    pub imported_count: i64,
    pub failed_rows: Vec<String>,
}

// --- Part 4: Investments, Exchange Rates, Debts, Net Worth ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InvestmentHolding {
    pub id: i64,
    pub account_id: i64,
    pub account_name: String,
    pub asset_type: String, // 'stock', 'crypto', 'mutual_fund', 'other'
    pub symbol: String,
    pub name: Option<String>,
    pub quantity: f64,
    pub avg_buy_price: f64,
    pub currency: String,
    pub last_price: f64,
    pub last_price_updated_at: String,
    pub notes: Option<String>,
    pub is_archived: i64,
    // Computed values in native currency
    pub invested_value: f64,
    pub current_value: f64,
    pub unrealized_pnl: f64,
    pub unrealized_pnl_percent: f64,
    // Converted to base currency
    pub base_currency: String,
    pub exchange_rate_used: f64,
    pub base_invested_value: f64,
    pub base_current_value: f64,
    pub base_unrealized_pnl: f64,
    pub days_since_update: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateHoldingPayload {
    pub account_id: i64,
    pub asset_type: String,
    pub symbol: String,
    pub name: Option<String>,
    pub quantity: f64,
    pub avg_buy_price: f64,
    pub currency: String,
    pub last_price: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateHoldingPayload {
    pub asset_type: String,
    pub symbol: String,
    pub name: Option<String>,
    pub quantity: f64,
    pub avg_buy_price: f64,
    pub currency: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PriceHistoryPoint {
    pub id: i64,
    pub holding_id: i64,
    pub price: f64,
    pub recorded_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SinglePriceUpdatePayload {
    pub holding_id: i64,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortfolioSummary {
    pub total_invested_base: f64,
    pub total_current_value_base: f64,
    pub total_unrealized_pnl_base: f64,
    pub total_unrealized_pnl_percent: f64,
    pub holdings_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExchangeRateItem {
    pub id: i64,
    pub from_currency: String,
    pub to_currency: String,
    pub rate: f64,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetExchangeRatePayload {
    pub from_currency: String,
    pub to_currency: String,
    pub rate: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DebtItem {
    pub id: i64,
    pub name: String,
    pub principal: f64,
    pub current_balance: f64,
    #[serde(default)]
    pub total_borrowed: f64,
    #[serde(default)]
    pub total_paid: f64,
    #[serde(default = "default_debt_type")]
    pub debt_type: String,
    pub interest_rate: f64,
    pub due_date: Option<String>,
    #[serde(default)]
    pub min_payment: f64,
    #[serde(default)]
    pub account_id: Option<i64>,
    pub notes: Option<String>,
    pub is_active: i64,
}

fn default_debt_type() -> String {
    "personal_loan".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DebtTransactionItem {
    pub id: i64,
    pub debt_id: i64,
    pub txn_type: String, // 'payment', 'draw', 'expense', 'interest'
    pub amount: f64,
    pub txn_date: String,
    pub account_id: Option<i64>,
    pub account_name: Option<String>,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDebtPayload {
    pub name: String,
    pub principal: f64,
    #[serde(default)]
    pub initial_draw: Option<f64>,
    #[serde(default)]
    pub current_balance: Option<f64>,
    #[serde(default)]
    pub debt_type: Option<String>,
    pub interest_rate: f64,
    pub due_date: Option<String>,
    #[serde(default)]
    pub min_payment: Option<f64>,
    #[serde(default)]
    pub deposit_account_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDebtPayload {
    pub name: String,
    pub principal: f64,
    pub current_balance: f64,
    #[serde(default)]
    pub total_borrowed: Option<f64>,
    #[serde(default)]
    pub total_paid: Option<f64>,
    #[serde(default)]
    pub debt_type: Option<String>,
    pub interest_rate: f64,
    pub due_date: Option<String>,
    #[serde(default)]
    pub min_payment: Option<f64>,
    #[serde(default)]
    pub account_id: Option<i64>,
    pub notes: Option<String>,
    pub is_active: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordDebtPaymentPayload {
    pub debt_id: i64,
    pub amount: f64,
    pub txn_date: String,
    pub account_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DrawDebtFundsPayload {
    pub debt_id: i64,
    pub amount: f64,
    pub txn_date: String,
    pub account_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendFromDebtPayload {
    pub debt_id: i64,
    pub amount: f64,
    pub txn_date: String,
    pub category_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetWorthSummary {
    pub base_currency: String,
    pub total_bank: f64,
    pub total_cash: f64,
    pub total_investments: f64,
    pub total_other_accounts: f64,
    pub total_accounts: f64,
    pub total_debts: f64,
    pub net_worth: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetWorthSnapshotItem {
    pub id: i64,
    pub snapshot_date: String,
    pub total_accounts: f64,
    pub total_investments: f64,
    pub total_debts: f64,
    pub net_worth: f64,
}

// --- Part 5: Reports, Backup & Restore, Settings ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategorySpendingReportItem {
    pub category_id: Option<i64>,
    pub category_name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub total_spent: f64,
    pub percentage: f64,
    pub transaction_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IncomeExpenseTrendItem {
    pub period: String, // e.g. "2026-09" or "2026-09-01"
    pub income: f64,
    pub expense: f64,
    pub net: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HoldingPerformanceItem {
    pub id: i64,
    pub symbol: String,
    pub name: Option<String>,
    pub asset_type: String,
    pub account_name: String,
    pub quantity: f64,
    pub avg_buy_price: f64,
    pub last_price: f64,
    pub currency: String,
    pub cost_basis_base: f64,
    pub current_value_base: f64,
    pub unrealized_pnl_base: f64,
    pub pnl_percent: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InvestmentPerformanceReport {
    pub total_cost_basis: f64,
    pub total_current_value: f64,
    pub total_unrealized_pnl: f64,
    pub total_pnl_percent: f64,
    pub holdings: Vec<HoldingPerformanceItem>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ReportDateFilter {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub group_by: Option<String>, // "month" or "day"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupFileInfo {
    pub filename: String,
    pub file_path: String,
    pub size_bytes: u64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChangePinPayload {
    pub current_pin: String,
    pub new_pin: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Goal {
    pub id: i64,
    pub name: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub target_date: Option<String>,
    pub account_id: Option<i64>,
    pub color: String,
    pub icon: String,
    pub note: Option<String>,
    pub is_reached: i64,
    pub created_at: String,
    pub percentage: f64,
    pub remaining_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGoalPayload {
    pub name: String,
    pub target_amount: f64,
    pub current_amount: Option<f64>,
    pub target_date: Option<String>,
    pub account_id: Option<i64>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateGoalPayload {
    pub name: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub target_date: Option<String>,
    pub account_id: Option<i64>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub note: Option<String>,
    pub is_reached: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContributeGoalPayload {
    pub goal_id: i64,
    pub amount: f64,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppUpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_notes: String,
    pub published_at: String,
    pub download_url: String,
}

// --- Part 6: Custom & Regional Payment Methods ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymentMethodItem {
    pub id: i64,
    pub name: String,
    pub type_key: String,
    pub currency: Option<String>,
    pub icon: String,
    pub color: String,
    pub is_default: i64,
    pub is_active: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePaymentMethodPayload {
    pub name: String,
    pub type_key: Option<String>,
    pub currency: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_default: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePaymentMethodPayload {
    pub name: String,
    pub type_key: Option<String>,
    pub currency: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_default: Option<i64>,
    pub is_active: i64,
}

