import { useState, useMemo, lazy, Suspense } from "react";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { distilleries, type Distillery } from "@/data/distilleries";
import { Building2, MapPin, Calendar, ChevronDown, List, Map as MapIcon } from "lucide-react";

const DistilleryMap = lazy(() => import("@/pages/distillery-map"));
const COUNTRIES = ["All", "Scotland", "Ireland", "Japan", "USA"];

function Card({ d }: { d: Distillery }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, overflow: "hidden" }} data-testid={`m2-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", color: v.text, textAlign: "left" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 style={{ width: 14, height: 14, color: v.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</span>
            {d.status && d.status !== "active" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: v.border, color: v.muted, textTransform: "uppercase" }}>{d.status}</span>}
          </div>
          <div style={{ fontSize: 11, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin style={{ width: 11, height: 11 }} />{d.region}, {d.country}
          </div>
        </div>
        <ChevronDown style={{ width: 16, height: 16, color: v.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${v.border}`, paddingTop: 12 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: v.text, margin: 0, opacity: 0.9 }}>{d.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11, color: v.accent }}>
            <Calendar style={{ width: 12, height: 12 }} />Founded {d.founded}
          </div>
          {d.feature && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: v.elevated, borderRadius: 8, border: `1px solid ${v.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: v.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>Key Fact</span>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: v.muted, margin: "4px 0 0" }}>{d.feature}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function M2DiscoverDistilleries() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [view, setView] = useState<"list" | "map">("list");

  const filtered = useMemo(() => distilleries.filter((d) => {
    const s = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.region.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase());
    const c = country === "All" || d.country === country;
    return s && c;
  }), [search, country]);

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: view === "map" ? 1000 : 600, margin: "0 auto" }} data-testid="m2-discover-distilleries-page">
      <M2BackButton />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 4px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-distilleries-title">Distilleries</h1>
        <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${v.border}`, overflow: "hidden" }}>
          {(["list", "map"] as const).map((m) => (
            <button key={m} onClick={() => setView(m)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, background: view === m ? v.accent : "transparent", color: view === m ? v.bg : v.muted }} data-testid={`m2-view-${m}`}>
              {m === "list" ? <List style={{ width: 12, height: 12 }} /> : <MapIcon style={{ width: 12, height: 12 }} />}{m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 12, color: v.muted, margin: "0 0 16px" }}>Explore {distilleries.length} distilleries worldwide</p>

      {view === "map" ? (
        <Suspense fallback={<div style={{ textAlign: "center", padding: 60, color: v.muted }}>Loading map…</div>}>
          <div style={{ background: v.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${v.border}` }}><DistilleryMap /></div>
        </Suspense>
      ) : (
        <>
          <input type="text" placeholder="Search distilleries..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} data-testid="m2-input-search-distilleries" />
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 0" }}>
            {COUNTRIES.map((c) => (
              <button key={c} onClick={() => setCountry(c)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${country === c ? v.accent : v.border}`, background: country === c ? v.accent : "transparent", color: country === c ? v.bg : v.muted, fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }} data-testid={`m2-chip-${c.toLowerCase()}`}>{c}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: v.muted, marginBottom: 10 }}>{filtered.length} found</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((d) => <Card key={d.name} d={d} />)}
            {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: v.muted }}>No distilleries match your search.</div>}
          </div>
        </>
      )}
    </div>
  );
}
