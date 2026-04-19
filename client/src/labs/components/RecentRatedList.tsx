import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import i18n from "i18next";

export type RecentOrigin = "tasting" | "solo" | "messe" | "journal";
export type RecentOriginStatus = "draft" | "live" | "completed";

export interface RecentRatedItem {
  id: string;
  whiskyName: string;
  score: number;
  date: string;
  origin: RecentOrigin;
  originStatus?: RecentOriginStatus;
  rated: boolean;
  originHref?: string;
}

interface BuildOptions {
  participantId?: string | null;
}

export function buildRecentRatedItems(
  historyData: any,
  journalData: any,
  _opts: BuildOptions = {},
): RecentRatedItem[] {
  const items: RecentRatedItem[] = [];

  if (historyData?.tastings && Array.isArray(historyData.tastings)) {
    for (const tasting of historyData.tastings) {
      const status: string = tasting.status || "";
      const isActive = status === "draft" || status === "open";
      const originStatus: RecentOriginStatus | undefined =
        status === "draft" ? "draft" : status === "open" ? "live" : "completed";
      const isSolo = tasting.isHost && (tasting.participantCount ?? 0) <= 1;
      const titleHay = `${tasting.title || ""} ${tasting.location || ""} ${tasting.tastingType || ""}`.toLowerCase();
      const isMesse = /\b(messe|fair|festival)\b/.test(titleHay);
      const origin: RecentOrigin = isMesse ? "messe" : isSolo ? "solo" : "tasting";
      const tastingDate = tasting.date || tasting.createdAt || "";
      const whiskies = Array.isArray(tasting.whiskies) ? tasting.whiskies : [];
      for (const w of whiskies) {
        const myRating = w.myRating || null;
        const score = myRating?.overall ?? 0;
        const hasRating = !!myRating && score > 0;
        if (!hasRating && !isActive) continue;
        items.push({
          id: `t-${tasting.id}-${w.id}`,
          whiskyName: w.name || "Unknown Whisky",
          score: hasRating ? score : 0,
          date: hasRating ? (myRating.updatedAt || myRating.createdAt || tastingDate) : tastingDate,
          origin,
          originStatus,
          rated: hasRating,
          originHref: `/labs/tastings/${tasting.id}`,
        });
      }
    }
  }

  if (Array.isArray(journalData)) {
    for (const j of journalData) {
      if (j.deletedAt) continue;
      if (j.status === "draft") continue;
      const score = j.personalScore ?? j.overall ?? 0;
      items.push({
        id: `j-${j.id}`,
        whiskyName: j.name || j.title || "Unknown Whisky",
        score: score > 0 ? score : 0,
        date: j.tastingDate || j.updatedAt || j.createdAt || "",
        origin: "journal",
        rated: score > 0,
        originHref: `/labs/taste/drams?entry=${encodeURIComponent(j.id)}`,
      });
    }
  }

  items.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });
  return items;
}

interface RecentRatedListProps {
  items: RecentRatedItem[];
  limit: number;
  sectionTestId: string;
  viewAllHref?: string;
  className?: string;
  headerVariant?: "hub" | "meine-welt";
}

export function RecentRatedList({
  items,
  limit,
  sectionTestId,
  viewAllHref = "/labs/taste/drams",
  className,
  headerVariant = "hub",
}: RecentRatedListProps) {
  const { t } = useTranslation();
  const visible = items.slice(0, limit);
  const locale = i18n.language === "de" ? "de-DE" : "en-US";

  const renderHeader = () => {
    if (headerVariant === "meine-welt") {
      return (
        <div className="labs-meine-welt-section-head">
          <span className="labs-meine-welt-section-label">{t("hub.recentlyRated")}</span>
          <Link
            href={viewAllHref}
            className="labs-meine-welt-view-all"
            data-testid="link-recent-view-all"
          >
            {t("myTastePage.viewAll", "View all")}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      );
    }
    return (
      <div className="labs-recent-section-head">
        <span className="labs-section-label">{t("hub.recentlyRated")}</span>
        <Link
          href={viewAllHref}
          className="labs-recent-view-all"
          data-testid="link-recent-view-all"
        >
          {t("myTastePage.viewAll", "View all")}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  };

  return (
    <div className={`labs-hub-recent labs-fade-in ${className || ""}`} data-testid={sectionTestId}>
      {renderHeader()}
      {visible.length > 0 ? (
        <div className="labs-hub-dram-list">
          {visible.map((d) => {
            const originLabel = t(`hub.origin.${d.origin}`);
            const statusLabel =
              d.originStatus === "draft"
                ? t("hub.originStatus.draft")
                : d.originStatus === "live"
                ? t("hub.originStatus.live")
                : "";
            const originText = statusLabel ? `${originLabel} · ${statusLabel}` : originLabel;
            const dateText = d.date ? new Date(d.date).toLocaleDateString(locale) : "";
            const rowContent = (
              <>
                <div className="labs-dram-info">
                  <span className="labs-dram-name">{d.whiskyName}</span>
                  <div className="labs-dram-meta">
                    {dateText && <span className="labs-dram-date">{dateText}</span>}
                    <span
                      className={`labs-dram-origin labs-dram-origin--${d.origin}`}
                      data-testid={`chip-recent-origin-${d.id}`}
                    >
                      {originText}
                    </span>
                  </div>
                </div>
                {d.rated ? (
                  <div
                    className={`labs-dram-score${Math.round(d.score) >= 90 ? " labs-dram-score--high" : ""}`}
                    data-testid={`text-recent-score-${d.id}`}
                  >
                    {Math.round(d.score)}
                  </div>
                ) : (
                  <span
                    className="labs-dram-badge-unrated"
                    data-testid={`badge-recent-unrated-${d.id}`}
                  >
                    {t("hub.notRatedYet")}
                  </span>
                )}
              </>
            );
            const itemClass = `labs-dram-item${d.rated ? "" : " labs-dram-item--unrated"}`;
            return d.originHref ? (
              <Link
                key={d.id}
                href={d.originHref}
                className={itemClass}
                data-testid={`link-recent-item-${d.id}`}
              >
                {rowContent}
              </Link>
            ) : (
              <div key={d.id} className={itemClass} data-testid={`dram-item-${d.id}`}>
                {rowContent}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="labs-hub-empty" data-testid="hub-no-drams">
          {t("hub.noDrams")}
        </p>
      )}
    </div>
  );
}
