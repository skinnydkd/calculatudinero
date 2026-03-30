import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularInteresCompuesto } from '@lib/calculations/ahorro';
import type { InteresCompuestoResult } from '@lib/types';

export default function InteresCompuesto() {
  const [capitalInicial, setCapitalInicial] = useState('10000');
  const [aportacionMensual, setAportacionMensual] = useState('200');
  const [tasaAnual, setTasaAnual] = useState('7');
  const [plazoAnios, setPlazoAnios] = useState('20');
  const [inflacionAnual, setInflacionAnual] = useState('2.5');
  const [result, setResult] = useState<InteresCompuestoResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const capital = parseFloat(capitalInicial);
    if (isNaN(capital) || capital < 0) {
      setError('Introduce un capital inicial válido (0 o superior).');
      return;
    }

    const aportacion = parseFloat(aportacionMensual);
    if (isNaN(aportacion) || aportacion < 0) {
      setError('Introduce una aportación mensual válida (0 o superior).');
      return;
    }

    if (capital === 0 && aportacion === 0) {
      setError('Introduce al menos un capital inicial o una aportación mensual.');
      return;
    }

    const tasa = parseFloat(tasaAnual);
    if (isNaN(tasa) || tasa < 0 || tasa > 50) {
      setError('Introduce una rentabilidad anual entre 0% y 50%.');
      return;
    }

    const plazo = parseInt(plazoAnios, 10);
    if (isNaN(plazo) || plazo < 1 || plazo > 50) {
      setError('Introduce un plazo entre 1 y 50 años.');
      return;
    }

    const inflacion = parseFloat(inflacionAnual);
    if (isNaN(inflacion) || inflacion < 0 || inflacion > 30) {
      setError('Introduce una inflación anual entre 0% y 30%.');
      return;
    }

    try {
      const res = calcularInteresCompuesto({
        capitalInicial: capital,
        aportacionMensual: aportacion,
        tasaAnual: tasa,
        plazoAnios: plazo,
        inflacionAnual: inflacion,
      });
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  const tasa = parseFloat(tasaAnual);
  const regla72 = !isNaN(tasa) && tasa > 0 ? Math.round(72 / tasa) : null;

  function barPercents(r: InteresCompuestoResult) {
    if (r.capitalFinal <= 0) return { aportado: 0, intereses: 0 };
    return {
      aportado: (r.totalAportado / r.capitalFinal) * 100,
      intereses: (r.totalIntereses / r.capitalFinal) * 100,
    };
  }

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos de la inversión</p>
        <div class="calculator__grid">
          {/* Capital inicial */}
          <div class="form-group">
            <label class="form-label" htmlFor="ic-capital">
              Capital inicial
            </label>
            <div class="input-currency">
              <input
                id="ic-capital"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={capitalInicial}
                onInput={(e) => setCapitalInicial((e.target as HTMLInputElement).value)}
                placeholder="10.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>

          {/* Aportación mensual */}
          <div class="form-group">
            <label class="form-label" htmlFor="ic-aportacion">
              Aportación mensual
            </label>
            <div class="input-currency">
              <input
                id="ic-aportacion"
                type="number"
                class="form-input"
                min="0"
                step="50"
                value={aportacionMensual}
                onInput={(e) => setAportacionMensual((e.target as HTMLInputElement).value)}
                placeholder="200"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>

          {/* Rentabilidad anual */}
          <div class="form-group">
            <label class="form-label" htmlFor="ic-tasa">
              Rentabilidad anual esperada
            </label>
            <div class="input-currency">
              <input
                id="ic-tasa"
                type="number"
                class="form-input"
                min="0"
                max="50"
                step="0.1"
                value={tasaAnual}
                onInput={(e) => setTasaAnual((e.target as HTMLInputElement).value)}
                placeholder="7"
              />
              <span class="input-currency__symbol">%</span>
            </div>
            {regla72 !== null && (
              <p class="form-hint">
                Regla del 72: a un {formatPercent(tasa, 1)} anual, tu dinero se duplica en ~{regla72} años.
              </p>
            )}
          </div>

          {/* Plazo */}
          <div class="form-group">
            <label class="form-label" htmlFor="ic-plazo">
              Plazo (años)
            </label>
            <input
              id="ic-plazo"
              type="range"
              class="form-range"
              min="1"
              max="50"
              step="1"
              value={plazoAnios}
              onInput={(e) => setPlazoAnios((e.target as HTMLInputElement).value)}
            />
            <div class="ic-plazo-display">
              <span>{plazoAnios} {parseInt(plazoAnios, 10) === 1 ? 'año' : 'años'}</span>
            </div>
          </div>

          {/* Inflación anual */}
          <div class="form-group" style={{ gridColumn: '1 / -1' }}>
            <label class="form-label" htmlFor="ic-inflacion">
              Inflación anual estimada
            </label>
            <div class="input-currency" style={{ maxWidth: '200px' }}>
              <input
                id="ic-inflacion"
                type="number"
                class="form-input"
                min="0"
                max="30"
                step="0.1"
                value={inflacionAnual}
                onInput={(e) => setInflacionAnual((e.target as HTMLInputElement).value)}
                placeholder="2.5"
              />
              <span class="input-currency__symbol">%</span>
            </div>
            <p class="form-hint">Media histórica en España: ~2-3%</p>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular interés compuesto
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Resultado de tu inversión</p>

          <div class="calculator__result-main">
            {formatCurrency(result.capitalFinal)}
          </div>
          <p class="calculator__result-label">
            Capital final (nominal)
          </p>

          <p style={{
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: '0.95rem',
            marginBottom: 'var(--space-6)',
          }}>
            En euros de hoy (ajustado por inflación): <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(result.capitalFinalReal)}</strong>
          </p>

          {/* Summary cards */}
          <div class="ic-summary">
            <div class="ic-summary__item">
              <span class="ic-summary__label">Total aportado</span>
              <span class="ic-summary__value">{formatCurrency(result.totalAportado)}</span>
            </div>
            <div class="ic-summary__item">
              <span class="ic-summary__label">Total intereses</span>
              <span class="ic-summary__value ic-summary__value--accent">{formatCurrency(result.totalIntereses)}</span>
            </div>
            <div class="ic-summary__item">
              <span class="ic-summary__label">Rentabilidad total</span>
              <span class="ic-summary__value ic-summary__value--accent">
                {result.totalAportado > 0
                  ? formatPercent((result.totalIntereses / result.totalAportado) * 100, 1)
                  : '0%'}
              </span>
            </div>
          </div>

          {/* Bar chart: Aportaciones vs Intereses */}
          {(() => {
            const pcts = barPercents(result);
            return (
              <div>
                <div class="calculator__bar" style={{ height: '18px', borderRadius: '9px' }}>
                  <div
                    class="calculator__bar-segment"
                    style={{ width: `${pcts.aportado}%`, backgroundColor: 'var(--color-success)' }}
                    title={`Aportaciones: ${formatCurrency(result.totalAportado)}`}
                  />
                  <div
                    class="calculator__bar-segment"
                    style={{ width: `${pcts.intereses}%`, backgroundColor: 'var(--color-accent)' }}
                    title={`Intereses: ${formatCurrency(result.totalIntereses)}`}
                  />
                </div>
                <div class="calculator__bar-legend">
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                    Aportaciones ({formatPercent(pcts.aportado, 1)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-accent)' }} />
                    Intereses ({formatPercent(pcts.intereses, 1)})
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Growth mini bars */}
          {result.evolucionAnual.length > 0 && (
            <div class="ic-growth" style={{ marginTop: 'var(--space-6)' }}>
              <p class="calculator__inputs-title">Evolución del capital</p>
              <div class="ic-growth__chart">
                {result.evolucionAnual.map((row) => {
                  const maxCapital = result.evolucionAnual[result.evolucionAnual.length - 1].capitalAcumulado;
                  const aportadoPct = maxCapital > 0 ? (row.aportadoAcumulado / maxCapital) * 100 : 0;
                  const interesesPct = maxCapital > 0 ? (row.interesesAcumulados / maxCapital) * 100 : 0;
                  return (
                    <div class="ic-growth__row" key={row.anio}>
                      <span class="ic-growth__label">{row.anio}</span>
                      <div class="ic-growth__bar">
                        <div
                          class="ic-growth__segment"
                          style={{ width: `${aportadoPct}%`, backgroundColor: 'var(--color-success)' }}
                        />
                        <div
                          class="ic-growth__segment"
                          style={{ width: `${interesesPct}%`, backgroundColor: 'var(--color-accent)' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evolución anual table */}
          <div style={{ overflowX: 'auto', marginTop: 'var(--space-6)' }}>
            <table class="calculator__breakdown">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Capital nominal</th>
                  <th>Capital real</th>
                  <th>Total aportado</th>
                  <th>Intereses ganados</th>
                </tr>
              </thead>
              <tbody>
                {result.evolucionAnual.map((row) => (
                  <tr key={row.anio}>
                    <td>{row.anio}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.capitalAcumulado)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{formatCurrency(row.capitalAcumuladoReal)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.aportadoAcumulado)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success, #2f7d3a)' }}>+{formatCurrency(row.interesesAcumulados)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p>
                Cálculo orientativo basado en capitalización mensual con tipo fijo.
                Las rentabilidades pasadas no garantizan rentabilidades futuras.
                El valor real se ajusta por la inflación estimada para reflejar el poder adquisitivo actual.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
