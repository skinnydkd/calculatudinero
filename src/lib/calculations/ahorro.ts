/**
 * Calculation engine for savings and investment calculators:
 * - Compound interest (calcularInteresCompuesto)
 *
 * All functions are PURE — no side effects, no external data dependency.
 */

import { round2 } from '../formatters';
import type {
  InteresCompuestoInput,
  InteresCompuestoResult,
  PrestamoPersonalInput,
  PrestamoPersonalResult,
  ComparacionPrestamos,
} from '../types';

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

// ---------------------------------------------------------------------------
// Préstamo Personal
// ---------------------------------------------------------------------------

/**
 * Calculate personal loan monthly payment, total cost, and effective TAE.
 *
 * Uses French amortization (constant payment) for the monthly installment,
 * and Newton-Raphson iteration to find the TAE (effective annual rate) that
 * includes commissions and insurance in the total cost.
 *
 * @param input - Capital, TIN, term, opening commission, monthly insurance
 * @returns Monthly payment, totals, TAE, and cost breakdown
 */
export function calcularPrestamoPersonal(
  input: PrestamoPersonalInput
): PrestamoPersonalResult {
  const { capital, tin, plazoMeses, comisionApertura, seguroMensual } = input;

  // Monthly payment (French amortization)
  let cuotaMensual: number;
  if (tin === 0) {
    cuotaMensual = round2(capital / plazoMeses);
  } else {
    const r = tin / 100 / 12;
    const factor = Math.pow(1 + r, plazoMeses);
    cuotaMensual = round2((capital * r * factor) / (factor - 1));
  }

  const totalPagado = round2(cuotaMensual * plazoMeses);
  const totalIntereses = round2(totalPagado - capital);
  const comisionAperturaImporte = round2(capital * comisionApertura / 100);
  const totalSeguros = round2(seguroMensual * plazoMeses);
  const costeTotal = round2(totalPagado + comisionAperturaImporte + totalSeguros);

  // TAE calculation using Newton-Raphson
  // The TAE is the annual effective rate i such that:
  //   capital - comision = sum_{k=1}^{n} (cuota + seguro) / (1 + i_m)^k
  // where i_m = (1+i)^(1/12) - 1
  const taeCalculada = calcularTAE(capital, comisionAperturaImporte, cuotaMensual, seguroMensual, plazoMeses);

  const desglose: { concepto: string; importe: number }[] = [
    { concepto: 'Capital solicitado', importe: capital },
    { concepto: 'Total intereses', importe: totalIntereses },
    { concepto: 'Comisión de apertura', importe: comisionAperturaImporte },
    { concepto: 'Total seguros', importe: totalSeguros },
    { concepto: 'Coste total del préstamo', importe: costeTotal },
  ];

  return {
    cuotaMensual,
    totalIntereses,
    totalPagado,
    comisionAperturaImporte,
    totalSeguros,
    costeTotal,
    taeCalculada,
    desglose,
  };
}

/**
 * Calculate TAE using Newton-Raphson iteration.
 *
 * Finds the annual rate i such that:
 *   netCapital = sum_{k=1}^{n} payment / (1 + i_monthly)^k
 * where netCapital = capital - commission (money actually received)
 * and payment = cuota + seguro (total monthly outflow)
 */
function calcularTAE(
  capital: number,
  comision: number,
  cuota: number,
  seguro: number,
  plazoMeses: number
): number {
  const pagoMensual = cuota + seguro;
  const capitalNeto = capital - comision; // what borrower actually receives

  // Edge case: no costs beyond principal
  if (pagoMensual <= 0 || capitalNeto <= 0 || plazoMeses <= 0) return 0;

  // Initial guess: TIN equivalent
  let taeAnual = (pagoMensual * plazoMeses / capitalNeto - 1) / (plazoMeses / 12);
  if (taeAnual <= 0) taeAnual = 0.05;

  const MAX_ITER = 100;
  const TOLERANCE = 1e-10;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const im = Math.pow(1 + taeAnual, 1 / 12) - 1; // monthly effective rate
    if (im <= -1) {
      taeAnual = 0.05;
      continue;
    }

    // f(i) = capitalNeto - sum of pagoMensual / (1+im)^k
    let npv = -capitalNeto;
    let dnpv = 0; // derivative with respect to taeAnual

    const dimDtae = Math.pow(1 + taeAnual, 1 / 12 - 1) / 12; // d(im)/d(taeAnual)

    for (let k = 1; k <= plazoMeses; k++) {
      const discount = Math.pow(1 + im, k);
      npv += pagoMensual / discount;
      // d/dtae [ pago / (1+im)^k ] = -k * pago * dimDtae / (1+im)^(k+1)
      dnpv += -k * pagoMensual * dimDtae / Math.pow(1 + im, k + 1);
    }

    if (Math.abs(dnpv) < 1e-20) break;

    const step = npv / dnpv;
    taeAnual = taeAnual - step;

    // Prevent negative rates
    if (taeAnual < 0) taeAnual = 0;

    if (Math.abs(step) < TOLERANCE) break;
  }

  return round2(taeAnual * 100);
}

/**
 * Compare two personal loan offers side by side.
 *
 * @param input1 - First loan offer
 * @param input2 - Second loan offer
 * @returns Both results, which is cheaper, and the savings amount
 */
export function compararPrestamos(
  input1: PrestamoPersonalInput,
  input2: PrestamoPersonalInput
): ComparacionPrestamos {
  const prestamo1 = calcularPrestamoPersonal(input1);
  const prestamo2 = calcularPrestamoPersonal(input2);

  const mejorOpcion: 1 | 2 = prestamo1.costeTotal <= prestamo2.costeTotal ? 1 : 2;
  const ahorro = round2(Math.abs(prestamo1.costeTotal - prestamo2.costeTotal));

  return { prestamo1, prestamo2, mejorOpcion, ahorro };
}
