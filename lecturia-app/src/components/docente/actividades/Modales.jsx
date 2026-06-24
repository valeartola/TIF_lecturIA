import { useState, useEffect } from 'react';
import { C } from '../../../constants/colors';
import { getActividad, getResumenGrupal } from '../../../api';
import { nivelLabel, levelColor, levelBg } from '../../../utils/nivel';

const THEME = { subtext: '#666', heading: C.dark, card: { bg: '#fff' } };
const NIVEL_LABEL = { 'FÁCIL': 'Básico', 'MEDIA': 'Intermedio', 'DIFÍCIL': 'Avanzado' };
const NIVEL_COLOR = { 'FÁCIL': C.green, 'MEDIA': C.yellow, 'DIFÍCIL': C.red };

export function PreguntasModal({ actividad_id, titulo, onClose }) {
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

    const total = data ? Object.values(data.preguntas_por_nivel).reduce((s, ps) => s + ps.length, 0) : 0;
    const totalValidadas = data ? Object.values(data.preguntas_por_nivel).reduce((s, ps) => s + ps.filter(p => p.validada).length, 0) : 0;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, animation: 'fadeIn 0.2s' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'pop 0.25s ease' }}>
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
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                                        <span style={{ width: 28, height: 28, borderRadius: 8, background: nColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ background: nColor + '20', color: nColor, fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '2px 10px' }}>{nLabel}</span>
                                                {q.tipo && <span style={{ background: 'rgba(0,0,0,0.06)', color: '#666', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px' }}>{q.tipo}</span>}
                                                {validada
                                                    ? <span style={{ background: C.green + '18', color: C.green, fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '2px 10px' }}>✓ Publicada</span>
                                                    : <span style={{ background: C.red + '18', color: C.red, fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '2px 10px' }}>No publicada</span>}
                                            </div>
                                            <p style={{ fontSize: 14.5, fontWeight: 700, color: C.dark, margin: 0, lineHeight: 1.45 }}>{q.enunciado || q.pregunta}</p>
                                            {!validada && <p style={{ fontSize: 11.5, color: C.red, fontWeight: 600, margin: '4px 0 0' }}>Esta pregunta no fue aprobada y los alumnos nunca la ven.</p>}
                                        </div>
                                    </div>
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

export function ResultadosModal({ actividad_id, titulo, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getResumenGrupal(actividad_id)
            .then(d => setData(d))
            .catch(err => setError(err.message || 'No se pudo cargar'))
            .finally(() => setLoading(false));
    }, [actividad_id]);

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, animation: 'fadeIn 0.2s' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 680, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'pop 0.25s ease' }}>
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
                                            <span style={{ fontSize: 13, fontWeight: 700, color: a.respondidas > 0 ? THEME.heading : THEME.subtext }}>{a.respondidas > 0 ? a.respondidas : '—'}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color }}>{a.respondidas > 0 ? a.correctas : '—'}</span>
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
                                                    : <span style={{ fontSize: 12, color: THEME.subtext }}>Sin actividad</span>}
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
