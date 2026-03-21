export interface IconProps {
  color: string;
  size?: number;
  style?: React.CSSProperties;
}

function svg(
  { color, size = 24, style }: IconProps,
  viewBox: string,
  children: React.ReactNode
) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </svg>
  );
}

export function TabTastings(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </>);
}

export function TabDiscover(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="12" cy="12" r="9" />
    <polygon points="12,7 13.5,10.5 17,12 13.5,13.5 12,17 10.5,13.5 7,12 10.5,10.5" />
  </>);
}

export function TabWorld(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
  </>);
}

export function TabCircle(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="9" cy="8" r="3" />
    <circle cx="16" cy="8" r="3" />
    <path d="M3 20c0-2.76 2.24-5 5-5h2" />
    <path d="M21 20c0-2.76-2.24-5-5-5h-2" />
  </>);
}

export function Join(p: IconProps) {
  return svg({ ...p, size: p.size ?? 28 }, "0 0 28 28", <>
    <path d="M18 4h5a2 2 0 012 2v16a2 2 0 01-2 2h-5" />
    <polyline points="12 20 18 14 12 8" />
    <line x1="3" y1="14" x2="18" y2="14" />
  </>);
}

export function Solo(p: IconProps) {
  return svg({ ...p, size: p.size ?? 28 }, "0 0 28 28", <>
    <circle cx="14" cy="9" r="4" />
    <path d="M7 24c0-3.87 3.13-7 7-7s7 3.13 7 7" />
    <circle cx="14" cy="9" r="1" fill={p.color} stroke="none" />
  </>);
}

export function Host(p: IconProps) {
  return svg({ ...p, size: p.size ?? 28 }, "0 0 28 28", <>
    <polygon points="14,2 17.5,9.5 26,10.8 20,16.5 21.5,25 14,20.8 6.5,25 8,16.5 2,10.8 10.5,9.5" />
  </>);
}

export function ChevronRight(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="9 18 15 12 9 6" />
  </>);
}

export function Back(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="15 18 9 12 15 6" />
  </>);
}

export function Check(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="6 12 10 16 18 8" />
  </>);
}

export function Add(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>);
}

export function Copy(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h10" />
  </>);
}

export function Live(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="12" cy="12" r="3" fill={p.color} stroke="none" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="9" strokeDasharray="4 3" />
  </>);
}

export function Whisky(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <rect x="7" y="6" width="10" height="12" rx="2" />
    <line x1="12" y1="18" x2="12" y2="20" />
    <line x1="9" y1="20" x2="15" y2="20" />
  </>);
}

export function Nose(p: IconProps) {
  return (
    <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M10 3c0 0 0 5 3 7.5S15 14 13 15.5s-4 .5-4.5-1S9 12 10 11V3z" />
      <path d="M7 16c0 0 .5 1.5 3 1.5S13 16 13 16" />
    </svg>
  );
}

export function Palate(p: IconProps) {
  return (
    <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M4 10a6 6 0 0112 0" />
      <path d="M4 10a6 6 0 0012 0" strokeDasharray="3 2" />
      <circle cx="10" cy="10" r="1.5" fill={p.color} stroke="none" />
      <line x1="10" y1="12" x2="10" y2="17" />
    </svg>
  );
}

export function Finish(p: IconProps) {
  return (
    <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <line x1="3" y1="10" x2="15" y2="10" />
      <polyline points="13 7 16 10 13 13" />
      <path d="M3 14c2-1 4-2 6-1" opacity={0.4} />
    </svg>
  );
}

export function Overall(p: IconProps) {
  return (
    <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <polygon points="10,2 12.5,7.5 18,8.2 14,12 15,17.5 10,14.8 5,17.5 6,12 2,8.2 7.5,7.5" />
    </svg>
  );
}

export function AlertTriangle(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>);
}

export function Globe(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="4" ry="9" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <path d="M4.5 7h15" />
    <path d="M4.5 17h15" />
  </>);
}

export function ChevronDown(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="6 9 12 15 18 9" />
  </>);
}

export function Camera(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </>);
}

export function Edit(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>);
}

export function Barcode(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <line x1="4" y1="4" x2="4" y2="20" />
    <line x1="8" y1="4" x2="8" y2="16" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="16" y1="4" x2="16" y2="16" />
    <line x1="20" y1="4" x2="20" y2="20" />
    <line x1="6" y1="4" x2="6" y2="16" />
    <line x1="14" y1="4" x2="14" y2="16" />
    <line x1="18" y1="4" x2="18" y2="16" />
  </>);
}

export function Skip(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </>);
}

export function Spinner(p: IconProps) {
  return svg(
    { ...p, style: { ...p.style, animation: "spin 1s linear infinite" } },
    "0 0 24 24",
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  );
}

export function Mic(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </>);
}

export function Upload(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>);
}

export function QrCode(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="3" height="3" />
    <rect x="18" y="18" width="3" height="3" />
    <rect x="18" y="14" width="3" height="1" />
    <rect x="14" y="18" width="1" height="3" />
  </>);
}

export function Mail(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="22 7 12 13 2 7" />
  </>);
}

export function Printer(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </>);
}

export function Users(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </>);
}

export function Play(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polygon points="5 3 19 12 5 21 5 3" fill={p.color} stroke="none" />
  </>);
}

export function Stop(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="6" y="6" width="12" height="12" rx="1" fill={p.color} stroke="none" />
  </>);
}

export function Reveal(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </>);
}

export function Eye(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </>);
}

export function EyeOff(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </>);
}

export function Settings(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </>);
}

export function Download(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>);
}

export function Trash(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </>);
}

export function FileText(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </>);
}

export function Sound(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={p.color} stroke="none" />
    <path d="M15.54 8.46a5 5 0 010 7.07" />
    <path d="M19.07 4.93a10 10 0 010 14.14" />
  </>);
}

export function SoundOff(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={p.color} stroke="none" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </>);
}

export function MicOff(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .87-.16 1.71-.46 2.49" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </>);
}

export function Lock(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </>);
}

export function Unlock(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 019.9-1" />
  </>);
}

export function Flame(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M12 22c4-4 8-7.5 8-12A8 8 0 004 10c0 4.5 4 8 8 12z" />
    <path d="M12 22c-2-2-4-3.5-4-6a4 4 0 018 0c0 2.5-2 4-4 6z" fill={p.color} stroke="none" opacity={0.3} />
  </>);
}

export function Music(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </>);
}

export function Sparkle(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" fill={p.color} stroke="none" />
  </>);
}

export function Share(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </>);
}

export function Medal(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="12" cy="14" r="6" />
    <path d="M8.21 3.32L7 8.5" />
    <path d="M15.79 3.32L17 8.5" />
    <path d="M12 2v6" />
  </>);
}

export function TrendUp(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </>);
}

export function TrendDown(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </>);
}

export function Trophy(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
    <path d="M18 2H6v7a6 6 0 0012 0V2z" />
  </>);
}

export function Insight(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
    <path d="M9.5 4.5l1 2" />
    <path d="M14.5 4.5l-1 2" />
  </>);
}

export function Present(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <polygon points="10,8 10,12 14,10" fill={p.color} stroke="none" />
  </>);
}
