import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Calculator,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { formatIndianCurrency } from '../lib/utils';

export const CalculatorsPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const theme = useAppStore(state => state.theme);
  const accounts = useAppStore(state => state.accounts);
  const monthSummary = useAppStore(state => state.monthSummary);
  const createDebt = useAppStore(state => state.createDebt);

  const baseCurrency = settings?.base_currency || 'INR';

  const [calcTab, setCalcTab] = useState<'emi' | 'sip' | 'runway'>('emi');

  // --- EMI CALCULATOR STATE ---
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(5);
  const [isTenureInMonths, setIsTenureInMonths] = useState<boolean>(false);
  const [loanName, setLoanName] = useState<string>('Home / Personal Loan');
  const [debtSaved, setDebtSaved] = useState<boolean>(false);

  const totalTenureMonths = isTenureInMonths ? Math.max(1, tenureYears) : Math.max(1, tenureYears * 12);
  const monthlyRate = interestRate / 12 / 100;
  
  const emi = monthlyRate > 0 
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalTenureMonths)) / (Math.pow(1 + monthlyRate, totalTenureMonths) - 1)
    : loanAmount / totalTenureMonths;

  const totalPayment = emi * totalTenureMonths;
  const totalInterest = Math.max(0, totalPayment - loanAmount);
  const principalPercent = totalPayment > 0 ? (loanAmount / totalPayment) * 100 : 0;
  const interestPercent = totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0;

  // Generate Year-by-Year Amortization
  const amortizationSchedule = React.useMemo(() => {
    let balance = loanAmount;
    const schedule: { year: number; principalPaid: number; interestPaid: number; endingBalance: number }[] = [];
    const numYears = Math.ceil(totalTenureMonths / 12);

    for (let y = 1; y <= numYears; y++) {
      let yearlyPrincipal = 0;
      let yearlyInterest = 0;

      for (let m = 1; m <= 12; m++) {
        if (balance <= 0) break;
        const interestForMonth = balance * monthlyRate;
        const principalForMonth = Math.min(balance, emi - interestForMonth);
        yearlyInterest += interestForMonth;
        yearlyPrincipal += principalForMonth;
        balance = Math.max(0, balance - principalForMonth);
      }

      schedule.push({
        year: y,
        principalPaid: Math.round(yearlyPrincipal),
        interestPaid: Math.round(yearlyInterest),
        endingBalance: Math.round(balance),
      });

      if (balance <= 0) break;
    }
    return schedule;
  }, [loanAmount, monthlyRate, emi, totalTenureMonths]);

  const handleSaveLoanAsDebt = async () => {
    try {
      await createDebt({
        name: loanName || 'Bank Loan',
        principal: loanAmount,
        current_balance: loanAmount,
        interest_rate: interestRate,
        due_date: new Date(Date.now() + totalTenureMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: `Monthly EMI: ${formatIndianCurrency(emi, baseCurrency)} over ${totalTenureMonths} months`,
      });
      setDebtSaved(true);
      setTimeout(() => setDebtSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // --- SIP & WEALTH PLANNER STATE ---
  const [sipMode, setSipMode] = useState<'sip' | 'lumpsum'>('sip');
  const [sipAmount, setSipAmount] = useState<number>(10000);
  const [sipReturnRate, setSipReturnRate] = useState<number>(12);
  const [sipYears, setSipYears] = useState<number>(10);

  const { totalInvested, estimatedReturns, totalWealth, sipBreakdown } = React.useMemo(() => {
    const months = sipYears * 12;
    const r = sipReturnRate / 12 / 100;
    
    let invested = 0;
    let wealth = 0;
    const breakdown: { year: number; invested: number; value: number }[] = [];

    if (sipMode === 'sip') {
      invested = sipAmount * months;
      wealth = r > 0 ? sipAmount * ((Math.pow(1 + r, months) - 1) / r) * (1 + r) : invested;
      
      let runningWealth = 0;
      for (let y = 1; y <= sipYears; y++) {
        const m = y * 12;
        runningWealth = r > 0 ? sipAmount * ((Math.pow(1 + r, m) - 1) / r) * (1 + r) : sipAmount * m;
        breakdown.push({
          year: y,
          invested: sipAmount * m,
          value: Math.round(runningWealth),
        });
      }
    } else {
      invested = sipAmount;
      wealth = sipAmount * Math.pow(1 + sipReturnRate / 100, sipYears);
      for (let y = 1; y <= sipYears; y++) {
        breakdown.push({
          year: y,
          invested: sipAmount,
          value: Math.round(sipAmount * Math.pow(1 + sipReturnRate / 100, y)),
        });
      }
    }

    const returns = Math.max(0, wealth - invested);
    return {
      totalInvested: invested,
      estimatedReturns: returns,
      totalWealth: wealth,
      sipBreakdown: breakdown,
    };
  }, [sipMode, sipAmount, sipReturnRate, sipYears]);

  // --- EMERGENCY RUNWAY STATE ---
  const liquidAccounts = accounts.filter(a => a.is_archived === 0 && (a.type === 'bank' || a.type === 'cash'));
  const totalLiquidBalance = liquidAccounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);
  const monthlyExpenseActual = monthSummary?.total_expense && monthSummary.total_expense > 0 ? monthSummary.total_expense : 30000;

  const [simulatedMonthlyExpense, setSimulatedMonthlyExpense] = useState<number>(Math.round(monthlyExpenseActual));
  const currentRunwayMonths = simulatedMonthlyExpense > 0 ? totalLiquidBalance / simulatedMonthlyExpense : 0;

  const getRunwayTier = (months: number) => {
    if (months >= 6) {
      return {
        label: 'Fortress Runway 🛡️',
        color: theme === 'light' ? 'bg-white text-emerald-700 border-emerald-300 shadow-sm' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
        desc: 'Exceptional security! You can comfortably handle unforeseen circumstances for over 6 months.',
      };
    } else if (months >= 3) {
      return {
        label: 'Healthy Cushion 🟢',
        color: theme === 'light' ? 'bg-white text-blue-700 border-blue-300 shadow-sm' : 'text-blue-400 bg-blue-950/60 border-blue-800/80',
        desc: 'Great liquidity. You have standard safety covering 3 to 6 months of living expenses.',
      };
    } else if (months >= 1) {
      return {
        label: 'Moderate Buffer 🟡',
        color: theme === 'light' ? 'bg-white text-amber-700 border-amber-300 shadow-sm' : 'text-amber-400 bg-amber-950/60 border-amber-800/80',
        desc: 'Adequate for minor emergencies, but prioritize building toward a 3-6 month reserve.',
      };
    } else {
      return {
        label: 'Vulnerable 🔴',
        color: theme === 'light' ? 'bg-white text-rose-700 border-rose-300 shadow-sm' : 'text-rose-400 bg-rose-950/60 border-rose-800/80',
        desc: 'Low liquid cash reserve. Aim to deposit surplus cash into your emergency bank fund.',
      };
    }
  };

  const runwayTier = getRunwayTier(currentRunwayMonths);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className={`text-xl font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              Financial Calculators & Tools
            </h1>
          </div>
          <p className={`text-xs mt-1 font-medium ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
            Plan loans, compound wealth, and audit your emergency runway completely offline.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className={`p-1 rounded-2xl border flex items-center gap-1 ${
          theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'
        }`}>
          <button
            type="button"
            onClick={() => setCalcTab('emi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              calcTab === 'emi'
                ? 'bg-purple-600 text-white shadow-sm'
                : theme === 'light' ? 'text-slate-700 hover:text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Loan & EMI</span>
          </button>
          <button
            type="button"
            onClick={() => setCalcTab('sip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              calcTab === 'sip'
                ? 'bg-purple-600 text-white shadow-sm'
                : theme === 'light' ? 'text-slate-700 hover:text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>SIP & Compounding</span>
          </button>
          <button
            type="button"
            onClick={() => setCalcTab('runway')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              calcTab === 'runway'
                ? 'bg-purple-600 text-white shadow-sm'
                : theme === 'light' ? 'text-slate-700 hover:text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Emergency Runway</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LOAN & EMI CALCULATOR */}
      {calcTab === 'emi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Inputs */}
          <div className={`lg:col-span-5 p-5 rounded-2xl border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <h3 className={`font-black text-sm flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              <CreditCard className="w-4 h-4 text-purple-400" />
              <span>Loan Parameters</span>
            </h3>

            <div>
              <label className={`text-xs font-bold block mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
                Loan Purpose / Name
              </label>
              <input
                type="text"
                value={loanName}
                onChange={e => setLoanName(e.target.value)}
                placeholder="e.g. Car Loan, Home Mortgage"
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    : 'bg-zinc-950 border-zinc-800 text-white focus:border-purple-500'
                }`}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={`text-xs font-bold ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Principal Amount ({baseCurrency})
                </label>
                <span className="font-mono text-xs font-extrabold text-purple-400">
                  {formatIndianCurrency(loanAmount, baseCurrency)}
                </span>
              </div>
              <input
                type="number"
                min="1000"
                step="10000"
                value={loanAmount}
                onChange={e => setLoanAmount(Math.max(1000, Number(e.target.value)))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
              <input
                type="range"
                min="50000"
                max="10000000"
                step="25000"
                value={loanAmount}
                onChange={e => setLoanAmount(Number(e.target.value))}
                className="w-full mt-2 accent-purple-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={`text-xs font-bold ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Interest Rate (% p.a.)
                </label>
                <span className="font-mono text-xs font-extrabold text-purple-400">{interestRate}%</span>
              </div>
              <input
                type="number"
                step="0.1"
                min="1"
                max="36"
                value={interestRate}
                onChange={e => setInterestRate(Math.max(0.1, Number(e.target.value)))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
              <input
                type="range"
                min="4"
                max="24"
                step="0.25"
                value={interestRate}
                onChange={e => setInterestRate(Number(e.target.value))}
                className="w-full mt-2 accent-purple-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <label className={`text-xs font-bold ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Loan Tenure
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsTenureInMonths(!isTenureInMonths)}
                    className="text-[10px] text-purple-400 font-bold underline cursor-pointer"
                  >
                    Switch to {isTenureInMonths ? 'Years' : 'Months'}
                  </button>
                </div>
                <span className="font-mono text-xs font-extrabold text-purple-400">
                  {tenureYears} {isTenureInMonths ? 'Months' : 'Years'}
                </span>
              </div>
              <input
                type="number"
                min="1"
                max={isTenureInMonths ? 360 : 30}
                value={tenureYears}
                onChange={e => setTenureYears(Math.max(1, Number(e.target.value)))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
              <input
                type="range"
                min="1"
                max={isTenureInMonths ? 120 : 30}
                value={tenureYears}
                onChange={e => setTenureYears(Number(e.target.value))}
                className="w-full mt-2 accent-purple-600 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={handleSaveLoanAsDebt}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-950/40 transition-all cursor-pointer active:scale-95"
              >
                {debtSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Added to Debts & Loans!</span>
                  </>
                ) : (
                  <>
                    <span>Record in Debts & Loans Table</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results & Breakdown */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-4 rounded-2xl border ${
                theme === 'light' ? 'bg-purple-50 border-purple-200' : 'bg-purple-950/30 border-purple-800/50'
              }`}>
                <span className="text-[11px] font-bold text-purple-400 block mb-1">Monthly EMI</span>
                <span className={`text-xl font-black font-mono tracking-tight ${theme === 'light' ? 'text-purple-950' : 'text-purple-200'}`}>
                  {formatIndianCurrency(emi, baseCurrency)}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">Payable each month</span>
              </div>

              <div className={`p-4 rounded-2xl border ${
                theme === 'light' ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[11px] font-bold text-amber-500 block mb-1">Total Interest</span>
                <span className={`text-xl font-black font-mono tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {formatIndianCurrency(totalInterest, baseCurrency)}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">{interestPercent.toFixed(1)}% of total</span>
              </div>

              <div className={`p-4 rounded-2xl border ${
                theme === 'light' ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[11px] font-bold text-zinc-400 block mb-1">Total Payment</span>
                <span className={`text-xl font-black font-mono tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {formatIndianCurrency(totalPayment, baseCurrency)}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">Principal + Interest</span>
              </div>
            </div>

            {/* Ratio Breakdown Bar */}
            <div className={`p-5 rounded-2xl border space-y-3 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Principal: {principalPercent.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Interest: {interestPercent.toFixed(1)}%
                </span>
              </div>

              <div className="w-full h-3.5 bg-zinc-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${principalPercent}%` }} className="bg-purple-500 h-full transition-all" />
                <div style={{ width: `${interestPercent}%` }} className="bg-amber-500 h-full transition-all" />
              </div>
            </div>

            {/* Annual Amortization Table */}
            <div className={`p-5 rounded-2xl border space-y-3 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-zinc-300'}`}>
                  Year-by-Year Amortization Schedule
                </h4>
                <span className="text-[10px] text-zinc-500 font-bold">{totalTenureMonths} Months</span>
              </div>

              <div className="overflow-x-auto max-h-64 custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className={`sticky top-0 border-b font-black ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}>
                    <tr>
                      <th className="py-2 px-3">Year</th>
                      <th className="py-2 px-3 text-right">Principal Paid</th>
                      <th className="py-2 px-3 text-right">Interest Paid</th>
                      <th className="py-2 px-3 text-right">Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 font-mono font-medium">
                    {amortizationSchedule.map((row) => (
                      <tr key={row.year} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-zinc-850/40'}>
                        <td className="py-2 px-3 font-sans font-bold text-purple-400">Year {row.year}</td>
                        <td className="py-2 px-3 text-right text-purple-300">
                          {formatIndianCurrency(row.principalPaid, baseCurrency)}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-400">
                          {formatIndianCurrency(row.interestPaid, baseCurrency)}
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-400">
                          {formatIndianCurrency(row.endingBalance, baseCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SIP & COMPOUNDING WEALTH PLANNER */}
      {calcTab === 'sip' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-5 p-5 rounded-2xl border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-black text-sm flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Investment Strategy</span>
              </h3>
              {/* SIP vs Lumpsum toggle */}
              <div className="flex p-0.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSipMode('sip')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
                    sipMode === 'sip' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Monthly SIP
                </button>
                <button
                  type="button"
                  onClick={() => setSipMode('lumpsum')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
                    sipMode === 'lumpsum' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  One-time
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={`text-xs font-bold ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
                  {sipMode === 'sip' ? 'Monthly Investment' : 'Initial Lumpsum'} ({baseCurrency})
                </label>
                <span className="font-mono text-xs font-extrabold text-emerald-400">
                  {formatIndianCurrency(sipAmount, baseCurrency)}
                </span>
              </div>
              <input
                type="number"
                min="500"
                step="1000"
                value={sipAmount}
                onChange={e => setSipAmount(Math.max(100, Number(e.target.value)))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={sipAmount}
                onChange={e => setSipAmount(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={`text-xs font-bold ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Expected Annual Return (% p.a.)
                </label>
                <span className="font-mono text-xs font-extrabold text-emerald-400">{sipReturnRate}%</span>
              </div>
              <input
                type="number"
                step="0.5"
                min="1"
                max="30"
                value={sipReturnRate}
                onChange={e => setSipReturnRate(Math.max(1, Number(e.target.value)))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
              <input
                type="range"
                min="4"
                max="24"
                step="0.5"
                value={sipReturnRate}
                onChange={e => setSipReturnRate(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={`text-xs font-bold ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Investment Horizon
                </label>
                <span className="font-mono text-xs font-extrabold text-emerald-400">{sipYears} Years</span>
              </div>
              <input
                type="number"
                min="1"
                max="40"
                value={sipYears}
                onChange={e => setSipYears(Math.max(1, Number(e.target.value)))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
              <input
                type="range"
                min="1"
                max="35"
                value={sipYears}
                onChange={e => setSipYears(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-4 rounded-2xl border ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[11px] font-bold text-zinc-400 block mb-1">Total Invested</span>
                <span className={`text-xl font-black font-mono tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {formatIndianCurrency(totalInvested, baseCurrency)}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">Your capital</span>
              </div>

              <div className={`p-4 rounded-2xl border ${
                theme === 'light' ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-800/50'
              }`}>
                <span className="text-[11px] font-bold text-emerald-500 block mb-1">Wealth Gain (Est.)</span>
                <span className={`text-xl font-black font-mono tracking-tight ${theme === 'light' ? 'text-emerald-900' : 'text-emerald-300'}`}>
                  +{formatIndianCurrency(estimatedReturns, baseCurrency)}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 block mt-1">Compounding interest</span>
              </div>

              <div className={`p-4 rounded-2xl border ${
                theme === 'light' ? 'bg-purple-50 border-purple-200' : 'bg-purple-950/30 border-purple-800/50'
              }`}>
                <span className="text-[11px] font-bold text-purple-400 block mb-1">Total Corpus</span>
                <span className={`text-xl font-black font-mono tracking-tight ${theme === 'light' ? 'text-purple-950' : 'text-purple-200'}`}>
                  {formatIndianCurrency(totalWealth, baseCurrency)}
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 block mt-1">At year {sipYears}</span>
              </div>
            </div>

            {/* Growth Breakdown Table */}
            <div className={`p-5 rounded-2xl border space-y-3 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-zinc-300'}`}>
                  Yearly Compounding Progression
                </h4>
                <span className="text-[10px] text-zinc-500 font-bold">{sipReturnRate}% CAGR</span>
              </div>

              <div className="overflow-x-auto max-h-64 custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className={`sticky top-0 border-b font-black ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}>
                    <tr>
                      <th className="py-2 px-3">Year</th>
                      <th className="py-2 px-3 text-right">Invested Capital</th>
                      <th className="py-2 px-3 text-right">Future Value</th>
                      <th className="py-2 px-3 text-right">Unrealized Gain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 font-mono font-medium">
                    {sipBreakdown.map((row) => (
                      <tr key={row.year} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-zinc-850/40'}>
                        <td className="py-2 px-3 font-sans font-bold text-emerald-400">Year {row.year}</td>
                        <td className="py-2 px-3 text-right text-zinc-400">
                          {formatIndianCurrency(row.invested, baseCurrency)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-300 font-bold">
                          {formatIndianCurrency(row.value, baseCurrency)}
                        </td>
                        <td className="py-2 px-3 text-right text-purple-400">
                          +{formatIndianCurrency(Math.max(0, row.value - row.invested), baseCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY RUNWAY & AUDIT */}
      {calcTab === 'runway' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-5 p-5 rounded-2xl border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <h3 className={`font-black text-sm flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Emergency Liquid Cash Audit</span>
            </h3>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Based on your active bank accounts and cash in hand in Lyncost, this calculator evaluates your safety runway in case of sudden income disruption.
            </p>

            <div className={`p-3.5 rounded-xl border space-y-1.5 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
            }`}>
              <span className="text-[11px] font-bold text-zinc-400 block">Current Liquid Balance (Bank + Cash)</span>
              <span className="text-lg font-mono font-black text-blue-400">
                {formatIndianCurrency(totalLiquidBalance, baseCurrency)}
              </span>
              <p className="text-[10px] text-zinc-500">
                Extracted from {liquidAccounts.length} active liquid accounts.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={`text-xs font-bold ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Monthly Living Expenses ({baseCurrency})
                </label>
                <span className="font-mono text-xs font-extrabold text-blue-400">
                  {formatIndianCurrency(simulatedMonthlyExpense, baseCurrency)}
                </span>
              </div>
              <input
                type="number"
                min="1000"
                step="2000"
                value={simulatedMonthlyExpense}
                onChange={e => setSimulatedMonthlyExpense(Math.max(100, Number(e.target.value)))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
              <input
                type="range"
                min="5000"
                max="250000"
                step="2500"
                value={simulatedMonthlyExpense}
                onChange={e => setSimulatedMonthlyExpense(Number(e.target.value))}
                className="w-full mt-2 accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {/* Status Card */}
            <div className={`p-6 rounded-2xl border ${runwayTier.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider block opacity-80">
                    Runway Assessment
                  </span>
                  <h2 className="text-2xl font-black mt-1">{runwayTier.label}</h2>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black font-mono">{currentRunwayMonths.toFixed(1)}</span>
                  <span className="text-xs font-bold block opacity-80">Months of Survival</span>
                </div>
              </div>
              <p className="text-xs mt-3 leading-relaxed opacity-90 font-medium">
                {runwayTier.desc}
              </p>
            </div>

            {/* Target comparison */}
            <div className={`p-5 rounded-2xl border space-y-4 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <h4 className={`text-xs font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-zinc-300'}`}>
                Benchmark Safety Milestones
              </h4>

              <div className="space-y-3">
                {[
                  { targetMonths: 3, label: '3 Months (Basic Safety Cushion)' },
                  { targetMonths: 6, label: '6 Months (Recommended Solid Buffer)' },
                  { targetMonths: 12, label: '12 Months (Financial Fortress)' },
                ].map(({ targetMonths, label }) => {
                  const neededAmount = targetMonths * simulatedMonthlyExpense;
                  const delta = totalLiquidBalance - neededAmount;
                  const isAchieved = delta >= 0;

                  return (
                    <div
                      key={targetMonths}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isAchieved
                          ? theme === 'light'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-sm'
                            : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : theme === 'light'
                            ? 'bg-slate-50 border-slate-200 text-slate-700'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{label}</span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          Target: {formatIndianCurrency(neededAmount, baseCurrency)}
                        </span>
                      </div>
                      <div className="text-right">
                        {isAchieved ? (
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Achieved (+{formatIndianCurrency(delta, baseCurrency)})</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            Need {formatIndianCurrency(Math.abs(delta), baseCurrency)} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
