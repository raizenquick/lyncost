import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { NotificationBell } from './NotificationBell';
import {
  LayoutDashboard,
  WalletCards,
  ArrowLeftRight,
  TrendingUp,
  ReceiptText,
  BarChart3,
  Settings,
  Coins,
  FolderTree,
  Repeat,
  ShoppingCart,
  ShieldCheck,
  FileSpreadsheet,
  CreditCard,
  Plus,
  Target,
  Sun,
  Moon,
  Calculator,
  Search,
} from 'lucide-react';

interface SidebarProps {
  onOpenQuickTransaction?: () => void;
  onOpenCommandPalette?: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'accounts', label: 'Accounts', icon: WalletCards },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'goals', label: 'Financial Goals', icon: Target },
  { id: 'bills', label: 'Bills', icon: ReceiptText },
  { id: 'shopping', label: 'Shopping List', icon: ShoppingCart },
  { id: 'warranties', label: 'Warranties', icon: ShieldCheck },
  { id: 'csv_import', label: 'CSV Import', icon: FileSpreadsheet },
  { id: 'recurring', label: 'Recurring Rules', icon: Repeat },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'debts', label: 'Debts & Loans', icon: CreditCard },
  { id: 'calculators', label: 'Calculators', icon: Calculator },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenQuickTransaction,
  onOpenCommandPalette,
}) => {
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const billReminders = useAppStore(state => state.billReminders);
  const settings = useAppStore(state => state.settings);
  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);

  return (
    <aside className={`w-64 border-r flex flex-col justify-between select-none h-full shrink-0 z-30 transition-colors ${
      theme === 'light' ? 'bg-white border-zinc-200' : 'bg-black border-zinc-850'
    }`}>
      {/* Brand Header */}
      <div className={`p-3.5 flex items-center justify-between border-b shrink-0 ${
        theme === 'light' ? 'border-zinc-200' : 'border-zinc-850'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className={`font-black text-sm tracking-tight leading-tight ${
                theme === 'light' ? 'text-black' : 'text-white'
              }`}>
                Lyncost
              </h1>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-500/15 text-purple-400 border border-purple-500/25">
                v0.1.5
              </span>
            </div>
            <p className={`text-[10px] font-extrabold tracking-wide flex items-center gap-1 ${
              theme === 'light' ? 'text-purple-700' : 'text-purple-400'
            }`}>
              <span>{settings?.base_currency || 'INR'} Mode</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </p>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Quick Action Buttons */}
      <div className="p-3 pb-1 shrink-0 space-y-1.5">
        <button
          type="button"
          onClick={onOpenQuickTransaction}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all shadow-md cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Transaction</span>
          <kbd className="ml-auto text-[10px] bg-purple-700 px-1.5 py-0.5 rounded text-white font-mono font-bold">
            Ctrl+N
          </kbd>
        </button>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-[11px]">Command Palette</span>
          </div>
          <kbd className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer !border-0 !shadow-none ${
                isActive
                  ? theme === 'light'
                    ? 'bg-purple-100/90 text-purple-900 font-extrabold'
                    : 'bg-purple-950/70 text-purple-200 font-extrabold'
                  : theme === 'light'
                  ? 'text-slate-700 hover:text-black hover:bg-slate-100/70 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850/50 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? theme === 'light' ? 'text-purple-700' : 'text-purple-300'
                    : theme === 'light' ? 'text-black' : 'text-white'
                }`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'bills' && billReminders.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black border ${
                  theme === 'light'
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : 'bg-purple-900 text-purple-200 border-purple-500'
                }`}>
                  {billReminders.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme Toggle & Footer */}
      <div className={`p-3 border-t shrink-0 flex items-center justify-between gap-2 ${
        theme === 'light' ? 'border-zinc-200' : 'border-zinc-850'
      }`}>
        <button
          type="button"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border active:scale-[0.98] ${
            theme === 'light'
              ? 'bg-white hover:bg-zinc-100 border-zinc-300 text-black'
              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white'
          }`}
          title={theme === 'light' ? 'Switch to Night Mode (Dark)' : 'Switch to Day Mode (Light)'}
        >
          {theme === 'light' ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-black font-black">Day Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-purple-400" />
              <span className="text-white font-black">Night Mode</span>
            </>
          )}
        </button>

        <span className={`font-mono text-xs px-2.5 py-2 rounded-xl border font-black shrink-0 ${
          theme === 'light'
            ? 'bg-purple-100 border-purple-300 text-purple-800'
            : 'bg-purple-950 border-purple-700 text-purple-300'
        }`}>
          {settings?.base_currency || 'USD'}
        </span>
      </div>
    </aside>
  );
};
