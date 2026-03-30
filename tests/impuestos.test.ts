import { describe, it, expect } from 'vitest';
import { calcularIRPF, calcularIVA, calcularPlusvalia, calcularSucesiones } from '@lib/calculations/impuestos';
import irpfData from '@data/irpf-2026.json';
import ivaData from '@data/iva-2026.json';
import plusvaliaData from '@data/plusvalia-municipal.json';
import sucesionesData from '@data/sucesiones-por-ccaa.json';

describe('calcularIRPF', () => {
  it('calculates IRPF for employee 35000€ Madrid', () => {
    const result = calcularIRPF({
      rendimientosBrutos: 35000,
      ccaa: 'madrid',
      hijosCount: 0,
      mayor65: false,
      mayor75: false,
      situacion: 'soltero',
      discapacidad: false,
      esAutonomo: false,
      gastoDeducible: 0,
      cotizacionSS: 2275,
    }, irpfData as any);

    expect(result.cuotaIntegra).toBeGreaterThan(3000);
    expect(result.cuotaIntegra).toBeLessThan(8000);
    expect(result.tipoEfectivo).toBeGreaterThan(8);
    expect(result.tipoEfectivo).toBeLessThan(25);
    expect(result.baseLiquidable).toBeGreaterThan(0);
  });

  it('calculates IRPF for autónomo 50000€ Cataluña', () => {
    const result = calcularIRPF({
      rendimientosBrutos: 50000,
      ccaa: 'cataluna',
      hijosCount: 0,
      mayor65: false,
      mayor75: false,
      situacion: 'soltero',
      discapacidad: false,
      esAutonomo: true,
      gastoDeducible: 5000,
      cotizacionSS: 0,
    }, irpfData as any);

    expect(result.cuotaIntegra).toBeGreaterThan(5000);
    expect(result.rendimientosNetos).toBe(45000);
  });

  it('handles foral regime (Navarra)', () => {
    const result = calcularIRPF({
      rendimientosBrutos: 40000,
      ccaa: 'navarra',
      hijosCount: 1,
      mayor65: false,
      mayor75: false,
      situacion: 'casado',
      discapacidad: false,
      esAutonomo: false,
      gastoDeducible: 0,
      cotizacionSS: 2600,
    }, irpfData as any);

    expect(result.cuotaIntegra).toBeGreaterThan(0);
    expect(result.cuotaEstatal).toBe(0); // foral has no state component
  });

  it('reduces tax with children', () => {
    const sinHijos = calcularIRPF({
      rendimientosBrutos: 40000,
      ccaa: 'madrid',
      hijosCount: 0,
      mayor65: false,
      mayor75: false,
      situacion: 'soltero',
      discapacidad: false,
      esAutonomo: false,
      gastoDeducible: 0,
      cotizacionSS: 2600,
    }, irpfData as any);

    const conHijos = calcularIRPF({
      rendimientosBrutos: 40000,
      ccaa: 'madrid',
      hijosCount: 2,
      mayor65: false,
      mayor75: false,
      situacion: 'soltero',
      discapacidad: false,
      esAutonomo: false,
      gastoDeducible: 0,
      cotizacionSS: 2600,
    }, irpfData as any);

    expect(conHijos.cuotaIntegra).toBeLessThan(sinHijos.cuotaIntegra);
  });

  it('returns 0 for very low income', () => {
    const result = calcularIRPF({
      rendimientosBrutos: 5000,
      ccaa: 'madrid',
      hijosCount: 0,
      mayor65: false,
      mayor75: false,
      situacion: 'soltero',
      discapacidad: false,
      esAutonomo: false,
      gastoDeducible: 0,
      cotizacionSS: 325,
    }, irpfData as any);

    expect(result.cuotaIntegra).toBe(0);
  });
});

describe('calcularIVA', () => {
  it('calculates base to total at 21%', () => {
    const result = calcularIVA({
      importe: 1000,
      tipoIVA: 'general',
      direccion: 'base_a_total',
      incluyeRecargo: false,
    }, ivaData as any);

    expect(result.base).toBe(1000);
    expect(result.cuotaIVA).toBe(210);
    expect(result.total).toBe(1210);
    expect(result.impuestoNombre).toBe('IVA');
  });

  it('extracts base from total at 21%', () => {
    const result = calcularIVA({
      importe: 1210,
      tipoIVA: 'general',
      direccion: 'total_a_base',
      incluyeRecargo: false,
    }, ivaData as any);

    expect(result.base).toBe(1000);
    expect(result.cuotaIVA).toBe(210);
    expect(result.total).toBe(1210);
  });

  it('applies reduced rate (10%)', () => {
    const result = calcularIVA({
      importe: 500,
      tipoIVA: 'reducido',
      direccion: 'base_a_total',
      incluyeRecargo: false,
    }, ivaData as any);

    expect(result.cuotaIVA).toBe(50);
    expect(result.total).toBe(550);
    expect(result.tipoAplicado).toBe(10);
  });

  it('applies IGIC for Canarias', () => {
    const result = calcularIVA({
      importe: 1000,
      tipoIVA: 'general',
      direccion: 'base_a_total',
      incluyeRecargo: false,
      ccaa: 'canarias',
    }, ivaData as any);

    expect(result.impuestoNombre).toBe('IGIC');
    expect(result.tipoAplicado).toBe(7);
    expect(result.cuotaIVA).toBe(70);
    expect(result.esRegimenEspecial).toBe(true);
  });

  it('applies IPSI for Ceuta', () => {
    const result = calcularIVA({
      importe: 1000,
      tipoIVA: 'general',
      direccion: 'base_a_total',
      incluyeRecargo: false,
      ccaa: 'ceuta',
    }, ivaData as any);

    expect(result.impuestoNombre).toBe('IPSI');
    expect(result.esRegimenEspecial).toBe(true);
  });

  it('adds recargo de equivalencia', () => {
    const result = calcularIVA({
      importe: 1000,
      tipoIVA: 'general',
      direccion: 'base_a_total',
      incluyeRecargo: true,
    }, ivaData as any);

    expect(result.recargoEquivalencia).toBe(52);
    expect(result.totalConRecargo).toBe(1262);
  });
});

describe('calcularPlusvalia', () => {
  it('calculates both methods and picks lower', () => {
    const result = calcularPlusvalia({
      valorAdquisicion: 150000,
      valorTransmision: 250000,
      valorCatastral: 100000,
      porcentajeSuelo: 50,
      aniosPropiedad: 10,
      tipoImpositivo: 30,
    }, plusvaliaData as any);

    expect(result.hayIncrementoReal).toBe(true);
    expect(result.metodoReal.cuota).toBeGreaterThan(0);
    expect(result.metodoObjetivo.cuota).toBeGreaterThan(0);
    expect(result.cuotaFinal).toBe(
      Math.min(result.metodoReal.cuota, result.metodoObjetivo.cuota)
    );
  });

  it('returns 0 when no real increment (STC 182/2021)', () => {
    const result = calcularPlusvalia({
      valorAdquisicion: 250000,
      valorTransmision: 200000,
      valorCatastral: 100000,
      porcentajeSuelo: 50,
      aniosPropiedad: 5,
      tipoImpositivo: 30,
    }, plusvaliaData as any);

    expect(result.hayIncrementoReal).toBe(false);
    expect(result.cuotaFinal).toBe(0);
  });

  it('returns 0 when selling at same price', () => {
    const result = calcularPlusvalia({
      valorAdquisicion: 200000,
      valorTransmision: 200000,
      valorCatastral: 80000,
      porcentajeSuelo: 60,
      aniosPropiedad: 8,
      tipoImpositivo: 30,
    }, plusvaliaData as any);

    expect(result.cuotaFinal).toBe(0);
  });

  it('uses correct coeficiente by years', () => {
    const result = calcularPlusvalia({
      valorAdquisicion: 100000,
      valorTransmision: 200000,
      valorCatastral: 80000,
      porcentajeSuelo: 50,
      aniosPropiedad: 1,
      tipoImpositivo: 30,
    }, plusvaliaData as any);

    expect(result.metodoObjetivo.coeficienteAplicado).toBe(0.15);
  });
});

describe('calcularSucesiones', () => {
  it('applies 99% bonificación in Madrid for grupo II', () => {
    const result = calcularSucesiones({
      valorHerencia: 300000,
      ccaa: 'madrid',
      parentesco: 'grupo_II',
      edadHeredero: 45,
      patrimonioPreexistente: 0,
    }, sucesionesData as any);

    expect(result.bonificacionPorcentaje).toBe(99);
    expect(result.cuotaFinal).toBeLessThan(result.cuotaTributaria * 0.05);
  });

  it('no bonificación for grupo IV', () => {
    const result = calcularSucesiones({
      valorHerencia: 100000,
      ccaa: 'madrid',
      parentesco: 'grupo_IV',
      edadHeredero: 40,
      patrimonioPreexistente: 0,
    }, sucesionesData as any);

    expect(result.bonificacionPorcentaje).toBe(0);
    expect(result.cuotaFinal).toBe(result.cuotaTributaria);
    expect(result.reduccionAplicada).toBe(0);
  });

  it('grupo I gets higher reduction for younger heir', () => {
    const result = calcularSucesiones({
      valorHerencia: 200000,
      ccaa: 'andalucia',
      parentesco: 'grupo_I',
      edadHeredero: 10,
      patrimonioPreexistente: 0,
    }, sucesionesData as any);

    // 15956.87 + 3990.72 * (21 - 10) = 15956.87 + 43897.92 = 59854.79, capped at 47869.66
    expect(result.reduccionAplicada).toBeCloseTo(47869.66, 0);
  });

  it('applies grupo II estatal reduction', () => {
    const result = calcularSucesiones({
      valorHerencia: 50000,
      ccaa: 'valencia',
      parentesco: 'grupo_II',
      edadHeredero: 30,
      patrimonioPreexistente: 0,
    }, sucesionesData as any);

    expect(result.reduccionAplicada).toBeCloseTo(15956.87, 0);
    expect(result.baseLiquidable).toBeCloseTo(34043.13, 0);
  });
});
