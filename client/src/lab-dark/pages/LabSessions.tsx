import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Wine, Calendar, Users, ChevronRight, Clock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";

type Tab = "active" | "history";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "var(--lab-text-muted)" },
  open: { label: "Live", color: "var(--lab-success)" },
  closed: { label: "Closed", color: "var(--lab-accent)" },
  reveal: { label: "Reveal", color: "var(--lab-accent)" },
  archived: { label: "Completed", color: "var(--lab-text-muted)" },
};

export default function LabSessions() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("active");

  const { data: tastings, isLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <div className="lab-empty-state" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-3" style={{ color: "var(--lab-text-muted)" }} />
        <p className="text-sm">Sign in to view your sessions</p>
      </div>
    );
  }

  const activeSessions = tastings?.filter((t: any) => ["draft", "open", "closed", "reveal"].includes(t.status)) || [];
  const historySessions = tastings?.filter((t: any) => t.status === "archived")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  const displayList = tab === "active" ? activeSessions : historySessions;

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <h1
        className="text-xl font-semibold mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
        data-testid="lab-sessions-title"
      >
        Sessions
      </h1>

      <div className="flex gap-2 mb-6">
        {(["active", "history"] as const).map((t) => (
          <button
            key={t}
            className={`lab-chip ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
            data-testid={`lab-sessions-tab-${t}`}
          >
            {t === "active" ? "Active" : "History"}
            {t === "active" && activeSessions.length > 0 && (
              <span className="lab-badge ml-1">{activeSessions.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="lab-card p-4 animate-pulse">
              <div className="h-4 rounded" style={{ background: "var(--lab-border)", width: "60%" }} />
              <div className="h-3 mt-2 rounded" style={{ background: "var(--lab-border)", width: "40%" }} />
            </div>
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <div className="lab-empty-state">
          <Clock className="w-10 h-10 mb-3" style={{ color: "var(--lab-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--lab-text-muted)" }}>
            {tab === "active" ? "No active sessions" : "No completed sessions yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map((tasting: any) => {
            const status = STATUS_LABELS[tasting.status] || STATUS_LABELS.draft;
            return (
              <div
                key={tasting.id}
                className="lab-card flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => navigate(`/lab-dark/session/${tasting.id}`)}
                data-testid={`lab-session-row-${tasting.id}`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--lab-accent-muted)" }}
                >
                  <Wine className="w-5 h-5" style={{ color: "var(--lab-accent)" }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tasting.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--lab-text-muted)" }}>
                      <Calendar className="w-3 h-3" />
                      {tasting.date}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--lab-text-muted)" }}>
                      {tasting.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-medium" style={{ color: status.color }}>
                    {status.label}
                  </span>
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--lab-text-muted)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
