import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { bottlers, type Bottler } from "@/data/bottlers";
import { Package, MapPin, Calendar, Star, ChevronDown, ExternalLink } from "lucide-react";

const COUNTRIES = ["All", ...Array.from(new Set(bottlers.map((b) => b.country))).sort()];

function Card({ b, t }: { b: Bottler; t: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, overflow: "hidden" }} data-testid={`m2-bottler-${b.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", color: v.text, textAlign: "left" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Package style={{ width: 14, height: 14, color: v.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: v.muted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin style={{ width: 10, height: 10 }} />{b.region}, {b.country}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Calendar style={{ width: 10, height: 10 }} />{t("m2.discover.bottlersEstablished", "Est.")} {b.founded}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <a href={`https://www.whiskybase.com/search?q=${encodeURIComponent(b.name)}`} target="_blank" rel="noopener noreferrer" style={{ color: v.muted, padding: 4 }} onClick={(e) => e.stopPropagation()}>
            <ExternalLink style={{ width: 13, height: 13 }} />
          </a>
          <ChevronDown style={{ width: 16, height: 16, color: v.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${v.border}`, paddingTop: 12 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: v.text, margin: 0, opacity: 0.9 }}>{b.description}</p>
          <div style={{ marginTop: 10, padding: "8px 10px", background: v.elevated, borderRadius: 8, border: `1px solid ${v.border}`, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Star style={{ width: 12, height: 12, color: v.accent, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, lineHeight: 1.5, color: v.accent, margin: 0, fontStyle: "italic" }}>{b.specialty}</p>
          </div>
          {b.notableReleases && b.notableReleases.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: v.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("m2.discover.bottlersNotableReleases", "Notable Releases")}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {b.notableReleases.map((r) => <span key={r} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: v.elevated, color: v.text, border: `1px solid ${v.border}` }}>{r}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function M2DiscoverBottlers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "founded">("name");

  const filtered = useMemo(() => bottlers
    .filter((b) => {
      const s = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.country.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase());
      const c = country === "All" || b.country === country;
      return s && c;
    })
    .sort((a, b) => sortBy === "name" ? a.name.localeCompare(b.name) : a.founded - b.founded),
  [search, country, sortBy]);

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-bottlers-page">
      <M2BackButton />
      <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: "12px 0 4px" }} data-testid="text-m2-bottlers-title">{t("m2.discover.bottlersTitle", "Independent Bottlers")}</h1>
      <p style={{ fontSize: 12, color: v.muted, margin: "0 0 16px" }}>{t("m2.discover.bottlersSubtitle", "Explore {{count}} independent bottlers worldwide", { count: bottlers.length })}</p>

      <input type="text" placeholder={t("m2.discover.bottlersSearchPlaceholder", "Search bottlers...")} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} data-testid="m2-input-search-bottlers" />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 0" }}>
        {COUNTRIES.map((c) => (
          <button key={c} onClick={() => setCountry(c)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${country === c ? v.accent : v.border}`, background: country === c ? v.accent : "transparent", color: country === c ? v.bg : v.muted, fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }} data-testid={`m2-chip-bottler-${c.toLowerCase()}`}>{c}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: v.muted }}>{t("m2.discover.bottlersFound", "{{count}} found", { count: filtered.length })}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["name", "founded"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)} style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: sortBy === s ? v.elevated : "transparent", color: sortBy === s ? v.accent : v.muted, fontSize: 10, fontWeight: 500, cursor: "pointer" }} data-testid={`m2-sort-${s}`}>{s === "name" ? t("m2.discover.bottlersSortAZ", "A–Z") : t("m2.discover.bottlersSortFounded", "Founded")}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((b) => <Card key={b.name} b={b} t={t} />)}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: v.muted }}>{t("m2.discover.bottlersNoResults", "No bottlers match your search.")}</div>}
      </div>
    </div>
  );
}
