import { useState } from 'react';
import { C } from '../../../constants/colors';
import { crearAlumno, editarNombreAlumno } from '../../../api';

const THEME = {
    card: { bg: '#fff', shadow: '0 2px 14px rgba(0,0,0,0.07)', radius: 18 },
    heading: C.dark,
    subtext: '#666',
};

const fieldStyle = {
    padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.12)',
    fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, outline: 'none',
    background: '#fff', width: '100%', boxSizing: 'border-box',
};

export default function MiClaseContent({ students, loadingStudents, codigoClase, onAlumnoCreado, onAlumnoEditado }) {
    const [showForm, setShowForm] = useState(false);
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [editandoAlumno, setEditandoAlumno] = useState(null);
    const [editNombre, setEditNombre] = useState('');
    const [editApellido, setEditApellido] = useState('');
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);

    const handleCrear = async (e) => {
        e.preventDefault();
        if (!nombre.trim() || !apellido.trim() || !password.trim()) return;
        setSaving(true);
        setFormError('');
        try {
            await crearAlumno(nombre.trim(), apellido.trim(), password.trim());
            setNombre(''); setApellido(''); setPassword('');
            setShowForm(false);
            onAlumnoCreado();
        } catch (err) {
            setFormError(err.message || 'No se pudo crear el alumno');
        } finally {
            setSaving(false);
        }
    };

    const iniciarEdicionAlumno = (alumno) => {
        setEditandoAlumno(alumno.id);
        setEditNombre(alumno.nombre);
        setEditApellido(alumno.apellido || '');
    };

    const guardarEdicionAlumno = async (alumnoId) => {
        if (!editNombre.trim() || !editApellido.trim()) return;
        setGuardandoEdicion(true);
        try {
            await editarNombreAlumno(alumnoId, editNombre.trim(), editApellido.trim());
            setEditandoAlumno(null);
            onAlumnoEditado();
        } catch (e) {
            alert(e.message || 'No se pudo guardar');
        } finally {
            setGuardandoEdicion(false);
        }
    };

    return (
        <>
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

            {showForm && (
                <form onSubmit={handleCrear} style={{ background: C.blueLight, border: `2px solid ${C.blue}33`, borderRadius: THEME.card.radius, padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>Nombre</label>
                        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Sofía" required style={fieldStyle} />
                    </div>
                    <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>Apellido</label>
                        <input value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Ej. Torres" required style={fieldStyle} />
                    </div>
                    <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>Contraseña inicial</label>
                        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 4 caracteres" required minLength={4} style={fieldStyle} />
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 12, padding: '12px 24px', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {['Alumno', 'ID', ''].map((h, i) => (
                                <span key={i} style={{ fontSize: 11, fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
                            ))}
                        </div>
                        {students.map((s, i) => (
                            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 12, padding: '14px 24px', alignItems: 'center', borderBottom: i < students.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: C.blue, flexShrink: 0 }}>
                                        {s.nombre[0]?.toUpperCase() || '?'}
                                    </div>
                                    {editandoAlumno === s.id ? (
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                                            <input value={editNombre} onChange={e => setEditNombre(e.target.value)} placeholder="Nombre"
                                                onKeyDown={e => { if (e.key === 'Escape') setEditandoAlumno(null); }} autoFocus
                                                style={{ ...fieldStyle, fontSize: 13, padding: '6px 10px', flex: '1 1 100px' }} />
                                            <input value={editApellido} onChange={e => setEditApellido(e.target.value)} placeholder="Apellido"
                                                onKeyDown={e => { if (e.key === 'Enter') guardarEdicionAlumno(s.id); if (e.key === 'Escape') setEditandoAlumno(null); }}
                                                style={{ ...fieldStyle, fontSize: 13, padding: '6px 10px', flex: '1 1 100px' }} />
                                            <button onClick={() => guardarEdicionAlumno(s.id)} disabled={guardandoEdicion} title="Guardar"
                                                style={{ background: C.green, border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</button>
                                            <button onClick={() => setEditandoAlumno(null)} title="Cancelar"
                                                style={{ background: '#eee', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#555', fontSize: 13, fontWeight: 800 }}>✕</button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: 14, fontWeight: 700, color: THEME.heading }}>
                                            {s.nombre}{s.apellido ? ` ${s.apellido}` : ''}
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: 12, color: THEME.subtext, fontWeight: 600 }}>#{s.id}</span>
                                {editandoAlumno !== s.id && (
                                    <button onClick={() => iniciarEdicionAlumno(s)} title="Editar nombre"
                                        style={{ background: 'none', border: `1.5px solid rgba(0,0,0,0.12)`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: THEME.subtext, fontFamily: 'Nunito', fontWeight: 700, whiteSpace: 'nowrap' }}>Editar</button>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </>
    );
}
