import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Doodles, cls } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useTweaks } from '../context/TweaksContext';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

/* ── Extra line-art doodles specific to this page ── */
const PageDoodles = {
  PaperClip: (props) => (
    <svg width="32" height="70" viewBox="0 0 32 70" fill="none" {...props}>
      <path
        d="M16 65 C 4 65, 4 50, 4 50 L 4 18 C 4 10, 10 6, 16 6 C 22 6, 28 10, 28 18 L 28 52 C 28 58, 24 62, 18 62 C 12 62, 9 58, 9 52 L 9 20 C 9 15, 12 13, 16 13 C 20 13, 22 15, 22 20 L 22 50"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"
      />
    </svg>
  ),
  Pencil: (props) => (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" {...props}>
      <path d="M10 40 L38 12 L42 16 L14 44 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M38 12 L42 8 L46 12 L42 16 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M10 40 L8 46 L14 44 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M34 16 L38 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  WaveLines: (props) => (
    <svg width="120" height="40" viewBox="0 0 120 40" fill="none" {...props}>
      <path d="M4 10 Q 16 4, 28 10 T 52 10 T 76 10 T 100 10 T 116 10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M4 22 Q 16 16, 28 22 T 52 22 T 76 22 T 100 22 T 116 22" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M4 34 Q 16 28, 28 34 T 52 34 T 76 34 T 100 34 T 116 34" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),
  CornerBracket: (props) => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" {...props}>
      <path d="M6 34 L6 6 L34 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  CornerBracketFlip: (props) => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" {...props}>
      <path d="M34 34 L34 6 L6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  ScribbleCircle: (props) => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" {...props}>
      <path
        d="M40 10 C 60 8, 74 22, 72 40 C 70 58, 56 72, 38 70 C 20 68, 8 54, 10 36 C 12 18, 28 6, 44 8 C 62 10, 74 26, 70 44"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"
      />
    </svg>
  ),
};

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, uploadAvatar, updateProfile, disableAccount, reEnableAccount } = useAuth();
  const isDisabled = !!user?.disabled_at;
  const { theme, toggleTheme } = useTweaks();
  const isDark = theme === 'dark';
  const { toast, showToast } = useToast();

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const [bio, setBio] = useState(user?.bio || '');
  const [savingBio, setSavingBio] = useState(false);

  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [reEnabling, setReEnabling] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      await uploadAvatar(file);
      showToast('Profile picture updated');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await updateProfile({ bio });
      showToast('Bio saved');
    } catch (err) {
      showToast(err?.response?.data?.bio?.[0] || err?.response?.data?.detail || 'Could not save bio');
    } finally {
      setSavingBio(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      await disableAccount();
      setShowDisableConfirm(false);
    } catch {
      showToast('Something went wrong');
      setDisabling(false);
    }
  };

  const handleReEnable = async () => {
    setReEnabling(true);
    try {
      await reEnableAccount();
      showToast('Account re-enabled');
    } catch {
      showToast('Something went wrong');
    } finally {
      setReEnabling(false);
    }
  };

  if (!user) return null;

  return (
    <div className="account-wrap">
      {/* Back button */}
      <button
        className="btn ghost small"
        onClick={() => navigate('/dashboard')}
        style={{ position: 'fixed', top: 20, left: 20, zIndex: 10 }}
      >
        <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><I.arrow size={14} /></span> back
      </button>

      {/* Theme toggle */}
      <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 10 }}>
        <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
            </svg>
          )}
        </button>
      </div>

      <div className="account-card">
        {/* Page heading */}
        <div className="account-heading" style={{ position: 'relative' }}>
          <div className="page-eyebrow">Account</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, marginBottom: 4 }}>
            Manage profile
          </h2>
          <Doodles.UnderlineWobble
            className="doodle accent"
            style={{ left: 0, bottom: -10, width: 220 }}
          />
        </div>

        {/* ── Profile picture ── */}
        <section className="account-section">
          <div className="account-section-label">
            <PageDoodles.Pencil style={{ color: 'var(--accent-ink)', opacity: 0.6 }} />
            <span>Profile picture</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button
              className="account-avatar-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload new photo"
            >
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                />
              ) : (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>
                  {user.username?.[0]?.toUpperCase() || 'A'}
                </span>
              )}
              <span className="account-avatar-overlay">
                {uploading ? '…' : (
                  <I.camera size={20} style={{ stroke: 'white' }} />
                )}
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
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{user.username}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 10 }}>
                artlinks.to/{user.username}
              </div>
              <button
                className="btn ghost small"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Bio ── */}
        <section className="account-section">
          <div className="account-section-label">
            <PageDoodles.WaveLines style={{ color: 'var(--accent-ink)', opacity: 0.7 }} />
            <span>Bio</span>
          </div>

          <label className="field" style={{ margin: 0 }}>
            <span style={{
              display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--ink-mute)', marginBottom: 6,
            }}>
              About you · shown on your public profile
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Tell visitors a bit about yourself…"
              style={{
                width: '100%', padding: '10px 14px',
                border: '1.4px solid var(--ink)', borderRadius: 8,
                background: 'var(--paper)', fontFamily: 'var(--font-ui)',
                fontSize: 14, color: 'var(--ink)', outline: 'none',
                resize: 'vertical', lineHeight: 1.55,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                {bio.length} / 500
              </span>
              <button
                className="btn primary small"
                onClick={handleSaveBio}
                disabled={savingBio}
              >
                {savingBio ? 'Saving…' : 'Save bio'}
              </button>
            </div>
          </label>
        </section>

        {/* ── Account status / Danger zone ── */}
        {isDisabled ? (
          <section className="account-section account-disabled-notice">
            <div className="account-section-label">
              <PageDoodles.ScribbleCircle style={{ color: 'var(--ink-mute)', opacity: 0.5 }} />
              <span>Account status</span>
            </div>
            <div className="danger-card">
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Your account is disabled</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  Your profile is hidden from search and your public page is inaccessible.
                  Re-enable to restore full access.
                </div>
              </div>
              <button
                className="btn small"
                style={{ background: 'var(--ink)', color: 'var(--paper)', flexShrink: 0 }}
                onClick={handleReEnable}
                disabled={reEnabling}
              >
                {reEnabling ? 'Re-enabling…' : 'Re-enable account'}
              </button>
            </div>
          </section>
        ) : (
          <section className={cls('account-section', 'danger-zone')}>
            <div className="account-section-label" style={{ color: 'var(--ink)' }}>
              <PageDoodles.ScribbleCircle style={{ color: 'var(--ink-mute)', opacity: 0.5 }} />
              <span>Danger zone</span>
            </div>
            <div className="danger-card">
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Disable account</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  Your profile and username will be hidden from search.
                  You can re-enable at any time from this page.
                </div>
              </div>
              <button
                className="btn ghost small"
                style={{ borderColor: 'var(--ink-mute)', flexShrink: 0 }}
                onClick={() => setShowDisableConfirm(true)}
              >
                Disable account
              </button>
            </div>
          </section>
        )}

        {/* Decorative doodles */}
        <Doodles.ArrowCurl className="doodle accent" style={{ left: -110, top: 120, transform: 'rotate(15deg)' }} />
        <Doodles.Asterisk className="doodle accent" style={{ right: -40, top: 200 }} />
        <Doodles.Dots className="doodle" style={{ right: -70, top: 400, color: 'var(--ink-mute)' }} />
        <PageDoodles.PaperClip className="doodle" style={{ right: -55, top: 80, color: 'var(--ink-mute)', opacity: 0.5 }} />
        <Doodles.Squiggle className="doodle" style={{ left: -80, bottom: 160, color: 'var(--ink-mute)', opacity: 0.4, transform: 'rotate(-20deg)' }} />
        <PageDoodles.CornerBracket className="doodle" style={{ left: -14, top: -14, color: 'var(--ink-mute)', opacity: 0.4 }} />
        <PageDoodles.CornerBracketFlip className="doodle" style={{ right: -14, top: -14, color: 'var(--ink-mute)', opacity: 0.4 }} />
      </div>

      {/* Disable confirm modal */}
      {showDisableConfirm && (
        <div className="modal-backdrop" onClick={() => setShowDisableConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, position: 'relative' }}>
            <PageDoodles.CornerBracket
              style={{ position: 'absolute', top: -6, left: -6, color: 'var(--ink-mute)', opacity: 0.3, pointerEvents: 'none' }}
            />
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 10 }}>Disable account?</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.55, marginBottom: 22 }}>
              Your profile will be hidden from search and your public page will become inaccessible.
              You can re-enable your account at any time by signing back in and visiting this page.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn ghost small"
                onClick={() => setShowDisableConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn small"
                style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                onClick={handleDisable}
                disabled={disabling}
              >
                {disabling ? 'Disabling…' : 'Yes, disable'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
