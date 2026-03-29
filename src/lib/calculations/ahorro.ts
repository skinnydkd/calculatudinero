/**
 * Calculation engine for savings and investment calculators:
 * - Compound interest (calcularInteresCompuesto)
 *
 * All functions are PURE — no side effects, no external data dependency.
 */

import { round2 } from '../formatters';
import type { InteresCompuestoInput, InteresCompuestoResult } from '../types';

/**
 * Calculate compound interest with monthly contributions and inflation adjustment.
 *
 * @param input - Capital, monthly contribution, annual rate, term, and inflation
 * @returns Nominal and real capital, total contributed, interests, and yearly evolution
 */
export function calcularInteresCompuesto(
  input: InteresCompuestoInput
): InteresCompuestoResult {
  const { capitalInicial, aportacionMensual, tasaAnual, plazoAnios, inflacionAnual } = input;

  const tasaMensual = tasaAnual / 100 / 12;
  const totalMeses = plazoAnios * 12;

  let capital = capitalInicial;
  const evolucionAnual: InteresCompuestoResult['evolucionAnual'] = [];

  for (let mes = 1; mes <= totalMeses; mes++) {
    // Apply monthly interest, then add contribution
    capital = capital * (1 + tasaMensual) + aportacionMensual;

    // Record snapshot at end of each year
    if (mes % 12 === 0) {
      const anio = mes / 12;
      const aportadoAcumulado = capitalInicial + aportacionMensual * mes;
      const interesesAcumulados = capital - aportadoAcumulado;
      const factorInflacion = Math.pow(1 + inflacionAnual / 100, anio);
      const capitalReal = capital / factorInflacion;

      evolucionAnual.push({
        anio,
        capitalAcumulado: round2(capital),
        capitalAcumuladoReal: round2(capitalReal),
        aportadoAcumulado: round2(aportadoAcumulado),
        interesesAcumulados: round2(interesesAcumulados),
      });
    }
  }

  const capitalFinal = round2(capital);
  const totalAportado = round2(capitalInicial + aportacionMensual * totalMeses);
  const totalIntereses = round2(capitalFinal - totalAportado);
  const factorInflacionTotal = Math.pow(1 + inflacionAnual / 100, plazoAnios);
  const capitalFinalReal = round2(capitalFinal / factorInflacionTotal);
  const totalInteresesReales = round2(capitalFinalReal - totalAportado);

  return {
    capitalFinal,
    capitalFinalReal,
    totalAportado,
    totalIntereses,
    totalInteresesReales,
    evolucionAnual,
  };
}
