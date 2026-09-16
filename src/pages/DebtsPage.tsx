import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Percent,
  X,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  ShoppingBag,
  Search,
  Clock,
  TrendingDown,
  Sparkles,
  Building2,
  Users,
  Briefcase,
  PiggyBank,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  CreateDebtPayload,
  DebtItem,
  DebtTransactionItem,
  UpdateDebtPayload,
  RecordDebtPaymentPayload,
  DrawDebtFundsPayload,
  SpendFromDebtPayload,
} from '../types';

const DEBT_TYPE_LABELS: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  personal_loan: { label: 'Personal Loan', icon: Building2 },
  credit_line: { label: 'Credit Line / Overdraft', icon: CreditCard },
  credit_card: { label: 'Credit Card', icon: CreditCard },
  friend_family: { label: 'Friend & Family', icon: Users },
  business_loan: { label: 'Business / Micro Loan', icon: Briefcase },
  mortgage_auto: { label: 'Auto / Mortgage Loan', icon: PiggyBank },
  other: { label: 'Other Liability', icon: Layers },
};

export const DebtsPage: React.FC = () => {
  const debts = useAppStore(state => state.debts);
  const accounts = useAppStore(state => state.accounts);
  const categories = useAppStore(state => state.categories);
  const settings = useAppStore(state => state.settings);
  const theme = useAppStore(state => state.theme);

  const loadDebts = useAppStore(state => state.loadDebts);
  const loadAccounts = useAppStore(state => state.loadAccounts);
  const loadCategories = useAppStore(state => state.loadCategories);
  const createDebt = useAppStore(state => state.createDebt);
  const updateDebt = useAppStore(state => state.updateDebt);
  const deleteDebt = useAppStore(state => state.deleteDebt);
  const getDebtTransactions = useAppStore(state => state.getDebtTransactions);
  const recordDebtPayment = useAppStore(state => state.recordDebtPayment);
  const drawDebtFunds = useAppStore(state => state.drawDebtFunds);
  const spendFromDebt = useAppStore(state => state.spendFromDebt);

  const baseCurrency = settings?.base_currency || 'INR';

  // Active filter tab: 'all' | 'active' | 'due_soon' | 'settled'
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'due_soon' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [paymentModalDebt, setPaymentModalDebt] = useState<DebtItem | null>(null);
  const [drawModalDebt, setDrawModalDebt] = useState<DebtItem | null>(null);
  const [spendModalDebt, setSpendModalDebt] = useState<DebtItem | null>(null);
  const [historyModalDebt, setHistoryModalDebt] = useState<DebtItem | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History transactions state
  const [historyItems, setHistoryItems] = useState<DebtTransactionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add Form State
  const [addForm, setAddForm] = useState<{
    name: string;
    debt_type: string;
    principal: number | '';
    draw_preset: 'full' | 'half' | 'zero' | 'custom';
    initial_draw: number | '';
    deposit_to_account: boolean;
    deposit_account_id: number | '';
    interest_rate: number | '';
    due_date: string;
    min_payment: number | '';
    notes: string;
  }>({
    name: '',
    debt_type: 'personal_loan',
    principal: '',
    draw_preset: 'full',
    initial_draw: '',
    deposit_to_account: true,
    deposit_account_id: '',
    interest_rate: '',
    due_date: '',
    min_payment: '',
    notes: '',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateDebtPayload>({
    name: '',
    principal: 0,
    current_balance: 0,
    total_borrowed: 0,
    total_paid: 0,
    debt_type: 'personal_loan',
    interest_rate: 0,
    due_date: '',
    min_payment: 0,
    account_id: null,
    notes: '',
    is_active: 1,
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState<{
    amount: number | '';
    txn_date: string;
    link_account: boolean;
    account_id: number | '';
    notes: string;
  }>({
    amount: '',
    txn_date: new Date().toISOString().split('T')[0],
    link_account: true,
    account_id: '',
    notes: '',
  });

  // Draw Form State
  const [drawForm, setDrawForm] = useState<{
    amount: number | '';
    txn_date: string;
    deposit_to_account: boolean;
    account_id: number | '';
    notes: string;
  }>({
    amount: '',
    txn_date: new Date().toISOString().split('T')[0],
    deposit_to_account: true,
    account_id: '',
    notes: '',
  });

  // Spend Form State
  const [spendForm, setSpendForm] = useState<{
    amount: number | '';
    txn_date: string;
    category_id: number | '';
    notes: string;
  }>({
    amount: '',
    txn_date: new Date().toISOString().split('T')[0],
    category_id: '',
    notes: '',
  });

  useEffect(() => {
    loadDebts();
    loadAccounts();
    loadCategories();
  }, [loadDebts, loadAccounts, loadCategories]);

  // Available active bank/cash accounts
  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.is_archived === 0);
  }, [accounts]);

  // Expense categories
  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.kind === 'expense');
  }, [categories]);

  // Formatted currency helper
  const fmtCurr = (val: number | null | undefined) => formatCurrency(val ?? 0, baseCurrency);

  // Due date status helper
  const getDueStatus = (dueDateStr?: string | null, isSettled?: boolean) => {
    if (isSettled) return { label: 'Settled', tone: 'settled' };
    if (!dueDateStr) return { label: 'No due date', tone: 'none' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, tone: 'overdue' };
    } else if (diffDays === 0) {
      return { label: 'Due today', tone: 'today' };
    } else if (diffDays <= 7) {
      return { label: `Due in ${diffDays}d`, tone: 'soon' };
    } else if (diffDays <= 14) {
      return { label: `Due in ${diffDays}d`, tone: 'near' };
    }
    return { label: `Due ${formatDate(dueDateStr)}`, tone: 'normal' };
  };

  // KPIs
  const activeDebts = debts.filter((d) => d.is_active === 1 && d.current_balance > 0);
  const totalOutstanding = activeDebts.reduce((sum, d) => sum + d.current_balance, 0);
  const totalPrincipal = debts.reduce((sum, d) => sum + d.principal, 0);
  const totalRepaid = debts.reduce((sum, d) => sum + (d.total_paid || 0), 0);
  const totalAvailableCredit = activeDebts.reduce((sum, d) => {
    const avail = d.principal - d.current_balance;
    return sum + (avail > 0 ? avail : 0);
  }, 0);

  // Filtered debts list
  const filteredDebts = useMemo(() => {
    return debts.filter((debt) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = debt.name.toLowerCase().includes(q);
        const matchesNotes = debt.notes?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesNotes) return false;
      }

      // Tab filter
      if (filterTab === 'active') {
        return debt.is_active === 1 && debt.current_balance > 0;
      }
      if (filterTab === 'settled') {
        return debt.is_active === 0 || debt.current_balance <= 0;
      }
      if (filterTab === 'due_soon') {
        if (debt.is_active === 0 || debt.current_balance <= 0 || !debt.due_date) return false;
        const status = getDueStatus(debt.due_date, false);
        return status.tone === 'overdue' || status.tone === 'today' || status.tone === 'soon' || status.tone === 'near';
      }
      return true;
    });
  }, [debts, filterTab, searchQuery]);

  // Open Add Modal
  const openAddModal = () => {
    setAddForm({
      name: '',
      debt_type: 'personal_loan',
      principal: '',
      draw_preset: 'full',
      initial_draw: '',
      deposit_to_account: activeAccounts.length > 0,
      deposit_account_id: activeAccounts.length > 0 ? activeAccounts[0].id : '',
      interest_rate: '',
      due_date: '',
      min_payment: '',
      notes: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Handle Preset Change for Add Form
  const handlePrincipalChange = (valStr: string) => {
    const principalNum = valStr === '' ? '' : Math.max(0, parseFloat(valStr) || 0);
    let drawNum: number | '' = '';

    if (typeof principalNum === 'number') {
      if (addForm.draw_preset === 'full') drawNum = principalNum;
      else if (addForm.draw_preset === 'half') drawNum = Math.round((principalNum / 2) * 100) / 100;
      else if (addForm.draw_preset === 'zero') drawNum = 0;
      else drawNum = addForm.initial_draw;
    }

    setAddForm((prev) => ({
      ...prev,
      principal: principalNum,
      initial_draw: drawNum,
    }));
  };

  const handleDrawPresetChange = (preset: 'full' | 'half' | 'zero' | 'custom') => {
    const principalNum = typeof addForm.principal === 'number' ? addForm.principal : 0;
    let drawNum: number | '' = '';

    if (preset === 'full') drawNum = principalNum;
    else if (preset === 'half') drawNum = Math.round((principalNum / 2) * 100) / 100;
    else if (preset === 'zero') drawNum = 0;
    else drawNum = addForm.initial_draw !== '' ? addForm.initial_draw : principalNum;

    setAddForm((prev) => ({
      ...prev,
      draw_preset: preset,
      initial_draw: drawNum,
    }));
  };

  // Create Debt Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!addForm.name.trim()) {
      setFormError('Please enter a name for the loan or credit facility');
      return;
    }
    const principalVal = typeof addForm.principal === 'number' ? addForm.principal : 0;
    if (principalVal <= 0) {
      setFormError('Sanctioned limit / principal must be greater than 0');
      return;
    }

    const drawVal = typeof addForm.initial_draw === 'number' ? addForm.initial_draw : 0;
    if (drawVal < 0) {
      setFormError('Initial drawn amount cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateDebtPayload = {
        name: addForm.name.trim(),
        principal: principalVal,
        initial_draw: drawVal,
        current_balance: drawVal,
        debt_type: addForm.debt_type,
        interest_rate: typeof addForm.interest_rate === 'number' ? addForm.interest_rate : 0,
        due_date: addForm.due_date.trim() || null,
        min_payment: typeof addForm.min_payment === 'number' ? addForm.min_payment : null,
        deposit_account_id:
          addForm.deposit_to_account && addForm.deposit_account_id !== '' && drawVal > 0
            ? Number(addForm.deposit_account_id)
            : null,
        notes: addForm.notes.trim() || null,
      };

      await createDebt(payload);
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (debt: DebtItem) => {
    setEditingDebt(debt);
    setEditForm({
      name: debt.name,
      principal: debt.principal,
      current_balance: debt.current_balance,
      total_borrowed: debt.total_borrowed,
      total_paid: debt.total_paid,
      debt_type: debt.debt_type || 'personal_loan',
      interest_rate: debt.interest_rate,
      due_date: debt.due_date || '',
      min_payment: debt.min_payment || 0,
      account_id: debt.account_id ?? null,
      notes: debt.notes || '',
      is_active: debt.is_active,
    });
    setFormError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    setFormError(null);

    if (!editForm.name.trim()) {
      setFormError('Debt name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDebt(editingDebt.id, {
        ...editForm,
        name: editForm.name.trim(),
        due_date: editForm.due_date?.trim() || null,
        notes: editForm.notes?.trim() || null,
      });
      setEditingDebt(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (debt: DebtItem) => {
    setPaymentModalDebt(debt);
    const suggestedAmount = debt.min_payment && debt.min_payment > 0 && debt.min_payment < debt.current_balance
      ? debt.min_payment
      : debt.current_balance;

    setPaymentForm({
      amount: suggestedAmount > 0 ? suggestedAmount : '',
      txn_date: new Date().toISOString().split('T')[0],
      link_account: activeAccounts.length > 0,
      account_id: activeAccounts.length > 0 ? activeAccounts[0].id : '',
      notes: '',
    });
    setFormError(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalDebt) return;
    setFormError(null);

    const amount = typeof paymentForm.amount === 'number' ? paymentForm.amount : 0;
    if (amount <= 0) {
      setFormError('Repayment amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RecordDebtPaymentPayload = {
        debt_id: paymentModalDebt.id,
        amount,
        txn_date: paymentForm.txn_date,
        account_id: paymentForm.link_account && paymentForm.account_id !== '' ? Number(paymentForm.account_id) : null,
        notes: paymentForm.notes.trim() || null,
      };

      await recordDebtPayment(payload);
      setPaymentModalDebt(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Draw Modal
  const openDrawModal = (debt: DebtItem) => {
    setDrawModalDebt(debt);
    const available = Math.max(0, debt.principal - debt.current_balance);
    setDrawForm({
      amount: available > 0 ? available : '',
      txn_date: new Date().toISOString().split('T')[0],
      deposit_to_account: activeAccounts.length > 0,
      account_id: activeAccounts.length > 0 ? activeAccounts[0].id : '',
      notes: '',
    });
    setFormError(null);
  };

  const handleDrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawModalDebt) return;
    setFormError(null);

    const amount = typeof drawForm.amount === 'number' ? drawForm.amount : 0;
    if (amount <= 0) {
      setFormError('Draw amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: DrawDebtFundsPayload = {
        debt_id: drawModalDebt.id,
        amount,
        txn_date: drawForm.txn_date,
        account_id: drawForm.deposit_to_account && drawForm.account_id !== '' ? Number(drawForm.account_id) : null,
        notes: drawForm.notes.trim() || null,
      };

      await drawDebtFunds(payload);
      setDrawModalDebt(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Spend Modal
  const openSpendModal = (debt: DebtItem) => {
    setSpendModalDebt(debt);
    setSpendForm({
      amount: '',
      txn_date: new Date().toISOString().split('T')[0],
      category_id: expenseCategories.length > 0 ? expenseCategories[0].id : '',
      notes: '',
    });
    setFormError(null);
  };

  const handleSpendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendModalDebt) return;
    setFormError(null);

    const amount = typeof spendForm.amount === 'number' ? spendForm.amount : 0;
    if (amount <= 0) {
      setFormError('Expense amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SpendFromDebtPayload = {
        debt_id: spendModalDebt.id,
        amount,
        txn_date: spendForm.txn_date,
        category_id: spendForm.category_id !== '' ? Number(spendForm.category_id) : null,
        notes: spendForm.notes.trim() || null,
      };

      await spendFromDebt(payload);
      setSpendModalDebt(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open History / Ledger Modal
  const openHistoryModal = async (debt: DebtItem) => {
    setHistoryModalDebt(debt);
    setLoadingHistory(true);
    try {
      const txns = await getDebtTransactions(debt.id);
      setHistoryItems(txns);
    } catch (err) {
      console.error(err);
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleDebtActive = async (debt: DebtItem) => {
    try {
      await updateDebt(debt.id, {
        name: debt.name,
        principal: debt.principal,
        current_balance: debt.current_balance,
        total_borrowed: debt.total_borrowed,
        total_paid: debt.total_paid,
        debt_type: debt.debt_type,
        interest_rate: debt.interest_rate,
        due_date: debt.due_date,
        min_payment: debt.min_payment,
        account_id: debt.account_id,
        notes: debt.notes,
        is_active: debt.is_active === 1 ? 0 : 1,
      });
    } catch (err: unknown) {
      alert(`Failed to update status: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-2.5 ${
            theme === 'light' ? 'text-zinc-950' : 'text-white'
          }`}>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CreditCard className="w-6 h-6 text-purple-400" />
            </div>
            Debts & Credit Facilities
          </h2>
          <p className={`text-xs mt-1.5 ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Manage loans, credit lines, friend borrowings, partial draws, and linked account repayments
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Loan / Facility
        </button>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Total Outstanding Debt
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-500 block font-mono">
              {fmtCurr(totalOutstanding)}
            </span>
            <span className={`text-[11px] mt-1 block ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Subtracted from Net Worth
            </span>
          </div>
        </div>

        {/* Available Credit Line */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Available Credit Line
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 block font-mono">
              {fmtCurr(totalAvailableCredit)}
            </span>
            <span className={`text-[11px] mt-1 block ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Remaining limit ready to draw
            </span>
          </div>
        </div>

        {/* Total Repaid Back */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Lifetime Repayments
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl sm:text-3xl font-extrabold block font-mono ${
              theme === 'light' ? 'text-zinc-900' : 'text-zinc-100'
            }`}>
              {fmtCurr(totalRepaid)}
            </span>
            <span className={`text-[11px] mt-1 block ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Total principal & dues cleared
            </span>
          </div>
        </div>

        {/* Sanctioned Facility Total */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Total Sanctioned Limit
            </span>
            <div className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl sm:text-3xl font-extrabold block font-mono ${
              theme === 'light' ? 'text-zinc-900' : 'text-zinc-100'
            }`}>
              {fmtCurr(totalPrincipal)}
            </span>
            <span className={`text-[11px] mt-1 block ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Across {debts.length} facilities ({activeDebts.length} active)
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-xl bg-zinc-800/40 border border-zinc-800/80">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              filterTab === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({debts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              filterTab === 'active'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Active ({activeDebts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('due_soon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              filterTab === 'due_soon'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Due Soon
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('settled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              filterTab === 'settled'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Settled ({debts.length - activeDebts.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search loans, lenders, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
              theme === 'light'
                ? 'bg-white border-zinc-200 text-zinc-900 focus:border-purple-500'
                : 'bg-zinc-900/80 border-zinc-800 text-white focus:border-purple-500'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Debts Grid / Cards */}
      {filteredDebts.length === 0 ? (
        <div className={`p-12 rounded-2xl border text-center ${
          theme === 'light' ? 'bg-white border-zinc-200' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <Layers className="w-12 h-12 mx-auto text-zinc-600 mb-3 opacity-60" />
          <h3 className={`text-base font-bold ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
            {searchQuery ? 'No matching facilities found' : 'No debts or loans recorded'}
          </h3>
          <p className={`text-xs mt-1 max-w-sm mx-auto ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {searchQuery
              ? 'Try changing your search terms or filter selection.'
              : 'Add your credit lines, personal loans, or informal borrowings to keep your true net worth accurate.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Your First Loan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDebts.map((debt) => {
            const isSettled = debt.is_active === 0 || debt.current_balance <= 0;
            const availableCredit = Math.max(0, debt.principal - debt.current_balance);
            const utilizationPct = debt.principal > 0 ? Math.min(100, Math.round((debt.current_balance / debt.principal) * 100)) : 0;
            const repaymentPct = (debt.total_borrowed || debt.principal) > 0
              ? Math.min(100, Math.round(((debt.total_paid || 0) / (debt.total_borrowed || debt.principal)) * 100))
              : 0;
            const dueStatus = getDueStatus(debt.due_date, isSettled);
            const TypeConfig = DEBT_TYPE_LABELS[debt.debt_type] || DEBT_TYPE_LABELS.other;
            const TypeIcon = TypeConfig.icon;

            return (
              <div
                key={debt.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative overflow-hidden group ${
                  theme === 'light'
                    ? 'bg-white border-zinc-200 hover:border-purple-300 shadow-sm'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                } ${isSettled ? 'opacity-70' : ''}`}
              >
                <div>
                  {/* Top Bar: Name, Type, Status Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${
                          theme === 'light' ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          <TypeIcon className="w-4 h-4" />
                        </span>
                        <h3 className={`font-bold text-base leading-tight ${
                          theme === 'light' ? 'text-zinc-950' : 'text-white'
                        }`}>
                          {debt.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          theme === 'light' ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-800/80 text-zinc-400'
                        }`}>
                          {TypeConfig.label}
                        </span>

                        {/* Due Status Badge */}
                        {debt.due_date && (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                            dueStatus.tone === 'overdue'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : dueStatus.tone === 'today' || dueStatus.tone === 'soon'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : theme === 'light'
                              ? 'bg-zinc-100 text-zinc-600'
                              : 'bg-zinc-800/80 text-zinc-400'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {dueStatus.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active/Settled Pill */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleDebtActive(debt)}
                        title={debt.is_active === 1 ? 'Click to mark as settled' : 'Click to reactivate'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          isSettled
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isSettled ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Settled
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Active
                          </>
                        )}
                      </button>

                      {/* Edit & Delete Action Icons */}
                      <button
                        type="button"
                        onClick={() => openEditModal(debt)}
                        title="Edit details"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Delete '${debt.name}' and its entire transaction history?`)) {
                            try {
                              await deleteDebt(debt.id);
                            } catch (err) {
                              alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
                            }
                          }
                        }}
                        title="Delete facility"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Numbers Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-zinc-800/40">
                    <div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider block ${
                        theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>
                        Current Balance
                      </span>
                      <span className="text-lg font-bold text-rose-500 font-mono block mt-0.5">
                        {fmtCurr(debt.current_balance)}
                      </span>
                    </div>

                    <div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider block ${
                        theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>
                        Available Credit
                      </span>
                      <span className="text-lg font-bold text-emerald-400 font-mono block mt-0.5">
                        {fmtCurr(availableCredit)}
                      </span>
                    </div>

                    <div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider block ${
                        theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>
                        Sanctioned Limit
                      </span>
                      <span className={`text-lg font-bold font-mono block mt-0.5 ${
                        theme === 'light' ? 'text-zinc-900' : 'text-zinc-200'
                      }`}>
                        {fmtCurr(debt.principal)}
                      </span>
                    </div>
                  </div>

                  {/* Progress / Utilization Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}>
                        Limit Utilization: <strong className="font-semibold text-zinc-300">{utilizationPct}%</strong>
                      </span>
                      <span className={theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}>
                        Repaid: <strong className="font-semibold text-emerald-400">{fmtCurr(debt.total_paid || 0)} ({repaymentPct}%)</strong>
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-zinc-800/80 overflow-hidden flex">
                      <div
                        style={{ width: `${utilizationPct}%` }}
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        title={`Utilized: ${utilizationPct}%`}
                      />
                      <div
                        style={{ width: `${100 - utilizationPct}%` }}
                        className="bg-emerald-500/30 h-full transition-all duration-500"
                        title={`Available: ${100 - utilizationPct}%`}
                      />
                    </div>
                  </div>

                  {/* Secondary info (Interest, Min payment, Notes) */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    {debt.interest_rate > 0 && (
                      <span className={`inline-flex items-center gap-1 ${
                        theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        <Percent className="w-3 h-3 text-zinc-400" />
                        {debt.interest_rate}% p.a.
                      </span>
                    )}

                    {debt.min_payment && debt.min_payment > 0 && (
                      <span className={`inline-flex items-center gap-1 ${
                        theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        <Clock className="w-3 h-3 text-zinc-400" />
                        EMI: <strong className="font-mono text-zinc-300">{fmtCurr(debt.min_payment)}</strong>
                      </span>
                    )}

                    {debt.notes && (
                      <span className={`italic truncate max-w-[200px] text-[11px] ${
                        theme === 'light' ? 'text-zinc-500' : 'text-zinc-500'
                      }`} title={debt.notes}>
                        "{debt.notes}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons Bar */}
                <div className="mt-5 pt-3 border-t border-zinc-800/40 grid grid-cols-4 gap-2">
                  {/* Make Repayment */}
                  <button
                    type="button"
                    onClick={() => openPaymentModal(debt)}
                    disabled={debt.current_balance <= 0}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group/btn"
                    title="Pay custom amount towards this debt"
                  >
                    <ArrowDownLeft className="w-4 h-4 mb-0.5 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Repay</span>
                  </button>

                  {/* Draw / Borrow More */}
                  <button
                    type="button"
                    onClick={() => openDrawModal(debt)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all cursor-pointer group/btn"
                    title="Draw additional money from this facility"
                  >
                    <ArrowUpRight className="w-4 h-4 mb-0.5 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Draw</span>
                  </button>

                  {/* Spend Direct */}
                  <button
                    type="button"
                    onClick={() => openSpendModal(debt)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all cursor-pointer group/btn"
                    title="Spend directly from this loan/card"
                  >
                    <ShoppingBag className="w-4 h-4 mb-0.5 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Spend</span>
                  </button>

                  {/* Transaction Ledger */}
                  <button
                    type="button"
                    onClick={() => openHistoryModal(debt)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-all cursor-pointer group/btn"
                    title="View all repayments, draws, and spends"
                  >
                    <History className="w-4 h-4 mb-0.5 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">History</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD LOAN / CREDIT FACILITY MODAL */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Loan / Credit Facility</h3>
                  <p className="text-xs text-zinc-400">Configure sanction limit, initial draw, and deposit destination</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              id="add-debt-form"
              onSubmit={handleCreateSubmit}
              className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Debt Name & Facility Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Facility / Loan Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Credit Card, Rahul Uncle Loan"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white transition-all focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Loan Type
                  </label>
                  <select
                    value={addForm.debt_type}
                    onChange={(e) => setAddForm({ ...addForm, debt_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white transition-all focus:outline-none"
                  >
                    {Object.entries(DEBT_TYPE_LABELS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sanctioned Limit / Total Principal */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Sanctioned Limit / Approved Principal ({baseCurrency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={0}
                  placeholder="0.00"
                  value={addForm.principal}
                  onChange={(e) => handlePrincipalChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm text-white font-mono transition-all focus:outline-none font-bold"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  The maximum credit limit or total approved loan amount
                </span>
              </div>

              {/* Initial Draw Selector & Amount */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200">
                    How much will you draw / utilize right now?
                  </label>
                </div>

                {/* Draw Preset Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDrawPresetChange('full')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      addForm.draw_preset === 'full'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Full (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDrawPresetChange('half')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      addForm.draw_preset === 'half'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Half (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDrawPresetChange('zero')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      addForm.draw_preset === 'zero'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    None (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDrawPresetChange('custom')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      addForm.draw_preset === 'custom'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Amount input for initial draw */}
                <div>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    placeholder="Drawn amount right now (0.00)"
                    value={addForm.initial_draw}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                      setAddForm({
                        ...addForm,
                        initial_draw: val,
                        draw_preset: 'custom',
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-xs text-white font-mono focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span>Initial Outstanding: <strong>{fmtCurr(Number(addForm.initial_draw) || 0)}</strong></span>
                    <span>
                      Available Line Left:{' '}
                      <strong className="text-emerald-400">
                        {fmtCurr(Math.max(0, (Number(addForm.principal) || 0) - (Number(addForm.initial_draw) || 0)))}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Deposit into Bank/Cash Account Option */}
                {Number(addForm.initial_draw) > 0 && activeAccounts.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addForm.deposit_to_account}
                        onChange={(e) => setAddForm({ ...addForm, deposit_to_account: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-zinc-900 border-zinc-700"
                      />
                      <span className="text-xs font-semibold text-zinc-200">
                        Deposit drawn funds into a Bank/Cash account as Income?
                      </span>
                    </label>

                    {addForm.deposit_to_account && (
                      <select
                        value={addForm.deposit_account_id}
                        onChange={(e) => setAddForm({ ...addForm, deposit_account_id: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none"
                      >
                        {activeAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type.toUpperCase()}) - Balance: {fmtCurr(acc.current_balance)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Interest Rate & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Interest Rate (% p.a.)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    placeholder="0.0"
                    value={addForm.interest_rate}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        interest_rate: e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Due / Next EMI Date
                  </label>
                  <input
                    type="date"
                    value={addForm.due_date}
                    onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 text-xs text-white font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Monthly EMI / Min Due
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    placeholder="0.00"
                    value={addForm.min_payment}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        min_payment: e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Notes & Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Lender contact info, loan terms, purpose of borrowing..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 focus:border-purple-500 text-xs text-white resize-none focus:outline-none"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/95">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-debt-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Create Facility'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REPAYMENT MODAL */}
      {/* ========================================================= */}
      {paymentModalDebt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Repayment</h3>
                  <p className="text-xs text-zinc-400">Pay towards {paymentModalDebt.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalDebt(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Outstanding Balance Reminder Banner */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Current Outstanding:</span>
                <span className="text-base font-extrabold text-rose-500 font-mono">
                  {fmtCurr(paymentModalDebt.current_balance)}
                </span>
              </div>

              {/* Repayment Amount */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Repayment Amount ({baseCurrency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={0.01}
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-sm text-white font-mono font-bold focus:outline-none"
                />

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amount: paymentModalDebt.current_balance })}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    Full Balance ({fmtCurr(paymentModalDebt.current_balance)})
                  </button>
                  {paymentModalDebt.current_balance > 100 && (
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, amount: Math.round(paymentModalDebt.current_balance / 2) })}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      50% Balance
                    </button>
                  )}
                  {paymentModalDebt.min_payment && paymentModalDebt.min_payment > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, amount: paymentModalDebt.min_payment })}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Monthly EMI ({fmtCurr(paymentModalDebt.min_payment)})
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.txn_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, txn_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>

              {/* Linked Deduct Account */}
              {activeAccounts.length > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentForm.link_account}
                      onChange={(e) => setPaymentForm({ ...paymentForm, link_account: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-zinc-900 border-zinc-700"
                    />
                    <span className="text-xs font-semibold text-zinc-200">
                      Deduct funds from Account (records Expense)?
                    </span>
                  </label>

                  {paymentForm.link_account && (
                    <select
                      value={paymentForm.account_id}
                      onChange={(e) => setPaymentForm({ ...paymentForm, account_id: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-purple-500 text-xs text-white focus:outline-none"
                    >
                      {activeAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} - Balance: {fmtCurr(acc.current_balance)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref #49281, Partial clearance"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalDebt(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-950/50 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DRAW / BORROW MORE MODAL */}
      {/* ========================================================= */}
      {drawModalDebt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Draw / Borrow More</h3>
                  <p className="text-xs text-zinc-400">Withdraw from {drawModalDebt.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawModalDebt(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDrawSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Available Credit Reminder */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Available Credit Line:</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  {fmtCurr(Math.max(0, drawModalDebt.principal - drawModalDebt.current_balance))}
                </span>
              </div>

              {/* Amount to Draw */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Amount to Draw ({baseCurrency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={0.01}
                  placeholder="0.00"
                  value={drawForm.amount}
                  onChange={(e) =>
                    setDrawForm({
                      ...drawForm,
                      amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-sm text-white font-mono font-bold focus:outline-none"
                />

                {/* Quick Chips */}
                {Math.max(0, drawModalDebt.principal - drawModalDebt.current_balance) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDrawForm({
                          ...drawForm,
                          amount: Math.max(0, drawModalDebt.principal - drawModalDebt.current_balance),
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Full Available ({fmtCurr(Math.max(0, drawModalDebt.principal - drawModalDebt.current_balance))})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDrawForm({
                          ...drawForm,
                          amount: Math.round(Math.max(0, drawModalDebt.principal - drawModalDebt.current_balance) / 2),
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      50% Available
                    </button>
                  </div>
                )}
              </div>

              {/* Draw Date */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Date Drawn *
                </label>
                <input
                  type="date"
                  required
                  value={drawForm.txn_date}
                  onChange={(e) => setDrawForm({ ...drawForm, txn_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>

              {/* Deposit to Account Option */}
              {activeAccounts.length > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={drawForm.deposit_to_account}
                      onChange={(e) => setDrawForm({ ...drawForm, deposit_to_account: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-zinc-900 border-zinc-700"
                    />
                    <span className="text-xs font-semibold text-zinc-200">
                      Deposit drawn money into Account (records Income)?
                    </span>
                  </label>

                  {drawForm.deposit_to_account && (
                    <select
                      value={drawForm.account_id}
                      onChange={(e) => setDrawForm({ ...drawForm, account_id: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-purple-500 text-xs text-white focus:outline-none"
                    >
                      {activeAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} - Current Balance: {fmtCurr(acc.current_balance)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency home repair, Advance draw"
                  value={drawForm.notes}
                  onChange={(e) => setDrawForm({ ...drawForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDrawModalDebt(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Drawing...' : 'Confirm Draw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIRECT SPEND FROM LOAN MODAL */}
      {/* ========================================================= */}
      {spendModalDebt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Direct Spend from Facility</h3>
                  <p className="text-xs text-zinc-400">Record a swipe/expense on {spendModalDebt.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpendModalDebt(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSpendSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Expense Amount ({baseCurrency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={0.01}
                  placeholder="0.00"
                  value={spendForm.amount}
                  onChange={(e) =>
                    setSpendForm({
                      ...spendForm,
                      amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-sm text-white font-mono font-bold focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Category
                </label>
                <select
                  value={spendForm.category_id}
                  onChange={(e) => setSpendForm({ ...spendForm, category_id: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none"
                >
                  <option value="">-- No Category --</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={spendForm.txn_date}
                  onChange={(e) => setSpendForm({ ...spendForm, txn_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Item Description / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flight tickets, Groceries, Medical bill"
                  value={spendForm.notes}
                  onChange={(e) => setSpendForm({ ...spendForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSpendModalDebt(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-amber-950/50 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Record Spend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* HISTORY / LEDGER DRAWER MODAL */}
      {/* ========================================================= */}
      {historyModalDebt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Facility Activity Ledger</h3>
                  <p className="text-xs text-zinc-400">All chronological repayments, draws, and spends for {historyModalDebt.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalDebt(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ledger List */}
            <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {loadingHistory ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  Loading activity ledger...
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-2">
                  <History className="w-8 h-8 mx-auto text-zinc-600 mb-1" />
                  <p className="text-sm font-semibold text-zinc-400">No activity recorded yet</p>
                  <p className="text-xs text-zinc-500">
                    Repayments, additional draws, and direct spends will show here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyItems.map((item) => {
                    const isPayment = item.txn_type === 'payment';
                    const isDraw = item.txn_type === 'draw';
                    const isSpend = item.txn_type === 'expense';

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3 hover:border-zinc-700/80 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${
                            isPayment
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isDraw
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {isPayment ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : isDraw ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ShoppingBag className="w-4 h-4" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white capitalize">
                                {isPayment ? 'Repayment' : isDraw ? 'Funds Drawn' : isSpend ? 'Direct Spend' : item.txn_type}
                              </span>
                              {item.account_name && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                                  {item.account_name}
                                </span>
                              )}
                              {item.category_name && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                                  {item.category_name}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                              <span>{formatDate(item.txn_date)}</span>
                              {item.notes && <span className="text-zinc-500">• {item.notes}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-sm font-bold font-mono block ${
                            isPayment
                              ? 'text-emerald-400'
                              : isDraw
                              ? 'text-purple-400'
                              : 'text-amber-400'
                          }`}>
                            {isPayment ? '-' : '+'}
                            {fmtCurr(item.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/95">
              <span className="text-xs text-zinc-400">
                Total Repaid: <strong className="text-emerald-400 font-mono">{fmtCurr(historyModalDebt.total_paid || 0)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setHistoryModalDebt(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT DEBT MODAL */}
      {/* ========================================================= */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-400" />
                Edit Facility: {editingDebt.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDebt(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="edit-debt-form"
              onSubmit={handleEditSubmit}
              className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Facility Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Sanctioned Limit / Principal *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0}
                    value={editForm.principal}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        principal: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Current Balance *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0}
                    value={editForm.current_balance}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        current_balance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Interest Rate (% p.a.)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={editForm.interest_rate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        interest_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Due / Next EMI Date
                  </label>
                  <input
                    type="date"
                    value={editForm.due_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white font-mono focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Status
                  </label>
                  <select
                    value={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Paid Off / Closed</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Loan Type
                  </label>
                  <select
                    value={editForm.debt_type || 'personal_loan'}
                    onChange={(e) => setEditForm({ ...editForm, debt_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none"
                  >
                    {Object.entries(DEBT_TYPE_LABELS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus:border-purple-500 text-xs text-white focus:outline-none resize-none"
                />
              </div>
            </form>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/95">
              <button
                type="button"
                onClick={() => setEditingDebt(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-debt-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
