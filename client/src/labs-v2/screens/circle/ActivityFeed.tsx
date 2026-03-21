import { useState, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations, V2Lang } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import { Feed, Whisky, Trophy, TabCircle } from "../../icons";
import { activityApi } from "@/lib/api";

interface ActivityItem {
  type: "journal" | "tasting" | "rating" | "dram";
  participantId: string;
  participantName: string;
  timestamp: string;
  details: Record<string, unknown>;
}

interface Props {
  th: ThemeTokens;
  t: Translations;
  lang: V2Lang;
  participantId: string | null;
  onGoToFriends?: () => void;
}

function relTime(ts: string, lang: V2Lang): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return lang === "de" ? "jetzt" : "now";
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  const locale = lang === "de" ? "de-DE" : "en-US";
  return new Date(ts).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export default function ActivityFeed({ th, t, lang, participantId, onGoToFriends }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!participantId) { setLoading(false); return; }
    setLoading(true);
    activityApi.getFriendActivity(participantId)
      .then((d: unknown) => {
        const data = d as { activities?: ActivityItem[] };
        setItems(data?.activities || (Array.isArray(d) ? d as ActivityItem[] : []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [participantId]);

  if (loading) {
    return (
      <div style={{ padding: `${SP.lg}px 0` }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{
            height: 60, background: th.bgCard, borderRadius: RADIUS.md,
            marginBottom: SP.sm, opacity: 0.6,
          }} className="v2-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{ textAlign: "center", padding: `${SP.xxl}px 0` }}
        data-testid="v2-circle-feed-empty"
      >
        <Feed color={th.faint} size={48} style={{ marginBottom: SP.md }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>
          {t.circleFeed}
        </p>
        <p style={{ fontSize: 12, color: th.muted, marginBottom: SP.lg }}>
          {t.circleFeedEmpty}
        </p>
        {onGoToFriends && (
          <button
            onClick={onGoToFriends}
            data-testid="v2-circle-feed-add-friends"
            style={{
              padding: `${SP.sm}px ${SP.lg}px`,
              borderRadius: RADIUS.full, border: `1px solid ${th.gold}`,
              background: "transparent", color: th.gold,
              fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.circleSearchFriend}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="v2-fade-up" data-testid="v2-circle-feed">
      <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
        {items.map((item, i) => {
          const isRating = item.type === "journal" || item.type === "rating" || item.type === "dram";
          const IconComp = isRating ? Whisky : Trophy;
          const description = isRating
            ? (item.details?.title as string || t.circleDram)
            : (item.details?.title as string || t.circleTasting);
          const score = item.details?.personalScore || item.details?.score;

          return (
            <div
              key={`${item.type}-${item.participantId}-${i}`}
              style={{
                display: "flex", gap: SP.sm,
                padding: `${SP.sm + 2}px ${SP.md}px`, borderRadius: RADIUS.md,
                background: th.bgCard, border: `1px solid ${th.border}`,
              }}
              data-testid={`v2-circle-feed-item-${i}`}
            >
              <div style={{
                width: 36, height: 36, borderRadius: RADIUS.full,
                background: `rgba(212,168,71,0.12)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <IconComp color={th.gold} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{
                    fontFamily: FONT.display, fontSize: 13, fontWeight: 600,
                    color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.participantName}
                  </span>
                  <span style={{ fontSize: 11, color: th.faint, flexShrink: 0 }}>
                    {relTime(item.timestamp, lang)}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: th.muted, margin: 0 }}>
                  {isRating ? t.circleRated : t.circleTasting}
                </p>
                <p style={{ fontSize: 12, fontWeight: 500, color: th.text, margin: `2px 0 0`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {description}
                </p>
                {score && (
                  <div style={{ display: "flex", alignItems: "center", gap: SP.xs, marginTop: 2 }}>
                    <TabCircle color={th.gold} size={12} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: th.gold }}>{String(score)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
