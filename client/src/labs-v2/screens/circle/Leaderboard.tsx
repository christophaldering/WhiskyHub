import { useState, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Trophy, UserCheck } from "../../icons";
import { leaderboardApi } from "@/lib/api";

const WHISKY_ADJECTIVES = [
  "Peated", "Sherried", "Smoky", "Oaky", "Honeyed",
  "Briny", "Spiced", "Malted", "Silken", "Amber",
  "Copper", "Highland", "Coastal", "Mossy", "Golden",
  "Velvet", "Charred", "Heather", "Misty", "Burnished",
];

const WHISKY_NOUNS = [
  "Fox", "Flask", "Barrel", "Stag", "Otter",
  "Thistle", "Falcon", "Cask", "Wolf", "Raven",
  "Heron", "Badger", "Lynx", "Owl", "Marten",
  "Pike", "Ember", "Stone", "Brook", "Crane",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getWhiskyAlias(id: string): string {
  const h = hashCode(id);
  const adj = WHISKY_ADJECTIVES[h % WHISKY_ADJECTIVES.length];
  const noun = WHISKY_NOUNS[(h >> 8) % WHISKY_NOUNS.length];
  return `${adj} ${noun}`;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  isSelf?: boolean;
  isFriend?: boolean;
  ratingsCount?: number;
  avgNotesLength?: number;
  avgScore?: number;
  uniqueWhiskies?: number;
  score?: number;
  tastings?: number;
}

interface YourRanks {
  mostActive: number;
  mostDetailed: number;
  highestRated: number;
  explorer: number;
  total: number;
  stats: {
    ratingsCount: number;
    avgNotesLength: number;
    avgScore: number;
    uniqueWhiskies: number;
  };
}

interface LeaderboardData {
  mostActive: LeaderboardEntry[];
  mostDetailed: LeaderboardEntry[];
  highestRated: LeaderboardEntry[];
  explorer: LeaderboardEntry[];
  yourRanks?: YourRanks;
}

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string | null;
}

export default function Leaderboard({ th, t, participantId }: Props) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("mostActive");

  useEffect(() => {
    if (!participantId) { setLoading(false); return; }
    setLoading(true);
    leaderboardApi.get()
      .then((d: unknown) => {
        if (d && typeof d === "object" && !Array.isArray(d) && ("mostActive" in (d as Record<string, unknown>) || "highestRated" in (d as Record<string, unknown>))) {
          setData(d as LeaderboardData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [participantId]);

  if (loading) {
    return (
      <div style={{ padding: `${SP.lg}px 0` }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{
            height: 56, background: th.bgCard, borderRadius: RADIUS.md,
            marginBottom: SP.sm, opacity: 0.6,
          }} className="v2-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: `${SP.xxl}px 0` }}>
        <Trophy color={th.faint} size={40} style={{ marginBottom: SP.md }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>{t.circleBoard}</p>
        <p style={{ fontSize: 12, color: th.muted }}>
          {t.circleFeedEmpty}
        </p>
      </div>
    );
  }

  const categories = [
    { key: "mostActive", label: "Active", entries: data.mostActive || [], format: (e: LeaderboardEntry) => `${e.ratingsCount || 0}` },
    { key: "highestRated", label: "Top", entries: data.highestRated || [], format: (e: LeaderboardEntry) => typeof e.avgScore === "number" ? e.avgScore.toFixed(1) : "\u2014" },
    { key: "mostDetailed", label: "Detail", entries: data.mostDetailed || [], format: (e: LeaderboardEntry) => `${Math.round(e.avgNotesLength || 0)}` },
    { key: "explorer", label: "Explorer", entries: data.explorer || [], format: (e: LeaderboardEntry) => `${e.uniqueWhiskies || 0}` },
  ];

  const activeCat = categories.find((c) => c.key === category) || categories[0];
  const yourRanks = data.yourRanks;
  const yourRank = yourRanks ? yourRanks[activeCat.key as keyof Omit<YourRanks, "total" | "stats">] as number : 0;
  const yourTotal = yourRanks?.total || 0;
  const yourPct = yourTotal > 0 ? Math.round(((yourTotal - yourRank) / yourTotal) * 100) : 0;

  return (
    <div className="v2-fade-up" data-testid="v2-circle-leaderboard">
      {yourRanks && (
        <div
          style={{
            background: `linear-gradient(135deg, rgba(212,168,71,0.12) 0%, ${th.bgCard} 100%)`,
            border: `1px solid ${th.gold}`,
            borderRadius: RADIUS.lg,
            padding: SP.md,
            marginBottom: SP.lg,
            display: "flex",
            alignItems: "center",
            gap: SP.md,
          }}
          data-testid="v2-circle-your-rank"
        >
          <div style={{
            width: 48, height: 48, borderRadius: RADIUS.md,
            background: `rgba(212,168,71,0.15)`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Trophy color={th.gold} size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: th.muted, marginBottom: 2 }}>
              {t.circleYourRank} · {activeCat.label}
            </p>
            <p style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: th.gold, margin: 0 }}>
              #{yourRank}{" "}
              <span style={{ fontSize: 13, fontWeight: 400, color: th.muted }}>
                {t.circleOf} {yourTotal}
              </span>
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: `2px ${SP.sm}px`,
              borderRadius: RADIUS.full, background: `rgba(212,168,71,0.15)`, color: th.gold,
            }}>
              Top {Math.max(1, 100 - yourPct)}%
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP.xs, marginBottom: SP.lg }}>
        {categories.map((cat) => {
          const isActive = category === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              data-testid={`v2-circle-lb-${cat.key}`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: `${SP.sm}px ${SP.xs}px`, borderRadius: RADIUS.md,
                minHeight: TOUCH_MIN,
                background: isActive ? `rgba(212,168,71,0.12)` : "transparent",
                border: `1px solid ${isActive ? th.gold : "transparent"}`,
                color: isActive ? th.gold : th.muted,
                fontWeight: isActive ? 700 : 500,
                fontSize: 11, fontFamily: FONT.body, cursor: "pointer",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {activeCat.entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: `${SP.xxl}px 0` }}>
          <Trophy color={th.faint} size={32} />
          <p style={{ fontSize: 13, color: th.muted, marginTop: SP.sm }}>{t.circleFeedEmpty}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
          {activeCat.entries.map((entry, i) => {
            const isSelf = entry.isSelf;
            const isFriend = entry.isFriend;
            const displayName = isSelf ? t.youLabel : isFriend ? String(entry.name || "") : getWhiskyAlias(entry.id);
            const borderStyle = isSelf
              ? `1px solid ${th.gold}`
              : isFriend
              ? `1px solid ${th.green}`
              : `1px solid ${th.border}`;
            const bgStyle = isSelf
              ? `rgba(212,168,71,0.06)`
              : th.bgCard;

            return (
              <div
                key={entry.id || i}
                style={{
                  display: "flex", alignItems: "center", gap: SP.sm,
                  padding: `${SP.sm + 2}px ${SP.md}px`,
                  borderRadius: RADIUS.md,
                  background: bgStyle,
                  border: borderStyle,
                }}
                data-testid={`v2-circle-lb-entry-${i}`}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: RADIUS.full,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < 3 ? `rgba(212,168,71,0.15)` : th.bgCard,
                  fontSize: i < 3 ? 14 : 12,
                  fontWeight: 700,
                  color: i < 3 ? th.gold : th.muted,
                  flexShrink: 0,
                }}>
                  {i < 3 ? ["\u{1F947}", "\u{1F948}", "\u{1F949}"][i] : i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: SP.xs }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: isSelf ? th.gold : th.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {displayName}
                    </span>
                    {isSelf && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: `1px 6px`,
                        borderRadius: RADIUS.full, background: `rgba(212,168,71,0.2)`, color: th.gold,
                      }}>
                        {t.youLabel}
                      </span>
                    )}
                    {isFriend && !isSelf && (
                      <UserCheck color={th.green} size={14} />
                    )}
                  </div>
                </div>

                <span style={{
                  fontFamily: FONT.display, fontSize: 14, fontWeight: 700,
                  color: isSelf ? th.gold : th.text, flexShrink: 0,
                }}>
                  {activeCat.format(entry)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
