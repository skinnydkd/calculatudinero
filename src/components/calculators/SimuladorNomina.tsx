import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularNomina } from '@lib/calculations/laboral';
import CopyButton from './CopyButton';
import type {
  SeguridadSocialData,
  IRPFData,
  NominaResult,
  ComunidadAutonoma,
} from '@lib/types';
import { CCAA_OPTIONS } from '@lib/types';

interface Props {
  ssData: SeguridadSocialData;
  irpfData: IRPFData;
}

const GRUPOS_COTIZACION = [
  { grupo: 1, label: '1 — Ingenieros y Licenciados' },
  { grupo: 2, label: '2 — Ingenieros Técnicos, Peritos' },
  { grupo: 3, label: '3 — Jefes Administrativos y de Taller' },
  { grupo: 4, label: '4 — Ayudantes no Titulados' },
  { grupo: 5, label: '5 — Oficiales Administrativos' },
  { grupo: 6, label: '6 — Subalternos' },
  { grupo: 7, label: '7 — Auxiliares Administrativos' },
  { grupo: 8, label: '8 — Oficiales de primera y segunda' },
  { grupo: 9, label: '9 — Oficiales de tercera y Especialistas' },
  { grupo: 10, label: '10 — Peones' },
  { grupo: 11, label: '11 — Trabajadores menores de 18 años' },
];

export default function SimuladorNomina({ ssData, irpfData }: Props) {
  const [brutoAnual, setBrutoAnual] = useState('25000');
  const [numPagas, setNumPagas] = useState<12 | 14>(14);
  const [ccaa, setCcaa] = useState<ComunidadAutonoma>('madrid');
  const [estado, setEstado] = useState<'soltero' | 'casado'>('soltero');
  const [hijos, setHijos] = useState(0);
  const [discapacidad, setDiscapacidad] = useState(0);
  const [tipoContrato, setTipoContrato] = useState<'indefinido' | 'temporal'>('indefinido');
  const [grupoCotizacion, setGrupoCotizacion] = useState(5);
  const [result, setResult] = useState<NominaResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const bruto = parseFloat(brutoAnual);
    if (isNaN(bruto) || bruto <= 0) {
      setError('Introduce un salario bruto anual valido.');
      return;
    }

    try {
      const res = calcularNomina(
        {
          salarioBrutoAnual: bruto,
          pagas: numPagas,
          ccaa,
          grupoCotizacion,
          tipoContrato,
          estadoCivil: estado,
          hijos,
          discapacidad,
        },
        ssData,
        irpfData
      );
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el calculo: ' + msg);
    }
  }

  function buildCopyText(r: NominaResult): string {
    const lines = [
      `RECIBO DE SALARIOS — ${r.periodoLiquidacion}`,
      '',
      'I. DEVENGOS',
      `  Salario base: ${formatCurrency(r.salarioBase)}`,
    ];
    if (numPagas === 12) {
      lines.push(`  Prorrata pagas extra: ${formatCurrency(r.prorrataPagas)}`);
    }
    lines.push(`  TOTAL DEVENGOS: ${formatCurrency(r.totalDevengos)}`);
    lines.push('');
    lines.push('II. DEDUCCIONES');
    lines.push(`  Contingencias comunes: ${formatCurrency(r.contingenciasComunes)}`);
    lines.push(`  Desempleo: ${formatCurrency(r.desempleo)}`);
    lines.push(`  Formacion profesional: ${formatCurrency(r.formacionProfesional)}`);
    lines.push(`  MEI: ${formatCurrency(r.mei)}`);
    lines.push(`  IRPF (${formatPercent(r.porcentajeIRPF, 2)}): ${formatCurrency(r.retencionIRPF)}`);
    lines.push(`  TOTAL DEDUCCIONES: ${formatCurrency(r.totalDeducciones)}`);
    lines.push('');
    lines.push(`LIQUIDO A PERCIBIR: ${formatCurrency(r.liquidoPercibir)}`);
    return lines.join('\n');
  }

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos del trabajador</p>
        <div class="calculator__grid">
          {/* Salario bruto anual */}
          <div class="form-group">
            <label class="form-label" htmlFor="nom-bruto">
              Salario bruto anual
            </label>
            <div class="input-currency">
              <input
                id="nom-bruto"
                type="number"
                class="form-input"
                min="0"
                step="500"
                value={brutoAnual}
                onInput={(e) => setBrutoAnual((e.target as HTMLInputElement).value)}
                placeholder="25.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>

          {/* Grupo de cotizacion */}
          <div class="form-group">
            <label class="form-label" htmlFor="nom-grupo">
              Grupo de cotizacion
            </label>
            <select
              id="nom-grupo"
              class="form-select"
              value={grupoCotizacion}
              onChange={(e) => setGrupoCotizacion(parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              {GRUPOS_COTIZACION.map((g) => (
                <option key={g.grupo} value={g.grupo}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Numero de pagas */}
          <div class="form-group">
            <span class="form-label">Numero de pagas</span>
            <div class="radio-group" role="radiogroup" aria-label="Numero de pagas">
              <div class="radio-option">
                <input
                  type="radio"
                  id="nom-pagas-14"
                  name="nom-pagas"
                  value="14"
                  checked={numPagas === 14}
                  onChange={() => setNumPagas(14)}
                />
                <label htmlFor="nom-pagas-14">14 pagas</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="nom-pagas-12"
                  name="nom-pagas"
                  value="12"
                  checked={numPagas === 12}
                  onChange={() => setNumPagas(12)}
                />
                <label htmlFor="nom-pagas-12">12 pagas</label>
              </div>
            </div>
          </div>

          {/* Tipo de contrato */}
          <div class="form-group">
            <span class="form-label">Tipo de contrato</span>
            <div class="radio-group" role="radiogroup" aria-label="Tipo de contrato">
              <div class="radio-option">
                <input
                  type="radio"
                  id="nom-contrato-indef"
                  name="nom-contrato"
                  value="indefinido"
                  checked={tipoContrato === 'indefinido'}
                  onChange={() => setTipoContrato('indefinido')}
                />
                <label htmlFor="nom-contrato-indef">Indefinido</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="nom-contrato-temp"
                  name="nom-contrato"
                  value="temporal"
                  checked={tipoContrato === 'temporal'}
                  onChange={() => setTipoContrato('temporal')}
                />
                <label htmlFor="nom-contrato-temp">Temporal</label>
              </div>
            </div>
          </div>

          {/* Comunidad Autonoma */}
          <div class="form-group">
            <label class="form-label" htmlFor="nom-ccaa">
              Comunidad Autonoma
            </label>
            <select
              id="nom-ccaa"
              class="form-select"
              value={ccaa}
              onChange={(e) => setCcaa((e.target as HTMLSelectElement).value as ComunidadAutonoma)}
            >
              {CCAA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estado civil */}
          <div class="form-group">
            <span class="form-label">Estado civil</span>
            <div class="radio-group" role="radiogroup" aria-label="Estado civil">
              <div class="radio-option">
                <input
                  type="radio"
                  id="nom-estado-soltero"
                  name="nom-estado"
                  value="soltero"
                  checked={estado === 'soltero'}
                  onChange={() => setEstado('soltero')}
                />
                <label htmlFor="nom-estado-soltero">Soltero/a</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="nom-estado-casado"
                  name="nom-estado"
                  value="casado"
                  checked={estado === 'casado'}
                  onChange={() => setEstado('casado')}
                />
                <label htmlFor="nom-estado-casado">Casado/a</label>
              </div>
            </div>
          </div>

          {/* Hijos a cargo */}
          <div class="form-group">
            <label class="form-label" htmlFor="nom-hijos">
              Hijos a cargo
            </label>
            <select
              id="nom-hijos"
              class="form-select"
              value={hijos}
              onChange={(e) => setHijos(parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Discapacidad */}
          <div class="form-group">
            <label class="form-label" htmlFor="nom-discapacidad">
              Discapacidad (%)
            </label>
            <div class="input-currency">
              <input
                id="nom-discapacidad"
                type="number"
                class="form-input"
                min="0"
                max="100"
                step="1"
                value={discapacidad}
                onInput={(e) => setDiscapacidad(parseInt((e.target as HTMLInputElement).value, 10) || 0)}
                placeholder="0"
              />
              <span class="input-currency__symbol">%</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Generar nomina
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <div class="nomina">
            {/* Header */}
            <div class="nomina__header">
              <p class="nomina__title">RECIBO DE SALARIOS</p>
              <p class="nomina__periodo">
                Periodo de liquidacion: <strong>{result.periodoLiquidacion}</strong>
              </p>
            </div>

            {/* I. Devengos */}
            <div class="nomina__section">
              <p class="nomina__section-title">I. DEVENGOS</p>
              <table class="nomina__table">
                <tbody>
                  <tr>
                    <td>Salario base</td>
                    <td class="nomina__amount">{formatCurrency(result.salarioBase)}</td>
                  </tr>
                  {numPagas === 12 && (
                    <tr>
                      <td>Prorrata pagas extraordinarias</td>
                      <td class="nomina__amount">{formatCurrency(result.prorrataPagas)}</td>
                    </tr>
                  )}
                  <tr class="nomina__row-total">
                    <td><strong>TOTAL DEVENGOS</strong></td>
                    <td class="nomina__amount"><strong>{formatCurrency(result.totalDevengos)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* II. Deducciones */}
            <div class="nomina__section">
              <p class="nomina__section-title">II. DEDUCCIONES</p>
              <table class="nomina__table">
                <tbody>
                  <tr>
                    <td>Contingencias comunes {formatPercent(ssData.cotizacionTrabajador.contingenciasComunes, 2)}</td>
                    <td class="nomina__amount nomina__amount--deduction">{formatCurrency(result.contingenciasComunes)}</td>
                  </tr>
                  <tr>
                    <td>Desempleo {formatPercent(tipoContrato === 'indefinido' ? ssData.cotizacionTrabajador.desempleoIndefinido : ssData.cotizacionTrabajador.desempleoTemporal, 2)}</td>
                    <td class="nomina__amount nomina__amount--deduction">{formatCurrency(result.desempleo)}</td>
                  </tr>
                  <tr>
                    <td>Formacion profesional {formatPercent(ssData.cotizacionTrabajador.formacionProfesional, 2)}</td>
                    <td class="nomina__amount nomina__amount--deduction">{formatCurrency(result.formacionProfesional)}</td>
                  </tr>
                  <tr>
                    <td>MEI {formatPercent(ssData.cotizacionTrabajador.mei, 2)}</td>
                    <td class="nomina__amount nomina__amount--deduction">{formatCurrency(result.mei)}</td>
                  </tr>
                  <tr class="nomina__row-subtotal">
                    <td>Total Seguridad Social</td>
                    <td class="nomina__amount nomina__amount--deduction">{formatCurrency(result.totalSeguridadSocial)}</td>
                  </tr>
                  <tr>
                    <td>IRPF {formatPercent(result.porcentajeIRPF, 2)}</td>
                    <td class="nomina__amount nomina__amount--deduction">{formatCurrency(result.retencionIRPF)}</td>
                  </tr>
                  <tr class="nomina__row-total">
                    <td><strong>TOTAL DEDUCCIONES</strong></td>
                    <td class="nomina__amount nomina__amount--deduction"><strong>{formatCurrency(result.totalDeducciones)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Liquido a percibir */}
            <div class="nomina__liquido">
              <span>LIQUIDO A PERCIBIR</span>
              <span class="nomina__liquido-amount">{formatCurrency(result.liquidoPercibir)}</span>
            </div>

            {/* Coste empresa */}
            <div class="nomina__coste-empresa">
              <div class="nomina__coste-row">
                <span>Cotizacion empresarial a la S.S.</span>
                <span class="nomina__amount">{formatCurrency(result.ssEmpresa)}</span>
              </div>
              <div class="nomina__coste-row nomina__coste-row--total">
                <span><strong>Coste total empresa</strong></span>
                <span class="nomina__amount"><strong>{formatCurrency(result.costeEmpresa)}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <CopyButton text={buildCopyText(result)} label="Copiar nomina" />
          </div>
        </div>
      )}
    </div>
  );
}
