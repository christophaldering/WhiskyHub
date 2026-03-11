import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Wine, Star, Calendar, ChevronRight, TrendingUp, BookOpen,
  MapPin, Droplets, BarChart3, Target, Compass, Award
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, journalApi, flavorProfileApi, ratingApi } from "@/lib/api";

export default function LabsTaste() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();

  const { data: tastings } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const { data: journal } = useQuery({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: flavorProfile } = useQuery({
    queryKey: ["flavorProfile", currentParticipant?.id],
    queryFn: () => flavorProfileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const tastingIds = tastings?.map((t: any) => t.id) || [];

  const { data: allRatingsMap } = useQuery({
    queryKey: ["allTastingRatings", currentParticipant?.id, tastingIds],
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      for (const tid of tastingIds) {
        try {
          const ratings = await ratingApi.getForTasting(tid);
          results[tid] = ratings || [];
        } catch { results[tid] = []; }
      }
      return results;
    },
    enabled: !!currentParticipant && tastingIds.length > 0,
  });

  if (!currentParticipant) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-accent)" }} />
        <p className="text-lg font-medium mb-2" style={{ color: "var(--labs-text)" }}>
          Your Taste Profile
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
          Sign in to see your personal tasting snapshot
        </p>
        <button
          className="labs-btn-secondary"
          onClick={() => navigate("/labs")}
          data-testid="labs-taste-goto-home"
        >
          Go to Labs Home
        </button>
      </div>
    );
  }

  const myRatings: any[] = [];
  if (allRatingsMap) {
    for (const [tid, ratings] of Object.entries(allRatingsMap)) {
      for (const r of ratings as any[]) {
        if (r.participantId === currentParticipant.id) {
          myRatings.push({ ...r, _tastingId: tid });
        }
      }
    }
  }

  const totalTastings = tastings?.length || 0;
  const totalRatings = myRatings.length;
  const avgOverall = totalRatings > 0
    ? Math.round((myRatings.reduce((sum, r) => sum + (r.overall || 0), 0) / totalRatings) * 10) / 10
    : 0;
  const recentActivityCount = (journal?.length || 0) + totalRatings;

  const avgScores = flavorProfile?.avgScores || { nose: 0, taste: 0, finish: 0, balance: 0, overall: 0 };
  const regionBreakdown = flavorProfile?.regionBreakdown
    ? Object.entries(flavorProfile.regionBreakdown as Record<string, { count: number; avgScore: number }>)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)
    : [];
  const caskBreakdown = flavorProfile?.caskBreakdown
    ? Object.entries(flavorProfile.caskBreakdown as Record<string, { count: number; avgScore: number }>)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
    : [];
  const categoryBreakdown = flavorProfile?.categoryBreakdown
    ? Object.entries(flavorProfile.categoryBreakdown as Record<string, { count: number; avgScore: number }>)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
    : [];

  const ratedWhiskies = flavorProfile?.ratedWhiskies || [];
  const recentRated = [...ratedWhiskies]
    .sort((a: any, b: any) => new Date(b.rating?.createdAt || 0).getTime() - new Date(a.rating?.createdAt || 0).getTime())
    .slice(0, 10);

  const recentTastings = tastings
    ?.filter((t: any) => t.status === "archived" || t.status === "reveal")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    ?.slice(0, 5) || [];

  const dimensionMax = Math.max(avgScores.nose, avgScores.taste, avgScores.finish, avgScores.balance, 1);
  const dimensions = [
    { label: "Nose", value: avgScores.nose },
    { label: "Taste", value: avgScores.taste },
    { label: "Finish", value: avgScores.finish },
    { label: "Balance", value: avgScores.balance },
  ];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <h1
        className="labs-serif text-xl font-semibold mb-1 labs-fade-in"
        style={{ color: "var(--labs-text)" }}
        data-testid="labs-taste-title"
      >
        My Taste
      </h1>
      <p
        className="text-sm mb-6 labs-fade-in labs-stagger-1"
        style={{ color: "var(--labs-text-muted)" }}
      >
        Your personal tasting snapshot & preference signals
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 labs-fade-in labs-stagger-2">
        <div className="labs-card p-4 text-center" data-testid="labs-taste-stat-tastings">
          <p className="text-2xl font-bold" style={{ color: "var(--labs-accent)" }}>{totalTastings}</p>
          <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>Tastings</p>
        </div>
        <div className="labs-card p-4 text-center" data-testid="labs-taste-stat-ratings">
          <p className="text-2xl font-bold" style={{ color: "var(--labs-accent)" }}>{totalRatings}</p>
          <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>Ratings</p>
        </div>
        <div className="labs-card p-4 text-center" data-testid="labs-taste-stat-avg">
          <p className="text-2xl font-bold" style={{ color: "var(--labs-accent)" }}>{avgOverall || "–"}</p>
          <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>Avg Score</p>
        </div>
        <div className="labs-card p-4 text-center" data-testid="labs-taste-stat-activity">
          <p className="text-2xl font-bold" style={{ color: "var(--labs-accent)" }}>{recentActivityCount}</p>
          <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>Activities</p>
        </div>
      </div>

      {(dimensions.some(d => d.value > 0)) && (
        <div className="mb-8 labs-fade-in labs-stagger-3">
          <p className="labs-section-label flex items-center gap-2">
            <Target className="w-3.5 h-3.5" />
            Dimension Breakdown
          </p>
          <div className="labs-card p-5">
            <div className="space-y-3">
              {dimensions.map((dim) => (
                <div key={dim.label} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-14 text-right" style={{ color: "var(--labs-text-secondary)" }}>
                    {dim.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: "var(--labs-border)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${dimensionMax > 0 ? (dim.value / dimensionMax) * 100 : 0}%`,
                        background: "var(--labs-accent)",
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-10" style={{ color: "var(--labs-accent)" }}>
                    {dim.value > 0 ? dim.value.toFixed(1) : "–"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {regionBreakdown.length > 0 && (
        <div className="mb-8 labs-fade-in labs-stagger-3">
          <p className="labs-section-label flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            Top Regions
          </p>
          <div className="labs-card p-4">
            <div className="space-y-2">
              {regionBreakdown.map(([region, data]: [string, any]) => (
                <div key={region} className="flex items-center justify-between" data-testid={`labs-taste-region-${region}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{region}</span>
                    <span className="labs-badge labs-badge-accent text-[10px] py-0.5 px-2">{data.count}×</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--labs-accent)" }}>
                    {data.avgScore?.toFixed(1) || "–"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {caskBreakdown.length > 0 && (
        <div className="mb-8 labs-fade-in labs-stagger-3">
          <p className="labs-section-label flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5" />
            Preferred Cask Types
          </p>
          <div className="labs-card p-4">
            <div className="flex flex-wrap gap-2">
              {caskBreakdown.map(([cask, data]: [string, any]) => (
                <div
                  key={cask}
                  className="labs-badge labs-badge-accent flex items-center gap-1.5"
                  data-testid={`labs-taste-cask-${cask}`}
                >
                  <span>{cask}</span>
                  <span className="opacity-60">({data.count})</span>
                  <Star className="w-3 h-3" />
                  <span>{data.avgScore?.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {categoryBreakdown.length > 0 && (
        <div className="mb-8 labs-fade-in labs-stagger-3">
          <p className="labs-section-label flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Categories
          </p>
          <div className="labs-card p-4">
            <div className="space-y-2">
              {categoryBreakdown.map(([cat, data]: [string, any]) => (
                <div key={cat} className="flex items-center justify-between" data-testid={`labs-taste-category-${cat}`}>
                  <span className="text-sm" style={{ color: "var(--labs-text)" }}>{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{data.count} rated</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--labs-accent)" }}>
                      {data.avgScore?.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {recentRated.length > 0 && (
        <div className="mb-8 labs-fade-in labs-stagger-4">
          <p className="labs-section-label flex items-center gap-2">
            <Award className="w-3.5 h-3.5" />
            Recent Ratings
          </p>
          <div className="space-y-2">
            {recentRated.map((item: any, i: number) => {
              const w = item.whisky;
              const r = item.rating;
              const tasting = tastings?.find((t: any) => t.id === r?.tastingId);
              return (
                <div
                  key={`${w?.id}-${i}`}
                  className="labs-card p-4"
                  data-testid={`labs-taste-rated-${i}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                        {w?.name || "Unknown Whisky"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {w?.distillery && (
                          <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                            {w.distillery}
                          </span>
                        )}
                        {tasting && (
                          <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                            · {tasting.title}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <Star className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                      <span className="text-lg font-bold" style={{ color: "var(--labs-accent)" }}>
                        {r?.overall || "–"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentTastings.length > 0 && (
        <div className="mb-8 labs-fade-in labs-stagger-3">
          <p className="labs-section-label flex items-center gap-2">
            <Compass className="w-3.5 h-3.5" />
            Recent Tastings
          </p>
          <div className="space-y-2">
            {recentTastings.map((t: any) => {
              const isHost = t.hostId === currentParticipant.id;
              return (
                <div
                  key={t.id}
                  className="labs-card labs-card-interactive flex items-center gap-4 p-4"
                  onClick={() => navigate(`/labs/tastings/${t.id}`)}
                  data-testid={`labs-taste-tasting-${t.id}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--labs-accent-muted)" }}
                  >
                    <Wine className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                        {t.title}
                      </p>
                      <span className={`labs-badge text-[10px] py-0.5 px-2 ${isHost ? "labs-badge-accent" : "labs-badge-info"}`}>
                        {isHost ? "Host" : "Joined"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                        <Calendar className="w-3 h-3" />
                        {t.date}
                      </span>
                      {t.location && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                          {t.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentTastings.length === 0 && recentRated.length === 0 && (
        <div className="labs-empty labs-fade-in labs-stagger-2">
          <TrendingUp className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
            No activity yet
          </p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
            Join a tasting or log a whisky to build your taste profile
          </p>
        </div>
      )}
    </div>
  );
}
