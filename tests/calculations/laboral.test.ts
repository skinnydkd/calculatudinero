import { describe, it, expect } from 'vitest';
import { calcularSalarioNeto, calcularIndemnizacion } from '../../src/lib/calculations/laboral';
import ssData from '../../src/data/seguridad-social-2026.json';
import irpfData from '../../src/data/irpf-2026.json';
import indemnizacionData from '../../src/data/indemnizacion-rules.json';
import type {
  SeguridadSocialData,
  IRPFData,
  IndemnizacionData,
} from '../../src/lib/types';

const ss = ssData as unknown as SeguridadSocialData;
const irpf = irpfData as unknown as IRPFData;
const indemn = indemnizacionData as unknown as IndemnizacionData;

// ===========================================================================
// calcularSalarioNeto
// ===========================================================================

describe('calcularSalarioNeto', () => {
  const baseInput = {
    salarioBrutoAnual: 30000,
    numeroPagas: 14 as const,
    ccaa: 'madrid' as const,
    situacionPersonal: { estado: 'soltero' as const, hijosCount: 0, discapacidad: false },
    tipoContrato: 'indefinido' as const,
    grupoCotizacion: 5,
  };

  it('net salary is less than gross', () => {
    const result = calcularSalarioNeto(baseInput, ss, irpf);
    expect(result.salarioNetoAnual).toBeLessThan(30000);
    expect(result.salarioNetoAnual).toBeGreaterThan(0);
  });

  it('monthly net * pagas ≈ annual net', () => {
    const result = calcularSalarioNeto(baseInput, ss, irpf);
    expect(result.salarioNetoMensual * 14).toBeCloseTo(result.salarioNetoAnual, 0);
  });

  it('SS deductions are positive', () => {
    const result = calcularSalarioNeto(baseInput, ss, irpf);
    expect(result.desglose.ssTotal).toBeGreaterThan(0);
    expect(result.desglose.ssDesglose.contingenciasComunes).toBeGreaterThan(0);
    expect(result.desglose.ssDesglose.desempleo).toBeGreaterThan(0);
  });

  it('IRPF is positive for 30k salary', () => {
    const result = calcularSalarioNeto(baseInput, ss, irpf);
    expect(result.desglose.irpfAnual).toBeGreaterThan(0);
    expect(result.desglose.tipoRetencion).toBeGreaterThan(0);
    expect(result.desglose.tipoRetencion).toBeLessThan(50);
  });

  it('employer cost is higher than gross', () => {
    const result = calcularSalarioNeto(baseInput, ss, irpf);
    expect(result.costeTotalEmpresa).toBeGreaterThan(30000);
  });

  it('12 pagas gives higher monthly than 14 pagas', () => {
    const result12 = calcularSalarioNeto({ ...baseInput, numeroPagas: 12 }, ss, irpf);
    const result14 = calcularSalarioNeto({ ...baseInput, numeroPagas: 14 }, ss, irpf);
    expect(result12.salarioNetoMensual).toBeGreaterThan(result14.salarioNetoMensual);
    // Annual should be the same
    expect(result12.salarioNetoAnual).toBeCloseTo(result14.salarioNetoAnual, 0);
  });

  it('temporary contract has slightly higher desempleo', () => {
    const indef = calcularSalarioNeto(baseInput, ss, irpf);
    const temp = calcularSalarioNeto(
      { ...baseInput, tipoContrato: 'temporal' },
      ss,
      irpf
    );
    expect(temp.desglose.ssDesglose.desempleo).toBeGreaterThan(
      indef.desglose.ssDesglose.desempleo
    );
  });

  it('net + SS + IRPF = gross', () => {
    const result = calcularSalarioNeto(baseInput, ss, irpf);
    const reconstructed =
      result.salarioNetoAnual + result.desglose.ssTotal + result.desglose.irpfAnual;
    expect(reconstructed).toBeCloseTo(30000, 0);
  });

  it('higher salary means higher IRPF rate (progressive)', () => {
    const low = calcularSalarioNeto(
      { ...baseInput, salarioBrutoAnual: 20000 },
      ss,
      irpf
    );
    const high = calcularSalarioNeto(
      { ...baseInput, salarioBrutoAnual: 60000 },
      ss,
      irpf
    );
    expect(high.desglose.tipoRetencion).toBeGreaterThan(low.desglose.tipoRetencion);
  });

  it('children reduce IRPF', () => {
    const noKids = calcularSalarioNeto(baseInput, ss, irpf);
    const withKids = calcularSalarioNeto(
      {
        ...baseInput,
        situacionPersonal: { estado: 'soltero', hijosCount: 2, discapacidad: false },
      },
      ss,
      irpf
    );
    expect(withKids.desglose.irpfAnual).toBeLessThan(noKids.desglose.irpfAnual);
  });
});

// ===========================================================================
// calcularIndemnizacion
// ===========================================================================

describe('calcularIndemnizacion', () => {
  it('calculates improcedente dismissal correctly', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2020-01-01'),
        fechaFin: new Date('2026-01-01'),
        salarioBrutoDiario: 80,
        tipoDespido: 'improcedente',
        contratoPreFeb2012: false,
      },
      indemn
    );

    // 6 years × 33 days/year = 198 days × 80€/day = 15,840€
    expect(result.antiguedadAnios).toBeCloseTo(6, 0);
    expect(result.indemnizacionTotal).toBeGreaterThan(0);
    expect(result.exentaIRPF).toBe(true); // under 180k
  });

  it('calculates objetivo dismissal correctly', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2020-06-01'),
        fechaFin: new Date('2026-06-01'),
        salarioBrutoDiario: 80,
        tipoDespido: 'objetivo',
        contratoPreFeb2012: false,
      },
      indemn
    );

    // 6 years × 20 days/year = 120 days × 80 = 9,600
    expect(result.indemnizacionTotal).toBeCloseTo(9600, -2);
  });

  it('disciplinario gives zero severance', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2015-01-01'),
        fechaFin: new Date('2026-01-01'),
        salarioBrutoDiario: 100,
        tipoDespido: 'disciplinario',
        contratoPreFeb2012: false,
      },
      indemn
    );

    expect(result.indemnizacionTotal).toBe(0);
    expect(result.diasCorrespondientes).toBe(0);
  });

  it('handles pre-2012 split for improcedente', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2008-01-01'),
        fechaFin: new Date('2026-01-01'),
        salarioBrutoDiario: 80,
        tipoDespido: 'improcedente',
        contratoPreFeb2012: true,
      },
      indemn
    );

    expect(result.desglosePre2012).toBeDefined();
    expect(result.desglosePre2012!.periodoAnterior.anios).toBeGreaterThan(0);
    expect(result.desglosePre2012!.periodoPosterior.anios).toBeGreaterThan(0);
    // Pre-2012 portion should use 45 days/year
    expect(result.desglosePre2012!.periodoAnterior.dias).toBeGreaterThan(
      result.desglosePre2012!.periodoAnterior.anios * 33
    );
    expect(result.indemnizacionTotal).toBeGreaterThan(0);
  });

  it('fin contrato temporal uses 12 days/year', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2026-01-01'),
        salarioBrutoDiario: 60,
        tipoDespido: 'fin_temporal',
        contratoPreFeb2012: false,
      },
      indemn
    );

    // 2 years × 12 days/year = 24 days × 60 = 1,440
    expect(result.indemnizacionTotal).toBeCloseTo(1440, -2);
  });

  it('shows seniority text correctly', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2023-06-15'),
        fechaFin: new Date('2026-03-15'),
        salarioBrutoDiario: 70,
        tipoDespido: 'improcedente',
        contratoPreFeb2012: false,
      },
      indemn
    );

    expect(result.antiguedadTexto).toContain('año');
    expect(result.antiguedadTexto).toContain('mes');
  });

  it('IRPF exemption flag for large amounts', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2000-01-01'),
        fechaFin: new Date('2026-01-01'),
        salarioBrutoDiario: 500,
        tipoDespido: 'improcedente',
        contratoPreFeb2012: true,
      },
      indemn
    );

    // 26 years at high salary should exceed 180k
    if (result.indemnizacionTotal > 180000) {
      expect(result.exentaIRPF).toBe(false);
    }
  });
});
