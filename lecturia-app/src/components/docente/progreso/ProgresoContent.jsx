import { useState, useEffect } from 'react';
import { C } from '../../../constants/colors';
import { getProgresoAlumno } from '../../../api';
import { nivelLabel, levelColor, levelBg } from '../../../utils/nivel';
import StatCard from '../../shared/StatCard';

const THEME = {
    card: { bg: '#fff', shadow: '0 2px 14px rgba(0,0,0,0.07)', radius: 18 },
    heading: C.dark,
    subtext: '#666',
};

export function AlumnoDetalleModal({ alumno, actividadIdx, progresoActs, onClose }) {
    const [actSelIdx, setActSelIdx] = useState(null);
    const [intentoSel, setIntentoSel] = useState(0);
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (actSelIdx === null) { setDatos(null); return; }
        const act = progresoActs[actSelIdx];
        if (!act) return;
        setLoading(true); setDatos(null); setIntentoSel(0); setError('');
        getProgresoAlumno(alumno.id, act.actividad_id)
            .then(d => setDatos(d))
            .catch(() => setError('No se pudo cargar el detalle.'))
            .finally(() => setLoading(false));
    }, [actSelIdx]);

    const intentos = datos?.intentos || [];
    const intentoData = intentos[intentoSel] || null;

    const PantallaResumen = () => (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
                Resumen de actividades
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {progresoActs.map((act, i) => {
                    const datoAct = act.alumnos?.find(al => al.nombre === alumno.nombre);
                    const hecho = datoAct && datoAct.respondidas > 0;
                    const pct = hecho ? Math.round(datoAct.porcentaje_aciertos) : null;
                    const nivel = hecho ? datoAct.nivel_alcanzado : null;
                    const pColor = pct === null ? THEME.subtext : pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red;
                    const pBg = pct === null ? '#f5f5f5' : pct >= 70 ? '#E8F5EB' : pct >= 50 ? '#FFF8E1' : '#FEECEC';
                    const nivelCfg = { 'FÁCIL': { label: 'Básico', bg: '#FEECEC', color: C.red }, 'MEDIA': { label: 'Intermedio', bg: '#FFF8E1', color: C.yellow }, 'DIFÍCIL': { label: 'Avanzado', bg: '#E8F5EB', color: C.green } }[nivel] || null;
                    return (
                        <button key={i} onClick={() => setActSelIdx(i)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer', fontFamily: 'Nunito', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s', borderLeft: `4px solid ${pColor}` }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Act. {i + 1}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: THEME.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.titulo}</div>
                                {!hecho && <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginTop: 3 }}>Sin actividad ⚠️</div>}
                            </div>
                            {nivelCfg && <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: nivelCfg.bg, color: nivelCfg.color, flexShrink: 0 }}>{nivelCfg.label}</span>}
                            <div style={{ background: pBg, borderRadius: 12, padding: '8px 14px', textAlign: 'center', flexShrink: 0, minWidth: 62 }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: pColor }}>{pct !== null ? `${pct}%` : '—'}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: pColor, opacity: 0.75 }}>promedio</div>
                            </div>
                            <div style={{ fontSize: 18, color: THEME.subtext, flexShrink: 0 }}>›</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const PantallaDetalle = () => (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px' }}>
            <button onClick={() => { setActSelIdx(null); setDatos(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: C.blue, fontFamily: 'Nunito', marginBottom: 18, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                ‹ Volver al resumen
            </button>
            {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.subtext }}>Cargando…</div>}
            {error && <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: 12, padding: '12px 16px', color: C.red, fontWeight: 700 }}>⚠️ {error}</div>}
            {datos && (
                <>
                    {intentos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.subtext }}>
                            <div style={{ fontWeight: 700 }}>Este alumno aún no realizó esta actividad.</div>
                        </div>
                    ) : (
                        <>
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
                                            <button key={i} onClick={() => setIntentoSel(i)} style={{ flex: 1, border: `2px solid ${sel ? C.blue : 'rgba(0,0,0,0.08)'}`, borderRadius: 14, padding: '14px 16px', background: sel ? C.blueLight : '#fff', cursor: 'pointer', fontFamily: 'Nunito', textAlign: 'left', transition: 'all 0.15s', boxShadow: sel ? `0 0 0 3px ${C.blue}22` : 'none' }}>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: sel ? C.blue : THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Intento {it.numero}</div>
                                                <div style={{ fontSize: 22, fontWeight: 900, color: col, lineHeight: 1, marginBottom: 4 }}>{it.porcentaje_aciertos}%</div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.subtext, marginBottom: 8 }}>{it.correctas}/{it.respondidas} correctas</div>
                                                <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: levelBg(niv), color: levelColor(niv) }}>{niv}</span>
                                                {it.completado && <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginTop: 6 }}>✓ Completado</div>}
                                            </button>
                                        );
                                    })}
                                    {Array.from({ length: 3 - intentos.length }).map((_, i) => (
                                        <div key={`empty-${i}`} style={{ flex: 1, border: '2px dashed rgba(0,0,0,0.1)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: 12, color: '#ccc', fontWeight: 700 }}>Intento {intentos.length + i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {intentoData && (
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                                        Preguntas — Intento {intentoData.numero}
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        {intentoData.respuestas.map((r, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: i < intentoData.respuestas.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: r.es_correcta ? 'rgba(67,137,81,0.04)' : 'rgba(255,31,54,0.04)' }}>
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
                                                        {r.tipo && <span style={{ fontSize: 11, fontWeight: 700, color: THEME.subtext }}>{r.tipo}</span>}
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
    );

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.28)' }}>
                <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                        {alumno.nombre[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>{alumno.nombre}{alumno.apellido ? ` ${alumno.apellido}` : ''}</h2>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, margin: 0 }}>
                            {actSelIdx === null ? 'Resumen de desempeño' : progresoActs[actSelIdx]?.titulo}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
                {actSelIdx === null ? <PantallaResumen /> : <PantallaDetalle />}
            </div>
        </div>
    );
}

export default function ProgresoContent({ students, loadingStudents, resumen, loadingResumen, progresoActs, loadingProgreso, onActualizarResumen }) {
    const { card } = THEME;
    const [alumnoDetalle, setAlumnoDetalle] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [ordenDesc, setOrdenDesc] = useState(true);
    const [verGrafico1, setVerGrafico1] = useState(false);

    const totalAlumnos = students.length;
    const promedioGlobal = progresoActs.length
        ? Math.round(progresoActs.reduce((s, a) => s + a.promedio_aciertos_clase, 0) / progresoActs.length)
        : null;

    const alumnosConStats = students.map(s => {
        const stats = progresoActs.flatMap(a => a.alumnos).filter(al => al.nombre === s.nombre);
        const activas = stats.filter(al => al.respondidas > 0);
        const promedio = activas.length ? Math.round(activas.reduce((sum, al) => sum + al.porcentaje_aciertos, 0) / activas.length) : null;
        const nivel = activas.length ? activas.at(-1).nivel_alcanzado : null;
        const detallePorActividad = progresoActs.map(act => {
            const dato = act.alumnos.find(al => al.nombre === s.nombre);
            return dato ? { titulo: act.titulo, actividad_id: act.actividad_id, ...dato } : null;
        }).filter(Boolean);
        return { ...s, promedio, nivel, activas: activas.length, detallePorActividad };
    });

    const alumnosFiltrados = alumnosConStats
        .filter(s => {
            const nombreCompleto = `${s.nombre}${s.apellido ? ' ' + s.apellido : ''}`.toLowerCase();
            return nombreCompleto.includes(busqueda.toLowerCase());
        })
        .sort((a, b) => {
            const pa = a.promedio ?? -1;
            const pb = b.promedio ?? -1;
            return ordenDesc ? pb - pa : pa - pb;
        });

    const necesitanAtencion = alumnosConStats.filter(a => a.promedio !== null && a.promedio < 50).length;

    const franjas = [
        { label: '< 50%', key: 'baja', color: C.red, bg: '#FEECEC', test: (p) => p < 50 },
        { label: '50-70%', key: 'media', color: C.yellow, bg: '#FFF8E1', test: (p) => p >= 50 && p < 70 },
        { label: '> 70%', key: 'alta', color: C.green, bg: '#E8F5EB', test: (p) => p >= 70 },
    ];
    const franjasData = franjas.map(f => ({
        ...f,
        cant: alumnosConStats.filter(a => a.promedio !== null && f.test(a.promedio)).length,
    }));

    const maxPromActividad = Math.max(...progresoActs.map(a => a.promedio_aciertos_clase), 1);
    const H = 100;

    return (
        <>
            {/* Tarjeta IA */}
            <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, borderRadius: card.radius, padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
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

            {/* Stat Cards */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
                <StatCard label="Necesitan atención" value={necesitanAtencion} icon={necesitanAtencion > 0 ? '⚠️' : '✅'} color={necesitanAtencion > 0 ? C.red : C.pink} />
                <StatCard label="Rendimiento general" value={promedioGlobal !== null ? `${promedioGlobal}%` : '—'} icon="⭐" color={C.yellow} />
                <StatCard label="Total de estudiantes" value={totalAlumnos} icon="🧒" color={C.blue} />
                <StatCard label="Actividades publicadas" value={progresoActs.length} icon="📖" color={C.green} />
            </div>

            {/* Gráficos */}
            <div style={{ marginBottom: 20 }}>
                <button onClick={() => setVerGrafico1(v => !v)}
                    style={{ background: verGrafico1 ? C.pink : '#fff', border: `1.5px solid ${verGrafico1 ? C.pink : 'rgba(0,0,0,0.12)'}`, borderRadius: 12, padding: '9px 18px', fontSize: 13, fontWeight: 800, color: verGrafico1 ? '#fff' : THEME.subtext, cursor: 'pointer', fontFamily: 'Nunito', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{verGrafico1 ? '▲' : '▼'}</span>
                    {verGrafico1 ? 'Ocultar gráficos' : 'Ver gráficos'}
                </button>

                {verGrafico1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
                        <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, marginBottom: 20 }}>Promedio por actividad</h2>
                            {loadingProgreso
                                ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.subtext, fontSize: 13 }}>Cargando datos…</div>
                                : progresoActs.length === 0
                                    ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>Sin actividades publicadas aún</div>
                                    : (
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: H + 40 }}>
                                            {progresoActs.map((act, idx) => {
                                                const pct = Math.round(act.promedio_aciertos_clase);
                                                const barH = pct === 0 ? 4 : Math.max(16, (pct / maxPromActividad) * H);
                                                const color = pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red;
                                                return (
                                                    <div key={act.actividad_id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                                        <div style={{ fontSize: 12, fontWeight: 900, color }}>{pct}%</div>
                                                        <div style={{ width: '100%', height: H, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.04)', borderRadius: 8, overflow: 'hidden' }}>
                                                            <div style={{ width: '100%', height: barH, background: color, borderRadius: '6px 6px 0 0', transition: 'height 0.8s', opacity: 0.85 }} />
                                                        </div>
                                                        <div style={{ fontSize: 10.5, color: THEME.subtext, textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>Act. {idx + 1}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                            }
                        </div>

                        <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, marginBottom: 20 }}>Distribución de promedios</h2>
                            {loadingProgreso
                                ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.subtext, fontSize: 13 }}>Cargando datos…</div>
                                : !alumnosConStats.some(a => a.promedio !== null)
                                    ? <div style={{ height: H + 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>Sin datos aún</div>
                                    : (() => {
                                        const sinActividad = alumnosConStats.filter(a => a.promedio === null).length;
                                        const totalAlumnosRosca = alumnosConStats.length;
                                        const todasFranjas = [...franjasData, { key: 'sin', label: 'Sin actividad', color: '#ccc', bg: '#f5f5f5', cant: sinActividad }];
                                        const r = 54, stroke = 22, cx = 80, cy = 80;
                                        const circ = 2 * Math.PI * r;
                                        let offset = 0;
                                        const segmentos = todasFranjas.map(f => {
                                            const dash = (f.cant / totalAlumnosRosca) * circ;
                                            const seg = { ...f, dash, offset };
                                            offset += dash;
                                            return seg;
                                        });
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                                <svg width={160} height={160}>
                                                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
                                                    {segmentos.map((seg) => seg.cant === 0 ? null : (
                                                        <circle key={seg.key} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeOpacity={0.85} strokeDasharray={`${seg.dash} ${circ - seg.dash}`} strokeDashoffset={circ / 4 - seg.offset} style={{ transition: 'stroke-dasharray 0.8s' }} />
                                                    ))}
                                                    <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={900} fill={THEME.heading}>{totalAlumnosRosca}</text>
                                                    <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={THEME.subtext}>alumnos</text>
                                                </svg>
                                                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                                                    {todasFranjas.filter(f => f.key !== 'sin' || f.cant > 0).map(f => (
                                                        <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                                                            <span style={{ fontSize: 12, fontWeight: 800, color: THEME.heading }}>{f.label}</span>
                                                            <span style={{ fontSize: 13, fontWeight: 900, color: f.color }}>{f.cant}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla de alumnos */}
            <div style={{ background: card.bg, borderRadius: card.radius, boxShadow: card.shadow, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, margin: 0 }}>Desempeño por alumno</h2>
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar alumno…"
                        style={{ padding: '7px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.12)', fontSize: 13, fontFamily: 'Nunito', fontWeight: 600, outline: 'none', background: '#fff', width: 180 }} />
                </div>

                {loadingStudents || loadingProgreso
                    ? <div style={{ padding: '20px 0', textAlign: 'center', color: THEME.subtext }}>Cargando…</div>
                    : alumnosConStats.length === 0
                        ? <div style={{ padding: '20px 0', textAlign: 'center', color: THEME.subtext }}>No hay alumnos en la clase todavía.</div>
                        : alumnosFiltrados.length === 0
                            ? <div style={{ padding: '20px 0', textAlign: 'center', color: THEME.subtext }}>No se encontró ningún alumno con ese nombre.</div>
                            : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 80px 100px', gap: 12, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>Alumno</span>
                                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${progresoActs.length}, 1fr)`, gap: 6 }}>
                                            {progresoActs.map((act, i) => (
                                                <span key={act.actividad_id} style={{ fontSize: 10, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center', display: 'block' }} title={act.titulo}>Act. {i + 1}</span>
                                            ))}
                                        </div>
                                        <button onClick={() => setOrdenDesc(o => !o)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, whiteSpace: 'nowrap', width: '100%' }}>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>Promedio</span>
                                            <span style={{ fontSize: 16, color: C.blue, fontWeight: 900 }}>{ordenDesc ? '↓' : '↑'}</span>
                                        </button>
                                        <span></span>
                                    </div>
                                    {alumnosFiltrados.map((s) => {
                                        const sinAct = s.promedio === null;
                                        const promedioColor = sinAct ? THEME.subtext : s.promedio >= 70 ? C.green : s.promedio >= 50 ? C.yellow : C.red;
                                        const nivelCfg = { 'FÁCIL': { label: 'Básico', bg: '#FEECEC', color: C.red }, 'MEDIA': { label: 'Intermedio', bg: '#FFF8E1', color: C.yellow }, 'DIFÍCIL': { label: 'Avanzado', bg: '#E8F5EB', color: C.green } }[s.nivel] || null;
                                        return (
                                            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 80px 100px', gap: 12, padding: '14px', borderRadius: 14, alignItems: 'center', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', borderLeft: sinAct ? `4px solid ${C.red}55` : s.promedio < 50 ? `4px solid ${C.red}` : s.promedio < 70 ? `4px solid ${C.yellow}` : `4px solid ${C.green}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: sinAct ? C.red + '18' : C.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: sinAct ? C.red : C.blue, flexShrink: 0 }}>
                                                        {s.nombre[0].toUpperCase()}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre}{s.apellido ? ` ${s.apellido}` : ''}</div>
                                                        {sinAct ? <div style={{ fontSize: 11, fontWeight: 700, color: C.red }}>Sin actividad ⚠️</div> : nivelCfg && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: nivelCfg.bg, color: nivelCfg.color }}>{nivelCfg.label}</span>}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${progresoActs.length}, 1fr)`, gap: 6, alignItems: 'center' }}>
                                                    {progresoActs.map((act) => {
                                                        const dato = act.alumnos.find(al => al.nombre === s.nombre);
                                                        const hecho = dato && dato.respondidas > 0;
                                                        const pct = hecho ? Math.round(dato.porcentaje_aciertos) : null;
                                                        const nivelAct = hecho ? dato.nivel_alcanzado : null;
                                                        const pColor = pct === null ? '#ccc' : pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red;
                                                        const pBg = pct === null ? '#f5f5f5' : pct >= 70 ? '#E8F5EB' : pct >= 50 ? '#FFF8E1' : '#FEECEC';
                                                        const nivelActCfg = { 'FÁCIL': 'Básico', 'MEDIA': 'Inter.', 'DIFÍCIL': 'Avanz.' }[nivelAct] || null;
                                                        return (
                                                            <div key={act.actividad_id} style={{ background: pBg, borderRadius: 10, padding: '6px 8px', textAlign: 'center' }}>
                                                                <div style={{ fontSize: 13, fontWeight: 900, color: pColor }}>{pct !== null ? `${pct}%` : '—'}</div>
                                                                {nivelActCfg && <div style={{ fontSize: 9.5, fontWeight: 700, color: pColor, marginTop: 1 }}>{nivelActCfg}</div>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div style={{ textAlign: 'center', minWidth: 48 }}>
                                                    <div style={{ fontSize: 16, fontWeight: 900, color: promedioColor }}>{sinAct ? '—' : `${s.promedio}%`}</div>
                                                    <div style={{ fontSize: 10, color: THEME.subtext, fontWeight: 600 }}>promedio</div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button onClick={() => setAlumnoDetalle({ alumno: s, actividadIdx: 0 })}
                                                        style={{ background: C.blue, border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Nunito', whiteSpace: 'nowrap' }}>
                                                        Ver detalle
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                }
            </div>

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