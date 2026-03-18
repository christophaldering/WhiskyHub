import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, Trophy, Wine, Users, BarChart3,
  Star, Target, MessageCircle, Maximize, Minimize, Loader2,
  TrendingUp, TrendingDown, MapPin, Calendar, Download,
  Sparkles, Quote, Flame, Eye,
} from "lucide-react";
import { tastingApi, whiskyApi, ratingApi, presentationApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import WhiskyImage from "@/labs/components/WhiskyImage";
import LabsScoreRing from "@/labs/components/LabsScoreRing";
import { stripGuestSuffix } from "@/lib/utils";

interface LabsResultsPresentProps {
  params: { id: string };
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDAL_LABELS = ["Gold", "Silver", "Bronze"];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.96,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
    scale: 0.96,
  }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 350, damping: 32 },
  opacity: { duration: 0.2 },
  scale: { duration: 0.2 },
};

function AnimatedCounter({ value, duration = 1200, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const startTime = Date.now() + delay;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) return;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress >= 1) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [value, duration, delay]);
  return <>{display}</>;
}

function DimBar({ label, value, maxScore, delay }: { label: string; value: number | null; maxScore: number; delay: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const pct = value != null ? Math.min((value / maxScore) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
      <span style={{ width: 56, fontSize: 13, fontWeight: 600, color: "var(--labs-text-muted)", textAlign: "right", letterSpacing: "0.02em" }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: animated ? `${pct}%` : "0%",
          background: "linear-gradient(90deg, var(--labs-accent), #e8c878)",
          borderRadius: 3,
          transition: "width 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }} />
      </div>
      <span style={{ width: 38, fontSize: 14, fontWeight: 700, color: "var(--labs-text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value != null ? Math.round(value * 10) / 10 : "—"}
      </span>
    </div>
  );
}

function GlassCard({ children, accent, style }: { children: React.ReactNode; accent?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: accent ? "rgba(212,162,86,0.06)" : "rgba(255,255,255,0.03)",
      border: accent ? "1px solid rgba(212,162,86,0.2)" : "1px solid rgba(255,255,255,0.06)",
      borderRadius: 20,
      backdropFilter: "blur(12px)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      {icon && <span style={{ color: "var(--labs-accent)", display: "flex" }}>{icon}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

function CinematicTitleSlide({ tasting, whiskyCount, participantCount, totalRatings }: {
  tasting: any; whiskyCount: number; participantCount: number; totalRatings: number;
}) {
  const hasCover = !!tasting.coverImageUrl;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
      {hasCover && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${tasting.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.15, filter: "blur(8px) saturate(0.7)" }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 28px",
            background: "linear-gradient(135deg, rgba(212,162,86,0.15), rgba(212,162,86,0.05))",
            border: "1px solid rgba(212,162,86,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Wine style={{ width: 32, height: 32, color: "var(--labs-accent)" }} />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }}
          className="labs-serif"
          style={{ fontSize: "clamp(30px, 5vw, 60px)", fontWeight: 700, color: "var(--labs-text)", marginBottom: 12, lineHeight: 1.05, maxWidth: 900 }}
          data-testid="present-title"
        >
          {tasting.title || "Tasting Results"}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 40, flexWrap: "wrap" }}
        >
          {tasting.date && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, color: "var(--labs-text-muted)" }}>
              <Calendar style={{ width: 14, height: 14, opacity: 0.6 }} /> {tasting.date}
            </span>
          )}
          {tasting.location && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, color: "var(--labs-text-muted)" }}>
              <MapPin style={{ width: 14, height: 14, opacity: 0.6 }} /> {tasting.location}
            </span>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}
        >
          {[
            { icon: <Wine style={{ width: 18, height: 18 }} />, value: whiskyCount, label: "Whiskies" },
            { icon: <Users style={{ width: 18, height: 18 }} />, value: participantCount, label: "Tasters" },
            { icon: <Star style={{ width: 18, height: 18 }} />, value: totalRatings, label: "Ratings" },
          ].map((s, i) => (
            <GlassCard key={i} style={{ padding: "16px 28px", textAlign: "center" }}>
              <div style={{ color: "var(--labs-accent)", marginBottom: 6, display: "flex", justifyContent: "center" }}>{s.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                <AnimatedCounter value={s.value} delay={700 + i * 200} />
              </div>
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            </GlassCard>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function LineupSlide({ whiskies, blindMode }: { whiskies: any[]; blindMode: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 24px" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionLabel icon={<Wine style={{ width: 14, height: 14 }} />}>Tonight's Lineup</SectionLabel>
        <h2 className="labs-serif" style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, color: "var(--labs-text)", margin: "4px 0 32px", textAlign: "center" }}>
          {whiskies.length} {whiskies.length === 1 ? "Whisky" : "Whiskies"} Tasted
        </h2>
      </motion.div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: 900 }}>
        {whiskies.map((w: any, i: number) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.06 }}
          >
            <GlassCard style={{ padding: 16, textAlign: "center", width: "clamp(100px, 15vw, 140px)" }}>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
                <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={60} height={70} whiskyId={w.id} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {blindMode ? `Dram ${String.fromCharCode(65 + i)}` : (w.name || `#${i + 1}`)}
              </div>
              {!blindMode && w.distillery && (
                <div style={{ fontSize: 10, color: "var(--labs-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.distillery}</div>
              )}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TastersSlide({ participants, totalRatings, whiskyCount }: { participants: any[]; totalRatings: number; whiskyCount: number }) {
  const names = participants.map((p: any) => stripGuestSuffix(p.participant?.name || p.participant?.email || p.name || p.email || "Anonymous"));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 24px" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionLabel icon={<Users style={{ width: 14, height: 14 }} />}>The Tasters</SectionLabel>
        <h2 className="labs-serif" style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, color: "var(--labs-text)", margin: "4px 0 32px", textAlign: "center" }}>
          {names.length} Palates, One Mission
        </h2>
      </motion.div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 700, marginBottom: 36 }}>
        {names.map((name, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.04 }}
          >
            <GlassCard accent style={{ padding: "8px 20px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, var(--labs-accent), #e8c878)",
                color: "var(--labs-bg)", fontSize: 11, fontWeight: 700,
              }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>{name}</span>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + names.length * 0.02 }}
        style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{totalRatings}</div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ratings Given</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{whiskyCount}</div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Whiskies Explored</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>
            {names.length > 0 ? Math.round(totalRatings / names.length * 10) / 10 : 0}
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg per Taster</div>
        </div>
      </motion.div>
    </div>
  );
}

function FunStatsSlide({ stats }: { stats: Array<{ icon: React.ReactNode; label: string; value: string; sub?: string }> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 24px" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionLabel icon={<Sparkles style={{ width: 14, height: 14 }} />}>Highlights</SectionLabel>
        <h2 className="labs-serif" style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, color: "var(--labs-text)", margin: "4px 0 36px", textAlign: "center" }}>
          By the Numbers
        </h2>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, maxWidth: 700, width: "100%" }}>
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <GlassCard accent style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ color: "var(--labs-accent)", display: "flex" }}>{stat.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{stat.label}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)", lineHeight: 1.2 }}>{stat.value}</div>
              {stat.sub && <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 4 }}>{stat.sub}</div>}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TransitionSlide({ title, subtitle, icon }: { title: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 150 }}
        style={{ marginBottom: 24, color: "var(--labs-accent)" }}
      >
        {icon}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
        className="labs-serif"
        style={{ fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 700, color: "var(--labs-text)", lineHeight: 1.05, maxWidth: 700 }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ fontSize: "clamp(14px, 2vw, 20px)", color: "var(--labs-text-muted)", marginTop: 12, maxWidth: 500 }}
        >
          {subtitle}
        </motion.p>
      )}
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

  const details = [whisky.region, whisky.country, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null, whisky.category, whisky.caskInfluence].filter(Boolean);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "32px 24px" }}>
      <div style={{ display: "flex", gap: "clamp(24px, 4vw, 60px)", alignItems: "center", maxWidth: 900, width: "100%", flexWrap: "wrap", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}
        >
          <div style={{ position: "relative" }}>
            {isTop3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                style={{
                  position: "absolute", top: -12, right: -12, zIndex: 2,
                  width: 36, height: 36, borderRadius: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800,
                  background: MEDAL_COLORS[rank - 1],
                  color: rank === 1 ? "#78350f" : rank === 2 ? "#1f2937" : "#451a03",
                  boxShadow: `0 4px 12px ${MEDAL_COLORS[rank - 1]}66`,
                }}
              >
                {rank}
              </motion.div>
            )}
            <WhiskyImage imageUrl={whisky.imageUrl} name={whisky.name || "?"} size={140} height={170} whiskyId={whisky.id} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          style={{ flex: 1, minWidth: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              #{rank} of {totalWhiskies}
            </span>
            {isConsensus && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--labs-success)", background: "var(--labs-success-muted)", padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                <Target style={{ width: 10, height: 10 }} /> Consensus
              </span>
            )}
            {isDebated && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--labs-danger)", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                <MessageCircle style={{ width: 10, height: 10 }} /> Debated
              </span>
            )}
          </div>

          <h2 className="labs-serif" style={{ fontSize: "clamp(22px, 3.5vw, 38px)", fontWeight: 700, color: "var(--labs-text)", lineHeight: 1.1, marginBottom: 4 }} data-testid={`present-whisky-name-${rank}`}>
            {whisky.name || "Unknown"}
          </h2>

          {whisky.distillery && (
            <p style={{ fontSize: 15, color: "var(--labs-text-muted)", marginBottom: 4 }}>{whisky.distillery}</p>
          )}

          {details.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 16, opacity: 0.8 }}>
              {details.join(" · ")}
            </p>
          )}

          {(whisky.hostNotes || whisky.hostSummary) && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(212,162,86,0.06)", border: "1px solid rgba(212,162,86,0.12)", marginBottom: 16 }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Quote style={{ width: 14, height: 14, color: "var(--labs-accent)", flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.5, fontStyle: "italic", margin: 0 }}>
                  {(whisky.hostSummary || whisky.hostNotes || "").slice(0, 200)}
                  {((whisky.hostSummary || whisky.hostNotes || "").length > 200) ? "…" : ""}
                </p>
              </div>
            </motion.div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 16 }}>
            <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
              <LabsScoreRing score={whisky.avgOverall ?? 0} maxScore={maxScore} size={90} strokeWidth={6} showValue />
            </motion.div>
            <div style={{ flex: 1 }}>
              <DimBar label="Nose" value={whisky.avgNose} maxScore={maxScore} delay={450} />
              <DimBar label="Taste" value={whisky.avgTaste} maxScore={maxScore} delay={550} />
              <DimBar label="Finish" value={whisky.avgFinish} maxScore={maxScore} delay={650} />
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Users style={{ width: 11, height: 11 }} /> {whisky.ratingCount} {whisky.ratingCount === 1 ? "rating" : "ratings"}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function WinnerRevealSlide({ whisky, maxScore }: { whisky: any; maxScore: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "32px 24px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(255,215,0,0.15); }
          50% { box-shadow: 0 0 80px rgba(255,215,0,0.3); }
        }
        .winner-ring { animation: glow-pulse 3s ease-in-out infinite; }
        .winner-title {
          background: linear-gradient(90deg, var(--labs-accent), #e8c878, var(--labs-accent));
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 120 }}
        style={{ marginBottom: 8 }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center",
          background: MEDAL_COLORS[0], color: "#78350f", fontSize: 20, fontWeight: 800,
          boxShadow: `0 0 30px ${MEDAL_COLORS[0]}66`,
        }}>
          <Trophy style={{ width: 24, height: 24 }} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <SectionLabel>Tonight's Winner</SectionLabel>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
        style={{ marginBottom: 16 }}
      >
        <WhiskyImage imageUrl={whisky.imageUrl} name={whisky.name || "?"} size={150} height={180} whiskyId={whisky.id} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
        className="labs-serif winner-title"
        style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, textAlign: "center", marginBottom: 8, lineHeight: 1.1 }}
      >
        {whisky.name || "Unknown"}
      </motion.h2>

      {whisky.distillery && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          style={{ fontSize: 16, color: "var(--labs-text-muted)", marginBottom: 20 }}
        >
          {whisky.distillery}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, type: "spring", stiffness: 150 }}
        className="winner-ring"
        style={{ borderRadius: "50%" }}
      >
        <LabsScoreRing score={whisky.avgOverall ?? 0} maxScore={maxScore} size={130} strokeWidth={8} showValue />
      </motion.div>
    </div>
  );
}

function PodiumSlide({ top3, maxScore }: { top3: any[]; maxScore: number }) {
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumHeights = [170, 220, 140];
  const displayOrder = top3.length >= 3 ? [1, 0, 2] : top3.map((_, i) => i);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "32px 24px" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}
      >
        <Trophy style={{ width: 28, height: 28, color: "var(--labs-accent)" }} />
        <h2 className="labs-serif" style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
          The Podium
        </h2>
      </motion.div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "clamp(12px, 3vw, 32px)", maxWidth: 750, width: "100%" }}>
        {podiumOrder.map((w, i) => {
          const actualRank = displayOrder[i];
          const h = podiumHeights[i] || 140;
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.2, type: "spring", stiffness: 120 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 220 }}
              data-testid={`present-podium-${actualRank + 1}`}
            >
              <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={actualRank === 0 ? 90 : 70} height={actualRank === 0 ? 100 : 80} whiskyId={w.id} />
              <p className="labs-serif" style={{
                fontSize: actualRank === 0 ? 16 : 14, fontWeight: 700, color: "var(--labs-text)",
                textAlign: "center", marginTop: 10, marginBottom: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
              }}>
                {w.name || "Unknown"}
              </p>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-accent)", marginBottom: 10, fontVariantNumeric: "tabular-nums" }}>
                {w.avgOverall != null ? (Math.round(w.avgOverall * 10) / 10) : "—"}
              </span>
              <div style={{
                width: "100%", height: h, borderRadius: "14px 14px 0 0",
                background: `linear-gradient(180deg, ${MEDAL_COLORS[actualRank]}22 0%, ${MEDAL_COLORS[actualRank]}08 100%)`,
                border: `1px solid ${MEDAL_COLORS[actualRank]}33`,
                borderBottom: "none",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 20,
              }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800,
                  background: MEDAL_COLORS[actualRank],
                  color: actualRank === 0 ? "#78350f" : actualRank === 1 ? "#1f2937" : "#451a03",
                  boxShadow: `0 4px 16px ${MEDAL_COLORS[actualRank]}55`,
                }}>
                  {actualRank + 1}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
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

function OutroSlide({ tasting, tastingId }: { tasting: any; tastingId: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (format: "csv" | "xlsx") => {
    setDownloading(format);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/results/export?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(tasting.title || "tasting").replace(/\s+/g, "_")}_results.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {}
    setDownloading(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: "spring" }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: "0 auto 28px",
          background: "linear-gradient(135deg, rgba(212,162,86,0.12), rgba(212,162,86,0.04))",
          border: "1px solid rgba(212,162,86,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Wine style={{ width: 36, height: 36, color: "var(--labs-accent)" }} />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="labs-serif"
        style={{ fontSize: "clamp(30px, 5vw, 56px)", fontWeight: 700, color: "var(--labs-text)", marginBottom: 12 }}
      >
        Slàinte Mhath!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "var(--labs-text-muted)", maxWidth: 450, lineHeight: 1.6, marginBottom: 36 }}
      >
        Thank you for sharing this tasting journey with us.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
      >
        <button
          onClick={() => handleDownload("csv")}
          disabled={!!downloading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 24px", borderRadius: 12,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            color: "var(--labs-text)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            opacity: downloading === "csv" ? 0.6 : 1,
          }}
          data-testid="present-download-csv"
        >
          {downloading === "csv" ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 14, height: 14 }} />}
          Download CSV
        </button>
        <button
          onClick={() => handleDownload("xlsx")}
          disabled={!!downloading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 24px", borderRadius: 12,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            color: "var(--labs-text)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            opacity: downloading === "xlsx" ? 0.6 : 1,
          }}
          data-testid="present-download-xlsx"
        >
          {downloading === "xlsx" ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 14, height: 14 }} />}
          Download Excel
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 32, opacity: 0.6 }}
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
      return { ...w, ratingCount: count, avgOverall: avg("overall"), avgNose: avg("nose"), avgTaste: avg("taste"), avgFinish: avg("finish"), overallStdDev: stdDev("overall") };
    });
  }, [whiskies, allRatings]);

  const sorted = useMemo(() => [...whiskyResults].sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0)), [whiskyResults]);

  const funStats = useMemo(() => {
    const stats: Array<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = [];
    if (sorted.length === 0) return stats;

    const groupAvg = sorted.reduce((s, w) => s + (w.avgOverall || 0), 0) / sorted.length;
    stats.push({ icon: <BarChart3 style={{ width: 16, height: 16 }} />, label: "Group Average", value: `${Math.round(groupAvg * 10) / 10}`, sub: `across ${sorted.length} whiskies` });

    const withStdDev = sorted.filter(w => w.overallStdDev != null && w.ratingCount >= 2);
    const mostAgreed = withStdDev.sort((a, b) => (a.overallStdDev || 999) - (b.overallStdDev || 999))[0];
    if (mostAgreed) stats.push({ icon: <Target style={{ width: 16, height: 16 }} />, label: "Most Agreed", value: mostAgreed.name || "Unknown", sub: `σ = ${Math.round((mostAgreed.overallStdDev || 0) * 10) / 10}` });

    const mostDebated = [...withStdDev].sort((a, b) => (b.overallStdDev || 0) - (a.overallStdDev || 0))[0];
    if (mostDebated && mostDebated.id !== mostAgreed?.id) stats.push({ icon: <MessageCircle style={{ width: 16, height: 16 }} />, label: "Most Debated", value: mostDebated.name || "Unknown", sub: `σ = ${Math.round((mostDebated.overallStdDev || 0) * 10) / 10}` });

    const ratings = allRatings || [];
    if (ratings.length > 0) {
      const byParticipant: Record<string, { total: number; count: number; name?: string }> = {};
      for (const r of ratings) {
        if (!byParticipant[r.participantId]) byParticipant[r.participantId] = { total: 0, count: 0 };
        byParticipant[r.participantId].total += r.overall || 0;
        byParticipant[r.participantId].count += 1;
      }
      const pNames = (participants || []).reduce((m: Record<string, string>, p: any) => {
        m[p.participantId || p.id] = stripGuestSuffix(p.participant?.name || p.name || "Anonymous");
        return m;
      }, {} as Record<string, string>);
      const entries = Object.entries(byParticipant).filter(([, v]) => v.count >= 2).map(([pid, v]) => ({ pid, avg: v.total / v.count, name: pNames[pid] || "Anonymous" }));

      if (entries.length >= 2) {
        const generous = entries.sort((a, b) => b.avg - a.avg)[0];
        const harsh = entries.sort((a, b) => a.avg - b.avg)[0];
        stats.push({ icon: <TrendingUp style={{ width: 16, height: 16 }} />, label: "Most Generous", value: generous.name, sub: `avg: ${Math.round(generous.avg * 10) / 10}` });
        if (harsh.pid !== generous.pid) {
          stats.push({ icon: <TrendingDown style={{ width: 16, height: 16 }} />, label: "Toughest Critic", value: harsh.name, sub: `avg: ${Math.round(harsh.avg * 10) / 10}` });
        }
      }

      const highestSingle = ratings.reduce((best: any, r: any) => (!best || (r.overall || 0) > (best.overall || 0)) ? r : best, null);
      if (highestSingle) {
        const wName = sorted.find(w => w.id === highestSingle.whiskyId)?.name || "Unknown";
        stats.push({ icon: <Flame style={{ width: 16, height: 16 }} />, label: "Highest Single Score", value: `${highestSingle.overall}`, sub: `for ${wName}` });
      }
    }

    return stats.slice(0, 6);
  }, [sorted, allRatings, participants]);

  const slides = useMemo(() => {
    const s: { type: string; data?: any }[] = [];

    s.push({ type: "title" });
    if (sorted.length > 1) s.push({ type: "lineup" });
    if (participants && participants.length > 0) s.push({ type: "tasters" });
    if (funStats.length > 0) s.push({ type: "funstats" });

    if (sorted.length > 3) {
      s.push({ type: "transition", data: { title: "The Tasting", subtitle: "From the lineup to the leaderboard — let's see how they ranked.", icon: <Eye style={{ width: 44, height: 44 }} /> } });
    }

    const reversed = [...sorted].reverse();
    reversed.forEach((w, i) => {
      const rank = sorted.length - i;
      s.push({ type: "whisky", data: { whisky: w, rank } });
    });

    if (sorted.length >= 3) {
      s.push({ type: "transition", data: { title: "And the Winner is…", subtitle: "The moment you've been waiting for.", icon: <Trophy style={{ width: 44, height: 44 }} /> } });
      s.push({ type: "winner", data: { whisky: sorted[0] } });
      s.push({ type: "podium", data: { top3: sorted.slice(0, 3) } });
    }

    s.push({ type: "outro" });
    return s;
  }, [sorted, participants, funStats]);

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
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
      syncSlide(currentSlide + 1);
    }
  }, [currentSlide, totalSlides, syncSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
      syncSlide(currentSlide - 1);
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
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "Escape") { e.preventDefault(); exitPresentation(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, exitPresentation]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) { if (diff < 0) goNext(); else goPrev(); }
    touchStartX.current = null;
  }, [goNext, goPrev]);

  if (loadingTasting || loadingWhiskies) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--labs-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const isHost = tasting?.hostId === currentParticipant?.id;
  const isAllowedStatus = tasting?.status === "archived" || tasting?.status === "completed" || tasting?.status === "closed" || tasting?.status === "reveal";

  if (!tasting || !isHost || !isAllowedStatus) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--labs-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Wine style={{ width: 40, height: 40, color: "var(--labs-text-muted)" }} />
        <p style={{ color: "var(--labs-text-muted)" }}>{!tasting ? "Tasting not found" : "Presentation not available yet"}</p>
        <button className="labs-btn-secondary" onClick={() => navigate(`/labs/results/${tastingId}`)} data-testid="present-back-btn">Back to Results</button>
      </div>
    );
  }

  const uniqueRaters = new Set((allRatings || []).map((r: any) => r.participantId)).size;
  const totalRatings = allRatings?.length || 0;
  const participantCount = Math.max(participants?.length || 0, uniqueRaters, totalRatings > 0 ? 1 : 0);
  const slide = slides[currentSlide];

  const actLabel = (() => {
    const t = slide.type;
    if (t === "title" || t === "lineup" || t === "tasters" || t === "funstats") return "Intro";
    if (t === "whisky") return "Tasting";
    if (t === "transition") {
      const title = slide.data?.title || "";
      return title.includes("Winner") ? "Reveal" : "Tasting";
    }
    if (t === "winner" || t === "podium") return "Reveal";
    return "Finale";
  })();

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--labs-bg)",
        display: "flex", flexDirection: "column",
        overflow: "hidden", userSelect: "none",
      }}
      data-testid="present-container"
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

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
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--labs-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              backdropFilter: "blur(8px)",
            }}
            data-testid="present-exit-btn"
            aria-label="Exit presentation"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
          <span style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 8,
            background: "rgba(212, 162, 86, 0.1)", border: "1px solid rgba(212, 162, 86, 0.2)",
            fontSize: 11, fontWeight: 700, color: "var(--labs-accent)",
            backdropFilter: "blur(8px)", letterSpacing: "0.04em",
          }} data-testid="present-live-indicator">
            <span style={{ width: 7, height: 7, borderRadius: 4, background: "var(--labs-accent)", animation: "pulse 2s infinite" }} />
            LIVE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "var(--labs-text-muted)",
            padding: "4px 10px", borderRadius: 6,
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {actLabel}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted)",
            padding: "4px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)",
            fontVariantNumeric: "tabular-nums",
          }} data-testid="present-slide-indicator">
            {currentSlide + 1} / {totalSlides}
          </span>
          <button
            onClick={toggleFullscreen}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
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
            {slide.type === "title" && <CinematicTitleSlide tasting={tasting} whiskyCount={sorted.length} participantCount={participantCount} totalRatings={totalRatings} />}
            {slide.type === "lineup" && <LineupSlide whiskies={whiskies || []} blindMode={!!tasting.blindMode} />}
            {slide.type === "tasters" && <TastersSlide participants={participants || []} totalRatings={totalRatings} whiskyCount={sorted.length} />}
            {slide.type === "funstats" && <FunStatsSlide stats={funStats} />}
            {slide.type === "transition" && <TransitionSlide title={slide.data.title} subtitle={slide.data.subtitle} icon={slide.data.icon} />}
            {slide.type === "whisky" && <WhiskySlide whisky={slide.data.whisky} rank={slide.data.rank} totalWhiskies={sorted.length} maxScore={maxScore} />}
            {slide.type === "winner" && <WinnerRevealSlide whisky={slide.data.whisky} maxScore={maxScore} />}
            {slide.type === "podium" && <PodiumSlide top3={slide.data.top3} maxScore={maxScore} />}
            {slide.type === "outro" && <OutroSlide tasting={tasting} tastingId={tastingId} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "12px 16px 20px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
        background: "linear-gradient(transparent, rgba(26,23,20,0.95))",
        zIndex: 10,
      }}>
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          style={{
            width: 44, height: 44, borderRadius: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: currentSlide === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: currentSlide === 0 ? "rgba(255,255,255,0.12)" : "var(--labs-text)",
            cursor: currentSlide === 0 ? "default" : "pointer",
            transition: "all 0.15s",
          }}
          data-testid="present-prev-btn"
        >
          <ChevronLeft style={{ width: 20, height: 20 }} />
        </button>

        <div style={{ display: "flex", gap: 3, alignItems: "center", maxWidth: 300, overflow: "hidden" }} data-testid="present-dots">
          {slides.map((_, i) => {
            const distance = Math.abs(i - currentSlide);
            const isActive = i === currentSlide;
            const isNear = distance <= 3;
            const isFar = distance > 5;
            if (totalSlides > 15 && isFar) return null;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: isActive ? 18 : (totalSlides > 15 && !isNear ? 4 : 6),
                  height: isActive ? 6 : (totalSlides > 15 && !isNear ? 4 : 6),
                  borderRadius: 3,
                  border: "none",
                  background: isActive ? "var(--labs-accent)" : `rgba(255,255,255,${isNear ? 0.15 : 0.08})`,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  padding: 0,
                  flexShrink: 0,
                  opacity: totalSlides > 15 && distance > 4 ? 0.5 : 1,
                }}
                data-testid={`present-dot-${i}`}
              />
            );
          })}
        </div>

        <button
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          style={{
            width: 44, height: 44, borderRadius: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: currentSlide === totalSlides - 1 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: currentSlide === totalSlides - 1 ? "rgba(255,255,255,0.12)" : "var(--labs-text)",
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
