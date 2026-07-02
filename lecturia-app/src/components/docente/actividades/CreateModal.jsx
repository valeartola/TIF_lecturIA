import { useState, useRef, useEffect } from 'react';
import { C } from '../../../constants/colors';
import {
    subirTexto, generarActividad, validarPregunta, publicarActividad,
    getActividad, editarPregunta, generarMasPreguntas, crearPreguntaManual,
} from '../../../api';

const THEME = { subtext: '#666', heading: C.dark };

const btnSecondary = { padding: '12px 22px', borderRadius: 12, border: '2px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13.5, fontWeight: 800, color: '#888', cursor: 'pointer', fontFamily: 'Nunito' };
const btnPrimary = { padding: '12px 24px', borderRadius: 12, border: 'none', fontSize: 13.5, fontWeight: 800, color: '#fff', fontFamily: 'Nunito' };

export default function CreateModal({ onClose, onPublish, onEliminar, actividadExistente, textoExistente }) {
    const esRetomar = !!actividadExistente;
    const esDesdeTexto = !!textoExistente;
    const [step, setStep] = useState(esRetomar ? 4 : esDesdeTexto ? 3 : 1);
    const [file, setFile] = useState(null);
    const [editandoIdx, setEditandoIdx] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [fileName, setFileName] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [title, setTitle] = useState(actividadExistente?.titulo || textoExistente?.titulo || '');
    const [textoId, setTextoId] = useState(textoExistente?.texto_id || null);
    const [actividadId, setActividadId] = useState(actividadExistente?.actividad_id || null);
    const [questions, setQuestions] = useState([]);
    const [apiError, setApiError] = useState('');
    const [loadingExistente, setLoadingExistente] = useState(esRetomar);
    const [generandoMas, setGenerandoMas] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const [savingManual, setSavingManual] = useState(false);
    const [manualForm, setManualForm] = useState({ enunciado: '', opciones: ['', '', '', ''], opcion_correcta: 0, tipo: 'comprensión literal', dificultad: 'FÁCIL' });
    const inputRef = useRef(null);

    useEffect(() => {
        if (!esRetomar) return;
        getActividad(actividadExistente.actividad_id)
            .then(actData => {
                const allQ = Object.entries(actData.preguntas_por_nivel).flatMap(([nivel, pregs]) =>
                    pregs.map((p) => ({ id: p.id, pregunta: p.enunciado, opciones: p.opciones, correcta: p.opcion_correcta, tipo: p.tipo, nivel, aprobada: !!p.validada }))
                );
                setQuestions(allQ);
            })
            .catch(err => setApiError(err.message || 'No se pudieron cargar las preguntas de esta actividad'))
            .finally(() => setLoadingExistente(false));
    }, [esRetomar]);

    useEffect(() => {
        if (!esDesdeTexto) return;
        setApiError('');
        generarActividad(textoExistente.texto_id)
            .then(actData => {
                setActividadId(actData.id);
                const allQ = Object.entries(actData.preguntas_por_nivel).flatMap(([nivel, pregs]) =>
                    pregs.map((p) => ({ ...p, nivel, aprobada: false }))
                );
                setQuestions(allQ);
                setStep(4);
            })
            .catch(err => {
                setApiError(err.message || 'Error al generar la actividad');
                setStep(4);
            });
    }, [esDesdeTexto]);

    const handleGenerarMas = async () => {
        setApiError('');
        setGenerandoMas(true);
        try {
            const actData = await generarMasPreguntas(actividadId);
            const nuevasQ = Object.entries(actData.preguntas_por_nivel).flatMap(([nivel, pregs]) =>
                pregs.map((p) => ({ ...p, nivel, aprobada: false }))
            );
            setQuestions(prev => [...prev, ...nuevasQ]);
        } catch (err) {
            setApiError(err.message || 'No se pudieron generar más preguntas');
        } finally {
            setGenerandoMas(false);
        }
    };

    const handleCrearManual = async () => {
        setApiError('');
        setSavingManual(true);
        try {
            const nueva = await crearPreguntaManual(actividadId, {
                enunciado: manualForm.enunciado,
                opciones: manualForm.opciones,
                opcion_correcta: manualForm.opcion_correcta,
                tipo: manualForm.tipo,
                dificultad: manualForm.dificultad,
            });
            setQuestions(prev => [...prev, { ...nueva, nivel: nueva.dificultad, aprobada: false }]);
            setManualForm({ enunciado: '', opciones: ['', '', '', ''], opcion_correcta: 0, tipo: 'comprensión literal', dificultad: 'FÁCIL' });
            setShowManualForm(false);
        } catch (err) {
            setApiError(err.message || 'No se pudo crear la pregunta');
        } finally {
            setSavingManual(false);
        }
    };

    const pickFile = (f) => {
        if (!f) return;
        setFile(f);
        setFileName(f.name);
        if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
        setStep(2);
    };

    const startGenerate = async () => {
        setApiError('');
        setStep(3);
        try {
            const textoData = await subirTexto(title, file);
            setTextoId(textoData.id);
            const actData = await generarActividad(textoData.id);
            setActividadId(actData.id);
            const allQ = Object.entries(actData.preguntas_por_nivel).flatMap(([nivel, pregs]) =>
                pregs.map((p) => ({ ...p, nivel, aprobada: false }))
            );
            setQuestions(allQ);
            setStep(4);
        } catch (err) {
            setApiError(err.message || 'Error al generar la actividad');
            setStep(2);
        }
    };

    const handlePublish = async () => {
        setApiError('');
        try {
            const aprobadas = questions.filter((q) => q.aprobada);
            for (const q of aprobadas) await validarPregunta(q.id);
            await publicarActividad(actividadId);
            onPublish({ titulo: title, actividad_id: actividadId });
        } catch (err) {
            setApiError(err.message || 'Error al publicar');
        }
    };

    const toggleAprobada = (idx) =>
        setQuestions((qs) => qs.map((q, i) => i === idx ? { ...q, aprobada: !q.aprobada } : q));

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, animation: 'fadeIn 0.2s' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: step === 4 ? 780 : 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'pop 0.25s ease' }}>

                {/* Header */}
                <div style={{ background: C.blue, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{esRetomar ? '📝' : '✨'}</div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{esRetomar ? 'Retomar actividad' : 'Crear actividad'}</h2>
                        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                            {esRetomar && (loadingExistente ? 'Cargando preguntas…' : `${title}`)}
                            {!esRetomar && step === 1 && 'Paso 1 de 3 — Subí el texto'}
                            {!esRetomar && step === 2 && 'Paso 2 de 3 — Configurá la actividad'}
                            {!esRetomar && step === 3 && 'Generando preguntas con IA…'}
                            {!esRetomar && step === 4 && 'Paso 3 de 3 — Revisá y publicá'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 18, fontWeight: 900 }}>×</button>
                </div>

                {!esRetomar && !esDesdeTexto && (
                    <div style={{ display: 'flex', gap: 6, padding: '14px 26px 0', flexShrink: 0 }}>
                        {[1, 2, 3].map((n) => {
                            const reached = n === 1 || (n === 2 && step >= 2) || (n === 3 && step >= 3);
                            return <div key={n} style={{ flex: 1, height: 5, borderRadius: 4, background: reached ? C.green : 'rgba(0,0,0,0.08)', transition: 'background 0.3s' }} />;
                        })}
                    </div>
                )}

                {/* Body */}
                <div style={{ padding: '24px 26px', overflowY: 'auto', flex: 1 }}>
                    {apiError && (
                        <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 16 }}>
                            ⚠️ {apiError}
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
                                onClick={() => inputRef.current?.click()}
                                style={{ border: `2.5px dashed ${dragOver ? C.green : C.blue + '55'}`, borderRadius: 16, background: dragOver ? C.green + '0d' : 'rgba(53,78,171,0.03)', padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.18s' }}>
                                <div style={{ width: 72, height: 72, borderRadius: 20, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 16px' }}>📄</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: C.dark }}>Arrastrá tu PDF aquí</div>
                                <div style={{ fontSize: 13, color: '#888', fontWeight: 600, marginTop: 5 }}>o hacé clic para seleccionar un archivo</div>
                                <div style={{ fontSize: 11.5, color: '#aaa', fontWeight: 600, marginTop: 14 }}>Formato: PDF · Máx. 10 MB</div>
                                <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files[0])} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 18, alignItems: 'center', background: C.yellow + '18', borderRadius: 12, padding: '12px 16px' }}>
                                <span style={{ fontSize: 22 }}>💡</span>
                                <p style={{ fontSize: 12.5, color: '#7a5d00', fontWeight: 700, lineHeight: 1.4 }}>La IA leerá el texto del PDF y generará preguntas de comprensión lectora de selección múltiple de forma automática.</p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.green + '12', border: `1.5px solid ${C.green}`, borderRadius: 12, padding: '12px 16px' }}>
                                <span style={{ fontSize: 24 }}>✅</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13.5, fontWeight: 800, color: C.dark }}>{fileName}</div>
                                    <div style={{ fontSize: 11.5, color: C.green, fontWeight: 700 }}>Archivo listo</div>
                                </div>
                                <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: C.blue, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito' }}>Cambiar</button>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 800, color: C.dark, display: 'block', marginBottom: 7 }}>Título de la actividad</label>
                                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. La Tortuga y la Liebre"
                                    style={{ width: '100%', border: '2px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, color: C.dark, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ padding: '32px 0', textAlign: 'center' }}>
                            <div style={{ width: 80, height: 80, margin: '0 auto 24px', position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: 0, border: `5px solid ${C.blue}1a`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>✨</div>
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 900, color: C.dark }}>Analizando el texto…</h3>
                            <p style={{ fontSize: 13.5, color: '#888', fontWeight: 600, marginTop: 6 }}>Subiendo el PDF y generando preguntas con IA</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '26px auto 0' }}>
                                {['Extrayendo el contenido del PDF', 'Identificando ideas principales', 'Redactando preguntas y opciones'].map((s, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 700, color: '#666', opacity: 0, animation: `fadeIn 0.4s ease ${i * 0.7}s forwards` }}>
                                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>✓</span>
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            {esRetomar && loadingExistente && (
                                <div style={{ padding: '32px 0', textAlign: 'center', color: THEME.subtext }}>Cargando preguntas de esta actividad…</div>
                            )}
                            {(!esRetomar || !loadingExistente) && !apiError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.green + '12', border: `1.5px solid ${C.green}`, borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
                                    <span style={{ fontSize: 24 }}>{esRetomar ? '📝' : '🎉'}</span>
                                    <div>
                                        <p style={{ fontSize: 13.5, fontWeight: 800, color: C.dark }}>
                                            {esRetomar
                                                ? `Esta actividad tiene ${questions.length} pregunta${questions.length === 1 ? '' : 's'} generada${questions.length === 1 ? '' : 's'}. Revisá, editá, aprobá o generá más.`
                                                : `¡Se generaron ${questions.length} preguntas! Revisá, editá y aprobá las que querés publicar.`}
                                        </p>
                                        <p style={{ fontSize: 12, color: THEME.subtext, marginTop: 2 }}>Se necesitan al menos 2 aprobadas por nivel (Fácil / Media / Difícil) para publicar.</p>
                                    </div>
                                </div>
                            )}
                            {(!esRetomar || !loadingExistente) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {questions.map((q, i) => {
                                        const isEditing = editandoIdx === i;
                                        return (
                                            <div key={i} style={{ border: `2px solid ${isEditing ? C.blue : q.aprobada ? C.green : 'rgba(0,0,0,0.08)'}`, borderRadius: 14, padding: '14px 16px', background: isEditing ? C.blueLight : q.aprobada ? C.green + '08' : '#fff', transition: 'all 0.15s' }}>
                                                {!isEditing && (
                                                    <>
                                                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                                                            <span style={{ width: 26, height: 26, borderRadius: 8, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.subtext, marginBottom: 4 }}>{q.nivel} · {q.tipo}</div>
                                                                <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>{q.pregunta}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                                <button onClick={() => { setEditandoIdx(i); setEditForm({ enunciado: q.pregunta, opciones: [...q.opciones], opcion_correcta: q.correcta, tipo: q.tipo, dificultad: q.nivel }); }}
                                                                    style={{ background: 'rgba(0,0,0,0.06)', color: '#666', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito' }}>
                                                                    Editar
                                                                </button>
                                                                <button onClick={() => toggleAprobada(i)} style={{ background: q.aprobada ? C.green : 'rgba(0,0,0,0.06)', color: q.aprobada ? '#fff' : '#888', border: 'none', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito', whiteSpace: 'nowrap' }}>
                                                                    {q.aprobada ? '✓ Aprobada' : 'Aprobar'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingLeft: 36 }}>
                                                            {q.opciones.map((opt, oi) => (
                                                                <div key={oi} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, background: oi === q.correcta ? C.green + '15' : 'rgba(0,0,0,0.04)', color: oi === q.correcta ? C.green : '#666', fontWeight: oi === q.correcta ? 800 : 600, border: `1.5px solid ${oi === q.correcta ? C.green + '44' : 'transparent'}` }}>
                                                                    {['A', 'B', 'C', 'D'][oi]}. {opt}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                                {isEditing && editForm && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                            <span style={{ width: 26, height: 26, borderRadius: 8, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                                                            <span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>Editando pregunta</span>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, display: 'block', marginBottom: 5 }}>ENUNCIADO</label>
                                                            <textarea value={editForm.enunciado} onChange={e => setEditForm(f => ({ ...f, enunciado: e.target.value }))} rows={3}
                                                                style={{ width: '100%', border: `2px solid ${C.blue}44`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontFamily: 'Nunito', fontWeight: 600, color: C.dark, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, display: 'block', marginBottom: 8 }}>OPCIONES · Hacé clic en el círculo para marcar la correcta</label>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                {editForm.opciones.map((opt, oi) => (
                                                                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                        <button onClick={() => setEditForm(f => ({ ...f, opcion_correcta: oi }))}
                                                                            style={{ width: 22, height: 22, borderRadius: '50%', border: `2.5px solid ${editForm.opcion_correcta === oi ? C.green : 'rgba(0,0,0,0.15)'}`, background: editForm.opcion_correcta === oi ? C.green : '#fff', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            {editForm.opcion_correcta === oi && <span style={{ fontSize: 12, color: '#fff', fontWeight: 900 }}>✓</span>}
                                                                        </button>
                                                                        <span style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, flexShrink: 0 }}>{['A', 'B', 'C', 'D'][oi]}.</span>
                                                                        <input value={opt} onChange={e => setEditForm(f => { const ops = [...f.opciones]; ops[oi] = e.target.value; return { ...f, opciones: ops }; })}
                                                                            style={{ flex: 1, border: `1.5px solid ${editForm.opcion_correcta === oi ? C.green + '66' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'Nunito', fontWeight: 600, color: C.dark, outline: 'none', background: editForm.opcion_correcta === oi ? C.green + '08' : '#fff' }} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                            <div>
                                                                <label style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, display: 'block', marginBottom: 5 }}>TIPO</label>
                                                                <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                                                                    style={{ width: '100%', border: `2px solid rgba(0,0,0,0.1)`, borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'Nunito', fontWeight: 700, color: C.dark, outline: 'none', background: '#fff' }}>
                                                                    {['comprensión literal', 'inferencial', 'vocabulario', 'idea principal', 'secuencia', 'causa y efecto'].map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 12, fontWeight: 800, color: THEME.subtext, display: 'block', marginBottom: 5 }}>DIFICULTAD</label>
                                                                <select value={editForm.dificultad} onChange={e => setEditForm(f => ({ ...f, dificultad: e.target.value }))}
                                                                    style={{ width: '100%', border: `2px solid rgba(0,0,0,0.1)`, borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'Nunito', fontWeight: 700, color: C.dark, outline: 'none', background: '#fff' }}>
                                                                    <option value="FÁCIL">Básico</option>
                                                                    <option value="MEDIA">Intermedio</option>
                                                                    <option value="DIFÍCIL">Avanzado</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                                                            <button onClick={() => { setEditandoIdx(null); setEditForm(null); }}
                                                                style={{ padding: '8px 18px', borderRadius: 10, border: '2px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 12.5, fontWeight: 800, color: '#888', cursor: 'pointer', fontFamily: 'Nunito' }}>
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                disabled={savingEdit || !editForm.enunciado.trim() || editForm.opciones.some(o => !o.trim())}
                                                                onClick={async () => {
                                                                    setSavingEdit(true);
                                                                    try {
                                                                        await editarPregunta(q.id, { enunciado: editForm.enunciado.trim(), opciones: editForm.opciones.map(o => o.trim()), opcion_correcta: editForm.opcion_correcta, tipo: editForm.tipo, dificultad: editForm.dificultad });
                                                                        setQuestions(prev => prev.map((pq, pi) => pi === i ? { ...pq, pregunta: editForm.enunciado.trim(), opciones: editForm.opciones.map(o => o.trim()), correcta: editForm.opcion_correcta, tipo: editForm.tipo, nivel: editForm.dificultad } : pq));
                                                                        setEditandoIdx(null); setEditForm(null);
                                                                    } catch (e) {
                                                                        alert('No se pudo guardar la edición. Intentá de nuevo.');
                                                                    } finally {
                                                                        setSavingEdit(false);
                                                                    }
                                                                }}
                                                                style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: savingEdit ? '#ccc' : C.blue, fontSize: 12.5, fontWeight: 800, color: '#fff', cursor: savingEdit ? 'default' : 'pointer', fontFamily: 'Nunito' }}>
                                                                {savingEdit ? 'Guardando…' : '✓ Guardar cambios'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {esRetomar && (
                                        <button onClick={handleGenerarMas} disabled={generandoMas}
                                            style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 12, border: `2px dashed ${C.blue}55`, background: generandoMas ? 'rgba(0,0,0,0.03)' : C.blueLight, fontSize: 13, fontWeight: 800, color: C.blue, cursor: generandoMas ? 'default' : 'pointer', fontFamily: 'Nunito' }}>
                                            {generandoMas ? '✨ Generando…' : '✨ Generar más preguntas'}
                                        </button>
                                    )}

                                    {/* Botón para agregar pregunta manual */}
                                    {actividadId && !showManualForm && (
                                        <button onClick={() => setShowManualForm(true)}
                                            style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 12, border: `2px dashed ${C.green}55`, background: C.green + '10', fontSize: 13, fontWeight: 800, color: C.green, cursor: 'pointer', fontFamily: 'Nunito' }}>
                                            ＋ Agregar pregunta manualmente
                                        </button>
                                    )}

                                    {/* Formulario de pregunta manual */}
                                    {showManualForm && (
                                        <div style={{ border: `2px solid ${C.green}44`, borderRadius: 14, padding: 18, background: C.green + '06', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <span style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>Nueva pregunta</span>

                                            <textarea value={manualForm.enunciado} onChange={e => setManualForm(f => ({ ...f, enunciado: e.target.value }))} rows={2}
                                                placeholder="Escribí el enunciado de la pregunta..."
                                                style={{ border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontFamily: 'Nunito', fontWeight: 600, color: C.dark, resize: 'vertical', outline: 'none' }} />

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {manualForm.opciones.map((opt, oi) => (
                                                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <button onClick={() => setManualForm(f => ({ ...f, opcion_correcta: oi }))}
                                                            style={{ width: 22, height: 22, borderRadius: '50%', border: `2.5px solid ${manualForm.opcion_correcta === oi ? C.green : 'rgba(0,0,0,0.15)'}`, background: manualForm.opcion_correcta === oi ? C.green : '#fff', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {manualForm.opcion_correcta === oi && <span style={{ fontSize: 12, color: '#fff', fontWeight: 900 }}>✓</span>}
                                                        </button>
                                                        <input value={opt} onChange={e => setManualForm(f => { const ops = [...f.opciones]; ops[oi] = e.target.value; return { ...f, opciones: ops }; })}
                                                            placeholder={`Opción ${oi + 1}`}
                                                            style={{ flex: 1, border: `1.5px solid ${manualForm.opcion_correcta === oi ? C.green + '66' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'Nunito', fontWeight: 600, color: C.dark, outline: 'none', background: manualForm.opcion_correcta === oi ? C.green + '08' : '#fff' }} />
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <select value={manualForm.tipo} onChange={e => setManualForm(f => ({ ...f, tipo: e.target.value }))}
                                                    style={{ flex: 1, border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, fontFamily: 'Nunito', fontWeight: 700, color: C.dark, outline: 'none' }}>
                                                    <option value="comprensión literal">Comprensión literal</option>
                                                    <option value="comprensión inferencial">Comprensión inferencial</option>
                                                    <option value="vocabulario en contexto">Vocabulario en contexto</option>
                                                    <option value="idea principal o global">Idea principal</option>
                                                    <option value="detalle específico">Detalle específico</option>
                                                    <option value="causa y efecto">Causa y efecto</option>
                                                </select>
                                                <select value={manualForm.dificultad} onChange={e => setManualForm(f => ({ ...f, dificultad: e.target.value }))}
                                                    style={{ flex: 1, border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, fontFamily: 'Nunito', fontWeight: 700, color: C.dark, outline: 'none' }}>
                                                    <option value="FÁCIL">Fácil</option>
                                                    <option value="MEDIA">Media</option>
                                                    <option value="DIFÍCIL">Difícil</option>
                                                </select>
                                            </div>

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => { setShowManualForm(false); setManualForm({ enunciado: '', opciones: ['', '', '', ''], opcion_correcta: 0, tipo: 'comprensión literal', dificultad: 'FÁCIL' }); }}
                                                    style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 12.5, fontWeight: 800, color: '#888', cursor: 'pointer', fontFamily: 'Nunito' }}>
                                                    Cancelar
                                                </button>
                                                <button onClick={handleCrearManual}
                                                    disabled={savingManual || !manualForm.enunciado.trim() || manualForm.opciones.some(o => !o.trim())}
                                                    style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: (!manualForm.enunciado.trim() || manualForm.opciones.some(o => !o.trim())) ? '#ccc' : C.green, fontSize: 12.5, fontWeight: 800, color: '#fff', cursor: (!manualForm.enunciado.trim() || manualForm.opciones.some(o => !o.trim())) ? 'default' : 'pointer', fontFamily: 'Nunito' }}>
                                                    {savingManual ? 'Guardando…' : '✓ Agregar pregunta'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step !== 3 && (
                    <div style={{ padding: '16px 26px', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 12, justifyContent: 'flex-end', flexShrink: 0 }}>
                        {step === 2 && (
                            <>
                                <button onClick={() => setStep(1)} style={btnSecondary}>← Atrás</button>
                                <button onClick={startGenerate} disabled={!title.trim() || !file} style={{ ...btnPrimary, background: title.trim() && file ? C.blue : '#ccc', cursor: title.trim() && file ? 'pointer' : 'default' }}>✨ Generar preguntas</button>
                            </>
                        )}
                        {step === 4 && (
                            <>
                                {esRetomar && <button onClick={() => onEliminar(actividadId)} style={{ ...btnSecondary, color: '#ff4d4f', borderColor: '#ff4d4f44' }}>🗑 Eliminar actividad</button>}
                                {!esRetomar && !esDesdeTexto && <button onClick={() => setStep(2)} style={btnSecondary}>← Atrás</button>}
                                {actividadId && (
                                    <button onClick={handlePublish} disabled={questions.filter(q => q.aprobada).length < 6}
                                        style={{ ...btnPrimary, background: questions.filter(q => q.aprobada).length >= 6 ? C.green : '#ccc', cursor: questions.filter(q => q.aprobada).length >= 6 ? 'pointer' : 'default' }}>
                                        ✓ Publicar actividad ({questions.filter(q => q.aprobada).length} aprobadas)
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}