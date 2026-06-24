import { useState } from 'react';
import { C } from '../../../constants/colors';

export function ActivityCard({ act, color, onVerPreguntas, onVerResultados, onEliminar, onRetomar, onGenerarDesdeTexto, onEliminarTexto }) {
    const fecha = act.creado_en ? new Date(act.creado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const sinActividad = !act.actividad_id;

    return (
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ background: color, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{act.titulo}</h3>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginTop: 3 }}>{fecha}</div>
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

export function NewActivityCard({ onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{ background: hover ? 'rgba(53,78,171,0.04)' : '#fff', border: `2.5px dashed ${hover ? C.blue : C.blue + '55'}`, borderRadius: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 240, transition: 'all 0.18s', fontFamily: 'Nunito', transform: hover ? 'translateY(-2px)' : 'none' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: '#fff', boxShadow: `0 6px 18px ${C.blue}44` }}>+</div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.blue }}>Crear nueva actividad</div>
            </div>
        </button>
    );
}