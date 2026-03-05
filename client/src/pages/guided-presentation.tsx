import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wine, PenLine, Users, Camera, Star, ChevronRight, ChevronLeft,
  BookOpen, Trophy, Shield, Heart, X, Eye, EyeOff, FileDown,
  Sparkles, Radar, BarChart3, UtensilsCrossed, Award, Archive,
  QrCode, GitCompareArrows
} from "lucide-react";
import { v, alpha } from "@/lib/themeVars";

const A = "#c8a97e";
const A2 = "#a8834a";

const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

function Vis_Welcome() {
  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <motion.div
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${A}10 0%, transparent 70%)` }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{ position: "absolute", inset: 30, borderRadius: "50%", border: `1px solid ${A}15` }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 40, width: 140, height: 140 }}>
        <motion.path
          d="M35 75 C35 75 30 45 35 35 C38 28 45 25 50 25 C55 25 62 28 65 35 C70 45 65 75 65 75 Z"
          fill={`${A}18`} stroke={A} strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <motion.ellipse cx="50" cy="75" rx="16" ry="3" fill="none" stroke={A} strokeWidth="0.8" opacity={0.4}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1, duration: 0.5 }}
        />
        <motion.line x1="50" y1="25" x2="50" y2="18" stroke={A} strokeWidth="0.8" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }} transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        />
        {[42, 50, 58].map((x, i) => (
          <motion.circle key={i} cx={x} cy={22 - i * 3} r="1" fill={A} opacity={0.3}
            animate={{ y: [0, -8, -12], opacity: [0.3, 0.5, 0] }}
            transition={{ delay: 1.8 + i * 0.3, duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      </svg>
    </div>
  );
}

function Vis_Problem() {
  const cards = [
    { x: 20, y: 30, rot: -5, delay: 0 },
    { x: 80, y: 20, rot: 3, delay: 0.2 },
    { x: 50, y: 60, rot: -2, delay: 0.4 },
  ];
  return (
    <div style={{ position: "relative", width: 240, height: 180 }}>
      {cards.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.9, y: 0, scale: 1 }}
          animate={{ opacity: [0.9, 0.3, 0.05], y: [0, -10, -20], scale: [1, 0.95, 0.9] }}
          transition={{ delay: 0.5 + c.delay, duration: 3, repeat: Infinity, repeatDelay: 1 }}
          style={{
            position: "absolute", left: c.x, top: c.y,
            width: 90, height: 60, borderRadius: 10,
            background: `${A}12`, border: `1px solid ${A}20`,
            transform: `rotate(${c.rot}deg)`, padding: 10,
          }}
        >
          {[0.8, 0.5, 0.3].map((w, j) => (
            <div key={j} style={{ height: 4, borderRadius: 2, background: `${A}${15 + j * 8}`, width: `${w * 100}%`, marginBottom: 5 }} />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

function Vis_Solution() {
  return (
    <div style={{ position: "relative", width: 200, height: 180 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
        style={{
          width: 140, height: 100, borderRadius: 14, margin: "20px auto 0",
          background: `${A}10`, border: `1.5px solid ${A}30`,
          padding: 14, position: "relative", overflow: "hidden",
        }}
      >
        {[0.85, 0.6, 0.7, 0.4].map((w, i) => (
          <motion.div key={i}
            initial={{ width: 0 }} animate={{ width: `${w * 100}%` }}
            transition={{ delay: 0.8 + i * 0.15, duration: 0.5 }}
            style={{ height: 5, borderRadius: 3, background: `${A}${25 + i * 10}`, marginBottom: 6 }}
          />
        ))}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.4, type: "spring" }}
          style={{
            position: "absolute", right: 8, bottom: 8, width: 24, height: 24,
            borderRadius: "50%", background: `${A}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Star style={{ width: 12, height: 12, color: A }} strokeWidth={2} />
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ delay: 1.8, duration: 1.5 }}
        style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: A, fontFamily: font.body, fontWeight: 500 }}
      >
        ✓ Saved
      </motion.div>
    </div>
  );
}

function Vis_LogDram() {
  const sliderData = [
    { label: "N", value: 0.75, delay: 0.4 },
    { label: "P", value: 0.6, delay: 0.6 },
    { label: "F", value: 0.85, delay: 0.8 },
    { label: "★", value: 0.7, delay: 1.0 },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        width: 160, borderRadius: 20, padding: "16px 14px",
        background: `${A}08`, border: `1.5px solid ${A}20`,
        boxShadow: `0 20px 60px ${A}08`,
      }}
    >
      <div style={{ width: 60, height: 6, borderRadius: 3, background: `${A}20`, margin: "0 auto 14px" }} />
      {sliderData.map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: A, fontFamily: font.body, width: 14, textAlign: "center" }}>{s.label}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: `${A}12`, position: "relative", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${s.value * 100}%` }}
              transition={{ delay: s.delay, duration: 0.6, ease: "easeOut" }}
              style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${A}40, ${A})` }}
            />
          </div>
        </div>
      ))}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 6 }}
      >
        {[1,2,3,4,5].map((s) => (
          <motion.div key={s}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 1.4 + s * 0.08, type: "spring" }}
          >
            <Star style={{ width: 12, height: 12, color: s <= 4 ? A : `${A}30`, fill: s <= 4 ? A : "none" }} strokeWidth={1.5} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function Vis_Scan() {
  return (
    <div style={{ position: "relative", width: 200, height: 200 }}>
      <motion.div
        style={{ position: "absolute", inset: 30, borderRadius: 16, border: `2px solid ${A}40` }}
        animate={{ borderColor: [`${A}20`, `${A}60`, `${A}20`] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {[0, 1, 2, 3].map((corner) => {
        const isTop = corner < 2;
        const isLeft = corner % 2 === 0;
        return (
          <motion.div key={corner}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + corner * 0.1 }}
            style={{
              position: "absolute",
              [isTop ? "top" : "bottom"]: 25,
              [isLeft ? "left" : "right"]: 25,
              width: 20, height: 20,
              borderTop: isTop ? `3px solid ${A}` : "none",
              borderBottom: isTop ? "none" : `3px solid ${A}`,
              borderLeft: isLeft ? `3px solid ${A}` : "none",
              borderRight: isLeft ? "none" : `3px solid ${A}`,
              borderRadius: isTop && isLeft ? "4px 0 0 0" : isTop && !isLeft ? "0 4px 0 0" : !isTop && isLeft ? "0 0 0 4px" : "0 0 4px 0",
            }}
          />
        );
      })}
      <motion.div
        style={{ position: "absolute", left: 35, right: 35, height: 2, background: `linear-gradient(90deg, transparent, ${A}, transparent)`, top: 80 }}
        animate={{ top: [50, 150, 50] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        style={{
          position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
          background: `${A}20`, border: `1px solid ${A}30`, borderRadius: 8,
          padding: "4px 12px", fontSize: 10, color: A, fontFamily: font.body, fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        Lagavulin 16 · 43% · Islay
      </motion.div>
    </div>
  );
}

function Vis_Journal() {
  const pages = [0, 1, 2];
  return (
    <div style={{ position: "relative", width: 180, height: 160 }}>
      {pages.map((p) => (
        <motion.div
          key={p}
          initial={{ opacity: 0, x: -20, rotateY: -15 }}
          animate={{ opacity: 1 - p * 0.2, x: p * 12, rotateY: 0 }}
          transition={{ delay: 0.3 + p * 0.2, duration: 0.6 }}
          style={{
            position: "absolute", left: 20, top: 10 + p * 6,
            width: 120, height: 130, borderRadius: 10,
            background: p === 0 ? `${A}12` : `${A}06`,
            border: `1px solid ${A}${15 + p * 5}`,
            padding: 12, zIndex: 3 - p,
          }}
        >
          {p === 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <BookOpen style={{ width: 10, height: 10, color: A }} strokeWidth={1.5} />
                <div style={{ height: 4, borderRadius: 2, background: `${A}30`, flex: 1 }} />
              </div>
              {[0.9, 0.6, 0.75, 0.5, 0.8, 0.45].map((w, i) => (
                <motion.div key={i}
                  initial={{ width: 0 }} animate={{ width: `${w * 100}%` }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                  style={{ height: 3, borderRadius: 2, background: `${A}${15 + i * 4}`, marginBottom: 4 }}
                />
              ))}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                style={{ display: "flex", gap: 2, marginTop: 6 }}
              >
                {[1,2,3,4].map((s) => (
                  <Star key={s} style={{ width: 8, height: 8, color: A, fill: A }} strokeWidth={1} />
                ))}
                <Star style={{ width: 8, height: 8, color: `${A}30` }} strokeWidth={1} />
              </motion.div>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function Vis_Collection() {
  const bottles = [
    { h: 55, delay: 0.3, opacity: "30" },
    { h: 48, delay: 0.5, opacity: "25" },
    { h: 60, delay: 0.7, opacity: "35" },
    { h: 42, delay: 0.9, opacity: "20" },
    { h: 52, delay: 1.1, opacity: "28" },
    { h: 45, delay: 1.3, opacity: "22" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 10, height: 120, padding: "0 20px" }}>
      {bottles.map((b, i) => (
        <motion.div
          key={i}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: b.h, opacity: 1 }}
          transition={{ delay: b.delay, duration: 0.5, type: "spring" }}
          style={{
            width: 24, borderRadius: "6px 6px 4px 4px",
            background: `${A}${b.opacity}`,
            border: `1px solid ${A}20`,
            position: "relative",
          }}
        >
          <div style={{
            position: "absolute", top: 4, left: 4, right: 4, height: 10,
            borderRadius: 3, background: `${A}15`,
          }} />
        </motion.div>
      ))}
    </div>
  );
}

function Vis_HostTasting() {
  const avatarPositions = [
    { x: 90, y: 20, delay: 0.5 },
    { x: 40, y: 50, delay: 0.7 },
    { x: 140, y: 50, delay: 0.9 },
    { x: 60, y: 100, delay: 1.1 },
    { x: 120, y: 100, delay: 1.3 },
  ];
  return (
    <div style={{ position: "relative", width: 200, height: 170 }}>
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        style={{
          position: "absolute", left: 72, top: 45, width: 56, height: 56,
          borderRadius: 12, background: `${A}15`, border: `1.5px solid ${A}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <QrCode style={{ width: 28, height: 28, color: A, opacity: 0.7 }} strokeWidth={1.2} />
      </motion.div>
      {avatarPositions.map((a, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: a.delay, type: "spring" }}
          style={{
            position: "absolute", left: a.x, top: a.y,
            width: 28, height: 28, borderRadius: "50%",
            background: `${A}${15 + i * 5}`, border: `1px solid ${A}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Users style={{ width: 12, height: 12, color: A, opacity: 0.6 }} strokeWidth={1.5} />
        </motion.div>
      ))}
      {avatarPositions.map((a, i) => (
        <motion.div
          key={`line-${i}`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: a.delay + 0.2, duration: 0.3 }}
          style={{
            position: "absolute",
            left: Math.min(a.x + 14, 100), top: Math.min(a.y + 14, 73),
            width: Math.abs(a.x - 86), height: 1,
            background: A, transformOrigin: "left center",
            transform: `rotate(${Math.atan2(73 - a.y - 14, 100 - a.x - 14) * 180 / Math.PI}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function Vis_GuidedFlow() {
  const drams = [
    { label: "1", delay: 0.3, revealed: true },
    { label: "2", delay: 0.7, revealed: true },
    { label: "3", delay: 1.1, revealed: false },
    { label: "4", delay: 1.5, revealed: false },
  ];
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {drams.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, rotateY: 90 }}
          animate={{ opacity: 1, rotateY: d.revealed ? 0 : 0 }}
          transition={{ delay: d.delay, duration: 0.5, type: "spring" }}
          style={{
            width: 52, height: 72, borderRadius: 10,
            background: d.revealed ? `${A}15` : `${A}06`,
            border: `1.5px solid ${d.revealed ? `${A}40` : `${A}15`}`,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          {d.revealed ? (
            <>
              <Wine style={{ width: 16, height: 16, color: A, opacity: 0.7 }} strokeWidth={1.5} />
              <span style={{ fontSize: 9, color: A, fontWeight: 600, fontFamily: font.body }}>{d.label}</span>
            </>
          ) : (
            <motion.span
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: 16, color: `${A}40` }}
            >?</motion.span>
          )}
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        style={{ marginLeft: 4 }}
      >
        <ChevronRight style={{ width: 20, height: 20, color: `${A}30` }} />
      </motion.div>
    </div>
  );
}

function Vis_BlindTasting() {
  return (
    <div style={{ position: "relative", width: 160, height: 200 }}>
      <svg viewBox="0 0 100 130" style={{ width: 160, height: 200 }}>
        <motion.path
          d="M40 110 C40 110 35 60 38 45 C40 35 45 30 50 28 C55 30 60 35 62 45 C65 60 60 110 60 110 Z"
          fill={`${A}12`} stroke={A} strokeWidth="1" opacity={0.6}
          initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ duration: 0.5 }}
        />
        <motion.rect x="30" y="20" width="40" height="95" rx="6" fill={`${A}08`}
          stroke={`${A}30`} strokeWidth="1" strokeDasharray="4 3"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.5, duration: 3, repeat: Infinity, repeatDelay: 1 }}
        />
        <motion.text x="50" y="70" textAnchor="middle" fill={A} fontSize="20" fontFamily={font.display} opacity={0.5}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >?</motion.text>
      </svg>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
        transition={{ delay: 3, duration: 2, repeat: Infinity, repeatDelay: 2 }}
        style={{
          position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
          background: `${A}20`, border: `1px solid ${A}30`, borderRadius: 8,
          padding: "3px 10px", fontSize: 10, color: A, fontFamily: font.body, fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        <Eye style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
        Reveal!
      </motion.div>
    </div>
  );
}

function Vis_Results() {
  const podium = [
    { place: 2, h: 60, label: "Oban 14", x: 0, delay: 0.5 },
    { place: 1, h: 85, label: "Lagavulin 16", x: 1, delay: 0.3 },
    { place: 3, h: 45, label: "Glenfiddich 18", x: 2, delay: 0.7 },
  ];
  return (
    <div style={{ position: "relative", width: 220, height: 160 }}>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "center", gap: 8, height: 130, paddingTop: 30 }}>
        {podium.map((p) => (
          <motion.div
            key={p.place}
            initial={{ height: 0 }}
            animate={{ height: p.h }}
            transition={{ delay: p.delay, duration: 0.6, type: "spring" }}
            style={{
              width: 56, borderRadius: "8px 8px 0 0",
              background: p.place === 1 ? `${A}25` : `${A}12`,
              border: `1px solid ${p.place === 1 ? `${A}40` : `${A}20`}`,
              borderBottom: "none",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "flex-start",
              padding: "8px 4px",
            }}
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: p.delay + 0.3, type: "spring" }}
            >
              {p.place === 1 ? (
                <Trophy style={{ width: 16, height: 16, color: A }} strokeWidth={1.5} />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: A, fontFamily: font.body }}>{p.place}</span>
              )}
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: p.delay + 0.5 }}
              style={{ fontSize: 7, color: `${A}80`, fontFamily: font.body, textAlign: "center", marginTop: 4, lineHeight: 1.2 }}
            >
              {p.label}
            </motion.span>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{ position: "absolute", bottom: -5, right: 10, display: "flex", alignItems: "center", gap: 4 }}
      >
        <FileDown style={{ width: 12, height: 12, color: `${A}60` }} strokeWidth={1.5} />
        <span style={{ fontSize: 9, color: `${A}60`, fontFamily: font.body }}>PDF · Excel</span>
      </motion.div>
    </div>
  );
}

function Vis_FlavorProfile() {
  const points = 6;
  const r = 70;
  const labels = ["Smoke", "Fruit", "Spice", "Sweet", "Floral", "Body"];
  const values = [0.72, 0.55, 0.78, 0.85, 0.45, 0.68];
  const getXY = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / points - Math.PI / 2;
    return { x: 90 + Math.cos(angle) * radius, y: 90 + Math.sin(angle) * radius };
  };
  const dataPath = values.map((val, i) => {
    const p = getXY(i, r * val);
    return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
  }).join(" ") + "Z";

  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      {[1, 0.66, 0.33].map((s, si) => (
        <polygon key={si}
          points={Array.from({ length: points }, (_, i) => { const p = getXY(i, r * s); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke={A} strokeWidth="0.5" opacity={0.15}
        />
      ))}
      {Array.from({ length: points }, (_, i) => {
        const p = getXY(i, r);
        return <line key={i} x1="90" y1="90" x2={p.x} y2={p.y} stroke={A} strokeWidth="0.3" opacity={0.2} />;
      })}
      <motion.polygon
        points={values.map((val, i) => { const p = getXY(i, r * val); return `${p.x},${p.y}`; }).join(" ")}
        fill={`${A}12`} stroke={A} strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
        style={{ transformOrigin: "90px 90px" }}
      />
      {labels.map((label, i) => {
        const p = getXY(i, r + 16);
        return (
          <motion.text key={i}
            x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill={A} fontSize="8" fontFamily={font.body} fontWeight="500" opacity={0.7}
            initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}
            transition={{ delay: 0.8 + i * 0.1 }}
          >
            {label}
          </motion.text>
        );
      })}
    </svg>
  );
}

function Vis_Analytics() {
  const bars = [35, 52, 68, 48, 75, 55, 42, 62, 50, 38, 58, 45];
  return (
    <div style={{ position: "relative", width: 200, height: 120 }}>
      <div style={{ display: "flex", alignItems: "end", gap: 4, height: 90, padding: "0 10px" }}>
        {bars.map((h, i) => (
          <motion.div key={i}
            initial={{ height: 0 }}
            animate={{ height: h }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.5, type: "spring" }}
            style={{
              flex: 1, borderRadius: "3px 3px 0 0",
              background: `linear-gradient(to top, ${A}15, ${A}${20 + Math.floor(h / 3)})`,
            }}
          />
        ))}
      </div>
      <svg viewBox="0 0 200 90" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 90 }}>
        <motion.path
          d={`M10,${90 - bars[0]} ${bars.map((h, i) => `L${10 + i * 16.5},${90 - h}`).join(" ")}`}
          fill="none" stroke={A} strokeWidth="1.5" opacity={0.6}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px 0" }}
      >
        <span style={{ fontSize: 8, color: `${A}50`, fontFamily: font.body }}>Jan</span>
        <span style={{ fontSize: 8, color: `${A}50`, fontFamily: font.body }}>Dec</span>
      </motion.div>
    </div>
  );
}

function Vis_AI() {
  const words = ["Honey", "Peat", "Vanilla", "Oak", "Dried Fruit", "Sea Salt"];
  return (
    <div style={{ position: "relative", width: 200, height: 140 }}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          width: 140, height: 80, borderRadius: 12, margin: "0 auto",
          background: `${A}08`, border: `1px solid ${A}20`, padding: 10,
          position: "relative", overflow: "hidden",
        }}
      >
        {words.map((w, i) => (
          <motion.span key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.2, duration: 0.3 }}
            style={{
              display: "inline-block", fontSize: 9, color: A, fontFamily: font.body,
              background: `${A}12`, padding: "2px 6px", borderRadius: 4,
              margin: "0 3px 3px 0", fontWeight: 500,
            }}
          >
            {w}
          </motion.span>
        ))}
      </motion.div>
      {[0, 1, 2].map((i) => (
        <motion.div key={i}
          style={{ position: "absolute", top: 10 + i * 15, left: 160 + i * 5 }}
          animate={{ y: [0, -5, 0], opacity: [0.3, 0.8, 0.3], rotate: [0, 15, 0] }}
          transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
        >
          <Sparkles style={{ width: 12, height: 12, color: A }} strokeWidth={1.5} />
        </motion.div>
      ))}
    </div>
  );
}

function Vis_Pairings() {
  const pairs = [
    { left: "🥃", right: "🍫", delay: 0.3, label: "Dark Chocolate" },
    { left: "🥃", right: "🧀", delay: 0.7, label: "Aged Cheddar" },
    { left: "🥃", right: "🍯", delay: 1.1, label: "Honeycomb" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 180 }}>
      {pairs.map((p, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: p.delay, duration: 0.5 }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: `${A}08`, border: `1px solid ${A}15`,
            borderRadius: 10, padding: "8px 12px",
          }}
        >
          <span style={{ fontSize: 18 }}>{p.left}</span>
          <motion.div
            initial={{ width: 0 }} animate={{ width: 20 }}
            transition={{ delay: p.delay + 0.3, duration: 0.3 }}
            style={{ height: 1, background: `${A}30` }}
          />
          <span style={{ fontSize: 18 }}>{p.right}</span>
          <span style={{ fontSize: 9, color: `${A}80`, fontFamily: font.body, fontWeight: 500 }}>{p.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function Vis_Badges() {
  const badges = [
    { icon: Star, label: "First Dram", delay: 0.3 },
    { icon: Wine, label: "10 Tastings", delay: 0.6 },
    { icon: Trophy, label: "Host Pro", delay: 0.9 },
    { icon: Radar, label: "Flavour Expert", delay: 1.2 },
    { icon: BookOpen, label: "Journaler", delay: 1.5 },
    { icon: Award, label: "100 Drams", delay: 1.8 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, width: 180 }}>
      {badges.map((b, i) => (
        <motion.div key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: b.delay, type: "spring", stiffness: 300 }}
          style={{
            width: 52, height: 52, borderRadius: 12,
            background: `${A}10`, border: `1px solid ${A}20`,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
          }}
        >
          <b.icon style={{ width: 16, height: 16, color: A, opacity: 0.7 }} strokeWidth={1.5} />
          <span style={{ fontSize: 6, color: `${A}70`, fontFamily: font.body, fontWeight: 500, textAlign: "center" }}>{b.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function Vis_Compare() {
  const points = 6;
  const r = 55;
  const v1 = [0.72, 0.55, 0.78, 0.85, 0.45, 0.68];
  const v2 = [0.5, 0.8, 0.4, 0.65, 0.75, 0.55];
  const getXY = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / points - Math.PI / 2;
    return { x: 80 + Math.cos(angle) * radius, y: 80 + Math.sin(angle) * radius };
  };
  const path1 = v1.map((val, i) => { const p = getXY(i, r * val); return `${i === 0 ? "M" : "L"}${p.x},${p.y}`; }).join(" ") + "Z";
  const path2 = v2.map((val, i) => { const p = getXY(i, r * val); return `${i === 0 ? "M" : "L"}${p.x},${p.y}`; }).join(" ") + "Z";

  return (
    <div style={{ position: "relative" }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <polygon
          points={Array.from({ length: points }, (_, i) => { const p = getXY(i, r); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke={A} strokeWidth="0.5" opacity={0.15}
        />
        <motion.polygon points={path1} fill={`${A}10`} stroke={A} strokeWidth="1.2" opacity={0.7}
          initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.4, duration: 0.6 }}
        />
        <motion.polygon points={path2} fill={`#6a9a5b10`} stroke="#6a9a5b" strokeWidth="1.2" opacity={0.6}
          initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.8, duration: 0.6 }}
        />
      </svg>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        style={{
          position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 12, fontSize: 9, fontFamily: font.body,
        }}
      >
        <span style={{ color: A }}>● You</span>
        <span style={{ color: "#6a9a5b" }}>● Taste Twin</span>
      </motion.div>
    </div>
  );
}

function Vis_Privacy() {
  return (
    <div style={{ position: "relative", width: 160, height: 160 }}>
      <motion.div
        style={{ position: "absolute", inset: 20, borderRadius: "50%", border: `1.5px solid ${A}20` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        style={{ position: "absolute", inset: 35, borderRadius: "50%", border: `1px solid ${A}12` }}
        animate={{ rotate: -360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: `${A}12`, border: `1.5px solid ${A}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Shield style={{ width: 24, height: 24, color: A, opacity: 0.7 }} strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

function Vis_Start() {
  return (
    <div style={{ position: "relative", width: 220, height: 180 }}>
      <motion.div
        style={{ position: "absolute", inset: 10, borderRadius: "50%", background: `radial-gradient(circle, ${A}15 0%, transparent 70%)` }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: `${A}15`, border: `2px solid ${A}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Heart style={{ width: 32, height: 32, color: A, fill: `${A}30` }} strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

interface SlideData {
  id: string;
  title: string;
  subtitle: string;
  visual: () => JSX.Element;
}

const slides: SlideData[] = [
  { id: "welcome", title: "CaskSense", subtitle: "Where tasting becomes reflection.", visual: Vis_Welcome },
  { id: "problem", title: "Tastings fade.", subtitle: "Great moments deserve to be remembered.", visual: Vis_Problem },
  { id: "solution", title: "Capture every dram.", subtitle: "Your tasting notes, saved and structured.", visual: Vis_Solution },
  { id: "log", title: "Log a Dram", subtitle: "Rate nose, palate, finish — in seconds.", visual: Vis_LogDram },
  { id: "scan", title: "Scan a Bottle", subtitle: "AI recognizes the whisky instantly.", visual: Vis_Scan },
  { id: "journal", title: "Your Whisky Journal", subtitle: "Every dram tells a story. Keep yours.", visual: Vis_Journal },
  { id: "collection", title: "Your Collection", subtitle: "Import from Whiskybase. Track every bottle.", visual: Vis_Collection },
  { id: "host", title: "Host a Tasting", subtitle: "Invite friends. Share a link. Go.", visual: Vis_HostTasting },
  { id: "guided", title: "Guided Flow", subtitle: "Reveal drams one by one. You set the pace.", visual: Vis_GuidedFlow },
  { id: "blind", title: "Blind Tasting", subtitle: "No labels. Pure perception. Then — reveal.", visual: Vis_BlindTasting },
  { id: "results", title: "Tasting Results", subtitle: "Rankings, scores, and export in one click.", visual: Vis_Results },
  { id: "profile", title: "Your Flavour Profile", subtitle: "Discover patterns in your palate.", visual: Vis_FlavorProfile },
  { id: "analytics", title: "Taste Analytics", subtitle: "See how your preferences evolve.", visual: Vis_Analytics },
  { id: "ai", title: "AI Tasting Notes", subtitle: "Vocabulary that inspires, not replaces.", visual: Vis_AI },
  { id: "pairings", title: "Food Pairings", subtitle: "AI-curated matches for your dram.", visual: Vis_Pairings },
  { id: "badges", title: "Achievements", subtitle: "Celebrate milestones on your journey.", visual: Vis_Badges },
  { id: "compare", title: "Taste Twins", subtitle: "Find people who taste like you.", visual: Vis_Compare },
  { id: "start", title: "Ready?", subtitle: "Start your whisky journey with CaskSense.", visual: Vis_Start },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 200 : -200, opacity: 0, scale: 0.95 }),
};

export default function GuidedPresentation() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const slide = slides[current];

  const go = useCallback((next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDirection(next > current ? 1 : -1);
    setCurrent(next);
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(current + 1);
      if (e.key === "ArrowLeft") go(current - 1);
      if (e.key === "Escape") window.history.back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, go]);

  useEffect(() => {
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) go(dx < 0 ? current + 1 : current - 1);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [current, go]);

  const isLast = current === slides.length - 1;
  const Visual = slide.visual;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: v.bg,
      display: "flex", flexDirection: "column",
      fontFamily: font.body,
      overflow: "hidden",
      userSelect: "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", flexShrink: 0,
      }}>
        <Link href="/" data-testid="button-presentation-close" style={{
          display: "flex", alignItems: "center", gap: 6,
          color: v.muted, fontSize: 13, textDecoration: "none",
          fontFamily: font.body,
        }}>
          <X style={{ width: 18, height: 18 }} strokeWidth={1.5} />
        </Link>
        <div style={{
          fontSize: 12, color: v.mutedLight, fontFamily: font.body,
          fontVariantNumeric: "tabular-nums",
        }}>
          {current + 1} / {slides.length}
        </div>
      </div>

      <div style={{ padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 3, maxWidth: 500, margin: "0 auto" }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              data-testid={`button-slide-dot-${i}`}
              style={{
                flex: 1, height: 2.5, borderRadius: 2, border: "none",
                background: i <= current ? v.accent : v.border,
                cursor: "pointer", padding: 0,
                transition: "background 0.3s",
                opacity: i <= current ? 1 : 0.4,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        padding: "16px 24px",
      }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", textAlign: "center",
              gap: 28, width: "100%",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: 200,
            }}>
              <Visual />
            </div>

            <div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  fontFamily: font.display,
                  fontSize: "clamp(26px, 5vw, 38px)",
                  fontWeight: 400,
                  color: v.text,
                  lineHeight: 1.15,
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                }}
              >
                {slide.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                style={{
                  fontFamily: font.body,
                  fontSize: "clamp(14px, 1.8vw, 17px)",
                  color: v.muted,
                  lineHeight: 1.5,
                  maxWidth: 380,
                  margin: "0 auto",
                }}
              >
                {slide.subtitle}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px 32px", flexShrink: 0,
        maxWidth: 480, width: "100%", margin: "0 auto",
      }}>
        <button
          onClick={() => go(current - 1)}
          disabled={current === 0}
          data-testid="button-presentation-prev"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "10px 18px", borderRadius: 50,
            background: "transparent",
            border: `1px solid ${current === 0 ? v.border : v.accent}`,
            color: current === 0 ? v.muted : v.accent,
            fontSize: 14, fontWeight: 500,
            cursor: current === 0 ? "default" : "pointer",
            fontFamily: font.body,
            opacity: current === 0 ? 0.3 : 1,
            transition: "all 0.2s",
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>

        {isLast ? (
          <Link href="/enter" data-testid="button-presentation-start" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "12px 28px", borderRadius: 50,
            background: v.accent, color: v.bg,
            fontSize: 15, fontWeight: 600,
            textDecoration: "none", fontFamily: font.body,
          }}>
            Open App
            <ChevronRight style={{ width: 16, height: 16 }} />
          </Link>
        ) : (
          <button
            onClick={() => go(current + 1)}
            data-testid="button-presentation-next"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "12px 28px", borderRadius: 50,
              background: v.accent, color: v.bg,
              fontSize: 15, fontWeight: 600, border: "none",
              cursor: "pointer", fontFamily: font.body,
              transition: "transform 0.2s",
            }}
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>
    </div>
  );
}
