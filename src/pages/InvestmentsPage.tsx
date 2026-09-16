import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  LineChart as ChartIcon,
  Search,
  Check,
  X,
  Clock,
  Layers,
  PieChart as PieIcon,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { formatIndianDateTime, formatIndianCurrency } from '../lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  AssetType,
  CreateHoldingPayload,
  InvestmentHolding,
  PriceHistoryPoint,
  SinglePriceUpdatePayload,
  UpdateHoldingPayload,
} from '../types';

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  stock: '#3b82f6', // blue
  crypto: '#f59e0b', // amber
  mutual_fund: '#10b981', // emerald
  other: '#8b5cf6', // purple
};

const PALETTE = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
];

export const InvestmentsPage: React.FC = () => {
  const holdings = useAppStore(state => state.holdings);
  const portfolioSummary = useAppStore(state => state.portfolioSummary);
  const accounts = useAppStore(state => state.accounts);
  const settings = useAppStore(state => state.settings);
  const theme = useAppStore(state => state.theme);
  const loadHoldings = useAppStore(state => state.loadHoldings);
  const loadPortfolioSummary = useAppStore(state => state.loadPortfolioSummary);
  const loadAccounts = useAppStore(state => state.loadAccounts);
  const createHolding = useAppStore(state => state.createHolding);
  const updateHolding = useAppStore(state => state.updateHolding);
  const archiveHolding = useAppStore(state => state.archiveHolding);
  const deleteHolding = useAppStore(state => state.deleteHolding);
  const updateHoldingPrice = useAppStore(state => state.updateHoldingPrice);
  const bulkUpdateHoldingPrices = useAppStore(state => state.bulkUpdateHoldingPrices);
  const fetchHoldingPriceHistory = useAppStore(state => state.fetchHoldingPriceHistory);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const baseCurrency = settings?.base_currency || 'INR';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<InvestmentHolding | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [historyHolding, setHistoryHolding] = useState<InvestmentHolding | null>(null);
  const [historyData, setHistoryData] = useState<PriceHistoryPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Inline price update state
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>('');
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Chart view toggle
  const [chartMode, setChartMode] = useState<'asset_type' | 'holding'>('asset_type');

  // Form states
  const [formData, setFormData] = useState<CreateHoldingPayload>({
    account_id: 0,
    asset_type: 'stock',
    symbol: '',
    name: '',
    quantity: 1,
    avg_buy_price: 0,
    currency: baseCurrency,
    last_price: 0,
    notes: '',
  });

  const [editFormData, setEditFormData] = useState<UpdateHoldingPayload>({
    asset_type: 'stock',
    symbol: '',
    name: '',
    quantity: 1,
    avg_buy_price: 0,
    currency: baseCurrency,
    notes: '',
  });

  // Bulk prices state
  const [bulkPrices, setBulkPrices] = useState<Record<number, string>>({});
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadHoldings();
    loadPortfolioSummary();
    loadAccounts(false);
  }, [loadHoldings, loadPortfolioSummary, loadAccounts]);

  const investmentAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === 'investment' && a.is_archived === 0);
  }, [accounts]);

  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      if (!showArchived && h.is_archived === 1) return false;
      if (selectedAssetType !== 'all' && h.asset_type !== selectedAssetType) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchSym = h.symbol.toLowerCase().includes(term);
        const matchName = h.name ? h.name.toLowerCase().includes(term) : false;
        return matchSym || matchName;
      }
      return true;
    });
  }, [holdings, showArchived, selectedAssetType, searchTerm]);

  // Data for Allocation Pie Chart
  const assetTypeAllocationData = useMemo(() => {
    const activeHoldings = holdings.filter((h) => h.is_archived === 0);
    const totals: Record<string, number> = {};
    let totalBase = 0;

    for (const h of activeHoldings) {
      totals[h.asset_type] = (totals[h.asset_type] || 0) + h.base_current_value;
      totalBase += h.base_current_value;
    }

    if (totalBase <= 0) return [];

    return Object.entries(totals).map(([type, val]) => ({
      name: type.replace('_', ' ').toUpperCase(),
      value: Math.round(val * 100) / 100,
      percentage: Math.round((val / totalBase) * 10000) / 100,
      color: ASSET_TYPE_COLORS[type as AssetType] || '#8b5cf6',
    }));
  }, [holdings]);

  const holdingAllocationData = useMemo(() => {
    const activeHoldings = holdings.filter((h) => h.is_archived === 0);
    const totalBase = activeHoldings.reduce((acc, h) => acc + h.base_current_value, 0);
    if (totalBase <= 0) return [];

    return activeHoldings.map((h, i) => ({
      name: h.symbol,
      value: Math.round(h.base_current_value * 100) / 100,
      percentage: Math.round((h.base_current_value / totalBase) * 10000) / 100,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [holdings]);

  const formatCurrency = (val: number, cur = baseCurrency) => {
    return formatIndianCurrency(val, cur);
  };

  const openAddModal = () => {
    const defaultAccId = investmentAccounts[0]?.id || 0;
    const defaultCurrency = investmentAccounts[0]?.currency || baseCurrency;
    setFormData({
      account_id: defaultAccId,
      asset_type: 'stock',
      symbol: '',
      name: '',
      quantity: 1,
      avg_buy_price: 0,
      currency: defaultCurrency,
      last_price: 0,
      notes: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.account_id === 0) {
      setFormError('Please select an investment account');
      return;
    }
    if (!formData.symbol.trim()) {
      setFormError('Symbol is required (e.g. BTC, RELIANCE)');
      return;
    }
    if (formData.quantity <= 0) {
      setFormError('Quantity must be greater than zero');
      return;
    }
    if (formData.avg_buy_price < 0 || formData.last_price < 0) {
      setFormError('Prices cannot be negative');
      return;
    }

    try {
      await createHolding({
        ...formData,
        symbol: formData.symbol.trim().toUpperCase(),
        name: formData.name?.trim() || null,
        notes: formData.notes?.trim() || null,
      });
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const openEditModal = (h: InvestmentHolding) => {
    setEditingHolding(h);
    setEditFormData({
      asset_type: h.asset_type,
      symbol: h.symbol,
      name: h.name || '',
      quantity: h.quantity,
      avg_buy_price: h.avg_buy_price,
      currency: h.currency,
      notes: h.notes || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHolding) return;
    setFormError(null);

    if (!editFormData.symbol.trim()) {
      setFormError('Symbol is required');
      return;
    }
    if (editFormData.quantity <= 0) {
      setFormError('Quantity must be greater than zero');
      return;
    }
    if (editFormData.avg_buy_price < 0) {
      setFormError('Average buy price cannot be negative');
      return;
    }

    try {
      await updateHolding(editingHolding.id, {
        ...editFormData,
        symbol: editFormData.symbol.trim().toUpperCase(),
        name: editFormData.name?.trim() || null,
        notes: editFormData.notes?.trim() || null,
      });
      setIsEditModalOpen(false);
      setEditingHolding(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleInlineSave = async (holding: InvestmentHolding) => {
    const val = parseFloat(inlinePriceInput);
    if (isNaN(val) || val < 0) {
      setInlineEditingId(null);
      return;
    }
    setIsSavingInline(true);
    try {
      await updateHoldingPrice({
        holding_id: holding.id,
        price: val,
      });
      setInlineEditingId(null);
    } catch {
      // ignore
    } finally {
      setIsSavingInline(false);
    }
  };

  const openBulkUpdateModal = () => {
    const prices: Record<number, string> = {};
    holdings
      .filter((h) => h.is_archived === 0)
      .forEach((h) => {
        prices[h.id] = String(h.last_price);
      });
    setBulkPrices(prices);
    setIsBulkModalOpen(true);
  };

  const handleSaveBulkPrices = async () => {
    setIsSubmittingBulk(true);
    try {
      const updates: SinglePriceUpdatePayload[] = Object.entries(bulkPrices)
        .map(([idStr, valStr]) => ({
          holding_id: Number(idStr),
          price: parseFloat(valStr),
        }))
        .filter((u) => !isNaN(u.price) && u.price >= 0);

      if (updates.length > 0) {
        await bulkUpdateHoldingPrices(updates);
      }
      setIsBulkModalOpen(false);
    } catch {
      // ignore
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const openHistoryModal = async (holding: InvestmentHolding) => {
    setHistoryHolding(holding);
    setIsLoadingHistory(true);
    try {
      const data = await fetchHoldingPriceHistory(holding.id);
      setHistoryData(data);
    } catch {
      setHistoryData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const formatStaleBadge = (days: number) => {
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Check className="w-2.5 h-2.5" /> Updated today
        </span>
      );
    }
    if (days === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
          <Clock className="w-2.5 h-2.5" /> Yesterday
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <Clock className="w-2.5 h-2.5" /> {days} days ago
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
        <AlertCircle className="w-2.5 h-2.5 text-rose-400" /> Stale ({days}d ago)
      </span>
    );
  };

  const isOverallProfit = (portfolioSummary?.total_unrealized_pnl_base || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-2.5 ${
            theme === 'light' ? 'text-zinc-950' : 'text-white'
          }`}>
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            Investments & Holdings
          </h2>
          <p className={`text-xs mt-1 ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Track stocks & crypto with manual price updates and offline P&L calculations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openBulkUpdateModal}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              theme === 'light' ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Bulk Update Prices
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Holding
          </button>
        </div>
      </div>

      {/* No Investment Account Warning */}
      {investmentAccounts.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>
              You do not have any <strong>Investment-type accounts</strong> created yet. Holdings must be linked to an investment account (e.g. "Zerodha", "Binance").
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-colors cursor-pointer shrink-0 ml-4"
          >
            Create Account
          </button>
        </div>
      )}

      {/* Portfolio Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Portfolio Value */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>Total Portfolio Value</span>
          <div className="mt-2">
            <span className={`text-2xl sm:text-3xl font-extrabold block ${
              theme === 'light' ? 'text-zinc-950' : 'text-white'
            }`}>
              {formatCurrency(portfolioSummary?.total_current_value_base || 0)}
            </span>
            <span className={`text-[11px] ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-500'}`}>Converted to {baseCurrency}</span>
          </div>
        </div>

        {/* Total Invested */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>Total Invested</span>
          <div className="mt-2">
            <span className={`text-2xl sm:text-3xl font-extrabold block ${
              theme === 'light' ? 'text-zinc-950' : 'text-zinc-200'
            }`}>
              {formatCurrency(portfolioSummary?.total_invested_base || 0)}
            </span>
            <span className={`text-[11px] ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-500'}`}>Total cost basis</span>
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>Unrealized P&L</span>
          <div className="mt-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold block ${
                isOverallProfit ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {isOverallProfit ? '+' : ''}
              {formatCurrency(portfolioSummary?.total_unrealized_pnl_base || 0)}
            </span>
            <span
              className={`text-xs font-semibold ${
                isOverallProfit ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isOverallProfit ? '▲ +' : '▼ '}
              {portfolioSummary?.total_unrealized_pnl_percent?.toFixed(2) || '0.00'}%
            </span>
          </div>
        </div>

        {/* Active Holdings Count */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>Active Holdings</span>
          <div className="mt-2">
            <span className={`text-2xl sm:text-3xl font-extrabold block ${
              theme === 'light' ? 'text-zinc-950' : 'text-white'
            }`}>
              {portfolioSummary?.holdings_count || 0}
            </span>
            <span className={`text-[11px] ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-500'}`}>Stocks, Crypto, Funds</span>
          </div>
        </div>
      </div>

      {/* Portfolio Allocation Charts */}
      {holdings.some((h) => h.is_archived === 0) && (
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Portfolio Allocation</h3>
            </div>

            <div className="flex items-center rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setChartMode('asset_type')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  chartMode === 'asset_type'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                By Asset Type
              </button>
              <button
                type="button"
                onClick={() => setChartMode('holding')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  chartMode === 'holding'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                By Individual Holding
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      chartMode === 'asset_type'
                        ? assetTypeAllocationData
                        : holdingAllocationData
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {(chartMode === 'asset_type'
                      ? assetTypeAllocationData
                      : holdingAllocationData
                    ).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#18181b" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${formatCurrency(Number(value))} (${item.payload.percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend / Breakdown List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {(chartMode === 'asset_type' ? assetTypeAllocationData : holdingAllocationData).map(
                (item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-zinc-200">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-white block">
                        {formatCurrency(item.value)}
                      </span>
                      <span className="text-[11px] text-zinc-400">{item.percentage}%</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search by symbol or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Asset Type filter pills */}
          <div className="flex items-center rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs">
            {['all', 'stock', 'crypto', 'mutual_fund', 'other'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedAssetType(type)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors cursor-pointer ${
                  selectedAssetType === type
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {type === 'mutual_fund' ? 'Mutual Funds' : type}
              </button>
            ))}
          </div>

          {/* Show archived toggle */}
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0"
            />
            <span>Archived</span>
          </label>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/70 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">Asset / Symbol</th>
                <th className="py-3.5 px-4">Account</th>
                <th className="py-3.5 px-4 text-right">Quantity</th>
                <th className="py-3.5 px-4 text-right">Avg Buy Price</th>
                <th className="py-3.5 px-4 text-right">Last Price (Manual)</th>
                <th className="py-3.5 px-4 text-right">Current Value</th>
                <th className="py-3.5 px-4 text-right">Unrealized P&L</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredHoldings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <Layers className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                    No investment holdings found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredHoldings.map((h) => {
                  const isProfit = h.unrealized_pnl >= 0;
                  const isInline = inlineEditingId === h.id;

                  return (
                    <tr
                      key={h.id}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        h.is_archived ? 'opacity-60 bg-zinc-950/40' : ''
                      }`}
                    >
                      {/* Symbol & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                ASSET_TYPE_COLORS[h.asset_type] || '#8b5cf6',
                            }}
                          />
                          <div>
                            <span className="font-bold text-white block text-sm">
                              {h.symbol}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {h.name && (
                                <span className="text-[11px] text-zinc-400">{h.name}</span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 capitalize">
                                {h.asset_type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-zinc-300">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                          {h.account_name}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-zinc-200">
                        {h.quantity}
                      </td>

                      {/* Avg Buy Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                        {formatCurrency(h.avg_buy_price, h.currency)}
                      </td>

                      {/* Last Price + Inline Edit */}
                      <td className="py-3.5 px-4 text-right">
                        {isInline ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              step="any"
                              value={inlinePriceInput}
                              onChange={(e) => setInlinePriceInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(h);
                                if (e.key === 'Escape') setInlineEditingId(null);
                              }}
                              autoFocus
                              className="w-24 bg-zinc-950 border border-emerald-500 rounded px-2 py-1 text-right text-xs text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={isSavingInline}
                              onClick={() => handleInlineSave(h)}
                              className="p-1 rounded bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineEditingId(null)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white">
                                {formatCurrency(h.last_price, h.currency)}
                              </span>
                              <button
                                type="button"
                                title="Quick update price"
                                onClick={() => {
                                  setInlineEditingId(h.id);
                                  setInlinePriceInput(String(h.last_price));
                                }}
                                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 cursor-pointer transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="mt-1">{formatStaleBadge(h.days_since_update)}</div>
                          </div>
                        )}
                      </td>

                      {/* Current Value */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-white block">
                          {formatCurrency(h.current_value, h.currency)}
                        </span>
                        {h.currency !== baseCurrency && (
                          <span className="text-[10px] text-zinc-500">
                            ≈ {formatCurrency(h.base_current_value, baseCurrency)}
                          </span>
                        )}
                      </td>

                      {/* Unrealized P&L */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span
                          className={`font-bold block ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {formatCurrency(h.unrealized_pnl, h.currency)}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '▲ +' : '▼ '}
                          {h.unrealized_pnl_percent.toFixed(2)}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Price history chart"
                            onClick={() => openHistoryModal(h)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 cursor-pointer transition-colors"
                          >
                            <ChartIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit holding details"
                            onClick={() => openEditModal(h)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={h.is_archived ? 'Unarchive holding' : 'Archive holding'}
                            onClick={() => archiveHolding(h.id, h.is_archived === 0)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 cursor-pointer transition-colors"
                          >
                            {h.is_archived ? (
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Delete holding"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete ${h.symbol}? All logged price history will also be deleted.`
                                )
                              ) {
                                deleteHolding(h.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Holding Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                Add Investment Holding
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="add-holding-form"
              onSubmit={handleCreateHolding}
              className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              {/* Invisible submit button for Enter key form submission */}
              <button type="submit" className="hidden" aria-hidden="true" />
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Investment Account Picker */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Investment Account *
                </label>
                <select
                  value={formData.account_id}
                  onChange={(e) => {
                    const accId = Number(e.target.value);
                    const selected = accounts.find((a) => a.id === accId);
                    setFormData({
                      ...formData,
                      account_id: accId,
                      currency: selected?.currency || formData.currency,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-500"
                >
                  <option value={0} disabled>
                    Select an investment account
                  </option>
                  {investmentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Type & Symbol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Asset Type
                  </label>
                  <select
                    value={formData.asset_type}
                    onChange={(e) =>
                      setFormData({ ...formData, asset_type: e.target.value as AssetType })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-500"
                  >
                    <option value="stock">Stock</option>
                    <option value="crypto">Crypto</option>
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Symbol / Ticker *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RELIANCE, BTC"
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 uppercase font-mono"
                  />
                </div>
              </div>

              {/* Name & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Holding Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reliance Industries, Bitcoin"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Currency *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currency: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 uppercase font-mono"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={0.00000001}
                  placeholder="e.g. 50 or 0.045"
                  value={formData.quantity || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* Average Buy Price & Initial Current Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Average Buy Price *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0}
                    value={formData.avg_buy_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        avg_buy_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Current / Initial Price *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0}
                    value={formData.last_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        last_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes, target price, exchange details..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </form>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/90">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-holding-form"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-purple-950/50"
              >
                Add Holding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Holding Modal */}
      {isEditModalOpen && editingHolding && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-400" />
                Edit Holding: {editingHolding.symbol}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="edit-holding-form"
              onSubmit={handleUpdateHolding}
              className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              {/* Invisible submit button for Enter key form submission */}
              <button type="submit" className="hidden" aria-hidden="true" />
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Asset Type
                  </label>
                  <select
                    value={editFormData.asset_type}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        asset_type: e.target.value as AssetType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-500"
                  >
                    <option value="stock">Stock</option>
                    <option value="crypto">Crypto</option>
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.symbol}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        symbol: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0.000001}
                    value={editFormData.quantity}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Average Buy Price *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0}
                    value={editFormData.avg_buy_price}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        avg_buy_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </form>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/90">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-holding-form"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-purple-950/50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Update Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-amber-400" />
                  Bulk Update Holding Prices
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Update current prices for multiple holdings at once in a single transaction.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3 text-right">Current Stored Price</th>
                    <th className="py-2.5 px-3 text-right">New Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {holdings
                    .filter((h) => h.is_archived === 0)
                    .map((h) => (
                      <tr key={h.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white block">{h.symbol}</span>
                          <span className="text-[10px] text-zinc-400 capitalize">
                            {h.asset_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">{h.account_name}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-zinc-400">
                          {formatCurrency(h.last_price, h.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={bulkPrices[h.id] ?? ''}
                            onChange={(e) =>
                              setBulkPrices({
                                ...bulkPrices,
                                [h.id]: e.target.value,
                              })
                            }
                            className="w-32 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-right text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-950/40">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBulk}
                onClick={handleSaveBulkPrices}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-amber-900/30 transition-colors"
              >
                {isSubmittingBulk ? 'Saving...' : 'Save All Prices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {historyHolding && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ChartIcon className="w-5 h-5 text-blue-400" />
                  Price History: {historyHolding.symbol} ({historyHolding.currency})
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Chronological record of manual price entries
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryHolding(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  Loading history...
                </div>
              ) : historyData.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No price history points recorded yet.
                </div>
              ) : (
                <>
                  {/* Line Chart */}
                  <div className="h-64 w-full p-2 bg-zinc-950/60 rounded-xl border border-zinc-800">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={historyData.map((d) => ({
                          ...d,
                          dateLabel: d.recorded_at.slice(0, 16).replace('T', ' '),
                        }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                          dataKey="dateLabel"
                          stroke="#71717a"
                          fontSize={10}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#71717a"
                          fontSize={10}
                          tickLine={false}
                          domain={['auto', 'auto']}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                          }}
                          formatter={(value: unknown) => [
                            formatCurrency(Number(value), historyHolding.currency),
                            'Price',
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#3b82f6' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Table of points */}
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800 uppercase">
                        <tr>
                          <th className="py-2 px-3">Recorded At</th>
                          <th className="py-2 px-3 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {historyData.slice().reverse().map((pt) => (
                          <tr key={pt.id} className="hover:bg-zinc-800/20">
                            <td className="py-2 px-3 text-zinc-400 font-mono">
                              {formatIndianDateTime(pt.recorded_at)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-white">
                              {formatCurrency(pt.price, historyHolding.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-950/40">
              <button
                type="button"
                onClick={() => setHistoryHolding(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
