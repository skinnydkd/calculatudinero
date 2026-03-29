/**
 * Input validation utilities for calculator forms.
 * All functions are pure — no side effects.
 */

/**
 * Validate that a value is a positive number.
 * Accepts numbers and numeric strings.
 * @param value - The value to validate
 * @returns The parsed positive number, or null if invalid
 */
export function validatePositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const num = typeof value === 'number' ? value : Number(value);

  if (isNaN(num) || !isFinite(num) || num < 0) return null;

  return num;
}

/**
 * Validate that a date range is coherent (start before end, both valid).
 * @param start - Start date
 * @param end - End date
 * @returns true if the range is valid
 */
export function validateDateRange(start: Date, end: Date): boolean {
  if (!(start instanceof Date) || !(end instanceof Date)) return false;
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  return start < end;
}

/**
 * Validate a gross salary amount against reasonable Spanish salary bounds.
 * @param gross - Annual gross salary in euros
 * @returns Object with valid flag and optional error message
 */
export function validateSalary(gross: number): { valid: boolean; error?: string } {
  if (typeof gross !== 'number' || isNaN(gross)) {
    return { valid: false, error: 'El salario debe ser un número válido' };
  }

  if (gross < 0) {
    return { valid: false, error: 'El salario no puede ser negativo' };
  }

  if (gross < 1000) {
    return { valid: false, error: 'El salario anual parece demasiado bajo. ¿Has introducido el salario mensual por error?' };
  }

  if (gross > 1_000_000) {
    return { valid: false, error: 'El salario introducido supera 1.000.000€. Verifica el importe.' };
  }

  return { valid: true };
}
