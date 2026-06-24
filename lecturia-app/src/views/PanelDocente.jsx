import { useState, useEffect } from 'react';
import { C } from '../constants/colors';
import {
    listarAlumnos, listarMisActividades, getResumenIA,
    getResumenGrupal, eliminarActividad, eliminarTexto,
} from '../api';

import Sidebar from '../components/docente/layout/Sidebar';
import MiClaseContent from '../components/docente/clase/MiClaseContent';
import ActividadesContent from '../components/docente/actividades/ActividadesContent';
import CreateModal from '../components/docente/actividades/CreateModal';
import { PreguntasModal, ResultadosModal } from '../components/docente/actividades/Modales';
import ProgresoContent from '../components/docente/progreso/ProgresoContent';
import Toast from '../components/shared/Toast';

const SECTION_META = {
    clase: { sub: 'Gestión de alumnos' },
    actividades: { sub: '' },
    progreso: { sub: 'Resumen de desempeño' },
};

const THEME = {
    topbar: { bg: '#fff', border: 'rgba(0,0,0,0.06)' },
    main: { bg: '#fff' },
    heading: C.dark,
    subtext: '#666',
};

export default function PanelDocente({ user: userProp, onLogout }) {
    const [user, setUser] = useState(userProp);
    const [activeNav, setActiveNav] = useState('clase');
    const [collapsed, setCollapsed] = useState(false);
    const [modal, setModal] = useState(null);
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

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

    const recargarAlumnos = () => {
        setLoadingStudents(true);
        listarAlumnos().then(setStudents).catch(() => {}).finally(() => setLoadingStudents(false));
    };

    useEffect(() => { recargarAlumnos(); }, []);

    useEffect(() => {
        listarMisActividades().then(setActs).catch(() => {}).finally(() => setLoadingActs(false));
    }, []);

    const recargarResumenIA = () => {
        setResumen('');
        setLoadingResumen(true);
        getResumenIA().then(d => setResumen(d.resumen || '')).catch(() => {}).finally(() => setLoadingResumen(false));
    };

    useEffect(() => {
        if (activeNav !== 'progreso') return;
        if (resumen) return;
        recargarResumenIA();
    }, [activeNav]);

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
            setModal(null);
            showToast('Actividad eliminada correctamente');
        } catch {
            showToast('No se pudo eliminar la actividad');
        }
    };

    const handleEliminarTexto = async (textoId) => {
        if (!window.confirm('¿Eliminás este texto? Esta acción no se puede deshacer.')) return;
        try {
            await eliminarTexto(textoId);
            setActs(prev => prev.filter(a => a.texto_id !== textoId));
            showToast('Texto eliminado correctamente');
        } catch (err) {
            showToast(err.message || 'No se pudo eliminar el texto');
        }
    };

    const handlePublish = (data) => {
        setModal(null);
        showToast(`"${data.titulo}" publicada correctamente`);
        setResumen('');
        listarMisActividades().then(setActs).catch(() => {});
    };

    const { sub } = SECTION_META[activeNav] || SECTION_META.clase;

    const renderContent = () => {
        if (activeNav === 'actividades')
            return (
                <ActividadesContent
                    acts={acts} loading={loadingActs}
                    onOpenModal={() => setModal({ tipo: 'nueva' })}
                    onVerPreguntas={(id, titulo) => setPreguntasModal({ actividad_id: id, titulo })}
                    onVerResultados={(id, titulo) => setResultadosModal({ actividad_id: id, titulo })}
                    onEliminar={handleEliminar}
                    onRetomar={(id, titulo) => setModal({ tipo: 'retomar', actividad_id: id, titulo })}
                    onGenerarDesdeTexto={(textoId, titulo) => setModal({ tipo: 'desdeTexto', texto_id: textoId, titulo })}
                    onEliminarTexto={handleEliminarTexto}
                />
            );
        if (activeNav === 'clase')
            return (
                <MiClaseContent
                    students={students} loadingStudents={loadingStudents}
                    codigoClase={user?.codigo_clase}
                    onAlumnoCreado={() => { recargarAlumnos(); showToast('Alumno creado correctamente'); }}
                    onAlumnoEditado={() => { recargarAlumnos(); showToast('Nombre actualizado'); }}
                />
            );
        return (
            <ProgresoContent
                students={students} loadingStudents={loadingStudents}
                resumen={resumen} loadingResumen={loadingResumen}
                progresoActs={progresoActs} loadingProgreso={loadingProgreso}
                onActualizarResumen={recargarResumenIA}
            />
        );
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: THEME.main.bg, fontFamily: 'Nunito' }}>
            <Sidebar
                active={activeNav} onNav={setActiveNav}
                collapsed={collapsed} user={user} onLogout={onLogout}
                onNombreDocenteEditado={(nombre) => { setUser(u => ({ ...u, nombre })); showToast('Nombre actualizado'); }}
            />

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

            {modal && (
                <CreateModal
                    onClose={() => setModal(null)}
                    onPublish={handlePublish}
                    onEliminar={handleEliminar}
                    actividadExistente={modal.tipo === 'retomar' ? modal : null}
                    textoExistente={modal.tipo === 'desdeTexto' ? modal : null}
                />
            )}
            {preguntasModal && <PreguntasModal actividad_id={preguntasModal.actividad_id} titulo={preguntasModal.titulo} onClose={() => setPreguntasModal(null)} />}
            {resultadosModal && <ResultadosModal actividad_id={resultadosModal.actividad_id} titulo={resultadosModal.titulo} onClose={() => setResultadosModal(null)} />}
            {toast && <Toast msg={toast} />}
        </div>
    );
}
