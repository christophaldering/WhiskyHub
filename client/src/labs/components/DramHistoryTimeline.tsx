import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type HItem = {
  id?: string | null;
  name?: string | null;
  title?: string | null;
  distillery?: string | null;
  createdAt?: string | Date | null;
  personalScore?: number | null;
  noseScore?: number | null;
  tasteScore?: number | null;
  finishScore?: number | null;
  tastingNarrative?: string | null;
  source?: string;
};

const norm = (s?: string | null) => (s || "").toLowerCase().trim();
const toTime = (d?: string | Date | null) => (d ? new Date(d).getTime() : 0);

function excerpt(s?: string | null, max = 140): string {
  const txt = (s || "").trim().replace(/\s+/g, " ");
  return txt.length <= max ? txt : txt.slice(0, max).trimEnd() + "…";
}

export default function DramHistoryTimeline({ entry, allItems }: { entry: HItem; allItems: HItem[] }) {
  const { i18n } = useTranslation();
  const isDe = (i18n.language || "").toLowerCase().startsWith("de");
  const locale = isDe ? "de-DE" : "en-GB";

  const history = useMemo(() => {
    const name = norm(entry.name || entry.title);
    const dist = norm(entry.distillery);
    if (!name) return [] as HItem[];
    return allItems
      .filter((e) => norm(e.name || e.title) === name && norm(e.distillery) === dist && e.personalScore != null)
      .sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
  }, [allItems, entry]);

  if (history.length < 2) return null;

  const scores = history.map((h) => Number(h.personalScore));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  const W = 280, H = 56, padX = 6, padY = 10;
  const innerW = W - padX * 2, innerH = H - padY * 2;
  const pts = scores.map((s, i) => ({
    x: padX + (scores.length === 1 ? innerW / 2 : (i / (scores.length - 1)) * innerW),
    y: padY + innerH - ((s - min) / span) * innerH,
  }));
  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const isCurrent = (h: HItem) =>
    (!!entry.id && !!h.id && h.id === entry.id) ||
    (toTime(h.createdAt) === toTime(entry.createdAt) && Number(h.personalScore) === Number(entry.personalScore));

  const fmtDate = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const listed = [...history].reverse();

  return (
    <div style={{ marginTop: 20 }} data-testid="dram-history-timeline">
      <h3 className="labs-serif" style={{ fontSize: 17, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 4px" }}>
        {isDe ? "Eindruck über die Zeit" : "Impression over time"}
      </h3>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 12px" }}>
        {isDe ? `${history.length} Verkostungen dieses Whiskys` : `${history.length} tastings of this whisky`}
      </p>

      <div style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 12, padding: "12px 10px", marginBottom: 14 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
          <polyline points={polyline} fill="none" stroke="var(--labs-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => {
            const cur = isCurrent(history[i]);
            return <circle key={i} cx={p.x} cy={p.y} r={cur ? 4 : 2.5} fill={cur ? "var(--labs-accent)" : "var(--labs-surface)"} stroke="var(--labs-accent)" strokeWidth={1.5} />;
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--labs-text-muted)", marginTop: 4 }}>
          <span>{fmtDate(history[0].createdAt)}</span>
          <span>{fmtDate(history[history.length - 1].createdAt)}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {listed.map((h, idx) => {
          const ci = history.indexOf(h);
          const prev = ci > 0 ? Number(history[ci - 1].personalScore) : null;
          const cur = Number(h.personalScore);
          const delta = prev != null ? cur - prev : null;
          const current = isCurrent(h);
          const deltaColor = delta == null ? "var(--labs-text-muted)" : delta > 0 ? "var(--labs-success, #4caf7d)" : delta < 0 ? "var(--labs-danger)" : "var(--labs-text-muted)";
          const deltaArrow = delta == null ? "" : delta > 0 ? "▲" : delta < 0 ? "▼" : "■";
          return (
            <div key={h.id || idx} data-testid="dram-history-entry" style={{
              background: current ? "var(--labs-accent-muted, rgba(212,168,71,0.12))" : "var(--labs-surface)",
              border: `1px solid ${current ? "color-mix(in srgb, var(--labs-accent) 40%, transparent)" : "var(--labs-border)"}`,
              borderRadius: 12, padding: "10px 12px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                  {fmtDate(h.createdAt)}{h.source === "tasting" ? " · Tasting" : " · Solo"}{current ? (isDe ? " · diese" : " · this one") : ""}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  {delta != null && <span style={{ fontSize: 12, fontWeight: 600, color: deltaColor }}>{deltaArrow} {Math.abs(delta).toFixed(1)}</span>}
                  <span className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-accent)" }}>{cur.toFixed(1)}</span>
                </div>
              </div>
              {(h.noseScore != null || h.tasteScore != null || h.finishScore != null) && (
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--labs-text-secondary, var(--labs-text-muted))", marginTop: 4 }}>
                  {h.noseScore != null && <span>{isDe ? "Nase" : "Nose"} {Number(h.noseScore).toFixed(0)}</span>}
                  {h.tasteScore != null && <span>{isDe ? "Gaumen" : "Palate"} {Number(h.tasteScore).toFixed(0)}</span>}
                  {h.finishScore != null && <span>{isDe ? "Abgang" : "Finish"} {Number(h.finishScore).toFixed(0)}</span>}
                </div>
              )}
              {h.tastingNarrative && (
                <p style={{ fontSize: 14, color: "var(--labs-text-secondary, var(--labs-text-muted))", lineHeight: 1.5, margin: "8px 0 0", fontStyle: "italic" }}>{excerpt(h.tastingNarrative)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
