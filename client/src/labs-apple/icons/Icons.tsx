// CaskSense Apple — SVG Icon Library
// Alle Icons stroke-based, fill="none", strokeLinecap="round", strokeLinejoin="round"
// Props: color, size

import React from 'react'

interface IconProps { color?: string; size?: number }
const def = (color?: string, size?: number) => ({ color: color || 'currentColor', size: size || 24 })

// ── Navigation ─────────────────────────────────────────────────────────────
export const TabTastings = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
}
export const TabDiscover = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><polygon points="16,8 10,14 8,16 14,10" fill={c} stroke="none"/>
  </svg>
}
export const TabWorld = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
  </svg>
}
export const TabCircle = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.5"/><circle cx="16" cy="9" r="3"/><path d="M2 20v-1.5a7 7 0 0114 0V20"/><path d="M16 12a6 6 0 016 6v2" opacity="0.6"/>
  </svg>
}

// ── Hub Actions ─────────────────────────────────────────────────────────────
export const Join = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="12" height="16" rx="2"/><path d="M16 12h5m-3-3l3 3-3 3"/>
  </svg>
}
export const Solo = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><circle cx="12" cy="8" r="7.5" strokeDasharray="3 2"/>
  </svg>
}
export const Host = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"/>
  </svg>
}

// ── Basic UI ─────────────────────────────────────────────────────────────────
export const ChevronRight = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
}
export const ChevronDown = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
}
export const Back = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
}
export const Check = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
}
export const Add = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
}
export const Copy = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
}
export const Live = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
    <circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8" fill="none" stroke={c} strokeWidth="1.5" opacity="0.4"/>
  </svg>
}
export const Whisky = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="7" width="8" height="14" rx="2"/><rect x="10" y="3" width="4" height="4" rx="1"/>
  </svg>
}

// ── Phase Icons ──────────────────────────────────────────────────────────────
export const Nose = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3c0 0 0 5 3 7.5S15 14 13 15.5s-4 .5-4.5-1S9 12 10 11V3z"/>
    <path d="M7 16c0 0 .5 1.5 3 1.5S13 16 13 16" strokeWidth="1.4"/>
  </svg>
}
export const Palate = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8 a6 4 0 0 1 12 0"/>
    <path d="M4 10 a6 4 0 0 0 12 0" strokeDasharray="2 1.5"/>
    <circle cx="10" cy="9" r="1.2" fill={c} stroke="none"/>
    <line x1="10" y1="10.2" x2="10" y2="15"/>
  </svg>
}
export const Finish = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11 Q6 8 9 10" opacity="0.4"/>
    <path d="M6 10 h10 M14 7 l3 3 -3 3"/>
  </svg>
}
export const Overall = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
}

// ── Alert / Status ───────────────────────────────────────────────────────────
export const AlertTriangle = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/>
  </svg>
}
export const Globe = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
  </svg>
}

// ── Actions / Media ──────────────────────────────────────────────────────────
export const Camera = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="9" width="22" height="16" rx="3"/>
    <path d="M10 9V7a2 2 0 012-2h4a2 2 0 012 2v2"/>
    <circle cx="14" cy="17" r="4"/>
  </svg>
}
export const Edit = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
}
export const Barcode = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4M15 3h4a2 2 0 012 2v4M15 21h4a2 2 0 002-2v-4"/>
    <line x1="7" y1="7" x2="7" y2="17"/><line x1="10" y1="7" x2="10" y2="17"/>
    <line x1="13" y1="7" x2="13" y2="17"/><line x1="16" y1="7" x2="16" y2="11"/>
    <line x1="16" y1="13" x2="16" y2="17"/>
  </svg>
}
export const Skip = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10h10M11 7l3 3-3 3"/><line x1="17" y1="4" x2="17" y2="16"/>
  </svg>
}
export const Spinner = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
    <path d="M12 3a9 9 0 110 18A9 9 0 0112 3z" opacity="0.2"/>
    <path d="M12 3a9 9 0 019 9"/>
  </svg>
}
export const Mic = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="11" rx="3"/>
    <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8"/>
  </svg>
}
export const MicOff = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="11" rx="3" opacity="0.5"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M5 10a7 7 0 0012.45 3.45M12 19v3M8 22h8"/>
  </svg>
}
export const Trash = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
}
export const Upload = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
}
export const QrCode = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/>
    <rect x="18" y="18" width="3" height="3"/>
  </svg>
}
export const Mail = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 7l10 7L22 7"/>
  </svg>
}
export const Printer = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8" rx="1"/>
    <rect x="3" y="9" width="18" height="9" rx="2"/><line x1="9" y1="18" x2="15" y2="18"/>
  </svg>
}
export const Users = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
}
export const Play = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
    <polygon points="5,3 19,12 5,21"/>
  </svg>
}
export const Stop = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
    <rect x="4" y="4" width="16" height="16" rx="2"/>
  </svg>
}
export const Reveal = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/><path d="M8 3l2 3M16 3l-2 3M12 1v3"/>
  </svg>
}
export const Eye = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
}
export const EyeOff = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
}
export const Settings = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
}
export const Download = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
}
export const Sound = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
}
export const SoundOff = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
}
export const Lock = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
}
export const Flame = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/>
  </svg>
}
export const Music = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>
}
export const Sparkle = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
    <path d="M12 2l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 17.5 6 21.7l2.5-7.5L2 9.5h7.5z"/>
  </svg>
}
export const Share = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
  </svg>
}
export const Medal = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
}
export const TrendUp = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
}
export const TrendDown = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
}
export const Trophy = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 21v-4M7 4H5a2 2 0 00-2 2v2a5 5 0 005 5h8a5 5 0 005-5V6a2 2 0 00-2-2h-2"/>
    <rect x="7" y="2" width="10" height="12" rx="3"/>
  </svg>
}
export const Insight = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
}
export const Present = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
}
export const MapPin = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
}
export const BookOpen = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
  </svg>
}
export const Sun = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
}
export const Moon = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
}
export const Filter = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
}
export const UserPlus = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
  </svg>
}
export const UserCheck = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>
  </svg>
}
export const Clock = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
}
export const History = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v5h5"/>
    <path d="M3.05 13A9 9 0 1012 3a8.97 8.97 0 00-6.28 2.57L3 8"/>
    <polyline points="12 7 12 12 15 14"/>
  </svg>
}
export const Star = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
}
export const Calendar = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
}
export const Analytics = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
}
export const Report = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
}
export const Journal = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
}
export const Compare = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6"/>
  </svg>
}
export const Profile = ({ color, size }: IconProps) => TabWorld({ color, size })
export const Distillery = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21V8l5-5h8l5 5v13"/><rect x="9" y="14" width="6" height="7"/><path d="M9 9h6"/>
  </svg>
}
export const Feed = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="19" r="2"/><path d="M4 4a16 16 0 0116 16M4 11a9 9 0 019 9"/>
  </svg>
}
export const Map = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
}
export const Shield = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
}
export const Gallery = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
}
export const FileText = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
}
export const Library = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    <line x1="8" y1="7" x2="16" y2="7"/>
    <line x1="8" y1="11" x2="13" y2="11"/>
  </svg>
}
export const Search = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
}
export const MessageSquare = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
}
export const CheckCircle = ({ color, size }: IconProps) => {
  const { color: c, size: s } = def(color, size)
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
}
