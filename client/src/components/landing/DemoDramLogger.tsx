import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DIMS, generateNote } from "@/lib/demoMath";
import { v, alpha } from "@/lib/themeVars";

const A = "#c8a97e";
const font = {
  display: "'Playfair Display', Georgia, serif",
  body: "system-ui, -apple-system, sans-serif",
};

function MiniRadar({ values }: { values: number[] }) {
  const n = 5;
  const r = 52;
  const cx = 60, cy = 60;
  const getXY = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  };
  const dataPath = values.map((val, i) => {
    const p = getXY(i, r * (val / 100));
    return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
  }).join(" ") + "Z";
  const labels = ["N", "P", "F", "B", "O"];

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {[1, 0.66, 0.33].map((s) => (
        <polygon key={s}
          points={Array.from({ length: n }, (_, i) => { const p = getXY(i, r * s); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke={A} strokeWidth="0.5" opacity={0.15}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const p = getXY(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={A} strokeWidth="0.3" opacity={0.2} />;
      })}
      <motion.polygon
        key={dataPath}
        points={values.map((val, i) => { const p = getXY(i, r * (val / 100)); return `${p.x},${p.y}`; }).join(" ")}
        fill={`${A}18`} stroke={A} strokeWidth="1.5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      {labels.map((l, i) => {
        const p = getXY(i, r + 12);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={A} fontSize="9" fontFamily={font.body} fontWeight="600" opacity={0.7}>{l}</text>;
      })}
    </svg>
  );
}

export default function DemoDramLogger() {
  const [name, setName] = useState("Lagavulin 16");
  const [values, setValues] = useState([72, 65, 80, 70, 75]);
  const [notes, setNotes] = useState("");

  const generatedNote = useMemo(() => generateNote(values), [values]);

  const updateVal = (idx: number, val: number) => {
    setValues((prev) => { const n = [...prev]; n[idx] = val; return n; });
  };

  return (
    <div style={{
      display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start",
    }}>
      <div style={{
        flex: "1 1 320px", maxWidth: 380,
        background: v.card, border: `1px solid ${v.border}`, borderRadius: 20,
        padding: 24, boxShadow: `0 20px 60px ${A}08`,
      }}>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Whisky name..."
          data-testid="input-demo-whisky-name"
          style={{
            width: "100%", background: v.inputBg, border: `1px solid ${v.inputBorder}`,
            borderRadius: 12, color: v.text, padding: "10px 14px", fontSize: 14,
            outline: "none", fontFamily: font.body, marginBottom: 20, boxSizing: "border-box",
          }}
        />

        {DIMS.map((dim, i) => (
          <div key={dim} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: v.muted, fontFamily: font.body }}>{dim}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: v.accent, fontFamily: font.body }}>{values[i]}</span>
            </div>
            <input
              type="range" min={0} max={100} value={values[i]}
              onChange={(e) => updateVal(i, +e.target.value)}
              data-testid={`slider-demo-${dim.toLowerCase()}`}
              style={{
                width: "100%", height: 4, appearance: "none",
                background: `linear-gradient(to right, ${A} ${values[i]}%, ${v.border} ${values[i]}%)`,
                borderRadius: 4, outline: "none", cursor: "pointer",
              }}
            />
          </div>
        ))}

        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Personal notes..."
          rows={2}
          data-testid="textarea-demo-notes"
          style={{
            width: "100%", background: v.inputBg, border: `1px solid ${v.inputBorder}`,
            borderRadius: 12, color: v.text, padding: "10px 14px", fontSize: 13,
            outline: "none", fontFamily: font.body, resize: "none", marginTop: 8, boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{
        flex: "1 1 260px", maxWidth: 320,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
      }}>
        <div style={{
          background: v.card, border: `1px solid ${v.border}`, borderRadius: 20,
          padding: 20, width: "100%", textAlign: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 12 }}>
            Taste Signature
          </div>
          <MiniRadar values={values} />
        </div>

        <motion.div
          key={generatedNote}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: v.card, border: `1px solid ${v.border}`, borderRadius: 16,
            padding: 16, width: "100%",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12 }}>✦</span> Generated Note
          </div>
          <p style={{ fontSize: 13, color: v.text, lineHeight: 1.6, fontFamily: font.body, fontStyle: "italic", margin: 0 }}>
            {generatedNote}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
