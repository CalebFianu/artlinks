import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { I, Doodles, cls } from '../components/Icons';
import { useTweaks } from '../context/TweaksContext';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../api/collections';
import { isFeatured, isPublicCollection, linkDate, fmt, fmtMonth, collectionEmoji, todayStr } from '../utils/models';

const SOCIAL_DEFS = [
  { key: 'instagram', label: 'Instagram', icon: I.insta },
  { key: 'twitter', label: 'X / Twitter', icon: I.x_social },
  { key: 'youtube', label: 'YouTube', icon: I.youtube },
  { key: 'twitch', label: 'Twitch', icon: I.twitch },
  { key: 'tiktok', label: 'TikTok', icon: I.tiktok },
  { key: 'linkedin', label: 'LinkedIn', icon: I.linkedin },
  { key: 'spotify', label: 'Spotify', icon: I.spotify },
  { key: 'soundcloud', label: 'SoundCloud', icon: I.soundcloud },
  { key: 'pinterest', label: 'Pinterest', icon: I.pinterest },
  { key: 'website', label: 'Website', icon: I.globe },
  { key: 'email', label: 'Email', icon: I.mail },
];

export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTweaks();
  const isDark = theme === 'dark';

  const [featuredLinks, setFeaturedLinks] = useState([]);
  const [publicCollections, setPublicCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('links');
  const [browseDate, setBrowseDate] = useState(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    getUserProfile(username)
      .then(({ data }) => {
        setFeaturedLinks(data.featured_links || []);
        setPublicCollections(data.public_collections || []);
      })
      .catch((e) => {
        if (e.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [username]);

  const today = todayStr();

  const allPublicLinks = useMemo(() => {
    const colLinks = publicCollections.flatMap((c) => c.links || []);
    const seen = new Set();
    return [...featuredLinks, ...colLinks].filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
  }, [featuredLinks, publicCollections]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allPublicLinks.filter(
      (l) => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
    );
  }, [search, allPublicLinks]);

  const dateResults = useMemo(() => {
    if (!browseDate) return [];
    return allPublicLinks.filter((l) => linkDate(l) === browseDate);
  }, [browseDate, allPublicLinks]);

  const isSearching = search.trim().length > 0;
  const isBrowsingDate = !isSearching && browseDate !== null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--ink-mute)' }}>
        Loading…
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <Doodles.Swirl style={{ margin: '0 auto 16px', color: 'var(--ink-mute)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)' }}>Profile not found</h2>
          <p style={{ color: 'var(--ink-mute)' }}>No user with the username <strong>{username}</strong> exists.</p>
          <button className="btn ghost" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>← Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrap" style={{ position: 'relative' }}>
      {/* Top chrome */}
      {user && (
        <button className="btn ghost small" onClick={() => navigate('/dashboard')} style={{ position: 'fixed', top: 20, left: 20, zIndex: 10 }}>
          <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><I.arrow size={14} /></span> back to editor
        </button>
      )}
      <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="icon-btn theme-toggle" onClick={toggleTheme}>
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
          )}
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
          artlinks.to/{username}
        </span>
      </div>

      <div className="profile-card">
        {/* Avatar + bio */}
        <div className="profile-avatar">
          {username?.[0]?.toUpperCase() || 'A'}
        </div>

        <div className="profile-name" style={{ position: 'relative', display: 'inline-block' }}>
          {username}
          <Doodles.UnderlineWobble className="doodle accent" style={{ left: '50%', transform: 'translateX(-50%)', bottom: -12 }} />
        </div>
        <div className="profile-handle">@{username}</div>

        {/* Search bar */}
        <div className="profile-search">
          <I.search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (e.target.value) setBrowseDate(null); }}
            placeholder="search links & collections…"
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
              <I.x size={14} />
            </button>
          )}
        </div>

        {/* Date picker */}
        {!isSearching && (
          <ProfileDatePicker
            links={allPublicLinks}
            selectedDate={browseDate}
            onSelect={setBrowseDate}
            onClear={() => setBrowseDate(null)}
          />
        )}

        {/* Content area */}
        {isSearching ? (
          <div style={{ width: '100%', marginBottom: 24 }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: '24px 0', color: 'var(--ink-mute)', fontSize: 14, textAlign: 'center' }}>
                <Doodles.Swirl style={{ margin: '0 auto 10px', color: 'var(--ink-mute)' }} />
                No results for &ldquo;<span className="hand">{search}</span>&rdquo;
              </div>
            ) : (
              <div className="profile-links">
                {searchResults.map((l, i) => (
                  <ProfileLink key={l.id} link={l} index={i} />
                ))}
              </div>
            )}
          </div>
        ) : isBrowsingDate ? (
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
            {dateResults.length === 0 ? (
              <div style={{ padding: '24px 0', color: 'var(--ink-mute)', fontSize: 14, textAlign: 'center' }}>
                <Doodles.Swirl style={{ margin: '0 auto 10px', color: 'var(--ink-mute)' }} />
                Nothing posted on <span className="hand">{fmt(browseDate)}</span>
              </div>
            ) : (
              <div className="profile-links">
                {dateResults.map((l, i) => <ProfileLink key={l.id} link={l} index={i} />)}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="profile-tabs">
              <button className={cls('profile-tab', activeTab === 'links' && 'active')} onClick={() => setActiveTab('links')}>
                Featured
              </button>
              {publicCollections.map((c) => (
                <button key={c.id} className={cls('profile-tab', activeTab === String(c.id) && 'active')} onClick={() => setActiveTab(String(c.id))}>
                  {c.emoji || collectionEmoji(c.id)} {c.name}
                </button>
              ))}
            </div>

            {activeTab === 'links' && (
              <div className="profile-links">
                {featuredLinks.map((l, i) => <ProfileLink key={l.id} link={l} index={i} />)}
              </div>
            )}

            {publicCollections.map((c) =>
              activeTab === String(c.id) ? (
                <div key={c.id} className="profile-links">
                  {(c.links || []).length === 0 ? (
                    <div style={{ color: 'var(--ink-mute)', fontSize: 14, padding: '24px 0' }}>No links in this collection yet.</div>
                  ) : (
                    (c.links || []).map((l, i) => <ProfileLink key={l.id || i} link={l} index={i} />)
                  )}
                </div>
              ) : null
            )}
          </>
        )}

        <div style={{ marginTop: 40, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
          made with <span style={{ fontFamily: 'var(--font-display)', fontSize: 13 }}>artlinks</span>
        </div>

        <Doodles.ArrowCurl className="doodle accent" style={{ left: -110, top: 150, transform: 'rotate(20deg)' }} />
        <Doodles.Asterisk className="doodle accent" style={{ right: -50, top: 280 }} />
        <Doodles.Dots className="doodle" style={{ right: -80, top: 420, color: 'var(--ink-mute)' }} />
      </div>
    </div>
  );
}

function ProfileLink({ link, index }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cls('profile-link', index === 0 && isFeatured(link) && 'feature')}
    >
      <span className="link-emoji">◇</span>
      <div>
        <div>{link.title}</div>
        {link.link_day && (
          <div className="mono text-mute" style={{ fontSize: 11, marginTop: 2 }}>{fmt(link.link_day.slice(0, 10))}</div>
        )}
      </div>
      <I.arrow className="arrow" size={18} />
    </a>
  );
}

/* ── Inline date picker for public profile ── */
function ProfileDatePicker({ links, selectedDate, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate) return new Date(selectedDate + 'T00:00:00').getFullYear();
    return now.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) return new Date(selectedDate + 'T00:00:00').getMonth();
    return now.getMonth();
  });
  const ref = useRef(null);

  const datesWithLinks = useMemo(() => {
    const s = new Set();
    links.forEach((l) => { const d = linkDate(l); if (d) s.add(d); });
    return s;
  }, [links]);

  const today = todayStr();

  const calCells = useMemo(() => {
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
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const fmtSelected = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', marginBottom: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          border: selectedDate ? '1.6px solid var(--ink)' : '1.5px dashed var(--ink-mute)',
          borderRadius: 999,
          background: selectedDate ? 'var(--paper-2)' : 'transparent',
          cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14,
          color: selectedDate ? 'var(--ink)' : 'var(--ink-mute)',
          boxShadow: selectedDate ? '2px 2px 0 var(--ink)' : 'none',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span style={{ flex: 1, textAlign: 'left' }}>
          {selectedDate ? fmtSelected(selectedDate) : 'Browse by date…'}
        </span>
        {selectedDate ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', fontSize: 11, cursor: 'pointer' }}
          >
            clear ×
          </span>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.4 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, width: 300,
          background: 'var(--paper)', border: '1.6px solid var(--ink)', borderRadius: 14,
          padding: '18px 16px 14px', boxShadow: '4px 4px 0 var(--ink)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', display: 'flex', padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{fmtMonth(viewYear, viewMonth)}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', display: 'flex', padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', color: 'var(--ink-mute)', padding: '2px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {calCells.map((d, i) => {
              if (!d) return <div key={'e' + i} />;
              const ds = selStr(d);
              const hasL = datesWithLinks.has(ds);
              const isSel = ds === selectedDate;
              const isTod = ds === today;
              return (
                <button
                  key={d}
                  onClick={() => { if (hasL) { onSelect(ds); setOpen(false); } }}
                  style={{
                    aspectRatio: '1', border: isTod && !isSel ? '1.3px solid var(--ink)' : 'none',
                    borderRadius: 7,
                    background: isSel ? 'var(--ink)' : hasL ? 'var(--accent-soft)' : 'transparent',
                    color: isSel ? 'var(--paper)' : hasL ? 'var(--ink)' : 'var(--ink-mute)',
                    fontFamily: 'var(--font-ui)', fontSize: 12,
                    cursor: hasL ? 'pointer' : 'default',
                    opacity: hasL ? 1 : 0.35, fontWeight: hasL ? 600 : 400,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2, padding: '3px 2px',
                  }}
                >
                  {d}
                  {hasL && !isSel && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-ink)', display: 'block' }} />}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1.2px dashed var(--ink-mute)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--accent-soft)', display: 'inline-block', flexShrink: 0 }} />
            days with links
          </div>
        </div>
      )}
    </div>
  );
}
