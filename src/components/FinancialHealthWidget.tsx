import React from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Activity,
  Award,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Percent,
} from 'lucide-react';

export const FinancialHealthWidget: React.FC = () => {
  const accounts = useAppStore(state => state.accounts);
  const monthSummary = useAppStore(state => state.monthSummary);
  const netWorthSummary = useAppStore(state => state.netWorthSummary);
  const debts = useAppStore(state => state.debts);
  const holdings = useAppStore(state => state.holdings);
  const theme = useAppStore(state => state.theme);

  // 1. Savings Rate
  const income = monthSummary?.total_income || 0;
  const expense = monthSummary?.total_expense || 0;
  const savingsRate = income > 0 ? Math.max(0, ((income - expense) / income) * 100) : 0;

  // 2. Liquid Runway
  const liquidAccounts = accounts.filter(a => a.is_archived === 0 && (a.type === 'bank' || a.type === 'cash'));
  const liquidBalance = liquidAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const monthlyBurn = expense > 0 ? expense : 25000;
  const runwayMonths = liquidBalance / monthlyBurn;

  // 3. Debt to Assets / Net Worth
  const totalDebts = debts.filter(d => d.is_active === 1).reduce((sum, d) => sum + (d.current_balance || 0), 0);
  const netWorth = netWorthSummary?.net_worth || 1;
  const debtRatio = netWorth > 0 ? (totalDebts / (netWorth + totalDebts)) * 100 : 0;

  // 4. Investment Allocation
  const totalHoldingsValue = holdings
    .filter(h => h.is_archived === 0)
    .reduce((sum, h) => sum + h.quantity * h.last_price, 0);
  const investmentRatio = netWorth > 0 ? (totalHoldingsValue / netWorth) * 100 : 0;

  // Compute Overall Financial Health Score (0 to 100)
  let score = 50;
  // Savings rate points (up to 30)
  if (savingsRate >= 40) score += 30;
  else if (savingsRate >= 20) score += 20;
  else if (savingsRate >= 10) score += 10;
  else if (income > 0 && expense > income) score -= 15;

  // Runway points (up to 30)
  if (runwayMonths >= 6) score += 30;
  else if (runwayMonths >= 3) score += 20;
  else if (runwayMonths >= 1) score += 10;
  else score -= 10;

  // Debt ratio points (up to 20)
  if (totalDebts === 0) score += 20;
  else if (debtRatio < 20) score += 15;
  else if (debtRatio < 40) score += 5;
  else score -= 15;

  // Investment diversification (up to 20)
  if (investmentRatio >= 20) score += 20;
  else if (investmentRatio > 0) score += 10;

  score = Math.min(100, Math.max(10, score));

  const getGrade = (s: number) => {
    if (s >= 90) return {
      grade: 'A+',
      label: 'Financial Fortress',
      color: theme === 'light' ? 'bg-white text-emerald-700 border-emerald-300 shadow-sm' : 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    };
    if (s >= 75) return {
      grade: 'A',
      label: 'Healthy & Solid',
      color: theme === 'light' ? 'bg-white text-purple-700 border-purple-300 shadow-sm' : 'text-purple-400 border-purple-500/30 bg-purple-950/40',
    };
    if (s >= 60) return {
      grade: 'B',
      label: 'Stable Growth',
      color: theme === 'light' ? 'bg-white text-blue-700 border-blue-300 shadow-sm' : 'text-blue-400 border-blue-500/30 bg-blue-950/40',
    };
    if (s >= 40) return {
      grade: 'C',
      label: 'Needs Optimization',
      color: theme === 'light' ? 'bg-white text-amber-700 border-amber-300 shadow-sm' : 'text-amber-400 border-amber-500/30 bg-amber-950/40',
    };
    return {
      grade: 'D',
      label: 'High Fragility',
      color: theme === 'light' ? 'bg-white text-rose-700 border-rose-300 shadow-sm' : 'text-rose-400 border-rose-500/30 bg-rose-950/40',
    };
  };

  const gradeInfo = getGrade(score);

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      theme === 'light'
        ? 'bg-white border-slate-200 shadow-sm'
        : 'bg-[#0b0f19] border-zinc-850 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-black text-sm tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              Financial Health Cockpit
            </h3>
            <p className={`text-[11px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-zinc-400'}`}>
              Real-time offline liquidity, debt load, and savings score
            </p>
          </div>
        </div>

        {/* Grade Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${gradeInfo.color}`}>
          <Award className="w-4 h-4 shrink-0" />
          <div className="text-right">
            <span className="text-xs font-black block leading-none">Grade {gradeInfo.grade}</span>
            <span className="text-[10px] opacity-80 font-bold">{gradeInfo.label}</span>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Health */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Savings Rate */}
        <div className={`p-3 rounded-xl border ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/70 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Savings Rate</span>
            <Percent className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
            {savingsRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {savingsRate >= 30 ? 'High savings' : savingsRate >= 15 ? 'Moderate' : 'Low savings'}
          </span>
        </div>

        {/* Emergency Runway */}
        <div className={`p-3 rounded-xl border ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/70 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Cash Runway</span>
            <ShieldCheck className="w-3 h-3 text-blue-400" />
          </div>
          <span className="text-base sm:text-lg font-black font-mono text-blue-400">
            {runwayMonths.toFixed(1)} Mo
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {runwayMonths >= 6 ? 'Fortress buffer' : runwayMonths >= 3 ? 'Safe buffer' : 'Vulnerable buffer'}
          </span>
        </div>

        {/* Debt Burden */}
        <div className={`p-3 rounded-xl border ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/70 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Debt Burden</span>
            <CreditCard className="w-3 h-3 text-rose-400" />
          </div>
          <span className="text-base sm:text-lg font-black font-mono text-rose-400">
            {debtRatio.toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {totalDebts === 0 ? 'Zero debt 👏' : debtRatio < 20 ? 'Low leverage' : 'High leverage'}
          </span>
        </div>

        {/* Portfolio Allocation */}
        <div className={`p-3 rounded-xl border ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/70 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Invested %</span>
            <TrendingUp className="w-3 h-3 text-purple-400" />
          </div>
          <span className="text-base sm:text-lg font-black font-mono text-purple-400">
            {investmentRatio.toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            Of Total Net Worth
          </span>
        </div>
      </div>
    </div>
  );
};
