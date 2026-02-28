import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Wine, Puzzle, FileText, Building2, Users, BookOpen,
  Sparkles, ExternalLink, Search as SearchIcon, MapPin
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { journalApi, collectionApi } from "@/lib/api";
import {
  PageHeaderV2,
  SearchBarV2,
  SegmentedControlV2,
  CardV2,
  ListRowV2,
  EmptyStateV2,
} from "@/v2/components";

type DiscoverTab = "bottles" | "pairings" | "templates" | "distilleries" | "community" | "knowledge";

const TABS: { key: DiscoverTab; label: string }[] = [
  { key: "bottles", label: "Bottles" },
  { key: "pairings", label: "Pairings" },
  { key: "templates", label: "Templates" },
  { key: "distilleries", label: "Distilleries" },
  { key: "community", label: "Community" },
  { key: "knowledge", label: "Knowledge" },
];

export default function V2Discover() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<DiscoverTab>("bottles");
  const [search, setSearch] = useState("");

  const { data: journalEntries, isLoading: journalLoading } = useQuery({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: collection, isLoading: collectionLoading } = useQuery({
    queryKey: ["collection", currentParticipant?.id],
    queryFn: () => collectionApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const allBottles = [
    ...(journalEntries || []).map((e: any) => ({
      id: e.id,
      name: e.whiskyName || e.title || "Unknown",
      distillery: e.distillery || "",
      score: e.personalScore,
      source: "journal" as const,
    })),
    ...(collection || []).map((c: any) => ({
      id: c.id,
      name: c.name || "Unknown",
      distillery: c.distillery || c.brand || "",
      score: c.personalRating,
      source: "collection" as const,
    })),
  ];

  const filteredBottles = search.trim()
    ? allBottles.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.distillery.toLowerCase().includes(search.toLowerCase())
      )
    : allBottles.slice(0, 30);

  const isLoading = journalLoading || collectionLoading;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeaderV2 title="Discover" subtitle="Explore whiskies, knowledge & community" />

      <div className="px-5 space-y-4">
        <SearchBarV2
          value={search}
          onChange={setSearch}
          placeholder="Search bottles, distilleries..."
        />

        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer whitespace-nowrap"
                style={{
                  background: activeTab === tab.key ? "var(--v2-accent)" : "var(--v2-surface)",
                  color: activeTab === tab.key ? "var(--v2-bg)" : "var(--v2-text-muted)",
                  border: `1px solid ${activeTab === tab.key ? "var(--v2-accent)" : "var(--v2-border)"}`,
                }}
                data-testid={`discover-chip-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "bottles" && (
          <div data-testid="discover-bottles-tab">
            {!currentParticipant ? (
              <EmptyStateV2
                icon={Wine}
                title="Sign in to explore"
                description="Log in to browse your bottles and collection"
              />
            ) : isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl animate-pulse"
                    style={{ background: "var(--v2-surface)" }}
                  />
                ))}
              </div>
            ) : filteredBottles.length === 0 ? (
              <EmptyStateV2
                icon={SearchIcon}
                title={search ? "No bottles found" : "No bottles yet"}
                description={search ? "Try a different search term" : "Add whiskies to your journal or collection"}
              />
            ) : (
              <CardV2>
                {filteredBottles.map((bottle, idx) => (
                  <ListRowV2
                    key={`${bottle.source}-${bottle.id}`}
                    icon={Wine}
                    title={bottle.name}
                    subtitle={bottle.distillery || undefined}
                    trailing={
                      bottle.score != null ? (
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--v2-accent)" }}
                          data-testid={`bottle-score-${bottle.id}`}
                        >
                          {Math.round(bottle.score)}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </CardV2>
            )}
          </div>
        )}

        {activeTab === "pairings" && (
          <ComingSoonStub
            icon={Puzzle}
            title="Pairing Suggestions"
            description="Food and whisky pairing recommendations"
            legacyRoute="/legacy/pairings"
            onNavigate={navigate}
          />
        )}

        {activeTab === "templates" && (
          <ComingSoonStub
            icon={FileText}
            title="Tasting Templates"
            description="Pre-built tasting session templates"
            legacyRoute="/legacy/tasting-templates"
            onNavigate={navigate}
          />
        )}

        {activeTab === "distilleries" && (
          <ComingSoonStub
            icon={Building2}
            title="Distilleries"
            description="Explore distillery encyclopedia and map"
            legacyRoute="/legacy/discover/distilleries"
            onNavigate={navigate}
          />
        )}

        {activeTab === "community" && (
          <ComingSoonStub
            icon={Users}
            title="Community"
            description="Connect with friends, find taste twins, and explore rankings"
            legacyRoute="/legacy/discover/community"
            onNavigate={navigate}
          />
        )}

        {activeTab === "knowledge" && (
          <ComingSoonStub
            icon={BookOpen}
            title="Knowledge"
            description="Whisky lexicon, research articles, and bottler database"
            legacyRoute="/legacy/lexicon"
            onNavigate={navigate}
          />
        )}
      </div>
    </div>
  );
}

function ComingSoonStub({
  icon: Icon,
  title,
  description,
  legacyRoute,
  onNavigate,
}: {
  icon: typeof Wine;
  title: string;
  description: string;
  legacyRoute: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <CardV2 elevated>
      <div className="p-8 text-center" data-testid={`discover-stub-${title.toLowerCase().replace(/\s+/g, "-")}`}>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--v2-accent-muted)" }}
        >
          <Icon className="w-6 h-6" style={{ color: "var(--v2-accent)" }} />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--v2-text)" }}>
          {title}
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--v2-text-muted)" }}>
          {description}
        </p>
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--v2-accent)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--v2-accent)" }}>
            Coming soon in V2
          </span>
        </div>
        <button
          onClick={() => onNavigate(legacyRoute)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors"
          style={{
            background: "var(--v2-surface)",
            color: "var(--v2-text-secondary)",
            border: "1px solid var(--v2-border)",
          }}
          data-testid={`link-classic-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Classic View
        </button>
      </div>
    </CardV2>
  );
}
