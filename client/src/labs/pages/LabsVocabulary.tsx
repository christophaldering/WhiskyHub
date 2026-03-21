import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ChevronLeft, X, Copy, Check, Trash2, ChevronUp, ChevronDown } from "lucide-react";

const CATEGORY_IDS = ["islay", "speyside", "sherry", "bourbon", "highland", "japanese"] as const;
type CategoryId = typeof CATEGORY_IDS[number];

const CATEGORY_COLORS: Record<CategoryId, string> = {
  islay: "#6B9EAE",
  speyside: "#8EAF5A",
  sherry: "#C06868",
  bourbon: "#D4A05A",
  highland: "#9B7DB8",
  japanese: "#E8A0B4",
};

const CATEGORY_ICONS: Record<CategoryId, string> = {
  islay: "\uD83D\uDD25", speyside: "\uD83C\uDF4E", sherry: "\uD83C\uDF77",
  bourbon: "\uD83C\uDF3D", highland: "\u26F0\uFE0F", japanese: "\uD83C\uDDEF\uD83C\uDDF5",
};

const COMPASS_POSITIONS: Record<CategoryId, { x: number; y: number }> = {
  islay: { x: 0.78, y: 0.18 },
  speyside: { x: 0.22, y: 0.75 },
  sherry: { x: 0.72, y: 0.68 },
  bourbon: { x: 0.45, y: 0.78 },
  highland: { x: 0.68, y: 0.42 },
  japanese: { x: 0.28, y: 0.35 },
};

const RADAR_AXES = ["Smoke", "Fruit", "Spice", "Sweet", "Floral", "Maritime"] as const;

const RADAR_PROFILES: Record<CategoryId, number[]> = {
  islay: [0.95, 0.2, 0.4, 0.15, 0.05, 0.9],
  speyside: [0.05, 0.9, 0.2, 0.8, 0.7, 0.05],
  sherry: [0.1, 0.7, 0.85, 0.6, 0.15, 0.05],
  bourbon: [0.15, 0.5, 0.7, 0.9, 0.1, 0.05],
  highland: [0.3, 0.5, 0.6, 0.5, 0.4, 0.2],
  japanese: [0.15, 0.6, 0.3, 0.5, 0.8, 0.1],
};

type ViewMode = "wheel" | "compass" | "radar";
type TermSection = "nose" | "palate" | "finish";

interface CollectedTerm {
  term: string;
  section: TermSection;
  category: CategoryId;
}

function SegmentedControl({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: { key: ViewMode; label: string }[] = [
    { key: "wheel", label: "Flavour Wheel" },
    { key: "compass", label: "Style Compass" },
    { key: "radar", label: "Aroma Radar" },
  ];

  return (
    <div className="labs-segmented" data-testid="segmented-view-switcher">
      {options.map((opt) => (
        <button
          key={opt.key}
          className={`labs-segmented-btn ${value === opt.key ? "labs-segmented-btn-active" : ""}`}
          onClick={() => onChange(opt.key)}
          data-testid={`button-view-${opt.key}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FlavourWheel({
  categories,
  focusedCategory,
  onFocusCategory,
  onCollectTerm,
  collectedTerms,
}: {
  categories: { id: CategoryId; name: string; nose: string[]; palate: string[]; finish: string[] }[];
  focusedCategory: CategoryId | null;
  onFocusCategory: (id: CategoryId | null) => void;
  onCollectTerm: (term: string, section: TermSection, category: CategoryId) => void;
  collectedTerms: CollectedTerm[];
}) {
  const cx = 200, cy = 200, outerR = 170, innerR = 60;
  const collectedSet = useMemo(() => new Set(collectedTerms.map(t => `${t.category}-${t.section}-${t.term}`)), [collectedTerms]);

  const segments = categories.map((cat, i) => {
    const startAngle = (i * 60 - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * 60 - 90) * (Math.PI / 180);
    const midAngle = ((i + 0.5) * 60 - 90) * (Math.PI / 180);

    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(startAngle);
    const y1i = cy + innerR * Math.sin(startAngle);
    const x2i = cx + innerR * Math.cos(endAngle);
    const y2i = cy + innerR * Math.sin(endAngle);

    const path = `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${outerR} ${outerR} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${innerR} ${innerR} 0 0 0 ${x1i} ${y1i}`;

    const labelR = (outerR + innerR) / 2 + 15;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);

    const isFocused = focusedCategory === cat.id;
    const isDimmed = focusedCategory !== null && !isFocused;

    return { ...cat, path, labelX, labelY, midAngle, startAngle, endAngle, isFocused, isDimmed };
  });

  const focused = focusedCategory ? categories.find(c => c.id === focusedCategory) : null;

  return (
    <div data-testid="view-flavour-wheel" style={{ position: "relative" }}>
      <svg viewBox="0 0 400 400" style={{ width: "100%", maxWidth: 400, margin: "0 auto", display: "block" }}>
        {segments.map((seg) => (
          <g key={seg.id} onClick={() => onFocusCategory(seg.isFocused ? null : seg.id)} style={{ cursor: "pointer" }}>
            <path
              d={seg.path}
              fill={CATEGORY_COLORS[seg.id]}
              fillOpacity={seg.isDimmed ? 0.15 : seg.isFocused ? 0.5 : 0.3}
              stroke={CATEGORY_COLORS[seg.id]}
              strokeWidth={seg.isFocused ? 2.5 : 1}
              strokeOpacity={seg.isDimmed ? 0.2 : 0.6}
              style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
            <text
              x={seg.labelX}
              y={seg.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={seg.isDimmed ? "var(--labs-text-muted)" : CATEGORY_COLORS[seg.id]}
              fontSize={seg.isFocused ? 12 : 10}
              fontWeight={seg.isFocused ? 700 : 500}
              style={{ transition: "all 0.3s ease", pointerEvents: "none", fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {seg.name.split(" / ")[0]}
            </text>
          </g>
        ))}
        <circle cx={cx} cy={cy} r={innerR - 2} fill="var(--labs-bg)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--labs-text)" fontSize={11} fontWeight={600} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Flavour
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--labs-text-muted)" fontSize={10}>
          Map
        </text>
      </svg>

      {focused && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "var(--labs-surface)",
            borderRadius: "var(--labs-radius)",
            border: `1px solid ${CATEGORY_COLORS[focusedCategory!]}33`,
            animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
          data-testid={`wheel-detail-${focusedCategory}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[focusedCategory!]}</span>
            <span className="labs-serif" style={{ fontSize: 16, fontWeight: 600, color: CATEGORY_COLORS[focusedCategory!] }}>{focused.name}</span>
          </div>
          {(["nose", "palate", "finish"] as TermSection[]).map((section) => (
            <div key={section} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                {section === "nose" ? "Nose / Aromas" : section === "palate" ? "Palate / Taste" : "Finish"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {(focused[section] as string[]).map((term) => {
                  const isCollected = collectedSet.has(`${focusedCategory}-${section}-${term}`);
                  return (
                    <button
                      key={term}
                      onClick={(e) => { e.stopPropagation(); onCollectTerm(term, section, focusedCategory!); }}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: isCollected ? `${CATEGORY_COLORS[focusedCategory!]}22` : "var(--labs-surface-elevated)",
                        color: isCollected ? CATEGORY_COLORS[focusedCategory!] : "var(--labs-text)",
                        border: `1px solid ${isCollected ? CATEGORY_COLORS[focusedCategory!] : "var(--labs-border)"}`,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontFamily: "inherit",
                        minHeight: 32,
                      }}
                      data-testid={`button-term-${focusedCategory}-${section}-${term.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {isCollected ? "✓ " : ""}{term}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StyleCompass({
  categories,
  onSelectCategory,
  selectedCategory,
  onCollectTerm,
  collectedTerms,
}: {
  categories: { id: CategoryId; name: string; nose: string[]; palate: string[]; finish: string[] }[];
  onSelectCategory: (id: CategoryId | null) => void;
  selectedCategory: CategoryId | null;
  onCollectTerm: (term: string, section: TermSection, category: CategoryId) => void;
  collectedTerms: CollectedTerm[];
}) {
  const collectedSet = useMemo(() => new Set(collectedTerms.map(t => `${t.category}-${t.section}-${t.term}`)), [collectedTerms]);
  const selected = selectedCategory ? categories.find(c => c.id === selectedCategory) : null;
  const w = 400, h = 360;

  return (
    <div data-testid="view-style-compass" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 420, margin: "0 auto", display: "block" }}>
        <line x1={40} y1={h / 2} x2={w - 40} y2={h / 2} stroke="var(--labs-border)" strokeWidth={1} strokeDasharray="4 4" />
        <line x1={w / 2} y1={30} x2={w / 2} y2={h - 30} stroke="var(--labs-border)" strokeWidth={1} strokeDasharray="4 4" />

        <text x={w - 35} y={h / 2 - 6} fill="var(--labs-text-muted)" fontSize={9} textAnchor="end">Full-Bodied</text>
        <text x={45} y={h / 2 - 6} fill="var(--labs-text-muted)" fontSize={9} textAnchor="start">Light</text>
        <text x={w / 2} y={38} fill="var(--labs-text-muted)" fontSize={9} textAnchor="middle">Smoky</text>
        <text x={w / 2} y={h - 24} fill="var(--labs-text-muted)" fontSize={9} textAnchor="middle">Sweet</text>

        {categories.map((cat) => {
          const pos = COMPASS_POSITIONS[cat.id];
          const px = 40 + pos.x * (w - 80);
          const py = 30 + pos.y * (h - 60);
          const isSelected = selectedCategory === cat.id;
          const isDimmed = selectedCategory !== null && !isSelected;
          const r = isSelected ? 32 : 26;
          const color = CATEGORY_COLORS[cat.id];

          return (
            <g key={cat.id} onClick={() => onSelectCategory(isSelected ? null : cat.id)} style={{ cursor: "pointer" }}>
              <circle cx={px} cy={py} r={r + 8} fill={color} fillOpacity={0.06} style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              <circle
                cx={px} cy={py} r={r}
                fill={color}
                fillOpacity={isDimmed ? 0.12 : 0.25}
                stroke={color}
                strokeWidth={isSelected ? 2 : 1}
                strokeOpacity={isDimmed ? 0.2 : 0.5}
                style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              />
              <text x={px} y={py - 4} textAnchor="middle" fill={isDimmed ? "var(--labs-text-muted)" : color} fontSize={10} fontWeight={600} style={{ transition: "all 0.3s ease", pointerEvents: "none", fontFamily: "'Playfair Display', Georgia, serif" }}>
                {cat.name.split(" / ")[0]}
              </text>
              <text x={px} y={py + 9} textAnchor="middle" fill={isDimmed ? "var(--labs-text-muted)" : "var(--labs-text-secondary)"} fontSize={8} style={{ pointerEvents: "none", opacity: isDimmed ? 0.4 : 0.7 }}>
                {cat.name.split(" / ")[1] || ""}
              </text>
            </g>
          );
        })}
      </svg>

      {selected && selectedCategory && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: "var(--labs-surface)",
            borderRadius: "var(--labs-radius)",
            border: `1px solid ${CATEGORY_COLORS[selectedCategory]}33`,
            animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
          data-testid={`compass-detail-${selectedCategory}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[selectedCategory]}</span>
            <span className="labs-serif" style={{ fontSize: 16, fontWeight: 600, color: CATEGORY_COLORS[selectedCategory] }}>{selected.name}</span>
            <button onClick={(e) => { e.stopPropagation(); onSelectCategory(null); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--labs-text-muted)" }} data-testid="button-close-compass-detail">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          {(["nose", "palate", "finish"] as TermSection[]).map((section) => (
            <div key={section} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                {section === "nose" ? "Nose / Aromas" : section === "palate" ? "Palate / Taste" : "Finish"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {(selected[section] as string[]).map((term) => {
                  const isCollected = collectedSet.has(`${selectedCategory}-${section}-${term}`);
                  return (
                    <button
                      key={term}
                      onClick={(e) => { e.stopPropagation(); onCollectTerm(term, section, selectedCategory); }}
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 20,
                        background: isCollected ? `${CATEGORY_COLORS[selectedCategory]}22` : "var(--labs-surface-elevated)",
                        color: isCollected ? CATEGORY_COLORS[selectedCategory] : "var(--labs-text)",
                        border: `1px solid ${isCollected ? CATEGORY_COLORS[selectedCategory] : "var(--labs-border)"}`,
                        cursor: "pointer", transition: "all 0.2s ease", fontFamily: "inherit", minHeight: 32,
                      }}
                      data-testid={`button-term-${selectedCategory}-${section}-${term.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {isCollected ? "✓ " : ""}{term}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AromaRadar({
  categories,
  collectedTerms,
  onCollectTerm,
}: {
  categories: { id: CategoryId; name: string; nose: string[]; palate: string[]; finish: string[] }[];
  collectedTerms: CollectedTerm[];
  onCollectTerm: (term: string, section: TermSection, category: CategoryId) => void;
}) {
  const [enabledCategories, setEnabledCategories] = useState<Set<CategoryId>>(new Set(["islay", "speyside"]));
  const collectedSet = useMemo(() => new Set(collectedTerms.map(t => `${t.category}-${t.section}-${t.term}`)), [collectedTerms]);

  const toggleCategory = (id: CategoryId) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cx = 200, cy = 190, maxR = 140;
  const levels = [0.25, 0.5, 0.75, 1.0];

  const getPoint = (axisIndex: number, value: number) => {
    const angle = (axisIndex * 60 - 90) * (Math.PI / 180);
    return {
      x: cx + maxR * value * Math.cos(angle),
      y: cy + maxR * value * Math.sin(angle),
    };
  };

  const getPolygonPoints = (values: number[]) =>
    values.map((v, i) => {
      const p = getPoint(i, v);
      return `${p.x},${p.y}`;
    }).join(" ");

  const userProfile = useMemo(() => {
    const scores = RADAR_AXES.map(() => 0);
    const axisKeywords: Record<string, string[]> = {
      Smoke: ["smoke", "peat", "ash", "campfire", "charcoal", "bonfire", "smoky", "charred", "char"],
      Fruit: ["fruit", "apple", "pear", "cherry", "citrus", "peach", "apricot", "plum", "melon", "orange", "berries", "banana"],
      Spice: ["spice", "pepper", "cinnamon", "clove", "ginger", "nutmeg", "spicy"],
      Sweet: ["sweet", "honey", "vanilla", "caramel", "toffee", "sugar", "butterscotch", "chocolate", "marzipan", "treacle", "molasses"],
      Floral: ["floral", "flower", "heather", "blossom", "rose", "lavender", "herbs", "herbal", "tea", "mint", "incense"],
      Maritime: ["salt", "brine", "sea", "maritime", "coastal", "iodine", "seaweed", "marine", "mineral"],
    };
    collectedTerms.forEach(ct => {
      const termLower = ct.term.toLowerCase();
      RADAR_AXES.forEach((axis, i) => {
        if (axisKeywords[axis].some(kw => termLower.includes(kw))) {
          scores[i] += 0.15;
        }
      });
    });
    return scores.map(s => Math.min(s, 1));
  }, [collectedTerms]);

  const hasUserProfile = collectedTerms.length > 0;
  const [selectedRadarCat, setSelectedRadarCat] = useState<CategoryId | null>(null);
  const selectedCat = selectedRadarCat ? categories.find(c => c.id === selectedRadarCat) : null;

  return (
    <div data-testid="view-aroma-radar">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16, justifyContent: "center" }}>
        {categories.map((cat) => {
          const isOn = enabledCategories.has(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`labs-chip ${isOn ? "labs-chip-active" : ""}`}
              style={isOn ? { background: `${CATEGORY_COLORS[cat.id]}18`, borderColor: CATEGORY_COLORS[cat.id], color: CATEGORY_COLORS[cat.id] } : {}}
              data-testid={`button-toggle-radar-${cat.id}`}
            >
              <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[cat.id]}</span>
              {cat.name.split(" / ")[0]}
            </button>
          );
        })}
      </div>

      <svg viewBox="0 0 400 400" style={{ width: "100%", maxWidth: 400, margin: "0 auto", display: "block" }}>
        {levels.map((level) => (
          <polygon
            key={level}
            points={getPolygonPoints(RADAR_AXES.map(() => level))}
            fill="none"
            stroke="var(--labs-border)"
            strokeWidth={level === 1 ? 1 : 0.5}
            strokeOpacity={0.5}
          />
        ))}

        {RADAR_AXES.map((axis, i) => {
          const ep = getPoint(i, 1);
          const lp = getPoint(i, 1.16);
          return (
            <g key={axis}>
              <line x1={cx} y1={cy} x2={ep.x} y2={ep.y} stroke="var(--labs-border)" strokeWidth={0.5} strokeOpacity={0.4} />
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill="var(--labs-text-secondary)" fontSize={10} fontWeight={500}>
                {axis}
              </text>
            </g>
          );
        })}

        {categories.filter(c => enabledCategories.has(c.id)).map((cat) => (
          <g key={cat.id} onClick={() => setSelectedRadarCat(selectedRadarCat === cat.id ? null : cat.id)} style={{ cursor: "pointer" }}>
            <polygon
              points={getPolygonPoints(RADAR_PROFILES[cat.id])}
              fill={CATEGORY_COLORS[cat.id]}
              fillOpacity={0.12}
              stroke={CATEGORY_COLORS[cat.id]}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              style={{ transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
            {RADAR_PROFILES[cat.id].map((val, i) => {
              if (val < 0.3) return null;
              const p = getPoint(i, val);
              return <circle key={i} cx={p.x} cy={p.y} r={3} fill={CATEGORY_COLORS[cat.id]} fillOpacity={0.8} />;
            })}
          </g>
        ))}

        {hasUserProfile && (
          <polygon
            points={getPolygonPoints(userProfile)}
            fill="var(--labs-accent)"
            fillOpacity={0.15}
            stroke="var(--labs-accent)"
            strokeWidth={2}
            strokeDasharray="6 3"
            style={{ transition: "all 0.5s ease" }}
          />
        )}
      </svg>

      {hasUserProfile && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 500 }}>
            — Your tasting profile (from collected terms) —
          </span>
        </div>
      )}

      {selectedCat && selectedRadarCat && (
        <div
          style={{
            marginTop: 12, padding: 16, background: "var(--labs-surface)",
            borderRadius: "var(--labs-radius)", border: `1px solid ${CATEGORY_COLORS[selectedRadarCat]}33`,
            animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
          data-testid={`radar-detail-${selectedRadarCat}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[selectedRadarCat]}</span>
            <span className="labs-serif" style={{ fontSize: 16, fontWeight: 600, color: CATEGORY_COLORS[selectedRadarCat] }}>{selectedCat.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setSelectedRadarCat(null); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--labs-text-muted)" }} data-testid="button-close-radar-detail">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          {(["nose", "palate", "finish"] as TermSection[]).map((section) => (
            <div key={section} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                {section === "nose" ? "Nose / Aromas" : section === "palate" ? "Palate / Taste" : "Finish"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {(selectedCat[section] as string[]).map((term) => {
                  const isCollected = collectedSet.has(`${selectedRadarCat}-${section}-${term}`);
                  return (
                    <button
                      key={term}
                      onClick={(e) => { e.stopPropagation(); onCollectTerm(term, section, selectedRadarCat); }}
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 20,
                        background: isCollected ? `${CATEGORY_COLORS[selectedRadarCat]}22` : "var(--labs-surface-elevated)",
                        color: isCollected ? CATEGORY_COLORS[selectedRadarCat] : "var(--labs-text)",
                        border: `1px solid ${isCollected ? CATEGORY_COLORS[selectedRadarCat] : "var(--labs-border)"}`,
                        cursor: "pointer", transition: "all 0.2s ease", fontFamily: "inherit", minHeight: 32,
                      }}
                      data-testid={`button-term-${selectedRadarCat}-${section}-${term.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {isCollected ? "✓ " : ""}{term}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyNotesTray({
  terms,
  onRemoveTerm,
  onClearAll,
}: {
  terms: CollectedTerm[];
  onRemoveTerm: (index: number) => void;
  onClearAll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<TermSection, CollectedTerm[]> = { nose: [], palate: [], finish: [] };
    terms.forEach(t => groups[t.section].push(t));
    return groups;
  }, [terms]);

  const handleCopy = useCallback(() => {
    const text = terms.map(t => t.term).join(", ");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [terms]);

  if (terms.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 500,
        zIndex: 100,
        animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
      data-testid="my-notes-tray"
    >
      <div
        style={{
          background: "var(--labs-surface)",
          borderRadius: expanded ? "var(--labs-radius) var(--labs-radius) var(--labs-radius-sm) var(--labs-radius-sm)" : "var(--labs-radius-lg)",
          border: "1px solid var(--labs-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
          overflow: "hidden",
          transition: "border-radius 0.3s ease",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            cursor: "pointer",
            color: "var(--labs-text)",
          }}
          onClick={() => setExpanded(!expanded)}
          data-testid="button-toggle-notes-tray"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded(!expanded); }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>My Notes</span>
          <span
            style={{
              background: "var(--labs-accent)",
              color: "var(--labs-bg)",
              borderRadius: 999,
              minWidth: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              padding: "0 6px",
            }}
            data-testid="text-notes-count"
          >
            {terms.length}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: copied ? "var(--labs-success)" : "var(--labs-text-muted)" }}
            data-testid="button-copy-notes"
          >
            {copied ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClearAll(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--labs-text-muted)" }}
            data-testid="button-clear-notes"
          >
            <Trash2 style={{ width: 16, height: 16 }} />
          </button>
          {expanded ? <ChevronDown style={{ width: 16, height: 16, color: "var(--labs-text-muted)" }} /> : <ChevronUp style={{ width: 16, height: 16, color: "var(--labs-text-muted)" }} />}
        </div>

        {expanded && (
          <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--labs-border)", maxHeight: 280, overflowY: "auto" }}>
            {(["nose", "palate", "finish"] as TermSection[]).map((section) => {
              if (grouped[section].length === 0) return null;
              return (
                <div key={section} style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    {section === "nose" ? "Nose / Aromas" : section === "palate" ? "Palate / Taste" : "Finish"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {grouped[section].map((ct) => {
                      const idx = terms.indexOf(ct);
                      return (
                        <span
                          key={`${ct.category}-${ct.term}-${idx}`}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px 4px 10px",
                            borderRadius: 20,
                            background: `${CATEGORY_COLORS[ct.category]}18`,
                            color: CATEGORY_COLORS[ct.category],
                            border: `1px solid ${CATEGORY_COLORS[ct.category]}44`,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {ct.term}
                          <button
                            onClick={() => onRemoveTerm(idx)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", display: "flex", lineHeight: 1 }}
                            data-testid={`button-remove-note-${idx}`}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LabsVocabulary() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>("wheel");
  const [focusedCategory, setFocusedCategory] = useState<CategoryId | null>(null);
  const [compassCategory, setCompassCategory] = useState<CategoryId | null>(null);
  const [collectedTerms, setCollectedTerms] = useState<CollectedTerm[]>([]);

  const categories = useMemo(() =>
    CATEGORY_IDS.map((id) => ({
      id,
      name: t(`vocabCategories.${id}.name`),
      nose: t(`vocabCategories.${id}.nose`, { returnObjects: true }) as string[],
      palate: t(`vocabCategories.${id}.palate`, { returnObjects: true }) as string[],
      finish: t(`vocabCategories.${id}.finish`, { returnObjects: true }) as string[],
    })),
    [t]
  );

  const collectTerm = useCallback((term: string, section: TermSection, category: CategoryId) => {
    setCollectedTerms(prev => {
      const exists = prev.some(ct => ct.term === term && ct.section === section && ct.category === category);
      if (exists) return prev.filter(ct => !(ct.term === term && ct.section === section && ct.category === category));
      if (navigator.vibrate) navigator.vibrate(10);
      return [...prev, { term, section, category }];
    });
  }, []);

  const removeTerm = useCallback((index: number) => {
    setCollectedTerms(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => setCollectedTerms([]), []);

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" style={{ paddingBottom: collectedTerms.length > 0 ? 140 : undefined }} data-testid="labs-flavour-map-page">
      <Link href="/labs/entdecken" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-flavour-map">
          <ChevronLeft className="w-4 h-4" /> {t("discover.title", "Discover")}
        </button>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-flavour-map-title">
          Flavour Map
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>
        Explore whisky styles interactively — tap terms to collect tasting notes
      </p>

      <div style={{ marginBottom: 20 }}>
        <SegmentedControl value={viewMode} onChange={(v) => { setViewMode(v); setFocusedCategory(null); setCompassCategory(null); }} />
      </div>

      <div style={{ minHeight: 300 }}>
        {viewMode === "wheel" && (
          <div className="labs-fade-in">
            <FlavourWheel
              categories={categories}
              focusedCategory={focusedCategory}
              onFocusCategory={setFocusedCategory}
              onCollectTerm={collectTerm}
              collectedTerms={collectedTerms}
            />
          </div>
        )}
        {viewMode === "compass" && (
          <div className="labs-fade-in">
            <StyleCompass
              categories={categories}
              selectedCategory={compassCategory}
              onSelectCategory={setCompassCategory}
              onCollectTerm={collectTerm}
              collectedTerms={collectedTerms}
            />
          </div>
        )}
        {viewMode === "radar" && (
          <div className="labs-fade-in">
            <AromaRadar
              categories={categories}
              collectedTerms={collectedTerms}
              onCollectTerm={collectTerm}
            />
          </div>
        )}
      </div>

      <MyNotesTray terms={collectedTerms} onRemoveTerm={removeTerm} onClearAll={clearAll} />
    </div>
  );
}
