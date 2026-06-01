import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Invalid credentials. Please try again.';
      setError(detail);
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
          <div className="page-eyebrow" style={{ marginBottom: 10 }}>welcome back</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1.05, marginBottom: 4 }}>
            Sign in to your<br /><em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>workspace</em>
          </h2>
        </div>

        <form onSubmit={submit} style={{ marginTop: 28 }}>
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="your-username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="field" style={{ position: 'relative' }}>
            <label>Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="auth-pw-toggle"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
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

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="auth-link">Create one</Link>
        </div>
      </div>
    </div>
  );
}
