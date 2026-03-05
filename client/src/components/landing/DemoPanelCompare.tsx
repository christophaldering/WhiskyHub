import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DIMS, DEMO_TASTERS, similarityPercent } from "@/lib/demoMath";
import { v, alpha } from "@/lib/themeVars";

const A = "#c8a97e";
const font = {
  display: "'Playfair Display', Georgia, serif",
  body: "system-ui, -apple-system, sans-serif",
};

const COLORS = [A, "#6a9a5b", "#7b8fc4", "#c47b8f"];

function OverlayRadar({ tasters }: { tasters: { name: string; values: number[] }[] }) {
  const n = 5;
  const r = 56;
  const cx = 70, cy = 70;
  const getXY = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  };
  const labels = ["N", "P", "F", "B", "O"];

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {[1, 0.66, 0.33].map((s) => (
        <polygon key={s}
          points={Array.from({ length: n }, (_, i) => { const p = getXY(i, r * s); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke={A} strokeWidth="0.4" opacity={0.12}
        />
      ))}
      {tasters.map((t, ti) => {
        const path = t.values.map((val, i) => {
          const p = getXY(i, r * (val / 100));
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <motion.polygon key={t.name} points={path}
            fill={`${COLORS[ti]}10`} stroke={COLORS[ti]} strokeWidth="1.5" opacity={0.7}
            initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}
            transition={{ delay: ti * 0.2, duration: 0.5 }}
          />
        );
      })}
      {labels.map((l, i) => {
        const p = getXY(i, r + 10);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={`${A}80`} fontSize="8" fontFamily={font.body} fontWeight="600">{l}</text>;
      })}
    </svg>
  );
}

export default function DemoPanelCompare() {
  const [userVals] = useState([72, 65, 80, 70, 75]);
  const [showMethod, setShowMethod] = useState(false);

  const allTasters = useMemo(() => [
    ...DEMO_TASTERS,
    { name: "You", values: userVals },
  ], [userVals]);

  const similarities = useMemo(() =>
    DEMO_TASTERS.map((t) => ({
      name: t.name,
      pct: similarityPercent(userVals, t.values),
    })).sort((a, b) => b.pct - a.pct),
  [userVals]);

  const twin = similarities[0];

  return (
    <div style={{
      display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start",
    }}>
      <div style={{
        flex: "1 1 300px", maxWidth: 380,
        background: v.card, border: `1px solid ${v.border}`, borderRadius: 20,
        padding: 24, boxShadow: `0 20px 60px ${A}08`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 16 }}>
          Panel Scores — "Lagavulin 16"
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: font.body }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", color: v.muted, fontWeight: 600, borderBottom: `1px solid ${v.border}` }}></th>
                {DIMS.map((d) => (
                  <th key={d} style={{ textAlign: "center", padding: "6px 4px", color: v.muted, fontWeight: 600, borderBottom: `1px solid ${v.border}`, fontSize: 10 }}>{d.slice(0, 3)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allTasters.map((t, ti) => (
                <tr key={t.name}>
                  <td style={{ padding: "6px 8px", color: COLORS[ti], fontWeight: 600, fontSize: 12 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: COLORS[ti], marginRight: 6, verticalAlign: "middle" }} />
                    {t.name}
                  </td>
                  {t.values.map((val, vi) => (
                    <td key={vi} style={{ textAlign: "center", padding: "6px 4px", color: v.text, fontSize: 12 }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ height: 3, borderRadius: 2, background: v.border, marginBottom: 2 }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            transition={{ delay: 0.3 + ti * 0.1 + vi * 0.05, duration: 0.5 }}
                            style={{ height: "100%", borderRadius: 2, background: COLORS[ti] }}
                          />
                        </div>
                        <span style={{ fontSize: 10, color: v.mutedLight }}>{val}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          style={{
            marginTop: 20, padding: "12px 16px",
            background: alpha(v.accent, "10"), border: `1px solid ${v.border}`,
            borderRadius: 12, display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${COLORS[0]}20`, border: `1.5px solid ${COLORS[0]}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>🤝</span>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: v.text, fontFamily: font.body }}>
              Taste Twin: {twin.name}
            </div>
            <div style={{ fontSize: 11, color: v.muted, fontFamily: font.body }}>
              {twin.pct}% palate similarity
            </div>
          </div>
        </motion.div>
      </div>

      <div style={{ flex: "1 1 240px", maxWidth: 300, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <div style={{
          background: v.card, border: `1px solid ${v.border}`, borderRadius: 20,
          padding: 20, width: "100%", textAlign: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 8 }}>
            Radar Overlay
          </div>
          <OverlayRadar tasters={allTasters} />
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
            {allTasters.map((t, i) => (
              <span key={t.name} style={{ fontSize: 10, color: COLORS[i], fontFamily: font.body, fontWeight: 500 }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: COLORS[i], marginRight: 3, verticalAlign: "middle" }} />
                {t.name}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowMethod(!showMethod)}
          data-testid="button-show-method"
          style={{
            background: "transparent", border: `1px solid ${v.border}`,
            borderRadius: 10, padding: "8px 16px", color: v.accent,
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font.body,
            transition: "border-color 0.2s",
          }}
        >
          {showMethod ? "Hide method" : "🔬 Show method"}
        </button>

        <AnimatePresence>
          {showMethod && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: v.card, border: `1px solid ${v.border}`, borderRadius: 14,
                padding: 16, width: "100%", overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: v.text, marginBottom: 8, fontFamily: font.body }}>
                How similarity works
              </div>
              <p style={{ fontSize: 12, color: v.muted, lineHeight: 1.6, margin: 0, fontFamily: font.body }}>
                Each person's ratings form a 5-dimensional vector. We compute cosine similarity — the angle between these vectors in taste-space. A score of 100% means identical proportions across all dimensions. It captures <em>shape</em>, not absolute agreement.
              </p>
              <p style={{ fontSize: 11, color: v.mutedLight, lineHeight: 1.5, margin: "8px 0 0", fontStyle: "italic", fontFamily: font.body }}>
                For the measurement nerds: yes, we care about reliability and validity.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
