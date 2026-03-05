import { useState } from "react";
import { CaskTypeSelect } from "@/components/cask-type-select";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { wishlistApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAIStatus } from "@/hooks/use-ai-status";
import { GuestPreview } from "@/components/guest-preview";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import EmptyState from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { c, inputStyle, cardStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";
import { Plus, ArrowLeft, Pencil, Trash2, Star, Wine, Calendar, Flame, Sparkles, Clock, Camera, Loader2, ScanLine, Type, Send, GlassWater, ExternalLink, Check } from "lucide-react";
import { wishlistScanApi, textExtractApi } from "@/lib/api";
import { useLocation } from "wouter";
import type { WishlistEntry } from "@shared/schema";

type View = "list" | "form";

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  high: { text: "#f87171", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
  medium: { text: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  low: { text: "#60a5fa", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
};

const PRIORITY_ICONS: Record<string, any> = {
  high: Flame,
  medium: Sparkles,
  low: Clock,
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "priorityHigh",
  medium: "priorityMedium",
  low: "priorityLow",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 14,
  color: c.text,
  display: "block",
  marginBottom: 4,
};

const btnBase: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 14,
  fontWeight: 600,
  padding: "10px 20px",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  transition: "opacity 0.2s",
};

export default function Wishlist() {
  const { t } = useTranslation();
  const { currentParticipant, setWishlistTransfer } = useAppStore();
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("list");
  const [editingEntry, setEditingEntry] = useState<WishlistEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WishlistEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["wishlist", currentParticipant?.id],
    queryFn: () => wishlistApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => wishlistApi.create(currentParticipant!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setView("list");
      setEditingEntry(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      wishlistApi.update(currentParticipant!.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setView("list");
      setEditingEntry(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wishlistApi.delete(currentParticipant!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setDeleteTarget(null);
    },
  });

  if (!currentParticipant) {
    return (
      <SimpleShell maxWidth={900}>
        <GuestPreview featureTitle={t("wishlist.title")} featureDescription={t("guestPreview.wishlist")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h1 style={{ ...pageTitleStyle, fontSize: 22 }}>{t("wishlist.title")}</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[{name: "Lagavulin 16", distillery: "Lagavulin", region: "Islay"}, {name: "Glenfarclas 25", distillery: "Glenfarclas", region: "Speyside"}, {name: "Springbank 15", distillery: "Springbank", region: "Campbeltown"}, {name: "Macallan 18 Sherry Oak", distillery: "Macallan", region: "Speyside"}].map(w => (
                <div key={w.name} style={{ ...cardStyle, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text }}>{w.name}</div>
                    <div style={{ fontSize: 14, color: c.muted }}>{w.distillery} · {w.region}</div>
                  </div>
                  <div style={{ color: "#eab308" }}>★</div>
                </div>
              ))}
            </div>
          </div>
        </GuestPreview>
      </SimpleShell>
    );
  }

  const handleNew = () => {
    setEditingEntry(null);
    setView("form");
  };

  const handleEdit = (entry: WishlistEntry) => {
    setEditingEntry(entry);
    setView("form");
  };

  const handleBack = () => {
    setView("list");
    setEditingEntry(null);
  };

  const handleTastedIt = (entry: WishlistEntry) => {
    setWishlistTransfer({
      wishlistEntryId: entry.id,
      whiskyName: entry.whiskyName,
      distillery: entry.distillery || undefined,
      region: entry.region || undefined,
      age: entry.age || undefined,
      abv: entry.abv || undefined,
      caskType: entry.caskType || undefined,
    });
    navigate("/my-taste/drams");
  };

  const sortedEntries = [...entries].sort((a: WishlistEntry, b: WishlistEntry) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const pa = priorityOrder[a.priority || "medium"] ?? 1;
    const pb = priorityOrder[b.priority || "medium"] ?? 1;
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });

  return (
    <SimpleShell maxWidth={900}>
    <div style={{ minWidth: 0, overflowX: "hidden" }} data-testid="wishlist-page">
      <BackButton />
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 32 }}>
              <div style={{ minWidth: 0 }}>
                <h1 style={pageTitleStyle} data-testid="text-wishlist-title">
                  {t("wishlist.title")}
                </h1>
                <p style={pageSubtitleStyle}>
                  {entries.length > 0
                    ? t("wishlist.total", { count: entries.length })
                    : t("wishlist.subtitle")}
                </p>
              </div>
              <button
                onClick={handleNew}
                style={{ ...btnBase, background: c.accent, color: c.bg, flexShrink: 0 }}
                data-testid="button-add-wishlist"
                aria-label={t("wishlist.addWhisky")}
              >
                <Plus style={{ width: 16, height: 16 }} />
                {t("wishlist.addWhisky")}
              </button>
            </div>

            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 80, background: `${c.card}80`, borderRadius: 12 }} />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <EmptyState
                icon={Star}
                title={t("emptyState.wishlistTitle")}
                description={t("emptyState.wishlistDesc")}
                actionLabel={t("emptyState.wishlistCta")}
                onAction={() => setView("form")}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sortedEntries.map((entry: WishlistEntry) => {
                  const prioKey = (entry.priority as string) || "medium";
                  const prioColors = PRIORITY_COLORS[prioKey] || PRIORITY_COLORS.medium;
                  const PrioIcon = PRIORITY_ICONS[prioKey] || Sparkles;
                  const prioLabel = PRIORITY_LABELS[prioKey] || "priorityMedium";
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ ...cardStyle, padding: 20, transition: "border-color 0.2s" }}
                      data-testid={`card-wishlist-entry-${entry.id}`}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                              {entry.whiskyName}
                            </h3>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 999,
                              border: `1px solid ${prioColors.border}`,
                              background: prioColors.bg,
                              color: prioColors.text,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}>
                              <PrioIcon style={{ width: 12, height: 12 }} />
                              {t(`wishlist.${prioLabel}`)}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: c.muted, flexWrap: "wrap" }}>
                            {entry.distillery && (
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Wine style={{ width: 12, height: 12 }} />
                                {entry.distillery}
                              </span>
                            )}
                            {entry.region && <span>{entry.region}</span>}
                            {entry.age && <span>{entry.age}y</span>}
                            {entry.abv && <span>{entry.abv}</span>}
                            {entry.caskType && <span>{entry.caskType}</span>}
                          </div>
                          {entry.notes && (
                            <p style={{ fontSize: 14, color: c.muted, marginTop: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {entry.notes}
                            </p>
                          )}
                          {entry.source && (
                            <p style={{ fontSize: 12, color: `${c.muted}b3`, marginTop: 4, fontStyle: "italic" }}>
                              {entry.source}
                            </p>
                          )}
                          {entry.aiSummary && (
                            <div style={{ marginTop: 12, padding: 12, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <Sparkles style={{ width: 12, height: 12, color: "#f59e0b" }} />
                                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fbbf24" }}>{t("wishlist.whyInteresting")}</span>
                              </div>
                              <p style={{ fontSize: 12, color: `${c.text}cc`, lineHeight: 1.6 }} data-testid={`text-summary-${entry.id}`}>
                                {entry.aiSummary}
                              </p>
                              {entry.aiSummaryDate && (
                                <p style={{ fontSize: 9, color: `${c.muted}80`, marginTop: 6, fontStyle: "italic" }}>
                                  {t("wishlist.summaryDate", { date: new Date(entry.aiSummaryDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) })}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <button
                            style={{ background: "transparent", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 6, color: "#4ade80", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}
                            onClick={() => handleTastedIt(entry)}
                            data-testid={`button-tasted-wishlist-${entry.id}`}
                          >
                            <GlassWater style={{ width: 14, height: 14 }} />
                            <span>{t("wishlist.tastedIt")}</span>
                          </button>
                          <button
                            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: c.muted }}
                            onClick={() => handleEdit(entry)}
                            data-testid={`button-edit-wishlist-${entry.id}`}
                          >
                            <Pencil style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: c.danger }}
                            onClick={() => setDeleteTarget(entry)}
                            data-testid={`button-delete-wishlist-${entry.id}`}
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {view === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <WishlistForm
              entry={editingEntry}
              onBack={handleBack}
              onSave={(data) => {
                if (editingEntry) {
                  updateMutation.mutate({ id: editingEntry.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              isSaving={createMutation.isPending || updateMutation.isPending}
              participantId={currentParticipant?.id}
              t={t}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} data-testid="dialog-delete-wishlist">
          <div style={{ ...cardStyle, maxWidth: 420, width: "90%", padding: 28 }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 8 }}>{t("wishlist.deleteEntry")}</h3>
            <p style={{ fontSize: 14, color: c.muted, marginBottom: 20 }}>{t("wishlist.deleteConfirm")}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ ...btnBase, background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                data-testid="button-cancel-delete-wishlist"
              >
                {t("wishlist.cancel")}
              </button>
              <button
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                style={{ ...btnBase, background: c.danger, color: "#fff" }}
                data-testid="button-confirm-delete-wishlist"
              >
                {t("wishlist.deleteEntry")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </SimpleShell>
  );
}

function WishlistForm({
  entry,
  onBack,
  onSave,
  isSaving,
  participantId,
  t,
}: {
  entry: WishlistEntry | null;
  onBack: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  participantId?: string;
  t: any;
}) {
  const { toast } = useToast();
  const { isFeatureDisabled } = useAIStatus();
  const aiScanDisabled = isFeatureDisabled("wishlist_identify");
  const [whiskyName, setWhiskyName] = useState(entry?.whiskyName || "");
  const [distillery, setDistillery] = useState(entry?.distillery || "");
  const [region, setRegion] = useState(entry?.region || "");
  const [age, setAge] = useState(entry?.age || "");
  const [abv, setAbv] = useState(entry?.abv || "");
  const [caskType, setCaskType] = useState(entry?.caskType || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [priority, setPriority] = useState(entry?.priority || "medium");
  const [source, setSource] = useState(entry?.source || "");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [showTextExtract, setShowTextExtract] = useState(false);
  const [extractText, setExtractText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [aiSummary, setAiSummary] = useState(entry?.aiSummary || "");
  const [aiSummaryDate, setAiSummaryDate] = useState(entry?.aiSummaryDate || "");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const generateSummary = async (whisky: { whiskyName: string; distillery?: string; region?: string; age?: string; abv?: string; caskType?: string; notes?: string }) => {
    if (!participantId || !whisky.whiskyName) return;
    setGeneratingSummary(true);
    try {
      const result = await wishlistScanApi.generateSummary({
        participantId,
        ...whisky,
      });
      if (result.summary) {
        setAiSummary(result.summary);
        setAiSummaryDate(result.summaryDate);
      }
    } catch (err: any) {
      console.error("AI summary error:", err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whiskyName.trim()) return;
    onSave({
      whiskyName: whiskyName.trim(),
      distillery: distillery.trim() || null,
      region: region.trim() || null,
      age: age.trim() || null,
      abv: abv.trim() || null,
      caskType: caskType.trim() || null,
      notes: notes.trim() || null,
      priority,
      source: source.trim() || null,
      aiSummary: aiSummary || null,
      aiSummaryDate: aiSummaryDate ? new Date(aiSummaryDate).toISOString() : null,
    });
  };

  const sectionBoxStyle: React.CSSProperties = {
    marginBottom: 24,
    padding: 16,
    background: `${c.inputBg}`,
    border: `1px solid ${c.border}4d`,
    borderRadius: 12,
  };

  return (
    <div>
      <button
        onClick={onBack}
        style={{ ...btnBase, background: "transparent", color: c.muted, padding: "8px 12px", marginBottom: 24 }}
        data-testid="button-back-wishlist"
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        {t("wishlist.back")}
      </button>

      <h2 style={{ ...pageTitleStyle, fontSize: 20, marginBottom: 24 }} data-testid="text-wishlist-form-title">
        {entry ? t("wishlist.editEntry") : t("wishlist.addWhisky")}
      </h2>

      <div style={sectionBoxStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>{t("wishlist.scanHint")}</p>
        </div>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: aiScanDisabled ? "not-allowed" : "pointer",
            opacity: aiScanDisabled ? 0.5 : 1,
            background: scanning ? `${c.accent}33` : c.accent,
            color: scanning ? c.accent : c.bg,
            transition: "all 0.2s",
          }}
          data-testid="button-scan-wishlist"
          title={aiScanDisabled ? t("admin.aiDisabledHint") : undefined}
        >
          {scanning ? (
            <>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              {t("wishlist.scanning")}
            </>
          ) : (
            <>
              <Camera style={{ width: 16, height: 16 }} />
              {t("wishlist.scanPhoto")}
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            disabled={scanning || aiScanDisabled}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file || !participantId) return;
              const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
              if (!allowedTypes.includes(file.type)) {
                toast({ title: t("common.uploadInvalidType"), variant: "destructive" });
                return;
              }
              if (file.size > 2 * 1024 * 1024) {
                toast({ title: t("common.uploadTooLarge"), variant: "destructive" });
                return;
              }
              setScanning(true);
              setScanError("");
              setScanResult(null);
              try {
                const response = await wishlistScanApi.identify(file, participantId);
                const whiskies = response.whiskies || (response.whiskyName ? [response] : []);
                const applyWhisky = (w: any) => {
                  setScanResult(w);
                  if (w.whiskyName && w.whiskyName !== "Unknown Whisky") {
                    setWhiskyName(w.whiskyName);
                    if (w.distillery) setDistillery(w.distillery);
                    if (w.region) setRegion(w.region);
                    if (w.age) setAge(w.age);
                    if (w.abv) setAbv(w.abv);
                    if (w.caskType) setCaskType(w.caskType);
                    if (w.notes && !notes) setNotes(w.notes);
                    if (w.source && !source) setSource(w.source);
                    generateSummary({
                      whiskyName: w.whiskyName,
                      distillery: w.distillery,
                      region: w.region,
                      age: w.age,
                      abv: w.abv,
                      caskType: w.caskType,
                      notes: w.notes,
                    });
                  }
                };
                if (whiskies.length === 0) {
                  setScanError(t("wishlist.scanFailed"));
                } else if (whiskies.length === 1) {
                  applyWhisky(whiskies[0]);
                  if (!whiskies[0].whiskyName || whiskies[0].whiskyName === "Unknown Whisky") {
                    setScanError(t("wishlist.scanFailed"));
                  }
                } else {
                  setScanResult({ multipleWhiskies: whiskies, _applyWhisky: applyWhisky });
                }
              } catch (err: any) {
                setScanError(err.message || t("wishlist.scanFailed"));
              } finally {
                setScanning(false);
              }
            }}
          />
        </label>
        {scanError && (
          <div style={{ marginTop: 12, fontSize: 12, color: c.danger, background: `${c.danger}1a`, border: `1px solid ${c.danger}33`, borderRadius: 10, padding: "8px 12px" }}>
            {scanError}
          </div>
        )}
        {scanResult && !scanResult.multipleWhiskies && scanResult.whiskyName && scanResult.whiskyName !== "Unknown Whisky" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 12, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Check style={{ width: 14, height: 14 }} />
              {t("wishlist.scanSuccess", { name: scanResult.whiskyName })}
              {scanResult.matchedInDb && (
                <span style={{ fontSize: 9, padding: "0 4px", background: c.inputBg, color: c.muted, borderRadius: 4, marginLeft: 4 }}>{t("wishlist.foundInDb")}</span>
              )}
            </span>
            {scanResult.whiskybaseUrl && scanResult.whiskybaseUrl.startsWith("http") ? (
              <a
                href={scanResult.whiskybaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#fbbf24", textDecoration: "none", flexShrink: 0 }}
                data-testid="link-wishlist-whiskybase"
              >
                Whiskybase <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            ) : scanResult.whiskybaseSearch && scanResult.whiskybaseSearch.trim() ? (
              <a
                href={`https://www.whiskybase.com/search?q=${encodeURIComponent(scanResult.whiskybaseSearch)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#fbbf24", textDecoration: "none", flexShrink: 0 }}
                data-testid="link-wishlist-whiskybase-search"
              >
                {t("wishlist.searchWhiskybase")} <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            ) : null}
          </motion.div>
        )}
        {scanResult?.multipleWhiskies && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 12, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: 12 }}
          >
            <p style={{ fontSize: 12, fontWeight: 500, color: "#60a5fa", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, margin: "0 0 8px 0" }}>
              <ScanLine style={{ width: 14, height: 14 }} />
              {t("wishlist.multipleFound", { count: scanResult.multipleWhiskies.length })}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {scanResult.multipleWhiskies.map((w: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  data-testid={`button-select-wishlist-scan-${idx}`}
                  onClick={() => {
                    const applyFn = scanResult._applyWhisky;
                    if (applyFn) applyFn(w);
                    else {
                      setScanResult(w);
                      if (w.whiskyName && w.whiskyName !== "Unknown Whisky") {
                        setWhiskyName(w.whiskyName);
                        if (w.distillery) setDistillery(w.distillery);
                        if (w.region) setRegion(w.region);
                        if (w.age) setAge(w.age);
                        if (w.abv) setAbv(w.abv);
                        if (w.caskType) setCaskType(w.caskType);
                        if (w.notes && !notes) setNotes(w.notes);
                        if (w.source && !source) setSource(w.source);
                      }
                    }
                  }}
                  style={{ width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, background: c.inputBg, border: `1px solid ${c.border}`, cursor: "pointer", fontSize: 12, color: c.text, transition: "border-color 0.2s" }}
                >
                  <span style={{ fontWeight: 500 }}>{w.whiskyName || "Unknown Whisky"}</span>
                  {(w.distillery || w.age || w.region) && (
                    <span style={{ color: c.muted, marginLeft: 6 }}>
                      {[w.distillery, w.age ? `${w.age}y` : null, w.region].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <div style={sectionBoxStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>{t("wishlist.extractHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTextExtract(!showTextExtract)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            background: showTextExtract ? `${c.accent}33` : c.inputBg,
            color: showTextExtract ? c.accent : c.muted,
            transition: "all 0.2s",
          }}
          data-testid="button-text-extract-wishlist"
        >
          <Type style={{ width: 16, height: 16 }} />
          {t("wishlist.extractText")}
        </button>
        {showTextExtract && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{ marginTop: 12 }}
          >
            <textarea
              value={extractText}
              onChange={(e) => setExtractText(e.target.value)}
              placeholder={t("wishlist.textPlaceholder")}
              rows={3}
              style={{ ...inputStyle, marginBottom: 8, resize: "vertical" }}
              data-testid="textarea-extract-wishlist"
            />
            <button
              type="button"
              disabled={extracting || extractText.trim().length < 3}
              onClick={async () => {
                if (!participantId || extractText.trim().length < 3) return;
                setExtracting(true);
                setScanError("");
                try {
                  const result = await textExtractApi.extract(extractText.trim(), participantId);
                  setScanResult(result);
                  if (result.whiskyName && result.whiskyName !== "Unknown Whisky") {
                    setWhiskyName(result.whiskyName);
                    if (result.distillery) setDistillery(result.distillery);
                    if (result.region) setRegion(result.region);
                    if (result.age) setAge(result.age);
                    if (result.abv) setAbv(result.abv);
                    if (result.caskType) setCaskType(result.caskType);
                    if (result.notes && !notes) setNotes(result.notes);
                    if (result.source && !source) setSource(result.source);
                    setShowTextExtract(false);
                    setExtractText("");
                    generateSummary({
                      whiskyName: result.whiskyName,
                      distillery: result.distillery,
                      region: result.region,
                      age: result.age,
                      abv: result.abv,
                      caskType: result.caskType,
                      notes: result.notes,
                    });
                  } else {
                    setScanError(t("wishlist.scanFailed"));
                  }
                } catch (err: any) {
                  setScanError(err.message || t("wishlist.scanFailed"));
                } finally {
                  setExtracting(false);
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                cursor: extracting || extractText.trim().length < 3 ? "not-allowed" : "pointer",
                opacity: extracting || extractText.trim().length < 3 ? 0.5 : 1,
                background: extracting ? `${c.accent}33` : c.accent,
                color: extracting ? c.accent : c.bg,
                transition: "all 0.2s",
              }}
              data-testid="button-extract-submit-wishlist"
            >
              {extracting ? (
                <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> {t("wishlist.extracting")}</>
              ) : (
                <><Send style={{ width: 14, height: 14 }} /> {t("wishlist.extractButton")}</>
              )}
            </button>
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }} data-testid="form-wishlist">
        <div>
          <label style={labelStyle}>{t("wishlist.whiskyName")} *</label>
          <input
            value={whiskyName}
            onChange={(e) => setWhiskyName(e.target.value)}
            placeholder={t("wishlist.whiskyNamePlaceholder")}
            style={inputStyle}
            required
            data-testid="input-wishlist-name"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("wishlist.distillery")}</label>
            <input
              value={distillery}
              onChange={(e) => setDistillery(e.target.value)}
              placeholder={t("wishlist.distilleryPlaceholder")}
              style={inputStyle}
              data-testid="input-wishlist-distillery"
            />
          </div>
          <div>
            <label style={labelStyle}>{t("wishlist.region")}</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={t("wishlist.regionPlaceholder")}
              style={inputStyle}
              data-testid="input-wishlist-region"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("wishlist.age")}</label>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={t("wishlist.agePlaceholder")}
              style={inputStyle}
              data-testid="input-wishlist-age"
            />
          </div>
          <div>
            <label style={labelStyle}>{t("wishlist.abv")}</label>
            <input
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder={t("wishlist.abvPlaceholder")}
              style={inputStyle}
              data-testid="input-wishlist-abv"
            />
          </div>
          <div>
            <label style={labelStyle}>{t("wishlist.caskType")}</label>
            <CaskTypeSelect
              value={caskType}
              onChange={(v) => setCaskType(v)}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>{t("wishlist.priority")}</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}
            data-testid="select-wishlist-priority"
          >
            <option value="high">{t("wishlist.priorityHigh")}</option>
            <option value="medium">{t("wishlist.priorityMedium")}</option>
            <option value="low">{t("wishlist.priorityLow")}</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>{t("wishlist.source")}</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={t("wishlist.sourcePlaceholder")}
            style={inputStyle}
            data-testid="input-wishlist-source"
          />
        </div>

        <div>
          <label style={labelStyle}>{t("wishlist.notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("wishlist.notesPlaceholder")}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            data-testid="input-wishlist-notes"
          />
        </div>

        {(generatingSummary || aiSummary) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: 16, background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03), transparent)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12 }}
            data-testid="section-ai-summary"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Sparkles style={{ width: 16, height: 16, color: "#f59e0b" }} />
              <span style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.accent }}>{t("wishlist.whyInteresting")}</span>
            </div>
            {generatingSummary ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: c.muted }}>
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                {t("wishlist.generatingSummary")}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 14, color: `${c.text}e6`, lineHeight: 1.6, margin: 0 }} data-testid="text-ai-summary">
                  {aiSummary}
                </p>
                {aiSummaryDate && (
                  <p style={{ fontSize: 10, color: `${c.muted}99`, marginTop: 8, fontStyle: "italic" }} data-testid="text-ai-summary-date">
                    {t("wishlist.summaryDate", { date: new Date(aiSummaryDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) })}
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}

        <div style={{ display: "flex", gap: 12, paddingTop: 16 }}>
          <button
            type="submit"
            disabled={isSaving || !whiskyName.trim()}
            style={{ ...btnBase, background: c.accent, color: c.bg, opacity: isSaving || !whiskyName.trim() ? 0.5 : 1 }}
            data-testid="button-save-wishlist"
          >
            {t("wishlist.save")}
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{ ...btnBase, background: "transparent", color: c.muted, border: `1px solid ${c.border}` }}
            data-testid="button-cancel-wishlist"
          >
            {t("wishlist.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
