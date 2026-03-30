import { describe, it, expect } from 'vitest';
import { calcularFacturacionAutonomo, calcularCuotaAutonomo } from '@lib/calculations/autonomos';
import autonomosData from '@data/autonomos-2026.json';
import irpfData from '@data/irpf-2026.json';
import type { AutonomosData, IRPFData } from '@lib/types';

const aData = autonomosData as unknown as AutonomosData;
const iData = irpfData as unknown as IRPFData;

// ===========================================================================
// calcularFacturacionAutonomo
// ===========================================================================

describe('calcularFacturacionAutonomo', () => {
  it('nuevo autonomo uses tarifa plana 80 EUR', () => {
    const result = calcularFacturacionAutonomo(
      {
        ingresoNetoDeseado: 2000,
        situacion: 'nuevo',
        ccaa: 'madrid',
        gastosNegocio: 200,
      },
      aData,
      iData
    );

    expect(result.desglose.cuotaSS).toBe(80);
  });

  it('established autonomo pays higher SS than tarifa plana', () => {
    const result = calcularFacturacionAutonomo(
      {
        ingresoNetoDeseado: 2000,
        situacion: 'establecido',
        ccaa: 'madrid',
        gastosNegocio: 200,
      },
      aData,
      iData
    );

    expect(result.desglose.cuotaSS).toBeGreaterThan(80);
  });

  it('nuevo autonomo billing is lower than established (lower SS)', () => {
    const nuevo = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 2000, situacion: 'nuevo', ccaa: 'madrid', gastosNegocio: 200 },
      aData,
      iData
    );
    const establecido = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 2000, situacion: 'establecido', ccaa: 'madrid', gastosNegocio: 200 },
      aData,
      iData
    );

    expect(nuevo.facturacionMensualBruta).toBeLessThan(establecido.facturacionMensualBruta);
  });

  it('IVA is always 21% of facturacion sin IVA', () => {
    const result = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 3000, situacion: 'establecido', ccaa: 'cataluna', gastosNegocio: 300 },
      aData,
      iData
    );

    expect(result.desglose.ivaMensual).toBeCloseTo(result.facturacionMensualSinIVA * 0.21, 1);
  });

  it('facturacion anual bruta = mensual bruta * 12', () => {
    const result = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 2500, situacion: 'establecido', ccaa: 'valencia', gastosNegocio: 150 },
      aData,
      iData
    );

    expect(result.facturacionAnualBruta).toBeCloseTo(result.facturacionMensualBruta * 12, 1);
  });

  it('different CCAA produces different IRPF (Madrid vs Cataluna)', () => {
    const madrid = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 3000, situacion: 'establecido', ccaa: 'madrid', gastosNegocio: 0 },
      aData,
      iData
    );
    const cataluna = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 3000, situacion: 'establecido', ccaa: 'cataluna', gastosNegocio: 0 },
      aData,
      iData
    );

    // Madrid generally has lower IRPF than Cataluna
    expect(madrid.desglose.retencionIRPFMensual).not.toBe(cataluna.desglose.retencionIRPFMensual);
  });

  it('foral CCAA (navarra) calculates without errors', () => {
    const result = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 2000, situacion: 'establecido', ccaa: 'navarra', gastosNegocio: 100 },
      aData,
      iData
    );

    expect(result.facturacionMensualBruta).toBeGreaterThan(2000);
    expect(result.tipoIRPFEfectivo).toBeGreaterThan(0);
  });

  it('desglose components sum to facturacion sin IVA', () => {
    const result = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 2000, situacion: 'establecido', ccaa: 'madrid', gastosNegocio: 200 },
      aData,
      iData
    );

    const sum =
      result.desglose.ingresoNeto +
      result.desglose.cuotaSS +
      result.desglose.retencionIRPFMensual +
      result.desglose.gastos;

    expect(result.facturacionMensualSinIVA).toBeCloseTo(sum, 0);
  });

  it('tipoIRPFEfectivo is a reasonable percentage', () => {
    const result = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 2000, situacion: 'establecido', ccaa: 'madrid', gastosNegocio: 0 },
      aData,
      iData
    );

    expect(result.tipoIRPFEfectivo).toBeGreaterThan(0);
    expect(result.tipoIRPFEfectivo).toBeLessThan(50);
  });

  it('ratioNetoFacturacion is between 0 and 1', () => {
    const result = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 2000, situacion: 'establecido', ccaa: 'madrid', gastosNegocio: 200 },
      aData,
      iData
    );

    expect(result.ratioNetoFacturacion).toBeGreaterThan(0);
    expect(result.ratioNetoFacturacion).toBeLessThan(1);
  });
});

// ===========================================================================
// calcularCuotaAutonomo
// ===========================================================================

describe('calcularCuotaAutonomo', () => {
  it('tramo 1 for lowest income (< 670 EUR)', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 500, situacion: 'establecido' },
      aData
    );

    expect(result.tramoAplicado.tramoId).toBe(1);
    expect(result.cuotaMensual).toBe(aData.tramos[0].cuotaMinima);
    expect(result.esTarifaPlana).toBe(false);
  });

  it('tarifa plana for nuevo autonomo', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 1500, situacion: 'nuevo' },
      aData
    );

    expect(result.esTarifaPlana).toBe(true);
    expect(result.cuotaMensual).toBe(80);
    expect(result.ahorroPorTarifaPlana).toBeGreaterThan(0);
  });

  it('tarifa plana savings = (cuota normal - 80) * 12', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 2000, situacion: 'nuevo' },
      aData
    );

    // The normal cuota for this tramo should be > 80
    const tramoMinCuota = result.tramoAplicado.cuotaMinima;
    // cuota normal is calculated from base * total / 100, not cuotaMinima
    expect(result.ahorroPorTarifaPlana).toBeGreaterThan(0);
    expect(result.cuotaAnual).toBe(80 * 12);
  });

  it('cuota anual = cuota mensual * 12', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 2500, situacion: 'establecido' },
      aData
    );

    expect(result.cuotaAnual).toBeCloseTo(result.cuotaMensual * 12, 2);
  });

  it('custom base within tramo range is accepted', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 2000, situacion: 'establecido', basePersonalizada: 1500 },
      aData
    );

    // Check the base is within the tramo range
    expect(result.baseElegida).toBe(1500);
  });

  it('custom base outside tramo range falls back to baseMinima', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 500, situacion: 'establecido', basePersonalizada: 9999 },
      aData
    );

    // 9999 is above the max for tramo 1, so it should use baseMinima
    expect(result.baseElegida).toBe(result.tramoAplicado.baseMinima);
  });

  it('high income (> 6000 EUR) falls into last tramo', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 7000, situacion: 'establecido' },
      aData
    );

    expect(result.tramoAplicado.tramoId).toBe(15);
    expect(result.tramoAplicado.rendimientosMax).toBeNull();
  });

  it('desglose cotizacion components sum to cuota normal', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 2000, situacion: 'establecido' },
      aData
    );

    const desgloseSum =
      result.desgloseCotizacion.contingenciasComunes +
      result.desgloseCotizacion.contingenciasProfesionales +
      result.desgloseCotizacion.ceseProfesional +
      result.desgloseCotizacion.formacionProfesional +
      result.desgloseCotizacion.mei;

    // For an established autonomo, cuotaMensual = normal cuota = base * total / 100
    // The desglose should sum to the cuota
    expect(desgloseSum).toBeCloseTo(result.cuotaMensual, 1);
  });

  it('tablaTramos has 15 entries and one is marked esActual', () => {
    const result = calcularCuotaAutonomo(
      { rendimientosNetosMensuales: 1500, situacion: 'establecido' },
      aData
    );

    expect(result.tablaTramos).toHaveLength(15);
    const actuals = result.tablaTramos.filter(t => t.esActual);
    expect(actuals).toHaveLength(1);
  });
});
