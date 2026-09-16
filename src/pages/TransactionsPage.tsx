import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Transaction, TransactionFilter } from '../types';
import { TransactionModal } from '../components/TransactionModal';
import {
  ArrowLeftRight,
  Search,
  Plus,
  Copy,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Download,
} from 'lucide-react';
import { formatIndianDate, formatIndianCurrency } from '../lib/utils';

export const TransactionsPage: React.FC = () => {
  const transactions = useAppStore(state => state.transactions);
  const accounts = useAppStore(state => state.accounts);
  const categories = useAppStore(state => state.categories);
  const tags = useAppStore(state => state.tags);
  const settings = useAppStore(state => state.settings);
  const loadTransactions = useAppStore(state => state.loadTransactions);
  const deleteTransaction = useAppStore(state => state.deleteTransaction);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const theme = useAppStore(themeState => themeState.theme);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [isCloneMode, setIsCloneMode] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = React.useCallback(() => {
    const filter: TransactionFilter = {};
    if (searchQuery.trim()) filter.search_query = searchQuery.trim();
    if (filterType !== 'all') filter.txn_type = filterType;
    if (filterAccountId !== 'all') filter.account_id = Number(filterAccountId);
    if (filterCategoryId !== 'all') filter.category_id = Number(filterCategoryId);
    if (filterTag !== 'all') filter.tag = filterTag;
    if (filterStatus === 'confirmed') filter.is_confirmed = true;
    if (filterStatus === 'pending') filter.is_confirmed = false;
    if (startDate) filter.start_date = startDate;
    if (endDate) filter.end_date = endDate;

    loadTransactions(filter);
  }, [
    searchQuery,
    filterType,
    filterAccountId,
    filterCategoryId,
    filterTag,
    filterStatus,
    startDate,
    endDate,
    loadTransactions,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 300);
    return () => clearTimeout(timer);
  }, [applyFilters]);

  const handleOpenCreate = () => {
    setSelectedTxn(null);
    setIsCloneMode(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (txn: Transaction) => {
    setSelectedTxn(txn);
    setIsCloneMode(false);
    setIsModalOpen(true);
  };

  const handleClone = (txn: Transaction) => {
    setSelectedTxn(txn);
    setIsCloneMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (txn: Transaction) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this transaction of ${txn.amount} ${txn.account_currency}? This will immediately adjust your account balance.`
      )
    ) {
      return;
    }
    try {
      await deleteTransaction(txn.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const baseCurrency = settings?.base_currency || 'INR';

  // 1-Click Export to CSV
  const exportToCsv = () => {
    if (!transactions.length) {
      alert('No transactions to export.');
      return;
    }

    const headers = [
      'ID',
      'Date',
      'Type',
      'Account',
      'Category',
      'Amount',
      'Currency',
      'Base Amount',
      'Base Currency',
      'Payment Type',
      'Note',
      'Status',
    ];

    const rows = transactions.map((t) => [
      t.id,
      `"${t.txn_date}"`,
      `"${t.type}"`,
      `"${(t.account_name || '').replace(/"/g, '""')}"`,
      `"${(t.category_name || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${t.account_currency}"`,
      t.base_amount,
      `"${baseCurrency}"`,
      `"${t.payment_type || ''}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.is_confirmed ? 'Confirmed' : 'Pending',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `lyncost-transactions-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered Summary Stats
  const filterStats = React.useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') inflow += t.base_amount;
      if (t.type === 'expense') outflow += t.base_amount;
    });
    return {
      count: transactions.length,
      inflow,
      outflow,
      net: inflow - outflow,
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>
            Transactions
          </h2>
          <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
            Real-time income, expense, and transfer records backed by SQLite ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportToCsv}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-xs'
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
            }`}
            title="Export filtered transactions as CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg shadow-purple-950/40 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by note, category, or account..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Quick Type Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl w-full md:w-auto">
            {['all', 'expense', 'income', 'transfer'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                  filterType === t
                    ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showFilters
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Expanded Filters Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-zinc-850 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Account</label>
              <select
                value={filterAccountId}
                onChange={(e) => setFilterAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-bold focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Category</label>
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-bold focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.kind})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Tag</label>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-bold focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Tags</option>
                {tags.map((tg) => (
                  <option key={tg.id} value={tg.name}>
                    #{tg.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-bold focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed Only</option>
                <option value="pending">Pending Only</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-500 mb-1">Date Range</label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    (e.target as HTMLInputElement).blur();
                  }}
                  className="w-1/2 px-1.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-white font-mono"
                />
                <span className="text-zinc-600">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    (e.target as HTMLInputElement).blur();
                  }}
                  className="w-1/2 px-1.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtered Summary Stats Banner */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-3 rounded-xl border ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900/80 border-zinc-800'
          }`}>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Filtered Count</span>
            <span className={`text-base font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {filterStats.count} txns
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${
            theme === 'light' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-900/40'
          }`}>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Total Inflows (+)</span>
            <span className="text-base font-black font-mono text-emerald-400">
              +{formatIndianCurrency(filterStats.inflow, baseCurrency)}
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${
            theme === 'light' ? 'bg-rose-50/50 border-rose-200' : 'bg-rose-950/20 border-rose-900/40'
          }`}>
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Total Outflows (-)</span>
            <span className="text-base font-black font-mono text-rose-400">
              -{formatIndianCurrency(filterStats.outflow, baseCurrency)}
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${
            filterStats.net >= 0
              ? theme === 'light' ? 'bg-purple-50 border-purple-200 text-purple-950' : 'bg-purple-950/30 border-purple-800/50 text-purple-200'
              : 'bg-rose-950/30 border-rose-800 text-rose-300'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">Net Cashflow</span>
            <span className="text-base font-black font-mono">
              {filterStats.net >= 0 ? '+' : ''}{formatIndianCurrency(filterStats.net, baseCurrency)}
            </span>
          </div>
        </div>
      )}

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="p-16 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center bg-zinc-900/40">
          <ArrowLeftRight className="w-12 h-12 text-zinc-600 mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">No transactions recorded</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            Record your daily expenses, earnings, or transfers to see them reflected in real-time balances.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
          >
            Record First Transaction
          </button>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/80 shadow-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold">
              <tr>
                <th className="p-3.5 pl-4">Status & Date</th>
                <th className="p-3.5">Account</th>
                <th className="p-3.5">Category / Transfer</th>
                <th className="p-3.5">Note & Tags</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {transactions.map((txn) => {
                const isIncome = txn.type === 'income';
                const isTransfer = txn.type === 'transfer';
                const isConfirmed = txn.is_confirmed === 1;

                return (
                  <tr key={txn.id} className="hover:bg-zinc-850/50 transition-colors">
                    {/* Status & Date */}
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2">
                        {isConfirmed ? (
                          <span title="Confirmed">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          </span>
                        ) : (
                          <span title="Pending / Uncleared">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          </span>
                        )}
                        <div>
                          <span className="font-mono text-zinc-200 block font-medium">
                            {formatIndianDate(txn.txn_date)}
                          </span>
                          {txn.payment_type && (
                            <span className="text-[10px] uppercase font-bold text-zinc-500">
                              {txn.payment_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Account */}
                    <td className="p-3.5 text-zinc-300">
                      <span className="font-semibold text-white block">{txn.account_name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {txn.account_currency}
                      </span>
                    </td>

                    {/* Category / Transfer Target */}
                    <td className="p-3.5">
                      {isTransfer ? (
                        <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>To {txn.transfer_to_account_name || 'Account'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {txn.category_name ? (
                            <span
                              className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                              style={{
                                backgroundColor: txn.category_color
                                  ? `${txn.category_color}20`
                                  : '#27272a',
                                borderColor: txn.category_color
                                  ? `${txn.category_color}40`
                                  : '#3f3f46',
                                color: txn.category_color || '#e4e4e7',
                              }}
                            >
                              {txn.category_name}
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-xs">Uncategorized</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Note & Tags */}
                    <td className="p-3.5 max-w-xs">
                      {txn.note && (
                        <p className="text-zinc-300 truncate font-medium text-xs mb-1">
                          {txn.note}
                        </p>
                      )}
                      {txn.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {txn.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="p-3.5 text-right font-mono">
                      <span
                        className={`text-sm font-bold block ${
                          isIncome
                            ? 'text-emerald-400'
                            : isTransfer
                            ? 'text-blue-400'
                            : 'text-red-400'
                        }`}
                      >
                        {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                        {formatIndianCurrency(txn.amount, txn.account_currency)}
                      </span>
                      {txn.account_currency !== baseCurrency && (
                        <span className="text-[10px] text-zinc-500 block">
                          ≈ {formatIndianCurrency(txn.base_amount, baseCurrency)}
                        </span>
                      )}
                    </td>

                    {/* Actions: Clone, Edit, Delete */}
                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Clone Transaction (pre-fill new)"
                          onClick={() => handleClone(txn)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Edit Transaction"
                          onClick={() => handleOpenEdit(txn)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete Transaction"
                          onClick={() => handleDelete(txn)}
                          className="p-1.5 rounded-lg hover:bg-red-950/50 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Modal (Add / Edit / Clone) */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTxn(null);
          setIsCloneMode(false);
        }}
        initialTransaction={selectedTxn}
        isClone={isCloneMode}
      />
    </div>
  );
};
