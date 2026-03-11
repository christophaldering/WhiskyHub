import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  Wine, Star, Calendar, ChevronRight, TrendingUp, BookOpen,
  MapPin, Droplets, BarChart3, Target, Compass, Award,
  Activity, PieChart, Sparkles, GitCompareArrows, Lock,
  Archive, Download, Settings,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useSession } from "@/lib/session";
import { tastingApi, journalApi, flavorProfileApi, ratingApi, statsApi, participantApi } from "@/lib/api";

const ANALYTICS_THRESHOLD = 10;

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
  badge?: string | number | null;
  locked?: boolean;
}

function NavItem({ icon: Icon, label, description, href, testId, badge, locked }: NavItemProps) {
  return (
    <Link href={locked ? "#" : href} style={{ textDecoration: "none" }}>
      <div
        className="labs-card labs-card-interactive"
        style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, opacity: locked ? 0.5 : 1, cursor: locked ? "default" : "pointer" }}
        data-testid={testId}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: "var(--labs-accent-muted)",
        }}>
          {locked ? <Lock className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /> : <Icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{label}</div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>{description}</div>
        </div>
        {badge != null && (
          <span className="labs-badge labs-badge-accent" style={{ fontSize: 10, padding: "2px 8px" }}>{badge}</span>
        )}
        <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
      </div>
    </Link>
  );
}

export default function LabsTaste() {
  const { currentParticipant } = useAppStore();
  const session = useSession();
  const pid = session.pid;
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

  const { data: stats } = useQuery({
    queryKey: ["participant-stats", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
  });

  const { data: participant } = useQuery({
    queryKey: ["participant-detail", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const { data: insightData } = useQuery({
    queryKey: ["participant-insights", pid],
    queryFn: () => fetch(`/api/participants/${pid}/insights`, { headers: { "x-participant-id": pid! } }).then(r => r.ok ? r.json() : null),
    enabled: !!pid,
  });

  const tastingIds = tastings?.map((t: any) => t.id) || [];
  const { data: allRatingsMap } = useQuery({
    queryKey: ["allTastingRatings", currentParticipant?.id, tastingIds],
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      for (const tid of tastingIds) {
        try { const ratings = await ratingApi.getForTasting(tid); results[tid] = ratings || []; } catch { results[tid] = []; }
      }
      return results;
    },
    enabled: !!currentParticipant && tastingIds.length > 0,
  });

  if (!currentParticipant) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-accent)" }} />
        <p className="text-lg font-medium mb-2" style={{ color: "var(--labs-text)" }}>Your Taste Profile</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>Sign in to discover your personal tasting patterns</p>
        <button className="labs-btn-secondary" onClick={() => navigate("/labs")} data-testid="labs-taste-goto-home">Go to Labs Home</button>
      </div>
    );
  }

  const myRatings: any[] = [];
  if (allRatingsMap) {
    for (const [tid, ratings] of Object.entries(allRatingsMap)) {
      for (const r of ratings as any[]) {
        if (r.participantId === currentParticipant.id) myRatings.push({ ...r, _tastingId: tid });
      }
    }
  }

  const totalTastings = tastings?.length || 0;
  const totalRatings = myRatings.length;
  const avgOverall = totalRatings > 0 ? Math.round((myRatings.reduce((sum, r) => sum + (r.overall || 0), 0) / totalRatings) * 10) / 10 : 0;
  const journalCount = Array.isArray(journal) ? journal.length : 0;
  const whiskyCount = ((stats as any)?.totalRatings ?? 0) + ((stats as any)?.totalJournalEntries ?? 0);
  const analyticsLocked = whiskyCount < ANALYTICS_THRESHOLD;

  const stability = (participant as any)?.ratingStabilityScore ?? null;
  const exploration = (participant as any)?.explorationIndex ?? null;
  const smoke = (participant as any)?.smokeAffinityIndex ?? null;
  const insight = insightData?.insight ?? null;

  const avgScores = flavorProfile?.avgScores || { nose: 0, taste: 0, finish: 0, balance: 0, overall: 0 };
  const dimensionMax = Math.max(avgScores.nose, avgScores.taste, avgScores.finish, avgScores.balance, 1);
  const dimensions = [
    { label: "Nose", value: avgScores.nose, color: "var(--labs-dim-nose)" },
    { label: "Taste", value: avgScores.taste, color: "var(--labs-dim-taste)" },
    { label: "Finish", value: avgScores.finish, color: "var(--labs-dim-finish)" },
    { label: "Balance", value: avgScores.balance, color: "var(--labs-dim-balance)" },
  ];

  const recentTastings = tastings
    ?.filter((t: any) => t.status === "archived" || t.status === "reveal")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    ?.slice(0, 3) || [];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <h1 className="labs-serif text-xl font-semibold mb-1 labs-fade-in" style={{ color: "var(--labs-text)" }} data-testid="labs-taste-title">
        My Taste
      </h1>
      <p className="text-sm mb-6 labs-fade-in labs-stagger-1" style={{ color: "var(--labs-text-muted)" }}>
        Your personal whisky world
      </p>

      {analyticsLocked ? (
        <div className="labs-card p-6 mb-6 text-center labs-fade-in labs-stagger-1" data-testid="card-taste-welcome">
          <div style={{ fontSize: 36, marginBottom: 12 }}>🥃</div>
          <h2 className="labs-serif text-lg font-semibold mb-2" style={{ color: "var(--labs-text)" }}>Your Taste Profile</h2>
          <p className="text-sm mb-4" style={{ color: "var(--labs-text-muted)", maxWidth: 280, margin: "0 auto 16px" }}>
            Rate whiskies and log drams to unlock your personal taste profile
          </p>
          <div style={{ maxWidth: 220, margin: "0 auto 6px" }}>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>{whiskyCount} / {ANALYTICS_THRESHOLD}</span>
              <span className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>entries</span>
            </div>
            <div style={{ height: 5, background: "var(--labs-border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, (whiskyCount / ANALYTICS_THRESHOLD) * 100)}%`, background: "linear-gradient(90deg, var(--labs-accent-dark), var(--labs-accent))", borderRadius: 3, transition: "width 0.5s" }} />
            </div>
          </div>
          <p className="text-[10px] mb-4" style={{ color: "var(--labs-text-muted)" }}>
            {Math.max(0, ANALYTICS_THRESHOLD - whiskyCount)} more to unlock full analytics
          </p>
          <button className="labs-btn-primary" onClick={() => navigate("/labs/solo")} data-testid="button-taste-log-dram">
            {whiskyCount > 0 ? "Log next dram" : "Log your first dram"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 labs-fade-in labs-stagger-1">
            {[
              { label: "Stability", value: stability, id: "stability" },
              { label: "Exploration", value: exploration, id: "exploration" },
              { label: "Smoke", value: smoke, id: "smoke" },
              { label: "Tastings", value: totalTastings, id: "tastings" },
            ].map(s => (
              <div key={s.id} className="labs-card p-4 text-center" data-testid={`labs-taste-stat-${s.id}`}>
                <p className="text-xl font-bold" style={{ color: "var(--labs-accent)" }}>
                  {s.value != null ? (typeof s.value === "number" ? (Number.isInteger(s.value) ? s.value : s.value.toFixed(1)) : s.value) : "—"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--labs-text-muted)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {insight && (
            <div className="labs-card p-4 mb-6 labs-fade-in labs-stagger-2" data-testid="card-taste-insight">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Taste Insight</span>
              </div>
              <p className="text-sm" style={{ color: "var(--labs-text)", lineHeight: 1.6 }} data-testid="text-insight-message">
                {insight.message}
              </p>
            </div>
          )}

          {dimensions.some(d => d.value > 0) && (
            <div className="mb-6 labs-fade-in labs-stagger-2">
              <p className="labs-section-label flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                Your Palate
              </p>
              <div className="labs-card p-4">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {dimensions.map(dim => (
                    <div key={dim.label} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-14 text-right" style={{ color: "var(--labs-text-secondary)" }}>{dim.label}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ background: "var(--labs-border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${dimensionMax > 0 ? (dim.value / dimensionMax) * 100 : 0}%`, background: dim.color || "var(--labs-accent)", transition: "width 0.5s" }} />
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
        </>
      )}

      <div className="labs-fade-in labs-stagger-3">
        <p className="labs-section-label flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Profile & Analysis
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavItem icon={Activity} label="CaskSense Profile" description="Flavor radar, style & sweet spot" href="/labs/taste/profile" testId="labs-taste-link-profile" locked={analyticsLocked} />
          <NavItem icon={BarChart3} label="Analytics" description="Evolution, consistency & stats" href="/labs/taste/analytics" testId="labs-taste-link-analytics" />
          <NavItem icon={PieChart} label="Flavor Wheel" description="Aroma categories from your notes" href="/labs/taste/wheel" testId="labs-taste-link-wheel" />
          <NavItem icon={GitCompareArrows} label="Compare" description="Your scores vs. community" href="/labs/taste/profile" testId="labs-taste-link-compare" locked={analyticsLocked} />
        </div>
      </div>

      <div className="mt-8 labs-fade-in labs-stagger-4">
        <p className="labs-section-label flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" />
          Data & Tools
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavItem icon={BookOpen} label="Drams Journal" description="Your tasting diary & entries" href="/labs/taste/drams" testId="labs-taste-link-drams" badge={journalCount || null} />
          <NavItem icon={Archive} label="Collection" description="Manage your whisky bottles" href="/labs/taste/collection" testId="labs-taste-link-collection" />
          <NavItem icon={Star} label="Wishlist" description="Whiskies you want to try" href="/labs/taste/wishlist" testId="labs-taste-link-wishlist" />
          <NavItem icon={Download} label="Downloads" description="Export data & templates" href="/labs/taste/downloads" testId="labs-taste-link-downloads" />
          <NavItem icon={Settings} label="Settings" description="Profile, preferences & account" href="/labs/taste/settings" testId="labs-taste-link-settings" />
        </div>
      </div>

      {recentTastings.length > 0 && (
        <div className="mt-8 labs-fade-in labs-stagger-4">
          <p className="labs-section-label flex items-center gap-2">
            <Compass className="w-3.5 h-3.5" />
            Recent Tastings
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentTastings.map((t: any) => (
              <div
                key={t.id}
                className="labs-card labs-card-interactive flex items-center gap-3 p-3"
                onClick={() => navigate(`/labs/tastings/${t.id}`)}
                data-testid={`labs-taste-tasting-${t.id}`}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                      <Calendar className="w-3 h-3" />{t.date}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
