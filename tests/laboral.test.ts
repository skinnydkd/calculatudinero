import { describe, it, expect } from 'vitest';
import { calcularSalarioNeto, calcularIndemnizacion, calcularFiniquito, calcularNomina } from '@lib/calculations/laboral';
import ssData from '@data/seguridad-social-2026.json';
import irpfData from '@data/irpf-2026.json';
import indemnizacionData from '@data/indemnizacion-rules.json';
import finiquitoData from '@data/finiquito-rules.json';
import type {
  SeguridadSocialData,
  IRPFData,
  IndemnizacionData,
  FiniquitoData,
} from '@lib/types';

const ss = ssData as unknown as SeguridadSocialData;
const irpf = irpfData as unknown as IRPFData;
const indemn = indemnizacionData as unknown as IndemnizacionData;
const finiquito = finiquitoData as unknown as FiniquitoData;

// ===========================================================================
// calcularSalarioNeto
// ===========================================================================

describe('calcularSalarioNeto', () => {
  it('30000 EUR bruto 14 pagas Madrid', () => {
    const result = calcularSalarioNeto(
      {
        salarioBrutoAnual: 30000,
        numeroPagas: 14,
        ccaa: 'madrid',
        situacionPersonal: { estado: 'soltero', hijosCount: 0, discapacidad: false },
        tipoContrato: 'indefinido',
        grupoCotizacion: 5,
      },
      ss,
      irpf
    );

    // Net should be between 22000-26000 for this salary in Madrid
    expect(result.salarioNetoAnual).toBeGreaterThan(22000);
    expect(result.salarioNetoAnual).toBeLessThan(27000);
    expect(result.salarioNetoMensual).toBeCloseTo(result.salarioNetoAnual / 14, 1);
    // Net + SS + IRPF = Gross
    const reconstructed = result.salarioNetoAnual + result.desglose.ssTotal + result.desglose.irpfAnual;
    expect(reconstructed).toBeCloseTo(30000, 0);
  });

  it('50000 EUR bruto temporal contract', () => {
    const result = calcularSalarioNeto(
      {
        salarioBrutoAnual: 50000,
        numeroPagas: 14,
        ccaa: 'madrid',
        situacionPersonal: { estado: 'soltero', hijosCount: 0, discapacidad: false },
        tipoContrato: 'temporal',
        grupoCotizacion: 1,
      },
      ss,
      irpf
    );

    expect(result.salarioNetoAnual).toBeLessThan(50000);
    expect(result.salarioNetoAnual).toBeGreaterThan(30000);
    // Temporal has higher desempleo rate
    expect(result.desglose.ssDesglose.desempleo).toBeGreaterThan(0);
    // Higher IRPF retention for 50k
    expect(result.desglose.tipoRetencion).toBeGreaterThan(15);
  });

  it('minimum salary (SMI)', () => {
    const smi = ss.smi2026.anual; // 17094
    const result = calcularSalarioNeto(
      {
        salarioBrutoAnual: smi,
        numeroPagas: 14,
        ccaa: 'madrid',
        situacionPersonal: { estado: 'soltero', hijosCount: 0, discapacidad: false },
        tipoContrato: 'indefinido',
        grupoCotizacion: 7,
      },
      ss,
      irpf
    );

    expect(result.salarioNetoAnual).toBeGreaterThan(0);
    expect(result.salarioNetoAnual).toBeLessThan(smi);
    // IRPF should be very low or zero for SMI due to reduccion rendimientos trabajo
    expect(result.desglose.tipoRetencion).toBeLessThan(10);
  });

  it('employer cost is always higher than gross salary', () => {
    const result = calcularSalarioNeto(
      {
        salarioBrutoAnual: 40000,
        numeroPagas: 12,
        ccaa: 'valencia',
        situacionPersonal: { estado: 'casado', hijosCount: 1, discapacidad: false },
        tipoContrato: 'indefinido',
        grupoCotizacion: 3,
      },
      ss,
      irpf
    );

    expect(result.costeTotalEmpresa).toBeGreaterThan(40000);
  });

  it('children reduce IRPF retention', () => {
    const noKids = calcularSalarioNeto(
      {
        salarioBrutoAnual: 35000,
        numeroPagas: 14,
        ccaa: 'madrid',
        situacionPersonal: { estado: 'soltero', hijosCount: 0, discapacidad: false },
        tipoContrato: 'indefinido',
        grupoCotizacion: 5,
      },
      ss,
      irpf
    );
    const withKids = calcularSalarioNeto(
      {
        salarioBrutoAnual: 35000,
        numeroPagas: 14,
        ccaa: 'madrid',
        situacionPersonal: { estado: 'soltero', hijosCount: 2, discapacidad: false },
        tipoContrato: 'indefinido',
        grupoCotizacion: 5,
      },
      ss,
      irpf
    );

    expect(withKids.desglose.irpfAnual).toBeLessThan(noKids.desglose.irpfAnual);
    expect(withKids.salarioNetoAnual).toBeGreaterThan(noKids.salarioNetoAnual);
  });
});

// ===========================================================================
// calcularIndemnizacion
// ===========================================================================

describe('calcularIndemnizacion', () => {
  it('improcedente: 6 years at 80 EUR/day', () => {
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

    // ~6 years * 33 days/year = ~198 days * 80 = ~15840
    expect(result.antiguedadAnios).toBeCloseTo(6, 0);
    expect(result.indemnizacionTotal).toBeCloseTo(15840, -2);
    expect(result.exentaIRPF).toBe(true);
  });

  it('objetivo: 6 years at 80 EUR/day', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2020-01-01'),
        fechaFin: new Date('2026-01-01'),
        salarioBrutoDiario: 80,
        tipoDespido: 'objetivo',
        contratoPreFeb2012: false,
      },
      indemn
    );

    // ~6 years * 20 days/year = ~120 days * 80 = ~9600
    expect(result.indemnizacionTotal).toBeCloseTo(9600, -2);
    expect(result.maximoAplicado).toBe(false);
  });

  it('disciplinario gives zero', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2015-01-01'),
        fechaFin: new Date('2026-01-01'),
        salarioBrutoDiario: 150,
        tipoDespido: 'disciplinario',
        contratoPreFeb2012: false,
      },
      indemn
    );

    expect(result.indemnizacionTotal).toBe(0);
    expect(result.diasCorrespondientes).toBe(0);
  });

  it('pre-2012 split for improcedente', () => {
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
    // Pre-2012 period: 2008-01-01 to 2012-02-12 (~4.12 years at 45 days/year)
    expect(result.desglosePre2012!.periodoAnterior.anios).toBeCloseTo(4.12, 0);
    // Pre-2012 uses 45 days/year, so dias should be > 33*years
    expect(result.desglosePre2012!.periodoAnterior.dias).toBeGreaterThan(
      result.desglosePre2012!.periodoAnterior.anios * 33
    );
    // Post-2012 period: 2012-02-12 to 2026-01-01 (~13.89 years at 33 days/year)
    expect(result.desglosePre2012!.periodoPosterior.anios).toBeGreaterThan(13);
    expect(result.indemnizacionTotal).toBeGreaterThan(0);
  });

  it('fin temporal: 2 years at 60 EUR/day = 12 days/year', () => {
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

    // ~2 years * 12 days/year = ~24 days * 60 = ~1440
    expect(result.indemnizacionTotal).toBeCloseTo(1440, -2);
  });

  it('ERE uses 20 days/year same as objetivo', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2021-06-01'),
        fechaFin: new Date('2026-06-01'),
        salarioBrutoDiario: 100,
        tipoDespido: 'ere',
        contratoPreFeb2012: false,
      },
      indemn
    );

    // ~5 years * 20 days/year = ~100 days * 100 = ~10000
    expect(result.indemnizacionTotal).toBeCloseTo(10000, -2);
  });

  it('seniority text is human-readable', () => {
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

    expect(result.antiguedadTexto).toContain('2 a');
    expect(result.antiguedadTexto).toContain('mes');
  });

  it('IRPF exemption flag: under 180000 is exempt', () => {
    const result = calcularIndemnizacion(
      {
        fechaInicio: new Date('2022-01-01'),
        fechaFin: new Date('2026-01-01'),
        salarioBrutoDiario: 80,
        tipoDespido: 'improcedente',
        contratoPreFeb2012: false,
      },
      indemn
    );

    expect(result.exentaIRPF).toBe(true);
    expect(result.indemnizacionTotal).toBeLessThan(180000);
  });
});

// ===========================================================================
// calcularFiniquito
// ===========================================================================

describe('calcularFiniquito', () => {
  it('mid-month exit (15th March), 14 pagas, not prorated', () => {
    const result = calcularFiniquito(
      {
        fechaBaja: new Date('2026-03-15'),
        salarioBrutoAnual: 28000,
        pagasExtra: 14,
        pagasProrrateadas: false,
        diasVacacionesTotales: 30,
        diasVacacionesDisfrutados: 0,
        retencionIRPF: 15,
      },
      finiquito
    );

    expect(result.diasTrabajadosMesBaja).toBe(15);
    expect(result.importeDiasTrabajados).toBeGreaterThan(0);
    // Should have prorated pagas
    expect(result.importeProrrataNavidad).toBeGreaterThan(0);
    expect(result.importeProrrataVerano).toBeGreaterThan(0);
    expect(result.totalProrratasPagas).toBeGreaterThan(0);
    // Vacation: ~74 days worked in 2026, so ~6 days of vacation accrued
    expect(result.diasVacacionesPendientes).toBeGreaterThan(0);
    // Net should be positive
    expect(result.totalNeto).toBeGreaterThan(0);
    expect(result.totalNeto).toBeLessThan(result.totalBruto);
  });

  it('12 pagas prorrateadas: no prorrata de pagas extra', () => {
    const result = calcularFiniquito(
      {
        fechaBaja: new Date('2026-06-30'),
        salarioBrutoAnual: 30000,
        pagasExtra: 12,
        pagasProrrateadas: true,
        diasVacacionesTotales: 22,
        diasVacacionesDisfrutados: 5,
        retencionIRPF: 12,
      },
      finiquito
    );

    expect(result.importeProrrataNavidad).toBe(0);
    expect(result.importeProrrataVerano).toBe(0);
    expect(result.totalProrratasPagas).toBe(0);
  });

  it('14 pagas prorrateadas: no prorrata either', () => {
    const result = calcularFiniquito(
      {
        fechaBaja: new Date('2026-06-30'),
        salarioBrutoAnual: 30000,
        pagasExtra: 14,
        pagasProrrateadas: true,
        diasVacacionesTotales: 30,
        diasVacacionesDisfrutados: 10,
        retencionIRPF: 15,
      },
      finiquito
    );

    expect(result.importeProrrataNavidad).toBe(0);
    expect(result.importeProrrataVerano).toBe(0);
    expect(result.totalProrratasPagas).toBe(0);
  });

  it('vacation calculation: all vacation used results in 0 vacation pay', () => {
    const result = calcularFiniquito(
      {
        fechaBaja: new Date('2026-12-31'),
        salarioBrutoAnual: 24000,
        pagasExtra: 12,
        pagasProrrateadas: true,
        diasVacacionesTotales: 30,
        diasVacacionesDisfrutados: 30,
        retencionIRPF: 10,
      },
      finiquito
    );

    expect(result.diasVacacionesPendientes).toBeCloseTo(0, 0);
    expect(result.importeVacaciones).toBeCloseTo(0, 0);
  });

  it('IRPF retention is applied correctly', () => {
    const result = calcularFiniquito(
      {
        fechaBaja: new Date('2026-03-15'),
        salarioBrutoAnual: 28000,
        pagasExtra: 14,
        pagasProrrateadas: false,
        diasVacacionesTotales: 30,
        diasVacacionesDisfrutados: 0,
        retencionIRPF: 15,
      },
      finiquito
    );

    expect(result.retencionIRPFImporte).toBeCloseTo(result.totalBruto * 0.15, 1);
  });

  it('totalBruto = dias trabajados + vacaciones + prorrata pagas', () => {
    const result = calcularFiniquito(
      {
        fechaBaja: new Date('2026-05-20'),
        salarioBrutoAnual: 32000,
        pagasExtra: 14,
        pagasProrrateadas: false,
        diasVacacionesTotales: 30,
        diasVacacionesDisfrutados: 3,
        retencionIRPF: 18,
      },
      finiquito
    );

    const expectedBruto =
      result.importeDiasTrabajados +
      result.importeVacaciones +
      result.totalProrratasPagas;

    expect(result.totalBruto).toBeCloseTo(expectedBruto, 1);
  });

  it('totalNeto = bruto - IRPF - SS', () => {
    const result = calcularFiniquito(
      {
        fechaBaja: new Date('2026-04-10'),
        salarioBrutoAnual: 25000,
        pagasExtra: 14,
        pagasProrrateadas: false,
        diasVacacionesTotales: 30,
        diasVacacionesDisfrutados: 0,
        retencionIRPF: 12,
      },
      finiquito
    );

    expect(result.totalNeto).toBeCloseTo(
      result.totalBruto - result.retencionIRPFImporte - result.cotizacionSS,
      1
    );
  });

  it('desglose has correct number of items (4 with prorated pagas)', () => {
    const result = calcularFiniquito(
      {
        fechaBaja: new Date('2026-03-15'),
        salarioBrutoAnual: 28000,
        pagasExtra: 14,
        pagasProrrateadas: false,
        diasVacacionesTotales: 30,
        diasVacacionesDisfrutados: 0,
        retencionIRPF: 15,
      },
      finiquito
    );

    // dias trabajados + vacaciones + prorrata navidad + prorrata verano
    expect(result.desglose).toHaveLength(4);
  });
});

// ===========================================================================
// calcularNomina
// ===========================================================================

describe('calcularNomina', () => {
  it('14 pagas returns correct salarioBase (bruto/14)', () => {
    const result = calcularNomina(
      {
        salarioBrutoAnual: 28000,
        pagas: 14,
        ccaa: 'madrid',
        grupoCotizacion: 5,
        tipoContrato: 'indefinido',
        estadoCivil: 'soltero',
        hijos: 0,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    expect(result.salarioBase).toBeCloseTo(28000 / 14, 1);
    expect(result.prorrataPagas).toBe(0);
    expect(result.totalDevengos).toBeCloseTo(28000 / 14, 1);
  });

  it('12 pagas includes prorrata', () => {
    const result = calcularNomina(
      {
        salarioBrutoAnual: 30000,
        pagas: 12,
        ccaa: 'madrid',
        grupoCotizacion: 5,
        tipoContrato: 'indefinido',
        estadoCivil: 'soltero',
        hijos: 0,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    const expectedBase = 30000 / 14;
    const expectedProrrata = (30000 / 14) * 2 / 12;
    expect(result.salarioBase).toBeCloseTo(expectedBase, 1);
    expect(result.prorrataPagas).toBeCloseTo(expectedProrrata, 1);
    expect(result.totalDevengos).toBeCloseTo(expectedBase + expectedProrrata, 1);
  });

  it('SS deductions use correct percentages for indefinido', () => {
    const result = calcularNomina(
      {
        salarioBrutoAnual: 30000,
        pagas: 14,
        ccaa: 'madrid',
        grupoCotizacion: 5,
        tipoContrato: 'indefinido',
        estadoCivil: 'soltero',
        hijos: 0,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    // Base de cotizacion = 30000/12 = 2500
    const baseCot = 30000 / 12;
    expect(result.contingenciasComunes).toBeCloseTo(baseCot * 4.70 / 100, 0);
    expect(result.desempleo).toBeCloseTo(baseCot * 1.55 / 100, 0);
    expect(result.formacionProfesional).toBeCloseTo(baseCot * 0.10 / 100, 0);
    expect(result.mei).toBeCloseTo(baseCot * ss.cotizacionTrabajador.mei / 100, 0);
    expect(result.totalSeguridadSocial).toBeCloseTo(
      result.contingenciasComunes + result.desempleo + result.formacionProfesional + result.mei,
      1
    );
  });

  it('temporal contract uses higher desempleo rate', () => {
    const indefinido = calcularNomina(
      {
        salarioBrutoAnual: 25000,
        pagas: 14,
        ccaa: 'madrid',
        grupoCotizacion: 5,
        tipoContrato: 'indefinido',
        estadoCivil: 'soltero',
        hijos: 0,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    const temporal = calcularNomina(
      {
        salarioBrutoAnual: 25000,
        pagas: 14,
        ccaa: 'madrid',
        grupoCotizacion: 5,
        tipoContrato: 'temporal',
        estadoCivil: 'soltero',
        hijos: 0,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    expect(temporal.desempleo).toBeGreaterThan(indefinido.desempleo);
  });

  it('liquidoPercibir = totalDevengos - totalDeducciones', () => {
    const result = calcularNomina(
      {
        salarioBrutoAnual: 35000,
        pagas: 14,
        ccaa: 'valencia',
        grupoCotizacion: 3,
        tipoContrato: 'indefinido',
        estadoCivil: 'casado',
        hijos: 1,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    expect(result.liquidoPercibir).toBeCloseTo(
      result.totalDevengos - result.totalDeducciones,
      1
    );
  });

  it('lineas array has expected entries for 14 pagas', () => {
    const result = calcularNomina(
      {
        salarioBrutoAnual: 25000,
        pagas: 14,
        ccaa: 'madrid',
        grupoCotizacion: 5,
        tipoContrato: 'indefinido',
        estadoCivil: 'soltero',
        hijos: 0,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    // 14 pagas: Salario base, TOTAL DEVENGOS, CC, desempleo, formacion, MEI, TOTAL SS, IRPF, TOTAL DEDUCCIONES = 9
    expect(result.lineas).toHaveLength(9);
    expect(result.lineas[0].concepto).toBe('Salario base');
    expect(result.lineas[0].devengos).toBe(result.salarioBase);
  });

  it('lineas array has prorrata entry for 12 pagas', () => {
    const result = calcularNomina(
      {
        salarioBrutoAnual: 25000,
        pagas: 12,
        ccaa: 'madrid',
        grupoCotizacion: 5,
        tipoContrato: 'indefinido',
        estadoCivil: 'soltero',
        hijos: 0,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    // 12 pagas: Salario base, Prorrata, TOTAL DEVENGOS, CC, desempleo, formacion, MEI, TOTAL SS, IRPF, TOTAL DEDUCCIONES = 10
    expect(result.lineas).toHaveLength(10);
    expect(result.lineas[1].concepto).toBe('Prorrata pagas extraordinarias');
    expect(result.lineas[1].devengos).toBe(result.prorrataPagas);
  });

  it('costeEmpresa is greater than totalDevengos', () => {
    const result = calcularNomina(
      {
        salarioBrutoAnual: 30000,
        pagas: 14,
        ccaa: 'madrid',
        grupoCotizacion: 5,
        tipoContrato: 'indefinido',
        estadoCivil: 'soltero',
        hijos: 0,
        discapacidad: 0,
      },
      ss,
      irpf
    );

    expect(result.costeEmpresa).toBeGreaterThan(result.totalDevengos);
    expect(result.ssEmpresa).toBeGreaterThan(0);
  });
});
