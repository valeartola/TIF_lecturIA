import { useState, useRef, useEffect } from 'react';
import { C } from '../constants/colors';
import {
    listarAlumnos, listarMisActividades, subirTexto,
    generarActividad, validarPregunta, publicarActividad,
    getResumenIA, crearAlumno, getResumenGrupal, eliminarActividad, getActividad, getProgresoAlumno, editarPregunta, generarMasPreguntas, eliminarTexto,
} from '../api';

// ── Colores de actividades ────────────────────────────────────
const ACT_COLORS = [C.blue, C.green, C.yellow, C.pink, C.red];

// ── Helpers ───────────────────────────────────────────────────
const levelColor = (l) => ({ Avanzado: C.green, Intermedio: C.yellow, Básico: C.red }[l] || C.gray);
const levelBg = (l) => ({ Avanzado: '#E8F5EB', Intermedio: '#FFF8E1', Básico: '#FEECEC' }[l] || '#eee');

// ── NAV ──────────────────────────────────────────────────────
const NAV = [
    { id: 'clase', label: 'Mi Clase', icon: '👨‍🏫' },
    { id: 'actividades', label: 'Actividades', icon: '📖' },
    { id: 'progreso', label: 'Progreso', icon: '📊' },
];

const SECTION_META = {
    clase: { title: 'Mi Clase', sub: 'Gestión de alumnos' },
    actividades: { title: 'Actividades de lectura 📖', sub: '' },
    progreso: { title: 'Progreso del grupo', sub: 'Resumen de desempeño' },

};

const THEME = {
    sidebar: { bg: C.cream, text: C.dark, subtext: '#888', activeItem: 'rgba(53,78,171,0.08)', activeBorder: C.blue },
    main: { bg: '#fff' },
    topbar: { bg: '#fff', border: 'rgba(0,0,0,0.06)' },
    card: { bg: '#fff', shadow: '0 2px 14px rgba(0,0,0,0.07)', radius: 18 },
    chartBar: C.pink,
    heading: C.dark,
    subtext: '#666',
};

// ══════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════
function Sidebar({ active, onNav, collapsed, user, onLogout }) {
    const t = THEME.sidebar;
    return (
        <div style={{ width: collapsed ? 72 : 230, minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column', transition: 'width 0.25s', flexShrink: 0, zIndex: 2, boxShadow: '2px 0 12px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: collapsed ? '24px 0' : '28px 24px 20px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10 }}>
                <img src="/uploads/MiniLogo.png" alt="LecturIA" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 10, flexShrink: 0 }} />
                {!collapsed && (
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.3 }}>
                            <span style={{ color: C.green }}>Lectur</span><span style={{ color: C.yellow }}>IA</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: t.subtext, fontWeight: 600, marginTop: 1 }}>para docentes</div>
                    </div>
                )}
            </div>

            <nav style={{ flex: 1, padding: '8px 0' }}>
                {!collapsed && (
                    <div onClick={onLogout} title="Cerrar sesión" style={{ padding: '6px 20px 16px', cursor: 'pointer', marginBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: C.dark, flexShrink: 0 }}>
                                {user?.nombre?.[0]?.toUpperCase() || 'D'}
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{user?.nombre || 'Docente'}</div>
                                <div style={{ fontSize: 11, color: t.subtext }}>Código: {user?.codigo_clase || '—'}</div>
                            </div>
                        </div>
                    </div>
                )}
                {NAV.map((item) => {
                    const isActive = active === item.id;
                    return (
                        <button key={item.id} onClick={() => onNav(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: collapsed ? '13px 0' : '13px 20px', justifyContent: collapsed ? 'center' : 'flex-start', background: isActive ? t.activeItem : 'transparent', border: 'none', borderLeft: isActive && !collapsed ? `4px solid ${t.activeBorder}` : '4px solid transparent', borderRadius: collapsed ? 0 : '0 12px 12px 0', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
                            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                            {!collapsed && <span style={{ fontSize: 14, fontWeight: isActive ? 800 : 600, color: isActive ? t.text : t.subtext, fontFamily: 'Nunito' }}>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTES — Progreso
// ══════════════════════════════════════════════════════════════
function StatCard({ label, value, sub, color, icon }) {
    return (
        <div style={{ background: color, borderRadius: THEME.card.radius, padding: '20px 22px', flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -12, bottom: -12, fontSize: 56, opacity: 0.18 }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 5 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>{sub}</div>}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// CONTENIDO — Progreso (datos reales)
// ══════════════════════════════════════════════════════════════
const nivelLabel = (n) => ({ 'FÁCIL': 'Básico', 'MEDIA': 'Intermedio', 'DIFÍCIL': 'Avanzado' }[n] || '—');

function ProgresoContent({ students, loadingStudents, resumen, loadingResumen, progresoActs, loadingProgreso, onActualizarResumen }) {
    const { card } = THEME;
    const [alumnoDetalle, setAlumnoDetalle] = useState(null);

    const totalAlumnos = students.length;
    const promedioGlobal = progresoActs.length
        ? Math.round(progresoActs.reduce((s, a) => s + a.promedio_aciertos_clase, 0) / progresoActs.length)
        : null;

    // Tabla de alumnos con stats reales
    const alumnosConStats = students.map(s => {
        const stats = progresoActs.flatMap(a => a.alumnos).filter(al => al.nombre === s.nombre);
        const activas = stats.filter(al => al.respondidas > 0);
        const promedio = activas.length
            ? Math.round(activas.reduce((sum, al) => sum + al.porcentaje_aciertos, 0) / activas.length)
            : null;
        const nivel = activas.length ? activas.at(-1).nivel_alcanzado : null;
        // Para cada actividad: buscar el intento actual del alumno en progresoActs
        const detallePorActividad = progresoActs.map(act => {
            const dato = act.alumnos.find(al => al.nombre === s.nombre);
            return dato ? { titulo: act.titulo, actividad_id: act.actividad_id, ...dato } : null;
        }).filter(Boolean);
        return { ...s, promedio, nivel, activas: activas.length, detallePorActividad };
    });

    // Métricas para los 4 stat cards
    const necesitanAtencion = alumnosConStats.filter(a => a.promedio !== null && a.promedio < 50).length;

    // Distribución de promedios por franja (reemplaza la distribución de niveles, que dependía
    // de un nivel que solo tiene sentido dentro de un intento puntual, no como estado global del alumno)
    const franjas = [
        { label: '< 50%', key: 'baja', color: C.red, bg: '#FEECEC', test: (p) => p < 50 },
        { label: '50-70%', key: 'media', color: C.yellow, bg: '#FFF8E1', test: (p) => p >= 50 && p < 70 },
        { label: '> 70%', key: 'alta', color: C.green, bg: '#E8F5EB', test: (p) => p >= 70 },
    ];
    const franjasData = franjas.map(f => ({
        ...f,
        cant: alumnosConStats.filter(a => a.promedio !== null && f.test(a.promedio)).length,
    }));
    const maxFranja = Math.max(...franjasData.map(f => f.cant), 1);

    // Promedio por actividad (ya viene calculado del backend en cada actividad)
    const maxPromActividad = Math.max(...progresoActs.map(a => a.promedio_aciertos_clase), 1);
    const H = 100;


    return (
        <>
            {/* ── Tarjeta IA ── */}
            <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, borderRadius: card.radius, padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>✨</div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Análisis de tu clase · Generado con IA</div>
                        {!loadingResumen && <button onClick={onActualizarResumen} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 11.5, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito' }}>↻ Actualizar</button>}
                    </div>
                    {loadingResumen
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 16, height: 16, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                            <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Generando análisis…</span>
                        </div>
                        : <p style={{ fontSize: 13.5, color: '#fff', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>{resumen}</p>
                    }
                </div>
            </div>

            {/* ── 4 Stat Cards, ordenadas por urgencia ── */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
                <StatCard
                    label="Necesitan atención"
                    value={necesitanAtencion}
                    icon={necesitanAtencion > 0 ? '⚠️' : '✅'}
                    color={necesitanAtencion > 0 ? C.red : C.pink}
                />
                <StatCard
                    label="Promedio global"
                    value={promedioGlobal !== null ? `${promedioGlobal}%` : '—'}
                    icon="⭐"
                    color={C.yellow}
                />
                <StatCard label="Total de estudiantes" value={totalAlumnos} icon="🧒" color={C.blue} />
                <StatCard label="Actividades publicadas" value={progresoActs.length} icon="📖" color={C.green} />
            </div>

            {/* ── Promedio por actividad + Distribución de promedios por alumno ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

                {/* Promedio de aciertos por actividad */}
                <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, marginBottom: 2 }}>Promedio por actividad</h2>
                    <p style={{ fontSize: 12, color: THEME.subtext, marginBottom: 20 }}>¿Qué actividad les resultó más difícil?</p>
                    {loadingProgreso
                        ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.subtext, fontSize: 13 }}>Cargando datos…</div>
                        : progresoActs.length === 0
                            ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>Sin actividades publicadas aún</div>
                            : (
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: H + 40 }}>
                                    {progresoActs.map((act) => {
                                        const pct = Math.round(act.promedio_aciertos_clase);
                                        const barH = pct === 0 ? 4 : Math.max(16, (pct / maxPromActividad) * H);
                                        const color = pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red;
                                        return (
                                            <div key={act.actividad_id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                                <div style={{ fontSize: 12, fontWeight: 900, color }}>{pct}%</div>
                                                <div style={{ width: '100%', height: H, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.04)', borderRadius: 8, overflow: 'hidden' }}>
                                                    <div style={{ width: '100%', height: barH, background: color, borderRadius: '6px 6px 0 0', transition: 'height 0.8s', opacity: 0.85 }} />
                                                </div>
                                                <div style={{ fontSize: 10.5, color: THEME.subtext, textAlign: 'center', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={act.titulo}>{act.titulo}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                    }
                </div>

                {/* Distribución de promedios por franja */}
                <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, marginBottom: 2 }}>Distribución de promedios</h2>
                    <p style={{ fontSize: 12, color: THEME.subtext, marginBottom: 20 }}>¿Cuántos alumnos están en cada franja?</p>
                    {loadingProgreso
                        ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.subtext, fontSize: 13 }}>Cargando datos…</div>
                        : !alumnosConStats.some(a => a.promedio !== null)
                            ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>Sin datos aún</div>
                            : (
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: H + 40 }}>
                                    {franjasData.map((f) => {
                                        const barH = f.cant === 0 ? 4 : Math.max(16, (f.cant / maxFranja) * H);
                                        return (
                                            <div key={f.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                <div style={{ fontSize: 13, fontWeight: 900, color: f.color }}>{f.cant}</div>
                                                <div style={{ width: '100%', height: H, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.04)', borderRadius: 10, overflow: 'hidden' }}>
                                                    <div style={{ width: '100%', height: barH, background: f.color, borderRadius: '8px 8px 0 0', transition: 'height 0.8s', opacity: 0.85 }} />
                                                </div>
                                                <div style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: f.bg, color: f.color }}>{f.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                    }
                </div>
            </div>

            {/* ── Tabla de alumnos ── */}
            <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, marginBottom: 2 }}>Desempeño por alumno</h2>

                {loadingStudents || loadingProgreso
                    ? <div style={{ padding: '20px 0', textAlign: 'center', color: THEME.subtext }}>Cargando…</div>
                    : alumnosConStats.length === 0
                        ? <div style={{ padding: '20px 0', textAlign: 'center', color: THEME.subtext }}>No hay alumnos en la clase todavía.</div>
                        : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.6fr 100px', gap: 12, padding: '8px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', marginBottom: 6 }}>
                                    {['Alumno', 'Actividades', 'Promedio', ''].map((h, i) => (
                                        <span key={i} style={{ fontSize: 11, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
                                    ))}
                                </div>

                                {alumnosConStats.map((s) => {
                                    const sinAct = s.promedio === null;
                                    const alert = !sinAct && s.promedio < 50;
                                    const color = sinAct ? THEME.subtext : s.promedio >= 70 ? C.green : s.promedio >= 50 ? C.yellow : C.red;

                                    return (
                                        <div key={s.id} style={{
                                            display: 'grid', gridTemplateColumns: '2fr 1fr 1.6fr 100px', gap: 12,
                                            padding: '12px 14px', borderRadius: 10, alignItems: 'center',
                                            borderBottom: '1px solid rgba(0,0,0,0.04)',
                                            background: sinAct ? 'rgba(255,31,54,0.03)' : 'transparent',
                                            borderLeft: sinAct ? `3px solid ${C.red}55` : alert ? `3px solid ${C.red}` : '3px solid transparent',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: alert || sinAct ? C.red + '20' : C.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: alert || sinAct ? C.red : C.blue, flexShrink: 0 }}>
                                                    {s.nombre[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.heading }}>{s.nombre}</div>
                                                    {sinAct && <div style={{ fontSize: 11, fontWeight: 700, color: C.red }}>Sin actividad aún ⚠️</div>}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 12.5, color: THEME.subtext, fontWeight: 600 }}>{s.activas} / {progresoActs.length}</span>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    {progresoActs.map((act, i) => {
                                                        const dato = act.alumnos.find(al => al.nombre === s.nombre);
                                                        const hecho = dato && dato.respondidas > 0;
                                                        return <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: hecho ? C.green : 'rgba(0,0,0,0.12)' }} title={act.titulo} />;
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                {!sinAct
                                                    ? <>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 900, color }}>{s.promedio}%</span>
                                                        </div>
                                                        <div style={{ height: 7, borderRadius: 8, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${s.promedio}%`, background: color, borderRadius: 8, transition: 'width 0.8s' }} />
                                                        </div>
                                                    </>
                                                    : <span style={{ fontSize: 12, color: THEME.subtext, fontWeight: 600 }}>—</span>
                                                }
                                            </div>

                                            <button
                                                onClick={() => setAlumnoDetalle({ alumno: s, actividadIdx: 0 })}
                                                style={{ background: C.blue, border: 'none', borderRadius: 10, padding: '7px 0', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito', width: '100%' }}
                                            >
                                                Ver detalle
                                            </button>
                                        </div>
                                    );
                                })}
                            </>
                        )
                }
            </div>

            {/* Modal de detalle de alumno */}
            {alumnoDetalle && (
                <AlumnoDetalleModal
                    alumno={alumnoDetalle.alumno}
                    actividadIdx={alumnoDetalle.actividadIdx}
                    progresoActs={progresoActs}
                    onClose={() => setAlumnoDetalle(null)}
                />
            )}
        </>
    );
}


// ══════════════════════════════════════════════════════════════
// MODAL DE DETALLE DE ALUMNO — intentos + preguntas
// ══════════════════════════════════════════════════════════════
function AlumnoDetalleModal({ alumno, actividadIdx, progresoActs, onClose }) {
    const [actIdx, setActIdx] = useState(actividadIdx);
    const [intentoSel, setIntentoSel] = useState(0); // índice del intento seleccionado
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const actividadActual = progresoActs[actIdx];

    useEffect(() => {
        if (!actividadActual) return;
        setLoading(true);
        setDatos(null);
        setIntentoSel(0);
        setError('');
        getProgresoAlumno(alumno.id, actividadActual.actividad_id)
            .then(d => setDatos(d))
            .catch(() => setError('No se pudo cargar el detalle.'))
            .finally(() => setLoading(false));
    }, [actIdx, actividadActual?.actividad_id]);

    const intentos = datos?.intentos || [];
    const intentoData = intentos[intentoSel] || null;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.28)' }}>

                {/* Header */}
                <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                        {alumno.nombre[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>{alumno.nombre}</h2>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, margin: 0 }}>Historial de desempeño</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>

                {/* Selector de actividad (tabs) */}
                {progresoActs.length > 1 && (
                    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(0,0,0,0.08)', overflowX: 'auto', flexShrink: 0 }}>
                        {progresoActs.map((act, i) => (
                            <button key={i} onClick={() => setActIdx(i)} style={{
                                padding: '12px 20px', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer',
                                background: 'transparent', fontFamily: 'Nunito', whiteSpace: 'nowrap',
                                color: actIdx === i ? C.blue : THEME.subtext,
                                borderBottom: actIdx === i ? `3px solid ${C.blue}` : '3px solid transparent',
                                transition: 'all 0.15s',
                            }}>
                                {act.titulo}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px' }}>
                    {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.subtext }}>Cargando…</div>}
                    {error && <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: 12, padding: '12px 16px', color: C.red, fontWeight: 700 }}>⚠️ {error}</div>}

                    {datos && (
                        <>
                            {intentos.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.subtext }}>
                                    <div style={{ fontSize: 36, marginBottom: 10 }}></div>
                                    <div style={{ fontWeight: 700 }}>Este alumno aún no realizó esta actividad.</div>
                                </div>
                            ) : (
                                <>
                                    {/* Línea de tiempo de intentos */}
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                                            Intentos realizados · {intentos.length} de 3
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                                            {intentos.map((it, i) => {
                                                const col = it.porcentaje_aciertos >= 70 ? C.green : it.porcentaje_aciertos >= 50 ? C.yellow : C.red;
                                                const niv = nivelLabel(it.nivel_alcanzado);
                                                const sel = intentoSel === i;
                                                return (
                                                    <button key={i} onClick={() => setIntentoSel(i)} style={{
                                                        flex: 1, border: `2px solid ${sel ? C.blue : 'rgba(0,0,0,0.08)'}`,
                                                        borderRadius: 14, padding: '14px 16px', background: sel ? C.blueLight : '#fff',
                                                        cursor: 'pointer', fontFamily: 'Nunito', textAlign: 'left',
                                                        transition: 'all 0.15s', boxShadow: sel ? `0 0 0 3px ${C.blue}22` : 'none',
                                                    }}>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: sel ? C.blue : THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Intento {it.numero}</div>
                                                        <div style={{ fontSize: 22, fontWeight: 900, color: col, lineHeight: 1, marginBottom: 4 }}>{it.porcentaje_aciertos}%</div>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.subtext, marginBottom: 8 }}>{it.correctas}/{it.respondidas} correctas</div>
                                                        <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: levelBg(niv), color: levelColor(niv) }}>{niv}</span>
                                                        {it.completado && <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginTop: 6 }}>✓ Completado</div>}
                                                    </button>
                                                );
                                            })}
                                            {/* Slots vacíos de intentos futuros */}
                                            {Array.from({ length: 3 - intentos.length }).map((_, i) => (
                                                <div key={`empty-${i}`} style={{ flex: 1, border: '2px dashed rgba(0,0,0,0.1)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: 12, color: '#ccc', fontWeight: 700 }}>Intento {intentos.length + i + 1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Detalle de preguntas del intento seleccionado */}
                                    {intentoData && (
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                                                Preguntas — Intento {intentoData.numero}
                                            </div>
                                            <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                                                {intentoData.respuestas.map((r, i) => (
                                                    <div key={i} style={{
                                                        display: 'flex', alignItems: 'center', gap: 14,
                                                        padding: '12px 16px',
                                                        borderBottom: i < intentoData.respuestas.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                                        background: r.es_correcta ? 'rgba(67,137,81,0.04)' : 'rgba(255,31,54,0.04)',
                                                    }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: r.es_correcta ? C.green + '20' : C.red + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <span style={{ fontSize: 14 }}>{r.es_correcta ? '✓' : '✗'}</span>
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                                                {r.dificultad && (
                                                                    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: levelBg(nivelLabel(r.dificultad)), color: levelColor(nivelLabel(r.dificultad)) }}>
                                                                        {nivelLabel(r.dificultad)}
                                                                    </span>
                                                                )}
                                                                {r.tipo && (
                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.subtext }}>{r.tipo}</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 11.5, color: THEME.subtext }}>Opción elegida: {r.opcion_elegida + 1}</div>
                                                        </div>
                                                        <span style={{ fontSize: 11.5, fontWeight: 800, color: r.es_correcta ? C.green : C.red }}>
                                                            {r.es_correcta ? 'Correcta' : 'Incorrecta'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
function MiClaseContent({ students, loadingStudents, codigoClase, onAlumnoCreado }) {
    const [showForm, setShowForm] = useState(false);
    const [nombre, setNombre] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const handleCrear = async (e) => {
        e.preventDefault();
        if (!nombre.trim() || !password.trim()) return;
        setSaving(true);
        setFormError('');
        try {
            await crearAlumno(nombre.trim(), password.trim());
            setNombre('');
            setPassword('');
            setShowForm(false);
            onAlumnoCreado();
        } catch (err) {
            setFormError(err.message || 'No se pudo crear el alumno');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Código de clase */}
            <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, borderRadius: THEME.card.radius, padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                        Código de clase — compartilo con tus alumnos
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: 3, fontFamily: 'monospace' }}>
                        {codigoClase || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontWeight: 600 }}>
                        Los alumnos lo usan junto a su nombre y contraseña para ingresar
                    </div>
                </div>
                <div style={{ fontSize: 48, opacity: 0.25 }}>🔑</div>
            </div>

            {/* Encabezado + botón */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 900, color: THEME.heading }}>Alumnos registrados</h2>
                    <p style={{ fontSize: 13, color: THEME.subtext, marginTop: 2 }}>{students.length} alumno{students.length !== 1 ? 's' : ''} en tu clase</p>
                </div>
                <button onClick={() => { setShowForm(f => !f); setFormError(''); }}
                    style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito', boxShadow: `0 4px 14px ${C.green}44` }}>
                    {showForm ? '✕ Cancelar' : '+ Nuevo alumno'}
                </button>
            </div>

            {/* Formulario de nuevo alumno */}
            {showForm && (
                <form onSubmit={handleCrear} style={{ background: C.blueLight, border: `2px solid ${C.blue}33`, borderRadius: THEME.card.radius, padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>Nombre completo</label>
                        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Sofía Torres"
                            required style={fieldStyle} />
                    </div>
                    <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>Contraseña inicial</label>
                        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 4 caracteres"
                            required minLength={4} style={fieldStyle} />
                    </div>
                    <button type="submit" disabled={saving}
                        style={{ background: saving ? C.gray : C.blue, color: '#fff', border: 'none', borderRadius: 12, padding: '11px 22px', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'Nunito', flexShrink: 0 }}>
                        {saving ? 'Creando…' : '✓ Crear alumno'}
                    </button>
                    {formError && (
                        <div style={{ width: '100%', background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: C.red }}>
                            ⚠️ {formError}
                        </div>
                    )}
                </form>
            )}

            {/* Lista de alumnos */}
            <div style={{ background: THEME.card.bg, borderRadius: THEME.card.radius, boxShadow: THEME.card.shadow, overflow: 'hidden' }}>
                {loadingStudents ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: THEME.subtext }}>Cargando alumnos…</div>
                ) : students.length === 0 ? (
                    <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: THEME.subtext }}>Todavía no hay alumnos en tu clase.</p>
                        <p style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>Creá el primero con el botón de arriba o compartí el código de clase.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, padding: '12px 24px', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {['Alumno', 'ID'].map((h, i) => (
                                <span key={i} style={{ fontSize: 11, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
                            ))}
                        </div>
                        {students.map((s, i) => (
                            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, padding: '14px 24px', alignItems: 'center', borderBottom: i < students.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: C.blue, flexShrink: 0 }}>
                                        {s.nombre[0].toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: THEME.heading }}>{s.nombre}</span>
                                </div>
                                <span style={{ fontSize: 12, color: THEME.subtext, fontWeight: 600 }}>#{s.id}</span>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </>
    );
}

const fieldStyle = { padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.12)', fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' };

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
function ActivityCard({ act, color, onVerPreguntas, onVerResultados, onEliminar, onRetomar, onGenerarDesdeTexto, onEliminarTexto }) {
    const fecha = act.creado_en ? new Date(act.creado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const sinActividad = !act.actividad_id; // la generación nunca llegó a crear una Actividad
    return (
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: color, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{act.titulo}</h3>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginTop: 3 }}> {fecha}</div>
                </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: act.validada ? '#E8F5EB' : sinActividad ? '#FEECEC' : '#FFF8E1', color: act.validada ? C.green : sinActividad ? C.red : C.yellow, fontSize: 11.5, fontWeight: 800, borderRadius: 20, padding: '3px 11px' }}>
                        {act.validada ? 'Publicada' : sinActividad ? 'Sin generar' : 'Borrador'}
                    </span>
                    <span style={{ background: 'rgba(0,0,0,0.05)', color: '#666', fontSize: 11.5, fontWeight: 800, borderRadius: 20, padding: '3px 11px' }}>
                        {act.palabras?.toLocaleString()} palabras
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    {act.validada && act.actividad_id && <button onClick={() => onVerPreguntas(act.actividad_id, act.titulo)} style={{ background: 'transparent', border: `1.5px solid ${C.blue}44`, borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 800, color: C.blue, cursor: 'pointer', fontFamily: 'Nunito' }}>Ver preguntas</button>}
                    {act.validada && act.actividad_id && <button onClick={() => onVerResultados(act.actividad_id, act.titulo)} style={{ flex: 1, background: C.blue, border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito' }}>Ver resultados</button>}
                    {!act.validada && act.actividad_id && (
                        <button onClick={() => onRetomar(act.actividad_id, act.titulo)} style={{ flex: 1, background: C.green, border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito' }}>📝 Retomar</button>
                    )}
                    {act.validada && act.actividad_id && (
                        <button onClick={() => onEliminar(act.actividad_id)} style={{ background: 'transparent', border: `2px solid #ff4d4f44`, borderRadius: 10, padding: '7px 10px', fontSize: 14, cursor: 'pointer', color: '#ff4d4f', lineHeight: 1 }} title="Eliminar actividad">🗑</button>
                    )}
                    {sinActividad && (
                        <>
                            <button onClick={() => onGenerarDesdeTexto(act.texto_id, act.titulo)} style={{ flex: 1, background: C.blue, border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito' }}>✨ Generar preguntas</button>
                            <button onClick={() => onEliminarTexto(act.texto_id)} style={{ background: 'transparent', border: `2px solid #ff4d4f44`, borderRadius: 10, padding: '7px 10px', fontSize: 14, cursor: 'pointer', color: '#ff4d4f', lineHeight: 1 }} title="Eliminar texto">🗑</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function NewActivityCard({ onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{ background: hover ? 'rgba(53,78,171,0.04)' : '#fff', border: `2.5px dashed ${hover ? C.blue : C.blue + '55'}`, borderRadius: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 240, transition: 'all 0.18s', fontFamily: 'Nunito', transform: hover ? 'translateY(-2px)' : 'none' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: '#fff', boxShadow: `0 6px 18px ${C.blue}44` }}>+</div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.blue }}>Crear nueva actividad</div>
                <div style={{ fontSize: 12.5, color: '#888', fontWeight: 600, marginTop: 4, maxWidth: 200, lineHeight: 1.4 }}></div>
            </div>
        </button>
    );
}

// ══════════════════════════════════════════════════════════════
// MODAL DE CREACIÓN — conectado a la API real
// ══════════════════════════════════════════════════════════════
function CreateModal({ onClose, onPublish, onEliminar, actividadExistente, textoExistente }) {
    const esRetomar = !!actividadExistente;
    const esDesdeTexto = !!textoExistente; // texto ya subido, sin Actividad creada (la generación previa falló)
    const [step, setStep] = useState(esRetomar ? 4 : esDesdeTexto ? 3 : 1);
    const [file, setFile] = useState(null);
    const [editandoIdx, setEditandoIdx] = useState(null); // índice de la pregunta que se está editando
    const [editForm, setEditForm] = useState(null);       // copia local del form de edición
    const [savingEdit, setSavingEdit] = useState(false);
    const [fileName, setFileName] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [title, setTitle] = useState(actividadExistente?.titulo || textoExistente?.titulo || '');
    const [textoId, setTextoId] = useState(textoExistente?.texto_id || null);
    const [actividadId, setActividadId] = useState(actividadExistente?.actividad_id || null);
    const [questions, setQuestions] = useState([]);
    const [apiError, setApiError] = useState('');
    const [loadingExistente, setLoadingExistente] = useState(esRetomar);
    const [generandoMas, setGenerandoMas] = useState(false);
    const inputRef = useRef(null);

    // Si estamos retomando un borrador, cargar sus preguntas reales
    useEffect(() => {
        if (!esRetomar) return;
        getActividad(actividadExistente.actividad_id)
            .then(actData => {
                const allQ = Object.entries(actData.preguntas_por_nivel).flatMap(([nivel, pregs]) =>
                    pregs.map((p) => ({
                        id: p.id,
                        pregunta: p.enunciado,
                        opciones: p.opciones,
                        correcta: p.opcion_correcta,
                        tipo: p.tipo,
                        nivel,
                        aprobada: !!p.validada,
                    }))
                );
                setQuestions(allQ);
            })
            .catch(err => setApiError(err.message || 'No se pudieron cargar las preguntas de esta actividad'))
            .finally(() => setLoadingExistente(false));
    }, [esRetomar]);

    // Si estamos generando desde un texto ya subido (sin Actividad previa), arrancar directo
    useEffect(() => {
        if (!esDesdeTexto) return;
        setApiError('');
        generarActividad(textoExistente.texto_id)
            .then(actData => {
                setActividadId(actData.id);
                const allQ = Object.entries(actData.preguntas_por_nivel).flatMap(([nivel, pregs]) =>
                    pregs.map((p) => ({ ...p, nivel, aprobada: false }))
                );
                setQuestions(allQ);
                setStep(4);
            })
            .catch(err => {
                setApiError(err.message || 'Error al generar la actividad');
                setStep(4); // quedarse en una vista donde se vea el error, en vez de trabar en "generando"
            });
    }, [esDesdeTexto]);

    // Generar más preguntas sobre la actividad existente (no crea una nueva)
    const handleGenerarMas = async () => {
        setApiError('');
        setGenerandoMas(true);
        try {
            const actData = await generarMasPreguntas(actividadId);
            const nuevasQ = Object.entries(actData.preguntas_por_nivel).flatMap(([nivel, pregs]) =>
                pregs.map((p) => ({ ...p, nivel, aprobada: false }))
            );
            setQuestions(prev => [...prev, ...nuevasQ]);
        } catch (err) {
            setApiError(err.message || 'No se pudieron generar más preguntas');
        } finally {
            setGenerandoMas(false);
        }
    };

    const pickFile = (f) => {
        if (!f) return;
        setFile(f);
        setFileName(f.name);
        if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
        setStep(2);
    };

    // Paso 2 → 3: subir PDF y generar con IA
    const startGenerate = async () => {
        setApiError('');
        setStep(3);
        try {
            // 1. Subir PDF
            const textoData = await subirTexto(title, file);
            setTextoId(textoData.id);
            // 2. Generar preguntas con IA
            const actData = await generarActividad(textoData.id);
            setActividadId(actData.id);
            // Aplanar preguntas de todos los niveles con sus IDs reales
            const allQ = Object.entries(actData.preguntas_por_nivel).flatMap(([nivel, pregs]) =>
                pregs.map((p) => ({ ...p, nivel, aprobada: false }))
            );
            setQuestions(allQ);
            setStep(4);
        } catch (err) {
            setApiError(err.message || 'Error al generar la actividad');
            setStep(2);
        }
    };

    // Paso 4 → publicar
    const handlePublish = async () => {
        setApiError('');
        try {
            // Validar todas las preguntas marcadas como aprobadas
            const aprobadas = questions.filter((q) => q.aprobada);
            for (const q of aprobadas) {
                await validarPregunta(q.id);
            }
            // Publicar la actividad
            await publicarActividad(actividadId);
            onPublish({ titulo: title, actividad_id: actividadId });
        } catch (err) {
            setApiError(err.message || 'Error al publicar');
        }
    };

    const toggleAprobada = (idx) =>
        setQuestions((qs) => qs.map((q, i) => i === idx ? { ...q, aprobada: !q.aprobada } : q));

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, animation: 'fadeIn 0.2s' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: step === 4 ? 780 : 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'pop 0.25s ease' }}>

                {/* Header */}
                <div style={{ background: C.blue, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{esRetomar ? '📝' : '✨'}</div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{esRetomar ? 'Retomar actividad' : 'Crear actividad con IA'}</h2>
                        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                            {esRetomar && (loadingExistente ? 'Cargando preguntas…' : `${title}`)}
                            {!esRetomar && step === 1 && 'Paso 1 de 3 — Subí el texto'}
                            {!esRetomar && step === 2 && 'Paso 2 de 3 — Configurá la actividad'}
                            {!esRetomar && step === 3 && 'Generando preguntas con IA…'}
                            {!esRetomar && step === 4 && 'Paso 3 de 3 — Revisá y publicá'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 18, fontWeight: 900 }}>×</button>
                </div>

                {/* Barra de progreso (solo flujo de creación nueva desde cero) */}
                {!esRetomar && !esDesdeTexto && (
                    <div style={{ display: 'flex', gap: 6, padding: '14px 26px 0', flexShrink: 0 }}>
                        {[1, 2, 3].map((n) => {
                            const reached = n === 1 || (n === 2 && step >= 2) || (n === 3 && step >= 3);
                            return <div key={n} style={{ flex: 1, height: 5, borderRadius: 4, background: reached ? C.green : 'rgba(0,0,0,0.08)', transition: 'background 0.3s' }} />;
                        })}
                    </div>
                )}

                {/* Body */}
                <div style={{ padding: '24px 26px', overflowY: 'auto', flex: 1 }}>

                    {/* Error */}
                    {apiError && (
                        <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 16 }}>
                            ⚠️ {apiError}
                        </div>
                    )}

                    {/* Paso 1 — Upload */}
                    {step === 1 && (
                        <div>
                            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
                                onClick={() => inputRef.current?.click()}
                                style={{ border: `2.5px dashed ${dragOver ? C.green : C.blue + '55'}`, borderRadius: 16, background: dragOver ? C.green + '0d' : 'rgba(53,78,171,0.03)', padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.18s' }}>
                                <div style={{ width: 72, height: 72, borderRadius: 20, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 16px' }}>📄</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: C.dark }}>Arrastrá tu PDF aquí</div>
                                <div style={{ fontSize: 13, color: '#888', fontWeight: 600, marginTop: 5 }}>o hacé clic para seleccionar un archivo</div>
                                <div style={{ fontSize: 11.5, color: '#aaa', fontWeight: 600, marginTop: 14 }}>Formato: PDF · Máx. 10 MB</div>
                                <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files[0])} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 18, alignItems: 'center', background: C.yellow + '18', borderRadius: 12, padding: '12px 16px' }}>
                                <span style={{ fontSize: 22 }}>💡</span>
                                <p style={{ fontSize: 12.5, color: '#7a5d00', fontWeight: 700, lineHeight: 1.4 }}>La IA leerá el texto del PDF y generará preguntas de comprensión lectora de selección múltiple de forma automática.</p>
                            </div>
                        </div>
                    )}

                    {/* Paso 2 — Configuración */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.green + '12', border: `1.5px solid ${C.green}`, borderRadius: 12, padding: '12px 16px' }}>
                                <span style={{ fontSize: 24 }}>✅</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13.5, fontWeight: 800, color: C.dark }}>{fileName}</div>
                                    <div style={{ fontSize: 11.5, color: C.green, fontWeight: 700 }}>Archivo listo</div>
                                </div>
                                <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: C.blue, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito' }}>Cambiar</button>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 800, color: C.dark, display: 'block', marginBottom: 7 }}>Título de la actividad</label>
                                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. La Tortuga y la Liebre"
                                    style={{ width: '100%', border: '2px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, color: C.dark, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                    )}

                    {/* Paso 3 — Generando */}
                    {step === 3 && (
                        <div style={{ padding: '32px 0', textAlign: 'center' }}>
                            <div style={{ width: 80, height: 80, margin: '0 auto 24px', position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: 0, border: `5px solid ${C.blue}1a`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>✨</div>
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 900, color: C.dark }}>Analizando el texto…</h3>
                            <p style={{ fontSize: 13.5, color: '#888', fontWeight: 600, marginTop: 6 }}>Subiendo el PDF y generando preguntas con IA</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '26px auto 0' }}>
                                {['Extrayendo el contenido del PDF', 'Identificando ideas principales', 'Redactando preguntas y opciones'].map((s, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 700, color: '#666', opacity: 0, animation: `fadeIn 0.4s ease ${i * 0.7}s forwards` }}>
                                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>✓</span>
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Paso 4 — Revisión */}
                    {step === 4 && (
                        <div>
                            {esRetomar && loadingExistente && (
                                <div style={{ padding: '32px 0', textAlign: 'center', color: THEME.subtext }}>Cargando preguntas de esta actividad…</div>
                            )}
                            {(!esRetomar || !loadingExistente) && !apiError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.green + '12', border: `1.5px solid ${C.green}`, borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
                                    <span style={{ fontSize: 24 }}>{esRetomar ? '📝' : '🎉'}</span>
                                    <div>
                                        <p style={{ fontSize: 13.5, fontWeight: 800, color: C.dark }}>
                                            {esRetomar
                                                ? `Esta actividad tiene ${questions.length} pregunta${questions.length === 1 ? '' : 's'} generada${questions.length === 1 ? '' : 's'}. Revisá, editá, aprobá o generá más.`
                                                : `¡Se generaron ${questions.length} preguntas! Revisá, editá y aprobá las que querés publicar.`}
                                        </p>
                                        <p style={{ fontSize: 12, color: THEME.subtext, marginTop: 2 }}>Se necesitan al menos 2 aprobadas por nivel (Fácil / Media / Difícil) para publicar.</p>
                                    </div>
                                </div>
                            )}
                            {(!esRetomar || !loadingExistente) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {questions.map((q, i) => {
                                        const isEditing = editandoIdx === i;
                                        return (
                                            <div key={i} style={{ border: `2px solid ${isEditing ? C.blue : q.aprobada ? C.green : 'rgba(0,0,0,0.08)'}`, borderRadius: 14, padding: '14px 16px', background: isEditing ? C.blueLight : q.aprobada ? C.green + '08' : '#fff', transition: 'all 0.15s' }}>

                                                {/* Vista normal */}
                                                {!isEditing && (
                                                    <>
                                                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                                                            <span style={{ width: 26, height: 26, borderRadius: 8, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.subtext, marginBottom: 4 }}>{q.nivel} · {q.tipo}</div>
                                                                <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>{q.pregunta}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                                <button
                                                                    onClick={() => { setEditandoIdx(i); setEditForm({ enunciado: q.pregunta, opciones: [...q.opciones], opcion_correcta: q.correcta, tipo: q.tipo, dificultad: q.nivel }); }}
                                                                    style={{ background: 'rgba(0,0,0,0.06)', color: '#666', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito' }}>
                                                                    ✏️ Editar
                                                                </button>
                                                                <button onClick={() => toggleAprobada(i)} style={{ background: q.aprobada ? C.green : 'rgba(0,0,0,0.06)', color: q.aprobada ? '#fff' : '#888', border: 'none', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito', whiteSpace: 'nowrap' }}>
                                                                    {q.aprobada ? '✓ Aprobada' : 'Aprobar'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingLeft: 36 }}>
                                                            {q.opciones.map((opt, oi) => (
                                                                <div key={oi} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, background: oi === q.correcta ? C.green + '15' : 'rgba(0,0,0,0.04)', color: oi === q.correcta ? C.green : '#666', fontWeight: oi === q.correcta ? 800 : 600, border: `1.5px solid ${oi === q.correcta ? C.green + '44' : 'transparent'}` }}>
                                                                    {['A', 'B', 'C', 'D'][oi]}. {opt}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}

                                                {/* Formulario de edición */}
                                                {isEditing && editForm && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                            <span style={{ width: 26, height: 26, borderRadius: 8, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                                                            <span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>Editando pregunta</span>
                                                        </div>

                                                        {/* Enunciado */}
                                                        <div>
                                                            <label style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, display: 'block', marginBottom: 5 }}>ENUNCIADO</label>
                                                            <textarea
                                                                value={editForm.enunciado}
                                                                onChange={e => setEditForm(f => ({ ...f, enunciado: e.target.value }))}
                                                                rows={3}
                                                                style={{ width: '100%', border: `2px solid ${C.blue}44`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontFamily: 'Nunito', fontWeight: 600, color: C.dark, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                                                            />
                                                        </div>

                                                        {/* Opciones */}
                                                        <div>
                                                            <label style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, display: 'block', marginBottom: 8 }}>OPCIONES · Hacé clic en el círculo para marcar la correcta</label>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                {editForm.opciones.map((opt, oi) => (
                                                                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                        <button
                                                                            onClick={() => setEditForm(f => ({ ...f, opcion_correcta: oi }))}
                                                                            style={{ width: 22, height: 22, borderRadius: '50%', border: `2.5px solid ${editForm.opcion_correcta === oi ? C.green : 'rgba(0,0,0,0.15)'}`, background: editForm.opcion_correcta === oi ? C.green : '#fff', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            {editForm.opcion_correcta === oi && <span style={{ fontSize: 12, color: '#fff', fontWeight: 900 }}>✓</span>}
                                                                        </button>
                                                                        <span style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, flexShrink: 0 }}>{['A', 'B', 'C', 'D'][oi]}.</span>
                                                                        <input
                                                                            value={opt}
                                                                            onChange={e => setEditForm(f => { const ops = [...f.opciones]; ops[oi] = e.target.value; return { ...f, opciones: ops }; })}
                                                                            style={{ flex: 1, border: `1.5px solid ${editForm.opcion_correcta === oi ? C.green + '66' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'Nunito', fontWeight: 600, color: C.dark, outline: 'none', background: editForm.opcion_correcta === oi ? C.green + '08' : '#fff' }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Tipo y Dificultad */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                            <div>
                                                                <label style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, display: 'block', marginBottom: 5 }}>TIPO</label>
                                                                <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                                                                    style={{ width: '100%', border: `2px solid rgba(0,0,0,0.1)`, borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'Nunito', fontWeight: 700, color: C.dark, outline: 'none', background: '#fff' }}>
                                                                    {['comprensión literal', 'inferencial', 'vocabulario', 'idea principal', 'secuencia', 'causa y efecto'].map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, display: 'block', marginBottom: 5 }}>DIFICULTAD</label>
                                                                <select value={editForm.dificultad} onChange={e => setEditForm(f => ({ ...f, dificultad: e.target.value }))}
                                                                    style={{ width: '100%', border: `2px solid rgba(0,0,0,0.1)`, borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'Nunito', fontWeight: 700, color: C.dark, outline: 'none', background: '#fff' }}>
                                                                    <option value="FÁCIL">Básico</option>
                                                                    <option value="MEDIA">Intermedio</option>
                                                                    <option value="DIFÍCIL">Avanzado</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Botones guardar/cancelar */}
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                                                            <button
                                                                onClick={() => { setEditandoIdx(null); setEditForm(null); }}
                                                                style={{ padding: '8px 18px', borderRadius: 10, border: '2px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 12.5, fontWeight: 800, color: '#888', cursor: 'pointer', fontFamily: 'Nunito' }}>
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                disabled={savingEdit || !editForm.enunciado.trim() || editForm.opciones.some(o => !o.trim())}
                                                                onClick={async () => {
                                                                    setSavingEdit(true);
                                                                    try {
                                                                        await editarPregunta(q.id, {
                                                                            enunciado: editForm.enunciado.trim(),
                                                                            opciones: editForm.opciones.map(o => o.trim()),
                                                                            opcion_correcta: editForm.opcion_correcta,
                                                                            tipo: editForm.tipo,
                                                                            dificultad: editForm.dificultad,
                                                                        });
                                                                        // Actualizar la pregunta localmente
                                                                        setQuestions(prev => prev.map((pq, pi) =>
                                                                            pi === i ? { ...pq, pregunta: editForm.enunciado.trim(), opciones: editForm.opciones.map(o => o.trim()), correcta: editForm.opcion_correcta, tipo: editForm.tipo, nivel: editForm.dificultad } : pq
                                                                        ));
                                                                        setEditandoIdx(null);
                                                                        setEditForm(null);
                                                                    } catch (e) {
                                                                        alert('No se pudo guardar la edición. Intentá de nuevo.');
                                                                    } finally {
                                                                        setSavingEdit(false);
                                                                    }
                                                                }}
                                                                style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: savingEdit ? '#ccc' : C.blue, fontSize: 12.5, fontWeight: 800, color: '#fff', cursor: savingEdit ? 'default' : 'pointer', fontFamily: 'Nunito' }}>
                                                                {savingEdit ? 'Guardando…' : '✓ Guardar cambios'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {esRetomar && (
                                        <button
                                            onClick={handleGenerarMas}
                                            disabled={generandoMas}
                                            style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 12, border: `2px dashed ${C.blue}55`, background: generandoMas ? 'rgba(0,0,0,0.03)' : C.blueLight, fontSize: 13, fontWeight: 800, color: C.blue, cursor: generandoMas ? 'default' : 'pointer', fontFamily: 'Nunito' }}>
                                            {generandoMas ? '✨ Generando…' : '✨ Generar más preguntas'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step !== 3 && (
                    <div style={{ padding: '16px 26px', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 12, justifyContent: 'flex-end', flexShrink: 0 }}>
                        {step === 1 && <button onClick={onClose} style={btnSecondary}>Cancelar</button>}
                        {step === 2 && (
                            <>
                                <button onClick={() => setStep(1)} style={btnSecondary}>← Atrás</button>
                                <button onClick={startGenerate} disabled={!title.trim() || !file} style={{ ...btnPrimary, background: title.trim() && file ? C.blue : '#ccc', cursor: title.trim() && file ? 'pointer' : 'default' }}>✨ Generar preguntas</button>
                            </>
                        )}
                        {step === 4 && (
                            <>
                                {esRetomar && <button onClick={() => onEliminar(actividadId)} style={{ ...btnSecondary, color: '#ff4d4f', borderColor: '#ff4d4f44' }}>🗑 Eliminar actividad</button>}
                                {esDesdeTexto && <button onClick={onClose} style={btnSecondary}>Cerrar</button>}
                                {!esRetomar && !esDesdeTexto && <button onClick={() => setStep(2)} style={btnSecondary}>← Atrás</button>}
                                {actividadId && (
                                    <button onClick={handlePublish} disabled={questions.filter(q => q.aprobada).length < 6}
                                        style={{ ...btnPrimary, background: questions.filter(q => q.aprobada).length >= 6 ? C.green : '#ccc', cursor: questions.filter(q => q.aprobada).length >= 6 ? 'pointer' : 'default' }}>
                                        ✓ Publicar actividad ({questions.filter(q => q.aprobada).length} aprobadas)
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const btnSecondary = { padding: '12px 22px', borderRadius: 12, border: '2px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13.5, fontWeight: 800, color: '#888', cursor: 'pointer', fontFamily: 'Nunito' };
const btnPrimary = { padding: '12px 24px', borderRadius: 12, border: 'none', fontSize: 13.5, fontWeight: 800, color: '#fff', fontFamily: 'Nunito' };


// ══════════════════════════════════════════════════════════════
// MODAL DE PREGUNTAS — ver preguntas de una actividad publicada
// ══════════════════════════════════════════════════════════════
const NIVEL_LABEL = { 'FÁCIL': 'Básico', 'MEDIA': 'Intermedio', 'DIFÍCIL': 'Avanzado' };
const NIVEL_COLOR = { 'FÁCIL': C.green, 'MEDIA': C.yellow, 'DIFÍCIL': C.red };

function PreguntasModal({ actividad_id, titulo, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [nivelFiltro, setNivelFiltro] = useState('TODOS');

    useEffect(() => {
        getActividad(actividad_id)
            .then(d => setData(d))
            .catch(err => setError(err.message || 'No se pudo cargar'))
            .finally(() => setLoading(false));
    }, [actividad_id]);

    const niveles = ['TODOS', 'FÁCIL', 'MEDIA', 'DIFÍCIL'];
    const preguntasFiltradas = data
        ? (nivelFiltro === 'TODOS'
            ? Object.entries(data.preguntas_por_nivel).flatMap(([nivel, ps]) => ps.map(p => ({ ...p, nivel })))
            : (data.preguntas_por_nivel[nivelFiltro] || []).map(p => ({ ...p, nivel: nivelFiltro })))
        : [];

    const total = data
        ? Object.values(data.preguntas_por_nivel).reduce((s, ps) => s + ps.length, 0)
        : 0;
    const totalValidadas = data
        ? Object.values(data.preguntas_por_nivel).reduce((s, ps) => s + ps.filter(p => p.validada).length, 0)
        : 0;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, animation: 'fadeIn 0.2s' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'pop 0.25s ease' }}>

                {/* Header */}
                <div style={{ background: C.blue, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Preguntas · {titulo}</h2>
                        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                            {loading ? 'Cargando…' : `${totalValidadas} de ${total} preguntas publicadas para alumnos`}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 18, fontWeight: 900 }}>×</button>
                </div>

                {/* Filtro de nivel */}
                {!loading && !error && (
                    <div style={{ padding: '14px 26px 0', display: 'flex', gap: 8, flexShrink: 0 }}>
                        {niveles.map(n => {
                            const active = nivelFiltro === n;
                            const color = n === 'TODOS' ? C.blue : NIVEL_COLOR[n];
                            return (
                                <button key={n} onClick={() => setNivelFiltro(n)}
                                    style={{ background: active ? color : color + '15', color: active ? '#fff' : color, border: `1.5px solid ${color}44`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito', transition: 'all 0.15s' }}>
                                    {n === 'TODOS' ? 'Todos' : NIVEL_LABEL[n]}
                                    {data && n !== 'TODOS' && (
                                        <span style={{ marginLeft: 5, opacity: 0.7 }}>({(data.preguntas_por_nivel[n] || []).length})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Contenido */}
                <div style={{ padding: '18px 26px 24px', overflowY: 'auto', flex: 1 }}>
                    {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.subtext }}>Cargando preguntas…</div>}
                    {error && <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: 12, padding: '12px 16px', color: C.red, fontWeight: 700 }}>⚠️ {error}</div>}

                    {!loading && !error && preguntasFiltradas.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#bbb', fontSize: 14 }}>No hay preguntas en este nivel.</div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {preguntasFiltradas.map((q, i) => {
                            const nColor = NIVEL_COLOR[q.nivel] || C.blue;
                            const nLabel = NIVEL_LABEL[q.nivel] || q.nivel;
                            const validada = !!q.validada;
                            return (
                                <div key={q.id || i} style={{ border: `1.5px solid ${validada ? 'rgba(0,0,0,0.08)' : C.red + '33'}`, borderRadius: 14, padding: '16px 18px', background: validada ? '#fafafa' : C.red + '06', opacity: validada ? 1 : 0.85 }}>
                                    {/* Cabecera de la pregunta */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                                        <span style={{ width: 28, height: 28, borderRadius: 8, background: nColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ background: nColor + '20', color: nColor, fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '2px 10px' }}>{nLabel}</span>
                                                {q.tipo && <span style={{ background: 'rgba(0,0,0,0.06)', color: '#666', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px' }}>{q.tipo}</span>}
                                                {validada
                                                    ? <span style={{ background: C.green + '18', color: C.green, fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '2px 10px' }}>✓ Publicada</span>
                                                    : <span style={{ background: C.red + '18', color: C.red, fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '2px 10px' }}>No publicada</span>
                                                }
                                            </div>
                                            <p style={{ fontSize: 14.5, fontWeight: 700, color: C.dark, margin: 0, lineHeight: 1.45 }}>{q.enunciado || q.pregunta}</p>
                                            {!validada && <p style={{ fontSize: 11.5, color: C.red, fontWeight: 600, margin: '4px 0 0' }}>Esta pregunta no fue aprobada y los alumnos nunca la ven.</p>}
                                        </div>
                                    </div>
                                    {/* Opciones */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, paddingLeft: 38 }}>
                                        {(q.opciones || []).map((opt, oi) => {
                                            const isCorrect = oi === (q.opcion_correcta ?? q.correcta);
                                            return (
                                                <div key={oi} style={{ fontSize: 13, padding: '7px 12px', borderRadius: 9, background: isCorrect ? C.green + '18' : 'rgba(0,0,0,0.04)', color: isCorrect ? C.green : '#555', fontWeight: isCorrect ? 800 : 600, border: `1.5px solid ${isCorrect ? C.green + '55' : 'transparent'}`, display: 'flex', gap: 7, alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 900, flexShrink: 0 }}>{['A', 'B', 'C', 'D'][oi]}.</span>
                                                    {opt}
                                                    {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }}>✓</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// MODAL DE RESULTADOS POR ACTIVIDAD
// ══════════════════════════════════════════════════════════════
function ResultadosModal({ actividad_id, titulo, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getResumenGrupal(actividad_id)
            .then(d => { setData(d); })
            .catch(err => setError(err.message || 'No se pudo cargar'))
            .finally(() => setLoading(false));
    }, [actividad_id]);

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, animation: 'fadeIn 0.2s' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 680, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'pop 0.25s ease' }}>

                {/* Header */}
                <div style={{ background: C.green, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Resultados · {titulo}</h2>
                        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Desempeño de la clase en esta actividad</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 18, fontWeight: 900 }}>×</button>
                </div>

                <div style={{ padding: '24px 26px', overflowY: 'auto', flex: 1 }}>
                    {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.subtext }}>Cargando resultados…</div>}
                    {error && <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: 12, padding: '12px 16px', color: C.red, fontWeight: 700 }}>⚠️ {error}</div>}

                    {data && (
                        <>
                            {/* Stat chips */}
                            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                                {[
                                    { label: 'Alumnos totales', value: data.total_alumnos, color: C.blue },
                                    { label: 'Empezaron', value: data.alumnos_que_empezaron, color: C.yellow },
                                    { label: 'Completaron', value: data.alumnos_que_completaron, color: C.green },
                                    { label: 'Promedio de aciertos', value: `${data.promedio_aciertos_clase}%`, color: C.pink },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ flex: '1 1 130px', background: color + '14', border: `1.5px solid ${color}33`, borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
                                        <div style={{ fontSize: 11.5, color: THEME.subtext, fontWeight: 700, marginTop: 3 }}>{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Tabla por alumno */}
                            <div style={{ background: THEME.card.bg, borderRadius: 14, overflow: 'hidden', border: '1.5px solid rgba(0,0,0,0.07)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr 80px', gap: 12, padding: '10px 18px', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    {['Alumno', 'Respondidas', 'Correctas', 'Promedio', 'Nivel'].map((h, i) => (
                                        <span key={i} style={{ fontSize: 11, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
                                    ))}
                                </div>
                                {data.alumnos.map((a, i) => {
                                    const pct = a.porcentaje_aciertos;
                                    const color = a.respondidas === 0 ? THEME.subtext : pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red;
                                    const nivel = nivelLabel(a.nivel_alcanzado);
                                    return (
                                        <div key={a.alumno_id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr 80px', gap: 12, padding: '12px 18px', alignItems: 'center', borderBottom: i < data.alumnos.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color, flexShrink: 0 }}>
                                                    {a.nombre[0].toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.heading }}>{a.nombre}</span>
                                                {a.completada && <span title="Completó la actividad" style={{ fontSize: 14 }}>✅</span>}
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: a.respondidas > 0 ? THEME.heading : THEME.subtext }}>
                                                {a.respondidas > 0 ? a.respondidas : '—'}
                                            </span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color }}>
                                                {a.respondidas > 0 ? a.correctas : '—'}
                                            </span>
                                            <div>
                                                {a.respondidas > 0
                                                    ? <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 800, color }}>{pct}%</span>
                                                        </div>
                                                        <div style={{ height: 6, borderRadius: 6, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6 }} />
                                                        </div>
                                                    </>
                                                    : <span style={{ fontSize: 12, color: THEME.subtext }}>Sin actividad</span>
                                                }
                                            </div>
                                            <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: a.respondidas > 0 ? levelBg(nivel) : 'rgba(0,0,0,0.06)', color: a.respondidas > 0 ? levelColor(nivel) : THEME.subtext }}>
                                                {a.respondidas > 0 ? nivel : '—'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Toast({ msg }) {
    return (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: C.green, color: '#fff', padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 800, boxShadow: '0 8px 28px rgba(67,137,81,0.4)', zIndex: 60, animation: 'pop 0.3s ease', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎉</span> {msg}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// CONTENIDO — Actividades
// ══════════════════════════════════════════════════════════════
function ActividadesContent({ acts, loading, onOpenModal, onVerPreguntas, onVerResultados, onEliminar, onRetomar, onGenerarDesdeTexto, onEliminarTexto }) {
    const publicadas = acts.filter((a) => a.validada).length;
    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: C.dark }}>Mis actividades</h1>
                <p style={{ fontSize: 13.5, color: '#888', marginTop: 4 }}>{acts.length} textos subidos · {publicadas} actividades publicadas</p>
            </div>

            <div style={{ display: 'flex', gap: 14, marginBottom: 26 }}>
                {[
                    { label: 'Textos subidos', value: acts.length, icon: '📚', color: C.blue },
                    { label: 'Publicadas', value: publicadas, icon: '✅', color: C.green },
                    { label: 'Sin actividad', value: acts.filter(a => !a.actividad_id).length, icon: '📄', color: C.pink },
                ].map((s, i) => (
                    <div key={i} style={{ flex: 1, background: s.color, borderRadius: 16, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: -8, bottom: -10, fontSize: 48, opacity: 0.18 }}>{s.icon}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginTop: 5 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {loading
                ? <div style={{ textAlign: 'center', padding: '60px 0', color: THEME.subtext, fontSize: 14 }}>Cargando actividades…</div>
                : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                        <NewActivityCard onClick={onOpenModal} />
                        {acts.map((act, i) => <ActivityCard key={act.texto_id} act={act} color={ACT_COLORS[i % ACT_COLORS.length]} onVerPreguntas={onVerPreguntas} onVerResultados={onVerResultados} onEliminar={onEliminar} onRetomar={onRetomar} onGenerarDesdeTexto={onGenerarDesdeTexto} onEliminarTexto={onEliminarTexto} />)}
                    </div>
                )
            }
        </>
    );
}

// ══════════════════════════════════════════════════════════════
// PANEL DOCENTE — componente principal
// ══════════════════════════════════════════════════════════════
export default function PanelDocente({ user, onLogout }) {
    const [activeNav, setActiveNav] = useState('clase');
    const [collapsed, setCollapsed] = useState(false);
    const [modal, setModal] = useState(null); // null = cerrado, {} = crear nueva, {actividad_id, titulo} = retomar borrador
    const [toast, setToast] = useState('');
    const [resultadosModal, setResultadosModal] = useState(null);
    const [preguntasModal, setPreguntasModal] = useState(null);

    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [acts, setActs] = useState([]);
    const [loadingActs, setLoadingActs] = useState(true);
    const [resumen, setResumen] = useState('');
    const [loadingResumen, setLoadingResumen] = useState(false);
    const [progresoActs, setProgresoActs] = useState([]);
    const [loadingProgreso, setLoadingProgreso] = useState(false);

    const recargarAlumnos = () => {
        setLoadingStudents(true);
        listarAlumnos().then(setStudents).catch(() => { }).finally(() => setLoadingStudents(false));
    };

    useEffect(() => { recargarAlumnos(); }, []);

    useEffect(() => {
        listarMisActividades().then(setActs).catch(() => { }).finally(() => setLoadingActs(false));
    }, []);

    const recargarResumenIA = () => {
        setResumen('');
        setLoadingResumen(true);
        getResumenIA().then(d => setResumen(d.resumen || '')).catch(() => { }).finally(() => setLoadingResumen(false));
    };

    useEffect(() => {
        if (activeNav !== 'progreso') return;
        if (resumen) return;  // solo carga la primera vez; el docente puede forzar actualización
        recargarResumenIA();
    }, [activeNav]);

    // Recarga métricas de progreso cada vez que cambian las actividades o se entra a la sección
    useEffect(() => {
        const publicadas = acts.filter(a => a.validada && a.actividad_id);
        if (publicadas.length === 0) { setProgresoActs([]); return; }
        setLoadingProgreso(true);
        Promise.all(
            publicadas.map(a =>
                getResumenGrupal(a.actividad_id)
                    .then(d => ({ ...d, titulo: a.titulo }))
                    .catch(() => null)
            )
        ).then(results => setProgresoActs(results.filter(Boolean)))
            .finally(() => setLoadingProgreso(false));
    }, [acts]);

    const handleEliminar = async (actividadId) => {
        if (!window.confirm('¿Eliminás esta actividad? Esta acción no se puede deshacer.')) return;
        try {
            await eliminarActividad(actividadId);
            setActs(prev => prev.filter(a => a.actividad_id !== actividadId));
            setResumen('');
            setModal(null);
            setToast('Actividad eliminada correctamente');
            setTimeout(() => setToast(''), 3000);
        } catch (err) {
            setToast('No se pudo eliminar la actividad');
            setTimeout(() => setToast(''), 3000);
        }
    };

    const handleEliminarTexto = async (textoId) => {
        if (!window.confirm('¿Eliminás este texto? Esta acción no se puede deshacer.')) return;
        try {
            await eliminarTexto(textoId);
            setActs(prev => prev.filter(a => a.texto_id !== textoId));
            setToast('Texto eliminado correctamente');
            setTimeout(() => setToast(''), 3000);
        } catch (err) {
            setToast(err.message || 'No se pudo eliminar el texto');
            setTimeout(() => setToast(''), 3000);
        }
    };

    const handlePublish = (data) => {
        setModal(null);
        setToast(`"${data.titulo}" publicada correctamente`);
        setTimeout(() => setToast(''), 3500);
        setResumen('');
        listarMisActividades().then(setActs).catch(() => { });
    };

    const { sub } = SECTION_META[activeNav] || SECTION_META.clase;

    const renderContent = () => {
        if (activeNav === 'actividades')
            return <ActividadesContent
                acts={acts} loading={loadingActs}
                onOpenModal={() => setModal({ tipo: 'nueva' })}
                onVerPreguntas={(id, titulo) => setPreguntasModal({ actividad_id: id, titulo })}
                onVerResultados={(id, titulo) => setResultadosModal({ actividad_id: id, titulo })}
                onEliminar={handleEliminar}
                onRetomar={(id, titulo) => setModal({ tipo: 'retomar', actividad_id: id, titulo })}
                onGenerarDesdeTexto={(textoId, titulo) => setModal({ tipo: 'desdeTexto', texto_id: textoId, titulo })}
                onEliminarTexto={handleEliminarTexto}
            />;
        if (activeNav === 'clase')
            return <MiClaseContent students={students} loadingStudents={loadingStudents} codigoClase={user?.codigo_clase} onAlumnoCreado={() => { recargarAlumnos(); setToast('Alumno creado correctamente'); setTimeout(() => setToast(''), 3000); }} />;
        return <ProgresoContent students={students} loadingStudents={loadingStudents} resumen={resumen} loadingResumen={loadingResumen} progresoActs={progresoActs} loadingProgreso={loadingProgreso} onActualizarResumen={recargarResumenIA} />;
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: THEME.main.bg, fontFamily: 'Nunito' }}>
            <Sidebar active={activeNav} onNav={setActiveNav} collapsed={collapsed} user={user} onLogout={onLogout} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ background: THEME.topbar.bg, borderBottom: `1px solid ${THEME.topbar.border}`, padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    <button onClick={() => setCollapsed(c => !c)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, color: THEME.heading, fontSize: 18, lineHeight: 1 }}>☰</button>
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: THEME.heading }}>Hola, {user?.nombre || 'Docente'}</span>
                        <span style={{ fontSize: 13, color: THEME.subtext, marginLeft: 10 }}>{sub}</span>
                    </div>
                </div>

                <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
                    {renderContent()}
                </div>
            </div>

            {modal && <CreateModal
                onClose={() => setModal(null)}
                onPublish={handlePublish}
                onEliminar={handleEliminar}
                actividadExistente={modal.tipo === 'retomar' ? modal : null}
                textoExistente={modal.tipo === 'desdeTexto' ? modal : null}
            />}
            {preguntasModal && <PreguntasModal actividad_id={preguntasModal.actividad_id} titulo={preguntasModal.titulo} onClose={() => setPreguntasModal(null)} />}
            {resultadosModal && <ResultadosModal actividad_id={resultadosModal.actividad_id} titulo={resultadosModal.titulo} onClose={() => setResultadosModal(null)} />}
            {toast && <Toast msg={toast} />}
        </div>
    );
}