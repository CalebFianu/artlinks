import { useNavigate, useLocation } from 'react-router-dom';
import { I, cls } from './Icons';
import { useAuth } from '../context/AuthContext';
import { useTweaks } from '../context/TweaksContext';


const NAV_ITEMS = [
  { path: '/dashboard', label: 'All links', icon: I.link },
  { path: '/collections', label: 'Collections', icon: I.folder },
  { path: '/featured', label: 'Featured', icon: I.star },
  { path: '/daily', label: 'Daily', icon: I.book },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTweaks();
  const isDark = theme === 'dark';

  const go = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <aside className={cls('sidebar', isOpen && 'open')}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => go('/')}>
          <span className="dot" />
          artlinks
          <span className="hand" style={{ fontSize: 18, color: 'var(--accent-ink)', marginLeft: 2 }}>·</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="icon-btn theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light' : 'Switch to dark'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
              </svg>
            )}
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Close menu" id="sidebarCloseBtn">
            <I.x size={16} />
          </button>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((it) => (
          <div
            key={it.path}
            className={cls('nav-item', location.pathname === it.path && 'active')}
            onClick={() => go(it.path)}
          >
            <it.icon size={17} />
            <span>{it.label}</span>
          </div>
        ))}
        {user && (
          <div
            className={cls('nav-item', location.pathname === `/${user.username}` && 'active')}
            onClick={() => go(`/${user.username}`)}
          >
            <I.eye size={17} />
            <span>Public profile</span>
            <span className="mono" style={{ fontSize: 10, marginLeft: 'auto', opacity: 0.7 }}>↗</span>
          </div>
        )}
        {user?.role === 'admin' && (
          <>
            <div
              style={{
                margin: '8px 0 4px',
                padding: '0 2px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--ink-mute)',
                opacity: 0.6,
              }}
            >
              Admin
            </div>
            <div
              className={cls('nav-item', location.pathname === '/admin' && 'active')}
              onClick={() => go('/admin')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Users</span>
            </div>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="profile-chip" style={{ cursor: 'pointer' }} onClick={() => go('/account')} title="Manage account">
              <button
                onClick={(e) => { e.stopPropagation(); go('/account'); }}
                title="Manage account"
                style={{
                  position: 'relative', flexShrink: 0,
                  width: 32, height: 32, borderRadius: '50%',
                  border: 'none', padding: 0, cursor: 'pointer',
                  overflow: 'hidden', background: 'var(--accent-soft)',
                }}
              >
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span className="avatar" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user.username?.[0]?.toUpperCase() || 'A'}
                  </span>
                )}
                {/* Settings overlay on hover */}
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.45)',
                  opacity: 0, transition: 'opacity 0.15s',
                  borderRadius: '50%',
                }}
                  className="avatar-upload-overlay"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                  </svg>
                </span>
              </button>

              <div>
                <div style={{ fontWeight: 500 }}>{user.username}</div>
                <div className="mono text-mute" style={{ fontSize: 11 }}>artlinks.to/{user.username}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn ghost small" style={{ width: '100%', justifyContent: 'center' }} onClick={logout}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button className="btn ghost small" style={{ flex: 1, justifyContent: 'center' }} onClick={() => go('/')}>Log in</button>
            <button className="btn ghost small" style={{ flex: 1, justifyContent: 'center' }} onClick={() => go('/')}>Sign up</button>
          </div>
        )}
      </div>
    </aside>
  );
}
