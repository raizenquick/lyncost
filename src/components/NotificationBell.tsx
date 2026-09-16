import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Bell,
  BellRing,
  CheckCircle2,
  ExternalLink,
  Check,
  X,
  RefreshCw,
  Calendar,
  CreditCard,
  ReceiptText,
} from 'lucide-react';
import { formatIndianDate, formatIndianCurrency } from '../lib/utils';

export const NotificationBell: React.FC = () => {
  const billReminders = useAppStore(state => state.billReminders);
  const settings = useAppStore(state => state.settings);
  const checkDueReminders = useAppStore(state => state.checkDueReminders);
  const markBillPaid = useAppStore(state => state.markBillPaid);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [payingBillId, setPayingBillId] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const baseCurrency = settings?.base_currency || 'INR';

  // Format currency
  const formatCurrency = React.useCallback((val: number) => {
    return formatIndianCurrency(val, baseCurrency);
  }, [baseCurrency]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkDueReminders();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePayBill = async (billId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPayingBillId(billId);
    try {
      await markBillPaid(billId);
    } finally {
      setPayingBillId(null);
    }
  };

  const overdueCount = billReminders.filter((r) => r.status === 'overdue').length;
  const totalAlerts = billReminders.length;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={
          totalAlerts > 0
            ? `${totalAlerts} bill reminder${totalAlerts > 1 ? 's' : ''} pending`
            : 'No bill reminders'
        }
        className={`relative p-2 rounded-xl transition-all cursor-pointer border ${
          isOpen
            ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-lg shadow-purple-950/50'
            : totalAlerts > 0
            ? 'bg-zinc-800/80 hover:bg-zinc-800 text-purple-300 border-purple-500/40 hover:border-purple-400/60'
            : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-700/60'
        }`}
      >
        {totalAlerts > 0 ? (
          <BellRing className="w-4 h-4 text-purple-400 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {totalAlerts > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center text-white border shadow-md ${
              overdueCount > 0
                ? 'bg-rose-600 border-rose-400 shadow-rose-950/60'
                : 'bg-purple-600 border-purple-400 shadow-purple-950/60'
            }`}
          >
            {totalAlerts}
          </span>
        )}
      </button>

      {/* Flyout Notification Center */}
      {isOpen && (
        <div className="fixed left-64 top-4 z-50 w-96 max-h-[85vh] bg-zinc-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 px-4 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <BellRing className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">
                  Bill Reminders
                </h3>
                <span className="text-[10px] text-zinc-400">
                  {totalAlerts === 0
                    ? 'All bills up to date'
                    : `${totalAlerts} due or upcoming bill${totalAlerts > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh reminders"
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* OS Delivery Status Badge */}
          <div className="px-4 py-2 bg-zinc-950/50 border-b border-zinc-800/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span>Desktop Alerts:</span>
              {settings?.notify_os ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active ({settings.notify_advance_days}d advance)
                </span>
              ) : (
                <span className="text-zinc-500">Disabled</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setActiveTab('settings');
              }}
              className="text-[10px] text-purple-400 hover:text-purple-300 underline underline-offset-2 cursor-pointer font-medium"
            >
              Configure
            </button>
          </div>

          {/* Reminders List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {billReminders.length === 0 ? (
              <div className="py-8 text-center px-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-200">No Pending Reminders</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  No bills are currently overdue, due today, or due tomorrow. Notifications will appear here and trigger OS/Telegram alerts 1 day before due dates.
                </p>
              </div>
            ) : (
              billReminders.map((reminder) => {
                const isOverdue = reminder.status === 'overdue';
                const isDueToday = reminder.status === 'due_today';
                const isPaying = payingBillId === reminder.bill_id;

                return (
                  <div
                    key={reminder.bill_id}
                    className={`p-3 rounded-xl border transition-all ${
                      isOverdue
                        ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-800/60'
                        : isDueToday
                        ? 'bg-purple-950/30 border-purple-800/50 hover:border-purple-700/70'
                        : 'bg-zinc-950 border-zinc-800/90 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white leading-tight">
                            {reminder.bill_name}
                          </span>
                          {isOverdue && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 border border-rose-500/40 text-rose-300">
                              OVERDUE ({Math.abs(reminder.days_until_due)}d)
                            </span>
                          )}
                          {isDueToday && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-500/25 border border-purple-500/50 text-purple-300">
                              DUE TODAY
                            </span>
                          )}
                          {!isOverdue && !isDueToday && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 border border-purple-500/30 text-purple-300">
                              DUE TOMORROW (1d)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            {formatIndianDate(reminder.due_date)}
                          </span>
                          {reminder.account_name && (
                            <span className="flex items-center gap-1 text-zinc-400">
                              <CreditCard className="w-3 h-3 text-zinc-500" />
                              {reminder.account_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-white">
                          {formatCurrency(reminder.amount)}
                        </div>
                      </div>
                    </div>

                    {/* Quick Pay Action */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setActiveTab('bills');
                        }}
                        className="text-[10px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ReceiptText className="w-3 h-3" />
                        <span>View in Bills</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPaying}
                        onClick={(e) => handlePayBill(reminder.bill_id, e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold shadow-sm shadow-purple-950/40 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isPaying ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Mark Paid</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 flex items-center justify-between text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setActiveTab('bills');
              }}
              className="text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer text-[11px] font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              <span>Manage All Bills</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setActiveTab('settings');
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium cursor-pointer"
            >
              Alert Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
