import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RecurringRule } from '../types';
import { RecurringRuleModal } from '../components/RecurringRuleModal';
import {
  Repeat,
  Plus,
  Play,
  Edit2,
  Trash2,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
} from 'lucide-react';
import { formatIndianDate, formatIndianCurrency } from '../lib/utils';

export const RecurringRulesPage: React.FC = () => {
  const recurringRules = useAppStore(state => state.recurringRules);
  const deleteRecurringRule = useAppStore(state => state.deleteRecurringRule);
  const processRecurringRules = useAppStore(state => state.processRecurringRules);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RecurringRule | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setSelectedRule(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: RecurringRule) => {
    setSelectedRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = async (rule: RecurringRule) => {
    if (!window.confirm(`Delete recurring rule "${rule.name}"?`)) return;
    try {
      await deleteRecurringRule(rule.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRunNow = async () => {
    setIsRunning(true);
    setLastRunResult(null);
    try {
      const generated = await processRecurringRules();
      setLastRunResult(
        generated > 0
          ? `Generated ${generated} due transaction(s) successfully!`
          : 'All recurring rules are up to date. No pending cycles.'
      );
    } catch (err: unknown) {
      setLastRunResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Recurring Rules</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Automated recurring entries for rent, salary, subscriptions, and regular transfers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunNow}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-400" />
            )}
            Process Due Now
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Recurring Rule
          </button>
        </div>
      </div>

      {lastRunResult && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center justify-between">
          <span>{lastRunResult}</span>
          <button
            type="button"
            onClick={() => setLastRunResult(null)}
            className="text-zinc-500 hover:text-zinc-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Rules List */}
      {recurringRules.length === 0 ? (
        <div className="p-16 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center bg-zinc-900/40">
          <Repeat className="w-12 h-12 text-zinc-600 mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">No recurring rules configured</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            Set up recurring rules for predictable income and expenses so they generate automatically on schedule.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
          >
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurringRules.map((rule) => {
            const isIncome = rule.type === 'income';
            const isTransfer = rule.type === 'transfer';
            const isActive = rule.is_active === 1;

            return (
              <div
                key={rule.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 shadow-md'
                    : 'bg-zinc-950/40 border-zinc-850 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                          isIncome
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : isTransfer
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
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
                        <h4 className="text-sm font-semibold text-white">{rule.name}</h4>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">
                          {rule.frequency} • {rule.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rule)}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rule)}
                        className="p-1 rounded hover:bg-red-950/50 text-zinc-400 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 my-3">
                    <span className="text-[10px] text-zinc-500 block">Amount</span>
                    <span
                      className={`text-xl font-bold font-mono ${
                        isIncome
                          ? 'text-emerald-400'
                          : isTransfer
                          ? 'text-blue-400'
                          : 'text-red-400'
                      }`}
                    >
                      {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                      {formatIndianCurrency(rule.amount, 'INR')}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 space-y-1">
                    <p className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Account:</span>
                      <span className="text-zinc-300 font-medium">{rule.account_name}</span>
                    </p>
                    {isTransfer ? (
                      <p className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Destination:</span>
                        <span className="text-blue-400 font-medium">
                          {rule.transfer_to_account_name || 'Account'}
                        </span>
                      </p>
                    ) : (
                      <p className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Category:</span>
                        <span className="text-zinc-300 font-medium">
                          {rule.category_name || 'Uncategorized'}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-zinc-400 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    Due: {formatIndianDate(rule.next_due_date)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recurring Rule Modal */}
      <RecurringRuleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRule(null);
        }}
        initialRule={selectedRule}
      />
    </div>
  );
};
