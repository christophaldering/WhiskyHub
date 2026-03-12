import { useState, useMemo, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { distilleries, type Distillery } from "@/data/distilleries";
import { Building2, MapPin, Calendar, ChevronDown, ChevronLeft, List, Map as MapIcon } from "lucide-react";

const DistilleryMap = lazy(() => import("@/pages/distillery-map"));
const COUNTRIES = ["All", "Scotland", "Ireland", "Japan", "USA"];

function Card({ d }: { d: Distillery }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="labs-card" style={{ overflow: "hidden" }} data-testid={`labs-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <button onClick={() => setOpen(!open)} className="labs-btn-ghost" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", textAlign: "left" }} data-testid={`button-toggle-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 style={{ width: 14, height: 14, color: "var(--labs-accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{d.name}</span>
            {d.status && d.status !== "active" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--labs-border)", color: "var(--labs-text-muted)", textTransform: "uppercase" }}>{d.status}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin style={{ width: 11, height: 11 }} />{d.region}, {d.country}
          </div>
        </div>
        <ChevronDown style={{ width: 16, height: 16, color: "var(--labs-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--labs-border)", paddingTop: 12 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--labs-text)", margin: 0, opacity: 0.9 }}>{d.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11, color: "var(--labs-accent)" }}>
            <Calendar style={{ width: 12, height: 12 }} />Founded {d.founded}
          </div>
          {d.feature && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--labs-surface-elevated)", borderRadius: 8, border: "1px solid var(--labs-border)" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>Key Fact</span>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: "var(--labs-text-muted)", margin: "4px 0 0" }}>{d.feature}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabsDistilleries() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [view, setView] = useState<"list" | "map">("list");

  const filtered = useMemo(() => distilleries.filter((d) => {
    const s = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.region.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase());
    const c = country === "All" || d.country === country;
    return s && c;
  }), [search, country]);

  return (
    <div className="px-5 py-6 mx-auto" style={{ maxWidth: view === "map" ? 1000 : 600 }} data-testid="labs-discover-distilleries-page">
      <Link href="/labs/discover" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-distilleries">
          <ChevronLeft className="w-4 h-4" /> Discover
        </button>
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-distilleries-title">Distilleries</h1>
        <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--labs-border)", overflow: "hidden" }}>
          {(["list", "map"] as const).map((m) => (
            <button key={m} onClick={() => setView(m)} className="labs-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 11, fontWeight: 500, background: view === m ? "var(--labs-accent)" : "transparent", color: view === m ? "var(--labs-bg)" : "var(--labs-text-muted)", borderRadius: 0 }} data-testid={`labs-view-${m}`}>
              {m === "list" ? <List style={{ width: 12, height: 12 }} /> : <MapIcon style={{ width: 12, height: 12 }} />}{m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>{t("m2.discover.distilleriesSubtitle", "Explore {{count}} distilleries worldwide", { count: distilleries.length })}</p>

      {view === "map" ? (
        <Suspense fallback={<div style={{ textAlign: "center", padding: 60, color: "var(--labs-text-muted)" }}>Loading map...</div>}>
          <div className="labs-card" style={{ overflow: "hidden" }}><DistilleryMap /></div>
        </Suspense>
      ) : (
        <>
          <input type="text" placeholder="Search distilleries..." value={search} onChange={(e) => setSearch(e.target.value)} className="labs-input" style={{ width: "100%", boxSizing: "border-box" }} data-testid="input-search-distilleries" />
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 0" }}>
            {COUNTRIES.map((c) => (
              <button key={c} onClick={() => setCountry(c)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${country === c ? "var(--labs-accent)" : "var(--labs-border)"}`, background: country === c ? "var(--labs-accent)" : "transparent", color: country === c ? "var(--labs-bg)" : "var(--labs-text-muted)", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }} data-testid={`labs-chip-${c.toLowerCase()}`}>{c}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 10 }}>{filtered.length} found</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((d) => <Card key={d.name} d={d} />)}
            {filtered.length === 0 && <div className="labs-empty" data-testid="text-distilleries-empty">No distilleries match your search.</div>}
          </div>
        </>
      )}
    </div>
  );
}
