import { useState } from 'react';
import { C } from '../constants/colors';
import { loginDocente, loginAlumno, getMe, setAuth } from '../api';

export default function Login({ onLoginSuccess }) {
    const [role, setRole] = useState('docente');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [classCode, setClassCode] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // 1. Obtener token
            const { access_token } = role === 'docente'
                ? await loginDocente(email, password)
                : await loginAlumno(classCode, name, password);

            // 2. Obtener datos del usuario
            localStorage.setItem('token', access_token);
            const user = await getMe();

            // 3. Guardar sesión completa y notificar al App
            setAuth(access_token, user);
            onLoginSuccess(user);
        } catch (err) {
            setError(err.message || 'Credenciales incorrectas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', fontFamily: 'Nunito, system-ui, sans-serif', background: C.cream }}>

            {/* Panel izquierdo: formulario */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', boxSizing: 'border-box' }}>
                <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: C.green, marginBottom: '8px' }}>¡Hola de nuevo!</h2>
                    <p style={{ color: C.gray, marginBottom: '32px' }}>Ingresá tus datos para acceder a LecturIA</p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Selector de rol */}
                        <div style={{ display: 'flex', background: C.lightGray, padding: '4px', borderRadius: '12px' }}>
                            {['docente', 'estudiante'].map((r) => (
                                <button key={r} type="button"
                                    onClick={() => { setRole(r); setError(''); setEmail(''); setName(''); setClassCode(''); }}
                                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s', background: role === r ? '#fff' : 'transparent', color: role === r ? C.darkText : C.gray, boxShadow: role === r ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                                    {r === 'docente' ? 'Docente' : 'Estudiante'}
                                </button>
                            ))}
                        </div>

                        {/* Campos del docente */}
                        {role === 'docente' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>Correo electrónico</label>
                                <input type="email" placeholder="ejemplo@lecturia.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                            </div>
                        )}

                        {/* Campos del estudiante */}
                        {role === 'estudiante' && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={labelStyle}>Nombre completo</label>
                                    <input type="text" placeholder="Ej. Sofía Torres" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={labelStyle}>Código de clase</label>
                                    <input type="text" placeholder="Ej. ABCD-2345" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} required style={inputStyle} />
                                </div>
                            </>
                        )}

                        {/* Contraseña */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Contraseña</label>
                            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: C.red }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Botón */}
                        <button type="submit" disabled={loading}
                            style={{ background: loading ? C.gray : C.blue, color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: loading ? 'default' : 'pointer', marginTop: '10px', transition: 'background 0.2s', boxShadow: loading ? 'none' : '0 4px 12px rgba(74,144,226,0.25)' }}>
                            {loading ? 'Ingresando…' : 'Iniciar Sesión'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Panel derecho: logo */}
            <div style={{ flex: 1.05, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.cream, padding: '40px', minWidth: 0, borderLeft: `1px solid ${C.lightGray}` }}>
                <img src="/uploads/LOGO-ed452e35.png" alt="LecturIA" style={{ maxWidth: '75%', maxHeight: '70%', objectFit: 'contain' }} />
                <p style={{ position: 'absolute', bottom: '8%', left: 0, right: 0, textAlign: 'center', fontWeight: 800, color: C.green, fontSize: '24px' }}>
                    Aprender a leer, para aprender leyendo
                </p>
            </div>
        </div>
    );
}

const inputStyle = { padding: '12px 16px', borderRadius: '12px', border: '1px solid #CBD5E0', fontSize: '15px', outline: 'none', fontFamily: 'Nunito, sans-serif', width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontWeight: '700', color: '#2D3748', fontSize: '14px' };