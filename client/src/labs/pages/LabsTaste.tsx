import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Wine, Star, Calendar, ChevronRight, TrendingUp, BookOpen } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, journalApi, flavorProfileApi } from "@/lib/api";

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

  const recentTastings = tastings
    ?.filter((t: any) => t.status === "archived" || t.status === "reveal")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    ?.slice(0, 5) || [];

  const recentJournal = journal
    ?.sort((a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())
    ?.slice(0, 5) || [];

  const totalTastings = tastings?.length || 0;
  const totalJournalEntries = journal?.length || 0;
  const completedTastings = tastings?.filter((t: any) => t.status === "archived" || t.status === "reveal")?.length || 0;

  const topFlavors = flavorProfile?.topFlavors || flavorProfile?.flavors || [];
  const flavorList = Array.isArray(topFlavors) ? topFlavors.slice(0, 5) : [];

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
        Your personal tasting snapshot
      </p>

      <div className="grid grid-cols-3 gap-3 mb-8 labs-fade-in labs-stagger-2">
        <div
          className="labs-card p-4 text-center"
          data-testid="labs-taste-stat-tastings"
        >
          <p className="text-2xl font-bold" style={{ color: "var(--labs-accent)" }}>
            {totalTastings}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>
            Tastings
          </p>
        </div>
        <div
          className="labs-card p-4 text-center"
          data-testid="labs-taste-stat-completed"
        >
          <p className="text-2xl font-bold" style={{ color: "var(--labs-accent)" }}>
            {completedTastings}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>
            Completed
          </p>
        </div>
        <div
          className="labs-card p-4 text-center"
          data-testid="labs-taste-stat-journal"
        >
          <p className="text-2xl font-bold" style={{ color: "var(--labs-accent)" }}>
            {totalJournalEntries}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>
            Journal
          </p>
        </div>
      </div>

      {flavorList.length > 0 && (
        <div className="mb-8 labs-fade-in labs-stagger-3">
          <p className="labs-section-label">Top Flavors</p>
          <div className="labs-card p-4">
            <div className="flex flex-wrap gap-2">
              {flavorList.map((flavor: any, i: number) => (
                <span
                  key={i}
                  className="labs-badge labs-badge-accent"
                  data-testid={`labs-taste-flavor-${i}`}
                >
                  {typeof flavor === "string" ? flavor : flavor.name || flavor.label || ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {recentTastings.length > 0 && (
        <div className="mb-8 labs-fade-in labs-stagger-3">
          <p className="labs-section-label">Recent Tastings</p>
          <div className="space-y-2">
            {recentTastings.map((t: any) => (
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
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                    {t.title}
                  </p>
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
            ))}
          </div>
        </div>
      )}

      {recentJournal.length > 0 && (
        <div className="mb-8 labs-fade-in labs-stagger-4">
          <p className="labs-section-label">Recent Journal Entries</p>
          <div className="space-y-2">
            {recentJournal.map((entry: any) => (
              <div
                key={entry.id}
                className="labs-card p-4"
                data-testid={`labs-taste-journal-${entry.id}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "var(--labs-info-muted)" }}
                  >
                    <BookOpen className="w-4 h-4" style={{ color: "var(--labs-info)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {entry.whiskyName || entry.title || "Untitled"}
                    </p>
                    {entry.distillery && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                        {entry.distillery}
                      </p>
                    )}
                    {entry.personalScore != null && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--labs-accent)" }}>
                          {entry.personalScore}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentTastings.length === 0 && recentJournal.length === 0 && (
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