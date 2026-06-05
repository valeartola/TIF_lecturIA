import { useState, useEffect } from 'react';
import { C } from '../constants/colors';
import { listarTextosDisponibles, getTexto, proximaPregunta, registrarRespuesta } from '../api';

const OPT_COLORS = [C.blue, C.green, C.yellow, C.pink];
const OPT_LETTERS = ['A', 'B', 'C', 'D'];

const nivelLabel = (n) => ({ 'FÁCIL': 'Básico', 'MEDIA': 'Intermedio', 'DIFÍCIL': 'Avanzado' }[n] || n);
const nivelColor = (n) => ({ 'FÁCIL': C.green, 'MEDIA': C.yellow, 'DIFÍCIL': C.red }[n] || C.gray);

export default function Estudiante({ user, onLogout }) {
  // Pantalla: 'loading' | 'selecting' | 'reading' | 'done'
  const [screen, setScreen] = useState('loading');
  const [textos, setTextos] = useState([]);
  const [selectedTexto, setSelectedTexto] = useState(null); // {id, titulo, contenido, actividad_id}
  const [question, setQuestion] = useState(null);       // pregunta actual
  const [nivelActual, setNivelActual] = useState(null);
  const [lastAnswer, setLastAnswer] = useState(null);       // {es_correcta, opcion_elegida, opcion_correcta}
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Cargar textos disponibles
  useEffect(() => {
    listarTextosDisponibles()
      .then((data) => { setTextos(data); setScreen('selecting'); })
      .catch(() => { setError('No se pudieron cargar las actividades.'); setScreen('selecting'); });
  }, []);

  // 2. Seleccionar texto → cargar contenido + primera pregunta
  const selectTexto = async (textoMeta) => {
    setError('');
    setScreen('loading');
    try {
      const textoData = await getTexto(textoMeta.id);
      const proxima = await proximaPregunta(textoMeta.actividad_id);
      if (proxima.finalizada) {
        setScreen('done');
        return;
      }
      setSelectedTexto({ ...textoData, actividad_id: textoMeta.actividad_id });
      setQuestion(proxima.pregunta);
      setNivelActual(proxima.nivel_actual);
      setLastAnswer(null);
      setSelectedOpt(null);
      setAnswered(0);
      setCorrect(0);
      setScreen('reading');
    } catch (err) {
      setError(err.message || 'Error al cargar la actividad');
      setScreen('selecting');
    }
  };

  // 3. Enviar respuesta
  const submitAnswer = async () => {
    if (selectedOpt === null || submitting || lastAnswer) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await registrarRespuesta(question.id, selectedOpt);
      setLastAnswer(result);
      setAnswered((a) => a + 1);
      if (result.es_correcta) setCorrect((c) => c + 1);
    } catch (err) {
      setError(err.message || 'Error al enviar la respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Siguiente pregunta
  const nextQuestion = async () => {
    setError('');
    setLastAnswer(null);
    setSelectedOpt(null);
    try {
      const proxima = await proximaPregunta(selectedTexto.actividad_id);
      if (proxima.finalizada) {
        setScreen('done');
        return;
      }
      setQuestion(proxima.pregunta);
      setNivelActual(proxima.nivel_actual);
    } catch (err) {
      setError(err.message || 'Error al obtener la siguiente pregunta');
    }
  };

  // ── Pantalla de carga ────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nunito', background: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, border: `5px solid ${C.blue}22`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: '#888' }}>Cargando…</p>
        </div>
      </div>
    );
  }

  // ── Pantalla de selección de texto ──────────────────────────
  if (screen === 'selecting') {
    return (
      <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'Nunito' }}>
        {/* Topbar */}
        <div style={{ background: C.cream, borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0 32px', height: 62, display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/uploads/MiniLogo.png" alt="LecturIA" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
          <span style={{ fontWeight: 900, fontSize: 18, color: C.green }}>Lectur<span style={{ color: C.yellow }}>IA</span></span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#888' }}>Hola, {user?.nombre || 'Estudiante'} 👋</span>
          <div onClick={onLogout} title="Cerrar sesión" style={{ width: 36, height: 36, borderRadius: '50%', background: C.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff', cursor: 'pointer' }}>
            {user?.nombre?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.dark, marginBottom: 8 }}>Tus actividades</h1>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 32 }}>Elegí una lectura para empezar</p>

          {error && <div style={{ background: '#FEE', border: `1.5px solid ${C.red}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 20 }}>⚠️ {error}</div>}

          {textos.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <p style={{ fontSize: 16, fontWeight: 700 }}>Tu docente todavía no publicó ninguna actividad.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 16 }}>
            {textos.map((t, i) => {
              const colors = [C.blue, C.green, C.yellow, C.pink];
              const color = colors[i % colors.length];
              return (
                <button key={t.id} onClick={() => selectTexto(t)} style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: 'none', cursor: 'pointer', display: 'flex', overflow: 'hidden', textAlign: 'left', fontFamily: 'Nunito', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.07)'; }}>
                  <div style={{ width: 8, background: color, flexShrink: 0 }} />
                  <div style={{ padding: '20px 24px', flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: C.dark }}>{t.titulo}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4, fontWeight: 600 }}>📝 {t.palabras?.toLocaleString()} palabras</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', color: color, fontSize: 22 }}>→</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla de resultado ────────────────────────────────────
  if (screen === 'done') {
    const pct = answered > 0 ? Math.round(correct / answered * 100) : 0;
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nunito', background: '#fff', gap: 24, padding: 32 }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
          {pct >= 70 ? '🏆' : pct >= 50 ? '⭐' : '💪'}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.dark, textAlign: 'center' }}>¡Actividad completada!</h1>
        <div style={{ background: C.blue, borderRadius: 20, padding: '24px 40px', textAlign: 'center', boxShadow: `0 8px 28px ${C.blue}44` }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginBottom: 4 }}>Tu resultado</p>
          <p style={{ fontSize: 42, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{pct}%</p>
          <p style={{ fontSize: 14, color: C.yellow, fontWeight: 800, marginTop: 6 }}>
            {correct} de {answered} correctas
          </p>
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red, textAlign: 'center' }}>
          {pct >= 70 ? '¡Excelente trabajo! Seguí así.' : pct >= 50 ? '¡Muy bien! Podés mejorar aún más.' : '¡No te rindas! La práctica hace al maestro.'}
        </p>
        <button onClick={() => { setSelectedTexto(null); setScreen('selecting'); }} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 14, padding: '14px 32px', fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: 'Nunito' }}>
          Volver a las actividades
        </button>
      </div>
    );
  }

  // ── Pantalla de lectura + quiz ───────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Nunito', background: '#fff' }}>

      {/* Topbar */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0 28px', height: 62, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, background: C.cream }}>
        <img src="/uploads/MiniLogo.png" alt="LecturIA" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
        <span style={{ fontWeight: 900, fontSize: 18, color: C.green }}>Lectur<span style={{ color: C.yellow }}>IA</span></span>
        <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.1)', margin: '0 6px' }} />
        <span style={{ fontSize: 13, color: '#888', fontWeight: 700 }}>Actividad de lectura</span>
        {nivelActual && (
          <span style={{ background: nivelColor(nivelActual) + '22', color: nivelColor(nivelActual), fontSize: 11.5, fontWeight: 800, borderRadius: 20, padding: '3px 12px' }}>
            Nivel: {nivelLabel(nivelActual)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ background: C.cream, borderRadius: 20, padding: '6px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.dark }}>{correct}/{answered}</span>
          <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>correctas</span>
        </div>
        <div onClick={onLogout} title="Cerrar sesión" style={{ width: 36, height: 36, borderRadius: '50%', background: C.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff', cursor: 'pointer' }}>
          {user?.nombre?.[0]?.toUpperCase() || 'A'}
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Panel izquierdo: texto */}
        <div style={{ flex: 1.1, overflowY: 'auto', padding: '28px 36px', background: '#fff', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ background: C.green, borderRadius: 20, padding: '24px 28px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -16, bottom: -16, fontSize: 88, opacity: 0.1 }}>📖</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📖</div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{selectedTexto?.titulo}</h1>
            </div>
          </div>

          <div style={{ border: '2px solid rgba(53,78,171,0.18)', borderRadius: 16, padding: '24px 28px', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            {selectedTexto?.contenido?.split('\n').filter(Boolean).map((p, i) => (
              <p key={i} style={{ fontSize: 15, lineHeight: 1.85, color: '#3a3a3a', fontWeight: 500, marginBottom: 16 }}>{p}</p>
            ))}
          </div>
        </div>

        {/* Panel derecho: pregunta */}
        <div style={{ width: 448, display: 'flex', flexDirection: 'column', background: '#fafafa', flexShrink: 0 }}>

          {/* Header pregunta */}
          <div style={{ background: OPT_COLORS[answered % OPT_COLORS.length], padding: '20px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -12, bottom: -12, fontSize: 64, opacity: 0.12 }}>❓</div>
            <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '3px 12px', display: 'inline-block', marginBottom: 10 }}>
              Pregunta {answered + 1}
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.45 }}>{question?.enunciado}</h2>
          </div>

          {/* Opciones */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {question?.opciones?.map((opt, oi) => {
              const col = OPT_COLORS[oi];
              let bg = '#fff', border = `2.5px solid ${col}44`, textColor = C.dark;

              if (lastAnswer) {
                if (oi === lastAnswer.opcion_correcta) { bg = C.green; border = `2.5px solid ${C.green}`; textColor = '#fff'; }
                else if (oi === lastAnswer.opcion_elegida && !lastAnswer.es_correcta) { bg = C.red; border = `2.5px solid ${C.red}`; textColor = '#fff'; }
                else { bg = '#f5f5f5'; border = '2.5px solid transparent'; }
              } else if (selectedOpt === oi) {
                bg = col; border = `2.5px solid ${col}`; textColor = '#fff';
              }

              return (
                <button key={oi} onClick={() => !lastAnswer && setSelectedOpt(oi)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: bg, border, cursor: lastAnswer ? 'default' : 'pointer', boxShadow: selectedOpt === oi && !lastAnswer ? `0 4px 14px ${col}44` : '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.15s', fontFamily: 'Nunito', textAlign: 'left', width: '100%' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: lastAnswer ? 'rgba(255,255,255,0.25)' : (selectedOpt === oi ? 'rgba(255,255,255,0.25)' : col), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900 }}>
                    {lastAnswer && oi === lastAnswer.opcion_correcta ? '✓' : lastAnswer && oi === lastAnswer.opcion_elegida && !lastAnswer.es_correcta ? '✗' : OPT_LETTERS[oi]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: textColor, lineHeight: 1.35 }}>{opt}</span>
                </button>
              );
            })}

            {/* Feedback */}
            {lastAnswer && (
              <div style={{ marginTop: 8, padding: '12px 16px', borderRadius: 12, background: lastAnswer.es_correcta ? C.green + '18' : C.red + '12', border: `1.5px solid ${lastAnswer.es_correcta ? C.green : C.red}` }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: lastAnswer.es_correcta ? C.green : C.red, lineHeight: 1.4 }}>
                  {lastAnswer.es_correcta ? '🎉 ¡Correcto! Muy bien.' : `❌ La respuesta correcta era la opción ${OPT_LETTERS[lastAnswer.opcion_correcta]}`}
                </p>
              </div>
            )}

            {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEE', border: `1.5px solid ${C.red}`, fontSize: 13, fontWeight: 700, color: C.red }}>⚠️ {error}</div>}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 22px', borderTop: '1px solid rgba(0,0,0,0.07)', background: '#fff', flexShrink: 0 }}>
            {!lastAnswer
              ? <button onClick={submitAnswer} disabled={selectedOpt === null || submitting}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: selectedOpt !== null ? C.green : '#e8e8e8', color: selectedOpt !== null ? '#fff' : '#aaa', fontSize: 15, fontWeight: 900, cursor: selectedOpt !== null ? 'pointer' : 'default', fontFamily: 'Nunito', transition: 'all 0.2s', boxShadow: selectedOpt !== null ? `0 4px 18px ${C.green}55` : 'none' }}>
                {submitting ? 'Enviando…' : selectedOpt !== null ? '✓ Confirmar respuesta' : 'Seleccioná una opción'}
              </button>
              : <button onClick={nextQuestion}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: C.blue, color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'Nunito', boxShadow: `0 4px 18px ${C.blue}44` }}>
                Siguiente pregunta
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
