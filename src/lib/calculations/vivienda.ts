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
  ITPData,
} from '../types';

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
