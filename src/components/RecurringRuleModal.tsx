import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  CreateRecurringRulePayload,
  PaymentType,
  RecurringFrequency,
  RecurringRule,
  TransactionType,
  UpdateRecurringRulePayload,
} from '../types';
import { X, RefreshCw, Repeat, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

interface RecurringRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRule?: RecurringRule | null;
}

export const RecurringRuleModal: React.FC<RecurringRuleModalProps> = ({
  isOpen,
  onClose,
  initialRule,
}) => {
  const accounts = useAppStore(state => state.accounts);
  const categories = useAppStore(state => state.categories);
  const paymentMethods = useAppStore(state => state.paymentMethods);
  const createRecurringRule = useAppStore(state => state.createRecurringRule);
  const updateRecurringRule = useAppStore(state => state.updateRecurringRule);

  const isEditing = Boolean(initialRule);

  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState<number>(accounts[0]?.id || 0);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [transferToAccountId, setTransferToAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('upi');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name);
      setRuleType(initialRule.type);
      setAccountId(initialRule.account_id);
      setCategoryId(initialRule.category_id || null);
      setTransferToAccountId(initialRule.transfer_to_account_id || null);
      setAmount(initialRule.amount.toString());
      setPaymentType(initialRule.payment_type || 'upi');
      setFrequency(initialRule.frequency);
      setNextDueDate(initialRule.next_due_date);
      setIsActive(initialRule.is_active === 1);
      setNote(initialRule.note || '');
    } else {
      setName('');
      setRuleType('expense');
      setAccountId(accounts.find((a) => a.is_archived === 0)?.id || accounts[0]?.id || 0);
      setCategoryId(null);
      setTransferToAccountId(null);
      setAmount('');
      const defPm = paymentMethods.find((p) => p.is_default === 1 && p.is_active === 1) || paymentMethods.find((p) => p.is_active === 1);
      setPaymentType((defPm?.type_key as PaymentType) || 'cash');
      setFrequency('monthly');
      setNextDueDate(new Date().toISOString().split('T')[0]);
      setIsActive(true);
      setNote('');
    }
    setFormError(null);
  }, [initialRule, isOpen, accounts]);

  if (!isOpen) return null;

  const activeAccounts = accounts.filter((a) => a.is_archived === 0 || a.id === accountId);
  const filteredCategories = categories.filter((c) => c.kind === ruleType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Rule name is required');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    if (ruleType === 'transfer') {
      if (!transferToAccountId) {
        setFormError('Please select a destination account for the transfer');
        return;
      }
      if (transferToAccountId === accountId) {
        setFormError('Source and destination accounts must be different');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isEditing && initialRule) {
        const payload: UpdateRecurringRulePayload = {
          name: trimmedName,
          account_id: accountId,
          type: ruleType,
          category_id: ruleType === 'transfer' ? null : categoryId,
          transfer_to_account_id: ruleType === 'transfer' ? transferToAccountId : null,
          amount: parsedAmount,
          payment_type: paymentType,
          frequency,
          next_due_date: nextDueDate,
          is_active: isActive,
          note: note.trim() || null,
        };
        await updateRecurringRule(initialRule.id, payload);
      } else {
        const payload: CreateRecurringRulePayload = {
          name: trimmedName,
          account_id: accountId,
          type: ruleType,
          category_id: ruleType === 'transfer' ? null : categoryId,
          transfer_to_account_id: ruleType === 'transfer' ? transferToAccountId : null,
          amount: parsedAmount,
          payment_type: paymentType,
          frequency,
          next_due_date: nextDueDate,
          note: note.trim() || null,
        };
        await createRecurringRule(payload);
      }
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-purple-400" />
              {isEditing ? 'Edit Recurring Rule' : 'New Recurring Rule'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automatically creates transactions when due on app launch
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="rule-form" onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 custom-scrollbar">
          {/* Invisible submit button for Enter key form submission */}
          <button type="submit" className="hidden" aria-hidden="true" />
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-900/60 text-red-400 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly House Rent, Gym Subscription"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setRuleType('expense');
                setCategoryId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ruleType === 'expense'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Expense
            </button>

            <button
              type="button"
              onClick={() => {
                setRuleType('income');
                setCategoryId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ruleType === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Income
            </button>

            <button
              type="button"
              onClick={() => {
                setRuleType('transfer');
                setCategoryId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ruleType === 'transfer'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transfer
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                {ruleType === 'transfer' ? 'From Account *' : 'Account *'}
              </label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {ruleType === 'transfer' ? (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  To Account *
                </label>
                <select
                  required
                  value={transferToAccountId || ''}
                  onChange={(e) => setTransferToAccountId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">-- Select Target --</option>
                  {activeAccounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Category
                </label>
                <select
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">Uncategorized</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Frequency *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Next Due Date *
              </label>
              <input
                type="date"
                required
                value={nextDueDate}
                onChange={(e) => {
                  setNextDueDate(e.target.value);
                  (e.target as HTMLInputElement).blur();
                }}
                className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer font-mono transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Payment Type
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {paymentMethods && paymentMethods.filter((pm) => pm.is_active === 1).length > 0 ? (
                  paymentMethods
                    .filter((pm) => pm.is_active === 1)
                    .map((pm) => (
                      <option key={pm.id} value={pm.type_key}>
                        {pm.name}
                      </option>
                    ))
                ) : (
                  <>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </>
                )}
                {paymentType &&
                  !['upi', 'card', 'bank_transfer', 'cash', 'other'].includes(paymentType) &&
                  !paymentMethods?.some((pm) => pm.type_key === paymentType && pm.is_active === 1) && (
                    <option value={paymentType}>{paymentType}</option>
                  )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {isEditing && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-xs font-medium text-zinc-300">Rule Active Status</span>
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0"
                />
                <span>{isActive ? 'Active' : 'Paused'}</span>
              </label>
            </div>
          )}
        </form>

        {/* Sticky Actions Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/95 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="rule-form"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
          >
            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};
