import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularRentabilidadAlquiler } from '@lib/calculations/vivienda';
import CopyButton from './CopyButton';
import type { RentabilidadAlquilerResult } from '@lib/types';

export default function RentabilidadAlquiler() {
  const [precioCompra, setPrecioCompra] = useState('180000');
  const [gastosCompra, setGastosCompra] = useState('18000');
  const [reformaInicial, setReformaInicial] = useState('5000');
  const [alquilerMensual, setAlquilerMensual] = useState('800');
  const [ibiAnual, setIbiAnual] = useState('600');
  const [comunidadMensual, setComunidadMensual] = useState('60');
  const [seguroAnual, setSeguroAnual] = useState('250');
  const [hipotecaCuotaMensual, setHipotecaCuotaMensual] = useState('0');
  const [periodoVacioMeses, setPeriodoVacioMeses] = useState('0');
  const [result, setResult] = useState<RentabilidadAlquilerResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const precio = parseFloat(precioCompra);
    if (isNaN(precio) || precio <= 0) {
      setError('Introduce un precio de compra válido.');
      return;
    }

    const gastos = parseFloat(gastosCompra);
    if (isNaN(gastos) || gastos < 0) {
      setError('Introduce unos gastos de compra válidos.');
      return;
    }

    const reforma = parseFloat(reformaInicial);
    if (isNaN(reforma) || reforma < 0) {
      setError('Introduce un importe de reforma válido (0 si no hay reforma).');
      return;
    }

    const alquiler = parseFloat(alquilerMensual);
    if (isNaN(alquiler) || alquiler <= 0) {
      setError('Introduce un alquiler mensual válido.');
      return;
    }

    const ibi = parseFloat(ibiAnual);
    if (isNaN(ibi) || ibi < 0) {
      setError('Introduce un IBI anual válido.');
      return;
    }

    const comunidad = parseFloat(comunidadMensual);
    if (isNaN(comunidad) || comunidad < 0) {
      setError('Introduce una cuota de comunidad válida.');
      return;
    }

    const seguro = parseFloat(seguroAnual);
    if (isNaN(seguro) || seguro < 0) {
      setError('Introduce un seguro de hogar válido.');
      return;
    }

    const hipoteca = parseFloat(hipotecaCuotaMensual);
    if (isNaN(hipoteca) || hipoteca < 0) {
      setError('Introduce una cuota de hipoteca válida (0 si se paga al contado).');
      return;
    }

    const vacio = parseInt(periodoVacioMeses, 10);
    if (isNaN(vacio) || vacio < 0 || vacio > 12) {
      setError('Los meses de vacío deben estar entre 0 y 12.');
      return;
    }

    try {
      const res = calcularRentabilidadAlquiler({
        precioCompra: precio,
        gastosCompra: gastos,
        reformaInicial: reforma,
        alquilerMensual: alquiler,
        ibiAnual: ibi,
        comunidadMensual: comunidad,
        seguroAnual: seguro,
        hipotecaCuotaMensual: hipoteca,
        periodoVacioMeses: vacio,
      });
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function rentabilidadColor(r: number): string {
    if (r >= 6) return 'var(--color-success)';
    if (r >= 3) return 'var(--color-warning, #c59a2a)';
    return 'var(--color-error, #c53030)';
  }

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos de la inversión</p>
        <div class="calculator__grid">
          {/* Precio de compra */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-precio">
              Precio de compra
            </label>
            <div class="input-currency">
              <input
                id="ra-precio"
                type="number"
                class="form-input"
                min="0"
                step="5000"
                value={precioCompra}
                onInput={(e) => setPrecioCompra((e.target as HTMLInputElement).value)}
                placeholder="180.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>

          {/* Gastos de compra */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-gastos">
              Gastos de compra
            </label>
            <div class="input-currency">
              <input
                id="ra-gastos"
                type="number"
                class="form-input"
                min="0"
                step="500"
                value={gastosCompra}
                onInput={(e) => setGastosCompra((e.target as HTMLInputElement).value)}
                placeholder="18.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
            <span class="form-hint">
              ITP, notaría, registro... <a href="/vivienda/calculadora-hipoteca/" style={{ color: 'var(--color-accent)' }}>usa nuestra calculadora de gastos</a>
            </span>
          </div>

          {/* Reforma inicial */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-reforma">
              Reforma inicial
            </label>
            <div class="input-currency">
              <input
                id="ra-reforma"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={reformaInicial}
                onInput={(e) => setReformaInicial((e.target as HTMLInputElement).value)}
                placeholder="5.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
            <span class="form-hint">0 si el piso está listo para alquilar</span>
          </div>

          {/* Alquiler mensual */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-alquiler">
              Alquiler mensual
            </label>
            <div class="input-currency">
              <input
                id="ra-alquiler"
                type="number"
                class="form-input"
                min="0"
                step="50"
                value={alquilerMensual}
                onInput={(e) => setAlquilerMensual((e.target as HTMLInputElement).value)}
                placeholder="800"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>
        </div>

        <p class="calculator__inputs-title" style={{ marginTop: 'var(--space-6)' }}>Gastos anuales del inmueble</p>
        <div class="calculator__grid">
          {/* IBI anual */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-ibi">
              IBI anual
            </label>
            <div class="input-currency">
              <input
                id="ra-ibi"
                type="number"
                class="form-input"
                min="0"
                step="50"
                value={ibiAnual}
                onInput={(e) => setIbiAnual((e.target as HTMLInputElement).value)}
                placeholder="600"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>

          {/* Comunidad mensual */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-comunidad">
              Comunidad de propietarios
            </label>
            <div class="input-currency">
              <input
                id="ra-comunidad"
                type="number"
                class="form-input"
                min="0"
                step="10"
                value={comunidadMensual}
                onInput={(e) => setComunidadMensual((e.target as HTMLInputElement).value)}
                placeholder="60"
              />
              <span class="input-currency__symbol">&euro;/mes</span>
            </div>
          </div>

          {/* Seguro anual */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-seguro">
              Seguro hogar
            </label>
            <div class="input-currency">
              <input
                id="ra-seguro"
                type="number"
                class="form-input"
                min="0"
                step="50"
                value={seguroAnual}
                onInput={(e) => setSeguroAnual((e.target as HTMLInputElement).value)}
                placeholder="250"
              />
              <span class="input-currency__symbol">&euro;/año</span>
            </div>
          </div>

          {/* Hipoteca */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-hipoteca">
              Cuota hipoteca
            </label>
            <div class="input-currency">
              <input
                id="ra-hipoteca"
                type="number"
                class="form-input"
                min="0"
                step="50"
                value={hipotecaCuotaMensual}
                onInput={(e) => setHipotecaCuotaMensual((e.target as HTMLInputElement).value)}
                placeholder="0"
              />
              <span class="input-currency__symbol">&euro;/mes</span>
            </div>
            <span class="form-hint">0 si compras al contado, sin financiación</span>
          </div>

          {/* Meses vacío */}
          <div class="form-group">
            <label class="form-label" htmlFor="ra-vacio">
              Meses de vacío al año
            </label>
            <select
              id="ra-vacio"
              class="form-select"
              value={periodoVacioMeses}
              onChange={(e) => setPeriodoVacioMeses((e.target as HTMLSelectElement).value)}
            >
              <option value="0">0 meses (ocupado todo el año)</option>
              <option value="1">1 mes</option>
              <option value="2">2 meses</option>
              <option value="3">3 meses</option>
            </select>
            <span class="form-hint">Periodo estimado sin inquilino para rotaciones y búsqueda</span>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular rentabilidad
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Rentabilidad de tu inversión</p>

          {/* Main result: Rentabilidad neta */}
          <div class="calculator__result-main" style={{ color: rentabilidadColor(result.rentabilidadNeta) }}>
            {formatPercent(result.rentabilidadNeta, 1)}
          </div>
          <p class="calculator__result-label">Rentabilidad neta anual</p>
          <CopyButton text={`Rentabilidad neta: ${formatPercent(result.rentabilidadNeta, 1)}`} />

          {/* Summary cards */}
          <div class="ra-summary">
            <div class="ra-summary__item">
              <span class="ra-summary__label">Rentabilidad bruta</span>
              <span class="ra-summary__value">{formatPercent(result.rentabilidadBruta, 1)}</span>
            </div>
            <div class="ra-summary__item">
              <span class="ra-summary__label">Cash-flow mensual</span>
              <span class="ra-summary__value" style={{ color: result.cashFlowMensual >= 0 ? 'var(--color-success)' : 'var(--color-error, #c53030)' }}>
                {result.cashFlowMensual >= 0 ? '+' : ''}{formatCurrency(result.cashFlowMensual)}
              </span>
            </div>
            <div class="ra-summary__item">
              <span class="ra-summary__label">Años para recuperar</span>
              <span class="ra-summary__value">
                {result.anosRecuperacion > 0 ? `${result.anosRecuperacion} años` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Bar chart: Ingresos vs Gastos */}
          {(() => {
            const maxVal = Math.max(result.ingresosAnuales, result.gastosAnualesTotales);
            if (maxVal <= 0) return null;
            const pctIngresos = (result.ingresosAnuales / maxVal) * 100;
            const pctGastos = (result.gastosAnualesTotales / maxVal) * 100;
            return (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <p class="calculator__inputs-title">Ingresos vs. Gastos anuales</p>
                <div class="ra-bars">
                  <div class="ra-bars__row">
                    <span class="ra-bars__label">Ingresos</span>
                    <div class="ra-bars__track">
                      <div
                        class="ra-bars__fill"
                        style={{ width: `${pctIngresos}%`, backgroundColor: 'var(--color-success)' }}
                      />
                    </div>
                    <span class="ra-bars__value">{formatCurrency(result.ingresosAnuales)}</span>
                  </div>
                  <div class="ra-bars__row">
                    <span class="ra-bars__label">Gastos</span>
                    <div class="ra-bars__track">
                      <div
                        class="ra-bars__fill"
                        style={{ width: `${pctGastos}%`, backgroundColor: 'var(--color-warning, #c59a2a)' }}
                      />
                    </div>
                    <span class="ra-bars__value">{formatCurrency(result.gastosAnualesTotales)}</span>
                  </div>
                </div>
                <div class="calculator__bar-legend" style={{ marginTop: 'var(--space-2)' }}>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                    Beneficio neto: <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(result.beneficioNetoAnual)}</strong>/año
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Desglose table */}
          <table class="calculator__breakdown" style={{ marginTop: 'var(--space-6)' }}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th style={{ textAlign: 'right' }}>Importe anual</th>
              </tr>
            </thead>
            <tbody>
              {result.desglose.map((item, i) => (
                <tr key={i}>
                  <td>{item.concepto}</td>
                  <td style={{
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    color: item.importe >= 0 ? 'var(--color-success)' : 'var(--color-error, #c53030)',
                  }}>
                    {item.importe >= 0 ? '+' : ''}{formatCurrency(Math.abs(item.importe))}
                    {item.importe < 0 && ' (gasto)'}
                  </td>
                </tr>
              ))}
              <tr class="calculator__breakdown-total">
                <td><strong>Beneficio neto anual</strong></td>
                <td style={{
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                  fontWeight: 700,
                  color: result.beneficioNetoAnual >= 0 ? 'var(--color-success)' : 'var(--color-error, #c53030)',
                }}>
                  {formatCurrency(result.beneficioNetoAnual)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Investment summary */}
          <div style={{
            marginTop: 'var(--space-6)',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-bg-alt)',
            borderRadius: 'var(--radius-md)',
          }}>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-3)',
            }}>
              Inversión total necesaria
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700 }}>
              {formatCurrency(result.inversionTotal)}
            </p>
            <p class="form-hint">
              Compra ({formatCurrency(parseFloat(precioCompra))}) + gastos ({formatCurrency(parseFloat(gastosCompra))}) + reforma ({formatCurrency(parseFloat(reformaInicial))})
            </p>
          </div>

          {parseFloat(hipotecaCuotaMensual) > 0 && (
            <div style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-bg-alt)',
              borderRadius: 'var(--radius-md)',
            }}>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-2)',
              }}>
                Cash-flow mensual (tras hipoteca)
              </p>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.3rem',
                fontWeight: 700,
                color: result.cashFlowMensual >= 0 ? 'var(--color-success)' : 'var(--color-error, #c53030)',
              }}>
                {result.cashFlowMensual >= 0 ? '+' : ''}{formatCurrency(result.cashFlowMensual)}
              </p>
              <p class="form-hint">
                Beneficio mensual ({formatCurrency(result.beneficioNetoAnual / 12)}) - hipoteca ({formatCurrency(parseFloat(hipotecaCuotaMensual))})
              </p>
            </div>
          )}

          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p>
                Cálculo orientativo. No sustituye asesoramiento profesional.
                No se incluye el efecto fiscal del IRPF sobre rendimientos del alquiler
                (reducción del 50-90% según normativa vigente), ni la revalorización del inmueble.
                Los gastos de mantenimiento se estiman en un 1% anual del precio de compra.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
