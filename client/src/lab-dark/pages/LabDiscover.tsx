import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Wine, BookOpen, Puzzle, FileText, ChevronRight, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, journalApi, collectionApi } from "@/lib/api";

type DiscoverTab = "bottles" | "pairings" | "templates" | "knowledge";

export default function LabDiscover() {
  const { currentParticipant } = useAppStore();
  const [activeTab, setActiveTab] = useState<DiscoverTab>("bottles");
  const [search, setSearch] = useState("");

  const { data: journalEntries } = useQuery({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: collection } = useQuery({
    queryKey: ["collection", currentParticipant?.id],
    queryFn: () => collectionApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const allBottles = [
    ...(journalEntries || []).map((e: any) => ({
      id: e.id,
      name: e.whiskyName || e.title,
      distillery: e.distillery || "",
      region: e.region || "",
      score: e.personalScore,
      source: "journal" as const,
    })),
    ...(collection || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      distillery: c.distillery || c.brand || "",
      region: "",
      score: c.personalRating,
      source: "collection" as const,
    })),
  ];

  const filteredBottles = search.trim()
    ? allBottles.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.distillery.toLowerCase().includes(search.toLowerCase())
      )
    : allBottles.slice(0, 20);

  const tabs: { key: DiscoverTab; icon: typeof Wine; label: string }[] = [
    { key: "bottles", icon: Wine, label: "Bottles" },
    { key: "pairings", icon: Puzzle, label: "Pairings" },
    { key: "templates", icon: FileText, label: "Templates" },
    { key: "knowledge", icon: BookOpen, label: "Knowledge" },
  ];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <h1
        className="text-xl font-semibold mb-5"
        style={{ fontFamily: "'Playfair Display', serif" }}
        data-testid="lab-discover-title"
      >
        Discover
      </h1>

      <div className="relative mb-5">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--lab-text-muted)" }}
        />
        <input
          className="lab-input pl-10"
          placeholder="Search bottles, distilleries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="lab-discover-search"
        />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`lab-chip whitespace-nowrap ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
            data-testid={`lab-discover-chip-${t.key}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "bottles" && (
        <div>
          {!currentParticipant ? (
            <div className="lab-empty-state">
              <Wine className="w-10 h-10 mb-3" style={{ color: "var(--lab-text-muted)" }} />
              <p className="text-sm">Sign in to explore your bottles</p>
            </div>
          ) : filteredBottles.length === 0 ? (
            <div className="lab-empty-state">
              <Search className="w-10 h-10 mb-3" style={{ color: "var(--lab-text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--lab-text-muted)" }}>
                {search ? "No bottles found" : "No bottles in your collection yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBottles.map((bottle) => (
                <div
                  key={`${bottle.source}-${bottle.id}`}
                  className="lab-card flex items-center gap-4 p-4"
                  data-testid={`lab-bottle-${bottle.id}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--lab-accent-muted)" }}
                  >
                    <Wine className="w-5 h-5" style={{ color: "var(--lab-accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{bottle.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {bottle.distillery && (
                        <span className="text-xs" style={{ color: "var(--lab-text-muted)" }}>{bottle.distillery}</span>
                      )}
                      {bottle.region && (
                        <span className="text-xs" style={{ color: "var(--lab-text-muted)" }}>· {bottle.region}</span>
                      )}
                    </div>
                  </div>
                  {bottle.score != null && (
                    <span className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--lab-accent)" }}>
                      {Math.round(bottle.score)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "pairings" && (
        <ComingSoonBlock icon={Puzzle} title="Pairing Suggestions" description="Food and whisky pairing recommendations" />
      )}

      {activeTab === "templates" && (
        <ComingSoonBlock icon={FileText} title="Tasting Templates" description="Pre-built tasting session templates" />
      )}

      {activeTab === "knowledge" && (
        <ComingSoonBlock icon={BookOpen} title="Whisky Knowledge" description="Explore the whisky lexicon and distillery encyclopedia" />
      )}
    </div>
  );
}

function ComingSoonBlock({ icon: Icon, title, description }: { icon: typeof Wine; title: string; description: string }) {
  return (
    <div className="lab-card-elevated p-8 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "var(--lab-accent-muted)" }}
      >
        <Icon className="w-6 h-6" style={{ color: "var(--lab-accent)" }} />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm" style={{ color: "var(--lab-text-muted)" }}>{description}</p>
      <div className="lab-badge mt-4 mx-auto">
        <Sparkles className="w-3 h-3" />
        Coming soon
      </div>
    </div>
  );
}
