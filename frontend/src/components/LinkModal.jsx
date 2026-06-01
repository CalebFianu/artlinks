import { useState } from 'react';
import { I, cls } from './Icons';
import { isFeatured, todayStr } from '../utils/models';

export default function LinkModal({ mode, link, collections, defaultDate, defaultCollectionId, defaultFeatured, onClose, onSave, onDelete, onCreateCollection }) {
  const [title, setTitle] = useState(link?.title || '');
  const [url, setUrl] = useState(link?.url || '');
  const [description, setDescription] = useState(link?.description || '');
  const [collectionId, setCollectionId] = useState(defaultCollectionId ? String(defaultCollectionId) : '');
  const [featured, setFeatured] = useState(link ? isFeatured(link) : Boolean(defaultFeatured));
  const [linkDay, setLinkDay] = useState(
    link?.link_day?.slice(0, 10) || defaultDate || todayStr()
  );

  // When adding inside a specific collection, lock the collection and hide the picker
  const lockedToCollection = mode === 'add' && Boolean(defaultCollectionId);

  const submit = (e) => {
    e?.preventDefault();
    if (!title.trim() || !url.trim()) return;
    onSave({
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      link_day: linkDay,
      category: featured ? 'featured' : 'regular',
      collectionId: collectionId || null,
    });
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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New essay — On making things slowly"
            autoFocus
          />
        </div>
        <div className="field">
          <label>URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="field">
          <label>Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short note about this link…"
          />
        </div>
        <div className="row" style={{ gap: 12 }}>
          {/* Show collection picker only when not locked to a specific collection */}
          {mode === 'add' && !lockedToCollection && collections.length > 0 && (
            <div className="field flex-1">
              <label>Collection <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                <option value="">— none —</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji || c.name} {c.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* No collections yet — offer to create one */}
          {mode === 'add' && !lockedToCollection && collections.length === 0 && onCreateCollection && (
            <div className="field flex-1">
              <label>Collection <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', fontSize: 14, color: 'var(--ink-mute)' }}>
                No collections yet —
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={onCreateCollection}
                  style={{ flexShrink: 0 }}
                >
                  <I.plus size={13} /> Create one
                </button>
              </div>
            </div>
          )}
          <div className="field" style={{ minWidth: 160 }}>
            <label>Date</label>
            <input
              type="date"
              value={linkDay}
              onChange={(e) => setLinkDay(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field flex-1">
            <label>Show on profile?</label>
            <button
              type="button"
              className={cls('btn ghost small', featured && 'primary')}
              style={{ width: '100%', justifyContent: 'center', height: 40 }}
              onClick={() => setFeatured((v) => !v)}
            >
              <I.star size={14} stroke={featured ? 2 : 1.4} /> {featured ? 'featured' : 'private'}
            </button>
          </div>
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: 'space-between' }}>
          <div>
            {mode === 'edit' && (
              <button type="button" className="btn ghost small" onClick={onDelete}>
                <I.trash size={14} /> delete link
              </button>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">
              <I.check size={14} /> {mode === 'add' ? 'Add link' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
