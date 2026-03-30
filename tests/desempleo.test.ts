import { describe, it, expect } from 'vitest';
import { calcularPrestacionDesempleo } from '@lib/calculations/desempleo';
import desempleoData from '@data/desempleo-2026.json';

describe('calcularPrestacionDesempleo', () => {
  it('returns no right when below 360 days', () => {
    const result = calcularPrestacionDesempleo({
      baseCotizacionMedia: 2000,
      diasCotizados: 300,
      hijosCount: 0,
    }, desempleoData as any);

    expect(result.tieneDerechoPrestacion).toBe(false);
    expect(result.duracionMeses).toBe(0);
    expect(result.totalEstimado).toBe(0);
  });

  it('calculates 4 months for 360-539 days', () => {
    const result = calcularPrestacionDesempleo({
      baseCotizacionMedia: 2000,
      diasCotizados: 400,
      hijosCount: 0,
    }, desempleoData as any);

    expect(result.tieneDerechoPrestacion).toBe(true);
    expect(result.duracionMeses).toBe(4);
  });

  it('calculates 24 months for 2160+ days', () => {
    const result = calcularPrestacionDesempleo({
      baseCotizacionMedia: 2000,
      diasCotizados: 2200,
      hijosCount: 0,
    }, desempleoData as any);

    expect(result.duracionMeses).toBe(24);
  });

  it('applies 70% for first 6 months and 50% for rest', () => {
    const result = calcularPrestacionDesempleo({
      baseCotizacionMedia: 2000,
      diasCotizados: 2200,
      hijosCount: 0,
    }, desempleoData as any);

    expect(result.importePrimeros180Dias).toBeGreaterThan(result.importeResto);
    // 70% of 2000 = 1400, but capped at 1050 (sin hijos)
    expect(result.importePrimeros180Dias).toBeLessThanOrEqual(1050);
  });

  it('applies higher tope with children', () => {
    const sinHijos = calcularPrestacionDesempleo({
      baseCotizacionMedia: 2500,
      diasCotizados: 720,
      hijosCount: 0,
    }, desempleoData as any);

    const conHijo = calcularPrestacionDesempleo({
      baseCotizacionMedia: 2500,
      diasCotizados: 720,
      hijosCount: 1,
    }, desempleoData as any);

    expect(conHijo.topeAplicado).toBeGreaterThan(sinHijos.topeAplicado);
  });

  it('applies minimum with children', () => {
    const result = calcularPrestacionDesempleo({
      baseCotizacionMedia: 500,
      diasCotizados: 720,
      hijosCount: 2,
    }, desempleoData as any);

    expect(result.minimoAplicado).toBe(642);
    expect(result.importePrimeros180Dias).toBeGreaterThanOrEqual(642);
  });

  it('has correct desglose periods', () => {
    const result = calcularPrestacionDesempleo({
      baseCotizacionMedia: 1800,
      diasCotizados: 1100,
      hijosCount: 0,
    }, desempleoData as any);

    expect(result.desglose.length).toBeGreaterThanOrEqual(1);

    const total = result.desglose.reduce((sum, d) => sum + d.subtotal, 0);
    expect(total).toBeCloseTo(result.totalEstimado, 0);
  });
});
