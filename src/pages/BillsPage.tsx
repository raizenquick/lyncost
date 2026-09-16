import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { BillItem, BillRecurrence, CreateBillPayload } from '../types';
import {
  Receipt,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Repeat,
  Trash2,
  Edit2,
  X,
  CreditCard,
  RefreshCw,
  RotateCcw,
  Info,
} from 'lucide-react';
import { formatIndianDate, formatIndianCurrency } from '../lib/utils';

export const BillsPage: React.FC = () => {
  const bills = useAppStore(state => state.bills);
  const accounts = useAppStore(state => state.accounts);
  const categories = useAppStore(state => state.categories);
  const settings = useAppStore(state => state.settings);
  const createBill = useAppStore(state => state.createBill);
  const updateBill = useAppStore(state => state.updateBill);
  const deleteBill = useAppStore(state => state.deleteBill);
  const markBillPaid = useAppStore(state => state.markBillPaid);
  const unmarkBillPaid = useAppStore(state => state.unmarkBillPaid);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'paid'>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [recurrence, setRecurrence] = useState<BillRecurrence>('none');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paying / Deleting IDs
  const [payingId, setPayingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const baseCurrency = settings?.base_currency || 'INR';
  const activeAccounts = accounts.filter((a) => a.is_archived === 0);
  const expenseCategories = categories.filter((c) => c.kind === 'expense');

  const upcomingBills = bills.filter((b) => b.is_paid === 0);
  const paidBills = bills.filter((b) => b.is_paid === 1);
  const displayedBills = activeTab === 'upcoming' ? upcomingBills : paidBills;

  const overdueCount = upcomingBills.filter((b) => b.is_overdue).length;

  const openCreateModal = () => {
    setEditingBill(null);
    setName('');
    setAmount('');
    setDueDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setAccountId(activeAccounts[0]?.id || null);
    setCategoryId(null);
    setRecurrence('none');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bill: BillItem) => {
    setEditingBill(bill);
    setName(bill.name);
    setAmount(bill.amount.toString());
    setDueDate(bill.due_date);
    setAccountId(bill.account_id || null);
    setCategoryId(bill.category_id || null);
    setRecurrence(bill.recurrence || 'none');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (!name.trim()) {
      setFormError('Bill name is required');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }
    if (!dueDate) {
      setFormError('Due date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBill) {
        await updateBill(editingBill.id, {
          name: name.trim(),
          amount: parsedAmount,
          due_date: dueDate,
          account_id: accountId,
          category_id: categoryId,
          is_paid: editingBill.is_paid === 1,
          recurrence,
        });
      } else {
        const payload: CreateBillPayload = {
          name: name.trim(),
          amount: parsedAmount,
          due_date: dueDate,
          account_id: accountId,
          category_id: categoryId,
          recurrence,
        };
        await createBill(payload);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = async (bill: BillItem) => {
    const accName = bill.account_name || 'your default account';
    if (
      !window.confirm(
        `Are you sure you want to mark "${bill.name}" as paid now?\n\nThis will immediately deduct ${baseCurrency} ${bill.amount.toFixed(
          2
        )} from ${accName} and record a paid expense in your ledger today.`
      )
    ) {
      return;
    }

    setPayingId(bill.id);
    try {
      await markBillPaid(bill.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setPayingId(null);
    }
  };

  const handleUnpay = async (bill: BillItem) => {
    if (
      !window.confirm(
        `Undo payment for "${bill.name}"?\n\nThis will revert the payment transaction, restore ${baseCurrency} ${bill.amount.toFixed(
          2
        )} back to your account balance, and return this bill to Upcoming Dues.`
      )
    ) {
      return;
    }

    setPayingId(bill.id);
    try {
      await unmarkBillPaid(bill.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setPayingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBill(id);
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
            <Receipt className="w-6 h-6 text-purple-400" />
            Bills & Reminders
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Track upcoming dues and payment reminders. Balance is only deducted when you mark a bill as paid.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Bill
        </button>
      </div>

      {/* Helpful Info Banner */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-950/25 border border-purple-800/40 text-xs text-purple-200">
        <Info className="w-4 h-4 text-purple-400 shrink-0" />
        <span>
          <strong>Upcoming Dues are scheduled reminders.</strong> They do <em>not</em> deduct from your account balances or net worth until you explicitly choose to mark them as paid on or before their due date.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Upcoming Dues ({upcomingBills.length})</span>
          {overdueCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
              {overdueCount} Overdue
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paid')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'paid'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Paid History ({paidBills.length})
        </button>
      </div>

      {/* Bills Feed */}
      {displayedBills.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
          <Receipt className="w-12 h-12 text-zinc-600 mx-auto mb-3 stroke-1" />
          <h3 className="text-sm font-semibold text-zinc-300">
            {activeTab === 'upcoming' ? 'No Upcoming Bills' : 'No Paid Bills History'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            {activeTab === 'upcoming'
              ? 'Add rent, utilities, credit card dues, or loan reminders to never miss a payment.'
              : 'Bills marked as paid will appear here alongside their real ledger transactions.'}
          </p>
          {activeTab === 'upcoming' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
            >
              Add a Bill
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedBills.map((bill) => {
            const isOverdue = bill.is_overdue && bill.is_paid === 0;

            return (
              <div
                key={bill.id}
                className={`bg-zinc-900/80 rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                  isOverdue
                    ? 'border-rose-500/50 bg-rose-950/10'
                    : 'border-zinc-800/80 hover:border-zinc-700/80'
                }`}
              >
                {/* Left: Bill Details */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isOverdue
                        ? 'bg-rose-500/20 text-rose-400'
                        : bill.is_paid === 1
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {bill.is_paid === 1 ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isOverdue ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Receipt className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">{bill.name}</h4>
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                          Overdue
                        </span>
                      )}
                      {bill.recurrence && bill.recurrence !== 'none' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 capitalize flex items-center gap-1">
                          <Repeat className="w-2.5 h-2.5" />
                          {bill.recurrence}
                        </span>
                      )}
                      {bill.is_paid === 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Paid
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        Due: <strong className={isOverdue ? 'text-rose-400' : 'text-zinc-300'}>{formatIndianDate(bill.due_date)}</strong>
                      </span>
                      {bill.account_name && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                          {bill.account_name}
                        </span>
                      )}
                      {bill.category_name && (
                        <span className="text-zinc-500">
                          Category: {bill.category_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                  <div className="text-left sm:text-right">
                    <span className="text-base font-bold text-white block font-mono">
                      {formatIndianCurrency(bill.amount, baseCurrency)}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {bill.is_paid === 1 ? 'Recorded in ledger' : 'Pending payment'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {bill.is_paid === 0 ? (
                      <button
                        type="button"
                        onClick={() => handlePay(bill)}
                        disabled={payingId === bill.id}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-950/50 transition-colors disabled:opacity-50"
                      >
                        {payingId === bill.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Mark as Paid
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnpay(bill)}
                        disabled={payingId === bill.id}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-purple-300 hover:text-purple-200 border border-purple-500/25 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                        title="Revert this payment and return money to your account"
                      >
                        {payingId === bill.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Undo Payment
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(bill)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Edit Bill"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(bill.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingBill ? 'Edit Bill' : 'Add Upcoming Bill'}
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
            <form id="bill-form" onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 custom-scrollbar">
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
                  Bill Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. WiFi Bill, Electricity, Credit Card"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
                />
              </div>

              {/* Amount & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Amount ({baseCurrency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer font-mono transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Account Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Pay From Account
                </label>
                <select
                  value={accountId || ''}
                  onChange={(e) => setAccountId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3.5 py-2.5 rounded-xl  font-bold text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Auto select default account --</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency} {a.current_balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3.5 py-2.5 rounded-xl  font-bold text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select Category --</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Recurrence
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'monthly', 'yearly'] as BillRecurrence[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRecurrence(r)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-colors cursor-pointer ${
                        recurrence === r
                          ? 'bg-purple-600/25 text-purple-300 border-purple-500/50 font-bold shadow-sm'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {r === 'none' ? 'One-time' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Informational helper */}
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] text-zinc-400">
                <span className="font-semibold text-purple-300">Payment Reminder:</span> This creates a reminder for <strong className="text-zinc-200">{dueDate || 'the selected date'}</strong>. No money is deducted from your account until you explicitly mark it as paid.
              </div>
            </form>

            {/* Sticky Actions Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/95 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="bill-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
              >
                {editingBill ? 'Save Changes' : 'Add Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete Bill?</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Are you sure you want to delete this bill reminder?
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
