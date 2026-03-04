import { useState, useMemo } from "react";
import SimpleShell from "@/components/simple/simple-shell";
import { bottlers, type Bottler } from "@/data/bottlers";
import { Package, MapPin, Calendar, Star, ChevronDown, ExternalLink } from "lucide-react";
import { c, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";

const COUNTRY_FILTERS = ["All", ...Array.from(new Set(bottlers.map(b => b.country))).sort()];

function BottlerCard({ b }: { b: Bottler }) {
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
      data-testid={`card-bottler-${b.name.toLowerCase().replace(/\s+/g, "-")}`}
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
        data-testid={`button-expand-${b.name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package style={{ width: 16, height: 16, color: c.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>{b.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: c.muted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
              {b.region}, {b.country}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar style={{ width: 12, height: 12, flexShrink: 0 }} />
              Est. {b.founded}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <a
            href={`https://www.whiskybase.com/search?q=${encodeURIComponent(b.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: c.muted, padding: 4 }}
            onClick={(e) => e.stopPropagation()}
            data-testid={`link-wb-${b.name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <ExternalLink style={{ width: 14, height: 14 }} />
          </a>
          <ChevronDown
            style={{
              width: 18,
              height: 18,
              color: c.muted,
              transition: "transform 0.2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
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
            {b.description}
          </p>

          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: c.bg,
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <Star style={{ width: 14, height: 14, color: c.accent, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, lineHeight: 1.5, color: c.accent, margin: 0, fontStyle: "italic", opacity: 0.9 }}>
              {b.specialty}
            </p>
          </div>

          {b.notableReleases && b.notableReleases.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Notable Releases
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {b.notableReleases.map((r) => (
                  <span
                    key={r}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: `${c.accent}15`,
                      color: c.text,
                      border: `1px solid ${c.border}`,
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DiscoverBottlersNative() {
  const [search, setSearch] = useState("");
  const [activeCountry, setActiveCountry] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "founded">("name");

  const filtered = useMemo(() => {
    return bottlers
      .filter((b) => {
        const matchesSearch =
          !search ||
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.country.toLowerCase().includes(search.toLowerCase()) ||
          b.region.toLowerCase().includes(search.toLowerCase()) ||
          b.description.toLowerCase().includes(search.toLowerCase()) ||
          b.specialty.toLowerCase().includes(search.toLowerCase());

        const matchesCountry =
          activeCountry === "All" || b.country === activeCountry;

        return matchesSearch && matchesCountry;
      })
      .sort((a, b) =>
        sortBy === "name" ? a.name.localeCompare(b.name) : a.founded - b.founded
      );
  }, [search, activeCountry, sortBy]);

  return (
    <SimpleShell>
      <div data-testid="discover-bottlers-native-page">
        <div style={{ marginBottom: 8 }}>
          <h1
            style={pageTitleStyle}
            data-testid="text-page-title"
          >
            Independent Bottlers
          </h1>
          <p style={{ ...pageSubtitleStyle, marginBottom: 0 }}>
            Explore {bottlers.length} independent bottlers worldwide
          </p>
        </div>

        <input
          type="text"
          placeholder="Search bottlers..."
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
          data-testid="input-search-bottlers"
        />

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            padding: "14px 0",
            WebkitOverflowScrolling: "touch",
          }}
          data-testid="filter-country-chips"
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
              {country === "All" ? `All (${bottlers.length})` : `${country} (${bottlers.filter(b => b.country === country).length})`}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: c.muted }} data-testid="text-result-count">
            {filtered.length} bottler{filtered.length !== 1 ? "s" : ""} found
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setSortBy("name")}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                background: sortBy === "name" ? `${c.accent}25` : "transparent",
                color: sortBy === "name" ? c.accent : c.muted,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
              data-testid="button-sort-name"
            >
              A–Z
            </button>
            <button
              onClick={() => setSortBy("founded")}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                background: sortBy === "founded" ? `${c.accent}25` : "transparent",
                color: sortBy === "founded" ? c.accent : c.muted,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              data-testid="button-sort-founded"
            >
              <Calendar style={{ width: 11, height: 11 }} />
              Founded
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((b) => (
            <BottlerCard key={b.name} b={b} />
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
              No bottlers match your search.
            </div>
          )}
        </div>
      </div>
    </SimpleShell>
  );
}
