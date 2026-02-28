import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Wine, Plus, Compass, ChevronRight, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, journalApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export default function LabHome() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [quickLogOpen, setQuickLogOpen] = useState(false);

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

  const firstName = currentParticipant?.name?.split(" ")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (!currentParticipant) {
    return (
      <div className="lab-empty-state" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--lab-accent)" }} />
        <p className="text-lg font-medium mb-2" style={{ color: "var(--lab-text)" }}>Welcome to CaskSense Lab</p>
        <p className="text-sm mb-6" style={{ color: "var(--lab-text-muted)" }}>Sign in from the main app to continue</p>
        <button className="lab-btn-secondary" onClick={() => navigate("/tasting")} data-testid="lab-goto-login">
          Go to Main App
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <h1
        className="text-2xl font-semibold mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
        data-testid="lab-greeting"
      >
        {greeting}, {firstName}
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--lab-text-muted)" }}>
        Your whisky journey at a glance
      </p>

      {activeTasting ? (
        <div
          className="lab-card p-5 mb-6 cursor-pointer"
          onClick={() => navigate(`/lab-dark/session/${activeTasting.id}`)}
          data-testid="lab-active-session-card"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: "var(--lab-success)" }}>Live Session</span>
          </div>
          <h2 className="text-lg font-semibold mb-1">{activeTasting.title}</h2>
          <p className="text-sm mb-4" style={{ color: "var(--lab-text-muted)" }}>
            {activeTasting.location} · {activeTasting.date}
          </p>
          <button className="lab-btn-primary w-full" data-testid="lab-continue-session">
            Continue
          </button>
        </div>
      ) : (
        <div className="lab-card p-5 mb-6">
          <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Ready for a pour?
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--lab-text-muted)" }}>
            Start a new session or log a quick tasting
          </p>
          <div className="flex gap-3">
            <button
              className="lab-btn-primary flex-1"
              onClick={() => setQuickLogOpen(true)}
              data-testid="lab-quick-log-btn"
            >
              Quick Log
            </button>
            <button
              className="lab-btn-secondary flex-1"
              onClick={() => navigate("/lab-dark/sessions")}
              data-testid="lab-new-session-btn"
            >
              View Sessions
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: Plus, label: "Quick Log", action: () => setQuickLogOpen(true), testId: "lab-action-quicklog" },
          { icon: Wine, label: "Sessions", action: () => navigate("/lab-dark/sessions"), testId: "lab-action-sessions" },
          { icon: Compass, label: "Discover", action: () => navigate("/lab-dark/discover"), testId: "lab-action-discover" },
        ].map((item) => (
          <button
            key={item.label}
            className="lab-card flex flex-col items-center gap-2 p-4 cursor-pointer"
            onClick={item.action}
            data-testid={item.testId}
          >
            <item.icon className="w-5 h-5" style={{ color: "var(--lab-accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--lab-text-secondary)" }}>{item.label}</span>
          </button>
        ))}
      </div>

      {recentTastings && recentTastings.length > 0 && (
        <div>
          <p className="lab-section-title">Recent</p>
          <div className="space-y-2">
            {recentTastings.map((t: any) => (
              <div
                key={t.id}
                className="lab-card flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => navigate(`/lab-dark/session/${t.id}`)}
                data-testid={`lab-recent-${t.id}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--lab-accent-muted)" }}
                >
                  <Wine className="w-5 h-5" style={{ color: "var(--lab-accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs" style={{ color: "var(--lab-text-muted)" }}>{t.date}</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--lab-text-muted)" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {quickLogOpen && (
        <QuickLogSheet
          participantId={currentParticipant.id}
          onClose={() => setQuickLogOpen(false)}
        />
      )}
    </div>
  );
}

function QuickLogSheet({ participantId, onClose }: { participantId: string; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [whiskyName, setWhiskyName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [scores, setScores] = useState({ nose: 70, taste: 70, finish: 70 });
  const [notes, setNotes] = useState("");
  const [overall, setOverall] = useState(70);
  const [activeTab, setActiveTab] = useState<"nose" | "taste" | "finish">("nose");

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom"
        style={{ background: "var(--lab-surface-elevated)", maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>Quick Log</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--lab-surface)", color: "var(--lab-text-muted)" }}
            data-testid="lab-quicklog-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--lab-text-muted)" }}>Whisky Name</label>
              <input
                className="lab-input"
                placeholder="e.g. Ardbeg Uigeadail"
                value={whiskyName}
                onChange={(e) => setWhiskyName(e.target.value)}
                autoFocus
                data-testid="lab-quicklog-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--lab-text-muted)" }}>Distillery</label>
              <input
                className="lab-input"
                placeholder="e.g. Ardbeg"
                value={distillery}
                onChange={(e) => setDistillery(e.target.value)}
                data-testid="lab-quicklog-distillery"
              />
            </div>
            <button
              className="lab-btn-primary w-full mt-2"
              onClick={() => setStep(2)}
              disabled={!whiskyName.trim()}
              data-testid="lab-quicklog-next"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex gap-2">
              {(["nose", "taste", "finish"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`lab-chip flex-1 justify-center ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                  data-testid={`lab-quicklog-tab-${tab}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium capitalize">{activeTab}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--lab-accent)" }}>
                  {scores[activeTab]}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={scores[activeTab]}
                onChange={(e) => setScores({ ...scores, [activeTab]: Number(e.target.value) })}
                className="w-full accent-amber-500"
                data-testid={`lab-quicklog-slider-${activeTab}`}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--lab-text-muted)" }}>Notes</label>
              <textarea
                className="lab-input"
                rows={2}
                placeholder={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} notes...`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="lab-quicklog-notes"
              />
            </div>

            <button
              className="lab-btn-primary w-full"
              onClick={() => setStep(3)}
              data-testid="lab-quicklog-to-overall"
            >
              Next
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Score</span>
                <span className="text-xl font-bold" style={{ color: "var(--lab-accent)" }}>{overall}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={overall}
                onChange={(e) => setOverall(Number(e.target.value))}
                className="w-full accent-amber-500"
                data-testid="lab-quicklog-overall-slider"
              />
            </div>

            <div className="lab-card-elevated p-4 space-y-2">
              <p className="text-sm font-medium">{whiskyName}</p>
              {distillery && <p className="text-xs" style={{ color: "var(--lab-text-muted)" }}>{distillery}</p>}
              <div className="flex gap-4 text-xs" style={{ color: "var(--lab-text-secondary)" }}>
                <span>N: {scores.nose}</span>
                <span>T: {scores.taste}</span>
                <span>F: {scores.finish}</span>
              </div>
            </div>

            <button
              className="lab-btn-primary w-full"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="lab-quicklog-save"
            >
              {saveMutation.isPending ? "Saving..." : "Save to Journal"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
