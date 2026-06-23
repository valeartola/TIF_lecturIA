import { useState } from 'react';
import { C } from '../constants/colors';
import { loginDocente, loginAlumno, registrarDocente, getMe, setAuth } from '../api';

export default function Login({ onLoginSuccess }) {
    const [mode, setMode] = useState('login'); // 'login' | 'registro' | 'registro-ok'
    const [role, setRole] = useState('docente');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [classCode, setClassCode] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [codigoGenerado, setCodigoGenerado] = useState('');
    const [pendingUser, setPendingUser] = useState(null);

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

    const handleRegistro = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // 1. Crear la cuenta del docente
            await registrarDocente(name, email, password);

            // 2. El endpoint de registro no devuelve token, así que logueamos
            //    inmediatamente con las mismas credenciales para no pedírselas dos veces.
            const { access_token } = await loginDocente(email, password);
            localStorage.setItem('token', access_token);
            const user = await getMe();
            setAuth(access_token, user);

            // 3. Mostramos primero el código de clase generado, antes de entrar al panel
            setCodigoGenerado(user.codigo_clase || '');
            setPendingUser(user);
            setMode('registro-ok');
        } catch (err) {
            setError(err.message || 'No se pudo crear la cuenta');
        } finally {
            setLoading(false);
        }
    };

    const irAlPanel = () => {
        if (pendingUser) onLoginSuccess(pendingUser);
    };

    const cambiarModo = (nuevoModo) => {
        setMode(nuevoModo);
        setError('');
        setEmail('');
        setName('');
        setClassCode('');
        setPassword('');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', fontFamily: 'Nunito, system-ui, sans-serif', background: C.cream }}>

            {/* Panel izquierdo: formulario */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', boxSizing: 'border-box' }}>
                <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>

                    {mode === 'registro-ok' ? (
                        <>
                            <h2 style={{ fontSize: '32px', fontWeight: '900', color: C.green, marginBottom: '8px' }}>¡Cuenta creada!</h2>
                            <p style={{ color: C.gray, marginBottom: '24px' }}>Este es el código de tu clase. Compartilo con tus alumnos para que puedan ingresar.</p>

                            <div style={{ background: '#F0F7FF', border: `2px dashed ${C.blue}`, borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
                                <div style={{ fontSize: '28px', fontWeight: '900', color: C.blue, letterSpacing: '2px' }}>{codigoGenerado}</div>
                            </div>

                            <button type="button" onClick={irAlPanel}
                                style={{ background: C.blue, color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(74,144,226,0.25)' }}>
                                Ir a mi panel
                            </button>
                        </>
                    ) : mode === 'registro' ? (
                        <>
                            <h2 style={{ fontSize: '32px', fontWeight: '900', color: C.green, marginBottom: '8px' }}>Creá tu cuenta</h2>
                            <p style={{ color: C.gray, marginBottom: '32px' }}>Registrate como docente para empezar a usar LecturIA</p>

                            <form onSubmit={handleRegistro} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={labelStyle}>Nombre completo</label>
                                    <input type="text" placeholder="Ej. Marisa Gomez" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={labelStyle}>Correo electrónico</label>
                                    <input type="email" placeholder="ejemplo@lecturia.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={labelStyle}>Contraseña</label>
                                    <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
                                </div>

                                {error && (
                                    <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: C.red }}>
                                        ⚠️ {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading}
                                    style={{ background: loading ? C.gray : C.blue, color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: loading ? 'default' : 'pointer', marginTop: '10px', transition: 'background 0.2s', boxShadow: loading ? 'none' : '0 4px 12px rgba(74,144,226,0.25)' }}>
                                    {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                                </button>

                                <p style={{ textAlign: 'center', fontSize: '14px', color: C.gray, margin: 0 }}>
                                    ¿Ya tenés una cuenta?{' '}
                                    <button type="button" onClick={() => cambiarModo('login')} style={linkButtonStyle}>Iniciá sesión</button>
                                </p>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '32px', fontWeight: '900', color: C.green, marginBottom: '8px' }}>¡Bienvenido!</h2>
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
                                        <input type="email" placeholder="lecturia@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                                    </div>
                                )}

                                {/* Campos del estudiante */}
                                {role === 'estudiante' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={labelStyle}>Nombre completo</label>
                                            <input type="text" placeholder="Ej. Sofía" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
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

                                {/* Crear cuenta — solo para docentes */}
                                {role === 'docente' && (
                                    <p style={{ textAlign: 'center', fontSize: '14px', color: C.gray, margin: 0 }}>
                                        ¿Querés crear una cuenta?{' '}
                                        <button type="button" onClick={() => cambiarModo('registro')} style={linkButtonStyle}>Registrate acá</button>
                                    </p>
                                )}
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* Panel derecho: logo */}
            <div style={{ flex: 1.05, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.cream, padding: '40px', minWidth: 0, borderLeft: `1px solid ${C.lightGray}` }}>
                <img src="/uploads/LOGO-ed452e35.png" alt="LecturIA" style={{ maxWidth: '75%', maxHeight: '70%', objectFit: 'contain' }} />
                <p style={{ position: 'absolute', bottom: '15%', left: 0, right: 0, textAlign: 'center', fontWeight: 800, color: C.green, fontSize: '24px' }}>
                    Aprender a leer, para aprender leyendo
                </p>
            </div>
        </div>
    );
}

const inputStyle = { padding: '12px 16px', borderRadius: '12px', border: '1px solid #CBD5E0', fontSize: '15px', outline: 'none', fontFamily: 'Nunito, sans-serif', width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontWeight: '700', color: '#2D3748', fontSize: '14px' };
const linkButtonStyle = { background: 'none', border: 'none', padding: 0, color: C.blue, fontWeight: '800', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' };