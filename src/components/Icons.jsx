// Lightweight inline icon set (stroke-based, inherits currentColor)
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Svg = ({ children, size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    {children}
  </svg>
)

export const Icon = {
  dashboard: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  ),
  scissors: (p) => (
    <Svg {...p}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </Svg>
  ),
  money: (p) => (
    <Svg {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </Svg>
  ),
  users: (p) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M17 20a6.5 6.5 0 0 0-2-4.7" />
    </Svg>
  ),
  user: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  ),
  calendar: (p) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </Svg>
  ),
  queue: (p) => (
    <Svg {...p}>
      <path d="M4 6h16M4 12h10M4 18h7" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  ),
  cash: (p) => (
    <Svg {...p}>
      <path d="M3 7h18v10H3z" />
      <path d="M3 11h18M7 7v10" />
    </Svg>
  ),
  chart: (p) => (
    <Svg {...p}>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 2 4-5" />
    </Svg>
  ),
  wallet: (p) => (
    <Svg {...p}>
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v1" />
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <circle cx="16.5" cy="13" r="1.3" />
    </Svg>
  ),
  target: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  ),
  gift: (p) => (
    <Svg {...p}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v9h14v-9M12 8v13" />
      <path d="M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z" />
    </Svg>
  ),
  camera: (p) => (
    <Svg {...p}>
      <path d="M3 8a2 2 0 0 1 2-2h2l1.2-2h7.6L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.2" />
    </Svg>
  ),
  settings: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </Svg>
  ),
  logout: (p) => (
    <Svg {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </Svg>
  ),
  sun: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </Svg>
  ),
  moon: (p) => (
    <Svg {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Svg>
  ),
  plus: (p) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  trash: (p) => (
    <Svg {...p}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </Svg>
  ),
  edit: (p) => (
    <Svg {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  ),
  close: (p) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  check: (p) => (
    <Svg {...p}>
      <path d="M20 6L9 17l-5-5" />
    </Svg>
  ),
  search: (p) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </Svg>
  ),
  download: (p) => (
    <Svg {...p}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </Svg>
  ),
  phone: (p) => (
    <Svg {...p}>
      <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 12l1 4v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-3z" />
    </Svg>
  ),
  bell: (p) => (
    <Svg {...p}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Svg>
  ),
  menu: (p) => (
    <Svg {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  ),
  clock: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  ),
  beach: (p) => (
    <Svg {...p}>
      <circle cx="8" cy="7" r="3" />
      <path d="M8 10v11M3 21h18M14 21c0-4 2-7 6-8" />
    </Svg>
  ),
  tag: (p) => (
    <Svg {...p}>
      <path d="M3 3h8l10 10-8 8L3 11z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </Svg>
  ),
  cart: (p) => (
    <Svg {...p}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.5l2.2 12.3a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
    </Svg>
  ),
  flame: (p) => (
    <Svg {...p}>
      <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2c1.5 0 2-1.5 1-4s-2-3-0-5z" />
    </Svg>
  ),
  moto: (p) => (
    <Svg {...p}>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17h6l3-6h3M12 17l3-6M15 6h3l1 3" />
    </Svg>
  ),
  bowl: (p) => (
    <Svg {...p}>
      <path d="M3 11h18a9 9 0 0 1-18 0z" />
      <path d="M8 7c0-1 1-1 1-2M12 6c0-1 1-1 1-2M16 7c0-1 1-1 1-2" />
    </Svg>
  ),
  cup: (p) => (
    <Svg {...p}>
      <path d="M6 3h12l-1.2 16.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z" />
      <path d="M5.5 8h13" />
    </Svg>
  ),
  receipt: (p) => (
    <Svg {...p}>
      <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" />
      <path d="M9 8h6M9 12h6" />
    </Svg>
  ),
  star: (p) => (
    <Svg {...p}>
      <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21.9l1.1-6.5L2.6 9.8l6.5-.9z" />
    </Svg>
  ),
  heart: (p) => (
    <Svg {...p}>
      <path d="M12 20s-7-4.4-9.3-8.5C1.1 8.5 2.6 5 6 5c2 0 3.2 1.2 4 2.4C10.8 6.2 12 5 14 5c3.4 0 4.9 3.5 3.3 6.5C19 15.6 12 20 12 20z" />
    </Svg>
  ),
  box: (p) => (
    <Svg {...p}>
      <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
      <path d="M3 7l9 4 9-4M12 11v10" />
    </Svg>
  ),
  store: (p) => (
    <Svg {...p}>
      <path d="M4 9l1-5h14l1 5" />
      <path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 6 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 11v9h14v-9M9 20v-5h4v5" />
    </Svg>
  ),
  chat: (p) => (
    <Svg {...p}>
      <path d="M4 5h16v11H8l-4 4z" />
      <path d="M8 9h8M8 12h5" />
    </Svg>
  ),
  home: (p) => (
    <Svg {...p}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </Svg>
  ),
  minus: (p) => (
    <Svg {...p}>
      <path d="M5 12h14" />
    </Svg>
  ),
  chevronRight: (p) => (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  ),
  mapPin: (p) => (
    <Svg {...p}>
      <path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  ),
  sparkles: (p) => (
    <Svg {...p}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
    </Svg>
  ),
  pix: (p) => (
    <Svg {...p}>
      <path d="M12 3l3 3-3 3-3-3z" />
      <path d="M12 15l3 3-3 3-3-3z" />
      <path d="M3 12l3-3 3 3-3 3z" />
      <path d="M15 12l3-3 3 3-3 3z" />
    </Svg>
  ),
}

export default Icon
