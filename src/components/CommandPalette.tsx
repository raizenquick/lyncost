import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Search,
  LayoutDashboard,
  WalletCards,
  ArrowLeftRight,
  Target,
  ReceiptText,
  Repeat,
  TrendingUp,
  CreditCard,
  BarChart3,
  Settings,
  Calculator,
  Plus,
  Moon,
  Sun,
  Lock,
  Database,
} from 'lucide-react';
import { formatIndianCurrency } from '../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewTransaction: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  category: 'Pages' | 'Actions' | 'Accounts' | 'Holdings';
  subtitle?: string;
  icon: React.ElementType;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenNewTransaction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const lockApp = useAppStore(state => state.lockApp);
  const createBackup = useAppStore(state => state.createBackup);
  const accounts = useAppStore(state => state.accounts);
  const holdings = useAppStore(state => state.holdings);
  const settings = useAppStore(state => state.settings);

  const baseCurrency = settings?.base_currency || 'INR';

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: PaletteItem[] = React.useMemo(() => {
    const list: PaletteItem[] = [
      // Quick Actions
      {
        id: 'act-new-txn',
        title: 'New Transaction',
        category: 'Actions',
        subtitle: 'Record an income, expense, or transfer',
        icon: Plus,
        badge: 'Ctrl+N',
        action: () => {
          onClose();
          onOpenNewTransaction();
        },
      },
      {
        id: 'act-theme',
        title: theme === 'dark' ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)',
        category: 'Actions',
        subtitle: 'Toggle user interface appearance',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => {
          setTheme(theme === 'dark' ? 'light' : 'dark');
          onClose();
        },
      },
      {
        id: 'act-backup',
        title: 'Create Instant Backup',
        category: 'Actions',
        subtitle: 'Save a timestamped SQLite database copy',
        icon: Database,
        action: async () => {
          onClose();
          await createBackup();
        },
      },
      {
        id: 'act-lock',
        title: 'Lock Vault Now',
        category: 'Actions',
        subtitle: 'Secure app with your 6-digit PIN',
        icon: Lock,
        action: () => {
          onClose();
          lockApp();
        },
      },

      // Navigation Pages
      {
        id: 'nav-dash',
        title: 'Dashboard',
        category: 'Pages',
        subtitle: 'Financial overview & accounts summary',
        icon: LayoutDashboard,
        action: () => {
          setActiveTab('dashboard');
          onClose();
        },
      },
      {
        id: 'nav-calc',
        title: 'Financial Calculators',
        category: 'Pages',
        subtitle: 'Loan EMI, SIP Compounding & Emergency Runway',
        icon: Calculator,
        badge: 'New',
        action: () => {
          setActiveTab('calculators' as any);
          onClose();
        },
      },
      {
        id: 'nav-txn',
        title: 'Transactions',
        category: 'Pages',
        subtitle: 'View, search, filter and export ledgers',
        icon: ArrowLeftRight,
        action: () => {
          setActiveTab('transactions');
          onClose();
        },
      },
      {
        id: 'nav-acc',
        title: 'Accounts & Wallets',
        category: 'Pages',
        subtitle: 'Manage bank, cash, and credit accounts',
        icon: WalletCards,
        action: () => {
          setActiveTab('accounts');
          onClose();
        },
      },
      {
        id: 'nav-inv',
        title: 'Investments & Portfolio',
        category: 'Pages',
        subtitle: 'Track stocks, crypto, mutual funds and P&L',
        icon: TrendingUp,
        action: () => {
          setActiveTab('investments');
          onClose();
        },
      },
      {
        id: 'nav-goals',
        title: 'Financial Goals',
        category: 'Pages',
        subtitle: 'Savings milestones and progress tracking',
        icon: Target,
        action: () => {
          setActiveTab('goals');
          onClose();
        },
      },
      {
        id: 'nav-bills',
        title: 'Bills & Due Reminders',
        category: 'Pages',
        subtitle: 'Track upcoming payments and mark paid',
        icon: ReceiptText,
        action: () => {
          setActiveTab('bills');
          onClose();
        },
      },
      {
        id: 'nav-debts',
        title: 'Debts & Loans',
        category: 'Pages',
        subtitle: 'Track liabilities and repayment schedules',
        icon: CreditCard,
        action: () => {
          setActiveTab('debts');
          onClose();
        },
      },
      {
        id: 'nav-recurring',
        title: 'Recurring Rules',
        category: 'Pages',
        subtitle: 'Automated salary and subscription rules',
        icon: Repeat,
        action: () => {
          setActiveTab('recurring');
          onClose();
        },
      },
      {
        id: 'nav-reports',
        title: 'Reports & Analytics',
        category: 'Pages',
        subtitle: 'Spending breakdown, cashflow trends & net worth',
        icon: BarChart3,
        action: () => {
          setActiveTab('reports');
          onClose();
        },
      },
      {
        id: 'nav-settings',
        title: 'Settings & Security',
        category: 'Pages',
        subtitle: 'Currencies, exchange rates, backup, and updates',
        icon: Settings,
        action: () => {
          setActiveTab('settings');
          onClose();
        },
      },
    ];

    // Add dynamic accounts
    accounts.filter(a => a.is_archived === 0).forEach(acc => {
      list.push({
        id: `acc-${acc.id}`,
        title: acc.name,
        category: 'Accounts',
        subtitle: `${acc.type.toUpperCase()} • Balance: ${formatIndianCurrency(acc.current_balance, acc.currency)}`,
        icon: WalletCards,
        action: () => {
          setActiveTab('accounts');
          onClose();
        },
      });
    });

    // Add dynamic holdings
    holdings.filter(h => h.is_archived === 0).forEach(h => {
      list.push({
        id: `holding-${h.id}`,
        title: `${h.symbol} - ${h.name || h.asset_type}`,
        category: 'Holdings',
        subtitle: `Qty: ${h.quantity} • Last Price: ${formatIndianCurrency(h.last_price, h.currency)}`,
        icon: TrendingUp,
        action: () => {
          setActiveTab('investments');
          onClose();
        },
      });
    });

    return list;
  }, [theme, setTheme, setActiveTab, lockApp, createBackup, accounts, holdings, onClose, onOpenNewTransaction, baseCurrency]);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return items.slice(0, 10);
    const q = query.toLowerCase().trim();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all animate-in zoom-in-95 duration-150 ${
          theme === 'light'
            ? 'bg-white border-slate-300 text-slate-900 shadow-purple-900/10'
            : 'bg-[#0e121c] border-purple-500/30 text-white shadow-purple-950/40'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className={`p-3.5 border-b flex items-center gap-3 ${
          theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-[#090d16]'
        }`}>
          <Search className="w-4 h-4 text-purple-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search accounts, holdings, or jump to page..."
            className={`w-full bg-transparent text-xs font-bold focus:outline-none placeholder:text-zinc-500 ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No matching commands, accounts, or holdings found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? theme === 'light'
                        ? 'bg-purple-100/90 text-purple-950 font-bold'
                        : 'bg-purple-950/70 text-white font-bold'
                      : theme === 'light'
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-zinc-300 hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : theme === 'light' ? 'bg-slate-200 text-slate-700' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[10px] text-zinc-500 truncate font-normal">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                    theme === 'light'
                      ? 'bg-slate-200/80 text-slate-600'
                      : 'bg-zinc-800/90 text-zinc-400'
                  }`}>
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className={`p-2.5 px-4 border-t flex items-center justify-between text-[10px] font-medium text-zinc-500 ${
          theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-[#090d16]'
        }`}>
          <div className="flex items-center gap-3">
            <span><strong className="text-purple-400">↑↓</strong> Navigate</span>
            <span><strong className="text-purple-400">↵</strong> Select</span>
            <span><strong className="text-purple-400">ESC</strong> Close</span>
          </div>
          <span className="font-mono">Lyncost Command Launcher</span>
        </div>
      </div>
    </div>
  );
};
