// Emoji assigned deterministically from collection ID — no backend field needed
export const COLLECTION_EMOJIS = ['✺', '◇', '♪', '◉', '❋', '▲', '◈', '⬡', '✦', '◎', '⊹', '⌘'];

export const collectionEmoji = (id) =>
  COLLECTION_EMOJIS[Math.abs(Number(id)) % COLLECTION_EMOJIS.length];

// Find the first collection a link belongs to
export const linkCollection = (link, collections) =>
  collections.find((c) => Array.isArray(c.links) && c.links.includes(link.id));

// Normalise link_day (ISO datetime string) → YYYY-MM-DD
export const linkDate = (link) => link.link_day?.slice(0, 10) ?? null;

export const isFeatured = (link) => link.category === 'featured';
export const isPublicCollection = (col) => col.category === 'public';

// Today as YYYY-MM-DD
export const todayStr = () => new Date().toISOString().slice(0, 10);

export const fmt = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const fmtMonth = (year, month) =>
  new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
