import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Wine,
  Star,
  MapPin,
  Droplets,
  Clock,
  BarChart3,
  Users,
  User,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { exploreApi } from "@/lib/api";

interface LabsBottleDetailProps {
  params: { id: string };
}

export default function LabsBottleDetail({ params }: LabsBottleDetailProps) {
  const whiskyId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();

  const { data: whisky, isLoading, isError } = useQuery({
    queryKey: ["labs-explore-whisky", whiskyId],
    queryFn: () => exploreApi.getWhisky(whiskyId),
    enabled: !!whiskyId,
  });

  if (isError) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }} data-testid="labs-bottle-not-found">
          Bottle not found
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
          This whisky may have been removed or the link is incorrect.
        </p>
        <button
          className="labs-btn-secondary"
          onClick={() => navigate("/labs/explore")}
          data-testid="labs-bottle-back-btn"
        >
          Back to Explore
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
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Loading bottle…</p>
      </div>
    );
  }

  if (!whisky) return null;

  const agg = whisky.aggregated || {};
  const avgOverall = agg.avgOverall != null ? Number(agg.avgOverall).toFixed(1) : null;
  const avgNose = agg.avgNose != null ? Number(agg.avgNose).toFixed(1) : null;
  const avgTaste = agg.avgTaste != null ? Number(agg.avgTaste).toFixed(1) : null;
  const avgFinish = agg.avgFinish != null ? Number(agg.avgFinish).toFixed(1) : null;
  const avgBalance = agg.avgBalance != null ? Number(agg.avgBalance).toFixed(1) : null;
  const ratingCount = agg.ratingCount || 0;
  const tastingCount = (whisky.relatedTastings || []).length || 0;

  const ratings: any[] = whisky.ratings || [];
  const myRatings = currentParticipant
    ? ratings.filter((r: any) => r.participantId === currentParticipant.id)
    : [];
  const tastings: any[] = whisky.relatedTastings || [];

  const distribution = computeDistribution(ratings);
  const maxBucket = Math.max(...Object.values(distribution), 1);

  const infoItems = [
    whisky.distillery && { label: "Distillery", value: whisky.distillery },
    whisky.region && { label: "Region", value: whisky.region },
    whisky.country && { label: "Country", value: whisky.country },
    whisky.category && { label: "Category", value: whisky.category },
    whisky.age && { label: "Age", value: `${whisky.age} years` },
    whisky.abv && { label: "ABV", value: `${whisky.abv}%` },
    whisky.caskType && { label: "Cask Type", value: whisky.caskType },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <button
        className="labs-btn-ghost flex items-center gap-1.5 -ml-3 mb-4 labs-fade-in"
        onClick={() => navigate("/labs/explore")}
        data-testid="labs-bottle-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Explore
      </button>

      <div className="labs-fade-in labs-stagger-1">
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--labs-accent-muted)" }}
          >
            <Wine className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="labs-serif text-xl font-semibold leading-tight"
              style={{ color: "var(--labs-text)" }}
              data-testid="labs-bottle-name"
            >
              {whisky.name}
            </h1>
            {whisky.distillery && (
              <p className="text-sm mt-1" style={{ color: "var(--labs-text-secondary)" }} data-testid="labs-bottle-distillery">
                {whisky.distillery}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {whisky.region && (
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                  <MapPin className="w-3 h-3" />
                  {whisky.region}
                </span>
              )}
              {whisky.abv && (
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                  <Droplets className="w-3 h-3" />
                  {whisky.abv}%
                </span>
              )}
              {whisky.age && (
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                  <Clock className="w-3 h-3" />
                  {whisky.age}y
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {infoItems.length > 0 && (
        <div className="labs-card p-4 mb-6 labs-fade-in labs-stagger-2" data-testid="labs-bottle-info">
          <p className="labs-section-label">Bottle Info</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {infoItems.map((item) => (
              <div key={item.label}>
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{item.label}</p>
                <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratingCount > 0 && (
        <div className="mb-6 labs-fade-in labs-stagger-2">
          <p className="labs-section-label">Community Ratings</p>
          <div className="labs-card p-4" data-testid="labs-bottle-community-ratings">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "var(--labs-accent)" }}>{avgOverall}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    {ratingCount} rating{ratingCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
                {avgNose && <DimensionBar label="Nose" value={avgNose} />}
                {avgTaste && <DimensionBar label="Taste" value={avgTaste} />}
                {avgFinish && <DimensionBar label="Finish" value={avgFinish} />}
                {avgBalance && <DimensionBar label="Balance" value={avgBalance} />}
              </div>
            </div>
            {tastingCount > 0 && (
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                Featured in {tastingCount} tasting{tastingCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {ratingCount > 0 && (
        <div className="mb-6 labs-fade-in labs-stagger-3">
          <p className="labs-section-label">Rating Distribution</p>
          <div className="labs-card p-4" data-testid="labs-bottle-distribution">
            <div className="space-y-2">
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((bucket) => {
                const bucketLabel = bucket === 1 ? "1–10" : `${(bucket - 1) * 10 + 1}–${bucket * 10}`;
                const score = bucket;
                const count = distribution[score] || 0;
                const pct = (count / maxBucket) * 100;
                return (
                  <div key={score} className="flex items-center gap-3">
                    <span className="text-xs w-14 text-right font-medium" style={{ color: "var(--labs-text-secondary)" }}>
                      {bucketLabel}
                    </span>
                    <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "var(--labs-border)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: "var(--labs-accent)",
                          minWidth: count > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-xs w-6 font-medium" style={{ color: "var(--labs-text-muted)" }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {myRatings.length > 0 && (
        <div className="mb-6 labs-fade-in labs-stagger-3">
          <p className="labs-section-label">Your Ratings</p>
          <div className="space-y-2" data-testid="labs-bottle-my-ratings">
            {myRatings.map((r: any, i: number) => (
              <div key={i} className="labs-card p-4" data-testid={`labs-bottle-my-rating-${i}`}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--labs-accent-muted)" }}
                  >
                    <User className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                      <span className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
                        {r.overall != null ? Number(r.overall).toFixed(1) : "–"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {r.nose != null && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>N: {r.nose}</span>
                      )}
                      {r.taste != null && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>T: {r.taste}</span>
                      )}
                      {r.finish != null && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>F: {r.finish}</span>
                      )}
                      {r.balance != null && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>B: {r.balance}</span>
                      )}
                    </div>
                  </div>
                  {r.tastingTitle && (
                    <span className="text-xs truncate max-w-[120px]" style={{ color: "var(--labs-text-muted)" }}>
                      {r.tastingTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tastings.length > 0 && (
        <div className="mb-6 labs-fade-in labs-stagger-4">
          <p className="labs-section-label">Tasting History</p>
          <div className="space-y-2" data-testid="labs-bottle-tastings">
            {tastings.map((t: any) => (
              <div
                key={t.id}
                className="labs-card labs-card-interactive flex items-center gap-3 p-4"
                onClick={() => navigate(`/labs/tastings/${t.id}`)}
                data-testid={`labs-bottle-tasting-${t.id}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--labs-info-muted)" }}
                >
                  <BarChart3 className="w-4 h-4" style={{ color: "var(--labs-info)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                    {t.title || "Untitled Tasting"}
                  </p>
                  {t.date && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                      {t.date}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratingCount === 0 && (
        <div className="labs-empty labs-fade-in labs-stagger-2" data-testid="labs-bottle-no-ratings">
          <Star className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
            No community ratings yet
          </p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
            Ratings will appear here once this bottle is tasted in a session
          </p>
        </div>
      )}
    </div>
  );
}

function DimensionBar({ label, value }: { label: string; value: string }) {
  const numVal = parseFloat(value);
  const pct = Math.min((numVal / 100) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color: "var(--labs-text-secondary)" }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--labs-border)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--labs-accent)", transition: "width 600ms ease" }}
        />
      </div>
    </div>
  );
}

function computeDistribution(ratings: any[]): Record<number, number> {
  const dist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) dist[i] = 0;
  for (const r of ratings) {
    if (r.overall != null) {
      const val = Number(r.overall);
      if (isNaN(val) || val <= 0) continue;
      const bucket = Math.min(Math.max(Math.ceil(val / 10), 1), 10);
      dist[bucket]++;
    }
  }
  return dist;
}
