import { useState, useEffect, useMemo } from "react";
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

interface CompItem {
  whiskyId: string;
  whiskyName: string;
  distillery: string | null;
  region: string | null;
  userScore: number;
  platformMedian: number;
  delta: number;
  platformN: number;
}

type SortKey = "delta" | "score" | "name";
type FilterDir = "all" | "above" | "below";

export default function WhiskyCompare({ th, t, participantId, onBack }: Props) {
  const [items, setItems] = useState<CompItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("delta");
  const [filterDir, setFilterDir] = useState<FilterDir>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/participants/${participantId}/whisky-profile`, {
          headers: { "x-participant-id": participantId },
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          setItems(d.whiskyComparison || []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participantId]);

  const filtered = useMemo(() => {
    let list = items;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.whiskyName.toLowerCase().includes(q) || (i.distillery || "").toLowerCase().includes(q));
    }
    if (filterDir === "above") list = list.filter((i) => i.delta > 0);
    if (filterDir === "below") list = list.filter((i) => i.delta < 0);

    list = [...list].sort((a, b) => {
      if (sortKey === "delta") return Math.abs(b.delta) - Math.abs(a.delta);
      if (sortKey === "score") return b.userScore - a.userScore;
      return a.whiskyName.localeCompare(b.whiskyName);
    });
    return list;
  }, [items, search, sortKey, filterDir]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "delta", label: t.mwSortDelta },
    { key: "score", label: t.mwSortScore },
    { key: "name", label: t.mwSortName },
  ];

  const filterOptions: { key: FilterDir; label: string }[] = [
    { key: "all", label: t.mwFilterAll },
    { key: "above", label: t.mwFilterAbove },
    { key: "below", label: t.mwFilterBelow },
  ];

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwWhiskyCompare} onBack={onBack} />

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t.mwSearch}
        data-testid="mw-compare-search"
        style={{
          width: "100%",
          padding: `${SP.sm}px ${SP.md}px`,
          fontSize: 14,
          fontFamily: FONT.body,
          background: th.inputBg,
          color: th.text,
          border: `1px solid ${th.border}`,
          borderRadius: RADIUS.lg,
          marginBottom: SP.sm,
          boxSizing: "border-box",
          outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.sm, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: SP.xs }} data-testid="mw-compare-sort">
          {sortOptions.map((o) => (
            <button
              key={o.key}
              onClick={() => setSortKey(o.key)}
              data-testid={`mw-sort-${o.key}`}
              style={{
                padding: `${SP.xs}px ${SP.sm}px`,
                fontSize: 11,
                fontFamily: FONT.body,
                background: sortKey === o.key ? th.bgCard : "transparent",
                color: sortKey === o.key ? th.gold : th.muted,
                border: `1px solid ${sortKey === o.key ? th.gold : th.border}`,
                borderRadius: RADIUS.full,
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: SP.xs }} data-testid="mw-compare-filter">
          {filterOptions.map((o) => (
            <button
              key={o.key}
              onClick={() => setFilterDir(o.key)}
              data-testid={`mw-filter-${o.key}`}
              style={{
                padding: `${SP.xs}px ${SP.sm}px`,
                fontSize: 11,
                fontFamily: FONT.body,
                background: filterDir === o.key ? th.bgCard : "transparent",
                color: filterDir === o.key ? th.gold : th.muted,
                border: `1px solid ${filterDir === o.key ? th.gold : th.border}`,
                borderRadius: RADIUS.full,
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>
          {t.mwNoEntries}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }} data-testid="mw-compare-list">
          {filtered.map((item) => {
            const deltaColor = item.delta > 0 ? th.green : item.delta < 0 ? th.amber : th.muted;
            const deltaSign = item.delta > 0 ? "+" : "";
            return (
              <div
                key={item.whiskyId}
                style={{
                  background: th.bgCard,
                  border: `1px solid ${th.border}`,
                  borderRadius: RADIUS.lg,
                  padding: SP.md,
                }}
                data-testid={`mw-compare-item-${item.whiskyId}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SP.xs }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{item.whiskyName}</div>
                    {item.distillery && <div style={{ fontSize: 11, color: th.muted }}>{item.distillery}{item.region ? ` \u00b7 ${item.region}` : ""}</div>}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: deltaColor,
                      background: `${deltaColor}18`,
                      padding: `2px ${SP.sm}px`,
                      borderRadius: RADIUS.full,
                    }}
                  >
                    {deltaSign}{item.delta.toFixed(1)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: SP.lg, fontSize: 12 }}>
                  <div>
                    <span style={{ color: th.muted }}>{t.mwUserScore}: </span>
                    <span style={{ color: th.gold, fontWeight: 600 }}>{item.userScore.toFixed(1)}</span>
                  </div>
                  <div>
                    <span style={{ color: th.muted }}>{t.mwPlatformMedian}: </span>
                    <span style={{ color: th.text }}>{item.platformMedian.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
