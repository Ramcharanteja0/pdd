import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertTriangle, Loader, ArrowLeft, ShieldCheck } from 'lucide-react';
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
    <div className="rp-page">
      <style>{`
        .rp-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }
        .rp-header {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%);
          height: 35vh;
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .rp-card {
          background: white;
          margin-top: -30px;
          border-radius: 28px 28px 0 0;
          padding: 32px 24px 48px;
          flex: 1;
          position: relative;
          z-index: 10;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
        }
        .rp-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          animation: rpPulse 4s infinite alternate ease-in-out;
        }
        @keyframes rpPulse {
          0% { transform: scale(0.95); opacity: 0.6; }
          100% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .rp-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .rp-input-wrap .rp-icon-left {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
          z-index: 1;
        }
        .rp-input-wrap input {
          width: 100%;
          min-height: 52px;
          padding: 14px 48px 14px 42px;
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          font-family: inherit;
          background: #f8fafc;
          color: var(--text-primary, #0f172a);
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .rp-input-wrap input:focus {
          border-color: #6366F1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          background: white;
        }
        .rp-input-wrap input::placeholder {
          color: #94a3b8;
        }
        .rp-toggle-pw {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted, #64748b);
          padding: 4px;
          display: flex;
          align-items: center;
        }
        .rp-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          margin-bottom: 8px;
          letter-spacing: 0.01em;
        }
        .rp-submit {
          width: 100%;
          min-height: 52px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
          color: white;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
        }
        .rp-submit:active {
          transform: scale(0.98);
        }
        .rp-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rp-error {
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.85rem;
          color: #DC2626;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rp-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--primary, #6366F1);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          background: none;
          border: none;
          font-family: inherit;
          padding: 0;
          transition: opacity 0.2s;
        }
        .rp-back:hover { opacity: 0.7; }

        /* ─── Desktop (768px+) ─── */
        @media (min-width: 768px) {
          .rp-page {
            align-items: center;
            justify-content: center;
          }
          .rp-header {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 45vh;
          }
          .rp-card {
            max-width: 460px;
            width: 100%;
            border-radius: 24px;
            margin-top: 5vh;
            margin-bottom: 40px;
            flex: none;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            padding: 44px 40px;
          }
        }
      `}</style>

      {/* Gradient Header */}
      <div className="rp-header">
        <div className="rp-circle" style={{ width: 300, height: 300, animationDelay: '0s' }}></div>
        <div className="rp-circle" style={{ width: 450, height: 450, animationDelay: '1s' }}></div>
        <div className="rp-circle" style={{ width: 600, height: 600, animationDelay: '2s' }}></div>

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

      {/* Card */}
      <div className="rp-card">

        {/* ── Invalid / Expired ── */}
        {status === 'invalid' && (
          <div className="fade-in" style={{ textAlign: 'center', maxWidth: 380, margin: '0 auto' }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(239,68,68,0.25)',
            }}>
              <AlertTriangle size={30} color="white" strokeWidth={2} />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              Reset Link Expired
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.9rem', lineHeight: 1.6 }}>
              This reset link has expired or was already used. Reset links are valid for 1 hour.
            </p>
            <button
              className="rp-submit"
              onClick={() => navigate('/login')}
            >
              <ArrowRight size={16} /> Request New Link
            </button>
          </div>
        )}

        {/* ── Success ── */}
        {status === 'success' && (
          <div className="fade-in" style={{ textAlign: 'center', maxWidth: 380, margin: '0 auto' }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
            }}>
              <CheckCircle size={30} color="white" strokeWidth={2} />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              Password Updated!
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.6 }}>
              Your password has been changed successfully. Redirecting you to the dashboard...
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: '0.85rem', color: 'var(--text-muted)',
            }}>
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Redirecting in 3 seconds...
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {status !== 'invalid' && status !== 'success' && (
          <div className="fade-in" style={{ maxWidth: 400, margin: '0 auto' }}>
            {/* Shield icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
              border: '1px solid rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <ShieldCheck size={24} color="#6366F1" />
            </div>

            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.3rem, 5vw, 1.6rem)', fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
              Set New Password
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', lineHeight: 1.5 }}>
              Create a strong new password for your CrowdIQ account.
            </p>

            {errorMsg && (
              <div className="rp-error">
                <AlertTriangle size={16} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* New Password */}
              <div style={{ marginBottom: 20 }}>
                <label className="rp-label">New Password</label>
                <div className="rp-input-wrap">
                  <Lock size={16} className="rp-icon-left" />
                  <input
                    id="new-password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button type="button" className="rp-toggle-pw" onClick={() => setShowPw(s => !s)}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength meter */}
                {password.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 4, borderRadius: 2,
                          background: i <= strength ? strengthColor : 'var(--border, #e2e8f0)',
                          transition: 'background 0.3s',
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: strengthColor, fontWeight: 700 }}>
                      {strengthLabel}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 28 }}>
                <label className="rp-label">Confirm Password</label>
                <div className="rp-input-wrap">
                  <Lock size={16} className="rp-icon-left" />
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" className="rp-toggle-pw" onClick={() => setShowConfirm(s => !s)}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirm.length > 0 && (
                  <div style={{ fontSize: '0.75rem', marginTop: 8, fontWeight: 700, color: password === confirm ? '#10B981' : '#EF4444' }}>
                    {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                id="reset-password-submit"
                type="submit"
                disabled={status === 'loading' || password !== confirm || password.length < 8}
                className="rp-submit"
              >
                {status === 'loading' ? (
                  <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</>
                ) : (
                  <><ArrowRight size={16} /> Update Password</>
                )}
              </button>
            </form>

            {/* Security note */}
            <div style={{
              marginTop: 20, padding: '12px 16px',
              background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
              borderRadius: 12, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6,
            }}>
              🔒 Use a mix of <strong>uppercase</strong>, <strong>numbers</strong>, and <strong>symbols</strong> for a strong password.
            </div>

            {/* Back link */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="rp-back" onClick={() => navigate('/login')}>
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
