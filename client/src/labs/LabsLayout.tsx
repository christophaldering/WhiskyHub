import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Radar, Users, User, ArrowLeft, Compass } from "lucide-react";
import { useAppStore } from "@/lib/store";
import M2ProfileMenu from "@/components/m2/M2ProfileMenu";
import LabsErrorBoundary from "./LabsErrorBoundary";
import "./labs-theme.css";

interface LabsLayoutProps {
  children: ReactNode;
}

function GlencairnIcon({ color, size = 22 }: { color: string; size?: number }) {
  const glass = "M8.8 5.5 h6.4 l.2 2.5 c.3 2 .5 3.8 .1 5.2 C15 15 13.8 16.2 12.8 17 L12 17.6 l-.8-.6 C10.2 16.2 9 15 8.5 13.2 8 11.8 8.3 10 8.6 8 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={glass} />
      <line x1="10" y1="17.6" x2="14" y2="17.6" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="17.6" x2="12" y2="20" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/labs/tastings", icon: "glencairn" as const, label: "Tastings" },
  { href: "/labs/explore", icon: "compass" as const, label: "Explore" },
  { href: "/labs/taste", icon: "radar" as const, label: "Taste" },
  { href: "/labs/circle", icon: "circle" as const, label: "Circle" },
];

export default function LabsLayout({ children }: LabsLayoutProps) {
  const [location] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const { currentParticipant } = useAppStore();

  const isLabsHome = location === "/labs" || location === "/labs/";

  return (
    <div className="labs-shell">
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-3"
        style={{
          background: "rgba(26, 23, 20, 0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--labs-border-subtle)",
        }}
      >
        <Link href="/labs">
          <span
            className="labs-serif text-lg font-semibold tracking-tight cursor-pointer"
            style={{ color: "var(--labs-accent)" }}
            data-testid="labs-logo"
          >
            CaskSense <span style={{ fontWeight: 400, opacity: 0.7 }}>Labs</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: "var(--labs-accent-muted)",
              color: "var(--labs-accent)",
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
            data-testid="labs-profile-btn"
          >
            <User className="w-4 h-4" />
            {currentParticipant?.name?.split(" ")[0] || "Profile"}
          </button>
        </div>
      </header>

      <main className="pb-20 min-h-[calc(100dvh-52px)]">
        <LabsErrorBoundary>
          {children}
        </LabsErrorBoundary>
      </main>

      {!isLabsHome && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
          style={{
            background: "rgba(26, 23, 20, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid var(--labs-border-subtle)",
            paddingTop: 6,
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/labs/tastings" && location.startsWith(item.href)) ||
              (item.href === "/labs/tastings" && (location.startsWith("/labs/tastings") || location.startsWith("/labs/live") || location.startsWith("/labs/results") || location.startsWith("/labs/host/")));

            const color = isActive ? "var(--labs-accent)" : "var(--labs-text-muted)";

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex flex-col items-center gap-0.5 px-4 py-1 cursor-pointer transition-colors relative"
                  style={{ color }}
                  data-testid={`labs-nav-${item.label.toLowerCase()}`}
                >
                  {isActive && (
                    <div
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                      style={{ background: "var(--labs-accent)" }}
                    />
                  )}
                  {item.icon === "glencairn" ? (
                    <GlencairnIcon color={color} size={22} />
                  ) : item.icon === "radar" ? (
                    <Radar className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.6} />
                  ) : item.icon === "compass" ? (
                    <Compass className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.6} />
                  ) : (
                    <Users className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.6} />
                  )}
                  <span
                    className="text-[10px]"
                    style={{ fontWeight: isActive ? 600 : 500, letterSpacing: "0.02em" }}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      )}

      <Link href="/m2/tastings">
        <div
          className="fixed top-[13px] z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all"
          style={{
            background: "var(--labs-surface)",
            border: "1px solid var(--labs-border)",
            color: "var(--labs-text-muted)",
            fontSize: 11,
            fontWeight: 500,
            right: "clamp(80px, 30vw, 140px)",
          }}
          data-testid="labs-exit-btn"
        >
          <ArrowLeft className="w-3 h-3" />
          Exit Labs
        </div>
      </Link>

      {profileOpen && (
        <M2ProfileMenu onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
