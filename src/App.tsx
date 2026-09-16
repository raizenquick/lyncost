import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AccountsPage } from './pages/AccountsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { RecurringRulesPage } from './pages/RecurringRulesPage';
import { GoalsPage } from './pages/GoalsPage';
import { BillsPage } from './pages/BillsPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { WarrantiesPage } from './pages/WarrantiesPage';
import { CsvImportPage } from './pages/CsvImportPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { DebtsPage } from './pages/DebtsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CalculatorsPage } from './pages/CalculatorsPage';
import { TransactionModal } from './components/TransactionModal';
import { CommandPalette } from './components/CommandPalette';
import { UpdateBanner } from './components/UpdateBanner';
import { PinScreen } from './components/PinScreen';
import { RefreshCw, Coins } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const isLoading = useAppStore(state => state.isLoading);
  const isUnlocked = useAppStore(state => state.isUnlocked);
  const activeTab = useAppStore(state => state.activeTab);
  const initApp = useAppStore(state => state.initApp);
  const loadTransactions = useAppStore(state => state.loadTransactions);
  const loadMonthSummary = useAppStore(state => state.loadMonthSummary);
  const loadAccounts = useAppStore(state => state.loadAccounts);
  const loadNetWorthSummary = useAppStore(state => state.loadNetWorthSummary);

  const theme = useAppStore(state => state.theme);

  const [isQuickTxnOpen, setIsQuickTxnOpen] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  useEffect(() => {
    initApp();
  }, [initApp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K opens Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Ctrl+N or Cmd+N opens New Transaction
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickTxnOpen(true);
      }
      // Escape closes open modals
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isQuickTxnOpen) setIsQuickTxnOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickTxnOpen, isCommandPaletteOpen]);

  const handleQuickTxnSaved = React.useCallback(async () => {
    await Promise.all([
      loadTransactions(),
      loadMonthSummary(),
      loadAccounts(false),
      loadNetWorthSummary(),
    ]);
  }, [loadTransactions, loadMonthSummary, loadAccounts, loadNetWorthSummary]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white select-none">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400 shadow-xl shadow-purple-950/40">
          <Coins className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          <span>Starting Lyncost...</span>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return <PinScreen />;
  }

  return (
    <div className={`h-screen w-screen overflow-hidden flex transition-colors duration-200 ${
      theme === 'light' ? 'theme-light bg-[#f8fafc] text-zinc-950' : 'theme-dark bg-zinc-950 text-zinc-100'
    }`}>
      <Sidebar
        onOpenQuickTransaction={() => setIsQuickTxnOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
      <main className="flex-1 h-full overflow-y-auto p-6 sm:p-8 max-w-7xl custom-scrollbar">
        <UpdateBanner />
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'accounts' && <AccountsPage />}
        {activeTab === 'transactions' && <TransactionsPage />}
        {activeTab === 'categories' && <CategoriesPage />}
        {activeTab === 'recurring' && <RecurringRulesPage />}
        {activeTab === 'goals' && <GoalsPage />}
        {activeTab === 'bills' && <BillsPage />}
        {activeTab === 'shopping' && <ShoppingListPage />}
        {activeTab === 'warranties' && <WarrantiesPage />}
        {activeTab === 'csv_import' && <CsvImportPage />}
        {activeTab === 'investments' && <InvestmentsPage />}
        {activeTab === 'debts' && <DebtsPage />}
        {activeTab === 'calculators' && <CalculatorsPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Global Quick Transaction Modal accessible via Ctrl+N or Sidebar button */}
      <TransactionModal
        isOpen={isQuickTxnOpen}
        onClose={() => setIsQuickTxnOpen(false)}
        onSaved={handleQuickTxnSaved}
      />

      {/* Universal Command Palette accessible via Ctrl+K or Sidebar button */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenNewTransaction={() => setIsQuickTxnOpen(true)}
      />
    </div>
  );
};

export default App;
