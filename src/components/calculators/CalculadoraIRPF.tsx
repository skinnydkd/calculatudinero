import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularIRPF } from '@lib/calculations/impuestos';
import type { IRPFData, IRPFResult, ComunidadAutonoma } from '@lib/types';
import { CCAA_OPTIONS } from '@lib/types';

interface Props {
  irpfData: IRPFData;
}

export default function CalculadoraIRPF({ irpfData }: Props) {
  const [brutoAnual, setBrutoAnual] = useState('35000');
  const [esAutonomo, setEsAutonomo] = useState(false);
  const [cotizacionSS, setCotizacionSS] = useState('');
  const [gastoDeducible, setGastoDeducible] = useState('0');
  const [ccaa, setCcaa] = useState<ComunidadAutonoma>('madrid');
  const [hijos, setHijos] = useState(0);
  const [mayor65, setMayor65] = useState(false);
  const [mayor75, setMayor75] = useState(false);
  const [estado, setEstado] = useState<'soltero' | 'casado'>('soltero');
  const [discapacidad, setDiscapacidad] = useState(false);
  const [result, setResult] = useState<IRPFResult | null>(null);
  const [error, setError] = useState('');

  /** Estimate SS contribution (~6.47% of gross for employees) */
  function estimarCotizacionSS(bruto: number): number {
    return Math.round(bruto * 0.0647 * 100) / 100;
  }

  function handleCalculate() {
    setError('');

    const bruto = parseFloat(brutoAnual);
    if (isNaN(bruto) || bruto <= 0) {
      setError('Introduce unos rendimientos brutos anuales válidos.');
      return;
    }

    let ss = 0;
    let gastos = 0;

    if (esAutonomo) {
      gastos = parseFloat(gastoDeducible) || 0;
      if (gastos < 0) {
        setError('Los gastos deducibles no pueden ser negativos.');
        return;
      }
      if (gastos >= bruto) {
        setError('Los gastos deducibles no pueden ser mayores que los ingresos brutos.');
        return;
      }
    } else {
      const ssInput = cotizacionSS.trim();
      if (ssInput === '') {
        // Auto-estimate SS
        ss = estimarCotizacionSS(bruto);
      } else {
        ss = parseFloat(ssInput);
        if (isNaN(ss) || ss < 0) {
          setError('Introduce una cotización a la Seguridad Social válida.');
          return;
        }
      }
    }

    try {
      const res = calcularIRPF(
        {
          rendimientosBrutos: bruto,
          ccaa,
          hijosCount: hijos,
          mayor65,
          mayor75,
          situacion: estado,
          discapacidad,
          esAutonomo,
          gastoDeducible: gastos,
          cotizacionSS: ss,
        },
        irpfData
      );
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function barPercents(r: IRPFResult) {
    const bruto = parseFloat(brutoAnual) || 0;
    if (bruto <= 0) return { neto: 0, ss: 0, irpf: 0 };
    const ssAmount = esAutonomo ? parseFloat(gastoDeducible) || 0 : (parseFloat(cotizacionSS) || estimarCotizacionSS(bruto));
    const irpfPct = (r.cuotaIntegra / bruto) * 100;
    const ssPct = (ssAmount / bruto) * 100;
    const netoPct = Math.max(0, 100 - irpfPct - ssPct);
    return { neto: netoPct, ss: ssPct, irpf: irpfPct };
  }

  const ssEstimado = cotizacionSS.trim() === '' && !esAutonomo
    ? estimarCotizacionSS(parseFloat(brutoAnual) || 0)
    : null;

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos del contribuyente</p>
        <div class="calculator__grid">
          {/* Rendimientos brutos */}
          <div class="form-group">
            <label class="form-label" htmlFor="irpf-bruto">
              {esAutonomo ? 'Ingresos brutos anuales' : 'Rendimientos brutos anuales'} (€)
            </label>
            <div class="input-currency">
              <input
                id="irpf-bruto"
                type="number"
                class="form-input"
                min="0"
                step="500"
                value={brutoAnual}
                onInput={(e) => setBrutoAnual((e.target as HTMLInputElement).value)}
                placeholder="35.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
          </div>

          {/* Tipo de contribuyente */}
          <div class="form-group">
            <span class="form-label">Tipo de contribuyente</span>
            <div class="radio-group" role="radiogroup" aria-label="Tipo de contribuyente">
              <div class="radio-option">
                <input
                  type="radio"
                  id="irpf-empleado"
                  name="irpf-tipo"
                  value="empleado"
                  checked={!esAutonomo}
                  onChange={() => setEsAutonomo(false)}
                />
                <label htmlFor="irpf-empleado">Trabajador por cuenta ajena</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="irpf-autonomo"
                  name="irpf-tipo"
                  value="autonomo"
                  checked={esAutonomo}
                  onChange={() => setEsAutonomo(true)}
                />
                <label htmlFor="irpf-autonomo">Autónomo</label>
              </div>
            </div>
          </div>

          {/* Conditional: SS or gastos */}
          {!esAutonomo ? (
            <div class="form-group">
              <label class="form-label" htmlFor="irpf-ss">
                Cotización SS anual (€)
              </label>
              <div class="input-currency">
                <input
                  id="irpf-ss"
                  type="number"
                  class="form-input"
                  min="0"
                  step="100"
                  value={cotizacionSS}
                  onInput={(e) => setCotizacionSS((e.target as HTMLInputElement).value)}
                  placeholder={ssEstimado ? ssEstimado.toFixed(0) : '2.265'}
                />
                <span class="input-currency__symbol">€</span>
              </div>
              <span class="form-hint">
                {ssEstimado
                  ? `Déjalo vacío para estimar automáticamente (~${formatCurrency(ssEstimado)})`
                  : 'Cotización anual del trabajador a la Seguridad Social'}
              </span>
            </div>
          ) : (
            <div class="form-group">
              <label class="form-label" htmlFor="irpf-gastos">
                Gastos deducibles anuales (€)
              </label>
              <div class="input-currency">
                <input
                  id="irpf-gastos"
                  type="number"
                  class="form-input"
                  min="0"
                  step="500"
                  value={gastoDeducible}
                  onInput={(e) => setGastoDeducible((e.target as HTMLInputElement).value)}
                  placeholder="5.000"
                />
                <span class="input-currency__symbol">€</span>
              </div>
              <span class="form-hint">
                Cuota de autónomos, suministros, material, gestoría, etc.
              </span>
            </div>
          )}

          {/* CCAA */}
          <div class="form-group">
            <label class="form-label" htmlFor="irpf-ccaa">
              Comunidad Autónoma
            </label>
            <select
              id="irpf-ccaa"
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
                  id="irpf-soltero"
                  name="irpf-estado"
                  value="soltero"
                  checked={estado === 'soltero'}
                  onChange={() => setEstado('soltero')}
                />
                <label htmlFor="irpf-soltero">Soltero/a</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="irpf-casado"
                  name="irpf-estado"
                  value="casado"
                  checked={estado === 'casado'}
                  onChange={() => setEstado('casado')}
                />
                <label htmlFor="irpf-casado">Casado/a</label>
              </div>
            </div>
          </div>

          {/* Hijos */}
          <div class="form-group">
            <label class="form-label" htmlFor="irpf-hijos">
              Número de hijos
            </label>
            <select
              id="irpf-hijos"
              class="form-select"
              value={hijos}
              onChange={(e) => setHijos(parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Mayor 65 */}
          <div class="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingTop: 'var(--space-6)' }}>
            <input
              type="checkbox"
              id="irpf-mayor65"
              checked={mayor65}
              onChange={(e) => {
                const checked = (e.target as HTMLInputElement).checked;
                setMayor65(checked);
                if (!checked) setMayor75(false);
              }}
            />
            <label htmlFor="irpf-mayor65" class="form-label" style={{ marginBottom: 0 }}>
              Mayor de 65 años
            </label>
          </div>

          {/* Mayor 75 — only visible if mayor65 */}
          {mayor65 && (
            <div class="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingTop: 'var(--space-6)' }}>
              <input
                type="checkbox"
                id="irpf-mayor75"
                checked={mayor75}
                onChange={(e) => setMayor75((e.target as HTMLInputElement).checked)}
              />
              <label htmlFor="irpf-mayor75" class="form-label" style={{ marginBottom: 0 }}>
                Mayor de 75 años
              </label>
            </div>
          )}

          {/* Discapacidad */}
          <div class="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingTop: mayor65 ? '0' : 'var(--space-6)' }}>
            <input
              type="checkbox"
              id="irpf-discapacidad"
              checked={discapacidad}
              onChange={(e) => setDiscapacidad((e.target as HTMLInputElement).checked)}
            />
            <label htmlFor="irpf-discapacidad" class="form-label" style={{ marginBottom: 0 }}>
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
        Calcular IRPF
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Tu cuota de IRPF</p>

          <div class="calculator__result-main">
            {formatCurrency(result.cuotaIntegra)}
          </div>
          <p class="calculator__result-label">
            Cuota íntegra anual de IRPF
          </p>

          <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-6)' }}>
            Tipo efectivo:{' '}
            <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {formatPercent(result.tipoEfectivo, 2)}
            </strong>
            {result.cuotaEstatal > 0 && (
              <>
                {' — '}
                Estatal: <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(result.cuotaEstatal)}
                </strong>
                {' + '}
                Autonómica: <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(result.cuotaAutonomica)}
                </strong>
              </>
            )}
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
                    class="calculator__bar-segment calculator__bar-segment--irpf"
                    style={{ width: `${pct.irpf}%` }}
                  />
                  <div
                    class="calculator__bar-segment calculator__bar-segment--ss"
                    style={{ width: `${pct.ss}%` }}
                  />
                </div>
                <div class="calculator__bar-legend">
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                    Neto ({formatPercent(pct.neto, 1)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-warning)' }} />
                    IRPF ({formatPercent(pct.irpf, 1)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-info)' }} />
                    {esAutonomo ? 'Gastos' : 'Seg. Social'} ({formatPercent(pct.ss, 1)})
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
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rendimientos brutos</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(parseFloat(brutoAnual) || 0)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)' }}>
                  {esAutonomo ? '- Gastos deducibles' : '- Cotización Seguridad Social'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                  -{formatCurrency(esAutonomo ? (parseFloat(gastoDeducible) || 0) : (parseFloat(cotizacionSS) || estimarCotizacionSS(parseFloat(brutoAnual) || 0)))}
                </td>
              </tr>
              <tr>
                <td><strong>= Rendimientos netos</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)' }}><strong>{formatCurrency(result.rendimientosNetos)}</strong></td>
              </tr>
              {result.reduccionTrabajo > 0 && (
                <tr>
                  <td style={{ paddingLeft: 'var(--space-4)' }}>- Reducción rendimientos del trabajo</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                    -{formatCurrency(result.reduccionTrabajo)}
                  </td>
                </tr>
              )}
              <tr>
                <td><strong>= Base liquidable</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)' }}><strong>{formatCurrency(result.baseLiquidable)}</strong></td>
              </tr>
              <tr>
                <td colspan={2} style={{ height: 'var(--space-2)', borderBottom: 'none' }}></td>
              </tr>
              {result.cuotaEstatal > 0 && (
                <>
                  <tr>
                    <td>Cuota estatal</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(result.cuotaEstatal)}</td>
                  </tr>
                  <tr>
                    <td>Cuota autonómica</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(result.cuotaAutonomica)}</td>
                  </tr>
                </>
              )}
              {result.cuotaEstatal === 0 && result.cuotaAutonomica > 0 && (
                <tr>
                  <td>Cuota foral</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(result.cuotaAutonomica)}</td>
                </tr>
              )}
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)' }}>- Mínimo personal y familiar</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                  {formatCurrency(result.minimoPersonalFamiliar)}
                </td>
              </tr>
              <tr>
                <td><strong>= Cuota íntegra total</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {formatCurrency(result.cuotaIntegra)}
                </td>
              </tr>
              <tr>
                <td><strong>Tipo efectivo</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {formatPercent(result.tipoEfectivo, 2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Desglose por tramos */}
          {result.desgloseTramos.length > 0 && (
            <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                Desglose por tramos
              </p>
              <table class="calculator__breakdown">
                <thead>
                  <tr>
                    <th>Tramo</th>
                    <th>Base</th>
                    <th>Tipo</th>
                    <th>Cuota</th>
                  </tr>
                </thead>
                <tbody>
                  {result.desgloseTramos.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '0.85rem' }}>{t.tramo}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formatCurrency(t.base)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formatPercent(t.tipo, 2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formatCurrency(t.cuota)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
