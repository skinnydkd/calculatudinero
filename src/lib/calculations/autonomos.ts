/**
 * Calculation engine for the autónomos (self-employed) billing calculator.
 *
 * Determines how much a freelancer needs to invoice monthly to achieve
 * a desired net income, accounting for SS contributions, IRPF, IVA,
 * and business expenses.
 *
 * All functions are PURE — data is passed as parameters, no side effects.
 */

import { round2 } from '../formatters';
import type {
  AutonomoInput,
  AutonomoResult,
  AutonomosData,
  ComunidadAutonoma,
  IRPFData,
  TramoIRPF,
} from '../types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Calculate progressive tax for a set of brackets.
 * @param base - Taxable base (already reduced by mínimo personal)
 * @param tramos - Tax brackets array
 * @returns Total tax amount
 */
function calcularCuotaPorTramos(base: number, tramos: TramoIRPF[]): number {
  if (base <= 0) return 0;

  let cuota = 0;
  let restante = base;

  for (const tramo of tramos) {
    if (restante <= 0) break;

    const limiteTramo = tramo.hasta !== null ? tramo.hasta - tramo.desde : Infinity;
    const baseEnTramo = Math.min(restante, limiteTramo);

    cuota += baseEnTramo * (tramo.tipo / 100);
    restante -= baseEnTramo;
  }

  return cuota;
}

/** Check if a CCAA has foral tax regime */
function esForalCcaa(ccaa: ComunidadAutonoma): boolean {
  return ccaa === 'navarra' || ccaa === 'pais-vasco';
}

/**
 * Calculate annual IRPF for self-employed income.
 * @param rendimientosNetos - Annual net income (after deductible expenses)
 * @param ccaa - Autonomous community
 * @param irpfData - IRPF bracket data
 * @returns Annual IRPF amount
 */
function calcularIRPFAutonomo(
  rendimientosNetos: number,
  ccaa: ComunidadAutonoma,
  irpfData: IRPFData
): number {
  const baseImponible = Math.max(0, rendimientosNetos - irpfData.minimoPersonal);

  if (baseImponible <= 0) return 0;

  const ccaaData = irpfData.tramosAutonomicos[ccaa];

  if (ccaaData && ccaaData.regimenForal) {
    // Foral regimes (Navarra, País Vasco): single unified scale
    return round2(calcularCuotaPorTramos(baseImponible, ccaaData.tramos));
  }

  // Common regime: state half + regional half, both applied to full base
  const cuotaEstatal = calcularCuotaPorTramos(baseImponible, irpfData.tramosEstatales);

  const tramosAutonomicos = ccaaData?.tramos ?? irpfData.tramosEstatales;
  const cuotaAutonomica = calcularCuotaPorTramos(baseImponible, tramosAutonomicos);

  return round2(cuotaEstatal + cuotaAutonomica);
}

/**
 * Find the SS quota for an established autónomo based on monthly net income.
 * Matches the rendimientos netos mensuales against the tramos table.
 * @param rendimientosMensuales - Monthly net income for bracket lookup
 * @param autonomosData - Autónomos tramos data
 * @returns Monthly SS quota (cuotaMinima of matching tramo)
 */
function buscarCuotaSS(
  rendimientosMensuales: number,
  autonomosData: AutonomosData
): number {
  const tramos = autonomosData.tramos;

  // Find matching tramo
  for (const tramo of tramos) {
    const max = tramo.rendimientosMax ?? Infinity;
    if (rendimientosMensuales >= tramo.rendimientosMin && rendimientosMensuales <= max) {
      return tramo.cuotaMinima;
    }
  }

  // Fallback: if above all tramos, return the last one
  return tramos[tramos.length - 1].cuotaMinima;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Calculate the monthly billing needed for a self-employed worker to achieve
 * a desired net income.
 *
 * @param input - Calculator inputs (desired net, situation, CCAA, expenses)
 * @param autonomosData - SS tramos and tarifa plana data
 * @param irpfData - IRPF brackets and mínimo personal
 * @returns Full breakdown of billing, taxes, and ratios
 */
export function calcularFacturacionAutonomo(
  input: AutonomoInput,
  autonomosData: AutonomosData,
  irpfData: IRPFData
): AutonomoResult {
  const { ingresoNetoDeseado, situacion, ccaa, gastosNegocio } = input;

  // Step 1: Determine SS quota
  let cuotaSS: number;

  if (situacion === 'nuevo') {
    // Tarifa plana for new autónomos
    cuotaSS = autonomosData.tarifaPlana.cuotaMensual;
  } else {
    // Iterative convergence: SS quota depends on rendimientos netos,
    // which depend on billing, which depends on SS quota
    cuotaSS = autonomosData.tramos[0].cuotaMinima; // initial estimate

    for (let i = 0; i < 10; i++) {
      // Rendimientos netos mensuales = what the autónomo earns after SS and expenses
      // but before IRPF. For tramo lookup, it's: billing_sin_iva - gastos - cuotaSS
      // which equals ingresoNeto + IRPF_mensual (approximately)
      // Simplified: start from the income side
      const rendimientosMensuales = ingresoNetoDeseado + gastosNegocio + cuotaSS;
      const nuevaCuota = buscarCuotaSS(rendimientosMensuales, autonomosData);

      if (nuevaCuota === cuotaSS) break;
      cuotaSS = nuevaCuota;
    }
  }

  // Step 2: Calculate annual rendimientos netos
  // Rendimientos netos = total income before IRPF = net + SS + expenses (all annualized)
  const facturacionMensualEstimadaSinIVA = ingresoNetoDeseado + gastosNegocio + cuotaSS;
  const rendimientosNetosAnuales = (facturacionMensualEstimadaSinIVA - gastosNegocio) * 12;
  // rendimientos netos = ingresos - gastos deducibles (gastos de negocio + cuota SS)
  // Actually: rendimientos netos = facturación sin IVA - gastos deducibles
  // gastos deducibles include cuota SS and gastos de negocio
  const rendimientosNetosParaIRPF = (ingresoNetoDeseado + cuotaSS) * 12;
  // Wait — rendimientos netos = ingresos totales - gastos deducibles
  // ingresos totales (sin IVA) = neto + SS + IRPF + gastos
  // gastos deducibles = gastos de negocio + cuota SS
  // rendimientos netos = (neto + SS + IRPF + gastos) - (gastos + SS) = neto + IRPF
  // But we don't know IRPF yet. We need to iterate.

  // Better approach: iterate to find the correct IRPF
  // facturación sin IVA = neto + SS + IRPF/12 + gastos
  // rendimientos netos = facturación sin IVA - gastos deducibles (gastos + SS)
  //                    = neto + IRPF/12
  // So rendimientos netos anuales = (neto * 12) + IRPF_anual

  // Iterate: start with an estimate of IRPF
  let irpfAnual = 0;

  for (let i = 0; i < 10; i++) {
    const rendimientosNetos = (ingresoNetoDeseado * 12) + irpfAnual;
    const nuevoIrpf = calcularIRPFAutonomo(rendimientosNetos, ccaa, irpfData);

    if (Math.abs(nuevoIrpf - irpfAnual) < 0.01) break;
    irpfAnual = nuevoIrpf;
  }

  // Also re-converge SS with the now-known full rendimientos
  if (situacion === 'establecido') {
    const rendimientosFinales = (ingresoNetoDeseado * 12 + irpfAnual) / 12;
    const cuotaFinal = buscarCuotaSS(rendimientosFinales, autonomosData);
    if (cuotaFinal !== cuotaSS) {
      cuotaSS = cuotaFinal;
      // Re-calculate IRPF with updated SS (one more pass)
      for (let i = 0; i < 10; i++) {
        const rendimientosNetos = (ingresoNetoDeseado * 12) + irpfAnual;
        const nuevoIrpf = calcularIRPFAutonomo(rendimientosNetos, ccaa, irpfData);
        if (Math.abs(nuevoIrpf - irpfAnual) < 0.01) break;
        irpfAnual = nuevoIrpf;
      }
    }
  }

  const irpfMensual = round2(irpfAnual / 12);

  // Step 3: Calculate billing
  // facturación sin IVA = neto deseado + cuota SS + IRPF mensual + gastos
  const facturacionMensualSinIVA = round2(
    ingresoNetoDeseado + cuotaSS + irpfMensual + gastosNegocio
  );

  // IVA at 21% on top
  const ivaMensual = round2(facturacionMensualSinIVA * 0.21);
  const facturacionMensualBruta = round2(facturacionMensualSinIVA + ivaMensual);
  const facturacionAnualBruta = round2(facturacionMensualBruta * 12);

  // Step 4: Effective rates
  const tipoIRPFEfectivo = facturacionMensualSinIVA > 0
    ? round2((irpfAnual / (facturacionMensualSinIVA * 12 - gastosNegocio * 12)) * 100)
    : 0;

  const ratioNetoFacturacion = facturacionMensualBruta > 0
    ? round2((ingresoNetoDeseado / facturacionMensualBruta) * 100) / 100
    : 0;

  return {
    facturacionMensualBruta,
    facturacionMensualSinIVA,
    facturacionAnualBruta,
    desglose: {
      ingresoNeto: ingresoNetoDeseado,
      cuotaSS,
      retencionIRPFMensual: irpfMensual,
      ivaMensual,
      gastos: gastosNegocio,
    },
    tipoIRPFEfectivo,
    ratioNetoFacturacion,
  };
}
