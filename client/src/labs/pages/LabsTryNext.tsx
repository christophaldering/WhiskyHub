import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { useSession } from "@/lib/session";
import { pidHeaders, wishlistApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { wishlistKey, useCollectionKeys } from "@/lib/wishlistKey";
import CollectionBadge from "@/labs/components/CollectionBadge";
import type { WishlistEntry } from "@shared/schema";
import { Compass, BookmarkPlus, BookmarkCheck, X } from "lucide-react";

interface DnaRecommendation {
  name: string;
  distillery: string | null;
  region: string | null;
  category: string | null;
  imageUrl: string | null;
  source: "whisky" | "benchmark";
  matchedCategories: Array<{ id: string; en: string; de: string; color: string; hits: number }>;
  score: number;
}

interface DnaRecommendationsResponse {
  weakCategories: Array<{ id: string; en: string; de: string; color: string; pct: number }>;
  recommendations: DnaRecommendation[];
}

/**
 * "Try next" — data-based recommendations that strengthen aroma axes the user tends
 * to rate highly. Extracted from the old Whisky-DNA page so it lives in its proper
 * home (the KI "Empfehlungen" page) instead of inside the analytical profile.
 * Self-contained: own recommendations query + wishlist mutations.
 */
export default function LabsTryNext() {
  const { t } = useTranslation();
  const session = useSession();
  const pid = session.pid;
  const lang = ((i18n.language || "en").substring(0, 2) as "en" | "de");

  const { data: recs, isLoading: recsLoading } = useQuery<DnaRecommendationsResponse>({
    queryKey: ["whisky-dna-recs", pid],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${pid}/whisky-dna/recommendations`, {
        headers: pidHeaders(),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
    enabled: !!pid && !!dna && dna.n >= 5,
    staleTime: 5 * 60 * 1000,
  });

  const { data: wishlistEntries } = useQuery<WishlistEntry[]>({
    queryKey: ["wishlist", pid],
    queryFn: () => wishlistApi.getAll(pid!),
    enabled: !!pid,
    staleTime: 60 * 1000,
  });

  const savedKeys = useMemo(() => {
    const set = new Set<string>();
    (wishlistEntries || []).forEach((e) => set.add(wishlistKey(e.name, e.distillery)));
    return set;
  }, [wishlistEntries]);

  const wishlistIdByKey = useMemo(() => {
    const map = new Map<string, string>();
    (wishlistEntries || []).forEach((e) => map.set(wishlistKey(e.name, e.distillery), e.id));
    return map;
  }, [wishlistEntries]);

  const collectionKeys = useCollectionKeys(pid);

  const [justSavedKeys, setJustSavedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const saveRecMutation = useMutation({
    mutationFn: async (rec: DnaRecommendation) => {
      const categoryLabel = rec.matchedCategories.length
        ? rec.matchedCategories.map((mc) => (lang === "de" ? mc.de : mc.en)).join(", ")
        : rec.category || null;
      const notes = categoryLabel
        ? (lang === "de" ? `Kategorie: ${categoryLabel}` : `Category: ${categoryLabel}`)
        : null;
      return wishlistApi.create(pid!, {
        name: rec.name,
        distillery: rec.distillery || null,
        region: rec.region || null,
        notes,
        priority: "medium",
        source: "whisky-dna",
      });
    },
    onMutate: (rec) => {
      setSavingKey(wishlistKey(rec.name, rec.distillery));
    },
    onSuccess: (_data, rec) => {
      const key = wishlistKey(rec.name, rec.distillery);
      setJustSavedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onSettled: () => {
      setSavingKey(null);
    },
  });

  const removeRecMutation = useMutation({
    mutationFn: async ({ id }: { id: string; key: string }) => {
      return wishlistApi.delete(pid!, id);
    },
    onMutate: ({ key }) => {
      setRemovingKey(key);
    },
    onSuccess: (_data, { key }) => {
      setJustSavedKeys((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onSettled: () => {
      setRemovingKey(null);
    },
  });

  if (!pid || !recs || recs.recommendations.length === 0) return null;

  return (
            <div className="labs-card p-5 labs-fade-in" style={{ marginBottom: 16 }} data-testid="section-try-next">
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--labs-accent)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Compass className="w-3.5 h-3.5" />
                {t("dnaTryNext", "Try next")}
              </p>
              <p style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.5, marginBottom: 12 }} data-testid="text-try-next-intro">
                {t(
                  "dnaTryNextDesc",
                  "Whiskies that hit aromas you tend to rate highly: {{cats}}.",
                  { cats: recs.weakCategories.map((c) => (lang === "de" ? c.de : c.en)).join(", ") },
                )}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recs.recommendations.map((r, idx) => {
                  const subtitleParts = [r.distillery, r.region, r.category].filter(Boolean) as string[];
                  const recKey = wishlistKey(r.name, r.distillery);
                  const isSaved = savedKeys.has(recKey) || justSavedKeys.has(recKey);
                  const isSaving = savingKey === recKey && saveRecMutation.isPending;
                  const isRemoving = removingKey === recKey && removeRecMutation.isPending;
                  const wishlistId = wishlistIdByKey.get(recKey);
                  const isInCollection = collectionKeys.has(r.name, r.distillery);
                  return (
                    <div
                      key={`${r.distillery || ""}|${r.name}|${idx}`}
                      data-testid={`card-recommendation-${idx}`}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: 12, borderRadius: 10,
                        background: isSaved
                          ? "color-mix(in srgb, var(--labs-accent) 8%, transparent)"
                          : "color-mix(in srgb, var(--labs-gold) 6%, transparent)",
                        border: isSaved
                          ? "1px solid color-mix(in srgb, var(--labs-accent) 35%, transparent)"
                          : "1px solid color-mix(in srgb, var(--labs-gold) 18%, transparent)",
                        transition: "background 200ms ease, border-color 200ms ease",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-gold) 25%, transparent), color-mix(in srgb, var(--labs-accent) 15%, transparent))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--labs-gold)", fontWeight: 700, fontSize: 14,
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <div data-testid={`text-recommendation-name-${idx}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3 }}>
                            {r.name}
                          </div>
                          {isInCollection && (
                            <CollectionBadge size="xs" testId={`badge-collection-recommendation-${idx}`} />
                          )}
                        </div>
                        {subtitleParts.length > 0 && (
                          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                            {subtitleParts.join(" · ")}
                          </div>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                          {r.matchedCategories.map((mc) => (
                            <span
                              key={mc.id}
                              data-testid={`chip-recommendation-${idx}-${mc.id}`}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 8px", borderRadius: 999,
                                background: `color-mix(in srgb, ${mc.color} 18%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${mc.color} 40%, transparent)`,
                                color: mc.color,
                                fontSize: 10, fontWeight: 600,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: 999, background: mc.color }} />
                              {lang === "de" ? mc.de : mc.en}
                            </span>
                          ))}
                        </div>
                        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (isSaved || isSaving) return;
                              saveRecMutation.mutate(r);
                            }}
                            disabled={isSaved || isSaving}
                            data-testid={`button-save-recommendation-${idx}`}
                            aria-label={isSaved
                              ? t("dnaTryNextSaved", "Saved to wishlist")
                              : t("dnaTryNextSave", "Save to wishlist")}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "6px 12px", borderRadius: 999,
                              fontSize: 11, fontWeight: 600,
                              cursor: isSaved || isSaving ? "default" : "pointer",
                              background: isSaved
                                ? "color-mix(in srgb, var(--labs-accent) 18%, transparent)"
                                : "color-mix(in srgb, var(--labs-gold) 14%, transparent)",
                              border: isSaved
                                ? "1px solid color-mix(in srgb, var(--labs-accent) 50%, transparent)"
                                : "1px solid color-mix(in srgb, var(--labs-gold) 40%, transparent)",
                              color: isSaved ? "var(--labs-accent)" : "var(--labs-gold)",
                              opacity: isSaving ? 0.7 : 1,
                              transition: "all 180ms ease",
                            }}
                          >
                            {isSaved ? (
                              <>
                                <BookmarkCheck className="w-3.5 h-3.5" />
                                <span data-testid={`text-save-status-${idx}`}>
                                  {t("dnaTryNextSaved", "Saved to wishlist")}
                                </span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3.5 h-3.5" />
                                <span>
                                  {isSaving
                                    ? t("dnaTryNextSaving", "Saving…")
                                    : t("dnaTryNextSave", "Save to wishlist")}
                                </span>
                              </>
                            )}
                          </button>
                          {isSaved && wishlistId && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isRemoving) return;
                                removeRecMutation.mutate({ id: wishlistId, key: recKey });
                              }}
                              disabled={isRemoving}
                              data-testid={`button-remove-recommendation-${idx}`}
                              aria-label={t("dnaTryNextRemove", "Remove from wishlist")}
                              title={t("dnaTryNextRemove", "Remove from wishlist")}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "6px 10px", borderRadius: 999,
                                fontSize: 11, fontWeight: 600,
                                cursor: isRemoving ? "default" : "pointer",
                                background: "transparent",
                                border: "1px solid color-mix(in srgb, var(--labs-text-muted) 35%, transparent)",
                                color: "var(--labs-text-muted)",
                                opacity: isRemoving ? 0.6 : 1,
                                transition: "all 180ms ease",
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>
                                {isRemoving
                                  ? t("dnaTryNextRemoving", "Removing…")
                                  : t("dnaTryNextRemove", "Remove")}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
  );
}
