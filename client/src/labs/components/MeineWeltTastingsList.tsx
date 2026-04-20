import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wine, Calendar, MapPin, ChevronRight, Crown } from "lucide-react";
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
}

export default function MeineWeltTastingsList({ filter }: Props) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id;

  const { data: tastings, isLoading: isTastingsLoading } = useQuery({
    queryKey: ["tastings", participantId],
    queryFn: () => tastingApi.getAll(participantId),
    enabled: !!participantId && filter !== "archive",
    staleTime: 60_000,
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["tasting-history", participantId],
    queryFn: () => tastingHistoryApi.get(participantId!),
    enabled: !!participantId && filter === "archive",
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!tastings || filter === "archive") return [];
    let result = [...tastings].filter((tasting: any) => !tasting.isTestData);
    result = result.filter(
      (tasting: any) =>
        (tasting.status === "open" || tasting.status === "draft") && !tasting.invitePending,
    );
    if (filter === "hosting") {
      result = result.filter((tasting: any) => tasting.hostId === participantId);
    } else if (filter === "joined") {
      result = result.filter((tasting: any) => tasting.hostId !== participantId);
    }
    result.sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = { open: 0, draft: 1 };
      const orderA = statusOrder[a.status] ?? 2;
      const orderB = statusOrder[b.status] ?? 2;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });
    return result;
  }, [tastings, filter, participantId]);

  const archiveItems = useMemo(() => {
    if (filter !== "archive") return [];
    const list = historyData?.tastings ?? [];
    const items = list.filter(
      (tasting: any) =>
        tasting.status !== "open" && tasting.status !== "draft" && tasting.status !== "deleted",
    );
    return [...items].sort(
      (a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
    );
  }, [historyData, filter]);

  const isLoading = filter === "archive" ? isHistoryLoading : isTastingsLoading;
  const items = filter === "archive" ? archiveItems : filtered;

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
      filter === "archive"
        ? "tastings.archiveEmptyTitle"
        : filter === "hosting"
          ? "tastings.emptyHostingTitle"
          : filter === "joined"
            ? "tastings.emptyJoinedTitle"
            : "tastings.emptyAllTitle";
    const emptyFallback =
      filter === "archive"
        ? "Your archive is still empty"
        : filter === "hosting"
          ? "No tastings you host yet"
          : filter === "joined"
            ? "No tastings joined yet"
            : "No active tastings";
    return (
      <div
        className="labs-empty labs-fade-in"
        data-testid={`meine-welt-tastings-list-${filter}-empty`}
      >
        <h2 className="labs-empty-title">{t(emptyKey, emptyFallback)}</h2>
      </div>
    );
  }

  const hrefBase = filter === "archive" ? "/labs/history" : "/labs/tastings";

  return (
    <div
      className="labs-grouped-list labs-fade-in"
      data-testid={`meine-welt-tastings-list-${filter}`}
    >
      {items.map((tasting: any) => {
        const statusCfg = getStatusConfig(tasting.status);
        const isHost =
          filter === "archive" ? !!tasting.isHost : tasting.hostId === participantId;
        const isLive = tasting.status === "open";
        const formattedDate = formatTastingDate(tasting.date);
        return (
          <Link key={tasting.id} href={`${hrefBase}/${tasting.id}`}>
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
                      className={statusCfg.cssClass}
                      data-testid={`meine-welt-tasting-status-${tasting.id}`}
                    >
                      {isLive && <span className="labs-status-live-dot" />}
                      {t(statusCfg.labelKey, statusCfg.fallbackLabel)}
                    </span>
                  </div>
                </div>
                <div className="labs-tasting-card-host">
                  {isHost ? (
                    <span className="labs-tasting-role-text">
                      {t("tastingStatus.yourTasting", "Your Tasting")}
                    </span>
                  ) : tasting.hostName ? (
                    <>
                      <Crown className="labs-tasting-card-host-icon" />
                      <span className="labs-tasting-card-host-name">
                        {stripGuestSuffix(tasting.hostName)}
                      </span>
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
                      <span className="labs-tasting-card-host-name">
                        {String(tasting.location ?? "")}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div className="labs-tasting-card-actions">
                <ChevronRight className="labs-tasting-chevron" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
