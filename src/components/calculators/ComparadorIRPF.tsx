import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularCuotaPorTramos } from '@lib/calculations/shared';
import { round2 } from '@lib/formatters';
import CopyButton from './CopyButton';
import type { IRPFData, ComunidadAutonoma } from '@lib/types';
import { CCAA_OPTIONS } from '@lib/types';

interface Props {
  irpfData: IRPFData;
}

interface CcaaResult {
  ccaa: ComunidadAutonoma;
  label: string;
  cuotaEstatal: number;
  cuotaAutonomica: number;
  cuotaTotal: number;
  tipoEfectivo: number;
  neto: number;
  esForal: boolean;
}

export default function ComparadorIRPF({ irpfData }: Props) {
  const [salario, setSalario] = useState('35000');
  const [results, setResults] = useState<CcaaResult[] | null>(null);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'cuota' | 'tipo'>('cuota');

  function handleCalculate() {
    setError('');
    const bruto = parseFloat(salario);
    if (isNaN(bruto) || bruto <= 0) {
      setError('Introduce un salario bruto anual válido.');
      return;
    }

    // Simplified: assume employee, no children, standard SS ~6.47%
    const cotizacionSS = round2(bruto * 0.0647);
    const rendimientosNetos = bruto - cotizacionSS;

    // Reducción rendimientos del trabajo
    let reduccion = 0;
    if (rendimientosNetos <= 14852) {
      reduccion = 7302;
    } else if (rendimientosNetos <= 17673.52) {
      reduccion = Math.max(0, 7302 - 1.75 * (rendimientosNetos - 14852));
    }

    const baseLiquidable = Math.max(0, rendimientosNetos - reduccion);
    const minimoPersonal = irpfData.minimoPersonal;

    const allResults: CcaaResult[] = CCAA_OPTIONS.map((opt) => {
      const ccaaData = irpfData.tramosAutonomicos[opt.value];
      const esForal = ccaaData?.regimenForal === true;

      let cuotaEstatal = 0;
      let cuotaAutonomica = 0;

      if (esForal) {
        const cuotaIntegra = calcularCuotaPorTramos(baseLiquidable, ccaaData.tramos);
        const cuotaMinimo = calcularCuotaPorTramos(minimoPersonal, ccaaData.tramos);
        cuotaAutonomica = round2(Math.max(0, cuotaIntegra - cuotaMinimo));
      } else {
        const cuotaIntegraEstatal = calcularCuotaPorTramos(baseLiquidable, irpfData.tramosEstatales);
        const cuotaMinimoEstatal = calcularCuotaPorTramos(minimoPersonal, irpfData.tramosEstatales);
        cuotaEstatal = round2(Math.max(0, cuotaIntegraEstatal - cuotaMinimoEstatal));

        const tramosAut = ccaaData?.tramos ?? irpfData.tramosEstatales;
        const cuotaIntegraAut = calcularCuotaPorTramos(baseLiquidable, tramosAut);
        const cuotaMinimoAut = calcularCuotaPorTramos(minimoPersonal, tramosAut);
        cuotaAutonomica = round2(Math.max(0, cuotaIntegraAut - cuotaMinimoAut));
      }

      const cuotaTotal = round2(cuotaEstatal + cuotaAutonomica);
      const tipoEfectivo = bruto > 0 ? round2((cuotaTotal / bruto) * 100) : 0;
      const neto = round2(bruto - cotizacionSS - cuotaTotal);

      return {
        ccaa: opt.value,
        label: opt.label,
        cuotaEstatal,
        cuotaAutonomica,
        cuotaTotal,
        tipoEfectivo,
        neto,
        esForal,
      };
    });

    setResults(allResults);
  }

  const sorted = results
    ? [...results].sort((a, b) =>
        sortBy === 'cuota' ? a.cuotaTotal - b.cuotaTotal : a.tipoEfectivo - b.tipoEfectivo
      )
    : null;

  const minCuota = sorted ? sorted[0]?.cuotaTotal : 0;
  const maxCuota = sorted ? sorted[sorted.length - 1]?.cuotaTotal : 0;

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Introduce tu salario</p>
        <div class="calculator__grid">
          <div class="form-group">
            <label class="form-label" htmlFor="comp-salario">
              Salario bruto anual (€)
            </label>
            <div class="input-currency">
              <input
                id="comp-salario"
                type="number"
                class="form-input"
                min="0"
                step="1000"
                value={salario}
                onInput={(e) => setSalario((e.target as HTMLInputElement).value)}
                placeholder="35.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
            <p class="form-hint">
              Cálculo simplificado: trabajador soltero, sin hijos, contrato indefinido
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--color-error)', marginBottom: 'var(--space-4)' }}>{error}</p>
      )}

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Comparar todas las comunidades
      </button>

      {sorted && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">IRPF por comunidad autónoma</p>

          <div style={{
            display: 'flex',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
            flexWrap: 'wrap',
          }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-success-light, #e6f4ea)',
              borderRadius: 'var(--radius-md)',
              flex: '1 1 200px',
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                Menos IRPF
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 0 }}>
                {sorted[0].label}: {formatCurrency(sorted[0].cuotaTotal)}
              </p>
            </div>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-bg-alt)',
              borderRadius: 'var(--radius-md)',
              flex: '1 1 200px',
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                Más IRPF
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 0 }}>
                {sorted[sorted.length - 1].label}: {formatCurrency(sorted[sorted.length - 1].cuotaTotal)}
              </p>
            </div>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-accent-light)',
              borderRadius: 'var(--radius-md)',
              flex: '1 1 200px',
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                Diferencia máxima
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 0 }}>
                {formatCurrency(maxCuota - minCuota)}/año
              </p>
            </div>
          </div>
          <CopyButton text={`IRPF más bajo: ${sorted[0].label} (${formatCurrency(sorted[0].cuotaTotal)}) | Más alto: ${sorted[sorted.length - 1].label} (${formatCurrency(sorted[sorted.length - 1].cuotaTotal)})`} />

          <div style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Ordenar por:</span>
            <button
              onClick={() => setSortBy('cuota')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: sortBy === 'cuota' ? 700 : 400,
                color: sortBy === 'cuota' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                textDecoration: sortBy === 'cuota' ? 'underline' : 'none',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 'inherit',
              }}
            >
              Cuota IRPF
            </button>
            <button
              onClick={() => setSortBy('tipo')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: sortBy === 'tipo' ? 700 : 400,
                color: sortBy === 'tipo' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                textDecoration: sortBy === 'tipo' ? 'underline' : 'none',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 'inherit',
              }}
            >
              Tipo efectivo
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table class="calculator__breakdown">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Comunidad Autónoma</th>
                  <th>Cuota IRPF</th>
                  <th>Tipo efectivo</th>
                  <th>Neto anual</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const range = maxCuota - minCuota;
                  const barWidth = range > 0 ? ((r.cuotaTotal - minCuota) / range) * 100 : 50;
                  return (
                    <tr key={r.ccaa}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        {i + 1}
                      </td>
                      <td>
                        <strong>{r.label}</strong>
                        {r.esForal && (
                          <span style={{
                            fontSize: '0.7rem',
                            marginLeft: 'var(--space-2)',
                            padding: '1px 6px',
                            backgroundColor: 'var(--color-bg-alt)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-text-secondary)',
                          }}>
                            Foral
                          </span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(r.cuotaTotal)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatPercent(r.tipoEfectivo, 2)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(r.neto)}
                      </td>
                      <td style={{ minWidth: '100px' }}>
                        <div style={{
                          height: '8px',
                          backgroundColor: 'var(--color-border)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.max(barWidth, 3)}%`,
                            backgroundColor: barWidth < 30 ? 'var(--color-success)' : barWidth > 70 ? 'var(--color-warning)' : 'var(--color-accent)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
