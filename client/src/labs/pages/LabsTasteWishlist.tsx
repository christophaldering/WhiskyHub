import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { wishlistApi, wishlistScanApi } from "@/lib/api";
import { useAIStatus } from "@/hooks/use-ai-status";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useSession } from "@/lib/session";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Star, Wine, Flame, Sparkles, Clock,
  Camera, Loader2, ScanLine, Send, GlassWater, ChevronLeft,
} from "lucide-react";
import type { WishlistEntry } from "@shared/schema";

type View = "list" | "form";

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  high: { text: "var(--labs-danger)", bg: "var(--labs-danger-muted)", border: "color-mix(in srgb, var(--labs-danger) 20%, transparent)" },
  medium: { text: "var(--labs-accent)", bg: "var(--labs-accent-muted)", border: "color-mix(in srgb, var(--labs-accent) 20%, transparent)" },
  low: { text: "var(--labs-info)", bg: "var(--labs-info-muted)", border: "color-mix(in srgb, var(--labs-info) 20%, transparent)" },
};

const PRIORITY_ICONS: Record<string, any> = { high: Flame, medium: Sparkles, low: Clock };

export default function LabsTasteWishlist() {
  const { t } = useTranslation();
  const session = useSession();
  const participantId = session.pid;
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("list");
  const [editingEntry, setEditingEntry] = useState<WishlistEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WishlistEntry | null>(null);

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ["wishlist", participantId],
    queryFn: async () => {
      const result = await wishlistApi.getAll(participantId!);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!participantId,
    retry: 2,
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
      <div className="labs-page">
        <MeineWeltActionBar active="collection" />
        <div className="flex items-center gap-3 mb-4">
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }}>{t("wishlist.title")}</h1>
        </div>
        <AuthGateMessage
          icon={<Star className="w-10 h-10" style={{ color: "var(--labs-accent)" }} />}
          title={t("authGate.wishlist.title")}
          bullets={[t("authGate.wishlist.bullet1"), t("authGate.wishlist.bullet2"), t("authGate.wishlist.bullet3")]}
          className="labs-empty"
          compact
        />
      </div>
    );
  }

  const sortedEntries = [...entries].sort((a: WishlistEntry, b: WishlistEntry) => {
    const po: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const pa = po[a.priority || "medium"] ?? 1;
    const pb = po[b.priority || "medium"] ?? 1;
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });

  return (
    <div className="labs-page" data-testid="labs-wishlist-page">
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MeineWeltActionBar active="collection" />
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-wishlist-title">{t("wishlist.title")}</h1>
              </div>
              <button onClick={() => { setEditingEntry(null); setView("form"); }} className="labs-btn-primary flex items-center gap-1.5" style={{ padding: "8px 16px", fontSize: 13 }} data-testid="button-labs-add-wishlist">
                <Plus className="w-4 h-4" /> {t("wishlist.addWhisky")}
              </button>
            </div>
            <p className="text-sm mb-5" style={{ color: "var(--labs-text-muted)", marginLeft: 28 }}>
              {entries.length > 0 ? t("wishlist.whiskiesToTry", { count: entries.length }) : t("wishlist.whiskiesToTryEmpty")}
            </p>

            {isLoading ? (
              <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="labs-card" style={{ height: 80 }} />)}</div>
            ) : isError ? (
              <div className="labs-empty" style={{ minHeight: 200 }}>
                <Star className="w-10 h-10 mb-3" style={{ color: "var(--labs-danger)", opacity: 0.75 }} />
                <p className="text-base font-semibold mb-2" style={{ color: "var(--labs-text)" }}>{t("wishlist.failedToLoad")}</p>
                <p className="text-sm mb-4" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.failedRetry")}</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="labs-empty" style={{ minHeight: 200 }}>
                <Star className="w-10 h-10 mb-3" style={{ color: "var(--labs-accent)", opacity: 0.75 }} />
                <p className="text-base font-semibold mb-2" style={{ color: "var(--labs-text)" }}>{t("wishlist.emptyTitle")}</p>
                <p className="text-sm mb-4" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.emptyDesc")}</p>
                <button onClick={() => { setEditingEntry(null); setView("form"); }} className="labs-btn-primary flex items-center gap-2" data-testid="button-labs-wishlist-empty-add">
                  <Plus className="w-4 h-4" /> {t("wishlist.addFirst")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {sortedEntries.map((entry: WishlistEntry) => {
                  const pk = (entry.priority as string) || "medium";
                  const pc = PRIORITY_COLORS[pk] || PRIORITY_COLORS.medium;
                  const PI = PRIORITY_ICONS[pk] || Sparkles;
                  return (
                    <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="labs-card" style={{ padding: 16 }} data-testid={`card-labs-wishlist-${entry.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="labs-serif font-semibold truncate text-sm" style={{ color: "var(--labs-text)", margin: 0 }}>{entry.name}</h3>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 999, border: `1px solid ${pc.border}`, background: pc.bg, color: pc.text, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
                              <PI style={{ width: 10, height: 10 }} /> {pk}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs flex-wrap" style={{ color: "var(--labs-text-muted)" }}>
                            {entry.distillery && <span className="flex items-center gap-1"><Wine className="w-3 h-3" />{entry.distillery}</span>}
                            {entry.region && <span>{entry.region}</span>}
                            {entry.age && <span>{entry.age}y</span>}
                            {entry.abv && <span>{entry.abv}</span>}
                            {entry.caskType && <span>{entry.caskType}</span>}
                          </div>
                          {entry.notes && <p className="text-xs mt-2" style={{ color: "var(--labs-text-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.notes}</p>}
                          {entry.aiSummary && (
                            <div className="mt-2.5 p-2.5 rounded-lg" style={{ background: "var(--labs-accent-muted)", border: "1px solid color-mix(in srgb, var(--labs-accent) 15%, transparent)" }}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
                                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--labs-accent)" }}>{t("wishlist.whyInteresting")}</span>
                              </div>
                              <p className="text-xs" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }} data-testid={`text-labs-summary-${entry.id}`}>{entry.aiSummary}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                          <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--labs-success)" }} onClick={() => navigate("/labs/taste/drams")} data-testid={`button-labs-tasted-${entry.id}`}><GlassWater className="w-3.5 h-3.5" /></button>
                          <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--labs-text-muted)" }} onClick={() => { setEditingEntry(entry); setView("form"); }} data-testid={`button-labs-edit-wishlist-${entry.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                          <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--labs-danger)" }} onClick={() => setDeleteTarget(entry)} data-testid={`button-labs-delete-wishlist-${entry.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
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
              onSave={(data) => { if (editingEntry) updateMutation.mutate({ id: editingEntry.id, data }); else createMutation.mutate(data); }}
              isSaving={createMutation.isPending || updateMutation.isPending}
              participantId={participantId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} data-testid="dialog-labs-delete-wishlist">
          <div className="labs-card" style={{ maxWidth: 420, width: "90%", padding: 28 }}>
            <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>{t("wishlist.deleteTitle")}</h3>
            <p className="text-sm mb-5" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.deleteConfirmShort")}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="labs-btn-secondary" style={{ padding: "8px 16px" }} data-testid="button-labs-cancel-delete">{t("wishlist.cancel")}</button>
              <button onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer" }} data-testid="button-labs-confirm-delete">{t("wishlist.deleteButton")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WishlistForm({ entry, onBack, onSave, isSaving, participantId }: {
  entry: WishlistEntry | null; onBack: () => void; onSave: (data: any) => void; isSaving: boolean; participantId?: string;
}) {
  const { t, i18n } = useTranslation();
  const { isFeatureDisabled } = useAIStatus();
  const aiScanDisabled = isFeatureDisabled("wishlist_identify");
  const [whiskyName, setWhiskyName] = useState(entry?.name || "");
  const [distillery, setDistillery] = useState(entry?.distillery || "");
  const [region, setRegion] = useState(entry?.region || "");
  const [age, setAge] = useState(entry?.age || "");
  const [abv, setAbv] = useState(entry?.abv || "");
  const [caskType, setCaskType] = useState(entry?.caskType || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [priority, setPriority] = useState(entry?.priority || "medium");
  const [source, setSource] = useState(entry?.source || "");
  const [scanning, setScanning] = useState(false);
  const [aiSummary, setAiSummary] = useState(entry?.aiSummary || "");
  const [aiSummaryDate, setAiSummaryDate] = useState(entry?.aiSummaryDate || "");
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const generateSummary = async (w: { name?: string; whiskyName?: string; distillery?: string; region?: string; age?: string; abv?: string; caskType?: string }) => {
    const wName = w.name || w.whiskyName || "";
    if (!participantId || !wName) return;
    setGeneratingSummary(true);
    try {
      const lang = i18n.language?.startsWith("de") ? "de" : "en";
      const result = await wishlistScanApi.generateSummary({ participantId, language: lang, name: wName, distillery: w.distillery, region: w.region, age: w.age, abv: w.abv, caskType: w.caskType });
      if (result.summary) { setAiSummary(result.summary); setAiSummaryDate(result.summaryDate); }
    } catch {} finally { setGeneratingSummary(false); }
  };

  const handleScan = async (file: File) => {
    if (!participantId || aiScanDisabled) return;
    setScanning(true);
    try {
      const lang = i18n.language?.startsWith("de") ? "de" : "en";
      const result = await wishlistScanApi.identify(participantId, file, lang);
      if (result.whiskyName && result.whiskyName !== "Unknown Whisky") {
        setWhiskyName(result.whiskyName);
        if (result.distillery) setDistillery(result.distillery);
        if (result.region) setRegion(result.region);
        if (result.age) setAge(result.age);
        if (result.abv) setAbv(result.abv);
        if (result.caskType) setCaskType(result.caskType);
        generateSummary(result);
      }
    } catch {} finally { setScanning(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whiskyName.trim()) return;
    onSave({
      name: whiskyName.trim(), distillery: distillery.trim() || null, region: region.trim() || null,
      age: age.trim() || null, abv: abv.trim() || null, caskType: caskType.trim() || null,
      notes: notes.trim() || null, priority, source: source.trim() || null,
      aiSummary: aiSummary || null, aiSummaryDate: aiSummaryDate ? new Date(aiSummaryDate).toISOString() : null,
    });
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, background: "var(--labs-surface)", color: "var(--labs-text)", border: "1px solid var(--labs-border)", borderRadius: 10, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 mb-5" style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 0 }} data-testid="button-labs-back-form">
        <ChevronLeft className="w-4 h-4" /> {t("wishlist.backLabel")}
      </button>

      <h2 className="labs-h3 mb-5" style={{ color: "var(--labs-text)" }} data-testid="text-labs-wishlist-form-title">
        {entry ? t("wishlist.editEntry") : t("wishlist.addWhisky")}
      </h2>

      {!aiScanDisabled && (
        <div className="labs-card p-4 mb-5" style={{ border: "1px dashed var(--labs-accent)" }}>
          <div className="flex items-center gap-3">
            <label htmlFor="wishlist-scan-input" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--labs-accent)", fontSize: 13, fontWeight: 600 }}>
              {scanning ? <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> : <Camera className="w-4 h-4" />}
              {scanning ? t("wishlist.scanning") : t("wishlist.scanLabel")}
            </label>
            <input id="wishlist-scan-input" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = ""; }} data-testid="input-labs-wishlist-scan" />
            <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.scanHintShort")}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.whiskyName")} *</label>
          <input value={whiskyName} onChange={(e) => setWhiskyName(e.target.value)} placeholder={t("wishlist.whiskyNamePlaceholder")} style={inputStyle} required data-testid="input-labs-whisky-name" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.distillery")}</label><input value={distillery} onChange={(e) => setDistillery(e.target.value)} style={inputStyle} data-testid="input-labs-distillery" /></div>
          <div><label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.region")}</label><input value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle} data-testid="input-labs-region" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.age")}</label><input value={age} onChange={(e) => setAge(e.target.value)} style={inputStyle} data-testid="input-labs-age" /></div>
          <div><label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.abv")}</label><input value={abv} onChange={(e) => setAbv(e.target.value)} style={inputStyle} data-testid="input-labs-abv" /></div>
          <div><label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.cask")}</label><input value={caskType} onChange={(e) => setCaskType(e.target.value)} style={inputStyle} data-testid="input-labs-cask" /></div>
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.priority")}</label>
          <div className="flex gap-2">
            {(["high", "medium", "low"] as const).map(p => {
              const pc = PRIORITY_COLORS[p];
              const active = priority === p;
              const PI = PRIORITY_ICONS[p];
              return (
                <button key={p} type="button" onClick={() => setPriority(p)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: active ? `2px solid ${pc.border}` : "1px solid var(--labs-border)", background: active ? pc.bg : "transparent", color: active ? pc.text : "var(--labs-text-muted)", fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                  data-testid={`button-labs-priority-${p}`}>
                  <PI style={{ width: 12, height: 12 }} /> {t(`wishlist.priority${p.charAt(0).toUpperCase() + p.slice(1)}Label`)}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} data-testid="input-labs-notes" />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("wishlist.source")}</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("wishlist.sourcePlaceholder")} style={inputStyle} data-testid="input-labs-source" />
        </div>

        {whiskyName && !aiSummary && !generatingSummary && (
          <button type="button" onClick={() => generateSummary({ name: whiskyName, distillery, region, age, abv, caskType })} className="labs-btn-secondary flex items-center gap-2 self-start" style={{ fontSize: 12 }} data-testid="button-labs-generate-summary">
            <Sparkles className="w-3.5 h-3.5" /> {t("wishlist.generateSummary")}
          </button>
        )}

        {generatingSummary && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--labs-accent)" }}>
            <Loader2 className="w-3.5 h-3.5" style={{ animation: "spin 1s linear infinite" }} /> {t("wishlist.generatingText")}
          </div>
        )}

        {aiSummary && (
          <div className="labs-card p-3" style={{ border: "1px solid color-mix(in srgb, var(--labs-accent) 15%, transparent)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--labs-accent)" }}>{t("wishlist.aiSummaryLabel")}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>{aiSummary}</p>
          </div>
        )}

        <button type="submit" disabled={isSaving || !whiskyName.trim()} className="labs-btn-primary w-full flex items-center justify-center gap-2 mt-2" style={{ opacity: isSaving || !whiskyName.trim() ? 0.5 : 1 }} data-testid="button-labs-save-wishlist">
          {isSaving ? <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> : <Send className="w-4 h-4" />}
          {isSaving ? t("wishlist.savingText") : (entry ? t("wishlist.update") : t("wishlist.addToWishlist"))}
        </button>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
