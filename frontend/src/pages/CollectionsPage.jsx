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
import { isFeatured, linkDate, fmt, collectionEmoji, isPublicCollection } from '../utils/models';
import { getUserRecentCollectionLinks } from '../api/links';
import { useEffect } from 'react';

export default function CollectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { links, addLink, updateLink, deleteLink, toggleFeatured } = useLinks(user?.username);
  const { collections, loading, addCollection, updateCollection, refetch: refetchCollections } = useCollections();
  const { toast, showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedColId, setSelectedColId] = useState(null);
  const [showNewCol, setShowNewCol] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [recentLinks, setRecentLinks] = useState([]);
  const [detailSearch, setDetailSearch] = useState('');

  useEffect(() => {
    if (!user?.username) return;
    getUserRecentCollectionLinks(user.username)
      .then(({ data }) => setRecentLinks(data))
      .catch(() => {});
  }, [user?.username]);

  const handleTogglePublic = async (id) => {
    const col = collections.find((c) => c.id === id);
    if (!col) return;
    try {
      await updateCollection(id, {
        name: col.name,
        category: col.category === 'public' ? 'private' : 'public',
        user: col.user,
        links: col.links,
      });
      showToast('Collection updated ✓');
    } catch {
      showToast('Failed to update collection.');
    }
  };

  const handleSaveAdd = async (payload) => {
    try {
      await addLink(payload);
      if (payload.collectionId) await refetchCollections();
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
      showToast(e.response?.data?.category?.[0] || 'Could not update.');
    }
  };

  // ── Collection Detail ──
  if (selectedColId !== null) {
    const col = collections.find((c) => c.id === selectedColId);
    // Reset search each time a different collection is selected (handled on open)
    if (!col) { setSelectedColId(null); setDetailSearch(''); return null; }
    const colLinks = links.filter((l) => col.links.includes(l.id));
    const search = detailSearch;
    const setSearch = setDetailSearch;
    const filtered = colLinks.filter(
      (l) => !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase())
    );
    const emoji = col.emoji || collectionEmoji(col.id);

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
                <div className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setSelectedColId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                    <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><I.arrow size={13} /></span> Collections
                  </button>
                  <span style={{ color: 'var(--ink-mute)' }}>/</span>
                  <span>{col.name}</span>
                </div>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6em', opacity: 0.7 }}>{emoji}</span>
                  {col.name}
                </h1>
                <div className="page-subtitle">{colLinks.length} links · {colLinks.filter(isFeatured).length} featured</div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button
                  className={cls('btn', isPublicCollection(col) ? 'accent' : 'ghost')}
                  onClick={() => handleTogglePublic(col.id)}
                >
                  <I.eye size={15} /> {isPublicCollection(col) ? 'Public' : 'Private'}
                </button>
                <button className="btn ghost" onClick={() => setSelectedColId(null)}><I.x size={14} /> Close</button>
                <button className="btn primary" onClick={() => setShowAdd(true)}><I.plus size={16} /> Add to collection</button>
              </div>
            </header>

            <div className="row" style={{ gap: 14, marginBottom: 18 }}>
              <div className="search flex-1">
                <I.search size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`search ${colLinks.length} links in ${col.name}…`} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="day-empty">
                <Doodles.Swirl style={{ color: 'var(--ink-mute)', margin: '0 auto 16px' }} />
                <div className="hand" style={{ fontSize: 22, color: 'var(--ink-mute)' }}>
                  {search ? `no links match "${search}"` : 'nothing here yet'}
                </div>
                {!search && (
                  <button className="btn ghost" style={{ marginTop: 20 }} onClick={() => setShowAdd(true)}>
                    <I.plus size={14} /> Add first link
                  </button>
                )}
              </div>
            ) : (
              <div className="link-list">
                <div className="link-list-hd"><div /><div>link</div><div>collection</div><div>added</div><div /></div>
                {filtered.map((link) => (
                  <LinkRow
                    key={link.id} link={link} collections={collections}
                    onEdit={() => setEditingLink(link)}
                    onToggleFeatured={() => handleToggleFeatured(link.id)}
                    onDelete={() => handleDelete(link.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
        {showAdd && (
          <LinkModal
            mode="add" collections={collections}
            defaultCollectionId={selectedColId}
            onClose={() => setShowAdd(false)}
            onSave={handleSaveAdd}
          />
        )}
        {editingLink && (
          <LinkModal
            mode="edit" link={editingLink} collections={collections}
            onClose={() => setEditingLink(null)}
            onSave={handleSaveEdit}
            onDelete={() => { handleDelete(editingLink.id); setEditingLink(null); }}
          />
        )}
        <Toast message={toast} />
      </div>
    );
  }

  // ── Collections Grid ──
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
            <div className="page-title-group" style={{ position: 'relative' }}>
              <div className="page-eyebrow">artlinks / Collections</div>
              <h1>Collections</h1>
              <div className="page-subtitle">
                Group links by theme, project, or season. Toggle a collection public to share it on your profile.
              </div>
              <Doodles.CircleCrude className="doodle accent" style={{ left: -20, top: -6, opacity: 0.5 }} />
            </div>
            <button className="btn primary" onClick={() => setShowNewCol(true)}>
              <I.plus size={16} /> New collection
            </button>
          </header>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-mute)' }}>Loading…</div>
          ) : (
            <div className="collection-grid">
              {collections.map((c) => {
                const featured = links.filter((l) => c.links.includes(l.id) && isFeatured(l)).length;
                const emoji = c.emoji || collectionEmoji(c.id);
                return (
                  <div
                    key={c.id}
                    className="collection-card"
                    onClick={() => { setDetailSearch(''); setSelectedColId(c.id); }}
                    style={isPublicCollection(c) ? { background: 'var(--accent-soft)' } : {}}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1 }}>{emoji}</span>
                        {isPublicCollection(c) && <span className="tag featured" style={{ fontSize: 10 }}>public</span>}
                      </div>
                      <h3>{c.name}</h3>
                      <div className="count">{c.links.length} links · {featured} featured</div>
                    </div>
                    <div className="preview-dots">
                      {[28, 44, 52, 36, 60, 40, 32].map((w, j) => (
                        <span key={j} style={{ width: `${w}px`, opacity: 0.35 + j * 0.08 }} />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="collection-card new" onClick={() => setShowNewCol(true)}>
                <div>
                  <I.plus size={28} />
                  <div className="hand" style={{ fontSize: 20, marginTop: 8 }}>new collection</div>
                </div>
              </div>
            </div>
          )}

          <div className="section-hd mt-lg">
            <h2>Recently grouped</h2>
          </div>
          <div className="link-list">
            <div className="link-list-hd"><div /><div>link</div><div>collection</div><div>added</div><div /></div>
            {recentLinks.slice(0, 5).map((l) => (
              <LinkRow
                key={l.id} link={l} collections={collections}
                onEdit={() => setEditingLink(l)}
                onToggleFeatured={() => handleToggleFeatured(l.id)}
                onDelete={() => handleDelete(l.id)}
              />
            ))}
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
      {editingLink && (
        <LinkModal
          mode="edit" link={editingLink} collections={collections}
          onClose={() => setEditingLink(null)}
          onSave={handleSaveEdit}
          onDelete={() => { handleDelete(editingLink.id); setEditingLink(null); }}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
