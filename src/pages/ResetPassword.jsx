import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertTriangle, Loader, ArrowLeft } from 'lucide-react';
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

  // Supabase recovery token setup
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // If no session is detected within 4s, mark the link as invalid/expired
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
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. The link may have expired.');
      setStatus('error');
    }
  };

  // Loading view while verifying recovery link
  if (!sessionReady && status !== 'invalid') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', height: '100dvh', background: '#f8fafc', flexDirection: 'column', gap: 16,
      }}>
        <Loader size={36} color="#6366F1" style={{ animation: 'spin 1.5s linear infinite' }} />
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verifying reset link...</div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          min-height: 100vh;
          min-height: 100dvh;
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

      {/* Shared Gradient Header with Circles */}
      <div className="login-header">
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
        {status === 'invalid' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(239,68,68,0.25)',
            }}>
              <AlertTriangle size={28} color="white" strokeWidth={2} />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              Reset Link Expired
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.5 }}>
              This reset link has expired or was already used. Reset links are valid for 1 hour.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ width: '100%', minHeight: 48, borderRadius: 12, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Request new link
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
            }}>
              <CheckCircle size={28} color="white" strokeWidth={2} />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              Password Updated!
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Your password has been changed successfully. Redirecting you to the dashboard...
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: '0.85rem', color: 'var(--text-muted)',
            }}>
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Redirecting...
            </div>
          </div>
        )}

        {status !== 'invalid' && status !== 'success' && (
          <div className="fade-in">
            {/* Header lock icon */}
            <div style={{
              width: 50, height: 50, borderRadius: 12,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Lock size={22} color="#6366F1" />
            </div>

            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
              Set New Password
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.88rem' }}>
              Create a strong new password for your CrowdIQ account.
            </p>

            {errorMsg && (
              <div className="auth-error" style={{ marginBottom: 16 }}>⚠️ {errorMsg}</div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Password */}
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>New Password</label>
                <div className="input-icon-wrap" style={{ position: 'relative' }}>
                  <Lock size={16} className="input-icon" />
                  <input
                    id="new-password"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ minHeight: 48, paddingLeft: 38, paddingRight: 40, borderRadius: 10 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength */}
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
                    <div style={{ fontSize: '0.72rem', color: strengthColor, fontWeight: 700 }}>
                      {strengthLabel}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Confirm Password</label>
                <div className="input-icon-wrap" style={{ position: 'relative' }}>
                  <Lock size={16} className="input-icon" />
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter your new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    style={{ minHeight: 48, paddingLeft: 38, paddingRight: 40, borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm.length > 0 && (
                  <div style={{ fontSize: '0.72rem', marginTop: 6, fontWeight: 700, color: password === confirm ? '#10B981' : '#EF4444' }}>
                    {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                id="reset-password-submit"
                type="submit"
                disabled={status === 'loading' || password !== confirm || password.length < 8}
                className="btn btn-primary"
                style={{
                  width: '100%', minHeight: 50, borderRadius: 12, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem',
                  opacity: (status === 'loading' || password !== confirm || password.length < 8) ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  border: 'none',
                }}
              >
                {status === 'loading' ? (
                  <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</>
                ) : (
                  <><ArrowRight size={16} /> Update Password</>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <span
                className="auth-link"
                style={{ fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 600 }}
                onClick={() => navigate('/login')}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
