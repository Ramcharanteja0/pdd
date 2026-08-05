import { useNavigate } from 'react-router-dom';
import { ArrowRight, LogIn } from 'lucide-react';

const FEATURES = [
  { icon: '🗺️', label: 'Live Heatmap' },
  { icon: '⚡', label: 'AI Predictions' },
  { icon: '👥', label: 'Staff Dispatch' },
  { icon: '🔔', label: 'Smart Alerts' },
  { icon: '📊', label: 'Analytics' },
  { icon: '🛡️', label: 'Safety Reports' },
];

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(160deg, #6366F1 0%, #8B5CF6 40%, #A78BFA 70%, #EC4899 100%)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-body, Inter, sans-serif)',
    }}>
      {/* Animated background circles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[180, 300, 450].map((size, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: size, height: size,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.08)',
            left: '50%', top: '35%',
            transform: 'translate(-50%, -50%)',
            animation: `onb-pulse 4s ease-in-out ${i * 0.7}s infinite alternate`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes onb-pulse {
          0% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.95); }
          100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.08); }
        }
      `}</style>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px 32px',
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        maxWidth: 480,
        margin: '0 auto',
        width: '100%',
      }}>

        {/* Logo */}
        <div style={{
          width: 64, height: 64,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" fill="white" opacity="0.95"/>
            <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" opacity="0.6"/>
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1" opacity="0.3"/>
          </svg>
        </div>

        {/* Brand */}
        <div style={{
          fontFamily: 'var(--font-display, Outfit, sans-serif)',
          fontSize: '1.6rem', fontWeight: 800, color: 'white',
          marginBottom: 4, letterSpacing: '-0.5px',
        }}>
          Crowd<span style={{ opacity: 0.85 }}>IQ</span>
        </div>

        {/* Live badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(6px)',
          padding: '4px 14px', borderRadius: 99,
          fontSize: '0.72rem', fontWeight: 700, color: 'white',
          letterSpacing: '1px', textTransform: 'uppercase',
          marginBottom: 28,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#4ADE80',
            boxShadow: '0 0 8px rgba(74,222,128,0.6)',
            display: 'inline-block',
          }} />
          AI-Powered · Real-Time
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display, Outfit, sans-serif)',
          fontSize: 'clamp(1.5rem, 6vw, 2.2rem)',
          fontWeight: 900, color: 'white',
          lineHeight: 1.15, letterSpacing: '-1px',
          margin: '0 0 12px',
        }}>
          Smart Crowd Intelligence for Live Events
        </h1>

        <p style={{
          fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.6, margin: '0 0 28px',
          maxWidth: 360,
        }}>
          Predict incidents, dispatch staff, and keep every zone safe — all from your phone.
        </p>

        {/* Feature pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          justifyContent: 'center', marginBottom: 28,
        }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '6px 12px', borderRadius: 99,
              fontSize: '0.75rem', fontWeight: 600, color: 'white',
            }}>
              <span style={{ fontSize: '0.85rem' }}>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 0,
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 16, overflow: 'hidden',
          marginBottom: 32, width: '100%',
        }}>
          {[
            { val: '500+', lbl: 'Events' },
            { val: '2M+', lbl: 'Tracked' },
            { val: '91%', lbl: 'Accuracy' },
          ].map((s, i) => (
            <div key={s.lbl} style={{
              flex: 1, padding: '14px 8px', textAlign: 'center',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.15)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-display, Outfit, sans-serif)',
                fontSize: '1.25rem', fontWeight: 800, color: 'white',
              }}>{s.val}</div>
              <div style={{
                fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
                marginTop: 2,
              }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <button
          onClick={() => navigate('/register')}
          style={{
            width: '100%', minHeight: 50, borderRadius: 14,
            background: 'white', color: '#4F46E5',
            fontWeight: 700, fontSize: '0.95rem',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            marginBottom: 12,
            fontFamily: 'inherit',
          }}
        >
          Get Started Free <ArrowRight size={18} />
        </button>

        <button
          onClick={() => navigate('/login')}
          style={{
            width: '100%', minHeight: 48, borderRadius: 14,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(6px)',
            color: 'white',
            fontWeight: 600, fontSize: '0.9rem',
            border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
          }}
        >
          <LogIn size={16} /> Sign In to Dashboard
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 24,
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
          fontWeight: 500,
        }}>
          © 2026 CrowdIQ Technologies
        </div>
      </div>
    </div>
  );
}
