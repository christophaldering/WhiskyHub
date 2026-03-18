import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Wine, Calendar, MapPin, ChevronRight, Search, Crown, PenLine, Users } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";

type FilterTab = "all" | "hosting" | "joined";
type TimeFilter = "upcoming" | "live" | "past";

const STATUS_CONFIG: Record<string, { label: string; cssClass: string }> = {
  draft: { label: "Setting up", cssClass: "labs-badge-info" },
  open: { label: "Live", cssClass: "labs-badge-success" },
  closed: { label: "Closed", cssClass: "labs-badge-accent" },
  reveal: { label: "Reveal", cssClass: "labs-badge-accent" },
  archived: { label: "Completed", cssClass: "labs-badge-info" },
};

function formatTastingDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const short = dateStr.replace(/\s*,\s*/g, ", ").replace(/\s{2,}/g, " ");
      return short.length > 20 ? short.slice(0, 18) + "..." : short;
    }
    const now = new Date();
    const isThisYear = d.getFullYear() === now.getFullYear();
    const locale = navigator.language || "en-US";
    return d.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(isThisYear ? {} : { year: "numeric" }),
    });
  } catch {
    const short = String(dateStr);
    return short.length > 20 ? short.slice(0, 18) + "..." : short;
  }
}

export default function LabsTastings() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = currentParticipant?.role === "admin";

  const { data: tastings, isLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const filtered = useMemo(() => {
    if (!tastings) return [];
    let list = [...tastings].filter((t: any) => !t.isTestData);

    if (filterTab === "hosting") {
      list = list.filter((t: any) => t.hostId === currentParticipant?.id);
    } else if (filterTab === "joined") {
      list = list.filter((t: any) => t.hostId !== currentParticipant?.id);
    }

    if (timeFilter === "live") {
      list = list.filter((t: any) => t.status === "open");
    } else if (timeFilter === "upcoming") {
      list = list.filter((t: any) => t.status === "draft");
    } else if (timeFilter === "past") {
      list = list.filter((t: any) => t.status === "archived" || t.status === "reveal" || t.status === "closed");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t: any) =>
          t.title?.toLowerCase().includes(q) ||
          t.location?.toLowerCase().includes(q) ||
          t.hostName?.toLowerCase().includes(q)
      );
    }

    list.sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = { open: 0, draft: 1, reveal: 2, closed: 3, archived: 4 };
      const orderA = statusOrder[a.status] ?? 5;
      const orderB = statusOrder[b.status] ?? 5;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });

    return list;
  }, [tastings, filterTab, timeFilter, searchQuery, currentParticipant?.id]);

  const counts = useMemo(() => {
    if (!tastings) return { live: 0, upcoming: 0, past: 0 };
    const real = tastings.filter((t: any) => !t.isTestData);
    return {
      live: real.filter((t: any) => t.status === "open").length,
      upcoming: real.filter((t: any) => t.status === "draft").length,
      past: real.filter((t: any) => ["archived", "reveal", "closed"].includes(t.status)).length,
    };
  }, [tastings]);

  if (!currentParticipant) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
          <path d="M10 14 Q9 20 9 26 L9 34 Q9 37 12 37 L28 37 Q31 37 31 34 L31 26 Q31 20 30 14 Z"
            fill="currentColor" opacity="0.15"/>
          <rect x="14" y="8" width="12" height="8" rx="2" fill="currentColor" opacity="0.1"/>
        </svg>
        <h2 className="labs-empty-title">Your Tastings</h2>
        <p className="labs-empty-sub">Sign in to see your sessions and join new ones.</p>
        <Link href="/labs/home">
          <button className="labs-empty-action" data-testid="labs-tastings-goto-home">
            Home
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="labs-page-wide labs-fade-in">
      <div style={{ marginBottom: 24 }}>
        <div className="flex items-center justify-between">
          <h1
            className="labs-serif"
            style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}
            data-testid="labs-tastings-title"
          >
            Tastings
          </h1>
          {counts.live > 0 && (
            <span
              className="labs-badge labs-badge-success"
              style={{ fontSize: 11 }}
              data-testid="labs-tastings-live-count"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {counts.live} Live
            </span>
          )}
        </div>
      </div>

      <div className="labs-action-grid labs-fade-in labs-stagger-1" style={{ marginBottom: 20 }}>
        <Link href="/labs/join">
          <div className="labs-action-item" data-testid="labs-action-join">
            <div
              style={{
                width: 44, height: 44, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--labs-accent-muted)",
              }}
            >
              <Users className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>Join</span>
            <span style={{ fontSize: 11, color: "var(--labs-text-secondary)", marginTop: -2 }}>Participate</span>
          </div>
        </Link>
        <Link href="/labs/solo">
          <div className="labs-action-item" data-testid="labs-action-solo">
            <div
              style={{
                width: 44, height: 44, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--labs-surface-elevated)",
              }}
            >
              <PenLine className="w-5 h-5" style={{ color: "var(--labs-text-secondary)" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>Solo</span>
            <span style={{ fontSize: 11, color: "var(--labs-text-secondary)", marginTop: -2 }}>Log a dram</span>
          </div>
        </Link>
        <Link href="/labs/host">
          <div className="labs-action-item" data-testid="labs-action-host">
            <div
              style={{
                width: 44, height: 44, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--labs-success-muted)",
              }}
            >
              <Crown className="w-5 h-5" style={{ color: "var(--labs-success)" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>Host</span>
            <span style={{ fontSize: 11, color: "var(--labs-text-secondary)", marginTop: -2 }}>Create session</span>
          </div>
        </Link>
      </div>

      <div className="relative labs-fade-in labs-stagger-1" style={{ marginBottom: 16 }}>
        <Search
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--labs-text-muted)", left: 14 }}
        />
        <input
          className="labs-input"
          style={{ paddingLeft: 40, fontSize: 15, height: 44 }}
          placeholder="Search tastings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="labs-tastings-search"
        />
      </div>

      <div className="labs-segmented labs-fade-in labs-stagger-2" style={{ marginBottom: 12 }}>
        {(["all", "hosting", "joined"] as const).map((tab) => (
          <button
            key={tab}
            className={`labs-segmented-btn ${filterTab === tab ? "labs-segmented-btn-active" : ""}`}
            onClick={() => setFilterTab(tab)}
            data-testid={`labs-tastings-filter-${tab}`}
          >
            {tab === "all" ? "All" : tab === "hosting" ? "Hosting" : "Joined"}
          </button>
        ))}
      </div>

      <div
        className="flex gap-2 labs-fade-in labs-stagger-2"
        style={{ marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}
      >
        {(["live", "upcoming", "past"] as const).map((tf) => {
          const isActive = timeFilter === tf;
          const count = counts[tf];
          return (
            <button
              key={tf}
              className={`labs-chip ${isActive ? "labs-chip-active" : ""}`}
              onClick={() => setTimeFilter(isActive ? null : tf)}
              data-testid={`labs-tastings-time-${tf}`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: tf === "live"
                      ? "var(--labs-success-muted)"
                      : isActive
                        ? "var(--labs-accent)"
                        : "var(--labs-accent-muted)",
                    color: tf === "live"
                      ? "var(--labs-success)"
                      : isActive
                        ? "var(--labs-bg)"
                        : "var(--labs-accent)",
                    padding: "0 5px",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '1.5rem' }}>
          <div className="labs-skeleton" style={{ height: '20px', width: '60%' }} />
          <div className="labs-skeleton" style={{ height: '14px', width: '40%' }} />
          <div className="labs-skeleton" style={{ height: '14px', width: '80%', marginTop: '8px' }} />
          <div className="labs-skeleton" style={{ height: '20px', width: '55%', marginTop: '12px' }} />
          <div className="labs-skeleton" style={{ height: '14px', width: '45%' }} />
          <div className="labs-skeleton" style={{ height: '14px', width: '70%', marginTop: '8px' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="labs-empty labs-fade-in" data-testid="labs-tastings-empty">
          <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
            <path d="M10 14 Q9 20 9 26 L9 34 Q9 37 12 37 L28 37 Q31 37 31 34 L31 26 Q31 20 30 14 Z"
              fill="currentColor" opacity="0.3"/>
            <rect x="14" y="8" width="12" height="8" rx="2" fill="currentColor" opacity="0.2"/>
          </svg>
          <h2 className="labs-empty-title">
            {searchQuery ? "Keine Ergebnisse" : "Noch keine Tastings"}
          </h2>
          <p className="labs-empty-sub">
            {searchQuery
              ? "Versuche einen anderen Suchbegriff."
              : timeFilter
              ? "Kein Tasting passt zu diesem Filter."
              : "Erstelle dein erstes Tasting oder tritt einem bei."}
          </p>
          {!searchQuery && !timeFilter && (
            <button className="labs-empty-action" onClick={() => navigate("/labs/host")} data-testid="button-tastings-create">
              Tasting starten
            </button>
          )}
        </div>
      ) : (
        <div className="labs-grouped-list labs-fade-in labs-stagger-3">
          {filtered.map((tasting: any) => {
            const status = STATUS_CONFIG[tasting.status] || STATUS_CONFIG.draft;
            const isHost = tasting.hostId === currentParticipant?.id;
            const isLive = tasting.status === "open";
            const formattedDate = formatTastingDate(tasting.date);

            return (
              <Link key={tasting.id} href={`/labs/tastings/${tasting.id}`}>
                <div
                  className="labs-list-row"
                  style={{ alignItems: "flex-start", gap: 12, padding: "14px 12px" }}
                  data-testid={`labs-tasting-card-${tasting.id}`}
                >
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0, marginTop: 2,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isLive ? "var(--labs-success-muted)" : "var(--labs-accent-muted)",
                    }}
                  >
                    <Wine
                      style={{ width: 18, height: 18, color: isLive ? "var(--labs-success)" : "var(--labs-accent)" }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 15, fontWeight: 600,
                          color: "var(--labs-text)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          flex: 1, minWidth: 0,
                        }}
                        data-testid={`labs-tasting-title-${tasting.id}`}
                      >
                        {tasting.title}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {isHost && (
                          <span
                            style={{
                              fontSize: 11, fontWeight: 600,
                              padding: "2px 6px", borderRadius: 5,
                              background: "var(--labs-accent-muted)",
                              color: "var(--labs-accent)",
                            }}
                            data-testid={`labs-tasting-host-badge-${tasting.id}`}
                          >
                            Host
                          </span>
                        )}
                        <span
                          className={`labs-badge ${status.cssClass}`}
                          style={{ fontSize: 11, padding: "2px 6px" }}
                          data-testid={`labs-tasting-status-${tasting.id}`}
                        >
                          {isLive && (
                            <span
                              className="animate-pulse"
                              style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: "currentColor", display: "inline-block",
                              }}
                            />
                          )}
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {tasting.hostName && (isAdmin || !isHost) && (
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 3,
                          fontSize: 11, color: "var(--labs-text-secondary)",
                          marginBottom: 1,
                        }}
                        data-testid={`labs-tasting-hostname-${tasting.id}`}
                      >
                        <Crown style={{ width: 11, height: 11, opacity: 0.75, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {stripGuestSuffix(tasting.hostName)}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        fontSize: 12, color: "var(--labs-text-muted)",
                        overflow: "hidden", whiteSpace: "nowrap",
                      }}
                    >
                      {formattedDate && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                          <Calendar style={{ width: 12, height: 12, opacity: 0.75, flexShrink: 0 }} />
                          {formattedDate}
                        </span>
                      )}
                      {tasting.location && (
                        <span
                          style={{
                            display: "flex", alignItems: "center", gap: 3,
                            overflow: "hidden", textOverflow: "ellipsis",
                          }}
                        >
                          <MapPin style={{ width: 12, height: 12, opacity: 0.75, flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{tasting.location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight
                    style={{ width: 16, height: 16, color: "var(--labs-text-muted)", opacity: 0.75, flexShrink: 0, marginTop: 4 }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
