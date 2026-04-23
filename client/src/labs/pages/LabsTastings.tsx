import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Wine, Calendar, MapPin, ChevronRight, Search, Crown, PenLine, Users, Mail, Share2, Settings, Check, LogIn } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, tastingHistoryApi, journalApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import { getStatusConfig } from "@/labs/utils/statusConfig";
import { useTranslation } from "react-i18next";
import { JoinIcon, GlassIcon, HostIcon } from "@/labs/components/FlavourIcons";
import LabsJoin from "@/labs/pages/LabsJoin";
import LabsSolo from "@/labs/pages/LabsSolo";
import LabsHost from "@/labs/pages/LabsHost";
import LabsBottleSharing from "@/labs/pages/LabsBottleSharing";
import { EmbeddedTastingsProvider } from "@/labs/embeddedTastingsContext";
import { RecentRatedList, buildRecentRatedItems } from "@/labs/components/RecentRatedList";
import heroImage from "@/assets/images/hero-whisky.png";

type TastingsTab = "join" | "solo" | "host" | "share";

function isTastingsTab(value: string | null): value is TastingsTab {
  return value === "join" || value === "solo" || value === "host" || value === "share";
}

type FilterTab = "all" | "hosting" | "joined" | "archive";
type TimeFilter = "upcoming" | "live";

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
  const { t } = useTranslation();
  const { currentParticipant, openAuthDialog } = useAppStore();
  const [, navigate] = useLocation();
  const searchStr = useSearch();

  const initialTab = useMemo<TastingsTab | null>(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const v = params.get("tab");
      if (isTastingsTab(v)) return v;
    } catch {}
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeTab, setActiveTab] = useState<TastingsTab | null>(initialTab);

  useEffect(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const current = params.get("tab");
      const desired = activeTab ?? null;
      if ((current ?? null) === desired) return;
      if (!desired) {
        params.delete("tab");
      } else {
        params.set("tab", desired);
      }
      const qs = params.toString();
      navigate(`/labs/tastings${qs ? `?${qs}` : ""}`, { replace: true });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleTabClick = (tab: TastingsTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

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

  useEffect(() => {
    if (!currentParticipant) {
      try {
        const returnTo = sessionStorage.getItem("returnTo");
        if (returnTo) {
          openAuthDialog("signin");
        }
      } catch {}
    }
  }, [currentParticipant, openAuthDialog]);

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["tasting-history", currentParticipant?.id],
    queryFn: () => tastingHistoryApi.get(currentParticipant!.id),
    enabled: !!currentParticipant?.id,
    staleTime: 60_000,
  });

  const { data: journalData } = useQuery({
    queryKey: ["journal-entries", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant?.id,
    staleTime: 60_000,
  });

  const archiveItems = useMemo(() => {
    const list = historyData?.tastings ?? [];
    let items = list.filter((t: any) => t.status !== "open" && t.status !== "draft" && t.status !== "deleted");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((t: any) =>
        t.title?.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q) ||
        t.hostName?.toLowerCase().includes(q)
      );
    }
    items = [...items].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return items;
  }, [historyData, searchQuery]);

  const recentDrams = useMemo(
    () => buildRecentRatedItems(historyData, journalData, { participantId: currentParticipant?.id }),
    [historyData, journalData, currentParticipant?.id],
  );

  if (!currentParticipant) {
    if (activeTab) {
      return (
        <div data-testid={`labs-tastings-standalone-${activeTab}`}>
          {activeTab === "join" && <LabsJoin />}
          {activeTab === "solo" && <LabsSolo />}
          {activeTab === "host" && <LabsHost />}
          {activeTab === "share" && <LabsBottleSharing />}
        </div>
      );
    }
    return (
      <div className="labs-home-container labs-fade-in">
        <div className="labs-home-header">
          <p className="ty-label labs-home-eyebrow" data-testid="labs-home-eyebrow">
            CaskSense
          </p>
          <h1 className="ty-h1 labs-home-title" data-testid="labs-home-title">
            {t('home.greeting')}
          </h1>
          <p className="ty-sub labs-home-tagline" data-testid="labs-home-tagline">
            {t('home.greetingSub')}
          </p>
        </div>

        <div className="labs-home-cards">
          <button
            className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-1"
            onClick={() => navigate('/labs/solo')}
            data-testid="labs-action-solo"
          >
            <div className="labs-home-action-icon">
              <GlassIcon size={20} />
            </div>
            <div className="labs-home-action-text">
              <div className="ty-ui">{t('home.solo')}</div>
              <div className="ty-caption labs-home-action-sub">
                {t('home.soloSub')}
              </div>
            </div>
          </button>

          <button
            className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-2"
            onClick={() => navigate('/labs/join')}
            data-testid="labs-action-join"
          >
            <div className="labs-home-action-icon">
              <JoinIcon size={20} />
            </div>
            <div className="labs-home-action-text">
              <div className="ty-ui">{t('home.join')}</div>
              <div className="ty-caption labs-home-action-sub">
                {t('home.joinSub')}
              </div>
            </div>
          </button>

          <button
            className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-3"
            onClick={() => navigate('/labs/host')}
            data-testid="labs-action-host"
          >
            <div className="labs-home-action-icon">
              <HostIcon size={20} />
            </div>
            <div className="labs-home-action-text">
              <div className="ty-ui">{t('home.host')}</div>
              <div className="ty-caption labs-home-action-sub">
                {t('home.hostSub')}
              </div>
            </div>
          </button>

          <button
            className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-4"
            onClick={() => navigate('/labs/bottle-sharing')}
            data-testid="labs-action-share"
          >
            <div className="labs-home-action-icon">
              <Share2 size={20} />
            </div>
            <div className="labs-home-action-text">
              <div className="ty-ui">{t('home.share')}</div>
              <div className="ty-caption labs-home-action-sub">
                {t('home.shareSub')}
              </div>
            </div>
          </button>
        </div>

        <p className="ty-caption labs-home-more labs-fade-in labs-stagger-5" data-testid="labs-home-more">
          {t('home.moreAppears')}
        </p>

        <div className="labs-home-divider labs-fade-in labs-stagger-6" />

        <div className="labs-home-stille labs-fade-in labs-stagger-7" data-testid="labs-home-stille">
          <p className="ty-caption labs-home-stille-title">
            Stille
          </p>
          <p className="ty-caption labs-home-stille-sub">
            {t('home.noAccount')}
          </p>
        </div>

        <button
          type="button"
          className="labs-card labs-card-interactive labs-home-action-card labs-home-signin-card labs-fade-in labs-stagger-7"
          onClick={() => openAuthDialog('signin')}
          data-testid="labs-home-signin-link"
        >
          <div className="labs-home-action-icon">
            <LogIn size={20} />
          </div>
          <div className="labs-home-action-text">
            <div className="ty-ui">{t('home.loginButton')}</div>
            <div className="ty-caption labs-home-action-sub">
              {t('home.haveAccount')}
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="labs-page labs-fade-in">
      <div style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <h1
            className="ty-h1"
            style={{ margin: 0 }}
            data-testid="labs-tastings-title"
          >
            {t("tastings.pageTitle", "Tastings")}
          </h1>
          {counts.live > 0 && filterTab !== "archive" && (
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
        <p
          className="ty-sub"
          style={{ margin: "2px 0 0" }}
          data-testid="labs-tastings-subtitle"
        >
          {t("tastings.pageSubtitle", "Taste, host and share")}
        </p>
      </div>

      <div className="labs-action-bar labs-fade-in labs-stagger-1 labs-tastings-actions" data-testid="labs-tastings-actions">
        <button
          type="button"
          onClick={() => handleTabClick("join")}
          className={`labs-action-bar-item labs-action-bar-item--button${activeTab === "join" ? " labs-action-bar-item--active" : ""}`}
          data-testid="labs-action-join"
          aria-pressed={activeTab === "join"}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--accent">
            <Users className="w-5 h-5" style={{ color: "var(--labs-accent)" }} strokeWidth={1.8} />
          </div>
          <span className="labs-action-bar-label">{t("tastingActions.join", "Join")}</span>
          <span className="labs-action-bar-sublabel">{t("tastingActions.joinDesc", "Enter a tasting code")}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick("solo")}
          className={`labs-action-bar-item labs-action-bar-item--button${activeTab === "solo" ? " labs-action-bar-item--active" : ""}`}
          data-testid="labs-action-solo"
          aria-pressed={activeTab === "solo"}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--surface">
            <PenLine className="w-5 h-5" style={{ color: "var(--labs-text-secondary)" }} strokeWidth={1.8} />
          </div>
          <span className="labs-action-bar-label">{t("tastingActions.solo", "Solo")}</span>
          <span className="labs-action-bar-sublabel">{t("tastingActions.soloDesc", "Taste & log on your own")}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick("host")}
          className={`labs-action-bar-item labs-action-bar-item--button${activeTab === "host" ? " labs-action-bar-item--active" : ""}`}
          data-testid="labs-action-host"
          aria-pressed={activeTab === "host"}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--accent">
            <Crown className="w-5 h-5" style={{ color: "var(--labs-accent)" }} strokeWidth={1.8} />
          </div>
          <span className="labs-action-bar-label">{t("tastingActions.host", "Host")}</span>
          <span className="labs-action-bar-sublabel">{t("tastingActions.hostDesc", "Create & run a tasting")}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick("share")}
          className={`labs-action-bar-item labs-action-bar-item--button${activeTab === "share" ? " labs-action-bar-item--active" : ""}`}
          data-testid="labs-action-bottle-sharing"
          aria-pressed={activeTab === "share"}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--success">
            <Share2 className="w-5 h-5" style={{ color: "var(--labs-success, #4ade80)" }} strokeWidth={1.8} />
          </div>
          <span className="labs-action-bar-label">{t("tastingActions.share", "Share")}</span>
          <span className="labs-action-bar-sublabel">{t("tastingActions.shareDesc", "Split a bottle with friends")}</span>
        </button>
      </div>

      {activeTab && (
        <div
          className="labs-tastings-inline-content labs-fade-in"
          data-testid={`labs-tastings-inline-${activeTab}`}
        >
          <EmbeddedTastingsProvider>
            {activeTab === "join" && <LabsJoin />}
            {activeTab === "solo" && <LabsSolo />}
            {activeTab === "host" && <LabsHost />}
            {activeTab === "share" && <LabsBottleSharing />}
          </EmbeddedTastingsProvider>
        </div>
      )}

      {!activeTab && filterTab === "all" && !timeFilter && !searchQuery.trim() && (
        <section
          className="labs-tastings-hero labs-fade-in"
          data-testid="section-tastings-hero"
        >
          <div className="labs-tastings-hero-glow" aria-hidden="true" />
          <div className="labs-tastings-hero-image-wrap">
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              className="labs-tastings-hero-image"
              data-testid="img-tastings-hero"
            />
          </div>
          <h1 className="labs-tastings-hero-brand" data-testid="text-tastings-hero-brand">
            {t("tastings.heroBrand", "CaskSense")}
          </h1>
          <p className="labs-tastings-hero-tagline" data-testid="text-tastings-hero-tagline">
            {t("tastings.heroTitle", "Where tasting becomes reflection.")}
          </p>
        </section>
      )}

      {!activeTab && (
      <>
      {!(filterTab === "all" && !timeFilter && !searchQuery.trim()) && (
        <div className="labs-tastings-search-wrapper labs-fade-in labs-stagger-1">
          <Search className="labs-tastings-search-icon w-4 h-4" />
          <input
            className="labs-input labs-tastings-search-input"
            placeholder={filterTab === "archive" ? t("tastings.archiveSearchPlaceholder", "Search my archive...") : "Search tastings..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="labs-tastings-search"
          />
        </div>
      )}


      {isLoading ? (
        <div className="labs-tastings-skeleton">
          <div className="labs-skeleton labs-skeleton--h20 labs-skeleton--w60" />
          <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w40" />
          <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w80 labs-skeleton--mt8" />
          <div className="labs-skeleton labs-skeleton--h20 labs-skeleton--w55 labs-skeleton--mt12" />
          <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w45" />
          <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w70 labs-skeleton--mt8" />
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
                  const statusCfg = getStatusConfig(tasting.status);
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
                              <span className="labs-tasting-badge--invite" data-testid={`labs-tasting-invite-badge-${tasting.id}`}>
                                {t("tastingStatus.invited", "Invited")}
                              </span>
                              <span className={statusCfg.cssClass} data-testid={`labs-tasting-status-${tasting.id}`}>
                                {isLive && <span className="labs-status-live-dot" />}
                                {t(statusCfg.labelKey, statusCfg.fallbackLabel)}
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

          <div className="labs-recent-section-head labs-fade-in labs-stagger-3" data-testid="section-upcoming-head">
            <span className="labs-section-label">
              {t("tastings.upcomingHeader", "Upcoming Tastings")}
            </span>
            <Link
              href="/labs/taste?tab=tastings"
              className="labs-recent-view-all"
              data-testid="link-upcoming-view-all"
            >
              {t("myTastePage.viewAll", "View all")}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filtered.length === 0 ? (
            <div className="labs-empty labs-fade-in" data-testid="labs-tastings-upcoming-empty">
              <p className="labs-empty-sub">
                {searchQuery
                  ? t("tastings.upcomingEmptySearch", "Keine passenden Tastings gefunden.")
                  : t("tastings.upcomingEmpty", "Keine anstehenden Tastings.")}
              </p>
            </div>
          ) : (
            <div className="labs-grouped-list labs-fade-in">
              {filtered.map((tasting: any) => {
                const statusCfg = getStatusConfig(tasting.status);
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
                            <span className={statusCfg.cssClass} data-testid={`labs-tasting-status-${tasting.id}`}>
                              {isLive && <span className="labs-status-live-dot" />}
                              {t(statusCfg.labelKey, statusCfg.fallbackLabel)}
                            </span>
                          </div>
                        </div>
                        <div className="labs-tasting-card-host" data-testid={`labs-tasting-hostname-${tasting.id}`}>
                          {isHost ? (
                            <span className="labs-tasting-role-text">{t("tastingStatus.yourTasting", "Your Tasting")}</span>
                          ) : tasting.hostName && (isAdmin || !isHost) ? (
                            <>
                              <Crown className="labs-tasting-card-host-icon" />
                              <span className="labs-tasting-card-host-name">{stripGuestSuffix(tasting.hostName)}</span>
                            </>
                          ) : null}
                        </div>
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

      <RecentRatedList
        items={recentDrams}
        limit={3}
        sectionTestId="hub-recent-section-teaser"
        viewAllHref="/labs/taste/drams"
      />
      </>
      )}
    </div>
  );
}
