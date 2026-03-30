import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, round2, parseSpanishNumber } from '@lib/formatters';

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(1.004)).toBe(1);
    expect(round2(1.555)).toBe(1.56);
    expect(round2(100)).toBe(100);
  });

  it('handles negative numbers', () => {
    expect(round2(-1.555)).toBe(-1.55);
    expect(Math.abs(round2(-0.001))).toBe(0);
  });

  it('handles zero', () => {
    expect(round2(0)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats as Spanish locale with € symbol', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('234,56');
    expect(result).toContain('€');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0,00');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-500.1);
    expect(result).toContain('500,10');
  });
});

describe('formatPercent', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercent(12.5)).toBe('12,5%');
  });

  it('formats with custom decimals', () => {
    expect(formatPercent(12.55, 2)).toBe('12,55%');
    expect(formatPercent(12, 0)).toBe('12%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0,0%');
  });
});

describe('parseSpanishNumber', () => {
  it('parses standard Spanish format', () => {
    expect(parseSpanishNumber('1.234,56')).toBe(1234.56);
  });

  it('parses without thousands separator', () => {
    expect(parseSpanishNumber('234,56')).toBe(234.56);
  });

  it('parses integer', () => {
    expect(parseSpanishNumber('1.000')).toBe(1000);
  });

  it('returns NaN for invalid input', () => {
    expect(parseSpanishNumber('abc')).toBeNaN();
  });

  it('handles non-string input', () => {
    expect(parseSpanishNumber(42 as unknown as string)).toBeNaN();
  });
});
