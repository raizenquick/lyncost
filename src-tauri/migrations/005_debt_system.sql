-- Migration 005: Advanced Debt, Loan Drawdown, and Repayment Ledger

-- Add extended columns to debts table if not present
ALTER TABLE debts ADD COLUMN total_borrowed REAL DEFAULT 0;
ALTER TABLE debts ADD COLUMN total_paid REAL DEFAULT 0;
ALTER TABLE debts ADD COLUMN debt_type TEXT DEFAULT 'personal_loan';
ALTER TABLE debts ADD COLUMN min_payment REAL DEFAULT 0;
ALTER TABLE debts ADD COLUMN account_id INTEGER REFERENCES accounts(id);

-- Backfill total_borrowed and total_paid for existing debts
UPDATE debts SET total_borrowed = principal WHERE total_borrowed IS NULL OR total_borrowed = 0;
UPDATE debts SET total_paid = MAX(0, principal - current_balance) WHERE total_paid IS NULL OR total_paid = 0;

-- Create debt_transactions table to record individual draws, repayments, and spends
CREATE TABLE IF NOT EXISTS debt_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  txn_type TEXT NOT NULL, -- 'payment', 'draw', 'expense', 'interest'
  amount REAL NOT NULL,
  txn_date TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id),
  category_id INTEGER REFERENCES categories(id),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_debt_txns_debt_id ON debt_transactions(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_txns_date ON debt_transactions(txn_date);
