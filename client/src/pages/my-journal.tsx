import { useState, useRef, useEffect } from "react";
import { useSearch, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine, Plus, MoreHorizontal } from "lucide-react";
import Journal from "@/pages/journal";
import MyWhiskies from "@/pages/my-whiskies";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import { c, pageTitleStyle } from "@/lib/theme";
import { useIsMobile } from "@/hooks/use-mobile";

const FILTERS = ["all", "solo", "tastings"] as const;
type FilterValue = (typeof FILTERS)[number];

const LEGACY_TAB_MAP: Record<string, FilterValue> = {
  journal: "solo",
  drams: "all",
  tasted: "tastings",
};

const FILTER_KEYS: Record<FilterValue, string> = {
  all: "myJournalPage.filterAll",
  solo: "myJournalPage.filterSolo",
  tastings: "myJournalPage.filterTastings",
};

export default function MyJournal() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const tabParam = params.get("tab");
  const resolvedFilter = tabParam ? (LEGACY_TAB_MAP[tabParam] ?? tabParam) : "all";
  const initialFilter: FilterValue = FILTERS.includes(resolvedFilter as FilterValue)
    ? (resolvedFilter as FilterValue)
    : "all";
  const [activeFilter, setActiveFilter] = useState<FilterValue>(initialFilter);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleFilterChange = (value: FilterValue) => {
    setActiveFilter(value);
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <SimpleShell maxWidth={900}>
      <div style={{ minWidth: 0, overflowX: "hidden" }} data-testid="my-drams-page">
        <BackButton />

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Wine style={{ width: 28, height: 28, color: c.accent }} />
            <h1 style={pageTitleStyle} data-testid="text-my-drams-title">
              {t("myJournalPage.title")}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/log-simple">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: isMobile ? "8px 10px" : "8px 16px",
                  background: c.accent,
                  color: c.bg,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  whiteSpace: "nowrap",
                }}
                data-testid="button-add-dram"
              >
                <Plus style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                {!isMobile && t("myTastePage.addDram")}
              </div>
            </Link>

            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  background: c.card,
                  border: `1px solid ${c.border}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  color: c.muted,
                }}
                data-testid="button-more-menu"
              >
                <MoreHorizontal style={{ width: 18, height: 18 }} />
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 4,
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: 10,
                    padding: 4,
                    minWidth: 180,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    zIndex: 50,
                  }}
                >
                  <Link href="/my-taste/export">
                    <div
                      onClick={() => setMenuOpen(false)}
                      style={{
                        padding: "10px 14px",
                        fontSize: 14,
                        color: c.text,
                        cursor: "pointer",
                        borderRadius: 8,
                        fontFamily: "system-ui, sans-serif",
                      }}
                      data-testid="menu-export-data"
                    >
                      {t("myJournalPage.exportData")}
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => handleFilterChange(filter)}
                style={{
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? c.bg : c.text,
                  background: isActive ? c.accent : c.card,
                  border: `1px solid ${isActive ? c.accent : c.border}`,
                  borderRadius: 20,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid={`filter-${filter}`}
              >
                {t(FILTER_KEYS[filter])}
              </button>
            );
          })}
        </div>

        {(activeFilter === "all" || activeFilter === "solo") && <Journal embedded />}
        {(activeFilter === "all" || activeFilter === "tastings") && <MyWhiskies embedded />}
      </div>
    </SimpleShell>
  );
}
