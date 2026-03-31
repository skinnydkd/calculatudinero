import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularHipoteca, calcularGastosCompra } from '@lib/calculations/vivienda';
import CopyButton from './CopyButton';
import type {
  HipotecaReferenceData,
  ITPData,
  HipotecaResult,
  GastosCompraResult,
  ComunidadAutonoma,
} from '@lib/types';
import { CCAA_OPTIONS } from '@lib/types';

interface Props {
  hipotecaData: HipotecaReferenceData;
  itpData: ITPData;
}

type Tab = 'hipoteca' | 'gastos';

export default function CalculadoraHipoteca({ hipotecaData, itpData }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('hipoteca');

  // --- Hipoteca inputs ---
  const [precioVivienda, setPrecioVivienda] = useState('200000');
  const [ahorroInicial, setAhorroInicial] = useState('40000');
  const [plazoAnios, setPlazoAnios] = useState('25');
  const [tipoHipoteca, setTipoHipoteca] = useState<'fijo' | 'variable'>('fijo');
  const [tipoInteresFijo, setTipoInteresFijo] = useState(
    String(hipotecaData.tiposReferencia.fijo.media)
  );
  const [diferencialVariable, setDiferencialVariable] = useState(
    String(hipotecaData.tiposReferencia.variable.diferencial.media)
  );
  const [hipotecaResult, setHipotecaResult] = useState<HipotecaResult | null>(null);
  const [showAmortizacion, setShowAmortizacion] = useState(false);

  // --- Gastos inputs ---
  const [ccaa, setCcaa] = useState<ComunidadAutonoma>('madrid');
  const [esViviendaNueva, setEsViviendaNueva] = useState(false);
  const [aplicaTipoReducido, setAplicaTipoReducido] = useState(false);
  const [gastosResult, setGastosResult] = useState<GastosCompraResult | null>(null);

  // --- Errors ---
  const [error, setError] = useState('');

  function handleCalcularHipoteca() {
    setError('');

    const precio = parseFloat(precioVivienda);
    const ahorro = parseFloat(ahorroInicial);
    const plazo = parseInt(plazoAnios, 10);

    if (isNaN(precio) || precio <= 0) {
      setError('Introduce un precio de vivienda válido.');
      return;
    }
    if (isNaN(ahorro) || ahorro < 0) {
      setError('Introduce un ahorro inicial válido.');
      return;
    }
    if (ahorro >= precio) {
      setError('El ahorro inicial no puede ser mayor o igual al precio de la vivienda.');
      return;
    }
    if (isNaN(plazo) || plazo < hipotecaData.plazoMinimo || plazo > hipotecaData.plazoMaximo) {
      setError(`El plazo debe estar entre ${hipotecaData.plazoMinimo} y ${hipotecaData.plazoMaximo} años.`);
      return;
    }

    let tipoInteres: number;
    if (tipoHipoteca === 'fijo') {
      tipoInteres = parseFloat(tipoInteresFijo);
      if (isNaN(tipoInteres) || tipoInteres < 0 || tipoInteres > 20) {
        setError('Introduce un tipo de interés válido (0-20%).');
        return;
      }
    } else {
      const diferencial = parseFloat(diferencialVariable);
      if (isNaN(diferencial) || diferencial < 0 || diferencial > 10) {
        setError('Introduce un diferencial válido (0-10%).');
        return;
      }
      tipoInteres = hipotecaData.euribor.actual + diferencial;
    }

    try {
      const res = calcularHipoteca(
        {
          precioVivienda: precio,
          ahorroInicial: ahorro,
          plazoAnios: plazo,
          tipoInteres,
          tipoHipoteca,
          diferencialVariable: parseFloat(diferencialVariable),
          euriborActual: hipotecaData.euribor.actual,
        },
        hipotecaData
      );
      setHipotecaResult(res);
      setShowAmortizacion(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function handleCalcularGastos() {
    setError('');

    const precio = parseFloat(precioVivienda);
    if (isNaN(precio) || precio <= 0) {
      setError('Introduce un precio de vivienda válido.');
      return;
    }

    try {
      const res = calcularGastosCompra(
        {
          precioVivienda: precio,
          ccaa,
          esViviendaNueva,
          aplicaTipoReducido,
        },
        hipotecaData,
        itpData
      );
      setGastosResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function barPercents(r: HipotecaResult) {
    const total = r.totalPagado;
    if (total <= 0) return { capital: 0, intereses: 0 };
    return {
      capital: (r.capitalPrestamo / total) * 100,
      intereses: (r.totalIntereses / total) * 100,
    };
  }

  const ccaaItpData = itpData.tiposPorCcaa[ccaa];

  return (
    <div class="calculator">
      {/* Tab buttons */}
      <div class="calculator__tabs" role="tablist" aria-label="Secciones de la calculadora">
        <button
          role="tab"
          aria-selected={activeTab === 'hipoteca'}
          class={`calculator__tab ${activeTab === 'hipoteca' ? 'calculator__tab--active' : ''}`}
          onClick={() => { setActiveTab('hipoteca'); setError(''); }}
        >
          Simulador de hipoteca
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'gastos'}
          class={`calculator__tab ${activeTab === 'gastos' ? 'calculator__tab--active' : ''}`}
          onClick={() => { setActiveTab('gastos'); setError(''); }}
        >
          Gastos de compra
        </button>
      </div>

      {/* ================================================================
          TAB 1: Simulador de hipoteca
          ================================================================ */}
      {activeTab === 'hipoteca' && (
        <>
          <div class="calculator__inputs">
            <p class="calculator__inputs-title">Datos de la hipoteca</p>
            <div class="calculator__grid">
              {/* Precio de la vivienda */}
              <div class="form-group">
                <label class="form-label" htmlFor="hip-precio">
                  Precio de la vivienda
                </label>
                <div class="input-currency">
                  <input
                    id="hip-precio"
                    type="number"
                    class="form-input"
                    min="0"
                    step="5000"
                    value={precioVivienda}
                    onInput={(e) => setPrecioVivienda((e.target as HTMLInputElement).value)}
                    placeholder="200.000"
                  />
                  <span class="input-currency__symbol">&euro;</span>
                </div>
              </div>

              {/* Ahorro inicial */}
              <div class="form-group">
                <label class="form-label" htmlFor="hip-ahorro">
                  Ahorro inicial / entrada
                </label>
                <div class="input-currency">
                  <input
                    id="hip-ahorro"
                    type="number"
                    class="form-input"
                    min="0"
                    step="1000"
                    value={ahorroInicial}
                    onInput={(e) => setAhorroInicial((e.target as HTMLInputElement).value)}
                    placeholder="40.000"
                  />
                  <span class="input-currency__symbol">&euro;</span>
                </div>
              </div>

              {/* Plazo */}
              <div class="form-group">
                <label class="form-label" htmlFor="hip-plazo">
                  Plazo ({plazoAnios} años)
                </label>
                <input
                  id="hip-plazo"
                  type="range"
                  class="form-range"
                  min={hipotecaData.plazoMinimo}
                  max={hipotecaData.plazoMaximo}
                  step="1"
                  value={plazoAnios}
                  onInput={(e) => setPlazoAnios((e.target as HTMLInputElement).value)}
                />
                <div class="form-hint" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{hipotecaData.plazoMinimo} años</span>
                  <span>{hipotecaData.plazoMaximo} años</span>
                </div>
              </div>

              {/* Tipo de hipoteca */}
              <div class="form-group">
                <span class="form-label">Tipo de hipoteca</span>
                <div class="radio-group" role="radiogroup" aria-label="Tipo de hipoteca">
                  <div class="radio-option">
                    <input
                      type="radio"
                      id="hip-tipo-fijo"
                      name="hip-tipo"
                      value="fijo"
                      checked={tipoHipoteca === 'fijo'}
                      onChange={() => setTipoHipoteca('fijo')}
                    />
                    <label htmlFor="hip-tipo-fijo">Tipo fijo</label>
                  </div>
                  <div class="radio-option">
                    <input
                      type="radio"
                      id="hip-tipo-variable"
                      name="hip-tipo"
                      value="variable"
                      checked={tipoHipoteca === 'variable'}
                      onChange={() => setTipoHipoteca('variable')}
                    />
                    <label htmlFor="hip-tipo-variable">Tipo variable</label>
                  </div>
                </div>
              </div>

              {/* Tipo de interés (fijo) */}
              {tipoHipoteca === 'fijo' && (
                <div class="form-group">
                  <label class="form-label" htmlFor="hip-interes-fijo">
                    Tipo de interés anual
                  </label>
                  <div class="input-currency">
                    <input
                      id="hip-interes-fijo"
                      type="number"
                      class="form-input"
                      min="0"
                      max="20"
                      step="0.1"
                      value={tipoInteresFijo}
                      onInput={(e) => setTipoInteresFijo((e.target as HTMLInputElement).value)}
                    />
                    <span class="input-currency__symbol">%</span>
                  </div>
                  <p class="form-hint">
                    Media de mercado: {formatPercent(hipotecaData.tiposReferencia.fijo.media)}
                    {' '}(rango {formatPercent(hipotecaData.tiposReferencia.fijo.min)} - {formatPercent(hipotecaData.tiposReferencia.fijo.max)})
                  </p>
                </div>
              )}

              {/* Diferencial (variable) */}
              {tipoHipoteca === 'variable' && (
                <div class="form-group">
                  <label class="form-label" htmlFor="hip-diferencial">
                    Diferencial sobre Euríbor
                  </label>
                  <div class="input-currency">
                    <input
                      id="hip-diferencial"
                      type="number"
                      class="form-input"
                      min="0"
                      max="10"
                      step="0.1"
                      value={diferencialVariable}
                      onInput={(e) => setDiferencialVariable((e.target as HTMLInputElement).value)}
                    />
                    <span class="input-currency__symbol">%</span>
                  </div>
                  <p class="form-hint">
                    Euríbor actual: {formatPercent(hipotecaData.euribor.actual)} ({hipotecaData.euribor.fecha})
                    {' + '} diferencial = {formatPercent(hipotecaData.euribor.actual + parseFloat(diferencialVariable || '0'))}
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
              {error}
            </p>
          )}

          <button class="btn btn--primary btn--large" onClick={handleCalcularHipoteca}>
            Calcular hipoteca
          </button>

          {hipotecaResult && (
            <div class="calculator__results" aria-live="polite">
              <p class="calculator__results-title">Tu cuota mensual</p>

              <div class="calculator__result-main">
                {formatCurrency(hipotecaResult.cuotaMensual)}
              </div>
              <p class="calculator__result-label">
                Cuota mensual durante {plazoAnios} años
                {tipoHipoteca === 'variable' && ' (al tipo actual)'}
              </p>
              <CopyButton text={`Cuota mensual: ${formatCurrency(hipotecaResult.cuotaMensual)}`} />

              <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-6)' }}>
                Total intereses: <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(hipotecaResult.totalIntereses)}
                </strong>
                {' — '}
                Total pagado: <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(hipotecaResult.totalPagado)}
                </strong>
              </p>

              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                Capital: {formatCurrency(hipotecaResult.capitalPrestamo)}
                {' — '}
                Financiación: {formatPercent(hipotecaResult.porcentajeFinanciacion)}
              </p>

              {/* Bar chart: capital vs intereses */}
              {(() => {
                const pct = barPercents(hipotecaResult);
                return (
                  <>
                    <div class="calculator__bar" aria-hidden="true">
                      <div
                        class="calculator__bar-segment calculator__bar-segment--neto"
                        style={{ width: `${pct.capital}%` }}
                      />
                      <div
                        class="calculator__bar-segment calculator__bar-segment--irpf"
                        style={{ width: `${pct.intereses}%` }}
                      />
                    </div>
                    <div class="calculator__bar-legend">
                      <span class="calculator__bar-legend-item">
                        <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                        Capital ({formatPercent(pct.capital, 1)})
                      </span>
                      <span class="calculator__bar-legend-item">
                        <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-warning)' }} />
                        Intereses ({formatPercent(pct.intereses, 1)})
                      </span>
                    </div>
                  </>
                );
              })()}

              {/* Cuadro de amortización */}
              <div style={{ marginTop: 'var(--space-6)' }}>
                <button
                  class="btn btn--secondary"
                  onClick={() => setShowAmortizacion(!showAmortizacion)}
                  aria-expanded={showAmortizacion}
                >
                  {showAmortizacion ? 'Ocultar' : 'Ver'} cuadro de amortización
                </button>

                {showAmortizacion && (
                  <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
                    <table class="calculator__breakdown">
                      <thead>
                        <tr>
                          <th>Año</th>
                          <th>Capital pendiente</th>
                          <th>Capital amortizado</th>
                          <th>Intereses</th>
                          <th>Cuota anual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hipotecaResult.cuadroAmortizacion.map((row) => (
                          <tr key={row.anio}>
                            <td>{row.anio}</td>
                            <td>{formatCurrency(row.capitalPendiente)}</td>
                            <td>{formatCurrency(row.capitalAmortizado)}</td>
                            <td>{formatCurrency(row.interesesAnuales)}</td>
                            <td>{formatCurrency(row.cuotaAnual)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {tipoHipoteca === 'variable' && (
                <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
                  <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
                  <div>
                    <p>
                      En una hipoteca a tipo variable, la cuota se recalcula en cada revisión (normalmente anual)
                      según el Euríbor vigente. Esta simulación usa el Euríbor actual ({formatPercent(hipotecaData.euribor.actual)})
                      como referencia constante durante todo el plazo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ================================================================
          TAB 2: Gastos de compra
          ================================================================ */}
      {activeTab === 'gastos' && (
        <>
          <div class="calculator__inputs">
            <p class="calculator__inputs-title">Datos de la compra</p>
            <div class="calculator__grid">
              {/* Precio de la vivienda (shared) */}
              <div class="form-group">
                <label class="form-label" htmlFor="gc-precio">
                  Precio de la vivienda
                </label>
                <div class="input-currency">
                  <input
                    id="gc-precio"
                    type="number"
                    class="form-input"
                    min="0"
                    step="5000"
                    value={precioVivienda}
                    onInput={(e) => setPrecioVivienda((e.target as HTMLInputElement).value)}
                    placeholder="200.000"
                  />
                  <span class="input-currency__symbol">&euro;</span>
                </div>
              </div>

              {/* CCAA */}
              <div class="form-group">
                <label class="form-label" htmlFor="gc-ccaa">
                  Comunidad Autónoma
                </label>
                <select
                  id="gc-ccaa"
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

              {/* Tipo vivienda */}
              <div class="form-group">
                <span class="form-label">Tipo de vivienda</span>
                <div class="radio-group" role="radiogroup" aria-label="Tipo de vivienda">
                  <div class="radio-option">
                    <input
                      type="radio"
                      id="gc-usada"
                      name="gc-tipo-vivienda"
                      value="usada"
                      checked={!esViviendaNueva}
                      onChange={() => setEsViviendaNueva(false)}
                    />
                    <label htmlFor="gc-usada">De segunda mano (ITP)</label>
                  </div>
                  <div class="radio-option">
                    <input
                      type="radio"
                      id="gc-nueva"
                      name="gc-tipo-vivienda"
                      value="nueva"
                      checked={esViviendaNueva}
                      onChange={() => setEsViviendaNueva(true)}
                    />
                    <label htmlFor="gc-nueva">Obra nueva (IVA)</label>
                  </div>
                </div>
              </div>

              {/* Tipo reducido (solo para vivienda usada) */}
              {!esViviendaNueva && ccaaItpData && (
                <div class="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingTop: 'var(--space-6)' }}>
                  <input
                    type="checkbox"
                    id="gc-reducido"
                    checked={aplicaTipoReducido}
                    onChange={(e) => setAplicaTipoReducido((e.target as HTMLInputElement).checked)}
                  />
                  <label htmlFor="gc-reducido" class="form-label" style={{ marginBottom: 0 }}>
                    Aplico tipo reducido ({formatPercent(ccaaItpData.reducido)})
                  </label>
                </div>
              )}

              {!esViviendaNueva && ccaaItpData && ccaaItpData.tipo !== ccaaItpData.reducido && (
                <div class="calculator__grid--full">
                  <p class="form-hint">
                    <strong>{ccaaItpData.nombre}:</strong> tipo general {formatPercent(ccaaItpData.tipo)}, reducido {formatPercent(ccaaItpData.reducido)}.
                    {' '}{ccaaItpData.notaReducido}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
              {error}
            </p>
          )}

          <button class="btn btn--primary btn--large" onClick={handleCalcularGastos}>
            Calcular gastos
          </button>

          {gastosResult && (
            <div class="calculator__results" aria-live="polite">
              <p class="calculator__results-title">Gastos de compra</p>

              <div class="calculator__result-main">
                {formatCurrency(gastosResult.totalGastos)}
              </div>
              <p class="calculator__result-label">
                Total gastos asociados a la compra
              </p>

              <table class="calculator__breakdown" style={{ marginTop: 'var(--space-4)' }}>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{gastosResult.impuestoNombre}</td>
                    <td>{formatCurrency(gastosResult.impuesto)}</td>
                  </tr>
                  <tr>
                    <td>Notaría ({formatPercent(hipotecaData.gastosCompra.notaria.porcentaje)})</td>
                    <td>{formatCurrency(gastosResult.notaria)}</td>
                  </tr>
                  <tr>
                    <td>Registro ({formatPercent(hipotecaData.gastosCompra.registro.porcentaje)})</td>
                    <td>{formatCurrency(gastosResult.registro)}</td>
                  </tr>
                  <tr>
                    <td>Gestoría</td>
                    <td>{formatCurrency(gastosResult.gestoria)}</td>
                  </tr>
                  <tr>
                    <td>Tasación</td>
                    <td>{formatCurrency(gastosResult.tasacion)}</td>
                  </tr>
                  <tr>
                    <td><strong>Total gastos</strong></td>
                    <td><strong>{formatCurrency(gastosResult.totalGastos)}</strong></td>
                  </tr>
                </tbody>
              </table>

              {/* Total necesario */}
              <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                  Total necesario (precio + gastos)
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700 }}>
                  {formatCurrency(gastosResult.totalConPrecio)}
                </p>
                <p class="form-hint">
                  Precio vivienda ({formatCurrency(parseFloat(precioVivienda))}) + gastos ({formatCurrency(gastosResult.totalGastos)})
                </p>
              </div>

              <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
                <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
                <div>
                  <p>
                    Los gastos de notaría, registro y gestoría son aproximaciones.
                    El importe real puede variar según la complejidad de la escritura y los aranceles vigentes.
                    {' '}
                    {esViviendaNueva
                      ? 'La vivienda nueva tributa por IVA (10%) más Actos Jurídicos Documentados (AJD).'
                      : 'La vivienda de segunda mano tributa por el Impuesto de Transmisiones Patrimoniales (ITP), cuyo tipo varía por comunidad autónoma.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
