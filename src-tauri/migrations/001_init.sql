CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_currency TEXT NOT NULL DEFAULT 'INR',
  pin_hash TEXT,
  theme TEXT DEFAULT 'dark',
  last_backup_at TEXT,
  last_networth_snapshot_at TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank','cash','investment','credit_card','other')),
  currency TEXT NOT NULL DEFAULT 'INR',
  opening_balance REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
  parent_id INTEGER REFERENCES categories(id),
  icon TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  category_id INTEGER REFERENCES categories(id),
  transfer_to_account_id INTEGER REFERENCES accounts(id),
  amount REAL NOT NULL,
  payment_type TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  next_due_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  note TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  category_id INTEGER REFERENCES categories(id),
  transfer_to_account_id INTEGER REFERENCES accounts(id),
  amount REAL NOT NULL,
  base_amount REAL NOT NULL,
  exchange_rate_used REAL DEFAULT 1,
  payment_type TEXT CHECK (payment_type IN ('cash','upi','card','bank_transfer','other')),
  txn_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  is_confirmed INTEGER DEFAULT 1,
  recurring_rule_id INTEGER REFERENCES recurring_rules(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id),
  PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly','monthly','custom')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  rollover INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budget_categories (
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id),
  PRIMARY KEY (budget_id, category_id)
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id),
  category_id INTEGER REFERENCES categories(id),
  is_paid INTEGER DEFAULT 0,
  recurrence TEXT CHECK (recurrence IN ('none','monthly','yearly'))
);

CREATE TABLE IF NOT EXISTS investment_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock','crypto','mutual_fund','other')),
  symbol TEXT NOT NULL,
  name TEXT,
  quantity REAL NOT NULL,
  avg_buy_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  last_price REAL NOT NULL,
  last_price_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  is_archived INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS investment_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holding_id INTEGER REFERENCES investment_holdings(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency, to_currency)
);

CREATE TABLE IF NOT EXISTS debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  principal REAL NOT NULL,
  current_balance REAL NOT NULL,
  interest_rate REAL DEFAULT 0,
  due_date TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS networth_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT NOT NULL,
  total_accounts REAL NOT NULL,
  total_investments REAL NOT NULL,
  total_debts REAL NOT NULL,
  net_worth REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS account_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  txn_type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  txn_date TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_checked INTEGER DEFAULT 0,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warranties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  purchase_date TEXT,
  expires_on TEXT,
  transaction_id INTEGER REFERENCES transactions(id),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);
