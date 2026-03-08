import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { wishlistApi, wishlistScanApi, textExtractApi } from "@/lib/api";
import { useAIStatus } from "@/hooks/use-ai-status";
import { getSession, useSession } from "@/lib/session";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { CaskTypeSelect } from "@/components/cask-type-select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Star, Wine, Flame, Sparkles, Clock,
  Camera, Loader2, ScanLine, Type, Send, GlassWater, ExternalLink,
  Check, ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import type { WishlistEntry } from "@shared/schema";

type View = "list" | "form";

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  high: { text: "#f87171", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
  medium: { text: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  low: { text: "#60a5fa", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
};

const PRIORITY_ICONS: Record<string, any> = { high: Flame, medium: Sparkles, low: Clock };
const PRIORITY_LABELS: Record<string, string> = { high: "priorityHigh", medium: "priorityMedium", low: "priorityLow" };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14, fontFamily: "system-ui, sans-serif",
  background: v.inputBg, color: v.inputText, border: `1px solid ${v.inputBorder}`,
  borderRadius: 10, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, color: v.text, display: "block", marginBottom: 4,
};

const btnBase: React.CSSProperties = {
  border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif",
  fontSize: 14, fontWeight: 600, padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 8,
};

export default function M2TasteWishlist() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const participantId = session.pid;
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("list");
  const [editingEntry, setEditingEntry] = useState<WishlistEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WishlistEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["wishlist", participantId],
    queryFn: () => wishlistApi.getAll(participantId!),
    enabled: !!participantId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => wishlistApi.create(participantId!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wishlist"] }); setView("list"); setEditingEntry(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => wishlistApi.update(participantId!, id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wishlist"] }); setView("list"); setEditingEntry(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wishlistApi.delete(participantId!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wishlist"] }); setDeleteTarget(null); },
  });

  if (!participantId) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "60px 20px", color: v.muted }}>
          <Star style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.4 }} />
          <p style={{ fontSize: 16 }}>{t("m2.signInRequired", "Sign in to access your wishlist")}</p>
        </div>
      </div>
    );
  }

  const handleTastedIt = (entry: WishlistEntry) => { navigate("/m2/taste/drams"); };

  const sortedEntries = [...entries].sort((a: WishlistEntry, b: WishlistEntry) => {
    const po: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const pa = po[a.priority || "medium"] ?? 1;
    const pb = po[b.priority || "medium"] ?? 1;
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });

  return (
    <div style={{ padding: "24px 16px", maxWidth: 700, margin: "0 auto" }} data-testid="m2-wishlist-page">
      <M2BackButton />
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "16px 0 24px" }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: v.text, margin: 0 }} data-testid="text-m2-wishlist-title">
                  {t("wishlist.title", "Wishlist")}
                </h1>
                <p style={{ fontSize: 13, color: v.muted, margin: "4px 0 0" }}>
                  {entries.length > 0 ? t("wishlist.total", { count: entries.length }) : t("wishlist.subtitle", "Whiskies you want to try")}
                </p>
              </div>
              <button onClick={() => { setEditingEntry(null); setView("form"); }} style={{ ...btnBase, background: v.accent, color: v.bg }} data-testid="button-m2-add-wishlist">
                <Plus style={{ width: 16, height: 16 }} /> {t("wishlist.addWhisky", "Add Whisky")}
              </button>
            </div>

            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2, 3].map((i) => (<div key={i} style={{ height: 80, background: v.card, border: `1px solid ${v.border}`, borderRadius: 12 }} />))}
              </div>
            ) : entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <Star style={{ width: 48, height: 48, color: v.accent, marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 8 }}>{t("emptyState.wishlistTitle", "No wishlist entries yet")}</p>
                <p style={{ fontSize: 14, color: v.muted, marginBottom: 20 }}>{t("emptyState.wishlistDesc", "Add whiskies you want to try")}</p>
                <button onClick={() => { setEditingEntry(null); setView("form"); }} style={{ ...btnBase, background: v.accent, color: v.bg }} data-testid="button-m2-wishlist-empty-add">
                  <Plus style={{ width: 16, height: 16 }} /> {t("emptyState.wishlistCta", "Add First Whisky")}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sortedEntries.map((entry: WishlistEntry) => {
                  const pk = (entry.priority as string) || "medium";
                  const pc = PRIORITY_COLORS[pk] || PRIORITY_COLORS.medium;
                  const PI = PRIORITY_ICONS[pk] || Sparkles;
                  const pl = PRIORITY_LABELS[pk] || "priorityMedium";
                  return (
                    <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }}
                      data-testid={`card-m2-wishlist-${entry.id}`}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, fontSize: 15 }}>
                              {entry.whiskyName}
                            </h3>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, padding: "2px 8px", borderRadius: 999, border: `1px solid ${pc.border}`, background: pc.bg, color: pc.text, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
                              <PI style={{ width: 10, height: 10 }} /> {t(`wishlist.${pl}`)}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: v.muted, flexWrap: "wrap" }}>
                            {entry.distillery && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Wine style={{ width: 12, height: 12 }} />{entry.distillery}</span>}
                            {entry.region && <span>{entry.region}</span>}
                            {entry.age && <span>{entry.age}y</span>}
                            {entry.abv && <span>{entry.abv}</span>}
                            {entry.caskType && <span>{entry.caskType}</span>}
                          </div>
                          {entry.notes && <p style={{ fontSize: 13, color: v.muted, marginTop: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.notes}</p>}
                          {entry.source && <p style={{ fontSize: 11, color: v.mutedLight, marginTop: 4, fontStyle: "italic" }}>{entry.source}</p>}
                          {entry.aiSummary && (
                            <div style={{ marginTop: 10, padding: 10, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <Sparkles style={{ width: 12, height: 12, color: "#f59e0b" }} />
                                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fbbf24" }}>{t("wishlist.whyInteresting", "Why Interesting")}</span>
                              </div>
                              <p style={{ fontSize: 12, color: v.textSecondary, lineHeight: 1.6, margin: 0 }} data-testid={`text-m2-summary-${entry.id}`}>{entry.aiSummary}</p>
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                          <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#4ade80" }} onClick={() => handleTastedIt(entry)} data-testid={`button-m2-tasted-${entry.id}`}>
                            <GlassWater style={{ width: 14, height: 14 }} />
                          </button>
                          <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: v.muted }} onClick={() => { setEditingEntry(entry); setView("form"); }} data-testid={`button-m2-edit-wishlist-${entry.id}`}>
                            <Pencil style={{ width: 14, height: 14 }} />
                          </button>
                          <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: v.danger }} onClick={() => setDeleteTarget(entry)} data-testid={`button-m2-delete-wishlist-${entry.id}`}>
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
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <WishlistForm
              entry={editingEntry}
              onBack={() => { setView("list"); setEditingEntry(null); }}
              onSave={(data) => {
                if (editingEntry) updateMutation.mutate({ id: editingEntry.id, data });
                else createMutation.mutate(data);
              }}
              isSaving={createMutation.isPending || updateMutation.isPending}
              participantId={participantId}
              t={t}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} data-testid="dialog-m2-delete-wishlist">
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 16, maxWidth: 420, width: "90%", padding: 28 }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: v.text, marginBottom: 8 }}>{t("wishlist.deleteEntry", "Delete Entry")}</h3>
            <p style={{ fontSize: 14, color: v.muted, marginBottom: 20 }}>{t("wishlist.deleteConfirm", "Are you sure?")}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ ...btnBase, background: v.inputBg, color: v.text, border: `1px solid ${v.border}` }} data-testid="button-m2-cancel-delete">{t("wishlist.cancel", "Cancel")}</button>
              <button onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} style={{ ...btnBase, background: v.danger, color: "#fff" }} data-testid="button-m2-confirm-delete">{t("wishlist.deleteEntry", "Delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WishlistForm({ entry, onBack, onSave, isSaving, participantId, t }: {
  entry: WishlistEntry | null; onBack: () => void; onSave: (data: any) => void; isSaving: boolean; participantId?: string; t: any;
}) {
  const { toast } = useToast();
  const { i18n } = useTranslation();
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

  const generateSummary = async (w: { whiskyName: string; distillery?: string; region?: string; age?: string; abv?: string; caskType?: string; notes?: string }) => {
    if (!participantId || !w.whiskyName) return;
    setGeneratingSummary(true);
    try {
      const lang = i18n.language?.startsWith("de") ? "de" : "en";
      const result = await wishlistScanApi.generateSummary({ participantId, language: lang, ...w } as any);
      if (result.summary) { setAiSummary(result.summary); setAiSummaryDate(result.summaryDate); }
    } catch { } finally { setGeneratingSummary(false); }
  };

  const applyWhisky = (w: any) => {
    setScanResult(w);
    if (w.whiskyName && w.whiskyName !== "Unknown Whisky" && w.whiskyName !== t("m2.taste.unknownWhisky", "Unknown Whisky")) {
      setWhiskyName(w.whiskyName);
      if (w.distillery) setDistillery(w.distillery);
      if (w.region) setRegion(w.region);
      if (w.age) setAge(w.age);
      if (w.abv) setAbv(w.abv);
      if (w.caskType) setCaskType(w.caskType);
      if (w.notes && !notes) setNotes(w.notes);
      if (w.source && !source) setSource(w.source);
      generateSummary({ whiskyName: w.whiskyName, distillery: w.distillery, region: w.region, age: w.age, abv: w.abv, caskType: w.caskType, notes: w.notes });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whiskyName.trim()) return;
    onSave({
      whiskyName: whiskyName.trim(), distillery: distillery.trim() || null, region: region.trim() || null,
      age: age.trim() || null, abv: abv.trim() || null, caskType: caskType.trim() || null,
      notes: notes.trim() || null, priority, source: source.trim() || null,
      aiSummary: aiSummary || null, aiSummaryDate: aiSummaryDate ? new Date(aiSummaryDate).toISOString() : null,
    });
  };

  const sectionBox: React.CSSProperties = { marginBottom: 20, padding: 14, background: v.elevated, border: `1px solid ${v.border}`, borderRadius: 12 };

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={onBack} style={{ ...btnBase, background: "transparent", color: v.muted, padding: "8px 0", marginBottom: 20 }} data-testid="button-m2-back-form">
        <ArrowLeft style={{ width: 16, height: 16 }} /> {t("wishlist.back", "Back")}
      </button>

      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: v.text, marginBottom: 20 }} data-testid="text-m2-wishlist-form-title">
        {entry ? t("wishlist.editEntry", "Edit Entry") : t("wishlist.addWhisky", "Add Whisky")}
      </h2>

      <div style={sectionBox}>
        <p style={{ fontSize: 12, color: v.muted, margin: "0 0 8px" }}>{t("wishlist.scanHint", "Scan a bottle photo to auto-fill")}</p>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: aiScanDisabled ? "not-allowed" : "pointer", opacity: aiScanDisabled ? 0.5 : 1, background: scanning ? "rgba(212,162,86,0.2)" : v.accent, color: scanning ? v.accent : v.bg }} data-testid="button-m2-scan-wishlist">
          {scanning ? (<><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> {t("wishlist.scanning", "Scanning…")}</>) : (<><Camera style={{ width: 16, height: 16 }} /> {t("wishlist.scanPhoto", "Scan Photo")}</>)}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} disabled={scanning || aiScanDisabled} onChange={async (e) => {
            const file = e.target.files?.[0]; e.target.value = "";
            if (!file || !participantId) return;
            if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { toast({ title: t("common.uploadInvalidType", "Invalid file type"), variant: "destructive" }); return; }
            if (file.size > 2 * 1024 * 1024) { toast({ title: t("common.uploadTooLarge", "File too large"), variant: "destructive" }); return; }
            setScanning(true); setScanError(""); setScanResult(null);
            try {
              const response = await wishlistScanApi.identify(file, participantId);
              const whiskies = response.whiskies || (response.whiskyName ? [response] : []);
              if (whiskies.length === 0) setScanError(t("wishlist.scanFailed", "Could not identify"));
              else if (whiskies.length === 1) { applyWhisky(whiskies[0]); if (!whiskies[0].whiskyName || whiskies[0].whiskyName === "Unknown Whisky" || whiskies[0].whiskyName === t("m2.taste.unknownWhisky", "Unknown Whisky")) setScanError(t("wishlist.scanFailed", "Could not identify")); }
              else setScanResult({ multipleWhiskies: whiskies });
            } catch (err: any) { setScanError(err.message || t("wishlist.scanFailed", "Could not identify")); } finally { setScanning(false); }
          }} />
        </label>
        {scanError && <div style={{ marginTop: 12, fontSize: 12, color: v.danger, background: "rgba(229,115,115,0.1)", border: "1px solid rgba(229,115,115,0.2)", borderRadius: 10, padding: "8px 12px" }}>{scanError}</div>}
        {scanResult && !scanResult.multipleWhiskies && scanResult.whiskyName && scanResult.whiskyName !== "Unknown Whisky" && scanResult.whiskyName !== t("m2.taste.unknownWhisky", "Unknown Whisky") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#4ade80", display: "flex", alignItems: "center", gap: 6 }}>
            <Check style={{ width: 14, height: 14 }} /> {t("wishlist.scanSuccess", { name: scanResult.whiskyName })}
            {scanResult.whiskybaseUrl && scanResult.whiskybaseUrl.startsWith("http") && (
              <a href={scanResult.whiskybaseUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#fbbf24", textDecoration: "none" }} data-testid="link-m2-whiskybase">Whiskybase <ExternalLink style={{ width: 12, height: 12 }} /></a>
            )}
          </motion.div>
        )}
        {scanResult?.multipleWhiskies && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "#60a5fa", display: "flex", alignItems: "center", gap: 6, margin: "0 0 8px" }}>
              <ScanLine style={{ width: 14, height: 14 }} /> {t("wishlist.multipleFound", { count: scanResult.multipleWhiskies.length })}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {scanResult.multipleWhiskies.map((w: any, idx: number) => (
                <button key={idx} type="button" onClick={() => applyWhisky(w)} style={{ width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, background: v.inputBg, border: `1px solid ${v.border}`, cursor: "pointer", fontSize: 12, color: v.text }} data-testid={`button-m2-select-scan-${idx}`}>
                  <span style={{ fontWeight: 500 }}>{w.whiskyName || t("m2.taste.unknown", "Unknown")}</span>
                  {(w.distillery || w.age || w.region) && <span style={{ color: v.muted, marginLeft: 6 }}>{[w.distillery, w.age ? `${w.age}y` : null, w.region].filter(Boolean).join(" · ")}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <div style={sectionBox}>
        <p style={{ fontSize: 12, color: v.muted, margin: "0 0 8px" }}>{t("wishlist.extractHint", "Describe a bottle to identify it")}</p>
        <button type="button" onClick={() => setShowTextExtract(!showTextExtract)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", background: showTextExtract ? "rgba(212,162,86,0.2)" : v.inputBg, color: showTextExtract ? v.accent : v.muted }} data-testid="button-m2-text-extract">
          <Type style={{ width: 16, height: 16 }} /> {t("wishlist.extractText", "Text Identify")}
        </button>
        {showTextExtract && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12 }}>
            <textarea value={extractText} onChange={(e) => setExtractText(e.target.value)} placeholder={t("wishlist.textPlaceholder", "Describe the bottle…")} rows={3} style={{ ...inputStyle, marginBottom: 8, resize: "vertical" }} data-testid="textarea-m2-extract" />
            <button type="button" disabled={extracting || extractText.trim().length < 3} onClick={async () => {
              if (!participantId || extractText.trim().length < 3) return;
              setExtracting(true); setScanError("");
              try {
                const result = await textExtractApi.extract(extractText.trim(), participantId);
                if (result.whiskyName && result.whiskyName !== "Unknown Whisky" && result.whiskyName !== t("m2.taste.unknownWhisky", "Unknown Whisky")) { applyWhisky(result); setShowTextExtract(false); setExtractText(""); }
                else setScanError(t("wishlist.scanFailed", "Could not identify"));
              } catch (err: any) { setScanError(err.message || t("wishlist.scanFailed", "Could not identify")); } finally { setExtracting(false); }
            }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: extracting || extractText.trim().length < 3 ? "not-allowed" : "pointer", opacity: extracting || extractText.trim().length < 3 ? 0.5 : 1, background: v.accent, color: v.bg }} data-testid="button-m2-extract-submit">
              {extracting ? (<><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> {t("wishlist.extracting", "Extracting…")}</>) : (<><Send style={{ width: 14, height: 14 }} /> {t("wishlist.extractButton", "Identify")}</>)}
            </button>
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }} data-testid="form-m2-wishlist">
        <div>
          <label style={labelStyle}>{t("wishlist.whiskyName", "Whisky Name")} *</label>
          <input value={whiskyName} onChange={(e) => setWhiskyName(e.target.value)} placeholder={t("wishlist.whiskyNamePlaceholder", "e.g. Lagavulin 16")} style={inputStyle} required data-testid="input-m2-wishlist-name" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("wishlist.distillery", "Distillery")}</label>
            <input value={distillery} onChange={(e) => setDistillery(e.target.value)} placeholder={t("wishlist.distilleryPlaceholder", "Distillery")} style={inputStyle} data-testid="input-m2-wishlist-distillery" />
          </div>
          <div>
            <label style={labelStyle}>{t("wishlist.region", "Region")}</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t("wishlist.regionPlaceholder", "Region")} style={inputStyle} data-testid="input-m2-wishlist-region" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("wishlist.age", "Age")}</label>
            <input value={age} onChange={(e) => setAge(e.target.value)} placeholder={t("wishlist.agePlaceholder", "Age")} style={inputStyle} data-testid="input-m2-wishlist-age" />
          </div>
          <div>
            <label style={labelStyle}>{t("wishlist.abv", "ABV")}</label>
            <input value={abv} onChange={(e) => setAbv(e.target.value)} placeholder={t("wishlist.abvPlaceholder", "ABV")} style={inputStyle} data-testid="input-m2-wishlist-abv" />
          </div>
          <div>
            <label style={labelStyle}>{t("wishlist.caskType", "Cask Type")}</label>
            <CaskTypeSelect value={caskType} onChange={(val) => setCaskType(val)} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t("wishlist.priority", "Priority")}</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, appearance: "auto" }} data-testid="select-m2-wishlist-priority">
            <option value="high">{t("wishlist.priorityHigh", "High")}</option>
            <option value="medium">{t("wishlist.priorityMedium", "Medium")}</option>
            <option value="low">{t("wishlist.priorityLow", "Low")}</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t("wishlist.source", "Source")}</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("wishlist.sourcePlaceholder", "Where did you hear about it?")} style={inputStyle} data-testid="input-m2-wishlist-source" />
        </div>
        <div>
          <label style={labelStyle}>{t("wishlist.notes", "Notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("wishlist.notesPlaceholder", "Your notes…")} rows={3} style={{ ...inputStyle, resize: "vertical" }} data-testid="input-m2-wishlist-notes" />
        </div>

        {(generatingSummary || aiSummary) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 16, background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03), transparent)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12 }} data-testid="section-m2-ai-summary">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Sparkles style={{ width: 16, height: 16, color: "#f59e0b" }} />
              <span style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: v.accent }}>{t("wishlist.whyInteresting", "Why Interesting")}</span>
            </div>
            {generatingSummary ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: v.muted }}>
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> {t("wishlist.generatingSummary", "Generating…")}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 14, color: v.textSecondary, lineHeight: 1.6, margin: 0 }} data-testid="text-m2-ai-summary">{aiSummary}</p>
                {aiSummaryDate && <p style={{ fontSize: 10, color: v.mutedLight, marginTop: 8, fontStyle: "italic" }}>{t("wishlist.summaryDate", { date: new Date(aiSummaryDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) })}</p>}
              </>
            )}
          </motion.div>
        )}

        <div style={{ display: "flex", gap: 12, paddingTop: 16 }}>
          <button type="submit" disabled={isSaving || !whiskyName.trim()} style={{ ...btnBase, background: v.accent, color: v.bg, opacity: isSaving || !whiskyName.trim() ? 0.5 : 1 }} data-testid="button-m2-save-wishlist">{t("wishlist.save", "Save")}</button>
          <button type="button" onClick={onBack} style={{ ...btnBase, background: "transparent", color: v.muted, border: `1px solid ${v.border}` }} data-testid="button-m2-cancel-wishlist">{t("wishlist.cancel", "Cancel")}</button>
        </div>
      </form>
    </div>
  );
}