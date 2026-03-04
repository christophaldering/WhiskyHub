import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import SimpleShell from "@/components/simple/simple-shell";
import { flavorProfileApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";

import { c } from "@/lib/theme";

const CHART_COLORS = ["#c8a864", "#6b9bd2", "#d97c5a"];

interface RatedWhiskyItem {
  whisky: { id: string; name: string; distillery: string | null; region: string | null; imageUrl: string | null };
  rating: { overall: number; nose: number; taste: number; finish: number; balance: number; notes: string | null };
}

const DIMENSIONS = [
  { key: "nose", label: "Nose" },
  { key: "taste", label: "Taste" },
  { key: "finish", label: "Finish" },
  { key: "balance", label: "Balance" },
  { key: "overall", label: "Overall" },
];

export default function MyTasteCompare() {
  const { currentParticipant } = useAppStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery<{ ratedWhiskies: RatedWhiskyItem[] }>({
    queryKey: ["flavor-profile", currentParticipant?.id],
    queryFn: () => flavorProfileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <SimpleShell>
        <div style={{ textAlign: "center", padding: "60px 0", color: c.muted }} data-testid="text-sign-in-prompt">
          <p style={{ fontSize: 16 }}>Please sign in to compare whiskies.</p>
        </div>
      </SimpleShell>
    );
  }

  const ratedWhiskies = data?.ratedWhiskies || [];
  const selected = selectedIds.map(id => ratedWhiskies.find(r => r.whisky.id === id)).filter(Boolean) as RatedWhiskyItem[];

  const toggleWhisky = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const filteredWhiskies = ratedWhiskies.filter(r =>
    r.whisky.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.whisky.distillery || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const radarData = DIMENSIONS.map(dim => {
    const entry: Record<string, any> = { dimension: dim.label };
    selected.forEach((item, i) => {
      entry[`whisky${i}`] = (item.rating as any)[dim.key];
    });
    return entry;
  });

  return (
    <SimpleShell>
      <div data-testid="comparison-page" style={{ width: "100%" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            color: c.accent,
            marginBottom: 6,
          }}
          data-testid="text-compare-title"
        >
          Compare Whiskies
        </h1>
        <p style={{ fontSize: 13, color: c.muted, marginBottom: 20 }}>
          Compare your personal ratings of different whiskies side by side
        </p>

        {isLoading ? (
          <div style={{ height: 200, background: c.card, borderRadius: 12, opacity: 0.5 }} />
        ) : ratedWhiskies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: c.muted }} data-testid="text-empty">
            <p>No rated whiskies yet. Rate some whiskies first to compare them.</p>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Search whiskies..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="input-compare-search"
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                background: c.card,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                color: c.text,
                outline: "none",
                marginBottom: 12,
                boxSizing: "border-box",
              }}
            />

            {selected.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {selected.map((item, i) => (
                  <div
                    key={item.whisky.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 12px",
                      borderRadius: 20,
                      border: `1px solid ${CHART_COLORS[i]}`,
                      color: CHART_COLORS[i],
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                    data-testid={`chip-whisky-${item.whisky.id}`}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: CHART_COLORS[i],
                        display: "inline-block",
                      }}
                    />
                    <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.whisky.name}
                    </span>
                    <button
                      onClick={() => toggleWhisky(item.whisky.id)}
                      style={{ background: "none", border: "none", color: CHART_COLORS[i], cursor: "pointer", padding: 0, fontSize: 16, lineHeight: 1 }}
                      data-testid={`button-remove-whisky-${item.whisky.id}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                maxHeight: 200,
                overflowY: "auto",
                background: c.card,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                marginBottom: 24,
              }}
            >
              {filteredWhiskies.map(item => {
                const isSelected = selectedIds.includes(item.whisky.id);
                const colorIdx = selectedIds.indexOf(item.whisky.id);
                return (
                  <button
                    key={item.whisky.id}
                    onClick={() => toggleWhisky(item.whisky.id)}
                    disabled={!isSelected && selectedIds.length >= 3}
                    data-testid={`button-select-whisky-${item.whisky.id}`}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      background: isSelected ? "rgba(212, 162, 86, 0.1)" : "transparent",
                      border: "none",
                      borderBottom: `1px solid ${c.border}`,
                      color: c.text,
                      cursor: !isSelected && selectedIds.length >= 3 ? "not-allowed" : "pointer",
                      opacity: !isSelected && selectedIds.length >= 3 ? 0.4 : 1,
                      textAlign: "left",
                      fontSize: 14,
                    }}
                  >
                    {isSelected ? (
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: CHART_COLORS[colorIdx], flexShrink: 0 }} />
                    ) : (
                      <span style={{ width: 12, height: 12, borderRadius: "50%", border: `1px solid ${c.muted}`, flexShrink: 0 }} />
                    )}
                    {item.whisky.imageUrl && (
                      <img src={item.whisky.imageUrl} alt="" style={{ width: 24, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0, background: c.bg }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.whisky.name}
                      </div>
                      <div style={{ fontSize: 11, color: c.muted }}>
                        {[item.whisky.distillery, item.whisky.region].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: c.muted, flexShrink: 0 }}>{item.rating.overall.toFixed(1)}</span>
                  </button>
                );
              })}
            </div>

            {selected.length >= 2 && (
              <>
                <div
                  style={{
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24,
                  }}
                  data-testid="radar-chart-container"
                >
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke={c.border} />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: c.muted, fontSize: 12 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: c.muted, fontSize: 10 }} />
                        {selected.map((item, i) => (
                          <Radar
                            key={item.whisky.id}
                            name={item.whisky.name}
                            dataKey={`whisky${i}`}
                            stroke={CHART_COLORS[i]}
                            fill={CHART_COLORS[i]}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        ))}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
                    {selected.map((item, i) => (
                      <div key={item.whisky.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: CHART_COLORS[i], display: "inline-block" }} />
                        <span style={{ color: CHART_COLORS[i] }}>{item.whisky.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                  data-testid="comparison-table"
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                        <th style={{ textAlign: "left", padding: "10px 14px", color: c.muted, fontWeight: 600 }}>Dimension</th>
                        {selected.map((item, i) => (
                          <th key={item.whisky.id} style={{ textAlign: "center", padding: "10px 8px", color: CHART_COLORS[i], fontWeight: 600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.whisky.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DIMENSIONS.map(dim => {
                        const vals = selected.map(s => (s.rating as any)[dim.key] as number);
                        const maxVal = Math.max(...vals);
                        return (
                          <tr key={dim.key} style={{ borderBottom: `1px solid ${c.border}` }}>
                            <td style={{ padding: "8px 14px", color: c.text, fontWeight: 500 }}>{dim.label}</td>
                            {selected.map((item, i) => {
                              const val = (item.rating as any)[dim.key] as number;
                              return (
                                <td
                                  key={item.whisky.id}
                                  style={{
                                    textAlign: "center",
                                    padding: "8px",
                                    fontWeight: val === maxVal ? 700 : 400,
                                    color: val === maxVal ? c.accent : c.muted,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {val.toFixed(1)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {selected.length < 2 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: c.muted }} data-testid="text-select-more">
                <p style={{ fontSize: 14 }}>Select at least 2 whiskies to compare.</p>
              </div>
            )}
          </>
        )}
      </div>
    </SimpleShell>
  );
}
