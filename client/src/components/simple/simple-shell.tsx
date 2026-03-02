import { ReactNode } from "react";
import { Link } from "wouter";

const c = {
  bg: "#1a1714",
  text: "#f5f0e8",
  accent: "#d4a256",
  muted: "#4a4540",
};

interface SimpleShellProps {
  children: ReactNode;
  showBack?: boolean;
  maxWidth?: number;
}

export default function SimpleShell({ children, showBack = true, maxWidth = 420 }: SimpleShellProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: c.bg,
        color: c.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "40px 20px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Link href="/">
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              color: c.accent,
              cursor: "pointer",
              display: "block",
              marginBottom: 32,
            }}
            data-testid="link-brand-home"
          >
            CaskSense
          </span>
        </Link>

        <div style={{ width: "100%" }}>
          {children}
        </div>

        {showBack && (
          <Link
            href="/"
            style={{ fontSize: 12, color: c.muted, textDecoration: "none", marginTop: 40 }}
            data-testid="link-back"
          >
            ← Back
          </Link>
        )}
      </div>
    </div>
  );
}
