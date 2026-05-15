/* ========== LINE ICONS ========== */
const Icon = ({ d, size = 18, stroke = 1.6, children, className = '', style }) => (
  <svg
    className={className}
    style={style}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

export const I = {
  link: (p) => <Icon {...p}><path d="M10 14a4 4 0 0 1 0-5.7l3-3a4 4 0 0 1 5.7 5.7l-1.5 1.5" /><path d="M14 10a4 4 0 0 1 0 5.7l-3 3a4 4 0 0 1-5.7-5.7l1.5-1.5" /></Icon>,
  star: (p) => <Icon {...p}><path d="M12 3l2.5 5.5 6 .7-4.4 4.1 1.2 6L12 16.8 6.7 19.3l1.2-6L3.5 9.2l6-.7L12 3z" /></Icon>,
  folder: (p) => <Icon {...p}><path d="M3 7c0-1 .7-2 2-2h4l2 2h8c1 0 2 .9 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></Icon>,
  eye: (p) => <Icon {...p}><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></Icon>,
  search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>,
  plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>,
  edit: (p) => <Icon {...p}><path d="M14 3l7 7-11 11H3v-7L14 3z" /><path d="M14 3l7 7" /></Icon>,
  trash: (p) => <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Icon>,
  drag: (p) => <Icon {...p}><circle cx="9" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="18" r="1" /></Icon>,
  arrow: (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>,
  ext: (p) => <Icon {...p}><path d="M7 17L17 7M9 7h8v8" /></Icon>,
  home: (p) => <Icon {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9z" /></Icon>,
  user: (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></Icon>,
  settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Icon>,
  chart: (p) => <Icon {...p}><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-6" /></Icon>,
  check: (p) => <Icon {...p}><path d="M5 12l4 4L19 6" /></Icon>,
  x: (p) => <Icon {...p}><path d="M6 6l12 12M18 6l-12 12" /></Icon>,
  copy: (p) => <Icon {...p}><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></Icon>,
  insta: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" /></Icon>,
  x_social: (p) => <Icon {...p}><path d="M4 4l16 16M20 4L4 20" /></Icon>,
  globe: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>,
  book: (p) => <Icon {...p}><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z" /><path d="M4 17a3 3 0 0 1 3-3h12" /></Icon>,
  music: (p) => <Icon {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></Icon>,
  camera: (p) => <Icon {...p}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="4" /></Icon>,
  headset: (p) => <Icon {...p}><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><rect x="3" y="13" width="5" height="7" rx="1.5" /><rect x="16" y="13" width="5" height="7" rx="1.5" /></Icon>,
  shop: (p) => <Icon {...p}><path d="M4 8l1-4h14l1 4M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8M4 8h16M9 12a3 3 0 0 0 6 0" /></Icon>,
  mail: (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Icon>,
  youtube: (p) => <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" /></Icon>,
  twitch: (p) => <Icon {...p}><path d="M4 2H20V14L16 18H12L9 21V18H4V2Z" /><line x1="9" y1="7" x2="9" y2="12" /><line x1="14" y1="7" x2="14" y2="12" /></Icon>,
  tiktok: (p) => <Icon {...p}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></Icon>,
  linkedin: (p) => <Icon {...p}><rect x="2" y="2" width="20" height="20" rx="4" /><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" /></Icon>,
  pinterest: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4c0 3-1.5 5-3 5-.8 0-1.5-.7-1.5-1.5 0-1.3.9-2.4.9-3.5 0-.8-.5-1.5-1.4-1.5-1.2 0-2 1.3-2 2.9 0 .7.1 1.3.4 1.8L9 20" /></Icon>,
  soundcloud: (p) => <Icon {...p}><path d="M2 13.5a2.5 2.5 0 0 0 2.5 2.5h11a3 3 0 0 0 0-6 1 1 0 0 0-.1 0 4.5 4.5 0 0 0-8.4-1.5A2.5 2.5 0 0 0 2 13.5z" /></Icon>,
  spotify: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8 13.5c2.3-.8 4.7-.8 7 0M7 10.5c3-.9 6-.9 9 0M9 16.5c1.7-.5 3.4-.5 5 0" /></Icon>,
};

/* ========== DOODLE DECORATIONS ========== */
export const Doodles = {
  UnderlineWobble: (props) => (
    <svg width="220" height="14" viewBox="0 0 220 14" fill="none" {...props}>
      <path d="M3 8 C 30 3, 55 11, 90 6 S 160 9, 217 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  ArrowCurl: (props) => (
    <svg width="90" height="80" viewBox="0 0 90 80" fill="none" {...props}>
      <path d="M10 10 C 30 20, 50 40, 40 65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M40 65 L 33 55 M 40 65 L 50 60" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  ),
  Swirl: (props) => (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" {...props}>
      <path d="M30 30 m-2 0 a8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0 M 44 30 c 0 -12 -10 -18 -20 -15 s -15 14 -12 22 s 18 12 26 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  ),
  Star: (props) => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" {...props}>
      <path d="M14 3 L16 11 L24 12 L18 17 L20 25 L14 21 L8 25 L10 17 L4 12 L12 11 Z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    </svg>
  ),
  Sparkle: (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2 L13 10 L21 12 L13 14 L12 22 L11 14 L3 12 L11 10 Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
    </svg>
  ),
  Squiggle: (props) => (
    <svg width="140" height="20" viewBox="0 0 140 20" fill="none" {...props}>
      <path d="M2 10 Q 12 2, 22 10 T 42 10 T 62 10 T 82 10 T 102 10 T 122 10 T 138 10" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  ),
  CircleCrude: (props) => (
    <svg width="140" height="50" viewBox="0 0 140 50" fill="none" {...props}>
      <path d="M10 25 C 10 10, 35 5, 70 6 S 132 10, 130 26 S 95 46, 60 45 S 8 40, 10 25 Z" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  ),
  Dots: (props) => (
    <svg width="50" height="10" viewBox="0 0 50 10" fill="none" {...props}>
      <circle cx="5" cy="5" r="1.8" fill="currentColor" />
      <circle cx="17" cy="5" r="1.8" fill="currentColor" />
      <circle cx="29" cy="5" r="1.8" fill="currentColor" />
      <circle cx="41" cy="5" r="1.8" fill="currentColor" />
    </svg>
  ),
  Asterisk: (props) => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" {...props}>
      <path d="M15 5 V 25 M 6 10 L 24 20 M 24 10 L 6 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

/* ========== UTILS ========== */
export const cls = (...xs) => xs.filter(Boolean).join(' ');

export const faviconFor = (url) => {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return '';
  }
};
