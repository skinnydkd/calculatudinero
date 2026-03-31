import { useState } from 'preact/hooks';
import { formatCurrency } from '@lib/formatters';
import { calcularIndemnizacion } from '@lib/calculations/laboral';
import CopyButton from './CopyButton';
import type {
  IndemnizacionData,
  IndemnizacionResult,
} from '@lib/types';

interface Props {
  indemnizacionData: IndemnizacionData;
}

const TIPOS_DESPIDO = [
  { value: 'improcedente', label: 'Despido improcedente' },
  { value: 'objetivo', label: 'Despido objetivo (causas económicas, etc.)' },
  { value: 'fin_temporal', label: 'Fin de contrato temporal' },
  { value: 'ere', label: 'Despido colectivo (ERE)' },
  { value: 'disciplinario', label: 'Despido disciplinario (procedente)' },
] as const;

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function IndemnizacionDespido({ indemnizacionData }: Props) {
  const today = new Date();

  const [fechaInicio, setFechaInicio] = useState('2020-01-15');
  const [fechaFin, setFechaFin] = useState(toDateInputValue(today));
  const [salarioBrutoMensual, setSalarioBrutoMensual] = useState('2000');
  const [tipoDespido, setTipoDespido] = useState<'improcedente' | 'objetivo' | 'fin_temporal' | 'ere' | 'disciplinario'>('improcedente');
  const [contratoPreFeb2012, setContratoPreFeb2012] = useState(false);
  const [result, setResult] = useState<IndemnizacionResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const salario = parseFloat(salarioBrutoMensual);
    if (isNaN(salario) || salario <= 0) {
      setError('Introduce un salario bruto mensual válido.');
      return;
    }

    if (!fechaInicio || !fechaFin) {
      setError('Introduce ambas fechas.');
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      setError('Las fechas introducidas no son válidas.');
      return;
    }

    if (fin <= inicio) {
      setError('La fecha de despido debe ser posterior a la fecha de inicio.');
      return;
    }

    // Convert monthly salary to daily: annual (14 pagas prorrateadas) / 365
    const salarioBrutoAnual = salario * 14;
    const salarioBrutoDiario = salarioBrutoAnual / 365;

    try {
      const res = calcularIndemnizacion(
        {
          fechaInicio: inicio,
          fechaFin: fin,
          salarioBrutoDiario,
          tipoDespido,
          contratoPreFeb2012: tipoDespido === 'improcedente' ? contratoPreFeb2012 : false,
        },
        indemnizacionData
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
        <p class="calculator__inputs-title">Datos del despido</p>
        <div class="calculator__grid">
          {/* Fecha inicio */}
          <div class="form-group">
            <label class="form-label" htmlFor="id-fecha-inicio">
              Fecha de inicio del contrato
            </label>
            <input
              id="id-fecha-inicio"
              type="date"
              class="form-input"
              value={fechaInicio}
              onInput={(e) => setFechaInicio((e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Fecha despido */}
          <div class="form-group">
            <label class="form-label" htmlFor="id-fecha-fin">
              Fecha de despido
            </label>
            <input
              id="id-fecha-fin"
              type="date"
              class="form-input"
              value={fechaFin}
              onInput={(e) => setFechaFin((e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Salario bruto mensual */}
          <div class="form-group">
            <label class="form-label" htmlFor="id-salario">
              Salario bruto mensual (€)
            </label>
            <div class="input-currency">
              <input
                id="id-salario"
                type="number"
                class="form-input"
                min="0"
                step="100"
                value={salarioBrutoMensual}
                onInput={(e) => setSalarioBrutoMensual((e.target as HTMLInputElement).value)}
                placeholder="2.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
            <p class="form-hint">Incluye pagas extras prorrateadas (se calcularán 14 pagas)</p>
          </div>

          {/* Tipo de despido */}
          <div class="form-group">
            <label class="form-label" htmlFor="id-tipo-despido">
              Tipo de despido
            </label>
            <select
              id="id-tipo-despido"
              class="form-select"
              value={tipoDespido}
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value as typeof tipoDespido;
                setTipoDespido(val);
                if (val !== 'improcedente') {
                  setContratoPreFeb2012(false);
                }
              }}
            >
              {TIPOS_DESPIDO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pre-2012 checkbox (only for improcedente) */}
          {tipoDespido === 'improcedente' && (
            <div class="form-group calculator__grid--full" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <input
                type="checkbox"
                id="id-pre2012"
                checked={contratoPreFeb2012}
                onChange={(e) => setContratoPreFeb2012((e.target as HTMLInputElement).checked)}
              />
              <label htmlFor="id-pre2012" class="form-label" style={{ marginBottom: 0 }}>
                Contrato anterior al 12/02/2012
              </label>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Indemnización por despido</p>

          <div class="calculator__result-main">
            {formatCurrency(result.indemnizacionTotal)}
          </div>
          <p class="calculator__result-label">
            Indemnización total
          </p>
          <CopyButton text={`Indemnización: ${formatCurrency(result.indemnizacionTotal)}`} />

          {/* Details table */}
          <table class="calculator__breakdown">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Antigüedad</td>
                <td>{result.antiguedadTexto}</td>
              </tr>
              <tr>
                <td>Salario diario regulador</td>
                <td>{formatCurrency(result.salarioDiario)}</td>
              </tr>
              <tr>
                <td>Días de indemnización</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  {result.diasCorrespondientes.toFixed(2)} días
                </td>
              </tr>
              {result.maximoAplicado && (
                <tr>
                  <td colspan={2} style={{ color: 'var(--color-warning)', fontStyle: 'italic' }}>
                    Se ha aplicado el tope máximo legal
                  </td>
                </tr>
              )}
              <tr>
                <td><strong>Indemnización total</strong></td>
                <td><strong>{formatCurrency(result.indemnizacionTotal)}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Pre-2012 split breakdown */}
          {result.desglosePre2012 && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <p class="calculator__inputs-title" style={{ marginBottom: 'var(--space-3)' }}>
                Desglose por periodos (pre/post febrero 2012)
              </p>
              <table class="calculator__breakdown">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Años</th>
                    <th>Días</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Antes del 12/02/2012 (45 días/año)</td>
                    <td>{result.desglosePre2012.periodoAnterior.anios.toFixed(2)}</td>
                    <td>{result.desglosePre2012.periodoAnterior.dias.toFixed(2)}</td>
                    <td>{formatCurrency(result.desglosePre2012.periodoAnterior.importe)}</td>
                  </tr>
                  <tr>
                    <td>Después del 12/02/2012 (33 días/año)</td>
                    <td>{result.desglosePre2012.periodoPosterior.anios.toFixed(2)}</td>
                    <td>{result.desglosePre2012.periodoPosterior.dias.toFixed(2)}</td>
                    <td>{formatCurrency(result.desglosePre2012.periodoPosterior.importe)}</td>
                  </tr>
                  <tr>
                    <td><strong>Total</strong></td>
                    <td></td>
                    <td><strong>{result.diasCorrespondientes.toFixed(2)}</strong></td>
                    <td><strong>{formatCurrency(result.indemnizacionTotal)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* IRPF exemption note */}
          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              {result.exentaIRPF ? (
                <p>
                  <strong>Exenta de IRPF.</strong> La indemnización de{' '}
                  {formatCurrency(result.indemnizacionTotal)} no supera el límite de
                  180.000€ y, al ser la indemnización obligatoria por ley, está exenta
                  de tributación en el IRPF.
                </p>
              ) : (
                <p>
                  <strong>Sujeta a IRPF parcialmente.</strong> La indemnización supera los
                  180.000€ exentos. El exceso de{' '}
                  {formatCurrency(result.indemnizacionTotal - 180000)} tributará como
                  rendimiento del trabajo en tu declaración de la renta.
                </p>
              )}
            </div>
          </div>

          {tipoDespido === 'disciplinario' && result.indemnizacionTotal === 0 && (
            <div class="calculator__disclaimer">
              <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
              <p>
                El despido disciplinario procedente no genera derecho a indemnización.
                Si el despido es declarado improcedente por un juez, se aplicarían
                las condiciones del despido improcedente (33 días/año, máximo 24 mensualidades).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
