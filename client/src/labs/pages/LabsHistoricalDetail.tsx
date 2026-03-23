import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { getParticipantId } from "@/lib/api";
import {
  Trophy, Wine, Calendar, Flame,
  Sparkles, BarChart3, RefreshCw, Lock, ChevronLeft,
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
  normalizedNose: number | null;
  normalizedTaste: number | null;
  normalizedFinish: number | null;
  normalizedTotal: number | null;
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

class ForbiddenError extends Error {
  constructor() { super("Forbidden"); this.name = "ForbiddenError"; }
}

async function fetchJSON(url: string, pid?: string) {
  const headers: Record<string, string> = {};
  if (pid) headers["x-participant-id"] = pid;
  const res = await fetch(url, { headers });
  if (res.status === 403) throw new ForbiddenError();
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

function ScoreBar({ label, value, max = 100 }: { label: string; value: number | null; max?: number }) {
  if (value == null) return null;
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 75 ? "var(--labs-success)" : pct >= 50 ? "var(--labs-accent)" : pct >= 25 ? "var(--labs-info)" : "var(--labs-danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: "var(--labs-text-muted)", width: 48, textAlign: "right", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "var(--labs-border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{Math.round(value)}</span>
    </div>
  );
}

function MedalBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const medal = medals[rank];
  if (!medal) return null;
  return <span style={{ fontSize: 20, lineHeight: 1 }}>{medal}</span>;
}

function WhiskyCard({ entry, t, isTied }: { entry: HistoricalEntry; t: (k: string, d: string) => string; isTied: boolean }) {
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
      className="labs-card labs-fade-in"
      style={{
        padding: 16,
        borderColor: isWinner ? "var(--labs-accent)" : undefined,
        position: "relative",
        overflow: "hidden",
      }}
      data-testid={`detail-card-${entry.id}`}
    >
      {isWinner && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--labs-accent), transparent)" }} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: isTop3 ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {isTop3 && rank != null ? <MedalBadge rank={rank} /> : (
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums" }}>{rank ?? "—"}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3, wordBreak: "break-word" }}>{title}</div>
          {isTied && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "var(--labs-accent)",
              background: "var(--labs-accent-muted)", padding: "1px 6px", borderRadius: 6,
              textTransform: "uppercase", letterSpacing: 0.5, display: "inline-block", marginTop: 3,
            }}>
              {t("m2.historicalDetail.tiedRank", "Tied")}
            </span>
          )}
          {details.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {details.map((d, i) => (
                <span key={i} style={{
                  fontSize: 11, color: "var(--labs-text-muted)",
                  background: "var(--labs-surface-elevated)", padding: "2px 8px", borderRadius: 10,
                  maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{d}</span>
              ))}
              {entry.normalizedIsSmoky && (
                <span style={{
                  fontSize: 11, color: "var(--labs-accent)",
                  background: "var(--labs-accent-muted)", padding: "2px 8px", borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  <Flame size={10} /> {t("m2.historicalDetail.smoky", "Smoky")}
                </span>
              )}
            </div>
          )}
        </div>
        {entry.totalScore != null && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{
              fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1,
              color: isWinner ? "var(--labs-accent)" : isTop3 ? "var(--labs-accent)" : "var(--labs-text)",
            }}>
              {Math.round(entry.normalizedTotal ?? entry.totalScore * 10)}
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>/100</div>
          </div>
        )}
      </div>
      {(entry.noseScore != null || entry.tasteScore != null || entry.finishScore != null) && (
        <div style={{ paddingLeft: 52 }}>
          <ScoreBar label={t("m2.historicalDetail.nose", "Nose")} value={entry.normalizedNose ?? (entry.noseScore != null ? entry.noseScore * 10 : null)} />
          <ScoreBar label={t("m2.historicalDetail.taste", "Taste")} value={entry.normalizedTaste ?? (entry.tasteScore != null ? entry.tasteScore * 10 : null)} />
          <ScoreBar label={t("m2.historicalDetail.finish", "Finish")} value={entry.normalizedFinish ?? (entry.finishScore != null ? entry.finishScore * 10 : null)} />
        </div>
      )}
    </div>
  );
}

function ScoreDistribution({ entries, t }: { entries: HistoricalEntry[]; t: (k: string, d: string) => string }) {
  const scores = entries
    .map(e => e.normalizedTotal ?? (e.totalScore != null ? e.totalScore * 10 : null))
    .filter((s): s is number => s != null);
  if (scores.length === 0) return null;

  const min = Math.floor(Math.min(...scores));
  const max = Math.ceil(Math.max(...scores));
  const range = max - min || 1;
  const bucketSize = range <= 20 ? 5 : 10;
  const buckets: { label: string; count: number }[] = [];
  for (let start = min; start < max + bucketSize; start += bucketSize) {
    const end = start + bucketSize;
    const count = scores.filter(s => s >= start && s < end).length;
    buckets.push({ label: String(Math.round(start)), count });
  }
  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="labs-card" style={{ padding: 16, marginBottom: 16 }} data-testid="score-distribution">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <BarChart3 size={14} style={{ color: "var(--labs-accent)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>
          {t("m2.historicalDetail.scoreDistribution", "Score Distribution")}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 50 }}>
        {buckets.map((bucket, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: "100%",
              height: `${Math.max((bucket.count / maxCount) * 100, 4)}%`,
              background: bucket.count > 0 ? "var(--labs-accent)" : "var(--labs-border)",
              borderRadius: 2, minHeight: 2,
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{Math.round(min)}</span>
        <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{Math.round(max)}</span>
      </div>
    </div>
  );
}

export default function LabsHistoricalDetail() {
  const { t, i18n } = useTranslation();
  const goBackToHistory = useBackNavigation("/labs/history");
  const lang = i18n.language;
  const params = useParams<{ id: string }>();
  const tastingId = params.id;
  const pid = getParticipantId();

  const { data, isLoading, isError, error, refetch } = useQuery<TastingDetail>({
    queryKey: ["historical-tasting", tastingId],
    queryFn: () => fetchJSON(`/api/historical/tastings/${tastingId}`, pid),
    enabled: !!tastingId,
    retry: (failureCount, err) => {
      if (err instanceof ForbiddenError) return false;
      return failureCount < 3;
    },
  });

  const isForbidden = error instanceof ForbiddenError;
  const title = data
    ? (lang === "de" ? data.titleDe : data.titleEn) || data.titleDe || `Tasting #${data.tastingNumber}`
    : "";
  const entries = data?.entries ?? [];
  const sorted = [...entries].sort((a, b) => (a.totalRank ?? 999) - (b.totalRank ?? 999));
  const scoredEntries = entries.filter(e => e.totalScore != null || e.normalizedTotal != null);
  const avgScore = scoredEntries.length > 0
    ? scoredEntries.reduce((sum, e) => sum + (e.normalizedTotal ?? (e.totalScore ?? 0) * 10), 0) / scoredEntries.length
    : null;
  const winner = sorted.length > 0 && sorted[0].totalRank === 1 ? sorted[0] : null;
  const winnerName = winner ? [winner.distilleryRaw, winner.whiskyNameRaw].filter(Boolean).join(" — ") : null;

  const tiedRanks = new Set<number>();
  const rankCounts: Record<number, number> = {};
  entries.forEach(e => {
    if (e.totalRank != null) rankCounts[e.totalRank] = (rankCounts[e.totalRank] || 0) + 1;
  });
  Object.entries(rankCounts).forEach(([rank, count]) => {
    if (count > 1) tiedRanks.add(Number(rank));
  });

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }} data-testid="labs-historical-detail">
      <button
        onClick={goBackToHistory}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="button-back"
      >
        <ChevronLeft className="w-4 h-4" />
        History
      </button>

      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px 16px" }} data-testid="detail-loading">
          <div style={{
            width: 28, height: 28,
            border: "2px solid var(--labs-border)",
            borderTop: "2px solid var(--labs-accent)",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "var(--labs-text-muted)", fontSize: 14 }}>
            {t("m2.historicalDetail.loading", "Loading tasting...")}
          </p>
        </div>
      )}

      {isError && isForbidden && (
        <div className="labs-card" style={{ textAlign: "center", padding: "48px 20px", marginTop: 16 }} data-testid="detail-forbidden">
          <Lock style={{ width: 40, height: 40, color: "var(--labs-text-muted)", margin: "0 auto 16px", display: "block" }} strokeWidth={1.2} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", marginBottom: 6 }}>
            {t("m2.community.membersOnly", "Community Members Only")}
          </div>
          <div style={{ fontSize: 13, color: "var(--labs-text-muted)", lineHeight: 1.5, maxWidth: 360, margin: "0 auto" }}>
            {t("m2.community.joinToView", "This tasting belongs to a community archive. Join the community to view full details.")}
          </div>
        </div>
      )}

      {isError && !isForbidden && (
        <div className="labs-card" style={{ textAlign: "center", padding: "60px 16px", marginTop: 16 }} data-testid="detail-error">
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 14, color: "var(--labs-danger)", fontWeight: 600, marginBottom: 4 }}>
            {t("m2.historicalDetail.loadError", "Could not load this tasting.")}
          </p>
          <button
            onClick={() => refetch()}
            className="labs-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12 }}
            data-testid="detail-retry"
          >
            <RefreshCw size={13} />
            {t("common.retry", "Retry")}
          </button>
        </div>
      )}

      {data && !isLoading && !isError && (
        <>
          <div style={{ marginTop: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              {data.tastingNumber <= 999 && (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: "var(--labs-accent)",
                  background: "var(--labs-accent-muted)", padding: "3px 10px", borderRadius: 20,
                }}>
                  #{data.tastingNumber}
                </span>
              )}
            </div>
            <h1 className="labs-serif" style={{
              fontSize: 24, fontWeight: 700, color: "var(--labs-text)",
              margin: "8px 0", lineHeight: 1.2, wordBreak: "break-word",
            }} data-testid="detail-title">
              {title}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--labs-text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={13} /> {formatDate(data.tastingDate, lang)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Wine size={13} /> {data.whiskyCount} {t("m2.historicalDetail.whiskies", "Whiskies")}
              </span>
              {avgScore != null && !isNaN(avgScore) && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <BarChart3 size={13} /> {t("m2.historicalDetail.avgScore", "Avg")} {Math.round(avgScore)}/100
                </span>
              )}
            </div>
          </div>

          {winnerName && (
            <div className="labs-card" style={{
              padding: 16, marginBottom: 16,
              borderColor: "var(--labs-accent)",
              display: "flex", alignItems: "center", gap: 12,
            }} data-testid="detail-winner-banner">
              <Trophy size={22} style={{ color: "var(--labs-accent)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--labs-text-muted)", marginBottom: 2 }}>
                  {t("m2.historicalDetail.winner", "Winner")}
                  {tiedRanks.has(1) && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: "var(--labs-accent)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                      ({t("m2.historicalDetail.tiedRank", "Tied")})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", wordBreak: "break-word" }}>
                  {winnerName}
                </div>
              </div>
              {(winner?.normalizedTotal ?? winner?.totalScore) != null && (
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {Math.round(winner!.normalizedTotal ?? (winner!.totalScore ?? 0) * 10)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>/100</div>
                </div>
              )}
            </div>
          )}

          <ScoreDistribution entries={entries} t={t} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sparkles size={14} style={{ color: "var(--labs-accent)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>
              {t("m2.historicalDetail.lineup", "Lineup")}
            </span>
            <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>({sorted.length})</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((entry) => (
              <WhiskyCard key={entry.id} entry={entry} t={t} isTied={entry.totalRank != null && tiedRanks.has(entry.totalRank)} />
            ))}
          </div>

          {sorted.length === 0 && (
            <div className="labs-empty labs-fade-in" data-testid="detail-empty">
              <Wine style={{ width: 36, height: 36, color: "var(--labs-text-muted)", margin: "0 auto 12px", display: "block" }} strokeWidth={1.2} />
              <div style={{ color: "var(--labs-text)", fontSize: 14, fontWeight: 600 }}>
                {t("m2.historicalDetail.noEntries", "No whisky entries found for this tasting.")}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
