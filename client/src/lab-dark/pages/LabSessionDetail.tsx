import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Wine, ChevronLeft, ChevronRight, MapPin, Calendar } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

interface LabSessionDetailProps {
  params: { id: string };
}

export default function LabSessionDetail({ params }: LabSessionDetailProps) {
  const sessionId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<"nose" | "taste" | "finish">("nose");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: tasting } = useQuery({
    queryKey: ["tasting", sessionId],
    queryFn: () => tastingApi.get(sessionId),
    enabled: !!sessionId,
    refetchInterval: 5000,
  });

  const { data: whiskies } = useQuery({
    queryKey: ["whiskies", sessionId],
    queryFn: () => whiskyApi.getForTasting(sessionId),
    enabled: !!sessionId,
    refetchInterval: 5000,
  });

  const currentWhisky = whiskies?.[currentIndex];

  const { data: myRating } = useQuery({
    queryKey: ["myRating", currentParticipant?.id, currentWhisky?.id],
    queryFn: () => ratingApi.getMyRating(currentParticipant!.id, currentWhisky!.id),
    enabled: !!currentParticipant && !!currentWhisky,
  });

  const [scores, setScores] = useState({ nose: 50, taste: 50, finish: 50, balance: 50, overall: 50 });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (myRating) {
      setScores({
        nose: myRating.nose ?? 50,
        taste: myRating.taste ?? 50,
        finish: myRating.finish ?? 50,
        balance: myRating.balance ?? 50,
        overall: myRating.overall ?? 50,
      });
      setNotes(myRating.notes || "");
    } else {
      setScores({ nose: 50, taste: 50, finish: 50, balance: 50, overall: 50 });
      setNotes("");
    }
  }, [myRating, currentWhisky?.id]);

  const rateMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRating", currentParticipant?.id, currentWhisky?.id] });
    },
  });

  const debouncedSave = useCallback(
    (newScores: typeof scores, newNotes: string) => {
      if (!currentParticipant || !currentWhisky || !tasting) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        rateMutation.mutate({
          tastingId: sessionId,
          whiskyId: currentWhisky.id,
          participantId: currentParticipant.id,
          ...newScores,
          notes: newNotes,
        });
      }, 800);
    },
    [currentParticipant, currentWhisky, tasting, sessionId]
  );

  const updateScore = (dimension: keyof typeof scores, value: number) => {
    const newScores = { ...scores, [dimension]: value };
    const avg = Math.round((newScores.nose + newScores.taste + newScores.finish + newScores.balance) / 4);
    newScores.overall = avg;
    setScores(newScores);
    debouncedSave(newScores, notes);
  };

  const updateNotes = (value: string) => {
    setNotes(value);
    debouncedSave(scores, value);
  };

  const isBlind = tasting?.blindMode && tasting?.status === "open";
  const displayName = isBlind
    ? `Dram ${String.fromCharCode(65 + currentIndex)}`
    : currentWhisky?.name || "Unknown";
  const displaySub = isBlind ? "Blind tasting" : [currentWhisky?.distillery, currentWhisky?.age ? `${currentWhisky.age}y` : null, currentWhisky?.abv ? `${currentWhisky.abv}%` : null].filter(Boolean).join(" · ");

  if (!tasting) {
    return (
      <div className="lab-empty-state" style={{ minHeight: "60vh" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4" style={{ borderColor: "var(--lab-border)", borderTopColor: "var(--lab-accent)" }} />
        <p className="text-sm" style={{ color: "var(--lab-text-muted)" }}>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto">
      <button
        onClick={() => navigate("/lab-dark/sessions")}
        className="flex items-center gap-1.5 mb-4 text-sm"
        style={{ color: "var(--lab-text-muted)" }}
        data-testid="lab-session-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Sessions
      </button>

      <div className="mb-6">
        <h1
          className="text-lg font-semibold mb-1"
          style={{ fontFamily: "'Playfair Display', serif" }}
          data-testid="lab-session-title"
        >
          {tasting.title}
        </h1>
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--lab-text-muted)" }}>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{tasting.date}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{tasting.location}</span>
        </div>
        {whiskies && (
          <div className="flex items-center gap-2 mt-2">
            <span className="lab-badge">{whiskies.length} whiskies</span>
            <span className="lab-badge">{tasting.status}</span>
          </div>
        )}
      </div>

      {!whiskies || whiskies.length === 0 ? (
        <div className="lab-empty-state">
          <Wine className="w-10 h-10 mb-3" style={{ color: "var(--lab-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--lab-text-muted)" }}>No whiskies in this session yet</p>
        </div>
      ) : (
        <>
          <div className="lab-card-elevated p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity"
                style={{
                  background: "var(--lab-surface)",
                  color: currentIndex === 0 ? "var(--lab-border)" : "var(--lab-text)",
                  opacity: currentIndex === 0 ? 0.4 : 1,
                }}
                data-testid="lab-session-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center flex-1">
                <p className="text-xs mb-1" style={{ color: "var(--lab-text-muted)" }}>
                  {currentIndex + 1} of {whiskies.length}
                </p>
                <h2 className="text-base font-semibold" data-testid="lab-whisky-name">{displayName}</h2>
                {displaySub && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--lab-text-muted)" }}>{displaySub}</p>
                )}
              </div>

              <button
                onClick={() => setCurrentIndex(Math.min(whiskies.length - 1, currentIndex + 1))}
                disabled={currentIndex >= whiskies.length - 1}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity"
                style={{
                  background: "var(--lab-surface)",
                  color: currentIndex >= whiskies.length - 1 ? "var(--lab-border)" : "var(--lab-text)",
                  opacity: currentIndex >= whiskies.length - 1 ? 0.4 : 1,
                }}
                data-testid="lab-session-next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1">
              {whiskies.map((_: any, i: number) => (
                <button
                  key={i}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: i === currentIndex ? "var(--lab-accent)" : "var(--lab-border)",
                    transform: i === currentIndex ? "scale(1.3)" : "scale(1)",
                  }}
                  onClick={() => setCurrentIndex(i)}
                />
              ))}
            </div>
          </div>

          {currentParticipant && tasting.status === "open" && (
            <>
              <div className="flex gap-2 mb-5">
                {(["nose", "taste", "finish"] as const).map((s) => (
                  <button
                    key={s}
                    className={`lab-chip flex-1 justify-center ${activeSection === s ? "active" : ""}`}
                    onClick={() => setActiveSection(s)}
                    data-testid={`lab-section-${s}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              <div className="lab-card p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium capitalize">{activeSection}</span>
                  <span className="text-lg font-bold" style={{ color: "var(--lab-accent)" }}>
                    {scores[activeSection]}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={tasting.ratingScale || 100}
                  value={scores[activeSection]}
                  onChange={(e) => updateScore(activeSection, Number(e.target.value))}
                  className="w-full accent-amber-500 mb-4"
                  data-testid={`lab-slider-${activeSection}`}
                />

                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--lab-text-muted)" }}>
                  Notes
                </label>
                <textarea
                  className="lab-input"
                  rows={2}
                  placeholder={`Your ${activeSection} notes...`}
                  value={notes}
                  onChange={(e) => updateNotes(e.target.value)}
                  data-testid="lab-notes-input"
                />
              </div>

              <div className="lab-card p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Balance</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--lab-accent)" }}>{scores.balance}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={tasting.ratingScale || 100}
                  value={scores.balance}
                  onChange={(e) => updateScore("balance", Number(e.target.value))}
                  className="w-full accent-amber-500"
                  data-testid="lab-slider-balance"
                />
              </div>

              <div className="lab-card-elevated p-4 flex items-center justify-between">
                <span className="text-sm font-medium">Overall</span>
                <span className="text-2xl font-bold" style={{ color: "var(--lab-accent)" }} data-testid="lab-overall-score">
                  {scores.overall}
                </span>
              </div>
            </>
          )}

          {tasting.status !== "open" && (
            <div className="lab-card-elevated p-6 text-center">
              <p className="text-sm" style={{ color: "var(--lab-text-muted)" }}>
                {tasting.status === "draft"
                  ? "This session has not started yet"
                  : tasting.status === "archived"
                  ? "This session has been completed"
                  : "Ratings are currently closed"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
