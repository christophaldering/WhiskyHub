import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Wine, Trophy, Users, Star, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";

interface LabsResultsProps {
  params: { id: string };
}

export default function LabsResults({ params }: LabsResultsProps) {
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [expandedWhisky, setExpandedWhisky] = useState<string | null>(null);

  const { data: tasting, isLoading: loadingTasting, isError: tastingError } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
  });

  const { data: whiskies, isLoading: loadingWhiskies } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: allRatings } = useQuery({
    queryKey: ["tastingRatings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: participants } = useQuery({
    queryKey: ["tastingParticipants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
  });

  const isLoading = loadingTasting || loadingWhiskies;

  if (tastingError) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting doesn't exist or you don't have access.</p>
        <button
          className="labs-btn-secondary"
          onClick={() => navigate("/labs/tastings")}
          data-testid="results-error-back"
        >
          Back to Tastings
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--labs-border)", borderTopColor: "var(--labs-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Loading results…</p>
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Tasting not found</p>
        <button
          className="labs-btn-ghost mt-4"
          onClick={() => navigate("/labs/tastings")}
          data-testid="results-back-tastings"
        >
          Back to Tastings
        </button>
      </div>
    );
  }

  const whiskyResults = (whiskies || []).map((w: any) => {
    const ratings = (allRatings || []).filter((r: any) => r.whiskyId === w.id);
    const count = ratings.length;
    const avg = (dim: string) => {
      const vals = ratings.map((r: any) => r[dim]).filter((v: any) => v != null && v > 0);
      if (vals.length === 0) return null;
      return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
    };
    const avgOverall = avg("overall");
    const avgNose = avg("nose");
    const avgTaste = avg("taste");
    const avgFinish = avg("finish");
    const avgBalance = avg("balance");

    const myRating = currentParticipant
      ? ratings.find((r: any) => r.participantId === currentParticipant.id)
      : null;

    return {
      ...w,
      ratings,
      ratingCount: count,
      avgOverall,
      avgNose,
      avgTaste,
      avgFinish,
      avgBalance,
      myRating,
    };
  });

  const sorted = [...whiskyResults].sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0));
  const topWhisky = sorted[0];
  const participantCount = participants?.length || 0;
  const totalRatings = allRatings?.length || 0;

  const toggleExpand = (id: string) => {
    setExpandedWhisky(expandedWhisky === id ? null : id);
  };

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in">
      <button
        onClick={() => navigate(`/labs/tastings/${tastingId}`)}
        className="flex items-center gap-1.5 mb-5 text-sm transition-colors"
        style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
        data-testid="results-back-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tasting
      </button>

      <div className="mb-6 labs-stagger-1 labs-fade-in">
        <h1
          className="labs-serif text-xl font-semibold mb-1"
          style={{ color: "var(--labs-text)" }}
          data-testid="results-title"
        >
          {tasting.title}
        </h1>
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
          {tasting.date} · {tasting.location}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 labs-stagger-2 labs-fade-in">
        <div
          className="labs-card p-4 text-center"
          data-testid="results-stat-whiskies"
        >
          <Wine className="w-5 h-5 mx-auto mb-1.5" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>
            {whiskies?.length || 0}
          </p>
          <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Whiskies</p>
        </div>
        <div
          className="labs-card p-4 text-center"
          data-testid="results-stat-participants"
        >
          <Users className="w-5 h-5 mx-auto mb-1.5" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>
            {participantCount}
          </p>
          <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Tasters</p>
        </div>
        <div
          className="labs-card p-4 text-center"
          data-testid="results-stat-ratings"
        >
          <BarChart3 className="w-5 h-5 mx-auto mb-1.5" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>
            {totalRatings}
          </p>
          <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Ratings</p>
        </div>
      </div>

      {topWhisky && topWhisky.avgOverall != null && (
        <div
          className="labs-card-elevated p-5 mb-6 labs-stagger-3 labs-fade-in"
          data-testid="results-top-whisky"
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            <span className="labs-section-label" style={{ marginBottom: 0 }}>
              Top Rated
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="labs-serif text-base font-semibold" style={{ color: "var(--labs-text)" }}>
                {topWhisky.name || "Unknown"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                {[topWhisky.distillery, topWhisky.age ? `${topWhisky.age}y` : null, topWhisky.abv ? `${topWhisky.abv}%` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: "var(--labs-accent)" }}>
                {topWhisky.avgOverall}
              </p>
              <p className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>avg. score</p>
            </div>
          </div>
        </div>
      )}

      <div className="labs-section-label labs-stagger-3 labs-fade-in">Rankings</div>

      <div className="space-y-2 mb-8 labs-stagger-4 labs-fade-in">
        {sorted.map((w, idx) => {
          const isExpanded = expandedWhisky === w.id;
          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

          return (
            <div key={w.id} className="labs-card overflow-hidden" data-testid={`results-whisky-${w.id}`}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => toggleExpand(w.id)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    background: idx < 3 ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                    color: idx < 3 ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  }}
                >
                  {medal || idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                    {w.name || "Unknown"}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                    {[w.distillery, w.region].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {w.avgOverall != null ? (
                    <span className="text-base font-bold" style={{ color: "var(--labs-accent)" }}>
                      {w.avgOverall}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>—</span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div
                  className="px-4 pb-4 pt-1"
                  style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
                >
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { label: "Nose", value: w.avgNose },
                      { label: "Taste", value: w.avgTaste },
                      { label: "Finish", value: w.avgFinish },
                      { label: "Balance", value: w.avgBalance },
                    ].map((dim) => (
                      <div key={dim.label} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                          {dim.label}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "var(--labs-text-secondary)" }}>
                          {dim.value != null ? dim.value : "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>
                    <span>{w.ratingCount} rating{w.ratingCount !== 1 ? "s" : ""}</span>
                    {w.abv && <span>{w.abv}% ABV</span>}
                    {w.age && <span>{w.age} years</span>}
                  </div>

                  {w.caskType && (
                    <span className="labs-badge labs-badge-accent text-[11px]">{w.caskType}</span>
                  )}

                  {w.myRating && (
                    <div
                      className="mt-3 p-3 rounded-lg"
                      style={{ background: "var(--labs-accent-glow)", border: "1px solid var(--labs-border-subtle)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Star className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--labs-accent)" }}>
                          Your Rating
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {[
                          { label: "N", value: w.myRating.nose },
                          { label: "T", value: w.myRating.taste },
                          { label: "F", value: w.myRating.finish },
                          { label: "B", value: w.myRating.balance },
                          { label: "Ø", value: w.myRating.overall },
                        ].map((d) => (
                          <div key={d.label}>
                            <p className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>{d.label}</p>
                            <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>
                              {d.value ?? "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                      {w.myRating.notes && (
                        <p className="text-xs mt-2 italic" style={{ color: "var(--labs-text-secondary)" }}>
                          "{w.myRating.notes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="labs-empty">
          <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
            No whiskies or ratings yet
          </p>
        </div>
      )}

      <div className="flex justify-center gap-3 pb-8">
        <button
          className="labs-btn-secondary"
          onClick={() => navigate("/labs/tastings")}
          data-testid="results-all-tastings"
        >
          All Tastings
        </button>
        <button
          className="labs-btn-ghost"
          onClick={() => navigate(`/labs/tastings/${tastingId}`)}
          data-testid="results-tasting-detail"
        >
          Tasting Details
        </button>
      </div>
    </div>
  );
}