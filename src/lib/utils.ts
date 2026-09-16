import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type NumberFormatSystem = 'international' | 'indian';
export type DateFormatSystem = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';

export const POPULAR_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese Yuan (CNY)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (SGD)' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar (NZD)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real (BRL)' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand (ZAR)' },
] as const;

export const ZERO_DECIMAL_CURRENCIES = [
  'JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX', 'RWF', 'BIF', 'KMF', 'DJF', 'GNF'
] as const;

export function getDefaultNumberFormatForCurrency(currencyCode?: string): NumberFormatSystem {
  const code = (currencyCode || 'INR').trim().toUpperCase();
  return code === 'INR' ? 'indian' : 'international';
}

export function autoSyncNumberFormatWithCurrency(currencyCode?: string): void {
  if (typeof window === 'undefined') return;
  const targetFormat = getDefaultNumberFormatForCurrency(currencyCode);
  setNumberFormatSystem(targetFormat);
}

export function getNumberFormatSystem(): NumberFormatSystem {
  if (typeof window === 'undefined') return 'international';
  const saved = localStorage.getItem('lyncost_number_format');
  if (saved === 'indian' || saved === 'international') {
    return saved;
  }
  const baseCurr = localStorage.getItem('lyncost_base_currency') || 'INR';
  return getDefaultNumberFormatForCurrency(baseCurr);
}

export function setNumberFormatSystem(format: NumberFormatSystem): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lyncost_number_format', format);
    window.dispatchEvent(new Event('lyncost_format_changed'));
  }
}

export function getDateFormatSystem(): DateFormatSystem {
  if (typeof window === 'undefined') return 'YYYY-MM-DD';
  const saved = localStorage.getItem('lyncost_date_format');
  if (saved === 'DD/MM/YYYY' || saved === 'MM/DD/YYYY' || saved === 'YYYY-MM-DD') {
    return saved;
  }
  return 'YYYY-MM-DD';
}

export function setDateFormatSystem(format: DateFormatSystem): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lyncost_date_format', format);
    window.dispatchEvent(new Event('lyncost_format_changed'));
  }
}

/**
 * Format currency value according to selected currency, number system (International vs Indian),
 * and currency-specific decimal rules (e.g. 0 decimals for JPY/KRW).
 */
export function formatCurrency(
  val: number | string | null | undefined,
  currencyCode?: string,
  ignorePrivacy = false
): string {
  if (!ignorePrivacy && typeof window !== 'undefined' && localStorage.getItem('lyncost_privacy_mode') === 'true') {
    return '••••••';
  }

  const num = Number(val) || 0;
  const numSystem = getNumberFormatSystem();
  const savedBaseCurrency = (typeof window !== 'undefined' && localStorage.getItem('lyncost_base_currency')) || 'INR';
  const curr = (currencyCode || savedBaseCurrency || 'INR').trim().toUpperCase();

  const locale = numSystem === 'indian' ? 'en-IN' : 'en-US';
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(curr as any);
  const fractionDigits = isZeroDecimal ? 0 : 2;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    }).format(num);
  } catch {
    // Fallback if currency code is custom or unsupported by standard Intl
    const formatted = num.toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `${curr} ${formatted}`;
  }
}

/**
 * Format date according to user preference (YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY)
 */
export function formatDate(dateStrOrObj?: string | Date | null): string {
  if (!dateStrOrObj) return '';
  const dateSystem = getDateFormatSystem();
  try {
    let year = '';
    let month = '';
    let day = '';

    if (typeof dateStrOrObj === 'string') {
      const clean = dateStrOrObj.trim().split(' ')[0].split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        [year, month, day] = parts;
      }
    }

    if (!year) {
      const d = new Date(dateStrOrObj);
      if (isNaN(d.getTime())) return String(dateStrOrObj);
      day = String(d.getDate()).padStart(2, '0');
      month = String(d.getMonth() + 1).padStart(2, '0');
      year = String(d.getFullYear());
    }

    day = day.padStart(2, '0');
    month = month.padStart(2, '0');

    if (dateSystem === 'DD/MM/YYYY') {
      return `${day}/${month}/${year}`;
    } else if (dateSystem === 'MM/DD/YYYY') {
      return `${month}/${day}/${year}`;
    } else {
      return `${year}-${month}-${day}`;
    }
  } catch {
    return String(dateStrOrObj);
  }
}

/**
 * Format datetime with user's date format + 12-hour time
 */
export function formatDateTime(dateStrOrObj?: string | Date | null): string {
  if (!dateStrOrObj) return '';
  try {
    const d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) {
      return formatDate(dateStrOrObj);
    }
    const datePart = formatDate(d);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${datePart}, ${formattedHours}:${minutes} ${ampm}`;
  } catch {
    return String(dateStrOrObj);
  }
}

// Backward compatibility aliases for existing components
export const formatIndianCurrency = formatCurrency;
export const formatIndianDate = formatDate;
export const formatIndianDateTime = formatDateTime;
