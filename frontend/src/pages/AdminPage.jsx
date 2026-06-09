import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { I, cls } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useTweaks } from '../context/TweaksContext';
import { useToast } from '../hooks/useToast';
import { getAdminUsers, adminDisableUser, adminEnableUser } from '../api/admin';

// ── Status helpers ────────────────────────────────────────────────────────────

function userStatus(u) {
  if (u.admin_disabled_at) return 'suspended';
  if (u.disabled_at) return 'self-disabled';
  return 'active';
}

function StatusBadge({ user }) {
  const s = userStatus(user);
  const styles = {
    suspended: {
      background: 'oklch(0.97 0.03 25)',
      color: 'oklch(0.45 0.18 25)',
      border: '1px solid oklch(0.88 0.06 25)',
    },
    'self-disabled': {
      background: 'var(--surface-2, #f5f5f5)',
      color: 'var(--ink-mute)',
      border: '1px solid var(--border)',
    },
    active: {
      background: 'oklch(0.96 0.04 145)',
      color: 'oklch(0.4 0.14 145)',
      border: '1px solid oklch(0.88 0.08 145)',
    },
  }[s];

  const labels = {
    suspended: 'Suspended',
    'self-disabled': 'Self-disabled',
    active: 'Active',
  };

  return (
    <span
      style={{
        ...styles,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {labels[s]}
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ count, page, pageSize, onPageChange }) {
  if (count <= pageSize) return null;
  const totalPages = Math.ceil(count / pageSize);

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    // Always show first, last, current ±1, and ellipsis gaps
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - 1 && i <= page + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 24,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      <button
        className="btn ghost small"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        style={{ padding: '4px 10px', minWidth: 0 }}
      >
        ←
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span
            key={`ellipsis-${i}`}
            style={{ padding: '4px 6px', color: 'var(--ink-mute)', fontSize: 13 }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            className={cls('btn small', p === page ? 'primary' : 'ghost')}
            onClick={() => onPageChange(p)}
            style={{ padding: '4px 10px', minWidth: 32 }}
          >
            {p}
          </button>
        )
      )}

      <button
        className="btn ghost small"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        style={{ padding: '4px 10px', minWidth: 0 }}
      >
        →
      </button>
    </div>
  );
}

// ── Confirm popover ───────────────────────────────────────────────────────────

function ConfirmInline({ username, onConfirm, onCancel }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'oklch(0.97 0.03 25)',
        border: '1px solid oklch(0.88 0.06 25)',
        borderRadius: 8,
        padding: '5px 10px',
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        color: 'oklch(0.4 0.15 25)',
      }}
    >
      <span>Suspend @{username}?</span>
      <button
        className="btn small"
        onClick={onConfirm}
        style={{
          background: 'oklch(0.5 0.18 25)',
          color: '#fff',
          border: 'none',
          padding: '3px 10px',
          fontSize: 11,
        }}
      >
        Confirm
      </button>
      <button
        className="btn ghost small"
        onClick={onCancel}
        style={{ padding: '3px 10px', fontSize: 11 }}
      >
        Cancel
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTweaks();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Search
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const debounceTimer = useRef(null);

  // Platform stats
  const [stats, setStats] = useState(null);

  const PAGE_SIZE = 10;

  // Fetch platform stats once on mount
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL;
    axios.get(`${base}/platform-stats/`)
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  // Debounce search input — reset to page 1 when search changes
  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearch(val.trim());
      setPage(1);
      setConfirmingId(null);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
    setConfirmingId(null);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminUsers(page, search)
      .then(({ data }) => {
        if (!cancelled) {
          setUsers(data.results);
          setCount(data.count);
        }
      })
      .catch(() => {
        if (!cancelled) showToast('Failed to load users.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (p) => {
    setPage(p);
    setConfirmingId(null);
  };

  const handleDisable = async (u) => {
    setActionLoading(u.id);
    setConfirmingId(null);
    try {
      await adminDisableUser(u.id);
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, admin_disabled_at: new Date().toISOString() } : x
        )
      );
      showToast(`@${u.username} has been suspended.`);
    } catch {
      showToast('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnable = async (u) => {
    setActionLoading(u.id);
    try {
      await adminEnableUser(u.id);
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, admin_disabled_at: null } : x
        )
      );
      showToast(`@${u.username} has been reinstated.`);
    } catch {
      showToast('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="app">
      <div
        className={cls('sidebar-backdrop', sidebarOpen && 'open')}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 4,
              color: 'var(--ink)',
            }}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div
            className="brand"
            style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <span className="dot" />artlinks
          </div>
          <div className="mobile-topbar-actions">
            <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <main className="main">
          <header className="page-header">
            <div className="page-title-group">
              <div className="page-eyebrow">artlinks / Admin</div>
              <h1>User management</h1>
              <div className="page-subtitle">
                View all accounts, their activity, and suspend or reinstate users.
              </div>
            </div>
            {search && (
              <div
                className="mono text-mute"
                style={{ fontSize: 12, alignSelf: 'flex-end', paddingBottom: 4 }}
              >
                {count} {count === 1 ? 'result' : 'results'}
              </div>
            )}
          </header>

          {/* Stats ribbon */}
          <section className="stats-bar" style={{ marginTop: 20 }}>
            {[
              { label: 'Total users',       value: stats ? String(stats.creators).padStart(3, '0') : '—' },
              { label: 'Total links',       value: stats ? String(stats.links).padStart(3, '0')    : '—' },
              { label: 'Total collections', value: stats ? String(stats.collections).padStart(3, '0') : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="stat-cell">
                <div className="label">{label}</div>
                <div className="value">{value}</div>
              </div>
            ))}
          </section>

          {/* Search bar */}
          <div className="search" style={{ marginTop: 20, marginBottom: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="search by username or email…"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                style={{
                  position: 'absolute',
                  right: 16,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-mute)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                }}
                aria-label="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* User table */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'visible',
              marginTop: 8,
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px 90px 120px 160px',
                gap: 0,
                borderBottom: '1px solid var(--border)',
                padding: '10px 20px',
                background: 'var(--surface-2, var(--surface))',
              }}
            >
              {['Username', 'Email', 'Links', 'Collections', 'Status', 'Action'].map((h) => (
                <div
                  key={h}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--ink-mute)',
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {loading ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--ink-mute)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}
              >
                Loading…
              </div>
            ) : users.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--ink-mute)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}
              >
                {search ? `No users matching "${search}".` : 'No users found.'}
              </div>
            ) : (
              users.map((u, idx) => {
                const isSelf = user?.id === u.id;
                const isSuspended = !!u.admin_disabled_at;
                const isActing = actionLoading === u.id;
                const isConfirming = confirmingId === u.id;

                return (
                  <div
                    key={u.id}
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 80px 90px 120px 160px',
                      gap: 0,
                      padding: '14px 20px',
                      borderBottom: idx < users.length - 1 ? '1px solid var(--border)' : 'none',
                      alignItems: 'center',
                      transition: 'background 0.12s',
                      background: isSuspended
                        ? 'oklch(0.99 0.01 25 / 0.4)'
                        : 'transparent',
                    }}
                  >
                    {/* Username */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--accent-soft)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: 12,
                          flexShrink: 0,
                          opacity: isSuspended ? 0.5 : 1,
                        }}
                      >
                        {u.username[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            opacity: isSuspended ? 0.6 : 1,
                          }}
                        >
                          @{u.username}
                          {isSelf && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontFamily: 'var(--font-mono)',
                                fontSize: 9,
                                color: 'var(--ink-mute)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                              }}
                            >
                              you
                            </span>
                          )}
                        </div>
                        <div
                          className="mono text-mute"
                          style={{ fontSize: 10, marginTop: 1 }}
                        >
                          joined {formatDate(u.date_joined)}
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--ink-mute)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        paddingRight: 12,
                        opacity: isSuspended ? 0.6 : 1,
                      }}
                    >
                      {u.email}
                    </div>

                    {/* Links count */}
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 500,
                        opacity: isSuspended ? 0.5 : 1,
                      }}
                    >
                      {u.link_count}
                    </div>

                    {/* Collections count */}
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 500,
                        opacity: isSuspended ? 0.5 : 1,
                      }}
                    >
                      {u.collection_count}
                    </div>

                    {/* Status badge */}
                    <div>
                      <StatusBadge user={u} />
                    </div>

                    {/* Action */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {isSelf ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--ink-mute)',
                          }}
                        >
                          —
                        </span>
                      ) : isConfirming ? null : isSuspended ? (
                        <button
                          className="btn ghost small"
                          disabled={isActing}
                          onClick={() => handleEnable(u)}
                          style={{
                            fontSize: 11,
                            padding: '4px 12px',
                            opacity: isActing ? 0.6 : 1,
                          }}
                        >
                          {isActing ? 'Working…' : 'Reinstate'}
                        </button>
                      ) : (
                        <button
                          className="btn ghost small"
                          disabled={isActing}
                          onClick={() => {
                            setConfirmingId(u.id);
                          }}
                          style={{
                            fontSize: 11,
                            padding: '4px 12px',
                            color: 'oklch(0.5 0.18 25)',
                            borderColor: 'oklch(0.82 0.06 25)',
                            opacity: isActing ? 0.6 : 1,
                          }}
                        >
                          Suspend
                        </button>
                      )}
                    </div>

                    {/* Confirm overlay — absolutely positioned on the row so it isn't clipped by the action column width */}
                    {isConfirming && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 20,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10,
                        }}
                      >
                        <ConfirmInline
                          username={u.username}
                          onConfirm={() => handleDisable(u)}
                          onCancel={() => setConfirmingId(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <Pagination
            count={count}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </main>
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}
