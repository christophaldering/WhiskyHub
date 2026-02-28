import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Wine, ChevronLeft, ChevronRight, MapPin, Calendar } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { CardV2, SegmentedControlV2, EmptyStateV2 } from "../components";

interface V2SessionDetailProps {
  params: { id: string };
}

export default function V2SessionDetail({ params }: V2SessionDetailProps) {
  const sessionId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSection, setActiveSection] = useState("nose");
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
  const displaySub = isBlind
    ? "Blind tasting"
    : [currentWhisky?.distillery, currentWhisky?.age ? `${currentWhisky.age}y` : null, currentWhisky?.abv ? `${currentWhisky.abv}%` : null].filter(Boolean).join(" · ");

  if (!tasting) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ minHeight: "60vh" }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--v2-border)", borderTopColor: "var(--v2-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--v2-text-muted)" }}>Loading session...</p>
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    borderRadius: "var(--v2-radius-sm)",
    border: "1px solid var(--v2-border)",
    background: "var(--v2-surface)",
    color: "var(--v2-text)",
    outline: "none",
    resize: "vertical" as const,
  };

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto">
      <button
        onClick={() => navigate("/app/sessions")}
        className="flex items-center gap-1.5 mb-4 text-sm cursor-pointer"
        style={{ color: "var(--v2-text-muted)" }}
        data-testid="button-back-sessions"
      >
        <ArrowLeft className="w-4 h-4" />
        Sessions
      </button>

      <div className="mb-6">
        <h1
          className="text-lg font-semibold mb-1"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--v2-text)" }}
          data-testid="text-session-title"
        >
          {tasting.title}
        </h1>
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--v2-text-muted)" }}>
          <span className="flex items-center gap-1" data-testid="text-session-date"><Calendar className="w-3 h-3" />{tasting.date}</span>
          <span className="flex items-center gap-1" data-testid="text-session-location"><MapPin className="w-3 h-3" />{tasting.location}</span>
        </div>
        {whiskies && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{ background: "var(--v2-accent-muted)", color: "var(--v2-accent)" }}
              data-testid="badge-whisky-count"
            >
              {whiskies.length} whiskies
            </span>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{ background: "var(--v2-surface-elevated)", color: "var(--v2-text-secondary)" }}
              data-testid="badge-session-status"
            >
              {tasting.status}
            </span>
          </div>
        )}
      </div>

      {!whiskies || whiskies.length === 0 ? (
        <EmptyStateV2
          icon={Wine}
          title="No whiskies in this session yet"
          description="The host hasn't added any whiskies to this session"
        />
      ) : (
        <>
          <CardV2 elevated className="p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity cursor-pointer"
                style={{
                  background: "var(--v2-surface)",
                  color: currentIndex === 0 ? "var(--v2-border)" : "var(--v2-text)",
                  opacity: currentIndex === 0 ? 0.4 : 1,
                }}
                data-testid="button-prev-whisky"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center flex-1">
                <p className="text-xs mb-1" style={{ color: "var(--v2-text-muted)" }}>
                  {currentIndex + 1} of {whiskies.length}
                </p>
                <h2 className="text-base font-semibold" style={{ color: "var(--v2-text)" }} data-testid="text-whisky-name">{displayName}</h2>
                {displaySub && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--v2-text-muted)" }} data-testid="text-whisky-details">{displaySub}</p>
                )}
              </div>

              <button
                onClick={() => setCurrentIndex(Math.min(whiskies.length - 1, currentIndex + 1))}
                disabled={currentIndex >= whiskies.length - 1}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity cursor-pointer"
                style={{
                  background: "var(--v2-surface)",
                  color: currentIndex >= whiskies.length - 1 ? "var(--v2-border)" : "var(--v2-text)",
                  opacity: currentIndex >= whiskies.length - 1 ? 0.4 : 1,
                }}
                data-testid="button-next-whisky"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1">
              {whiskies.map((_: any, i: number) => (
                <button
                  key={i}
                  className="w-2 h-2 rounded-full transition-all cursor-pointer"
                  style={{
                    background: i === currentIndex ? "var(--v2-accent)" : "var(--v2-border)",
                    transform: i === currentIndex ? "scale(1.3)" : "scale(1)",
                  }}
                  onClick={() => setCurrentIndex(i)}
                  data-testid={`button-dot-${i}`}
                />
              ))}
            </div>
          </CardV2>

          {currentParticipant && tasting.status === "open" ? (
            <>
              <div className="mb-5">
                <SegmentedControlV2
                  items={[
                    { key: "nose", label: "Nose" },
                    { key: "taste", label: "Taste" },
                    { key: "finish", label: "Finish" },
                  ]}
                  activeKey={activeSection}
                  onChange={setActiveSection}
                />
              </div>

              <CardV2 className="p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium capitalize" style={{ color: "var(--v2-text)" }}>{activeSection}</span>
                  <span className="text-lg font-bold" style={{ color: "var(--v2-accent)" }} data-testid={`text-score-${activeSection}`}>
                    {scores[activeSection as keyof typeof scores]}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={tasting.ratingScale || 100}
                  value={scores[activeSection as keyof typeof scores]}
                  onChange={(e) => updateScore(activeSection as keyof typeof scores, Number(e.target.value))}
                  className="w-full accent-amber-500 mb-4"
                  data-testid={`input-slider-${activeSection}`}
                />

                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--v2-text-muted)" }}>Notes</label>
                <textarea
                  style={inputStyle}
                  rows={2}
                  placeholder={`Your ${activeSection} notes...`}
                  value={notes}
                  onChange={(e) => updateNotes(e.target.value)}
                  data-testid="input-notes"
                />
              </CardV2>

              <CardV2 className="p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: "var(--v2-text)" }}>Balance</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--v2-accent)" }} data-testid="text-score-balance">{scores.balance}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={tasting.ratingScale || 100}
                  value={scores.balance}
                  onChange={(e) => updateScore("balance", Number(e.target.value))}
                  className="w-full accent-amber-500"
                  data-testid="input-slider-balance"
                />
              </CardV2>

              <CardV2 elevated className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--v2-text)" }}>Overall</span>
                <span className="text-2xl font-bold" style={{ color: "var(--v2-accent)" }} data-testid="text-overall-score">
                  {scores.overall}
                </span>
              </CardV2>
            </>
          ) : tasting.status !== "open" ? (
            <CardV2 elevated className="p-6 text-center">
              <p className="text-sm" style={{ color: "var(--v2-text-muted)" }} data-testid="text-session-status-message">
                {tasting.status === "draft"
                  ? "This session has not started yet"
                  : tasting.status === "archived"
                  ? "This session has been completed"
                  : "Ratings are currently closed"}
              </p>
            </CardV2>
          ) : null}
        </>
      )}
    </div>
  );
}
