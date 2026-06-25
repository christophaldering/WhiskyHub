// client/src/labs/components/rating/CooperBarrel.tsx
//
// Coopers Zeichen: ein gefügtes Fass (Cooper = der Küfer) — aufrecht, mit
// sichtbarem Deckel, durchgehenden Dauben und zwei Reifen (oben/unten). Ruhend
// ein klares Linien-Symbol, glimmend mit innerem Schein, der atmet — die Glut
// erscheint erst, wenn Cooper aktiv ist. Reine Darstellung, theme-sicher über
// --labs-*. Styling/Animation in labs-theme.css (.cooper-barrel / .cooper-barrel-glow).

import { useId } from "react";

interface CooperBarrelProps {
  size?: number; // Kantenlänge in px (default 28 — Chip-Größe)
  glow?: boolean; // false = ruhend, true = glimmend (innerer Schein atmet)
  live?: boolean; // true = Glut folgt --cooper-level (Stimm-Takt)
  mono?: boolean; // true = alle Linien in currentColor (für farbige Flächen, z.B. accent-Button)
  className?: string;
}

export default function CooperBarrel({ size = 28, glow = false, live = false, mono = false, className }: CooperBarrelProps) {
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
      className={`cooper-barrel${glow ? " is-glowing" : ""}${live ? " is-live" : ""}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="60%">
          <stop offset="0%" style={{ stopColor: "#ffd98a", stopOpacity: 1 }} />
          <stop offset="38%" style={{ stopColor: "#f6b94e", stopOpacity: 0.9 }} />
          <stop offset="72%" style={{ stopColor: "#e0922e", stopOpacity: 0.38 }} />
          <stop offset="100%" style={{ stopColor: "#e0922e", stopOpacity: 0 }} />
        </radialGradient>
        <filter id={fid} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      <ellipse className="cooper-barrel-glow" cx="36" cy="38" rx="22" ry="26" fill={`url(#${gid})`} filter={`url(#${fid})`} />

      {/* Außenkanten (bauchige Seiten) */}
      <g style={strong} strokeWidth="2.4">
        <path d="M23 12C14 24 14 50 23 62" />
        <path d="M49 12C58 24 58 50 49 62" />
      </g>

      {/* Boden */}
      <path d="M23 62C29 65 43 65 49 62" style={strong} strokeWidth="2.4" />

      {/* Dauben (durchgehend, folgen dem Bauch) */}
      <g style={stave} strokeWidth="2">
        <path d="M36 12.5V61.5" />
        <path d="M29 13C26 26 26 48 29 61" />
        <path d="M43 13C46 26 46 48 43 61" />
      </g>

      {/* Deckel (gefüllt, überdeckt die Dauben-Spitzen) */}
      <ellipse cx="36" cy="12" rx="13" ry="4" style={{ ...strong, fill: mono ? "none" : "var(--labs-surface)" }} strokeWidth="2.2" />

      {/* Zwei Reifen (oben/unten, Bauch bleibt offen) */}
      <g style={strong} strokeWidth="2.4">
        <path d="M18.5 24.5C28 27 44 27 53.5 24.5" />
        <path d="M18.5 49.5C28 52 44 52 53.5 49.5" />
      </g>
    </svg>
  );
}
