import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularPlusvalia } from '@lib/calculations/impuestos';
import type { PlusvaliaData, PlusvaliaResult } from '@lib/types';

interface Props {
  plusvaliaData: PlusvaliaData;
}

export default function PlusvaliaMunicipal({ plusvaliaData }: Props) {
  const [valorAdquisicion, setValorAdquisicion] = useState('150000');
  const [valorTransmision, setValorTransmision] = useState('200000');
  const [valorCatastral, setValorCatastral] = useState('80000');
  const [porcentajeSuelo, setPorcentajeSuelo] = useState(
    String(plusvaliaData.porcentajeSueloDefault)
  );
  const [aniosPropiedad, setAniosPropiedad] = useState('10');
  const [tipoImpositivo, setTipoImpositivo] = useState(
    String(plusvaliaData.tipoImpositivoComun)
  );
  const [result, setResult] = useState<PlusvaliaResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const adquisicion = parseFloat(valorAdquisicion);
    const transmision = parseFloat(valorTransmision);
    const catastral = parseFloat(valorCatastral);
    const suelo = parseFloat(porcentajeSuelo);
    const anios = parseInt(aniosPropiedad, 10);
    const tipo = parseFloat(tipoImpositivo);

    if (isNaN(adquisicion) || adquisicion <= 0) {
      setError('Introduce un valor de adquisición válido.');
      return;
    }
    if (isNaN(transmision) || transmision <= 0) {
      setError('Introduce un valor de transmisión válido.');
      return;
    }
    if (isNaN(catastral) || catastral <= 0) {
      setError('Introduce un valor catastral válido.');
      return;
    }
    if (isNaN(suelo) || suelo <= 0 || suelo > 100) {
      setError('El porcentaje de suelo debe estar entre 1 y 100.');
      return;
    }
    if (isNaN(anios) || anios < 1) {
      setError('Los años de propiedad deben ser al menos 1.');
      return;
    }
    if (isNaN(tipo) || tipo <= 0 || tipo > plusvaliaData.tipoImpositivoMaximo) {
      setError(
        `El tipo impositivo debe estar entre 0 y ${plusvaliaData.tipoImpositivoMaximo}%.`
      );
      return;
    }

    try {
      const res = calcularPlusvalia(
        {
          valorAdquisicion: adquisicion,
          valorTransmision: transmision,
          valorCatastral: catastral,
          porcentajeSuelo: suelo,
          aniosPropiedad: anios,
          tipoImpositivo: tipo,
        },
        plusvaliaData
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
        <p class="calculator__inputs-title">Datos de la transmisión</p>
        <div class="calculator__grid">
          {/* Valor de adquisición */}
          <div class="form-group">
            <label class="form-label" htmlFor="pv-adquisicion">
              Valor de adquisición (€)
            </label>
            <div class="input-currency">
              <input
                id="pv-adquisicion"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={valorAdquisicion}
                onInput={(e) =>
                  setValorAdquisicion((e.target as HTMLInputElement).value)
                }
                placeholder="150.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
            <span class="form-hint">Precio de compra o valor de la escritura</span>
          </div>

          {/* Valor de transmisión */}
          <div class="form-group">
            <label class="form-label" htmlFor="pv-transmision">
              Valor de transmisión (€)
            </label>
            <div class="input-currency">
              <input
                id="pv-transmision"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={valorTransmision}
                onInput={(e) =>
                  setValorTransmision((e.target as HTMLInputElement).value)
                }
                placeholder="200.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
            <span class="form-hint">Precio de venta o valor de la escritura</span>
          </div>

          {/* Valor catastral total */}
          <div class="form-group">
            <label class="form-label" htmlFor="pv-catastral">
              Valor catastral total (€)
            </label>
            <div class="input-currency">
              <input
                id="pv-catastral"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={valorCatastral}
                onInput={(e) =>
                  setValorCatastral((e.target as HTMLInputElement).value)
                }
                placeholder="80.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
            <span class="form-hint">Aparece en el recibo del IBI</span>
          </div>

          {/* Porcentaje suelo */}
          <div class="form-group">
            <label class="form-label" htmlFor="pv-suelo">
              Porcentaje del suelo (%)
            </label>
            <div class="input-currency">
              <input
                id="pv-suelo"
                type="number"
                class="form-input"
                min="1"
                max="100"
                step="1"
                value={porcentajeSuelo}
                onInput={(e) =>
                  setPorcentajeSuelo((e.target as HTMLInputElement).value)
                }
                placeholder="50"
              />
              <span class="input-currency__symbol">%</span>
            </div>
            <span class="form-hint">
              Aparece en el recibo del IBI como porcentaje del valor catastral
              que corresponde al suelo
            </span>
          </div>

          {/* Años de propiedad */}
          <div class="form-group">
            <label class="form-label" htmlFor="pv-anios">
              Años de propiedad
            </label>
            <select
              id="pv-anios"
              class="form-select"
              value={aniosPropiedad}
              onChange={(e) =>
                setAniosPropiedad((e.target as HTMLSelectElement).value)
              }
            >
              {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'año' : 'años'}{n >= 20 ? ' o más' : ''}
                </option>
              ))}
            </select>
            <span class="form-hint">
              Tiempo entre la adquisición y la transmisión
            </span>
          </div>

          {/* Tipo impositivo municipal */}
          <div class="form-group">
            <label class="form-label" htmlFor="pv-tipo">
              Tipo impositivo municipal (%)
            </label>
            <div class="input-currency">
              <input
                id="pv-tipo"
                type="number"
                class="form-input"
                min="0"
                max={plusvaliaData.tipoImpositivoMaximo}
                step="0.5"
                value={tipoImpositivo}
                onInput={(e) =>
                  setTipoImpositivo((e.target as HTMLInputElement).value)
                }
                placeholder="30"
              />
              <span class="input-currency__symbol">%</span>
            </div>
            <span class="form-hint">
              El máximo legal es el {plusvaliaData.tipoImpositivoMaximo}%.
              Consulta la ordenanza fiscal de tu municipio.
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p
          style={{
            color: 'var(--color-error, #c53030)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular plusvalía
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          {/* No increment — STC 182/2021 */}
          {!result.hayIncrementoReal ? (
            <>
              <div
                class="plusvalia-notice plusvalia-notice--success"
                role="status"
              >
                <span class="plusvalia-notice__icon">&#10003;</span>
                <div>
                  <p class="plusvalia-notice__title">
                    No debes tributar por plusvalía municipal
                  </p>
                  <p class="plusvalia-notice__text">
                    No existe incremento de valor real (vendiste por{' '}
                    {formatCurrency(
                      parseFloat(valorTransmision) -
                        parseFloat(valorAdquisicion)
                    )}{' '}
                    respecto al precio de compra). Desde la sentencia del
                    Tribunal Constitucional 182/2021, si no hay ganancia real no
                    se puede exigir el impuesto.
                  </p>
                </div>
              </div>

              <table
                class="calculator__breakdown"
                style={{ marginTop: 'var(--space-6)' }}
              >
                <tbody>
                  <tr>
                    <td>Valor de adquisición</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(parseFloat(valorAdquisicion) || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td>Valor de transmisión</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(parseFloat(valorTransmision) || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Diferencia</strong>
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-error)',
                        fontWeight: 700,
                      }}
                    >
                      {formatCurrency(result.metodoReal.incrementoReal)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Plusvalía a pagar</strong>
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--color-success)',
                      }}
                    >
                      0,00 €
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : (
            <>
              <p class="calculator__results-title">Plusvalía municipal a pagar</p>

              <div class="calculator__result-main">
                {formatCurrency(result.cuotaFinal)}
              </div>
              <p class="calculator__result-label">
                Cuota por el método{' '}
                {result.metodoElegido === 'real' ? 'real' : 'objetivo'} (el más
                favorable)
              </p>

              {/* Comparison cards */}
              <div class="plusvalia-comparison">
                {/* Método real */}
                <div
                  class={`plusvalia-method ${
                    result.metodoElegido === 'real'
                      ? 'plusvalia-method--selected'
                      : ''
                  }`}
                >
                  {result.metodoElegido === 'real' && (
                    <span class="plusvalia-method__badge">Más favorable</span>
                  )}
                  <p class="plusvalia-method__title">Método real</p>
                  <p class="plusvalia-method__amount">
                    {formatCurrency(result.metodoReal.cuota)}
                  </p>
                  <table class="plusvalia-method__table">
                    <tbody>
                      <tr>
                        <td>Incremento real</td>
                        <td>{formatCurrency(result.metodoReal.incrementoReal)}</td>
                      </tr>
                      <tr>
                        <td>Revalorización</td>
                        <td>
                          {formatPercent(
                            result.metodoReal.porcentajeSobreAdquisicion,
                            1
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Valor catastral suelo</td>
                        <td>{formatCurrency(result.valorCatastralSuelo)}</td>
                      </tr>
                      <tr>
                        <td>Base imponible</td>
                        <td>
                          <strong>
                            {formatCurrency(result.metodoReal.baseImponible)}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          Tipo impositivo ({formatPercent(
                            parseFloat(tipoImpositivo),
                            0
                          )})
                        </td>
                        <td>
                          <strong>
                            {formatCurrency(result.metodoReal.cuota)}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Método objetivo */}
                <div
                  class={`plusvalia-method ${
                    result.metodoElegido === 'objetivo'
                      ? 'plusvalia-method--selected'
                      : ''
                  }`}
                >
                  {result.metodoElegido === 'objetivo' && (
                    <span class="plusvalia-method__badge">Más favorable</span>
                  )}
                  <p class="plusvalia-method__title">Método objetivo</p>
                  <p class="plusvalia-method__amount">
                    {formatCurrency(result.metodoObjetivo.cuota)}
                  </p>
                  <table class="plusvalia-method__table">
                    <tbody>
                      <tr>
                        <td>Valor catastral suelo</td>
                        <td>{formatCurrency(result.valorCatastralSuelo)}</td>
                      </tr>
                      <tr>
                        <td>
                          Coeficiente ({aniosPropiedad}{' '}
                          {parseInt(aniosPropiedad, 10) === 1
                            ? 'año'
                            : 'años'})
                        </td>
                        <td>
                          {result.metodoObjetivo.coeficienteAplicado.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>Base imponible</td>
                        <td>
                          <strong>
                            {formatCurrency(
                              result.metodoObjetivo.baseImponible
                            )}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          Tipo impositivo ({formatPercent(
                            parseFloat(tipoImpositivo),
                            0
                          )})
                        </td>
                        <td>
                          <strong>
                            {formatCurrency(result.metodoObjetivo.cuota)}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Savings notice */}
              {(() => {
                const ahorro = Math.abs(
                  result.metodoReal.cuota - result.metodoObjetivo.cuota
                );
                if (ahorro <= 0) return null;
                return (
                  <div class="plusvalia-notice plusvalia-notice--info">
                    <span class="plusvalia-notice__icon">&#9432;</span>
                    <p class="plusvalia-notice__text">
                      Al elegir el método{' '}
                      {result.metodoElegido === 'real' ? 'real' : 'objetivo'} te
                      ahorras <strong>{formatCurrency(ahorro)}</strong> respecto
                      al otro método.
                    </p>
                  </div>
                );
              })()}

              {/* Full breakdown table */}
              <table
                class="calculator__breakdown"
                style={{ marginTop: 'var(--space-6)' }}
              >
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th style={{ textAlign: 'right' }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Valor de adquisición</td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                      {formatCurrency(parseFloat(valorAdquisicion) || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td>Valor de transmisión</td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                      {formatCurrency(parseFloat(valorTransmision) || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Incremento real</strong>
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)',
                        textAlign: 'right',
                        color: 'var(--color-success)',
                      }}
                    >
                      <strong>
                        + {formatCurrency(result.metodoReal.incrementoReal)} (
                        {formatPercent(
                          result.metodoReal.porcentajeSobreAdquisicion,
                          1
                        )}
                        )
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td colspan={2} style={{ height: 'var(--space-2)', borderBottom: 'none' }}></td>
                  </tr>
                  <tr>
                    <td>Valor catastral total</td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                      {formatCurrency(parseFloat(valorCatastral) || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: 'var(--space-4)' }}>
                      Porcentaje suelo ({formatPercent(parseFloat(porcentajeSuelo), 0)})
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                      {formatCurrency(result.valorCatastralSuelo)}
                    </td>
                  </tr>
                  <tr>
                    <td colspan={2} style={{ height: 'var(--space-2)', borderBottom: 'none' }}></td>
                  </tr>
                  <tr class="calculator__breakdown-total">
                    <td>
                      <strong>Plusvalía a pagar</strong>
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--color-accent)',
                      }}
                    >
                      {formatCurrency(result.cuotaFinal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Coeficientes reference */}
              <div
                style={{
                  marginTop: 'var(--space-8)',
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-bg-alt)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Coeficientes del método objetivo 2026
                </p>
                <table class="calculator__breakdown">
                  <thead>
                    <tr>
                      <th>Años</th>
                      <th>Coeficiente</th>
                      <th>Años</th>
                      <th>Coeficiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }, (_, i) => {
                      const y1 = i + 1;
                      const y2 = i + 11;
                      const c1 = plusvaliaData.coeficientesObjetivo[String(y1)];
                      const c2 = plusvaliaData.coeficientesObjetivo[String(y2)];
                      const isCurrentY1 =
                        parseInt(aniosPropiedad, 10) === y1;
                      const isCurrentY2 =
                        parseInt(aniosPropiedad, 10) === y2 ||
                        (y2 === 20 && parseInt(aniosPropiedad, 10) >= 20);
                      return (
                        <tr key={y1}>
                          <td
                            style={
                              isCurrentY1
                                ? {
                                    fontWeight: 700,
                                    color: 'var(--color-accent)',
                                  }
                                : {}
                            }
                          >
                            {y1}
                          </td>
                          <td
                            style={{
                              fontFamily: 'var(--font-mono)',
                              ...(isCurrentY1
                                ? {
                                    fontWeight: 700,
                                    color: 'var(--color-accent)',
                                  }
                                : {}),
                            }}
                          >
                            {c1?.toFixed(2)}
                          </td>
                          <td
                            style={
                              isCurrentY2
                                ? {
                                    fontWeight: 700,
                                    color: 'var(--color-accent)',
                                  }
                                : {}
                            }
                          >
                            {y2 === 20 ? '20+' : y2}
                          </td>
                          <td
                            style={{
                              fontFamily: 'var(--font-mono)',
                              ...(isCurrentY2
                                ? {
                                    fontWeight: 700,
                                    color: 'var(--color-accent)',
                                  }
                                : {}),
                            }}
                          >
                            {c2?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
