import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  CreateTransactionPayload,
  PaymentType,
  Transaction,
  TransactionType,
  UpdateTransactionPayload,
} from '../types';
import {
  X,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Plus,
  ShieldCheck,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTransaction?: Transaction | null;
  isClone?: boolean;
  prefillNote?: string;
  prefillType?: TransactionType;
  onSaved?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialTransaction,
  isClone = false,
  prefillNote,
  prefillType,
  onSaved,
}) => {
  const accounts = useAppStore(state => state.accounts);
  const categories = useAppStore(state => state.categories);
  const settings = useAppStore(state => state.settings);
  const paymentMethods = useAppStore(state => state.paymentMethods);
  const createTransaction = useAppStore(state => state.createTransaction);
  const updateTransaction = useAppStore(state => state.updateTransaction);

  const isEditing = Boolean(initialTransaction && !isClone);

  const [txnType, setTxnType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState<number>(accounts[0]?.id || 0);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [transferToAccountId, setTransferToAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('upi');
  const [txnDate, setTxnDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(true);
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Warranty Tracking Form State
  const [trackWarranty, setTrackWarranty] = useState<boolean>(false);
  const [warrantyItemName, setWarrantyItemName] = useState<string>('');
  const [warrantyPurchaseDate, setWarrantyPurchaseDate] = useState<string>('');
  const [warrantyExpiresOn, setWarrantyExpiresOn] = useState<string>('');
  const [warrantyNotes, setWarrantyNotes] = useState<string>('');

  // Set default form values
  useEffect(() => {
    if (initialTransaction) {
      setTxnType(initialTransaction.type);
      setAccountId(initialTransaction.account_id);
      setCategoryId(initialTransaction.category_id || null);
      setTransferToAccountId(initialTransaction.transfer_to_account_id || null);
      setAmount(initialTransaction.amount.toString());
      setPaymentType(initialTransaction.payment_type || 'upi');
      // If clone, default to today; otherwise keep original transaction date
      setTxnDate(
        isClone
          ? new Date().toISOString().split('T')[0]
          : initialTransaction.txn_date.split(' ')[0]
      );
      setNote(initialTransaction.note || '');
      setIsConfirmed(initialTransaction.is_confirmed === 1);
      setTags([...initialTransaction.tags]);
      setTrackWarranty(false);
      setWarrantyItemName(initialTransaction.note || '');
      setWarrantyPurchaseDate(new Date().toISOString().split('T')[0]);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setWarrantyExpiresOn(nextYear.toISOString().split('T')[0]);
      setWarrantyNotes('');
    } else {
      setTxnType(prefillType || 'expense');
      setAccountId(accounts.find((a) => a.is_archived === 0)?.id || accounts[0]?.id || 0);
      setCategoryId(null);
      setTransferToAccountId(null);
      setAmount('');
      const defPm = paymentMethods.find((p) => p.is_default === 1 && p.is_active === 1) || paymentMethods.find((p) => p.is_active === 1);
      setPaymentType((defPm?.type_key as PaymentType) || 'cash');
      const todayStr = new Date().toISOString().split('T')[0];
      setTxnDate(todayStr);
      setNote(prefillNote || '');
      setIsConfirmed(true);
      setTags([]);
      setTrackWarranty(false);
      setWarrantyItemName(prefillNote || '');
      setWarrantyPurchaseDate(todayStr);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setWarrantyExpiresOn(nextYear.toISOString().split('T')[0]);
      setWarrantyNotes('');
    }
    setFormError(null);
  }, [initialTransaction, isClone, isOpen, accounts, prefillNote, prefillType]);

  useEffect(() => {
    if (isOpen) {
      useAppStore.getState().loadAccounts(false);
      useAppStore.getState().loadCategories();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeAccounts = accounts.filter((a) => a.is_archived === 0 || a.id === accountId);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const baseCurrency = settings?.base_currency || 'INR';

  const filteredCategories = categories.filter((c) => c.kind === txnType);

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    if (!accountId) {
      setFormError('Please select an account');
      return;
    }

    if (txnType === 'transfer') {
      if (!transferToAccountId) {
        setFormError('Please select a destination account for the transfer');
        return;
      }
      if (transferToAccountId === accountId) {
        setFormError('Source and destination accounts must be different');
        return;
      }
    }

    if (trackWarranty) {
      if (!warrantyExpiresOn) {
        setFormError('Please select a warranty expiry date');
        return;
      }
      if (!warrantyItemName.trim() && !note.trim()) {
        setFormError('Please provide an item name for the warranty');
        return;
      }
    }

    const warrantyPayload = trackWarranty
      ? {
          item_name: warrantyItemName.trim() || note.trim() || 'Item',
          purchase_date: warrantyPurchaseDate || txnDate,
          expires_on: warrantyExpiresOn,
          notes: warrantyNotes.trim() || null,
        }
      : null;

    setIsSubmitting(true);
    try {
      if (isEditing && initialTransaction) {
        const payload: UpdateTransactionPayload = {
          account_id: accountId,
          type: txnType,
          category_id: txnType === 'transfer' ? null : categoryId,
          transfer_to_account_id: txnType === 'transfer' ? transferToAccountId : null,
          amount: parsedAmount,
          payment_type: paymentType,
          txn_date: txnDate,
          note: note.trim() || null,
          is_confirmed: isConfirmed,
          tags,
          warranty: warrantyPayload,
        };
        await updateTransaction(initialTransaction.id, payload);
      } else {
        const payload: CreateTransactionPayload = {
          account_id: accountId,
          type: txnType,
          category_id: txnType === 'transfer' ? null : categoryId,
          transfer_to_account_id: txnType === 'transfer' ? transferToAccountId : null,
          amount: parsedAmount,
          payment_type: paymentType,
          txn_date: txnDate,
          note: note.trim() || null,
          is_confirmed: isConfirmed,
          tags,
          warranty: warrantyPayload,
        };
        await createTransaction(payload);
      }
      onSaved?.();
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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">
              {isClone
                ? 'Clone Transaction'
                : isEditing
                ? 'Edit Transaction'
                : 'New Transaction'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isClone
                ? 'Pre-filled with past transaction details'
                : 'Atomic ledger-backed record'}
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
        <form id="txn-form" onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 custom-scrollbar">
          {/* Invisible submit button for Enter key form submission */}
          <button type="submit" className="hidden" aria-hidden="true" />

          {formError && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-900/60 text-red-400 text-xs">
              {formError}
            </div>
          )}

          {/* Type Toggle: Expense / Income / Transfer */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setTxnType('expense');
                setCategoryId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                txnType === 'expense'
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
                setTxnType('income');
                setCategoryId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                txnType === 'income'
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
                setTxnType('transfer');
                setCategoryId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                txnType === 'transfer'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transfer
            </button>
          </div>

          {/* Source Account Picker */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              {txnType === 'transfer' ? 'Transfer From Account *' : 'Account *'}
            </label>
            <select
              required
              value={accountId}
              onChange={(e) => setAccountId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency} • Bal:{' '}
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: acc.currency,
                  }).format(acc.current_balance)}
                  )
                </option>
              ))}
            </select>
          </div>

          {/* Destination Account Picker (for Transfers) */}
          {txnType === 'transfer' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Transfer To Account *
              </label>
              <select
                required
                value={transferToAccountId || ''}
                onChange={(e) => setTransferToAccountId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">-- Select Destination Account --</option>
                {activeAccounts
                  .filter((acc) => acc.id !== accountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency} • Bal:{' '}
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: acc.currency,
                      }).format(acc.current_balance)}
                      )
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Category Picker (for Income / Expense) */}
          {txnType !== 'transfer' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Category
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">Uncategorized</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `↳ ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
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
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Currency
              </label>
              <div className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-zinc-400 flex items-center justify-between">
                <span>{selectedAccount?.currency || baseCurrency}</span>
                {selectedAccount && selectedAccount.currency !== baseCurrency && (
                  <span className="text-[10px] text-zinc-400">FX</span>
                )}
              </div>
            </div>
          </div>

          {/* Date and Payment Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-400">
                  Date *
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTxnDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0])}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() - 86400000);
                      setTxnDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={txnDate}
                onChange={(e) => {
                  setTxnDate(e.target.value);
                  (e.target as HTMLInputElement).blur();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-purple-500 cursor-pointer font-mono transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Payment Method
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
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
                    <option value="card">Debit/Credit Card</option>
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

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Note / Description
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Dinner with friends, Netflix subscription"
              className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Tags (Create on the fly) */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag & press Enter"
                className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 text-[11px] border border-purple-300 dark:border-purple-800 font-mono font-bold"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Optional Warranty Tracking (Part 3 Task 5) */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`w-5 h-5 ${trackWarranty ? 'text-indigo-400' : 'text-zinc-500'}`} />
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Track Warranty
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Track item warranty expiration with alerts
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTrackWarranty(!trackWarranty)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  trackWarranty
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:border-purple-500'
                }`}
              >
                {trackWarranty ? 'Tracking On' : 'Track Warranty'}
              </button>
            </div>

            {trackWarranty && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={warrantyItemName}
                    onChange={(e) => setWarrantyItemName(e.target.value)}
                    placeholder={note || 'e.g. Sony WH-1000XM5'}
                    className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={warrantyPurchaseDate}
                      onChange={(e) => {
                        setWarrantyPurchaseDate(e.target.value);
                        (e.target as HTMLInputElement).blur();
                      }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Expires On *
                    </label>
                    <input
                      type="date"
                      value={warrantyExpiresOn}
                      onChange={(e) => {
                        setWarrantyExpiresOn(e.target.value);
                        (e.target as HTMLInputElement).blur();
                      }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Warranty Notes / Receipt Details
                  </label>
                  <input
                    type="text"
                    value={warrantyNotes}
                    onChange={(e) => setWarrantyNotes(e.target.value)}
                    placeholder="Invoice #12345, 2 year extended coverage"
                    className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirmed / Pending Toggle (Wallet's green check) */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isConfirmed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Clock className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <span className="text-xs font-semibold text-white block">
                  {isConfirmed ? 'Confirmed Transaction' : 'Pending / Uncleared'}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {isConfirmed
                    ? 'Verified expense/income, included in reports'
                    : 'Uncleared or expected payment (still impacts balance)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirmed(!isConfirmed)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                isConfirmed
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              {isConfirmed ? 'Confirmed' : 'Pending'}
            </button>
          </div>
        </form>

        {/* Sticky Actions Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/95 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="txn-form"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
          >
            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Record Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
};
