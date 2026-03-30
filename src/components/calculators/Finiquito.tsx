import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularFiniquito } from '@lib/calculations/laboral';
import type { FiniquitoData, FiniquitoResult } from '@lib/types';

interface Props {
  finiquitoData: FiniquitoData;
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Finiquito({ finiquitoData }: Props) {
  const today = new Date();

  const [fechaBaja, setFechaBaja] = useState(toDateInputValue(today));
  const [salarioBrutoAnual, setSalarioBrutoAnual] = useState('28000');
  const [pagasExtra, setPagasExtra] = useState<12 | 14>(14);
  const [pagasProrrateadas, setPagasProrrateadas] = useState(false);
  const [diasVacacionesTotales, setDiasVacacionesTotales] = useState('22');
  const [diasVacacionesDisfrutados, setDiasVacacionesDisfrutados] = useState('0');
  const [retencionIRPF, setRetencionIRPF] = useState(
    String(finiquitoData.retencionIRPF.porDefecto)
  );
  const [result, setResult] = useState<FiniquitoResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const salario = parseFloat(salarioBrutoAnual);
    if (isNaN(salario) || salario <= 0) {
      setError('Introduce un salario bruto anual válido.');
      return;
    }

    if (!fechaBaja) {
      setError('Introduce la fecha de baja.');
      return;
    }

    const fecha = new Date(fechaBaja);
    if (isNaN(fecha.getTime())) {
      setError('La fecha de baja no es válida.');
      return;
    }

    const vacTotal = parseInt(diasVacacionesTotales, 10);
    const vacDisfrutados = parseInt(diasVacacionesDisfrutados, 10);
    const irpf = parseFloat(retencionIRPF);

    if (isNaN(vacTotal) || vacTotal < 0) {
      setError('Introduce un número válido de días de vacaciones totales.');
      return;
    }

    if (isNaN(vacDisfrutados) || vacDisfrutados < 0) {
      setError('Introduce un número válido de días de vacaciones disfrutados.');
      return;
    }

    if (vacDisfrutados > vacTotal) {
      setError('Los días disfrutados no pueden superar los días totales de vacaciones.');
      return;
    }

    if (isNaN(irpf) || irpf < 0 || irpf > 100) {
      setError('Introduce un porcentaje de IRPF válido (0-100).');
      return;
    }

    try {
      const res = calcularFiniquito(
        {
          fechaBaja: fecha,
          salarioBrutoAnual: salario,
          pagasExtra,
          pagasProrrateadas: pagasExtra === 14 ? pagasProrrateadas : true,
          diasVacacionesTotales: vacTotal,
          diasVacacionesDisfrutados: vacDisfrutados,
          retencionIRPF: irpf,
        },
        finiquitoData
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
          {/* Fecha de baja */}
          <div class="form-group">
            <label class="form-label" htmlFor="fq-fecha-baja">
              Fecha de baja
            </label>
            <input
              id="fq-fecha-baja"
              type="date"
              class="form-input"
              value={fechaBaja}
              onInput={(e) => setFechaBaja((e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Salario bruto anual */}
          <div class="form-group">
            <label class="form-label" htmlFor="fq-salario">
              Salario bruto anual
            </label>
            <div class="input-currency">
              <input
                id="fq-salario"
                type="number"
                class="form-input"
                min="0"
                step="500"
                value={salarioBrutoAnual}
                onInput={(e) => setSalarioBrutoAnual((e.target as HTMLInputElement).value)}
                placeholder="28.000"
              />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>

          {/* Número de pagas */}
          <div class="form-group">
            <label class="form-label">Número de pagas</label>
            <div class="form-radio-group">
              <label class="form-radio">
                <input
                  type="radio"
                  name="fq-pagas"
                  checked={pagasExtra === 14}
                  onChange={() => setPagasExtra(14)}
                />
                <span>14 pagas</span>
              </label>
              <label class="form-radio">
                <input
                  type="radio"
                  name="fq-pagas"
                  checked={pagasExtra === 12}
                  onChange={() => {
                    setPagasExtra(12);
                    setPagasProrrateadas(true);
                  }}
                />
                <span>12 pagas</span>
              </label>
            </div>
          </div>

          {/* Pagas prorrateadas (only if 14 pagas) */}
          {pagasExtra === 14 && (
            <div class="form-group">
              <label class="form-label">¿Pagas prorrateadas?</label>
              <div class="form-radio-group">
                <label class="form-radio">
                  <input
                    type="radio"
                    name="fq-prorrateadas"
                    checked={pagasProrrateadas}
                    onChange={() => setPagasProrrateadas(true)}
                  />
                  <span>Sí (incluidas en nómina)</span>
                </label>
                <label class="form-radio">
                  <input
                    type="radio"
                    name="fq-prorrateadas"
                    checked={!pagasProrrateadas}
                    onChange={() => setPagasProrrateadas(false)}
                  />
                  <span>No (pago aparte)</span>
                </label>
              </div>
              <p class="form-hint">
                Si las pagas extra se cobran aparte (junio y diciembre), el finiquito incluirá la parte proporcional devengada.
              </p>
            </div>
          )}

          {/* Días de vacaciones anuales */}
          <div class="form-group">
            <label class="form-label" htmlFor="fq-vac-totales">
              Días de vacaciones anuales
            </label>
            <input
              id="fq-vac-totales"
              type="number"
              class="form-input"
              min="0"
              max="60"
              value={diasVacacionesTotales}
              onInput={(e) => setDiasVacacionesTotales((e.target as HTMLInputElement).value)}
            />
            <p class="form-hint">Mínimo legal: 22 días laborables. Consulta tu convenio.</p>
          </div>

          {/* Días disfrutados */}
          <div class="form-group">
            <label class="form-label" htmlFor="fq-vac-disfrutados">
              Días de vacaciones disfrutados
            </label>
            <input
              id="fq-vac-disfrutados"
              type="number"
              class="form-input"
              min="0"
              max="60"
              value={diasVacacionesDisfrutados}
              onInput={(e) => setDiasVacacionesDisfrutados((e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Retención IRPF */}
          <div class="form-group">
            <label class="form-label" htmlFor="fq-irpf">
              Retención IRPF
            </label>
            <div class="input-currency">
              <input
                id="fq-irpf"
                type="number"
                class="form-input"
                min="0"
                max="100"
                step="0.5"
                value={retencionIRPF}
                onInput={(e) => setRetencionIRPF((e.target as HTMLInputElement).value)}
              />
              <span class="input-currency__symbol">%</span>
            </div>
            <p class="form-hint">Consulta tu última nómina para conocer tu retención exacta.</p>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular finiquito
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Tu finiquito</p>

          <div class="calculator__result-main">
            {formatCurrency(result.totalNeto)}
          </div>
          <p class="calculator__result-label">
            Finiquito neto
          </p>

          <p style={{
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: '0.95rem',
            marginBottom: 'var(--space-6)',
          }}>
            Finiquito bruto: {formatCurrency(result.totalBruto)}
          </p>

          {/* Breakdown table */}
          <table class="calculator__breakdown">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              {result.desglose.map((item) => (
                <tr key={item.concepto}>
                  <td>{item.concepto}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success, #2f7d3a)' }}>
                    +{formatCurrency(item.bruto)}
                  </td>
                </tr>
              ))}
              <tr class="calculator__breakdown-total">
                <td><strong>Total bruto</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  <strong>{formatCurrency(result.totalBruto)}</strong>
                </td>
              </tr>
              <tr>
                <td>Retención IRPF ({formatPercent(parseFloat(retencionIRPF))})</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-error, #c53030)' }}>
                  -{formatCurrency(result.retencionIRPFImporte)}
                </td>
              </tr>
              <tr>
                <td>Cotización Seguridad Social</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-error, #c53030)' }}>
                  -{formatCurrency(result.cotizacionSS)}
                </td>
              </tr>
              <tr class="calculator__breakdown-total">
                <td><strong>Total neto</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  <strong>{formatCurrency(result.totalNeto)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
            <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
            <div>
              <p>
                El finiquito se cobra en <strong>todos los casos</strong> de extinción del contrato,
                incluida la baja voluntaria. Es independiente de la indemnización por despido, que
                solo corresponde en ciertos tipos de despido.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
