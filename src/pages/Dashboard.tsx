import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TransactionModal } from '../components/TransactionModal';
import { FinancialHealthWidget } from '../components/FinancialHealthWidget';
import { CashflowForecastWidget } from '../components/CashflowForecastWidget';
import {
  Wallet,
  Building2,
  Banknote,
  TrendingUp,
  CreditCard,
  Plus,
  ShieldCheck,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ArrowLeftRight,
  LineChart as ChartIcon,
  Camera,
  Target,
  Trophy,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { formatIndianDate, formatIndianCurrency } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const accounts = useAppStore(state => state.accounts);
  const transactions = useAppStore(state => state.transactions);
  const monthSummary = useAppStore(state => state.monthSummary);
  const goals = useAppStore(state => state.goals);
  const bills = useAppStore(state => state.bills);
  const settings = useAppStore(state => state.settings);
  const theme = useAppStore(state => state.theme);
  const netWorthSummary = useAppStore(state => state.netWorthSummary);
  const netWorthHistory = useAppStore(state => state.netWorthHistory);
  const loadAccounts = useAppStore(state => state.loadAccounts);
  const loadTransactions = useAppStore(state => state.loadTransactions);
  const loadMonthSummary = useAppStore(state => state.loadMonthSummary);
  const loadGoals = useAppStore(state => state.loadGoals);
  const loadBills = useAppStore(state => state.loadBills);
  const loadNetWorthSummary = useAppStore(state => state.loadNetWorthSummary);
  const loadNetWorthHistory = useAppStore(state => state.loadNetWorthHistory);
  const checkAndSnapshotNetWorth = useAppStore(state => state.checkAndSnapshotNetWorth);
  const recordNetWorthSnapshot = useAppStore(state => state.recordNetWorthSnapshot);
  const markBillPaid = useAppStore(state => state.markBillPaid);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [payingBillId, setPayingBillId] = useState<number | null>(null);
  const isPrivacyMode = useAppStore(state => state.isPrivacyMode);
  const togglePrivacyMode = useAppStore(state => state.togglePrivacyMode);

  useEffect(() => {
    loadAccounts(false);
    loadTransactions();
    loadMonthSummary();
    loadGoals();
    loadBills();
    loadNetWorthSummary();
    loadNetWorthHistory(30);
    checkAndSnapshotNetWorth();
  }, [
    loadAccounts,
    loadTransactions,
    loadMonthSummary,
    loadGoals,
    loadBills,
    loadNetWorthSummary,
    loadNetWorthHistory,
    checkAndSnapshotNetWorth,
  ]);

  const activeAccounts = accounts.filter((a) => a.is_archived === 0);
  const baseCurrency = settings?.base_currency || 'INR';

  const formatCurrency = (val: number, cur = baseCurrency) => {
    if (isPrivacyMode) return '••••••';
    return formatIndianCurrency(val, cur);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-5 h-5 text-blue-400" />;
      case 'cash':
        return <Banknote className="w-5 h-5 text-emerald-400" />;
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-purple-400" />;
      case 'credit_card':
        return <CreditCard className="w-5 h-5 text-amber-400" />;
      default:
        return <Wallet className="w-5 h-5 text-zinc-400" />;
    }
  };

  const recentTransactions = transactions.slice(0, 5);

  // Prepare chart points
  const chartPoints = React.useMemo(() => {
    if (netWorthHistory && netWorthHistory.length > 0) {
      return netWorthHistory.map((h) => ({
        date: h.snapshot_date,
        net_worth: h.net_worth,
      }));
    }
    // Fallback if no snapshots yet: show current
    return [
      {
        date: new Date().toISOString().slice(0, 10),
        net_worth: netWorthSummary?.net_worth ?? 0,
      },
    ];
  }, [netWorthHistory, netWorthSummary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className={`text-2xl font-bold tracking-tight ${theme === 'light' ? 'text-black' : 'text-white'}`}>Financial Dashboard</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-400 border border-purple-500/30">
              v0.1.5
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time balance derived via audit-ready SQLite ledger
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            title={isPrivacyMode ? "Show Balances" : "Hide Balances for Privacy"}
            onClick={togglePrivacyMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              isPrivacyMode
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                : theme === 'light'
                ? 'bg-white hover:bg-zinc-100 text-black border-zinc-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700'
            }`}
          >
            {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-purple-400" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPrivacyMode ? 'Masked' : 'Privacy'}</span>
          </button>
          <button
            type="button"
            title="Snapshot Net Worth Now"
            onClick={() => recordNetWorthSnapshot()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-white hover:bg-zinc-100 text-black border-zinc-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Snapshot Now</span>
          </button>
          <button
            type="button"
            onClick={() => setIsTxnModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Headline: Big Net Worth + Historical Trend Line Card (Task 7) */}
      <div className={`p-6 rounded-2xl border relative overflow-hidden ${
        theme === 'light'
          ? 'bg-white border-zinc-200 shadow-sm'
          : 'bg-black border-zinc-800'
      }`}>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-1 space-y-3">
            <div className={`flex items-center gap-2 text-xs font-black tracking-wide uppercase ${
              theme === 'light' ? 'text-purple-700' : 'text-purple-400'
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span>Total Net Worth ({baseCurrency})</span>
            </div>

            <div className={`text-3xl sm:text-5xl font-black tracking-tight ${
              theme === 'light' ? 'text-black' : 'text-white'
            }`}>
              {formatCurrency(netWorthSummary?.net_worth ?? 0)}
            </div>

            <p className={`text-xs leading-relaxed ${
              theme === 'light' ? 'text-slate-600' : 'text-zinc-400'
            }`}>
              Consolidated net worth across all bank & cash accounts, investment holdings, minus outstanding liabilities.
            </p>

            <div className="flex items-center gap-4 pt-1 text-xs">
              <div>
                <span className={`block text-[11px] font-medium ${
                  theme === 'light' ? 'text-slate-500' : 'text-zinc-400'
                }`}>Total Assets</span>
                <span className={`font-black font-mono ${
                  theme === 'light' ? 'text-black' : 'text-white'
                }`}>
                  {formatCurrency(
                    (netWorthSummary?.total_accounts ?? 0) +
                      (netWorthSummary?.total_investments ?? 0)
                  )}
                </span>
              </div>
              <div className={`h-6 w-px ${theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
              <div>
                <span className={`block text-[11px] font-medium ${
                  theme === 'light' ? 'text-slate-500' : 'text-zinc-400'
                }`}>Total Debts</span>
                <span className="text-red-600 dark:text-red-400 font-black font-mono">
                  -{formatCurrency(netWorthSummary?.total_debts ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Trend Line Chart */}
          <div className={`lg:col-span-2 h-44 w-full rounded-xl p-2 border flex flex-col justify-between ${
            theme === 'light' ? 'bg-white/80 border-purple-200' : 'bg-black/60 border-purple-900/40'
          }`}>
            <div className="flex items-center justify-between px-2 pt-1 text-[11px]">
              <span className={`flex items-center gap-1.5 font-bold ${
                theme === 'light' ? 'text-purple-700' : 'text-purple-400'
              }`}>
                <ChartIcon className="w-3.5 h-3.5" />
                Net Worth Trend ({chartPoints.length} day{chartPoints.length === 1 ? '' : 's'})
              </span>
              <span className={`text-[10px] ${
                theme === 'light' ? 'text-slate-500' : 'text-zinc-400'
              }`}>Daily Snapshots</span>
            </div>

            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartPoints}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="networthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke={theme === 'light' ? '#64748b' : '#a1a1aa'}
                    fontSize={10}
                    fontWeight={700}
                    tickLine={false}
                    tickFormatter={(val) => formatIndianDate(val)}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme === 'light' ? '#ffffff' : '#18181b',
                      borderColor: theme === 'light' ? '#cbd5e1' : '#3f3f46',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: theme === 'light' ? '#000000' : '#ffffff',
                      boxShadow: theme === 'light' ? '0 10px 25px -5px rgba(0,0,0,0.1)' : '0 10px 25px -5px rgba(0,0,0,0.6)',
                      fontWeight: 800,
                    }}
                    labelStyle={{
                      color: theme === 'light' ? '#000000' : '#ffffff',
                      fontWeight: 800,
                      marginBottom: '4px',
                    }}
                    itemStyle={{
                      color: '#7c3aed',
                      fontWeight: 800,
                    }}
                    labelFormatter={(val) => formatIndianDate(String(val))}
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Net Worth']}
                  />
                  <Area
                    type="monotone"
                    dataKey="net_worth"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#networthGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Task 7: This Month's Income vs Expense (Confirmed Transactions) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block">
              This Month Income
            </span>
            <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
              +{formatCurrency(monthSummary?.total_income || 0)}
            </span>
            <span className="text-[11px] text-zinc-500">Confirmed credits only</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Expense */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block">
              This Month Expense
            </span>
            <span className="text-2xl font-extrabold text-red-400 mt-1 block">
              -{formatCurrency(monthSummary?.total_expense || 0)}
            </span>
            <span className="text-[11px] text-zinc-500">Confirmed debits only</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5 text-red-400" />
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block">
              Net Cash Flow
            </span>
            <span
              className={`text-2xl font-extrabold mt-1 block ${
                (monthSummary?.net_cashflow || 0) >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}
            >
              {(monthSummary?.net_cashflow || 0) >= 0 ? '+' : ''}
              {formatCurrency(monthSummary?.net_cashflow || 0)}
            </span>
            <span className="text-[11px] text-zinc-500">
              {(monthSummary?.net_cashflow || 0) >= 0 ? 'Surplus this month' : 'Deficit this month'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Pending Transactions Alert */}
      {Boolean(monthSummary && monthSummary.pending_count > 0) && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-300">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You have <strong>{monthSummary?.pending_count} pending transaction(s)</strong> totaling{' '}
              {formatCurrency(monthSummary?.pending_expense_total || 0)}. These affect your balance but are excluded from confirmed monthly reports.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer ml-3 shrink-0"
          >
            Review
          </button>
        </div>
      )}

      {/* Account Type Stats Breakdown (Task 7) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('accounts')}
          className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs font-medium text-zinc-400">Bank Accounts</p>
            <p className="text-lg font-bold text-white mt-1">
              {formatCurrency(netWorthSummary?.total_bank || 0)}
            </p>
            <p className="text-[11px] text-zinc-500">
              {activeAccounts.filter((a) => a.type === 'bank').length} account(s)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('accounts')}
          className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs font-medium text-zinc-400">Cash Wallet</p>
            <p className="text-lg font-bold text-white mt-1">
              {formatCurrency(netWorthSummary?.total_cash || 0)}
            </p>
            <p className="text-[11px] text-zinc-500">
              {activeAccounts.filter((a) => a.type === 'cash').length} wallet(s)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('investments')}
          className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs font-medium text-zinc-400">Investments</p>
            <p className="text-lg font-bold text-white mt-1">
              {formatCurrency(netWorthSummary?.total_investments || 0)}
            </p>
            <p className="text-[11px] text-zinc-500">
              Holdings portfolio value
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('debts')}
          className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs font-medium text-zinc-400">Debts & Liabilities</p>
            <p className="text-lg font-bold text-rose-400 mt-1">
              {formatCurrency(netWorthSummary?.total_debts || 0)}
            </p>
            <p className="text-[11px] text-zinc-500">
              Total active debt
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Financial Health Cockpit & 30-Day Cashflow Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FinancialHealthWidget />
        <CashflowForecastWidget />
      </div>

      {/* Recent Transactions List */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className="text-xs text-emerald-400 hover:underline cursor-pointer"
          >
            View all transactions →
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-6 border border-dashed border-zinc-800 rounded-xl text-center">
            <p className="text-xs text-zinc-500">No recent transactions recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-850">
            {recentTransactions.map((txn) => {
              const isIncome = txn.type === 'income';
              const isTransfer = txn.type === 'transfer';
              return (
                <div
                  key={txn.id}
                  className="py-2.5 flex items-center justify-between hover:bg-zinc-850/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isTransfer
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : isTransfer ? (
                        <ArrowLeftRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        {isTransfer
                          ? `Transfer to ${txn.transfer_to_account_name || 'Account'}`
                          : txn.category_name || 'Uncategorized'}
                      </h4>
                      <p className="text-[10px] text-zinc-500">
                        {txn.account_name} • {formatIndianDate(txn.txn_date)}
                        {txn.note ? ` • ${txn.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`text-xs font-bold ${
                        isIncome
                          ? 'text-emerald-400'
                          : isTransfer
                          ? 'text-blue-400'
                          : 'text-red-400'
                      }`}
                    >
                      {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: txn.account_currency,
                        maximumFractionDigits: 2,
                      }).format(txn.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Accounts Grid */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Active Accounts</h3>
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className="text-xs text-emerald-400 hover:underline cursor-pointer"
          >
            Manage all
          </button>
        </div>

        {activeAccounts.length === 0 ? (
          <div className="p-8 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center">
            <Wallet className="w-10 h-10 text-zinc-600 mb-3" />
            <h4 className="text-sm font-semibold text-zinc-300">No active accounts yet</h4>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
              Add your bank accounts, cash wallets, or investment accounts to start tracking your finances.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAccounts.map((account) => (
              <div
                key={account.id}
                className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{
                        backgroundColor: account.color ? `${account.color}20` : '#27272a',
                        borderColor: account.color ? `${account.color}40` : '#3f3f46',
                      }}
                    >
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{account.name}</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800">
                        {account.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-850 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Current Balance</span>
                    <span className="text-base font-bold text-emerald-400">
                      {formatCurrency(account.current_balance, account.currency)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Open: {formatCurrency(account.opening_balance, account.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial Goals & Upcoming Bills (next 30 days) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Financial Goals Widget */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Target className="w-4 h-4 text-purple-400" />
                <span>Financial Goals</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('goals')}
                className="text-xs text-purple-400 hover:underline cursor-pointer"
              >
                View all ({goals.length}) →
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-zinc-500 mb-2">No financial goals created yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('goals')}
                  className="text-xs text-purple-400 hover:underline font-semibold cursor-pointer"
                >
                  Set a savings target →
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-3">
                {goals.slice(0, 3).map((g) => {
                  const isReached = g.is_reached === 1 || g.percentage >= 100;

                  return (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-white">
                          <span>{g.name}</span>
                          {isReached && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          {baseCurrency} {g.current_amount.toFixed(2)} / {g.target_amount.toFixed(2)} ({g.percentage.toFixed(0)}%)
                        </span>
                      </div>

                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(g.percentage, 100)}%`,
                            backgroundColor: g.color || '#9333ea',
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>
                          {isReached
                            ? '🎉 Milestone reached!'
                            : `${baseCurrency} ${g.remaining_amount.toFixed(2)} remaining`}
                        </span>
                        {g.target_date && <span>Target: {g.target_date}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Bills Widget (Next 30 days) */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Upcoming Bills (Next 30 Days)</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('bills')}
                className="text-xs text-amber-400 hover:underline cursor-pointer"
              >
                View all ({bills.filter((b) => b.is_paid === 0).length}) →
              </button>
            </div>

            {(() => {
              const now = new Date();
              const in30Days = new Date();
              in30Days.setDate(now.getDate() + 30);
              const in30DaysStr = in30Days.toISOString().split('T')[0];

              const upcoming30 = bills
                .filter((b) => b.is_paid === 0 && b.due_date <= in30DaysStr)
                .slice(0, 3);

              if (upcoming30.length === 0) {
                return (
                  <div className="py-8 text-center">
                    <p className="text-xs text-zinc-500 mb-2">No bills due in the next 30 days.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bills')}
                      className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                    >
                      Manage bills →
                    </button>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-zinc-850 pt-1">
                  {upcoming30.map((b) => {
                    const isOverdue = b.is_overdue;
                    return (
                      <div
                        key={b.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white truncate block">{b.name}</span>
                            {isOverdue && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white uppercase shrink-0">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            Due: <strong className={isOverdue ? 'text-rose-400' : 'text-zinc-400'}>{formatIndianDate(b.due_date)}</strong>
                            {b.account_name ? ` • ${b.account_name}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-white font-mono">
                            {formatCurrency(b.amount, baseCurrency)}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              setPayingBillId(b.id);
                              try {
                                await markBillPaid(b.id);
                              } catch (err: unknown) {
                                alert(err instanceof Error ? err.message : String(err));
                              } finally {
                                setPayingBillId(null);
                              }
                            }}
                            disabled={payingBillId === b.id}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                          >
                            Pay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxnModalOpen}
        onClose={() => setIsTxnModalOpen(false)}
      />
    </div>
  );
};
