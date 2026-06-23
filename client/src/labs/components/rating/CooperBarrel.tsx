// client/src/labs/components/rating/CooperBarrel.tsx
//
// Coopers Zeichen: ein gefügtes Fass (Cooper = der Küfer). Ruhend ein klares
// Linien-Symbol, glimmend mit innerem Schein, der atmet — die Glut erscheint
// erst, wenn Cooper aktiv ist. Reine Darstellung, theme-sicher über --labs-*.
// Styling/Animation in labs-theme.css (.cooper-barrel / .cooper-barrel-glow).

import { useId } from "react";

interface CooperBarrelProps {
  size?: number; // Kantenlänge in px (default 28 — Chip-Größe)
  glow?: boolean; // false = ruhend, true = glimmend (innerer Schein atmet)
  mono?: boolean; // true = alle Linien in currentColor (für farbige Flächen, z.B. accent-Button)
  className?: string;
}

export default function CooperBarrel({ size = 28, glow = false, mono = false, className }: CooperBarrelProps) {
  const gid = `cooper-glow-${useId().replace(/:/g, "")}`;
  const fid = `${gid}-blur`;

  const strong = { stroke: mono ? "currentColor" : "var(--labs-amber)" } as const; // Reifen, Außenkanten, Deckel, Boden
  const stave = { stroke: mono ? "currentColor" : "var(--labs-gold)" } as const; // innere Dauben

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`cooper-barrel${glow ? " is-glowing" : ""}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="52%" r="62%">
          <stop offset="0%" style={{ stopColor: "#ffd98a", stopOpacity: 1 }} />
          <stop offset="38%" style={{ stopColor: "#f6b94e", stopOpacity: 0.9 }} />
          <stop offset="72%" style={{ stopColor: "#e0922e", stopOpacity: 0.38 }} />
          <stop offset="100%" style={{ stopColor: "#e0922e", stopOpacity: 0 }} />
        </radialGradient>
        <filter id={fid} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <ellipse className="cooper-barrel-glow" cx="36" cy="40" rx="23" ry="25" fill={`url(#${gid})`} filter={`url(#${fid})`} />

      <g style={strong} strokeWidth="2.4">
        <path d="M24 20C14 31 14 47 24 58" />
        <path d="M48 20C58 31 58 47 48 58" />
      </g>

      <g style={stave} strokeWidth="2">
        <path d="M36 20V58" />
        <path d="M30 20.4C25.5 31 25.5 47 30 57.6" />
        <path d="M42 20.4C46.5 31 46.5 47 42 57.6" />
      </g>

      <path d="M24 58C29 60.5 43 60.5 48 58" style={strong} strokeWidth="2" />

      <ellipse cx="36" cy="20" rx="12" ry="3.8" style={{ ...strong, fill: mono ? "none" : "var(--labs-surface)" }} strokeWidth="2" />

      <g style={strong} strokeWidth="2.4">
        <path d="M16 28C28 32 44 32 56 28" />
        <path d="M14.5 39C28 44 44 44 57.5 39" />
        <path d="M16 50C28 54 44 54 56 50" />
      </g>
    </svg>
  );
}
