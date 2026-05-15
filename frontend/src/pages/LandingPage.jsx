import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTweaks } from '../context/TweaksContext';
import { checkUsername as apiCheckUsername, searchUsers } from '../api/auth';
import '../landing.css';

const CREATORS = [
  { name: 'Mina Okafor',  handle: 'mina',  initial: 'M', bg: 'var(--accent-soft)' },
  { name: 'Tomás Reyes',  handle: 'tomas', initial: 'T', bg: 'oklch(0.93 0.04 60)' },
  { name: 'Yuki Tanaka',  handle: 'yuki',  initial: 'Y', bg: 'oklch(0.93 0.04 300)' },
  { name: 'Sara Bloom',   handle: 'sara',  initial: 'S', bg: 'oklch(0.93 0.04 140)' },
  { name: 'León Mercer',  handle: 'leon',  initial: 'L', bg: 'oklch(0.93 0.04 20)' },
];

const CAL_ACTIVE = new Set([1,2,4,5,8,9,10,14,15,16,17,21,22,25,26,27,28]);
const CAL_TODAY  = 28;

export default function LandingPage() {
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const { theme, toggleTheme } = useTweaks();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  // ── Modal state ──
  const [modal, setModal] = useState(null); // null | 'login' | 'signup'

  // Lock body scroll when modal open
  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [modal]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Search state ──
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef   = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setSearchOpen(true);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await searchUsers(val.trim());
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  // ── Login form ──
  const [loginUser,    setLoginUser]    = useState('');
  const [loginPw,      setLoginPw]      = useState('');
  const [loginShowPw,  setLoginShowPw]  = useState(false);
  const [loginError,   setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (!loginUser.trim() || !loginPw) { setLoginError('Please fill in all fields.'); return; }
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(loginUser.trim(), loginPw);
      // AuthContext navigates to /dashboard on success
    } catch (err) {
      setLoginError(err.response?.data?.detail || 'Invalid credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Reset login form when modal opens
  useEffect(() => {
    if (modal === 'login') { setLoginUser(''); setLoginPw(''); setLoginError(''); setLoginShowPw(false); }
  }, [modal]);

  // ── Signup form ──
  const [suEmail,       setSuEmail]      = useState('');
  const [suUsername,    setSuUsername]   = useState('');
  const [suPw,          setSuPw]         = useState('');
  const [suConfirm,     setSuConfirm]    = useState('');
  const [suShowPw,      setSuShowPw]     = useState(false);
  const [suShowConfirm, setSuShowConfirm]= useState(false);
  const [suUxStatus,    setSuUxStatus]   = useState(''); // '' | 'checking' | 'ok' | 'taken' | 'short' | 'invalid'
  const [suError,       setSuError]      = useState('');
  const [suLoading,     setSuLoading]    = useState(false);
  const [avatarSrc,     setAvatarSrc]    = useState(null);
  const avatarInputRef = useRef(null);

  const avatarInitial = (suUsername || suEmail || '?')[0].toUpperCase();

  // Reset signup form when modal opens
  useEffect(() => {
    if (modal === 'signup') {
      setSuEmail(''); setSuUsername(''); setSuPw(''); setSuConfirm('');
      setSuShowPw(false); setSuShowConfirm(false); setSuUxStatus(''); setSuError('');
      setAvatarSrc(null);
    }
  }, [modal]);

  // Debounced username availability check
  const usernameTimer = useRef(null);
  const handleUsernameChange = useCallback((val) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSuUsername(cleaned);
    setSuError('');
    clearTimeout(usernameTimer.current);
    if (!cleaned) { setSuUxStatus(''); return; }
    if (!/^[a-z0-9-]+$/.test(cleaned)) { setSuUxStatus('invalid'); return; }
    if (cleaned.length < 3) { setSuUxStatus('short'); return; }
    setSuUxStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await apiCheckUsername(cleaned);
        setSuUxStatus(data.available ? 'ok' : 'taken');
      } catch {
        setSuUxStatus('');
      }
    }, 400);
  }, []);

  const usernameStatusChar = {
    ok:       { char: '✓', color: 'oklch(0.55 0.14 145)' },
    taken:    { char: '✕', color: 'oklch(0.55 0.18 25)'  },
    short:    { char: '…', color: 'var(--ink-mute)'       },
    invalid:  { char: '✕', color: 'oklch(0.55 0.18 25)'  },
    checking: { char: '…', color: 'var(--ink-mute)'       },
  }[suUxStatus] || null;

  const handleSignupSubmit = async (e) => {
    e?.preventDefault();
    if (!suEmail.trim())     { setSuError('Please enter your email address.'); return; }
    if (!suUsername.trim())  { setSuError('Please choose a username.'); return; }
    if (suUxStatus === 'taken')   { setSuError('That username is already taken.'); return; }
    if (suUxStatus === 'short')   { setSuError('Username must be at least 3 characters.'); return; }
    if (suUxStatus === 'invalid') { setSuError('Username: lowercase, numbers and hyphens only.'); return; }
    if (!suPw)               { setSuError('Please enter a password.'); return; }
    if (suPw.length < 8)     { setSuError('Password must be at least 8 characters.'); return; }
    if (suPw !== suConfirm)  { setSuError('Passwords do not match.'); return; }
    setSuLoading(true);
    setSuError('');
    try {
      await register(suEmail.trim(), suUsername, suPw, suConfirm);
      // AuthContext navigates to /dashboard on success
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.email?.[0] || d?.username?.[0] || d?.password?.[0] || d?.detail || 'Registration failed.';
      setSuError(msg);
    } finally {
      setSuLoading(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const comingSoon = () => {
    // Social auth buttons — placeholder until OAuth client IDs are configured
    alert('Social sign-in coming soon.');
  };

  if (isLoading) return null;

  return (
    <>
      {/* ── NAV ── */}
      <nav className="lp-nav">
        <span className="brand">
          artlinks<span className="dot" style={{ marginLeft: 4 }} />
        </span>
        <div className="nav-links">
          <a href="#features" className="nav-text-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Features</a>
          <a href="#creators" className="nav-text-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Creators</a>
          <button
            className="btn small ghost theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            style={{ marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13 }}
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
            <span className="lp-nav-theme-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
          <button onClick={() => setModal('login')}  className="btn small ghost" style={{ marginLeft: 4 }}>Log in</button>
          <button onClick={() => setModal('signup')} className="btn small primary">Sign up</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="la-bg" aria-hidden="true">
          <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="120" x2="1200" y2="120" stroke="currentColor" strokeWidth="0.8" opacity="0.06"/>
            <line x1="0" y1="200" x2="1200" y2="200" stroke="currentColor" strokeWidth="0.8" opacity="0.06"/>
            <line x1="0" y1="280" x2="1200" y2="280" stroke="currentColor" strokeWidth="0.8" opacity="0.06"/>
            <line x1="0" y1="360" x2="1200" y2="360" stroke="currentColor" strokeWidth="0.8" opacity="0.06"/>
            <line x1="0" y1="440" x2="1200" y2="440" stroke="currentColor" strokeWidth="0.8" opacity="0.06"/>
            <line x1="0" y1="520" x2="1200" y2="520" stroke="currentColor" strokeWidth="0.8" opacity="0.06"/>
            <line x1="0" y1="600" x2="1200" y2="600" stroke="currentColor" strokeWidth="0.8" opacity="0.06"/>
            <line x1="52" y1="0" x2="52" y2="700" stroke="currentColor" strokeWidth="1" strokeDasharray="3 8" opacity="0.12"/>
            <circle cx="1080" cy="80" r="120" stroke="currentColor" strokeWidth="1" opacity="0.05"/>
            <circle cx="1080" cy="80" r="80" stroke="currentColor" strokeWidth="0.7" opacity="0.07" strokeDasharray="4 6"/>
            <line x1="960" y1="520" x2="980" y2="540" stroke="currentColor" strokeWidth="1.2" opacity="0.1"/>
            <line x1="980" y1="520" x2="960" y2="540" stroke="currentColor" strokeWidth="1.2" opacity="0.1"/>
            <circle cx="80" cy="580" r="2.5" fill="currentColor" opacity="0.08"/>
            <circle cx="92" cy="572" r="1.8" fill="currentColor" opacity="0.06"/>
            <circle cx="100" cy="584" r="2" fill="currentColor" opacity="0.07"/>
            <circle cx="86" cy="592" r="1.5" fill="currentColor" opacity="0.05"/>
            <path d="M 68 160 L 56 160 L 56 340 L 68 340" stroke="currentColor" strokeWidth="1" opacity="0.1" strokeLinecap="round"/>
            <line x1="0" y1="40" x2="40" y2="0" stroke="currentColor" strokeWidth="0.8" opacity="0.07"/>
            <line x1="0" y1="80" x2="80" y2="0" stroke="currentColor" strokeWidth="0.8" opacity="0.07"/>
            <line x1="0" y1="120" x2="120" y2="0" stroke="currentColor" strokeWidth="0.8" opacity="0.05"/>
            <line x1="1140" y1="300" x2="1148" y2="308" stroke="currentColor" strokeWidth="1.2" opacity="0.1"/>
            <line x1="1148" y1="300" x2="1140" y2="308" stroke="currentColor" strokeWidth="1.2" opacity="0.1"/>
            <line x1="1144" y1="297" x2="1144" y2="311" stroke="currentColor" strokeWidth="1.2" opacity="0.1"/>
            <line x1="1137" y1="304" x2="1151" y2="304" stroke="currentColor" strokeWidth="1.2" opacity="0.1"/>
          </svg>
        </div>

        <div className="hero-left">
          <p className="hero-eyebrow">link management for everybody</p>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <h1>All your links,<br/><em>beautifully</em><br/>organised.</h1>
            <svg style={{ position: 'absolute', bottom: -8, left: 0, pointerEvents: 'none', opacity: 0.18 }} width="260" height="14" viewBox="0 0 260 14" fill="none">
              <path d="M2 10 Q65 2 130 8 Q195 14 258 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="hero-sub" style={{ position: 'relative' }}>
            artlinks gives independent creators one place to manage, feature, and track every link — from essays to shop drops to podcast episodes.
            <svg style={{ position: 'absolute', right: -44, top: 0, opacity: 0.18, pointerEvents: 'none' }} width="32" height="72" viewBox="0 0 32 72" fill="none">
              <line x1="16" y1="0" x2="16" y2="52" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4"/>
              <path d="M8 48 Q16 62 24 48" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <circle cx="16" cy="66" r="3" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </p>
          <div className="hero-actions">
            <button onClick={() => setModal('signup')} className="btn primary">Get started →</button>
            <a href="#features" className="btn ghost">See how it works</a>
          </div>

          {/* Search */}
          <div className="hero-search" ref={searchRef} style={{ position: 'relative' }}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-mute)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="find a creator by username…"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
            />
            <button
              className="search-go"
              onClick={() => { if (searchQuery.trim()) { navigate(`/${searchQuery.trim()}`); setSearchOpen(false); } }}
              aria-label="Search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            {searchOpen && searchQuery.trim() && (
              <div className="search-results">
                {searchLoading ? (
                  <div className="sr-item" style={{ color: 'var(--ink-mute)', fontStyle: 'italic' }}>Searching…</div>
                ) : searchResults.length === 0 ? (
                  <div className="sr-item" style={{ color: 'var(--ink-mute)', fontStyle: 'italic' }}>
                    No creators found for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : searchResults.map((c) => (
                  <button key={c.username} className="sr-item" onClick={() => { navigate(`/${c.username}`); setSearchOpen(false); }}>
                    <div className="sr-avatar" style={{ background: 'var(--accent-soft)' }}>
                      {c.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="sr-name">@{c.username}</div>
                      <div className="sr-handle">artlinks.to/{c.username}</div>
                    </div>
                    <span className="sr-arrow">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ opacity: 0.25 }}>
              <path d="M1 5 Q5 1 9 5 Q13 9 17 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-hand)', fontSize: 15, color: 'var(--ink-mute)' }}>search by username</span>
          </div>
          <p className="search-hint">
            Try:{' '}
            {['mina','tomas','yuki'].map((u, i) => (
              <span key={u}>
                <span style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  onClick={() => { setSearchQuery(u); setSearchOpen(true); }}>@{u}</span>
                {i < 2 && ' · '}
              </span>
            ))}
          </p>
        </div>

        <div className="hero-visual">
          <div className="mini-profile">
            <div className="mini-profile-head">
              <div className="mini-avatar">M</div>
              <div>
                <div className="mini-name">Mina Okafor</div>
                <div className="mini-handle">@mina · 6 links featured</div>
              </div>
            </div>
            <div className="mini-links">
              <div className="mini-link feat">
                <div className="mini-link-icon">✺</div>
                New essay — On making things slowly
                <span className="arrow">↗</span>
              </div>
              <div className="mini-link">
                <div className="mini-link-icon">◇</div>
                Latest zine: FOOTNOTES vol. 7
                <span className="arrow">↗</span>
              </div>
              <div className="mini-link">
                <div className="mini-link-icon">◉</div>
                Episode 48: Drawing from memory
                <span className="arrow">↗</span>
              </div>
              <div className="mini-link">
                <div className="mini-link-icon">♪</div>
                Field recordings, March
                <span className="arrow">↗</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROOF STRIP ── */}
      <div className="proof-strip">
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 1200 140" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
          <line x1="0" y1="28" x2="1200" y2="28" stroke="currentColor" strokeWidth="0.7" opacity="0.07"/>
          <line x1="0" y1="56" x2="1200" y2="56" stroke="currentColor" strokeWidth="0.7" opacity="0.07"/>
          <line x1="0" y1="84" x2="1200" y2="84" stroke="currentColor" strokeWidth="0.7" opacity="0.07"/>
          <line x1="0" y1="112" x2="1200" y2="112" stroke="currentColor" strokeWidth="0.7" opacity="0.07"/>
          <circle cx="60" cy="70" r="28" stroke="currentColor" strokeWidth="0.8" opacity="0.06" strokeDasharray="3 5"/>
          <circle cx="1140" cy="70" r="28" stroke="currentColor" strokeWidth="0.8" opacity="0.06" strokeDasharray="3 5"/>
        </svg>
        {[['100+','Creators'],['2.3k','Links managed'],['2.4M','Clicks tracked'],['250+','Collections Created']].map(([num, label]) => (
          <div key={label} className="proof-cell">
            <div className="p-num">{num}</div>
            <div className="p-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section className="lp-section" id="features">
        <svg style={{ position: 'absolute', top: 0, right: 0, width: 220, height: 220, pointerEvents: 'none', opacity: 0.07 }} viewBox="0 0 220 220" fill="none" aria-hidden="true">
          <circle cx="200" cy="20" r="80" stroke="currentColor" strokeWidth="1"/>
          <circle cx="200" cy="20" r="50" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3 5"/>
          <circle cx="200" cy="20" r="22" stroke="currentColor" strokeWidth="0.6"/>
        </svg>
        <div className="lp-section-hd">
          <svg width="40" height="24" viewBox="0 0 40 24" fill="none" style={{ marginBottom: 10, opacity: 0.35 }}>
            <line x1="0" y1="12" x2="32" y2="12" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="37" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          <p className="eyebrow">What's inside</p>
          <h2>Built for the way<br/>creators actually work.</h2>
          <p>Every screen is designed around one idea: your links should feel like your work — considered, curated, and easy to share.</p>
          <div className="bracket-note" style={{ marginTop: 14, fontSize: 15 }}>custom features, one calm workspace</div>
        </div>
        <div className="feature-grid">
          {/* Link management */}
          <div className="feature-card wide" style={{ overflow: 'hidden' }}>
            <svg style={{ position: 'absolute', top: 0, right: 0, opacity: 0.12, pointerEvents: 'none' }} width="80" height="80" viewBox="0 0 80 80" fill="none">
              <line x1="80" y1="0" x2="0" y2="80" stroke="currentColor" strokeWidth="0.8"/>
              <line x1="80" y1="20" x2="20" y2="80" stroke="currentColor" strokeWidth="0.8"/>
              <line x1="80" y1="40" x2="40" y2="80" stroke="currentColor" strokeWidth="0.8"/>
            </svg>
            <div className="fc-label">Link management</div>
            <h3>Drag, organise, feature.</h3>
            <p>Every link has a title, URL, collection tag, and click count. Drag to reorder. Feature up to 8 on your public page.</p>
            <div className="fc-visual">
              <div className="snippet-row">
                {[['New essay — On making things slowly','featured','2,481'],['Latest zine: FOOTNOTES vol. 7','shop','944'],['Episode 48: Drawing from memory','podcast','3,120']].map(([title, tag, count]) => (
                  <div key={title} className="snippet-link-row">
                    <span className="drag-handle">⠿</span>
                    <span style={{ fontWeight: 500 }}>{title}</span>
                    <span className="tag" style={{ fontSize: 10 }}>{tag}</span>
                    <span className="s-pill">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Collections */}
          <div className="feature-card" style={{ overflow: 'hidden' }}>
            <svg style={{ position: 'absolute', top: 8, right: 8, opacity: 0.12, pointerEvents: 'none' }} width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="4" width="40" height="40" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4"/>
              <rect x="14" y="14" width="20" height="20" stroke="currentColor" strokeWidth="0.8"/>
            </svg>
            <div className="fc-label">Collections</div>
            <h3>Group by project,<br/>category, or mood.</h3>
            <p>Shop, writing, music, press — keep each body of work together and toggle visibility any time.</p>
            <div className="fc-visual" style={{ marginTop: 'auto' }}>
              <div className="snippet-collection-grid">
                {[['Writing','32','a'],['Shop','14',''],['Podcast','47',''],['Music','18','']].map(([name, count, cls]) => (
                  <div key={name} className={`snippet-coll${cls ? ` ${cls}` : ''}`}>
                    {name}<div className="s-count">{count} links</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Calendar */}
          <div className="feature-card" style={{ overflow: 'hidden' }}>
            <svg style={{ position: 'absolute', top: 0, right: 0, opacity: 0.1, pointerEvents: 'none' }} width="70" height="70" viewBox="0 0 70 70" fill="none">
              <line x1="0" y1="0" x2="70" y2="70" stroke="currentColor" strokeWidth="0.8"/>
              <line x1="0" y1="20" x2="50" y2="70" stroke="currentColor" strokeWidth="0.6"/>
              <line x1="20" y1="0" x2="70" y2="50" stroke="currentColor" strokeWidth="0.6"/>
            </svg>
            <div className="fc-label">Daily log</div>
            <h3>A publishing calendar,<br/>built in.</h3>
            <p>Log links by date. See your output at a glance.</p>
            <div className="fc-visual" style={{ marginTop: 'auto' }}>
              <div className="snippet-cal">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-mute)' }}>April 2026</div>
                <div className="s-cal-grid">
                  {Array.from({ length: CAL_TODAY }, (_, i) => i + 1).map((d) => (
                    <div key={d} className={`s-cal-day${CAL_ACTIVE.has(d) ? ' has' : ''}${d === CAL_TODAY ? ' today-d' : ''}`}>{d}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Public profile */}
          <div className="feature-card ink-bg wide" style={{ overflow: 'hidden' }}>
            <svg style={{ position: 'absolute', bottom: -10, right: -10, pointerEvents: 'none' }} width="160" height="120" viewBox="0 0 160 120" fill="none">
              <circle cx="140" cy="100" r="70" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
              <circle cx="140" cy="100" r="45" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="4 6"/>
              <circle cx="140" cy="100" r="22" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8"/>
            </svg>
            <div className="fc-label">Public profile</div>
            <h3>Your page. Your rules.</h3>
            <p>A beautiful, fast public page that shows exactly what you want — no algorithm, no clutter. Share one link everywhere.</p>
            <div className="fc-visual" style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 16px', border: '1.2px solid oklch(0.35 0.04 240)', borderRadius: 999, color: 'oklch(0.55 0.04 240)' }}>
                  artlinks.to/<span style={{ color: 'oklch(0.75 0.06 240)' }}>mina</span>
                </div>
                <button onClick={() => setModal('signup')} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'oklch(0.65 0.06 240)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px dashed oklch(0.4 0.04 240)' }}>
                  get your page →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CREATOR SPOTLIGHT ── */}
      <section className="lp-section" id="creators">
        <svg style={{ position: 'absolute', top: 0, right: 60, width: 100, height: 60, pointerEvents: 'none', opacity: 0.1 }} viewBox="0 0 100 60" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1"/>
          <circle cx="30" cy="20" r="2" fill="currentColor" opacity="0.5"/>
          <circle cx="50" cy="8" r="3.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
          <circle cx="70" cy="18" r="2" fill="currentColor" opacity="0.5"/>
          <circle cx="90" cy="6" r="3" stroke="currentColor" strokeWidth="1"/>
          <line x1="20" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4"/>
          <line x1="0" y1="52" x2="100" y2="52" stroke="currentColor" strokeWidth="0.6" opacity="0.5"/>
        </svg>
        <div className="lp-section-hd">
          <svg width="40" height="24" viewBox="0 0 40 24" fill="none" style={{ marginBottom: 10, opacity: 0.35 }}>
            <line x1="0" y1="12" x2="32" y2="12" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="37" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          <p className="eyebrow">Creators on artlinks</p>
          <h2>Find your people.</h2>
          <p>Search any username above to find a creator's page. Here are a few to get started.</p>
          <div className="bracket-note" style={{ marginTop: 14, fontSize: 15 }}>
            <svg width="10" height="32" viewBox="0 0 10 32" fill="none"><path d="M8 1 L2 1 L2 31 L8 31" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            real creators, real work
          </div>
        </div>
        <div className="creator-grid">
          {[
            { name: 'Mina Okafor', handle: 'mina',  initial: 'M', bg: 'var(--accent-soft)',       bio: 'Essay writer, zine maker, slow thinker. New piece out every Thursday.',            tags: ['writing','shop','podcast'] },
            { name: 'Tomás Reyes', handle: 'tomas', initial: 'T', bg: 'oklch(0.93 0.04 60)',      bio: 'Photographer and bookmaker. Studio in Lisbon. Prints available on demand.',        tags: ['photography','print','shop'] },
            { name: 'Yuki Tanaka', handle: 'yuki',  initial: 'Y', bg: 'oklch(0.93 0.04 300)',     bio: 'Ambient composer and sound recordist. 4-hour sets, field recordings, calm.',        tags: ['music','ambient','field recordings'] },
          ].map((c) => (
            <div key={c.handle} className="creator-card" onClick={() => navigate(`/${c.handle}`)}>
              <div className="cc-top">
                <div className="cc-avatar" style={{ background: c.bg }}>{c.initial}</div>
                <div>
                  <div className="cc-name">{c.name}</div>
                  <div className="cc-handle">@{c.handle}</div>
                </div>
              </div>
              <p className="cc-bio">{c.bio}</p>
              <div className="cc-tags">{c.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta-bg" />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1200 440" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
          <line x1="0" y1="60" x2="1200" y2="60" stroke="white" strokeWidth="0.5" opacity="0.05"/>
          <line x1="0" y1="120" x2="1200" y2="120" stroke="white" strokeWidth="0.5" opacity="0.05"/>
          <line x1="0" y1="180" x2="1200" y2="180" stroke="white" strokeWidth="0.5" opacity="0.05"/>
          <line x1="0" y1="240" x2="1200" y2="240" stroke="white" strokeWidth="0.5" opacity="0.05"/>
          <line x1="0" y1="300" x2="1200" y2="300" stroke="white" strokeWidth="0.5" opacity="0.05"/>
          <line x1="0" y1="360" x2="1200" y2="360" stroke="white" strokeWidth="0.5" opacity="0.05"/>
          <line x1="80" y1="0" x2="80" y2="440" stroke="white" strokeWidth="0.7" strokeDasharray="3 9" opacity="0.07"/>
          <line x1="1120" y1="0" x2="1120" y2="440" stroke="white" strokeWidth="0.7" strokeDasharray="3 9" opacity="0.07"/>
          <path d="M0 0 Q200 0 200 200" stroke="white" strokeWidth="0.8" opacity="0.06"/>
          <path d="M1200 0 Q1000 0 1000 200" stroke="white" strokeWidth="0.8" opacity="0.06"/>
          <ellipse cx="600" cy="460" rx="280" ry="60" stroke="white" strokeWidth="0.8" opacity="0.05" strokeDasharray="5 8"/>
        </svg>
        <span className="cta-hand">it only takes a minute →</span>
        <h2>Your links deserve<br/><em>one good home.</em></h2>
        <p>Free to start. No algorithm. Just your links, beautifully organised.</p>
        <div className="cta-actions">
          <button onClick={() => setModal('signup')} className="btn primary">Get started — it's free</button>
          <button onClick={() => setModal('login')} className="btn">Log in</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <span className="brand" style={{ textDecoration: 'none', color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '-0.02em' }}>
          artlinks<span className="dot" style={{ marginLeft: 4, display: 'inline-block', width: 6, height: 6, background: 'var(--ink)', borderRadius: '50%', verticalAlign: 'middle' }}/>
        </span>
        <div className="lp-footer-links">
          <a href="#">About</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <button onClick={() => setModal('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-mute)', padding: 0 }}>App</button>
        </div>
      </footer>

      {/* ── LOGIN MODAL ── */}
      {modal === 'login' && (
        <div className="al-backdrop" onClick={() => setModal(null)}>
          <div className="al-modal" onClick={(e) => e.stopPropagation()}>
            <svg className="al-modal-art" viewBox="0 0 480 560" fill="none" aria-hidden="true">
              {[56,112,168,224,280,336,392,448,504].map(y => (
                <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="currentColor" strokeWidth="0.7" opacity="0.07"/>
              ))}
              <line x1="32" y1="0" x2="32" y2="560" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 8" opacity="0.12"/>
              <circle cx="440" cy="40" r="60" stroke="currentColor" strokeWidth="0.8" opacity="0.06"/>
              <circle cx="440" cy="40" r="35" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.08"/>
              <circle cx="40" cy="520" r="50" stroke="currentColor" strokeWidth="0.8" opacity="0.06" strokeDasharray="3 6"/>
              <line x1="392" y1="260" x2="400" y2="268" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
              <line x1="400" y1="260" x2="392" y2="268" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
              <path d="M 420 140 L 432 140 L 432 320 L 420 320" stroke="currentColor" strokeWidth="1" opacity="0.08" strokeLinecap="round"/>
              <circle cx="56" cy="88" r="2" fill="currentColor" opacity="0.08"/>
              <circle cx="66" cy="80" r="1.5" fill="currentColor" opacity="0.06"/>
              <circle cx="74" cy="90" r="1.8" fill="currentColor" opacity="0.07"/>
            </svg>

            <button className="al-close" onClick={() => setModal(null)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="al-modal-hd">
              <div className="al-eyebrow">welcome back</div>
              <h2 className="al-title">Log in to<br/><em>artlinks</em></h2>
              <p className="al-sub">Sign in with a provider or your username.</p>
            </div>

            <div className="al-providers">
              {[
                { name: 'Google', icon: <GoogleIcon /> },
                { name: 'Microsoft', icon: <MicrosoftIcon /> },
              ].map(({ name, icon }) => (
                <button key={name} className="al-provider-btn" onClick={comingSoon}>
                  <span className="al-provider-icon">{icon}</span>
                  <span className="al-provider-name">Continue with {name}</span>
                  <svg className="al-provider-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>

            <div className="al-divider">
              <span /><span className="al-divider-txt">or</span><span />
            </div>

            <form className="al-login-fields" onSubmit={handleLoginSubmit}>
              <div className="field">
                <label>Username</label>
                <input type="text" value={loginUser} onChange={(e) => { setLoginUser(e.target.value); setLoginError(''); }} placeholder="your-username" autoComplete="username" autoFocus />
              </div>
              <div className="field" style={{ position: 'relative' }}>
                <label>Password</label>
                <input type={loginShowPw ? 'text' : 'password'} value={loginPw} onChange={(e) => { setLoginPw(e.target.value); setLoginError(''); }} placeholder="Password" autoComplete="current-password" style={{ paddingRight: 42 }} />
                <button type="button" className="al-pw-toggle" onClick={() => setLoginShowPw(v => !v)} aria-label="Toggle password">
                  {loginShowPw ? <EyeHide /> : <EyeShow />}
                </button>
              </div>
              {loginError && <div className="al-error">{loginError}</div>}
              <button type="submit" className="btn primary" disabled={loginLoading} style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loginLoading ? 0.7 : 1 }}>
                {loginLoading ? 'Signing in…' : 'Continue →'}
              </button>
            </form>

            <p className="al-footnote">
              Don't have an account?{' '}
              <button className="al-switch-link" onClick={() => setModal('signup')}>Sign up →</button>
            </p>
          </div>
        </div>
      )}

      {/* ── SIGNUP MODAL ── */}
      {modal === 'signup' && (
        <div className="al-backdrop" onClick={() => setModal(null)}>
          <div className="al-modal" onClick={(e) => e.stopPropagation()}>
            <svg className="al-modal-art" viewBox="0 0 480 660" fill="none" aria-hidden="true">
              {[56,112,168,224,280,336,392,448,504,560,616].map(y => (
                <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="currentColor" strokeWidth="0.7" opacity="0.07"/>
              ))}
              <line x1="32" y1="0" x2="32" y2="660" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 8" opacity="0.12"/>
              <circle cx="440" cy="40" r="70" stroke="currentColor" strokeWidth="0.8" opacity="0.05"/>
              <circle cx="440" cy="40" r="42" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.07"/>
              <circle cx="40" cy="620" r="55" stroke="currentColor" strokeWidth="0.8" opacity="0.06" strokeDasharray="3 6"/>
              <line x1="392" y1="300" x2="400" y2="308" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
              <line x1="400" y1="300" x2="392" y2="308" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
              <path d="M 420 180 L 432 180 L 432 400 L 420 400" stroke="currentColor" strokeWidth="1" opacity="0.08" strokeLinecap="round"/>
              <circle cx="56" cy="100" r="2" fill="currentColor" opacity="0.08"/>
              <circle cx="66" cy="92" r="1.5" fill="currentColor" opacity="0.06"/>
              <circle cx="74" cy="102" r="1.8" fill="currentColor" opacity="0.07"/>
            </svg>

            <button className="al-close" onClick={() => setModal(null)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="al-modal-hd">
              <div className="al-eyebrow">join artlinks</div>
              <h2 className="al-title">Create your<br/><em>free account</em></h2>
              <p className="al-sub">Your links. Your page. Free forever.</p>
            </div>

            {/* Avatar */}
            <div className="al-avatar-section">
              <div className="al-avatar-label">
                <svg width="10" height="32" viewBox="0 0 10 32" fill="none"><path d="M8 1 L2 1 L2 31 L8 31" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/></svg>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-mute)' }}>profile photo</span>
              </div>
              <div className="al-avatar-row">
                <div className="al-avatar-preview" onClick={() => avatarInputRef.current?.click()}>
                  {avatarSrc ? <img src={avatarSrc} alt="Profile" /> : <span>{avatarInitial}</span>}
                  <div className="al-avatar-overlay">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                </div>
                <div className="al-avatar-info">
                  <button className="btn ghost small" type="button" onClick={() => avatarInputRef.current?.click()}>Upload photo</button>
                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 6, lineHeight: 1.5 }}>JPG, PNG or GIF · max 5MB<br/>or use your initial below</p>
                </div>
              </div>
            </div>

            {/* Fields */}
            <form className="al-fields" onSubmit={handleSignupSubmit}>
              <div className="field">
                <label>Email address</label>
                <input type="email" value={suEmail} onChange={(e) => { setSuEmail(e.target.value); setSuError(''); }} placeholder="you@example.com" autoComplete="email" autoFocus />
              </div>
              <div className="field">
                <label>Username</label>
                <div className="al-username-wrap">
                  <span className="al-username-prefix">artlinks.to/</span>
                  <input type="text" value={suUsername} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="yourname" autoComplete="off" spellCheck="false" />
                  {usernameStatusChar && (
                    <span className="al-username-status" style={{ color: usernameStatusChar.color }}>{usernameStatusChar.char}</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-hand)', fontSize: 15, color: 'var(--ink-mute)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ opacity: 0.35 }}><path d="M1 5 Q5 1 9 5 Q13 9 17 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  lowercase, numbers and hyphens only
                </div>
              </div>
              <div className="field" style={{ position: 'relative' }}>
                <label>Password</label>
                <input type={suShowPw ? 'text' : 'password'} value={suPw} onChange={(e) => { setSuPw(e.target.value); setSuError(''); }} placeholder="Min. 8 characters" autoComplete="new-password" style={{ paddingRight: 42 }} />
                <button type="button" className="al-pw-toggle" onClick={() => setSuShowPw(v => !v)} aria-label="Toggle password">{suShowPw ? <EyeHide /> : <EyeShow />}</button>
              </div>
              <div className="field" style={{ position: 'relative' }}>
                <label>Confirm password</label>
                <input type={suShowConfirm ? 'text' : 'password'} value={suConfirm} onChange={(e) => { setSuConfirm(e.target.value); setSuError(''); }} placeholder="••••••••" autoComplete="new-password" style={{ paddingRight: 42 }} />
                <button type="button" className="al-pw-toggle" onClick={() => setSuShowConfirm(v => !v)} aria-label="Toggle confirm">{suShowConfirm ? <EyeHide /> : <EyeShow />}</button>
              </div>

              <div className="al-divider" style={{ margin: '20px 0 16px' }}>
                <span /><span className="al-divider-txt">sign up with</span><span />
              </div>

              <div className="al-provider-compact-row">
                {[
                  { name: 'Google',    icon: <GoogleIcon /> },
                  { name: 'Microsoft', icon: <MicrosoftIcon /> },
                ].map(({ name, icon }) => (
                  <button key={name} type="button" className="al-provider-compact" onClick={comingSoon}>
                    {icon}<span>{name}</span>
                  </button>
                ))}
              </div>

              {suError && <div className="al-error">{suError}</div>}

              <button type="submit" className="btn primary al-submit-btn" disabled={suLoading} style={{ opacity: suLoading ? 0.7 : 1 }}>
                {suLoading ? 'Creating account…' : 'Create my artlinks page →'}
              </button>
            </form>

            <p className="al-footnote">
              Already have an account?{' '}
              <button className="al-switch-link" onClick={() => setModal('login')}>Log in →</button>
            </p>
            <p className="al-tos">By continuing you agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>
          </div>
        </div>
      )}
    </>
  );
}

// ── Icon helpers ──
function EyeShow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeHide() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C6.5 20 2 12 2 12a18.87 18.87 0 0 1 2.06-2.94M9.9 4.24A9.72 9.72 0 0 1 12 4c5.5 0 10 8 10 8a18.88 18.88 0 0 1-1.32 1.94M1 1l22 22"/>
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
      <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.314 0-9.825-3.317-11.568-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
      <path d="M43.611 20.083H42V20H24v8h11.303a11.994 11.994 0 01-4.087 5.571l6.19 5.238C42.021 35.056 44 30 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F35325"/>
      <rect x="11" y="1" width="9" height="9" fill="#81BC06"/>
      <rect x="1" y="11" width="9" height="9" fill="#05A6F0"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFBA08"/>
    </svg>
  );
}
