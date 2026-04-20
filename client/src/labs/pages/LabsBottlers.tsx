import { useState, useMemo, lazy, Suspense } from "react";
import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { SuggestEntryDialog } from "@/components/suggest-entry-dialog";
import { Package, MapPin, Calendar, Star, ChevronDown, ExternalLink } from "lucide-react";

const MiniMap = lazy(() => import("@/labs/components/MiniMap"));

interface Bottler {
  id: string;
  name: string;
  country: string;
  region: string;
  founded: number | null;
  description: string | null;
  specialty: string | null;
  website: string | null;
  notableReleases: string[] | null;
  status: string;
  lat: number | null;
  lng: number | null;
}

function Card({ b }: { b: Bottler }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="labs-card" style={{ overflow: "hidden" }} data-testid={`labs-bottler-${b.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <button onClick={() => setOpen(!open)} className="labs-btn-ghost" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", textAlign: "left" }} data-testid={`button-toggle-bottler-${b.name.toLowerCase().replace(/\s+/g, "-")}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Package style={{ width: 14, height: 14, color: "var(--labs-accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{b.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--labs-text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin style={{ width: 10, height: 10 }} />{b.region}, {b.country}</span>
            {b.founded && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Calendar style={{ width: 10, height: 10 }} />Est. {b.founded}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <a href={`https://www.whiskybase.com/search?q=${encodeURIComponent(b.name)}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--labs-text-muted)", padding: 4 }} onClick={(e) => e.stopPropagation()} data-testid={`link-whiskybase-${b.name.toLowerCase().replace(/\s+/g, "-")}`}>
            <ExternalLink style={{ width: 13, height: 13 }} />
          </a>
          <ChevronDown style={{ width: 16, height: 16, color: "var(--labs-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--labs-border)", paddingTop: 12 }}>
          {b.description && <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--labs-text)", margin: 0, opacity: 0.9 }}>{b.description}</p>}
          {b.specialty && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--labs-surface-elevated)", borderRadius: 8, border: "1px solid var(--labs-border)", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <Star style={{ width: 12, height: 12, color: "var(--labs-accent)", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, lineHeight: 1.5, color: "var(--labs-accent)", margin: 0, fontStyle: "italic" }}>{b.specialty}</p>
            </div>
          )}
          {b.notableReleases && b.notableReleases.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>Notable Releases</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {b.notableReleases.map((r) => <span key={r} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "var(--labs-surface-elevated)", color: "var(--labs-text)", border: "1px solid var(--labs-border)" }}>{r}</span>)}
              </div>
            </div>
          )}
          {b.lat != null && b.lng != null && (
            <Suspense fallback={<div style={{ width: "100%", height: 200, borderRadius: 10, marginTop: 10, background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }} />}>
              <MiniMap lat={b.lat} lng={b.lng} />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabsBottlers() {
  const { t } = useTranslation();
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "founded">("name");

  const { data: bottlersData, isLoading } = useQuery<Bottler[]>({
    queryKey: ["encyclopedia-bottlers"],
    queryFn: async () => {
      const res = await fetch("/api/encyclopedia/bottlers");
      if (!res.ok) throw new Error("Failed to fetch bottlers");
      return res.json();
    },
  });

  const bottlersList = bottlersData || [];

  const countries = useMemo(() => {
    const unique = Array.from(new Set(bottlersList.map((b) => b.country))).sort();
    return ["All", ...unique];
  }, [bottlersList]);

  const filtered = useMemo(() => bottlersList
    .filter((b) => {
      const s = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.country.toLowerCase().includes(search.toLowerCase()) || (b.description || "").toLowerCase().includes(search.toLowerCase());
      const c = country === "All" || b.country === country;
      return s && c;
    })
    .sort((a, b) => sortBy === "name" ? a.name.localeCompare(b.name) : (a.founded || 0) - (b.founded || 0)),
  [search, country, sortBy, bottlersList]);

  return (
    <div className="labs-page" data-testid="labs-discover-bottlers-page">
      <DiscoverActionBar active="bibliothek" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: 0 }} data-testid="text-bottlers-title">Independent Bottlers</h1>
        {currentParticipant && <SuggestEntryDialog type="bottler" />}
      </div>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>{isLoading ? t("discover.loading", "Loading...") : t("discover.bottlersSubtitle", { count: bottlersList.length })}</p>

      <input type="text" placeholder="Search bottlers..." value={search} onChange={(e) => setSearch(e.target.value)} className="labs-input" style={{ width: "100%", boxSizing: "border-box" }} data-testid="input-search-bottlers" />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 0" }}>
        {countries.map((c) => (
          <button key={c} onClick={() => setCountry(c)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${country === c ? "var(--labs-accent)" : "var(--labs-border)"}`, background: country === c ? "var(--labs-accent)" : "transparent", color: country === c ? "var(--labs-bg)" : "var(--labs-text-muted)", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }} data-testid={`labs-chip-bottler-${c.toLowerCase()}`}>{c}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{filtered.length} found</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["name", "founded"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)} style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: sortBy === s ? "var(--labs-surface-elevated)" : "transparent", color: sortBy === s ? "var(--labs-accent)" : "var(--labs-text-muted)", fontSize: 11, fontWeight: 500, cursor: "pointer" }} data-testid={`labs-sort-${s}`}>{s === "name" ? "A\u2013Z" : "Founded"}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((b) => <Card key={b.id} b={b} />)}
        {filtered.length === 0 && <div className="labs-empty" data-testid="text-bottlers-empty">No bottlers match your search.</div>}
      </div>
    </div>
  );
}
