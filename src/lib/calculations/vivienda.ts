/**
 * Calculation engine for housing-related calculators:
 * - Mortgage simulation (calcularHipoteca)
 * - Purchase costs by CCAA (calcularGastosCompra)
 *
 * All functions are PURE — data is passed as parameters, no side effects.
 */

import { round2 } from '../formatters';
import type {
  ComunidadAutonoma,
  HipotecaInput,
  HipotecaResult,
  HipotecaReferenceData,
  AmortizacionAnual,
  GastosCompraInput,
  GastosCompraResult,
  GastosCompraComparativaItem,
  GastosCompraComparativaResult,
  ITPData,
  AmortizacionAnticipadaInput,
  AmortizacionAnticipadaResult,
  RentabilidadAlquilerInput,
  RentabilidadAlquilerResult,
} from '../types';
import { CCAA_OPTIONS } from '../types';

// ---------------------------------------------------------------------------
// calcularHipoteca
// ---------------------------------------------------------------------------

/**
 * Simulate a mortgage using French amortization (constant installment).
 *
 * Formula: M = P * r * (1+r)^n / ((1+r)^n - 1)
 * where P = capital, r = monthly rate, n = number of months
 *
 * @param input - Mortgage calculator inputs
 * @param hipotecaData - Reference data (euribor, rates, etc.)
 * @returns Full mortgage breakdown with annual amortization table
 */
export function calcularHipoteca(
  input: HipotecaInput,
  hipotecaData: HipotecaReferenceData
): HipotecaResult {
  const {
    precioVivienda,
    ahorroInicial,
    plazoAnios,
    tipoHipoteca,
    diferencialVariable,
    euriborActual,
  } = input;

  let tipoInteres = input.tipoInteres;

  // For variable-rate mortgages: effective rate = euribor + spread
  if (tipoHipoteca === 'variable') {
    const euribor = euriborActual ?? hipotecaData.euribor.actual;
    const diferencial = diferencialVariable ?? hipotecaData.tiposReferencia.variable.diferencial.media;
    tipoInteres = euribor + diferencial;
  }

  const capitalPrestamo = precioVivienda - ahorroInicial;
  const porcentajeFinanciacion = precioVivienda > 0
    ? round2((capitalPrestamo / precioVivienda) * 100)
    : 0;

  const n = plazoAnios * 12;
  const r = tipoInteres / 100 / 12;

  // Monthly payment using French amortization formula
  let cuotaMensual: number;
  if (r === 0) {
    // Edge case: 0% interest
    cuotaMensual = round2(capitalPrestamo / n);
  } else {
    const factor = Math.pow(1 + r, n);
    cuotaMensual = round2((capitalPrestamo * r * factor) / (factor - 1));
  }

  // Build annual amortization table by iterating month by month
  const cuadroAmortizacion: AmortizacionAnual[] = [];
  let capitalPendiente = capitalPrestamo;

  for (let anio = 1; anio <= plazoAnios; anio++) {
    let capitalAmortizadoAnual = 0;
    let interesesAnuales = 0;
    let cuotaAnual = 0;

    const mesesEnAnio = anio === plazoAnios
      ? n - (plazoAnios - 1) * 12 // handle remainder months
      : 12;

    for (let mes = 0; mes < mesesEnAnio; mes++) {
      const interesMes = round2(capitalPendiente * r);
      const capitalMes = round2(cuotaMensual - interesMes);

      // Last payment: adjust to cover remaining principal exactly
      const capitalEfectivo = (anio === plazoAnios && mes === mesesEnAnio - 1)
        ? capitalPendiente
        : capitalMes;

      interesesAnuales = round2(interesesAnuales + interesMes);
      capitalAmortizadoAnual = round2(capitalAmortizadoAnual + capitalEfectivo);
      cuotaAnual = round2(cuotaAnual + interesMes + capitalEfectivo);
      capitalPendiente = round2(capitalPendiente - capitalEfectivo);
    }

    // Ensure capital pendiente doesn't go negative due to rounding
    if (capitalPendiente < 0) capitalPendiente = 0;

    cuadroAmortizacion.push({
      anio,
      capitalPendiente,
      capitalAmortizado: capitalAmortizadoAnual,
      interesesAnuales,
      cuotaAnual,
    });
  }

  const totalPagado = round2(cuotaMensual * n);
  const totalIntereses = round2(totalPagado - capitalPrestamo);

  return {
    capitalPrestamo,
    cuotaMensual,
    totalIntereses,
    totalPagado,
    porcentajeFinanciacion,
    cuadroAmortizacion,
  };
}

// ---------------------------------------------------------------------------
// calcularGastosCompra
// ---------------------------------------------------------------------------

/**
 * Calculate the purchase costs for a property, including taxes and fees.
 *
 * - New property: IVA (10%) + AJD (1.5%)
 * - Second-hand property: ITP by CCAA (standard or reduced rate)
 * - Fixed fees: notary, registry, gestoría, appraisal
 *
 * @param input - Purchase cost calculator inputs
 * @param hipotecaData - Reference data for fixed fees
 * @param itpData - ITP rates by autonomous community
 * @returns Full breakdown of purchase costs
 */
export function calcularGastosCompra(
  input: GastosCompraInput,
  hipotecaData: HipotecaReferenceData,
  itpData: ITPData
): GastosCompraResult {
  const { precioVivienda, ccaa, esViviendaNueva, aplicaTipoReducido } = input;

  let impuesto: number;
  let impuestoNombre: string;
  let impuestoTipo: number;

  if (esViviendaNueva) {
    // New property: IVA + AJD
    const tipoIVA = itpData.tipoIVAViviendaNueva;
    const tipoAJD = itpData.tipoAJD;
    impuestoTipo = tipoIVA + tipoAJD;
    impuesto = round2(precioVivienda * impuestoTipo / 100);
    impuestoNombre = `IVA (${tipoIVA}%) + AJD (${tipoAJD}%)`;
  } else {
    // Second-hand property: ITP by CCAA
    const ccaaData = itpData.tiposPorCcaa[ccaa];
    if (ccaaData) {
      impuestoTipo = aplicaTipoReducido ? ccaaData.reducido : ccaaData.tipo;
    } else {
      impuestoTipo = 8; // fallback
    }
    impuesto = round2(precioVivienda * impuestoTipo / 100);
    impuestoNombre = `ITP (${impuestoTipo}%)`;
  }

  // Fixed costs from reference data
  const notaria = round2(precioVivienda * hipotecaData.gastosCompra.notaria.porcentaje / 100);
  const registro = round2(precioVivienda * hipotecaData.gastosCompra.registro.porcentaje / 100);
  const gestoria = hipotecaData.gastosCompra.gestoria.fijo;
  const tasacion = hipotecaData.gastosCompra.tasacion.fijo;

  const totalGastos = round2(impuesto + notaria + registro + gestoria + tasacion);
  const totalConPrecio = round2(precioVivienda + totalGastos);

  return {
    impuesto,
    impuestoNombre,
    impuestoTipo,
    notaria,
    registro,
    gestoria,
    tasacion,
    totalGastos,
    totalConPrecio,
  };
}

// ---------------------------------------------------------------------------
// calcularGastosCompraComparativa
// ---------------------------------------------------------------------------

/**
 * Calculate purchase costs for ALL 19 autonomous communities, allowing
 * side-by-side comparison. Results are sorted by totalGastos ascending
 * (cheapest first).
 *
 * @param precioVivienda - Property price in euros
 * @param esViviendaNueva - true for new-build (IVA), false for second-hand (ITP)
 * @param aplicaTipoReducido - Whether to apply reduced tax rate
 * @param hipotecaData - Reference data for fixed fees
 * @param itpData - ITP rates by autonomous community
 * @returns Array of 19 items sorted by totalGastos ascending
 */
export function calcularGastosCompraComparativa(
  precioVivienda: number,
  esViviendaNueva: boolean,
  aplicaTipoReducido: boolean,
  hipotecaData: HipotecaReferenceData,
  itpData: ITPData,
): GastosCompraComparativaResult {
  const items: GastosCompraComparativaItem[] = CCAA_OPTIONS.map((opt) => {
    const result = calcularGastosCompra(
      {
        precioVivienda,
        ccaa: opt.value,
        esViviendaNueva,
        aplicaTipoReducido,
      },
      hipotecaData,
      itpData,
    );

    const ahorroMinimo = round2(precioVivienda * 0.20 + result.totalGastos);

    return {
      ccaa: opt.value,
      ccaaLabel: opt.label,
      tipoImpuesto: result.impuestoTipo,
      impuesto: result.impuesto,
      notaria: result.notaria,
      registro: result.registro,
      gestoria: result.gestoria,
      tasacion: result.tasacion,
      totalGastos: result.totalGastos,
      totalConPrecio: result.totalConPrecio,
      ahorroMinimo,
    };
  });

  // Sort by totalGastos ascending (cheapest community first)
  items.sort((a, b) => a.totalGastos - b.totalGastos);

  return items;
}

// ---------------------------------------------------------------------------
// calcularAmortizacionAnticipada
// ---------------------------------------------------------------------------

/**
 * Calculate the effect of early mortgage repayment, comparing both options:
 * reducing the monthly payment vs. reducing the remaining term.
 *
 * French amortization formula: M = P * r * (1+r)^n / ((1+r)^n - 1)
 * Solving for n: n = -log(1 - P*r/M) / log(1+r)
 *
 * @param input - Early repayment calculator inputs
 * @returns Comparison of both repayment strategies
 */
export function calcularAmortizacionAnticipada(
  input: AmortizacionAnticipadaInput
): AmortizacionAnticipadaResult {
  const {
    capitalPendiente,
    cuotaActual,
    tipoInteres,
    plazoRestanteMeses,
    cantidadAmortizar,
  } = input;

  const nuevoCapital = round2(capitalPendiente - cantidadAmortizar);
  const r = tipoInteres / 100 / 12; // monthly rate

  // --- Total interest with original conditions (no early repayment) ---
  const totalPagoOriginal = round2(cuotaActual * plazoRestanteMeses);
  const totalInteresesOriginal = round2(totalPagoOriginal - capitalPendiente);

  // --- Option 1: Reducir cuota (keep same term) ---
  let nuevaCuota: number;
  if (r === 0) {
    nuevaCuota = round2(nuevoCapital / plazoRestanteMeses);
  } else {
    const factor = Math.pow(1 + r, plazoRestanteMeses);
    nuevaCuota = round2((nuevoCapital * r * factor) / (factor - 1));
  }
  const ahorroCuotaMensual = round2(cuotaActual - nuevaCuota);
  const totalPagoReducirCuota = round2(nuevaCuota * plazoRestanteMeses);
  const totalInteresesReducirCuota = round2(totalPagoReducirCuota - nuevoCapital);
  const ahorroTotalIntereses = round2(totalInteresesOriginal - totalInteresesReducirCuota);

  // --- Option 2: Reducir plazo (keep same payment) ---
  let nuevosPlazoMeses: number;
  if (r === 0) {
    nuevosPlazoMeses = Math.ceil(nuevoCapital / cuotaActual);
  } else {
    // n = -log(1 - P*r/M) / log(1+r)
    const denominador = 1 - (nuevoCapital * r) / cuotaActual;
    if (denominador <= 0) {
      // Payment is too low to cover interest — fallback to original term
      nuevosPlazoMeses = plazoRestanteMeses;
    } else {
      nuevosPlazoMeses = Math.ceil(-Math.log(denominador) / Math.log(1 + r));
    }
  }
  const mesesAhorrados = plazoRestanteMeses - nuevosPlazoMeses;
  const totalPagoReducirPlazo = round2(cuotaActual * nuevosPlazoMeses);
  const totalInteresesReducirPlazo = round2(totalPagoReducirPlazo - nuevoCapital);
  const ahorroTotalInteresesPlazo = round2(totalInteresesOriginal - totalInteresesReducirPlazo);

  // --- Comparison ---
  const mejorOpcion: 'reducir_cuota' | 'reducir_plazo' =
    ahorroTotalInteresesPlazo >= ahorroTotalIntereses ? 'reducir_plazo' : 'reducir_cuota';

  const comparativa = [
    {
      modalidad: 'Reducir cuota',
      nuevaCuota,
      nuevosPlazoMeses: plazoRestanteMeses,
      ahorroIntereses: ahorroTotalIntereses,
    },
    {
      modalidad: 'Reducir plazo',
      nuevaCuota: cuotaActual,
      nuevosPlazoMeses,
      ahorroIntereses: ahorroTotalInteresesPlazo,
    },
  ];

  return {
    nuevoCapital,
    nuevaCuota,
    ahorroCuotaMensual,
    ahorroTotalIntereses,
    nuevosPlazoMeses,
    mesesAhorrados,
    ahorroTotalInteresesPlazo,
    mejorOpcion,
    comparativa,
  };
}

// ---------------------------------------------------------------------------
// calcularRentabilidadAlquiler
// ---------------------------------------------------------------------------

/**
 * Calculate the profitability of a rental property investment.
 *
 * Gross yield = (annual rent / purchase price) * 100
 * Net yield = (net profit / total investment) * 100
 * Cash flow = (net profit / 12) - mortgage payment
 * Payback = total investment / net profit
 *
 * @param input - Rental profitability calculator inputs
 * @returns Full profitability breakdown
 */
export function calcularRentabilidadAlquiler(
  input: RentabilidadAlquilerInput
): RentabilidadAlquilerResult {
  const {
    precioCompra,
    gastosCompra,
    reformaInicial,
    alquilerMensual,
    ibiAnual,
    comunidadMensual,
    seguroAnual,
    hipotecaCuotaMensual,
    periodoVacioMeses,
  } = input;

  // 1. Total investment
  const inversionTotal = round2(precioCompra + gastosCompra + reformaInicial);

  // 2. Annual income (adjusted for vacancy)
  const mesesOcupados = 12 - periodoVacioMeses;
  const ingresosAnuales = round2(alquilerMensual * mesesOcupados);

  // 3. Annual expenses
  const comunidadAnual = round2(comunidadMensual * 12);
  const mantenimiento = round2(precioCompra * 0.01); // 1% del precio de compra
  const gastosAnualesTotales = round2(ibiAnual + comunidadAnual + seguroAnual + mantenimiento);

  // 4. Net profit
  const beneficioNetoAnual = round2(ingresosAnuales - gastosAnualesTotales);

  // 5. Profitability metrics
  const rentabilidadBruta = precioCompra > 0
    ? round2((alquilerMensual * 12) / precioCompra * 100)
    : 0;

  const rentabilidadNeta = inversionTotal > 0
    ? round2(beneficioNetoAnual / inversionTotal * 100)
    : 0;

  // 6. Cash flow (after mortgage)
  const cashFlowMensual = round2(beneficioNetoAnual / 12 - hipotecaCuotaMensual);

  // 7. Payback period
  const anosRecuperacion = beneficioNetoAnual > 0
    ? round2(inversionTotal / beneficioNetoAnual)
    : 0;

  // 8. Breakdown
  const desglose = [
    { concepto: 'Alquiler anual', importe: ingresosAnuales },
    { concepto: 'IBI', importe: -ibiAnual },
    { concepto: 'Comunidad de propietarios', importe: -comunidadAnual },
    { concepto: 'Seguro hogar', importe: -seguroAnual },
    { concepto: 'Mantenimiento (~1% precio)', importe: -mantenimiento },
  ];

  if (periodoVacioMeses > 0) {
    const perdidaVacio = round2(alquilerMensual * periodoVacioMeses);
    desglose.push({ concepto: `Vacío (${periodoVacioMeses} meses)`, importe: -perdidaVacio });
  }

  return {
    inversionTotal,
    ingresosAnuales,
    gastosAnualesTotales,
    beneficioNetoAnual,
    rentabilidadBruta,
    rentabilidadNeta,
    cashFlowMensual,
    anosRecuperacion,
    desglose,
  };
}
