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
      <div className="auth-right-inner fade-in" style={{ textAlign: 'center' }}>
        {/* Logo */}
        <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: 32 }}>
          <div className="auth-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="white" opacity="0.9"/>
              <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" opacity="0.6"/>
            </svg>
          </div>
          <span className="auth-logo-text">Crowd<span>IQ</span></span>
        </div>

        {/* Success state */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
        }}>
          <CheckCircle size={34} color="white" strokeWidth={2.5} />
        </div>

        <div className="auth-title" style={{ marginBottom: 8 }}>Check your inbox</div>
        <div className="auth-subtitle" style={{ marginBottom: 6 }}>
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
            style={{ cursor: 'pointer' }}
          >
            try again
          </span>
        </div>

        <button
          className="btn btn-primary"
          onClick={onBack}
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
        >
          <ArrowLeft size={15} /> Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="auth-right-inner fade-in">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" fill="white" opacity="0.9"/>
            <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          </svg>
        </div>
        <span className="auth-logo-text">Crowd<span>IQ</span></span>
      </div>

      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20,
          fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={13} /> Back to sign in
      </button>

      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
        border: '1px solid rgba(99,102,241,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Mail size={24} color="#6366F1" />
      </div>

      <div className="auth-title" style={{ marginBottom: 6 }}>Reset your password</div>
      <div className="auth-subtitle" style={{ marginBottom: 24 }}>
        Enter the email you signed up with. We'll send you a secure reset link.
      </div>

      {(status === 'error') && (
        <div className="auth-error" style={{ marginBottom: 16 }}>⚠️ {errorMsg}</div>
      )}

      <form onSubmit={handleSend}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <div className="input-icon-wrap">
            <Mail size={15} className="input-icon" />
            <input
              id="reset-email"
              type="email"
              className="form-input"
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
              autoFocus
              autoComplete="email"
            />
          </div>
        </div>

        <button
          id="reset-submit"
          type="submit"
          disabled={status === 'loading'}
          className="btn btn-primary"
          style={{
            width: '100%', justifyContent: 'center', padding: '12px',
            fontSize: '0.92rem', marginTop: 4,
            opacity: status === 'loading' ? 0.75 : 1,
          }}
        >
          {status === 'loading'
            ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending reset link...</>
            : <><ArrowRight size={15} /> Send Reset Link</>
          }
        </button>
      </form>

      <div style={{
        marginTop: 20, padding: '12px 14px',
        background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)',
        borderRadius: 10, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.6,
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
    <div className="auth-shell">
      {/* Left Panel — always visible */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div className="auth-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" fill="white" opacity="0.9"/>
                  <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1" opacity="0.3"/>
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'white' }}>CrowdIQ</span>
            </div>
          </div>
          <h1>Welcome back to your control centre</h1>
          <p>Monitor your live event, track crowd density, predict incidents and dispatch staff — all from one dashboard.</p>
          {[
            { icon: '🗺️', text: 'Real-time crowd heatmap across all zones' },
            { icon: '⚡', text: 'AI predictions with 90%+ accuracy' },
            { icon: '👥', text: 'Live staff dispatch and tracking' },
            { icon: '🔔', text: 'Automated emergency alerts' },
          ].map(f => (
            <div key={f.text} className="auth-feature">
              <div className="auth-feature-icon">{f.icon}</div>
              <div className="auth-feature-text">{f.text}</div>
            </div>
          ))}
          <div className="auth-floating-card">
            <h3>📊 Platform Stats (Live)</h3>
            <div className="auth-stat-row">
              {[['500+', 'Events'], ['2M+', 'Attendees'], ['91%', 'AI Accuracy']].map(([v, l]) => (
                <div key={l} className="auth-stat">
                  <div className="auth-stat-val">{v}</div>
                  <div className="auth-stat-lbl">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — switches between login and forgot password */}
      <div className="auth-right">
        {view === 'forgot' ? (
          <ForgotPasswordView onBack={() => setView('login')} />
        ) : (
          <div className="auth-right-inner fade-in">
            <div className="auth-logo">
              <div className="auth-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" fill="white" opacity="0.9"/>
                  <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                </svg>
              </div>
              <span className="auth-logo-text">Crowd<span>IQ</span></span>
            </div>

            <div className="auth-title">Sign in</div>
            <div className="auth-subtitle">Access your event operations dashboard</div>

            {error && <div className="auth-error">⚠️ {error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-icon-wrap">
                  <Mail size={15} className="input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  {/* ✅ Now actually works */}
                  <span
                    className="auth-link"
                    style={{ fontSize: '0.78rem', cursor: 'pointer' }}
                    onClick={() => { setError(''); setView('forgot'); }}
                  >
                    Forgot password?
                  </span>
                </div>
                <div className="input-icon-wrap" style={{ position: 'relative' }}>
                  <Lock size={15} className="input-icon" />
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.92rem', marginTop: 4, opacity: loading ? 0.75 : 1 }}
              >
                {loading
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
                  : <><ArrowRight size={16} /> Sign In</>
                }
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <button
              className="btn"
              style={{ width: '100%', justifyContent: 'center', background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', padding: '11px' }}
              onClick={demoLogin}
              disabled={loading}
            >
              🚀 Try Demo Dashboard
            </button>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <span className="auth-link" onClick={() => navigate('/register')}>Create one free</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <span className="auth-link" style={{ fontSize: '0.82rem' }} onClick={() => navigate('/')}>
                ← Back to home
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
