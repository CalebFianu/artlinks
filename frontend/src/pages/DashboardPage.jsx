import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Doodles, cls } from '../components/Icons';
import Sidebar from '../components/Sidebar';
import LinkRow from '../components/LinkRow';
import LinkModal from '../components/LinkModal';
import NewCollectionModal from '../components/NewCollectionModal';
import Toast from '../components/Toast';
import { useLinks } from '../hooks/useLinks';
import { useCollections } from '../hooks/useCollections';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { useTweaks } from '../context/TweaksContext';
import { isFeatured, linkDate, todayStr, collectionEmoji } from '../utils/models';
import { getUserStats } from '../api/links';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTweaks();
  const navigate = useNavigate();
  const { links, loading, addLink, updateLink, deleteLink, toggleFeatured } = useLinks(user?.username);
  const { collections, addCollection } = useCollections();
  const { toast, showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showNewCol, setShowNewCol] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user?.username) return;
    getUserStats(user.username).then(({ data }) => setStats(data)).catch(() => {});
  }, [user?.username]);

  const today = todayStr();
  const featuredCount = links.filter(isFeatured).length;
  const addedToday = links.filter((l) => linkDate(l) === today).length;

  const filtered = links.filter((l) => {
    const inCol =
      collectionFilter === 'all' ||
      (collectionFilter === '_featured' && isFeatured(l)) ||
      collections.some((c) => String(c.id) === collectionFilter && c.links.includes(l.id));
    const inSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.url.toLowerCase().includes(search.toLowerCase());
    return inCol && inSearch;
  });

  const handleSaveAdd = async (payload) => {
    try {
      await addLink(payload);
      setShowAdd(false);
      showToast('Link added ✓');
    } catch (e) {
      const msg = e.response?.data?.category?.[0] || 'Failed to add link.';
      showToast(msg);
    }
  };

  const handleSaveEdit = async (payload) => {
    try {
      await updateLink(editingLink.id, payload);
      setEditingLink(null);
      showToast('Saved ✓');
    } catch {
      showToast('Failed to save.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLink(id);
      showToast('Deleted');
    } catch {
      showToast('Failed to delete.');
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      await toggleFeatured(id);
    } catch (e) {
      const msg = e.response?.data?.category?.[0] || 'Could not update featured status.';
      showToast(msg);
    }
  };

  return (
    <div className="app">
      <div className={cls('sidebar-backdrop', sidebarOpen && 'open')} onClick={() => setSidebarOpen(false)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 4, color: 'var(--ink)' }}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="brand" style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <span className="dot" />artlinks
          </div>
          <div className="mobile-topbar-actions">
            <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
              )}
            </button>
            <button className="btn primary small" onClick={() => setShowAdd(true)}>
              <I.plus size={14} />
            </button>
          </div>
        </div>

        <main className="main">
          <header className="page-header">
            <div className="page-title-group" style={{ position: 'relative' }}>
              <div className="page-eyebrow">artlinks / Dashboard</div>
              <h1>All links</h1>
              <div className="page-subtitle">
                Your whole library, in one place. Drag to reorder, tap the star to feature, and the whole
                thing syncs to your public page.
              </div>
              <Doodles.UnderlineWobble className="doodle" style={{ left: -8, bottom: -10 }} />
              <Doodles.ArrowCurl className="doodle" style={{ right: -120, top: 10, color: 'var(--accent-ink)' }} />
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn primary" onClick={() => setShowAdd(true)}>
                <I.plus size={16} /> New link
              </button>
            </div>
          </header>

          <section className="stats-bar">
            <div className="stat-cell">
              <div className="label">Total links</div>
              <div className="value">{String(links.length).padStart(3, '0')}</div>
              <Doodles.Sparkle className="doodle accent" style={{ right: 14, top: 14 }} />
            </div>
            <div className="stat-cell">
              <div className="label">Featured</div>
              <div className="value">
                {featuredCount}<span className="text-mute" style={{ fontSize: 16 }}>/8</span>
              </div>
            </div>
            <div className="stat-cell">
              <div className="label">Added today</div>
              <div className="value">{addedToday}</div>
            </div>
            <div className="stat-cell">
              <div className="label">Top collection</div>
              {stats?.top_collection ? (
                <>
                  <div className="value" style={{ fontSize: 22 }}>{stats.top_collection.name}</div>
                  <div className="mono text-mute" style={{ fontSize: 11, marginTop: 4 }}>{stats.top_collection.link_count} links</div>
                </>
              ) : (
                <div className="value" style={{ fontSize: 22 }}>—</div>
              )}
            </div>
          </section>

          <div className="row" style={{ gap: 14, marginBottom: 18 }}>
            <div className="search flex-1">
              <I.search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`search ${links.length} links by title or url…`}
              />
            </div>
          </div>

          <div className="filter-row" style={{ marginBottom: 14 }}>
            <button className={cls('chip', collectionFilter === 'all' && 'on')} onClick={() => setCollectionFilter('all')}>
              all · {links.length}
            </button>
            <button className={cls('chip', collectionFilter === '_featured' && 'on')} onClick={() => setCollectionFilter('_featured')}>
              ★ featured · {featuredCount}
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                className={cls('chip', collectionFilter === String(c.id) && 'on')}
                onClick={() => setCollectionFilter(String(c.id))}
              >
                {collectionEmoji(c.id)} {c.name.toLowerCase()} · {c.links.length}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-mute)' }}>Loading…</div>
          ) : (
            <div className="link-list">
              <div className="link-list-hd">
                <div /><div>link</div><div>collection</div><div>added</div><div />
              </div>
              {filtered.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-mute)' }}>
                  <Doodles.Swirl style={{ margin: '0 auto 12px', color: 'var(--ink-mute)' }} />
                  <div>No links match{search ? ` "${search}"` : ' the current filter'}</div>
                </div>
              )}
              {filtered.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  collections={collections}
                  onEdit={() => setEditingLink(link)}
                  onToggleFeatured={() => handleToggleFeatured(link.id)}
                  onDelete={() => handleDelete(link.id)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Mobile bottom tab nav */}
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

      {showAdd && (
        <LinkModal
          mode="add"
          collections={collections}
          onClose={() => setShowAdd(false)}
          onSave={handleSaveAdd}
          onCreateCollection={() => { setShowAdd(false); setShowNewCol(true); }}
        />
      )}
      {editingLink && (
        <LinkModal
          mode="edit"
          link={editingLink}
          collections={collections}
          onClose={() => setEditingLink(null)}
          onSave={handleSaveEdit}
          onDelete={() => { handleDelete(editingLink.id); setEditingLink(null); }}
        />
      )}
      {showNewCol && (
        <NewCollectionModal
          onClose={() => setShowNewCol(false)}
          onSave={async (payload) => {
            try {
              await addCollection({ name: payload.name, category: payload.category, emoji: payload.emoji });
              setShowNewCol(false);
              showToast('Collection created ✓');
            } catch {
              showToast('Failed to create collection.');
            }
          }}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
