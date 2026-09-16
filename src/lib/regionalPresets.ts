export interface RegionalPresetInfo {
  currency: string;
  regionName: string;
  description: string;
  defaultNumberFormat: 'indian' | 'international';
  methods: Array<{
    name: string;
    type_key: string;
    icon: string;
    color: string;
    is_default?: number;
  }>;
}

export const REGIONAL_PRESETS: Record<string, RegionalPresetInfo> = {
  INR: {
    currency: 'INR',
    regionName: 'India',
    description: 'UPI (PhonePe, GPay, Paytm), NetBanking, Cash & RuPay/Visa cards',
    defaultNumberFormat: 'indian',
    methods: [
      { name: 'Cash', type_key: 'cash', icon: 'Coins', color: '#10b981' },
      { name: 'Bank Account', type_key: 'bank', icon: 'Building2', color: '#3b82f6' },
      { name: 'UPI (GPay / PhonePe)', type_key: 'upi', icon: 'Smartphone', color: '#8b5cf6', is_default: 1 },
      { name: 'Credit Card', type_key: 'credit_card', icon: 'CreditCard', color: '#f43f5e' },
      { name: 'Debit Card', type_key: 'debit_card', icon: 'CreditCard', color: '#06b6d4' },
      { name: 'Paytm Wallet', type_key: 'wallet', icon: 'Wallet', color: '#0284c7' },
      { name: 'Net Banking', type_key: 'bank', icon: 'Globe', color: '#4f46e5' },
    ],
  },
  USD: {
    currency: 'USD',
    regionName: 'United States',
    description: 'Apple Pay, Google Pay, Checking, Credit Card, Venmo, Zelle & PayPal',
    defaultNumberFormat: 'international',
    methods: [
      { name: 'Cash', type_key: 'cash', icon: 'Coins', color: '#10b981' },
      { name: 'Checking Account', type_key: 'bank', icon: 'Building2', color: '#3b82f6', is_default: 1 },
      { name: 'Credit Card', type_key: 'credit_card', icon: 'CreditCard', color: '#f43f5e' },
      { name: 'Debit Card', type_key: 'debit_card', icon: 'CreditCard', color: '#06b6d4' },
      { name: 'Apple Pay', type_key: 'wallet', icon: 'Smartphone', color: '#94a3b8' },
      { name: 'Google Pay', type_key: 'wallet', icon: 'Smartphone', color: '#4285f4' },
      { name: 'Venmo', type_key: 'wallet', icon: 'Send', color: '#008cff' },
      { name: 'Zelle', type_key: 'bank', icon: 'Zap', color: '#7414ca' },
      { name: 'PayPal', type_key: 'wallet', icon: 'Wallet', color: '#003087' },
    ],
  },
  EUR: {
    currency: 'EUR',
    regionName: 'Eurozone',
    description: 'SEPA Bank Transfer, Revolut, Apple Pay, Google Pay & Cards',
    defaultNumberFormat: 'international',
    methods: [
      { name: 'Cash', type_key: 'cash', icon: 'Coins', color: '#10b981' },
      { name: 'Bank Account (SEPA)', type_key: 'bank', icon: 'Building2', color: '#3b82f6', is_default: 1 },
      { name: 'Credit Card', type_key: 'credit_card', icon: 'CreditCard', color: '#f43f5e' },
      { name: 'Debit Card', type_key: 'debit_card', icon: 'CreditCard', color: '#06b6d4' },
      { name: 'Apple Pay', type_key: 'wallet', icon: 'Smartphone', color: '#94a3b8' },
      { name: 'Google Pay', type_key: 'wallet', icon: 'Smartphone', color: '#4285f4' },
      { name: 'Revolut', type_key: 'bank', icon: 'Wallet', color: '#0075eb' },
      { name: 'PayPal', type_key: 'wallet', icon: 'Wallet', color: '#003087' },
    ],
  },
  GBP: {
    currency: 'GBP',
    regionName: 'United Kingdom',
    description: 'Faster Payments, Monzo, Revolut, Apple Pay & Contactless cards',
    defaultNumberFormat: 'international',
    methods: [
      { name: 'Cash', type_key: 'cash', icon: 'Coins', color: '#10b981' },
      { name: 'Bank Account', type_key: 'bank', icon: 'Building2', color: '#3b82f6', is_default: 1 },
      { name: 'Credit Card', type_key: 'credit_card', icon: 'CreditCard', color: '#f43f5e' },
      { name: 'Debit Card', type_key: 'debit_card', icon: 'CreditCard', color: '#06b6d4' },
      { name: 'Apple Pay', type_key: 'wallet', icon: 'Smartphone', color: '#94a3b8' },
      { name: 'Google Pay', type_key: 'wallet', icon: 'Smartphone', color: '#4285f4' },
      { name: 'Monzo / Revolut', type_key: 'bank', icon: 'Wallet', color: '#ff3366' },
    ],
  },
  JPY: {
    currency: 'JPY',
    regionName: 'Japan',
    description: '現金, 銀行振込, PayPay, 交通系IC (Suica/Pasmo), LINE Pay',
    defaultNumberFormat: 'international',
    methods: [
      { name: '現金 (Cash)', type_key: 'cash', icon: 'Coins', color: '#10b981', is_default: 1 },
      { name: '銀行振込 (Bank)', type_key: 'bank', icon: 'Building2', color: '#3b82f6' },
      { name: 'クレジットカード (Card)', type_key: 'credit_card', icon: 'CreditCard', color: '#f43f5e' },
      { name: 'PayPay', type_key: 'wallet', icon: 'Smartphone', color: '#ff0033' },
      { name: '交通系IC (Suica / Pasmo)', type_key: 'wallet', icon: 'CreditCard', color: '#22c55e' },
      { name: 'LINE Pay', type_key: 'wallet', icon: 'Smartphone', color: '#06c755' },
    ],
  },
  BRL: {
    currency: 'BRL',
    regionName: 'Brazil',
    description: 'Pix, Conta Bancária, Cartões de Crédito/Débito, Boleto',
    defaultNumberFormat: 'international',
    methods: [
      { name: 'Dinheiro (Cash)', type_key: 'cash', icon: 'Coins', color: '#10b981' },
      { name: 'Conta Bancária', type_key: 'bank', icon: 'Building2', color: '#3b82f6' },
      { name: 'Pix', type_key: 'upi', icon: 'Zap', color: '#32bcad', is_default: 1 },
      { name: 'Cartão de Crédito', type_key: 'credit_card', icon: 'CreditCard', color: '#f43f5e' },
      { name: 'Cartão de Débito', type_key: 'debit_card', icon: 'CreditCard', color: '#06b6d4' },
      { name: 'Boleto', type_key: 'custom', icon: 'FileText', color: '#f59e0b' },
    ],
  },
};

export function getRegionalPresetForCurrency(currencyCode?: string): RegionalPresetInfo | null {
  if (!currencyCode) return null;
  const upper = currencyCode.trim().toUpperCase();
  return REGIONAL_PRESETS[upper] || null;
}
