import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  PenLine, Camera, EyeOff, Eye, Users, Radar, BarChart3,
  Sparkles, UtensilsCrossed, Trophy, Archive, FileDown,
  ChevronRight, ChevronLeft, X, Star, Wine, BookOpen,
  ArrowLeft
} from "lucide-react";
import { v, alpha } from "@/lib/themeVars";
import { DIMS, generateNote } from "@/lib/demoMath";

const A = "#c8a97e";
const font = {
  display: "'Playfair Display', Georgia, serif",
  body: "system-ui, -apple-system, sans-serif",
};

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >{children}</motion.div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: v.card, border: `1px solid ${v.border}`, borderRadius: 20,
      padding: 24, boxShadow: `0 16px 48px ${A}06`, ...style,
    }}>{children}</div>
  );
}

function SectionWrapper({ id, icon: Icon, title, subtitle, children }: {
  id: string; icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ padding: "80px 0", borderBottom: `1px solid ${v.border}` }}>
      <FadeUp>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: alpha(v.accent, "12"),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ width: 18, height: 18, color: A }} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 500, color: v.text, margin: 0 }}>{title}</h2>
        </div>
        <p style={{ fontFamily: font.body, fontSize: 14, color: v.muted, marginBottom: 28, lineHeight: 1.5 }}>{subtitle}</p>
      </FadeUp>
      <FadeUp delay={0.1}>{children}</FadeUp>
    </section>
  );
}

function MiniRadar({ values, size = 120, labels }: { values: number[]; size?: number; labels?: string[] }) {
  const n = values.length;
  const r = size * 0.4;
  const cx = size / 2, cy = size / 2;
  const getXY = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  };
  const dims = labels || ["N", "P", "F", "B", "O"];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[1, 0.66, 0.33].map((s) => (
        <polygon key={s} points={Array.from({ length: n }, (_, i) => { const p = getXY(i, r * s); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke={A} strokeWidth="0.4" opacity={0.12} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const p = getXY(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={A} strokeWidth="0.3" opacity={0.15} />;
      })}
      <motion.polygon
        key={values.join(",")}
        points={values.map((val, i) => { const p = getXY(i, r * (val / 100)); return `${p.x},${p.y}`; }).join(" ")}
        fill={`${A}15`} stroke={A} strokeWidth="1.5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      />
      {dims.map((l, i) => {
        const p = getXY(i, r + 12);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={`${A}90`} fontSize="8" fontFamily={font.body} fontWeight="600">{l}</text>;
      })}
    </svg>
  );
}

function Demo_DramLogger() {
  const [values, setValues] = useState([72, 65, 80, 70, 75]);
  const note = useMemo(() => generateNote(values), [values]);
  const update = (i: number, val: number) => setValues((p) => { const n = [...p]; n[i] = val; return n; });

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <Card style={{ flex: "1 1 280px", maxWidth: 360 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 16 }}>Rate this dram</div>
        {DIMS.map((dim, i) => (
          <div key={dim} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: v.muted, fontFamily: font.body }}>{dim}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: A, fontFamily: font.body }}>{values[i]}</span>
            </div>
            <input type="range" min={0} max={100} value={values[i]}
              onChange={(e) => update(i, +e.target.value)}
              data-testid={`slider-showcase-${dim.toLowerCase()}`}
              style={{ width: "100%", height: 4, appearance: "none", background: `linear-gradient(to right, ${A} ${values[i]}%, ${v.border} ${values[i]}%)`, borderRadius: 4, outline: "none", cursor: "pointer" }}
            />
          </div>
        ))}
      </Card>
      <div style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 8 }}>Taste Signature</div>
          <MiniRadar values={values} />
        </Card>
        <motion.div key={note} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span>✦</span> Generated Note
            </div>
            <p style={{ fontSize: 12, color: v.text, lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>{note}</p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Demo_BottleScanner() {
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(false);

  const startScan = () => {
    setScanning(true); setFound(false);
    setTimeout(() => { setScanning(false); setFound(true); }, 2200);
  };

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
      <Card style={{ flex: "1 1 200px", maxWidth: 240, textAlign: "center" }}>
        <div style={{ position: "relative", width: 140, height: 160, margin: "0 auto 16px", borderRadius: 12, background: `${A}06`, border: `1px solid ${v.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {scanning && (
            <motion.div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${A}, transparent)` }}
              animate={{ top: ["10%", "90%", "10%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {[0, 1, 2, 3].map((c) => {
            const isTop = c < 2, isLeft = c % 2 === 0;
            return (
              <div key={c} style={{
                position: "absolute", [isTop ? "top" : "bottom"]: 8, [isLeft ? "left" : "right"]: 8,
                width: 16, height: 16,
                borderTop: isTop ? `2.5px solid ${scanning ? A : `${A}40`}` : "none",
                borderBottom: isTop ? "none" : `2.5px solid ${scanning ? A : `${A}40`}`,
                borderLeft: isLeft ? `2.5px solid ${scanning ? A : `${A}40`}` : "none",
                borderRight: isLeft ? "none" : `2.5px solid ${scanning ? A : `${A}40`}`,
                transition: "border-color 0.3s",
              }} />
            );
          })}
          <Camera style={{ width: 32, height: 32, color: `${A}40` }} strokeWidth={1.2} />
        </div>
        <button onClick={startScan} data-testid="button-scan-demo"
          style={{ padding: "8px 20px", borderRadius: 20, background: scanning ? `${A}20` : A, color: scanning ? A : v.bg, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font.body, transition: "all 0.2s" }}
        >
          {scanning ? "Scanning..." : "Scan Bottle"}
        </button>
      </Card>
      <AnimatePresence>
        {found && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <Card style={{ flex: "1 1 240px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 12 }}>Identified</div>
              {[
                { label: "Name", value: "Lagavulin 16" },
                { label: "Distillery", value: "Lagavulin" },
                { label: "Region", value: "Islay" },
                { label: "ABV", value: "43%" },
                { label: "Age", value: "16 years" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${v.border}`, fontSize: 12, fontFamily: font.body }}>
                  <span style={{ color: v.muted }}>{row.label}</span>
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ color: v.text, fontWeight: 500 }}>{row.value}</motion.span>
                </div>
              ))}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Demo_BlindTasting() {
  const [revealed, setRevealed] = useState(false);
  const bottles = [
    { id: "A", name: "Talisker 10", region: "Skye" },
    { id: "B", name: "Macallan 12", region: "Speyside" },
    { id: "C", name: "Ardbeg 10", region: "Islay" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {bottles.map((b, i) => (
          <motion.div key={b.id} layout
            style={{
              width: 100, padding: "16px 12px", borderRadius: 14,
              background: revealed ? `${A}12` : `${A}06`,
              border: `1.5px solid ${revealed ? `${A}35` : v.border}`,
              textAlign: "center", cursor: "default", transition: "all 0.3s",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: revealed ? A : v.muted, fontFamily: font.display, marginBottom: 6 }}>
              {revealed ? b.id : "?"}
            </div>
            <AnimatePresence>
              {revealed ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: v.text, fontFamily: font.body }}>{b.name}</div>
                  <div style={{ fontSize: 10, color: v.muted, fontFamily: font.body }}>{b.region}</div>
                </motion.div>
              ) : (
                <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Wine style={{ width: 16, height: 16, color: `${A}30`, margin: "4px auto" }} strokeWidth={1.5} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
      <button onClick={() => setRevealed(!revealed)} data-testid="button-blind-reveal"
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 20,
          background: revealed ? "transparent" : A, color: revealed ? A : v.bg,
          border: revealed ? `1px solid ${A}` : "none",
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font.body,
        }}
      >
        {revealed ? <><EyeOff style={{ width: 14, height: 14 }} /> Hide</> : <><Eye style={{ width: 14, height: 14 }} /> Reveal</>}
      </button>
    </div>
  );
}

function Demo_GuidedFlow() {
  const [current, setCurrent] = useState(0);
  const drams = [
    { name: "Dram 1", whisky: "Glenfiddich 15", scores: [70, 75, 65] },
    { name: "Dram 2", whisky: "Laphroaig 10", scores: [85, 60, 90] },
    { name: "Dram 3", whisky: "Balvenie 14", scores: [72, 80, 78] },
    { name: "Dram 4", whisky: "???", scores: [] },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {drams.map((d, i) => {
          const active = i === current;
          const done = i < current;
          const locked = i > current;
          return (
            <motion.button key={i} onClick={() => i <= current && setCurrent(i)}
              data-testid={`button-dram-step-${i}`}
              whileHover={!locked ? { y: -3 } : {}}
              style={{
                width: 110, padding: "14px 10px", borderRadius: 14,
                background: active ? `${A}18` : done ? `${A}08` : `${A}04`,
                border: `1.5px solid ${active ? A : done ? `${A}25` : v.border}`,
                cursor: locked ? "default" : "pointer",
                textAlign: "center", fontFamily: font.body, transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, color: active ? A : v.muted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{d.name}</div>
              <div style={{ fontSize: 11, color: done || active ? v.text : v.muted, fontWeight: 500, marginTop: 4 }}>
                {locked ? "🔒" : d.whisky}
              </div>
              {done && <div style={{ fontSize: 9, color: `${A}80`, marginTop: 4 }}>✓ Rated</div>}
            </motion.button>
          );
        })}
      </div>
      {current < 3 && (
        <button onClick={() => setCurrent(Math.min(current + 1, 3))} data-testid="button-next-dram"
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 20px", borderRadius: 20, background: A, color: v.bg, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font.body }}
        >
          Next Dram <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );
}

function Demo_FlavorProfile() {
  const profiles = [
    { name: "Your Profile", values: [78, 55, 82, 65, 70, 45], color: A },
    { name: "Islay Average", values: [40, 50, 85, 60, 55, 90], color: "#6a9a5b" },
  ];
  const [activeIdx, setActiveIdx] = useState(0);
  const labels = ["Sweet", "Fruit", "Spice", "Body", "Oak", "Smoke"];

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
      <Card style={{ flex: "1 1 200px", textAlign: "center" }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {(() => {
            const n = 6, r = 65, cx = 90, cy = 90;
            const getXY = (i: number, radius: number) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
              return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
            };
            return (
              <>
                {[1, 0.66, 0.33].map((s) => (
                  <polygon key={s} points={Array.from({ length: n }, (_, i) => { const p = getXY(i, r * s); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke={A} strokeWidth="0.4" opacity={0.12} />
                ))}
                {Array.from({ length: n }, (_, i) => {
                  const p = getXY(i, r);
                  return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={A} strokeWidth="0.3" opacity={0.15} />;
                })}
                {profiles.map((prof, pi) => (
                  <motion.polygon key={prof.name}
                    points={prof.values.map((val, i) => { const p = getXY(i, r * (val / 100)); return `${p.x},${p.y}`; }).join(" ")}
                    fill={`${prof.color}12`} stroke={prof.color} strokeWidth={activeIdx === pi ? "2" : "1"} opacity={activeIdx === pi ? 0.9 : 0.35}
                    initial={{ opacity: 0 }} animate={{ opacity: activeIdx === pi ? 0.9 : 0.35 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
                {labels.map((l, i) => {
                  const p = getXY(i, r + 14);
                  return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={`${A}80`} fontSize="8" fontFamily={font.body} fontWeight="500">{l}</text>;
                })}
              </>
            );
          })()}
        </svg>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
          {profiles.map((p, i) => (
            <button key={p.name} onClick={() => setActiveIdx(i)} data-testid={`button-profile-${i}`}
              style={{
                fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 12,
                background: activeIdx === i ? `${p.color}20` : "transparent",
                border: `1px solid ${activeIdx === i ? p.color : v.border}`,
                color: p.color, cursor: "pointer", fontFamily: font.body,
              }}
            >{p.name}</button>
          ))}
        </div>
      </Card>
      <div style={{ flex: "1 1 200px" }}>
        <Card>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 12 }}>Dimension Breakdown</div>
          {labels.map((l, i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: v.muted, fontFamily: font.body, width: 50, flexShrink: 0 }}>{l}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: v.border, position: "relative", overflow: "hidden" }}>
                <motion.div
                  key={`${activeIdx}-${i}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${profiles[activeIdx].values[i]}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ height: "100%", borderRadius: 3, background: profiles[activeIdx].color }}
                />
              </div>
              <span style={{ fontSize: 11, color: v.text, fontWeight: 600, fontFamily: font.body, width: 24, textAlign: "right" }}>{profiles[activeIdx].values[i]}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Demo_Analytics() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const drams = [3, 5, 4, 7, 6, 8, 5, 9, 7, 6, 8, 10];
  const avgScore = [68, 70, 72, 69, 74, 73, 76, 72, 78, 75, 77, 80];
  const [metric, setMetric] = useState<"drams" | "score">("drams");
  const data = metric === "drams" ? drams : avgScore;
  const maxVal = Math.max(...data);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["drams", "score"] as const).map((m) => (
          <button key={m} onClick={() => setMetric(m)} data-testid={`button-metric-${m}`}
            style={{
              padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600,
              background: metric === m ? `${A}18` : "transparent",
              border: `1px solid ${metric === m ? A : v.border}`,
              color: metric === m ? A : v.muted, cursor: "pointer", fontFamily: font.body,
            }}
          >{m === "drams" ? "Drams / Month" : "Avg Score"}</button>
        ))}
      </div>
      <Card>
        <div style={{ display: "flex", alignItems: "end", gap: 6, height: 100 }}>
          {data.map((val, i) => (
            <div key={`${metric}-${i}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: (val / maxVal) * 80 }}
                transition={{ delay: i * 0.04, duration: 0.4, type: "spring" }}
                style={{
                  width: "100%", maxWidth: 20, borderRadius: "3px 3px 0 0",
                  background: `linear-gradient(to top, ${A}20, ${A}${30 + Math.floor(val / maxVal * 40)})`,
                }}
              />
              <span style={{ fontSize: 7, color: v.muted, fontFamily: font.body }}>{months[i].slice(0, 1)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Demo_AINotes() {
  const [intensity, setIntensity] = useState(50);
  const [style, setStyle] = useState<"poetic" | "technical">("poetic");

  const poeticWords = [
    ["whisper of heather", "morning dew", "gentle warmth"],
    ["golden honey drizzle", "sun-baked orchard", "cinnamon evening"],
    ["campfire embers", "dark leather", "ancient oak cathedral"],
  ];
  const techWords = [
    ["light ester presence", "low phenol", "subtle maltiness"],
    ["moderate vanillin", "balanced congeners", "medium fusel oils"],
    ["high phenolic ppm", "intense Maillard compounds", "concentrated tannins"],
  ];

  const tier = intensity < 33 ? 0 : intensity < 66 ? 1 : 2;
  const words = style === "poetic" ? poeticWords[tier] : techWords[tier];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["poetic", "technical"] as const).map((s) => (
          <button key={s} onClick={() => setStyle(s)} data-testid={`button-ai-style-${s}`}
            style={{
              padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600,
              background: style === s ? `${A}18` : "transparent",
              border: `1px solid ${style === s ? A : v.border}`,
              color: style === s ? A : v.muted, cursor: "pointer", fontFamily: font.body,
              textTransform: "capitalize",
            }}
          >{s}</button>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: v.muted, fontFamily: font.body }}>Intensity</span>
          <span style={{ fontSize: 11, color: A, fontFamily: font.body, fontWeight: 600 }}>{intensity}</span>
        </div>
        <input type="range" min={0} max={100} value={intensity} onChange={(e) => setIntensity(+e.target.value)}
          data-testid="slider-ai-intensity"
          style={{ width: "100%", height: 4, appearance: "none", background: `linear-gradient(to right, ${A} ${intensity}%, ${v.border} ${intensity}%)`, borderRadius: 4, outline: "none", cursor: "pointer" }}
        />
      </div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Sparkles style={{ width: 14, height: 14, color: A }} strokeWidth={1.5} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted }}>AI Generated</span>
        </div>
        <motion.p key={`${style}-${tier}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontSize: 13, color: v.text, lineHeight: 1.6, fontStyle: "italic", margin: 0, fontFamily: font.body }}
        >
          {words.map((w, i) => (
            <motion.span key={w} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              style={{ display: "inline" }}
            >
              {i > 0 ? " · " : ""}{w}
            </motion.span>
          ))}
        </motion.p>
      </Card>
    </div>
  );
}

function Demo_FoodPairings() {
  const [profile, setProfile] = useState<"smoky" | "sweet" | "sherried">("smoky");
  const pairings: Record<string, { emoji: string; name: string; why: string }[]> = {
    smoky: [
      { emoji: "🍫", name: "Dark Chocolate 85%", why: "Bitterness echoes smoke" },
      { emoji: "🧀", name: "Smoked Gouda", why: "Complementary smoke" },
      { emoji: "🥓", name: "Candied Bacon", why: "Sweet-salt-smoke harmony" },
    ],
    sweet: [
      { emoji: "🍯", name: "Honeycomb", why: "Amplifies vanilla notes" },
      { emoji: "🍎", name: "Apple Tarte Tatin", why: "Caramel meets fruit" },
      { emoji: "🧁", name: "Crème Brûlée", why: "Matching sweetness" },
    ],
    sherried: [
      { emoji: "🫐", name: "Dark Berry Compote", why: "Fruit mirrors sherry" },
      { emoji: "🥜", name: "Roasted Almonds", why: "Nutty depth" },
      { emoji: "🧀", name: "Manchego", why: "Rich, aged pairing" },
    ],
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["smoky", "sweet", "sherried"] as const).map((p) => (
          <button key={p} onClick={() => setProfile(p)} data-testid={`button-pairing-${p}`}
            style={{
              padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600,
              background: profile === p ? `${A}18` : "transparent",
              border: `1px solid ${profile === p ? A : v.border}`,
              color: profile === p ? A : v.muted, cursor: "pointer", fontFamily: font.body,
              textTransform: "capitalize",
            }}
          >{p}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <AnimatePresence mode="wait">
          {pairings[profile].map((p, i) => (
            <motion.div key={`${profile}-${p.name}`}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            >
              <Card style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: v.text, fontFamily: font.body }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: v.muted, fontFamily: font.body }}>{p.why}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Demo_Achievements() {
  const [unlocked, setUnlocked] = useState([true, true, false, false, false, false]);
  const badges = [
    { icon: Star, label: "First Dram" },
    { icon: Wine, label: "10 Tastings" },
    { icon: Trophy, label: "Host Pro" },
    { icon: Radar, label: "Flavour Expert" },
    { icon: BookOpen, label: "Journaler" },
    { icon: Users, label: "Taste Twin" },
  ];

  const unlock = () => {
    const nextIdx = unlocked.indexOf(false);
    if (nextIdx >= 0) setUnlocked((p) => { const n = [...p]; n[nextIdx] = true; return n; });
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        {badges.map((b, i) => (
          <motion.div key={b.label}
            animate={unlocked[i] ? { scale: [1, 1.1, 1], borderColor: `${A}40` } : {}}
            transition={{ duration: 0.4 }}
            style={{
              padding: 14, borderRadius: 14, textAlign: "center",
              background: unlocked[i] ? `${A}12` : `${A}04`,
              border: `1.5px solid ${unlocked[i] ? `${A}30` : v.border}`,
              opacity: unlocked[i] ? 1 : 0.4, transition: "opacity 0.3s",
            }}
          >
            <b.icon style={{ width: 20, height: 20, color: unlocked[i] ? A : v.muted, margin: "0 auto 6px", display: "block" }} strokeWidth={1.5} />
            <div style={{ fontSize: 10, fontWeight: 600, color: unlocked[i] ? v.text : v.muted, fontFamily: font.body }}>{b.label}</div>
          </motion.div>
        ))}
      </div>
      <button onClick={unlock} data-testid="button-unlock-badge"
        disabled={!unlocked.includes(false)}
        style={{
          padding: "8px 20px", borderRadius: 20, background: unlocked.includes(false) ? A : `${A}30`,
          color: v.bg, border: "none", fontSize: 13, fontWeight: 600,
          cursor: unlocked.includes(false) ? "pointer" : "default", fontFamily: font.body,
        }}
      >
        {unlocked.includes(false) ? "🏆 Unlock Next Badge" : "All Unlocked!"}
      </button>
    </div>
  );
}

function Demo_Collection() {
  const [bottles, setBottles] = useState([
    { name: "Lagavulin 16", region: "Islay" },
    { name: "Macallan 12", region: "Speyside" },
  ]);
  const extras = [
    { name: "Talisker 10", region: "Skye" },
    { name: "Glenfiddich 15", region: "Speyside" },
    { name: "Ardbeg 10", region: "Islay" },
  ];

  const importNext = () => {
    const remaining = extras.filter((e) => !bottles.find((b) => b.name === e.name));
    if (remaining.length > 0) setBottles((p) => [...p, remaining[0]]);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <AnimatePresence>
          {bottles.map((b) => (
            <motion.div key={b.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              layout
              style={{
                padding: "10px 16px", borderRadius: 12,
                background: `${A}08`, border: `1px solid ${A}20`,
                fontFamily: font.body,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: v.text }}>{b.name}</div>
              <div style={{ fontSize: 10, color: v.muted }}>{b.region}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <button onClick={importNext} data-testid="button-import-bottle"
        disabled={bottles.length >= 5}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 20px", borderRadius: 20,
          background: bottles.length < 5 ? A : `${A}30`, color: v.bg,
          border: "none", fontSize: 13, fontWeight: 600,
          cursor: bottles.length < 5 ? "pointer" : "default", fontFamily: font.body,
        }}
      >
        <Archive style={{ width: 14, height: 14 }} /> Import from CSV
      </button>
    </div>
  );
}

function Demo_Export() {
  const [format, setFormat] = useState<"pdf" | "excel" | "csv">("pdf");
  const previews: Record<string, { lines: string[]; color: string }> = {
    pdf: { lines: ["Tasting Report — 12.02.2025", "━━━━━━━━━━━━━━━━━━━━━━━", "Dram 1: Lagavulin 16 ⭐ 82/100", "Dram 2: Talisker 10 ⭐ 78/100", "Dram 3: Ardbeg 10 ⭐ 85/100", "━━━━━━━━━━━━━━━━━━━━━━━", "Winner: Ardbeg 10"], color: "#c44" },
    excel: { lines: ["| Whisky | Nose | Palate | Finish |", "|--------|------|--------|--------|", "| Lagavulin | 82 | 78 | 85 |", "| Talisker | 75 | 80 | 72 |", "| Ardbeg | 88 | 82 | 90 |"], color: "#2e7d32" },
    csv: { lines: ['name,nose,palate,finish,overall', '"Lagavulin 16",82,78,85,82', '"Talisker 10",75,80,72,78', '"Ardbeg 10",88,82,90,85'], color: "#7b8fc4" },
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["pdf", "excel", "csv"] as const).map((f) => (
          <button key={f} onClick={() => setFormat(f)} data-testid={`button-format-${f}`}
            style={{
              padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600,
              background: format === f ? `${previews[f].color}20` : "transparent",
              border: `1px solid ${format === f ? previews[f].color : v.border}`,
              color: format === f ? previews[f].color : v.muted,
              cursor: "pointer", fontFamily: font.body, textTransform: "uppercase",
            }}
          >{f}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={format} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          <Card style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.8, color: v.text }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <FileDown style={{ width: 14, height: 14, color: previews[format].color }} strokeWidth={1.5} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted }}>Preview: {format}</span>
            </div>
            {previews[format].lines.map((line, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                style={{ color: i === 0 ? previews[format].color : v.mutedLight, whiteSpace: "pre" }}
              >{line}</motion.div>
            ))}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const features = [
  { id: "dram-logger", icon: PenLine, title: "Log a Dram", sub: "Rate nose, palate, finish — see your taste signature emerge in real time.", demo: Demo_DramLogger },
  { id: "scanner", icon: Camera, title: "Bottle Scanner", sub: "AI identifies your whisky from a photo or barcode. All fields auto-fill.", demo: Demo_BottleScanner },
  { id: "blind", icon: EyeOff, title: "Blind Tasting", sub: "No labels, no bias. Reveal the truth when you're ready.", demo: Demo_BlindTasting },
  { id: "guided", icon: Users, title: "Guided Tasting Flow", sub: "Walk your group through each dram. You control the pace.", demo: Demo_GuidedFlow },
  { id: "profile", icon: Radar, title: "Flavour Profile", sub: "Discover your palate patterns across dimensions and compare with regions.", demo: Demo_FlavorProfile },
  { id: "analytics", icon: BarChart3, title: "Taste Analytics", sub: "Track your journey over time. Spot trends you never noticed.", demo: Demo_Analytics },
  { id: "ai-notes", icon: Sparkles, title: "AI Tasting Notes", sub: "Adjust intensity, switch style — watch AI describe your dram.", demo: Demo_AINotes },
  { id: "pairings", icon: UtensilsCrossed, title: "Food Pairings", sub: "AI-curated matches based on your whisky's flavour profile.", demo: Demo_FoodPairings },
  { id: "badges", icon: Trophy, title: "Achievements", sub: "Celebrate milestones on your whisky journey.", demo: Demo_Achievements },
  { id: "collection", icon: Archive, title: "Your Collection", sub: "Import from Whiskybase CSV. Track every bottle you own.", demo: Demo_Collection },
  { id: "export", icon: FileDown, title: "Export Results", sub: "Download tasting results in the format you need.", demo: Demo_Export },
];

export default function FeatureShowcase() {
  return (
    <div style={{ background: v.bg, color: v.text, minHeight: "100dvh", fontFamily: font.body }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ padding: "24px 0 0", display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" data-testid="link-showcase-back" style={{ display: "flex", alignItems: "center", gap: 4, color: v.muted, fontSize: 13, textDecoration: "none" }}>
            <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={1.5} /> Back
          </Link>
        </div>

        <div style={{ padding: "60px 0 40px", textAlign: "center" }}>
          <FadeUp>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: v.accent, marginBottom: 16 }}>Interactive Feature Tour</div>
            <h1 style={{ fontFamily: font.display, fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, color: v.text, letterSpacing: "-0.02em", marginBottom: 12 }}>
              Try every feature
            </h1>
            <p style={{ fontFamily: font.body, fontSize: 16, color: v.muted, maxWidth: 480, margin: "0 auto", lineHeight: 1.5 }}>
              No account needed. Move sliders, click buttons, explore — each demo runs entirely in your browser.
            </p>
          </FadeUp>
        </div>

        <nav style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: "0 0 60px", position: "sticky", top: 0, zIndex: 10, background: v.bg, paddingTop: 12, paddingBottom: 12 }}>
          {features.map((f) => (
            <a key={f.id} href={`#${f.id}`} data-testid={`link-nav-${f.id}`}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "5px 12px",
                borderRadius: 16, border: `1px solid ${v.border}`, fontSize: 11,
                color: v.muted, textDecoration: "none", fontWeight: 500,
                transition: "border-color 0.2s, color 0.2s",
              }}
            >
              <f.icon style={{ width: 12, height: 12 }} strokeWidth={1.5} />
              {f.title}
            </a>
          ))}
        </nav>

        {features.map((f) => (
          <SectionWrapper key={f.id} id={f.id} icon={f.icon} title={f.title} subtitle={f.sub}>
            <f.demo />
          </SectionWrapper>
        ))}

        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <FadeUp>
            <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 400, color: v.text, marginBottom: 24 }}>Ready to try it for real?</h2>
            <Link href="/enter" data-testid="link-showcase-cta" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px",
              background: v.accent, color: v.bg, fontFamily: font.body, fontSize: 15,
              fontWeight: 600, borderRadius: 50, textDecoration: "none",
            }}>
              Open CaskSense <ChevronRight style={{ width: 16, height: 16 }} />
            </Link>
          </FadeUp>
        </div>
      </div>
    </div>
  );
}
