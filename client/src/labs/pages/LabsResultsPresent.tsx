import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, Trophy, Wine, Users, BarChart3,
  Star, Target, MessageCircle, Maximize, Minimize, Loader2,
} from "lucide-react";
import { tastingApi, whiskyApi, ratingApi, presentationApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import WhiskyImage from "@/labs/components/WhiskyImage";
import LabsScoreRing from "@/labs/components/LabsScoreRing";

interface LabsResultsPresentProps {
  params: { id: string };
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDAL_LABELS = ["Gold", "Silver", "Bronze"];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 300, damping: 30 },
  opacity: { duration: 0.25 },
  scale: { duration: 0.25 },
};

function DimBar({ label, value, maxScore, delay }: { label: string; value: number | null; maxScore: number; delay: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const pct = value != null ? Math.min((value / maxScore) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span style={{ width: 60, fontSize: 13, fontWeight: 600, color: "var(--labs-text-muted)", textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: animated ? `${pct}%` : "0%",
          background: "var(--labs-accent)",
          borderRadius: 4,
          transition: "width 800ms cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
      <span style={{ width: 36, fontSize: 13, fontWeight: 700, color: "var(--labs-text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value != null ? Math.round(value * 10) / 10 : "—"}
      </span>
    </div>
  );
}

function TitleSlide({ tasting, whiskyCount, participantCount, totalRatings }: {
  tasting: any; whiskyCount: number; participantCount: number; totalRatings: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Wine style={{ width: 48, height: 48, color: "var(--labs-accent)", marginBottom: 24 }} />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="labs-serif"
        style={{ fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 700, color: "var(--labs-text)", marginBottom: 12, lineHeight: 1.1 }}
        data-testid="present-title"
      >
        {tasting.title || "Tasting Results"}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ fontSize: "clamp(14px, 2vw, 20px)", color: "var(--labs-text-muted)", marginBottom: 32 }}
      >
        {[tasting.date, tasting.location].filter(Boolean).join(" · ")}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}
      >
        <StatBubble icon={<Wine style={{ width: 20, height: 20 }} />} value={whiskyCount} label="Whiskies" />
        <StatBubble icon={<Users style={{ width: 20, height: 20 }} />} value={participantCount} label="Tasters" />
        <StatBubble icon={<Star style={{ width: 20, height: 20 }} />} value={totalRatings} label="Ratings" />
      </motion.div>
    </div>
  );
}

function StatBubble({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ color: "var(--labs-accent)" }}>{icon}</div>
      <span style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)" }}>{value}</span>
      <span style={{ fontSize: 12, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    </div>
  );
}

function OverviewSlide({ sorted, maxScore }: { sorted: any[]; maxScore: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", padding: "40px 24px", maxWidth: 700, margin: "0 auto", width: "100%" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}
      >
        <BarChart3 style={{ width: 24, height: 24, color: "var(--labs-accent)" }} />
        <h2 className="labs-serif" style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
          Rankings Overview
        </h2>
      </motion.div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.slice(0, 8).map((w, i) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: i < 3 ? "rgba(212, 162, 86, 0.08)" : "transparent",
              border: i < 3 ? "1px solid rgba(212, 162, 86, 0.15)" : "1px solid transparent",
            }}
            data-testid={`present-overview-row-${i}`}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              background: i < 3 ? MEDAL_COLORS[i] : "rgba(255,255,255,0.06)",
              color: i === 0 ? "#78350f" : i === 1 ? "#1f2937" : i === 2 ? "#451a03" : "var(--labs-text-muted)",
            }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {w.name || "Unknown"}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>
              {w.avgOverall != null ? (Math.round(w.avgOverall * 10) / 10) : "—"}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function WhiskySlide({ whisky, rank, totalWhiskies, maxScore }: {
  whisky: any; rank: number; totalWhiskies: number; maxScore: number;
}) {
  const isTop3 = rank <= 3;
  const stdDev = whisky.overallStdDev;
  const isConsensus = stdDev != null && whisky.ratingCount >= 2 && stdDev <= 5;
  const isDebated = stdDev != null && whisky.ratingCount >= 2 && stdDev > 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "32px 24px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
      >
        {isTop3 && (
          <span style={{
            width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, background: MEDAL_COLORS[rank - 1],
            color: rank === 1 ? "#78350f" : rank === 2 ? "#1f2937" : "#451a03",
          }}>
            {rank}
          </span>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          #{rank} of {totalWhiskies}
        </span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ marginBottom: 16 }}
      >
        <WhiskyImage imageUrl={whisky.imageUrl} name={whisky.name || "?"} size={120} height={120} whiskyId={whisky.id} />
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="labs-serif"
        style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 700, color: "var(--labs-text)", textAlign: "center", marginBottom: 4, lineHeight: 1.15 }}
        data-testid={`present-whisky-name-${rank}`}
      >
        {whisky.name || "Unknown"}
      </motion.h2>

      {whisky.distillery && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          style={{ fontSize: 15, color: "var(--labs-text-muted)", marginBottom: 4, textAlign: "center" }}
        >
          {whisky.distillery}
        </motion.p>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}
      >
        {whisky.ratingCount > 0 && (
          <span style={{ fontSize: 12, color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Users style={{ width: 12, height: 12 }} /> {whisky.ratingCount} ratings
          </span>
        )}
        {isConsensus && (
          <span className="labs-badge labs-badge-success" style={{ fontSize: 11 }} data-testid={`present-badge-consensus-${rank}`}>
            <Target style={{ width: 12, height: 12 }} /> Consensus
          </span>
        )}
        {isDebated && (
          <span className="labs-badge labs-badge-danger" style={{ fontSize: 11 }} data-testid={`present-badge-debated-${rank}`}>
            <MessageCircle style={{ width: 12, height: 12 }} /> Debated
          </span>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
        style={{ marginBottom: 24 }}
      >
        <LabsScoreRing
          score={whisky.avgOverall ?? 0}
          maxScore={maxScore}
          size={110}
          strokeWidth={7}
          showValue
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        style={{ width: "100%", maxWidth: 400 }}
      >
        <DimBar label="Nose" value={whisky.avgNose} maxScore={maxScore} delay={500} />
        <DimBar label="Taste" value={whisky.avgTaste} maxScore={maxScore} delay={600} />
        <DimBar label="Finish" value={whisky.avgFinish} maxScore={maxScore} delay={700} />
        <DimBar label="Balance" value={whisky.avgBalance} maxScore={maxScore} delay={800} />
      </motion.div>
    </div>
  );
}

function PodiumSlide({ top3, maxScore }: { top3: any[]; maxScore: number }) {
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumHeights = [160, 200, 130];
  const displayOrder = top3.length >= 3 ? [1, 0, 2] : top3.map((_, i) => i);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "32px 24px" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}
      >
        <Trophy style={{ width: 32, height: 32, color: "var(--labs-accent)" }} />
        <h2 className="labs-serif" style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
          Podium
        </h2>
      </motion.div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "clamp(12px, 3vw, 32px)", maxWidth: 700, width: "100%" }}>
        {podiumOrder.map((w, i) => {
          const actualRank = displayOrder[i];
          const h = podiumHeights[i] || 130;
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 200 }}
              data-testid={`present-podium-${actualRank + 1}`}
            >
              <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={actualRank === 0 ? 80 : 64} height={actualRank === 0 ? 80 : 64} whiskyId={w.id} />
              <p className="labs-serif" style={{
                fontSize: actualRank === 0 ? 16 : 14,
                fontWeight: 700,
                color: "var(--labs-text)",
                textAlign: "center",
                marginTop: 8,
                marginBottom: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}>
                {w.name || "Unknown"}
              </p>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-accent)", marginBottom: 8 }}>
                {w.avgOverall != null ? (Math.round(w.avgOverall * 10) / 10) : "—"}
              </span>
              <div style={{
                width: "100%",
                height: h,
                borderRadius: "12px 12px 0 0",
                background: `linear-gradient(180deg, ${MEDAL_COLORS[actualRank]}33 0%, ${MEDAL_COLORS[actualRank]}11 100%)`,
                border: `1px solid ${MEDAL_COLORS[actualRank]}44`,
                borderBottom: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: 16,
              }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, background: MEDAL_COLORS[actualRank],
                  color: actualRank === 0 ? "#78350f" : actualRank === 1 ? "#1f2937" : "#451a03",
                }}>
                  {actualRank + 1}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-text-muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {MEDAL_LABELS[actualRank]}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function OutroSlide({ tasting }: { tasting: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <Wine style={{ width: 56, height: 56, color: "var(--labs-accent)", marginBottom: 24 }} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="labs-serif"
        style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, color: "var(--labs-text)", marginBottom: 12 }}
      >
        Cheers!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ fontSize: "clamp(14px, 2vw, 20px)", color: "var(--labs-text-muted)", maxWidth: 400 }}
      >
        Thank you for tasting with us.
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 24, opacity: 0.75 }}
      >
        {tasting.title} · CaskSense Labs
      </motion.p>
    </div>
  );
}

export default function LabsResultsPresent({ params }: LabsResultsPresentProps) {
  const tastingId = params.id;
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const { data: tasting, isLoading: loadingTasting } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
  });

  const { data: whiskies, isLoading: loadingWhiskies } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: allRatings } = useQuery({
    queryKey: ["tastingRatings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: participants } = useQuery({
    queryKey: ["tastingParticipants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
  });

  const maxScore = tasting?.ratingScale || 100;

  const whiskyResults = useMemo(() => {
    return (whiskies || []).map((w: any) => {
      const ratings = (allRatings || []).filter((r: any) => r.whiskyId === w.id);
      const count = ratings.length;
      const avg = (dim: string) => {
        const vals = ratings.map((r: any) => r[dim]).filter((v: any) => v != null && v > 0);
        if (vals.length === 0) return null;
        return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
      };
      const stdDev = (dim: string) => {
        const vals = ratings.map((r: any) => r[dim]).filter((v: any) => v != null && v > 0);
        if (vals.length < 2) return null;
        const mean = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
        const variance = vals.reduce((sum: number, v: number) => sum + (v - mean) ** 2, 0) / vals.length;
        return Math.sqrt(variance);
      };
      return {
        ...w,
        ratingCount: count,
        avgOverall: avg("overall"),
        avgNose: avg("nose"),
        avgTaste: avg("taste"),
        avgFinish: avg("finish"),
        avgBalance: avg("balance"),
        overallStdDev: stdDev("overall"),
      };
    });
  }, [whiskies, allRatings]);

  const sorted = useMemo(() => [...whiskyResults].sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0)), [whiskyResults]);

  const slides = useMemo(() => {
    const s: { type: string; data?: any }[] = [];
    s.push({ type: "title" });
    if (sorted.length > 1) {
      s.push({ type: "overview" });
    }
    sorted.forEach((w, i) => {
      s.push({ type: "whisky", data: { whisky: w, rank: i + 1 } });
    });
    if (sorted.length >= 3) {
      s.push({ type: "podium", data: { top3: sorted.slice(0, 3) } });
    }
    s.push({ type: "outro" });
    return s;
  }, [sorted]);

  const totalSlides = slides.length;

  const hostId = currentParticipant?.id;
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncSlide = useCallback((slide: number) => {
    if (!hostId || !tastingId) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      presentationApi.setSlide(tastingId, hostId, slide).catch(() => {});
    }, 150);
  }, [hostId, tastingId]);

  const isAllowedForPresentation = tasting?.status === "archived" || tasting?.status === "completed" || tasting?.status === "closed" || tasting?.status === "reveal";
  const isHostUser = tasting?.hostId === hostId;

  useEffect(() => {
    if (hostId && tastingId && tasting && isHostUser && isAllowedForPresentation) {
      presentationApi.start(tastingId, hostId).catch(() => {});
    }
  }, [hostId, tastingId, !!tasting, isHostUser, isAllowedForPresentation]);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= totalSlides) return;
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
    syncSlide(index);
  }, [currentSlide, totalSlides, syncSlide]);

  const goNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      const next = currentSlide + 1;
      setDirection(1);
      setCurrentSlide(next);
      syncSlide(next);
    }
  }, [currentSlide, totalSlides, syncSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      const prev = currentSlide - 1;
      setDirection(-1);
      setCurrentSlide(prev);
      syncSlide(prev);
    }
  }, [currentSlide, syncSlide]);

  const exitPresentation = useCallback(() => {
    if (hostId && tastingId) {
      presentationApi.stop(tastingId, hostId).catch(() => {});
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    navigate(`/labs/results/${tastingId}`);
  }, [navigate, tastingId, hostId]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hostId && tastingId) {
        navigator.sendBeacon(
          `/api/tastings/${tastingId}/presentation-stop`,
          new Blob([JSON.stringify({ hostId })], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (hostId && tastingId) {
        presentationApi.stop(tastingId, hostId).catch(() => {});
      }
    };
  }, [hostId, tastingId]);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
    if (isDesktop && containerRef.current && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        exitPresentation();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, exitPresentation]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  }, [goNext, goPrev]);

  if (loadingTasting || loadingWhiskies) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: "var(--z-overlay)",
        background: "var(--labs-bg)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const isHost = tasting?.hostId === currentParticipant?.id;
  const isAllowedStatus = tasting?.status === "archived" || tasting?.status === "completed" || tasting?.status === "closed" || tasting?.status === "reveal";

  if (!tasting || !isHost || !isAllowedStatus) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: "var(--z-overlay)",
        background: "var(--labs-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <Wine style={{ width: 40, height: 40, color: "var(--labs-text-muted)" }} />
        <p style={{ color: "var(--labs-text-muted)" }}>{!tasting ? "Tasting not found" : "Presentation not available yet"}</p>
        <button className="labs-btn-secondary" onClick={() => navigate(`/labs/results/${tastingId}`)} data-testid="present-back-btn">
          Back to Results
        </button>
      </div>
    );
  }

  const participantCount = participants?.length || 0;
  const totalRatings = allRatings?.length || 0;
  const viewerCount = Math.max(0, participantCount - 1);
  const slide = slides[currentSlide];

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-overlay)",
        background: "var(--labs-bg)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
      }}
      data-testid="present-container"
    >
      <div style={{
        position: "absolute", top: 12, left: 16, right: 16, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <button
            onClick={exitPresentation}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--labs-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              backdropFilter: "blur(8px)",
            }}
            data-testid="present-exit-btn"
          >
            <X style={{ width: 16, height: 16 }} />
            <span className="hidden sm:inline">Exit</span>
          </button>
          <span
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 8,
              background: "rgba(212, 162, 86, 0.12)", border: "1px solid rgba(212, 162, 86, 0.25)",
              fontSize: 12, fontWeight: 600, color: "var(--labs-accent)",
              backdropFilter: "blur(8px)",
            }}
            data-testid="present-live-indicator"
          >
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--labs-accent)", animation: "pulse 2s infinite" }} />
            LIVE
            {viewerCount > 0 && (
              <span style={{ color: "var(--labs-text-muted)", fontWeight: 400 }}>
                · {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
              </span>
            )}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: "var(--labs-text-muted)",
            padding: "4px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)",
            fontVariantNumeric: "tabular-nums",
          }} data-testid="present-slide-indicator">
            {currentSlide + 1} / {totalSlides}
          </span>
          <button
            onClick={toggleFullscreen}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--labs-text-muted)", cursor: "pointer", backdropFilter: "blur(8px)",
            }}
            data-testid="present-fullscreen-btn"
          >
            {isFullscreen ? <Minimize style={{ width: 14, height: 14 }} /> : <Maximize style={{ width: 14, height: 14 }} />}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            style={{ position: "absolute", inset: 0 }}
          >
            {slide.type === "title" && (
              <TitleSlide tasting={tasting} whiskyCount={sorted.length} participantCount={participantCount} totalRatings={totalRatings} />
            )}
            {slide.type === "overview" && (
              <OverviewSlide sorted={sorted} maxScore={maxScore} />
            )}
            {slide.type === "whisky" && (
              <WhiskySlide whisky={slide.data.whisky} rank={slide.data.rank} totalWhiskies={sorted.length} maxScore={maxScore} />
            )}
            {slide.type === "podium" && (
              <PodiumSlide top3={slide.data.top3} maxScore={maxScore} />
            )}
            {slide.type === "outro" && (
              <OutroSlide tasting={tasting} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "12px 16px 20px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
        background: "linear-gradient(transparent, var(--labs-bg))",
        zIndex: 10,
      }}>
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          style={{
            width: 44, height: 44, borderRadius: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: currentSlide === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: currentSlide === 0 ? "rgba(255,255,255,0.15)" : "var(--labs-text)",
            cursor: currentSlide === 0 ? "default" : "pointer",
            transition: "all 0.15s",
          }}
          data-testid="present-prev-btn"
        >
          <ChevronLeft style={{ width: 20, height: 20 }} />
        </button>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }} data-testid="present-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === currentSlide ? 20 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                background: i === currentSlide ? "var(--labs-accent)" : "rgba(255,255,255,0.15)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                padding: 0,
              }}
              data-testid={`present-dot-${i}`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          style={{
            width: 44, height: 44, borderRadius: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: currentSlide === totalSlides - 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: currentSlide === totalSlides - 1 ? "rgba(255,255,255,0.15)" : "var(--labs-text)",
            cursor: currentSlide === totalSlides - 1 ? "default" : "pointer",
            transition: "all 0.15s",
          }}
          data-testid="present-next-btn"
        >
          <ChevronRight style={{ width: 20, height: 20 }} />
        </button>
      </div>
    </div>
  );
}
