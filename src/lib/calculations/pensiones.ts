/**
 * Calculation engine for the Pensión de Jubilación (retirement pension).
 *
 * Implements the Spanish Social Security retirement pension calculation for 2026:
 * - Base reguladora from average contribution base
 * - Percentage by years contributed (50% at 15 years, up to 100% at 37 years)
 * - Early retirement reductions (voluntary and involuntary)
 * - Gender gap complement per child
 * - Maximum and minimum pension caps
 *
 * All functions are PURE — data is passed as parameters, no side effects.
 */

import { round2 } from '../formatters';
import type { PensionesData, PensionInput, PensionResult } from '../types';

/**
 * Calculate the percentage of base reguladora based on years contributed.
 *
 * - Minimum 15 years to access a pension (50%)
 * - Each additional month beyond 15 years: +0.19% for months 1-248, +0.18% for 249-264
 * - Maximum 100% at 37 years
 *
 * @param aniosCotizados - Total years of contribution
 * @param data - Pension percentage rules from data file
 * @returns Percentage (0-100) of base reguladora
 */
function calcularPorcentajePorAnios(
  aniosCotizados: number,
  data: PensionesData['porcentajesPorAniosCotizados']
): number {
  if (aniosCotizados < 15) return 0;
  if (aniosCotizados >= data.aniosParaMaximo) return data.maximo;

  // Start with 50% for first 15 years
  let porcentaje = data.primeros15anios;

  // Additional months beyond 15 years
  const mesesAdicionales = Math.round((aniosCotizados - 15) * 12);

  if (mesesAdicionales <= 248) {
    porcentaje += mesesAdicionales * data.mesAdicional1a248;
  } else {
    porcentaje += 248 * data.mesAdicional1a248;
    const mesesRestantes = Math.min(mesesAdicionales - 248, 264 - 248);
    porcentaje += mesesRestantes * data.mesAdicional249a264;
  }

  return Math.min(porcentaje, data.maximo);
}

/**
 * Determine the ordinary retirement age based on years contributed.
 *
 * @param aniosCotizados - Total years of contribution
 * @param data - Retirement age rules from data file
 * @returns Ordinary retirement age
 */
function obtenerEdadOrdinaria(
  aniosCotizados: number,
  data: PensionesData['edadJubilacionOrdinaria']
): number {
  return aniosCotizados >= 37.5 ? data.con37anios6meses : data.sinRequisito;
}

/**
 * Calculate the early retirement reduction based on trimesters before ordinary age.
 *
 * @param edadJubilacion - Planned retirement age
 * @param edadOrdinaria - Ordinary retirement age
 * @param aniosCotizados - Total years of contribution
 * @param voluntaria - Whether early retirement is voluntary
 * @param data - Early retirement coefficient data
 * @returns Reduction percentage (0-100) to subtract from pension
 */
function calcularReduccionAnticipada(
  edadJubilacion: number,
  edadOrdinaria: number,
  aniosCotizados: number,
  voluntaria: boolean,
  data: PensionesData
): number {
  if (edadJubilacion >= edadOrdinaria) return 0;

  const anticipada = voluntaria
    ? data.jubilacionAnticipada.voluntaria
    : data.jubilacionAnticipada.involuntaria;

  // Calculate trimesters of anticipation
  const aniosAnticipacion = edadOrdinaria - edadJubilacion;
  const trimestres = Math.ceil(aniosAnticipacion * 4);

  // Determine reduction coefficient per trimester based on contribution years
  let coeficientePorTrimestre: number;

  if (aniosCotizados >= 44.5) {
    coeficientePorTrimestre = anticipada.coeficientesReduccionPorTrimestre[3].porTrimestre;
  } else if (aniosCotizados >= 41.5) {
    coeficientePorTrimestre = anticipada.coeficientesReduccionPorTrimestre[2].porTrimestre;
  } else if (aniosCotizados >= 38.5) {
    coeficientePorTrimestre = anticipada.coeficientesReduccionPorTrimestre[1].porTrimestre;
  } else {
    coeficientePorTrimestre = anticipada.coeficientesReduccionPorTrimestre[0].porTrimestre;
  }

  return round2(trimestres * coeficientePorTrimestre);
}

/**
 * Calculate the retirement pension (pensión de jubilación).
 *
 * @param input - Calculator inputs (base, years, age, family situation, early retirement)
 * @param pensionesData - Regulatory data from pensiones-2026.json
 * @returns Full pension breakdown including base reguladora, percentages, and adjustments
 */
export function calcularPension(
  input: PensionInput,
  pensionesData: PensionesData
): PensionResult {
  const {
    baseCotizacionMedia,
    aniosCotizados,
    edadJubilacion,
    tieneConyuge,
    hijosCount,
    esAnticipada,
    anticipadaVoluntaria,
  } = input;

  // -------------------------------------------------------------------------
  // 1. Base reguladora (simplified: user enters estimated average base)
  // -------------------------------------------------------------------------
  const baseReguladora = round2(baseCotizacionMedia);

  // -------------------------------------------------------------------------
  // 2. Percentage by years contributed
  // -------------------------------------------------------------------------
  const porcentajePorAnios = round2(
    calcularPorcentajePorAnios(aniosCotizados, pensionesData.porcentajesPorAniosCotizados)
  );

  // -------------------------------------------------------------------------
  // 3. Ordinary retirement age
  // -------------------------------------------------------------------------
  const edadOrdinaria = obtenerEdadOrdinaria(
    aniosCotizados,
    pensionesData.edadJubilacionOrdinaria
  );

  // -------------------------------------------------------------------------
  // 4. Raw pension before adjustments
  // -------------------------------------------------------------------------
  let pensionBruta = round2(baseReguladora * porcentajePorAnios / 100);

  // -------------------------------------------------------------------------
  // 5. Early retirement reduction
  // -------------------------------------------------------------------------
  let reduccionAnticipada = 0;
  if (esAnticipada && edadJubilacion < edadOrdinaria) {
    reduccionAnticipada = calcularReduccionAnticipada(
      edadJubilacion,
      edadOrdinaria,
      aniosCotizados,
      anticipadaVoluntaria,
      pensionesData
    );
    pensionBruta = round2(pensionBruta * (1 - reduccionAnticipada / 100));
  }

  // -------------------------------------------------------------------------
  // 6. Gender gap complement
  // -------------------------------------------------------------------------
  const complementoBrecha = round2(pensionesData.complementoBrecha.porHijo * hijosCount);

  // -------------------------------------------------------------------------
  // 7. Add complement to pension
  // -------------------------------------------------------------------------
  let pensionFinal = round2(pensionBruta + complementoBrecha);

  // -------------------------------------------------------------------------
  // 8. Apply maximum cap
  // -------------------------------------------------------------------------
  let pensionMaximaAplicada = false;
  if (pensionFinal > pensionesData.topesYMinimos.pensionMaxima2026) {
    pensionFinal = pensionesData.topesYMinimos.pensionMaxima2026;
    pensionMaximaAplicada = true;
  }

  // -------------------------------------------------------------------------
  // 9. Apply minimum floor
  // -------------------------------------------------------------------------
  let pensionMinimaAplicada = false;
  const minimoAplicable = tieneConyuge
    ? pensionesData.topesYMinimos.pensionMinima65ConConyuge
    : pensionesData.topesYMinimos.pensionMinima65SinConyuge;

  if (aniosCotizados >= 15 && pensionFinal < minimoAplicable) {
    pensionFinal = minimoAplicable;
    pensionMinimaAplicada = true;
  }

  // -------------------------------------------------------------------------
  // 10. Annual amounts (14 pagas)
  // -------------------------------------------------------------------------
  const pensionBrutaMensual = round2(pensionFinal);
  const pensionBrutaAnual = round2(pensionFinal * 14);
  const pensionNeta14Pagas = pensionBrutaAnual;

  return {
    baseReguladora,
    porcentajePorAnios,
    pensionBrutaMensual,
    pensionBrutaAnual,
    pensionNeta14Pagas,
    complementoBrecha,
    reduccionAnticipada,
    pensionMaximaAplicada,
    pensionMinimaAplicada,
    edadOrdinaria,
  };
}
