import type { CSSProperties, ReactNode } from "react";

interface IconProps {
  color: string;
  size?: number;
  style?: CSSProperties;
}

function svg(
  { color, size = 24, style }: IconProps,
  viewBox: string,
  children: ReactNode
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

export function NoseIcon(p: IconProps) {
  return (
    <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M10 3c0 0 0 5 3 7.5S15 14 13 15.5s-4 .5-4.5-1S9 12 10 11V3z" />
      <path d="M7 16c0 0 .5 1.5 3 1.5S13 16 13 16" />
    </svg>
  );
}

export function PalateIcon(p: IconProps) {
  return (
    <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M4 10a6 6 0 0112 0" />
      <path d="M4 10a6 6 0 0012 0" strokeDasharray="3 2" />
      <circle cx="10" cy="10" r="1.5" fill={p.color} stroke="none" />
      <line x1="10" y1="12" x2="10" y2="17" />
    </svg>
  );
}

export function FinishIcon(p: IconProps) {
  return (
    <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <line x1="3" y1="10" x2="15" y2="10" />
      <polyline points="13 7 16 10 13 13" />
      <path d="M3 14c2-1 4-2 6-1" opacity={0.4} />
    </svg>
  );
}

export function OverallIcon(p: IconProps) {
  return (
    <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <polygon points="10,2 12.5,7.5 18,8.2 14,12 15,17.5 10,14.8 5,17.5 6,12 2,8.2 7.5,7.5" />
    </svg>
  );
}

export function CheckIcon(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="6 12 10 16 18 8" />
  </>);
}

export function BackIcon(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="15 18 9 12 15 6" />
  </>);
}

export function ChevronDownIcon(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <polyline points="6 9 12 15 18 9" />
  </>);
}

export function AlertTriangleIcon(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>);
}

export function GlobeIcon(p: IconProps) {
  return svg(p, "0 0 24 24", <>
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="4" ry="9" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <path d="M4.5 7h15" />
    <path d="M4.5 17h15" />
  </>);
}
