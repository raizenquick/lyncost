import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { BudgetPeriod, BudgetProgress, CreateBudgetPayload } from '../types';
import {
  PieChart,
  Plus,
  AlertTriangle,
  Layers,
  Repeat,
  Trash2,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { formatIndianDate, formatIndianCurrency } from '../lib/utils';

export const BudgetsPage: React.FC = () => {
  const budgets = useAppStore(state => state.budgets);
  const categories = useAppStore(state => state.categories);
  const settings = useAppStore(state => state.settings);
  const createBudget = useAppStore(state => state.createBudget);
  const updateBudget = useAppStore(state => state.updateBudget);
  const deleteBudget = useAppStore(state => state.deleteBudget);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetProgress | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [rollover, setRollover] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const baseCurrency = settings?.base_currency || 'INR';
  const expenseCategories = categories.filter((c) => c.kind === 'expense');

  const openCreateModal = () => {
    setEditingBudget(null);
    setName('');
    setAmount('');
    setPeriod('monthly');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate('');
    setRollover(false);
    setSelectedCategoryIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: BudgetProgress) => {
    setEditingBudget(b);
    setName(b.name);
    setAmount(b.amount.toString());
    setPeriod(b.period);
    setStartDate(b.start_date);
    setEndDate(b.end_date || '');
    setRollover(b.rollover);
    setSelectedCategoryIds([...b.category_ids]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const toggleCategory = (catId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSelectAllCategories = () => {
    if (selectedCategoryIds.length === expenseCategories.length) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(expenseCategories.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (!name.trim()) {
      setFormError('Budget name is required');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Budget amount must be greater than 0');
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setFormError('Please select at least one category for this budget');
      return;
    }
    if (period === 'custom' && !endDate) {
      setFormError('End date is required for custom period budgets');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          name: name.trim(),
          amount: parsedAmount,
          period,
          start_date: startDate,
          end_date: period === 'custom' ? endDate : null,
          rollover,
          is_active: editingBudget.is_active,
          category_ids: selectedCategoryIds,
        });
      } else {
        const payload: CreateBudgetPayload = {
          name: name.trim(),
          amount: parsedAmount,
          period,
          start_date: startDate,
          end_date: period === 'custom' ? endDate : null,
          rollover,
          category_ids: selectedCategoryIds,
        };
        await createBudget(payload);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBudget(id);
      setDeletingId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <PieChart className="w-6 h-6 text-emerald-400" />
            Budgets
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Track planned category limits with pace projections & rollover support
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Budget
        </button>
      </div>

      {/* Budgets Grid */}
      {budgets.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
          <PieChart className="w-12 h-12 text-zinc-600 mx-auto mb-3 stroke-1" />
          <h3 className="text-sm font-semibold text-zinc-300">No Budgets Created Yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Set up weekly, monthly, or custom budgets combining categories to prevent overspending.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
          >
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            // Threshold styling: green < 80%, amber 80-100%, red > 100%
            const pct = b.progress_percent;
            const isOver = pct > 100;
            const isWarning = pct >= 80 && pct <= 100;

            const barColor = isOver
              ? 'bg-rose-500 shadow-rose-900/40'
              : isWarning
              ? 'bg-amber-500 shadow-amber-900/40'
              : 'bg-emerald-500 shadow-emerald-900/40';

            const badgeColor = isOver
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : isWarning
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

            return (
              <div
                key={b.id}
                className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700/80 transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">{b.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeColor}`}>
                          {pct.toFixed(0)}% Spent
                        </span>
                        {b.rollover && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            Rollover
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                        <span className="capitalize">{b.period}</span>
                        <span>•</span>
                        <span>
                          {formatIndianDate(b.period_start)} to {formatIndianDate(b.period_end)}
                        </span>
                        <span>•</span>
                        <span className="text-zinc-500">{b.days_remaining}d left</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit Budget"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(b.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete Budget"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (<80% green, 80-100% amber, >100% red) */}
                  <div className="space-y-1.5 my-3.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-semibold text-white font-mono">
                        {formatIndianCurrency(b.spent, baseCurrency)}
                      </span>
                      <span className="text-zinc-400 text-[11px] font-mono">
                        of {formatIndianCurrency(b.effective_amount, baseCurrency)}
                        {b.effective_amount !== b.amount && (
                          <span className="text-indigo-400 ml-1">(base: {formatIndianCurrency(b.amount, baseCurrency)})</span>
                        )}
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 shadow-sm ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-zinc-500">
                      <span>
                        {b.remaining >= 0 ? (
                          <span className="text-zinc-400 font-mono">
                            {formatIndianCurrency(b.remaining, baseCurrency)} remaining
                          </span>
                        ) : (
                          <span className="text-rose-400 font-semibold font-mono">
                            Over budget by {formatIndianCurrency(Math.abs(b.remaining), baseCurrency)}
                          </span>
                        )}
                      </span>
                      <span>{b.days_remaining} days remaining</span>
                    </div>
                  </div>

                  {/* Overspend Pace Warning Callout (AGENTS.md Section 5.4) */}
                  {b.is_pace_warning && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-amber-400 text-xs mb-3">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Pace Warning</span>
                        <span className="text-[11px] text-amber-300/90 leading-relaxed">
                          At current pace, projected spending is{' '}
                          <strong className="font-mono">
                            {formatIndianCurrency(b.projected_spent, baseCurrency)}
                          </strong>{' '}
                          by period end, exceeding limit by{' '}
                          <strong className="font-mono">
                            {formatIndianCurrency(b.projected_spent - b.effective_amount, baseCurrency)}
                          </strong>
                          .
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Linked Categories Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-zinc-800/60">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Categories:
                    </span>
                    {b.category_names.map((cname, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-medium"
                      >
                        {cname}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingBudget ? 'Edit Budget' : 'Create New Budget'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="budget-form" onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 custom-scrollbar">
              {/* Invisible submit button for Enter key form submission */}
              <button type="submit" className="hidden" aria-hidden="true" />
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Budget Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly Living, Groceries & Food"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Budget Limit Amount ({baseCurrency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Period Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Period *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['weekly', 'monthly', 'custom'] as BudgetPeriod[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-colors cursor-pointer ${
                        period === p
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer font-mono transition-all shadow-inner"
                  />
                </div>
                {period === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        (e.target as HTMLInputElement).blur();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer font-mono transition-all shadow-inner"
                    />
                  </div>
                )}
              </div>

              {/* Rollover Toggle */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Unused Rollover
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Add leftover money to next period's limit
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRollover(!rollover)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    rollover
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {rollover ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Multi-Category Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-400">
                    Combine Categories * ({selectedCategoryIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    {selectedCategoryIds.length === expenseCategories.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto p-2 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                  {expenseCategories.map((c) => {
                    const isSelected = selectedCategoryIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCategory(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                            : 'hover:bg-zinc-850 text-zinc-400'
                        }`}
                      >
                        <span>{c.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Sticky Actions Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/95 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="budget-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
              >
                {editingBudget ? 'Save Changes' : 'Create Budget'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete Budget?</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Are you sure you want to delete this budget? Past transactions will remain intact.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-950/40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
