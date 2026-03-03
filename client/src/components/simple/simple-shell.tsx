import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Wine, PenLine, User } from "lucide-react";

const c = {
  bg: "#1a1714",
  text: "#f5f0e8",
  accent: "#d4a256",
  muted: "#4a4540",
  mutedLight: "#8a7e6d",
};

const NAV_ITEMS = [
  { href: "/enter", icon: Wine, label: "Join" },
  { href: "/log-simple", icon: PenLine, label: "Log" },
  { href: "/my-taste", icon: User, label: "My Taste" },
];

interface SimpleShellProps {
  children: ReactNode;
  showBack?: boolean;
  maxWidth?: number;
}

export default function SimpleShell({ children, showBack = true, maxWidth = 420 }: SimpleShellProps) {
  const [location] = useLocation();

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
          padding: "40px 20px 100px",
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

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          background: "rgba(26, 23, 20, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid #2e281f",
          paddingTop: 8,
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
        data-testid="simple-bottom-nav"
      >
        {NAV_ITEMS.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "4px 16px",
                  cursor: "pointer",
                  color: active ? c.accent : c.mutedLight,
                  transition: "color 0.2s",
                }}
                data-testid={`simple-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <item.icon
                  style={{ width: 20, height: 20 }}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
