import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularSalarioNeto } from '@lib/calculations/laboral';
import type {
  SeguridadSocialData,
  IRPFData,
  SalarioResult,
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

export default function SalarioNeto({ ssData, irpfData }: Props) {
  const [brutoAnual, setBrutoAnual] = useState('30000');
  const [numPagas, setNumPagas] = useState<12 | 14>(14);
  const [ccaa, setCcaa] = useState<ComunidadAutonoma>('madrid');
  const [estado, setEstado] = useState<'soltero' | 'casado'>('soltero');
  const [hijos, setHijos] = useState(0);
  const [discapacidad, setDiscapacidad] = useState(false);
  const [tipoContrato, setTipoContrato] = useState<'indefinido' | 'temporal'>('indefinido');
  const [grupoCotizacion, setGrupoCotizacion] = useState(5);
  const [result, setResult] = useState<SalarioResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const bruto = parseFloat(brutoAnual);
    if (isNaN(bruto) || bruto <= 0) {
      setError('Introduce un salario bruto anual válido.');
      return;
    }

    const res = calcularSalarioNeto(
      {
        salarioBrutoAnual: bruto,
        numeroPagas: numPagas,
        ccaa,
        situacionPersonal: {
          estado,
          hijosCount: hijos,
          discapacidad,
        },
        tipoContrato,
        grupoCotizacion,
      },
      ssData,
      irpfData
    );

    setResult(res);
  }

  function barPercents(r: SalarioResult) {
    const bruto = r.desglose.brutoAnual;
    if (bruto <= 0) return { neto: 0, ss: 0, irpf: 0 };
    return {
      neto: (r.salarioNetoAnual / bruto) * 100,
      ss: (r.desglose.ssTotal / bruto) * 100,
      irpf: (r.desglose.irpfAnual / bruto) * 100,
    };
  }

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos del trabajador</p>
        <div class="calculator__grid">
          {/* Salario bruto anual */}
          <div class="form-group">
            <label class="form-label" htmlFor="sn-bruto">
              Salario bruto anual (€)
            </label>
            <div class="input-currency">
              <input
                id="sn-bruto"
                type="number"
                class="form-input"
                min="0"
                step="500"
                value={brutoAnual}
                onInput={(e) => setBrutoAnual((e.target as HTMLInputElement).value)}
                placeholder="30.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
          </div>

          {/* Grupo de cotización */}
          <div class="form-group">
            <label class="form-label" htmlFor="sn-grupo">
              Grupo de cotización
            </label>
            <select
              id="sn-grupo"
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

          {/* Número de pagas */}
          <div class="form-group">
            <span class="form-label">Número de pagas</span>
            <div class="radio-group" role="radiogroup" aria-label="Número de pagas">
              <div class="radio-option">
                <input
                  type="radio"
                  id="sn-pagas-14"
                  name="sn-pagas"
                  value="14"
                  checked={numPagas === 14}
                  onChange={() => setNumPagas(14)}
                />
                <label htmlFor="sn-pagas-14">14 pagas</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="sn-pagas-12"
                  name="sn-pagas"
                  value="12"
                  checked={numPagas === 12}
                  onChange={() => setNumPagas(12)}
                />
                <label htmlFor="sn-pagas-12">12 pagas</label>
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
                  id="sn-contrato-indef"
                  name="sn-contrato"
                  value="indefinido"
                  checked={tipoContrato === 'indefinido'}
                  onChange={() => setTipoContrato('indefinido')}
                />
                <label htmlFor="sn-contrato-indef">Indefinido</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="sn-contrato-temp"
                  name="sn-contrato"
                  value="temporal"
                  checked={tipoContrato === 'temporal'}
                  onChange={() => setTipoContrato('temporal')}
                />
                <label htmlFor="sn-contrato-temp">Temporal</label>
              </div>
            </div>
          </div>

          {/* Comunidad Autónoma */}
          <div class="form-group">
            <label class="form-label" htmlFor="sn-ccaa">
              Comunidad Autónoma
            </label>
            <select
              id="sn-ccaa"
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
                  id="sn-estado-soltero"
                  name="sn-estado"
                  value="soltero"
                  checked={estado === 'soltero'}
                  onChange={() => setEstado('soltero')}
                />
                <label htmlFor="sn-estado-soltero">Soltero/a</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="sn-estado-casado"
                  name="sn-estado"
                  value="casado"
                  checked={estado === 'casado'}
                  onChange={() => setEstado('casado')}
                />
                <label htmlFor="sn-estado-casado">Casado/a</label>
              </div>
            </div>
          </div>

          {/* Número de hijos */}
          <div class="form-group">
            <label class="form-label" htmlFor="sn-hijos">
              Número de hijos
            </label>
            <select
              id="sn-hijos"
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
          <div class="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingTop: 'var(--space-6)' }}>
            <input
              type="checkbox"
              id="sn-discapacidad"
              checked={discapacidad}
              onChange={(e) => setDiscapacidad((e.target as HTMLInputElement).checked)}
            />
            <label htmlFor="sn-discapacidad" class="form-label" style={{ marginBottom: 0 }}>
              Discapacidad reconocida (&ge;33%)
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Tu salario neto</p>

          <div class="calculator__result-main">
            {formatCurrency(result.salarioNetoMensual)}
          </div>
          <p class="calculator__result-label">
            Salario neto mensual ({numPagas} pagas)
          </p>

          <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-6)' }}>
            Neto anual: <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(result.salarioNetoAnual)}
            </strong>
            {' — '}
            Coste empresa: <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(result.costeTotalEmpresa)}
            </strong>/año
          </p>

          {/* Bar chart */}
          {(() => {
            const pct = barPercents(result);
            return (
              <>
                <div class="calculator__bar" aria-hidden="true">
                  <div
                    class="calculator__bar-segment calculator__bar-segment--neto"
                    style={{ width: `${pct.neto}%` }}
                  />
                  <div
                    class="calculator__bar-segment calculator__bar-segment--ss"
                    style={{ width: `${pct.ss}%` }}
                  />
                  <div
                    class="calculator__bar-segment calculator__bar-segment--irpf"
                    style={{ width: `${pct.irpf}%` }}
                  />
                </div>
                <div class="calculator__bar-legend">
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                    Neto ({formatPercent(pct.neto, 1)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-info)' }} />
                    Seg. Social ({formatPercent(pct.ss, 1)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-warning)' }} />
                    IRPF ({formatPercent(pct.irpf, 1)})
                  </span>
                </div>
              </>
            );
          })()}

          {/* Desglose table */}
          <table class="calculator__breakdown" style={{ marginTop: 'var(--space-6)' }}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Mensual</th>
                <th>Anual</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salario bruto</td>
                <td>{formatCurrency(result.desglose.brutoMensual)}</td>
                <td>{formatCurrency(result.desglose.brutoAnual)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)' }}>Contingencias comunes ({formatPercent(ssData.cotizacionTrabajador.contingenciasComunes, 2)})</td>
                <td>-{formatCurrency(result.desglose.ssDesglose.contingenciasComunes / 12)}</td>
                <td>-{formatCurrency(result.desglose.ssDesglose.contingenciasComunes)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)' }}>Desempleo</td>
                <td>-{formatCurrency(result.desglose.ssDesglose.desempleo / 12)}</td>
                <td>-{formatCurrency(result.desglose.ssDesglose.desempleo)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)' }}>Formación profesional</td>
                <td>-{formatCurrency(result.desglose.ssDesglose.formacion / 12)}</td>
                <td>-{formatCurrency(result.desglose.ssDesglose.formacion)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)' }}>MEI</td>
                <td>-{formatCurrency(result.desglose.ssDesglose.mei / 12)}</td>
                <td>-{formatCurrency(result.desglose.ssDesglose.mei)}</td>
              </tr>
              <tr>
                <td><strong>Total Seguridad Social</strong></td>
                <td>-{formatCurrency(result.desglose.ssTotal / 12)}</td>
                <td>-{formatCurrency(result.desglose.ssTotal)}</td>
              </tr>
              <tr>
                <td>IRPF ({formatPercent(result.desglose.tipoRetencion, 2)})</td>
                <td>-{formatCurrency(result.desglose.irpfMensual)}</td>
                <td>-{formatCurrency(result.desglose.irpfAnual)}</td>
              </tr>
              <tr>
                <td><strong>Salario neto</strong></td>
                <td><strong>{formatCurrency(result.salarioNetoMensual)}</strong></td>
                <td><strong>{formatCurrency(result.salarioNetoAnual)}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Coste empresa */}
          <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
              Coste total para la empresa
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700 }}>
              {formatCurrency(result.costeTotalEmpresa)}
              <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}> /año</span>
            </p>
            <p class="form-hint">
              Incluye salario bruto + cotizaciones empresariales a la Seguridad Social
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
