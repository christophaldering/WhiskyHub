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

interface JournalEntry {
  id: string;
  title: string;
  whiskyName: string;
  distillery: string;
  region: string;
  personalScore: number | null;
  noseNotes: string;
  tasteNotes: string;
  finishNotes: string;
  notes: string;
  tags: string[];
  createdAt: string;
  source: string;
}

type SortKey = "date" | "score" | "name";

const PAGE_SIZE = 10;

export default function JournalList({ th, t, participantId, onBack }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/journal/${participantId}`, {
          headers: { "x-participant-id": participantId },
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          setEntries(Array.isArray(d) ? d : d.entries || []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participantId]);

  const filtered = useMemo(() => {
    let list = entries;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        (e.whiskyName || "").toLowerCase().includes(q) ||
        (e.title || "").toLowerCase().includes(q) ||
        (e.distillery || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortKey === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === "score") return (b.personalScore ?? 0) - (a.personalScore ?? 0);
      return (a.whiskyName || a.title || "").localeCompare(b.whiskyName || b.title || "");
    });
    return list;
  }, [entries, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "date", label: t.mwSortBy },
    { key: "score", label: t.mwSortScore },
    { key: "name", label: t.mwSortName },
  ];

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwJournalEntries} onBack={onBack} />

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        placeholder={t.mwSearch}
        data-testid="mw-journal-search"
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

      <div style={{ display: "flex", gap: SP.xs, marginBottom: SP.lg }} data-testid="mw-journal-sort">
        {sortOptions.map((o) => (
          <button
            key={o.key}
            onClick={() => { setSortKey(o.key); setPage(0); }}
            data-testid={`mw-jsort-${o.key}`}
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

      {loading ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: SP.xxl }} data-testid="mw-journal-empty">
          <div style={{ fontSize: 40, marginBottom: SP.md }}>{"\ud83d\udcd3"}</div>
          <div style={{ fontSize: 14, color: th.muted, marginBottom: SP.md }}>{t.mwNoEntries}</div>
          <button
            data-testid="mw-journal-start-solo"
            style={{
              padding: `${SP.sm}px ${SP.lg}px`,
              fontSize: 14,
              fontFamily: FONT.body,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
              color: "#fff",
              border: "none",
              borderRadius: RADIUS.full,
              cursor: "pointer",
            }}
          >
            {t.mwStartSolo}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }} data-testid="mw-journal-list">
            {pageItems.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div
                  key={entry.id}
                  data-testid={`mw-journal-item-${entry.id}`}
                  style={{
                    background: th.bgCard,
                    border: `1px solid ${th.border}`,
                    borderRadius: RADIUS.lg,
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    data-testid={`mw-journal-toggle-${entry.id}`}
                    style={{
                      width: "100%",
                      padding: SP.md,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: FONT.body,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{entry.whiskyName || entry.title}</div>
                      <div style={{ fontSize: 11, color: th.muted }}>
                        {entry.distillery && `${entry.distillery} \u00b7 `}
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
                      {entry.personalScore != null && entry.personalScore > 0 && (
                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>
                          {entry.personalScore}
                        </span>
                      )}
                      <span style={{ fontSize: 16, color: th.muted, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                        \u25be
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: `0 ${SP.md}px ${SP.md}px`, borderTop: `1px solid ${th.border}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm, marginTop: SP.sm }}>
                        {[
                          { label: t.ratingNose, value: entry.noseNotes, color: th.phases.nose.accent },
                          { label: t.ratingPalate, value: entry.tasteNotes, color: th.phases.palate.accent },
                          { label: t.ratingFinish, value: entry.finishNotes, color: th.phases.finish.accent },
                          { label: t.ratingOverall, value: entry.notes, color: th.phases.overall.accent },
                        ].map((dim) => (
                          <div key={dim.label}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: dim.color, marginBottom: 2 }}>{dim.label}</div>
                            <div style={{ fontSize: 12, color: th.text }}>{dim.value || "\u2013"}</div>
                          </div>
                        ))}
                      </div>
                      {entry.tags && entry.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: SP.xs, marginTop: SP.sm }}>
                          {entry.tags.map((tag, i) => (
                            <span key={i} style={{
                              fontSize: 10, padding: `2px ${SP.sm}px`, borderRadius: RADIUS.full,
                              background: `${th.gold}22`, color: th.gold,
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: SP.sm, marginTop: SP.lg }} data-testid="mw-journal-pagination">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                data-testid="mw-journal-prev"
                style={{
                  padding: `${SP.xs}px ${SP.md}px`, fontSize: 13, fontFamily: FONT.body,
                  background: th.bgCard, color: page === 0 ? th.muted : th.text,
                  border: `1px solid ${th.border}`, borderRadius: RADIUS.full, cursor: page === 0 ? "default" : "pointer",
                }}
              >
                \u2190
              </button>
              <span style={{ fontSize: 13, color: th.muted, display: "flex", alignItems: "center" }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                data-testid="mw-journal-next"
                style={{
                  padding: `${SP.xs}px ${SP.md}px`, fontSize: 13, fontFamily: FONT.body,
                  background: th.bgCard, color: page >= totalPages - 1 ? th.muted : th.text,
                  border: `1px solid ${th.border}`, borderRadius: RADIUS.full, cursor: page >= totalPages - 1 ? "default" : "pointer",
                }}
              >
                \u2192
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
