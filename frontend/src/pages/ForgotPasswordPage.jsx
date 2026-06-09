import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth';
import '../landing.css';

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="al-modal" style={{ position: 'relative', margin: 0 }}>
        <div className="al-modal-hd">
          <div className="al-eyebrow">account recovery</div>
          <h2 className="al-title">Forgot your<br/><em>password?</em></h2>
          <p className="al-sub">Enter your email and we'll send you a reset link.</p>
        </div>

        {submitted ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 20 }}>
              Check your inbox — if that email is registered, a reset link is on its way. The link expires in 30 minutes.
            </p>
            <p className="al-footnote">
              <Link to="/" className="al-switch-link">← Back to home</Link>
            </p>
          </>
        ) : (
          <>
            <form className="al-login-fields" onSubmit={handleSubmit}>
              <div className="field">
                <label>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {error && <div className="al-error">{error}</div>}
              <button
                type="submit"
                className="btn primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Sending…' : 'Send reset link →'}
              </button>
            </form>

            <p className="al-footnote">
              <Link to="/" className="al-switch-link" style={{ fontWeight: 400 }}>← Back to home</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
