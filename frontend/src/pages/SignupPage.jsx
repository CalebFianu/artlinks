import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkUsername } from '../api/auth';

export default function SignupPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | string (error)
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  // Debounced username check
  useEffect(() => {
    if (!username.trim() || username.length < 3) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await checkUsername(username.trim());
        setUsernameStatus(data.available ? 'available' : (data.error || 'Username already taken.'));
      } catch {
        setUsernameStatus(null);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [username]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (usernameStatus !== 'available') { setError('Please choose an available username.'); return; }

    setLoading(true);
    setError('');
    try {
      await register(email.trim(), username.trim(), password, confirm);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? first[0] : String(first));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="dot" />
          artlinks
        </div>

        <div className="auth-heading">
          <div className="page-eyebrow" style={{ marginBottom: 10 }}>get started</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1.05, marginBottom: 4 }}>
            Create your<br /><em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>account</em>
          </h2>
        </div>

        <form onSubmit={submit} style={{ marginTop: 28 }}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="field">
            <label>
              Username
              {usernameStatus === 'checking' && (
                <span className="mono text-mute" style={{ fontSize: 11, marginLeft: 8 }}>checking…</span>
              )}
              {usernameStatus === 'available' && (
                <span className="mono" style={{ fontSize: 11, marginLeft: 8, color: 'var(--accent-ink)' }}>✓ available</span>
              )}
              {usernameStatus && usernameStatus !== 'checking' && usernameStatus !== 'available' && (
                <span className="mono" style={{ fontSize: 11, marginLeft: 8, color: '#d9534f' }}>{usernameStatus}</span>
              )}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setError(''); }}
              placeholder="your-username"
              autoComplete="username"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div className="field" style={{ position: 'relative' }}>
            <label>Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              style={{ paddingRight: 44 }}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="auth-pw-toggle">
              {showPw ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C6.5 20 2 12 2 12a18.87 18.87 0 0 1 2.06-2.94M9.9 4.24A9.72 9.72 0 0 1 12 4c5.5 0 10 8 10 8a18.88 18.88 0 0 1-1.32 1.94M1 1l22 22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <div className="field" style={{ position: 'relative' }}>
            <label>Confirm password</label>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete="new-password"
              style={{ paddingRight: 44 }}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} className="auth-pw-toggle">
              {showConfirm ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C6.5 20 2 12 2 12a18.87 18.87 0 0 1 2.06-2.94M9.9 4.24A9.72 9.72 0 0 1 12 4c5.5 0 10 8 10 8a18.88 18.88 0 0 1-1.32 1.94M1 1l22 22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
