import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BookOpen, Archive, Heart, BarChart3, Award,
  Wine, ExternalLink, Star
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { journalApi, collectionApi, wishlistApi } from "@/lib/api";
import {
  PageHeaderV2,
  SegmentedControlV2,
  CardV2,
  ListRowV2,
  EmptyStateV2,
} from "@/v2/components";

type CellarTab = "journal" | "collection" | "wishlist" | "stats" | "badges";

const TABS: { key: CellarTab; label: string }[] = [
  { key: "journal", label: "Journal" },
  { key: "collection", label: "Collection" },
  { key: "wishlist", label: "Wishlist" },
  { key: "stats", label: "Stats" },
  { key: "badges", label: "Badges" },
];

export default function V2Cellar() {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<CellarTab>("journal");

  const { data: journalEntries, isLoading: journalLoading } = useQuery({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant && activeTab === "journal",
  });

  const { data: collectionItems, isLoading: collectionLoading } = useQuery({
    queryKey: ["collection", currentParticipant?.id],
    queryFn: () => collectionApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant && activeTab === "collection",
  });

  const { data: wishlistItems, isLoading: wishlistLoading } = useQuery({
    queryKey: ["wishlist", currentParticipant?.id],
    queryFn: () => wishlistApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant && activeTab === "wishlist",
  });

  if (!currentParticipant) {
    return (
      <div className="max-w-2xl mx-auto">
        <PageHeaderV2 title="Cellar" subtitle="Your personal whisky vault" />
        <div className="px-5">
          <EmptyStateV2
            icon={Archive}
            title="Sign in to access your cellar"
            description="Log in to view your journal, collection, and wishlist"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeaderV2 title="Cellar" subtitle="Your personal whisky vault" />

      <div className="px-5 space-y-4">
        <SegmentedControlV2
          items={TABS}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as CellarTab)}
        />

        {activeTab === "journal" && (
          <div data-testid="cellar-journal-tab">
            {journalLoading ? (
              <LoadingSkeleton />
            ) : !journalEntries || journalEntries.length === 0 ? (
              <EmptyStateV2
                icon={BookOpen}
                title="No journal entries yet"
                description="Start logging your tastings to build your whisky journal"
              />
            ) : (
              <CardV2>
                {journalEntries.map((entry: any) => (
                  <ListRowV2
                    key={entry.id}
                    icon={Wine}
                    title={entry.whiskyName || entry.title || "Untitled"}
                    subtitle={entry.distillery || undefined}
                    trailing={
                      entry.personalScore != null ? (
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--v2-accent)" }}
                          data-testid={`journal-score-${entry.id}`}
                        >
                          {Math.round(entry.personalScore)}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </CardV2>
            )}
          </div>
        )}

        {activeTab === "collection" && (
          <div data-testid="cellar-collection-tab">
            {collectionLoading ? (
              <LoadingSkeleton />
            ) : !collectionItems || collectionItems.length === 0 ? (
              <EmptyStateV2
                icon={Archive}
                title="No collection items"
                description="Import your Whiskybase collection to see it here"
              />
            ) : (
              <CardV2>
                {collectionItems.map((item: any) => (
                  <ListRowV2
                    key={item.id}
                    icon={Archive}
                    title={item.name || "Unknown"}
                    subtitle={item.distillery || item.brand || undefined}
                    trailing={
                      item.personalRating != null ? (
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--v2-accent)" }}
                          data-testid={`collection-score-${item.id}`}
                        >
                          {Math.round(item.personalRating)}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </CardV2>
            )}
          </div>
        )}

        {activeTab === "wishlist" && (
          <div data-testid="cellar-wishlist-tab">
            {wishlistLoading ? (
              <LoadingSkeleton />
            ) : !wishlistItems || wishlistItems.length === 0 ? (
              <EmptyStateV2
                icon={Heart}
                title="No wishlist items"
                description="Add whiskies you'd like to try to your wishlist"
              />
            ) : (
              <CardV2>
                {wishlistItems.map((item: any) => (
                  <ListRowV2
                    key={item.id}
                    icon={Heart}
                    title={item.whiskyName || item.name || "Unknown"}
                    subtitle={item.distillery || undefined}
                    trailing={
                      item.priority ? (
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5" style={{ color: "var(--v2-accent)" }} />
                          <span className="text-xs" style={{ color: "var(--v2-text-muted)" }}>
                            {item.priority}
                          </span>
                        </div>
                      ) : undefined
                    }
                  />
                ))}
              </CardV2>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div data-testid="cellar-stats-tab">
            <CardV2 elevated>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--v2-accent-muted)" }}
                  >
                    <BarChart3 className="w-5 h-5" style={{ color: "var(--v2-accent)" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--v2-text)" }}>
                      Your Tasting Stats
                    </h3>
                    <p className="text-xs" style={{ color: "var(--v2-text-muted)" }}>
                      Flavor profile, whisky profile & more
                    </p>
                  </div>
                </div>
                <LegacyLink label="Flavor Profile" route="/legacy/flavor-profile" onNavigate={navigate} />
                <LegacyLink label="Whisky Profile" route="/legacy/flavor-wheel" onNavigate={navigate} />
              </div>
            </CardV2>
          </div>
        )}

        {activeTab === "badges" && (
          <div data-testid="cellar-badges-tab">
            <CardV2 elevated>
              <div className="p-6 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "var(--v2-accent-muted)" }}
                >
                  <Award className="w-6 h-6" style={{ color: "var(--v2-accent)" }} />
                </div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "var(--v2-text)" }}>
                  Badges & Achievements
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--v2-text-muted)" }}>
                  Track your tasting milestones
                </p>
                <LegacyLink label="Open in Classic View" route="/legacy/badges" onNavigate={navigate} />
              </div>
            </CardV2>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-16 rounded-xl animate-pulse"
          style={{ background: "var(--v2-surface)" }}
        />
      ))}
    </div>
  );
}

function LegacyLink({
  label,
  route,
  onNavigate,
}: {
  label: string;
  route: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(route)}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors"
      style={{
        background: "var(--v2-surface)",
        color: "var(--v2-text-secondary)",
        border: "1px solid var(--v2-border)",
      }}
      data-testid={`link-legacy-${route.replace(/\//g, "-").slice(1)}`}
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
