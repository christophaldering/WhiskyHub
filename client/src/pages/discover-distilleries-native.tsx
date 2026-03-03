import { useState, useMemo } from "react";
import SimpleShell from "@/components/simple/simple-shell";
import { distilleries, type Distillery } from "@/data/distilleries";
import { Building2, MapPin, Calendar, ChevronDown } from "lucide-react";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  accent: "#d4a256",
  muted: "#888",
};

const COUNTRY_FILTERS = ["All", "Scotland", "Ireland", "Japan", "USA"];

function DistilleryCard({ d }: { d: Distillery }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
      data-testid={`card-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: c.text,
          textAlign: "left",
        }}
        data-testid={`button-expand-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 style={{ width: 16, height: 16, color: c.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>{d.name}</span>
            {d.status && d.status !== "active" && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: c.border,
                  color: c.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {d.status}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: c.muted }}>
            <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
            <span>{d.region}, {d.country}</span>
          </div>
        </div>
        <ChevronDown
          style={{
            width: 18,
            height: 18,
            color: c.muted,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            padding: "0 16px 16px",
            borderTop: `1px solid ${c.border}`,
            paddingTop: 14,
          }}
        >
          <p style={{ fontSize: 13, lineHeight: 1.6, color: c.text, margin: 0, opacity: 0.9 }}>
            {d.description}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
              fontSize: 12,
              color: c.accent,
            }}
          >
            <Calendar style={{ width: 13, height: 13 }} />
            <span>Founded {d.founded}</span>
          </div>

          {d.feature && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: c.bg,
                borderRadius: 8,
                border: `1px solid ${c.border}`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Key Fact
              </span>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: c.muted, margin: "6px 0 0" }}>
                {d.feature}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DiscoverDistilleriesNative() {
  const [search, setSearch] = useState("");
  const [activeCountry, setActiveCountry] = useState("All");

  const filtered = useMemo(() => {
    return distilleries.filter((d) => {
      const matchesSearch =
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.region.toLowerCase().includes(search.toLowerCase()) ||
        d.country.toLowerCase().includes(search.toLowerCase());

      const matchesCountry =
        activeCountry === "All" ||
        d.country === activeCountry;

      return matchesSearch && matchesCountry;
    });
  }, [search, activeCountry]);

  return (
    <SimpleShell maxWidth={600}>
      <div data-testid="discover-distilleries-native-page">
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: c.text,
            margin: "0 0 4px",
            fontFamily: "'Playfair Display', serif",
          }}
          data-testid="text-page-title"
        >
          Distillery Encyclopedia
        </h1>
        <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>
          Explore {distilleries.length} distilleries worldwide
        </p>

        <input
          type="text"
          placeholder="Search distilleries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${c.border}`,
            background: c.card,
            color: c.text,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
          data-testid="input-search-distilleries"
        />

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            padding: "14px 0",
            WebkitOverflowScrolling: "touch",
          }}
          data-testid="filter-region-chips"
        >
          {COUNTRY_FILTERS.map((country) => (
            <button
              key={country}
              onClick={() => setActiveCountry(country)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${activeCountry === country ? c.accent : c.border}`,
                background: activeCountry === country ? c.accent : "transparent",
                color: activeCountry === country ? c.bg : c.muted,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
              data-testid={`chip-filter-${country.toLowerCase()}`}
            >
              {country}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: c.muted, marginBottom: 12 }} data-testid="text-result-count">
          {filtered.length} distiller{filtered.length !== 1 ? "ies" : "y"} found
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((d) => (
            <DistilleryCard key={d.name} d={d} />
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: c.muted,
                fontSize: 14,
              }}
              data-testid="text-no-results"
            >
              No distilleries match your search.
            </div>
          )}
        </div>
      </div>
    </SimpleShell>
  );
}
