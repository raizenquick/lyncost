import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CsvParsedRow, CsvImportResult } from '../types';
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';

interface PreviewRow {
  rowNum: number;
  date: string;
  amount: number;
  txnType: string;
  categoryName?: string;
  note?: string;
  paymentType?: string;
  isValid: boolean;
  errorReason?: string;
}

export const CsvImportPage: React.FC = () => {
  const accounts = useAppStore(state => state.accounts);
  const categories = useAppStore(state => state.categories);
  const settings = useAppStore(state => state.settings);
  const importCsvTransactions = useAppStore(state => state.importCsvTransactions);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const [csvRawText, setCsvRawText] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);

  // Account & Category defaults
  const [targetAccountId, setTargetAccountId] = useState<number>(
    accounts.find((a) => a.is_archived === 0)?.id || accounts[0]?.id || 0
  );
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | null>(null);

  // Column Mappings
  const [dateColIdx, setDateColIdx] = useState<number>(-1);
  const [amountColIdx, setAmountColIdx] = useState<number>(-1);
  const [typeColIdx, setTypeColIdx] = useState<number>(-1);
  const [categoryColIdx, setCategoryColIdx] = useState<number>(-1);
  const [noteColIdx, setNoteColIdx] = useState<number>(-1);
  const [paymentTypeColIdx, setPaymentTypeColIdx] = useState<number>(-1);
  const [defaultType, setDefaultType] = useState<'expense' | 'income'>('expense');

  // Preview & Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const activeAccounts = accounts.filter((a) => a.is_archived === 0);
  const selectedAccount = accounts.find((a) => a.id === targetAccountId);
  const baseCurrency = settings?.base_currency || 'INR';

  // Helper to parse CSV lines handling quotes
  const parseCsv = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setParseError('CSV must contain a header line and at least one data row.');
      return;
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const parsedHeaders = parseLine(lines[0]);
    const parsedRows = lines.slice(1).map(parseLine);

    setHeaders(parsedHeaders);
    setRawRows(parsedRows);
    setParseError(null);

    // Auto-detect columns intelligently
    parsedHeaders.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower.includes('date') || lower.includes('time')) {
        setDateColIdx(idx);
      } else if (lower.includes('amount') || lower.includes('price') || lower.includes('total')) {
        setAmountColIdx(idx);
      } else if (lower.includes('type') || lower.includes('kind') || lower.includes('dr/cr')) {
        setTypeColIdx(idx);
      } else if (lower.includes('cat') || lower.includes('group')) {
        setCategoryColIdx(idx);
      } else if (lower.includes('note') || lower.includes('desc') || lower.includes('narration') || lower.includes('memo')) {
        setNoteColIdx(idx);
      } else if (lower.includes('pay') || lower.includes('mode') || lower.includes('method')) {
        setPaymentTypeColIdx(idx);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvRawText(content);
      parseCsv(content);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvRawText(text);
    if (text.trim()) {
      parseCsv(text);
    } else {
      setHeaders([]);
      setRawRows([]);
    }
  };

  // Generate preview rows
  const previewRows: PreviewRow[] = useMemo(() => rawRows.map((row, idx) => {
    const rowNum = idx + 1;
    let isValid = true;
    let errorReason = '';

    // Date
    const rawDate = dateColIdx >= 0 && row[dateColIdx] ? row[dateColIdx] : '';
    const date = rawDate || new Date().toISOString().split('T')[0];

    // Amount
    const rawAmountStr = amountColIdx >= 0 && row[amountColIdx] ? row[amountColIdx] : '';
    const cleanAmountStr = rawAmountStr.replace(/[^0-9.-]/g, '');
    const amount = parseFloat(cleanAmountStr);

    if (isNaN(amount) || amount <= 0) {
      isValid = false;
      errorReason = `Invalid amount '${rawAmountStr}' (must be > 0)`;
    }

    // Type
    let txnType = defaultType;
    if (typeColIdx >= 0 && row[typeColIdx]) {
      const val = row[typeColIdx].toLowerCase();
      if (val.includes('inc') || val.includes('cr') || val.includes('deposit') || val.includes('credit')) {
        txnType = 'income';
      } else if (val.includes('exp') || val.includes('dr') || val.includes('debit') || val.includes('withdraw')) {
        txnType = 'expense';
      }
    }

    // Category
    const categoryName = categoryColIdx >= 0 && row[categoryColIdx] ? row[categoryColIdx] : undefined;

    // Note
    const note = noteColIdx >= 0 && row[noteColIdx] ? row[noteColIdx] : undefined;

    // Payment Type
    const paymentType = paymentTypeColIdx >= 0 && row[paymentTypeColIdx] ? row[paymentTypeColIdx] : undefined;

    return {
      rowNum,
      date,
      amount: isNaN(amount) ? 0 : amount,
      txnType,
      categoryName,
      note,
      paymentType,
      isValid,
      errorReason,
    };
  }), [rawRows, dateColIdx, amountColIdx, typeColIdx, categoryColIdx, noteColIdx, paymentTypeColIdx, defaultType]);

  const validRowsCount = previewRows.filter((r) => r.isValid).length;
  const invalidRowsCount = previewRows.length - validRowsCount;

  const handleCommitImport = async () => {
    if (!targetAccountId) {
      alert('Please select a target account.');
      return;
    }

    const validPayloadRows: CsvParsedRow[] = previewRows
      .filter((r) => r.isValid)
      .map((r) => ({
        date: r.date,
        amount: r.amount,
        txn_type: r.txnType,
        category_name: r.categoryName || null,
        note: r.note || null,
        payment_type: r.paymentType || 'other',
      }));

    if (validPayloadRows.length === 0) {
      alert('No valid rows to import.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await importCsvTransactions({
        target_account_id: targetAccountId,
        default_category_id: defaultCategoryId,
        rows: validPayloadRows,
      });

      // Append frontend invalid rows to failed_rows so user sees everything that didn't import
      const allFailed = [
        ...previewRows.filter((r) => !r.isValid).map((r) => `Row ${r.rowNum}: ${r.errorReason}`),
        ...res.failed_rows,
      ];

      setImportResult({
        imported_count: res.imported_count,
        failed_rows: allFailed,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCsvRawText('');
    setHeaders([]);
    setRawRows([]);
    setImportResult(null);
    setParseError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            CSV Import
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Import statements from bank CSVs with column mapping and row validation
          </p>
        </div>

        {headers.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Step 1: Upload / Input if no file parsed yet */}
      {headers.length === 0 && (
        <div className="space-y-4">
          <div className="bg-zinc-900/80 border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center hover:border-emerald-500/50 transition-colors">
            <Upload className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Upload CSV Statement File</h3>
            <p className="text-xs text-zinc-400 mb-4 max-w-sm mx-auto">
              Select a .csv file exported from your bank or money manager app.
            </p>
            <label className="inline-block px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors">
              <span>Choose CSV File</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4">
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Or Paste CSV Data Directly:
            </label>
            <textarea
              rows={5}
              value={csvRawText}
              onChange={handlePasteChange}
              placeholder="Date,Amount,Type,Category,Note&#10;2026-09-01,250.00,expense,Groceries,Supermarket&#10;2026-09-02,1500.00,income,Salary,Bonus"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {parseError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Mapping & Preview when CSV is loaded */}
      {headers.length > 0 && !importResult && (
        <div className="space-y-6">
          {/* Target Account & Default Category */}
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Target Account to Import Into *
              </label>
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(parseInt(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl  font-bold text-xs focus:outline-none focus:border-purple-500"
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency} {a.current_balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Fallback Category (for unmapped rows)
              </label>
              <select
                value={defaultCategoryId || ''}
                onChange={(e) => setDefaultCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3.5 py-2 rounded-xl  font-bold text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="">-- None (Keep Uncategorized) --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.kind})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Column Mapping Selector */}
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              Map CSV Columns
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Date Column *
                </label>
                <select
                  value={dateColIdx}
                  onChange={(e) => setDateColIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg  font-bold text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value={-1}>-- Not selected --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Amount Column *
                </label>
                <select
                  value={amountColIdx}
                  onChange={(e) => setAmountColIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg  font-bold text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value={-1}>-- Not selected --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Type / Debit-Credit Column
                </label>
                <select
                  value={typeColIdx}
                  onChange={(e) => setTypeColIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg  font-bold text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value={-1}>Default to '{defaultType}'</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
                {typeColIdx === -1 && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500">
                    <span>Default fallback:</span>
                    <button
                      type="button"
                      onClick={() => setDefaultType(defaultType === 'expense' ? 'income' : 'expense')}
                      className="text-emerald-400 hover:underline font-semibold cursor-pointer capitalize"
                    >
                      {defaultType}
                    </button>
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Category Column
                </label>
                <select
                  value={categoryColIdx}
                  onChange={(e) => setCategoryColIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg  font-bold text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value={-1}>-- Optional --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note / Description */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Description / Note Column
                </label>
                <select
                  value={noteColIdx}
                  onChange={(e) => setNoteColIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg  font-bold text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value={-1}>-- Optional --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Payment Method Column
                </label>
                <select
                  value={paymentTypeColIdx}
                  onChange={(e) => setPaymentTypeColIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg  font-bold text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value={-1}>-- Optional (other) --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Validation Status Banner */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">
                  {validRowsCount} Valid Transactions Ready
                </span>
                <span className="text-xs text-zinc-400">
                  {invalidRowsCount > 0
                    ? `${invalidRowsCount} row(s) contain errors and will be clearly reported`
                    : 'All rows parsed cleanly'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCommitImport}
              disabled={isProcessing || validRowsCount === 0}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-colors disabled:opacity-50"
            >
              {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Import {validRowsCount} Transactions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Live Preview Table */}
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Import Preview ({previewRows.length} total rows)
              </h4>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950/60 sticky top-0 border-b border-zinc-800 text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs">
                  {previewRows.map((r) => (
                    <tr
                      key={r.rowNum}
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        !r.isValid ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-zinc-500">{r.rowNum}</td>
                      <td className="py-2.5 px-3">
                        {r.isValid ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit" title={r.errorReason}>
                            <AlertTriangle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300 font-mono text-[11px]">
                        {r.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`capitalize font-semibold ${
                            r.txnType === 'income' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {r.txnType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {selectedAccount?.currency || baseCurrency} {r.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        {r.categoryName || (defaultCategoryId ? 'Default Category' : '—')}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 truncate max-w-xs">
                        {r.isValid ? r.note || '—' : <span className="text-rose-400">{r.errorReason}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Post-Import Results Report */}
      {importResult && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Import Finished Successfully
              </h3>
              <p className="text-xs text-zinc-400">
                <strong>{importResult.imported_count}</strong> transactions were recorded in the ledger and account balance updated.
              </p>
            </div>
          </div>

          {/* Failed rows report (Task 6: clear handling of rows that fail to parse — show them, don't silently skip) */}
          {importResult.failed_rows.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Skipped / Unparsed Rows ({importResult.failed_rows.length})
              </h4>
              <p className="text-[11px] text-zinc-400">
                The following rows could not be parsed and were safely excluded rather than silently dropped:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-xs">
                {importResult.failed_rows.map((msg, i) => (
                  <div key={i} className="text-rose-300/90 py-0.5">
                    • {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
            >
              Import Another File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-purple-950/50"
            >
              View Transactions List
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
