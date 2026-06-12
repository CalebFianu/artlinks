import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, cls } from '../components/Icons';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { getSocialLinks, createSocialLink, updateSocialLink, deleteSocialLink } from '../api/socials';

const PLATFORMS = [
  { key: 'twitter',   label: 'X / Twitter',  icon: I.x_social,  placeholder: 'https://x.com/yourhandle' },
  { key: 'facebook',  label: 'Facebook',      icon: I.facebook,  placeholder: 'https://facebook.com/yourprofile' },
  { key: 'instagram', label: 'Instagram',     icon: I.insta,     placeholder: 'https://instagram.com/yourhandle' },
  { key: 'youtube',   label: 'YouTube',       icon: I.youtube,   placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'pinterest', label: 'Pinterest',     icon: I.pinterest,  placeholder: 'https://pinterest.com/yourprofile' },
  { key: 'substack',  label: 'Substack',      icon: I.substack,  placeholder: 'https://yourname.substack.com' },
  { key: 'twitch',    label: 'Twitch',        icon: I.twitch,    placeholder: 'https://twitch.tv/yourchannel' },
  { key: 'linkedin',  label: 'LinkedIn',      icon: I.linkedin,  placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'tiktok',    label: 'TikTok',        icon: I.tiktok,    placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'reddit',    label: 'Reddit',        icon: I.reddit,    placeholder: 'https://reddit.com/u/yourhandle' },
  { key: 'discord',   label: 'Discord',       icon: I.discord,   placeholder: 'https://discord.gg/yourinvite' },
  { key: 'whatsapp',  label: 'WhatsApp',      icon: I.whatsapp,  placeholder: 'https://wa.me/yourphonenumber' },
];

export default function SocialsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState({});       // { platform: { id, url } }
  const [drafts, setDrafts] = useState({});     // { platform: url }
  const [saving, setSaving] = useState({});     // { platform: bool }
  const [errors, setErrors] = useState({});     // { platform: string }
  const [confirmRemove, setConfirmRemove] = useState(null); // platform key or null

  useEffect(() => {
    getSocialLinks()
      .then(({ data }) => {
        const map = {};
        const draftMap = {};
        data.forEach((s) => {
          map[s.platform] = { id: s.id, url: s.url };
          draftMap[s.platform] = s.url;
        });
        setSaved(map);
        setDrafts(draftMap);
      })
      .catch(() => showToast('Failed to load social links.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (platform, value) => {
    setDrafts((d) => ({ ...d, [platform]: value }));
    setErrors((e) => ({ ...e, [platform]: null }));
  };

  const handleSave = async (platform) => {
    const url = (drafts[platform] || '').trim();
    if (!url) return;

    setSaving((s) => ({ ...s, [platform]: true }));
    setErrors((e) => ({ ...e, [platform]: null }));

    try {
      const existing = saved[platform];
      if (existing) {
        const { data } = await updateSocialLink(existing.id, { platform, url });
        setSaved((s) => ({ ...s, [platform]: { id: data.id, url: data.url } }));
        setDrafts((d) => ({ ...d, [platform]: data.url }));
      } else {
        const { data } = await createSocialLink({ platform, url });
        setSaved((s) => ({ ...s, [platform]: { id: data.id, url: data.url } }));
        setDrafts((d) => ({ ...d, [platform]: data.url }));
      }
      showToast('Saved');
    } catch (e) {
      const detail = e.response?.data;
      const msg =
        detail?.non_field_errors?.[0] ||
        detail?.url?.[0] ||
        (typeof detail === 'string' ? detail : 'Failed to save.');
      setErrors((er) => ({ ...er, [platform]: msg }));
    } finally {
      setSaving((s) => ({ ...s, [platform]: false }));
    }
  };

  const handleRemove = (platform) => {
    const existing = saved[platform];
    if (!existing) {
      setDrafts((d) => ({ ...d, [platform]: '' }));
      return;
    }
    setConfirmRemove(platform);
  };

  const confirmRemoveAction = async () => {
    const platform = confirmRemove;
    setConfirmRemove(null);
    const existing = saved[platform];
    if (!existing) return;

    setSaving((s) => ({ ...s, [platform]: true }));
    try {
      await deleteSocialLink(existing.id);
      setSaved((s) => { const n = { ...s }; delete n[platform]; return n; });
      setDrafts((d) => ({ ...d, [platform]: '' }));
      setErrors((e) => ({ ...e, [platform]: null }));
      showToast('Removed');
    } catch {
      showToast('Failed to remove.');
    } finally {
      setSaving((s) => ({ ...s, [platform]: false }));
    }
  };

  const handleKeyDown = (e, platform) => {
    if (e.key === 'Enter') handleSave(platform);
  };

  const filledCount = Object.keys(saved).length;

  return (
    <div className="app">
      <div className={cls('sidebar-backdrop', sidebarOpen && 'open')} onClick={() => setSidebarOpen(false)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        <div className="mobile-topbar">
          <button onClick={() => setSidebarOpen((o) => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: 'var(--ink)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="brand" style={{ fontFamily: 'var(--font-display)', fontSize: 22, cursor: 'pointer' }} onClick={() => navigate('/')}><span className="dot" />artlinks</div>
          <div />
        </div>

        <main className="main">
          <header className="page-header">
            <div className="page-title-group">
              <div className="page-eyebrow">artlinks / Socials</div>
              <h1>Socials</h1>
              <div className="page-subtitle">
                Add your social media profiles. They'll appear as icons on your public page.
                {filledCount > 0 && (
                  <span className="mono" style={{ marginLeft: 8, color: 'var(--accent-ink)' }}>
                    {filledCount} connected
                  </span>
                )}
              </div>
            </div>
          </header>

          <div className="socials-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600 }}>
            {PLATFORMS.map((p) => {
              const isSaved = !!saved[p.key];
              const draft = drafts[p.key] || '';
              const isDirty = isSaved ? draft !== saved[p.key].url : draft.trim().length > 0;
              const error = errors[p.key];
              const busy = saving[p.key];

              return (
                <div
                  key={p.key}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 6,
                    padding: '14px 16px',
                    border: isSaved ? '1.6px solid var(--ink)' : '1.5px dashed var(--ink-mute)',
                    borderRadius: 12,
                    background: isSaved ? 'var(--paper-2)' : 'transparent',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p.icon size={18} />
                    <span style={{ fontWeight: 500, flex: 1 }}>{p.label}</span>
                    {isSaved && (
                      <span className="mono" style={{ fontSize: 10, color: 'var(--accent-ink)' }}>connected</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="url"
                      value={draft}
                      onChange={(e) => handleChange(p.key, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, p.key)}
                      placeholder={p.placeholder}
                      disabled={busy}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: error ? '1.5px solid var(--danger, #c00)' : '1.2px solid var(--ink-mute)',
                        borderRadius: 8,
                        background: 'var(--paper)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                    {isDirty && (
                      <button
                        className="btn ghost small"
                        onClick={() => handleSave(p.key)}
                        disabled={busy}
                        style={{ flexShrink: 0 }}
                      >
                        {busy ? '...' : 'Save'}
                      </button>
                    )}
                    {(isSaved || draft) && (
                      <button
                        className="icon-btn"
                        onClick={() => handleRemove(p.key)}
                        disabled={busy}
                        title="Remove"
                        style={{ flexShrink: 0 }}
                      >
                        <I.trash size={14} />
                      </button>
                    )}
                  </div>

                  {error && (
                    <div style={{ fontSize: 11, color: 'var(--danger, #c00)', fontFamily: 'var(--font-mono)' }}>
                      {error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        <nav className="mobile-bottom-nav">
          {[
            { path: '/dashboard', label: 'Links', icon: I.link },
            { path: '/collections', label: 'Collections', icon: I.folder },
            { path: '/featured', label: 'Featured', icon: I.star },
            { path: '/daily', label: 'Daily', icon: I.book },
            { path: user ? `/${user.username}` : '/login', label: 'Profile', icon: I.eye },
          ].map((it) => (
            <button key={it.path} className={cls('mbn-item', location.pathname === it.path && 'active')} onClick={() => navigate(it.path)}>
              <it.icon size={18} />
              <span>{it.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {confirmRemove && (
        <div className="modal-backdrop" onClick={() => setConfirmRemove(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 10 }}>Remove social link?</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.55, marginBottom: 22 }}>
              This will remove your {PLATFORMS.find((p) => p.key === confirmRemove)?.label} link from your public profile.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn ghost small" onClick={() => setConfirmRemove(null)}>
                Cancel
              </button>
              <button
                className="btn small"
                style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                onClick={confirmRemoveAction}
              >
                Yes, remove
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
