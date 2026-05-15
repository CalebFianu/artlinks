import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Doodles, cls } from '../components/Icons';
import Sidebar from '../components/Sidebar';
import LinkRow from '../components/LinkRow';
import LinkModal from '../components/LinkModal';
import Toast from '../components/Toast';
import { useLinks } from '../hooks/useLinks';
import { useCollections } from '../hooks/useCollections';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { getUserLinksByMonth, getUserLinksByDay } from '../api/links';
import { todayStr, fmt, fmtMonth, linkDate } from '../utils/models';

export default function DailyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { links: allLinks, addLink, updateLink, deleteLink, toggleFeatured } = useLinks(user?.username);
  const { collections } = useCollections();
  const { toast, showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultDate, setAddDefaultDate] = useState(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr());

  // Month links grouped by date
  const [monthData, setMonthData] = useState({});
  const [dayLinks, setDayLinks] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    if (!user?.username) return;
    getUserLinksByMonth(user.username, viewMonth + 1, viewYear)
      .then(({ data }) => setMonthData(data))
      .catch(() => {});
  }, [user?.username, viewMonth, viewYear]);

  useEffect(() => {
    if (!user?.username || !selectedDate) return;
    setDayLoading(true);
    getUserLinksByDay(user.username, selectedDate)
      .then(({ data }) => setDayLinks(data))
      .catch(() => setDayLinks([]))
      .finally(() => setDayLoading(false));
  }, [user?.username, selectedDate]);

  const datesWithLinks = useMemo(() => {
    const s = {};
    Object.entries(monthData).forEach(([date, arr]) => {
      s[date] = arr.length;
    });
    return s;
  }, [monthData]);

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

  const today = todayStr();
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleSaveAdd = async (payload) => {
    try {
      await addLink(payload);
      setShowAdd(false);
      setAddDefaultDate(null);
      showToast('Link added ✓');
      // Refetch day
      if (user?.username) {
        const { data } = await getUserLinksByDay(user.username, selectedDate);
        setDayLinks(data);
      }
    } catch (e) {
      showToast(e.response?.data?.category?.[0] || 'Failed to add link.');
    }
  };

  const handleSaveEdit = async (payload) => {
    try {
      await updateLink(editingLink.id, payload);
      setEditingLink(null);
      showToast('Saved ✓');
      if (user?.username) {
        const { data } = await getUserLinksByDay(user.username, selectedDate);
        setDayLinks(data);
      }
    } catch {
      showToast('Failed to save.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLink(id);
      setDayLinks((prev) => prev.filter((l) => l.id !== id));
      showToast('Deleted');
    } catch {
      showToast('Failed to delete.');
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      await toggleFeatured(id);
      setDayLinks((prev) => prev.map((l) => l.id === id ? { ...l, category: l.category === 'featured' ? 'regular' : 'featured' } : l));
    } catch (e) {
      showToast(e.response?.data?.category?.[0] || 'Could not update.');
    }
  };

  const monthLinksCount = Object.values(monthData).reduce((s, arr) => s + arr.length, 0);
  const activeDays = Object.keys(datesWithLinks).length;

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
              <div className="page-eyebrow">artlinks / Daily</div>
              <h1>Daily links</h1>
              <div className="page-subtitle">
                Pin links to specific days — for drop announcements, essays, releases, or anything time-stamped.
              </div>
              <Doodles.Squiggle className="doodle accent" style={{ left: 0, bottom: -14 }} />
            </div>
            <button className="btn primary" onClick={() => { setAddDefaultDate(today); setShowAdd(true); }}>
              <I.plus size={16} /> Add to today
            </button>
          </header>

          <div className="daily-layout">
            {/* Calendar */}
            <div className="cal-wrap card">
              <div className="cal-nav">
                <button className="icon-btn" onClick={prevMonth}>
                  <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><I.arrow size={16} /></span>
                </button>
                <span className="cal-month">{fmtMonth(viewYear, viewMonth)}</span>
                <button className="icon-btn" onClick={nextMonth}><I.arrow size={16} /></button>
              </div>

              <div className="cal-grid-hd">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="cal-weekday">{d}</div>
                ))}
              </div>

              <div className="cal-grid">
                {calCells.map((d, i) => {
                  if (!d) return <div key={'e' + i} />;
                  const ds = selStr(d);
                  const count = datesWithLinks[ds] || 0;
                  const sel = ds === selectedDate;
                  const tod = ds === today;
                  return (
                    <button
                      key={d}
                      className={cls('cal-day', sel && 'selected', tod && 'today', count > 0 && 'has-links')}
                      onClick={() => setSelectedDate(ds)}
                    >
                      <span className="cal-day-num">{d}</span>
                      {count > 0 && (
                        <span className="cal-dot-row">
                          {Array.from({ length: Math.min(count, 4) }).map((_, j) => (
                            <span key={j} className="cal-dot" />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="cal-legend">
                <span className="row" style={{ gap: 6 }}>
                  <span className="cal-dot" style={{ background: 'var(--accent-ink)' }} /> has links
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.4px solid var(--ink)', display: 'inline-block' }} /> today
                </span>
              </div>
            </div>

            {/* Day panel */}
            <div className="day-panel">
              <div className="day-panel-hd">
                <div>
                  <div className="page-eyebrow" style={{ marginBottom: 2 }}>{selectedDate === today ? 'Today' : ''}</div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{fmt(selectedDate)}</h2>
                </div>
                <button className="btn ghost small" onClick={() => { setAddDefaultDate(selectedDate); setShowAdd(true); }}>
                  <I.plus size={14} /> Add to this day
                </button>
              </div>

              {dayLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>Loading…</div>
              ) : dayLinks.length === 0 ? (
                <div className="day-empty">
                  <Doodles.Swirl style={{ color: 'var(--ink-mute)', margin: '0 auto 16px' }} />
                  <div className="hand" style={{ fontSize: 22, color: 'var(--ink-mute)' }}>nothing here yet</div>
                  <div style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 6 }}>
                    Add links to {selectedDate === today ? 'today' : fmt(selectedDate)} to see them here.
                  </div>
                  <button className="btn ghost" style={{ marginTop: 20 }} onClick={() => { setAddDefaultDate(selectedDate); setShowAdd(true); }}>
                    <I.plus size={14} /> Add a link
                  </button>
                </div>
              ) : (
                <div className="link-list">
                  <div className="link-list-hd"><div /><div>link</div><div>collection</div><div>date added</div><div /></div>
                  {dayLinks.map((link) => (
                    <LinkRow
                      key={link.id} link={link} collections={collections}
                      onEdit={() => setEditingLink(link)}
                      onToggleFeatured={() => handleToggleFeatured(link.id)}
                      onDelete={() => handleDelete(link.id)}
                    />
                  ))}
                </div>
              )}

              <div className="streak-bar mt-lg">
                <div className="streak-stat">
                  <div className="label">Links this month</div>
                  <div className="value">{monthLinksCount}</div>
                </div>
                <div className="streak-stat">
                  <div className="label">Active days</div>
                  <div className="value">{activeDays}</div>
                </div>
                <div className="streak-stat">
                  <div className="label">Total links</div>
                  <div className="value">{allLinks.length}</div>
                </div>
              </div>
            </div>
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

      {showAdd && (
        <LinkModal
          mode="add" collections={collections} defaultDate={addDefaultDate}
          onClose={() => { setShowAdd(false); setAddDefaultDate(null); }}
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
