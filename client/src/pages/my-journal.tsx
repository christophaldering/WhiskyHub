import { useState } from "react";
import { useSearch } from "wouter";
import { NotebookPen } from "lucide-react";
import Journal from "@/pages/journal";
import MyWhiskies from "@/pages/my-whiskies";
import ExportNotes from "@/pages/export-notes";
import DataExport from "@/pages/data-export";
import SimpleShell from "@/components/simple/simple-shell";
import { c, pageTitleStyle } from "@/lib/theme";

const VALID_TABS = ["journal", "tasted", "export"] as const;
type TabValue = (typeof VALID_TABS)[number];

const TAB_LABELS: Record<TabValue, string> = {
  journal: "Journal",
  tasted: "Verkostet",
  export: "Export",
};

export default function MyJournal() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const tabParam = params.get("tab") as TabValue | null;
  const initialTab: TabValue = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "journal";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const handleTabChange = (value: TabValue) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    if (value === "journal") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <SimpleShell maxWidth={900}>
      <div style={{ minWidth: 0, overflowX: "hidden" }} data-testid="my-journal-page">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <NotebookPen style={{ width: 28, height: 28, color: c.accent }} />
          <h1 style={pageTitleStyle} data-testid="text-my-journal-title">
            Mein Whisky
          </h1>
        </div>

        <div style={{
          display: "flex",
          gap: 0,
          background: c.inputBg,
          borderRadius: 10,
          padding: 3,
          marginBottom: 24,
        }}>
          {VALID_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? c.bg : c.muted,
                background: activeTab === tab ? c.accent : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid={`tab-${tab}`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {activeTab === "journal" && <Journal />}
        {activeTab === "tasted" && <MyWhiskies />}
        {activeTab === "export" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <ExportNotes />
            <DataExport />
          </div>
        )}
      </div>
    </SimpleShell>
  );
}
