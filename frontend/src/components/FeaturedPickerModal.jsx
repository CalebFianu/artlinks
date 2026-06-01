import { useState } from 'react';
import { I } from './Icons';
import { isFeatured, linkDate, fmt } from '../utils/models';

export default function FeaturedPickerModal({ links, onClose, onFeature, onAddNew }) {
  const [search, setSearch] = useState('');

  const nonFeatured = links.filter((l) => !isFeatured(l));
  const filtered = nonFeatured.filter(
    (l) =>
      !search.trim() ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div className="page-eyebrow" style={{ marginBottom: 4 }}>artlinks / Featured</div>
            <h2>Add a featured link</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><I.x size={18} /></button>
        </div>

        {/* Search within existing links */}
        {nonFeatured.length > 0 && (
          <div className="search" style={{ marginBottom: 16 }}>
            <I.search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`search ${nonFeatured.length} link${nonFeatured.length !== 1 ? 's' : ''}…`}
              autoFocus
            />
          </div>
        )}

        {/* Existing links list */}
        {nonFeatured.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-mute)', fontSize: 14 }}>
            All your links are already featured, or you have no links yet.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '16px 0', color: 'var(--ink-mute)', fontSize: 14, textAlign: 'center' }}>
            No links match &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {filtered.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => { onFeature(link.id); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  border: '1.3px dashed var(--ink-mute)',
                  borderRadius: 10,
                  background: 'var(--paper)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.background = 'var(--paper-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ink-mute)'; e.currentTarget.style.background = 'var(--paper)'; }}
              >
                <I.star size={14} style={{ flexShrink: 0, color: 'var(--ink-mute)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {link.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {link.url}{link.link_day ? ` · ${fmt(link.link_day.slice(0, 10))}` : ''}
                  </div>
                </div>
                <I.arrow size={14} style={{ flexShrink: 0, color: 'var(--ink-mute)' }} />
              </button>
            ))}
          </div>
        )}

        {/* Divider + new link option */}
        <div style={{ borderTop: '1.2px dashed var(--ink-mute)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            or create something new
          </span>
          <button type="button" className="btn primary" onClick={() => { onAddNew(); onClose(); }}>
            <I.plus size={14} /> New link
          </button>
        </div>
      </div>
    </div>
  );
}
