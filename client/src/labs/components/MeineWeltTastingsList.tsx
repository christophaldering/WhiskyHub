import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wine, Calendar, MapPin, ChevronRight, Crown, BookOpen, Users } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, tastingHistoryApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import { getStatusConfig } from "@/labs/utils/statusConfig";
import type { TastingsHubFilter } from "@/labs/pages/hubTiles";

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

interface Props {
  filter: TastingsHubFilter;
  searchQuery?: string;
}

export default function MeineWeltTastingsList({ filter, searchQuery = "" }: Props) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id;
  const [, navigate] = useLocation();

  const { data: tastings, isLoading: isTastingsLoading } = useQuery({
    queryKey: ["tastings", participantId],
    queryFn: () => tastingApi.getAll(participantId),
    enabled: !!participantId && filter === "active",
    staleTime: 60_000,
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["tasting-history", participantId],
    queryFn: () => tastingHistoryApi.get(participantId!),
    enabled: !!participantId && filter === "completed",
    staleTime: 60_000,
  });

  const matchesSearch = (tasting: any): boolean => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      tasting.title?.toLowerCase().includes(q) ||
      tasting.location?.toLowerCase().includes(q) ||
      tasting.hostName?.toLowerCase().includes(q)
    );
  };

  const activeItems = useMemo(() => {
    if (!tastings || filter !== "active") return [];
    return [...tastings]
      .filter(
        (tasting: any) =>
          !tasting.isTestData &&
          !tasting.invitePending &&
          (tasting.status === "open" || tasting.status === "draft") &&
          matchesSearch(tasting),
      )
      .sort((a: any, b: any) => {
        const statusOrder: Record<string, number> = { open: 0, draft: 1 };
        const orderA = statusOrder[a.status] ?? 2;
        const orderB = statusOrder[b.status] ?? 2;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tastings, filter, searchQuery]);

  const completedItems = useMemo(() => {
    if (filter !== "completed") return [];
    const list = historyData?.tastings ?? [];
    return [...list]
      .filter(
        (tasting: any) =>
          tasting.status !== "open" &&
          tasting.status !== "draft" &&
          tasting.status !== "deleted" &&
          matchesSearch(tasting),
      )
      .sort(
        (a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
      );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyData, filter, searchQuery]);

  const isLoading = filter === "completed" ? isHistoryLoading : isTastingsLoading;
  const items = filter === "completed" ? completedItems : activeItems;

  if (isLoading) {
    return (
      <div className="labs-tastings-skeleton" data-testid={`meine-welt-tastings-list-${filter}-loading`}>
        <div className="labs-skeleton labs-skeleton--h20 labs-skeleton--w60" />
        <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w40" />
        <div className="labs-skeleton labs-skeleton--h14 labs-skeleton--w80 labs-skeleton--mt8" />
      </div>
    );
  }

  if (items.length === 0) {
    const emptyKey =
      filter === "completed" ? "tastings.archiveEmptyTitle" : "tastings.emptyActiveTitle";
    const emptyFallback =
      filter === "completed"
        ? "Noch keine abgeschlossenen Tastings"
        : "Keine aktiven Tastings";
    return (
      <div
        className="labs-empty labs-fade-in"
        data-testid={`meine-welt-tastings-list-${filter}-empty`}
      >
        <h2 className="labs-empty-title">{t(emptyKey, emptyFallback)}</h2>
      </div>
    );
  }

  return (
    <div
      className="labs-grouped-list labs-fade-in"
      data-testid={`meine-welt-tastings-list-${filter}`}
    >
      {items.map((tasting: any) => {
        const statusCfg = getStatusConfig(tasting.status);
        const isHost =
          filter === "completed" ? !!tasting.isHost : tasting.hostId === participantId;
        const isLive = tasting.status === "open";
        const formattedDate = formatTastingDate(tasting.date);
        const showStoryBtn =
          filter === "completed" &&
          (tasting.status === "archived" || tasting.status === "completed") &&
          (isHost || tasting.storyEnabled);

        const href =
          filter === "completed"
            ? `/labs/history/${tasting.id}?from=my-tastings`
            : `/labs/tastings/${tasting.id}`;

        return (
          <Link key={tasting.id} href={href}>
            <div
              className="labs-list-row"
              data-testid={`meine-welt-tasting-card-${tasting.id}`}
            >
              <div
                className={`labs-tasting-card-icon ${
                  isLive ? "labs-tasting-card-icon--live" : "labs-tasting-card-icon--default"
                }`}
              >
                <Wine
                  className={`labs-tasting-card-icon-sm ${
                    isLive ? "labs-icon-success" : "labs-icon-accent"
                  }`}
                />
              </div>
              <div className="labs-tasting-card-body">
                <div className="labs-tasting-card-title-row">
                  <span
                    className="labs-tasting-card-title"
                    data-testid={`meine-welt-tasting-title-${tasting.id}`}
                  >
                    {String(tasting.title ?? "")}
                  </span>
                  <div className="labs-tasting-card-badges">
                    <span
                      className={`labs-badge labs-badge--role ${isHost ? "labs-badge--host" : "labs-badge--guest"}`}
                      data-testid={`meine-welt-tasting-role-${tasting.id}`}
                    >
                      {isHost ? (
                        <>
                          <Crown style={{ width: 9, height: 9 }} />
                          {t("tastings.roleHost", "HOST")}
                        </>
                      ) : (
                        <>
                          <Users style={{ width: 9, height: 9 }} />
                          {t("tastings.roleGuest", "GAST")}
                        </>
                      )}
                    </span>
                    <span
                      className={statusCfg.cssClass}
                      data-testid={`meine-welt-tasting-status-${tasting.id}`}
                    >
                      {isLive && <span className="labs-status-live-dot" />}
                      {t(statusCfg.labelKey, statusCfg.fallbackLabel)}
                    </span>
                  </div>
                </div>
                {!isHost && tasting.hostName && (
                  <div className="labs-tasting-card-host">
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
                      <span className="labs-tasting-card-host-name">
                        {String(tasting.location ?? "")}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div className="labs-tasting-card-actions" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {showStoryBtn && (
                  <button
                    type="button"
                    data-testid={`meine-welt-story-btn-${tasting.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/labs/results/${tasting.id}/story`);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 8px", fontSize: 11, fontWeight: 600,
                      borderRadius: 8, border: "1px solid var(--labs-accent)",
                      color: "var(--labs-accent)", background: "transparent",
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    <BookOpen style={{ width: 11, height: 11 }} />
                    Story
                  </button>
                )}
                <ChevronRight className="labs-tasting-chevron" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
