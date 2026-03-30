import { describe, it, expect } from 'vitest';
import { calcularCuotaPorTramos, esForalCcaa } from '@lib/calculations/shared';
import irpfData from '@data/irpf-2026.json';
import type { IRPFData, TramoIRPF } from '@lib/types';

const irpf = irpfData as unknown as IRPFData;

// ===========================================================================
// calcularCuotaPorTramos
// ===========================================================================

describe('calcularCuotaPorTramos', () => {
  const tramosEstatales = irpf.tramosEstatales;

  it('returns 0 for base = 0', () => {
    expect(calcularCuotaPorTramos(0, tramosEstatales)).toBe(0);
  });

  it('returns 0 for negative base', () => {
    expect(calcularCuotaPorTramos(-5000, tramosEstatales)).toBe(0);
  });

  it('calculates correctly within the first bracket only', () => {
    // 10000 at 9.5% = 950
    const result = calcularCuotaPorTramos(10000, tramosEstatales);
    expect(result).toBeCloseTo(950, 2);
  });

  it('calculates correctly at exact bracket boundary (12450)', () => {
    // 12450 at 9.5% = 1182.75
    const result = calcularCuotaPorTramos(12450, tramosEstatales);
    expect(result).toBeCloseTo(1182.75, 2);
  });

  it('calculates correctly spanning two brackets', () => {
    // 20200: first 12450 at 9.5% = 1182.75, next 7750 at 12% = 930
    // Total = 2112.75
    const result = calcularCuotaPorTramos(20200, tramosEstatales);
    expect(result).toBeCloseTo(2112.75, 2);
  });

  it('calculates correctly spanning three brackets (35200)', () => {
    // 12450 at 9.5% = 1182.75
    // 7750 at 12% = 930
    // 15000 at 15% = 2250
    // Total = 4362.75
    const result = calcularCuotaPorTramos(35200, tramosEstatales);
    expect(result).toBeCloseTo(4362.75, 2);
  });

  it('handles large base reaching last open bracket', () => {
    // For a very high base, the function should keep applying the last bracket
    const result = calcularCuotaPorTramos(500000, tramosEstatales);
    expect(result).toBeGreaterThan(0);
    // Partial manual calculation:
    // 12450*0.095 + 7750*0.12 + 15000*0.15 + 24800*0.185 + 240000*0.225 + 200000*0.245
    // = 1182.75 + 930 + 2250 + 4588 + 54000 + 49000 = 111950.75
    expect(result).toBeCloseTo(111950.75, 2);
  });

  it('handles a single-bracket array', () => {
    const singleTramo: TramoIRPF[] = [
      { desde: 0, hasta: null, tipo: 20 },
    ];
    const result = calcularCuotaPorTramos(10000, singleTramo);
    expect(result).toBeCloseTo(2000, 2);
  });

  it('works with Navarra foral brackets', () => {
    const navarraTramos = irpf.tramosAutonomicos['navarra'].tramos;
    // 4080 at 13% = 530.40
    const result = calcularCuotaPorTramos(4080, navarraTramos);
    expect(result).toBeCloseTo(530.40, 2);
  });

  it('works with a very small positive base', () => {
    const result = calcularCuotaPorTramos(0.01, tramosEstatales);
    expect(result).toBeCloseTo(0.01 * 0.095, 4);
  });
});

// ===========================================================================
// esForalCcaa
// ===========================================================================

describe('esForalCcaa', () => {
  it('returns true for navarra', () => {
    expect(esForalCcaa('navarra')).toBe(true);
  });

  it('returns true for pais-vasco', () => {
    expect(esForalCcaa('pais-vasco')).toBe(true);
  });

  it('returns false for madrid', () => {
    expect(esForalCcaa('madrid')).toBe(false);
  });

  it('returns false for cataluna', () => {
    expect(esForalCcaa('cataluna')).toBe(false);
  });

  it('returns false for andalucia', () => {
    expect(esForalCcaa('andalucia')).toBe(false);
  });

  it('returns false for canarias', () => {
    expect(esForalCcaa('canarias')).toBe(false);
  });

  it('returns false for ceuta', () => {
    expect(esForalCcaa('ceuta')).toBe(false);
  });

  it('returns false for valencia', () => {
    expect(esForalCcaa('valencia')).toBe(false);
  });
});
