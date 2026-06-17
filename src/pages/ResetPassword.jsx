import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | invalid
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the user back with a hash fragment containing the token
  // onAuthStateChange fires with event 'PASSWORD_RECOVERY' when valid
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true);
      } else if (event === 'SIGNED_IN' && session) {
        // Also handle if already signed in via recovery link
        setSessionReady(true);
      }
    });

    // Also check current session (user may have already been logged in by the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // If no event fires within 4s, the link is invalid/expired
    const timeout = setTimeout(() => {
      setSessionReady(s => {
        if (!s) setStatus('invalid');
        return s;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Password strength
  const getStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0-5
  };

  const strength = getStrength(password);
  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#EF4444', '#F97316', '#F59E0B', '#10B981', '#059669'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setStatus('loading');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setStatus('success');
      // Auto-redirect to dashboard after 3s
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. The link may have expired.');
      setStatus('error');
    }
  };

  // ── Invalid / expired link ────────────────────────────────────────────────
  if (status === 'invalid') {
    return (
      <div className="auth-shell">
        <div className="auth-left">
          <div className="auth-left-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div className="auth-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" fill="white" opacity="0.9"/>
                  <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'white' }}>CrowdIQ</span>
            </div>
            <h1>Secure password reset</h1>
            <p>Your account security is our priority. Reset links are valid for 1 hour and single-use.</p>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-right-inner fade-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(239,68,68,0.3)',
            }}>
              <AlertTriangle size={34} color="white" strokeWidth={2.5} />
            </div>
            <div className="auth-title" style={{ marginBottom: 8 }}>Link expired or invalid</div>
            <div className="auth-subtitle" style={{ marginBottom: 24 }}>
              This reset link has expired or was already used. Reset links are valid for 1 hour.
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: 12 }}
            >
              <ArrowRight size={15} /> Request a new reset link
            </button>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span className="auth-link" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>
                ← Back to sign in
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="auth-shell">
        <div className="auth-left">
          <div className="auth-left-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div className="auth-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" fill="white" opacity="0.9"/>
                  <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'white' }}>CrowdIQ</span>
            </div>
            <h1>Password updated!</h1>
            <p>Your account is secured with your new password. Redirecting you to the dashboard...</p>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-right-inner fade-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
            }}>
              <CheckCircle size={34} color="white" strokeWidth={2.5} />
            </div>
            <div className="auth-title" style={{ marginBottom: 8 }}>Password updated!</div>
            <div className="auth-subtitle" style={{ marginBottom: 24 }}>
              Your password has been changed successfully. Redirecting to your dashboard...
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: '0.82rem', color: 'var(--text-muted)',
            }}>
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Redirecting in 3 seconds...
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/dashboard')}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 20 }}
            >
              Go to Dashboard now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading (waiting for session) ─────────────────────────────────────────
  if (!sessionReady) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16,
      }}>
        <Loader size={32} color="#6366F1" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Verifying reset link...</div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-left-content">
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
          <h1>Create a new password</h1>
          <p>Choose something strong that you haven't used before.</p>
          {[
            { icon: '🔒', text: 'At least 8 characters long' },
            { icon: '🔡', text: 'Mix of uppercase and lowercase' },
            { icon: '🔢', text: 'Include numbers or symbols' },
            { icon: '🚫', text: 'Avoid common passwords' },
          ].map(f => (
            <div key={f.text} className="auth-feature">
              <div className="auth-feature-icon">{f.icon}</div>
              <div className="auth-feature-text">{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
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

          {/* Lock icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
            border: '1px solid rgba(99,102,241,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Lock size={24} color="#6366F1" />
          </div>

          <div className="auth-title" style={{ marginBottom: 6 }}>Set new password</div>
          <div className="auth-subtitle" style={{ marginBottom: 24 }}>
            Create a strong new password for your CrowdIQ account.
          </div>

          {errorMsg && (
            <div className="auth-error" style={{ marginBottom: 16 }}>⚠️ {errorMsg}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* New Password */}
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <Lock size={15} className="input-icon" />
                <input
                  id="new-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i <= strength ? strengthColor : 'var(--border)',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: strengthColor, fontWeight: 600 }}>
                    {strengthLabel}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <Lock size={15} className="input-icon" />
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-enter your new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{
                    paddingRight: 40,
                    borderColor: confirm.length > 0
                      ? password === confirm ? 'var(--success, #10B981)' : '#EF4444'
                      : undefined,
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirm.length > 0 && (
                <div style={{
                  fontSize: '0.72rem', marginTop: 4, fontWeight: 600,
                  color: password === confirm ? '#10B981' : '#EF4444',
                }}>
                  {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>

            <button
              id="reset-password-submit"
              type="submit"
              disabled={status === 'loading' || password !== confirm || password.length < 8}
              className="btn btn-primary"
              style={{
                width: '100%', justifyContent: 'center', padding: '12px',
                fontSize: '0.92rem', marginTop: 4,
                opacity: (status === 'loading' || password !== confirm || password.length < 8) ? 0.65 : 1,
              }}
            >
              {status === 'loading'
                ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Updating password...</>
                : <><ArrowRight size={15} /> Update Password</>
              }
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span className="auth-link" style={{ fontSize: '0.82rem', cursor: 'pointer' }} onClick={() => navigate('/login')}>
              ← Back to sign in
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
