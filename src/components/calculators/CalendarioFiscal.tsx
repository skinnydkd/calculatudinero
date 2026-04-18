import { useState, useEffect, useRef } from 'preact/hooks';

interface Obligacion {
  id: string;
  modelo: string;
  nombre: string;
  trimestre: number | null;
  fechaInicio: string;
  fechaFin: string;
  descripcion: string;
  aplica: string[];
  periodicidad: string;
  categoria: string;
}

interface CalendarioFiscalData {
  year: number;
  lastUpdated: string;
  source: string;
  obligaciones: Obligacion[];
}

interface Props {
  calendarioData: CalendarioFiscalData;
}

type Perfil = 'todos' | 'autonomos' | 'pymes';
type Categoria = 'todas' | 'iva' | 'irpf' | 'retenciones' | 'informativas' | 'ss';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'iva', label: 'IVA' },
  { value: 'irpf', label: 'IRPF' },
  { value: 'retenciones', label: 'Retenciones' },
  { value: 'informativas', label: 'Informativas' },
  { value: 'ss', label: 'Seg. Social' },
];

const PERFILES: { value: Perfil; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'autonomos', label: 'Autónomo' },
  { value: 'pymes', label: 'Pyme' },
];

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatFechaCorta(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getDiasRestantes(fechaFin: string, hoy: Date): number {
  const fin = parseDate(fechaFin);
  const diff = fin.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getUrgencia(fechaFin: string, fechaInicio: string, hoy: Date): 'vencido' | 'urgente' | 'proximo' | 'futuro' | 'pasado' {
  const fin = parseDate(fechaFin);
  const inicio = parseDate(fechaInicio);
  const dias = getDiasRestantes(fechaFin, hoy);

  if (dias < 0 && fin < hoy) return 'pasado';
  if (dias < 0) return 'vencido';
  if (dias <= 7 && hoy >= inicio) return 'urgente';
  if (dias <= 30) return 'proximo';
  return 'futuro';
}

function getCategoriaColor(categoria: string): string {
  switch (categoria) {
    case 'iva': return 'var(--color-info)';
    case 'irpf': return 'var(--color-warning)';
    case 'retenciones': return 'var(--color-accent)';
    case 'informativas': return 'var(--color-success)';
    case 'ss': return '#8B5CF6';
    default: return 'var(--color-text-secondary)';
  }
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7); // "2026-04"
}

export default function CalendarioFiscal({ calendarioData }: Props) {
  const [perfil, setPerfil] = useState<Perfil>('autonomos');
  const [categoria, setCategoria] = useState<Categoria>('todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const currentMonthRef = useRef<HTMLDivElement>(null);

  const hoy = new Date();

  // Filter obligations
  const filtered = calendarioData.obligaciones.filter((ob) => {
    if (perfil !== 'todos' && !ob.aplica.includes(perfil)) return false;
    if (categoria !== 'todas' && ob.categoria !== categoria) return false;
    return true;
  });

  // Group by month (using fechaFin as the relevant date for the month)
  const byMonth = new Map<string, Obligacion[]>();
  for (const ob of filtered) {
    const key = getMonthKey(ob.fechaFin);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(ob);
  }

  // Sort months chronologically
  const sortedMonths = Array.from(byMonth.keys()).sort();

  // Determine current month key
  const currentMonthKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

  // Find next deadline
  const nextDeadline = calendarioData.obligaciones
    .filter((ob) => {
      if (perfil !== 'todos' && !ob.aplica.includes(perfil)) return false;
      return getDiasRestantes(ob.fechaFin, hoy) >= 0;
    })
    .sort((a, b) => parseDate(a.fechaFin).getTime() - parseDate(b.fechaFin).getTime())[0];

  // Auto-scroll to current month on mount
  useEffect(() => {
    if (currentMonthRef.current) {
      currentMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  function getMonthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return `${MESES[m - 1]} ${y}`;
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div class="calculator">
      {/* Next deadline banner */}
      {nextDeadline && (
        <div class="calendario__banner">
          <div class="calendario__banner-label">Siguiente vencimiento</div>
          <div class="calendario__banner-content">
            <span class="calendario__banner-modelo">{nextDeadline.modelo}</span>
            <span class="calendario__banner-nombre">{nextDeadline.nombre}</span>
            <span class="calendario__banner-countdown">
              {(() => {
                const dias = getDiasRestantes(nextDeadline.fechaFin, hoy);
                if (dias === 0) return 'Vence hoy';
                if (dias === 1) return 'Vence mañana';
                return `Faltan ${dias} días`;
              })()}
            </span>
          </div>
          <div class="calendario__banner-fecha">
            Hasta el {formatFechaCorta(nextDeadline.fechaFin)}
          </div>
        </div>
      )}

      {/* Filters */}
      <div class="calculator__inputs">
        <p class="calculator__inputs-title">Filtros</p>
        <div class="calendario__filters">
          {/* Profile filter */}
          <div class="form-group">
            <span class="form-label">Perfil</span>
            <div class="radio-group" role="radiogroup" aria-label="Perfil fiscal">
              {PERFILES.map((p) => (
                <div class="radio-option" key={p.value}>
                  <input
                    type="radio"
                    id={`cf-perfil-${p.value}`}
                    name="cf-perfil"
                    value={p.value}
                    checked={perfil === p.value}
                    onChange={() => setPerfil(p.value)}
                  />
                  <label htmlFor={`cf-perfil-${p.value}`}>{p.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div class="form-group">
            <span class="form-label">Tipo de obligación</span>
            <div class="radio-group" role="radiogroup" aria-label="Tipo de obligación">
              {CATEGORIAS.map((c) => (
                <div class="radio-option" key={c.value}>
                  <input
                    type="radio"
                    id={`cf-cat-${c.value}`}
                    name="cf-categoria"
                    value={c.value}
                    checked={categoria === c.value}
                    onChange={() => setCategoria(c.value)}
                  />
                  <label htmlFor={`cf-cat-${c.value}`}>{c.label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div class="calendario__timeline">
        {sortedMonths.length === 0 && (
          <div class="calculator__empty">
            <div class="calculator__empty-icon">📅</div>
            <p>No hay obligaciones para los filtros seleccionados.</p>
          </div>
        )}

        {sortedMonths.map((monthKey) => {
          const isCurrentMonth = monthKey === currentMonthKey;
          const obligations = byMonth.get(monthKey)!;
          // Sort by fechaFin within each month
          obligations.sort((a, b) => parseDate(a.fechaFin).getTime() - parseDate(b.fechaFin).getTime());

          return (
            <div
              key={monthKey}
              class={`calendario__month${isCurrentMonth ? ' calendario__month--current' : ''}`}
              ref={isCurrentMonth ? currentMonthRef : undefined}
            >
              <h3 class="calendario__month-title">
                {getMonthLabel(monthKey)}
                {isCurrentMonth && <span class="calendario__month-badge">Mes actual</span>}
              </h3>

              <div class="calendario__deadlines">
                {obligations.map((ob) => {
                  const urgencia = getUrgencia(ob.fechaFin, ob.fechaInicio, hoy);
                  const dias = getDiasRestantes(ob.fechaFin, hoy);
                  const isExpanded = expandedId === ob.id;

                  return (
                    <button
                      key={ob.id}
                      type="button"
                      class={`calendario__deadline calendario__deadline--${urgencia}`}
                      onClick={() => toggleExpand(ob.id)}
                      aria-expanded={isExpanded}
                    >
                      <div class="calendario__deadline-header">
                        <span
                          class="calendario__badge"
                          style={{ backgroundColor: getCategoriaColor(ob.categoria) }}
                        >
                          {ob.modelo}
                        </span>
                        <span class="calendario__deadline-nombre">{ob.nombre}</span>
                        <span class="calendario__deadline-fecha">
                          {formatFechaCorta(ob.fechaInicio)} — {formatFechaCorta(ob.fechaFin)}
                        </span>
                      </div>

                      <div class="calendario__deadline-meta">
                        {urgencia === 'pasado' && (
                          <span class="calendario__countdown calendario__countdown--pasado">Finalizado</span>
                        )}
                        {urgencia === 'vencido' && (
                          <span class="calendario__countdown calendario__countdown--vencido">Vencido</span>
                        )}
                        {urgencia === 'urgente' && (
                          <span class="calendario__countdown calendario__countdown--urgente">
                            {dias === 0 ? 'Vence hoy' : dias === 1 ? 'Vence mañana' : `${dias} días`}
                          </span>
                        )}
                        {urgencia === 'proximo' && (
                          <span class="calendario__countdown calendario__countdown--proximo">
                            {dias} días
                          </span>
                        )}
                        {urgencia === 'futuro' && (
                          <span class="calendario__countdown calendario__countdown--futuro">
                            {dias} días
                          </span>
                        )}
                        <span class="calendario__deadline-expand" aria-hidden="true">
                          {isExpanded ? '−' : '+'}
                        </span>
                      </div>

                      {isExpanded && (
                        <div class="calendario__deadline-detail">
                          <p class="calendario__deadline-desc">{ob.descripcion}</p>
                          <div class="calendario__deadline-tags">
                            <span class="calendario__tag">
                              {ob.periodicidad === 'trimestral' ? `Trimestral (${ob.trimestre}T)` : 'Anual'}
                            </span>
                            {ob.aplica.map((a) => (
                              <span key={a} class="calendario__tag">
                                {a === 'autonomos' ? 'Autónomos' : a === 'pymes' ? 'Pymes' : 'Todos'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Source */}
      <p class="calendario__source">
        Fuente: {calendarioData.source}. Actualizado: {calendarioData.lastUpdated}.
      </p>
    </div>
  );
}
