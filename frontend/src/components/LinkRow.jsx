import { I, cls } from './Icons';
import { isFeatured, linkCollection, linkDate, fmt, collectionEmoji } from '../utils/models';

export default function LinkRow({ link, collections, onEdit, onToggleFeatured, onDelete }) {
  const col = linkCollection(link, collections);
  const dateStr = linkDate(link);
  const featured = isFeatured(link);
  const emoji = col ? collectionEmoji(col.id) : '◇';

  return (
    <div className="link-row link-row-responsive">
      <div className="drag"><I.drag size={16} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="link-title" style={{ flexWrap: 'wrap', gap: 6 }}>
          {link.title}
          {featured && <span className="tag featured">★ featured</span>}
        </div>
        <div className="link-url">{link.url}</div>
        {/* Mobile-only inline meta */}
        <div className="link-row-mobile-meta">
          <span className="tag">{col ? `${emoji} ${col.name.toLowerCase()}` : '—'}</span>
          {dateStr && <span className="mono text-mute" style={{ fontSize: 11 }}>{fmt(dateStr)}</span>}
        </div>
      </div>
      {/* Desktop-only: collection + date columns */}
      <div className="link-row-col-collection">
        <span className="tag">{col ? `${emoji} ${col.name.toLowerCase()}` : '—'}</span>
      </div>
      <div className="link-row-col-date mono text-soft" style={{ fontSize: 12 }}>
        {dateStr ? fmt(dateStr) : '—'}
      </div>
      <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
        <button
          className={cls('icon-btn', featured && 'active')}
          onClick={onToggleFeatured}
          title="Toggle featured"
        >
          <I.star size={16} stroke={featured ? 2 : 1.4} />
        </button>
        <button className="icon-btn" onClick={onEdit} title="Edit">
          <I.edit size={15} />
        </button>
        <button className="icon-btn" onClick={onDelete} title="Delete">
          <I.trash size={15} />
        </button>
      </div>
    </div>
  );
}
