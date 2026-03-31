import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularPension } from '@lib/calculations/pensiones';
import CopyButton from './CopyButton';
import type { PensionesData, PensionResult } from '@lib/types';

interface Props {
  pensionesData: PensionesData;
}

export default function PensionJubilacion({ pensionesData }: Props) {
  const [baseCotizacion, setBaseCotizacion] = useState('2000');
  const [aniosCotizados, setAniosCotizados] = useState('35');
  const [edadJubilacion, setEdadJubilacion] = useState('65');
  const [esAnticipada, setEsAnticipada] = useState(false);
  const [anticipadaVoluntaria, setAnticiadaVoluntaria] = useState(true);
  const [tieneConyuge, setTieneConyuge] = useState(false);
  const [hijosCount, setHijosCount] = useState(0);
  const [result, setResult] = useState<PensionResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const base = parseFloat(baseCotizacion);
    if (isNaN(base) || base <= 0) {
      setError('Introduce una base de cotización media válida.');
      return;
    }

    const anios = parseFloat(aniosCotizados);
    if (isNaN(anios) || anios < 0 || anios > 50) {
      setError('Introduce un número de años cotizados entre 0 y 50.');
      return;
    }

    if (anios < 15) {
      setError('Se necesitan al menos 15 años cotizados para acceder a la pensión de jubilación.');
      return;
    }

    const edad = parseFloat(edadJubilacion);
    if (isNaN(edad) || edad < 60 || edad > 70) {
      setError('Introduce una edad de jubilación entre 60 y 70 años.');
      return;
    }

    try {
      const res = calcularPension(
        {
          baseCotizacionMedia: base,
          aniosCotizados: anios,
          edadJubilacion: edad,
          tieneConyuge,
          hijosCount,
          esAnticipada,
          anticipadaVoluntaria,
        },
        pensionesData
      );
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos del trabajador</p>
        <div class="calculator__grid">
          {/* Base de cotización media */}
          <div class="form-group">
            <label class="form-label" htmlFor="pj-base-cotizacion">
              Base de cotización media mensual
            </label>
            <div class="input-currency">
              <input
                id="pj-base-cotizacion"
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
              Media de tus bases de cotización de los últimos 25 años. Aparece en tu nómina como «Base de cotización por contingencias comunes».
            </p>
          </div>

          {/* Años cotizados */}
          <div class="form-group">
            <label class="form-label" htmlFor="pj-anios-cotizados">
              Años cotizados
            </label>
            <input
              id="pj-anios-cotizados"
              type="number"
              class="form-input"
              min="0"
              max="50"
              step="0.5"
              value={aniosCotizados}
              onInput={(e) => setAniosCotizados((e.target as HTMLInputElement).value)}
              placeholder="35"
            />
            <p class="form-hint">
              Total de años cotizados a la Seguridad Social. Consulta tu informe de vida laboral.
            </p>
          </div>

          {/* Edad de jubilación prevista */}
          <div class="form-group">
            <label class="form-label" htmlFor="pj-edad">
              Edad de jubilación prevista
            </label>
            <input
              id="pj-edad"
              type="number"
              class="form-input"
              min="60"
              max="70"
              step="0.5"
              value={edadJubilacion}
              onInput={(e) => setEdadJubilacion((e.target as HTMLInputElement).value)}
              placeholder="65"
            />
            <p class="form-hint">
              Edad ordinaria: 65 años (con 37,5 años cotizados) o 66 años y 6 meses (en caso contrario).
            </p>
          </div>

          {/* Jubilación anticipada */}
          <div class="form-group" style={{ gridColumn: '1 / -1' }}>
            <label class="form-label pj-checkbox-label">
              <input
                type="checkbox"
                checked={esAnticipada}
                onChange={(e) => setEsAnticipada((e.target as HTMLInputElement).checked)}
              />
              {' '}Jubilación anticipada
            </label>

            {esAnticipada && (
              <div class="pj-anticipada-options">
                <label class="form-label pj-radio-label">
                  <input
                    type="radio"
                    name="tipo-anticipada"
                    checked={anticipadaVoluntaria}
                    onChange={() => setAnticiadaVoluntaria(true)}
                  />
                  {' '}Voluntaria
                </label>
                <label class="form-label pj-radio-label">
                  <input
                    type="radio"
                    name="tipo-anticipada"
                    checked={!anticipadaVoluntaria}
                    onChange={() => setAnticiadaVoluntaria(false)}
                  />
                  {' '}Involuntaria (despido, ERE...)
                </label>
              </div>
            )}
          </div>

          {/* Cónyuge a cargo */}
          <div class="form-group">
            <label class="form-label pj-checkbox-label">
              <input
                type="checkbox"
                checked={tieneConyuge}
                onChange={(e) => setTieneConyuge((e.target as HTMLInputElement).checked)}
              />
              {' '}Cónyuge a cargo
            </label>
            <p class="form-hint">
              Afecta a la pensión mínima garantizada.
            </p>
          </div>

          {/* Número de hijos */}
          <div class="form-group">
            <label class="form-label" htmlFor="pj-hijos">
              Número de hijos
            </label>
            <select
              id="pj-hijos"
              class="form-select"
              value={hijosCount}
              onChange={(e) => setHijosCount(parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              <option value={0}>0 hijos</option>
              <option value={1}>1 hijo</option>
              <option value={2}>2 hijos</option>
              <option value={3}>3 hijos</option>
              <option value={4}>4 hijos</option>
              <option value={5}>5 hijos</option>
            </select>
            <p class="form-hint">
              Se aplica el complemento por brecha de género ({formatCurrency(pensionesData.complementoBrecha.porHijo)}/hijo).
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
        Calcular pensión
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Tu pensión de jubilación estimada</p>

          <div class="calculator__result-main">
            {formatCurrency(result.pensionBrutaMensual)}
          </div>
          <p class="calculator__result-label">
            Pensión mensual estimada (14 pagas)
          </p>
          <CopyButton text={`Pensión mensual: ${formatCurrency(result.pensionBrutaMensual)}`} />

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
                {formatCurrency(result.pensionBrutaAnual)}
              </p>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 0,
              }}>
                Pensión anual (14 pagas)
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
                {formatCurrency(result.baseReguladora)}
              </p>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 0,
              }}>
                Base reguladora
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
                {formatPercent(result.porcentajePorAnios, 2)}
              </p>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 0,
              }}>
                Porcentaje por años cotizados
              </p>
            </div>
          </div>

          {/* Notices */}
          {result.reduccionAnticipada > 0 && (
            <div class="calculator__disclaimer" style={{ marginBottom: 'var(--space-4)' }}>
              <span class="calculator__disclaimer-icon" aria-hidden="true">!</span>
              <div>
                <p style={{ marginBottom: 0 }}>
                  <strong>Jubilación anticipada:</strong> se ha aplicado una reducción del {formatPercent(result.reduccionAnticipada, 2)} por jubilarte antes de la edad ordinaria ({result.edadOrdinaria} años).
                </p>
              </div>
            </div>
          )}

          {result.pensionMaximaAplicada && (
            <div class="calculator__disclaimer" style={{ marginBottom: 'var(--space-4)' }}>
              <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
              <div>
                <p style={{ marginBottom: 0 }}>
                  Se ha aplicado el <strong>tope máximo</strong> de pensión: {formatCurrency(pensionesData.topesYMinimos.pensionMaxima2026)}/mes.
                </p>
              </div>
            </div>
          )}

          {result.pensionMinimaAplicada && (
            <div class="calculator__disclaimer" style={{ marginBottom: 'var(--space-4)' }}>
              <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
              <div>
                <p style={{ marginBottom: 0 }}>
                  Se ha aplicado la <strong>pensión mínima</strong> garantizada: {formatCurrency(tieneConyuge ? pensionesData.topesYMinimos.pensionMinima65ConConyuge : pensionesData.topesYMinimos.pensionMinima65SinConyuge)}/mes {tieneConyuge ? '(con cónyuge a cargo)' : '(sin cónyuge a cargo)'}.
                </p>
              </div>
            </div>
          )}

          {/* Breakdown table */}
          <table class="calculator__breakdown">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base reguladora</td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {formatCurrency(result.baseReguladora)}
                </td>
              </tr>
              <tr>
                <td>Porcentaje por {aniosCotizados} años cotizados</td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {formatPercent(result.porcentajePorAnios, 2)}
                </td>
              </tr>
              <tr>
                <td>Pensión base (antes de ajustes)</td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {formatCurrency(result.baseReguladora * result.porcentajePorAnios / 100)}
                </td>
              </tr>
              {result.reduccionAnticipada > 0 && (
                <tr>
                  <td>Reducción por jubilación anticipada</td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--color-error, #c53030)' }}>
                    -{formatPercent(result.reduccionAnticipada, 2)}
                  </td>
                </tr>
              )}
              {result.complementoBrecha > 0 && (
                <tr>
                  <td>Complemento brecha de género ({hijosCount} {hijosCount === 1 ? 'hijo' : 'hijos'})</td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--color-success, #2f7d3a)' }}>
                    +{formatCurrency(result.complementoBrecha)}
                  </td>
                </tr>
              )}
              <tr class="calculator__breakdown-total">
                <td><strong>Pensión mensual</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  <strong>{formatCurrency(result.pensionBrutaMensual)}</strong>
                </td>
              </tr>
              <tr class="calculator__breakdown-total">
                <td><strong>Pensión anual (14 pagas)</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  <strong>{formatCurrency(result.pensionBrutaAnual)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Info box */}
          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Edad ordinaria de jubilación:</strong> {result.edadOrdinaria} años (según tus años cotizados).
              </p>
              <p style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Pensión máxima 2026:</strong> {formatCurrency(pensionesData.topesYMinimos.pensionMaxima2026)}/mes
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>Pensión mínima 2026:</strong> {formatCurrency(tieneConyuge ? pensionesData.topesYMinimos.pensionMinima65ConConyuge : pensionesData.topesYMinimos.pensionMinima65SinConyuge)}/mes {tieneConyuge ? '(con cónyuge)' : '(sin cónyuge)'}
              </p>
            </div>
          </div>

          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-4)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p style={{ marginBottom: 0 }}>
                Cálculo orientativo. No sustituye asesoramiento profesional.
                La base reguladora real se calcula con las bases de cotización de los últimos
                25 años (300 meses) divididas entre 350. Las pensiones están sujetas a retención de IRPF.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
