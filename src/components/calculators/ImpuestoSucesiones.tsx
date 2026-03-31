import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularSucesiones } from '@lib/calculations/impuestos';
import CopyButton from './CopyButton';
import type {
  SucesionesData,
  SucesionesResult,
  SucesionesInput,
  ComunidadAutonoma,
} from '@lib/types';
import { CCAA_OPTIONS } from '@lib/types';

interface Props {
  sucesionesData: SucesionesData;
}

const GRUPOS_PARENTESCO = [
  { value: 'grupo_I' as const, label: 'Grupo I — Descendientes menores de 21 años' },
  { value: 'grupo_II' as const, label: 'Grupo II — Descendientes mayores de 21, cónyuge, ascendientes' },
  { value: 'grupo_III' as const, label: 'Grupo III — Colaterales 2.º y 3.er grado, afines' },
  { value: 'grupo_IV' as const, label: 'Grupo IV — Parientes más lejanos y extraños' },
];

export default function ImpuestoSucesiones({ sucesionesData }: Props) {
  const [valorHerencia, setValorHerencia] = useState('200000');
  const [ccaa, setCcaa] = useState<ComunidadAutonoma>('madrid');
  const [parentesco, setParentesco] = useState<SucesionesInput['parentesco']>('grupo_II');
  const [edadHeredero, setEdadHeredero] = useState('40');
  const [patrimonio, setPatrimonio] = useState('0');
  const [result, setResult] = useState<SucesionesResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const valor = parseFloat(valorHerencia);
    if (isNaN(valor) || valor <= 0) {
      setError('Introduce un valor de herencia válido.');
      return;
    }

    const edad = parseInt(edadHeredero, 10);
    if (parentesco === 'grupo_I' && (isNaN(edad) || edad < 0 || edad >= 21)) {
      setError('Para el Grupo I, la edad debe ser menor de 21 años.');
      return;
    }

    try {
      const res = calcularSucesiones(
        {
          valorHerencia: valor,
          ccaa,
          parentesco,
          edadHeredero: isNaN(edad) ? 40 : edad,
          patrimonioPreexistente: parseFloat(patrimonio) || 0,
        },
        sucesionesData
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
        <p class="calculator__inputs-title">Datos de la herencia</p>
        <div class="calculator__grid">
          <div class="form-group">
            <label class="form-label" htmlFor="suc-valor">
              Valor de la herencia (€)
            </label>
            <div class="input-currency">
              <input
                id="suc-valor"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={valorHerencia}
                onInput={(e) => setValorHerencia((e.target as HTMLInputElement).value)}
                placeholder="200.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" htmlFor="suc-ccaa">
              Comunidad autónoma del fallecido
            </label>
            <select
              id="suc-ccaa"
              class="form-select"
              value={ccaa}
              onChange={(e) => setCcaa((e.target as HTMLSelectElement).value as ComunidadAutonoma)}
            >
              {CCAA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" htmlFor="suc-parentesco">
              Grado de parentesco
            </label>
            <select
              id="suc-parentesco"
              class="form-select"
              value={parentesco}
              onChange={(e) => setParentesco((e.target as HTMLSelectElement).value as SucesionesInput['parentesco'])}
            >
              {GRUPOS_PARENTESCO.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {parentesco === 'grupo_I' && (
            <div class="form-group">
              <label class="form-label" htmlFor="suc-edad">
                Edad del heredero
              </label>
              <input
                id="suc-edad"
                type="number"
                class="form-input"
                min="0"
                max="20"
                value={edadHeredero}
                onInput={(e) => setEdadHeredero((e.target as HTMLInputElement).value)}
              />
            </div>
          )}

          <div class="form-group">
            <label class="form-label" htmlFor="suc-patrimonio">
              Patrimonio preexistente del heredero (€)
            </label>
            <div class="input-currency">
              <input
                id="suc-patrimonio"
                type="number"
                class="form-input"
                min="0"
                step="10000"
                value={patrimonio}
                onInput={(e) => setPatrimonio((e.target as HTMLInputElement).value)}
                placeholder="0"
              />
              <span class="input-currency__symbol">€</span>
            </div>
            <p class="form-hint">Valor de tus bienes y derechos antes de recibir la herencia</p>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Impuesto de Sucesiones</p>

          <div class="calculator__result-main">
            {formatCurrency(result.cuotaFinal)}
          </div>
          <p class="calculator__result-label">Cuota a pagar</p>
          <CopyButton text={`Impuesto sucesiones: ${formatCurrency(result.cuotaFinal)}`} />

          {result.notaCcaa && (
            <div style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: result.bonificacionPorcentaje >= 90 ? 'var(--color-success-light, #e6f4ea)' : 'var(--color-bg-alt)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
            }}>
              <strong>{CCAA_OPTIONS.find((o) => o.value === ccaa)?.label}:</strong> {result.notaCcaa}
            </div>
          )}

          <table class="calculator__breakdown" style={{ marginTop: 'var(--space-6)' }}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Valor de la herencia</td>
                <td>{formatCurrency(result.baseImponible)}</td>
              </tr>
              <tr>
                <td>Reducción por parentesco</td>
                <td>-{formatCurrency(result.reduccionAplicada)}</td>
              </tr>
              <tr>
                <td><strong>Base liquidable</strong></td>
                <td><strong>{formatCurrency(result.baseLiquidable)}</strong></td>
              </tr>
              <tr>
                <td>Cuota íntegra (tarifa estatal)</td>
                <td>{formatCurrency(result.cuotaIntegra)}</td>
              </tr>
              <tr>
                <td>Coeficiente multiplicador</td>
                <td>&times; {result.coeficienteMultiplicador.toFixed(4)}</td>
              </tr>
              <tr>
                <td>Cuota tributaria</td>
                <td>{formatCurrency(result.cuotaTributaria)}</td>
              </tr>
              {result.bonificacionPorcentaje > 0 && (
                <tr>
                  <td>Bonificación autonómica ({formatPercent(result.bonificacionPorcentaje, 1)})</td>
                  <td>-{formatCurrency(result.bonificacionCcaa)}</td>
                </tr>
              )}
              <tr>
                <td><strong>Cuota a pagar</strong></td>
                <td><strong>{formatCurrency(result.cuotaFinal)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
