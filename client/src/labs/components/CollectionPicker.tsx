import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { journalApi, collectionApi } from "@/lib/api";
import { Search, X, Wine, ChevronRight, Loader2 } from "lucide-react";
import type { JournalEntry, WhiskybaseCollectionItem } from "@shared/schema";

export interface SelectedWhisky {
  name: string;
  distillery: string | null;
  region: string | null;
  cask: string | null;
  age: string | null;
  abv: string | null;
  source: "journal" | "collection";
}

interface CollectionPickerProps {
  participantId: string;
  onSelect: (whisky: SelectedWhisky) => void;
  onClose: () => void;
}

export function CollectionPicker({ participantId, onSelect, onClose }: CollectionPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [allItems, setAllItems] = useState<SelectedWhisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [journalData, collectionData] = await Promise.all([
          journalApi.getAll(participantId).catch(() => []),
          collectionApi.getAll(participantId).catch(() => []),
        ]);

        if (cancelled) return;

        const deduped = new Map<string, SelectedWhisky>();

        const journalItems: SelectedWhisky[] = ((journalData || []) as JournalEntry[]).map((entry) => ({
          name: entry.whiskyName || "",
          distillery: entry.distillery || null,
          region: entry.region || null,
          cask: entry.caskType || null,
          age: entry.age || null,
          abv: entry.abv || null,
          source: "journal" as const,
        }));

        const collectionItems: SelectedWhisky[] = ((collectionData || []) as WhiskybaseCollectionItem[]).map((entry) => ({
          name: entry.name || "",
          distillery: entry.distillery || entry.brand || null,
          region: null,
          cask: entry.caskType || null,
          age: entry.statedAge || null,
          abv: entry.abv || null,
          source: "collection" as const,
        }));

        for (const item of journalItems) {
          if (!item.name) continue;
          const key = item.name.toLowerCase().trim();
          if (!deduped.has(key)) {
            deduped.set(key, item);
          }
        }

        for (const item of collectionItems) {
          if (!item.name) continue;
          const key = item.name.toLowerCase().trim();
          if (!deduped.has(key)) {
            deduped.set(key, item);
          }
        }

        const sorted = Array.from(deduped.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setAllItems(sorted);
      } catch {
        if (!cancelled) {
          setError(t("collection.error", "Collection could not be loaded."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [participantId, t]);

  const results = useMemo(() => {
    if (search.length < 2) return allItems.slice(0, 50);
    const q = search.toLowerCase();
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.distillery?.toLowerCase().includes(q)
    );
  }, [allItems, search]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 100,
        }}
        onClick={onClose}
        data-testid="collection-picker-overlay"
      />

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--labs-bg)",
          borderRadius: "20px 20px 0 0",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 101,
        }}
        data-testid="collection-picker-sheet"
      >
        <div
          style={{
            padding: "16px 20px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "'Playfair Display', serif",
              color: "var(--labs-text)",
              margin: 0,
            }}
            data-testid="text-collection-picker-title"
          >
            {t("collection.pickerTitle", "My Collection")}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--labs-text-muted)",
            }}
            data-testid="button-collection-picker-close"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ margin: "0 16px 12px", position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              color: "var(--labs-text-muted)",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("collection.search", "Search whisky...")}
            autoFocus
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px 0 36px",
              background: "var(--labs-surface)",
              border: "1px solid var(--labs-border)",
              borderRadius: "var(--labs-radius)",
              fontSize: 15,
              fontFamily: "'DM Sans', sans-serif",
              color: "var(--labs-text)",
              outline: "none",
              boxSizing: "border-box",
            }}
            data-testid="input-collection-picker-search"
          />
        </div>

        <div style={{ height: 1, background: "var(--labs-border)" }} />

        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 32px" }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "32px 0",
                gap: 8,
              }}
            >
              <Loader2
                style={{
                  width: 32,
                  height: 32,
                  color: "var(--labs-text-muted)",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: "var(--labs-text-muted)",
                }}
              >
                {t("collection.loading", "Loading collection...")}
              </span>
            </div>
          ) : error ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--labs-text-muted)",
              }}
              data-testid="collection-picker-error"
            >
              {error}
            </div>
          ) : allItems.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--labs-text-muted)",
              }}
              data-testid="collection-picker-empty"
            >
              {t("collection.pickerEmpty", "No whiskies in your collection yet.")}
            </div>
          ) : results.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--labs-text-muted)",
              }}
              data-testid="collection-picker-no-results"
            >
              {t("collection.noResults", 'No results for "{{search}}"', { search })}
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={`${item.source}-${item.name}-${i}`}
                onClick={() => onSelect(item)}
                style={{
                  width: "100%",
                  minHeight: 64,
                  padding: "12px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--labs-border)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                data-testid={`button-collection-item-${i}`}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    flexShrink: 0,
                    background:
                      item.source === "journal"
                        ? "var(--labs-accent-muted)"
                        : "var(--labs-surface-elevated, var(--labs-surface))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wine size={18} color="var(--labs-accent)" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      color: "var(--labs-text)",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </div>
                  {(item.distillery || item.region) && (
                    <div
                      style={{
                        fontSize: 12,
                        fontFamily: "'DM Sans', sans-serif",
                        color: "var(--labs-text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {[item.distillery, item.region].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 3,
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background:
                        item.source === "journal"
                          ? "var(--labs-accent-muted)"
                          : "var(--labs-surface-elevated, var(--labs-surface))",
                      color:
                        item.source === "journal"
                          ? "var(--labs-accent)"
                          : "var(--labs-text-muted)",
                    }}
                  >
                    {item.source === "journal"
                      ? t("collection.badgeJournal", "Journal")
                      : t("collection.badgeCollection", "Collection")}
                  </span>
                </div>

                <ChevronRight
                  size={16}
                  style={{ flexShrink: 0, color: "var(--labs-text-muted)" }}
                />
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
