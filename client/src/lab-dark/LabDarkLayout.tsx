import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Wine, Compass, ArrowLeft } from "lucide-react";
import "./theme.css";

interface LabDarkLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: "/lab-dark/home", icon: Home, label: "Home" },
  { href: "/lab-dark/sessions", icon: Wine, label: "Sessions" },
  { href: "/lab-dark/discover", icon: Compass, label: "Discover" },
];

export default function LabDarkLayout({ children }: LabDarkLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="lab-dark">
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-3"
        style={{
          background: "rgba(26, 23, 20, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--lab-border-subtle)",
        }}
      >
        <Link href="/lab-dark/home">
          <span
            className="text-lg font-semibold tracking-tight cursor-pointer"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--lab-accent)" }}
          >
            CaskSense
          </span>
        </Link>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: "var(--lab-accent-muted)", color: "var(--lab-accent)" }}
        >
          Lab
        </span>
      </header>

      <main className="pb-20 min-h-[calc(100dvh-52px)]">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2"
        style={{
          background: "rgba(26, 23, 20, 0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--lab-border-subtle)",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/lab-dark/home" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer transition-colors"
                style={{ color: isActive ? "var(--lab-accent)" : "var(--lab-text-muted)" }}
                data-testid={`lab-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <Link href="/tasting">
        <div
          className="fixed top-3 right-14 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all"
          style={{
            background: "var(--lab-surface)",
            border: "1px solid var(--lab-border)",
            color: "var(--lab-text-muted)",
            fontSize: "11px",
            fontWeight: 500,
          }}
          data-testid="lab-exit-btn"
        >
          <ArrowLeft className="w-3 h-3" />
          Exit Lab
        </div>
      </Link>
    </div>
  );
}
