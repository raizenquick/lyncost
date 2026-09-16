import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import {
  Account,
  AccountLedgerEntry,
  AppSettings,
  BillItem,
  BillReminder,
  BudgetProgress,
  Category,
  CreateAccountPayload,
  CreateBillPayload,
  CreateBudgetPayload,
  CreateCategoryPayload,
  CreateDebtPayload,
  CreateHoldingPayload,
  CreateRecurringRulePayload,
  CreateShoppingItemPayload,
  CreateTransactionPayload,
  CreateWarrantyPayload,
  CsvImportPayload,
  CsvImportResult,
  DebtItem,
  DebtTransactionItem,
  RecordDebtPaymentPayload,
  DrawDebtFundsPayload,
  SpendFromDebtPayload,
  ExchangeRateItem,
  InvestmentHolding,
  MonthSummary,
  NetWorthSnapshotItem,
  NetWorthSummary,
  PortfolioSummary,
  PriceHistoryPoint,
  RecurringRule,
  SetExchangeRatePayload,
  ShoppingListItem,
  SinglePriceUpdatePayload,
  Tag,
  Transaction,
  TransactionFilter,
  UpdateAccountPayload,
  UpdateBillPayload,
  UpdateBudgetPayload,
  UpdateCategoryPayload,
  UpdateDebtPayload,
  UpdateHoldingPayload,
  UpdateNotificationSettingsPayload,
  UpdateRecurringRulePayload,
  UpdateTransactionPayload,
  UpdateWarrantyPayload,
  WarrantyItem,
  BackupFileInfo,
  CategorySpendingReportItem,
  ChangePinPayload,
  IncomeExpenseTrendItem,
  InvestmentPerformanceReport,
  ReportDateFilter,
  Goal,
  CreateGoalPayload,
  UpdateGoalPayload,
  ContributeGoalPayload,
  AppUpdateInfo,
  PaymentMethodItem,
  CreatePaymentMethodPayload,
  UpdatePaymentMethodPayload,
} from '../types';
import { autoSyncNumberFormatWithCurrency } from '../lib/utils';

interface AppStoreState {
  settings: AppSettings | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  tags: Tag[];
  recurringRules: RecurringRule[];
  monthSummary: MonthSummary | null;
  budgets: BudgetProgress[];
  goals: Goal[];
  bills: BillItem[];
  billReminders: BillReminder[];
  shoppingItems: ShoppingListItem[];
  warranties: WarrantyItem[];
  holdings: InvestmentHolding[];
  portfolioSummary: PortfolioSummary | null;
  exchangeRates: ExchangeRateItem[];
  debts: DebtItem[];
  netWorthSummary: NetWorthSummary | null;
  netWorthHistory: NetWorthSnapshotItem[];
  backups: BackupFileInfo[];
  isUnlocked: boolean;
  isLoading: boolean;
  theme: 'dark' | 'light';
  error: string | null;
  activeTab:
    | 'dashboard'
    | 'accounts'
    | 'transactions'
    | 'categories'
    | 'recurring'
    | 'investments'
    | 'debts'
    | 'goals'
    | 'budgets'
    | 'bills'
    | 'shopping'
    | 'warranties'
    | 'csv_import'
    | 'reports'
    | 'settings'
    | 'calculators';

  setActiveTab: (tab: AppStoreState['activeTab']) => void;
  initApp: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  unlockApp: (pin: string) => Promise<boolean>;
  lockApp: () => void;
  wipeData: () => Promise<void>;

  // Settings & Security
  setBaseCurrency: (currency: string) => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  changePin: (payload: ChangePinPayload) => Promise<void>;
  updateNotificationSettings: (payload: UpdateNotificationSettingsPayload) => Promise<AppSettings>;
  sendOsDesktopNotification: (title: string, body: string) => Promise<boolean>;
  checkDueReminders: () => Promise<BillReminder[]>;

  // Backup & Restore
  loadBackups: () => Promise<void>;
  createBackup: (customDestFolder?: string) => Promise<string>;
  restoreBackup: (filePath: string) => Promise<void>;
  checkAndRunDailyBackup: () => Promise<string | null>;

  // Reports
  fetchCategorySpendingReport: (filter?: ReportDateFilter) => Promise<CategorySpendingReportItem[]>;
  fetchIncomeExpenseTrend: (filter?: ReportDateFilter) => Promise<IncomeExpenseTrendItem[]>;
  fetchInvestmentPerformanceReport: () => Promise<InvestmentPerformanceReport>;

  // In-App Auto Update System
  updateInfo: AppUpdateInfo | null;
  isCheckingUpdate: boolean;
  isInstallingUpdate: boolean;
  updateInstallSuccess: boolean;
  updateError: string | null;
  dismissUpdateBanner: boolean;
  checkForAppUpdate: () => Promise<void>;
  installAppUpdate: () => Promise<void>;
  restartApp: () => Promise<void>;

  // Global Privacy Mode
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;

  setDismissUpdateBanner: (dismiss: boolean) => void;

  // Accounts
  loadAccounts: (includeArchived?: boolean) => Promise<void>;
  createAccount: (payload: CreateAccountPayload) => Promise<Account>;
  updateAccount: (id: number, payload: UpdateAccountPayload) => Promise<Account>;
  archiveAccount: (id: number, archive: boolean) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  fetchLedger: (accountId: number) => Promise<AccountLedgerEntry[]>;

  // Categories
  loadCategories: () => Promise<void>;
  createCategory: (payload: CreateCategoryPayload) => Promise<Category>;
  updateCategory: (id: number, payload: UpdateCategoryPayload) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;

  // Tags
  loadTags: () => Promise<void>;

  // Transactions
  loadTransactions: (filter?: TransactionFilter) => Promise<void>;
  createTransaction: (payload: CreateTransactionPayload) => Promise<Transaction>;
  updateTransaction: (id: number, payload: UpdateTransactionPayload) => Promise<Transaction>;
  deleteTransaction: (id: number) => Promise<void>;

  // Recurring Rules
  loadRecurringRules: () => Promise<void>;
  createRecurringRule: (payload: CreateRecurringRulePayload) => Promise<RecurringRule>;
  updateRecurringRule: (id: number, payload: UpdateRecurringRulePayload) => Promise<RecurringRule>;
  deleteRecurringRule: (id: number) => Promise<void>;
  processRecurringRules: () => Promise<number>;

  // Budgets
  loadBudgets: () => Promise<void>;
  createBudget: (payload: CreateBudgetPayload) => Promise<BudgetProgress>;
  updateBudget: (id: number, payload: UpdateBudgetPayload) => Promise<BudgetProgress>;
  deleteBudget: (id: number) => Promise<void>;

  // Goals
  loadGoals: () => Promise<void>;
  createGoal: (payload: CreateGoalPayload) => Promise<Goal>;
  updateGoal: (id: number, payload: UpdateGoalPayload) => Promise<Goal>;
  deleteGoal: (id: number) => Promise<void>;
  contributeGoal: (payload: ContributeGoalPayload) => Promise<Goal>;

  // Bills
  loadBills: () => Promise<void>;
  createBill: (payload: CreateBillPayload) => Promise<BillItem>;
  updateBill: (id: number, payload: UpdateBillPayload) => Promise<BillItem>;
  deleteBill: (id: number) => Promise<void>;
  markBillPaid: (id: number) => Promise<Transaction>;
  unmarkBillPaid: (id: number) => Promise<void>;

  // Shopping List
  loadShoppingItems: () => Promise<void>;
  createShoppingItem: (payload: CreateShoppingItemPayload) => Promise<ShoppingListItem>;
  updateShoppingItem: (id: number, payload: CreateShoppingItemPayload) => Promise<ShoppingListItem>;
  toggleShoppingItem: (id: number) => Promise<ShoppingListItem>;
  deleteShoppingItem: (id: number) => Promise<void>;
  clearCompletedShoppingItems: () => Promise<void>;

  // Warranties
  loadWarranties: () => Promise<void>;
  createWarranty: (payload: CreateWarrantyPayload) => Promise<WarrantyItem>;
  updateWarranty: (id: number, payload: UpdateWarrantyPayload) => Promise<WarrantyItem>;
  deleteWarranty: (id: number) => Promise<void>;

  // CSV Import
  importCsvTransactions: (payload: CsvImportPayload) => Promise<CsvImportResult>;

  // Dashboard Summary
  loadMonthSummary: (month?: string) => Promise<void>;

  // Investments
  loadHoldings: () => Promise<void>;
  loadPortfolioSummary: () => Promise<void>;
  createHolding: (payload: CreateHoldingPayload) => Promise<number>;
  updateHolding: (id: number, payload: UpdateHoldingPayload) => Promise<void>;
  archiveHolding: (id: number, archive: boolean) => Promise<void>;
  deleteHolding: (id: number) => Promise<void>;
  updateHoldingPrice: (payload: SinglePriceUpdatePayload) => Promise<void>;
  bulkUpdateHoldingPrices: (updates: SinglePriceUpdatePayload[]) => Promise<void>;
  fetchHoldingPriceHistory: (holdingId: number) => Promise<PriceHistoryPoint[]>;

  // Exchange Rates
  loadExchangeRates: () => Promise<void>;
  setExchangeRate: (payload: SetExchangeRatePayload) => Promise<void>;
  deleteExchangeRate: (id: number) => Promise<void>;

  // Debts
  loadDebts: () => Promise<void>;
  createDebt: (payload: CreateDebtPayload) => Promise<number>;
  updateDebt: (id: number, payload: UpdateDebtPayload) => Promise<void>;
  deleteDebt: (id: number) => Promise<void>;
  getDebtTransactions: (debtId: number) => Promise<DebtTransactionItem[]>;
  recordDebtPayment: (payload: RecordDebtPaymentPayload) => Promise<void>;
  drawDebtFunds: (payload: DrawDebtFundsPayload) => Promise<void>;
  spendFromDebt: (payload: SpendFromDebtPayload) => Promise<void>;

  // Net Worth
  loadNetWorthSummary: () => Promise<void>;
  loadNetWorthHistory: (days?: number) => Promise<void>;
  checkAndSnapshotNetWorth: () => Promise<boolean>;
  recordNetWorthSnapshot: (snapshotDate?: string) => Promise<void>;

  // Payment Methods
  paymentMethods: PaymentMethodItem[];
  loadPaymentMethods: () => Promise<void>;
  createPaymentMethod: (payload: CreatePaymentMethodPayload) => Promise<number>;
  updatePaymentMethod: (id: number, payload: UpdatePaymentMethodPayload) => Promise<void>;
  deletePaymentMethod: (id: number) => Promise<void>;
  applyRegionalPaymentPresets: (currency: string) => Promise<void>;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  settings: null,
  accounts: [],
  categories: [],
  transactions: [],
  tags: [],
  paymentMethods: [],
  recurringRules: [],
  monthSummary: null,
  budgets: [],
  goals: [],
  bills: [],
  billReminders: [],
  shoppingItems: [],
  warranties: [],
  holdings: [],
  portfolioSummary: null,
  exchangeRates: [],
  debts: [],
  netWorthSummary: null,
  netWorthHistory: [],
  backups: [],
  updateInfo: null,
  isCheckingUpdate: false,
  isInstallingUpdate: false,
  updateInstallSuccess: false,
  updateError: null,
  dismissUpdateBanner: false,
  isPrivacyMode: typeof window !== 'undefined' ? localStorage.getItem('lyncost_privacy_mode') === 'true' : false,
  togglePrivacyMode: () => {
    set((state) => {
      const next = !state.isPrivacyMode;
      if (typeof window !== 'undefined') {
        localStorage.setItem('lyncost_privacy_mode', String(next));
        window.dispatchEvent(new Event('lyncost_format_changed'));
      }
      return { isPrivacyMode: next };
    });
  },

  isUnlocked: false,
  isLoading: true,
  theme: 'dark',
  error: null,
  activeTab: 'dashboard',

  setActiveTab: (tab) => set({ activeTab: tab }),

  initApp: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await invoke<AppSettings>('get_app_settings');
      if (typeof window !== 'undefined' && settings?.base_currency) {
        localStorage.setItem('lyncost_base_currency', settings.base_currency);
        if (!localStorage.getItem('lyncost_number_format')) {
          autoSyncNumberFormatWithCurrency(settings.base_currency);
        }
      }
      const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem('lyncost_desktop_theme') : null) as 'dark' | 'light' | null;
      const initialTheme: 'dark' | 'light' = (savedTheme === 'light' || settings?.theme === 'light') ? 'light' : 'dark';
      set({ settings, theme: initialTheme });
      if (typeof window !== 'undefined') {
        if (initialTheme === 'light') {
          document.documentElement.classList.add('theme-light');
          document.documentElement.classList.remove('theme-dark');
          document.body.classList.add('theme-light');
          document.body.classList.remove('theme-dark');
        } else {
          document.documentElement.classList.remove('theme-light');
          document.documentElement.classList.add('theme-dark');
          document.body.classList.remove('theme-light');
          document.body.classList.add('theme-dark');
        }
      }

      // PIN Security Authentication Gate
      if (settings?.has_pin) {
        set({ isUnlocked: false, isLoading: false });
        return;
      }

      // No PIN configured - auto unlock and populate data
      set({ isUnlocked: true });
      await get().processRecurringRules();
      await get().checkAndSnapshotNetWorth();
      await get().checkAndRunDailyBackup();
      await Promise.all([
        get().loadAccounts(false),
        get().loadCategories(),
        get().loadTags(),
        get().loadTransactions(),
        get().loadRecurringRules(),
        get().loadMonthSummary(),
        get().loadBudgets(),
        get().loadGoals(),
        get().loadBills(),
        get().checkDueReminders(),
        get().loadShoppingItems(),
        get().loadWarranties(),
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadExchangeRates(),
        get().loadDebts(),
        get().loadNetWorthSummary(),
        get().loadNetWorthHistory(),
        get().loadPaymentMethods(),
      ]);
      set({ isLoading: false });
      // Quietly check for app updates in background
      get().checkForAppUpdate();
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  setPin: async (pin: string) => {
    set({ error: null });
    try {
      await invoke('set_initial_pin', { pin });
      const updatedSettings = await invoke<AppSettings>('get_app_settings');
      set({ settings: updatedSettings, isUnlocked: true });

      // Run recurring rules catchup and load initial collections
      await get().processRecurringRules();
      await get().checkAndSnapshotNetWorth();
      await get().checkAndRunDailyBackup();
      await Promise.all([
        get().loadAccounts(false),
        get().loadCategories(),
        get().loadTags(),
        get().loadTransactions(),
        get().loadRecurringRules(),
        get().loadMonthSummary(),
        get().loadBudgets(),
        get().loadGoals(),
        get().loadBills(),
        get().checkDueReminders(),
        get().loadShoppingItems(),
        get().loadWarranties(),
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadExchangeRates(),
        get().loadDebts(),
        get().loadNetWorthSummary(),
        get().loadNetWorthHistory(),
        get().loadPaymentMethods(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  unlockApp: async (pin: string) => {
    set({ error: null });
    try {
      const valid = await invoke<boolean>('verify_pin', { pin });
      if (valid) {
        set({ isUnlocked: true });

        // Run recurring rules generation catch-up on every launch (AGENTS.md Section 5.3)
        await get().processRecurringRules();
        await get().checkAndSnapshotNetWorth();
        await get().checkAndRunDailyBackup();

        await Promise.all([
          get().loadAccounts(false),
          get().loadCategories(),
          get().loadTags(),
          get().loadTransactions(),
          get().loadRecurringRules(),
          get().loadMonthSummary(),
          get().loadBudgets(),
          get().loadGoals(),
          get().loadBills(),
          get().checkDueReminders(),
          get().loadShoppingItems(),
          get().loadWarranties(),
          get().loadHoldings(),
          get().loadPortfolioSummary(),
          get().loadExchangeRates(),
          get().loadDebts(),
          get().loadNetWorthSummary(),
          get().loadNetWorthHistory(),
          get().loadPaymentMethods(),
        ]);
        return true;
      } else {
        set({ error: 'Incorrect PIN. Please try again.' });
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return false;
    }
  },

  lockApp: () => {
    set({ isUnlocked: false });
  },

  wipeData: async () => {
    set({ isLoading: true, error: null });
    try {
      await invoke('wipe_all_data');
      await get().initApp();
      set({ isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  // Accounts
  loadAccounts: async (includeArchived = false) => {
    try {
      const accounts = await invoke<Account[]>('get_accounts', { includeArchived });
      set({ accounts });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  createAccount: async (payload: CreateAccountPayload) => {
    try {
      const created = await invoke<Account>('create_account', { payload });
      await Promise.all([get().loadAccounts(false), get().loadNetWorthSummary()]);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateAccount: async (id: number, payload: UpdateAccountPayload) => {
    try {
      const updated = await invoke<Account>('update_account', { id, payload });
      await Promise.all([get().loadAccounts(false), get().loadNetWorthSummary()]);
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  archiveAccount: async (id: number, archive: boolean) => {
    try {
      await invoke('archive_account', { id, archive });
      await Promise.all([get().loadAccounts(true), get().loadNetWorthSummary()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteAccount: async (id: number) => {
    try {
      await invoke('delete_account', { id });
      await Promise.all([get().loadAccounts(true), get().loadNetWorthSummary()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  fetchLedger: async (accountId: number) => {
    try {
      return await invoke<AccountLedgerEntry[]>('get_account_ledger', { accountId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Categories
  loadCategories: async () => {
    try {
      const categories = await invoke<Category[]>('get_categories');
      set({ categories });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  createCategory: async (payload: CreateCategoryPayload) => {
    try {
      const created = await invoke<Category>('create_category', { payload });
      await get().loadCategories();
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateCategory: async (id: number, payload: UpdateCategoryPayload) => {
    try {
      const updated = await invoke<Category>('update_category', { id, payload });
      await get().loadCategories();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteCategory: async (id: number) => {
    try {
      await invoke('delete_category', { id });
      await get().loadCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Tags
  loadTags: async () => {
    try {
      const tags = await invoke<Tag[]>('get_tags');
      set({ tags });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  // Transactions
  loadTransactions: async (filter = {}) => {
    try {
      const transactions = await invoke<Transaction[]>('get_transactions', { filter });
      set({ transactions });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  createTransaction: async (payload: CreateTransactionPayload) => {
    try {
      const created = await invoke<Transaction>('create_transaction', { payload });
      await Promise.all([
        get().loadAccounts(false),
        get().loadTransactions(),
        get().loadTags(),
        get().loadMonthSummary(),
        get().loadBudgets(),
        get().loadWarranties(),
        get().loadNetWorthSummary(),
      ]);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateTransaction: async (id: number, payload: UpdateTransactionPayload) => {
    try {
      const updated = await invoke<Transaction>('update_transaction', { id, payload });
      await Promise.all([
        get().loadAccounts(false),
        get().loadTransactions(),
        get().loadTags(),
        get().loadMonthSummary(),
        get().loadBudgets(),
        get().loadWarranties(),
        get().loadNetWorthSummary(),
      ]);
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteTransaction: async (id: number) => {
    try {
      await invoke('delete_transaction', { id });
      await Promise.all([
        get().loadAccounts(false),
        get().loadTransactions(),
        get().loadMonthSummary(),
        get().loadBudgets(),
        get().loadWarranties(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Recurring Rules
  loadRecurringRules: async () => {
    try {
      const recurringRules = await invoke<RecurringRule[]>('get_recurring_rules');
      set({ recurringRules });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  createRecurringRule: async (payload: CreateRecurringRulePayload) => {
    try {
      const created = await invoke<RecurringRule>('create_recurring_rule', { payload });
      await get().loadRecurringRules();
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateRecurringRule: async (id: number, payload: UpdateRecurringRulePayload) => {
    try {
      const updated = await invoke<RecurringRule>('update_recurring_rule', { id, payload });
      await get().loadRecurringRules();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteRecurringRule: async (id: number) => {
    try {
      await invoke('delete_recurring_rule', { id });
      await get().loadRecurringRules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  processRecurringRules: async () => {
    try {
      const generated = await invoke<number>('process_recurring_rules');
      if (generated > 0) {
        await Promise.all([
          get().loadAccounts(false),
          get().loadTransactions(),
          get().loadRecurringRules(),
          get().loadMonthSummary(),
        ]);
      }
      return generated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return 0;
    }
  },

  // Dashboard Month Summary
  loadMonthSummary: async (month?: string) => {
    try {
      const monthSummary = await invoke<MonthSummary>('get_month_summary', { month });
      set({ monthSummary });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  // Budgets
  loadBudgets: async () => {
    try {
      const budgets = await invoke<BudgetProgress[]>('get_budgets');
      set({ budgets });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  createBudget: async (payload: CreateBudgetPayload) => {
    try {
      const created = await invoke<BudgetProgress>('create_budget', { payload });
      await get().loadBudgets();
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateBudget: async (id: number, payload: UpdateBudgetPayload) => {
    try {
      const updated = await invoke<BudgetProgress>('update_budget', { id, payload });
      await get().loadBudgets();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteBudget: async (id: number) => {
    try {
      await invoke('delete_budget', { id });
      await get().loadBudgets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Goals
  loadGoals: async () => {
    try {
      const goals = await invoke<Goal[]>('get_goals');
      set({ goals });
    } catch (err: unknown) {
      console.error('Failed to load goals:', err);
    }
  },

  createGoal: async (payload: CreateGoalPayload) => {
    try {
      const created = await invoke<Goal>('create_goal', { payload });
      await get().loadGoals();
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateGoal: async (id: number, payload: UpdateGoalPayload) => {
    try {
      const updated = await invoke<Goal>('update_goal', { id, payload });
      await get().loadGoals();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteGoal: async (id: number) => {
    try {
      await invoke('delete_goal', { id });
      await get().loadGoals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  contributeGoal: async (payload: ContributeGoalPayload) => {
    try {
      const updated = await invoke<Goal>('contribute_to_goal', { payload });
      await get().loadGoals();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Bills
  loadBills: async () => {
    try {
      const bills = await invoke<BillItem[]>('get_bills');
      set({ bills });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  createBill: async (payload: CreateBillPayload) => {
    try {
      const created = await invoke<BillItem>('create_bill', { payload });
      await Promise.all([get().loadBills(), get().checkDueReminders()]);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateBill: async (id: number, payload: UpdateBillPayload) => {
    try {
      const updated = await invoke<BillItem>('update_bill', { id, payload });
      await Promise.all([get().loadBills(), get().checkDueReminders()]);
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteBill: async (id: number) => {
    try {
      await invoke('delete_bill', { id });
      await Promise.all([
        get().loadBills(),
        get().checkDueReminders(),
        get().loadAccounts(false),
        get().loadTransactions(),
        get().loadMonthSummary(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  markBillPaid: async (id: number) => {
    try {
      const txn = await invoke<Transaction>('mark_bill_paid', { id });
      await Promise.all([
        get().loadBills(),
        get().checkDueReminders(),
        get().loadAccounts(false),
        get().loadTransactions(),
        get().loadMonthSummary(),
        get().loadBudgets(),
        get().loadNetWorthSummary(),
      ]);
      return txn;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  unmarkBillPaid: async (id: number) => {
    try {
      await invoke('unmark_bill_paid', { id });
      await Promise.all([
        get().loadBills(),
        get().checkDueReminders(),
        get().loadAccounts(false),
        get().loadTransactions(),
        get().loadMonthSummary(),
        get().loadBudgets(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Shopping List
  loadShoppingItems: async () => {
    try {
      const shoppingItems = await invoke<ShoppingListItem[]>('get_shopping_items');
      set({ shoppingItems });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  createShoppingItem: async (payload: CreateShoppingItemPayload) => {
    try {
      const created = await invoke<ShoppingListItem>('create_shopping_item', { payload });
      await get().loadShoppingItems();
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateShoppingItem: async (id: number, payload: CreateShoppingItemPayload) => {
    try {
      const updated = await invoke<ShoppingListItem>('update_shopping_item', { id, payload });
      await get().loadShoppingItems();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  toggleShoppingItem: async (id: number) => {
    try {
      const toggled = await invoke<ShoppingListItem>('toggle_shopping_item', { id });
      await get().loadShoppingItems();
      return toggled;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteShoppingItem: async (id: number) => {
    try {
      await invoke('delete_shopping_item', { id });
      await get().loadShoppingItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  clearCompletedShoppingItems: async () => {
    try {
      await invoke('clear_completed_shopping_items');
      await get().loadShoppingItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Warranties
  loadWarranties: async () => {
    try {
      const warranties = await invoke<WarrantyItem[]>('get_warranties');
      set({ warranties });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  createWarranty: async (payload: CreateWarrantyPayload) => {
    try {
      const created = await invoke<WarrantyItem>('create_warranty', { payload });
      await get().loadWarranties();
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateWarranty: async (id: number, payload: UpdateWarrantyPayload) => {
    try {
      const updated = await invoke<WarrantyItem>('update_warranty', { id, payload });
      await get().loadWarranties();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteWarranty: async (id: number) => {
    try {
      await invoke('delete_warranty', { id });
      await get().loadWarranties();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // CSV Import
  importCsvTransactions: async (payload: CsvImportPayload) => {
    try {
      const result = await invoke<CsvImportResult>('import_csv_transactions', { payload });
      if (result.imported_count > 0) {
        await Promise.all([
          get().loadAccounts(false),
          get().loadTransactions(),
          get().loadCategories(),
          get().loadMonthSummary(),
          get().loadBudgets(),
        ]);
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Investments
  loadHoldings: async () => {
    try {
      const holdings = await invoke<InvestmentHolding[]>('get_holdings');
      set({ holdings });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  loadPortfolioSummary: async () => {
    try {
      const portfolioSummary = await invoke<PortfolioSummary>('get_portfolio_summary');
      set({ portfolioSummary });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  createHolding: async (payload: CreateHoldingPayload) => {
    try {
      const holdingId = await invoke<number>('create_holding', { payload });
      await Promise.all([
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
      ]);
      return holdingId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateHolding: async (id: number, payload: UpdateHoldingPayload) => {
    try {
      await invoke('update_holding', { id, payload });
      await Promise.all([
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  archiveHolding: async (id: number, archive: boolean) => {
    try {
      await invoke('archive_holding', { id, isArchived: archive });
      await Promise.all([
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteHolding: async (id: number) => {
    try {
      await invoke('delete_holding', { id });
      await Promise.all([
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateHoldingPrice: async (payload: SinglePriceUpdatePayload) => {
    try {
      await invoke('update_holding_price', { payload });
      await Promise.all([
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  bulkUpdateHoldingPrices: async (updates: SinglePriceUpdatePayload[]) => {
    try {
      await invoke('bulk_update_holding_prices', { updates });
      await Promise.all([
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  fetchHoldingPriceHistory: async (holdingId: number) => {
    try {
      return await invoke<PriceHistoryPoint[]>('get_holding_price_history', { holdingId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Exchange Rates
  loadExchangeRates: async () => {
    try {
      const exchangeRates = await invoke<ExchangeRateItem[]>('get_exchange_rates');
      set({ exchangeRates });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  setExchangeRate: async (payload: SetExchangeRatePayload) => {
    try {
      await invoke('set_exchange_rate', { payload });
      await Promise.all([
        get().loadExchangeRates(),
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
        get().loadTransactions(),
        get().loadMonthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteExchangeRate: async (id: number) => {
    try {
      await invoke('delete_exchange_rate', { id });
      await Promise.all([
        get().loadExchangeRates(),
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Debts
  loadDebts: async () => {
    try {
      const debts = await invoke<DebtItem[]>('get_debts');
      set({ debts });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  createDebt: async (payload: CreateDebtPayload) => {
    try {
      const debtId = await invoke<number>('create_debt', { payload });
      await Promise.all([
        get().loadDebts(),
        get().loadAccounts(),
        get().loadTransactions(),
        get().loadNetWorthSummary(),
        get().loadMonthSummary(),
      ]);
      return debtId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateDebt: async (id: number, payload: UpdateDebtPayload) => {
    try {
      await invoke('update_debt', { id, payload });
      await Promise.all([
        get().loadDebts(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteDebt: async (id: number) => {
    try {
      await invoke('delete_debt', { id });
      await Promise.all([
        get().loadDebts(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  getDebtTransactions: async (debtId: number) => {
    try {
      return await invoke<DebtTransactionItem[]>('get_debt_transactions', { debtId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return [];
    }
  },

  recordDebtPayment: async (payload: RecordDebtPaymentPayload) => {
    try {
      await invoke('record_debt_payment', { payload });
      await Promise.all([
        get().loadDebts(),
        get().loadAccounts(),
        get().loadTransactions(),
        get().loadNetWorthSummary(),
        get().loadMonthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  drawDebtFunds: async (payload: DrawDebtFundsPayload) => {
    try {
      await invoke('draw_debt_funds', { payload });
      await Promise.all([
        get().loadDebts(),
        get().loadAccounts(),
        get().loadTransactions(),
        get().loadNetWorthSummary(),
        get().loadMonthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  spendFromDebt: async (payload: SpendFromDebtPayload) => {
    try {
      await invoke('spend_from_debt', { payload });
      await Promise.all([
        get().loadDebts(),
        get().loadNetWorthSummary(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Net Worth
  loadNetWorthSummary: async () => {
    try {
      const netWorthSummary = await invoke<NetWorthSummary>('get_net_worth_summary');
      set({ netWorthSummary });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  loadNetWorthHistory: async (days?: number) => {
    try {
      const netWorthHistory = await invoke<NetWorthSnapshotItem[]>('get_net_worth_history', {
        limitDays: days ?? null,
      });
      set({ netWorthHistory });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  checkAndSnapshotNetWorth: async () => {
    try {
      const snapshotted = await invoke<boolean>('check_and_snapshot_net_worth');
      if (snapshotted) {
        await get().loadNetWorthHistory();
      }
      return snapshotted;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return false;
    }
  },

  recordNetWorthSnapshot: async (snapshotDate?: string) => {
    try {
      await invoke('record_net_worth_snapshot', { snapshotDate: snapshotDate ?? null });
      await Promise.all([
        get().loadNetWorthSummary(),
        get().loadNetWorthHistory(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Settings & Security
  setBaseCurrency: async (newCurrency: string) => {
    try {
      const curr = newCurrency.trim().toUpperCase();
      await invoke('set_base_currency', { newCurrency: curr });
      const updatedSettings = await invoke<AppSettings>('get_app_settings');
      if (typeof window !== 'undefined') {
        localStorage.setItem('lyncost_base_currency', curr);
        autoSyncNumberFormatWithCurrency(curr);
        window.dispatchEvent(new Event('lyncost_format_changed'));
      }
      set({ settings: updatedSettings });
      await Promise.all([
        get().loadAccounts(false),
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadNetWorthSummary(),
        get().loadTransactions(),
        get().loadMonthSummary(),
        get().loadPaymentMethods(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  setTheme: async (theme: 'dark' | 'light') => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('lyncost_desktop_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
      }
    }
    try {
      await invoke('set_app_theme', { theme });
      const updatedSettings = await invoke<AppSettings>('get_app_settings');
      set({ settings: updatedSettings });
    } catch (err) {
      console.warn('Could not persist theme to backend:', err);
    }
  },

  changePin: async (payload: ChangePinPayload) => {
    try {
      await invoke('change_pin', { payload });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateNotificationSettings: async (payload: UpdateNotificationSettingsPayload) => {
    try {
      const updatedSettings = await invoke<AppSettings>('update_notification_settings', { payload });
      set({ settings: updatedSettings });
      await get().checkDueReminders();
      return updatedSettings;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  sendOsDesktopNotification: async (title: string, body: string) => {
    try {
      return await invoke<boolean>('send_os_desktop_notification', { title, body });
    } catch (err: unknown) {
      console.error('Failed to send OS notification:', err);
      return false;
    }
  },

  checkDueReminders: async () => {
    try {
      const reminders = await invoke<BillReminder[]>('check_and_send_due_reminders');
      set({ billReminders: reminders });
      return reminders;
    } catch (err: unknown) {
      console.error('Failed to check bill reminders:', err);
      return [];
    }
  },

  // Backup & Restore
  loadBackups: async () => {
    try {
      const backups = await invoke<BackupFileInfo[]>('get_backups_list');
      set({ backups });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  createBackup: async (customDestFolder?: string) => {
    try {
      const path = await invoke<string>('create_backup', {
        customDestFolder: customDestFolder ?? null,
      });
      await get().loadBackups();
      const updatedSettings = await invoke<AppSettings>('get_app_settings');
      set({ settings: updatedSettings });
      return path;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  restoreBackup: async (backupFilePath: string) => {
    try {
      await invoke('restore_backup', { backupFilePath });
      // Reload all state after restoration
      const updatedSettings = await invoke<AppSettings>('get_app_settings');
      set({ settings: updatedSettings });
      await Promise.all([
        get().loadAccounts(false),
        get().loadCategories(),
        get().loadTags(),
        get().loadTransactions(),
        get().loadRecurringRules(),
        get().loadMonthSummary(),
        get().loadBudgets(),
        get().loadBills(),
        get().loadShoppingItems(),
        get().loadWarranties(),
        get().loadHoldings(),
        get().loadPortfolioSummary(),
        get().loadExchangeRates(),
        get().loadDebts(),
        get().loadNetWorthSummary(),
        get().loadNetWorthHistory(),
        get().loadBackups(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  checkAndRunDailyBackup: async () => {
    try {
      const backupPath = await invoke<string | null>('check_and_run_daily_backup');
      if (backupPath) {
        await get().loadBackups();
        const updatedSettings = await invoke<AppSettings>('get_app_settings');
        set({ settings: updatedSettings });
      }
      return backupPath;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return null;
    }
  },

  // Reports
  fetchCategorySpendingReport: async (filter?: ReportDateFilter) => {
    try {
      return await invoke<CategorySpendingReportItem[]>('get_category_spending_report', {
        filter: filter ?? null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  fetchIncomeExpenseTrend: async (filter?: ReportDateFilter) => {
    try {
      return await invoke<IncomeExpenseTrendItem[]>('get_income_expense_trend', {
        filter: filter ?? null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  fetchInvestmentPerformanceReport: async () => {
    try {
      return await invoke<InvestmentPerformanceReport>('get_investment_performance_report');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // Payment Methods
  loadPaymentMethods: async () => {
    try {
      const paymentMethods = await invoke<PaymentMethodItem[]>('get_payment_methods');
      set({ paymentMethods });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  createPaymentMethod: async (payload: CreatePaymentMethodPayload) => {
    try {
      const id = await invoke<number>('create_payment_method', { payload });
      await get().loadPaymentMethods();
      return id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updatePaymentMethod: async (id: number, payload: UpdatePaymentMethodPayload) => {
    try {
      await invoke('update_payment_method', { id, payload });
      await get().loadPaymentMethods();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deletePaymentMethod: async (id: number) => {
    try {
      await invoke('delete_payment_method', { id });
      await get().loadPaymentMethods();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  applyRegionalPaymentPresets: async (currency: string) => {
    try {
      const paymentMethods = await invoke<PaymentMethodItem[]>('apply_regional_payment_presets', { currency });
      set({ paymentMethods });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // In-App Auto Update System
  checkForAppUpdate: async () => {
    set({ isCheckingUpdate: true, updateError: null });
    try {
      const info = await invoke<AppUpdateInfo>('check_app_update');
      set({ updateInfo: info, isCheckingUpdate: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to check for updates:', msg);
      set({ isCheckingUpdate: false });
    }
  },

  installAppUpdate: async () => {
    const info = get().updateInfo;
    set({ isInstallingUpdate: true, updateError: null });
    try {
      await invoke<string>('install_app_update', {
        downloadUrl: info?.download_url || null,
      });
      set({ isInstallingUpdate: false, updateInstallSuccess: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isInstallingUpdate: false, updateError: msg });
      throw new Error(msg);
    }
  },

  restartApp: async () => {
    try {
      await invoke('restart_application');
    } catch (err: unknown) {
      console.error('Failed to restart application:', err);
    }
  },

  setDismissUpdateBanner: (dismiss: boolean) => {
    set({ dismissUpdateBanner: dismiss });
  },
}));

