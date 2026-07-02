/**
 * api.js — Cliente centralizado de LecturIA
 * Todas las llamadas al backend pasan por aquí.
 */

// ── Token / sesión ──────────────────────────────────────────
export const getToken = () => localStorage.getItem('token');
export const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');

export const setAuth = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// ── Fetch base con auth ──────────────────────────────────────
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(path, { ...options, headers });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const error = new Error(err.detail || 'Error desconocido');
        error.status = res.status;
        throw error;
    }
    return res.json();
}

// ── Auth ─────────────────────────────────────────────────────

/** Login docente: email + password */
export function loginDocente(email, password) {
    const body = new URLSearchParams({ username: email, password });
    return apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
}

/** Login alumno: código de clase + nombre + password */
export function loginAlumno(codigoClase, nombre, password) {
    const body = new URLSearchParams({
        username: `${codigoClase.trim()}/${nombre.trim()}`,
        password,
    });
    return apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
}

/** Registro de un nuevo docente: nombre + email + password. Devuelve los datos del docente, incluido su código de clase. */
export function registrarDocente(nombre, email, password) {
    return apiFetch('/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password }),
    });
}

/** Devuelve el usuario logueado según el JWT */
export const getMe = () => apiFetch('/auth/me');

/** Lista de alumnos de la clase del docente */
export const listarAlumnos = () => apiFetch('/auth/alumnos');

/** Crea un alumno (docente) */
export const crearAlumno = (nombre, apellido, password) =>
    apiFetch('/auth/alumnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, password }),
    });

// ── Textos ───────────────────────────────────────────────────

/** Textos del docente con estado de actividad */
export const listarMisActividades = () => apiFetch('/textos/mis-actividades');

/** Sube un PDF y crea el texto */
export function subirTexto(titulo, archivo) {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return apiFetch(`/textos/subir?titulo=${encodeURIComponent(titulo)}`, {
        method: 'POST',
        body: fd,
    });
}

/** Textos disponibles para el alumno (con actividad publicada) */
export const listarTextosDisponibles = () => apiFetch('/textos/disponibles');

/** Contenido completo de un texto */
export const getTexto = (textoId) => apiFetch(`/textos/${textoId}`);

// ── Actividades ──────────────────────────────────────────────

/** Elimina un texto sin actividad asociada (caso huérfano por generación fallida) */
export const eliminarTexto = (textoId) =>
    apiFetch(`/textos/${textoId}`, { method: 'DELETE' });

/** Genera actividad + preguntas con IA a partir de un texto */
export const generarActividad = (textoId) =>
    apiFetch(`/actividades/generar?texto_id=${textoId}`, { method: 'POST' });

/** Genera más preguntas sobre una actividad EXISTENTE que quedó en borrador */
export const generarMasPreguntas = (actividadId) =>
    apiFetch(`/actividades/${actividadId}/generar-mas`, { method: 'POST' });

/** Valida una pregunta individual (docente) */
export const validarPregunta = (preguntaId) =>
    apiFetch(`/actividades/preguntas/${preguntaId}/validar`, { method: 'PATCH' });

/** Publica la actividad completa (docente) */
export const publicarActividad = (actividadId) =>
    apiFetch(`/actividades/${actividadId}/validar`, { method: 'PATCH' });

/** Elimina una actividad y todas sus preguntas (docente) */
export const eliminarActividad = (actividadId) =>
    apiFetch(`/actividades/${actividadId}`, { method: 'DELETE' });

/** Siguiente pregunta adaptativa para el alumno */
export const proximaPregunta = (actividadId, nuevoIntento = false) =>
    apiFetch(`/actividades/${actividadId}/alumno/proxima${nuevoIntento ? '?nuevo_intento=true' : ''}`);

/** Estado de intentos del alumno para una actividad */
export const getEstadoIntentos = (actividadId) =>
    apiFetch(`/actividades/${actividadId}/alumno/intentos`);

/** Obtiene una actividad con sus preguntas (docente) */
export const getActividad = (actividadId) =>
    apiFetch(`/actividades/${actividadId}`);

/** Crea una pregunta manual en una actividad (docente) */
export const crearPreguntaManual = (actividadId, body) =>
    apiFetch(`/actividades/${actividadId}/preguntas/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

// ── Respuestas ───────────────────────────────────────────────

/** Registra la respuesta del alumno a una pregunta */
export const registrarRespuesta = (preguntaId, opcionElegida) =>
    apiFetch(`/respuestas/?pregunta_id=${preguntaId}&opcion_elegida=${opcionElegida}`, {
        method: 'POST',
    });

// ── Progreso ─────────────────────────────────────────────────

/** Resumen grupal de una actividad (docente) */
export const getResumenGrupal = (actividadId) =>
    apiFetch(`/progreso/resumen/actividad/${actividadId}`);

/** Resumen pedagógico generado con IA (docente) */
export const getResumenIA = () => apiFetch('/progreso/resumen-ia');

/** Progreso de un alumno en una actividad específica */
export const getProgresoAlumno = (alumnoId, actividadId) =>
    apiFetch(`/progreso/alumno/${alumnoId}/actividad/${actividadId}`);
/** Editar una pregunta (enunciado, opciones, correcta, tipo, dificultad) */
export const editarPregunta = (preguntaId, body) =>
    apiFetch(`/actividades/preguntas/${preguntaId}/editar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
// ── Edición de nombres ────────────────────────────────────────

/** Cambia el nombre y apellido de un alumno (solo docente) */
export const editarNombreAlumno = (alumnoId, nombre, apellido) =>
    apiFetch(`/auth/alumnos/${alumnoId}/nombre`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido }),
    });

/** Cambia el nombre del docente autenticado */
export const editarNombreDocente = (nombre) =>
    apiFetch('/auth/me/nombre', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
    });