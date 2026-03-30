/**
 * Calculation engine for the Prestación por Desempleo (unemployment benefits).
 *
 * Implements the contributive unemployment benefit calculation following
 * SEPE (Servicio Público de Empleo Estatal) rules for 2026:
 * - First 180 days: 70% of base reguladora
 * - Remaining months: 50% of base reguladora
 * - Subject to maximum and minimum caps based on number of dependants
 *
 * All functions are PURE — data is passed as parameters, no side effects.
 */

import { round2 } from '../formatters';
import type { DesempleoData, DesempleoInput, DesempleoResult } from '../types';

/**
 * Determine the duration in months of the unemployment benefit based on
 * the number of days the worker has contributed in the last 6 years.
 *
 * @param diasCotizados - Total contribution days in the last 6 years
 * @param tabla - Duration table from desempleo data
 * @returns Duration in months, or 0 if below the minimum threshold
 */
function obtenerDuracionMeses(
  diasCotizados: number,
  tabla: DesempleoData['prestacionContributiva']['duracionPorCotizacion']
): number {
  for (const tramo of tabla) {
    const cumpleMin = diasCotizados >= tramo.diasCotizadosMin;
    const cumpleMax = tramo.diasCotizadosMax === null || diasCotizados <= tramo.diasCotizadosMax;
    if (cumpleMin && cumpleMax) {
      return tramo.mesesPrestacion;
    }
  }
  return 0;
}

/**
 * Determine the applicable maximum (tope) monthly benefit amount
 * based on the number of dependent children.
 *
 * @param hijosCount - Number of dependent children
 * @param topes - Maximum benefit caps from desempleo data
 * @returns Maximum monthly benefit amount
 */
function obtenerTope(
  hijosCount: number,
  topes: DesempleoData['prestacionContributiva']['topes']
): number {
  if (hijosCount >= 2) return topes.dosOMasHijos.importe;
  if (hijosCount === 1) return topes.unHijo.importe;
  return topes.sinHijos.importe;
}

/**
 * Determine the applicable minimum monthly benefit amount
 * based on whether the worker has dependent children.
 *
 * @param hijosCount - Number of dependent children
 * @param data - Prestación contributiva data
 * @returns Minimum monthly benefit amount
 */
function obtenerMinimo(
  hijosCount: number,
  data: DesempleoData['prestacionContributiva']
): number {
  return hijosCount > 0 ? data.minimoConHijos.importe : data.minimoSinHijos.importe;
}

/**
 * Apply maximum and minimum caps to a calculated monthly benefit amount.
 *
 * @param importe - Raw calculated monthly benefit
 * @param tope - Maximum cap
 * @param minimo - Minimum floor
 * @returns Capped monthly benefit amount
 */
function aplicarTopesYMinimos(importe: number, tope: number, minimo: number): number {
  if (importe > tope) return tope;
  if (importe < minimo) return minimo;
  return importe;
}

/**
 * Calculate the contributive unemployment benefit (prestación contributiva por desempleo).
 *
 * @param input - Calculator inputs (base cotización, días cotizados, hijos)
 * @param desempleoData - Regulatory data from desempleo-2026.json
 * @returns Full benefit breakdown including duration, monthly amounts, and totals
 */
export function calcularPrestacionDesempleo(
  input: DesempleoInput,
  desempleoData: DesempleoData
): DesempleoResult {
  const { baseCotizacionMedia, diasCotizados, hijosCount } = input;
  const prest = desempleoData.prestacionContributiva;

  // -------------------------------------------------------------------------
  // 1. Check minimum contribution requirement (360 days)
  // -------------------------------------------------------------------------
  if (diasCotizados < prest.cotizacionMinima) {
    return {
      tieneDerechoPrestacion: false,
      duracionMeses: 0,
      importePrimeros180Dias: 0,
      importeResto: 0,
      importeMensualMedio: 0,
      totalEstimado: 0,
      topeAplicado: 0,
      minimoAplicado: 0,
      baseReguladora: 0,
      desglose: [],
    };
  }

  // -------------------------------------------------------------------------
  // 2. Determine duration from contribution days table
  // -------------------------------------------------------------------------
  const duracionMeses = obtenerDuracionMeses(diasCotizados, prest.duracionPorCotizacion);

  // -------------------------------------------------------------------------
  // 3. Base reguladora = average of last 180 days of contribution base
  // -------------------------------------------------------------------------
  const baseReguladora = round2(baseCotizacionMedia);

  // -------------------------------------------------------------------------
  // 4. Calculate raw monthly benefit for each period
  // -------------------------------------------------------------------------
  const rawPrimeros6 = round2(baseReguladora * prest.porcentajePrimeros180Dias / 100);
  const rawResto = round2(baseReguladora * prest.porcentajeResto / 100);

  // -------------------------------------------------------------------------
  // 5. Apply maximum and minimum caps
  // -------------------------------------------------------------------------
  const tope = obtenerTope(hijosCount, prest.topes);
  const minimo = obtenerMinimo(hijosCount, prest);

  const importePrimeros180Dias = round2(aplicarTopesYMinimos(rawPrimeros6, tope, minimo));
  const importeResto = round2(aplicarTopesYMinimos(rawResto, tope, minimo));

  // -------------------------------------------------------------------------
  // 6. Build desglose (breakdown by period)
  // -------------------------------------------------------------------------
  const mesesPrimeros = Math.min(6, duracionMeses);
  const mesesResto = Math.max(0, duracionMeses - 6);

  const desglose: DesempleoResult['desglose'] = [];

  if (mesesPrimeros > 0) {
    desglose.push({
      periodo: `Primeros ${mesesPrimeros} meses (${prest.porcentajePrimeros180Dias}%)`,
      meses: mesesPrimeros,
      importeMensual: importePrimeros180Dias,
      subtotal: round2(mesesPrimeros * importePrimeros180Dias),
    });
  }

  if (mesesResto > 0) {
    desglose.push({
      periodo: `Meses ${mesesPrimeros + 1} a ${duracionMeses} (${prest.porcentajeResto}%)`,
      meses: mesesResto,
      importeMensual: importeResto,
      subtotal: round2(mesesResto * importeResto),
    });
  }

  // -------------------------------------------------------------------------
  // 7. Total estimated and average
  // -------------------------------------------------------------------------
  const totalEstimado = round2(
    desglose.reduce((sum, d) => sum + d.subtotal, 0)
  );

  const importeMensualMedio = duracionMeses > 0
    ? round2(totalEstimado / duracionMeses)
    : 0;

  return {
    tieneDerechoPrestacion: true,
    duracionMeses,
    importePrimeros180Dias,
    importeResto,
    importeMensualMedio,
    totalEstimado,
    topeAplicado: tope,
    minimoAplicado: minimo,
    baseReguladora,
    desglose,
  };
}
