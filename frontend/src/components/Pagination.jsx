const PAGE_SIZE = 10;

export default function Pagination({ page, totalCount, hasNext, hasPrev, onNext, onPrev }) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button className="btn ghost small" disabled={!hasPrev} onClick={onPrev}>
        ← Prev
      </button>
      <span className="mono" style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
        {page} / {totalPages}
      </span>
      <button className="btn ghost small" disabled={!hasNext} onClick={onNext}>
        Next →
      </button>
    </div>
  );
}
