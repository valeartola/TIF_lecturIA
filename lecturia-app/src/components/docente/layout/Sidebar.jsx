import { useState } from 'react';
import { C } from '../../../constants/colors';
import { editarNombreDocente } from '../../../api';

const NAV = [
    { id: 'clase', label: 'Mi Clase' },
    { id: 'actividades', label: 'Actividades' },
    { id: 'progreso', label: 'Progreso' },
];

const t = {
    bg: C.cream, text: C.dark, subtext: '#888',
    activeItem: 'rgba(53,78,171,0.08)', activeBorder: C.blue,
};

export default function Sidebar({ active, onNav, collapsed, user, onLogout, onNombreDocenteEditado }) {
    const [modalPerfil, setModalPerfil] = useState(false);
    const [editandoNombre, setEditandoNombre] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [guardandoNombre, setGuardandoNombre] = useState(false);

    const iniciarEdicion = () => {
        setNuevoNombre(user?.nombre || '');
        setEditandoNombre(true);
    };

    const guardarNombre = async () => {
        if (!nuevoNombre.trim() || nuevoNombre.trim() === user?.nombre) {
            setEditandoNombre(false);
            return;
        }
        setGuardandoNombre(true);
        try {
            await editarNombreDocente(nuevoNombre.trim());
            onNombreDocenteEditado(nuevoNombre.trim());
            setEditandoNombre(false);
            setModalPerfil(false);
        } catch (e) {
            alert(e.message || 'No se pudo guardar el nombre');
        } finally {
            setGuardandoNombre(false);
        }
    };

    return (
        <>
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
                        <div style={{ padding: '6px 20px 16px', marginBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    onClick={() => setModalPerfil(true)}
                                    title="Ver perfil"
                                    style={{ cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', background: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: C.dark, flexShrink: 0, transition: 'opacity 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                >
                                    {user?.nombre?.[0]?.toUpperCase() || 'D'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nombre || 'Docente'}</div>
                                    <div style={{ fontSize: 11, color: t.subtext }}>Código: {user?.codigo_clase || '—'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    {collapsed && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                            <div onClick={() => setModalPerfil(true)} title="Ver perfil" style={{ cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', background: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: C.dark }}>
                                {user?.nombre?.[0]?.toUpperCase() || 'D'}
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

            {modalPerfil && (
                <div onClick={() => { setModalPerfil(false); setEditandoNombre(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                        <div style={{ background: `linear-gradient(135deg, ${C.yellow}, #f5a623)`, padding: '28px 24px 24px', textAlign: 'center', position: 'relative' }}>
                            <button onClick={() => { setModalPerfil(false); setEditandoNombre(false); }} style={{ position: 'absolute', top: 12, right: 14, background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 16, fontWeight: 900, color: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.35)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: C.dark }}>
                                {user?.nombre?.[0]?.toUpperCase() || 'D'}
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: C.dark }}>{user?.nombre || 'Docente'}</div>
                            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontWeight: 600, marginTop: 3 }}>{user?.email || ''}</div>
                        </div>

                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ background: '#f8f8f8', borderRadius: 10, padding: '10px 14px' }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Código de clase</div>
                                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: C.blue, fontFamily: 'monospace' }}>{user?.codigo_clase || '—'}</div>
                            </div>

                            {editandoNombre ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: 12, fontWeight: 800, color: '#555' }}>Nuevo nombre</label>
                                    <input
                                        value={nuevoNombre}
                                        onChange={e => setNuevoNombre(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') guardarNombre(); if (e.key === 'Escape') setEditandoNombre(false); }}
                                        autoFocus
                                        style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.blue}`, fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, outline: 'none' }}
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={guardarNombre} disabled={guardandoNombre} style={{ flex: 1, background: C.green, color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito' }}>
                                            {guardandoNombre ? 'Guardando…' : '✓ Guardar'}
                                        </button>
                                        <button onClick={() => setEditandoNombre(false)} style={{ flex: 1, background: '#eee', color: '#555', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito' }}>
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={iniciarEdicion} style={{ background: C.blue + '12', border: `1.5px solid ${C.blue}33`, borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 800, color: C.blue, cursor: 'pointer', fontFamily: 'Nunito', width: '100%' }}>
                                    Editar nombre
                                </button>
                            )}

                            <button onClick={() => { setModalPerfil(false); onLogout(); }} style={{ background: '#FEE', border: `1.5px solid ${C.red}33`, borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 800, color: C.red, cursor: 'pointer', fontFamily: 'Nunito', width: '100%' }}>
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
