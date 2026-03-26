import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { journalApi, collectionApi } from "@/lib/api";
import { Search, X, Wine, ChevronRight, Loader2, LogIn } from "lucide-react";
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

type SourceFilter = "all" | "journal" | "collection";

export function CollectionPicker({ participantId, onSelect, onClose }: CollectionPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [allItems, setAllItems] = useState<SelectedWhisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const isAuthenticated = Boolean(participantId);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

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
  }, [participantId, isAuthenticated, t]);

  const distilleries = useMemo(() => {
    const set = new Set<string>();
    for (const item of allItems) {
      if (item.distillery) set.add(item.distillery);
    }
    return Array.from(set).sort();
  }, [allItems]);

  const [distilleryFilter, setDistilleryFilter] = useState<string | null>(null);

  const results = useMemo(() => {
    let filtered = allItems;

    if (sourceFilter !== "all") {
      filtered = filtered.filter((item) => item.source === sourceFilter);
    }

    if (distilleryFilter) {
      filtered = filtered.filter((item) => item.distillery === distilleryFilter);
    }

    if (search.length >= 2) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.distillery?.toLowerCase().includes(q)
      );
    }

    return filtered.slice(0, 100);
  }, [allItems, search, sourceFilter, distilleryFilter]);

  const handleItemSelect = useCallback((item: SelectedWhisky) => {
    onSelect(item);
  }, [onSelect]);

  const handleOverlayClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const sourceFilters: { key: SourceFilter; label: string }[] = [
    { key: "all", label: t("collection.filterAll", "All") },
    { key: "journal", label: t("collection.filterJournal", "Journal") },
    { key: "collection", label: t("collection.filterCollection", "Collection") },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          WebkitTapHighlightColor: "transparent",
        }}
        onClick={handleOverlayClick}
        onTouchEnd={handleOverlayClick}
        data-testid="collection-picker-overlay"
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 768,
          background: "var(--labs-bg)",
          borderRadius: "20px 20px 0 0",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 1,
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="collection-picker-sheet"
      >
        <div
          style={{
            padding: "12px 0 4px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "var(--labs-border)",
            }}
          />
        </div>

        <div
          style={{
            padding: "8px 20px 12px",
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
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--labs-surface)",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              color: "var(--labs-text-muted)",
              WebkitTapHighlightColor: "transparent",
            }}
            data-testid="button-collection-picker-close"
          >
            <X size={18} />
          </button>
        </div>

        {!isAuthenticated ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
            data-testid="collection-picker-unauthenticated"
          >
            <LogIn
              size={32}
              style={{ color: "var(--labs-text-muted)" }}
            />
            <p
              style={{
                fontSize: 14,
                color: "var(--labs-text-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {t("collection.pickerSignInPrompt", "Sign in to see your collection.")}
            </p>
            <button
              onClick={() => {
                onClose();
                window.location.href = "/labs/onboarding";
              }}
              style={{
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                background: "var(--labs-accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--labs-radius)",
                cursor: "pointer",
              }}
              data-testid="button-collection-picker-sign-in"
            >
              {t("collection.pickerSignInButton", "Sign in")}
            </button>
          </div>
        ) : (
          <>
            <div style={{ margin: "0 16px 8px", position: "relative" }}>
              <Search
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  color: "var(--labs-text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("collection.search", "Search whisky...")}
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px 0 36px",
                  background: "var(--labs-surface)",
                  border: "1px solid var(--labs-border)",
                  borderRadius: "var(--labs-radius)",
                  fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  color: "var(--labs-text)",
                  outline: "none",
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                }}
                data-testid="input-collection-picker-search"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "0 16px 10px",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                flexShrink: 0,
              }}
            >
              {sourceFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSourceFilter(f.key)}
                  style={{
                    padding: "5px 14px",
                    fontSize: 13,
                    fontWeight: sourceFilter === f.key ? 600 : 400,
                    fontFamily: "'DM Sans', sans-serif",
                    background: sourceFilter === f.key ? "var(--labs-accent)" : "var(--labs-surface)",
                    color: sourceFilter === f.key ? "#fff" : "var(--labs-text-muted)",
                    border: sourceFilter === f.key ? "none" : "1px solid var(--labs-border)",
                    borderRadius: 20,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    WebkitTapHighlightColor: "transparent",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  data-testid={`button-filter-${f.key}`}
                >
                  {f.label}
                </button>
              ))}

              {distilleries.length > 0 && (
                <select
                  value={distilleryFilter || ""}
                  onChange={(e) => setDistilleryFilter(e.target.value || null)}
                  style={{
                    padding: "5px 10px",
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    background: distilleryFilter ? "var(--labs-accent)" : "var(--labs-surface)",
                    color: distilleryFilter ? "#fff" : "var(--labs-text-muted)",
                    border: distilleryFilter ? "none" : "1px solid var(--labs-border)",
                    borderRadius: 20,
                    cursor: "pointer",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                    flexShrink: 0,
                    minWidth: 0,
                    maxWidth: 160,
                  }}
                  data-testid="select-distillery-filter"
                >
                  <option value="">{t("collection.filterDistillery", "Distillery")}</option>
                  {distilleries.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ height: 1, background: "var(--labs-border)", flexShrink: 0 }} />

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                minHeight: 0,
              }}
            >
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
                  {t("collection.pickerNoResults", 'No results for "{{search}}"', { search })}
                </div>
              ) : (
                results.map((item, i) => (
                  <button
                    key={`${item.source}-${item.name}-${i}`}
                    onClick={() => handleItemSelect(item)}
                    onTouchEnd={(e) => {
                      if (e.cancelable) {
                        e.preventDefault();
                        handleItemSelect(item);
                      }
                    }}
                    style={{
                      width: "100%",
                      minHeight: 60,
                      padding: "10px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid var(--labs-border)",
                      cursor: "pointer",
                      textAlign: "left",
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
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
          </>
        )}
      </div>
    </div>
  );
}
