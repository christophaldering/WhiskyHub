import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { pidHeaders } from "@/lib/api";
import { ChevronLeft, Wine } from "lucide-react";

type Item = {
  id?: string | null; name?: string | null; title?: string | null;
  distillery?: string | null; region?: string | null; caskType?: string | null;
  createdAt?: string | Date | null;
  personalScore?: number | null; noseScore?: number | null; tasteScore?: number | null; finishScore?: number | null;
  tastingNarrative?: string | null; flavorTags?: string[] | null; tags?: string[] | null; imageUrl?: string | null;
};
type Preset = "month" | "quarter" | "year" | "custom";

const toTime = (d?: string | Date | null) => (d ? new Date(d).getTime() : 0);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function DramTimeTravel({ allItems, onBack }: { allItems: Item[]; onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const isDe = (i18n.language || "").toLowerCase().startsWith("de");
  const now = new Date();
  const [preset, setPreset] = useState<Preset>("quarter");
  const [customFrom, setCustomFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth() - 3, 1)));
  const [customTo, setCustomTo] = useState(iso(now));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ narrative: string } | null>(null);

  const range = useMemo(() => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    if (preset === "custom") return { from: new Date(customFrom + "T00:00:00"), to: new Date(customTo + "T23:59:59") };
    let start = new Date();
    if (preset === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (preset === "quarter") start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    else start = new Date(now.getFullYear(), 0, 1);
    return { from: start, to: end };
  }, [preset, customFrom, customTo]);

  const inRange = useMemo(() => {
    const f = range.from.getTime(), tt = range.to.getTime();
    return allItems.filter((e) => { const x = toTime(e.createdAt); return x >= f && x <= tt; })
      .sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
  }, [allItems, range]);

  const enough = inRange.length >= 3;
  const scores = inRange.map((e) => Number(e.personalScore)).filter((n) => Number.isFinite(n));
  const distilleries = new Set(inRange.map((e) => (e.distillery || "").toLowerCase().trim()).filter(Boolean));
  const regionCounts = new Map<string, number>();
  inRange.forEach((e) => { const r = (e.region || "").trim(); if (r) regionCounts.set(r, (regionCounts.get(r) || 0) + 1); });
  const topRegion = [...regionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const spark = useMemo(() => {
    if (scores.length < 2) return null;
    const min = Math.min(...scores), max = Math.max(...scores), span = max - min || 1;
    const W = 280, H = 48, px = 6, py = 8, iw = W - px * 2, ih = H - py * 2;
    const pts = scores.map((s, i) => `${(px + (i / (scores.length - 1)) * iw).toFixed(1)},${(py + ih - ((s - min) / span) * ih).toFixed(1)}`).join(" ");
    return { W, H, pts };
  }, [scores]);

  const generate = async (regenerate: boolean) => {
    setLoading(true); setError(null);
    try {
      const drams = inRange.map((e) => ({
        date: e.createdAt, name: e.name || e.title, distillery: e.distillery,
        region: e.region, cask: e.caskType, overall: e.personalScore,
        nose: e.noseScore, taste: e.tasteScore, finish: e.finishScore,
        tags: e.flavorTags || e.tags, narrative: e.tastingNarrative,
      }));
      const label = preset === "month" ? (isDe ? "Dieser Monat" : "This month")
        : preset === "quarter" ? (isDe ? "Letzte 3 Monate" : "Last 3 months")
        : preset === "year" ? (isDe ? "Dieses Jahr" : "This year")
        : `${iso(range.from)} – ${iso(range.to)}`;
      const res = await fetch("/api/cooper/timetravel", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": isDe ? "de" : "en", ...pidHeaders() },
        body: JSON.stringify({ from: iso(range.from), to: iso(range.to), label, drams, regenerate }),
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error(isDe ? "Die Zeitreise gibt es nur mit Konto." : "Time travel needs an account.");
        throw new Error(isDe ? "Konnte die Reise nicht erzeugen." : "Could not generate the journey.");
      }
      const data = await res.json();
      setResult({ narrative: data.narrative });
    } catch (e: any) {
      setError(e?.message || "Fehler");
    } finally { setLoading(false); }
  };

  const chips: [Preset, string][] = [
    ["month", isDe ? "Dieser Monat" : "This month"],
    ["quarter", isDe ? "Letzte 3 Monate" : "Last 3 months"],
    ["year", isDe ? "Dieses Jahr" : "This year"],
    ["custom", isDe ? "Frei" : "Custom"],
  ];

  return (
    <div className="labs-fade-in" style={{ paddingBottom: 100 }}>
      <button onClick={onBack} className="labs-btn-ghost flex items-center gap-1" style={{ color: "var(--labs-text-muted)", marginBottom: 12 }}>
        <ChevronLeft className="w-4 h-4" /> {t("common.back", isDe ? "Zurück" : "Back")}
      </button>
      <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: "0 0 4px" }}>{isDe ? "Zeitreise" : "Time travel"}</h1>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>
        {isDe ? "Cooper erzählt deine Verkostungs-Reise durch einen Zeitraum." : "Cooper narrates your tasting journey through a period."}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {chips.map(([p, label]) => (
          <button key={p} onClick={() => { setPreset(p); setResult(null); }} style={{ padding: "8px 14px", borderRadius: 22, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: preset === p ? "transparent" : "var(--labs-border)", background: preset === p ? "var(--labs-accent)" : "var(--labs-surface)", color: preset === p ? "var(--labs-on-accent, #1a1510)" : "var(--labs-text)" }}>{label}</button>
        ))}
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setResult(null); }} className="labs-input" style={{ flex: 1, minWidth: 130 }} />
          <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setResult(null); }} className="labs-input" style={{ flex: 1, minWidth: 130 }} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>
          {inRange.length} {isDe ? "Verkostungen" : "tastings"}{distilleries.size ? ` · ${distilleries.size} ${isDe ? "Brennereien" : "distilleries"}` : ""}{topRegion ? ` · ${topRegion}` : ""}
        </span>
        <button disabled={!enough || loading} onClick={() => generate(!!result)} style={{ padding: "10px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: enough && !loading ? "pointer" : "not-allowed", opacity: enough && !loading ? 1 : 0.5, background: "var(--labs-accent)", color: "var(--labs-on-accent, #1a1510)", border: "none" }}>
          {loading ? (isDe ? "Cooper erzählt …" : "Cooper is narrating …") : result ? (isDe ? "Neu erzeugen" : "Regenerate") : (isDe ? "Reise erzeugen" : "Create journey")}
        </button>
      </div>
      {!enough && <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: 16 }}>{isDe ? "Mindestens 3 Verkostungen in diesem Zeitraum nötig." : "At least 3 tastings needed in this period."}</p>}
      {error && <p style={{ fontSize: 13, color: "var(--labs-danger)", marginBottom: 16 }}>{error}</p>}

      {result && spark && (
        <div style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 12, padding: "12px 10px", marginBottom: 16 }}>
          <svg viewBox={`0 0 ${spark.W} ${spark.H}`} width="100%" height={spark.H} preserveAspectRatio="none" aria-hidden="true">
            <polyline points={spark.pts} fill="none" stroke="var(--labs-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {result && (
        <div style={{ marginBottom: 20 }} data-testid="timetravel-narrative">
          {result.narrative.split(/\n{2,}/).map((block, i) => {
            const trimmed = block.trim();
            const isHeading = /^[A-ZÄÖÜ\s]{4,30}$/.test(trimmed);
            if (isHeading) return (
              <p key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--labs-accent)", margin: "24px 0 6px" }}>{trimmed}</p>
            );
            return (
              <p key={i} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, lineHeight: 1.65, color: "var(--labs-text)", margin: "0 0 12px" }}>{trimmed}</p>
            );
          })}
        </div>
      )}

      {result && inRange.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--labs-text-muted)", marginBottom: 8 }}>{isDe ? "Die Drams dieser Reise" : "The drams of this journey"}</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {inRange.map((e, i) => (
              <div key={e.id || i} style={{ flex: "0 0 auto", width: 96, textAlign: "center" }}>
                <div style={{ width: 96, height: 96, borderRadius: 12, overflow: "hidden", background: "var(--labs-surface)", border: "1px solid var(--labs-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {e.imageUrl ? <img src={e.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Wine className="w-6 h-6" style={{ color: "var(--labs-text-muted)" }} />}
                </div>
                <div style={{ fontSize: 11, color: "var(--labs-text-secondary, var(--labs-text-muted))", marginTop: 4, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{e.name || e.title || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
