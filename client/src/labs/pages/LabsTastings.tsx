import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Wine, Calendar, MapPin, ChevronRight, Clock, Search, Crown, PenLine } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";

type FilterTab = "all" | "hosting" | "joined";
type TimeFilter = "upcoming" | "live" | "past";

const STATUS_CONFIG: Record<string, { label: string; cssClass: string }> = {
  draft: { label: "Draft", cssClass: "labs-badge-info" },
  open: { label: "Live", cssClass: "labs-badge-success" },
  closed: { label: "Closed", cssClass: "labs-badge-accent" },
  reveal: { label: "Reveal", cssClass: "labs-badge-accent" },
  archived: { label: "Completed", cssClass: "labs-badge-info" },
};

export default function LabsTastings() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tastings, isLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const filtered = useMemo(() => {
    if (!tastings) return [];
    let list = [...tastings];

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
          t.location?.toLowerCase().includes(q)
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
    return {
      live: tastings.filter((t: any) => t.status === "open").length,
      upcoming: tastings.filter((t: any) => t.status === "draft").length,
      past: tastings.filter((t: any) => ["archived", "reveal", "closed"].includes(t.status)).length,
    };
  }, [tastings]);

  if (!currentParticipant) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>
          Your Tastings
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
          Sign in to see your sessions and join new ones
        </p>
        <Link href="/labs/home">
          <button className="labs-btn-secondary" data-testid="labs-tastings-goto-home">
            Home
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="labs-serif text-xl font-semibold"
          data-testid="labs-tastings-title"
        >
          Tastings
        </h1>
        {counts.live > 0 && (
          <span className="labs-badge labs-badge-success" data-testid="labs-tastings-live-count">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {counts.live} Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5 labs-fade-in labs-stagger-1">
        <Link href="/labs/join">
          <div className="labs-card labs-card-interactive text-center p-4" data-testid="labs-action-join">
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "var(--labs-accent-muted)" }}>
              <Wine className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>Join</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>Participate</div>
          </div>
        </Link>
        <Link href="/labs/solo">
          <div className="labs-card labs-card-interactive text-center p-4" data-testid="labs-action-solo">
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "var(--labs-surface-elevated)" }}>
              <PenLine className="w-5 h-5" style={{ color: "var(--labs-text-secondary)" }} />
            </div>
            <div className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>Solo</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>Log a dram</div>
          </div>
        </Link>
        <Link href="/labs/host">
          <div className="labs-card labs-card-interactive text-center p-4" data-testid="labs-action-host">
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "var(--labs-success-muted)" }}>
              <Crown className="w-5 h-5" style={{ color: "var(--labs-success)" }} />
            </div>
            <div className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>Host</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>Create session</div>
          </div>
        </Link>
      </div>

      <div className="relative mb-4">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--labs-text-muted)" }}
        />
        <input
          className="labs-input pl-10"
          placeholder="Search tastings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="labs-tastings-search"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["all", "hosting", "joined"] as const).map((tab) => (
          <button
            key={tab}
            className="labs-btn-ghost whitespace-nowrap"
            style={{
              background: filterTab === tab ? "var(--labs-accent-muted)" : undefined,
              color: filterTab === tab ? "var(--labs-accent)" : undefined,
              fontWeight: filterTab === tab ? 600 : undefined,
            }}
            onClick={() => setFilterTab(tab)}
            data-testid={`labs-tastings-filter-${tab}`}
          >
            {tab === "all" ? "All" : tab === "hosting" ? "Hosting" : "Joined"}
          </button>
        ))}

        <div style={{ width: 1, background: "var(--labs-border)", margin: "4px 4px" }} />

        {(["live", "upcoming", "past"] as const).map((tf) => {
          const isActive = timeFilter === tf;
          const count = counts[tf];
          return (
            <button
              key={tf}
              className="labs-btn-ghost whitespace-nowrap"
              style={{
                background: isActive ? "var(--labs-accent-muted)" : undefined,
                color: isActive ? "var(--labs-accent)" : undefined,
                fontWeight: isActive ? 600 : undefined,
              }}
              onClick={() => setTimeFilter(isActive ? null : tf)}
              data-testid={`labs-tastings-time-${tf}`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
              {count > 0 && (
                <span
                  className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: tf === "live" ? "var(--labs-success-muted)" : "var(--labs-accent-muted)",
                    color: tf === "live" ? "var(--labs-success)" : "var(--labs-accent)",
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="labs-card p-5" style={{ opacity: 0.5 }}>
              <div
                className="h-4 rounded-md mb-3"
                style={{ background: "var(--labs-border)", width: "55%" }}
              />
              <div
                className="h-3 rounded-md"
                style={{ background: "var(--labs-border-subtle)", width: "35%" }}
              />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="labs-empty labs-fade-in">
          <Clock className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
            {searchQuery ? "No matching tastings" : "No tastings yet"}
          </p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
            {searchQuery
              ? "Try a different search term"
              : timeFilter
              ? "No tastings match this filter"
              : "Join a session or host one to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tasting: any, idx: number) => {
            const status = STATUS_CONFIG[tasting.status] || STATUS_CONFIG.draft;
            const isHost = tasting.hostId === currentParticipant?.id;
            const isLive = tasting.status === "open";

            return (
              <Link key={tasting.id} href={`/labs/tastings/${tasting.id}`}>
                <div
                  className={`labs-card labs-card-interactive p-5 labs-fade-in labs-stagger-${Math.min(idx + 1, 4)}`}
                  style={{
                    borderColor: isLive ? "var(--labs-success)" : undefined,
                    boxShadow: isLive ? "0 0 0 1px var(--labs-success), 0 4px 20px rgba(110,193,119,0.08)" : undefined,
                  }}
                  data-testid={`labs-tasting-card-${tasting.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isLive ? "var(--labs-success-muted)" : "var(--labs-accent-muted)",
                      }}
                    >
                      <Wine
                        className="w-5 h-5"
                        style={{ color: isLive ? "var(--labs-success)" : "var(--labs-accent)" }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate" data-testid={`labs-tasting-title-${tasting.id}`}>
                          {tasting.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        {tasting.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {tasting.date}
                          </span>
                        )}
                        {tasting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {tasting.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {isHost && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: "var(--labs-accent-muted)",
                              color: "var(--labs-accent)",
                            }}
                            data-testid={`labs-tasting-host-badge-${tasting.id}`}
                          >
                            Host
                          </span>
                        )}
                        <span className={`labs-badge ${status.cssClass}`} data-testid={`labs-tasting-status-${tasting.id}`}>
                          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                          {status.label}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
