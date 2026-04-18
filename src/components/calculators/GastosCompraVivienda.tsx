import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularGastosCompra, calcularGastosCompraComparativa } from '@lib/calculations/vivienda';
import CopyButton from './CopyButton';
import type {
  HipotecaReferenceData,
  ITPData,
  GastosCompraResult,
  GastosCompraComparativaResult,
  ComunidadAutonoma,
} from '@lib/types';
import { CCAA_OPTIONS } from '@lib/types';

interface Props {
  hipotecaData: HipotecaReferenceData;
  itpData: ITPData;
}

type Vista = 'individual' | 'comparativa';

export default function GastosCompraVivienda({ hipotecaData, itpData }: Props) {
  // --- Inputs ---
  const [precioVivienda, setPrecioVivienda] = useState('200000');
  const [ccaa, setCcaa] = useState<ComunidadAutonoma>('madrid');
  const [esViviendaNueva, setEsViviendaNueva] = useState(false);
  const [aplicaTipoReducido, setAplicaTipoReducido] = useState(false);

  // --- View toggle ---
  const [vista, setVista] = useState<Vista>('individual');

  // --- Results ---
  const [gastosResult, setGastosResult] = useState<GastosCompraResult | null>(null);
  const [comparativaResult, setComparativaResult] = useState<GastosCompraComparativaResult | null>(null);

  // --- Errors ---
  const [error, setError] = useState('');

  const ccaaItpData = itpData.tiposPorCcaa[ccaa];

  function handleCalcular() {
    setError('');

    const precio = parseFloat(precioVivienda);
    if (isNaN(precio) || precio <= 0) {
      setError('Introduce un precio de vivienda valido.');
      return;
    }

    try {
      if (vista === 'individual') {
        const res = calcularGastosCompra(
          {
            precioVivienda: precio,
            ccaa,
            esViviendaNueva,
            aplicaTipoReducido,
          },
          hipotecaData,
          itpData,
        );
        setGastosResult(res);
        setComparativaResult(null);
      } else {
        const res = calcularGastosCompraComparativa(
          precio,
          esViviendaNueva,
          aplicaTipoReducido,
          hipotecaData,
          itpData,
        );
        setComparativaResult(res);
        setGastosResult(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el calculo: ' + msg);
    }
  }

  const precio = parseFloat(precioVivienda) || 0;
  const entradaMinima = precio * 0.20;

  return (
    <div class="calculator">
      {/* View toggle */}
      <div class="calculator__tabs" role="tablist" aria-label="Modo de calculo">
        <button
          role="tab"
          aria-selected={vista === 'individual'}
          class={`calculator__tab ${vista === 'individual' ? 'calculator__tab--active' : ''}`}
          onClick={() => { setVista('individual'); setError(''); }}
        >
          Tu comunidad
        </button>
        <button
          role="tab"
          aria-selected={vista === 'comparativa'}
          class={`calculator__tab ${vista === 'comparativa' ? 'calculator__tab--active' : ''}`}
          onClick={() => { setVista('comparativa'); setError(''); }}
        >
          Comparar todas las comunidades
        </button>
      </div>

      {/* Inputs */}
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos de la compra</p>
        <div class="calculator__grid">
          {/* Precio de la vivienda */}
          <div class="form-group">
            <label class="form-label" htmlFor="gcv-precio">
              Precio de la vivienda
            </label>
            <div class="input-currency">
              <input
                id="gcv-precio"
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

          {/* CCAA (only in individual mode) */}
          {vista === 'individual' && (
            <div class="form-group">
              <label class="form-label" htmlFor="gcv-ccaa">
                Comunidad Autonoma
              </label>
              <select
                id="gcv-ccaa"
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
          )}

          {/* Tipo vivienda */}
          <div class="form-group">
            <span class="form-label">Tipo de vivienda</span>
            <div class="radio-group" role="radiogroup" aria-label="Tipo de vivienda">
              <div class="radio-option">
                <input
                  type="radio"
                  id="gcv-usada"
                  name="gcv-tipo-vivienda"
                  value="usada"
                  checked={!esViviendaNueva}
                  onChange={() => setEsViviendaNueva(false)}
                />
                <label htmlFor="gcv-usada">De segunda mano (ITP)</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="gcv-nueva"
                  name="gcv-tipo-vivienda"
                  value="nueva"
                  checked={esViviendaNueva}
                  onChange={() => setEsViviendaNueva(true)}
                />
                <label htmlFor="gcv-nueva">Obra nueva (IVA)</label>
              </div>
            </div>
          </div>

          {/* Tipo reducido (solo para segunda mano en modo individual) */}
          {!esViviendaNueva && vista === 'individual' && ccaaItpData && (
            <div class="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingTop: 'var(--space-6)' }}>
              <input
                type="checkbox"
                id="gcv-reducido"
                checked={aplicaTipoReducido}
                onChange={(e) => setAplicaTipoReducido((e.target as HTMLInputElement).checked)}
              />
              <label htmlFor="gcv-reducido" class="form-label" style={{ marginBottom: 0 }}>
                Aplico tipo reducido ({formatPercent(ccaaItpData.reducido)})
              </label>
            </div>
          )}

          {!esViviendaNueva && vista === 'individual' && ccaaItpData && ccaaItpData.tipo !== ccaaItpData.reducido && (
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

      <button class="btn btn--primary btn--large" onClick={handleCalcular}>
        {vista === 'individual' ? 'Calcular gastos' : 'Comparar comunidades'}
      </button>

      {/* ================================================================
          RESULTS: Individual view
          ================================================================ */}
      {gastosResult && vista === 'individual' && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Gastos de compra</p>

          <div class="calculator__result-main">
            {formatCurrency(gastosResult.totalGastos)}
          </div>
          <p class="calculator__result-label">
            Total gastos asociados a la compra
          </p>
          <CopyButton text={`Gastos de compra: ${formatCurrency(gastosResult.totalGastos)} (${CCAA_OPTIONS.find(o => o.value === ccaa)?.label})`} />

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
                <td>Notaria ({formatPercent(hipotecaData.gastosCompra.notaria.porcentaje)})</td>
                <td>{formatCurrency(gastosResult.notaria)}</td>
              </tr>
              <tr>
                <td>Registro ({formatPercent(hipotecaData.gastosCompra.registro.porcentaje)})</td>
                <td>{formatCurrency(gastosResult.registro)}</td>
              </tr>
              <tr>
                <td>Gestoria</td>
                <td>{formatCurrency(gastosResult.gestoria)}</td>
              </tr>
              <tr>
                <td>Tasacion</td>
                <td>{formatCurrency(gastosResult.tasacion)}</td>
              </tr>
              <tr>
                <td><strong>Total gastos</strong></td>
                <td><strong>{formatCurrency(gastosResult.totalGastos)}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Ahorro minimo necesario */}
          <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
              Ahorro minimo necesario (20% entrada + gastos)
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700 }}>
              {formatCurrency(entradaMinima + gastosResult.totalGastos)}
            </p>
            <p class="form-hint">
              Entrada 20% ({formatCurrency(entradaMinima)}) + gastos ({formatCurrency(gastosResult.totalGastos)})
            </p>
          </div>

          {/* Total con precio */}
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
              Total necesario (precio + gastos)
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700 }}>
              {formatCurrency(gastosResult.totalConPrecio)}
            </p>
            <p class="form-hint">
              Precio vivienda ({formatCurrency(precio)}) + gastos ({formatCurrency(gastosResult.totalGastos)})
            </p>
          </div>

          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p>
                Los gastos de notaria, registro y gestoria son aproximaciones.
                El importe real puede variar segun la complejidad de la escritura y los aranceles vigentes.
                {' '}
                {esViviendaNueva
                  ? 'La vivienda nueva tributa por IVA (10%) mas Actos Juridicos Documentados (AJD).'
                  : 'La vivienda de segunda mano tributa por el Impuesto de Transmisiones Patrimoniales (ITP), cuyo tipo varia por comunidad autonoma.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          RESULTS: Comparison view
          ================================================================ */}
      {comparativaResult && vista === 'comparativa' && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">
            Comparativa de gastos en las 19 comunidades
          </p>
          <p class="calculator__result-label" style={{ marginBottom: 'var(--space-4)' }}>
            Vivienda de {formatCurrency(precio)} — {esViviendaNueva ? 'Obra nueva (IVA)' : 'Segunda mano (ITP)'}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table class="calculator__breakdown">
              <thead>
                <tr>
                  <th>Comunidad</th>
                  <th>{esViviendaNueva ? 'IVA+AJD' : 'ITP'}</th>
                  <th>Impuesto</th>
                  <th>Otros gastos</th>
                  <th>Total gastos</th>
                  <th>Ahorro minimo</th>
                </tr>
              </thead>
              <tbody>
                {comparativaResult.map((item, idx) => (
                  <tr key={item.ccaa} style={idx === 0 ? { backgroundColor: 'var(--color-accent-light)' } : undefined}>
                    <td>
                      <strong>{item.ccaaLabel}</strong>
                      {idx === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'block' }}>Mas economica</span>}
                    </td>
                    <td>{formatPercent(item.tipoImpuesto)}</td>
                    <td>{formatCurrency(item.impuesto)}</td>
                    <td>{formatCurrency(item.notaria + item.registro + item.gestoria + item.tasacion)}</td>
                    <td><strong>{formatCurrency(item.totalGastos)}</strong></td>
                    <td>{formatCurrency(item.ahorroMinimo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Highlight cheapest vs most expensive */}
          {comparativaResult.length > 1 && (() => {
            const cheapest = comparativaResult[0];
            const expensive = comparativaResult[comparativaResult.length - 1];
            const diferencia = expensive.totalGastos - cheapest.totalGastos;

            return diferencia > 0 ? (
              <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                  Diferencia entre la comunidad mas cara y mas barata
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700 }}>
                  {formatCurrency(diferencia)}
                </p>
                <p class="form-hint">
                  {cheapest.ccaaLabel} ({formatCurrency(cheapest.totalGastos)}) vs {expensive.ccaaLabel} ({formatCurrency(expensive.totalGastos)})
                </p>
              </div>
            ) : null;
          })()}

          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p>
                Los importes de notaria, registro y gestoria son iguales en todas las comunidades (aranceles estatales).
                La diferencia entre comunidades se debe exclusivamente al tipo impositivo (ITP o IVA+AJD).
                El ahorro minimo se calcula como el 20% de entrada mas los gastos totales de compra.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
