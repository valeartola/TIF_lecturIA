import { useState } from 'react';
import { C } from '../constants/colors';

// ── Mock data ──────────────────────────────────────────────────
const STUDENTS = [
{ id: 1, name: 'Sofía Torres', avatar: 'S', level: 'Avanzado', score: 92, lastActivity: 'El Pequeño Príncipe', days: 1 },
{ id: 2, name: 'Miguel Ríos', avatar: 'M', level: 'Intermedio', score: 74, lastActivity: 'La Tortuga y la Liebre', days: 2 },
{ id: 3, name: 'Valeria Núñez', avatar: 'V', level: 'Avanzado', score: 88, lastActivity: 'El Mago de Oz', days: 1 },
{ id: 4, name: 'Diego Herrera', avatar: 'D', level: 'Básico', score: 45, lastActivity: 'Caperucita Roja', days: 5, alert: true },
{ id: 5, name: 'Camila López', avatar: 'C', level: 'Intermedio', score: 67, lastActivity: 'Las Fábulas de Esopo', days: 3 },
{ id: 6, name: 'Andrés Martín', avatar: 'A', level: 'Básico', score: 38, lastActivity: 'La Liebre y la Tortuga', days: 8, alert: true },
{ id: 7, name: 'Lucía Pérez', avatar: 'L', level: 'Avanzado', score: 95, lastActivity: 'El Principito', days: 1 },
{ id: 8, name: 'Tomás García', avatar: 'T', level: 'Intermedio', score: 71, lastActivity: 'Cuentos de Grimm', days: 2 },
{ id: 9, name: 'Isabella Cruz', avatar: 'I', level: 'Básico', score: 52, lastActivity: 'El Patito Feo', days: 4 },
{ id: 10, name: 'Mateo Silva', avatar: 'M', level: 'Básico', score: 31, lastActivity: 'La Bella Durmiente', days: 10, alert: true }];


const ACTIVITIES = [
{ name: 'El Pequeño\nPríncipe', pct: 82 },
{ name: 'La Tortuga\ny la Liebre', pct: 74 },
{ name: 'El Mago\nde Oz', pct: 91 },
{ name: 'Caperucita\nRoja', pct: 68 },
{ name: 'Las Fábulas\nde Esopo', pct: 77 }];


// ── Helpers ────────────────────────────────────────────────────
const levelColor = (level) => ({
  'Avanzado': C.green,
  'Intermedio': C.yellow,
  'Básico': C.red
})[level] || C.gray;

const levelBg = (level) => ({
  'Avanzado': '#E8F5EB',
  'Intermedio': '#FFF8E1',
  'Básico': '#FEECEC'
})[level] || '#eee';

// ── Nav items ──────────────────────────────────────────────────
const NAV = [
{ id: 'inicio', label: 'Inicio', icon: '🏠' },
{ id: 'clase', label: 'Mi Clase', icon: '👨‍🏫' },
{ id: 'actividades', label: 'Actividades', icon: '📖' },
{ id: 'progreso', label: 'Progreso', icon: '📊' },
{ id: 'alertas', label: 'Alertas', icon: '🔔', badge: 3 },
{ id: 'config', label: 'Configuración', icon: '⚙️' }];


// ══════════════════════════════════════════════════════════════
// THEME DEFINITIONS
// ══════════════════════════════════════════════════════════════
const THEMES = {
  cream: {
    name: 'Variación 1 — Sidebar Azul',
    sidebar: { bg: C.blue, text: '#fff', subtext: 'rgba(255,255,255,0.65)', activeItem: 'rgba(255,255,255,0.18)', activeBorder: C.yellow },
    main: { bg: C.cream },
    topbar: { bg: C.cream, border: 'rgba(0,0,0,0.06)' },
    card: { bg: '#fff', shadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', radius: 16 },
    statColors: [C.blue, C.green, C.yellow, C.red],
    chartBar: C.blue,
    heading: C.dark,
    subtext: '#666'
  },
  white: {
    name: 'Variación 2 — Header Azul',
    sidebar: { bg: '#fff', text: C.dark, subtext: '#999', activeItem: C.blueLight, activeBorder: C.blue },
    main: { bg: '#F4F6FA' },
    topbar: { bg: C.blue, border: 'transparent', textColor: '#fff' },
    card: { bg: '#fff', shadow: '0 2px 16px rgba(46,78,192,0.08)', border: 'none', radius: 14 },
    statColors: [C.blue, C.green, C.yellow, C.red],
    chartBar: C.green,
    heading: C.dark,
    subtext: '#666'
  },
  bold: {
    name: 'Variación 3 — Tarjetas de Color',
    sidebar: { bg: C.cream, text: C.dark, subtext: '#888', activeItem: 'rgba(46,78,192,0.08)', activeBorder: C.blue },
    main: { bg: '#fff' },
    topbar: { bg: '#fff', border: 'rgba(0,0,0,0.06)' },
    card: { bg: '#fff', shadow: '0 2px 14px rgba(0,0,0,0.07)', border: 'none', radius: 18 },
    statColors: [C.blue, C.green, C.yellow, C.red],
    chartBar: C.pink,
    heading: C.dark,
    subtext: '#666'
  }
};

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function Sidebar({ theme: th, active, onNav, collapsed, onLogout }) {
  const t = th.sidebar;
  return (
    <div style={{
      width: collapsed ? 72 : 230,
      minHeight: '100vh',
      background: t.bg,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s',
      flexShrink: 0,
      position: 'relative',
      zIndex: 2,
      boxShadow: '2px 0 12px rgba(0,0,0,0.06)'
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '24px 0' : '28px 24px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="uploads/MiniLogo.png" alt="LecturIA" style={{ width: collapsed ? 40 : 44, height: collapsed ? 40 : 44, objectFit: 'contain', borderRadius: 10, flexShrink: 0 }} />
        {!collapsed &&
        <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: t.bg === C.blue ? '#fff' : C.blue, letterSpacing: -0.3 }}>
              <span style={{ color: "rgb(67, 137, 81)" }}>Lectur</span><span style={{ color: C.yellow }}>IA</span>
            </div>
            <div style={{ fontSize: 10.5, color: t.subtext, fontWeight: 600, marginTop: 1 }}>para docentes</div>
          </div>
        }
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: collapsed ? '13px 0' : '13px 20px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: isActive ? t.activeItem : 'transparent',
              border: 'none',
              borderLeft: isActive && !collapsed ? `4px solid ${t.activeBorder}` : '4px solid transparent',
              borderRadius: collapsed ? 0 : '0 12px 12px 0',
              cursor: 'pointer',
              transition: 'all 0.15s',
              position: 'relative'
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed &&
              <span style={{ fontSize: 14, fontWeight: isActive ? 800 : 600, color: isActive ? t.text : t.subtext, fontFamily: 'Nunito' }}>
                  {item.label}
                </span>
              }
              {item.badge && !collapsed &&
              <span style={{ marginLeft: 'auto', background: C.red, color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '1px 7px', fontFamily: 'Nunito' }}>
                  {item.badge}
                </span>
              }
              {item.badge && collapsed &&
              <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: C.red, borderRadius: '50%' }} />
              }
            </button>);

        })}
      </nav>

      {/* Teacher profile */}
      {!collapsed &&
      <div onClick={onLogout} title="Cerrar sesión" style={{ padding: '16px 20px', cursor: 'pointer', borderTop: `1px solid ${t.bg === C.blue ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: C.dark, flexShrink: 0 }}>P</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>Profa. García</div>
              <div style={{ fontSize: 11, color: t.subtext }}>3° Primaria B</div>
            </div>
          </div>
        </div>
      }
    </div>);

}

function StatCard({ label, value, sub, color, icon, th, bold }) {
  const t = th.card;
  const isBold = bold;
  return (
    <div style={{
      background: isBold ? color : t.bg,
      borderRadius: t.radius,
      boxShadow: t.shadow,
      padding: '20px 22px',
      flex: 1,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {isBold &&
      <div style={{ position: 'absolute', right: -12, bottom: -12, fontSize: 56, opacity: 0.18 }}>{icon}</div>
      }
      {!isBold &&
      <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
          {icon}
        </div>
      }
      <div style={{ fontSize: 28, fontWeight: 900, color: isBold ? '#fff' : th.heading, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isBold ? 'rgba(255,255,255,0.85)' : th.subtext, marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: isBold ? 'rgba(255,255,255,0.65)' : th.subtext, marginTop: 3 }}>{sub}</div>}
      {!isBold &&
      <div style={{ position: 'absolute', right: 18, top: 18, width: 6, height: 6, borderRadius: '50%', background: color }} />
      }
    </div>);

}

function BarChart({ data, barColor, th }) {
  const max = Math.max(...data.map((d) => d.pct));
  const H = 120;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: H + 40, padding: '0 4px' }}>
      {data.map((d, i) =>
      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: barColor }}>{d.pct}%</div>
          <div style={{ width: '100%', height: H, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.04)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
            width: '100%',
            height: `${d.pct / 100 * H}px`,
            background: barColor,
            borderRadius: '6px 6px 0 0',
            transition: 'height 0.8s cubic-bezier(.34,1.56,.64,1)',
            opacity: 0.75 + d.pct / max * 0.25
          }} />
          </div>
          <div style={{ fontSize: 10, color: th.subtext, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'pre', fontWeight: 600 }}>{d.name}</div>
        </div>
      )}
    </div>);

}

function LevelBadge({ level }) {
  return (
    <span style={{
      background: levelBg(level),
      color: levelColor(level),
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11.5,
      fontWeight: 800
    }}>{level}</span>);

}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 8, borderRadius: 8, background: 'rgba(0,0,0,0.07)', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 8, transition: 'width 1s' }} />
    </div>);

}

function AlertCard({ student, th }) {
  return (
    <div style={{
      background: '#FFF4F4',
      border: `1.5px solid ${C.red}22`,
      borderLeft: `4px solid ${C.red}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.red + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: C.red, flexShrink: 0 }}>
        {student.avatar}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: th.heading }}>{student.name}</div>
        <div style={{ fontSize: 12, color: '#a33', marginTop: 2 }}>
          ⚠️ Promedio: {student.score}% — sin actividad hace {student.days} días
        </div>
      </div>
      <button style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito', whiteSpace: 'nowrap' }}>
        Ver perfil
      </button>
    </div>);

}

// ══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════
function Dashboard({ themeKey = 'bold', onNavigate, onLogout }) {
  const [activeNav, setActiveNav] = useState('progreso');
  const [collapsed, setCollapsed] = useState(false);

  // Enruta los ítems del menú: "Actividades" abre esa vista, el resto queda local
  const handleNav = (id) => {
    if (id === 'actividades') { onNavigate && onNavigate('actividades'); return; }
    setActiveNav(id);
  };
  const th = THEMES[themeKey];
  const alerts = STUDENTS.filter((s) => s.alert);
  const avg = Math.round(STUDENTS.reduce((a, s) => a + s.score, 0) / STUDENTS.length);
  const completed = STUDENTS.filter((s) => s.days <= 3).length;

  const topbarTextColor = th.topbar.textColor || th.heading;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: th.main.bg, fontFamily: 'Nunito' }}>
      <Sidebar theme={th} active={activeNav} onNav={handleNav} collapsed={collapsed} onLogout={onLogout} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          background: th.topbar.bg,
          borderBottom: `1px solid ${th.topbar.border}`,
          padding: '0 28px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
          boxShadow: th.topbar.bg === C.blue ? '0 2px 12px rgba(46,78,192,0.2)' : 'none'
        }}>
          <button onClick={() => setCollapsed((c) => !c)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, color: topbarTextColor, fontSize: 18, lineHeight: 1 }}>
            ☰
          </button>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: topbarTextColor }}>
              Bienvenida, Profa. García 👋
            </span>
            <span style={{ fontSize: 13, color: th.topbar.bg === C.blue ? 'rgba(255,255,255,0.7)' : th.subtext, marginLeft: 10 }}>
              3° Primaria B
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button style={{ background: th.topbar.bg === C.blue ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 16 }}>🔔</button>
              <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: C.red, borderRadius: '50%' }} />
            </div>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: C.dark }}>P</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Page heading */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: th.heading }}>Progreso del grupo</h1>
            <p style={{ fontSize: 13, color: th.subtext, marginTop: 4 }}>Resumen de desempeño — Abril 2026</p>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
            <StatCard th={th} label="Total de estudiantes" value="10" sub="Activos este mes" icon="🧒" color={th.statColors[0]} bold={themeKey === 'bold'} />
            <StatCard th={th} label="Promedio del grupo" value={`${avg}%`} sub={avg >= 70 ? '✓ Por encima de la meta' : '↓ Por debajo de la meta'} icon="⭐" color={th.statColors[1]} bold={themeKey === 'bold'} />
            <StatCard th={th} label="Actividades completadas" value={`${completed}/10`} sub="en los últimos 3 días" icon="📖" color={th.statColors[2]} bold={themeKey === 'bold'} />
            <StatCard th={th} label="Estudiantes en riesgo" value={alerts.length} sub="Necesitan atención" icon="⚠️" color={th.statColors[3]} bold={themeKey === 'bold'} />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 28 }}>
            {/* Bar chart */}
            <div style={{ background: th.card.bg, borderRadius: th.card.radius, boxShadow: th.card.shadow, padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: th.heading }}>Resultados por actividad</h2>
                  <p style={{ fontSize: 12, color: th.subtext, marginTop: 2 }}>Promedio del grupo por lectura</p>
                </div>
              </div>
              <BarChart data={ACTIVITIES} barColor={th.chartBar} th={th} />
            </div>

            {/* Level distribution */}
            <div style={{ background: th.card.bg, borderRadius: th.card.radius, boxShadow: th.card.shadow, padding: '22px 24px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: th.heading, marginBottom: 4 }}>Distribución de niveles</h2>
              <p style={{ fontSize: 12, color: th.subtext, marginBottom: 18 }}>Estudiantes por nivel lector</p>
              {[
              { level: 'Avanzado', count: STUDENTS.filter((s) => s.level === 'Avanzado').length, color: C.green },
              { level: 'Intermedio', count: STUDENTS.filter((s) => s.level === 'Intermedio').length, color: C.yellow },
              { level: 'Básico', count: STUDENTS.filter((s) => s.level === 'Básico').length, color: C.red }].
              map((row) =>
              <div key={row.level} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: th.heading }}>{row.level}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: row.color }}>{row.count} alumnos</span>
                  </div>
                  <ProgressBar pct={row.count / STUDENTS.length * 100} color={row.color} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {['Avanzado', 'Intermedio', 'Básico'].map((l) =>
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: th.subtext }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: levelColor(l), display: 'inline-block' }} />{l}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Student list */}
          <div style={{ background: th.card.bg, borderRadius: th.card.radius, boxShadow: th.card.shadow, padding: '22px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: th.heading }}>Lista de estudiantes</h2>
                <p style={{ fontSize: 12, color: th.subtext, marginTop: 2 }}>Desempeño individual y última actividad</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ border: `1.5px solid rgba(0,0,0,0.1)`, borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: th.heading, background: th.card.bg, fontFamily: 'Nunito', cursor: 'pointer' }}>
                  <option>Todos los niveles</option>
                  <option>Avanzado</option>
                  <option>Intermedio</option>
                  <option>Básico</option>
                </select>
                <button style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '6px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito' }}>
                  + Agregar
                </button>
              </div>
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.8fr 1.4fr 60px', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', marginBottom: 8 }}>
              {['Estudiante', 'Nivel', 'Última actividad', 'Progreso', ''].map((h, i) =>
              <span key={i} style={{ fontSize: 11, fontWeight: 800, color: th.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
              )}
            </div>

            {STUDENTS.map((s, i) =>
            <div key={s.id} style={{
              display: 'grid',
              gridTemplateColumns: '2.2fr 1fr 1.8fr 1.4fr 60px',
              gap: 12,
              padding: '11px 12px',
              borderRadius: 10,
              background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.018)',
              alignItems: 'center',
              borderBottom: i < STUDENTS.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.alert ? C.red + '22' : C.blue + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: s.alert ? C.red : C.blue, flexShrink: 0 }}>
                    {s.avatar}
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: th.heading }}>{s.name}</span>
                  {s.alert && <span style={{ fontSize: 14 }}>⚠️</span>}
                </div>
                <LevelBadge level={s.level} />
                <span style={{ fontSize: 12.5, color: th.subtext, fontWeight: 600 }}>{s.lastActivity}</span>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: th.subtext, fontWeight: 600 }}></span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: levelColor(s.level) }}>{s.score}%</span>
                  </div>
                  <ProgressBar pct={s.score} color={levelColor(s.level)} />
                </div>
                <button style={{ background: 'transparent', border: `1.5px solid ${C.blue}33`, borderRadius: 8, padding: '5px 0', fontSize: 11.5, fontWeight: 800, color: C.blue, cursor: 'pointer', fontFamily: 'Nunito', width: '100%' }}>
                  Ver
                </button>
              </div>
            )}
          </div>

          {/* Alerts */}
          <div style={{ background: th.card.bg, borderRadius: th.card.radius, boxShadow: th.card.shadow, padding: '22px 24px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚠️</div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: th.heading }}>Estudiantes que necesitan atención</h2>
                <p style={{ fontSize: 12, color: th.subtext, marginTop: 2 }}>{alerts.length} alumnos con bajo rendimiento o sin actividad reciente</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alerts.map((s) => <AlertCard key={s.id} student={s} th={th} />)}
            </div>
          </div>

        </div>
      </div>
    </div>);

}

export default Dashboard;
