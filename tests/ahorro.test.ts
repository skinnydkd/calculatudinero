import { describe, it, expect } from 'vitest';
import { calcularInteresCompuesto } from '@lib/calculations/ahorro';

describe('calcularInteresCompuesto', () => {
  it('calculates compound interest with monthly contributions', () => {
    const result = calcularInteresCompuesto({
      capitalInicial: 10000,
      aportacionMensual: 200,
      tasaAnual: 7,
      plazoAnios: 20,
      inflacionAnual: 0,
    });

    const totalAportado = 10000 + 200 * 12 * 20; // 58000
    expect(result.totalAportado).toBe(totalAportado);
    expect(result.capitalFinal).toBeGreaterThan(100000); // compound growth
    expect(result.totalIntereses).toBe(result.capitalFinal - result.totalAportado);
  });

  it('reduces real value with inflation', () => {
    const sinInflacion = calcularInteresCompuesto({
      capitalInicial: 10000,
      aportacionMensual: 100,
      tasaAnual: 5,
      plazoAnios: 10,
      inflacionAnual: 0,
    });

    const conInflacion = calcularInteresCompuesto({
      capitalInicial: 10000,
      aportacionMensual: 100,
      tasaAnual: 5,
      plazoAnios: 10,
      inflacionAnual: 2.5,
    });

    expect(sinInflacion.capitalFinal).toBe(conInflacion.capitalFinal); // nominal same
    expect(conInflacion.capitalFinalReal).toBeLessThan(conInflacion.capitalFinal);
  });

  it('stays at 0 with no capital and no contributions', () => {
    const result = calcularInteresCompuesto({
      capitalInicial: 0,
      aportacionMensual: 0,
      tasaAnual: 10,
      plazoAnios: 30,
      inflacionAnual: 0,
    });

    expect(result.capitalFinal).toBe(0);
    expect(result.totalIntereses).toBe(0);
  });

  it('generates yearly snapshots', () => {
    const result = calcularInteresCompuesto({
      capitalInicial: 5000,
      aportacionMensual: 100,
      tasaAnual: 6,
      plazoAnios: 15,
      inflacionAnual: 2,
    });

    expect(result.evolucionAnual).toHaveLength(15);
    expect(result.evolucionAnual[0].anio).toBe(1);
    expect(result.evolucionAnual[14].anio).toBe(15);

    // Each year should be higher than previous (positive rate)
    for (let i = 1; i < result.evolucionAnual.length; i++) {
      expect(result.evolucionAnual[i].capitalAcumulado)
        .toBeGreaterThan(result.evolucionAnual[i - 1].capitalAcumulado);
    }
  });

  it('handles only initial capital, no monthly', () => {
    const result = calcularInteresCompuesto({
      capitalInicial: 10000,
      aportacionMensual: 0,
      tasaAnual: 7,
      plazoAnios: 10,
      inflacionAnual: 0,
    });

    // Monthly compounding: 10000 * (1 + 0.07/12)^120 ≈ 20097
    expect(result.capitalFinal).toBeCloseTo(20097, -1);
    expect(result.totalAportado).toBe(10000);
  });

  it('handles 0% interest rate', () => {
    const result = calcularInteresCompuesto({
      capitalInicial: 1000,
      aportacionMensual: 100,
      tasaAnual: 0,
      plazoAnios: 5,
      inflacionAnual: 0,
    });

    expect(result.capitalFinal).toBe(1000 + 100 * 12 * 5);
    expect(result.totalIntereses).toBe(0);
  });
});
