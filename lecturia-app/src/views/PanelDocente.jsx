import { useState, useRef, useEffect } from 'react';
import { C } from '../constants/colors';
import {
    listarAlumnos, listarMisActividades, subirTexto,
    generarActividad, validarPregunta, publicarActividad,
    getResumenIA, crearAlumno, getResumenGrupal, eliminarActividad, getActividad,
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

            {!collapsed && (
                <div onClick={onLogout} title="Cerrar sesión" style={{ padding: '16px 20px', cursor: 'pointer', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
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

function BarChart() {
    const max = Math.max(...CHART_DATA.map((d) => d.pct));
    const H = 120;
    return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: H + 40, padding: '0 4px' }}>
            {CHART_DATA.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.chartBar }}>{d.pct}%</div>
                    <div style={{ width: '100%', height: H, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.04)', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: `${d.pct / 100 * H}px`, background: THEME.chartBar, borderRadius: '6px 6px 0 0', transition: 'height 0.8s', opacity: 0.75 + d.pct / max * 0.25 }} />
                    </div>
                    <div style={{ fontSize: 10, color: THEME.subtext, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'pre', fontWeight: 600 }}>{d.name}</div>
                </div>
            ))}
        </div>
    );
}

function ProgressBar({ pct, color }) {
    return (
        <div style={{ height: 8, borderRadius: 8, background: 'rgba(0,0,0,0.07)', overflow: 'hidden', width: '100%' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 8, transition: 'width 1s' }} />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// CONTENIDO — Progreso (datos reales)
// ══════════════════════════════════════════════════════════════
const nivelLabel = (n) => ({ 'FÁCIL': 'Básico', 'MEDIA': 'Intermedio', 'DIFÍCIL': 'Avanzado' }[n] || '—');

function ProgresoContent({ students, loadingStudents, resumen, loadingResumen, progresoActs, loadingProgreso, onActualizarResumen }) {
    const { card } = THEME;

    // Métricas reales derivadas de progresoActs
    const totalAlumnos = students.length;
    const promedioGlobal = progresoActs.length
        ? Math.round(progresoActs.reduce((s, a) => s + a.promedio_aciertos_clase, 0) / progresoActs.length)
        : null;
    const totalCompletadas = progresoActs.reduce((s, a) => s + a.alumnos_que_completaron, 0);

    // Datos del gráfico: una barra por actividad publicada con datos
    const chartData = progresoActs.map(a => ({
        name: a.titulo || `Act. ${a.actividad_id}`,
        pct: a.promedio_aciertos_clase,
    }));

    // Tabla de alumnos: para cada alumno tomamos su mejor % de todas las actividades
    const alumnosConStats = students.map(s => {
        const stats = progresoActs.flatMap(a => a.alumnos).filter(al => al.nombre === s.nombre);
        const activas = stats.filter(al => al.respondidas > 0);
        const promedio = activas.length
            ? Math.round(activas.reduce((sum, al) => sum + al.porcentaje_aciertos, 0) / activas.length)
            : null;
        const nivel = activas.length ? activas.at(-1).nivel_alcanzado : null;
        return { ...s, promedio, nivel, activas: activas.length };
    });

    const maxPct = chartData.length ? Math.max(...chartData.map(d => d.pct)) : 100;
    const H = 110;

    return (
        <>
            {/* Tarjeta IA */}
            {(resumen || loadingResumen) && (
                <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, borderRadius: card.radius, padding: '20px 24px', marginBottom: 28, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>✨</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Análisis de tu clase · Generado con IA</div>
                            {!loadingResumen && <button onClick={onActualizarResumen} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 11.5, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito' }}>↻ Actualizar</button>}
                        </div>
                        {loadingResumen
                            ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} /><span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Generando análisis…</span></div>
                            : <p style={{ fontSize: 14, color: '#fff', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>{resumen}</p>
                        }
                    </div>
                </div>
            )}

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
                <StatCard label="Total de estudiantes" value={totalAlumnos} sub="Registrados en la clase" icon="🧒" color={C.blue} />
                <StatCard label="Actividades publicadas" value={progresoActs.length} sub="Con al menos un alumno" icon="📖" color={C.green} />
                <StatCard label="Promedio global" value={promedioGlobal !== null ? `${promedioGlobal}%` : '—'} sub="Promedio entre actividades" icon="⭐" color={C.yellow} />
                <StatCard label="Actividades completadas" value={totalCompletadas} sub="Veces que un alumno terminó" icon="✅" color={C.pink} />
            </div>

            {/* Gráfico + resumen de niveles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 28 }}>
                <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, marginBottom: 4 }}>Promedio por actividad</h2>
                    <p style={{ fontSize: 12, color: THEME.subtext, marginBottom: 18 }}>
                        {loadingProgreso ? 'Cargando…' : chartData.length === 0 ? 'Sin actividades publicadas aún' : `${chartData.length} actividad${chartData.length !== 1 ? 'es' : ''}`}
                    </p>
                    {loadingProgreso
                        ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.subtext, fontSize: 13 }}>Cargando datos…</div>
                        : chartData.length === 0
                            ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>Publicá actividades para ver el gráfico</div>
                            : (
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: H + 40 }}>
                                    {chartData.map((d, i) => (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: C.pink }}>{d.pct}%</div>
                                            <div style={{ width: '100%', height: H, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.04)', borderRadius: 8, overflow: 'hidden' }}>
                                                <div style={{ width: '100%', height: `${d.pct / (maxPct || 100) * H}px`, background: C.pink, borderRadius: '6px 6px 0 0', transition: 'height 0.8s' }} />
                                            </div>
                                            <div style={{ fontSize: 9.5, color: THEME.subtext, textAlign: 'center', lineHeight: 1.3, fontWeight: 600, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>{d.name}</div>
                                        </div>
                                    ))}
                                </div>
                            )
                    }
                </div>

                <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, marginBottom: 4 }}>Resumen de la clase</h2>
                    <p style={{ fontSize: 12, color: THEME.subtext, marginBottom: 18 }}>{totalAlumnos} alumnos · {progresoActs.length} actividades</p>
                    {[
                        { label: 'Alumnos activos', value: alumnosConStats.filter(a => a.activas > 0).length, color: C.green },
                        { label: 'Sin actividad aún', value: alumnosConStats.filter(a => a.activas === 0).length, color: C.gray },
                        { label: 'Promedio ≥ 70%', value: alumnosConStats.filter(a => a.promedio !== null && a.promedio >= 70).length, color: C.yellow },
                        { label: 'Necesitan atención', value: alumnosConStats.filter(a => a.promedio !== null && a.promedio < 50).length, color: C.red },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.heading }}>{label}</span>
                                <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
                            </div>
                            <div style={{ height: 7, borderRadius: 8, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${totalAlumnos > 0 ? (value / totalAlumnos) * 100 : 0}%`, background: color, borderRadius: 8, transition: 'width 0.8s' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabla de alumnos con stats reales */}
            <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, marginBottom: 4 }}>Desempeño por alumno</h2>
                <p style={{ fontSize: 12, color: THEME.subtext, marginBottom: 18 }}>Promedio acumulado en todas las actividades</p>

                {loadingStudents || loadingProgreso
                    ? <div style={{ padding: '20px 0', textAlign: 'center', color: THEME.subtext }}>Cargando…</div>
                    : alumnosConStats.length === 0
                        ? <div style={{ padding: '20px 0', textAlign: 'center', color: THEME.subtext }}>No hay alumnos en la clase todavía.</div>
                        : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.6fr 60px', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', marginBottom: 8 }}>
                                    {['Alumno', 'Actividades', 'Nivel', 'Promedio', ''].map((h, i) => (
                                        <span key={i} style={{ fontSize: 11, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
                                    ))}
                                </div>
                                {alumnosConStats.map((s, i) => {
                                    const color = s.promedio === null ? THEME.subtext : s.promedio >= 70 ? C.green : s.promedio >= 50 ? C.yellow : C.red;
                                    const alert = s.promedio !== null && s.promedio < 50;
                                    return (
                                        <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.6fr 60px', gap: 12, padding: '11px 12px', borderRadius: 10, background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.018)', alignItems: 'center', borderBottom: i < alumnosConStats.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: alert ? C.red + '20' : C.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: alert ? C.red : C.blue, flexShrink: 0 }}>
                                                    {s.nombre[0].toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.heading }}>{s.nombre}</span>
                                                {alert && <span style={{ fontSize: 13 }}>⚠️</span>}
                                            </div>
                                            <span style={{ fontSize: 12.5, color: THEME.subtext, fontWeight: 600 }}>{s.activas} / {progresoActs.length}</span>
                                            <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: s.nivel ? levelBg(nivelLabel(s.nivel)) : 'rgba(0,0,0,0.06)', color: s.nivel ? levelColor(nivelLabel(s.nivel)) : THEME.subtext, whiteSpace: 'nowrap' }}>
                                                {s.nivel ? nivelLabel(s.nivel) : '—'}
                                            </span>
                                            <div>
                                                {s.promedio !== null && (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 800, color }}>{s.promedio}%</span>
                                                        </div>
                                                        <div style={{ height: 7, borderRadius: 8, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${s.promedio}%`, background: color, borderRadius: 8, transition: 'width 0.8s' }} />
                                                        </div>
                                                    </>
                                                )}
                                                {s.promedio === null && <span style={{ fontSize: 12, color: THEME.subtext, fontWeight: 600 }}>Sin actividad</span>}
                                            </div>
                                            <button style={{ background: 'transparent', border: `1.5px solid ${C.blue}33`, borderRadius: 8, padding: '5px 0', fontSize: 11.5, fontWeight: 800, color: C.blue, cursor: 'pointer', fontFamily: 'Nunito', width: '100%' }}>Ver</button>
                                        </div>
                                    );
                                })}
                            </>
                        )
                }
            </div>
        </>
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
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🧒</div>
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
function ActivityCard({ act, color, onVerPreguntas, onVerResultados, onEliminar }) {
    const fecha = act.creado_en ? new Date(act.creado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
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
                    <span style={{ background: act.validada ? '#E8F5EB' : '#FFF8E1', color: act.validada ? C.green : C.yellow, fontSize: 11.5, fontWeight: 800, borderRadius: 20, padding: '3px 11px' }}>
                        {act.validada ? '✓ Publicada' : '⏳ Borrador'}
                    </span>
                    <span style={{ background: 'rgba(0,0,0,0.05)', color: '#666', fontSize: 11.5, fontWeight: 800, borderRadius: 20, padding: '3px 11px' }}>
                        {act.palabras?.toLocaleString()} palabras
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    {act.validada && act.actividad_id && <button onClick={() => onVerPreguntas(act.actividad_id, act.titulo)} style={{ background: 'transparent', border: `1.5px solid ${C.blue}44`, borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 800, color: C.blue, cursor: 'pointer', fontFamily: 'Nunito' }}>Ver preguntas</button>}
                    {act.validada && act.actividad_id && <button onClick={() => onVerResultados(act.actividad_id, act.titulo)} style={{ flex: 1, background: C.blue, border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito' }}>Ver resultados</button>}
                    {!act.validada && act.actividad_id && <button style={{ flex: 1, background: C.green, border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito' }}>Publicar</button>}
                    {act.actividad_id && (
                        <button onClick={() => onEliminar(act.actividad_id)} style={{ background: 'transparent', border: `2px solid #ff4d4f44`, borderRadius: 10, padding: '7px 10px', fontSize: 14, cursor: 'pointer', color: '#ff4d4f', lineHeight: 1 }} title="Eliminar actividad">🗑</button>
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
                <div style={{ fontSize: 12.5, color: '#888', fontWeight: 600, marginTop: 4, maxWidth: 200, lineHeight: 1.4 }}>Subí un PDF y la IA generará las preguntas automáticamente</div>
            </div>
        </button>
    );
}

// ══════════════════════════════════════════════════════════════
// MODAL DE CREACIÓN — conectado a la API real
// ══════════════════════════════════════════════════════════════
function CreateModal({ onClose, onPublish }) {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [title, setTitle] = useState('');
    const [textoId, setTextoId] = useState(null);
    const [actividadId, setActividadId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [apiError, setApiError] = useState('');
    const inputRef = useRef(null);

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
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✨</div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Crear actividad con IA</h2>
                        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                            {step === 1 && 'Paso 1 de 3 — Subí el texto'}
                            {step === 2 && 'Paso 2 de 3 — Configurá la actividad'}
                            {step === 3 && 'Generando preguntas con IA…'}
                            {step === 4 && 'Paso 3 de 3 — Revisá y publicá'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 18, fontWeight: 900 }}>×</button>
                </div>

                {/* Barra de progreso */}
                <div style={{ display: 'flex', gap: 6, padding: '14px 26px 0', flexShrink: 0 }}>
                    {[1, 2, 3].map((n) => {
                        const reached = n === 1 || (n === 2 && step >= 2) || (n === 3 && step >= 3);
                        return <div key={n} style={{ flex: 1, height: 5, borderRadius: 4, background: reached ? C.green : 'rgba(0,0,0,0.08)', transition: 'background 0.3s' }} />;
                    })}
                </div>

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.green + '12', border: `1.5px solid ${C.green}`, borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
                                <span style={{ fontSize: 24 }}>🎉</span>
                                <div>
                                    <p style={{ fontSize: 13.5, fontWeight: 800, color: C.dark }}>¡Se generaron {questions.length} preguntas! Aprobá las que querés publicar.</p>
                                    <p style={{ fontSize: 12, color: THEME.subtext, marginTop: 2 }}>Se necesitan al menos 2 aprobadas por nivel (Fácil / Media / Difícil) para publicar.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {questions.map((q, i) => (
                                    <div key={i} style={{ border: `2px solid ${q.aprobada ? C.green : 'rgba(0,0,0,0.08)'}`, borderRadius: 14, padding: '14px 16px', background: q.aprobada ? C.green + '08' : '#fff', transition: 'all 0.15s' }}>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                                            <span style={{ width: 26, height: 26, borderRadius: 8, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.subtext, marginBottom: 4 }}>{q.nivel} · {q.tipo}</div>
                                                <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>{q.pregunta}</p>
                                            </div>
                                            <button onClick={() => toggleAprobada(i)} style={{ background: q.aprobada ? C.green : 'rgba(0,0,0,0.06)', color: q.aprobada ? '#fff' : '#888', border: 'none', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                {q.aprobada ? '✓ Aprobada' : 'Aprobar'}
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingLeft: 36 }}>
                                            {q.opciones.map((opt, oi) => (
                                                <div key={oi} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, background: oi === q.correcta ? C.green + '15' : 'rgba(0,0,0,0.04)', color: oi === q.correcta ? C.green : '#666', fontWeight: oi === q.correcta ? 800 : 600, border: `1.5px solid ${oi === q.correcta ? C.green + '44' : 'transparent'}` }}>
                                                    {['A', 'B', 'C', 'D'][oi]}. {opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                <button onClick={() => setStep(2)} style={btnSecondary}>← Atrás</button>
                                <button onClick={handlePublish} disabled={questions.filter(q => q.aprobada).length < 6}
                                    style={{ ...btnPrimary, background: questions.filter(q => q.aprobada).length >= 6 ? C.green : '#ccc', cursor: questions.filter(q => q.aprobada).length >= 6 ? 'pointer' : 'default' }}>
                                    ✓ Publicar actividad ({questions.filter(q => q.aprobada).length} aprobadas)
                                </button>
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

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, animation: 'fadeIn 0.2s' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'pop 0.25s ease' }}>

                {/* Header */}
                <div style={{ background: C.blue, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Preguntas · {titulo}</h2>
                        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                            {loading ? 'Cargando…' : `${total} preguntas en 3 niveles`}
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
                            return (
                                <div key={q.id || i} style={{ border: `1.5px solid rgba(0,0,0,0.08)`, borderRadius: 14, padding: '16px 18px', background: '#fafafa' }}>
                                    {/* Cabecera de la pregunta */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                                        <span style={{ width: 28, height: 28, borderRadius: 8, background: nColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                                                <span style={{ background: nColor + '20', color: nColor, fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '2px 10px' }}>{nLabel}</span>
                                                {q.tipo && <span style={{ background: 'rgba(0,0,0,0.06)', color: '#666', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px' }}>{q.tipo}</span>}
                                            </div>
                                            <p style={{ fontSize: 14.5, fontWeight: 700, color: C.dark, margin: 0, lineHeight: 1.45 }}>{q.enunciado || q.pregunta}</p>
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
function ActividadesContent({ acts, loading, onOpenModal, onVerPreguntas, onVerResultados, onEliminar }) {
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
                    { label: 'En borrador', value: acts.filter(a => a.actividad_id && !a.validada).length, icon: '⏳', color: C.yellow },
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
                        {acts.map((act, i) => <ActivityCard key={act.texto_id} act={act} color={ACT_COLORS[i % ACT_COLORS.length]} onVerPreguntas={onVerPreguntas} onVerResultados={onVerResultados} onEliminar={onEliminar} />)}
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
    const [modal, setModal] = useState(false);
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
            setToast('Actividad eliminada correctamente');
            setTimeout(() => setToast(''), 3000);
        } catch (err) {
            setToast('No se pudo eliminar la actividad');
            setTimeout(() => setToast(''), 3000);
        }
    };

    const handlePublish = (data) => {
        setModal(false);
        setToast(`"${data.titulo}" publicada correctamente`);
        setTimeout(() => setToast(''), 3500);
        setResumen('');
        listarMisActividades().then(setActs).catch(() => { });
    };

    const { sub } = SECTION_META[activeNav] || SECTION_META.clase;

    const renderContent = () => {
        if (activeNav === 'actividades')
            return <ActividadesContent acts={acts} loading={loadingActs} onOpenModal={() => setModal(true)} onVerPreguntas={(id, titulo) => setPreguntasModal({ actividad_id: id, titulo })} onVerResultados={(id, titulo) => setResultadosModal({ actividad_id: id, titulo })} onEliminar={handleEliminar} />;
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

            {modal && <CreateModal onClose={() => setModal(false)} onPublish={handlePublish} />}
            {preguntasModal && <PreguntasModal actividad_id={preguntasModal.actividad_id} titulo={preguntasModal.titulo} onClose={() => setPreguntasModal(null)} />}
            {resultadosModal && <ResultadosModal actividad_id={resultadosModal.actividad_id} titulo={resultadosModal.titulo} onClose={() => setResultadosModal(null)} />}
            {toast && <Toast msg={toast} />}
        </div>
    );
}