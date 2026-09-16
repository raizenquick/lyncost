export type AccountType = 'bank' | 'cash' | 'investment' | 'credit_card' | 'other';

export interface AppSettings {
  id: number;
  base_currency: string;
  has_pin: boolean;
  theme: string;
  last_backup_at?: string | null;
  last_networth_snapshot_at?: string | null;
  notify_os: boolean;
  notify_advance_days: number;
  last_notification_check_at?: string | null;
}

export interface UpdateNotificationSettingsPayload {
  notify_os: boolean;
  notify_advance_days: number;
}

export interface BillReminder {
  bill_id: number;
  bill_name: string;
  amount: number;
  due_date: string;
  account_name?: string | null;
  status: 'overdue' | 'due_today' | 'due_tomorrow';
  days_until_due: number;
}


export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  current_balance: number;
  icon?: string | null;
  color?: string | null;
  is_archived: number;
  created_at: string;
}

export interface CreateAccountPayload {
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateAccountPayload {
  name: string;
  type: AccountType;
  currency: string;
  icon?: string | null;
  color?: string | null;
}

export interface AccountLedgerEntry {
  id: number;
  account_id: number;
  txn_type: string;
  amount: number;
  balance_after: number;
  reference_type?: string | null;
  reference_id?: number | null;
  txn_date: string;
}

export interface Category {
  id: number;
  name: string;
  kind: 'income' | 'expense';
  parent_id?: number | null;
  icon?: string | null;
  color?: string | null;
}

export interface CreateCategoryPayload {
  name: string;
  kind: 'income' | 'expense';
  parent_id?: number | null;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateCategoryPayload {
  name: string;
  kind: 'income' | 'expense';
  parent_id?: number | null;
  icon?: string | null;
  color?: string | null;
}

export interface Tag {
  id: number;
  name: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentType = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other' | (string & {});

export interface Transaction {
  id: number;
  account_id: number;
  account_name: string;
  account_currency: string;
  type: TransactionType;
  category_id?: number | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  transfer_to_account_id?: number | null;
  transfer_to_account_name?: string | null;
  transfer_to_account_currency?: string | null;
  amount: number;
  base_amount: number;
  exchange_rate_used: number;
  payment_type?: PaymentType | null;
  txn_date: string;
  note?: string | null;
  is_confirmed: number;
  recurring_rule_id?: number | null;
  tags: string[];
  created_at: string;
}

export interface CreateWarrantyPayload {
  item_name: string;
  purchase_date?: string | null;
  expires_on?: string | null;
  transaction_id?: number | null;
  notes?: string | null;
}

export interface CreateTransactionPayload {
  account_id: number;
  type: TransactionType;
  category_id?: number | null;
  transfer_to_account_id?: number | null;
  amount: number;
  payment_type?: PaymentType | null;
  txn_date: string;
  note?: string | null;
  is_confirmed: boolean;
  tags: string[];
  warranty?: CreateWarrantyPayload | null;
}

export interface UpdateTransactionPayload {
  account_id: number;
  type: TransactionType;
  category_id?: number | null;
  transfer_to_account_id?: number | null;
  amount: number;
  payment_type?: PaymentType | null;
  txn_date: string;
  note?: string | null;
  is_confirmed: boolean;
  tags: string[];
  warranty?: CreateWarrantyPayload | null;
}

export interface TransactionFilter {
  account_id?: number | null;
  category_id?: number | null;
  tag?: string | null;
  txn_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_confirmed?: boolean | null;
  search_query?: string | null;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: number;
  name: string;
  account_id: number;
  account_name: string;
  type: TransactionType;
  category_id?: number | null;
  category_name?: string | null;
  transfer_to_account_id?: number | null;
  transfer_to_account_name?: string | null;
  amount: number;
  payment_type?: PaymentType | null;
  frequency: RecurringFrequency;
  next_due_date: string;
  is_active: number;
  note?: string | null;
}

export interface CreateRecurringRulePayload {
  name: string;
  account_id: number;
  type: TransactionType;
  category_id?: number | null;
  transfer_to_account_id?: number | null;
  amount: number;
  payment_type?: PaymentType | null;
  frequency: RecurringFrequency;
  next_due_date: string;
  note?: string | null;
}

export interface UpdateRecurringRulePayload {
  name: string;
  account_id: number;
  type: TransactionType;
  category_id?: number | null;
  transfer_to_account_id?: number | null;
  amount: number;
  payment_type?: PaymentType | null;
  frequency: RecurringFrequency;
  next_due_date: string;
  is_active: boolean;
  note?: string | null;
}

export interface MonthSummary {
  month: string;
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  pending_count: number;
  pending_expense_total: number;
}

// ==========================================
// Part 3 Types: Budgets, Bills, Shopping, Warranties, CSV
// ==========================================

export type BudgetPeriod = 'weekly' | 'monthly' | 'custom';

export interface BudgetProgress {
  id: number;
  name: string;
  amount: number;
  effective_amount: number;
  spent: number;
  remaining: number;
  progress_percent: number;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string | null;
  period_start: string;
  period_end: string;
  rollover: boolean;
  is_active: boolean;
  category_ids: number[];
  category_names: string[];
  days_remaining: number;
  total_days: number;
  projected_spent: number;
  is_pace_warning: boolean;
}

export interface CreateBudgetPayload {
  name: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string | null;
  rollover: boolean;
  category_ids: number[];
}

export interface UpdateBudgetPayload {
  name: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string | null;
  rollover: boolean;
  is_active: boolean;
  category_ids: number[];
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  account_id?: number | null;
  color: string;
  icon: string;
  note?: string | null;
  is_reached: number;
  created_at: string;
  percentage: number;
  remaining_amount: number;
}

export interface CreateGoalPayload {
  name: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string | null;
  account_id?: number | null;
  color?: string;
  icon?: string;
  note?: string | null;
}

export interface UpdateGoalPayload {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  account_id?: number | null;
  color?: string;
  icon?: string;
  note?: string | null;
  is_reached: number;
}

export interface ContributeGoalPayload {
  goal_id: number;
  amount: number;
  note?: string | null;
}

export type BillRecurrence = 'none' | 'monthly' | 'yearly';

export interface BillItem {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  account_id?: number | null;
  account_name?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  is_paid: number;
  recurrence?: BillRecurrence | null;
  is_overdue: boolean;
}

export interface CreateBillPayload {
  name: string;
  amount: number;
  due_date: string;
  account_id?: number | null;
  category_id?: number | null;
  recurrence?: BillRecurrence | null;
}

export interface UpdateBillPayload {
  name: string;
  amount: number;
  due_date: string;
  account_id?: number | null;
  category_id?: number | null;
  is_paid: boolean;
  recurrence?: BillRecurrence | null;
}

export interface ShoppingListItem {
  id: number;
  name: string;
  is_checked: number;
  note?: string | null;
  created_at: string;
}

export interface CreateShoppingItemPayload {
  name: string;
  note?: string | null;
}

export interface WarrantyItem {
  id: number;
  item_name: string;
  purchase_date?: string | null;
  expires_on?: string | null;
  transaction_id?: number | null;
  notes?: string | null;
  days_remaining?: number | null;
  is_expiring_soon: boolean;
  is_expired: boolean;
}

export interface UpdateWarrantyPayload {
  item_name: string;
  purchase_date?: string | null;
  expires_on?: string | null;
  notes?: string | null;
}

export interface CsvParsedRow {
  date: string;
  amount: number;
  txn_type: string;
  category_name?: string | null;
  note?: string | null;
  payment_type?: string | null;
}

export interface CsvImportPayload {
  target_account_id: number;
  default_category_id?: number | null;
  rows: CsvParsedRow[];
}

export interface CsvImportResult {
  imported_count: number;
  failed_rows: string[];
}

// --- Part 4: Investments, Exchange Rates, Debts, Net Worth ---

export type AssetType = 'stock' | 'crypto' | 'mutual_fund' | 'other';

export interface InvestmentHolding {
  id: number;
  account_id: number;
  account_name: string;
  asset_type: AssetType;
  symbol: string;
  name?: string | null;
  quantity: number;
  avg_buy_price: number;
  currency: string;
  last_price: number;
  last_price_updated_at: string;
  notes?: string | null;
  is_archived: number;
  // Computed values
  invested_value: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  base_currency: string;
  exchange_rate_used: number;
  base_invested_value: number;
  base_current_value: number;
  base_unrealized_pnl: number;
  days_since_update: number;
}

export interface CreateHoldingPayload {
  account_id: number;
  asset_type: AssetType;
  symbol: string;
  name?: string | null;
  quantity: number;
  avg_buy_price: number;
  currency: string;
  last_price: number;
  notes?: string | null;
}

export interface UpdateHoldingPayload {
  asset_type: AssetType;
  symbol: string;
  name?: string | null;
  quantity: number;
  avg_buy_price: number;
  currency: string;
  notes?: string | null;
}

export interface PriceHistoryPoint {
  id: number;
  holding_id: number;
  price: number;
  recorded_at: string;
}

export interface SinglePriceUpdatePayload {
  holding_id: number;
  price: number;
}

export interface PortfolioSummary {
  total_invested_base: number;
  total_current_value_base: number;
  total_unrealized_pnl_base: number;
  total_unrealized_pnl_percent: number;
  holdings_count: number;
}

export interface ExchangeRateItem {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

export interface SetExchangeRatePayload {
  from_currency: string;
  to_currency: string;
  rate: number;
}

export interface DebtItem {
  id: number;
  name: string;
  principal: number;
  current_balance: number;
  total_borrowed: number;
  total_paid: number;
  debt_type: string;
  interest_rate: number;
  due_date?: string | null;
  min_payment: number;
  account_id?: number | null;
  notes?: string | null;
  is_active: number;
}

export interface DebtTransactionItem {
  id: number;
  debt_id: number;
  txn_type: 'payment' | 'draw' | 'expense' | 'interest' | string;
  amount: number;
  txn_date: string;
  account_id?: number | null;
  account_name?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CreateDebtPayload {
  name: string;
  principal: number;
  initial_draw?: number | null;
  current_balance?: number | null;
  debt_type?: string | null;
  interest_rate: number;
  due_date?: string | null;
  min_payment?: number | null;
  deposit_account_id?: number | null;
  notes?: string | null;
}

export interface UpdateDebtPayload {
  name: string;
  principal: number;
  current_balance: number;
  total_borrowed?: number | null;
  total_paid?: number | null;
  debt_type?: string | null;
  interest_rate: number;
  due_date?: string | null;
  min_payment?: number | null;
  account_id?: number | null;
  notes?: string | null;
  is_active: number;
}

export interface RecordDebtPaymentPayload {
  debt_id: number;
  amount: number;
  txn_date: string;
  account_id?: number | null;
  notes?: string | null;
}

export interface DrawDebtFundsPayload {
  debt_id: number;
  amount: number;
  txn_date: string;
  account_id?: number | null;
  notes?: string | null;
}

export interface SpendFromDebtPayload {
  debt_id: number;
  amount: number;
  txn_date: string;
  category_id?: number | null;
  notes?: string | null;
}

export interface NetWorthSummary {
  base_currency: string;
  total_bank: number;
  total_cash: number;
  total_investments: number;
  total_other_accounts: number;
  total_accounts: number;
  total_debts: number;
  net_worth: number;
}

export interface NetWorthSnapshotItem {
  id: number;
  snapshot_date: string;
  total_accounts: number;
  total_investments: number;
  total_debts: number;
  net_worth: number;
}

// ==========================================
// Part 5: Reports, Backup & Restore, Settings
// ==========================================

export interface ReportDateFilter {
  start_date?: string | null;
  end_date?: string | null;
  account_id?: number | null;
}

export interface CategorySpendingReportItem {
  category_id?: number | null;
  category_name: string;
  kind: string;
  icon?: string | null;
  color?: string | null;
  total_spent: number;
  percentage: number;
  transaction_count: number;
}

export interface IncomeExpenseTrendItem {
  period_label: string;
  total_income: number;
  total_expense: number;
  net_cashflow: number;
}

export interface HoldingPerformanceItem {
  id: number;
  symbol: string;
  name?: string | null;
  asset_type: AssetType;
  account_name: string;
  quantity: number;
  avg_buy_price: number;
  last_price: number;
  currency: string;
  cost_basis_base: number;
  current_value_base: number;
  unrealized_pnl_base: number;
  pnl_percent: number;
}

export interface InvestmentPerformanceReport {
  total_cost_basis: number;
  total_current_value: number;
  total_unrealized_pnl: number;
  total_pnl_percent: number;
  holdings: HoldingPerformanceItem[];
}

export interface BackupFileInfo {
  filename: string;
  file_path: string;
  size_bytes: number;
  created_at: string;
}

export interface ChangePinPayload {
  current_pin: string;
  new_pin: string;
}

export interface AppUpdateInfo {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  release_notes: string;
  published_at: string;
  download_url: string;
}

export interface PaymentMethodItem {
  id: number;
  name: string;
  type_key: string; // 'cash' | 'bank' | 'credit_card' | 'debit_card' | 'upi' | 'wallet' | 'crypto' | 'custom'
  currency?: string | null;
  icon: string;
  color: string;
  is_default: number;
  is_active: number;
  created_at: string;
}

export interface CreatePaymentMethodPayload {
  name: string;
  type_key?: string | null;
  currency?: string | null;
  icon?: string | null;
  color?: string | null;
  is_default?: number | null;
}

export interface UpdatePaymentMethodPayload {
  name: string;
  type_key?: string | null;
  currency?: string | null;
  icon?: string | null;
  color?: string | null;
  is_default?: number | null;
  is_active: number;
}

