import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  CategorySpendingReportItem,
  IncomeExpenseTrendItem,
  InvestmentPerformanceReport,
  ReportDateFilter,
} from '../types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Calendar,
  Filter,
  DollarSign,
  Briefcase,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatIndianDate, formatIndianCurrency } from '../lib/utils';

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48',
  '#84cc16', '#a855f7', '#64748b', '#eab308', '#0ea5e9',
];

type PresetFilter = 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'all_time' | 'custom';

export const ReportsPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const accounts = useAppStore(state => state.accounts);
  const netWorthHistory = useAppStore(state => state.netWorthHistory);
  const loadNetWorthHistory = useAppStore(state => state.loadNetWorthHistory);
  const recordNetWorthSnapshot = useAppStore(state => state.recordNetWorthSnapshot);
  const fetchCategorySpendingReport = useAppStore(state => state.fetchCategorySpendingReport);
  const fetchIncomeExpenseTrend = useAppStore(state => state.fetchIncomeExpenseTrend);
  const fetchInvestmentPerformanceReport = useAppStore(state => state.fetchInvestmentPerformanceReport);

  const [activeTab, setActiveTab] = useState<'spending' | 'income_expense' | 'net_worth' | 'investments'>('spending');
  const [preset, setPreset] = useState<PresetFilter>('this_month');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data states
  const [spendingData, setSpendingData] = useState<CategorySpendingReportItem[]>([]);
  const [trendData, setTrendData] = useState<IncomeExpenseTrendItem[]>([]);
  const [invReport, setInvReport] = useState<InvestmentPerformanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  const baseCurr = settings?.base_currency || 'INR';

  // Compute start/end dates from preset
  const computedFilter = useMemo((): ReportDateFilter => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let start_date: string | null = null;
    let end_date: string | null = null;

    if (preset === 'this_month') {
      start_date = formatDate(new Date(y, m, 1));
      end_date = formatDate(new Date(y, m + 1, 0));
    } else if (preset === 'last_month') {
      start_date = formatDate(new Date(y, m - 1, 1));
      end_date = formatDate(new Date(y, m, 0));
    } else if (preset === 'last_30_days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      start_date = formatDate(past);
      end_date = formatDate(now);
    } else if (preset === 'last_90_days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 90);
      start_date = formatDate(past);
      end_date = formatDate(now);
    } else if (preset === 'this_year') {
      start_date = `${y}-01-01`;
      end_date = `${y}-12-31`;
    } else if (preset === 'custom') {
      start_date = customStartDate || null;
      end_date = customEndDate || null;
    }

    return {
      start_date,
      end_date,
      account_id: selectedAccountId !== 'all' ? parseInt(selectedAccountId, 10) : null,
    };
  }, [preset, customStartDate, customEndDate, selectedAccountId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'spending') {
        const data = await fetchCategorySpendingReport(computedFilter);
        setSpendingData(data);
      } else if (activeTab === 'income_expense') {
        const data = await fetchIncomeExpenseTrend(computedFilter);
        setTrendData(data);
      } else if (activeTab === 'net_worth') {
        await loadNetWorthHistory(preset === 'last_30_days' ? 30 : preset === 'last_90_days' ? 90 : 365);
      } else if (activeTab === 'investments') {
        const data = await fetchInvestmentPerformanceReport();
        setInvReport(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, computedFilter, preset, fetchCategorySpendingReport, fetchIncomeExpenseTrend, loadNetWorthHistory, fetchInvestmentPerformanceReport]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CSV Export Helper
  const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const escaped = String(cell).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportSpendingCsv = () => {
    const headers = ['Category', 'Kind', `Total Spent (${baseCurr})`, 'Percentage (%)', 'Transaction Count'];
    const rows = spendingData.map((item) => [
      item.category_name,
      item.kind,
      item.total_spent.toFixed(2),
      item.percentage.toFixed(2),
      item.transaction_count,
    ]);
    downloadCsv(`spending_report_${preset}_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const exportTrendCsv = () => {
    const headers = ['Period', `Total Income (${baseCurr})`, `Total Expense (${baseCurr})`, `Net Cashflow (${baseCurr})`];
    const rows = trendData.map((item) => [
      item.period_label,
      item.total_income.toFixed(2),
      item.total_expense.toFixed(2),
      item.net_cashflow.toFixed(2),
    ]);
    downloadCsv(`income_expense_trend_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const exportNetWorthCsv = () => {
    const headers = ['Date', `Total Accounts (${baseCurr})`, `Total Investments (${baseCurr})`, `Total Debts (${baseCurr})`, `Net Worth (${baseCurr})`];
    const rows = netWorthHistory.map((item) => [
      item.snapshot_date,
      item.total_accounts.toFixed(2),
      item.total_investments.toFixed(2),
      item.total_debts.toFixed(2),
      item.net_worth.toFixed(2),
    ]);
    downloadCsv(`net_worth_history_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const exportInvestmentsCsv = () => {
    if (!invReport) return;
    const headers = [
      'Symbol',
      'Name',
      'Asset Type',
      'Account',
      'Quantity',
      'Avg Buy Price',
      'Last Price',
      'Currency',
      `Cost Basis (${baseCurr})`,
      `Current Value (${baseCurr})`,
      `Unrealized P&L (${baseCurr})`,
      'Return (%)',
    ];
    const rows = invReport.holdings.map((h) => [
      h.symbol,
      h.name || '',
      h.asset_type,
      h.account_name,
      h.quantity,
      h.avg_buy_price.toFixed(2),
      h.last_price.toFixed(2),
      h.currency,
      h.cost_basis_base.toFixed(2),
      h.current_value_base.toFixed(2),
      h.unrealized_pnl_base.toFixed(2),
      h.pnl_percent.toFixed(2),
    ]);
    downloadCsv(`investment_performance_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const handleSnapshotNow = async () => {
    setIsSnapshotting(true);
    try {
      await recordNetWorthSnapshot();
      await loadNetWorthHistory();
    } catch (err: unknown) {
      console.error('Failed to take snapshot:', err);
    } finally {
      setIsSnapshotting(false);
    }
  };

  // Spending aggregates
  const totalSpendingSum = useMemo(() => {
    return spendingData.reduce((sum, item) => sum + item.total_spent, 0);
  }, [spendingData]);

  // Net Cashflow aggregates
  const trendSummary = useMemo(() => {
    const inc = trendData.reduce((sum, d) => sum + d.total_income, 0);
    const exp = trendData.reduce((sum, d) => sum + d.total_expense, 0);
    const net = inc - exp;
    const savingsRate = inc > 0 ? (net / inc) * 100 : 0;
    return { inc, exp, net, savingsRate };
  }, [trendData]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Financial Reports & Analytics
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Offline category spending, income vs expense trends, net worth history, and portfolio returns
          </p>
        </div>

        {/* Global Export Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'spending' && spendingData.length > 0 && (
            <button
              type="button"
              onClick={exportSpendingCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Export Spending CSV
            </button>
          )}

          {activeTab === 'income_expense' && trendData.length > 0 && (
            <button
              type="button"
              onClick={exportTrendCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Export Trend CSV
            </button>
          )}

          {activeTab === 'net_worth' && netWorthHistory.length > 0 && (
            <button
              type="button"
              onClick={exportNetWorthCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Export Net Worth CSV
            </button>
          )}

          {activeTab === 'investments' && invReport && (
            <button
              type="button"
              onClick={exportInvestmentsCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Export Performance CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('spending')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'spending'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          Spending by Category
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('income_expense')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'income_expense'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Income vs Expense Trend
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('net_worth')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'net_worth'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Net Worth Trend
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('investments')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'investments'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Investment Performance
        </button>
      </div>

      {/* Filter Bar (Only for tabs that support date filtering) */}
      {activeTab !== 'investments' && (
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Range:
            </span>
            {(
              [
                ['this_month', 'This Month'],
                ['last_month', 'Last Month'],
                ['last_30_days', 'Last 30 Days'],
                ['last_90_days', 'Last 90 Days'],
                ['this_year', 'This Year'],
                ['all_time', 'All Time'],
                ['custom', 'Custom'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setPreset(val)}
                className={`px-3 py-1 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  preset === val
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-950/50'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Account selector & Custom dates */}
          <div className="flex flex-wrap items-center gap-3">
            {activeTab !== 'net_worth' && (
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className=" font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    (e.target as HTMLInputElement).blur();
                  }}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500 font-mono"
                />
                <span className="text-zinc-500 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    (e.target as HTMLInputElement).blur();
                  }}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Spending by Category */}
      {activeTab === 'spending' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 block font-medium">Total Spending</span>
              <span className="text-xl font-extrabold text-white font-mono mt-1 block">
                {formatIndianCurrency(totalSpendingSum, baseCurr)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 block font-medium">Categories Active</span>
              <span className="text-xl font-extrabold text-purple-400 font-mono mt-1 block">
                {spendingData.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 block font-medium">Top Spending Category</span>
              <span className="text-base font-bold text-white mt-1 block truncate">
                {spendingData.length > 0
                  ? `${spendingData[0].category_name} (${spendingData[0].percentage.toFixed(1)}%)`
                  : '—'}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 flex items-center justify-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
              Calculating category spending...
            </div>
          ) : spendingData.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-zinc-400">
              <PieChartIcon className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-white">No Expense Transactions Found</p>
              <p className="text-xs text-zinc-500 mt-1">
                There are no confirmed expenses recorded for the selected date range and account.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Donut Chart */}
              <div className="lg:col-span-6 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col items-center">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 self-start">
                  Spending Distribution
                </h3>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingData}
                        dataKey="total_spent"
                        nameKey="category_name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {spendingData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(value: unknown) => [
                          `${baseCurr} ${Number(value).toFixed(2)}`,
                          'Spent',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart Breakdown */}
              <div className="lg:col-span-6 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
                  Top Categories (Ranked)
                </h3>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={spendingData.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <XAxis type="number" stroke="#71717a" fontSize={10} tickFormatter={(v) => `${v}`} />
                      <YAxis type="category" dataKey="category_name" stroke="#71717a" fontSize={10} width={80} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(value: unknown) => [formatIndianCurrency(Number(value), baseCurr), 'Spent']}
                      />
                      <Bar dataKey="total_spent" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table Breakdown */}
              <div className="lg:col-span-12 rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase">
                    <tr>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Txns</th>
                      <th className="py-3 px-4 text-right">Total Spent ({baseCurr})</th>
                      <th className="py-3 px-4 text-right">% of Total</th>
                      <th className="py-3 px-4">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {spendingData.map((item, idx) => (
                      <tr key={item.category_id || idx} className="hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          {item.category_name}
                        </td>
                        <td className="py-3 px-4 text-center text-zinc-400 font-mono">
                          {item.transaction_count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                          {formatIndianCurrency(item.total_spent, baseCurr)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          {item.percentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 w-40">
                          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.min(item.percentage, 100)}%`,
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Income vs Expense Trend */}
      {activeTab === 'income_expense' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 block font-medium">Total Income</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono mt-1 block flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                {formatIndianCurrency(trendSummary.inc, baseCurr)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 block font-medium">Total Expenses</span>
              <span className="text-lg font-extrabold text-rose-400 font-mono mt-1 block flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" />
                {formatIndianCurrency(trendSummary.exp, baseCurr)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 block font-medium">Net Cashflow</span>
              <span
                className={`text-lg font-extrabold font-mono mt-1 block ${
                  trendSummary.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trendSummary.net >= 0 ? '+' : ''}
                {formatIndianCurrency(trendSummary.net, baseCurr)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 block font-medium">Savings Rate</span>
              <span
                className={`text-lg font-extrabold font-mono mt-1 block ${
                  trendSummary.savingsRate >= 20 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {trendSummary.savingsRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 flex items-center justify-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
              Calculating trend metrics...
            </div>
          ) : trendData.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-zinc-400">
              <BarChart3 className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-white">No Transactions Recorded</p>
              <p className="text-xs text-zinc-500 mt-1">
                Add income and expense transactions to view cashflow trends over time.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped Bar Chart */}
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
                  Income vs Expense by Month
                </h3>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="period_label" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: unknown) => [`${baseCurr} ${Number(val).toFixed(2)}`]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="total_income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase">
                    <tr>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4 text-right text-emerald-400">Income ({baseCurr})</th>
                      <th className="py-3 px-4 text-right text-rose-400">Expense ({baseCurr})</th>
                      <th className="py-3 px-4 text-right">Net Cashflow ({baseCurr})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {trendData.map((row) => (
                      <tr key={row.period_label} className="hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-semibold text-white font-mono">{row.period_label}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">
                          +{formatIndianCurrency(row.total_income, baseCurr)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-400">
                          -{formatIndianCurrency(row.total_expense, baseCurr)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            row.net_cashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {row.net_cashflow >= 0 ? '+' : ''}
                          {formatIndianCurrency(row.net_cashflow, baseCurr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Net Worth Trend */}
      {activeTab === 'net_worth' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Net Worth History Over Time
            </h3>
            <button
              type="button"
              disabled={isSnapshotting}
              onClick={handleSnapshotNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              {isSnapshotting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <DollarSign className="w-3.5 h-3.5" />
              )}
              Take Snapshot Today
            </button>
          </div>

          {netWorthHistory.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-zinc-400">
              <DollarSign className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-white">No Historical Snapshots Available</p>
              <p className="text-xs text-zinc-500 mt-1 mb-4">
                Click "Take Snapshot Today" to record your initial net worth point.
              </p>
              <button
                type="button"
                onClick={handleSnapshotNow}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
              >
                Record Initial Snapshot
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Area Chart */}
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={netWorthHistory} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="snapshot_date" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: unknown) => [`${baseCurr} ${Number(val).toFixed(2)}`]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="net_worth"
                        name="Net Worth"
                        stroke="#a855f7"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#nwGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Snapshots Table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Accounts ({baseCurr})</th>
                      <th className="py-3 px-4 text-right">Investments ({baseCurr})</th>
                      <th className="py-3 px-4 text-right">Debts ({baseCurr})</th>
                      <th className="py-3 px-4 text-right font-bold text-white">Net Worth ({baseCurr})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {netWorthHistory.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-mono text-zinc-300 font-semibold">{formatIndianDate(s.snapshot_date)}</td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          {formatIndianCurrency(s.total_accounts, baseCurr)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">
                          {formatIndianCurrency(s.total_investments, baseCurr)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-400">
                          {formatIndianCurrency(s.total_debts, baseCurr)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          {formatIndianCurrency(s.net_worth, baseCurr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Investment Performance */}
      {activeTab === 'investments' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 flex items-center justify-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
              Calculating portfolio performance...
            </div>
          ) : !invReport || invReport.holdings.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-zinc-400">
              <Briefcase className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-white">No Investment Holdings Found</p>
              <p className="text-xs text-zinc-500 mt-1">
                Add stock or crypto holdings to view portfolio performance and profit/loss metrics.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Portfolio Performance Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-xs text-zinc-400 block font-medium">Total Cost Basis</span>
                  <span className="text-lg font-extrabold text-white font-mono mt-1 block">
                    {baseCurr} {invReport.total_cost_basis.toFixed(2)}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-xs text-zinc-400 block font-medium">Current Market Value</span>
                  <span className="text-lg font-extrabold text-white font-mono mt-1 block">
                    {baseCurr} {invReport.total_current_value.toFixed(2)}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-xs text-zinc-400 block font-medium">Unrealized P&L</span>
                  <span
                    className={`text-lg font-extrabold font-mono mt-1 block flex items-center gap-1 ${
                      invReport.total_unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {invReport.total_unrealized_pnl >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {invReport.total_unrealized_pnl >= 0 ? '+' : ''}
                    {baseCurr} {invReport.total_unrealized_pnl.toFixed(2)}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-xs text-zinc-400 block font-medium">Overall Return %</span>
                  <span
                    className={`text-lg font-extrabold font-mono mt-1 block ${
                      invReport.total_pnl_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {invReport.total_pnl_percent >= 0 ? '+' : ''}
                    {invReport.total_pnl_percent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Holdings Table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase">
                    <tr>
                      <th className="py-3 px-4">Holding</th>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Avg Buy</th>
                      <th className="py-3 px-4 text-right">Last Price</th>
                      <th className="py-3 px-4 text-right">Cost Basis ({baseCurr})</th>
                      <th className="py-3 px-4 text-right">Current Value ({baseCurr})</th>
                      <th className="py-3 px-4 text-right">Unrealized P&L</th>
                      <th className="py-3 px-4 text-right">Return %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {invReport.holdings.map((h) => (
                      <tr key={h.id} className="hover:bg-zinc-800/20">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white font-mono block">{h.symbol}</span>
                          <span className="text-[11px] text-zinc-500 uppercase">{h.asset_type}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{h.account_name}</td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-200">{h.quantity}</td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          {h.avg_buy_price.toFixed(2)} {h.currency}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          {h.last_price.toFixed(2)} {h.currency}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          {h.cost_basis_base.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                          {h.current_value_base.toFixed(2)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            h.unrealized_pnl_base >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {h.unrealized_pnl_base >= 0 ? '+' : ''}
                          {h.unrealized_pnl_base.toFixed(2)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            h.pnl_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {h.pnl_percent >= 0 ? '+' : ''}
                          {h.pnl_percent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
