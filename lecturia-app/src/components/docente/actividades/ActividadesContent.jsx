import { useState } from 'react';
import { C } from '../../../constants/colors';
import { ActivityCard, NewActivityCard } from './ActivityCard';

const ACT_COLORS = [C.blue, C.green, C.yellow, C.pink, C.red];
const THEME_SUBTEXT = '#666';

export default function ActividadesContent({ acts, loading, onOpenModal, onVerPreguntas, onVerResultados, onEliminar, onRetomar, onGenerarDesdeTexto, onEliminarTexto }) {
    const publicadas = acts.filter((a) => a.validada).length;
    const [busqueda, setBusqueda] = useState('');
    const actsFiltradas = acts.filter(a => a.titulo.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: C.dark }}>Mis actividades</h1>
                </div>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar actividad…"
                    style={{ padding: '9px 14px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.12)', fontSize: 13, fontFamily: 'Nunito', fontWeight: 600, outline: 'none', background: '#fff', width: 210, alignSelf: 'center' }} />
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
                ? <div style={{ textAlign: 'center', padding: '60px 0', color: THEME_SUBTEXT, fontSize: 14 }}>Cargando actividades…</div>
                : actsFiltradas.length === 0 && busqueda
                    ? <div style={{ textAlign: 'center', padding: '60px 0', color: THEME_SUBTEXT, fontSize: 14 }}>No se encontró ninguna actividad con ese nombre.</div>
                    : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, gridAutoRows: '1fr' }}>
                            {!busqueda && <NewActivityCard onClick={onOpenModal} />}
                            {actsFiltradas.map((act, i) => (
                                <ActivityCard key={act.texto_id} act={act} color={ACT_COLORS[i % ACT_COLORS.length]}
                                    onVerPreguntas={onVerPreguntas} onVerResultados={onVerResultados}
                                    onEliminar={onEliminar} onRetomar={onRetomar}
                                    onGenerarDesdeTexto={onGenerarDesdeTexto} onEliminarTexto={onEliminarTexto} />
                            ))}
                        </div>
                    )
            }
        </>
    );
}
