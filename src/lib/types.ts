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

// ---------------------------------------------------------------------------
// Hipoteca data structures (matching hipoteca-reference.json)
// ---------------------------------------------------------------------------

export interface HipotecaReferenceData {
  year: number;
  lastUpdated: string;
  source: string;
  euribor: {
    actual: number;
    fecha: string;
    nota: string;
  };
  tiposReferencia: {
    fijo: {
      min: number;
      max: number;
      media: number;
      nota: string;
    };
    variable: {
      diferencial: {
        min: number;
        max: number;
        media: number;
        nota: string;
      };
    };
  };
  plazoMaximo: number;
  plazoMinimo: number;
  porcentajeFinanciacionMax: {
    primeraVivienda: number;
    segundaVivienda: number;
  };
  gastosCompra: {
    notaria: { porcentaje: number; nota: string };
    registro: { porcentaje: number; nota: string };
    gestoria: { fijo: number; nota: string };
    tasacion: { fijo: number; nota: string };
  };
}

export interface ITPCcaaData {
  nombre: string;
  tipo: number;
  reducido: number;
  notaReducido: string;
}

export interface ITPData {
  year: number;
  lastUpdated: string;
  source: string;
  nota: string;
  tipoIVAViviendaNueva: number;
  tipoAJD: number;
  tiposPorCcaa: Record<string, ITPCcaaData>;
}

// ---------------------------------------------------------------------------
// Calculator: Hipoteca
// ---------------------------------------------------------------------------

export interface HipotecaInput {
  precioVivienda: number;
  ahorroInicial: number;
  plazoAnios: number;
  tipoInteres: number;
  tipoHipoteca: 'fijo' | 'variable';
  diferencialVariable?: number;
  euriborActual?: number;
}

export interface AmortizacionAnual {
  anio: number;
  capitalPendiente: number;
  capitalAmortizado: number;
  interesesAnuales: number;
  cuotaAnual: number;
}

export interface HipotecaResult {
  capitalPrestamo: number;
  cuotaMensual: number;
  totalIntereses: number;
  totalPagado: number;
  porcentajeFinanciacion: number;
  cuadroAmortizacion: AmortizacionAnual[];
}

// ---------------------------------------------------------------------------
// Calculator: Gastos de compra vivienda
// ---------------------------------------------------------------------------

export interface GastosCompraInput {
  precioVivienda: number;
  ccaa: ComunidadAutonoma;
  esViviendaNueva: boolean;
  aplicaTipoReducido: boolean;
}

export interface GastosCompraResult {
  impuesto: number;
  impuestoNombre: string;
  impuestoTipo: number;
  notaria: number;
  registro: number;
  gestoria: number;
  tasacion: number;
  totalGastos: number;
  totalConPrecio: number;
}

// ---------------------------------------------------------------------------
// Calculator: Gastos de compra comparativa (todas las CCAA)
// ---------------------------------------------------------------------------

export interface GastosCompraComparativaItem {
  ccaa: ComunidadAutonoma;
  ccaaLabel: string;
  tipoImpuesto: number;
  impuesto: number;
  notaria: number;
  registro: number;
  gestoria: number;
  tasacion: number;
  totalGastos: number;
  totalConPrecio: number;
  ahorroMinimo: number; // 20% + gastos
}

export type GastosCompraComparativaResult = GastosCompraComparativaItem[];

// ---------------------------------------------------------------------------
// Desempleo data structures
// ---------------------------------------------------------------------------

export interface DesempleoData {
  iprem2026: {
    mensual: number;
    anual12pagas: number;
    anual14pagas: number;
  };
  prestacionContributiva: {
    porcentajePrimeros180Dias: number;
    porcentajeResto: number;
    topes: {
      sinHijos: { porcentajeIPREM: number; importe: number };
      unHijo: { porcentajeIPREM: number; importe: number };
      dosOMasHijos: { porcentajeIPREM: number; importe: number };
    };
    minimoSinHijos: { porcentajeIPREM: number; importe: number };
    minimoConHijos: { porcentajeIPREM: number; importe: number };
    duracionPorCotizacion: {
      diasCotizadosMin: number;
      diasCotizadosMax: number | null;
      mesesPrestacion: number;
    }[];
    cotizacionMinima: number;
  };
}

// ---------------------------------------------------------------------------
// Calculator: Prestación Desempleo
// ---------------------------------------------------------------------------

export interface DesempleoInput {
  baseCotizacionMedia: number;
  diasCotizados: number;
  hijosCount: number;
}

export interface DesempleoResult {
  tieneDerechoPrestacion: boolean;
  duracionMeses: number;
  importePrimeros180Dias: number;
  importeResto: number;
  importeMensualMedio: number;
  totalEstimado: number;
  topeAplicado: number;
  minimoAplicado: number;
  baseReguladora: number;
  desglose: {
    periodo: string;
    meses: number;
    importeMensual: number;
    subtotal: number;
  }[];
}

// ---------------------------------------------------------------------------
// IVA data structures
// ---------------------------------------------------------------------------

export interface IVAData {
  tiposIVA: {
    general: { tipo: number; descripcion: string; ejemplos: string };
    reducido: { tipo: number; descripcion: string; ejemplos: string };
    superreducido: { tipo: number; descripcion: string; ejemplos: string };
  };
  regimenesEspeciales: {
    igic: { nombre: string; tipos: Record<string, number>; aplica: string[] };
    ipsi: { nombre: string; tipos: Record<string, number>; aplica: string[] };
  };
  recargo: {
    general: number;
    reducido: number;
    superreducido: number;
  };
}

// ---------------------------------------------------------------------------
// Calculator: IVA
// ---------------------------------------------------------------------------

export interface IVAInput {
  importe: number;
  tipoIVA: 'general' | 'reducido' | 'superreducido';
  direccion: 'base_a_total' | 'total_a_base';
  incluyeRecargo: boolean;
  ccaa?: ComunidadAutonoma;
}

export interface IVAResult {
  base: number;
  cuotaIVA: number;
  tipoAplicado: number;
  total: number;
  recargoEquivalencia: number;
  totalConRecargo: number;
  impuestoNombre: string;
  esRegimenEspecial: boolean;
}

// ---------------------------------------------------------------------------
// Calculator: Interés Compuesto
// ---------------------------------------------------------------------------

export interface InteresCompuestoInput {
  capitalInicial: number;
  aportacionMensual: number;
  tasaAnual: number;
  plazoAnios: number;
  inflacionAnual: number;
}

export interface InteresCompuestoResult {
  capitalFinal: number;
  capitalFinalReal: number;
  totalAportado: number;
  totalIntereses: number;
  totalInteresesReales: number;
  evolucionAnual: {
    anio: number;
    capitalAcumulado: number;
    capitalAcumuladoReal: number;
    aportadoAcumulado: number;
    interesesAcumulados: number;
  }[];
}

// ---------------------------------------------------------------------------
// Pensión Jubilación
// ---------------------------------------------------------------------------

export interface PensionesData {
  edadJubilacionOrdinaria: {
    con37anios6meses: number;
    sinRequisito: number;
  };
  porcentajesPorAniosCotizados: {
    minimo15anios: number;
    primeros15anios: number;
    mesAdicional1a248: number;
    mesAdicional249a264: number;
    maximo: number;
    aniosParaMaximo: number;
  };
  baseReguladora: {
    mesesComputo: number;
    divisor: number;
  };
  topesYMinimos: {
    pensionMaxima2026: number;
    pensionMinima65ConConyuge: number;
    pensionMinima65SinConyuge: number;
  };
  complementoBrecha: {
    porHijo: number;
  };
}

export interface PensionInput {
  baseCotizacionMedia: number;
  aniosCotizados: number;
  edadJubilacion: number;
  tieneConyuge: boolean;
  hijosCount: number;
  esAnticipada: boolean;
  anticipadaVoluntaria: boolean;
}

export interface PensionResult {
  baseReguladora: number;
  porcentajePorAnios: number;
  pensionBrutaMensual: number;
  pensionBrutaAnual: number;
  pensionNeta14Pagas: number;
  complementoBrecha: number;
  reduccionAnticipada: number;
  pensionMaximaAplicada: boolean;
  pensionMinimaAplicada: boolean;
  edadOrdinaria: number;
}

// ---------------------------------------------------------------------------
// Plusvalía Municipal
// ---------------------------------------------------------------------------

export interface PlusvaliaData {
  tipoImpositivoMaximo: number;
  tipoImpositivoComun: number;
  coeficientesObjetivo: Record<string, number>;
  porcentajeSueloDefault: number;
}

export interface PlusvaliaInput {
  valorAdquisicion: number;
  valorTransmision: number;
  valorCatastral: number;
  porcentajeSuelo: number;
  aniosPropiedad: number;
  tipoImpositivo: number;
}

export interface PlusvaliaResult {
  metodoReal: {
    incrementoReal: number;
    porcentajeSobreAdquisicion: number;
    baseImponible: number;
    cuota: number;
  };
  metodoObjetivo: {
    coeficienteAplicado: number;
    baseImponible: number;
    cuota: number;
  };
  metodoElegido: 'real' | 'objetivo';
  cuotaFinal: number;
  hayIncrementoReal: boolean;
  valorCatastralSuelo: number;
}

// ---------------------------------------------------------------------------
// Impuesto Sucesiones
// ---------------------------------------------------------------------------

export interface SucesionesData {
  tramosEstatales: { desde: number; hasta: number | null; tipo: number }[];
  reduccionesGrupoII: { estatal: number };
  reduccionesGrupoI: { estatal: number; adicionalPorAnioMenor21: number; maximo: number };
  bonificacionesPorCcaa: Record<string, { nombre: string; bonificacion: number; nota: string }>;
}

export interface SucesionesInput {
  valorHerencia: number;
  ccaa: ComunidadAutonoma;
  parentesco: 'grupo_I' | 'grupo_II' | 'grupo_III' | 'grupo_IV';
  edadHeredero: number;
  patrimonioPreexistente: number;
}

export interface SucesionesResult {
  baseImponible: number;
  reduccionAplicada: number;
  baseLiquidable: number;
  cuotaIntegra: number;
  coeficienteMultiplicador: number;
  cuotaTributaria: number;
  bonificacionCcaa: number;
  bonificacionPorcentaje: number;
  cuotaFinal: number;
  notaCcaa: string;
}

// ---------------------------------------------------------------------------
// Calculator: Amortización Anticipada de Hipoteca
// ---------------------------------------------------------------------------

export interface AmortizacionAnticipadaInput {
  capitalPendiente: number;
  cuotaActual: number;
  tipoInteres: number; // annual %
  plazoRestanteMeses: number;
  cantidadAmortizar: number;
  modalidad: 'reducir_cuota' | 'reducir_plazo';
}

export interface AmortizacionAnticipadaComparativa {
  modalidad: string;
  nuevaCuota: number;
  nuevosPlazoMeses: number;
  ahorroIntereses: number;
}

export interface AmortizacionAnticipadaResult {
  nuevoCapital: number;
  // Reducir cuota
  nuevaCuota: number;
  ahorroCuotaMensual: number;
  ahorroTotalIntereses: number;
  // Reducir plazo
  nuevosPlazoMeses: number;
  mesesAhorrados: number;
  ahorroTotalInteresesPlazo: number;
  // Comparison
  mejorOpcion: 'reducir_cuota' | 'reducir_plazo';
  comparativa: AmortizacionAnticipadaComparativa[];
}

// ---------------------------------------------------------------------------
// Calculator: Rentabilidad del Alquiler
// ---------------------------------------------------------------------------

export interface RentabilidadAlquilerInput {
  precioCompra: number;
  gastosCompra: number;
  reformaInicial: number;
  alquilerMensual: number;
  ibiAnual: number;
  comunidadMensual: number;
  seguroAnual: number;
  hipotecaCuotaMensual: number;
  periodoVacioMeses: number;
}

export interface RentabilidadAlquilerDesglose {
  concepto: string;
  importe: number;
}

// ---------------------------------------------------------------------------
// Calculator: Simulador de Nómina
// ---------------------------------------------------------------------------

export interface NominaLinea {
  concepto: string;
  devengos?: number;    // earnings (positive)
  deducciones?: number; // deductions (positive number, displayed as negative)
}

export interface NominaInput {
  salarioBrutoAnual: number;
  pagas: 12 | 14;
  ccaa: ComunidadAutonoma;
  grupoCotizacion: number;  // 1-11
  tipoContrato: 'indefinido' | 'temporal';
  estadoCivil: 'soltero' | 'casado';
  hijos: number;
  discapacidad: number;
}

export interface NominaResult {
  // Header info
  periodoLiquidacion: string;

  // Devengos (earnings)
  salarioBase: number;
  prorrataPagas: number;    // only if 12 pagas (extra pay prorated monthly)
  totalDevengos: number;

  // Deducciones (deductions)
  contingenciasComunes: number;  // 4.70%
  desempleo: number;             // 1.55% (indefinido) or 1.60% (temporal)
  formacionProfesional: number;  // 0.10%
  mei: number;                   // MEI (Mecanismo de Equidad Intergeneracional)
  totalSeguridadSocial: number;
  retencionIRPF: number;
  porcentajeIRPF: number;
  totalDeducciones: number;

  // Net
  liquidoPercibir: number;

  // Employer cost (optional info section)
  costeEmpresa: number;
  ssEmpresa: number;

  // Detailed lines for rendering
  lineas: NominaLinea[];
}

export interface RentabilidadAlquilerResult {
  inversionTotal: number;
  ingresosAnuales: number;
  gastosAnualesTotales: number;
  beneficioNetoAnual: number;
  rentabilidadBruta: number;
  rentabilidadNeta: number;
  cashFlowMensual: number;
  anosRecuperacion: number;
  desglose: RentabilidadAlquilerDesglose[];
}
