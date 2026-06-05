import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { I, cls } from './Icons';
import { useAuth } from '../context/AuthContext';
import { useTweaks } from '../context/TweaksContext';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'All links', icon: I.link },
  { path: '/collections', label: 'Collections', icon: I.folder },
  { path: '/featured', label: 'Featured', icon: I.star },
  { path: '/daily', label: 'Daily', icon: I.book },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, uploadAvatar } = useAuth();
  const { theme, toggleTheme } = useTweaks();
  const isDark = theme === 'dark';
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { toast, showToast } = useToast();

  const go = (path) => {
    navigate(path);
    onClose();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      await uploadAvatar(file);
      showToast('Profile picture updated');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Upload failed';
      showToast(msg);
    } finally {
      setUploading(false);
    }
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
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="profile-chip">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Change profile picture"
                style={{
                  position: 'relative', flexShrink: 0,
                  width: 32, height: 32, borderRadius: '50%',
                  border: 'none', padding: 0, cursor: uploading ? 'default' : 'pointer',
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
                    {uploading ? '…' : user.username?.[0]?.toUpperCase() || 'A'}
                  </span>
                )}
                {/* Camera overlay on hover */}
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
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />

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
      <Toast message={toast} />
    </aside>
  );
}
