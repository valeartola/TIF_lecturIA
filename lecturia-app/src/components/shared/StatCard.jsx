const CARD_RADIUS = 18;

export default function StatCard({ label, value, sub, color, icon }) {
    return (
        <div style={{ background: color, borderRadius: CARD_RADIUS, padding: '20px 22px', flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -12, bottom: -12, fontSize: 56, opacity: 0.18 }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 5 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>{sub}</div>}
        </div>
    );
}
