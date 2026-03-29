/**
 * Shared TypeScript types for all calculatudinero calculators.
 */

// ---------------------------------------------------------------------------
// Comunidades Autónomas
// ---------------------------------------------------------------------------

export type ComunidadAutonoma =
  | 'andalucia'
  | 'aragon'
  | 'asturias'
  | 'baleares'
  | 'canarias'
  | 'cantabria'
  | 'castilla-leon'
  | 'castilla-mancha'
  | 'cataluna'
  | 'ceuta'
  | 'extremadura'
  | 'galicia'
  | 'madrid'
  | 'melilla'
  | 'murcia'
  | 'navarra'
  | 'pais-vasco'
  | 'rioja'
  | 'valencia';

export interface CcaaOption {
  value: ComunidadAutonoma;
  label: string;
}

/** All 19 CCAA sorted alphabetically by label */
export const CCAA_OPTIONS: CcaaOption[] = [
  { value: 'andalucia', label: 'Andalucía' },
  { value: 'aragon', label: 'Aragón' },
  { value: 'canarias', label: 'Canarias' },
  { value: 'cantabria', label: 'Cantabria' },
  { value: 'castilla-mancha', label: 'Castilla-La Mancha' },
  { value: 'castilla-leon', label: 'Castilla y León' },
  { value: 'cataluna', label: 'Cataluña' },
  { value: 'ceuta', label: 'Ceuta' },
  { value: 'valencia', label: 'Comunitat Valenciana' },
  { value: 'extremadura', label: 'Extremadura' },
  { value: 'galicia', label: 'Galicia' },
  { value: 'baleares', label: 'Islas Baleares' },
  { value: 'rioja', label: 'La Rioja' },
  { value: 'madrid', label: 'Madrid' },
  { value: 'melilla', label: 'Melilla' },
  { value: 'murcia', label: 'Murcia' },
  { value: 'navarra', label: 'Navarra' },
  { value: 'pais-vasco', label: 'País Vasco' },
  { value: 'asturias', label: 'Principado de Asturias' },
];

// ---------------------------------------------------------------------------
// IRPF data structures (matching irpf-2026.json)
// ---------------------------------------------------------------------------

export interface TramoIRPF {
  desde: number;
  hasta: number | null;
  tipo: number;
}

export interface CcaaIRPFData {
  nombre: string;
  nota?: string;
  regimenForal?: boolean;
  tramos: TramoIRPF[];
  deduccionResidentes?: number;
}

export interface ReduccionRendimientosTrabajo {
  desde: number;
  hasta: number;
  reduccion?: number;
  formula?: string;
  tipo: 'fija' | 'variable';
}

export interface IRPFData {
  tramosEstatales: TramoIRPF[];
  tramosAutonomicos: Record<string, CcaaIRPFData>;
  minimoPersonal: number;
  minimoPersonalMayores65: number;
  minimoPersonalMayores75: number;
  reduccionRendimientosTrabajo: ReduccionRendimientosTrabajo[];
  minimoDescendientes: {
    primero: number;
    segundo: number;
    tercero: number;
    cuarto_y_sucesivos: number;
    menor_3_anios_adicional: number;
  };
  minimoAscendientes: {
    mayor65: number;
    mayor75: number;
  };
}

// ---------------------------------------------------------------------------
// Autónomos data structures (matching autonomos-2026.json)
// ---------------------------------------------------------------------------

export interface TramoAutonomo {
  tramoId: number;
  tabla: 'reducida' | 'general';
  rendimientosMin: number;
  rendimientosMax: number | null;
  baseMinima: number;
  baseMaxima: number;
  cuotaMinima: number;
}

export interface TarifaPlana {
  cuotaMensual: number;
  duracionMeses: number;
}

export interface AutonomosData {
  tramos: TramoAutonomo[];
  tiposCotizacion: {
    contingenciasComunes: number;
    contingenciasProfesionales: number;
    ceseProfesional: number;
    formacionProfesional: number;
    mei: number;
    total: number;
  };
  tarifaPlana: TarifaPlana;
}

// ---------------------------------------------------------------------------
// Seguridad Social data structures (matching seguridad-social-2026.json)
// ---------------------------------------------------------------------------

export interface GrupoCotizacion {
  grupo: number;
  categoria: string;
  baseMinima: number;
  baseMaxima: number;
  periodicidad: 'mensual' | 'diaria';
}

export interface SeguridadSocialData {
  cotizacionTrabajador: {
    contingenciasComunes: number;
    desempleoIndefinido: number;
    desempleoTemporal: number;
    formacionProfesional: number;
    mei: number;
    fogasa: number;
  };
  cotizacionEmpresa: {
    contingenciasComunes: number;
    desempleoIndefinido: number;
    desempleoTemporal: number;
    formacionProfesional: number;
    mei: number;
    fogasa: number;
    accidentesTrabajoMin: number;
    accidentesTrabajoMax: number;
  };
  basesCotizacion2026: {
    baseMinima: number;
    baseMaxima: number;
    gruposCotizacion: GrupoCotizacion[];
  };
  smi2026: {
    mensual14pagas: number;
    mensual12pagas: number;
    anual: number;
    diario: number;
  };
}

// ---------------------------------------------------------------------------
// Indemnización data structures (matching indemnizacion-rules.json)
// ---------------------------------------------------------------------------

export interface TipoDespidoData {
  nombre: string;
  diasPorAnio: number;
  maximoMensualidades: number | null;
  maximoDiasSalario?: number;
  nota?: string;
  pre2012?: {
    fechaCorte: string;
    diasPorAnio: number;
    maximoMensualidades: number;
    maximoDiasSalario: number;
    nota: string;
  };
}

export interface IndemnizacionData {
  tiposDespido: Record<string, TipoDespidoData>;
  exencionIRPF: {
    maximo: number;
  };
}

// ---------------------------------------------------------------------------
// Calculator: Autónomos
// ---------------------------------------------------------------------------

export interface AutonomoInput {
  /** Desired monthly net income */
  ingresoNetoDeseado: number;
  /** Employment situation */
  situacion: 'nuevo' | 'establecido';
  /** Autonomous community */
  ccaa: ComunidadAutonoma;
  /** Monthly business expenses */
  gastosNegocio: number;
}

export interface AutonomoResult {
  /** Monthly billing including IVA */
  facturacionMensualBruta: number;
  /** Monthly billing without IVA */
  facturacionMensualSinIVA: number;
  /** Annual billing including IVA */
  facturacionAnualBruta: number;
  desglose: {
    ingresoNeto: number;
    cuotaSS: number;
    retencionIRPFMensual: number;
    ivaMensual: number;
    gastos: number;
  };
  /** Effective IRPF rate as percentage */
  tipoIRPFEfectivo: number;
  /** Net-to-gross ratio */
  ratioNetoFacturacion: number;
}

// ---------------------------------------------------------------------------
// Calculator: Salario Neto
// ---------------------------------------------------------------------------

export interface SalarioInput {
  salarioBrutoAnual: number;
  numeroPagas: 12 | 14;
  ccaa: ComunidadAutonoma;
  situacionPersonal: {
    estado: 'soltero' | 'casado';
    hijosCount: number;
    discapacidad: boolean;
  };
  tipoContrato: 'indefinido' | 'temporal';
  grupoCotizacion: number;
}

export interface SalarioResult {
  salarioNetoAnual: number;
  salarioNetoMensual: number;
  desglose: {
    brutoMensual: number;
    brutoAnual: number;
    ssTotal: number;
    ssDesglose: {
      contingenciasComunes: number;
      desempleo: number;
      formacion: number;
      mei: number;
    };
    irpfAnual: number;
    irpfMensual: number;
    tipoRetencion: number;
  };
  costeTotalEmpresa: number;
}

// ---------------------------------------------------------------------------
// Calculator: Indemnización
// ---------------------------------------------------------------------------

export interface IndemnizacionInput {
  fechaInicio: Date;
  fechaFin: Date;
  /** Daily salary including prorated extras */
  salarioBrutoDiario: number;
  tipoDespido: 'improcedente' | 'objetivo' | 'fin_temporal' | 'ere' | 'disciplinario';
  contratoPreFeb2012: boolean;
}

export interface IndemnizacionResult {
  indemnizacionTotal: number;
  antiguedadAnios: number;
  /** Human-readable seniority, e.g. "3 años y 7 meses" */
  antiguedadTexto: string;
  salarioDiario: number;
  diasCorrespondientes: number;
  maximoAplicado: boolean;
  /** True if amount <= 180,000€ */
  exentaIRPF: boolean;
  desglosePre2012?: {
    periodoAnterior: { anios: number; dias: number; importe: number };
    periodoPosterior: { anios: number; dias: number; importe: number };
  };
}

// ---------------------------------------------------------------------------
// Calculator: IRPF
// ---------------------------------------------------------------------------

export interface IRPFInput {
  rendimientosBrutos: number;
  ccaa: ComunidadAutonoma;
  hijosCount: number;
  mayor65: boolean;
  mayor75: boolean;
  situacion: 'soltero' | 'casado';
  discapacidad: boolean;
  esAutonomo: boolean;
  gastoDeducible: number;
  cotizacionSS: number;
}

export interface IRPFResult {
  cuotaIntegra: number;
  cuotaEstatal: number;
  cuotaAutonomica: number;
  tipoEfectivo: number;
  baseLiquidable: number;
  minimoPersonalFamiliar: number;
  reduccionTrabajo: number;
  rendimientosNetos: number;
  desgloseTramos: {
    tramo: string;
    base: number;
    tipo: number;
    cuota: number;
  }[];
}

// ---------------------------------------------------------------------------
// Calculator: Cuota Autónomos
// ---------------------------------------------------------------------------

export interface CuotaAutonomoInput {
  rendimientosNetosMensuales: number;
  situacion: 'nuevo' | 'establecido';
  basePersonalizada?: number;
}

export interface CuotaAutonomoResult {
  tramoAplicado: TramoAutonomo;
  cuotaMensual: number;
  cuotaAnual: number;
  baseElegida: number;
  esTarifaPlana: boolean;
  ahorroPorTarifaPlana: number;
  desgloseCotizacion: {
    contingenciasComunes: number;
    contingenciasProfesionales: number;
    ceseProfesional: number;
    formacionProfesional: number;
    mei: number;
  };
  tablaTramos: {
    tramoId: number;
    tabla: string;
    rango: string;
    cuotaMinima: number;
    esActual: boolean;
  }[];
}

// ---------------------------------------------------------------------------
// Finiquito data structures
// ---------------------------------------------------------------------------

export interface FiniquitoData {
  pagasExtra: {
    nota: string;
    mesesPorPaga: number;
  };
  vacaciones: {
    diasNaturalesAnuales: number;
    diasLaborablesAnuales: number;
    nota: string;
  };
  retencionIRPF: {
    nota: string;
    porDefecto: number;
  };
}

// ---------------------------------------------------------------------------
// Calculator: Finiquito
// ---------------------------------------------------------------------------

export interface FiniquitoInput {
  fechaBaja: Date;
  salarioBrutoAnual: number;
  pagasExtra: 12 | 14;
  pagasProrrateadas: boolean;
  diasVacacionesTotales: number;
  diasVacacionesDisfrutados: number;
  retencionIRPF: number;
}

export interface FiniquitoResult {
  diasTrabajadosMesBaja: number;
  importeDiasTrabajados: number;
  diasVacacionesPendientes: number;
  importeVacaciones: number;
  importeProrrataNavidad: number;
  importeProrrataVerano: number;
  totalProrratasPagas: number;
  totalBruto: number;
  retencionIRPFImporte: number;
  cotizacionSS: number;
  totalNeto: number;
  desglose: {
    concepto: string;
    bruto: number;
  }[];
}
