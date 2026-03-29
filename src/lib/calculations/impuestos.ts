/**
 * Calculation engine for the IRPF (Impuesto sobre la Renta) calculator.
 *
 * Calculates the annual IRPF tax bill for both employees and self-employed
 * workers, applying state + regional brackets (common regime) or a single
 * unified scale (foral regimes: Navarra, País Vasco).
 *
 * All functions are PURE — data is passed as parameters, no side effects.
 */

import { round2 } from '../formatters';
import { calcularCuotaPorTramos, esForalCcaa } from './shared';
import type {
  ComunidadAutonoma,
  IRPFData,
  IRPFInput,
  IRPFResult,
  IVAData,
  IVAInput,
  IVAResult,
  TramoIRPF,
} from '../types';

/**
 * Calculate the reducción por rendimientos del trabajo.
 * Only applies to employees (not autónomos).
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
 * Build a human-readable breakdown of each bracket's contribution.
 */
function buildDesgloseTramos(
  base: number,
  tramos: TramoIRPF[],
  label: string
): IRPFResult['desgloseTramos'] {
  const desglose: IRPFResult['desgloseTramos'] = [];
  let restante = base;

  for (const tramo of tramos) {
    if (restante <= 0) break;

    const limiteTramo = tramo.hasta !== null ? tramo.hasta - tramo.desde : Infinity;
    const baseEnTramo = Math.min(restante, limiteTramo);
    const cuota = baseEnTramo * (tramo.tipo / 100);

    const hastaLabel = tramo.hasta !== null
      ? tramo.hasta.toLocaleString('es-ES')
      : 'en adelante';

    desglose.push({
      tramo: `${label}: ${tramo.desde.toLocaleString('es-ES')} - ${hastaLabel} €`,
      base: round2(baseEnTramo),
      tipo: tramo.tipo,
      cuota: round2(cuota),
    });

    restante -= baseEnTramo;
  }

  return desglose;
}

/**
 * Calculate the full IRPF tax for an individual.
 *
 * @param input - Calculator inputs (income, CCAA, family situation, etc.)
 * @param irpfData - IRPF bracket data from irpf-2026.json
 * @returns Full IRPF breakdown
 */
export function calcularIRPF(input: IRPFInput, irpfData: IRPFData): IRPFResult {
  const {
    rendimientosBrutos,
    ccaa,
    hijosCount,
    mayor65,
    mayor75,
    esAutonomo,
    gastoDeducible,
    cotizacionSS,
  } = input;

  // Step 1: Calculate rendimientos netos
  let rendimientosNetos: number;
  if (esAutonomo) {
    // Autónomo: ingresos - gastos deducibles
    rendimientosNetos = rendimientosBrutos - gastoDeducible;
  } else {
    // Empleado: bruto - cotización SS
    rendimientosNetos = rendimientosBrutos - cotizacionSS;
  }
  rendimientosNetos = Math.max(0, rendimientosNetos);

  // Step 2: Apply reducción por rendimientos del trabajo (only employees)
  let reduccionTrabajo = 0;
  if (!esAutonomo) {
    reduccionTrabajo = calcularReduccionTrabajo(
      rendimientosNetos,
      irpfData.reduccionRendimientosTrabajo
    );
  }

  // Step 3: Base liquidable
  const baseLiquidable = Math.max(0, rendimientosNetos - reduccionTrabajo);

  // Step 4: Mínimo personal y familiar
  let minimoPersonal = irpfData.minimoPersonal;
  if (mayor75) {
    minimoPersonal = irpfData.minimoPersonalMayores75;
  } else if (mayor65) {
    minimoPersonal = irpfData.minimoPersonalMayores65;
  }

  const minimoDescendientes = calcularMinimoDescendientes(hijosCount, irpfData.minimoDescendientes);
  const minimoTotal = minimoPersonal + minimoDescendientes;

  // Step 5: Calculate cuota by brackets
  const ccaaData = irpfData.tramosAutonomicos[ccaa];
  const esForal = ccaaData?.regimenForal === true;

  let cuotaEstatal = 0;
  let cuotaAutonomica = 0;
  let desgloseTramos: IRPFResult['desgloseTramos'] = [];

  if (esForal) {
    // Foral regime (Navarra, País Vasco): single unified scale
    const cuotaIntegraBruta = calcularCuotaPorTramos(baseLiquidable, ccaaData.tramos);
    const cuotaMinimo = calcularCuotaPorTramos(minimoTotal, ccaaData.tramos);
    const cuotaForal = Math.max(0, cuotaIntegraBruta - cuotaMinimo);

    // For foral, we assign the full amount as "autonómica" (no state portion)
    cuotaEstatal = 0;
    cuotaAutonomica = round2(cuotaForal);

    desgloseTramos = buildDesgloseTramos(baseLiquidable, ccaaData.tramos, 'Foral');
  } else {
    // Common regime: state + regional
    const cuotaEstatalBruta = calcularCuotaPorTramos(baseLiquidable, irpfData.tramosEstatales);
    const cuotaMinimoEstatal = calcularCuotaPorTramos(minimoTotal, irpfData.tramosEstatales);
    cuotaEstatal = round2(Math.max(0, cuotaEstatalBruta - cuotaMinimoEstatal));

    const tramosAutonomicos = ccaaData?.tramos ?? irpfData.tramosEstatales;
    const cuotaAutonomicaBruta = calcularCuotaPorTramos(baseLiquidable, tramosAutonomicos);
    const cuotaMinimoAutonomica = calcularCuotaPorTramos(minimoTotal, tramosAutonomicos);
    cuotaAutonomica = round2(Math.max(0, cuotaAutonomicaBruta - cuotaMinimoAutonomica));

    // Apply Ceuta/Melilla deduction if applicable
    if (ccaaData?.deduccionResidentes) {
      cuotaAutonomica = round2(cuotaAutonomica * (1 - ccaaData.deduccionResidentes / 100));
    }

    const desgloseEstatal = buildDesgloseTramos(baseLiquidable, irpfData.tramosEstatales, 'Estatal');
    const desgloseAutonomico = buildDesgloseTramos(baseLiquidable, tramosAutonomicos, 'Autonómico');
    desgloseTramos = [...desgloseEstatal, ...desgloseAutonomico];
  }

  const cuotaIntegra = round2(cuotaEstatal + cuotaAutonomica);

  // Step 6: Effective rate
  const tipoEfectivo = rendimientosBrutos > 0
    ? round2((cuotaIntegra / rendimientosBrutos) * 100)
    : 0;

  return {
    cuotaIntegra,
    cuotaEstatal,
    cuotaAutonomica,
    tipoEfectivo,
    baseLiquidable: round2(baseLiquidable),
    minimoPersonalFamiliar: round2(minimoTotal),
    reduccionTrabajo: round2(reduccionTrabajo),
    rendimientosNetos: round2(rendimientosNetos),
    desgloseTramos,
  };
}

// ---------------------------------------------------------------------------
// IVA / IGIC / IPSI calculator
// ---------------------------------------------------------------------------

/**
 * Map an IVA tier name to the equivalent IGIC tier rate.
 * - general → IGIC general (7%)
 * - reducido → IGIC reducido (3%)
 * - superreducido → IGIC cero (0%)
 */
function igicRate(tipoIVA: IVAInput['tipoIVA'], igicTipos: Record<string, number>): number {
  const map: Record<IVAInput['tipoIVA'], string> = {
    general: 'general',
    reducido: 'reducido',
    superreducido: 'cero',
  };
  return igicTipos[map[tipoIVA]] ?? igicTipos['general'];
}

/**
 * Map an IVA tier name to the equivalent IPSI tier rate.
 * - general → IPSI general (10%)
 * - reducido → IPSI reducido (4%)
 * - superreducido → IPSI mínimo (0.5%)
 */
function ipsiRate(tipoIVA: IVAInput['tipoIVA'], ipsiTipos: Record<string, number>): number {
  const map: Record<IVAInput['tipoIVA'], string> = {
    general: 'general',
    reducido: 'reducido',
    superreducido: 'minimo',
  };
  return ipsiTipos[map[tipoIVA]] ?? ipsiTipos['general'];
}

/**
 * Calculate IVA (or IGIC / IPSI) for a given amount.
 *
 * Supports bidirectional calculation (base → total or total → base),
 * optional recargo de equivalencia (only for mainland IVA, not IGIC/IPSI),
 * and automatic detection of special regimes based on CCAA.
 *
 * @param input - Calculator inputs
 * @param ivaData - IVA rate data from iva-2026.json
 * @returns Full IVA breakdown
 */
export function calcularIVA(input: IVAInput, ivaData: IVAData): IVAResult {
  const { importe, tipoIVA, direccion, incluyeRecargo, ccaa } = input;

  // Step 1: Determine which tax applies based on CCAA
  let tipoAplicado: number;
  let impuestoNombre: string;
  let esRegimenEspecial = false;

  const isCanarias = ccaa === 'canarias';
  const isCeutaMelilla = ccaa === 'ceuta' || ccaa === 'melilla';

  if (isCanarias) {
    tipoAplicado = igicRate(tipoIVA, ivaData.regimenesEspeciales.igic.tipos);
    impuestoNombre = 'IGIC';
    esRegimenEspecial = true;
  } else if (isCeutaMelilla) {
    tipoAplicado = ipsiRate(tipoIVA, ivaData.regimenesEspeciales.ipsi.tipos);
    impuestoNombre = 'IPSI';
    esRegimenEspecial = true;
  } else {
    tipoAplicado = ivaData.tiposIVA[tipoIVA].tipo;
    impuestoNombre = 'IVA';
  }

  // Step 2: Calculate base and cuota depending on direction
  let base: number;
  let cuotaIVA: number;
  let total: number;

  if (direccion === 'base_a_total') {
    base = importe;
    cuotaIVA = round2(base * tipoAplicado / 100);
    total = round2(base + cuotaIVA);
  } else {
    // total_a_base: extract base from total that includes tax
    base = round2(importe / (1 + tipoAplicado / 100));
    cuotaIVA = round2(importe - base);
    total = round2(importe);
  }

  // Step 3: Recargo de equivalencia (only for mainland IVA, not IGIC/IPSI)
  let recargoEquivalencia = 0;
  let totalConRecargo = total;

  if (incluyeRecargo && !esRegimenEspecial) {
    const tipoRecargo = ivaData.recargo[tipoIVA];
    recargoEquivalencia = round2(base * tipoRecargo / 100);
    totalConRecargo = round2(total + recargoEquivalencia);
  }

  return {
    base,
    cuotaIVA,
    tipoAplicado,
    total,
    recargoEquivalencia,
    totalConRecargo,
    impuestoNombre,
    esRegimenEspecial,
  };
}
