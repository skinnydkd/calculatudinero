import { useState } from 'preact/hooks';
import { formatCurrency, formatPercent } from '@lib/formatters';
import { calcularPrestamoPersonal, compararPrestamos } from '@lib/calculations/ahorro';
import CopyButton from './CopyButton';
import type { PrestamosReferenciaData, PrestamoPersonalResult } from '@lib/types';

interface Props {
  prestamosData: PrestamosReferenciaData;
}

type Tab = 'calcular' | 'comparar';

const TIPO_LABELS: Record<string, string> = {
  personal: 'Personal',
  vehiculo: 'Vehículo',
  reforma: 'Reforma',
  estudios: 'Estudios',
};

export default function PrestamoPersonal({ prestamosData }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('calcular');

  // --- Single loan inputs ---
  const [capital, setCapital] = useState('10000');
  const [tin, setTin] = useState('7.5');
  const [plazoMeses, setPlazoMeses] = useState('48');
  const [comisionApertura, setComisionApertura] = useState('1');
  const [seguroMensual, setSeguroMensual] = useState('0');
  const [result, setResult] = useState<PrestamoPersonalResult | null>(null);

  // --- Compare inputs ---
  const [c1Capital, setC1Capital] = useState('10000');
  const [c1Tin, setC1Tin] = useState('7.5');
  const [c1Plazo, setC1Plazo] = useState('48');
  const [c1Comision, setC1Comision] = useState('1.5');
  const [c1Seguro, setC1Seguro] = useState('15');

  const [c2Capital, setC2Capital] = useState('10000');
  const [c2Tin, setC2Tin] = useState('6.5');
  const [c2Plazo, setC2Plazo] = useState('48');
  const [c2Comision, setC2Comision] = useState('0');
  const [c2Seguro, setC2Seguro] = useState('0');

  const [compareResult, setCompareResult] = useState<{
    prestamo1: PrestamoPersonalResult;
    prestamo2: PrestamoPersonalResult;
    mejorOpcion: 1 | 2;
    ahorro: number;
  } | null>(null);

  const [error, setError] = useState('');

  function setTipoPrestamo(tipo: string) {
    const ref = prestamosData.tiposReferencia[tipo];
    if (ref) {
      setTin(String(ref.tinMedia));
    }
  }

  function validateLoanInput(
    capitalStr: string,
    tinStr: string,
    plazoStr: string,
    comisionStr: string,
    seguroStr: string,
    label: string
  ): { capital: number; tin: number; plazo: number; comision: number; seguro: number } | null {
    const cap = parseFloat(capitalStr);
    if (isNaN(cap) || cap < prestamosData.importeMinimo || cap > prestamosData.importeMaximo) {
      setError(`${label}: importe entre ${formatCurrency(prestamosData.importeMinimo)} y ${formatCurrency(prestamosData.importeMaximo)}.`);
      return null;
    }
    const t = parseFloat(tinStr);
    if (isNaN(t) || t < 0 || t > 30) {
      setError(`${label}: introduce un TIN válido (0-30%).`);
      return null;
    }
    const p = parseInt(plazoStr, 10);
    if (isNaN(p) || p < prestamosData.plazoMinimo || p > prestamosData.plazoMaximo) {
      setError(`${label}: plazo entre ${prestamosData.plazoMinimo} y ${prestamosData.plazoMaximo} meses.`);
      return null;
    }
    const c = parseFloat(comisionStr);
    if (isNaN(c) || c < 0 || c > 10) {
      setError(`${label}: comisión de apertura entre 0% y 10%.`);
      return null;
    }
    const s = parseFloat(seguroStr);
    if (isNaN(s) || s < 0 || s > 500) {
      setError(`${label}: seguro mensual entre 0 € y 500 €.`);
      return null;
    }
    return { capital: cap, tin: t, plazo: p, comision: c, seguro: s };
  }

  function handleCalcular() {
    setError('');
    const v = validateLoanInput(capital, tin, plazoMeses, comisionApertura, seguroMensual, 'Préstamo');
    if (!v) return;

    try {
      const res = calcularPrestamoPersonal({
        capital: v.capital,
        tin: v.tin,
        plazoMeses: v.plazo,
        comisionApertura: v.comision,
        seguroMensual: v.seguro,
      });
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function handleComparar() {
    setError('');
    const v1 = validateLoanInput(c1Capital, c1Tin, c1Plazo, c1Comision, c1Seguro, 'Oferta 1');
    if (!v1) return;
    const v2 = validateLoanInput(c2Capital, c2Tin, c2Plazo, c2Comision, c2Seguro, 'Oferta 2');
    if (!v2) return;

    try {
      const res = compararPrestamos(
        { capital: v1.capital, tin: v1.tin, plazoMeses: v1.plazo, comisionApertura: v1.comision, seguroMensual: v1.seguro },
        { capital: v2.capital, tin: v2.tin, plazoMeses: v2.plazo, comisionApertura: v2.comision, seguroMensual: v2.seguro }
      );
      setCompareResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Calculation error:', msg);
      setError('Error en el cálculo: ' + msg);
    }
  }

  function renderLoanInputs(
    prefix: string,
    label: string,
    capitalVal: string, setCapitalVal: (v: string) => void,
    tinVal: string, setTinVal: (v: string) => void,
    plazoVal: string, setPlazoVal: (v: string) => void,
    comisionVal: string, setComisionVal: (v: string) => void,
    seguroVal: string, setSeguroVal: (v: string) => void,
  ) {
    return (
      <div class="calculator__inputs" style={{ marginBottom: 'var(--space-4)' }}>
        <p class="calculator__inputs-title">{label}</p>
        <div class="calculator__grid">
          <div class="form-group">
            <label class="form-label" htmlFor={`${prefix}-capital`}>Importe del préstamo</label>
            <div class="input-currency">
              <input id={`${prefix}-capital`} type="number" class="form-input" min={prestamosData.importeMinimo} max={prestamosData.importeMaximo} step="500" value={capitalVal} onInput={(e) => setCapitalVal((e.target as HTMLInputElement).value)} placeholder="10.000" />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" htmlFor={`${prefix}-tin`}>TIN anual</label>
            <div class="input-currency">
              <input id={`${prefix}-tin`} type="number" class="form-input" min="0" max="30" step="0.1" value={tinVal} onInput={(e) => setTinVal((e.target as HTMLInputElement).value)} placeholder="7,5" />
              <span class="input-currency__symbol">%</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" htmlFor={`${prefix}-plazo`}>
              Plazo: {plazoVal} meses ({Math.floor(parseInt(plazoVal, 10) / 12)} años y {parseInt(plazoVal, 10) % 12} meses)
            </label>
            <input id={`${prefix}-plazo`} type="range" class="form-range" min={prestamosData.plazoMinimo} max={prestamosData.plazoMaximo} step="1" value={plazoVal} onInput={(e) => setPlazoVal((e.target as HTMLInputElement).value)} />
          </div>
          <div class="form-group">
            <label class="form-label" htmlFor={`${prefix}-comision`}>Comisión de apertura</label>
            <div class="input-currency">
              <input id={`${prefix}-comision`} type="number" class="form-input" min="0" max="10" step="0.1" value={comisionVal} onInput={(e) => setComisionVal((e.target as HTMLInputElement).value)} placeholder="1" />
              <span class="input-currency__symbol">%</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" htmlFor={`${prefix}-seguro`}>Seguro mensual vinculado</label>
            <div class="input-currency">
              <input id={`${prefix}-seguro`} type="number" class="form-input" min="0" max="500" step="1" value={seguroVal} onInput={(e) => setSeguroVal((e.target as HTMLInputElement).value)} placeholder="0" />
              <span class="input-currency__symbol">&euro;</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderResultCard(res: PrestamoPersonalResult, label: string, highlight: boolean) {
    return (
      <div
        class="calculator__results"
        style={{
          ...(highlight ? { borderLeft: '4px solid var(--color-success, #2f7d3a)' } : {}),
          marginBottom: 'var(--space-4)',
        }}
        aria-live="polite"
      >
        <p class="calculator__results-title">{label}</p>
        <div class="calculator__result-main">
          {formatCurrency(res.cuotaMensual)}
        </div>
        <p class="calculator__result-label">Cuota mensual</p>

        <div class="ic-summary" style={{ marginTop: 'var(--space-4)' }}>
          <div class="ic-summary__item">
            <span class="ic-summary__label">TAE calculada</span>
            <span class="ic-summary__value ic-summary__value--accent">{formatPercent(res.taeCalculada, 2)}</span>
          </div>
          <div class="ic-summary__item">
            <span class="ic-summary__label">Total intereses</span>
            <span class="ic-summary__value">{formatCurrency(res.totalIntereses)}</span>
          </div>
          <div class="ic-summary__item">
            <span class="ic-summary__label">Coste total</span>
            <span class="ic-summary__value">{formatCurrency(res.costeTotal)}</span>
          </div>
        </div>

        {/* Desglose table */}
        <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
          <table class="calculator__breakdown">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              {res.desglose.map((d) => (
                <tr key={d.concepto}>
                  <td>{d.concepto}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(d.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div class="calculator">
      {/* Tab buttons */}
      <div class="calculator__tabs" role="tablist" aria-label="Secciones de la calculadora">
        <button
          role="tab"
          aria-selected={activeTab === 'calcular'}
          class={`calculator__tab ${activeTab === 'calcular' ? 'calculator__tab--active' : ''}`}
          onClick={() => { setActiveTab('calcular'); setError(''); }}
        >
          Calcular cuota
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'comparar'}
          class={`calculator__tab ${activeTab === 'comparar' ? 'calculator__tab--active' : ''}`}
          onClick={() => { setActiveTab('comparar'); setError(''); }}
        >
          Comparar préstamos
        </button>
      </div>

      {/* ================================================================
          TAB 1: Calcular cuota
          ================================================================ */}
      {activeTab === 'calcular' && (
        <>
          <div class="calculator__inputs">
            <p class="calculator__inputs-title">Datos del préstamo</p>

            {/* Quick-fill buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {Object.entries(TIPO_LABELS).map(([key, label]) => {
                const ref = prestamosData.tiposReferencia[key];
                const isActive = tin === String(ref?.tinMedia);
                return (
                  <button
                    key={key}
                    type="button"
                    class={`btn ${isActive ? 'btn--primary' : 'btn--outline'}`}
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    onClick={() => setTipoPrestamo(key)}
                    title={ref?.descripcion}
                  >
                    {label} ({formatPercent(ref?.tinMedia ?? 0, 1)} TIN)
                  </button>
                );
              })}
            </div>

            <div class="calculator__grid">
              {/* Importe */}
              <div class="form-group">
                <label class="form-label" htmlFor="pp-capital">Importe del préstamo</label>
                <div class="input-currency">
                  <input
                    id="pp-capital"
                    type="number"
                    class="form-input"
                    min={prestamosData.importeMinimo}
                    max={prestamosData.importeMaximo}
                    step="500"
                    value={capital}
                    onInput={(e) => setCapital((e.target as HTMLInputElement).value)}
                    placeholder="10.000"
                  />
                  <span class="input-currency__symbol">&euro;</span>
                </div>
              </div>

              {/* TIN */}
              <div class="form-group">
                <label class="form-label" htmlFor="pp-tin">TIN anual (Tipo de Interés Nominal)</label>
                <div class="input-currency">
                  <input
                    id="pp-tin"
                    type="number"
                    class="form-input"
                    min="0"
                    max="30"
                    step="0.1"
                    value={tin}
                    onInput={(e) => setTin((e.target as HTMLInputElement).value)}
                    placeholder="7,5"
                  />
                  <span class="input-currency__symbol">%</span>
                </div>
                <p class="form-hint">
                  El TIN es el interés que cobra el banco sin incluir comisiones ni gastos.
                </p>
              </div>

              {/* Plazo (slider) */}
              <div class="form-group" style={{ gridColumn: '1 / -1' }}>
                <label class="form-label" htmlFor="pp-plazo">
                  Plazo: {plazoMeses} meses ({Math.floor(parseInt(plazoMeses, 10) / 12)} años y {parseInt(plazoMeses, 10) % 12} meses)
                </label>
                <input
                  id="pp-plazo"
                  type="range"
                  class="form-range"
                  min={prestamosData.plazoMinimo}
                  max={prestamosData.plazoMaximo}
                  step="1"
                  value={plazoMeses}
                  onInput={(e) => setPlazoMeses((e.target as HTMLInputElement).value)}
                />
              </div>

              {/* Comisión apertura */}
              <div class="form-group">
                <label class="form-label" htmlFor="pp-comision">Comisión de apertura</label>
                <div class="input-currency">
                  <input
                    id="pp-comision"
                    type="number"
                    class="form-input"
                    min="0"
                    max="10"
                    step="0.1"
                    value={comisionApertura}
                    onInput={(e) => setComisionApertura((e.target as HTMLInputElement).value)}
                    placeholder="1"
                  />
                  <span class="input-currency__symbol">%</span>
                </div>
                <p class="form-hint">Porcentaje sobre el capital concedido. Media del mercado: {formatPercent(prestamosData.comisiones.apertura.media, 1)}.</p>
              </div>

              {/* Seguro mensual */}
              <div class="form-group">
                <label class="form-label" htmlFor="pp-seguro">Seguro mensual vinculado</label>
                <div class="input-currency">
                  <input
                    id="pp-seguro"
                    type="number"
                    class="form-input"
                    min="0"
                    max="500"
                    step="1"
                    value={seguroMensual}
                    onInput={(e) => setSeguroMensual((e.target as HTMLInputElement).value)}
                    placeholder="0"
                  />
                  <span class="input-currency__symbol">&euro;</span>
                </div>
                <p class="form-hint">Si el banco te obliga a contratar un seguro vinculado, añade aquí su coste mensual.</p>
              </div>
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
              {error}
            </p>
          )}

          <button class="btn btn--primary btn--large" onClick={handleCalcular}>
            Calcular cuota y TAE
          </button>

          {result && (
            <div class="calculator__results" aria-live="polite">
              <p class="calculator__results-title">Resultado de tu préstamo</p>

              <div class="calculator__result-main">
                {formatCurrency(result.cuotaMensual)}
              </div>
              <p class="calculator__result-label">Cuota mensual</p>
              <CopyButton text={`Préstamo ${formatCurrency(parseFloat(capital))}: cuota ${formatCurrency(result.cuotaMensual)}/mes, TAE ${formatPercent(result.taeCalculada, 2)}`} />

              {/* Summary cards */}
              <div class="ic-summary" style={{ marginTop: 'var(--space-6)' }}>
                <div class="ic-summary__item">
                  <span class="ic-summary__label">TAE calculada</span>
                  <span class="ic-summary__value ic-summary__value--accent">{formatPercent(result.taeCalculada, 2)}</span>
                </div>
                <div class="ic-summary__item">
                  <span class="ic-summary__label">TIN introducido</span>
                  <span class="ic-summary__value">{formatPercent(parseFloat(tin), 2)}</span>
                </div>
                <div class="ic-summary__item">
                  <span class="ic-summary__label">Diferencia TAE - TIN</span>
                  <span class="ic-summary__value" style={{ color: result.taeCalculada > parseFloat(tin) ? 'var(--color-error, #c53030)' : 'var(--color-success, #2f7d3a)' }}>
                    +{formatPercent(result.taeCalculada - parseFloat(tin), 2)}
                  </span>
                </div>
              </div>

              {/* Bar: capital vs interest */}
              {(() => {
                const totalPagado = result.totalPagado;
                const capitalPct = totalPagado > 0 ? (parseFloat(capital) / totalPagado) * 100 : 0;
                const interesesPct = totalPagado > 0 ? (result.totalIntereses / totalPagado) * 100 : 0;
                return (
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <div class="calculator__bar" style={{ height: '18px', borderRadius: '9px' }}>
                      <div
                        class="calculator__bar-segment"
                        style={{ width: `${capitalPct}%`, backgroundColor: 'var(--color-success)' }}
                        title={`Capital: ${formatCurrency(parseFloat(capital))}`}
                      />
                      <div
                        class="calculator__bar-segment"
                        style={{ width: `${interesesPct}%`, backgroundColor: 'var(--color-accent)' }}
                        title={`Intereses: ${formatCurrency(result.totalIntereses)}`}
                      />
                    </div>
                    <div class="calculator__bar-legend">
                      <span class="calculator__bar-legend-item">
                        <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                        Capital ({formatPercent(capitalPct, 1)})
                      </span>
                      <span class="calculator__bar-legend-item">
                        <span class="calculator__bar-legend-dot" style={{ backgroundColor: 'var(--color-accent)' }} />
                        Intereses ({formatPercent(interesesPct, 1)})
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Desglose table */}
              <div style={{ overflowX: 'auto', marginTop: 'var(--space-6)' }}>
                <table class="calculator__breakdown">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.desglose.map((d) => (
                      <tr key={d.concepto}>
                        <td>{d.concepto}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(d.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
                <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
                <div>
                  <p>
                    La TAE (Tasa Anual Equivalente) incluye el TIN, la comisión de apertura y el seguro vinculado.
                    Es el indicador que debes comparar entre ofertas: a igual importe y plazo, la oferta con menor TAE es la más barata.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================================================================
          TAB 2: Comparar préstamos
          ================================================================ */}
      {activeTab === 'comparar' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }} class="pp-compare-grid">
            {renderLoanInputs('c1', 'Oferta 1', c1Capital, setC1Capital, c1Tin, setC1Tin, c1Plazo, setC1Plazo, c1Comision, setC1Comision, c1Seguro, setC1Seguro)}
            {renderLoanInputs('c2', 'Oferta 2', c2Capital, setC2Capital, c2Tin, setC2Tin, c2Plazo, setC2Plazo, c2Comision, setC2Comision, c2Seguro, setC2Seguro)}
          </div>

          {error && (
            <p style={{ color: 'var(--color-error, #c53030)', marginBottom: 'var(--space-4)' }}>
              {error}
            </p>
          )}

          <button class="btn btn--primary btn--large" onClick={handleComparar}>
            Comparar ofertas
          </button>

          {compareResult && (
            <div aria-live="polite">
              {/* Winner banner */}
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-4) var(--space-6)',
                marginBottom: 'var(--space-6)',
                background: 'var(--color-success-light, #e6f4ea)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-success, #2f7d3a)',
              }}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-success, #2f7d3a)', margin: 0 }}>
                  La Oferta {compareResult.mejorOpcion} es más barata
                </p>
                <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--color-text-secondary)' }}>
                  Te ahorras <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{formatCurrency(compareResult.ahorro)}</strong> en coste total
                </p>
              </div>

              <CopyButton text={`Comparación: Oferta ${compareResult.mejorOpcion} más barata. Ahorro: ${formatCurrency(compareResult.ahorro)}`} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }} class="pp-compare-grid">
                {renderResultCard(compareResult.prestamo1, 'Oferta 1', compareResult.mejorOpcion === 1)}
                {renderResultCard(compareResult.prestamo2, 'Oferta 2', compareResult.mejorOpcion === 2)}
              </div>

              {/* Side-by-side comparison table */}
              <div style={{ overflowX: 'auto', marginTop: 'var(--space-6)' }}>
                <table class="calculator__breakdown">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Oferta 1</th>
                      <th>Oferta 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cuota mensual</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(compareResult.prestamo1.cuotaMensual)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(compareResult.prestamo2.cuotaMensual)}</td>
                    </tr>
                    <tr>
                      <td>TAE</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: compareResult.prestamo1.taeCalculada <= compareResult.prestamo2.taeCalculada ? 700 : 400, color: compareResult.prestamo1.taeCalculada <= compareResult.prestamo2.taeCalculada ? 'var(--color-success, #2f7d3a)' : 'inherit' }}>{formatPercent(compareResult.prestamo1.taeCalculada, 2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: compareResult.prestamo2.taeCalculada <= compareResult.prestamo1.taeCalculada ? 700 : 400, color: compareResult.prestamo2.taeCalculada <= compareResult.prestamo1.taeCalculada ? 'var(--color-success, #2f7d3a)' : 'inherit' }}>{formatPercent(compareResult.prestamo2.taeCalculada, 2)}</td>
                    </tr>
                    <tr>
                      <td>Total intereses</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(compareResult.prestamo1.totalIntereses)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(compareResult.prestamo2.totalIntereses)}</td>
                    </tr>
                    <tr>
                      <td>Comisión apertura</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(compareResult.prestamo1.comisionAperturaImporte)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(compareResult.prestamo2.comisionAperturaImporte)}</td>
                    </tr>
                    <tr>
                      <td>Total seguros</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(compareResult.prestamo1.totalSeguros)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(compareResult.prestamo2.totalSeguros)}</td>
                    </tr>
                    <tr style={{ fontWeight: 700 }}>
                      <td>Coste total</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: compareResult.mejorOpcion === 1 ? 'var(--color-success, #2f7d3a)' : 'inherit' }}>{formatCurrency(compareResult.prestamo1.costeTotal)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: compareResult.mejorOpcion === 2 ? 'var(--color-success, #2f7d3a)' : 'inherit' }}>{formatCurrency(compareResult.prestamo2.costeTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="calculator__disclaimer" style={{ marginTop: 'var(--space-6)' }}>
                <span class="calculator__disclaimer-icon" aria-hidden="true">i</span>
                <div>
                  <p>
                    Compara siempre por TAE y coste total, no solo por TIN o cuota mensual.
                    Un TIN bajo con comisiones altas y seguros obligatorios puede resultar más caro que un TIN algo mayor sin gastos adicionales.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .pp-compare-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
