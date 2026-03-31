import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularIVA } from '@lib/calculations/impuestos';
import CopyButton from './CopyButton';
import type { IVAData, IVAResult, IVAInput, ComunidadAutonoma } from '@lib/types';
import { CCAA_OPTIONS } from '@lib/types';

interface Props {
  ivaData: IVAData;
}

type TipoIVA = 'general' | 'reducido' | 'superreducido';
type Direccion = 'base_a_total' | 'total_a_base';

export default function CalculadoraIVA({ ivaData }: Props) {
  const [importe, setImporte] = useState('1000');
  const [direccion, setDireccion] = useState<Direccion>('base_a_total');
  const [tipoIVA, setTipoIVA] = useState<TipoIVA>('general');
  const [ccaa, setCcaa] = useState<ComunidadAutonoma | ''>('');
  const [incluyeRecargo, setIncluyeRecargo] = useState(false);
  const [result, setResult] = useState<IVAResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const amount = parseFloat(importe);
    if (isNaN(amount) || amount <= 0) {
      setError('Introduce un importe válido mayor que cero.');
      return;
    }

    try {
      const input: IVAInput = {
        importe: amount,
        tipoIVA,
        direccion,
        incluyeRecargo,
        ccaa: ccaa === '' ? undefined : ccaa,
      };
      const res = calcularIVA(input, ivaData);
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  const esCanarias = ccaa === 'canarias';
  const esCeutaMelilla = ccaa === 'ceuta' || ccaa === 'melilla';

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos de la operación</p>
        <div class="calculator__grid">
          {/* Importe */}
          <div class="form-group">
            <label class="form-label" htmlFor="iva-importe">
              Importe ({direccion === 'base_a_total' ? 'base imponible' : 'total con impuesto'}) (€)
            </label>
            <div class="input-currency">
              <input
                id="iva-importe"
                type="number"
                class="form-input"
                min="0"
                step="10"
                value={importe}
                onInput={(e) => setImporte((e.target as HTMLInputElement).value)}
                placeholder="1.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
          </div>

          {/* Dirección del cálculo */}
          <div class="form-group">
            <span class="form-label">Dirección del cálculo</span>
            <div class="radio-group" role="radiogroup" aria-label="Dirección del cálculo">
              <div class="radio-option">
                <input
                  type="radio"
                  id="iva-dir-add"
                  name="iva-direccion"
                  value="base_a_total"
                  checked={direccion === 'base_a_total'}
                  onChange={() => setDireccion('base_a_total')}
                />
                <label htmlFor="iva-dir-add">Añadir IVA (base → total)</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="iva-dir-remove"
                  name="iva-direccion"
                  value="total_a_base"
                  checked={direccion === 'total_a_base'}
                  onChange={() => setDireccion('total_a_base')}
                />
                <label htmlFor="iva-dir-remove">Quitar IVA (total → base)</label>
              </div>
            </div>
          </div>

          {/* Tipo de IVA */}
          <div class="form-group">
            <span class="form-label">Tipo de IVA</span>
            <div class="radio-group" role="radiogroup" aria-label="Tipo de IVA">
              <div class="radio-option">
                <input
                  type="radio"
                  id="iva-tipo-general"
                  name="iva-tipo"
                  value="general"
                  checked={tipoIVA === 'general'}
                  onChange={() => setTipoIVA('general')}
                />
                <label htmlFor="iva-tipo-general">General (21%)</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="iva-tipo-reducido"
                  name="iva-tipo"
                  value="reducido"
                  checked={tipoIVA === 'reducido'}
                  onChange={() => setTipoIVA('reducido')}
                />
                <label htmlFor="iva-tipo-reducido">Reducido (10%)</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="iva-tipo-superreducido"
                  name="iva-tipo"
                  value="superreducido"
                  checked={tipoIVA === 'superreducido'}
                  onChange={() => setTipoIVA('superreducido')}
                />
                <label htmlFor="iva-tipo-superreducido">Superreducido (4%)</label>
              </div>
            </div>
          </div>

          {/* Comunidad Autónoma */}
          <div class="form-group">
            <label class="form-label" htmlFor="iva-ccaa">
              Comunidad Autónoma (opcional)
            </label>
            <select
              id="iva-ccaa"
              class="form-select"
              value={ccaa}
              onChange={(e) => setCcaa((e.target as HTMLSelectElement).value as ComunidadAutonoma | '')}
            >
              <option value="">Península y Baleares (IVA)</option>
              {CCAA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span class="form-hint">
              Selecciona Canarias para IGIC o Ceuta/Melilla para IPSI
            </span>
          </div>

          {/* Recargo de equivalencia */}
          <div class="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingTop: 'var(--space-6)' }}>
            <input
              type="checkbox"
              id="iva-recargo"
              checked={incluyeRecargo}
              onChange={(e) => setIncluyeRecargo((e.target as HTMLInputElement).checked)}
              disabled={esCanarias || esCeutaMelilla}
            />
            <label htmlFor="iva-recargo" class="form-label" style={{ marginBottom: 0 }}>
              Incluir recargo de equivalencia
            </label>
          </div>
          {(esCanarias || esCeutaMelilla) && incluyeRecargo === false && (
            <span class="form-hint" style={{ marginTop: '-var(--space-2)' }}>
              El recargo de equivalencia no aplica en {esCanarias ? 'Canarias (IGIC)' : 'Ceuta y Melilla (IPSI)'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular IVA
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">
            {direccion === 'base_a_total' ? 'Total con ' : 'Base sin '}{result.impuestoNombre}
          </p>

          <div class="calculator__result-main">
            {direccion === 'base_a_total'
              ? formatCurrency(result.recargoEquivalencia > 0 ? result.totalConRecargo : result.total)
              : formatCurrency(result.base)}
          </div>
          <p class="calculator__result-label">
            {direccion === 'base_a_total'
              ? (result.recargoEquivalencia > 0 ? 'Total con recargo de equivalencia' : `Total con ${result.impuestoNombre} al ${formatPercent(result.tipoAplicado, 0)}`)
              : `Base imponible sin ${result.impuestoNombre}`}
          </p>
          <CopyButton text={`Base: ${formatCurrency(result.base)} + ${result.impuestoNombre}: ${formatCurrency(result.cuotaIVA)} = Total: ${formatCurrency(result.total)}`} />

          {/* Special regime notice */}
          {result.esRegimenEspecial && (
            <div class="iva-notice">
              <span class="iva-notice__icon">&#9432;</span>
              <p class="iva-notice__text">
                {result.impuestoNombre === 'IGIC'
                  ? `Se aplica IGIC (${formatPercent(result.tipoAplicado, 0)}) en lugar de IVA. El IGIC es el impuesto indirecto vigente en Canarias.`
                  : `Se aplica IPSI (${formatPercent(result.tipoAplicado, 0)}) en lugar de IVA. El IPSI es el impuesto indirecto vigente en Ceuta y Melilla.`}
              </p>
            </div>
          )}

          {/* Breakdown table */}
          <table class="calculator__breakdown" style={{ marginTop: 'var(--space-6)' }}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th style={{ textAlign: 'right' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base imponible</td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {formatCurrency(result.base)}
                </td>
              </tr>
              <tr>
                <td>
                  {result.impuestoNombre} ({formatPercent(result.tipoAplicado, 0)})
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  + {formatCurrency(result.cuotaIVA)}
                </td>
              </tr>
              {result.recargoEquivalencia > 0 && (
                <tr>
                  <td>
                    Recargo equiv. ({formatPercent(ivaData.recargo[tipoIVA], 1)})
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                    + {formatCurrency(result.recargoEquivalencia)}
                  </td>
                </tr>
              )}
              <tr class="calculator__breakdown-total">
                <td><strong>Total</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {formatCurrency(result.recargoEquivalencia > 0 ? result.totalConRecargo : result.total)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Quick reference table */}
          <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
              Tipos de IVA en España 2026
            </p>
            <table class="calculator__breakdown">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Porcentaje</th>
                  <th>Ejemplos</th>
                </tr>
              </thead>
              <tbody>
                {(['general', 'reducido', 'superreducido'] as TipoIVA[]).map((tipo) => (
                  <tr key={tipo} style={tipo === tipoIVA ? { backgroundColor: 'var(--color-accent-light)' } : {}}>
                    <td><strong>{ivaData.tiposIVA[tipo].descripcion}</strong></td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {formatPercent(ivaData.tiposIVA[tipo].tipo, 0)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {ivaData.tiposIVA[tipo].ejemplos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
