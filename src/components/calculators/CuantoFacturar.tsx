import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularFacturacionAutonomo } from '@lib/calculations/autonomos';
import CopyButton from './CopyButton';
import type {
  AutonomosData,
  IRPFData,
  AutonomoResult,
  ComunidadAutonoma,
} from '@lib/types';
import { CCAA_OPTIONS } from '@lib/types';

interface Props {
  autonomosData: AutonomosData;
  irpfData: IRPFData;
}

export default function CuantoFacturar({ autonomosData, irpfData }: Props) {
  const [ingresoNeto, setIngresoNeto] = useState('2000');
  const [situacion, setSituacion] = useState<'nuevo' | 'establecido'>('establecido');
  const [ccaa, setCcaa] = useState<ComunidadAutonoma>('madrid');
  const [gastos, setGastos] = useState('200');
  const [result, setResult] = useState<AutonomoResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const ingresoNetoNum = parseFloat(ingresoNeto);
    const gastosNum = parseFloat(gastos);

    if (isNaN(ingresoNetoNum) || ingresoNetoNum <= 0) {
      setError('Introduce un ingreso neto deseado válido.');
      return;
    }
    if (isNaN(gastosNum) || gastosNum < 0) {
      setError('Introduce unos gastos válidos.');
      return;
    }

    try {
      const res = calcularFacturacionAutonomo(
        {
          ingresoNetoDeseado: ingresoNetoNum,
          situacion,
          ccaa,
          gastosNegocio: gastosNum,
        },
        autonomosData,
        irpfData
      );
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function barPercents(r: AutonomoResult) {
    const total = r.facturacionMensualSinIVA;
    if (total <= 0) return { neto: 0, ss: 0, irpf: 0, gastos: 0 };
    return {
      neto: (r.desglose.ingresoNeto / total) * 100,
      ss: (r.desglose.cuotaSS / total) * 100,
      irpf: (r.desglose.retencionIRPFMensual / total) * 100,
      gastos: (r.desglose.gastos / total) * 100,
    };
  }

  return (
    <div class="calculator">
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Datos del autónomo</p>
        <div class="calculator__grid">
          {/* Ingreso neto deseado */}
          <div class="form-group">
            <label class="form-label" htmlFor="cf-ingreso-neto">
              Ingresos netos deseados (€/mes)
            </label>
            <div class="input-currency">
              <input
                id="cf-ingreso-neto"
                type="number"
                class="form-input"
                min="0"
                step="100"
                value={ingresoNeto}
                onInput={(e) => setIngresoNeto((e.target as HTMLInputElement).value)}
                placeholder="2.000"
              />
              <span class="input-currency__symbol">€</span>
            </div>
          </div>

          {/* Gastos mensuales */}
          <div class="form-group">
            <label class="form-label" htmlFor="cf-gastos">
              Gastos mensuales del negocio (€)
            </label>
            <div class="input-currency">
              <input
                id="cf-gastos"
                type="number"
                class="form-input"
                min="0"
                step="50"
                value={gastos}
                onInput={(e) => setGastos((e.target as HTMLInputElement).value)}
                placeholder="200"
              />
              <span class="input-currency__symbol">€</span>
            </div>
          </div>

          {/* Situación */}
          <div class="form-group">
            <span class="form-label">Situación</span>
            <div class="radio-group" role="radiogroup" aria-label="Situación del autónomo">
              <div class="radio-option">
                <input
                  type="radio"
                  id="cf-sit-nuevo"
                  name="cf-situacion"
                  value="nuevo"
                  checked={situacion === 'nuevo'}
                  onChange={() => setSituacion('nuevo')}
                />
                <label htmlFor="cf-sit-nuevo">Nuevo autónomo</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="cf-sit-establecido"
                  name="cf-situacion"
                  value="establecido"
                  checked={situacion === 'establecido'}
                  onChange={() => setSituacion('establecido')}
                />
                <label htmlFor="cf-sit-establecido">Establecido</label>
              </div>
            </div>
            {situacion === 'nuevo' && (
              <p class="form-hint">
                Tarifa plana: {formatCurrency(autonomosData.tarifaPlana.cuotaMensual)}/mes
                durante {autonomosData.tarifaPlana.duracionMeses} meses
              </p>
            )}
          </div>

          {/* Comunidad Autónoma */}
          <div class="form-group">
            <label class="form-label" htmlFor="cf-ccaa">
              Comunidad Autónoma
            </label>
            <select
              id="cf-ccaa"
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
          <p class="calculator__results-title">Resultado</p>

          <div class="calculator__result-main">
            {formatCurrency(result.facturacionMensualBruta)}
          </div>
          <p class="calculator__result-label">
            Facturación mensual bruta (IVA incluido)
          </p>
          <CopyButton text={`Facturación mensual: ${formatCurrency(result.facturacionMensualBruta)} (con IVA)`} />

          <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>
            Sin IVA: <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(result.facturacionMensualSinIVA)}
            </strong>/mes
            {' — '}
            Anual: <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(result.facturacionAnualBruta)}
            </strong>
          </p>

          <p style={{ fontSize: '1rem', marginBottom: 'var(--space-6)', fontStyle: 'italic' }}>
            Por cada euro que facturas, te quedan{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
              {result.ratioNetoFacturacion.toFixed(2)}€
            </strong>
          </p>

          {/* Bar chart */}
          {(() => {
            const pct = barPercents(result);
            return (
              <>
                <div class="calculator__bar" aria-hidden="true">
                  <div
                    class="calculator__bar-segment calculator__bar-segment--neto"
                    style={{ width: `${pct.neto}%` }}
                  />
                  <div
                    class="calculator__bar-segment calculator__bar-segment--ss"
                    style={{ width: `${pct.ss}%` }}
                  />
                  <div
                    class="calculator__bar-segment calculator__bar-segment--irpf"
                    style={{ width: `${pct.irpf}%` }}
                  />
                  <div
                    class="calculator__bar-segment calculator__bar-segment--gastos"
                    style={{ width: `${pct.gastos}%` }}
                  />
                </div>
                <div class="calculator__bar-legend">
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                    Neto ({formatPercent(pct.neto, 1)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-info)' }} />
                    Seg. Social ({formatPercent(pct.ss, 1)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-warning)' }} />
                    IRPF ({formatPercent(pct.irpf, 1)})
                  </span>
                  <span class="calculator__bar-legend-item">
                    <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-text-secondary)' }} />
                    Gastos ({formatPercent(pct.gastos, 1)})
                  </span>
                </div>
              </>
            );
          })()}

          {/* Desglose table */}
          <table class="calculator__breakdown" style={{ marginTop: 'var(--space-6)' }}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Mensual</th>
                <th>Anual</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ingreso neto</td>
                <td>{formatCurrency(result.desglose.ingresoNeto)}</td>
                <td>{formatCurrency(result.desglose.ingresoNeto * 12)}</td>
              </tr>
              <tr>
                <td>Cuota Seguridad Social</td>
                <td>{formatCurrency(result.desglose.cuotaSS)}</td>
                <td>{formatCurrency(result.desglose.cuotaSS * 12)}</td>
              </tr>
              <tr>
                <td>IRPF ({formatPercent(result.tipoIRPFEfectivo, 1)} efectivo)</td>
                <td>{formatCurrency(result.desglose.retencionIRPFMensual)}</td>
                <td>{formatCurrency(result.desglose.retencionIRPFMensual * 12)}</td>
              </tr>
              <tr>
                <td>Gastos del negocio</td>
                <td>{formatCurrency(result.desglose.gastos)}</td>
                <td>{formatCurrency(result.desglose.gastos * 12)}</td>
              </tr>
              <tr>
                <td>IVA (21%)</td>
                <td>{formatCurrency(result.desglose.ivaMensual)}</td>
                <td>{formatCurrency(result.desglose.ivaMensual * 12)}</td>
              </tr>
              <tr>
                <td><strong>Facturación bruta</strong></td>
                <td><strong>{formatCurrency(result.facturacionMensualBruta)}</strong></td>
                <td><strong>{formatCurrency(result.facturacionAnualBruta)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
