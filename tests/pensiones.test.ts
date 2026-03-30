import { describe, it, expect } from 'vitest';
import { calcularPension } from '@lib/calculations/pensiones';
import pensionesData from '@data/pensiones-2026.json';

describe('calcularPension', () => {
  it('calculates ~96% for 35 years cotizados', () => {
    const result = calcularPension({
      baseCotizacionMedia: 2500,
      aniosCotizados: 35,
      edadJubilacion: 65,
      tieneConyuge: false,
      hijosCount: 0,
      esAnticipada: false,
      anticipadaVoluntaria: false,
    }, pensionesData as any);

    // 50% + (20*12=240 months * 0.19%) + remaining months * 0.18%
    expect(result.porcentajePorAnios).toBeGreaterThan(90);
    expect(result.porcentajePorAnios).toBeLessThanOrEqual(100);
    expect(result.pensionBrutaMensual).toBeGreaterThan(2000);
    expect(result.pensionBrutaMensual).toBeLessThan(2500);
  });

  it('returns 50% for minimum 15 years', () => {
    const result = calcularPension({
      baseCotizacionMedia: 2000,
      aniosCotizados: 15,
      edadJubilacion: 67,
      tieneConyuge: false,
      hijosCount: 0,
      esAnticipada: false,
      anticipadaVoluntaria: false,
    }, pensionesData as any);

    expect(result.porcentajePorAnios).toBe(50);
    expect(result.pensionBrutaMensual).toBeCloseTo(1000, -1);
  });

  it('returns 100% for 37+ years', () => {
    const result = calcularPension({
      baseCotizacionMedia: 2500,
      aniosCotizados: 38,
      edadJubilacion: 65,
      tieneConyuge: false,
      hijosCount: 0,
      esAnticipada: false,
      anticipadaVoluntaria: false,
    }, pensionesData as any);

    expect(result.porcentajePorAnios).toBe(100);
    expect(result.pensionBrutaMensual).toBeCloseTo(2500, -1);
  });

  it('caps at maximum pension', () => {
    const result = calcularPension({
      baseCotizacionMedia: 4500,
      aniosCotizados: 40,
      edadJubilacion: 65,
      tieneConyuge: false,
      hijosCount: 0,
      esAnticipada: false,
      anticipadaVoluntaria: false,
    }, pensionesData as any);

    expect(result.pensionMaximaAplicada).toBe(true);
    expect(result.pensionBrutaMensual).toBe(pensionesData.topesYMinimos.pensionMaxima2026);
  });

  it('applies minimum pension with conyuge', () => {
    const result = calcularPension({
      baseCotizacionMedia: 700,
      aniosCotizados: 15,
      edadJubilacion: 67,
      tieneConyuge: true,
      hijosCount: 0,
      esAnticipada: false,
      anticipadaVoluntaria: false,
    }, pensionesData as any);

    // 50% of 700 = 350, below minimum 1054 with conyuge
    expect(result.pensionMinimaAplicada).toBe(true);
    expect(result.pensionBrutaMensual).toBe(pensionesData.topesYMinimos.pensionMinima65ConConyuge);
  });

  it('applies early retirement reduction', () => {
    const normal = calcularPension({
      baseCotizacionMedia: 2500,
      aniosCotizados: 38,
      edadJubilacion: 65,
      tieneConyuge: false,
      hijosCount: 0,
      esAnticipada: false,
      anticipadaVoluntaria: false,
    }, pensionesData as any);

    const anticipada = calcularPension({
      baseCotizacionMedia: 2500,
      aniosCotizados: 38,
      edadJubilacion: 63,
      tieneConyuge: false,
      hijosCount: 0,
      esAnticipada: true,
      anticipadaVoluntaria: true,
    }, pensionesData as any);

    expect(anticipada.reduccionAnticipada).toBeGreaterThan(0);
    expect(anticipada.pensionBrutaMensual).toBeLessThan(normal.pensionBrutaMensual);
  });

  it('adds complemento brecha per child', () => {
    const sinHijos = calcularPension({
      baseCotizacionMedia: 2000,
      aniosCotizados: 30,
      edadJubilacion: 66,
      tieneConyuge: false,
      hijosCount: 0,
      esAnticipada: false,
      anticipadaVoluntaria: false,
    }, pensionesData as any);

    const conHijos = calcularPension({
      baseCotizacionMedia: 2000,
      aniosCotizados: 30,
      edadJubilacion: 66,
      tieneConyuge: false,
      hijosCount: 2,
      esAnticipada: false,
      anticipadaVoluntaria: false,
    }, pensionesData as any);

    expect(conHijos.complementoBrecha).toBeCloseTo(33.20 * 2, 1);
    expect(conHijos.pensionBrutaMensual).toBeGreaterThan(sinHijos.pensionBrutaMensual);
  });
});
