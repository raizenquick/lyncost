import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Goal, CreateGoalPayload, UpdateGoalPayload } from '../types';
import {
  Target,
  Plus,
  Trophy,
  Calendar,
  Wallet,
  Sparkles,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  Coins,
  ArrowDownLeft,
} from 'lucide-react';
import { formatIndianDate, formatIndianCurrency } from '../lib/utils';

const COLOR_PRESETS = [
  { label: 'Purple', value: '#9333ea' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Cyan', value: '#06b6d4' },
];

export const GoalsPage: React.FC = () => {
  const goals = useAppStore(state => state.goals);
  const accounts = useAppStore(state => state.accounts);
  const settings = useAppStore(state => state.settings);
  const createGoal = useAppStore(state => state.createGoal);
  const updateGoal = useAppStore(state => state.updateGoal);
  const deleteGoal = useAppStore(state => state.deleteGoal);
  const contributeGoal = useAppStore(state => state.contributeGoal);

  const baseCurrency = settings?.base_currency || 'INR';

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'reached'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);

  // Form states for Add Goal
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [color, setColor] = useState('#9333ea');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Edit Goal
  const [editName, setEditName] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editCurrentAmount, setEditCurrentAmount] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editAccountId, setEditAccountId] = useState<number | null>(null);
  const [editColor, setEditColor] = useState('#9333ea');
  const [editNote, setEditNote] = useState('');
  const [editIsReached, setEditIsReached] = useState(0);

  // Form state for Contribute
  const [contribType, setContribType] = useState<'deposit' | 'withdraw'>('deposit');
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [contribError, setContribError] = useState<string | null>(null);

  const filteredGoals = goals.filter((g) => {
    if (activeFilter === 'active') return g.is_reached === 0;
    if (activeFilter === 'reached') return g.is_reached === 1;
    return true;
  });

  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const reachedCount = goals.filter((g) => g.is_reached === 1).length;

  const handleOpenAdd = () => {
    setName('');
    setTargetAmount('');
    setInitialAmount('');
    setTargetDate('');
    setAccountId(null);
    setColor('#9333ea');
    setNote('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsedTarget = parseFloat(targetAmount);
    if (!name.trim()) {
      setFormError('Goal name is required.');
      return;
    }
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setFormError('Target amount must be greater than 0.');
      return;
    }

    const parsedInitial = initialAmount ? parseFloat(initialAmount) : 0;

    const payload: CreateGoalPayload = {
      name: name.trim(),
      target_amount: parsedTarget,
      current_amount: parsedInitial > 0 ? parsedInitial : 0,
      target_date: targetDate || null,
      account_id: accountId,
      color,
      icon: 'target',
      note: note.trim() || null,
    };

    try {
      await createGoal(payload);
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenEdit = (g: Goal) => {
    setEditingGoal(g);
    setEditName(g.name);
    setEditTargetAmount(g.target_amount.toString());
    setEditCurrentAmount(g.current_amount.toString());
    setEditTargetDate(g.target_date || '');
    setEditAccountId(g.account_id || null);
    setEditColor(g.color || '#9333ea');
    setEditNote(g.note || '');
    setEditIsReached(g.is_reached);
    setFormError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    setFormError(null);

    const parsedTarget = parseFloat(editTargetAmount);
    const parsedCurrent = parseFloat(editCurrentAmount);

    if (!editName.trim()) {
      setFormError('Goal name is required.');
      return;
    }
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setFormError('Target amount must be greater than 0.');
      return;
    }

    const payload: UpdateGoalPayload = {
      name: editName.trim(),
      target_amount: parsedTarget,
      current_amount: isNaN(parsedCurrent) ? 0 : parsedCurrent,
      target_date: editTargetDate || null,
      account_id: editAccountId,
      color: editColor,
      icon: editingGoal.icon || 'target',
      note: editNote.trim() || null,
      is_reached: editIsReached,
    };

    try {
      await updateGoal(editingGoal.id, payload);
      setEditingGoal(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(id);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleOpenContribute = (g: Goal) => {
    setContributingGoal(g);
    setContribType('deposit');
    setContribAmount('');
    setContribNote('');
    setContribError(null);
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal) return;
    setContribError(null);

    const val = parseFloat(contribAmount);
    if (isNaN(val) || val <= 0) {
      setContribError('Please enter a valid amount.');
      return;
    }

    const finalAmount = contribType === 'withdraw' ? -val : val;

    try {
      await contributeGoal({
        goal_id: contributingGoal.id,
        amount: finalAmount,
        note: contribNote.trim() || (contribType === 'deposit' ? 'Deposit' : 'Withdrawal'),
      });
      setContributingGoal(null);
    } catch (err: unknown) {
      setContribError(err instanceof Error ? err.message : String(err));
    }
  };

  // Helper for pace projection
  const getPaceInfo = (g: Goal) => {
    if (!g.target_date) return null;
    const target = new Date(g.target_date + 'T00:00:00');
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { text: 'Target date reached', isOverdue: true, monthly: 0 };
    }

    const remaining = Math.max(0, g.target_amount - g.current_amount);
    const months = diffDays / 30.44;
    const monthlyNeeded = months > 0 ? Math.round(remaining / months) : remaining;

    return {
      text: `${formatIndianDate(g.target_date)} (${diffDays}d left)`,
      isOverdue: false,
      monthly: monthlyNeeded,
    };
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-950/40">
              <Target className="w-5 h-5" />
            </div>
            Financial Goals
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Track your savings targets, dream milestones, and watch your progress grow.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/60 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Target */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Total Targets</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {baseCurrency} {totalTarget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">{goals.length} total goals tracked</p>
        </div>

        {/* Total Saved */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Total Saved</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {baseCurrency} {totalSaved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {baseCurrency} {Math.max(0, totalTarget - totalSaved).toLocaleString('en-IN', { minimumFractionDigits: 2 })} remaining
          </p>
        </div>

        {/* Overall Progress */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Overall Progress</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {overallPercentage}%
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Reached Goals */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Milestones Reached</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            {reachedCount} / {goals.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {goals.length - reachedCount} active in progress
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
        {(['all', 'active', 'reached'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
              activeFilter === filter
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-950/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            {filter === 'all' && `All (${goals.length})`}
            {filter === 'active' && `In Progress (${goals.length - reachedCount})`}
            {filter === 'reached' && `Reached (${reachedCount})`}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No goals found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5">
            {activeFilter === 'all'
              ? 'Create your first savings goal — whether it is an emergency fund, travel, or a gadget!'
              : `No ${activeFilter} goals currently.`}
          </p>
          {activeFilter === 'all' && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-all shadow-lg shadow-purple-950/50"
            >
              <Plus className="w-4 h-4" />
              Create a Goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((g) => {
            const pace = getPaceInfo(g);
            const linkedAccount = accounts.find((a) => a.id === g.account_id);
            const isCompleted = g.is_reached === 1 || g.percentage >= 100;

            return (
              <div
                key={g.id}
                className="bg-zinc-900/90 border border-zinc-800/80 hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-purple-950/20 group relative overflow-hidden"
              >
                {/* Top Banner / Goal Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 text-white font-bold"
                        style={{ backgroundColor: `${g.color}25`, borderColor: `${g.color}50`, borderWidth: '1px' }}
                      >
                        <Target className="w-5 h-5" style={{ color: g.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                          {g.name}
                        </h3>
                        {linkedAccount && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                            <Wallet className="w-3 h-3 text-zinc-500" />
                            <span>{linkedAccount.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(g)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-300 hover:bg-zinc-800 cursor-pointer transition-colors"
                        title="Edit Goal"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Reached Badge or Pace Warning */}
                  {isCompleted ? (
                    <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Goal Milestone Achieved! 🎉</span>
                    </div>
                  ) : pace ? (
                    <div className="mb-3 flex items-center justify-between text-[11px] px-2.5 py-1 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {pace.text}
                      </span>
                      {pace.monthly > 0 && (
                        <span className="text-purple-400 font-semibold font-mono">
                          ~{formatIndianCurrency(pace.monthly, baseCurrency)}/mo
                        </span>
                      )}
                    </div>
                  ) : null}

                  {/* Amounts */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Saved</span>
                      <span className="font-bold text-white font-mono text-sm">
                        {formatIndianCurrency(g.current_amount, baseCurrency)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-500">Target</span>
                      <span className="text-zinc-400 font-mono">
                        {formatIndianCurrency(g.target_amount, baseCurrency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span style={{ color: g.color }}>{g.percentage.toFixed(0)}% Saved</span>
                      <span className="text-zinc-500 font-mono">
                        {formatIndianCurrency(g.remaining_amount, baseCurrency)} left
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800/80">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, g.percentage)}%`,
                          backgroundColor: g.color || '#9333ea',
                        }}
                      />
                    </div>
                  </div>

                  {g.note && (
                    <p className="text-[11px] text-zinc-400 italic line-clamp-2 mb-4 bg-zinc-950/40 p-2 rounded-lg border border-zinc-850">
                      "{g.note}"
                    </p>
                  )}
                </div>

                {/* Bottom Quick Action: Add Money */}
                <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenContribute(g)}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-500 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 group/btn"
                  >
                    <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform duration-200" />
                    <span>Add Money / Deposit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Create Savings Goal
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="add-goal-form"
              onSubmit={handleCreateSubmit}
              className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              <button type="submit" className="hidden" aria-hidden="true" />

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, New Laptop, Japan Trip"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white transition-all shadow-inner focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Target Amount ({baseCurrency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={1}
                    placeholder="50000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white font-mono transition-all shadow-inner focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Initial Saved Amount ({baseCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white font-mono transition-all shadow-inner focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => {
                      setTargetDate(e.target.value);
                      (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white font-mono cursor-pointer transition-all shadow-inner focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Linked Account (Optional)
                  </label>
                  <select
                    value={accountId || ''}
                    onChange={(e) => setAccountId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3.5 py-2.5 rounded-xl  font-bold text-xs focus:outline-none focus:border-purple-500 shadow-inner"
                  >
                    <option value="">-- None (Generic Goal) --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        color === c.value ? 'scale-110 border-white shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Motivation, specific model/link, milestone notes..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white resize-none transition-all shadow-inner focus:outline-none"
                />
              </div>
            </form>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/95">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-goal-form"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-purple-400" />
                Edit Goal: {editingGoal.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="edit-goal-form"
              onSubmit={handleEditSubmit}
              className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              <button type="submit" className="hidden" aria-hidden="true" />

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white transition-all shadow-inner focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Target Amount ({baseCurrency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={1}
                    value={editTargetAmount}
                    onChange={(e) => setEditTargetAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white font-mono transition-all shadow-inner focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Current Saved ({baseCurrency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editCurrentAmount}
                    onChange={(e) => setEditCurrentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white font-mono transition-all shadow-inner focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => {
                      setEditTargetDate(e.target.value);
                      (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white font-mono cursor-pointer transition-all shadow-inner focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Status
                  </label>
                  <select
                    value={editIsReached}
                    onChange={(e) => setEditIsReached(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl  font-bold text-xs focus:outline-none focus:border-purple-500 shadow-inner"
                  >
                    <option value={0}>In Progress</option>
                    <option value={1}>Reached / Completed 🎉</option>
                  </select>
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setEditColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        editColor === c.value ? 'scale-110 border-white shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white resize-none transition-all shadow-inner focus:outline-none"
                />
              </div>
            </form>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/95">
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-goal-form"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute Modal (Deposit / Withdraw) */}
      {contributingGoal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                Add to Goal: {contributingGoal.name}
              </h3>
              <button
                type="button"
                onClick={() => setContributingGoal(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="contrib-form"
              onSubmit={handleContributeSubmit}
              className="p-6 space-y-4"
            >
              <button type="submit" className="hidden" aria-hidden="true" />

              {contribError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{contribError}</span>
                </div>
              )}

              {/* Deposit / Withdraw Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setContribType('deposit')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    contribType === 'deposit'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Deposit (Add Saved)
                </button>
                <button
                  type="button"
                  onClick={() => setContribType('withdraw')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    contribType === 'withdraw'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Withdraw
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Amount ({baseCurrency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min={0.01}
                  placeholder="5000"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white font-mono transition-all shadow-inner focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly savings, Salary bonus"
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white transition-all shadow-inner focus:outline-none"
                />
              </div>
            </form>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/95">
              <button
                type="button"
                onClick={() => setContributingGoal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="contrib-form"
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer shadow-lg transition-colors ${
                  contribType === 'deposit'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                }`}
              >
                {contribType === 'deposit' ? 'Add Deposit' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GoalsPage;
