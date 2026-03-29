import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularPrestacionDesempleo } from '@lib/calculations/desempleo';
import type { DesempleoData, DesempleoResult } from '@lib/types';

interface Props {
  desempleoData: DesempleoData;
}

const OPCIONES_DIAS_COTIZADOS = [
  { value: '', label: 'Introduce los días o selecciona...' },
  { value: '360', label: '1 año (360 días)' },
  { value: '540', label: '1,5 años (540 días)' },
  { value: '720', label: '2 años (720 días)' },
  { value: '1080', label: '3 años (1.080 días)' },
  { value: '1440', label: '4 años (1.440 días)' },
  { value: '1800', label: '5 años (1.800 días)' },
  { value: '2160', label: '6 años (2.160 días)' },
];

export default function PrestacionDesempleo({ desempleoData }: Props) {
  const [baseCotizacion, setBaseCotizacion] = useState('2000');
  const [diasCotizados, setDiasCotizados] = useState('720');
  const [hijosCount, setHijosCount] = useState(0);
  const [result, setResult] = useState<DesempleoResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const base = parseFloat(baseCotizacion);
    if (isNaN(base) || base <= 0) {
      setError('Introduce una base de cotización válida.');
      return;
    }

    const dias = parseInt(diasCotizados, 10);
    if (isNaN(dias) || dias < 0) {
      setError('Introduce un número válido de días cotizados.');
      return;
    }

    try {
      const res = calcularPrestacionDesempleo(
        {
          baseCotizacionMedia: base,
          diasCotizados: dias,
          hijosCount,
        },
        desempleoData
      );
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function handleSelectDias(value: string) {
    if (value !== '') {
      setDiasCotizados(value);
    }
  }

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos del trabajador</p>
        <div class="calculator__grid">
          {/* Base de cotización media */}
          <div class="form-group">
            <label class="form-label" htmlFor="de-base-cotizacion">
              Base de cotización media mensual
            </label>
            <div class="input-currency">
              <input
                id="de-base-cotizacion"
                type="number"
                class="form-input"
                min="0"
                step="50"
                value={baseCotizacion}
                onInput={(e) => setBaseCotizacion((e.target as HTMLInputElement).value)}
                placeholder="2.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
            <p class="form-hint">
              Aparece en tu nómina como «Base de cotización por contingencias comunes». Se usa la media de los últimos 180 días.
            </p>
          </div>

          {/* Días cotizados */}
          <div class="form-group">
            <label class="form-label" htmlFor="de-dias-cotizados">
              Días cotizados en los últimos 6 años
            </label>
            <input
              id="de-dias-cotizados"
              type="number"
              class="form-input"
              min="0"
              step="1"
              value={diasCotizados}
              onInput={(e) => setDiasCotizados((e.target as HTMLInputElement).value)}
              placeholder="720"
            />
            <select
              class="form-select"
              style={{ marginTop: 'var(--space-2)' }}
              onChange={(e) => handleSelectDias((e.target as HTMLSelectElement).value)}
            >
              {OPCIONES_DIAS_COTIZADOS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p class="form-hint">
              Mínimo 360 días (1 año) para tener derecho a prestación. Consulta tu informe de vida laboral.
            </p>
          </div>

          {/* Hijos a cargo */}
          <div class="form-group">
            <label class="form-label" htmlFor="de-hijos">
              Hijos a cargo
            </label>
            <select
              id="de-hijos"
              class="form-select"
              value={hijosCount}
              onChange={(e) => setHijosCount(parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              <option value={0}>Sin hijos a cargo</option>
              <option value={1}>1 hijo a cargo</option>
              <option value={2}>2 hijos a cargo</option>
              <option value={3}>3 hijos a cargo</option>
              <option value={4}>4 hijos a cargo</option>
              <option value={5}>5 o más hijos a cargo</option>
            </select>
            <p class="form-hint">
              Los hijos a cargo afectan a los topes máximo y mínimo de la prestación.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular prestación
      </button>

      {result && !result.tieneDerechoPrestacion && (
        <div class="calculator__results" aria-live="polite">
          <div class="calculator__disclaimer">
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p>
                <strong>No alcanzas el mínimo de 360 días cotizados</strong> (1 año) para acceder
                a la prestación contributiva por desempleo. Con {diasCotizados} días cotizados,
                necesitas al menos {Math.max(0, 360 - parseInt(diasCotizados, 10))} días más
                de cotización.
              </p>
              <p style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                Podrías tener derecho al <strong>subsidio por desempleo</strong> (ayuda asistencial)
                si cumples los requisitos de carencia de rentas. Consulta con el SEPE.
              </p>
            </div>
          </div>
        </div>
      )}

      {result && result.tieneDerechoPrestacion && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Tu prestación por desempleo</p>

          <div class="calculator__result-main">
            {formatCurrency(result.importePrimeros180Dias)}
          </div>
          <p class="calculator__result-label">
            Prestación mensual (primeros 6 meses)
          </p>

          {/* Secondary results */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            textAlign: 'center',
          }}>
            <div>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.35rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: 'var(--space-1)',
              }}>
                {formatCurrency(result.importeResto)}
              </p>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 0,
              }}>
                A partir del mes 7
              </p>
            </div>
            <div>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.35rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: 'var(--space-1)',
              }}>
                {result.duracionMeses} meses
              </p>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 0,
              }}>
                Duración total
              </p>
            </div>
            <div>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.35rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: 'var(--space-1)',
              }}>
                {formatCurrency(result.totalEstimado)}
              </p>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 0,
              }}>
                Total estimado
              </p>
            </div>
          </div>

          {/* Bar chart: primeros 6 meses vs resto */}
          {result.desglose.length === 2 && (() => {
            const total = result.totalEstimado;
            const pct1 = total > 0 ? (result.desglose[0].subtotal / total) * 100 : 50;
            const pct2 = total > 0 ? (result.desglose[1].subtotal / total) * 100 : 50;
            return (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div class="calculator__bar">
                  <div
                    class="calculator__bar-segment calculator__bar-segment--neto"
                    style={{ width: `${pct1}%` }}
                  />
                  <div
                    class="calculator__bar-segment calculator__bar-segment--irpf"
                    style={{ width: `${pct2}%` }}
                  />
                </div>
                <div class="calculator__bar-legend">
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                    Primeros 6 meses ({formatPercent(pct1, 0)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-warning)' }} />
                    Resto ({formatPercent(pct2, 0)})
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Desglose table */}
          <table class="calculator__breakdown">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Meses</th>
                <th>Importe mensual</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {result.desglose.map((item) => (
                <tr key={item.periodo}>
                  <td>{item.periodo}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                    {item.meses}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                    {formatCurrency(item.importeMensual)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
              <tr class="calculator__breakdown-total">
                <td><strong>Total estimado</strong></td>
                <td></td>
                <td></td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  <strong>{formatCurrency(result.totalEstimado)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Info box with applied caps */}
          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Base reguladora:</strong> {formatCurrency(result.baseReguladora)}/mes
              </p>
              <p style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Tope máximo aplicado:</strong> {formatCurrency(result.topeAplicado)}/mes
                {hijosCount === 0 && ' (sin hijos)'}
                {hijosCount === 1 && ' (1 hijo)'}
                {hijosCount >= 2 && ` (${hijosCount} hijos)`}
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>Mínimo garantizado:</strong> {formatCurrency(result.minimoAplicado)}/mes
                {hijosCount === 0 && ' (sin hijos)'}
                {hijosCount > 0 && ' (con hijos)'}
              </p>
            </div>
          </div>

          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-4)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p style={{ marginBottom: 0 }}>
                La prestación por desempleo está sujeta a <strong>retención de IRPF</strong> y
                a <strong>cotización a la Seguridad Social</strong>. Los importes mostrados son
                brutos. El importe neto que recibirás en tu cuenta será inferior.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
