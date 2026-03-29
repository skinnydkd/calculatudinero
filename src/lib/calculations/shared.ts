/**
 * Shared calculation utilities used across multiple calculators.
 * Extracted from autonomos.ts and laboral.ts to avoid duplication.
 *
 * All functions are PURE — no side effects.
 */

import type { ComunidadAutonoma, TramoIRPF } from '../types';

/**
 * Calculate progressive tax for a set of brackets.
 * @param base - Taxable base (already reduced by mínimo personal)
 * @param tramos - Tax brackets array
 * @returns Total tax amount
 */
export function calcularCuotaPorTramos(base: number, tramos: TramoIRPF[]): number {
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

/** Check if a CCAA has foral tax regime (Navarra, País Vasco) */
export function esForalCcaa(ccaa: ComunidadAutonoma): boolean {
  return ccaa === 'navarra' || ccaa === 'pais-vasco';
}
