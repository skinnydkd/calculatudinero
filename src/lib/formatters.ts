/**
 * Formatting and parsing utilities for Spanish locale numbers, currencies, and dates.
 * All functions are pure — no side effects.
 */

/**
 * Format a number as currency in Spanish locale: 1.234,56 €
 * @param amount - The monetary amount to format
 * @returns Formatted string with € symbol
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a percentage in Spanish locale: 12,5%
 * @param value - The percentage value (e.g. 12.5 for 12.5%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return (
    new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value) + '%'
  );
}

/**
 * Format a Date object in Spanish long format: "29 de marzo de 2026"
 * @param date - The date to format
 * @returns Formatted date string in Spanish
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Parse a Spanish-formatted number string into a JavaScript number.
 * Handles dot as thousands separator and comma as decimal separator.
 * @param input - Spanish number string, e.g. "1.234,56"
 * @returns Parsed number, e.g. 1234.56. Returns NaN if unparseable.
 */
export function parseSpanishNumber(input: string): number {
  if (typeof input !== 'string') return NaN;
  const cleaned = input.trim().replace(/\./g, '').replace(',', '.');
  const result = parseFloat(cleaned);
  return result;
}

/**
 * Round a number to 2 decimal places using banker's rounding avoidance
 * (standard Math.round with epsilon correction).
 * @param n - Number to round
 * @returns Number rounded to 2 decimal places
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
