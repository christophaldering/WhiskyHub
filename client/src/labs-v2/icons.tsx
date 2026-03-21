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
