import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularCuotaAutonomo } from '@lib/calculations/autonomos';
import type { AutonomosData, CuotaAutonomoResult } from '@lib/types';

interface Props {
  autonomosData: AutonomosData;
}

export default function CuotaAutonomos({ autonomosData }: Props) {
  const [rendimientos, setRendimientos] = useState('1500');
  const [situacion, setSituacion] = useState<'nuevo' | 'establecido'>('establecido');
  const [tipoBase, setTipoBase] = useState<'minima' | 'personalizada'>('minima');
  const [basePersonalizada, setBasePersonalizada] = useState('');
  const [result, setResult] = useState<CuotaAutonomoResult | null>(null);
  const [error, setError] = useState('');

  function handleCalculate() {
    setError('');

    const rendimientosNum = parseFloat(rendimientos);
    if (isNaN(rendimientosNum) || rendimientosNum <= 0) {
      setError('Introduce unos rendimientos netos mensuales válidos (mayor que 0).');
      return;
    }

    let basePersonalizadaNum: number | undefined;
    if (tipoBase === 'personalizada') {
      basePersonalizadaNum = parseFloat(basePersonalizada);
      if (isNaN(basePersonalizadaNum) || basePersonalizadaNum <= 0) {
        setError('Introduce una base de cotización personalizada válida.');
        return;
      }
    }

    try {
      const res = calcularCuotaAutonomo(
        {
          rendimientosNetosMensuales: rendimientosNum,
          situacion,
          basePersonalizada: basePersonalizadaNum,
        },
        autonomosData
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
        <p class="calculator__inputs-title">Datos del autónomo</p>
        <div class="calculator__grid">
          {/* Rendimientos netos mensuales */}
          <div class="form-group">
            <label class="form-label" htmlFor="ca-rendimientos">
              Rendimientos netos mensuales
            </label>
            <div class="input-currency">
              <input
                id="ca-rendimientos"
                type="number"
                class="form-input"
                min="0"
                step="100"
                value={rendimientos}
                onInput={(e) => setRendimientos((e.target as HTMLInputElement).value)}
                placeholder="1.500"
              />
              <span class="input-currency__symbol">€</span>
            </div>
            <p class="form-hint">
              Ingresos menos gastos deducibles (sin contar la cuota de autónomos)
            </p>
          </div>

          {/* Situación */}
          <div class="form-group">
            <span class="form-label">Situación</span>
            <div class="radio-group" role="radiogroup" aria-label="Situación del autónomo">
              <div class="radio-option">
                <input
                  type="radio"
                  id="ca-sit-nuevo"
                  name="ca-situacion"
                  value="nuevo"
                  checked={situacion === 'nuevo'}
                  onChange={() => setSituacion('nuevo')}
                />
                <label htmlFor="ca-sit-nuevo">Nuevo autónomo (tarifa plana)</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="ca-sit-establecido"
                  name="ca-situacion"
                  value="establecido"
                  checked={situacion === 'establecido'}
                  onChange={() => setSituacion('establecido')}
                />
                <label htmlFor="ca-sit-establecido">Autónomo establecido</label>
              </div>
            </div>
            {situacion === 'nuevo' && (
              <p class="form-hint">
                Tarifa plana: {formatCurrency(autonomosData.tarifaPlana.cuotaMensual)}/mes
                durante {autonomosData.tarifaPlana.duracionMeses} meses
              </p>
            )}
          </div>

          {/* Base de cotización */}
          <div class="form-group">
            <span class="form-label">Base de cotización</span>
            <div class="radio-group" role="radiogroup" aria-label="Tipo de base de cotización">
              <div class="radio-option">
                <input
                  type="radio"
                  id="ca-base-minima"
                  name="ca-base"
                  value="minima"
                  checked={tipoBase === 'minima'}
                  onChange={() => setTipoBase('minima')}
                />
                <label htmlFor="ca-base-minima">Base mínima del tramo</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="ca-base-personalizada"
                  name="ca-base"
                  value="personalizada"
                  checked={tipoBase === 'personalizada'}
                  onChange={() => setTipoBase('personalizada')}
                />
                <label htmlFor="ca-base-personalizada">Base personalizada</label>
              </div>
            </div>
          </div>

          {/* Base personalizada input */}
          {tipoBase === 'personalizada' && (
            <div class="form-group">
              <label class="form-label" htmlFor="ca-base-custom">
                Base de cotización personalizada
              </label>
              <div class="input-currency">
                <input
                  id="ca-base-custom"
                  type="number"
                  class="form-input"
                  min="0"
                  step="10"
                  value={basePersonalizada}
                  onInput={(e) => setBasePersonalizada((e.target as HTMLInputElement).value)}
                  placeholder="1.000"
                />
                <span class="input-currency__symbol">€</span>
              </div>
              <p class="form-hint">
                Debe estar entre la base mínima y máxima de tu tramo
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

      <button class="btn btn--primary btn--large" onClick={handleCalculate}>
        Calcular cuota
      </button>

      {result && (
        <div class="calculator__results" aria-live="polite">
          <p class="calculator__results-title">Resultado</p>

          <div class="calculator__result-main">
            {formatCurrency(result.cuotaMensual)}
          </div>
          <p class="calculator__result-label">
            Cuota mensual de autónomos
          </p>

          {/* Tarifa plana badge */}
          {result.esTarifaPlana && (
            <div style={{
              display: 'inline-block',
              backgroundColor: 'var(--color-success-light, #f0fdf4)',
              color: 'var(--color-success, #16a34a)',
              border: '1px solid var(--color-success, #16a34a)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: '0.95rem',
              fontWeight: 600,
              marginBottom: 'var(--space-4)',
            }}>
              Tarifa plana: {formatCurrency(autonomosData.tarifaPlana.cuotaMensual)}/mes
              durante {autonomosData.tarifaPlana.duracionMeses} meses
            </div>
          )}

          {result.esTarifaPlana && result.ahorroPorTarifaPlana > 0 && (
            <p style={{
              fontSize: '1rem',
              marginBottom: 'var(--space-4)',
              color: 'var(--color-success, #16a34a)',
              fontWeight: 500,
            }}>
              Te ahorras <strong style={{ fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(result.ahorroPorTarifaPlana)}
              </strong> al año respecto a la cuota normal
            </p>
          )}

          <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-6)' }}>
            Cuota anual: <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(result.cuotaAnual)}
            </strong>
            {' — '}
            Base de cotización: <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(result.baseElegida)}
            </strong>/mes
          </p>

          <p style={{ fontSize: '0.95rem', marginBottom: 'var(--space-6)', fontStyle: 'italic' }}>
            Tramo {result.tramoAplicado.tramoId} (tabla {result.tramoAplicado.tabla})
            {' — '}
            Base mínima: {formatCurrency(result.tramoAplicado.baseMinima)}
            {' / '}
            Base máxima: {formatCurrency(result.tramoAplicado.baseMaxima)}
          </p>

          {/* Desglose de cotización */}
          <table class="calculator__breakdown">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Tipo</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Contingencias comunes</td>
                <td>{formatPercent(autonomosData.tiposCotizacion.contingenciasComunes, 2)}</td>
                <td>{formatCurrency(result.desgloseCotizacion.contingenciasComunes)}</td>
              </tr>
              <tr>
                <td>Contingencias profesionales</td>
                <td>{formatPercent(autonomosData.tiposCotizacion.contingenciasProfesionales, 2)}</td>
                <td>{formatCurrency(result.desgloseCotizacion.contingenciasProfesionales)}</td>
              </tr>
              <tr>
                <td>Cese de actividad</td>
                <td>{formatPercent(autonomosData.tiposCotizacion.ceseProfesional, 2)}</td>
                <td>{formatCurrency(result.desgloseCotizacion.ceseProfesional)}</td>
              </tr>
              <tr>
                <td>Formación profesional</td>
                <td>{formatPercent(autonomosData.tiposCotizacion.formacionProfesional, 2)}</td>
                <td>{formatCurrency(result.desgloseCotizacion.formacionProfesional)}</td>
              </tr>
              <tr>
                <td>MEI</td>
                <td>{formatPercent(autonomosData.tiposCotizacion.mei, 2)}</td>
                <td>{formatCurrency(result.desgloseCotizacion.mei)}</td>
              </tr>
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>{formatPercent(autonomosData.tiposCotizacion.total, 2)}</strong></td>
                <td><strong>{result.esTarifaPlana
                  ? formatCurrency(autonomosData.tarifaPlana.cuotaMensual)
                  : formatCurrency(result.cuotaMensual)
                }</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Tabla de todos los tramos */}
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.15rem',
            marginTop: 'var(--space-8)',
            marginBottom: 'var(--space-4)',
          }}>
            Los 15 tramos de cotización 2026
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table class="calculator__breakdown">
              <thead>
                <tr>
                  <th>Tramo</th>
                  <th>Tabla</th>
                  <th>Rendimientos netos</th>
                  <th>Cuota mínima</th>
                </tr>
              </thead>
              <tbody>
                {result.tablaTramos.map((t) => (
                  <tr
                    key={t.tramoId}
                    style={t.esActual
                      ? { backgroundColor: 'var(--color-accent-light)', fontWeight: 600 }
                      : undefined
                    }
                  >
                    <td>{t.tramoId}</td>
                    <td>{t.tabla}</td>
                    <td>{t.rango}</td>
                    <td>{formatCurrency(t.cuotaMinima)}</td>
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
