import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Wine, Compass, Archive, MoreHorizontal } from "lucide-react";
import { ViewSwitcherV2 } from "@/components/view-switcher";
import "../theme/tokens.css";

interface AppShellV2Props {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: "/app/home", icon: Home, label: "Home" },
  { href: "/app/sessions", icon: Wine, label: "Sessions" },
  { href: "/app/discover", icon: Compass, label: "Discover" },
  { href: "/app/cellar", icon: Archive, label: "Cellar" },
  { href: "/app/more", icon: MoreHorizontal, label: "More" },
];

export default function AppShellV2({ children }: AppShellV2Props) {
  const [location] = useLocation();

  const isActive = (href: string) =>
    location === href || (href !== "/app/home" && location.startsWith(href));

  return (
    <div className="v2-dark">
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-3"
        style={{
          background: "rgba(26, 23, 20, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--v2-border-subtle)",
        }}
      >
        <Link href="/app/home">
          <span
            className="text-lg font-semibold tracking-tight cursor-pointer"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--v2-accent)" }}
            data-testid="brand-logo"
          >
            CaskSense
          </span>
        </Link>
        <ViewSwitcherV2 />
      </header>

      <div className="hidden lg:block fixed left-0 top-[52px] bottom-0 z-30 w-[72px]"
        style={{
          background: "var(--v2-bg)",
          borderRight: "1px solid var(--v2-border-subtle)",
        }}
      >
        <div className="flex flex-col items-center gap-2 pt-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl cursor-pointer transition-colors w-16"
                  style={{
                    color: active ? "var(--v2-accent)" : "var(--v2-text-muted)",
                    background: active ? "var(--v2-accent-muted)" : "transparent",
                  }}
                  data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="pb-20 lg:pb-4 lg:pl-[72px] min-h-[calc(100dvh-52px)]">
        {children}
      </main>

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2"
        style={{
          background: "rgba(26, 23, 20, 0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--v2-border-subtle)",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer transition-colors"
                style={{ color: active ? "var(--v2-accent)" : "var(--v2-text-muted)" }}
                data-testid={`bottom-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
