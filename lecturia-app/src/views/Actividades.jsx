import { useState, useRef } from 'react';
import { C } from '../constants/colors';

const NAV = [
  { id:'inicio',      label:'Inicio',        icon:'🏠' },
  { id:'clase',       label:'Mi Clase',      icon:'👨‍🏫' },
  { id:'actividades', label:'Actividades',   icon:'📖' },
  { id:'progreso',    label:'Progreso',      icon:'📊' },
  { id:'alertas',     label:'Alertas',       icon:'🔔', badge:3 },
  { id:'config',      label:'Configuración', icon:'⚙️' },
];

// ── Activity cards palette (rotating) ──────────────────────────
const ACT_COLORS = [C.blue, C.green, C.yellow, C.pink, C.red];

const ACTIVITIES = [
  { id:1, title:'La Tortuga y la Liebre', level:'Intermedio', questions:5, assigned:28, completed:24, avg:78, icon:'🐢', date:'2 may 2026' },
  { id:2, title:'El Pequeño Príncipe',    level:'Avanzado',   questions:8, assigned:28, completed:21, avg:82, icon:'🌹', date:'28 abr 2026' },
  { id:3, title:'Caperucita Roja',        level:'Básico',     questions:4, assigned:28, completed:28, avg:68, icon:'🧺', date:'24 abr 2026' },
  { id:4, title:'El Mago de Oz',          level:'Avanzado',   questions:6, assigned:28, completed:18, avg:91, icon:'🦁', date:'20 abr 2026' },
  { id:5, title:'Las Fábulas de Esopo',   level:'Intermedio', questions:5, assigned:28, completed:26, avg:77, icon:'🦊', date:'15 abr 2026' },
];

const levelColor = (l) => ({ 'Avanzado':C.green, 'Intermedio':C.yellow, 'Básico':C.red }[l] || C.gray);
const levelBg    = (l) => ({ 'Avanzado':'#E8F5EB', 'Intermedio':'#FFF8E1', 'Básico':'#FEECEC' }[l] || '#eee');

// ══════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════
function Sidebar({ active, onNav, onLogout }) {
  return (
    <div style={{ width:230, minHeight:'100vh', background:C.cream, display:'flex', flexDirection:'column', flexShrink:0, position:'relative', zIndex:2, boxShadow:'2px 0 12px rgba(0,0,0,0.06)' }}>
      <div style={{ padding:'28px 24px 20px', display:'flex', alignItems:'center', gap:10 }}>
        <img src="uploads/MiniLogo.png" alt="LecturIA" style={{ width:44, height:44, objectFit:'contain', borderRadius:10, flexShrink:0 }} />
        <div>
          <div style={{ fontWeight:900, fontSize:17, letterSpacing:-0.3 }}>
            <span style={{ color:C.green }}>Lectur</span><span style={{ color:C.yellow }}>IA</span>
          </div>
          <div style={{ fontSize:10.5, color:'#888', fontWeight:600, marginTop:1 }}>para docentes</div>
        </div>
      </div>
      <nav style={{ flex:1, padding:'8px 0' }}>
        {NAV.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{
              display:'flex', alignItems:'center', gap:12, width:'100%', padding:'13px 20px',
              background: isActive ? 'rgba(53,78,171,0.08)' : 'transparent', border:'none',
              borderLeft: isActive ? `4px solid ${C.blue}` : '4px solid transparent',
              borderRadius:'0 12px 12px 0', cursor:'pointer', transition:'all 0.15s', position:'relative',
            }}>
              <span style={{ fontSize:18, lineHeight:1, flexShrink:0 }}>{item.icon}</span>
              <span style={{ fontSize:14, fontWeight: isActive?800:600, color: isActive?C.dark:'#888', fontFamily:'Nunito' }}>{item.label}</span>
              {item.badge && <span style={{ marginLeft:'auto', background:C.red, color:'#fff', fontSize:11, fontWeight:800, borderRadius:20, padding:'1px 7px' }}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div onClick={onLogout} title="Cerrar sesión" style={{ padding:'16px 20px', cursor:'pointer', borderTop:'1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:C.yellow, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:15, color:C.dark, flexShrink:0 }}>P</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:C.dark }}>Profa. García</div>
            <div style={{ fontSize:11, color:'#888' }}>3° Primaria B</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ACTIVITY CARD
// ══════════════════════════════════════════════════════════════
function ActivityCard({ act, color }) {
  const pct = Math.round((act.completed/act.assigned)*100);
  return (
    <div style={{ background:'#fff', borderRadius:18, boxShadow:'0 2px 14px rgba(0,0,0,0.07)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      {/* Colored top */}
      <div style={{ background:color, padding:'18px 20px', display:'flex', alignItems:'center', gap:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-8, bottom:-14, fontSize:64, opacity:0.18 }}>{act.icon}</div>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{act.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <h3 style={{ fontSize:16, fontWeight:900, color:'#fff', lineHeight:1.2, textWrap:'pretty' }}>{act.title}</h3>
          <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.85)', fontWeight:700, marginTop:3 }}>📅 {act.date}</div>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:13, flex:1 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ background:levelBg(act.level), color:levelColor(act.level), fontSize:11.5, fontWeight:800, borderRadius:20, padding:'3px 11px' }}>{act.level}</span>
          <span style={{ background:'rgba(0,0,0,0.05)', color:'#666', fontSize:11.5, fontWeight:800, borderRadius:20, padding:'3px 11px' }}>❓ {act.questions} preguntas</span>
        </div>
        {/* Completion */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:12, color:'#888', fontWeight:700 }}>Completado</span>
            <span style={{ fontSize:12, fontWeight:800, color:C.dark }}>{act.completed}/{act.assigned} alumnos</span>
          </div>
          <div style={{ height:8, borderRadius:8, background:'rgba(0,0,0,0.07)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:8 }} />
          </div>
        </div>
        {/* Average + actions */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:18 }}>⭐</span>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:levelColor(act.level), lineHeight:1 }}>{act.avg}%</div>
              <div style={{ fontSize:10, color:'#999', fontWeight:700 }}>promedio</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ background:'transparent', border:`2px solid ${C.blue}22`, borderRadius:10, padding:'7px 12px', fontSize:12, fontWeight:800, color:C.blue, cursor:'pointer', fontFamily:'Nunito' }}>Editar</button>
            <button style={{ background:C.blue, border:'none', borderRadius:10, padding:'7px 14px', fontSize:12, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'Nunito' }}>Ver resultados</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CREATE NEW ACTIVITY CARD (dashed)
// ══════════════════════════════════════════════════════════════
function NewActivityCard({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{
        background: hover ? 'rgba(53,78,171,0.04)' : '#fff',
        border:`2.5px dashed ${hover ? C.blue : C.blue+'55'}`, borderRadius:18, cursor:'pointer',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12,
        minHeight:280, transition:'all 0.18s', fontFamily:'Nunito',
        transform: hover ? 'translateY(-2px)':'none',
      }}>
      <div style={{ width:64, height:64, borderRadius:18, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, color:'#fff', boxShadow:`0 6px 18px ${C.blue}44` }}>+</div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:900, color:C.blue }}>Crear nueva actividad</div>
        <div style={{ fontSize:12.5, color:'#888', fontWeight:600, marginTop:4, maxWidth:200, lineHeight:1.4 }}>Sube un PDF y la IA generará las preguntas automáticamente</div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// CREATE MODAL (multi-step)
// ══════════════════════════════════════════════════════════════
const GENERATED_Q = [
  { text:'¿Quién es el personaje principal de la historia?', options:['El narrador','La protagonista','El antagonista','El maestro'], correct:1 },
  { text:'¿Dónde ocurre la mayor parte del relato?', options:['En la ciudad','En el bosque','En la escuela','En el mar'], correct:1 },
  { text:'¿Qué problema enfrenta el protagonista?', options:['Perderse en el camino','No tener amigos','Superar un reto difícil','Olvidar una tarea'], correct:2 },
  { text:'¿Cuál es la enseñanza principal del texto?', options:['La paciencia da frutos','Hay que ser veloz','No confiar en nadie','El dinero es lo más importante'], correct:0 },
  { text:'¿Cómo termina la historia?', options:['De forma triste','Con un final feliz','Sin resolverse','Con una sorpresa inesperada'], correct:1 },
];

function CreateModal({ onClose, onPublish }) {
  const [step, setStep] = useState(1); // 1 upload, 2 config, 3 generating, 4 review
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('Intermedio');
  const [numQ, setNumQ] = useState(5);
  const [questions, setQuestions] = useState([]);
  const inputRef = useRef(null);

  const pickFile = (name) => {
    setFileName(name || 'Lectura.pdf');
    if (!title) setTitle((name||'Nueva lectura').replace(/\.pdf$/i,''));
    setStep(2);
  };

  const startGenerate = () => {
    setStep(3);
    setTimeout(() => {
      setQuestions(GENERATED_Q.slice(0, numQ).map(q => ({...q})));
      setStep(4);
    }, 2600);
  };

  const updateQ = (i, field, val) => {
    setQuestions(qs => qs.map((q,idx) => idx===i ? {...q, [field]:val} : q));
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(42,42,42,0.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:24, animation:'fadeIn 0.2s' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:22, width:'100%', maxWidth: step===4?780:560, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', animation:'pop 0.25s ease' }}>

        {/* Header */}
        <div style={{ background:C.blue, padding:'20px 26px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>✨</div>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:18, fontWeight:900, color:'#fff' }}>Crear actividad con IA</h2>
            <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.8)', fontWeight:600 }}>
              {step===1 && 'Paso 1 de 3 — Sube el texto'}
              {step===2 && 'Paso 2 de 3 — Configura la actividad'}
              {step===3 && 'Generando preguntas…'}
              {step===4 && 'Paso 3 de 3 — Revisa y publica'}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.18)', border:'none', borderRadius:10, width:34, height:34, cursor:'pointer', color:'#fff', fontSize:18, fontWeight:900 }}>×</button>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', gap:6, padding:'14px 26px 0', flexShrink:0 }}>
          {[1,2,3].map(n => {
            const s = step >= 3 ? (step===3 ? 3 : 4) : step;
            const reached = (n===1) || (n===2 && s>=2) || (n===3 && s>=3);
            return <div key={n} style={{ flex:1, height:5, borderRadius:4, background: reached ? C.green : 'rgba(0,0,0,0.08)', transition:'background 0.3s' }} />;
          })}
        </div>

        {/* Body */}
        <div style={{ padding:'24px 26px', overflowY:'auto', flex:1 }}>

          {/* STEP 1 — Upload */}
          {step===1 && (
            <div>
              <div
                onDragOver={e=>{e.preventDefault(); setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; pickFile(f?.name);}}
                onClick={()=>inputRef.current?.click()}
                style={{
                  border:`2.5px dashed ${dragOver ? C.green : C.blue+'55'}`, borderRadius:16,
                  background: dragOver ? C.green+'0d' : 'rgba(53,78,171,0.03)',
                  padding:'48px 24px', textAlign:'center', cursor:'pointer', transition:'all 0.18s',
                }}>
                <div style={{ width:72, height:72, borderRadius:20, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, margin:'0 auto 16px' }}>📄</div>
                <div style={{ fontSize:16, fontWeight:900, color:C.dark }}>Arrastra tu PDF aquí</div>
                <div style={{ fontSize:13, color:'#888', fontWeight:600, marginTop:5 }}>o haz clic para seleccionar un archivo</div>
                <div style={{ fontSize:11.5, color:'#aaa', fontWeight:600, marginTop:14 }}>Formatos: PDF · Máx. 10 MB</div>
                <input ref={inputRef} type="file" accept="application/pdf" style={{ display:'none' }} onChange={e=>pickFile(e.target.files[0]?.name)} />
              </div>
              <div style={{ display:'flex', gap:12, marginTop:18, alignItems:'center', background:C.yellow+'18', borderRadius:12, padding:'12px 16px' }}>
                <span style={{ fontSize:22 }}>💡</span>
                <p style={{ fontSize:12.5, color:'#7a5d00', fontWeight:700, lineHeight:1.4 }}>La IA leerá el texto del PDF y generará preguntas de comprensión lectora de selección múltiple automáticamente.</p>
              </div>
              {/* quick demo button */}
              <button onClick={()=>pickFile('La_Tortuga_y_la_Liebre.pdf')} style={{ marginTop:14, width:'100%', background:'transparent', border:`2px solid ${C.blue}22`, borderRadius:12, padding:'10px', fontSize:12.5, fontWeight:800, color:C.blue, cursor:'pointer', fontFamily:'Nunito' }}>
                📎 Usar un PDF de ejemplo
              </button>
            </div>
          )}

          {/* STEP 2 — Config */}
          {step===2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, background:C.green+'12', border:`1.5px solid ${C.green}`, borderRadius:12, padding:'12px 16px' }}>
                <span style={{ fontSize:24 }}>✅</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13.5, fontWeight:800, color:C.dark }}>{fileName}</div>
                  <div style={{ fontSize:11.5, color:C.green, fontWeight:700 }}>Archivo cargado correctamente</div>
                </div>
                <button onClick={()=>setStep(1)} style={{ background:'transparent', border:'none', color:C.blue, fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'Nunito' }}>Cambiar</button>
              </div>

              <div>
                <label style={{ fontSize:13, fontWeight:800, color:C.dark, display:'block', marginBottom:7 }}>Título de la actividad</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. La Tortuga y la Liebre"
                  style={{ width:'100%', border:`2px solid rgba(0,0,0,0.1)`, borderRadius:12, padding:'12px 14px', fontSize:14, fontFamily:'Nunito', fontWeight:600, color:C.dark, outline:'none' }} />
              </div>

              <div>
                <label style={{ fontSize:13, fontWeight:800, color:C.dark, display:'block', marginBottom:7 }}>Nivel de dificultad</label>
                <div style={{ display:'flex', gap:10 }}>
                  {['Básico','Intermedio','Avanzado'].map(l => (
                    <button key={l} onClick={()=>setLevel(l)} style={{
                      flex:1, padding:'11px', borderRadius:12, cursor:'pointer', fontFamily:'Nunito', fontSize:13, fontWeight:800,
                      border:`2px solid ${level===l ? levelColor(l) : 'rgba(0,0,0,0.1)'}`,
                      background: level===l ? levelColor(l) : '#fff',
                      color: level===l ? '#fff' : '#888', transition:'all 0.15s',
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize:13, fontWeight:800, color:C.dark, display:'block', marginBottom:7 }}>Número de preguntas a generar: <span style={{ color:C.blue }}>{numQ}</span></label>
                <input type="range" min={3} max={10} value={numQ} onChange={e=>setNumQ(+e.target.value)} style={{ width:'100%', accentColor:C.blue }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#aaa', fontWeight:700, marginTop:2 }}>
                  <span>3</span><span>10</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Generating */}
          {step===3 && (
            <div style={{ padding:'32px 0', textAlign:'center' }}>
              <div style={{ width:80, height:80, margin:'0 auto 24px', position:'relative' }}>
                <div style={{ position:'absolute', inset:0, border:`5px solid ${C.blue}1a`, borderTopColor:C.blue, borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>✨</div>
              </div>
              <h3 style={{ fontSize:18, fontWeight:900, color:C.dark }}>Analizando el texto…</h3>
              <p style={{ fontSize:13.5, color:'#888', fontWeight:600, marginTop:6 }}>La IA está leyendo el PDF y creando {numQ} preguntas de comprensión</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:320, margin:'26px auto 0' }}>
                {['Extrayendo el contenido del PDF','Identificando ideas principales','Redactando preguntas y opciones'].map((s,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12.5, fontWeight:700, color:'#666', opacity:0, animation:`fadeIn 0.4s ease ${i*0.7}s forwards` }}>
                    <span style={{ width:22, height:22, borderRadius:'50%', background:C.green, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>✓</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 — Review */}
          {step===4 && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, background:C.green+'12', border:`1.5px solid ${C.green}`, borderRadius:12, padding:'12px 16px', marginBottom:18 }}>
                <span style={{ fontSize:24 }}>🎉</span>
                <p style={{ fontSize:13.5, fontWeight:800, color:C.dark }}>¡Listo! Se generaron {questions.length} preguntas. Revísalas y edítalas antes de publicar.</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {questions.map((q,i) => (
                  <div key={i} style={{ border:'2px solid rgba(0,0,0,0.08)', borderRadius:14, padding:'16px 18px' }}>
                    <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
                      <span style={{ width:26, height:26, borderRadius:8, background:C.blue, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, flexShrink:0 }}>{i+1}</span>
                      <input value={q.text} onChange={e=>updateQ(i,'text',e.target.value)}
                        style={{ flex:1, border:'none', borderBottom:'2px solid transparent', fontSize:14.5, fontWeight:800, color:C.dark, fontFamily:'Nunito', outline:'none', padding:'2px 0' }}
                        onFocus={e=>e.target.style.borderBottomColor=C.blue} onBlur={e=>e.target.style.borderBottomColor='transparent'} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, paddingLeft:36 }}>
                      {q.options.map((opt,oi) => (
                        <button key={oi} onClick={()=>updateQ(i,'correct',oi)} style={{
                          display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, cursor:'pointer', textAlign:'left', fontFamily:'Nunito',
                          border:`2px solid ${q.correct===oi ? C.green : 'rgba(0,0,0,0.08)'}`,
                          background: q.correct===oi ? C.green+'12' : '#fff', transition:'all 0.15s',
                        }}>
                          <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, background: q.correct===oi ? C.green : 'rgba(0,0,0,0.08)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>
                            {q.correct===oi ? '✓' : ['A','B','C','D'][oi]}
                          </span>
                          <span style={{ fontSize:12.5, fontWeight:600, color:C.dark }}>{opt}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:C.green, fontWeight:700, marginTop:8, paddingLeft:36 }}>✓ Toca una opción para marcarla como correcta</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div style={{ padding:'16px 26px', borderTop:'1px solid rgba(0,0,0,0.08)', display:'flex', gap:12, justifyContent:'flex-end', flexShrink:0 }}>
            {step===1 && (
              <button onClick={onClose} style={{ padding:'12px 22px', borderRadius:12, border:'2px solid rgba(0,0,0,0.1)', background:'#fff', fontSize:13.5, fontWeight:800, color:'#888', cursor:'pointer', fontFamily:'Nunito' }}>Cancelar</button>
            )}
            {step===2 && (
              <>
                <button onClick={()=>setStep(1)} style={{ padding:'12px 22px', borderRadius:12, border:'2px solid rgba(0,0,0,0.1)', background:'#fff', fontSize:13.5, fontWeight:800, color:'#888', cursor:'pointer', fontFamily:'Nunito' }}>← Atrás</button>
                <button onClick={startGenerate} disabled={!title.trim()} style={{ padding:'12px 24px', borderRadius:12, border:'none', background: title.trim()?C.blue:'#ccc', fontSize:13.5, fontWeight:800, color:'#fff', cursor: title.trim()?'pointer':'default', fontFamily:'Nunito', boxShadow: title.trim()?`0 4px 14px ${C.blue}44`:'none' }}>✨ Generar preguntas</button>
              </>
            )}
            {step===4 && (
              <>
                <button onClick={()=>setStep(2)} style={{ padding:'12px 22px', borderRadius:12, border:'2px solid rgba(0,0,0,0.1)', background:'#fff', fontSize:13.5, fontWeight:800, color:'#888', cursor:'pointer', fontFamily:'Nunito' }}>← Atrás</button>
                <button onClick={()=>onPublish({ title, level, questions:questions.length })} style={{ padding:'12px 24px', borderRadius:12, border:'none', background:C.green, fontSize:13.5, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'Nunito', boxShadow:`0 4px 14px ${C.green}55` }}>✓ Publicar actividad</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
function Toast({ msg }) {
  return (
    <div style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', background:C.green, color:'#fff', padding:'14px 24px', borderRadius:14, fontSize:14, fontWeight:800, boxShadow:'0 8px 28px rgba(67,137,81,0.4)', zIndex:60, animation:'pop 0.3s ease', display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:18 }}>🎉</span> {msg}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════
function Actividades({ onNavigate, onLogout }) {
  const [activeNav, setActiveNav] = useState('actividades');
  const [acts, setActs]   = useState(ACTIVITIES);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');

  const publish = ({ title, level, questions }) => {
    const newAct = {
      id: Date.now(), title, level, questions, assigned:28, completed:0, avg:0,
      icon:'📘', date:'3 jun 2026',
    };
    setActs(a => [newAct, ...a]);
    setModal(false);
    setToast(`"${title}" publicada y asignada a 28 alumnos`);
    setTimeout(()=>setToast(''), 3500);
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#fff', fontFamily:'Nunito' }}>
      <Sidebar active={activeNav} onNav={(id) => {
        if (id === 'progreso' || id === 'inicio') { onNavigate && onNavigate('dashboard'); return; }
        setActiveNav(id);
      }} onLogout={onLogout} />

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Top bar */}
        <div style={{ background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.06)', padding:'0 32px', height:64, display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:15, fontWeight:700, color:C.dark }}>Actividades de lectura 📖</span>
            <span style={{ fontSize:13, color:'#888', marginLeft:10 }}>3° Primaria B</span>
          </div>
          <div style={{ position:'relative' }}>
            <button style={{ background:'rgba(0,0,0,0.06)', border:'none', borderRadius:10, width:38, height:38, cursor:'pointer', fontSize:16 }}>🔔</button>
            <span style={{ position:'absolute', top:6, right:6, width:8, height:8, background:C.red, borderRadius:'50%' }} />
          </div>
          <div style={{ width:38, height:38, borderRadius:'50%', background:C.yellow, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:15, color:C.dark }}>P</div>
        </div>

        {/* Content */}
        <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
          {/* Heading row */}
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:16 }}>
            <div>
              <h1 style={{ fontSize:24, fontWeight:900, color:C.dark }}>Mis actividades</h1>
              <p style={{ fontSize:13.5, color:'#888', marginTop:4 }}>{acts.length} actividades creadas · crea nuevas subiendo un PDF</p>
            </div>
          </div>

          {/* Stat strip */}
          <div style={{ display:'flex', gap:14, marginBottom:26 }}>
            {[
              { label:'Actividades totales', value:acts.length, icon:'📚', color:C.blue },
              { label:'Promedio general', value:'79%', icon:'⭐', color:C.green },
              { label:'Tasa de finalización', value:'84%', icon:'✅', color:C.yellow },
              { label:'Generadas con IA', value:acts.length, icon:'✨', color:C.pink },
            ].map((s,i) => (
              <div key={i} style={{ flex:1, background:s.color, borderRadius:16, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', right:-8, bottom:-10, fontSize:48, opacity:0.18 }}>{s.icon}</div>
                <div style={{ fontSize:24, fontWeight:900, color:'#fff', lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.88)', marginTop:5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Activities grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:20 }}>
            <NewActivityCard onClick={()=>setModal(true)} />
            {acts.map((act,i) => (
              <ActivityCard key={act.id} act={act} color={ACT_COLORS[i % ACT_COLORS.length]} />
            ))}
          </div>
        </div>
      </div>

      {modal && <CreateModal onClose={()=>setModal(false)} onPublish={publish} />}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

export default Actividades;
