import { describe, it, expect } from 'vitest';
import { calcularFacturacionAutonomo } from '../../src/lib/calculations/autonomos';
import autonomosData from '../../src/data/autonomos-2026.json';
import irpfData from '../../src/data/irpf-2026.json';
import type { AutonomosData, IRPFData } from '../../src/lib/types';

const aData = autonomosData as unknown as AutonomosData;
const iData = irpfData as unknown as IRPFData;

describe('calcularFacturacionAutonomo', () => {
  it('returns positive billing for a standard case', () => {
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

    expect(result.facturacionMensualBruta).toBeGreaterThan(2000);
    expect(result.facturacionMensualSinIVA).toBeGreaterThan(2000);
    expect(result.facturacionAnualBruta).toBe(
      Math.round(result.facturacionMensualBruta * 12 * 100) / 100
    );
    expect(result.desglose.ingresoNeto).toBe(2000);
    expect(result.desglose.gastos).toBe(200);
    expect(result.desglose.cuotaSS).toBeGreaterThan(0);
    expect(result.desglose.retencionIRPFMensual).toBeGreaterThan(0);
    expect(result.desglose.ivaMensual).toBeGreaterThan(0);
  });

  it('uses tarifa plana for new autónomos', () => {
    const result = calcularFacturacionAutonomo(
      {
        ingresoNetoDeseado: 1500,
        situacion: 'nuevo',
        ccaa: 'valencia',
        gastosNegocio: 100,
      },
      aData,
      iData
    );

    expect(result.desglose.cuotaSS).toBe(aData.tarifaPlana.cuotaMensual);
  });

  it('billing includes IVA at 21%', () => {
    const result = calcularFacturacionAutonomo(
      {
        ingresoNetoDeseado: 2000,
        situacion: 'establecido',
        ccaa: 'madrid',
        gastosNegocio: 0,
      },
      aData,
      iData
    );

    const expectedIVA = Math.round(result.facturacionMensualSinIVA * 0.21 * 100) / 100;
    expect(result.desglose.ivaMensual).toBe(expectedIVA);
    expect(result.facturacionMensualBruta).toBe(
      Math.round((result.facturacionMensualSinIVA + expectedIVA) * 100) / 100
    );
  });

  it('facturacion sin IVA = sum of all desglose components', () => {
    const result = calcularFacturacionAutonomo(
      {
        ingresoNetoDeseado: 3000,
        situacion: 'establecido',
        ccaa: 'cataluna',
        gastosNegocio: 500,
      },
      aData,
      iData
    );

    const sumDesglose =
      result.desglose.ingresoNeto +
      result.desglose.cuotaSS +
      result.desglose.retencionIRPFMensual +
      result.desglose.gastos;

    expect(result.facturacionMensualSinIVA).toBeCloseTo(sumDesglose, 0);
  });

  it('ratio neto/facturacion is between 0 and 1', () => {
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

    expect(result.ratioNetoFacturacion).toBeGreaterThan(0);
    expect(result.ratioNetoFacturacion).toBeLessThan(1);
  });

  it('higher income requires higher billing', () => {
    const low = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 1000, situacion: 'establecido', ccaa: 'madrid', gastosNegocio: 0 },
      aData,
      iData
    );
    const high = calcularFacturacionAutonomo(
      { ingresoNetoDeseado: 4000, situacion: 'establecido', ccaa: 'madrid', gastosNegocio: 0 },
      aData,
      iData
    );

    expect(high.facturacionMensualBruta).toBeGreaterThan(low.facturacionMensualBruta);
  });

  it('works with all standard CCAA', () => {
    const ccaaList = [
      'andalucia', 'aragon', 'asturias', 'baleares', 'canarias',
      'cantabria', 'castilla-leon', 'castilla-mancha', 'cataluna',
      'extremadura', 'galicia', 'madrid', 'murcia', 'rioja', 'valencia',
    ] as const;

    for (const ccaa of ccaaList) {
      const result = calcularFacturacionAutonomo(
        { ingresoNetoDeseado: 2000, situacion: 'establecido', ccaa, gastosNegocio: 200 },
        aData,
        iData
      );
      expect(result.facturacionMensualBruta).toBeGreaterThan(2000);
    }
  });

  it('works with foral CCAA (navarra, pais-vasco)', () => {
    for (const ccaa of ['navarra', 'pais-vasco'] as const) {
      const result = calcularFacturacionAutonomo(
        { ingresoNetoDeseado: 2000, situacion: 'establecido', ccaa, gastosNegocio: 200 },
        aData,
        iData
      );
      expect(result.facturacionMensualBruta).toBeGreaterThan(2000);
    }
  });
});
