import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Wine, Calendar, ChevronRight, Clock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { PageHeaderV2, CardV2, SegmentedControlV2, EmptyStateV2 } from "../components";

const STATUS_LABELS: Record<string, { label: string; colorVar: string }> = {
  draft: { label: "Draft", colorVar: "var(--v2-text-muted)" },
  open: { label: "Live", colorVar: "var(--v2-success)" },
  closed: { label: "Closed", colorVar: "var(--v2-accent)" },
  reveal: { label: "Reveal", colorVar: "var(--v2-accent)" },
  archived: { label: "Completed", colorVar: "var(--v2-text-muted)" },
};

export default function V2Sessions() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("active");

  const { data: tastings, isLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-3" style={{ color: "var(--v2-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--v2-text-muted)" }} data-testid="text-sign-in-prompt">Sign in to view your sessions</p>
      </div>
    );
  }

  const activeSessions = tastings?.filter((t: any) => ["draft", "open", "closed", "reveal"].includes(t.status)) || [];
  const historySessions = tastings?.filter((t: any) => t.status === "archived")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  const displayList = tab === "active" ? activeSessions : historySessions;

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <PageHeaderV2 title="Sessions" />

      <div className="mb-6 px-1">
        <SegmentedControlV2
          items={[
            { key: "active", label: `Active${activeSessions.length > 0 ? ` (${activeSessions.length})` : ""}` },
            { key: "history", label: "History" },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CardV2 key={i} className="p-4 animate-pulse">
              <div className="h-4 rounded" style={{ background: "var(--v2-border)", width: "60%" }} />
              <div className="h-3 mt-2 rounded" style={{ background: "var(--v2-border)", width: "40%" }} />
            </CardV2>
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <EmptyStateV2
          icon={Clock}
          title={tab === "active" ? "No active sessions" : "No completed sessions yet"}
          description={tab === "active" ? "Join or create a tasting session to get started" : "Your completed sessions will appear here"}
        />
      ) : (
        <div className="space-y-2">
          {displayList.map((tasting: any) => {
            const status = STATUS_LABELS[tasting.status] || STATUS_LABELS.draft;
            return (
              <CardV2
                key={tasting.id}
                onClick={() => navigate(`/app/session/${tasting.id}`)}
                className="flex items-center gap-4 p-4"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--v2-accent-muted)" }}
                >
                  <Wine className="w-5 h-5" style={{ color: "var(--v2-accent)" }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--v2-text)" }} data-testid={`text-session-title-${tasting.id}`}>{tasting.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--v2-text-muted)" }}>
                      <Calendar className="w-3 h-3" />
                      {tasting.date}
                    </span>
                    <span className="text-xs" style={{ color: "var(--v2-text-muted)" }}>
                      {tasting.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-medium" style={{ color: status.colorVar }} data-testid={`status-session-${tasting.id}`}>
                    {status.label}
                  </span>
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--v2-text-muted)" }} />
                </div>
              </CardV2>
            );
          })}
        </div>
      )}
    </div>
  );
}
