import { describe, it, expect } from 'vitest';
import { calcularPrestamoPersonal, compararPrestamos } from '@lib/calculations/ahorro';

describe('calcularPrestamoPersonal', () => {
  it('calculates monthly payment with French amortization formula', () => {
    // 10000€ at 7% TIN for 48 months, no commission, no insurance
    const result = calcularPrestamoPersonal({
      capital: 10000,
      tin: 7,
      plazoMeses: 48,
      comisionApertura: 0,
      seguroMensual: 0,
    });

    // French formula: M = 10000 * (0.07/12) * (1+0.07/12)^48 / ((1+0.07/12)^48 - 1)
    // ≈ 239.46
    expect(result.cuotaMensual).toBeCloseTo(239.46, 0);
    expect(result.totalPagado).toBeCloseTo(239.46 * 48, 0);
    expect(result.totalIntereses).toBeCloseTo(result.totalPagado - 10000, 0);
    expect(result.comisionAperturaImporte).toBe(0);
    expect(result.totalSeguros).toBe(0);
    expect(result.costeTotal).toBeCloseTo(result.totalPagado, 0);
  });

  it('TAE > TIN when there are commissions and insurance', () => {
    const result = calcularPrestamoPersonal({
      capital: 10000,
      tin: 7,
      plazoMeses: 48,
      comisionApertura: 1.5,
      seguroMensual: 15,
    });

    expect(result.taeCalculada).toBeGreaterThan(7);
    expect(result.comisionAperturaImporte).toBe(150);
    expect(result.totalSeguros).toBe(720);
    expect(result.costeTotal).toBe(
      result.totalPagado + result.comisionAperturaImporte + result.totalSeguros
    );
  });

  it('TAE approximately equals TIN when there are no extra costs', () => {
    const result = calcularPrestamoPersonal({
      capital: 10000,
      tin: 7,
      plazoMeses: 48,
      comisionApertura: 0,
      seguroMensual: 0,
    });

    // With no extra costs, TAE should be close to TIN
    // (they differ slightly due to monthly compounding vs annual)
    expect(result.taeCalculada).toBeCloseTo(7.23, 0);
    expect(result.taeCalculada).toBeGreaterThanOrEqual(7);
    expect(result.taeCalculada).toBeLessThan(8);
  });

  it('handles zero interest rate', () => {
    const result = calcularPrestamoPersonal({
      capital: 12000,
      tin: 0,
      plazoMeses: 24,
      comisionApertura: 0,
      seguroMensual: 0,
    });

    expect(result.cuotaMensual).toBe(500);
    expect(result.totalIntereses).toBe(0);
    expect(result.totalPagado).toBe(12000);
    expect(result.costeTotal).toBe(12000);
    expect(result.taeCalculada).toBe(0);
  });

  it('calculates commission amount correctly', () => {
    const result = calcularPrestamoPersonal({
      capital: 20000,
      tin: 6,
      plazoMeses: 60,
      comisionApertura: 2.5,
      seguroMensual: 0,
    });

    expect(result.comisionAperturaImporte).toBe(500); // 2.5% of 20000
    expect(result.costeTotal).toBe(result.totalPagado + 500);
  });

  it('calculates total insurance correctly', () => {
    const result = calcularPrestamoPersonal({
      capital: 15000,
      tin: 8,
      plazoMeses: 36,
      comisionApertura: 0,
      seguroMensual: 25,
    });

    expect(result.totalSeguros).toBe(900); // 25 * 36
    expect(result.costeTotal).toBe(result.totalPagado + 900);
  });

  it('desglose array has correct entries', () => {
    const result = calcularPrestamoPersonal({
      capital: 10000,
      tin: 7,
      plazoMeses: 48,
      comisionApertura: 1,
      seguroMensual: 10,
    });

    expect(result.desglose).toHaveLength(5);
    expect(result.desglose[0].concepto).toBe('Capital solicitado');
    expect(result.desglose[0].importe).toBe(10000);
    expect(result.desglose[1].concepto).toBe('Total intereses');
    expect(result.desglose[1].importe).toBe(result.totalIntereses);
    expect(result.desglose[2].concepto).toBe('Comisión de apertura');
    expect(result.desglose[2].importe).toBe(100); // 1% of 10000
    expect(result.desglose[3].concepto).toBe('Total seguros');
    expect(result.desglose[3].importe).toBe(480); // 10 * 48
    expect(result.desglose[4].concepto).toBe('Coste total del préstamo');
    expect(result.desglose[4].importe).toBe(result.costeTotal);
  });

  it('higher TIN produces higher monthly payment for same capital and term', () => {
    const low = calcularPrestamoPersonal({
      capital: 10000, tin: 5, plazoMeses: 48, comisionApertura: 0, seguroMensual: 0,
    });
    const high = calcularPrestamoPersonal({
      capital: 10000, tin: 10, plazoMeses: 48, comisionApertura: 0, seguroMensual: 0,
    });

    expect(high.cuotaMensual).toBeGreaterThan(low.cuotaMensual);
    expect(high.totalIntereses).toBeGreaterThan(low.totalIntereses);
  });

  it('shorter term has higher payment but lower total interest', () => {
    const short = calcularPrestamoPersonal({
      capital: 10000, tin: 7, plazoMeses: 24, comisionApertura: 0, seguroMensual: 0,
    });
    const long = calcularPrestamoPersonal({
      capital: 10000, tin: 7, plazoMeses: 60, comisionApertura: 0, seguroMensual: 0,
    });

    expect(short.cuotaMensual).toBeGreaterThan(long.cuotaMensual);
    expect(short.totalIntereses).toBeLessThan(long.totalIntereses);
  });
});

describe('compararPrestamos', () => {
  it('picks the cheaper option by costeTotal', () => {
    // Offer 1: higher TIN, no commissions
    // Offer 2: lower TIN, but high commissions
    const result = compararPrestamos(
      { capital: 10000, tin: 8, plazoMeses: 48, comisionApertura: 0, seguroMensual: 0 },
      { capital: 10000, tin: 6, plazoMeses: 48, comisionApertura: 3, seguroMensual: 20 },
    );

    // Offer 2 has lower TIN but 300€ commission + 960€ insurance
    expect(result.prestamo1).toBeDefined();
    expect(result.prestamo2).toBeDefined();
    expect(result.mejorOpcion).toBe(1); // 8% TIN no costs should be cheaper than 6% TIN + 3% + 20€/mo
    expect(result.ahorro).toBeGreaterThan(0);
    expect(result.ahorro).toBeCloseTo(
      Math.abs(result.prestamo1.costeTotal - result.prestamo2.costeTotal), 2
    );
  });

  it('returns option 2 when it is cheaper', () => {
    const result = compararPrestamos(
      { capital: 10000, tin: 10, plazoMeses: 48, comisionApertura: 2, seguroMensual: 20 },
      { capital: 10000, tin: 6, plazoMeses: 48, comisionApertura: 0, seguroMensual: 0 },
    );

    expect(result.mejorOpcion).toBe(2);
    expect(result.ahorro).toBeGreaterThan(0);
  });

  it('returns ahorro 0 when both offers are identical', () => {
    const result = compararPrestamos(
      { capital: 10000, tin: 7, plazoMeses: 48, comisionApertura: 1, seguroMensual: 10 },
      { capital: 10000, tin: 7, plazoMeses: 48, comisionApertura: 1, seguroMensual: 10 },
    );

    expect(result.ahorro).toBe(0);
    // Both are equal so option 1 wins (<=)
    expect(result.mejorOpcion).toBe(1);
  });
});
