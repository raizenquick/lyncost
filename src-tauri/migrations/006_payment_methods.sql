-- Migration 006: Custom & Regional Payment Methods System
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type_key TEXT NOT NULL DEFAULT 'custom',
    currency TEXT,
    icon TEXT DEFAULT 'Wallet',
    color TEXT DEFAULT '#8b5cf6',
    is_default INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type_key);

-- Seed universal base payment methods
INSERT OR IGNORE INTO payment_methods (id, name, type_key, icon, color, is_default, is_active)
VALUES 
    (1, 'Cash', 'cash', 'Coins', '#10b981', 1, 1),
    (2, 'Bank Account', 'bank', 'Building2', '#3b82f6', 0, 1),
    (3, 'Credit Card', 'credit_card', 'CreditCard', '#f43f5e', 0, 1),
    (4, 'Debit Card', 'debit_card', 'CreditCard', '#06b6d4', 0, 1);
