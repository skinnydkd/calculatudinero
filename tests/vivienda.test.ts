import { describe, it, expect } from 'vitest';
import { calcularHipoteca, calcularGastosCompra, calcularGastosCompraComparativa } from '@lib/calculations/vivienda';
import hipotecaData from '@data/hipoteca-reference.json';
import itpData from '@data/itp-por-ccaa.json';

describe('calcularHipoteca', () => {
  it('calculates monthly payment with French formula', () => {
    const result = calcularHipoteca({
      precioVivienda: 200000,
      ahorroInicial: 40000,
      plazoAnios: 25,
      tipoInteres: 3,
      tipoHipoteca: 'fijo',
    }, hipotecaData as any);

    expect(result.capitalPrestamo).toBe(160000);

    // French formula: M = 160000 * 0.0025 * (1.0025^300) / ((1.0025^300) - 1) ≈ 758.48
    expect(result.cuotaMensual).toBeCloseTo(758.74, 0);
    expect(result.totalPagado).toBeGreaterThan(200000);
    expect(result.totalIntereses).toBeGreaterThan(50000);
    expect(result.porcentajeFinanciacion).toBe(80);
  });

  it('generates correct amortization table', () => {
    const result = calcularHipoteca({
      precioVivienda: 100000,
      ahorroInicial: 20000,
      plazoAnios: 10,
      tipoInteres: 2,
      tipoHipoteca: 'fijo',
    }, hipotecaData as any);

    expect(result.cuadroAmortizacion).toHaveLength(10);
    expect(result.cuadroAmortizacion[0].anio).toBe(1);
    expect(result.cuadroAmortizacion[9].anio).toBe(10);

    // Last year should have capital pendiente close to 0
    const lastYear = result.cuadroAmortizacion[9];
    expect(lastYear.capitalPendiente).toBeCloseTo(0, 0);
  });

  it('handles variable rate mortgage', () => {
    const result = calcularHipoteca({
      precioVivienda: 250000,
      ahorroInicial: 50000,
      plazoAnios: 30,
      tipoInteres: 0,
      tipoHipoteca: 'variable',
      diferencialVariable: 0.9,
      euriborActual: 2.45,
    }, hipotecaData as any);

    // Effective rate should be euribor + diferencial = 3.35%
    expect(result.capitalPrestamo).toBe(200000);
    expect(result.cuotaMensual).toBeGreaterThan(800);
  });

  it('calculates total correctly', () => {
    const result = calcularHipoteca({
      precioVivienda: 150000,
      ahorroInicial: 30000,
      plazoAnios: 20,
      tipoInteres: 2.5,
      tipoHipoteca: 'fijo',
    }, hipotecaData as any);

    expect(result.totalPagado).toBeCloseTo(result.cuotaMensual * 240, 0);
    expect(result.totalIntereses).toBeCloseTo(result.totalPagado - result.capitalPrestamo, 0);
  });
});

describe('calcularGastosCompra', () => {
  it('calculates IVA for new property', () => {
    const result = calcularGastosCompra({
      precioVivienda: 200000,
      ccaa: 'madrid',
      esViviendaNueva: true,
      aplicaTipoReducido: false,
    }, hipotecaData as any, itpData as any);

    expect(result.impuestoNombre).toContain('IVA');
    expect(result.impuesto).toBeGreaterThan(20000); // IVA 10% + AJD ~1.5%
    expect(result.notaria).toBeGreaterThan(0);
    expect(result.totalGastos).toBeGreaterThan(result.impuesto);
  });

  it('calculates ITP for used property in Madrid (6%)', () => {
    const result = calcularGastosCompra({
      precioVivienda: 200000,
      ccaa: 'madrid',
      esViviendaNueva: false,
      aplicaTipoReducido: false,
    }, hipotecaData as any, itpData as any);

    expect(result.impuestoTipo).toBe(6);
    expect(result.impuesto).toBe(12000);
    expect(result.impuestoNombre).toContain('ITP');
  });

  it('calculates ITP for used property in Valencia (10%)', () => {
    const result = calcularGastosCompra({
      precioVivienda: 200000,
      ccaa: 'valencia',
      esViviendaNueva: false,
      aplicaTipoReducido: false,
    }, hipotecaData as any, itpData as any);

    expect(result.impuestoTipo).toBe(10);
    expect(result.impuesto).toBe(20000);
  });

  it('applies reduced ITP rate', () => {
    const normal = calcularGastosCompra({
      precioVivienda: 200000,
      ccaa: 'andalucia',
      esViviendaNueva: false,
      aplicaTipoReducido: false,
    }, hipotecaData as any, itpData as any);

    const reducido = calcularGastosCompra({
      precioVivienda: 200000,
      ccaa: 'andalucia',
      esViviendaNueva: false,
      aplicaTipoReducido: true,
    }, hipotecaData as any, itpData as any);

    expect(reducido.impuesto).toBeLessThan(normal.impuesto);
  });

  it('includes all fixed costs', () => {
    const result = calcularGastosCompra({
      precioVivienda: 150000,
      ccaa: 'madrid',
      esViviendaNueva: false,
      aplicaTipoReducido: false,
    }, hipotecaData as any, itpData as any);

    expect(result.gestoria).toBeGreaterThan(0);
    expect(result.tasacion).toBeGreaterThan(0);
    expect(result.registro).toBeGreaterThan(0);
    expect(result.totalConPrecio).toBe(150000 + result.totalGastos);
  });
});

describe('calcularGastosCompraComparativa', () => {
  it('returns 19 items (one per CCAA)', () => {
    const result = calcularGastosCompraComparativa(
      200000, false, false,
      hipotecaData as any, itpData as any,
    );

    expect(result).toHaveLength(19);
  });

  it('items are sorted by totalGastos ascending', () => {
    const result = calcularGastosCompraComparativa(
      200000, false, false,
      hipotecaData as any, itpData as any,
    );

    for (let i = 1; i < result.length; i++) {
      expect(result[i].totalGastos).toBeGreaterThanOrEqual(result[i - 1].totalGastos);
    }
  });

  it('País Vasco (4% ITP) should be cheapest for segunda mano', () => {
    const result = calcularGastosCompraComparativa(
      200000, false, false,
      hipotecaData as any, itpData as any,
    );

    expect(result[0].ccaa).toBe('pais-vasco');
    expect(result[0].tipoImpuesto).toBe(4);
  });

  it('vivienda nueva should have same cost across all CCAAs', () => {
    const result = calcularGastosCompraComparativa(
      200000, true, false,
      hipotecaData as any, itpData as any,
    );

    const firstTotal = result[0].totalGastos;
    for (const item of result) {
      expect(item.totalGastos).toBe(firstTotal);
    }
  });

  it('ahorroMinimo equals 20% of price plus totalGastos', () => {
    const result = calcularGastosCompraComparativa(
      200000, false, false,
      hipotecaData as any, itpData as any,
    );

    for (const item of result) {
      const expected = 200000 * 0.20 + item.totalGastos;
      expect(item.ahorroMinimo).toBeCloseTo(expected, 2);
    }
  });

  it('each item has all required fields', () => {
    const result = calcularGastosCompraComparativa(
      150000, false, false,
      hipotecaData as any, itpData as any,
    );

    for (const item of result) {
      expect(item.ccaa).toBeDefined();
      expect(item.ccaaLabel).toBeDefined();
      expect(item.tipoImpuesto).toBeGreaterThan(0);
      expect(item.impuesto).toBeGreaterThan(0);
      expect(item.notaria).toBeGreaterThan(0);
      expect(item.registro).toBeGreaterThan(0);
      expect(item.gestoria).toBeGreaterThan(0);
      expect(item.tasacion).toBeGreaterThan(0);
      expect(item.totalGastos).toBeGreaterThan(0);
      expect(item.totalConPrecio).toBe(150000 + item.totalGastos);
      expect(item.ahorroMinimo).toBeGreaterThan(0);
    }
  });
});
