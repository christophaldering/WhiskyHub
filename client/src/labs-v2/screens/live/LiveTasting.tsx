import { useState, useEffect, useCallback, useRef } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Back, Lock, ChevronRight, Check, Spinner } from "../../icons";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { useTastingEvents } from "@/labs/hooks/useTastingEvents";
import { RatingFlow } from "../rating/RatingFlow";
import type { RatingData } from "../../types/rating";
import LiveLobby from "./LiveLobby";
import RevealSequence from "./RevealSequence";
import LiveVoiceMemo from "./LiveVoiceMemo";
import LiveAmbient from "./LiveAmbient";
import AccountUpgradePromptV2 from "../../components/AccountUpgradePromptV2";

interface WhiskyItem {
  id: string;
  name?: string;
  region?: string;
  cask?: string;
  age?: string;
  abv?: string;
  distillery?: string;
  imageUrl?: string;
  sortOrder?: number;
  blind?: boolean;
  revealedFields?: string[];
}

interface TastingData {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  hostId?: string;
  currentDramIndex?: number;
  guidedMode?: boolean;
}

interface ParticipantInfo {
  id: string;
  name: string;
  role?: string;
  status?: string;
}

interface MemoData {
  audioUrl: string;
  transcript: string;
  durationSeconds: number;
}

interface SaveStatus {
  state: "idle" | "saving" | "saved" | "error";
}

interface LiveTastingProps {
  tastingId: string;
  onBack: () => void;
}

export default function LiveTasting({ tastingId, onBack }: LiveTastingProps) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();

  const [tasting, setTasting] = useState<TastingData | null>(null);
  const [whiskies, setWhiskies] = useState<WhiskyItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentDramIdx, setCurrentDramIdx] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const [myRatings, setMyRatings] = useState<Record<string, RatingData>>({});
  const [memos, setMemos] = useState<Record<string, MemoData>>({});
  const [revealedMap, setRevealedMap] = useState<Record<string, Set<string>>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "idle" });
  const [showRating, setShowRating] = useState(false);
  const [loading, setLoading] = useState(true);

  const participantId = useRef<string>("");
  const participantName = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      participantId.current = sessionStorage.getItem("session_pid") || "";
      participantName.current = sessionStorage.getItem("session_name") || "";
    } catch {
      // fallback
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [tastingData, whiskyData] = await Promise.all([
        tastingApi.get(tastingId),
        whiskyApi.getForTasting(tastingId),
      ]);
      setTasting(tastingData);
      const sorted = Array.isArray(whiskyData)
        ? whiskyData.sort((a: WhiskyItem, b: WhiskyItem) => (a.sortOrder || 0) - (b.sortOrder || 0))
        : [];
      setWhiskies(sorted);

      if (tastingData.currentDramIndex !== undefined) {
        setCurrentDramIdx(tastingData.currentDramIndex);
      }

      const revMap: Record<string, Set<string>> = {};
      for (const w of sorted) {
        if (w.revealedFields && Array.isArray(w.revealedFields)) {
          revMap[w.id] = new Set(w.revealedFields);
        } else {
          revMap[w.id] = new Set();
        }
      }
      setRevealedMap(revMap);

      const pid = participantId.current;
      if (pid && sorted.length > 0) {
        const ratings: Record<string, RatingData> = {};
        for (const w of sorted) {
          try {
            const r = await ratingApi.getMyRating(pid, w.id);
            if (r) {
              ratings[w.id] = {
                scores: {
                  nose: r.noseScore || 0,
                  palate: r.palateScore || 0,
                  finish: r.finishScore || 0,
                  overall: r.overallScore || 0,
                },
                tags: {
                  nose: r.noseTags || [],
                  palate: r.palateTags || [],
                  finish: r.finishTags || [],
                  overall: r.overallTags || [],
                },
                notes: {
                  nose: r.noseNotes || "",
                  palate: r.palateNotes || "",
                  finish: r.finishNotes || "",
                  overall: r.overallNotes || "",
                },
              };
            }
          } catch {
            // no rating yet
          }
        }
        setMyRatings(ratings);
      }

      const pList = await tastingApi.getParticipants(tastingId);
      if (Array.isArray(pList)) setParticipants(pList);
    } catch {
      // failed to load
    } finally {
      setLoading(false);
    }
  }, [tastingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!tastingId || !participantId.current) return;
    const interval = setInterval(() => {
      tastingApi.heartbeat(tastingId, participantId.current).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [tastingId]);

  useTastingEvents({
    tastingId,
    enabled: !!tastingId && !!participantId.current,
    onStatusChange: (data) => {
      const newStatus = data.status as string | undefined;
      if (newStatus) {
        setTasting((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
      loadData();
    },
    onReveal: (data) => {
      const whiskyId = data.whiskyId as string | undefined;
      const field = data.field as string | undefined;
      if (whiskyId && field) {
        setRevealedMap((prev) => {
          const next = { ...prev };
          const s = new Set(prev[whiskyId] || []);
          s.add(field);
          next[whiskyId] = s;
          return next;
        });
      }
      loadData();
    },
    onDramAdvanced: (data) => {
      const newIdx = data.dramIndex as number | undefined;
      if (newIdx !== undefined) {
        setBreathing(true);
        setTimeout(() => {
          setCurrentDramIdx(newIdx);
          setShowRating(false);
          setBreathing(false);
        }, 350);
      }
    },
  });

  const saveRating = useCallback(async (whiskyId: string, data: RatingData) => {
    const status = tasting?.status;
    if (status !== "open" && status !== "active" && status !== "live") return;

    setSaveStatus({ state: "saving" });
    try {
      await ratingApi.upsert({
        participantId: participantId.current,
        whiskyId,
        tastingId,
        noseScore: data.scores.nose,
        palateScore: data.scores.palate,
        finishScore: data.scores.finish,
        overallScore: data.scores.overall,
        noseTags: data.tags.nose,
        palateTags: data.tags.palate,
        finishTags: data.tags.finish,
        overallTags: data.tags.overall,
        noseNotes: data.notes.nose,
        palateNotes: data.notes.palate,
        finishNotes: data.notes.finish,
        overallNotes: data.notes.overall,
      });
      setMyRatings((prev) => ({ ...prev, [whiskyId]: data }));
      setSaveStatus({ state: "saved" });
      setTimeout(() => setSaveStatus({ state: "idle" }), 2000);
    } catch {
      setSaveStatus({ state: "error" });
      setTimeout(() => setSaveStatus({ state: "idle" }), 3000);
    }
  }, [tastingId, tasting?.status]);

  const handleRatingDone = useCallback((data: RatingData) => {
    const w = whiskies[currentDramIdx];
    if (!w) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveRating(w.id, data);
    }, 500);

    setMyRatings((prev) => ({ ...prev, [w.id]: data }));
    setShowRating(false);
  }, [whiskies, currentDramIdx, saveRating]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleMemoSaved = useCallback((whiskyId: string, memo: MemoData) => {
    setMemos((prev) => ({ ...prev, [whiskyId]: memo }));
  }, []);

  const handleMemoDeleted = useCallback((whiskyId: string) => {
    setMemos((prev) => {
      const next = { ...prev };
      delete next[whiskyId];
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <Spinner color={th.gold} size={32} />
      </div>
    );
  }

  if (!tasting) {
    return (
      <div style={{ padding: `${SP.xl}px ${SP.md}px`, textAlign: "center" }}>
        <p style={{ color: th.muted, fontFamily: FONT.body }}>{t.liveSaveError}</p>
        <button
          onClick={onBack}
          style={{
            marginTop: SP.md,
            padding: `${SP.sm}px ${SP.lg}px`,
            background: th.gold,
            color: "#0e0b05",
            border: "none",
            borderRadius: RADIUS.full,
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 14,
            minHeight: TOUCH_MIN,
          }}
          data-testid="live-error-back"
        >
          {t.back}
        </button>
      </div>
    );
  }

  const status = tasting.status || "draft";

  if (status === "archived") {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px`, textAlign: "center" }}>
        <p style={{ fontFamily: FONT.body, fontSize: 16, color: th.muted, marginBottom: SP.lg }}>
          {t.liveArchived}
        </p>
        <button
          onClick={onBack}
          style={{
            padding: `${SP.md}px ${SP.xl}px`,
            background: th.gold,
            color: "#0e0b05",
            border: "none",
            borderRadius: RADIUS.full,
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 15,
            fontWeight: 600,
            minHeight: TOUCH_MIN,
          }}
          data-testid="live-archived-back"
        >
          {t.back}
        </button>
      </div>
    );
  }

  if (status === "draft" || status === "setup") {
    return (
      <LiveLobby
        th={th}
        t={t}
        tastingName={tasting.title || tasting.name || ""}
        participantName={participantName.current || "?"}
        participants={participants}
        participantId={participantId.current}
        onBack={onBack}
      />
    );
  }

  if (status === "closed" || status === "finished") {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px`, textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: RADIUS.full,
            background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            marginBottom: SP.lg,
          }}
        >
          <Check color="#0e0b05" size={32} />
        </div>
        <h1
          style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 600, color: th.text, marginBottom: SP.sm }}
          data-testid="live-closed-title"
        >
          {t.liveClosed}
        </h1>
        <p
          style={{ fontFamily: FONT.body, fontSize: 15, color: th.muted, marginBottom: SP.xl }}
          data-testid="live-closed-sub"
        >
          {t.liveClosedSub}
        </p>

        {whiskies.length > 0 && (
          <div style={{ marginBottom: SP.xl, textAlign: "left" }}>
            <h3
              style={{
                fontFamily: FONT.body,
                fontSize: 11,
                fontWeight: 500,
                color: th.faint,
                marginBottom: SP.md,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {t.ratingMyRating}
            </h3>
            {whiskies.map((w, idx) => {
              const rating = myRatings[w.id];
              const avg = rating
                ? Math.round((rating.scores.nose + rating.scores.palate + rating.scores.finish + rating.scores.overall) / 4)
                : 0;
              return (
                <div
                  key={w.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: SP.md,
                    padding: `${SP.sm}px ${SP.md}px`,
                    background: th.bgCard,
                    border: `1px solid ${th.border}`,
                    borderRadius: RADIUS.md,
                    marginBottom: SP.sm,
                  }}
                  data-testid={`live-closed-dram-${idx}`}
                >
                  <span style={{ fontFamily: FONT.display, fontSize: 14, color: th.gold, fontWeight: 600, minWidth: 28 }}>
                    #{idx + 1}
                  </span>
                  <span style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, color: th.text }}>
                    {w.name || `${t.liveDram} ${idx + 1}`}
                  </span>
                  {avg > 0 && (
                    <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: th.gold }}>
                      {avg}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <AccountUpgradePromptV2 th={th} t={t} participantId={participantId.current} />

        <button
          onClick={onBack}
          style={{
            width: "100%",
            padding: `${SP.md}px`,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: FONT.body,
            background: th.gold,
            color: "#0e0b05",
            border: "none",
            borderRadius: RADIUS.full,
            cursor: "pointer",
            minHeight: TOUCH_MIN,
            marginTop: SP.md,
          }}
          data-testid="live-to-results"
        >
          {t.liveToResults}
        </button>
      </div>
    );
  }

  const currentWhisky = whiskies[currentDramIdx];
  const isGuided = tasting.guidedMode !== false;
  const dramCount = whiskies.length;

  if (breathing) {
    return (
      <div
        className="v2-breathing-pause"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
          flexDirection: "column",
          gap: SP.md,
        }}
        data-testid="live-breathing"
      >
        <Spinner color={th.gold} size={28} />
        <p style={{ fontFamily: FONT.display, fontSize: 16, color: th.muted }}>
          {t.liveBreathing}
        </p>
      </div>
    );
  }

  if (showRating && currentWhisky) {
    return (
      <RatingFlow
        th={th}
        t={t}
        whisky={{
          id: currentWhisky.id,
          name: currentWhisky.name,
          region: currentWhisky.region,
          cask: currentWhisky.cask,
          blind: currentWhisky.blind !== false && (revealedMap[currentWhisky.id]?.size || 0) === 0,
          flavorProfile: undefined,
        }}
        tastingId={tastingId}
        dramIdx={currentDramIdx + 1}
        total={dramCount}
        tastingStatus={status}
        participantId={participantId.current}
        onDone={handleRatingDone}
        onBack={() => setShowRating(false)}
      />
    );
  }

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.md}px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.lg }}>
        <button
          onClick={onBack}
          data-testid="live-back"
          style={{
            display: "flex",
            alignItems: "center",
            gap: SP.xs,
            background: "none",
            border: "none",
            color: th.text,
            cursor: "pointer",
            padding: 0,
            fontFamily: FONT.body,
            fontSize: 14,
          }}
        >
          <Back color={th.text} size={18} />
        </button>
        <span style={{ flex: 1, fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: th.gold }}>
          {tasting.title || tasting.name || ""}
        </span>
        {saveStatus.state === "saving" && (
          <span style={{ fontSize: 11, color: th.muted, fontFamily: FONT.body }} data-testid="live-saving">
            {t.liveSaving}
          </span>
        )}
        {saveStatus.state === "saved" && (
          <span style={{ fontSize: 11, color: th.green, fontFamily: FONT.body }} data-testid="live-saved">
            <Check color={th.green} size={14} style={{ verticalAlign: "middle", marginRight: 2 }} /> {t.liveSaved}
          </span>
        )}
        {saveStatus.state === "error" && (
          <span style={{ fontSize: 11, color: th.amber, fontFamily: FONT.body }} data-testid="live-save-error">
            {t.liveSaveError}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: SP.xs,
          marginBottom: SP.lg,
          padding: `0 ${SP.xs}px`,
        }}
        data-testid="live-progress"
      >
        {whiskies.map((_, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: idx <= currentDramIdx ? th.gold : th.bgHover,
              transition: "background 0.3s",
            }}
            data-testid={`live-progress-${idx}`}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: SP.sm,
          marginBottom: SP.lg,
          paddingBottom: SP.xs,
        }}
        data-testid="live-dram-tabs"
      >
        {whiskies.map((w, idx) => {
          const isCurrent = idx === currentDramIdx;
          const isLocked = isGuided && idx !== currentDramIdx;
          const hasRating = !!myRatings[w.id];

          return (
            <button
              key={w.id}
              onClick={() => {
                if (!isLocked) {
                  if (idx !== currentDramIdx) {
                    setBreathing(true);
                    setTimeout(() => {
                      setCurrentDramIdx(idx);
                      setShowRating(false);
                      setBreathing(false);
                    }, 350);
                  }
                }
              }}
              disabled={isLocked}
              style={{
                display: "flex",
                alignItems: "center",
                gap: SP.xs,
                padding: `${SP.xs}px ${SP.sm}px`,
                background: isCurrent ? th.bgHover : "transparent",
                border: `1px solid ${isCurrent ? th.gold : th.border}`,
                borderRadius: RADIUS.full,
                color: isCurrent ? th.gold : isLocked ? th.faint : th.muted,
                cursor: isLocked ? "not-allowed" : "pointer",
                fontFamily: FONT.body,
                fontSize: 12,
                fontWeight: isCurrent ? 600 : 400,
                whiteSpace: "nowrap",
                flexShrink: 0,
                opacity: isLocked ? 0.5 : 1,
                minHeight: 32,
              }}
              data-testid={`live-dram-tab-${idx}`}
            >
              {isLocked && <Lock color={th.faint} size={12} />}
              {hasRating && !isLocked && <Check color={th.green} size={12} />}
              <span>#{idx + 1}</span>
            </button>
          );
        })}
      </div>

      {currentWhisky && (
        <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
          <div
            style={{
              padding: `${SP.md}px`,
              background: th.bgCard,
              borderRadius: RADIUS.lg,
              border: `1px solid ${th.border}`,
            }}
            data-testid="live-current-dram"
          >
            <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.md }}>
              <span
                style={{
                  fontFamily: FONT.display,
                  fontSize: 13,
                  fontWeight: 600,
                  color: th.gold,
                }}
              >
                {t.liveDram} {currentDramIdx + 1} {t.liveOf} {dramCount}
              </span>
            </div>

            <RevealSequence
              th={th}
              t={t}
              whisky={currentWhisky}
              revealedFields={revealedMap[currentWhisky.id] || new Set()}
            />
          </div>

          {myRatings[currentWhisky.id] ? (
            <div
              style={{
                padding: `${SP.md}px`,
                background: th.bgCard,
                borderRadius: RADIUS.md,
                border: `1px solid ${th.green}`,
                display: "flex",
                alignItems: "center",
                gap: SP.sm,
              }}
              data-testid="live-rated"
            >
              <Check color={th.green} size={18} />
              <span style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, color: th.text }}>
                {t.ratingDone}
              </span>
              <button
                onClick={() => setShowRating(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: SP.xs,
                  padding: `${SP.xs}px ${SP.sm}px`,
                  background: th.bgHover,
                  border: "none",
                  borderRadius: RADIUS.sm,
                  color: th.gold,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 12,
                }}
                data-testid="live-edit-rating"
              >
                {t.ratingEdit}
                <ChevronRight color={th.gold} size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRating(true)}
              style={{
                width: "100%",
                padding: `${SP.md}px`,
                fontSize: 16,
                fontWeight: 600,
                fontFamily: FONT.body,
                background: th.gold,
                color: "#0e0b05",
                border: "none",
                borderRadius: RADIUS.full,
                cursor: "pointer",
                minHeight: TOUCH_MIN,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: SP.sm,
              }}
              data-testid="live-rate-btn"
            >
              {t.ratingMyRating}
              <ChevronRight color="#0e0b05" size={18} />
            </button>
          )}

          <LiveVoiceMemo
            th={th}
            t={t}
            participantId={participantId.current}
            memo={memos[currentWhisky.id] || null}
            onMemoSaved={(memo) => handleMemoSaved(currentWhisky.id, memo)}
            onMemoDeleted={() => handleMemoDeleted(currentWhisky.id)}
          />

          <LiveAmbient th={th} t={t} />

          {!isGuided && (
            <div style={{ display: "flex", gap: SP.sm }}>
              {currentDramIdx > 0 && (
                <button
                  onClick={() => {
                    setBreathing(true);
                    setTimeout(() => {
                      setCurrentDramIdx((i) => i - 1);
                      setShowRating(false);
                      setBreathing(false);
                    }, 350);
                  }}
                  style={{
                    flex: 1,
                    padding: `${SP.sm}px`,
                    fontSize: 14,
                    fontFamily: FONT.body,
                    background: th.bgCard,
                    color: th.text,
                    border: `1px solid ${th.border}`,
                    borderRadius: RADIUS.full,
                    cursor: "pointer",
                    minHeight: TOUCH_MIN,
                  }}
                  data-testid="live-prev-dram"
                >
                  {t.livePrevDram}
                </button>
              )}
              {currentDramIdx < dramCount - 1 && (
                <button
                  onClick={() => {
                    setBreathing(true);
                    setTimeout(() => {
                      setCurrentDramIdx((i) => i + 1);
                      setShowRating(false);
                      setBreathing(false);
                    }, 350);
                  }}
                  style={{
                    flex: 1,
                    padding: `${SP.sm}px`,
                    fontSize: 14,
                    fontFamily: FONT.body,
                    background: th.bgCard,
                    color: th.text,
                    border: `1px solid ${th.border}`,
                    borderRadius: RADIUS.full,
                    cursor: "pointer",
                    minHeight: TOUCH_MIN,
                  }}
                  data-testid="live-next-dram"
                >
                  {t.liveNextDram}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
