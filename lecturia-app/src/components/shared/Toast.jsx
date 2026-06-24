import { C } from '../../constants/colors';

export default function Toast({ msg }) {
    return (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: C.green, color: '#fff', padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 800, boxShadow: '0 8px 28px rgba(67,137,81,0.4)', zIndex: 60, animation: 'pop 0.3s ease', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎉</span> {msg}
        </div>
    );
}
