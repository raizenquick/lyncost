import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { formatIndianCurrency, formatIndianDate } from '../lib/utils';

export const CashflowForecastWidget: React.FC = () => {
  const accounts = useAppStore(state => state.accounts);
  const recurringRules = useAppStore(state => state.recurringRules);
  const bills = useAppStore(state => state.bills);
  const settings = useAppStore(state => state.settings);
  const theme = useAppStore(state => state.theme);

  const [isExpanded, setIsExpanded] = useState(false);

  const baseCurrency = settings?.base_currency || 'INR';

  // 1. Current liquid balance (Bank + Cash accounts)
  const liquidAccounts = accounts.filter(a => a.is_archived === 0 && (a.type === 'bank' || a.type === 'cash'));
  const currentLiquidBalance = liquidAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

  // 2. Upcoming events within 30 days
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  interface ScheduledEvent {
    id: string;
    name: string;
    type: 'inflow' | 'outflow';
    amount: number;
    date: string;
    source: 'Recurring Rule' | 'Bill';
  }

  const upcomingEvents: ScheduledEvent[] = [];

  // Parse recurring rules
  recurringRules.filter(r => r.is_active === 1).forEach(rule => {
    let nextDate = new Date(rule.next_due_date);
    // If nextDate is overdue, treat as due immediately
    if (nextDate < now) {
      nextDate = new Date();
    }

    while (nextDate <= thirtyDaysFromNow) {
      if (rule.type === 'income') {
        upcomingEvents.push({
          id: `rec-${rule.id}-${nextDate.toISOString()}`,
          name: rule.name,
          type: 'inflow',
          amount: rule.amount,
          date: nextDate.toISOString().split('T')[0],
          source: 'Recurring Rule',
        });
      } else if (rule.type === 'expense') {
        upcomingEvents.push({
          id: `rec-${rule.id}-${nextDate.toISOString()}`,
          name: rule.name,
          type: 'outflow',
          amount: rule.amount,
          date: nextDate.toISOString().split('T')[0],
          source: 'Recurring Rule',
        });
      }

      // Advance date based on frequency
      if (rule.frequency === 'daily') {
        nextDate = new Date(nextDate.getTime() + 24 * 60 * 60 * 1000);
      } else if (rule.frequency === 'weekly') {
        nextDate = new Date(nextDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (rule.frequency === 'monthly') {
        nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 1));
      } else {
        break; // yearly triggers at most once
      }
    }
  });

  // Parse unpaid bills
  bills.filter(b => b.is_paid === 0).forEach(bill => {
    const dueDate = new Date(bill.due_date);
    if (dueDate <= thirtyDaysFromNow) {
      upcomingEvents.push({
        id: `bill-${bill.id}`,
        name: bill.name,
        type: 'outflow',
        amount: bill.amount,
        date: bill.due_date,
        source: 'Bill',
      });
    }
  });

  // Sort upcoming events by date
  upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalProjectedInflows = upcomingEvents
    .filter(e => e.type === 'inflow')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalProjectedOutflows = upcomingEvents
    .filter(e => e.type === 'outflow')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCashflow = totalProjectedInflows - totalProjectedOutflows;
  const projectedEndingBalance = currentLiquidBalance + netCashflow;

  const isDeficitWarning = projectedEndingBalance < 0;

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      theme === 'light'
        ? 'bg-white border-slate-200 shadow-sm'
        : 'bg-[#0b0f19] border-zinc-850 shadow-md'
    }`}>
      {/* Widget Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-black text-sm tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              30-Day Cashflow Projection
            </h3>
            <p className={`text-[11px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-zinc-400'}`}>
              Estimated liquid funds based on recurring rules & scheduled bills
            </p>
          </div>
        </div>

        {isDeficitWarning ? (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
            theme === 'light'
              ? 'bg-white text-rose-600 border-rose-300 shadow-sm'
              : 'bg-rose-950/70 text-rose-400 border-rose-800'
          }`}>
            <AlertTriangle className="w-3 h-3" />
            <span>Deficit Warning</span>
          </span>
        ) : netCashflow >= 0 ? (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
            theme === 'light'
              ? 'bg-white text-emerald-600 border-emerald-300 shadow-sm'
              : 'bg-emerald-950/70 text-emerald-400 border-emerald-800'
          }`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Surplus Runway</span>
          </span>
        ) : (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
            theme === 'light'
              ? 'bg-white text-amber-600 border-amber-300 shadow-sm'
              : 'bg-amber-950/70 text-amber-400 border-amber-800'
          }`}>
            <span>Mild Outflow</span>
          </span>
        )}
      </div>

      {/* Projection Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Current Liquid Balance */}
        <div className={`p-3 rounded-xl border ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/70 border-zinc-800'
        }`}>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            Current Liquid
          </span>
          <span className={`text-sm sm:text-base font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            {formatIndianCurrency(currentLiquidBalance, baseCurrency)}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Bank & Cash</span>
        </div>

        {/* Expected Inflows */}
        <div className={`p-3 rounded-xl border ${
          theme === 'light' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-900/40'
        }`}>
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">
            Est. Inflows
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-500">
            +{formatIndianCurrency(totalProjectedInflows, baseCurrency)}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Next 30 days</span>
        </div>

        {/* Expected Outflows */}
        <div className={`p-3 rounded-xl border ${
          theme === 'light' ? 'bg-rose-50/50 border-rose-200' : 'bg-rose-950/20 border-rose-900/40'
        }`}>
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1">
            Est. Outflows
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-rose-500">
            -{formatIndianCurrency(totalProjectedOutflows, baseCurrency)}
          </span>
          <span className="text-[10px] text-rose-600 block mt-0.5">Bills & recurring</span>
        </div>

        {/* Projected Ending Balance */}
        <div className={`p-3 rounded-xl border ${
          isDeficitWarning
            ? theme === 'light'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-rose-950/30 border-rose-800 text-rose-300'
            : theme === 'light'
            ? 'bg-purple-50 border-purple-200 text-purple-950'
            : 'bg-purple-950/30 border-purple-800/50 text-purple-200'
        }`}>
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
            Day 30 Forecast
          </span>
          <span className="text-sm sm:text-base font-black font-mono">
            {formatIndianCurrency(projectedEndingBalance, baseCurrency)}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {netCashflow >= 0 ? 'Net Surplus' : 'Net Deficit'}
          </span>
        </div>
      </div>

      {/* Expandable Upcoming Events List */}
      <div className={`mt-3 pt-3 border-t ${theme === 'light' ? 'border-slate-200' : 'border-zinc-800/60'}`}>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
            theme === 'light' ? 'text-purple-700 hover:text-purple-600' : 'text-purple-400 hover:text-purple-300'
          }`}
        >
          <span>
            {upcomingEvents.length} scheduled cash event{upcomingEvents.length !== 1 ? 's' : ''} in the next 30 days
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">
                No recurring rules or upcoming bills found for the next 30 days.
              </p>
            ) : (
              upcomingEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      event.type === 'inflow' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    <span className="font-bold">{event.name}</span>
                    <span className="text-[10px] text-zinc-500 px-1.5 py-0.2 rounded bg-zinc-800">
                      {event.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {formatIndianDate(event.date)}
                    </span>
                    <span className={`font-mono font-black ${
                      event.type === 'inflow' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {event.type === 'inflow' ? '+' : '-'}
                      {formatIndianCurrency(event.amount, baseCurrency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
