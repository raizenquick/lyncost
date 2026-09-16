import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Account, AccountLedgerEntry, AccountType, CreateAccountPayload, UpdateAccountPayload } from '../types';
import {
  WalletCards,
  Building2,
  Banknote,
  TrendingUp,
  CreditCard,
  Plus,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit2,
  ListOrdered,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { formatIndianDateTime, formatIndianCurrency } from '../lib/utils';

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { type: 'bank', label: 'Bank Account', icon: Building2 },
  { type: 'cash', label: 'Cash Wallet', icon: Banknote },
  { type: 'investment', label: 'Investment Portfolio', icon: TrendingUp },
  { type: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { type: 'other', label: 'Other Asset/Account', icon: WalletCards },
];

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#eab308', // Yellow
  '#64748b', // Slate
];

export const AccountsPage: React.FC = () => {
  const accounts = useAppStore(state => state.accounts);
  const loadAccounts = useAppStore(state => state.loadAccounts);
  const createAccount = useAppStore(state => state.createAccount);
  const updateAccount = useAppStore(state => state.updateAccount);
  const archiveAccount = useAppStore(state => state.archiveAccount);
  const deleteAccount = useAppStore(state => state.deleteAccount);
  const fetchLedger = useAppStore(state => state.fetchLedger);

  const [showArchived, setShowArchived] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [viewingLedgerAccount, setViewingLedgerAccount] = useState<Account | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<AccountLedgerEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState('INR');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    loadAccounts(showArchived);
  }, [showArchived, loadAccounts]);

  const resetForm = () => {
    setName('');
    setAccountType('bank');
    setCurrency('INR');
    setOpeningBalance('0');
    setSelectedColor(PRESET_COLORS[0]);
    setFormError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setAccountType(account.type);
    setCurrency(account.currency);
    setSelectedColor(account.color || PRESET_COLORS[0]);
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Account name is required');
      return;
    }

    const openBalNum = parseFloat(openingBalance);
    if (isNaN(openBalNum) || openBalNum < 0) {
      setFormError('Opening balance must be a valid positive number or zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateAccountPayload = {
        name: trimmedName,
        type: accountType,
        currency: currency.toUpperCase().trim() || 'INR',
        opening_balance: openBalNum,
        color: selectedColor,
      };
      await createAccount(payload);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Account name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateAccountPayload = {
        name: trimmedName,
        type: accountType,
        currency: currency.toUpperCase().trim() || 'INR',
        color: selectedColor,
      };
      await updateAccount(editingAccount.id, payload);
      setEditingAccount(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (account: Account) => {
    try {
      await archiveAccount(account.id, account.is_archived === 0);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (account: Account) => {
    if (
      !window.confirm(
        `Are you sure you want to delete account "${account.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteAccount(account.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleViewLedger = async (account: Account) => {
    setViewingLedgerAccount(account);
    setIsLoadingLedger(true);
    try {
      const entries = await fetchLedger(account.id);
      setLedgerEntries(entries);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const filteredAccounts = accounts.filter((a) =>
    showArchived ? true : a.is_archived === 0
  );

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
        return <WalletCards className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Accounts</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Maintain bank accounts, cash wallets, and investment books
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-700 select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span>Show Archived</span>
          </label>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <div className="p-12 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center bg-zinc-900/40">
          <WalletCards className="w-12 h-12 text-zinc-600 mb-3" />
          <h3 className="text-base font-semibold text-zinc-300">
            {showArchived ? 'No accounts found' : 'No active accounts'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            Add your first account (bank, cash, or investment) to start tracking.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Create Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => {
            const isArchived = account.is_archived === 1;
            return (
              <div
                key={account.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isArchived
                    ? 'bg-zinc-950/40 border-zinc-850 opacity-65'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
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
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          {account.name}
                          {isArchived && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-normal">
                              Archived
                            </span>
                          )}
                        </h4>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                          {account.type.replace('_', ' ')} • {account.currency}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="View Ledger"
                        onClick={() => handleViewLedger(account)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Edit Account"
                        onClick={() => openEditModal(account)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title={isArchived ? 'Restore Account' : 'Archive Account'}
                        onClick={() => handleToggleArchive(account)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {isArchived ? (
                          <ArchiveRestore className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Delete Account"
                        onClick={() => handleDelete(account)}
                        className="p-1.5 rounded-lg hover:bg-red-950/50 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mt-4">
                    <span className="text-[11px] text-zinc-400">Current Balance</span>
                    <p className="text-2xl font-extrabold text-emerald-400 tracking-tight">
                      {formatIndianCurrency(account.current_balance, account.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>
                    Opening: {formatIndianCurrency(account.opening_balance, account.currency)}
                  </span>
                  <span>ID #{account.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
              <h3 className="text-base font-bold text-white">Create New Account</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="create-acc-form" onSubmit={handleCreateSubmit} className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 custom-scrollbar">
              {/* Invisible submit button for Enter key form submission */}
              <button type="submit" className="hidden" aria-hidden="true" />
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-900/60 text-red-400 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. HDFC Salary, Wallet, Zerodha"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Account Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = accountType === t.type;
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setAccountType(t.type)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/15 border-purple-500 text-purple-300 font-semibold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Currency *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    placeholder="INR"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Opening Balance *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Color Tag
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer border ${
                        selectedColor === c
                          ? 'border-white scale-110 shadow-md'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </form>

            {/* Sticky Actions Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/95 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-acc-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
              <h3 className="text-base font-bold text-white">Edit Account</h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="edit-acc-form"
              onSubmit={handleEditSubmit}
              className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              {/* Invisible submit button for Enter key form submission */}
              <button type="submit" className="hidden" aria-hidden="true" />
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-900/60 text-red-400 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Account Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = accountType === t.type;
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setAccountType(t.type)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/15 border-purple-500 text-purple-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Currency *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Color Tag
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer border ${
                        selectedColor === c
                          ? 'border-white scale-110 shadow-md'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/90">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-acc-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Ledger Inspection Modal */}
      {viewingLedgerAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-400" />
                  Audit Ledger — {viewingLedgerAccount.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Immutable record of every balance change for this account
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingLedgerAccount(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4">
              {isLoadingLedger ? (
                <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading ledger rows...</span>
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  No ledger entries found for this account.
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-zinc-850/50">
                          <td className="p-3 text-zinc-400 font-mono">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              {formatIndianDateTime(entry.txn_date)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="capitalize px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300 font-medium">
                              {entry.txn_type}
                            </span>
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-semibold ${
                              entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {entry.amount >= 0 ? '+' : ''}
                            {formatIndianCurrency(entry.amount, viewingLedgerAccount.currency)}
                          </td>
                          <td className="p-3 text-right font-mono text-zinc-200">
                            {formatIndianCurrency(entry.balance_after, viewingLedgerAccount.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingLedgerAccount(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
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
