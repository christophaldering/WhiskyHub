import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Wine, Plus, Compass, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, journalApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getSession } from "@/lib/session";
import { PageHeaderV2, CardV2, BottomSheetV2, SegmentedControlV2 } from "../components";

export default function V2Home() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [session, setSession] = useState(() => getSession());
  const refreshSession = useCallback(() => setSession(getSession()), []);

  useEffect(() => {
    window.addEventListener("session-change", refreshSession);
    return () => window.removeEventListener("session-change", refreshSession);
  }, [refreshSession]);

  const { data: tastings } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const activeTasting = tastings?.find((t: any) => t.status === "open");
  const recentTastings = tastings
    ?.filter((t: any) => t.status === "archived" || t.status === "reveal")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    ?.slice(0, 3);

  const firstName = session.signedIn ? (session.name?.split(" ")[0] || currentParticipant?.name?.split(" ")[0] || "") : "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (!currentParticipant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--v2-accent)" }} />
        <p className="text-lg font-medium mb-2" style={{ color: "var(--v2-text)" }} data-testid="text-welcome">Welcome to CaskSense</p>
        <p className="text-sm mb-6" style={{ color: "var(--v2-text-muted)" }}>Sign in from the main app to continue</p>
        <button
          className="px-6 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
          style={{ background: "var(--v2-surface)", color: "var(--v2-text)", border: "1px solid var(--v2-border)" }}
          onClick={() => navigate("/tasting")}
          data-testid="button-goto-login"
        >
          Go to Main App
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <PageHeaderV2
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        subtitle="Your whisky journey at a glance"
      />

      {activeTasting ? (
        <CardV2
          className="p-5 mb-6"
          onClick={() => navigate(`/app/session/${activeTasting.id}`)}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--v2-success)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--v2-success)" }} data-testid="status-live-session">Live Session</span>
          </div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--v2-text)" }} data-testid="text-active-session-title">{activeTasting.title}</h2>
          <p className="text-sm mb-4" style={{ color: "var(--v2-text-muted)" }}>
            {activeTasting.location} · {activeTasting.date}
          </p>
          <button
            className="w-full py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
            style={{ background: "var(--v2-accent)", color: "var(--v2-bg)" }}
            data-testid="button-continue-session"
          >
            Continue
          </button>
        </CardV2>
      ) : (
        <CardV2 className="p-5 mb-6">
          <h2
            className="text-lg font-semibold mb-1"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--v2-text)" }}
            data-testid="text-hero-title"
          >
            Ready for a pour?
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--v2-text-muted)" }}>
            Start a new session or log a quick tasting
          </p>
          <div className="flex gap-3">
            <button
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
              style={{ background: "var(--v2-accent)", color: "var(--v2-bg)" }}
              onClick={() => setQuickLogOpen(true)}
              data-testid="button-quick-log"
            >
              Quick Log
            </button>
            <button
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
              style={{ background: "var(--v2-surface-elevated)", color: "var(--v2-text)", border: "1px solid var(--v2-border)" }}
              onClick={() => navigate("/app/sessions")}
              data-testid="button-view-sessions"
            >
              View Sessions
            </button>
          </div>
        </CardV2>
      )}

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: Plus, label: "Quick Log", action: () => setQuickLogOpen(true), testId: "button-action-quicklog" },
          { icon: Wine, label: "Sessions", action: () => navigate("/app/sessions"), testId: "button-action-sessions" },
          { icon: Compass, label: "Discover", action: () => navigate("/app/discover"), testId: "button-action-discover" },
        ].map((item) => (
          <CardV2 key={item.label} onClick={item.action} className="flex flex-col items-center gap-2 p-4">
            <item.icon className="w-5 h-5" style={{ color: "var(--v2-accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--v2-text-secondary)" }} data-testid={item.testId}>{item.label}</span>
          </CardV2>
        ))}
      </div>

      {recentTastings && recentTastings.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--v2-text-muted)" }}>Recent</p>
          <div className="space-y-2">
            {recentTastings.map((t: any) => (
              <CardV2
                key={t.id}
                onClick={() => navigate(`/app/session/${t.id}`)}
                className="flex items-center gap-4 p-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--v2-accent-muted)" }}
                >
                  <Wine className="w-5 h-5" style={{ color: "var(--v2-accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--v2-text)" }} data-testid={`text-recent-title-${t.id}`}>{t.title}</p>
                  <p className="text-xs" style={{ color: "var(--v2-text-muted)" }}>{t.date}</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--v2-text-muted)" }} />
              </CardV2>
            ))}
          </div>
        </div>
      )}

      <BottomSheetV2 open={quickLogOpen} onClose={() => setQuickLogOpen(false)} title="Quick Log">
        <QuickLogContent
          participantId={currentParticipant.id}
          onClose={() => setQuickLogOpen(false)}
        />
      </BottomSheetV2>
    </div>
  );
}

function QuickLogContent({ participantId, onClose }: { participantId: string; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [whiskyName, setWhiskyName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [scores, setScores] = useState({ nose: 70, taste: 70, finish: 70 });
  const [notes, setNotes] = useState("");
  const [overall, setOverall] = useState(70);
  const [activeTab, setActiveTab] = useState("nose");

  const saveMutation = useMutation({
    mutationFn: (data: any) => journalApi.create(participantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      onClose();
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      title: whiskyName || "Quick Log",
      whiskyName,
      distillery,
      noseNotes: activeTab === "nose" ? notes : "",
      tasteNotes: activeTab === "taste" ? notes : "",
      finishNotes: activeTab === "finish" ? notes : "",
      personalScore: overall,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    borderRadius: "var(--v2-radius-sm)",
    border: "1px solid var(--v2-border)",
    background: "var(--v2-surface)",
    color: "var(--v2-text)",
    outline: "none",
  };

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--v2-text-muted)" }}>Whisky Name</label>
          <input
            style={inputStyle}
            placeholder="e.g. Ardbeg Uigeadail"
            value={whiskyName}
            onChange={(e) => setWhiskyName(e.target.value)}
            autoFocus
            data-testid="input-quicklog-name"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--v2-text-muted)" }}>Distillery</label>
          <input
            style={inputStyle}
            placeholder="e.g. Ardbeg"
            value={distillery}
            onChange={(e) => setDistillery(e.target.value)}
            data-testid="input-quicklog-distillery"
          />
        </div>
        <button
          className="w-full py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors mt-2"
          style={{ background: "var(--v2-accent)", color: "var(--v2-bg)", opacity: !whiskyName.trim() ? 0.5 : 1 }}
          onClick={() => setStep(2)}
          disabled={!whiskyName.trim()}
          data-testid="button-quicklog-next"
        >
          Next
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-5">
        <SegmentedControlV2
          items={[
            { key: "nose", label: "Nose" },
            { key: "taste", label: "Taste" },
            { key: "finish", label: "Finish" },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium capitalize" style={{ color: "var(--v2-text)" }}>{activeTab}</span>
            <span className="text-sm font-semibold" style={{ color: "var(--v2-accent)" }} data-testid={`text-quicklog-score-${activeTab}`}>
              {scores[activeTab as keyof typeof scores]}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={scores[activeTab as keyof typeof scores]}
            onChange={(e) => setScores({ ...scores, [activeTab]: Number(e.target.value) })}
            className="w-full accent-amber-500"
            data-testid={`input-quicklog-slider-${activeTab}`}
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--v2-text-muted)" }}>Notes</label>
          <textarea
            style={{ ...inputStyle, resize: "vertical" as const }}
            rows={2}
            placeholder={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} notes...`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-quicklog-notes"
          />
        </div>

        <button
          className="w-full py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
          style={{ background: "var(--v2-accent)", color: "var(--v2-bg)" }}
          onClick={() => setStep(3)}
          data-testid="button-quicklog-to-overall"
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "var(--v2-text)" }}>Overall Score</span>
          <span className="text-xl font-bold" style={{ color: "var(--v2-accent)" }} data-testid="text-quicklog-overall">{overall}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={overall}
          onChange={(e) => setOverall(Number(e.target.value))}
          className="w-full accent-amber-500"
          data-testid="input-quicklog-overall-slider"
        />
      </div>

      <CardV2 elevated className="p-4 space-y-2">
        <p className="text-sm font-medium" style={{ color: "var(--v2-text)" }}>{whiskyName}</p>
        {distillery && <p className="text-xs" style={{ color: "var(--v2-text-muted)" }}>{distillery}</p>}
        <div className="flex gap-4 text-xs" style={{ color: "var(--v2-text-secondary)" }}>
          <span>N: {scores.nose}</span>
          <span>T: {scores.taste}</span>
          <span>F: {scores.finish}</span>
        </div>
      </CardV2>

      <button
        className="w-full py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
        style={{ background: "var(--v2-accent)", color: "var(--v2-bg)", opacity: saveMutation.isPending ? 0.7 : 1 }}
        onClick={handleSave}
        disabled={saveMutation.isPending}
        data-testid="button-quicklog-save"
      >
        {saveMutation.isPending ? "Saving..." : "Save to Journal"}
      </button>
    </div>
  );
}
