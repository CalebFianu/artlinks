import { useState } from 'react';
import { I } from './Icons';

const COLLECTION_EMOJIS = ['✺', '◇', '♪', '◉', '❋', '▲', '◈', '⬡', '✦', '◎', '⊹', '⌘'];

export default function NewCollectionModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [emoji, setEmoji] = useState('✺');

  const submit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), category: isPublic ? 'public' : 'private', emoji });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal al-new-col-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
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
        </svg>

        <button className="icon-btn" onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}>
          <I.x size={18} />
        </button>

        <form onSubmit={submit} style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-mute)', marginBottom: 10 }}>new collection</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8 }}>
              Create a<br /><em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>collection</em>
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: 0 }}>Group your links by theme, project, or season.</p>
          </div>

          {/* Emoji picker */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-mute)', marginBottom: 8 }}>icon</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLLECTION_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
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
                    transition: 'all 0.12s',
                  }}
                >
                  {e}
                </button>
              ))}
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
              style={{ boxShadow: '2px 2px 0 var(--ink)', fontSize: 16 }}
            />
          </div>

          {/* Public / Private toggle */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-mute)', marginBottom: 10 }}>visibility</div>
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
                  transition: 'all 0.12s', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
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
                  transition: 'all 0.12s', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I.eye size={15} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500 }}>Public</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.65 }}>Shows on your profile</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.5 }}>
              <I.check size={14} /> Create collection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
