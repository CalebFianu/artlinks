import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth';
import '../landing.css';

function EyeShow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeHide() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid   = searchParams.get('uid');
  const token = searchParams.get('token');

  const [password,     setPassword]     = useState('');
  const [confirm,      setConfirm]      = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);
  const [invalidLink,  setInvalidLink]  = useState(false);

  useEffect(() => {
    if (!uid || !token) setInvalidLink(true);
  }, [uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(uid, token, password, confirm);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.toLowerCase().includes('invalid') || detail?.toLowerCase().includes('expired')) {
        setInvalidLink(true);
      } else {
        setError(detail || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="al-modal" style={{ position: 'relative', margin: 0 }}>

        {invalidLink ? (
          <>
            <div className="al-modal-hd">
              <div className="al-eyebrow">link expired</div>
              <h2 className="al-title">This link has<br/><em>expired.</em></h2>
              <p className="al-sub">Password reset links are only valid for 30 minutes.</p>
            </div>
            <Link to="/forgot-password" className="btn primary" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
              Request a new link →
            </Link>
            <p className="al-footnote">
              <Link to="/" className="al-switch-link" style={{ fontWeight: 400 }}>← Back to home</Link>
            </p>
          </>
        ) : success ? (
          <>
            <div className="al-modal-hd">
              <div className="al-eyebrow">all done</div>
              <h2 className="al-title">Password<br/><em>reset!</em></h2>
              <p className="al-sub">Your password has been updated successfully.</p>
            </div>
            <p className="al-footnote" style={{ marginTop: 0 }}>
              <Link to="/" className="al-switch-link">Go to login →</Link>
            </p>
          </>
        ) : (
          <>
            <div className="al-modal-hd">
              <div className="al-eyebrow">account recovery</div>
              <h2 className="al-title">Choose a new<br/><em>password</em></h2>
              <p className="al-sub">Must be at least 8 characters.</p>
            </div>

            <form className="al-login-fields" onSubmit={handleSubmit}>
              <div className="field" style={{ position: 'relative' }}>
                <label>New password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="New password"
                  autoComplete="new-password"
                  autoFocus
                  style={{ paddingRight: 42 }}
                />
                <button type="button" className="al-pw-toggle" onClick={() => setShowPw(v => !v)} aria-label="Toggle password">
                  {showPw ? <EyeHide /> : <EyeShow />}
                </button>
              </div>
              <div className="field" style={{ position: 'relative' }}>
                <label>Confirm password</label>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  style={{ paddingRight: 42 }}
                />
                <button type="button" className="al-pw-toggle" onClick={() => setShowConfirm(v => !v)} aria-label="Toggle confirm password">
                  {showConfirm ? <EyeHide /> : <EyeShow />}
                </button>
              </div>
              {error && <div className="al-error">{error}</div>}
              <button
                type="submit"
                className="btn primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Saving…' : 'Set new password →'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
