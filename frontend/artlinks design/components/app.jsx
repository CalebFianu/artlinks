/* global React, I, Doodles */
const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR } = React;

/* ========== DATE HELPERS ========== */
const toDateStr = (d) => {
  const dd = d instanceof Date ? d : new Date(d);
  return dd.toISOString().slice(0, 10);
};
const today = toDateStr(new Date());
const daysAgo = (n) => {const d = new Date();d.setDate(d.getDate() - n);return toDateStr(d);};
const fmt = (s) => {const d = new Date(s + 'T00:00:00');return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });};
const fmtMonth = (y, m) => new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/* ========== SEED DATA ========== */
const COLLECTIONS_SEED = [
{ id: 'c-shop', name: 'Shop', count: 14, emoji: '◇', accent: false, public: true },
{ id: 'c-writing', name: 'Writing', count: 32, emoji: '✺', accent: true, public: true },
{ id: 'c-music', name: 'Sound & Music', count: 18, emoji: '♪', accent: false, public: true },
{ id: 'c-pods', name: 'Podcast Archive', count: 47, emoji: '◉', accent: false, public: false },
{ id: 'c-press', name: 'Press & Features', count: 9, emoji: '❋', accent: false, public: false },
{ id: 'c-clients', name: 'Client Work', count: 23, emoji: '▲', accent: false, public: false }];


const rawLinks = [
{ id: 'l1', title: 'New essay — On making things slowly', url: 'https://essays.creator.co/slowly', collection: 'c-writing', clicks: 2481, featured: true, updated: '2d ago', date: daysAgo(0) },
{ id: 'l2', title: 'Latest zine: FOOTNOTES vol. 7', url: 'https://shop.creator.co/footnotes-7', collection: 'c-shop', clicks: 944, featured: true, updated: '5d ago', date: daysAgo(0) },
{ id: 'l3', title: 'Episode 48: Drawing from memory', url: 'https://pods.fm/creator/48', collection: 'c-pods', clicks: 3120, featured: true, updated: '1w ago', date: daysAgo(1) },
{ id: 'l4', title: 'Risograph print run — open', url: 'https://shop.creator.co/riso-spring', collection: 'c-shop', clicks: 421, featured: false, updated: '3d ago', date: daysAgo(1) },
{ id: 'l5', title: 'Field recordings, March', url: 'https://music.creator.co/march-fields', collection: 'c-music', clicks: 190, featured: false, updated: '1w ago', date: daysAgo(2) },
{ id: 'l6', title: 'Interview in Kinfolk', url: 'https://kinfolk.com/creator-profile', collection: 'c-press', clicks: 88, featured: false, updated: '2w ago', date: daysAgo(3) },
{ id: 'l7', title: 'Notebook no. 14 — open tabs', url: 'https://essays.creator.co/tabs-14', collection: 'c-writing', clicks: 612, featured: false, updated: '4d ago', date: daysAgo(2) },
{ id: 'l8', title: 'Studio visit — short film', url: 'https://vimeo.com/creator/studio', collection: 'c-press', clicks: 1401, featured: true, updated: '6d ago', date: daysAgo(4) },
{ id: 'l9', title: 'Commission inquiry form', url: 'https://tally.so/r/creator-hire', collection: 'c-clients', clicks: 77, featured: false, updated: 'today', date: daysAgo(0) },
{ id: 'l10', title: 'Type specimen: GLOOCK', url: 'https://specimens.creator.co/gloock', collection: 'c-writing', clicks: 233, featured: false, updated: '3w ago', date: daysAgo(5) },
{ id: 'l11', title: 'Playlist — Working in silence', url: 'https://open.spotify.com/playlist/silence', collection: 'c-music', clicks: 890, featured: false, updated: '5d ago', date: daysAgo(3) },
{ id: 'l12', title: 'Guest on Longform #482', url: 'https://pods.fm/longform/482', collection: 'c-pods', clicks: 2150, featured: false, updated: '2w ago', date: daysAgo(6) },
{ id: 'l13', title: 'Brand work — Acorn Tea Co.', url: 'https://behance.net/creator/acorn', collection: 'c-clients', clicks: 340, featured: false, updated: '1mo ago', date: daysAgo(7) },
{ id: 'l14', title: 'Workshop replay — bookmaking', url: 'https://teach.creator.co/bookmaking', collection: 'c-shop', clicks: 550, featured: false, updated: '2mo ago', date: daysAgo(8) },
{ id: 'l15', title: 'Monthly letter — subscribe', url: 'https://letters.creator.co', collection: 'c-writing', clicks: 4120, featured: true, updated: 'today', date: daysAgo(0) },
{ id: 'l16', title: 'On the shelf — recent reading', url: 'https://essays.creator.co/shelf', collection: 'c-writing', clicks: 198, featured: false, updated: '1w ago', date: daysAgo(9) },
{ id: 'l17', title: 'Morning ritual — a short photo essay', url: 'https://essays.creator.co/morning', collection: 'c-writing', clicks: 310, featured: false, updated: '2d ago', date: daysAgo(1) },
{ id: 'l18', title: 'Print sale — last 12 copies', url: 'https://shop.creator.co/print-sale', collection: 'c-shop', clicks: 780, featured: false, updated: '3d ago', date: daysAgo(2) },
{ id: 'l19', title: 'Ambient set — 4 hours', url: 'https://music.creator.co/ambient-set', collection: 'c-music', clicks: 502, featured: false, updated: '4d ago', date: daysAgo(4) },
{ id: 'l20', title: 'Collab with Studio Fern', url: 'https://behance.net/creator/fern', collection: 'c-clients', clicks: 129, featured: false, updated: '5d ago', date: daysAgo(5) }];


/* ========== APP SHELL ========== */
// Alias so existing component references keep working
const COLLECTIONS = COLLECTIONS_SEED;

function App({ tweaks, setTweaks }) {
  const [route, setRoute] = useS(() => localStorage.getItem('artlinks:route') || 'dashboard');
  const [links, setLinks] = useS(rawLinks);
  const [collections, setCollections] = useS(COLLECTIONS_SEED);
  const [editingLink, setEditingLink] = useS(null);
  const [showAdd, setShowAdd] = useS(false);
  const [toast, setToast] = useS(null);
  const [search, setSearch] = useS('');
  const [collectionFilter, setCollectionFilter] = useS('all');

  useE(() => {localStorage.setItem('artlinks:route', route);}, [route]);

  const toggleTheme = () => {
    const next = (tweaks.theme || 'light') === 'light' ? 'dark' : 'light';
    const patch = { theme: next };
    setTweaks({ ...tweaks, ...patch });
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const actions = {
    addLink: (payload) => {
      const id = 'l' + Date.now();
      setLinks((prev) => [{ ...payload, id, updated: 'just now' }, ...prev]);
      showToast('Link added ✓');
    },
    updateLink: (id, payload) => {
      setLinks((prev) => prev.map((l) => l.id === id ? { ...l, ...payload, updated: 'just now' } : l));
      showToast('Saved ✓');
    },
    deleteLink: (id) => {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      showToast('Deleted');
    },
    toggleFeatured: (id) => {
      setLinks((prev) => prev.map((l) => l.id === id ? { ...l, featured: !l.featured } : l));
    },
    toggleCollectionPublic: (id) => {
      setCollections((prev) => prev.map((c) => c.id === id ? { ...c, public: !c.public } : c));
    },
    addCollection: (payload) => {
      const id = 'c-' + Date.now();
      setCollections((prev) => [...prev, {
        id,
        name: payload.name,
        emoji: payload.emoji || '✺',
        count: 0,
        accent: false,
        public: payload.public || false
      }]);
      showToast('Collection created ✓');
    }
  };

  const [sidebarOpen, setSidebarOpen] = useS(false);
  const closeSidebar = () => setSidebarOpen(false);

  // Profile route is chromeless (no sidebar) to simulate public visitor view
  if (route === 'profile') {
    return (
      <>
        <PublicProfile links={links} collections={collections} onExit={() => setRoute('dashboard')} theme={tweaks.theme} toggleTheme={toggleTheme} />
        <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />
      </>);

  }

  // Auth routes are chromeless
  if (route === 'login') {
    return (
      <>
        <LoginPage onLogin={() => setRoute('dashboard')} onGoSignup={() => setRoute('signup')} />
        <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />
      </>);
  }
  if (route === 'signup') {
    return (
      <>
        <SignupPage onSignup={() => setRoute('dashboard')} onGoLogin={() => setRoute('login')} />
        <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />
      </>);
  }

  return (
    <div className="app">
      {/* Sidebar backdrop (mobile) */}
      <div className={cls('sidebar-backdrop', sidebarOpen && 'open')} onClick={closeSidebar} />
      <Sidebar route={route} setRoute={(r) => {setRoute(r);closeSidebar();}} theme={tweaks.theme} toggleTheme={toggleTheme} isOpen={sidebarOpen} onClose={closeSidebar} />

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 4, color: 'var(--ink)' }}
            aria-label="Open menu">
            
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="brand" style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em' }}>
            <span className="dot"></span>artlinks
          </div>
          <div className="mobile-topbar-actions">
            <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {tweaks.theme === 'dark' ?
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg> :

              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
              }
            </button>
            <button className="btn primary small" onClick={() => setShowAdd(true)}>
              <I.plus size={14} />
            </button>
          </div>
        </div>

        <main className="main">
        {route === 'dashboard' &&
          <Dashboard
            links={links} actions={actions}
            search={search} setSearch={setSearch}
            collectionFilter={collectionFilter} setCollectionFilter={setCollectionFilter}
            onEdit={setEditingLink} onAdd={() => setShowAdd(true)} />

          }
        {route === 'collections' &&
          <CollectionsPage links={links} collections={collections} actions={actions} onEdit={setEditingLink} setRoute={setRoute} onAdd={() => setShowAdd(true)} />
          }
        {route === 'featured' &&
          <FeaturedPage links={links} collections={collections} actions={actions} onEdit={setEditingLink} />
          }
        {route === 'daily' &&
          <DailyPage links={links} actions={actions} onEdit={setEditingLink} onAdd={() => setShowAdd(true)} />
          }
        </main>

        {/* Mobile bottom tab nav */}
        <nav className="mobile-bottom-nav">
          {[
          { id: 'dashboard', label: 'Links', icon: I.link },
          { id: 'collections', label: 'Collections', icon: I.folder },
          { id: 'featured', label: 'Featured', icon: I.star },
          { id: 'daily', label: 'Daily', icon: I.book },
          { id: 'profile', label: 'Profile', icon: I.eye }].
          map((it) =>
          <button key={it.id} className={cls('mbn-item', route === it.id && 'active')} onClick={() => {setRoute(it.id);closeSidebar();}}>
              <it.icon size={18} />
              <span>{it.label}</span>
            </button>
          )}
        </nav>
      </div>

      {showAdd &&
      <LinkModal
        mode="add"
        onClose={() => setShowAdd(false)}
        onSave={(p) => {actions.addLink(p);setShowAdd(false);}} />

      }
      {editingLink &&
      <LinkModal
        mode="edit"
        link={editingLink}
        onClose={() => setEditingLink(null)}
        onSave={(p) => {actions.updateLink(editingLink.id, p);setEditingLink(null);}}
        onDelete={() => {actions.deleteLink(editingLink.id);setEditingLink(null);}} />

      }

      {toast && <div className="toast">{toast}</div>}
      <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />
    </div>);

}

/* ========== SIDEBAR ========== */
function Sidebar({ route, setRoute, theme, toggleTheme, isOpen, onClose }) {
  const items = [
  { id: 'dashboard', label: 'All links', icon: I.link },
  { id: 'collections', label: 'Collections', icon: I.folder },
  { id: 'featured', label: 'Featured', icon: I.star },
  { id: 'daily', label: 'Daily', icon: I.book },
  { id: 'profile', label: 'Public profile', icon: I.eye }];

  const isDark = theme === 'dark';
  return (
    <aside className={cls('sidebar', isOpen && 'open')}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="brand">
          <span className="dot"></span>
          artlinks
          <span className="hand" style={{ fontSize: 18, color: 'var(--accent-ink)', marginLeft: 2 }}>·</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle theme">
            {isDark ?
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg> :

            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
            }
          </button>
          {/* Close button — mobile only */}
          <button className="icon-btn" onClick={onClose} aria-label="Close menu" style={{ display: 'none' }} id="sidebarCloseBtn">
            <I.x size={16} />
          </button>
        </div>
      </div>
      <nav className="nav">
        {items.map((it) =>
        <div key={it.id} className={cls('nav-item', route === it.id && 'active')} onClick={() => setRoute(it.id)}>
            <it.icon size={17} />
            <span>{it.label}</span>
            {it.id === 'profile' && <span className="mono" style={{ fontSize: 10, marginLeft: 'auto', opacity: 0.7 }}>↗</span>}
          </div>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="profile-chip">
          <div className="avatar">A</div>
          <div>
            <div style={{ fontWeight: 500 }}>Ada Okafor</div>
            <div className="mono text-mute" style={{ fontSize: 11 }}>artlinks.to/ada</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button className="btn ghost small" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRoute('login')}>Log in</button>
          <button className="btn ghost small" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRoute('signup')}>Sign up</button>
        </div>
      </div>
    </aside>);

}

/* ========== DASHBOARD ========== */
function Dashboard({ links, actions, search, setSearch, collectionFilter, setCollectionFilter, onEdit, onAdd }) {
  const filtered = links.filter((l) => {
    const matchesCol = collectionFilter === 'all' || l.collection === collectionFilter ||
    collectionFilter === '_featured' && l.featured;
    const matchesSearch = !search ||
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.url.toLowerCase().includes(search.toLowerCase());
    return matchesCol && matchesSearch;
  });

  const featuredCount = links.filter((l) => l.featured).length;

  return (
    <>
      <header className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">artlinks / Dashboard</div>
          <h1>All links</h1>
          <div className="page-subtitle">
            Your whole library, in one place. Drag to reorder, tap the star to feature, and the whole
            thing syncs to your public page.
          </div>
          <Doodles.UnderlineWobble className="doodle" style={{ left: -8, bottom: -10 }} />
          <Doodles.ArrowCurl className="doodle" style={{ right: -120, top: 10, color: 'var(--accent-ink)' }} />
          <span className="hand doodle" style={{ right: -80, top: 70, fontSize: 22, color: 'var(--accent-ink)', transform: 'rotate(-4deg)' }}>drag me!</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn ghost" onClick={() => {/* no-op */}}>
            <I.ext size={15} /> Import
          </button>
          <button className="btn primary" onClick={onAdd}>
            <I.plus size={16} /> New link
          </button>
        </div>
      </header>

      <section className="stats-bar">
        <div className="stat-cell">
          <div className="label">Total links</div>
          <div className="value">{links.length.toString().padStart(3, '0')}</div>
          <Doodles.Sparkle className="doodle accent" style={{ right: 14, top: 14 }} />
        </div>
        <div className="stat-cell">
          <div className="label">Featured</div>
          <div className="value">{featuredCount}<span className="text-mute" style={{ fontSize: 16 }}>/12</span></div>
        </div>
        <div className="stat-cell">
          <div className="label">Added today</div>
          <div className="value">{links.filter((l) => l.date === today).length}</div>
        </div>
        <div className="stat-cell">
          <div className="label">Top collection</div>
          <div className="value" style={{ fontSize: 22 }}>Writing</div>
          <div className="mono text-mute" style={{ fontSize: 11, marginTop: 4 }}>32 links</div>
        </div>
      </section>

      <div className="row" style={{ gap: 14, marginBottom: 18 }}>
        <div className="search flex-1">
          <I.search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search 132 links by title, url, or tag…" />
        </div>
      </div>

      <div className="filter-row" style={{ marginBottom: 14 }}>
        <button className={cls('chip', collectionFilter === 'all' && 'on')} onClick={() => setCollectionFilter('all')}>all · {links.length}</button>
        <button className={cls('chip', collectionFilter === '_featured' && 'on')} onClick={() => setCollectionFilter('_featured')}>★ featured · {featuredCount}</button>
        {COLLECTIONS.map((c) =>
        <button key={c.id} className={cls('chip', collectionFilter === c.id && 'on')} onClick={() => setCollectionFilter(c.id)}>
            {c.name.toLowerCase()} · {links.filter((l) => l.collection === c.id).length}
          </button>
        )}
      </div>

      <div className="link-list">
        <div className="link-list-hd">
          <div></div>
          <div>link</div>
          <div>collection</div>
          <div>added</div>
          <div></div>
        </div>
        {filtered.length === 0 &&
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-mute)' }}>
            <Doodles.Swirl style={{ margin: '0 auto 12px', color: 'var(--ink-mute)' }} />
            <div>No links match "<span className="hand">{search}</span>"</div>
          </div>
        }
        {filtered.map((link) =>
        <LinkRow
          key={link.id} link={link}
          onEdit={() => onEdit(link)}
          onToggleFeatured={() => actions.toggleFeatured(link.id)}
          onDelete={() => actions.deleteLink(link.id)} />

        )}
      </div>
    </>);

}

function LinkRow({ link, onEdit, onToggleFeatured, onDelete }) {
  const collection = COLLECTIONS.find((c) => c.id === link.collection);
  return (
    <div className="link-row link-row-responsive">
      <div className="drag"><I.drag size={16} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="link-title" style={{ flexWrap: 'wrap', gap: 6 }}>
          {link.title}
          {link.featured && <span className="tag featured">★ featured</span>}
        </div>
        <div className="link-url">{link.url}</div>
        {/* Mobile-only inline meta */}
        <div className="link-row-mobile-meta">
          <span className="tag">{collection?.name.toLowerCase()}</span>
          {link.date && <span className="mono text-mute" style={{ fontSize: 11 }}>{fmt(link.date)}</span>}
        </div>
      </div>
      {/* Desktop-only: collection + date columns */}
      <div className="link-row-col-collection"><span className="tag">{collection?.name.toLowerCase()}</span></div>
      <div className="link-row-col-date mono text-soft" style={{ fontSize: 12 }}>{link.date ? fmt(link.date) : '—'}</div>
      <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
        <button className={cls('icon-btn', link.featured && 'active')} onClick={onToggleFeatured} title="Toggle featured">
          <I.star size={16} stroke={link.featured ? 2 : 1.4} />
        </button>
        <button className="icon-btn" onClick={onEdit} title="Edit">
          <I.edit size={15} />
        </button>
        <button className="icon-btn" onClick={onDelete} title="Delete">
          <I.trash size={15} />
        </button>
      </div>
    </div>);

}

/* ========== COLLECTIONS PAGE ========== */
function CollectionsPage({ links, collections, actions, onEdit, onAdd }) {
  const [selectedCol, setSelectedCol] = useS(null);
  const [showNewCol, setShowNewCol] = useS(false);

  if (selectedCol) {
    const col = collections.find((c) => c.id === selectedCol);
    return (
      <CollectionDetail
        col={col}
        links={links}
        collections={collections}
        actions={actions}
        onEdit={onEdit}
        onAdd={onAdd}
        onBack={() => setSelectedCol(null)} />);


  }

  return (
    <>
      <header className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">artlinks / Collections</div>
          <h1>Collections</h1>
          <div className="page-subtitle">
            Group links by theme, project, or season. Toggle a collection public to share it on your profile.
          </div>
          <Doodles.CircleCrude className="doodle accent" style={{ left: -20, top: -6, opacity: 0.5 }} />
        </div>
        <button className="btn primary" onClick={() => setShowNewCol(true)}><I.plus size={16} /> New collection</button>
      </header>

      <div className="collection-grid">
        {collections.map((c, i) => {
          const inCol = links.filter((l) => l.collection === c.id);
          const featured = inCol.filter((l) => l.featured).length;
          return (
            <div key={c.id} className="collection-card" onClick={() => setSelectedCol(c.id)} style={c.accent ? { background: 'var(--accent-soft)' } : {}}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1 }}>{c.emoji}</span>
                  {c.public && <span className="tag featured" style={{ fontSize: 10 }}>public</span>}
                </div>
                <h3>{c.name}</h3>
                <div className="count">{inCol.length} links · {featured} featured</div>
              </div>
              <div className="preview-dots">
                {[28, 44, 52, 36, 60, 40, 32].map((w, j) =>
                <span key={j} style={{ width: `${w}px`, opacity: 0.35 + j * 0.08 }}></span>
                )}
              </div>
            </div>);

        })}
        <div className="collection-card new" onClick={() => setShowNewCol(true)}>
          <div>
            <I.plus size={28} />
            <div className="hand" style={{ fontSize: 20, marginTop: 8 }}>new collection</div>
          </div>
        </div>
      </div>

      <div className="section-hd mt-lg">
        <h2>Recently grouped</h2>
        <div className="muted"></div>
      </div>
      <div className="link-list">
        <div className="link-list-hd">
          <div></div><div>link</div><div>collection</div><div>added</div><div></div>
        </div>
        {links.slice(0, 5).map((l) =>
        <LinkRow key={l.id} link={l} onEdit={() => onEdit(l)} onToggleFeatured={() => actions.toggleFeatured(l.id)} onDelete={() => actions.deleteLink(l.id)} />
        )}
      </div>

      {showNewCol &&
      <NewCollectionModal
        onClose={() => setShowNewCol(false)}
        onSave={(payload) => {
          actions.addCollection(payload);
          setShowNewCol(false);
        }} />

      }
    </>);

}

/* ========== NEW COLLECTION MODAL ========== */
const COLLECTION_EMOJIS = ['✺', '◇', '♪', '◉', '❋', '▲', '◈', '⬡', '✦', '◎', '⊹', '⌘'];

function NewCollectionModal({ onClose, onSave }) {
  const [name, setName] = useS('');
  const [isPublic, setIsPublic] = useS(false);
  const [emoji, setEmoji] = useS('✺');

  const submit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), isPublic, emoji, public: isPublic });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal al-new-col-modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Line art bg */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', color: 'var(--ink)' }} viewBox="0 0 480 420" fill="none" aria-hidden="true">
          <line x1="0" y1="52" x2="480" y2="52" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
          <line x1="0" y1="104" x2="480" y2="104" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
          <line x1="0" y1="156" x2="480" y2="156" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
          <line x1="0" y1="208" x2="480" y2="208" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
          <line x1="0" y1="260" x2="480" y2="260" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
          <line x1="0" y1="312" x2="480" y2="312" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
          <line x1="0" y1="364" x2="480" y2="364" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
          <line x1="28" y1="0" x2="28" y2="420" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3 8" opacity="0.11" />
          <circle cx="450" cy="36" r="44" stroke="currentColor" strokeWidth="0.7" opacity="0.06" />
          <circle cx="450" cy="36" r="24" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.07" />
          <line x1="380" y1="360" x2="388" y2="368" stroke="currentColor" strokeWidth="1" opacity="0.1" />
          <line x1="388" y1="360" x2="380" y2="368" stroke="currentColor" strokeWidth="1" opacity="0.1" />
          <path d="M 420 140 L 432 140 L 432 280 L 420 280" stroke="currentColor" strokeWidth="0.8" opacity="0.08" strokeLinecap="round" />
        </svg>

        {/* Close */}
        <button className="icon-btn" onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}><I.x size={18} /></button>

        <form onSubmit={submit} style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-mute)', marginBottom: 10 }}>new collection</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8 }}>
              Create a<br /><em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>collection</em>
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: 0 }}>Group your links by theme, project, or season.</p>
          </div>

          {/* Emoji picker */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-mute)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="10" height="24" viewBox="0 0 10 24" fill="none"><path d="M8 1L2 1L2 23L8 23" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" /></svg>
              icon
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLLECTION_EMOJIS.map((e) =>
              <button
                key={e} type="button"
                onClick={() => setEmoji(e)}
                style={{
                  width: 42, height: 42,
                  border: emoji === e ? 'var(--stroke) solid var(--ink)' : '1.3px dashed var(--ink-mute)',
                  borderRadius: 10,
                  background: emoji === e ? 'var(--ink)' : 'var(--paper)',
                  color: emoji === e ? 'var(--paper)' : 'var(--ink)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                  boxShadow: emoji === e ? '2px 2px 0 var(--ink-soft)' : 'none',
                  transition: 'all 0.12s'
                }}>
                {e}</button>
              )}
            </div>
          </div>

          {/* Name field */}
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Collection name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Writing, Shop, Music…"
              autoFocus
              style={{ boxShadow: '2px 2px 0 var(--ink)', fontSize: 16 }} />
            
          </div>

          {/* Public / Private toggle */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-mute)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="10" height="24" viewBox="0 0 10 24" fill="none"><path d="M8 1L2 1L2 23L8 23" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" /></svg>
              visibility
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                style={{
                  flex: 1, padding: '12px 16px',
                  border: !isPublic ? 'var(--stroke) solid var(--ink)' : '1.3px dashed var(--ink-mute)',
                  borderRadius: 10,
                  background: !isPublic ? 'var(--ink)' : 'var(--paper)',
                  color: !isPublic ? 'var(--paper)' : 'var(--ink-soft)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  boxShadow: !isPublic ? '2px 2px 0 var(--ink-soft)' : 'none',
                  transition: 'all 0.12s',
                  textAlign: 'left'
                }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500 }}>Private</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.65 }}>Only visible to you</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                style={{
                  flex: 1, padding: '12px 16px',
                  border: isPublic ? 'var(--stroke) solid var(--ink)' : '1.3px dashed var(--ink-mute)',
                  borderRadius: 10,
                  background: isPublic ? 'var(--accent-soft)' : 'var(--paper)',
                  color: isPublic ? 'var(--ink)' : 'var(--ink-soft)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  boxShadow: isPublic ? '2px 2px 0 var(--ink)' : 'none',
                  transition: 'all 0.12s',
                  textAlign: 'left'
                }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I.eye size={15} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500 }}>Public</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.65 }}>Shows on your profile</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.5 }}>
              <I.check size={14} /> Create collection
            </button>
          </div>
        </form>
      </div>
    </div>);

}


/* ========== COLLECTION DETAIL ========== */
function CollectionDetail({ col, links, collections, actions, onEdit, onAdd, onBack }) {
  const [search, setSearch] = useS('');
  const colLinks = useM(() =>
  links.
  filter((l) => l.collection === col.id).
  filter((l) => !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase())),
  [links, col.id, search]
  );
  const featuredCount = colLinks.filter((l) => l.featured).length;

  return (
    <>
      <header className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: 0, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              
              <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><I.arrow size={13} /></span> Collections
            </button>
            <span style={{ color: 'var(--ink-mute)' }}>/</span>
            <span>{col.name}</span>
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6em', opacity: 0.7 }}>{col.emoji}</span>
            {col.name}
          </h1>
          <div className="page-subtitle">
            {links.filter((l) => l.collection === col.id).length} links · {featuredCount} featured
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button
            className={cls('btn', col.public ? 'accent' : 'ghost')}
            onClick={(e) => {e.stopPropagation();actions.toggleCollectionPublic(col.id);}}
            title={col.public ? 'Make private' : 'Share on profile'}>
            
            <I.eye size={15} /> {col.public ? 'Public' : 'Private'}
          </button>
          <button className="btn ghost" onClick={onBack}><I.x size={14} /> Close</button>
          <button className="btn primary" onClick={() => {window.__dailyDefaultDate = null;onAdd();}}>
            <I.plus size={16} /> Add to collection
          </button>
        </div>
      </header>

      {/* Search bar */}
      <div className="row" style={{ gap: 14, marginBottom: 18 }}>
        <div className="search flex-1">
          <I.search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`search ${links.filter((l) => l.collection === col.id).length} links in ${col.name}…`} />
          
        </div>
      </div>

      {colLinks.length === 0 ?
      <div className="day-empty">
          <Doodles.Swirl style={{ color: 'var(--ink-mute)', margin: '0 auto 16px' }} />
          <div className="hand" style={{ fontSize: 22, color: 'var(--ink-mute)' }}>
            {search ? `no links match "${search}"` : 'nothing here yet'}
          </div>
          {!search &&
        <button className="btn ghost" style={{ marginTop: 20 }} onClick={onAdd}>
              <I.plus size={14} /> Add first link
            </button>
        }
        </div> :

      <div className="link-list">
          <div className="link-list-hd" style={{ gridTemplateColumns: '28px 1fr 100px 120px' }}>
            <div></div>
            <div>link</div>
            <div>added</div>
            <div style={{ textAlign: 'right' }}>actions</div>
          </div>
          {colLinks.map((link) =>
        <div key={link.id} className="link-row" style={{ gridTemplateColumns: '28px 1fr 100px 120px' }}>
              <div className="drag"><I.drag size={16} /></div>
              <div>
                <div className="link-title">
                  {link.title}
                  {link.featured && <span className="tag featured">★ featured</span>}
                </div>
                <div className="link-url">{link.url}</div>
              </div>
              <div className="mono text-soft" style={{ fontSize: 12 }}>{link.date ? fmt(link.date) : '—'}</div>
              <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                <button
              className={cls('icon-btn', link.featured && 'active')}
              onClick={() => actions.toggleFeatured(link.id)}
              title={link.featured ? 'Unfeature' : 'Feature on profile'}>
              
                  <I.star size={15} stroke={link.featured ? 2 : 1.4} />
                </button>
                <button className="icon-btn" onClick={() => onEdit(link)} title="Edit link">
                  <I.edit size={15} />
                </button>
                <button
              className="icon-btn"
              onClick={() => actions.deleteLink(link.id)}
              title="Remove from collection"
              style={{ color: 'var(--ink-mute)' }}>
              
                  <I.trash size={15} />
                </button>
              </div>
            </div>
        )}
        </div>
      }

      {/* Summary footer */}
      {colLinks.length > 0 &&
      <div className="streak-bar mt-lg">
          <div className="streak-stat">
            <div className="label">Total in collection</div>
            <div className="value">{links.filter((l) => l.collection === col.id).length}</div>
          </div>
          <div className="streak-stat">
            <div className="label">Featured</div>
            <div className="value">{featuredCount}</div>
          </div>
          <div className="streak-stat">
            <div className="label">Added this week</div>
            <div className="value">{links.filter((l) => l.collection === col.id && l.date >= daysAgo(7)).length}</div>
          </div>
        </div>
      }
    </>);

}

/* ========== FEATURED PAGE ========== */
function FeaturedPage({ links, collections, actions, onEdit }) {
  const featured = links.filter((l) => l.featured);
  const SLOTS = 8;

  return (
    <>
      <header className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">artlinks / Featured</div>
          <h1>Featured <span className="hand" style={{ color: 'var(--accent-ink)', fontSize: '0.5em', marginLeft: 6, verticalAlign: 'middle' }}>(on your profile)</span></h1>
          <div className="page-subtitle">
            The links that show up on your public page, in this exact order. Drag to rearrange — the phone
            preview updates live.
          </div>
        </div>
      </header>

      <div className="featured-stage">
        <div>
          <div className="section-hd" style={{ marginTop: 0 }}>
            <h2>Stage · {featured.length}/{SLOTS}</h2>
            <div className="muted">drag to reorder</div>
          </div>

          <div className="featured-slots">
            {Array.from({ length: SLOTS }).map((_, i) => {
              const link = featured[i];
              if (!link) {
                return (
                  <div key={'e' + i} className="slot empty">
                    <span className="hand" style={{ fontSize: 18, color: 'var(--ink-mute)' }}>+ add a featured link to slot {i + 1}</span>
                  </div>);

              }
              const collection = collections.find((c) => c.id === link.collection);
              return (
                <div key={link.id} className="slot">
                  <div className="slot-num">{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{link.title}</div>
                    <div className="link-url">{link.url} · <span className="text-mute">{collection?.name}</span></div>
                  </div>
                  <div className="row" style={{ gap: 2 }}>
                    <button className="icon-btn" onClick={() => onEdit(link)}><I.edit size={15} /></button>
                    <button className="icon-btn" onClick={() => actions.toggleFeatured(link.id)} title="Unfeature"><I.x size={15} /></button>
                  </div>
                </div>);

            })}
          </div>

        </div>

        <div className="preview-phone">
          <ProfileMini links={links} collections={collections} />
        </div>
      </div>
    </>);

}

/* ========== PHONE PREVIEW (mini) ========== */
function ProfileMini({ links, collections }) {
  const featured = links.filter((l) => l.featured);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, margin: '0 auto 10px', borderRadius: '50%', border: 'var(--stroke) solid var(--ink)', display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', fontFamily: 'var(--font-display)', fontSize: 28 }}>A</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1 }}>Ada Okafor</div>
      <div className="mono text-mute" style={{ fontSize: 10, margin: '4px 0 10px' }}>@ada</div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 14, padding: '0 8px' }}>Writer · bookmaker · risograph enthusiast</div>
      <div className="col" style={{ gap: 8 }}>
        {featured.map((l, i) =>
        <div key={l.id} style={{
          padding: '10px 12px',
          border: 'var(--stroke) solid var(--ink)',
          borderRadius: 10,
          fontSize: 11,
          background: i === 0 ? 'var(--accent)' : 'var(--paper)',
          fontWeight: 500,
          textAlign: 'left'
        }}>{l.title}</div>
        )}
      </div>
    </div>);

}

/* ========== PUBLIC PROFILE (full page) ========== */
/* ========== PROFILE DATE PICKER ========== */
function ProfileDatePicker({ links, selectedDate, onSelect, onClear }) {
  const [open, setOpen] = useS(false);
  const [viewYear, setViewYear] = useS(() => {
    if (selectedDate) {const d = new Date(selectedDate + 'T00:00:00');return d.getFullYear();}
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useS(() => {
    if (selectedDate) {const d = new Date(selectedDate + 'T00:00:00');return d.getMonth();}
    return new Date().getMonth();
  });
  const ref = useR(null);

  // Dates that have public links
  const datesWithLinks = useM(() => {
    const s = new Set();
    links.forEach((l) => {if (l.date) s.add(l.date);});
    return s;
  }, [links]);

  const calCells = useM(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const selStr = (d) => {
    const dd = String(d).padStart(2, '0');
    const mm = String(viewMonth + 1).padStart(2, '0');
    return `${viewYear}-${mm}-${dd}`;
  };

  const prevMonth = () => {
    if (viewMonth === 0) {setViewMonth(11);setViewYear((y) => y - 1);} else
    setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {setViewMonth(0);setViewYear((y) => y + 1);} else
    setViewMonth((m) => m + 1);
  };

  // Close on outside click
  useE(() => {
    if (!open) return;
    const handler = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const fmtSelected = (s) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', marginBottom: 16 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          border: selectedDate ? '1.6px solid var(--ink)' : '1.5px dashed var(--ink-mute)',
          borderRadius: 999,
          background: selectedDate ? 'var(--paper-2)' : 'transparent',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          color: selectedDate ? 'var(--ink)' : 'var(--ink-mute)',
          transition: 'all 0.15s',
          boxShadow: selectedDate ? '2px 2px 0 var(--ink)' : 'none'
        }}>
        
        {/* Calendar icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: selectedDate ? 'var(--ink)' : 'var(--ink-mute)' }}>
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span style={{ flex: 1, textAlign: 'left' }}>
          {selectedDate ? fmtSelected(selectedDate) : 'Browse by date…'}
        </span>
        {selectedDate ?
        <span
          onClick={(e) => {e.stopPropagation();onClear();setOpen(false);}}
          style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', fontSize: 11, fontFamily: 'var(--font-mono)', gap: 4, cursor: 'pointer' }}>
          
            clear ×
          </span> :

        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.4 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        }
      </button>

      {/* Popover calendar */}
      {open &&
      <div style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        width: 300,
        background: 'var(--paper)',
        border: '1.6px solid var(--ink)',
        borderRadius: 14,
        padding: '18px 16px 14px',
        boxShadow: '4px 4px 0 var(--ink)',
        animation: 'alSlideUp 0.18s cubic-bezier(0.22,1,0.36,1)'
      }}>
          {/* Line art background */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', color: 'var(--ink)', opacity: 1 }} viewBox="0 0 300 300" fill="none" aria-hidden="true">
            <line x1="0" y1="44" x2="300" y2="44" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
            <line x1="0" y1="88" x2="300" y2="88" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
            <line x1="0" y1="132" x2="300" y2="132" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
            <line x1="0" y1="176" x2="300" y2="176" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
            <line x1="0" y1="220" x2="300" y2="220" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
            <line x1="0" y1="264" x2="300" y2="264" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
            <line x1="20" y1="0" x2="20" y2="300" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 7" opacity="0.1" />
            <circle cx="275" cy="25" r="20" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
          </svg>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative', zIndex: 1 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', display: 'flex', padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '-0.01em' }}>{fmtMonth(viewYear, viewMonth)}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', display: 'flex', padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4, position: 'relative', zIndex: 1 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) =>
          <div key={d} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-mute)', padding: '2px 0' }}>{d}</div>
          )}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, position: 'relative', zIndex: 1 }}>
            {calCells.map((d, i) => {
            if (!d) return <div key={'e' + i} />;
            const ds = selStr(d);
            const hasL = datesWithLinks.has(ds);
            const isSel = ds === selectedDate;
            const isTod = ds === today;
            return (
              <button
                key={d}
                onClick={() => {if (hasL) {onSelect(ds);setOpen(false);}}}
                title={hasL ? `${datesWithLinks.has(ds) ? 'Has links' : ''}` : 'No links on this day'}
                style={{
                  aspectRatio: '1',
                  border: isTod && !isSel ? '1.3px solid var(--ink)' : 'none',
                  borderRadius: 7,
                  background: isSel ? 'var(--ink)' : hasL ? 'var(--accent-soft)' : 'transparent',
                  color: isSel ? 'var(--paper)' : hasL ? 'var(--ink)' : 'var(--ink-mute)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 12,
                  cursor: hasL ? 'pointer' : 'default',
                  opacity: hasL ? 1 : 0.35,
                  fontWeight: hasL ? 600 : 400,
                  transition: 'background 0.1s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  padding: '3px 2px'
                }}>
                
                  {d}
                  {hasL && !isSel &&
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-ink)', display: 'block' }}></span>
                }
                </button>);

          })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1.2px dashed var(--ink-mute)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)', position: 'relative', zIndex: 1 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--accent-soft)', display: 'inline-block', flexShrink: 0 }}></span>
            days with links
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-hand)', fontSize: 12 }}>tap to browse</span>
          </div>
        </div>
      }
    </div>);

}

function PublicProfile({ links, collections, onExit, theme, toggleTheme }) {
  const featured = links.filter((l) => l.featured);
  const publicCols = collections.filter((c) => c.public);
  const isDark = theme === 'dark';
  const [search, setSearch] = useS('');
  const [activeTab, setActiveTab] = useS('links');
  const [browseDate, setBrowseDate] = useS(null);
  const [editing, setEditing] = useS(false);

  // Editable profile state
  const [profileData, setProfileData] = useS({
    name: 'Ada Okafor',
    handle: '@ada',
    location: 'Brooklyn',
    bio: 'Writer, bookmaker, and risograph enthusiast. Currently making a zine about everyday objects.',
    avatar: null,
    socials: {
      instagram: 'https://instagram.com/ada',
      twitter: 'https://x.com/ada',
      website: 'https://ada.co',
      email: 'mailto:ada@ada.co',
      youtube: '',
      twitch: '',
      tiktok: '',
      linkedin: '',
      pinterest: '',
      soundcloud: '',
      spotify: ''
    }
  });
  const [draft, setDraft] = useS(null); // draft while editing

  const startEdit = () => {
    setDraft({
      ...profileData,
      socials: {
        instagram: '', twitter: '', website: '', email: '',
        youtube: '', twitch: '', tiktok: '', linkedin: '',
        pinterest: '', soundcloud: '', spotify: '',
        ...profileData.socials
      }
    });
    setEditing(true);
  };
  const cancelEdit = () => {setDraft(null);setEditing(false);};
  const saveEdit = () => {setProfileData(draft);setDraft(null);setEditing(false);};
  const pd = editing ? draft : profileData;
  const setPd = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setSocial = (key, val) => setDraft((d) => ({ ...d, socials: { ...d.socials, [key]: val } }));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPd({ avatar: ev.target.result });
    reader.readAsDataURL(file);
  };

  // All searchable links
  const publicColIds = new Set(publicCols.map((c) => c.id));
  const allPublicLinks = useM(() => {
    const seen = new Set();
    return [...featured, ...links.filter((l) => publicColIds.has(l.collection) && !l.featured)].
    filter((l) => {if (seen.has(l.id)) return false;seen.add(l.id);return true;});
  }, [links, collections]);

  const searchResults = useM(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allPublicLinks.filter((l) =>
    l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
    );
  }, [search, allPublicLinks]);

  const dateResults = useM(() => {
    if (!browseDate) return [];
    return allPublicLinks.filter((l) => l.date === browseDate);
  }, [browseDate, allPublicLinks]);

  const isSearching = search.trim().length > 0;
  const isBrowsingDate = !isSearching && browseDate !== null;

  const SOCIAL_DEFS = [
  { key: 'instagram', label: 'Instagram', icon: I.insta, placeholder: 'https://instagram.com/yourname' },
  { key: 'twitter', label: 'X / Twitter', icon: I.x_social, placeholder: 'https://x.com/yourname' },
  { key: 'youtube', label: 'YouTube', icon: I.youtube, placeholder: 'https://youtube.com/@yourname' },
  { key: 'twitch', label: 'Twitch', icon: I.twitch, placeholder: 'https://twitch.tv/yourname' },
  { key: 'tiktok', label: 'TikTok', icon: I.tiktok, placeholder: 'https://tiktok.com/@yourname' },
  { key: 'linkedin', label: 'LinkedIn', icon: I.linkedin, placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'spotify', label: 'Spotify', icon: I.spotify, placeholder: 'https://open.spotify.com/artist/…' },
  { key: 'soundcloud', label: 'SoundCloud', icon: I.soundcloud, placeholder: 'https://soundcloud.com/yourname' },
  { key: 'pinterest', label: 'Pinterest', icon: I.pinterest, placeholder: 'https://pinterest.com/yourname' },
  { key: 'website', label: 'Website', icon: I.globe, placeholder: 'https://yoursite.com' },
  { key: 'email', label: 'Email', icon: I.mail, placeholder: 'mailto:you@example.com' }];


  return (
    <div className="profile-wrap" style={{ position: 'relative' }}>
      {/* Top chrome */}
      <button className="btn ghost small" onClick={onExit} style={{ position: 'fixed', top: 20, left: 20, zIndex: 10 }}>
        <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><I.arrow size={14} /></span> back to editor
      </button>
      <button className="icon-btn theme-toggle" onClick={toggleTheme} style={{ position: 'fixed', top: 18, right: 180, zIndex: 10 }} title={isDark ? 'Light mode' : 'Dark mode'}>
        {isDark ?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg> :

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
        }
      </button>
      <div style={{ position: 'fixed', top: 20, right: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)', zIndex: 10 }}>
        artlinks.to/ada
      </div>

      <div className="profile-card">

        {/* ── EDIT MODE PANEL ── */}
        {editing &&
        <div style={{
          width: '100%',
          border: '1.6px solid var(--ink)',
          borderRadius: 'var(--radius)',
          background: 'var(--paper-2)',
          padding: '24px 20px 20px',
          marginBottom: 28,
          position: 'relative',
          boxShadow: '4px 4px 0 var(--ink)',
          textAlign: 'left'
        }}>
            {/* Line art bg */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', color: 'var(--ink)' }} viewBox="0 0 480 400" fill="none" aria-hidden="true">
              <line x1="0" y1="44" x2="480" y2="44" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
              <line x1="0" y1="88" x2="480" y2="88" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
              <line x1="0" y1="132" x2="480" y2="132" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
              <line x1="0" y1="176" x2="480" y2="176" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
              <line x1="0" y1="220" x2="480" y2="220" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
              <line x1="0" y1="264" x2="480" y2="264" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
              <line x1="0" y1="308" x2="480" y2="308" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
              <line x1="0" y1="352" x2="480" y2="352" stroke="currentColor" strokeWidth="0.6" opacity="0.07" />
              <line x1="24" y1="0" x2="24" y2="400" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 7" opacity="0.1" />
              <circle cx="450" cy="30" r="28" stroke="currentColor" strokeWidth="0.7" opacity="0.06" />
              <line x1="420" y1="340" x2="428" y2="348" stroke="currentColor" strokeWidth="1" opacity="0.1" />
              <line x1="428" y1="340" x2="420" y2="348" stroke="currentColor" strokeWidth="1" opacity="0.1" />
            </svg>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-mute)' }}>Edit profile</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn ghost small" onClick={cancelEdit}><I.x size={13} /> Cancel</button>
                  <button className="btn primary small" onClick={saveEdit}><I.check size={13} /> Save</button>
                </div>
              </div>

              {/* Avatar upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1.2px dashed var(--ink-mute)' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  border: 'var(--stroke) solid var(--ink)',
                  background: 'var(--accent-soft)',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 28,
                  overflow: 'hidden', boxShadow: '2px 2px 0 var(--ink)',
                  position: 'relative', cursor: 'pointer'
                }} onClick={() => document.getElementById('profileAvatarInput').click()}>
                    {pd.avatar ?
                  <img src={pd.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                  (pd.name || 'A')[0].toUpperCase()
                  }
                    <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(26,23,19,0.42)',
                    display: 'grid', placeItems: 'center', color: '#fff', opacity: 0,
                    transition: 'opacity 0.15s', borderRadius: '50%'
                  }} className="avatar-hover-overlay">
                      <I.camera size={18} />
                    </div>
                  </div>
                  <input id="profileAvatarInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <button className="btn ghost small" onClick={() => document.getElementById('profileAvatarInput').click()}>
                    <I.camera size={13} /> Change photo
                  </button>
                  {pd.avatar &&
                <button className="btn ghost small" style={{ marginLeft: 6 }} onClick={() => setPd({ avatar: null })}>
                      Remove
                    </button>
                }
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 6 }}>JPG, PNG or GIF · max 5MB</div>
                </div>
              </div>

              {/* Name + location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Display name</label>
                  <input value={pd.name} onChange={(e) => setPd({ name: e.target.value })} placeholder="Your name" />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Location</label>
                  <input value={pd.location} onChange={(e) => setPd({ location: e.target.value })} placeholder="City, Country" />
                </div>
              </div>

              {/* Bio */}
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Bio</label>
                <textarea
                value={pd.bio}
                onChange={(e) => setPd({ bio: e.target.value })}
                placeholder="Tell visitors a little about yourself…"
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1.4px solid var(--ink)', borderRadius: 8,
                  background: 'var(--paper)', fontFamily: 'var(--font-ui)',
                  fontSize: 14, color: 'var(--ink)', outline: 'none',
                  resize: 'vertical', lineHeight: 1.55
                }} />
              
              </div>

              {/* Social links */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-mute)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="10" height="28" viewBox="0 0 10 28" fill="none"><path d="M8 1L2 1L2 27L8 27" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" /></svg>
                Social links
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                {SOCIAL_DEFS.map((s) =>
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, border: '1.3px dashed var(--ink-mute)', borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--ink-soft)', flexShrink: 0 }}>
                      <s.icon size={15} />
                    </div>
                    <input
                  value={pd.socials[s.key] || ''}
                  onChange={(e) => setSocial(s.key, e.target.value)}
                  placeholder={s.placeholder}
                  style={{
                    flex: 1, padding: '8px 12px',
                    border: '1.3px solid var(--ink)', borderRadius: 8,
                    background: 'var(--paper)', fontFamily: 'var(--font-mono)',
                    fontSize: 12, color: 'var(--ink)', outline: 'none'
                  }} />
                
                    {pd.socials[s.key] &&
                <button onClick={() => setSocial(s.key, '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex', padding: 4 }}>
                        <I.x size={13} />
                      </button>
                }
                  </div>
              )}
              </div>
            </div>
          </div>
        }

        {/* ── AVATAR + BIO ── */}
        <div style={{ position: 'relative' }}>
          <div className="profile-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
            {profileData.avatar ?
            <img src={profileData.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> :
            (profileData.name || 'A')[0].toUpperCase()
            }
          </div>
          {/* Edit button — only show for owner */}
          {!editing &&
          <button
            onClick={startEdit}
            title="Edit profile"
            style={{
              position: 'absolute', bottom: 0, right: 'calc(50% - 72px)',
              width: 28, height: 28,
              border: 'var(--stroke) solid var(--ink)',
              borderRadius: '50%',
              background: 'var(--paper)',
              display: 'grid', placeItems: 'center',
              cursor: 'pointer', color: 'var(--ink-soft)',
              boxShadow: '2px 2px 0 var(--ink)',
              transition: 'all 0.15s',
              zIndex: 2
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--paper)'}>
            
              <I.edit size={13} />
            </button>
          }


        </div>

        <div className="profile-name" style={{ position: 'relative', display: 'inline-block' }}>
          {profileData.name}
          <Doodles.UnderlineWobble className="doodle accent" style={{ left: '50%', transform: 'translateX(-50%)', bottom: -12 }} />
        </div>
        <div className="profile-handle">
          @ada · {profileData.location}
        </div>
        <div className="profile-bio">{profileData.bio}</div>

        <div className="profile-socials">
          {SOCIAL_DEFS.map((s) => profileData.socials[s.key] ?
          <a key={s.key} href={profileData.socials[s.key]} className="icon-btn" title={s.label} onClick={(e) => e.preventDefault()}>
              <s.icon size={18} />
            </a> :
          null)}
        </div>

        {/* Search bar */}
        <div className="profile-search">
          <I.search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => {setSearch(e.target.value);if (e.target.value) setBrowseDate(null);}}
            placeholder="search links & collections…" />
          
          {search &&
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
              <I.x size={14} />
            </button>
          }
        </div>

        {/* Date picker */}
        {!isSearching &&
        <ProfileDatePicker
          links={allPublicLinks}
          selectedDate={browseDate}
          onSelect={(d) => setBrowseDate(d)}
          onClear={() => setBrowseDate(null)} />

        }

        {/* Search results */}
        {isSearching ?
        <div style={{ width: '100%', marginBottom: 24 }}>
            {searchResults.length === 0 ?
          <div style={{ padding: '24px 0', color: 'var(--ink-mute)', fontSize: 14 }}>
                <Doodles.Swirl style={{ margin: '0 auto 10px', color: 'var(--ink-mute)' }} />
                No results for "<span className="hand">{search}</span>"
              </div> :

          <div className="profile-links">
                {searchResults.map((l, i) => {
              const col = collections.find((c) => c.id === l.collection);
              return (
                <a key={l.id} href="#" onClick={(e) => e.preventDefault()} className={cls('profile-link', i === 0 && l.featured && 'feature')}>
                      <span className="link-emoji">{col?.emoji || '◇'}</span>
                      <div>
                        <div>{l.title}</div>
                        <div className="mono text-mute" style={{ fontSize: 11, marginTop: 2 }}>{col?.name.toLowerCase()}</div>
                      </div>
                      <I.arrow className="arrow" size={18} />
                    </a>);

            })}
              </div>
          }
          </div> :

        isBrowsingDate ? (
        /* ── Date browse results ── */
        <div style={{ width: '100%', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <svg width="10" height="32" viewBox="0 0 10 32" fill="none"><path d="M8 1 L2 1 L2 31 L8 31" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" /></svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-mute)' }}>
                {fmt(browseDate)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)', marginLeft: 4 }}>
                · {dateResults.length} link{dateResults.length !== 1 ? 's' : ''}
              </span>
            </div>
            {dateResults.length === 0 ?
          <div style={{ padding: '24px 0', color: 'var(--ink-mute)', fontSize: 14, textAlign: 'center' }}>
                <Doodles.Swirl style={{ margin: '0 auto 10px', color: 'var(--ink-mute)' }} />
                <span>Nothing posted on <span className="hand" style={{ fontSize: '1.2em' }}>{fmt(browseDate)}</span></span>
              </div> :

          <div className="profile-links">
                {dateResults.map((l, i) => {
              const col = collections.find((c) => c.id === l.collection);
              return (
                <a key={l.id} href="#" onClick={(e) => e.preventDefault()} className={cls('profile-link', i === 0 && l.featured && 'feature')}>
                      <span className="link-emoji">{col?.emoji || '◇'}</span>
                      <div>
                        <div>{l.title}</div>
                        <div className="mono text-mute" style={{ fontSize: 11, marginTop: 2 }}>{col?.name.toLowerCase()}</div>
                      </div>
                      <I.arrow className="arrow" size={18} />
                    </a>);

            })}
              </div>
          }
          </div>) :


        <>
            {/* Tab bar: Featured | public collections */}
            <div className="profile-tabs">
              <button className={cls('profile-tab', activeTab === 'links' && 'active')} onClick={() => setActiveTab('links')}>
                Featured
              </button>
              {publicCols.map((c) =>
            <button key={c.id} className={cls('profile-tab', activeTab === c.id && 'active')} onClick={() => setActiveTab(c.id)}>
                  {c.emoji} {c.name}
                </button>
            )}
            </div>

            {/* Featured links */}
            {activeTab === 'links' &&
          <div className="profile-links">
                {featured.map((l, i) => {
              const col = collections.find((c) => c.id === l.collection);
              return (
                <a key={l.id} href="#" onClick={(e) => e.preventDefault()} className={cls('profile-link', i === 0 && 'feature')}>
                      <span className="link-emoji">{col?.emoji || '◇'}</span>
                      <div>
                        <div>{l.title}</div>
                        <div className="mono text-mute" style={{ fontSize: 11, marginTop: 2 }}>{col?.name.toLowerCase()}</div>
                      </div>
                      <I.arrow className="arrow" size={18} />
                    </a>);

            })}
              </div>
          }

            {/* Public collection tabs */}
            {publicCols.map((c) => activeTab === c.id &&
          <div key={c.id} className="profile-links">
                {links.filter((l) => l.collection === c.id).length === 0 ?
            <div style={{ color: 'var(--ink-mute)', fontSize: 14, padding: '24px 0' }}>No links in this collection yet.</div> :

            links.filter((l) => l.collection === c.id).map((l, i) =>
            <a key={l.id} href="#" onClick={(e) => e.preventDefault()} className="profile-link">
                      <span className="link-emoji">{c.emoji}</span>
                      <div>
                        <div>{l.title}</div>
                        <div className="mono text-mute" style={{ fontSize: 11, marginTop: 2 }}>{l.date ? fmt(l.date) : ''}</div>
                      </div>
                      <I.arrow className="arrow" size={18} />
                    </a>
            )
            }
              </div>
          )}
          </>
        }

        <div style={{ marginTop: 40, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
          made with <span style={{ fontFamily: 'var(--font-display)', fontSize: 13 }}>artlinks</span>
        </div>

        <Doodles.ArrowCurl className="doodle accent" style={{ left: -110, top: 150, transform: 'rotate(20deg)' }} />
        <Doodles.Asterisk className="doodle accent" style={{ right: -50, top: 280 }} />
        <Doodles.Dots className="doodle" style={{ right: -80, top: 420, color: 'var(--ink-mute)' }} />
      </div>
    </div>);

}

/* ========== MODAL (add / edit) ========== */
function LinkModal({ mode, link, onClose, onSave, onDelete }) {
  const [title, setTitle] = useS(link?.title || '');
  const [url, setUrl] = useS(link?.url || '');
  const [collection, setCollection] = useS(link?.collection || 'c-writing');
  const [featured, setFeatured] = useS(link?.featured || false);
  const [thumb, setThumb] = useS(link?.thumb || '');
  const [date, setDate] = useS(link?.date || window.__dailyDefaultDate || today);
  useE(() => {window.__dailyDefaultDate = null;}, []);

  const submit = (e) => {
    e?.preventDefault();
    if (!title || !url) return;
    onSave({ title, url, collection, featured, thumb, date });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div className="page-eyebrow" style={{ marginBottom: 4 }}>artlinks</div>
            <h2>{mode === 'add' ? 'Add a link' : 'Edit link'}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><I.x size={18} /></button>
        </div>

        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New essay — On making things slowly" autoFocus />
        </div>
        <div className="field">
          <label>URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field flex-1">
            <label>Collection</label>
            <select value={collection} onChange={(e) => setCollection(e.target.value)}>
              {COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 160 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field flex-1">
            <label>Show on profile?</label>
            <button type="button" className={cls('btn ghost small', featured && 'primary')}
            style={{ width: '100%', justifyContent: 'center', height: 40 }}
            onClick={() => setFeatured(!featured)}>
              <I.star size={14} stroke={featured ? 2 : 1.4} /> {featured ? 'featured' : 'private'}
            </button>
          </div>
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: 'space-between' }}>
          <div>
            {mode === 'edit' &&
            <button type="button" className="btn ghost small" onClick={onDelete}>
                <I.trash size={14} /> delete link
              </button>
            }
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">
              <I.check size={14} /> {mode === 'add' ? 'Add link' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>);

}

/* ========== TWEAKS ========== */
function TweaksPanel({ tweaks, setTweaks }) {
  const [visible, setVisible] = useS(false);
  const [collapsed, setCollapsed] = useS(false);

  useE(() => {
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setVisible(true);
      if (e.data.type === '__deactivate_edit_mode') setVisible(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const update = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };

  if (!visible) return null;

  return (
    <div className="tweaks-panel">
      <h4>
        Tweaks
        <button className="icon-btn" onClick={() => setCollapsed(!collapsed)} style={{ width: 22, height: 22 }}>
          {collapsed ? <I.plus size={14} /> : <I.x size={14} />}
        </button>
      </h4>
      {!collapsed && <>
        <div className="tweak">
          <label>Theme</label>
          <div className="seg">
            <button className={(tweaks.theme || 'light') === 'light' ? 'on' : ''} onClick={() => update({ theme: 'light' })}>☀ Light</button>
            <button className={tweaks.theme === 'dark' ? 'on' : ''} onClick={() => update({ theme: 'dark' })}>☾ Dark</button>
          </div>
        </div>
        <div className="tweak">
          <label>Direction</label>
          <div className="seg">
            <button className={tweaks.variant === 'notebook' ? 'on' : ''} onClick={() => update({ variant: 'notebook' })}>Notebook</button>
            <button className={tweaks.variant === 'studio' ? 'on' : ''} onClick={() => update({ variant: 'studio' })}>Studio</button>
          </div>
        </div>
        <div className="tweak">
          <label>Accent</label>
          <div className="swatches">
            {[
            { name: 'sky', v: '#8ec5ff' },
            { name: 'mint', v: '#a6e3c4' },
            { name: 'rose', v: '#f5b5b9' },
            { name: 'amber', v: '#f3d185' },
            { name: 'lilac', v: '#c5b4ec' }].
            map((s) =>
            <div key={s.name} className={cls('swatch', tweaks.accent === s.v && 'on')} style={{ background: s.v }} onClick={() => update({ accent: s.v })} />
            )}
          </div>
        </div>
        <div className="tweak">
          <label>Line weight</label>
          <div className="seg">
            <button className={tweaks.strokeWeight === 'thin' ? 'on' : ''} onClick={() => update({ strokeWeight: 'thin' })}>Thin</button>
            <button className={tweaks.strokeWeight === 'medium' ? 'on' : ''} onClick={() => update({ strokeWeight: 'medium' })}>Medium</button>
            <button className={tweaks.strokeWeight === 'bold' ? 'on' : ''} onClick={() => update({ strokeWeight: 'bold' })}>Bold</button>
          </div>
        </div>
        <div className="tweak">
          <label>Density</label>
          <div className="seg">
            <button className={tweaks.density === 'comfortable' ? 'on' : ''} onClick={() => update({ density: 'comfortable' })}>Cozy</button>
            <button className={tweaks.density === 'compact' ? 'on' : ''} onClick={() => update({ density: 'compact' })}>Compact</button>
          </div>
        </div>
      </>}
    </div>);

}

/* ========== DAILY PAGE ========== */
function DailyPage({ links, actions, onEdit, onAdd }) {
  const now = new Date();
  const [viewYear, setViewYear] = useS(now.getFullYear());
  const [viewMonth, setViewMonth] = useS(now.getMonth());
  const [selectedDate, setSelectedDate] = useS(today);

  // Build set of dates that have links
  const datesWithLinks = useM(() => {
    const s = {};
    links.forEach((l) => {if (l.date) s[l.date] = (s[l.date] || 0) + 1;});
    return s;
  }, [links]);

  const dayLinks = useM(() =>
  links.filter((l) => l.date === selectedDate).
  sort((a, b) => b.clicks - a.clicks),
  [links, selectedDate]
  );

  // Calendar grid
  const calCells = useM(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {setViewMonth(11);setViewYear((y) => y - 1);} else
    setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {setViewMonth(0);setViewYear((y) => y + 1);} else
    setViewMonth((m) => m + 1);
  };

  const selStr = (d) => {
    const dd = String(d).padStart(2, '0');
    const mm = String(viewMonth + 1).padStart(2, '0');
    return `${viewYear}-${mm}-${dd}`;
  };

  const isToday = (d) => selStr(d) === today;
  const isSelected = (d) => selStr(d) === selectedDate;
  const hasLinks = (d) => datesWithLinks[selStr(d)] || 0;

  return (
    <>
      <header className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">artlinks / Daily</div>
          <h1>Daily links</h1>
          <div className="page-subtitle">
            Pin links to specific days — for drop announcements, essays, releases, or anything time-stamped.
            Visitors can browse your archive by date.
          </div>
          <Doodles.Squiggle className="doodle accent" style={{ left: 0, bottom: -14 }} />
        </div>
        <button className="btn primary" onClick={onAdd}>
          <I.plus size={16} /> Add to today
        </button>
      </header>

      <div className="daily-layout">
        {/* ── CALENDAR ── */}
        <div className="cal-wrap card">
          <div className="cal-nav">
            <button className="icon-btn" onClick={prevMonth}><span style={{ display: 'flex', transform: 'rotate(180deg)' }}><I.arrow size={16} /></span></button>
            <span className="cal-month">{fmtMonth(viewYear, viewMonth)}</span>
            <button className="icon-btn" onClick={nextMonth}><I.arrow size={16} /></button>
          </div>

          <div className="cal-grid-hd">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) =>
            <div key={d} className="cal-weekday">{d}</div>
            )}
          </div>

          <div className="cal-grid">
            {calCells.map((d, i) => {
              if (!d) return <div key={'e' + i} />;
              const count = hasLinks(d);
              const sel = isSelected(d);
              const tod = isToday(d);
              return (
                <button
                  key={d}
                  className={cls('cal-day', sel && 'selected', tod && 'today', count > 0 && 'has-links')}
                  onClick={() => setSelectedDate(selStr(d))}>
                  
                  <span className="cal-day-num">{d}</span>
                  {count > 0 &&
                  <span className="cal-dot-row">
                      {Array.from({ length: Math.min(count, 4) }).map((_, j) =>
                    <span key={j} className="cal-dot" />
                    )}
                    </span>
                  }
                </button>);

            })}
          </div>

          {/* Mini legend */}
          <div className="cal-legend">
            <span className="row" style={{ gap: 6 }}><span className="cal-dot" style={{ background: 'var(--accent-ink)' }} /> has links</span>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.4px solid var(--ink)', display: 'inline-block' }} /> today</span>
          </div>
        </div>

        {/* ── DAY PANEL ── */}
        <div className="day-panel">
          <div className="day-panel-hd">
            <div>
              <div className="page-eyebrow" style={{ marginBottom: 2 }}>{selectedDate === today ? 'Today' : ''}</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{fmt(selectedDate)}</h2>
            </div>
            <button className="btn ghost small" onClick={() => {
              // Pre-fill modal with selected date — we trigger onAdd; modal defaults to today
              // so we set selected date as default inside modal via data attr trick
              window.__dailyDefaultDate = selectedDate;
              onAdd();
            }}>
              <I.plus size={14} /> Add to this day
            </button>
          </div>

          {dayLinks.length === 0 ?
          <div className="day-empty">
              <Doodles.Swirl style={{ color: 'var(--ink-mute)', margin: '0 auto 16px' }} />
              <div className="hand" style={{ fontSize: 22, color: 'var(--ink-mute)' }}>nothing here yet</div>
              <div style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 6 }}>
                Add links to {selectedDate === today ? 'today' : fmt(selectedDate)} to see them here.
              </div>
              <button className="btn ghost" style={{ marginTop: 20 }} onClick={() => {window.__dailyDefaultDate = selectedDate;onAdd();}}>
                <I.plus size={14} /> Add a link
              </button>
            </div> :

          <div className="link-list">
              <div className="link-list-hd">
                <div></div><div>link</div><div>collection</div><div>date added</div><div></div>
              </div>
              {dayLinks.map((link) =>
            <LinkRow
              key={link.id} link={link}
              onEdit={() => onEdit(link)}
              onToggleFeatured={() => actions.toggleFeatured(link.id)}
              onDelete={() => actions.deleteLink(link.id)} />

            )}
            </div>
          }

          {/* streak / summary row */}
          <div className="streak-bar mt-lg">
            <div className="streak-stat">
              <div className="label">Links this month</div>
              <div className="value">{links.filter((l) => l.date && l.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)).length}</div>
            </div>
            <div className="streak-stat">
              <div className="label">Active days</div>
              <div className="value">{Object.keys(datesWithLinks).filter((d) => d.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)).length}</div>
            </div>
            <div className="streak-stat">
              <div className="label">Total links</div>
              <div className="value">{links.length}</div>
            </div>
          </div>
        </div>
      </div>
    </>);

}

/* ========== LOGIN PAGE ========== */
function LoginPage({ onLogin, onGoSignup }) {
  const [email, setEmail] = useS('');
  const [password, setPassword] = useS('');
  const [showPw, setShowPw] = useS(false);
  const [error, setError] = useS('');

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    // Placeholder — wire to backend
    onLogin();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
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
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              autoComplete="email"
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
              {showPw ?
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C6.5 20 2 12 2 12a18.87 18.87 0 0 1 2.06-2.94M9.9 4.24A9.72 9.72 0 0 1 12 4c5.5 0 10 8 10 8a18.88 18.88 0 0 1-1.32 1.94M1 1l22 22" /></svg> :
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            Sign in
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <button className="auth-link" onClick={onGoSignup}>Create one</button>
        </div>
      </div>
    </div>
  );
}

/* ========== SIGNUP PAGE ========== */
function SignupPage({ onSignup, onGoLogin }) {
  const [name, setName] = useS('');
  const [email, setEmail] = useS('');
  const [password, setPassword] = useS('');
  const [confirm, setConfirm] = useS('');
  const [showPw, setShowPw] = useS(false);
  const [showConfirm, setShowConfirm] = useS(false);
  const [error, setError] = useS('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    // Placeholder — wire to backend
    onSignup();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
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
            <label>Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Ada Okafor"
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              autoComplete="email"
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
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="auth-pw-toggle"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ?
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C6.5 20 2 12 2 12a18.87 18.87 0 0 1 2.06-2.94M9.9 4.24A9.72 9.72 0 0 1 12 4c5.5 0 10 8 10 8a18.88 18.88 0 0 1-1.32 1.94M1 1l22 22" /></svg> :
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
              }
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
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="auth-pw-toggle"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ?
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C6.5 20 2 12 2 12a18.87 18.87 0 0 1 2.06-2.94M9.9 4.24A9.72 9.72 0 0 1 12 4c5.5 0 10 8 10 8a18.88 18.88 0 0 1-1.32 1.94M1 1l22 22" /></svg> :
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            Create account
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <button className="auth-link" onClick={onGoLogin}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { App, COLLECTIONS: COLLECTIONS_SEED });