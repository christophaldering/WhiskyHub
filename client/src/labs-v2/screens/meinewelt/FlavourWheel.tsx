import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import SubScreenHeader from "./SubScreenHeader";

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onBack: () => void;
}

const FLAVOUR_CATEGORIES = [
  { name: "Fruity", subs: ["Citrus", "Tropical", "Dried Fruit", "Berry"], color: "#e8a838" },
  { name: "Floral", subs: ["Rose", "Heather", "Lavender"], color: "#d479a8" },
  { name: "Spicy", subs: ["Pepper", "Cinnamon", "Ginger", "Clove"], color: "#c47a3a" },
  { name: "Sweet", subs: ["Honey", "Vanilla", "Caramel", "Toffee"], color: "#d4a847" },
  { name: "Smoky", subs: ["Peat", "Campfire", "Ash", "Tar"], color: "#8a8a8a" },
  { name: "Woody", subs: ["Oak", "Cedar", "Pine"], color: "#a0785a" },
  { name: "Malty", subs: ["Cereal", "Biscuit", "Bread", "Chocolate"], color: "#b89a6a" },
  { name: "Marine", subs: ["Brine", "Seaweed", "Iodine"], color: "#6a9ab8" },
];

export default function FlavourWheel({ th, t, participantId, onBack }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [enabledCats, setEnabledCats] = useState<Set<string>>(new Set(FLAVOUR_CATEGORIES.map((c) => c.name)));
  const [aromaData, setAromaData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/participants/${participantId}/flavor-profile`, {
          headers: { "x-participant-id": participantId },
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          if (d.topAromas) {
            const map: Record<string, number> = {};
            for (const a of d.topAromas) {
              map[a.name || a.aroma] = a.count || a.frequency || 1;
            }
            setAromaData(map);
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participantId]);

  const outerData = FLAVOUR_CATEGORIES.filter((c) => enabledCats.has(c.name)).map((c) => {
    const count = c.subs.reduce((sum, s) => sum + (aromaData[s.toLowerCase()] || aromaData[s] || 1), 0);
    return { name: c.name, value: count, color: c.color };
  });

  const innerData = FLAVOUR_CATEGORIES.filter((c) => enabledCats.has(c.name)).flatMap((c) =>
    c.subs.map((s) => ({
      name: s,
      value: aromaData[s.toLowerCase()] || aromaData[s] || 1,
      color: c.color,
      parent: c.name,
    }))
  );

  const selectedCat = selectedIdx !== null ? outerData[selectedIdx] : null;
  const selectedSubs = selectedCat
    ? FLAVOUR_CATEGORIES.find((c) => c.name === selectedCat.name)?.subs || []
    : [];

  const toggleCat = (name: string) => {
    setEnabledCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (next.size > 1) next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwFlavourWheel} onBack={onBack} />

      {loading ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>...</div>
      ) : (
        <>
          <div
            style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.lg }}
            data-testid="mw-fw-chart"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={innerData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={1}
                  stroke={th.bg}
                  strokeWidth={1}
                >
                  {innerData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.5} />
                  ))}
                </Pie>
                <Pie
                  data={outerData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={120}
                  paddingAngle={2}
                  stroke={th.bg}
                  strokeWidth={2}
                  onClick={(_, idx) => setSelectedIdx(selectedIdx === idx ? null : idx)}
                  style={{ cursor: "pointer" }}
                >
                  {outerData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={selectedIdx === i ? 1 : 0.75} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", fontSize: 11, color: th.muted }}>{t.mwClickDetail}</div>
          </div>

          {selectedCat && (
            <div
              style={{
                background: th.bgCard,
                border: `1px solid ${selectedCat.color}44`,
                borderRadius: RADIUS.lg,
                padding: SP.md,
                marginBottom: SP.lg,
              }}
              data-testid="mw-fw-detail"
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: selectedCat.color, marginBottom: SP.sm }}>{selectedCat.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm }}>
                {selectedSubs.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 12,
                      padding: `${SP.xs}px ${SP.sm}px`,
                      borderRadius: RADIUS.full,
                      background: `${selectedCat.color}22`,
                      color: selectedCat.color,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: SP.sm, marginBottom: SP.lg }} data-testid="mw-fw-stats">
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>{outerData.length}</div>
              <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>Categories</div>
            </div>
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.display, color: th.amber }}>{innerData.length}</div>
              <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>Aromas</div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: SP.xs }} data-testid="mw-fw-legend">
            {FLAVOUR_CATEGORIES.map((c) => (
              <button
                key={c.name}
                onClick={() => toggleCat(c.name)}
                data-testid={`mw-fw-toggle-${c.name.toLowerCase()}`}
                style={{
                  padding: `${SP.xs}px ${SP.sm}px`,
                  fontSize: 11,
                  fontFamily: FONT.body,
                  borderRadius: RADIUS.full,
                  border: `1px solid ${c.color}`,
                  background: enabledCats.has(c.name) ? `${c.color}33` : "transparent",
                  color: enabledCats.has(c.name) ? c.color : th.muted,
                  cursor: "pointer",
                  opacity: enabledCats.has(c.name) ? 1 : 0.5,
                  transition: "all 0.2s",
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
