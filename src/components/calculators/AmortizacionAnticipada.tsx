import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularAmortizacionAnticipada } from '@lib/calculations/vivienda';
import type { AmortizacionAnticipadaResult } from '@lib/types';

export default function AmortizacionAnticipada() {
  const [capitalPendiente, setCapitalPendiente] = useState('150000');
  const [cuotaActual, setCuotaActual] = useState('700');
  const [tipoInteres, setTipoInteres] = useState('2.9');
  const [plazoRestante, setPlazoRestante] = useState('20');
  const [unidadPlazo, setUnidadPlazo] = useState<'anios' | 'meses'>('anios');
  const [cantidadAmortizar, setCantidadAmortizar] = useState('20000');
  const [result, setResult] = useState<AmortizacionAnticipadaResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const capital = parseFloat(capitalPendiente);
    if (isNaN(capital) || capital <= 0) {
      setError('Introduce un capital pendiente válido.');
      return;
    }

    const cuota = parseFloat(cuotaActual);
    if (isNaN(cuota) || cuota <= 0) {
      setError('Introduce una cuota mensual válida.');
      return;
    }

    const interes = parseFloat(tipoInteres);
    if (isNaN(interes) || interes < 0 || interes > 20) {
      setError('Introduce un tipo de interés entre 0% y 20%.');
      return;
    }

    const plazoNum = parseInt(plazoRestante, 10);
    if (isNaN(plazoNum) || plazoNum <= 0) {
      setError('Introduce un plazo restante válido.');
      return;
    }
    const plazoMeses = unidadPlazo === 'anios' ? plazoNum * 12 : plazoNum;

    const cantidad = parseFloat(cantidadAmortizar);
    if (isNaN(cantidad) || cantidad <= 0) {
      setError('Introduce una cantidad a amortizar válida.');
      return;
    }
    if (cantidad >= capital) {
      setError('La cantidad a amortizar no puede ser igual o superior al capital pendiente.');
      return;
    }

    try {
      const res = calcularAmortizacionAnticipada({
        capitalPendiente: capital,
        cuotaActual: cuota,
        tipoInteres: interes,
        plazoRestanteMeses: plazoMeses,
        cantidadAmortizar: cantidad,
        modalidad: 'reducir_cuota',
      });
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function formatMeses(meses: number): string {
    const anios = Math.floor(meses / 12);
    const mesesResto = meses % 12;
    if (anios === 0) return `${meses} meses`;
    if (mesesResto === 0) return `${anios} ${anios === 1 ? 'año' : 'años'}`;
    return `${anios} ${anios === 1 ? 'año' : 'años'} y ${mesesResto} ${mesesResto === 1 ? 'mes' : 'meses'}`;
  }

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos de tu hipoteca actual</p>
        <div class="calculator__grid">
          {/* Capital pendiente */}
          <div class="form-group">
            <label class="form-label" htmlFor="aa-capital">
              Capital pendiente de hipoteca
            </label>
            <div class="input-currency">
              <input
                id="aa-capital"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={capitalPendiente}
                onInput={(e) => setCapitalPendiente((e.target as HTMLInputElement).value)}
                placeholder="150.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
            <span class="form-hint">Lo encuentras en tu último recibo o en la app del banco</span>
          </div>

          {/* Cuota mensual actual */}
          <div class="form-group">
            <label class="form-label" htmlFor="aa-cuota">
              Cuota mensual actual
            </label>
            <div class="input-currency">
              <input
                id="aa-cuota"
                type="number"
                class="form-input"
                min="0"
                step="10"
                value={cuotaActual}
                onInput={(e) => setCuotaActual((e.target as HTMLInputElement).value)}
                placeholder="700"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>

          {/* Tipo de interés */}
          <div class="form-group">
            <label class="form-label" htmlFor="aa-interes">
              Tipo de interés anual
            </label>
            <div class="input-currency">
              <input
                id="aa-interes"
                type="number"
                class="form-input"
                min="0"
                max="20"
                step="0.1"
                value={tipoInteres}
                onInput={(e) => setTipoInteres((e.target as HTMLInputElement).value)}
              />
              <span class="input-currency__symbol">%</span>
            </div>
            <span class="form-hint">Si es variable, introduce el tipo vigente actual</span>
          </div>

          {/* Plazo restante */}
          <div class="form-group">
            <label class="form-label" htmlFor="aa-plazo">
              Plazo restante
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <div class="input-currency" style={{ flex: 1 }}>
                <input
                  id="aa-plazo"
                  type="number"
                  class="form-input"
                  min="1"
                  step="1"
                  value={plazoRestante}
                  onInput={(e) => setPlazoRestante((e.target as HTMLInputElement).value)}
                />
              </div>
              <select
                class="form-select"
                style={{ width: 'auto', minWidth: '100px' }}
                value={unidadPlazo}
                onChange={(e) => setUnidadPlazo((e.target as HTMLSelectElement).value as 'anios' | 'meses')}
              >
                <option value="anios">Años</option>
                <option value="meses">Meses</option>
              </select>
            </div>
          </div>

          {/* Cantidad a amortizar */}
          <div class="form-group" style={{ gridColumn: '1 / -1' }}>
            <label class="form-label" htmlFor="aa-cantidad">
              Cantidad a amortizar anticipadamente
            </label>
            <div class="input-currency" style={{ maxWidth: '320px' }}>
              <input
                id="aa-cantidad"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={cantidadAmortizar}
                onInput={(e) => setCantidadAmortizar((e.target as HTMLInputElement).value)}
                placeholder="20.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
            <span class="form-hint">
              Cantidad extra que quieres destinar a reducir tu hipoteca
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular amortización anticipada
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Resultado de la amortización</p>

          <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
            Nuevo capital pendiente: <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(result.nuevoCapital)}</strong>
          </p>

          {/* Comparison cards */}
          <div class="aa-comparison">
            {/* Reducir cuota */}
            <div class={`aa-method ${result.mejorOpcion === 'reducir_cuota' ? 'aa-method--selected' : ''}`}>
              {result.mejorOpcion === 'reducir_cuota' && (
                <span class="aa-method__badge">Recomendada</span>
              )}
              <p class="aa-method__title">Reducir cuota</p>
              <p class="aa-method__subtitle">Mismo plazo, cuota más baja</p>
              <table class="aa-method__table">
                <tbody>
                  <tr>
                    <td>Nueva cuota mensual</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {formatCurrency(result.nuevaCuota)}
                    </td>
                  </tr>
                  <tr>
                    <td>Ahorro mensual</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                      -{formatCurrency(result.ahorroCuotaMensual)}/mes
                    </td>
                  </tr>
                  <tr>
                    <td>Plazo restante</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {formatMeses(result.comparativa[0].nuevosPlazoMeses)}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Ahorro en intereses</strong></td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 700 }}>
                      {formatCurrency(result.ahorroTotalIntereses)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Reducir plazo */}
            <div class={`aa-method ${result.mejorOpcion === 'reducir_plazo' ? 'aa-method--selected' : ''}`}>
              {result.mejorOpcion === 'reducir_plazo' && (
                <span class="aa-method__badge">Recomendada</span>
              )}
              <p class="aa-method__title">Reducir plazo</p>
              <p class="aa-method__subtitle">Misma cuota, terminas antes</p>
              <table class="aa-method__table">
                <tbody>
                  <tr>
                    <td>Cuota mensual</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {formatCurrency(parseFloat(cuotaActual))}
                    </td>
                  </tr>
                  <tr>
                    <td>Nuevo plazo</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                      {formatMeses(result.nuevosPlazoMeses)}
                    </td>
                  </tr>
                  <tr>
                    <td>Meses ahorrados</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                      {result.mesesAhorrados} meses ({Math.floor(result.mesesAhorrados / 12)} años)
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Ahorro en intereses</strong></td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 700 }}>
                      {formatCurrency(result.ahorroTotalInteresesPlazo)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Savings difference notice */}
          {(() => {
            const diferencia = Math.abs(result.ahorroTotalInteresesPlazo - result.ahorroTotalIntereses);
            if (diferencia <= 0) return null;
            return (
              <div class="aa-notice" role="status">
                <span class="aa-notice__icon">&#9432;</span>
                <p class="aa-notice__text">
                  <strong>Reducir {result.mejorOpcion === 'reducir_plazo' ? 'plazo' : 'cuota'}</strong> te ahorra{' '}
                  <strong>{formatCurrency(diferencia)}</strong> más en intereses que la otra opción.
                  {result.mejorOpcion === 'reducir_plazo'
                    ? ' Aunque la cuota no baja, terminas de pagar antes y el ahorro total es mayor.'
                    : ' En tu caso particular, reducir la cuota es más ventajoso.'}
                </p>
              </div>
            );
          })()}

          {/* Summary comparison table */}
          <table class="calculator__breakdown" style={{ marginTop: 'var(--space-6)' }}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Reducir cuota</th>
                <th>Reducir plazo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cuota mensual</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(result.nuevaCuota)}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(parseFloat(cuotaActual))}</td>
              </tr>
              <tr>
                <td>Plazo restante</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatMeses(result.comparativa[0].nuevosPlazoMeses)}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatMeses(result.nuevosPlazoMeses)}</td>
              </tr>
              <tr>
                <td><strong>Ahorro en intereses</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 700 }}>
                  {formatCurrency(result.ahorroTotalIntereses)}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 700 }}>
                  {formatCurrency(result.ahorroTotalInteresesPlazo)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bar chart: interest savings comparison */}
          {(() => {
            const max = Math.max(result.ahorroTotalIntereses, result.ahorroTotalInteresesPlazo);
            if (max <= 0) return null;
            const pctCuota = (result.ahorroTotalIntereses / max) * 100;
            const pctPlazo = (result.ahorroTotalInteresesPlazo / max) * 100;
            return (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <p class="calculator__inputs-title">Ahorro en intereses</p>
                <div class="aa-bars">
                  <div class="aa-bars__row">
                    <span class="aa-bars__label">Reducir cuota</span>
                    <div class="aa-bars__track">
                      <div
                        class="aa-bars__fill"
                        style={{
                          width: `${pctCuota}%`,
                          backgroundColor: result.mejorOpcion === 'reducir_cuota' ? 'var(--color-accent)' : 'var(--color-success)',
                        }}
                      />
                    </div>
                    <span class="aa-bars__value">{formatCurrency(result.ahorroTotalIntereses)}</span>
                  </div>
                  <div class="aa-bars__row">
                    <span class="aa-bars__label">Reducir plazo</span>
                    <div class="aa-bars__track">
                      <div
                        class="aa-bars__fill"
                        style={{
                          width: `${pctPlazo}%`,
                          backgroundColor: result.mejorOpcion === 'reducir_plazo' ? 'var(--color-accent)' : 'var(--color-success)',
                        }}
                      />
                    </div>
                    <span class="aa-bars__value">{formatCurrency(result.ahorroTotalInteresesPlazo)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p>
                Cálculo orientativo. No sustituye asesoramiento profesional.
                Consulta con tu banco las posibles comisiones por amortización anticipada
                (máximo 0,25% los primeros 3 años o 0,15% después, para tipo variable;
                0,5%-2% para tipo fijo según la ley vigente).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
