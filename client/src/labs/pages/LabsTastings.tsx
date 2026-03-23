import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Wine, Calendar, MapPin, ChevronRight, Search, Crown, PenLine, Users, Mail, Share2, Settings, Check, Archive } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, getParticipantId } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import AuthGateMessage from "@/labs/components/AuthGateMessage";

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
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isAdmin = currentParticipant?.role === "admin";
  const pid = getParticipantId();

  const { data: tastings, isLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const { data: myHistoricalParticipations } = useQuery<{ participations: Array<{ historicalTastingId: string }> }>({
    queryKey: ["historical-my-participations", pid],
    queryFn: async () => {
      if (!pid) return { participations: [] };
      const res = await fetch("/api/historical/my-participations", { headers: { "x-participant-id": pid } });
      if (!res.ok) return { participations: [] };
      return res.json();
    },
    enabled: !!pid,
  });

  const claimedHistoricalIds = myHistoricalParticipations?.participations?.map(p => p.historicalTastingId) ?? [];

  const { data: claimedHistoricalDetails } = useQuery<Record<string, { id: string; tastingNumber: number; titleDe: string | null; titleEn: string | null; tastingDate: string | null; whiskyCount: number }>>({
    queryKey: ["historical-tastings-details", claimedHistoricalIds.join(",")],
    queryFn: async () => {
      if (claimedHistoricalIds.length === 0) return {};
      const results: Record<string, any> = {};
      const fetches = claimedHistoricalIds.map(async (id) => {
        try {
          const res = await fetch(`/api/historical/tastings/${id}`, {
            headers: pid ? { "x-participant-id": pid } : {},
          });
          if (res.ok) {
            const data = await res.json();
            results[id] = data;
          }
        } catch {}
      });
      await Promise.all(fetches);
      return results;
    },
    enabled: claimedHistoricalIds.length > 0,
  });

  const handleAcceptInvite = async (tasting: any) => {
    if (!currentParticipant?.id || !tasting.inviteToken) return;
    setAcceptingInvite(tasting.id);
    try {
      const res = await fetch(`/api/invites/${tasting.inviteToken}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: currentParticipant.id }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["tastings"] });
        navigate(`/labs/tastings/${tasting.id}`);
      }
    } catch {
    } finally {
      setAcceptingInvite(null);
    }
  };

  const historicalAsPast = useMemo(() => {
    if (!claimedHistoricalIds.length || !claimedHistoricalDetails) return [];
    const lang = navigator.language?.startsWith("de") ? "de" : "en";
    return claimedHistoricalIds
      .filter(id => claimedHistoricalDetails[id])
      .map(id => {
        const ht = claimedHistoricalDetails[id];
        return {
          id: `historical-${ht.id}`,
          historicalId: ht.id,
          title: (lang === "de" ? ht.titleDe : ht.titleEn) || ht.titleDe || `Tasting #${ht.tastingNumber}`,
          date: ht.tastingDate || "",
          location: "",
          status: "archived",
          hostId: null,
          hostName: null,
          isHistorical: true,
          tastingNumber: ht.tastingNumber,
          whiskyCount: ht.whiskyCount,
        };
      });
  }, [claimedHistoricalIds, claimedHistoricalDetails]);

  const filtered = useMemo(() => {
    if (!tastings) return [];
    let list = [...tastings].filter((t: any) => !t.isTestData);

    if (filterTab === "hosting") {
      list = list.filter((t: any) => t.hostId === currentParticipant?.id);
    } else if (filterTab === "joined") {
      list = list.filter((t: any) => t.hostId !== currentParticipant?.id || t.invitePending);
    }

    if (timeFilter === "live") {
      list = list.filter((t: any) => t.status === "open");
    } else if (timeFilter === "upcoming") {
      list = list.filter((t: any) => t.status === "draft");
    } else if (timeFilter === "past") {
      list = list.filter((t: any) => t.status === "archived" || t.status === "reveal" || t.status === "closed");
      if (filterTab !== "hosting") {
        list = [...list, ...historicalAsPast];
      }
    }

    if (timeFilter === null && filterTab !== "hosting") {
      list = [...list, ...historicalAsPast];
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
      if (a.invitePending && !b.invitePending) return -1;
      if (!a.invitePending && b.invitePending) return 1;
      const statusOrder: Record<string, number> = { open: 0, draft: 1, reveal: 2, closed: 3, archived: 4, historical: 5 };
      const orderA = a.isHistorical ? 5 : (statusOrder[a.status] ?? 5);
      const orderB = b.isHistorical ? 5 : (statusOrder[b.status] ?? 5);
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });

    return list;
  }, [tastings, filterTab, timeFilter, searchQuery, currentParticipant?.id, historicalAsPast]);

  const counts = useMemo(() => {
    if (!tastings) return { live: 0, upcoming: 0, past: 0 };
    const real = tastings.filter((t: any) => !t.isTestData);
    return {
      live: real.filter((t: any) => t.status === "open").length,
      upcoming: real.filter((t: any) => t.status === "draft").length,
      past: real.filter((t: any) => ["archived", "reveal", "closed"].includes(t.status)).length + historicalAsPast.length,
    };
  }, [tastings, historicalAsPast]);

  if (!currentParticipant) {
    return (
      <AuthGateMessage
        icon={<Wine className="w-12 h-12 labs-tasting-action-icon" />}
        message="Sign in to see your sessions and join new ones."
      />
    );
  }

  return (
    <div className="labs-page-wide labs-fade-in">
      <div className="labs-tastings-header">
        <div className="flex items-center justify-between">
          <h1
            className="labs-serif labs-tastings-title"
            data-testid="labs-tastings-title"
          >
            Tastings
          </h1>
          {counts.live > 0 && (
            <span
              className="labs-badge labs-badge-success labs-tastings-live-badge"
              data-testid="labs-tastings-live-count"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {counts.live} Live
            </span>
          )}
        </div>
      </div>

      <div className="labs-action-bar labs-fade-in labs-stagger-1 labs-tastings-actions">
        <Link href="/labs/join" className="labs-action-bar-item" data-testid="labs-action-join">
          <div className="labs-action-bar-icon labs-action-bar-icon--accent">
            <Users className="w-5 h-5 labs-icon-accent" />
          </div>
          <span className="labs-action-bar-label">Join</span>
        </Link>
        <Link href="/labs/solo" className="labs-action-bar-item" data-testid="labs-action-solo">
          <div className="labs-action-bar-icon labs-action-bar-icon--surface">
            <PenLine className="w-5 h-5 labs-icon-text-secondary" />
          </div>
          <span className="labs-action-bar-label">Solo</span>
        </Link>
        <Link href="/labs/host" className="labs-action-bar-item" data-testid="labs-action-host">
          <div className="labs-action-bar-icon labs-action-bar-icon--success">
            <Crown className="w-5 h-5 labs-icon-success" />
          </div>
          <span className="labs-action-bar-label">Host</span>
        </Link>
        <Link href="/labs/bottle-sharing" className="labs-action-bar-item" data-testid="labs-action-bottle-sharing">
          <div className="labs-action-bar-icon labs-action-bar-icon--accent">
            <Share2 className="w-5 h-5 labs-icon-accent" />
          </div>
          <span className="labs-action-bar-label">Share</span>
        </Link>
      </div>

      <div className="labs-tastings-search-wrapper labs-fade-in labs-stagger-1">
        <Search className="labs-tastings-search-icon w-4 h-4" />
        <input
          className="labs-input labs-tastings-search-input"
          placeholder="Search tastings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="labs-tastings-search"
        />
      </div>

      <div className="labs-tastings-filter-zone labs-fade-in labs-stagger-2">
        <div className="labs-segmented">
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

        <div className="labs-tastings-time-chips">
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
                    className={`labs-tastings-chip-count ${
                      tf === "live"
                        ? "labs-tastings-chip-count--live"
                        : isActive
                          ? "labs-tastings-chip-count--active"
                          : "labs-tastings-chip-count--default"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="labs-tastings-skeleton">
          <div className="labs-skeleton labs-skeleton--h20 labs-skeleton--w60" />
          <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w40" />
          <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w80 labs-skeleton--mt8" />
          <div className="labs-skeleton labs-skeleton--h20 labs-skeleton--w55 labs-skeleton--mt12" />
          <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w45" />
          <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w70 labs-skeleton--mt8" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="labs-empty labs-fade-in" data-testid="labs-tastings-empty">
          <svg className="labs-empty-icon" viewBox="0 0 48 48" fill="none">
            <path d="M14 16 Q13 23 13 30 L13 39 Q13 42 16 42 L32 42 Q35 42 35 39 L35 30 Q35 23 34 16 Z"
              fill="var(--labs-accent)" opacity="0.18"/>
            <path d="M14 16 Q13 23 13 30 L13 39 Q13 42 16 42 L32 42 Q35 42 35 39 L35 30 Q35 23 34 16 Z"
              stroke="var(--labs-accent)" strokeWidth="1.5" fill="none" opacity="0.6"/>
            <rect x="18" y="9" width="12" height="9" rx="2.5" fill="var(--labs-accent)" opacity="0.25"/>
            <path d="M20 26 Q24 30 28 26" stroke="var(--labs-accent)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
          </svg>
          <h2 className="labs-empty-title">
            {searchQuery ? "Keine Ergebnisse" : "Bereit für dein erstes Tasting?"}
          </h2>
          <p className="labs-empty-sub">
            {searchQuery
              ? "Versuche einen anderen Suchbegriff."
              : timeFilter
              ? "Kein Tasting passt zu diesem Filter."
              : "Starte ein eigenes Tasting oder tritt einem bei — allein oder mit Freunden."}
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
            const isInvited = tasting.invitePending === true;
            const isAccepting = acceptingInvite === tasting.id;

            const cardContent = (
              <div
                className="labs-list-row"
                data-testid={`labs-tasting-card-${tasting.id}`}
              >
                <div
                  className={`labs-tasting-card-icon ${
                    tasting.isHistorical
                      ? "labs-tasting-card-icon--live"
                      : isInvited
                        ? "labs-tasting-card-icon--invited"
                        : isLive ? "labs-tasting-card-icon--live" : "labs-tasting-card-icon--default"
                  }`}
                >
                  {tasting.isHistorical ? (
                    <Archive className="labs-tasting-card-icon-sm labs-icon-success" />
                  ) : isInvited ? (
                    <Mail className="labs-tasting-card-icon-sm labs-icon-warning" />
                  ) : (
                    <Wine className={`labs-tasting-card-icon-sm ${isLive ? "labs-icon-success" : "labs-icon-accent"}`} />
                  )}
                </div>

                <div className="labs-tasting-card-body">
                  <div className="labs-tasting-card-title-row">
                    <span
                      className="labs-tasting-card-title"
                      data-testid={`labs-tasting-title-${tasting.id}`}
                    >
                      {String(tasting.title ?? "")}
                    </span>
                    <div className="labs-tasting-card-badges">
                      {isInvited && (
                        <span
                          className="labs-tasting-badge labs-tasting-badge--invite"
                          data-testid={`labs-tasting-invite-badge-${tasting.id}`}
                        >
                          Eingeladen
                        </span>
                      )}
                      {tasting.isHistorical && (
                        <span
                          className="labs-tasting-badge labs-tasting-badge--historical"
                          data-testid={`labs-tasting-historical-badge-${tasting.id}`}
                        >
                          Archiv
                        </span>
                      )}
                      {isHost && !isInvited && !tasting.isHistorical && (
                        <span
                          className="labs-tasting-badge labs-tasting-badge--host"
                          data-testid={`labs-tasting-host-badge-${tasting.id}`}
                        >
                          Host
                        </span>
                      )}
                      {!tasting.isHistorical && (
                        <span
                          className={`labs-badge ${status.cssClass} labs-tasting-status-badge`}
                          data-testid={`labs-tasting-status-${tasting.id}`}
                        >
                          {isLive && (
                            <span className="labs-tasting-live-dot animate-pulse" />
                          )}
                          {status.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {tasting.hostName && (isAdmin || !isHost) && (
                    <div
                      className="labs-tasting-card-host"
                      data-testid={`labs-tasting-hostname-${tasting.id}`}
                    >
                      <Crown className="labs-tasting-card-host-icon" />
                      <span className="labs-tasting-card-host-name">
                        {stripGuestSuffix(tasting.hostName)}
                      </span>
                    </div>
                  )}
                  <div className="labs-tasting-card-meta">
                    {formattedDate && (
                      <span className="labs-tasting-card-meta-item">
                        <Calendar className="labs-tasting-card-meta-icon" />
                        {formattedDate}
                      </span>
                    )}
                    {tasting.location && (
                      <span className="labs-tasting-card-meta-item labs-tasting-card-meta-item--location">
                        <MapPin className="labs-tasting-card-meta-icon" />
                        <span className="labs-tasting-card-host-name">{String(tasting.location ?? "")}</span>
                      </span>
                    )}
                  </div>

                </div>

                <div className="labs-tasting-card-actions">
                  {tasting.code && !isInvited && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const link = `${window.location.origin}/labs/join?code=${tasting.code}`;
                        navigator.clipboard.writeText(link).then(() => {
                          setCopiedShareId(tasting.id);
                          setTimeout(() => setCopiedShareId(null), 2000);
                        });
                      }}
                      className="labs-btn-ghost labs-tasting-action-btn"
                      data-testid={`labs-tasting-share-${tasting.id}`}
                    >
                      {copiedShareId === tasting.id ? (
                        <Check className="labs-tasting-action-icon labs-icon-success" />
                      ) : (
                        <Share2 className="labs-tasting-action-icon" />
                      )}
                    </button>
                  )}
                  {isHost && !isInvited && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/labs/host/${tasting.id}`);
                      }}
                      className="labs-btn-ghost labs-tasting-action-btn"
                      data-testid={`labs-tasting-settings-${tasting.id}`}
                    >
                      <Settings className="labs-tasting-action-icon" />
                    </button>
                  )}
                  <ChevronRight className="labs-tasting-chevron" />
                </div>
              </div>
            );

            if (isInvited) {
              return (
                <div
                  key={tasting.id}
                  onClick={() => !isAccepting && handleAcceptInvite(tasting)}
                  className={`labs-tasting-invite-wrapper ${isAccepting ? "labs-tasting-invite-wrapper--loading" : ""}`}
                  data-testid={`labs-tasting-accept-invite-${tasting.id}`}
                >
                  {cardContent}
                </div>
              );
            }

            if (tasting.isHistorical) {
              return (
                <Link key={tasting.id} href={`/labs/history/${tasting.historicalId}`}>
                  {cardContent}
                </Link>
              );
            }

            return (
              <Link key={tasting.id} href={`/labs/tastings/${tasting.id}`}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
