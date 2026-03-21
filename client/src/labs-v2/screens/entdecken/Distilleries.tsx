import { useState, useMemo } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { Back, Building, MapPin, CalendarIcon, Search, ChevronDown } from "../../icons";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { distilleries, type Distillery } from "@/data/distilleries";

const COUNTRIES = ["All", "Scotland", "Ireland", "Japan", "USA"];

interface DistilleriesProps {
  onBack: () => void;
}

function DistilleryCard({ d, th, lang }: { d: Distillery; th: any; lang: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: th.bgCard,
        border: `1px solid ${th.border}`,
        borderRadius: RADIUS.md,
        overflow: "hidden",
      }}
      data-testid={`distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `12px ${SP.md}px`,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
        data-testid={`button-toggle-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building color={th.gold} size={14} />
            <span style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{d.name}</span>
            {d.status && d.status !== "active" && (
              <span style={{ fontSize: 11, padding: "1px 5px", borderRadius: 4, background: th.bgCard, border: `1px solid ${th.border}`, color: th.muted, textTransform: "uppercase" }}>
                {d.status}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: th.muted, display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin color={th.muted} size={11} />
            {d.region}, {d.country}
          </div>
        </div>
        <ChevronDown
          color={th.muted}
          size={16}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
        />
      </button>
      {open && (
        <div style={{ padding: `0 ${SP.md}px 14px`, borderTop: `1px solid ${th.border}`, paddingTop: 12 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: th.text, margin: 0, opacity: 0.9 }}>{d.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11, color: th.gold }}>
            <CalendarIcon color={th.gold} size={12} />
            {lang === "de" ? `Gegr\u00fcndet ${d.founded}` : `Founded ${d.founded}`}
          </div>
          {d.feature && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: th.phases.palate.dim, borderRadius: RADIUS.sm, border: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: th.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {lang === "de" ? "Besonderheit" : "Key Fact"}
              </span>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: th.muted, margin: "4px 0 0" }}>{d.feature}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Distilleries({ onBack }: DistilleriesProps) {
  const { th } = useV2Theme();
  const { t, lang } = useV2Lang();

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");

  const filtered = useMemo(
    () =>
      distilleries
        .filter((d) => {
          const s = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.region.toLowerCase().includes(search.toLowerCase());
          const c = country === "All" || d.country === country;
          return s && c;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [search, country]
  );

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.xs,
          background: "none",
          border: "none",
          color: th.muted,
          fontSize: 14,
          fontFamily: FONT.body,
          cursor: "pointer",
          marginBottom: SP.md,
          minHeight: TOUCH_MIN,
          padding: 0,
        }}
        data-testid="button-back-distilleries"
      >
        <Back color={th.muted} size={18} />
        {t.entTitle}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
        <Building color={th.gold} size={22} />
        <h1
          style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, margin: 0 }}
          data-testid="text-distilleries-title"
        >
          {t.entDest}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: th.muted, marginBottom: SP.md }}>
        {t.entDestSub} ({distilleries.length})
      </p>

      <div style={{ position: "relative", marginBottom: SP.sm }}>
        <Search color={th.muted} size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.entDistSearch}
          style={{
            width: "100%",
            boxSizing: "border-box",
            height: TOUCH_MIN,
            paddingLeft: 36,
            paddingRight: SP.md,
            background: th.inputBg,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.md,
            color: th.text,
            fontSize: 14,
            fontFamily: FONT.body,
            outline: "none",
          }}
          data-testid="input-distilleries-search"
        />
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: SP.md, paddingBottom: 4 }}>
        {COUNTRIES.map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            style={{
              padding: "5px 12px",
              borderRadius: RADIUS.full,
              border: `1px solid ${country === c ? th.gold : th.border}`,
              background: country === c ? th.gold : "transparent",
              color: country === c ? th.bg : th.muted,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: FONT.body,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            data-testid={`chip-country-${c.toLowerCase()}`}
          >
            {c === "All" ? t.entFilterAll : c}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: th.muted, marginBottom: SP.sm }}>{filtered.length} {lang === "de" ? "gefunden" : "found"}</div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted, fontSize: 14 }} data-testid="text-distilleries-empty">
          {lang === "de" ? "Keine Destillerien gefunden." : "No distilleries match your search."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
          {filtered.map((d) => (
            <DistilleryCard key={d.name} d={d} th={th} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
