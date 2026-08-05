import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/* ─── Sub-view: Forgot Password ─────────────────────────────────────────── */
function ForgotPasswordView({ onBack }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setErrorMsg('Please enter your email address.'); return; }
    setStatus('loading');
    setErrorMsg('');
    try {
      await resetPassword(email.trim());
      setStatus('sent');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send reset email. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="fade-in" style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
        }}>
          <CheckCircle size={34} color="white" strokeWidth={2.5} />
        </div>

        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
          Check your inbox
        </div>
        <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: '0.95rem' }}>
          We've sent a password reset link to:
        </div>
        <div style={{
          fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)',
          background: 'rgba(99,102,241,0.07)', padding: '8px 18px',
          borderRadius: 8, display: 'inline-block', marginBottom: 24,
        }}>
          {email}
        </div>

        <div style={{
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 28,
          fontSize: '0.82rem', color: '#065F46', lineHeight: 1.7, textAlign: 'left',
        }}>
          <strong>What happens next?</strong><br />
          1. Open the email from CrowdIQ<br />
          2. Click the reset link (valid for 1 hour)<br />
          3. Set your new password<br />
          4. Sign in with your new credentials
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Didn't get it? Check spam or{' '}
          <span
            className="auth-link"
            onClick={() => setStatus('idle')}
            style={{ cursor: 'pointer', fontWeight: 500 }}
          >
            try again
          </span>
        </div>

        <button
          className="btn btn-primary"
          onClick={onBack}
          style={{ width: '100%', justifyContent: 'center', padding: '12px', minHeight: 50, borderRadius: 12 }}
        >
          <ArrowLeft size={16} /> Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24,
          fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={16} /> Back to sign in
      </button>

      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
        border: '1px solid rgba(99,102,241,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Mail size={24} color="#6366F1" />
      </div>

      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
        Reset password
      </div>
      <div style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.95rem' }}>
        Enter the email you signed up with. We'll send you a secure reset link.
      </div>

      {(status === 'error') && (
        <div className="auth-error" style={{ marginBottom: 16 }}>⚠️ {errorMsg}</div>
      )}

      <form onSubmit={handleSend}>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Email Address</label>
          <div className="input-icon-wrap">
            <Mail size={18} className="input-icon" />
            <input
              id="reset-email"
              type="email"
              className="form-input"
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
              autoFocus
              autoComplete="email"
              style={{ minHeight: 48, borderRadius: 10 }}
            />
          </div>
        </div>

        <button
          id="reset-submit"
          type="submit"
          disabled={status === 'loading'}
          className="btn btn-primary"
          style={{
            width: '100%', justifyContent: 'center', padding: '12px', minHeight: 50, borderRadius: 12,
            fontSize: '1rem', marginTop: 4,
            opacity: status === 'loading' ? 0.75 : 1,
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            border: 'none',
          }}
        >
          {status === 'loading'
            ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Sending link...</>
            : <><ArrowRight size={18} /> Send Reset Link</>
          }
        </button>
      </form>

      <div style={{
        marginTop: 24, padding: '12px 14px',
        background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)',
        borderRadius: 10, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        🔒 The reset link is valid for <strong>1 hour</strong> and can only be used once.
      </div>
    </div>
  );
}

/* ─── Main Login Page ────────────────────────────────────────────────────── */
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login'); // 'login' | 'forgot'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('email not confirmed')) {
        setError('Email not confirmed. Go to Supabase → Authentication → Users → find your email → Confirm User.');
      } else if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        setError('Incorrect email or password. Please try again, or use "Forgot password?" to reset.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await supabase.auth.signUp({
        email: 'demo@crowdiq.ai',
        password: 'demo1234',
        options: { data: { name: 'Demo Organizer', org: 'CrowdIQ Demo', role: 'Event Organizer' } }
      });
      await login({ email: 'demo@crowdiq.ai', password: 'demo1234' });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('email not confirmed')) {
        setError('Demo needs email confirmation disabled in Supabase. Go to Authentication → Providers → Email → disable "Confirm email" → Save.');
      } else {
        setError('Demo login failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }
        .login-header {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%);
          height: 35vh;
          min-height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .login-card {
          background: white;
          margin-top: -30px;
          border-radius: 28px 28px 0 0;
          padding: 32px 24px;
          flex: 1;
          position: relative;
          z-index: 10;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
        }
        .circle-bg {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          animation: pulse 4s infinite alternate ease-in-out;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.6; }
          100% { transform: scale(1.05); opacity: 1; }
        }
        @media (min-width: 768px) {
          .login-page {
            align-items: center;
            justify-content: center;
          }
          .login-header {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 45vh;
          }
          .login-card {
            max-width: 440px;
            width: 100%;
            border-radius: 24px;
            margin-top: 5vh;
            margin-bottom: 40px;
            flex: none;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            padding: 48px 40px;
          }
        }
      `}</style>

      <div className="login-header">
        {/* Animated concentric circles */}
        <div className="circle-bg" style={{ width: 300, height: 300, animationDelay: '0s' }}></div>
        <div className="circle-bg" style={{ width: 450, height: 450, animationDelay: '1s' }}></div>
        <div className="circle-bg" style={{ width: 600, height: 600, animationDelay: '2s' }}></div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="auth-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="white" opacity="0.9"/>
              <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" opacity="0.7"/>
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1" opacity="0.4"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.75rem', color: 'white', letterSpacing: '-0.02em' }}>CrowdIQ</span>
        </div>
      </div>

      <div className="login-card">
        {view === 'forgot' ? (
          <ForgotPasswordView onBack={() => setView('login')} />
        ) : (
          <div className="fade-in">
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              Welcome Back
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.95rem' }}>
              Sign in to your event operations dashboard
            </p>

            {error && <div className="auth-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Email Address</label>
                <div className="input-icon-wrap">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    autoComplete="email"
                    style={{ minHeight: 48, borderRadius: 10 }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  <span
                    className="auth-link"
                    style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => { setError(''); setView('forgot'); }}
                  >
                    Forgot password?
                  </span>
                </div>
                <div className="input-icon-wrap" style={{ position: 'relative' }}>
                  <Lock size={18} className="input-icon" />
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                    style={{ minHeight: 48, borderRadius: 10, paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ 
                  width: '100%', justifyContent: 'center', padding: '12px', minHeight: 50, borderRadius: 12,
                  fontSize: '1rem', opacity: loading ? 0.75 : 1,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  border: 'none', boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                }}
              >
                {loading
                  ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
                  : <><ArrowRight size={18} /> Sign In</>
                }
              </button>
            </form>

            <div className="auth-divider" style={{ margin: '24px 0' }}><span>or</span></div>

            <button
              className="btn"
              style={{ 
                width: '100%', justifyContent: 'center', background: 'transparent',
                border: '1.5px solid var(--border)', color: 'var(--text-primary)',
                padding: '12px', minHeight: 50, borderRadius: 12, fontSize: '0.95rem', fontWeight: 600
              }}
              onClick={demoLogin}
              disabled={loading}
            >
              🚀 Try Demo Dashboard
            </button>

            <div style={{ textAlign: 'center', marginTop: 32, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <span className="auth-link" style={{ fontWeight: 600 }} onClick={() => navigate('/register')}>Create one free</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span className="auth-link" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} onClick={() => navigate('/')}>
                ← Back to home
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
