import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  Trophy, Wine, Calendar, Hash, Flame, MapPin,
  Droplets, Sparkles, BarChart3,
} from "lucide-react";

interface HistoricalEntry {
  id: string;
  distilleryRaw: string | null;
  whiskyNameRaw: string | null;
  ageRaw: string | null;
  alcoholRaw: string | null;
  priceRaw: string | null;
  countryRaw: string | null;
  regionRaw: string | null;
  typeRaw: string | null;
  smokyRaw: string | null;
  caskRaw: string | null;
  noseScore: number | null;
  noseRank: number | null;
  tasteScore: number | null;
  tasteRank: number | null;
  finishScore: number | null;
  finishRank: number | null;
  totalScore: number | null;
  totalRank: number | null;
  normalizedAbv: number | null;
  normalizedAge: number | null;
  normalizedPrice: number | null;
  normalizedIsSmoky: boolean | null;
  normalizedRegion: string | null;
}

interface TastingDetail {
  id: string;
  tastingNumber: number;
  titleDe: string | null;
  titleEn: string | null;
  tastingDate: string | null;
  whiskyCount: number;
  entries: HistoricalEntry[];
}

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatDate(dateStr: string | null, lang: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function ScoreBar({ label, value, max = 10 }: { label: string; value: number | null; max?: number }) {
  if (value == null) return null;
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 75 ? "var(--cs-success)" : pct >= 50 ? v.accent : pct >= 25 ? "#f59e0b" : "var(--cs-danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: v.muted, width: 40, textAlign: "right", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: v.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: v.text, fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{value.toFixed(1)}</span>
    </div>
  );
}

function MedalBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; text: string; label: string }> = {
    1: { bg: "var(--cs-gold)", text: "#1a1714", label: "🥇" },
    2: { bg: "var(--cs-silver)", text: "#1a1714", label: "🥈" },
    3: { bg: "var(--cs-bronze)", text: "#fff", label: "🥉" },
  };
  const medal = colors[rank];
  if (!medal) return null;
  return (
    <span style={{
      fontSize: 20,
      lineHeight: 1,
    }}>
      {medal.label}
    </span>
  );
}

function WhiskyCard({ entry, lang, t }: { entry: HistoricalEntry; lang: string; t: any }) {
  const rank = entry.totalRank;
  const isTop3 = rank != null && rank <= 3;
  const isWinner = rank === 1;

  const title = [entry.distilleryRaw, entry.whiskyNameRaw].filter(Boolean).join(" — ") || t("m2.historicalDetail.unknownWhisky", "Unknown Whisky");

  const details: string[] = [];
  if (entry.regionRaw) details.push(entry.regionRaw);
  if (entry.ageRaw) details.push(`${entry.ageRaw}y`);
  if (entry.normalizedAbv) details.push(`${entry.normalizedAbv.toFixed(1)}%`);
  if (entry.caskRaw) details.push(entry.caskRaw);

  return (
    <div
      style={{
        background: v.card,
        border: `1px solid ${isWinner ? v.gold : isTop3 ? v.border : v.border}`,
        borderRadius: 14,
        padding: "16px",
        position: "relative",
        overflow: "hidden",
      }}
      data-testid={`detail-card-${entry.id}`}
    >
      {isWinner && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${v.gold}, transparent)`,
        }} />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: isTop3 ? alpha(v.accent, "18") : alpha(v.muted, "10"),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {isTop3 && rank != null ? (
            <MedalBadge rank={rank} />
          ) : (
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: v.muted,
              fontVariantNumeric: "tabular-nums",
            }}>
              {rank ?? "—"}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: v.text,
            lineHeight: 1.3,
          }}>
            {title}
          </div>
          {details.length > 0 && (
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 6,
            }}>
              {details.map((d, i) => (
                <span key={i} style={{
                  fontSize: 11,
                  color: v.muted,
                  background: alpha(v.muted, "08"),
                  padding: "2px 8px",
                  borderRadius: 10,
                }}>
                  {d}
                </span>
              ))}
              {entry.normalizedIsSmoky && (
                <span style={{
                  fontSize: 11,
                  color: "#f59e0b",
                  background: "rgba(245, 158, 11, 0.12)",
                  padding: "2px 8px",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}>
                  <Flame size={10} /> {t("m2.historicalDetail.smoky", "Smoky")}
                </span>
              )}
            </div>
          )}
        </div>

        {entry.totalScore != null && (
          <div style={{
            textAlign: "center",
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: isWinner ? v.gold : isTop3 ? v.accent : v.text,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}>
              {entry.totalScore.toFixed(1)}
            </div>
            <div style={{ fontSize: 10, color: v.muted, marginTop: 2 }}>
              {t("m2.historicalDetail.total", "Total")}
            </div>
          </div>
        )}
      </div>

      {(entry.noseScore != null || entry.tasteScore != null || entry.finishScore != null) && (
        <div style={{ paddingLeft: 52 }}>
          <ScoreBar label={t("m2.historicalDetail.nose", "Nose")} value={entry.noseScore} />
          <ScoreBar label={t("m2.historicalDetail.taste", "Taste")} value={entry.tasteScore} />
          <ScoreBar label={t("m2.historicalDetail.finish", "Finish")} value={entry.finishScore} />
        </div>
      )}
    </div>
  );
}

function ScoreDistribution({ entries, t }: { entries: HistoricalEntry[]; t: any }) {
  const scores = entries.map(e => e.totalScore).filter((s): s is number => s != null);
  if (scores.length === 0) return null;

  const min = Math.floor(Math.min(...scores));
  const max = Math.ceil(Math.max(...scores));
  const range = max - min || 1;
  const bucketSize = range <= 5 ? 0.5 : 1;
  const buckets: { label: string; count: number }[] = [];

  for (let start = min; start < max + bucketSize; start += bucketSize) {
    const end = start + bucketSize;
    const count = scores.filter(s => s >= start && s < end).length;
    buckets.push({ label: start.toFixed(1), count });
  }

  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div style={{
      background: v.card,
      border: `1px solid ${v.border}`,
      borderRadius: 14,
      padding: "16px",
      marginBottom: 16,
    }} data-testid="score-distribution">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <BarChart3 size={14} color={v.accent} />
        <span style={{ fontSize: 13, fontWeight: 600, color: v.text }}>
          {t("m2.historicalDetail.scoreDistribution", "Score Distribution")}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 50 }}>
        {buckets.map((bucket, i) => {
          const pct = (bucket.count / maxCount) * 100;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: "100%",
                height: `${Math.max(pct, 4)}%`,
                background: bucket.count > 0 ? v.accent : v.border,
                borderRadius: 2,
                minHeight: 2,
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: v.muted }}>{min.toFixed(1)}</span>
        <span style={{ fontSize: 10, color: v.muted }}>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}

export default function M2HistoricalTastingDetail() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const params = useParams<{ id: string }>();
  const tastingId = params.id;

  const { data, isLoading, isError } = useQuery<TastingDetail>({
    queryKey: ["historical-tasting", tastingId],
    queryFn: () => fetchJSON(`/api/historical/tastings/${tastingId}`),
    enabled: !!tastingId,
  });

  const title = data
    ? (lang === "de" ? data.titleDe : data.titleEn) || data.titleDe || `Tasting #${data.tastingNumber}`
    : "";

  const entries = data?.entries ?? [];
  const sorted = [...entries].sort((a, b) => (a.totalRank ?? 999) - (b.totalRank ?? 999));

  const avgScore = entries.length > 0
    ? entries.reduce((sum, e) => sum + (e.totalScore ?? 0), 0) / entries.filter(e => e.totalScore != null).length
    : null;

  const winner = sorted.length > 0 && sorted[0].totalRank === 1 ? sorted[0] : null;
  const winnerName = winner
    ? [winner.distilleryRaw, winner.whiskyNameRaw].filter(Boolean).join(" — ")
    : null;

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }}>
      <M2BackButton />

      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px 16px" }}>
          <div style={{
            width: 28,
            height: 28,
            border: `2px solid ${alpha(v.accent, "30")}`,
            borderTop: `2px solid ${v.accent}`,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }} />
          <p style={{ color: v.muted, fontSize: 14 }}>
            {t("m2.historicalDetail.loading", "Loading tasting...")}
          </p>
        </div>
      )}

      {isError && (
        <div style={{
          textAlign: "center",
          padding: "60px 16px",
          color: "var(--cs-danger)",
        }} data-testid="detail-error">
          <p style={{ fontSize: 14 }}>
            {t("m2.historicalDetail.loadError", "Could not load this tasting.")}
          </p>
        </div>
      )}

      {data && !isLoading && !isError && (
        <>
          <div style={{ marginTop: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              {data.tastingNumber <= 999 && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: v.accent,
                  background: alpha(v.accent, "12"),
                  padding: "3px 10px",
                  borderRadius: 20,
                }}>
                  #{data.tastingNumber}
                </span>
              )}
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 24,
              fontWeight: 700,
              color: v.text,
              margin: "8px 0 8px",
              lineHeight: 1.2,
            }} data-testid="detail-title">
              {title}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: v.muted }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={13} /> {formatDate(data.tastingDate, lang)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Wine size={13} /> {data.whiskyCount} {t("m2.historicalDetail.whiskies", "Whiskies")}
              </span>
              {avgScore != null && !isNaN(avgScore) && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <BarChart3 size={13} /> {t("m2.historicalDetail.avgScore", "Avg")} {avgScore.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {winnerName && (
            <div style={{
              background: v.card,
              border: `1px solid ${v.gold}`,
              borderRadius: 14,
              padding: "16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }} data-testid="detail-winner-banner">
              <Trophy size={22} color={v.gold} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: v.muted, marginBottom: 2 }}>
                  {t("m2.historicalDetail.winner", "Winner")}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: v.text }}>
                  {winnerName}
                </div>
              </div>
              {winner?.totalScore != null && (
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: v.gold,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {winner.totalScore.toFixed(1)}
                </div>
              )}
            </div>
          )}

          <ScoreDistribution entries={entries} t={t} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sparkles size={14} color={v.accent} />
            <span style={{ fontSize: 13, fontWeight: 600, color: v.text }}>
              {t("m2.historicalDetail.lineup", "Lineup")}
            </span>
            <span style={{ fontSize: 12, color: v.muted }}>
              ({sorted.length})
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((entry) => (
              <WhiskyCard key={entry.id} entry={entry} lang={lang} t={t} />
            ))}
          </div>

          {sorted.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "40px 16px",
              color: v.muted,
              fontSize: 14,
            }}>
              {t("m2.historicalDetail.noEntries", "No whisky entries found for this tasting.")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
