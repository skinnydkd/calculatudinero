/**
 * Calculation engine for employment-related calculators:
 * - Net salary from gross (calcularSalarioNeto)
 * - Severance pay / indemnización (calcularIndemnizacion)
 *
 * All functions are PURE — data is passed as parameters, no side effects.
 */

import { round2 } from '../formatters';
import { calcularCuotaPorTramos, esForalCcaa } from './shared';
import type {
  ComunidadAutonoma,
  FiniquitoData,
  FiniquitoInput,
  FiniquitoResult,
  IndemnizacionData,
  IndemnizacionInput,
  IndemnizacionResult,
  IRPFData,
  SalarioInput,
  SalarioResult,
  SeguridadSocialData,
} from '../types';

/**
 * Calculate the reducción por rendimientos del trabajo.
 * @param rendimientosNetos - Net employment income (gross - SS)
 * @param reducciones - Reduction rules from IRPF data
 * @returns Reduction amount to subtract from taxable base
 */
function calcularReduccionTrabajo(
  rendimientosNetos: number,
  reducciones: IRPFData['reduccionRendimientosTrabajo']
): number {
  for (const regla of reducciones) {
    if (rendimientosNetos >= regla.desde && rendimientosNetos <= regla.hasta) {
      if (regla.tipo === 'fija' && regla.reduccion !== undefined) {
        return regla.reduccion;
      }
      if (regla.tipo === 'variable') {
        // formula: "7302 - 1.75 * (rendimiento - 14852)"
        return Math.max(0, 7302 - 1.75 * (rendimientosNetos - 14852));
      }
    }
  }
  return 0;
}

/**
 * Calculate the mínimo por descendientes based on number of children.
 * @param hijosCount - Number of dependent children
 * @param minimoDesc - Descendant minimums from IRPF data
 * @returns Total descendant minimum
 */
function calcularMinimoDescendientes(
  hijosCount: number,
  minimoDesc: IRPFData['minimoDescendientes']
): number {
  let total = 0;
  const importes = [
    minimoDesc.primero,
    minimoDesc.segundo,
    minimoDesc.tercero,
  ];

  for (let i = 0; i < hijosCount; i++) {
    if (i < 3) {
      total += importes[i];
    } else {
      total += minimoDesc.cuarto_y_sucesivos;
    }
  }

  return total;
}

/**
 * Calculate annual IRPF for employment income.
 * @param salarioBrutoAnual - Annual gross salary
 * @param cotizacionSS - Annual SS worker contribution
 * @param ccaa - Autonomous community
 * @param irpfData - IRPF bracket data
 * @param hijosCount - Number of dependent children
 * @returns Annual IRPF withholding amount
 */
function calcularIRPFLaboral(
  salarioBrutoAnual: number,
  cotizacionSS: number,
  ccaa: ComunidadAutonoma,
  irpfData: IRPFData,
  hijosCount: number
): number {
  // Rendimientos netos del trabajo = bruto - cotización SS trabajador
  const rendimientosNetos = salarioBrutoAnual - cotizacionSS;

  // Apply reducción por rendimientos del trabajo
  const reduccion = calcularReduccionTrabajo(rendimientosNetos, irpfData.reduccionRendimientosTrabajo);
  const rendimientosNetosReducidos = Math.max(0, rendimientosNetos - reduccion);

  // Calculate mínimo personal y familiar
  const minimoPersonal = irpfData.minimoPersonal;
  const minimoDescendientes = calcularMinimoDescendientes(hijosCount, irpfData.minimoDescendientes);
  const minimoTotal = minimoPersonal + minimoDescendientes;

  // Base liquidable
  const baseLiquidable = Math.max(0, rendimientosNetosReducidos);

  const ccaaData = irpfData.tramosAutonomicos[ccaa];

  if (ccaaData && ccaaData.regimenForal) {
    // Foral regime: single unified scale
    const cuotaIntegra = calcularCuotaPorTramos(baseLiquidable, ccaaData.tramos);
    const cuotaMinimo = calcularCuotaPorTramos(minimoTotal, ccaaData.tramos);
    return round2(Math.max(0, cuotaIntegra - cuotaMinimo));
  }

  // Common regime: state + regional applied to full base
  const cuotaEstatal = calcularCuotaPorTramos(baseLiquidable, irpfData.tramosEstatales);
  const cuotaMinimoEstatal = calcularCuotaPorTramos(minimoTotal, irpfData.tramosEstatales);

  const tramosAutonomicos = ccaaData?.tramos ?? irpfData.tramosEstatales;
  const cuotaAutonomica = calcularCuotaPorTramos(baseLiquidable, tramosAutonomicos);
  const cuotaMinimoAutonomica = calcularCuotaPorTramos(minimoTotal, tramosAutonomicos);

  const cuotaTotal =
    Math.max(0, cuotaEstatal - cuotaMinimoEstatal) +
    Math.max(0, cuotaAutonomica - cuotaMinimoAutonomica);

  return round2(cuotaTotal);
}

// ---------------------------------------------------------------------------
// calcularSalarioNeto
// ---------------------------------------------------------------------------

/**
 * Calculate net salary from gross, including SS contributions, IRPF, and employer costs.
 *
 * @param input - Salary calculator inputs
 * @param ssData - Social Security contribution rates and bases
 * @param irpfData - IRPF bracket data
 * @returns Full salary breakdown (net, deductions, employer cost)
 */
export function calcularSalarioNeto(
  input: SalarioInput,
  ssData: SeguridadSocialData,
  irpfData: IRPFData
): SalarioResult {
  const {
    salarioBrutoAnual,
    numeroPagas,
    ccaa,
    situacionPersonal,
    tipoContrato,
    grupoCotizacion,
  } = input;

  // Step 1: Determine base de cotización
  const grupoData = ssData.basesCotizacion2026.gruposCotizacion.find(
    (g) => g.grupo === grupoCotizacion
  );

  let baseCotizacionMensual: number;

  if (grupoData && grupoData.periodicidad === 'diaria') {
    // Groups 8-11: daily bases, convert to monthly
    const baseDiaria = Math.min(
      Math.max(salarioBrutoAnual / 365, grupoData.baseMinima),
      grupoData.baseMaxima
    );
    baseCotizacionMensual = round2(baseDiaria * 30);
  } else {
    // Groups 1-7: monthly bases
    const baseMinima = grupoData?.baseMinima ?? ssData.basesCotizacion2026.baseMinima;
    const baseMaxima = grupoData?.baseMaxima ?? ssData.basesCotizacion2026.baseMaxima;

    // Base de cotización = gross monthly (including prorated pagas extra)
    const baseMensual = salarioBrutoAnual / 12;
    baseCotizacionMensual = Math.min(Math.max(baseMensual, baseMinima), baseMaxima);
  }

  // Step 2: Worker SS contributions (monthly)
  const tasaDesempleo = tipoContrato === 'indefinido'
    ? ssData.cotizacionTrabajador.desempleoIndefinido
    : ssData.cotizacionTrabajador.desempleoTemporal;

  const ssContingencias = round2(baseCotizacionMensual * ssData.cotizacionTrabajador.contingenciasComunes / 100);
  const ssDesempleo = round2(baseCotizacionMensual * tasaDesempleo / 100);
  const ssFormacion = round2(baseCotizacionMensual * ssData.cotizacionTrabajador.formacionProfesional / 100);
  const ssMei = round2(baseCotizacionMensual * ssData.cotizacionTrabajador.mei / 100);

  const ssTotalMensual = round2(ssContingencias + ssDesempleo + ssFormacion + ssMei);
  const ssTotalAnual = round2(ssTotalMensual * 12);

  // Step 3: IRPF
  const irpfAnual = calcularIRPFLaboral(
    salarioBrutoAnual,
    ssTotalAnual,
    ccaa,
    irpfData,
    situacionPersonal.hijosCount
  );

  const tipoRetencion = salarioBrutoAnual > 0
    ? round2((irpfAnual / salarioBrutoAnual) * 100)
    : 0;

  const irpfMensual = round2(irpfAnual / numeroPagas);

  // Step 4: Net salary
  const salarioNetoAnual = round2(salarioBrutoAnual - ssTotalAnual - irpfAnual);
  const salarioNetoMensual = round2(salarioNetoAnual / numeroPagas);

  // Step 5: Employer cost
  const tasaDesempleoEmpresa = tipoContrato === 'indefinido'
    ? ssData.cotizacionEmpresa.desempleoIndefinido
    : ssData.cotizacionEmpresa.desempleoTemporal;

  const ssEmpresaPercent =
    ssData.cotizacionEmpresa.contingenciasComunes +
    tasaDesempleoEmpresa +
    ssData.cotizacionEmpresa.formacionProfesional +
    ssData.cotizacionEmpresa.mei +
    ssData.cotizacionEmpresa.fogasa +
    ssData.cotizacionEmpresa.accidentesTrabajoMin; // use minimum AT rate

  const ssEmpresaMensual = round2(baseCotizacionMensual * ssEmpresaPercent / 100);
  const costeTotalEmpresa = round2(salarioBrutoAnual + ssEmpresaMensual * 12);

  return {
    salarioNetoAnual,
    salarioNetoMensual,
    desglose: {
      brutoMensual: round2(salarioBrutoAnual / numeroPagas),
      brutoAnual: salarioBrutoAnual,
      ssTotal: ssTotalAnual,
      ssDesglose: {
        contingenciasComunes: round2(ssContingencias * 12),
        desempleo: round2(ssDesempleo * 12),
        formacion: round2(ssFormacion * 12),
        mei: round2(ssMei * 12),
      },
      irpfAnual,
      irpfMensual,
      tipoRetencion,
    },
    costeTotalEmpresa,
  };
}

// ---------------------------------------------------------------------------
// calcularIndemnizacion
// ---------------------------------------------------------------------------

/**
 * Calculate the difference in days between two dates as a fractional year count.
 * @returns Seniority in years (with decimals for partial years)
 */
function calcularAntiguedad(inicio: Date, fin: Date): {
  anios: number;
  aniosEnteros: number;
  mesesRestantes: number;
  diasRestantes: number;
  totalDias: number;
} {
  const totalDias = Math.floor(
    (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
  );

  const anios = totalDias / 365.25;

  // For human-readable text: calculate years, months, days
  let aniosEnteros = fin.getFullYear() - inicio.getFullYear();
  let mesesRestantes = fin.getMonth() - inicio.getMonth();
  let diasRestantes = fin.getDate() - inicio.getDate();

  if (diasRestantes < 0) {
    mesesRestantes--;
    // Days in previous month
    const prevMonth = new Date(fin.getFullYear(), fin.getMonth(), 0);
    diasRestantes += prevMonth.getDate();
  }

  if (mesesRestantes < 0) {
    aniosEnteros--;
    mesesRestantes += 12;
  }

  return {
    anios,
    aniosEnteros,
    mesesRestantes,
    diasRestantes,
    totalDias,
  };
}

/**
 * Format seniority as human-readable Spanish text.
 */
function formatearAntiguedad(anios: number, meses: number, dias: number): string {
  const parts: string[] = [];

  if (anios > 0) {
    parts.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  }
  if (meses > 0) {
    parts.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  }
  if (dias > 0 && anios === 0) {
    // Only show days if less than a year of seniority
    parts.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);
  }

  if (parts.length === 0) return '0 días';
  if (parts.length === 1) return parts[0];

  return parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
}

/**
 * Calculate severance pay (indemnización por despido).
 *
 * Supports all dismissal types including the special split calculation
 * for pre-February 2012 contracts with improcedente dismissal.
 *
 * @param input - Severance calculator inputs
 * @param indemnizacionData - Dismissal rules and IRPF exemption data
 * @returns Full severance breakdown
 */
export function calcularIndemnizacion(
  input: IndemnizacionInput,
  indemnizacionData: IndemnizacionData
): IndemnizacionResult {
  const { fechaInicio, fechaFin, salarioBrutoDiario, tipoDespido, contratoPreFeb2012 } = input;

  // Map input tipoDespido to data keys
  const keyMap: Record<string, string> = {
    improcedente: 'improcedente',
    objetivo: 'objetivo',
    fin_temporal: 'finContratoTemporal',
    ere: 'ere',
    disciplinario: 'disciplinario',
  };

  const reglas = indemnizacionData.tiposDespido[keyMap[tipoDespido]];

  if (!reglas) {
    return {
      indemnizacionTotal: 0,
      antiguedadAnios: 0,
      antiguedadTexto: '0 días',
      salarioDiario: salarioBrutoDiario,
      diasCorrespondientes: 0,
      maximoAplicado: false,
      exentaIRPF: true,
    };
  }

  // Disciplinary dismissal (procedente): 0 severance
  if (reglas.diasPorAnio === 0) {
    const antiguedad = calcularAntiguedad(fechaInicio, fechaFin);
    return {
      indemnizacionTotal: 0,
      antiguedadAnios: round2(antiguedad.anios),
      antiguedadTexto: formatearAntiguedad(
        antiguedad.aniosEnteros,
        antiguedad.mesesRestantes,
        antiguedad.diasRestantes
      ),
      salarioDiario: salarioBrutoDiario,
      diasCorrespondientes: 0,
      maximoAplicado: false,
      exentaIRPF: true,
    };
  }

  const antiguedad = calcularAntiguedad(fechaInicio, fechaFin);

  // Special case: improcedente with pre-2012 contract
  if (tipoDespido === 'improcedente' && contratoPreFeb2012 && reglas.pre2012) {
    const fechaCorte = new Date(reglas.pre2012.fechaCorte);

    // Period 1: from start to 2012-02-12 (or end, whichever is earlier)
    const finPeriodo1 = fechaCorte < fechaFin ? fechaCorte : fechaFin;
    const antiguedadPre = calcularAntiguedad(fechaInicio, finPeriodo1);
    const diasPre = round2(antiguedadPre.anios * reglas.pre2012.diasPorAnio);
    const importePre = round2(diasPre * salarioBrutoDiario);

    // Period 2: from 2012-02-12 to end (only if end is after cut date)
    let diasPost = 0;
    let importePost = 0;
    let antiguedadPost = { anios: 0, aniosEnteros: 0, mesesRestantes: 0, diasRestantes: 0, totalDias: 0 };

    if (fechaFin > fechaCorte) {
      antiguedadPost = calcularAntiguedad(fechaCorte, fechaFin);
      diasPost = round2(antiguedadPost.anios * reglas.diasPorAnio);
      importePost = round2(diasPost * salarioBrutoDiario);
    }

    let totalDias = round2(diasPre + diasPost);
    let indemnizacionTotal = round2(importePre + importePost);
    let maximoAplicado = false;

    // Apply caps:
    // If pre-2012 portion alone exceeds 720 days, cap at 42 months
    if (diasPre > reglas.pre2012.maximoDiasSalario) {
      // Cap at 42 months (1260 days)
      const maxImporte = round2(reglas.pre2012.maximoMensualidades * salarioBrutoDiario * 30);
      if (indemnizacionTotal > maxImporte) {
        indemnizacionTotal = maxImporte;
        maximoAplicado = true;
      }
    } else {
      // Combined cap: 720 days of salary
      const maxDias = reglas.maximoDiasSalario ?? 720;
      if (totalDias > maxDias) {
        totalDias = maxDias;
        indemnizacionTotal = round2(maxDias * salarioBrutoDiario);
        maximoAplicado = true;
      }
    }

    return {
      indemnizacionTotal,
      antiguedadAnios: round2(antiguedad.anios),
      antiguedadTexto: formatearAntiguedad(
        antiguedad.aniosEnteros,
        antiguedad.mesesRestantes,
        antiguedad.diasRestantes
      ),
      salarioDiario: salarioBrutoDiario,
      diasCorrespondientes: totalDias,
      maximoAplicado,
      exentaIRPF: indemnizacionTotal <= indemnizacionData.exencionIRPF.maximo,
      desglosePre2012: {
        periodoAnterior: {
          anios: round2(antiguedadPre.anios),
          dias: diasPre,
          importe: importePre,
        },
        periodoPosterior: {
          anios: round2(antiguedadPost.anios),
          dias: diasPost,
          importe: importePost,
        },
      },
    };
  }

  // Standard calculation (non-pre-2012 or non-improcedente)
  let diasCorrespondientes = round2(antiguedad.anios * reglas.diasPorAnio);
  let indemnizacionTotal = round2(diasCorrespondientes * salarioBrutoDiario);
  let maximoAplicado = false;

  // Apply maximum cap
  if (reglas.maximoDiasSalario && diasCorrespondientes > reglas.maximoDiasSalario) {
    diasCorrespondientes = reglas.maximoDiasSalario;
    indemnizacionTotal = round2(reglas.maximoDiasSalario * salarioBrutoDiario);
    maximoAplicado = true;
  } else if (reglas.maximoMensualidades) {
    const maxImporte = round2(reglas.maximoMensualidades * salarioBrutoDiario * 30);
    if (indemnizacionTotal > maxImporte) {
      indemnizacionTotal = maxImporte;
      maximoAplicado = true;
    }
  }

  return {
    indemnizacionTotal,
    antiguedadAnios: round2(antiguedad.anios),
    antiguedadTexto: formatearAntiguedad(
      antiguedad.aniosEnteros,
      antiguedad.mesesRestantes,
      antiguedad.diasRestantes
    ),
    salarioDiario: salarioBrutoDiario,
    diasCorrespondientes,
    maximoAplicado,
    exentaIRPF: indemnizacionTotal <= indemnizacionData.exencionIRPF.maximo,
  };
}

// ---------------------------------------------------------------------------
// calcularFiniquito
// ---------------------------------------------------------------------------

/**
 * Calculate the number of days elapsed between January 1 of a given year
 * and a target date (inclusive of the target day).
 */
function diasDesdeInicioAnio(fecha: Date): number {
  const start = new Date(fecha.getFullYear(), 0, 1); // January 1
  return Math.floor((fecha.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculate the number of days elapsed since July 1 up to a given date.
 * If the date is before July 1, counts from July 1 of the previous year.
 */
function diasDesdeJulio(fecha: Date): number {
  const year = fecha.getFullYear();
  const month = fecha.getMonth(); // 0-based
  let startJulio: Date;

  if (month >= 6) {
    // July (6) or later in same year
    startJulio = new Date(year, 6, 1);
  } else {
    // Before July — count from July 1 of previous year
    startJulio = new Date(year - 1, 6, 1);
  }

  return Math.floor((fecha.getTime() - startJulio.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate finiquito (settlement pay) when a worker leaves a job.
 *
 * Includes: worked days in the month of departure, unused vacation pay,
 * and prorated extra pay (pagas extra) if applicable.
 *
 * @param input - Finiquito calculator inputs
 * @param finiquitoData - Finiquito rules (vacation, extra pay, IRPF defaults)
 * @returns Full finiquito breakdown with gross, deductions, and net
 */
export function calcularFiniquito(
  input: FiniquitoInput,
  finiquitoData: FiniquitoData
): FiniquitoResult {
  const {
    fechaBaja,
    salarioBrutoAnual,
    pagasExtra,
    pagasProrrateadas,
    diasVacacionesTotales,
    diasVacacionesDisfrutados,
    retencionIRPF,
  } = input;

  // -----------------------------------------------------------------------
  // 1. Days worked in the month of departure
  // -----------------------------------------------------------------------
  const salarioMensual = round2(salarioBrutoAnual / pagasExtra);
  const salarioDiario = round2(salarioMensual / 30);
  const diasTrabajadosMesBaja = fechaBaja.getDate(); // day 1..31
  const importeDiasTrabajados = round2(diasTrabajadosMesBaja * salarioDiario);

  // -----------------------------------------------------------------------
  // 2. Unused vacation (proportional to the year worked)
  // -----------------------------------------------------------------------
  const diasDelAnioTrabajados = diasDesdeInicioAnio(fechaBaja);
  const diasCorrespondientesEnAnio = round2(
    diasVacacionesTotales * (diasDelAnioTrabajados / 365)
  );
  const diasVacacionesPendientes = round2(
    Math.max(0, diasCorrespondientesEnAnio - diasVacacionesDisfrutados)
  );
  const importeVacaciones = round2(diasVacacionesPendientes * salarioDiario);

  // -----------------------------------------------------------------------
  // 3. Prorated extra pays (only if 14 pagas and NOT prorrateadas)
  // -----------------------------------------------------------------------
  let importeProrrataNavidad = 0;
  let importeProrrataVerano = 0;
  let totalProrratasPagas = 0;

  if (pagasExtra === 14 && !pagasProrrateadas) {
    const pagaExtra = round2(salarioBrutoAnual / 14);

    // Paga navidad: accrued Jan 1 - Dec 31 (365 days)
    const diasDevengadosNavidad = diasDesdeInicioAnio(fechaBaja);
    importeProrrataNavidad = round2(pagaExtra * (diasDevengadosNavidad / 365));

    // Paga verano: accrued Jul 1 - Jun 30 (365 days)
    const diasDevengadosVerano = diasDesdeJulio(fechaBaja);
    importeProrrataVerano = round2(pagaExtra * (diasDevengadosVerano / 365));

    totalProrratasPagas = round2(importeProrrataNavidad + importeProrrataVerano);
  }

  // -----------------------------------------------------------------------
  // 4. Totals
  // -----------------------------------------------------------------------
  const totalBruto = round2(importeDiasTrabajados + importeVacaciones + totalProrratasPagas);

  // IRPF applies to all concepts
  const retencionIRPFImporte = round2(totalBruto * retencionIRPF / 100);

  // SS worker contribution: ~6.50% applied to worked days + prorated pagas
  const baseSS = round2(importeDiasTrabajados + totalProrratasPagas);
  const cotizacionSS = round2(baseSS * 0.065);

  const totalNeto = round2(totalBruto - retencionIRPFImporte - cotizacionSS);

  // -----------------------------------------------------------------------
  // 5. Breakdown for display
  // -----------------------------------------------------------------------
  const desglose: { concepto: string; bruto: number }[] = [
    {
      concepto: `Días trabajados mes de baja (${diasTrabajadosMesBaja} días)`,
      bruto: importeDiasTrabajados,
    },
    {
      concepto: `Vacaciones no disfrutadas (${diasVacacionesPendientes.toFixed(1)} días)`,
      bruto: importeVacaciones,
    },
  ];

  if (pagasExtra === 14 && !pagasProrrateadas) {
    desglose.push({
      concepto: 'Prorrata paga extra navidad',
      bruto: importeProrrataNavidad,
    });
    desglose.push({
      concepto: 'Prorrata paga extra verano',
      bruto: importeProrrataVerano,
    });
  }

  return {
    diasTrabajadosMesBaja,
    importeDiasTrabajados,
    diasVacacionesPendientes,
    importeVacaciones,
    importeProrrataNavidad,
    importeProrrataVerano,
    totalProrratasPagas,
    totalBruto,
    retencionIRPFImporte,
    cotizacionSS,
    totalNeto,
    desglose,
  };
}
