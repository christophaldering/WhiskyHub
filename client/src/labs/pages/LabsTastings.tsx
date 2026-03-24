import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Wine, Calendar, MapPin, ChevronRight, ChevronLeft, Search, Crown, PenLine, Users, Mail, Share2, Settings, Check } from "lucide-react";
import BackLink from "@/labs/components/BackLink";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import AuthGateMessage from "@/labs/components/AuthGateMessage";

type FilterTab = "all" | "hosting" | "joined";
type TimeFilter = "upcoming" | "live";

const STATUS_CONFIG: Record<string, { label: string; cssClass: string }> = {
  draft: { label: "Setting up", cssClass: "labs-badge-info" },
  open: { label: "Live", cssClass: "labs-badge-success" },
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

  const { data: tastings, isLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
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

  const { invitations, filtered } = useMemo(() => {
    if (!tastings) return { invitations: [], filtered: [] };
    let list = [...tastings].filter((t: any) => !t.isTestData);

    const activeOnly = list.filter((t: any) => t.status === "open" || t.status === "draft");

    let invites = activeOnly.filter((t: any) => t.invitePending === true);

    let result = activeOnly.filter((t: any) => !t.invitePending);

    if (filterTab === "hosting") {
      result = result.filter((t: any) => t.hostId === currentParticipant?.id);
    } else if (filterTab === "joined") {
      result = result.filter((t: any) => t.hostId !== currentParticipant?.id);
    }

    if (timeFilter === "live") {
      result = result.filter((t: any) => t.status === "open");
    } else if (timeFilter === "upcoming") {
      result = result.filter((t: any) => t.status === "draft");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (t: any) =>
        t.title?.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q) ||
        t.hostName?.toLowerCase().includes(q);
      result = result.filter(matchesSearch);
      invites = invites.filter(matchesSearch);
    }

    result.sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = { open: 0, draft: 1 };
      const orderA = statusOrder[a.status] ?? 2;
      const orderB = statusOrder[b.status] ?? 2;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });

    return { invitations: invites, filtered: result };
  }, [tastings, filterTab, timeFilter, searchQuery, currentParticipant?.id]);

  const counts = useMemo(() => {
    if (!tastings) return { live: 0, upcoming: 0 };
    const real = tastings.filter((t: any) => !t.isTestData);
    const active = real.filter((t: any) => t.status === "open" || t.status === "draft");
    return {
      live: active.filter((t: any) => t.status === "open").length,
      upcoming: active.filter((t: any) => t.status === "draft").length,
    };
  }, [tastings]);

  if (!currentParticipant) {
    return (
      <AuthGateMessage
        icon={<Wine className="w-12 h-12 labs-tasting-action-icon" />}
        message="Sign in to see your sessions and join new ones."
      />
    );
  }

  return (
    <div className="labs-page labs-fade-in">
      <BackLink href="/labs/home" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-tastings">
          <ChevronLeft className="w-4 h-4" /> Home
        </button>
      </BackLink>
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
          {(["live", "upcoming"] as const).map((tf) => {
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
      ) : filtered.length === 0 && invitations.length === 0 && (searchQuery || timeFilter) ? (
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
              : `Keine ${timeFilter === "live" ? "Live" : "geplanten"} Tastings gefunden.`}
          </p>
        </div>
      ) : filtered.length === 0 && invitations.length === 0 ? (
        <div className="labs-mode-guide labs-fade-in" data-testid="labs-tastings-empty">
          <div className="labs-mode-guide-grid">
            <div className="labs-mode-guide-item" data-testid="guide-join">
              <div className="labs-mode-guide-icon labs-action-bar-icon--accent">
                <Users className="w-4 h-4 labs-icon-accent" />
              </div>
              <div className="labs-mode-guide-text">
                <span className="labs-mode-guide-label">Join</span>
                <span className="labs-mode-guide-desc">Tritt einem Tasting bei, das jemand für dich erstellt hat.</span>
              </div>
            </div>
            <div className="labs-mode-guide-item" data-testid="guide-solo">
              <div className="labs-mode-guide-icon labs-action-bar-icon--surface">
                <PenLine className="w-4 h-4 labs-icon-text-secondary" />
              </div>
              <div className="labs-mode-guide-text">
                <span className="labs-mode-guide-label">Solo</span>
                <span className="labs-mode-guide-desc">Trainiere deinen Gaumen allein — in deinem eigenen Tempo.</span>
              </div>
            </div>
            <div className="labs-mode-guide-item" data-testid="guide-host">
              <div className="labs-mode-guide-icon labs-action-bar-icon--success">
                <Crown className="w-4 h-4 labs-icon-success" />
              </div>
              <div className="labs-mode-guide-text">
                <span className="labs-mode-guide-label">Host</span>
                <span className="labs-mode-guide-desc">Lade Freunde zu einer Blindverkostung ein und vergleicht eure Bewertungen.</span>
              </div>
            </div>
            <div className="labs-mode-guide-item" data-testid="guide-share">
              <div className="labs-mode-guide-icon labs-action-bar-icon--accent">
                <Share2 className="w-4 h-4 labs-icon-accent" />
              </div>
              <div className="labs-mode-guide-text">
                <span className="labs-mode-guide-label">Share</span>
                <span className="labs-mode-guide-desc">Organisiere ein Bottle Sharing — jeder bringt etwas mit.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {invitations.length > 0 && (
            <div className="labs-invitations-section labs-fade-in labs-stagger-3" data-testid="labs-invitations-section">
              <div className="labs-invitations-header">
                <Mail className="w-5 h-5 labs-icon-warning" />
                <h2 className="labs-invitations-title">Einladungen</h2>
                <span className="labs-invitations-count">{invitations.length}</span>
              </div>
              <div className="labs-invitations-list">
                {invitations.map((tasting: any) => {
                  const status = STATUS_CONFIG[tasting.status] || STATUS_CONFIG.draft;
                  const isLive = tasting.status === "open";
                  const formattedDate = formatTastingDate(tasting.date);
                  const isAccepting = acceptingInvite === tasting.id;

                  return (
                    <div
                      key={tasting.id}
                      onClick={() => !isAccepting && handleAcceptInvite(tasting)}
                      className={`labs-invitation-card ${isAccepting ? "labs-invitation-card--loading" : ""}`}
                      data-testid={`labs-tasting-accept-invite-${tasting.id}`}
                    >
                      <div className="labs-list-row" data-testid={`labs-tasting-card-${tasting.id}`}>
                        <div className="labs-tasting-card-icon labs-tasting-card-icon--invited">
                          <Mail className="labs-tasting-card-icon-sm labs-icon-warning" />
                        </div>
                        <div className="labs-tasting-card-body">
                          <div className="labs-tasting-card-title-row">
                            <span className="labs-tasting-card-title" data-testid={`labs-tasting-title-${tasting.id}`}>
                              {String(tasting.title ?? "")}
                            </span>
                            <div className="labs-tasting-card-badges">
                              <span className="labs-tasting-badge labs-tasting-badge--invite" data-testid={`labs-tasting-invite-badge-${tasting.id}`}>
                                Eingeladen
                              </span>
                              <span className={`labs-badge ${status.cssClass} labs-tasting-status-badge`} data-testid={`labs-tasting-status-${tasting.id}`}>
                                {isLive && <span className="labs-tasting-live-dot animate-pulse" />}
                                {status.label}
                              </span>
                            </div>
                          </div>
                          {tasting.hostName && (
                            <div className="labs-tasting-card-host" data-testid={`labs-tasting-hostname-${tasting.id}`}>
                              <Crown className="labs-tasting-card-host-icon" />
                              <span className="labs-tasting-card-host-name">{stripGuestSuffix(tasting.hostName)}</span>
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
                          <span className="labs-invitation-accept-hint">Annehmen</span>
                          <ChevronRight className="labs-tasting-chevron" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="labs-grouped-list labs-fade-in labs-stagger-3">
              {filtered.map((tasting: any) => {
                const status = STATUS_CONFIG[tasting.status] || STATUS_CONFIG.draft;
                const isHost = tasting.hostId === currentParticipant?.id;
                const isLive = tasting.status === "open";
                const formattedDate = formatTastingDate(tasting.date);

                return (
                  <Link key={tasting.id} href={`/labs/tastings/${tasting.id}`}>
                    <div className="labs-list-row" data-testid={`labs-tasting-card-${tasting.id}`}>
                      <div className={`labs-tasting-card-icon ${isLive ? "labs-tasting-card-icon--live" : "labs-tasting-card-icon--default"}`}>
                        <Wine className={`labs-tasting-card-icon-sm ${isLive ? "labs-icon-success" : "labs-icon-accent"}`} />
                      </div>
                      <div className="labs-tasting-card-body">
                        <div className="labs-tasting-card-title-row">
                          <span className="labs-tasting-card-title" data-testid={`labs-tasting-title-${tasting.id}`}>
                            {String(tasting.title ?? "")}
                          </span>
                          <div className="labs-tasting-card-badges">
                            {isHost && (
                              <span className="labs-tasting-badge labs-tasting-badge--host" data-testid={`labs-tasting-host-badge-${tasting.id}`}>
                                Host
                              </span>
                            )}
                            <span className={`labs-badge ${status.cssClass} labs-tasting-status-badge`} data-testid={`labs-tasting-status-${tasting.id}`}>
                              {isLive && <span className="labs-tasting-live-dot animate-pulse" />}
                              {status.label}
                            </span>
                          </div>
                        </div>
                        {tasting.hostName && (isAdmin || !isHost) && (
                          <div className="labs-tasting-card-host" data-testid={`labs-tasting-hostname-${tasting.id}`}>
                            <Crown className="labs-tasting-card-host-icon" />
                            <span className="labs-tasting-card-host-name">{stripGuestSuffix(tasting.hostName)}</span>
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
                        {tasting.code && (
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
                        {isHost && (
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
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
