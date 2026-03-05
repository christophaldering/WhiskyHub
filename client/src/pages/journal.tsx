import { useState, useEffect, useMemo } from "react";
import { CaskTypeSelect } from "@/components/cask-type-select";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { journalApi, journalBottleApi, textExtractApi, wishlistApi, tastingHistoryApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAIStatus } from "@/hooks/use-ai-status";
import { motion, AnimatePresence } from "framer-motion";
import { c, cardStyle, inputStyle, pageTitleStyle, pageSubtitleStyle, sectionHeadingStyle } from "@/lib/theme";
import { Plus, ArrowLeft, Pencil, Trash2, BookOpen, Wine, Calendar, Camera, X, Loader2, ScanLine, ExternalLink, Type, Send, History, ChevronDown, ChevronUp, MapPin, Star } from "lucide-react";
import { TastingNoteGenerator } from "@/components/tasting-note-generator";
import type { JournalEntry } from "@shared/schema";
import { GuestPreview } from "@/components/guest-preview";

type View = "list" | "form" | "detail";

const serif = "'Playfair Display', Georgia, serif";

const btnPrimary: React.CSSProperties = {
  background: c.accent,
  color: c.bg,
  border: "none",
  borderRadius: 10,
  padding: "10px 20px",
  fontFamily: serif,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const btnOutline: React.CSSProperties = {
  background: "transparent",
  color: c.text,
  border: `1px solid ${c.border}`,
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnDanger: React.CSSProperties = {
  ...btnOutline,
  color: c.danger,
  borderColor: `${c.danger}40`,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: c.text,
  display: "block",
  marginBottom: 6,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 80,
  resize: "vertical" as const,
  lineHeight: 1.5,
};

const tabActive: React.CSSProperties = {
  background: c.accent,
  color: c.bg,
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flex: 1,
  justifyContent: "center",
};

const tabInactive: React.CSSProperties = {
  background: c.inputBg,
  color: c.muted,
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flex: 1,
  justifyContent: "center",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  background: c.inputBg,
  color: c.muted,
  border: `1px solid ${c.border}`,
};

const badgeAccent: React.CSSProperties = {
  ...badgeStyle,
  background: c.accent,
  color: c.bg,
  border: "none",
};

export default function Journal({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { currentParticipant, wishlistTransfer, setWishlistTransfer } = useAppStore();
  const [view, setView] = useState<View>("list");
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [fromWishlistId, setFromWishlistId] = useState<string | null>(null);

  useEffect(() => {
    if (wishlistTransfer && currentParticipant) {
      setEditingEntry(null);
      setFromWishlistId(wishlistTransfer.wishlistEntryId);
      setView("form");
    }
  }, [wishlistTransfer, currentParticipant]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  const uploadImage = async (participantId: string, entryId: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const resp = await fetch(`/api/journal/${participantId}/${entryId}/image`, {
      method: "POST",
      body: formData,
    });
    if (!resp.ok) throw new Error("Image upload failed");
    return resp.json();
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const entry = await journalApi.create(currentParticipant!.id, data);
      if (pendingImage && entry.id) {
        await uploadImage(currentParticipant!.id, entry.id, pendingImage);
      }
      if (fromWishlistId && currentParticipant) {
        try {
          await wishlistApi.delete(currentParticipant.id, fromWishlistId);
        } catch {}
      }
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setView("list");
      setEditingEntry(null);
      setPendingImage(null);
      setFromWishlistId(null);
      setWishlistTransfer(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (removeExistingImage && !pendingImage) {
        data.imageUrl = null;
      }
      const entry = await journalApi.update(currentParticipant!.id, id, data);
      if (pendingImage) {
        await uploadImage(currentParticipant!.id, id, pendingImage);
      }
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setView("list");
      setEditingEntry(null);
      setPendingImage(null);
      setRemoveExistingImage(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => journalApi.delete(currentParticipant!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setDeleteTarget(null);
      if (selectedEntry?.id === deleteTarget?.id) {
        setSelectedEntry(null);
        setView("list");
      }
    },
  });

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("journal.title")} featureDescription={t("guestPreview.journal")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ ...pageTitleStyle, fontSize: 22 }}>{t("journal.title")}</h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[{name: "Ardbeg Uigeadail", date: "Feb 10, 2026", score: "91"}, {name: "Talisker 18", date: "Jan 28, 2026", score: "88"}, {name: "Glendronach 21", date: "Jan 12, 2026", score: "90"}].map(e => (
              <div key={e.name} style={{ ...cardStyle, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div><div style={{ fontFamily: serif, fontWeight: 600, color: c.text }}>{e.name}</div><div style={{ fontSize: 13, color: c.muted }}>{e.date}</div></div>
                <div style={{ fontSize: 18, fontFamily: serif, fontWeight: 700, color: c.accent }}>{e.score}</div>
              </div>
            ))}
          </div>
        </div>
      </GuestPreview>
    );
  }

  const handleNew = () => {
    setEditingEntry(null);
    setPendingImage(null);
    setRemoveExistingImage(false);
    setView("form");
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setPendingImage(null);
    setRemoveExistingImage(false);
    setView("form");
  };

  const handleView = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setView("detail");
  };

  const handleBack = () => {
    setView("list");
    setEditingEntry(null);
    setSelectedEntry(null);
  };

  const [activeTab, setActiveTab] = useState<"journal" | "history">("journal");

  return (
    <div style={{ maxWidth: 896, margin: "0 auto", padding: embedded ? "0" : "32px 16px", minWidth: 0, overflowX: "hidden" }} data-testid="journal-page">
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {!embedded && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
                  <div style={{ minWidth: 0 }}>
                    <h1 style={pageTitleStyle} data-testid="text-journal-title">
                      {t("journal.title")}
                    </h1>
                    <p style={pageSubtitleStyle}>{t("journal.subtitle")}</p>
                  </div>
                  <button
                    onClick={handleNew}
                    style={btnPrimary}
                    data-testid="button-new-journal-entry"
                    aria-label={t("journal.newEntry")}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    <span>{t("journal.newEntry")}</span>
                  </button>
                </div>

                <div style={{ display: "flex", gap: 4, marginBottom: 24, background: c.inputBg, borderRadius: 10, padding: 4 }}>
                  <button
                    onClick={() => setActiveTab("journal")}
                    style={activeTab === "journal" ? tabActive : tabInactive}
                    data-testid="tab-journal-personal"
                  >
                    <BookOpen style={{ width: 14, height: 14 }} />
                    {t("journal.tabPersonal")}
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    style={activeTab === "history" ? tabActive : tabInactive}
                    data-testid="tab-journal-history"
                  >
                    <History style={{ width: 14, height: 14 }} />
                    {t("journal.tabFromTastings")}
                  </button>
                </div>
              </>
            )}

            {activeTab === "journal" && (
              <div style={{ marginTop: 16 }}>
                {isLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ height: 96, background: `${c.card}80`, borderRadius: 12 }} />
                    ))}
                  </div>
                ) : entries.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <BookOpen style={{ width: 48, height: 48, margin: "0 auto 16px", color: `${c.muted}60` }} />
                    <p style={{ color: c.muted, fontFamily: serif }} data-testid="text-journal-empty">
                      {t("journal.empty")}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[...entries].reverse().map((entry: JournalEntry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ ...cardStyle, padding: 20, cursor: "pointer", transition: "border-color 0.2s" }}
                        onClick={() => handleView(entry)}
                        data-testid={`card-journal-entry-${entry.id}`}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                          {entry.imageUrl && (
                            <div style={{ width: 48, height: 64, borderRadius: 6, overflow: "hidden", border: `1px solid ${c.border}50`, flexShrink: 0 }}>
                              <img src={entry.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontFamily: serif, fontWeight: 600, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                              {entry.title}
                            </h3>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 12, color: c.muted }}>
                              {entry.whiskyName && (
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <Wine style={{ width: 12, height: 12 }} />
                                  {entry.whiskyName}
                                </span>
                              )}
                              {entry.createdAt && (
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <Calendar style={{ width: 12, height: 12 }} />
                                  {new Date(entry.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {entry.body && (
                              <p style={{ fontSize: 13, color: c.muted, marginTop: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                {entry.body}
                              </p>
                            )}
                          </div>
                          {entry.personalScore != null && (
                            <div style={{ flexShrink: 0, textAlign: "right" }}>
                              <div style={{ fontSize: 20, fontWeight: 700, color: c.accent, fontFamily: serif }}>
                                {entry.personalScore.toFixed(1)}
                              </div>
                              <div style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Score</div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div style={{ marginTop: 16 }}>
                <TastingHistoryList participantId={currentParticipant?.id} />
              </div>
            )}
          </motion.div>
        )}

        {view === "detail" && selectedEntry && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <EntryDetail
              entry={selectedEntry}
              onBack={handleBack}
              onEdit={() => handleEdit(selectedEntry)}
              onDelete={() => setDeleteTarget(selectedEntry)}
              t={t}
            />
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
            <EntryForm
              entry={editingEntry}
              onBack={() => {
                handleBack();
                if (wishlistTransfer) {
                  setFromWishlistId(null);
                  setWishlistTransfer(null);
                }
              }}
              onSave={(data) => {
                if (editingEntry) {
                  updateMutation.mutate({ id: editingEntry.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              isSaving={createMutation.isPending || updateMutation.isPending}
              pendingImage={pendingImage}
              onImageChange={setPendingImage}
              removeExistingImage={removeExistingImage}
              onRemoveExistingImage={setRemoveExistingImage}
              participantId={currentParticipant?.id}
              t={t}
              prefill={wishlistTransfer ? {
                whiskyName: wishlistTransfer.whiskyName,
                distillery: wishlistTransfer.distillery,
                region: wishlistTransfer.region,
                age: wishlistTransfer.age,
                abv: wishlistTransfer.abv,
                caskType: wishlistTransfer.caskType,
              } : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} data-testid="dialog-delete-journal">
          <div style={{ ...cardStyle, maxWidth: 420, width: "90%", padding: 28 }}>
            <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 8 }}>{t("journal.deleteEntry")}</h3>
            <p style={{ fontSize: 14, color: c.muted, marginBottom: 24 }}>{t("journal.deleteConfirm")}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={btnOutline} data-testid="button-cancel-delete-journal">{t("journal.cancel")}</button>
              <button
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                style={{ ...btnPrimary, background: c.danger, color: "#fff" }}
                data-testid="button-confirm-delete-journal"
              >
                {t("journal.deleteEntry")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EntryDetail({
  entry,
  onBack,
  onEdit,
  onDelete,
  t,
}: {
  entry: JournalEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const metaItems = [
    entry.distillery && { label: t("journal.distillery"), value: entry.distillery },
    entry.region && { label: t("journal.region"), value: entry.region },
    entry.age && { label: t("journal.age"), value: entry.age },
    entry.abv && { label: t("journal.abv"), value: entry.abv },
    entry.caskType && { label: t("journal.caskType"), value: entry.caskType },
  ].filter(Boolean) as { label: string; value: string }[];

  const tastingNotes = [
    entry.noseNotes && { label: t("journal.noseNotes"), value: entry.noseNotes },
    entry.tasteNotes && { label: t("journal.tasteNotes"), value: entry.tasteNotes },
    entry.finishNotes && { label: t("journal.finishNotes"), value: entry.finishNotes },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div data-testid="journal-entry-detail">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 8 }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 8, color: c.muted, background: "none", border: "none", cursor: "pointer", fontSize: 13, flexShrink: 0 }}
          data-testid="button-back-to-journal"
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          {t("journal.back")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onEdit} style={btnOutline} data-testid="button-edit-journal-entry" title={t("journal.editEntry")}>
            <Pencil style={{ width: 14, height: 14 }} />
            <span>{t("journal.editEntry")}</span>
          </button>
          <button onClick={onDelete} style={btnDanger} data-testid="button-delete-journal-entry" title={t("journal.deleteEntry")}>
            <Trash2 style={{ width: 14, height: 14 }} />
            <span>{t("journal.deleteEntry")}</span>
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: "24px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          {entry.imageUrl && (
            <div style={{ width: 80, height: 112, borderRadius: 10, overflow: "hidden", border: `1px solid ${c.border}60`, flexShrink: 0 }}>
              <img src={entry.imageUrl} alt={entry.whiskyName || entry.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ ...pageTitleStyle, fontSize: 24, color: c.accent }}>{entry.title}</h1>
            {entry.whiskyName && (
              <p style={{ fontSize: 18, color: `${c.text}cc`, fontFamily: serif, marginTop: 4 }}>{entry.whiskyName}</p>
            )}
          </div>
          {entry.personalScore != null && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: c.accent, fontFamily: serif }}>{entry.personalScore.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("journal.personalScore")}</div>
            </div>
          )}
        </div>

        {metaItems.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            {metaItems.map((item, i) => (
              <div key={i} style={{ background: c.inputBg, borderRadius: 6, padding: "6px 12px", fontSize: 13 }}>
                <span style={{ color: c.muted }}>{item.label}: </span>
                <span style={{ color: c.text, fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {tastingNotes.length > 0 && (
          <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {tastingNotes.map((note, i) => (
              <div key={i}>
                <h3 style={sectionHeadingStyle}>
                  {note.label}
                </h3>
                <p style={{ color: `${c.text}cc`, fontFamily: serif, lineHeight: 1.6 }}>{note.value}</p>
              </div>
            ))}
          </div>
        )}

        {entry.body && (
          <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24, marginTop: 24 }}>
            <h3 style={sectionHeadingStyle}>
              {t("journal.body")}
            </h3>
            <p style={{ color: `${c.text}cc`, fontFamily: serif, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{entry.body}</p>
          </div>
        )}

        {(entry.mood || entry.occasion) && (
          <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24, marginTop: 24, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14 }}>
            {entry.mood && (
              <div>
                <span style={{ color: c.muted }}>{t("journal.mood")}: </span>
                <span style={{ color: c.text, fontStyle: "italic" }}>{entry.mood}</span>
              </div>
            )}
            {entry.occasion && (
              <div>
                <span style={{ color: c.muted }}>{t("journal.occasion")}: </span>
                <span style={{ color: c.text, fontStyle: "italic" }}>{entry.occasion}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 16, marginTop: 24, fontSize: 12, color: c.muted, display: "flex", gap: 16 }}>
          {entry.createdAt && (
            <span>{t("journal.created")}: {new Date(entry.createdAt).toLocaleString()}</span>
          )}
          {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
            <span>{t("journal.updated")}: {new Date(entry.updatedAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryForm({
  entry,
  onBack,
  onSave,
  isSaving,
  pendingImage,
  onImageChange,
  removeExistingImage,
  onRemoveExistingImage,
  participantId,
  t,
  prefill,
}: {
  entry: JournalEntry | null;
  onBack: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  pendingImage: File | null;
  onImageChange: (file: File | null) => void;
  removeExistingImage: boolean;
  onRemoveExistingImage: (v: boolean) => void;
  participantId: string | undefined;
  t: (key: string, options?: any) => string;
  prefill?: {
    whiskyName?: string;
    distillery?: string;
    region?: string;
    age?: string;
    abv?: string;
    caskType?: string;
  };
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: entry?.title || prefill?.whiskyName || "",
    whiskyName: entry?.whiskyName || prefill?.whiskyName || "",
    distillery: entry?.distillery || prefill?.distillery || "",
    region: entry?.region || prefill?.region || "",
    age: entry?.age || prefill?.age || "",
    abv: entry?.abv || prefill?.abv || "",
    caskType: entry?.caskType || prefill?.caskType || "",
    noseNotes: entry?.noseNotes || "",
    tasteNotes: entry?.tasteNotes || "",
    finishNotes: entry?.finishNotes || "",
    personalScore: entry?.personalScore ?? "",
    mood: entry?.mood || "",
    occasion: entry?.occasion || "",
    body: entry?.body || "",
  });
  const { isFeatureDisabled } = useAIStatus();
  const aiScanDisabled = isFeatureDisabled("journal_identify");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  const [showTextExtract, setShowTextExtract] = useState(false);
  const [extractText, setExtractText] = useState("");
  const [extracting, setExtracting] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { title: form.title };
    if (form.whiskyName) data.whiskyName = form.whiskyName;
    if (form.distillery) data.distillery = form.distillery;
    if (form.region) data.region = form.region;
    if (form.age) data.age = form.age;
    if (form.abv) data.abv = form.abv;
    if (form.caskType) data.caskType = form.caskType;
    if (form.noseNotes) data.noseNotes = form.noseNotes;
    if (form.tasteNotes) data.tasteNotes = form.tasteNotes;
    if (form.finishNotes) data.finishNotes = form.finishNotes;
    if (form.personalScore !== "") data.personalScore = parseFloat(String(form.personalScore));
    if (form.mood) data.mood = form.mood;
    if (form.occasion) data.occasion = form.occasion;
    if (form.body) data.body = form.body;
    onSave(data);
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: active ? "pointer" : (aiScanDisabled ? "not-allowed" : "pointer"),
    opacity: aiScanDisabled ? 0.5 : 1,
    background: active ? `${c.accent}33` : `${c.inputBg}`,
    color: active ? c.accent : c.muted,
    border: "none",
    transition: "all 0.2s",
  });

  return (
    <div data-testid="journal-entry-form">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 8, color: c.muted, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
          data-testid="button-back-from-form"
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          {t("journal.back")}
        </button>
        <h2 style={{ fontSize: 20, fontFamily: serif, fontWeight: 700, color: c.accent, margin: 0 }}>
          {entry ? t("journal.editEntry") : t("journal.newEntry")}
        </h2>
      </div>

      <form onSubmit={handleSubmit} style={{ ...cardStyle, padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <label htmlFor="title" style={{ ...labelStyle, fontFamily: serif }}>{t("journal.entryTitle")} *</label>
          <input
            id="title"
            value={form.title}
            onChange={set("title")}
            placeholder={t("journal.entryTitlePlaceholder")}
            required
            style={inputStyle}
            data-testid="input-journal-title"
          />
        </div>

        <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h3 style={sectionHeadingStyle}>Whisky</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: `${c.muted}80` }} data-testid="text-ai-notice-scan">{t("legal.aiNotice")}</span>
              <label
                style={chipStyle(scanning)}
                data-testid="button-scan-bottle"
                title={aiScanDisabled ? t("admin.aiDisabledHint") : undefined}
              >
              {scanning ? (
                <>
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  {t("journal.scanning")}
                </>
              ) : (
                <>
                  <ScanLine style={{ width: 14, height: 14 }} />
                  {t("journal.scanBottle")}
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
                  setScanning(true);
                  setScanError("");
                  setScanResult(null);
                  try {
                    const result = await journalBottleApi.identify(file, participantId);
                    const whiskies = result.whiskies || (result.whiskyName ? [result] : []);
                    if (whiskies.length === 0) {
                      setScanError(t("journal.scanFailed"));
                    } else if (whiskies.length === 1) {
                      const w = whiskies[0];
                      setScanResult(w);
                      setForm(prev => ({
                        ...prev,
                        whiskyName: w.whiskyName || prev.whiskyName,
                        distillery: w.distillery || prev.distillery,
                        region: w.region || prev.region,
                        age: w.age || prev.age,
                        abv: w.abv || prev.abv,
                        caskType: w.caskType || prev.caskType,
                        title: prev.title || w.whiskyName || prev.title,
                      }));
                    } else {
                      setScanResult({ multipleWhiskies: whiskies });
                    }
                    onImageChange(file);
                  } catch (err: any) {
                    setScanError(err.message || "Scan failed");
                  } finally {
                    setScanning(false);
                  }
                }}
              />
            </label>
            </div>
          </div>

          {scanError && (
            <div style={{ marginBottom: 12, fontSize: 12, color: c.danger, background: `${c.danger}15`, border: `1px solid ${c.danger}30`, borderRadius: 8, padding: "8px 12px" }}>
              {scanError}
            </div>
          )}

          {scanResult && !scanResult.multipleWhiskies && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 16, background: `${c.success}20`, border: `1px solid ${c.success}30`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: c.success, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ScanLine style={{ width: 14, height: 14 }} />
                {t("journal.scanSuccess", { name: scanResult.whiskyName || "Unknown Whisky" })}
              </span>
              {scanResult.whiskybaseUrl && scanResult.whiskybaseUrl.startsWith("http") ? (
                <a
                  href={scanResult.whiskybaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: `${c.accent}30`, color: c.accent, textDecoration: "none", flexShrink: 0 }}
                >
                  Whiskybase <ExternalLink style={{ width: 12, height: 12 }} />
                </a>
              ) : scanResult.whiskybaseSearch && scanResult.whiskybaseSearch.trim() ? (
                <a
                  href={`https://www.whiskybase.com/search?q=${encodeURIComponent(scanResult.whiskybaseSearch)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: `${c.accent}30`, color: c.accent, textDecoration: "none", flexShrink: 0 }}
                >
                  {t("journal.searchWhiskybase")} <ExternalLink style={{ width: 12, height: 12 }} />
                </a>
              ) : null}
            </motion.div>
          )}

          {scanResult?.multipleWhiskies && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 16, background: `${c.accent}15`, border: `1px solid ${c.accent}30`, borderRadius: 8, padding: 12 }}
            >
              <p style={{ fontSize: 12, fontWeight: 500, color: c.accent, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <ScanLine style={{ width: 14, height: 14 }} />
                {t("journal.multipleFound", { count: scanResult.multipleWhiskies.length })}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {scanResult.multipleWhiskies.map((w: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`button-select-scan-whisky-${idx}`}
                    onClick={() => {
                      setScanResult(w);
                      setForm(prev => ({
                        ...prev,
                        whiskyName: w.whiskyName || prev.whiskyName,
                        distillery: w.distillery || prev.distillery,
                        region: w.region || prev.region,
                        age: w.age || prev.age,
                        abv: w.abv || prev.abv,
                        caskType: w.caskType || prev.caskType,
                        title: prev.title || w.whiskyName || prev.title,
                      }));
                    }}
                    style={{ width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 6, background: c.inputBg, border: `1px solid ${c.border}`, cursor: "pointer", fontSize: 12, color: c.text, transition: "border-color 0.2s" }}
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

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setShowTextExtract(!showTextExtract)}
              style={chipStyle(showTextExtract)}
              data-testid="button-text-extract-journal"
            >
              <Type style={{ width: 14, height: 14 }} />
              {t("journal.extractText")}
            </button>
          </div>

          {showTextExtract && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: 16, padding: 12, background: `${c.inputBg}`, border: `1px solid ${c.border}50`, borderRadius: 8 }}
            >
              <p style={{ fontSize: 12, color: c.muted, marginBottom: 8 }}>{t("journal.extractHint")}</p>
              <textarea
                value={extractText}
                onChange={(e) => setExtractText(e.target.value)}
                placeholder={t("journal.textPlaceholder")}
                rows={3}
                style={{ ...textareaStyle, marginBottom: 8 }}
                data-testid="textarea-extract-journal"
              />
              <button
                type="button"
                disabled={extracting || extractText.trim().length < 3 || aiScanDisabled}
                onClick={async () => {
                  if (!participantId || extractText.trim().length < 3) return;
                  setExtracting(true);
                  setScanError("");
                  try {
                    const result = await textExtractApi.extract(extractText.trim(), participantId);
                    if (result.whiskyName && result.whiskyName !== "Unknown Whisky") {
                      setScanResult(result);
                      setForm(prev => ({
                        ...prev,
                        whiskyName: result.whiskyName || prev.whiskyName,
                        distillery: result.distillery || prev.distillery,
                        region: result.region || prev.region,
                        age: result.age || prev.age,
                        abv: result.abv || prev.abv,
                        caskType: result.caskType || prev.caskType,
                        title: prev.title || result.whiskyName || prev.title,
                      }));
                      setShowTextExtract(false);
                      setExtractText("");
                    } else {
                      setScanError(t("journal.scanFailed"));
                    }
                  } catch (err: any) {
                    setScanError(err.message || t("journal.scanFailed"));
                  } finally {
                    setExtracting(false);
                  }
                }}
                style={extracting ? chipStyle(true) : btnPrimary}
                data-testid="button-extract-submit-journal"
              >
                {extracting ? (
                  <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> {t("journal.extracting")}</>
                ) : (
                  <><Send style={{ width: 14, height: 14 }} /> {t("journal.extractButton")}</>
                )}
              </button>
            </motion.div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            <div>
              <label htmlFor="whiskyName" style={labelStyle}>{t("journal.whiskyName")}</label>
              <input id="whiskyName" value={form.whiskyName} onChange={set("whiskyName")} placeholder={t("journal.whiskyNamePlaceholder")} style={inputStyle} data-testid="input-journal-whisky-name" />
            </div>
            <div>
              <label htmlFor="distillery" style={labelStyle}>{t("journal.distillery")}</label>
              <input id="distillery" value={form.distillery} onChange={set("distillery")} placeholder={t("journal.distilleryPlaceholder")} style={inputStyle} data-testid="input-journal-distillery" />
            </div>
            <div>
              <label htmlFor="region" style={labelStyle}>{t("journal.region")}</label>
              <input id="region" value={form.region} onChange={set("region")} placeholder={t("journal.regionPlaceholder")} style={inputStyle} data-testid="input-journal-region" />
            </div>
            <div>
              <label htmlFor="age" style={labelStyle}>{t("journal.age")}</label>
              <input id="age" value={form.age} onChange={set("age")} placeholder={t("journal.agePlaceholder")} style={inputStyle} data-testid="input-journal-age" />
            </div>
            <div>
              <label htmlFor="abv" style={labelStyle}>{t("journal.abv")}</label>
              <input id="abv" value={form.abv} onChange={set("abv")} placeholder={t("journal.abvPlaceholder")} style={inputStyle} data-testid="input-journal-abv" />
            </div>
            <div>
              <label htmlFor="caskType" style={labelStyle}>{t("journal.caskType")}</label>
              <CaskTypeSelect value={form.caskType} onChange={(v) => setForm(p => ({ ...p, caskType: v }))} />
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24 }}>
          <h3 style={sectionHeadingStyle}>
            {t("journal.bottlePhoto")}
          </h3>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            {(pendingImage || (entry?.imageUrl && !removeExistingImage)) && (
              <div style={{ position: "relative", width: 96, height: 128, borderRadius: 10, overflow: "hidden", border: `1px solid ${c.border}60`, flexShrink: 0 }}>
                <img
                  src={pendingImage ? URL.createObjectURL(pendingImage) : entry!.imageUrl!}
                  alt="Bottle"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (pendingImage) {
                      onImageChange(null);
                    } else {
                      onRemoveExistingImage(true);
                    }
                  }}
                  style={{ position: "absolute", top: 4, right: 4, padding: 2, borderRadius: "50%", background: `${c.bg}cc`, border: "none", cursor: "pointer" }}
                  data-testid="button-remove-journal-image"
                >
                  <X style={{ width: 14, height: 14, color: c.muted }} />
                </button>
              </div>
            )}
            <label
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 96, height: 128, borderRadius: 10, border: `2px dashed ${c.border}80`, cursor: "pointer", background: `${c.inputBg}` }}
              data-testid="button-upload-journal-image"
            >
              <Camera style={{ width: 20, height: 20, color: c.muted, marginBottom: 4 }} />
              <span style={{ fontSize: 10, color: c.muted, textAlign: "center", lineHeight: 1.3 }}>
                {t("journal.addPhoto")}
              </span>
              <span style={{ fontSize: 8, color: `${c.muted}80`, textAlign: "center", lineHeight: 1.3, marginTop: 2 }}>{t("common.uploadHint")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
                  if (!allowedTypes.includes(file.type)) {
                    toast({ title: t("common.uploadInvalidType"), variant: "destructive" });
                    return;
                  }
                  if (file.size > 2 * 1024 * 1024) {
                    toast({ title: t("common.uploadTooLarge"), variant: "destructive" });
                    return;
                  }
                  onImageChange(file);
                  if (participantId && !form.whiskyName) {
                    setScanning(true);
                    setScanError("");
                    setScanResult(null);
                    try {
                      const result = await journalBottleApi.identify(file, participantId);
                      const whiskies = result.whiskies || (result.whiskyName ? [result] : []);
                      if (whiskies.length === 0) {
                        setScanError(t("journal.scanFailed"));
                      } else if (whiskies.length === 1) {
                        const w = whiskies[0];
                        setScanResult(w);
                        setForm(prev => ({
                          ...prev,
                          whiskyName: w.whiskyName || prev.whiskyName,
                          distillery: w.distillery || prev.distillery,
                          region: w.region || prev.region,
                          age: w.age || prev.age,
                          abv: w.abv || prev.abv,
                          caskType: w.caskType || prev.caskType,
                          title: prev.title || w.whiskyName || prev.title,
                        }));
                      } else {
                        setScanResult({ multipleWhiskies: whiskies });
                      }
                    } catch (err: any) {
                      setScanError(err.message || t("journal.scanFailed"));
                    } finally {
                      setScanning(false);
                    }
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24 }}>
          <h3 style={sectionHeadingStyle}>
            {t("journal.noseNotes")} / {t("journal.tasteNotes")} / {t("journal.finishNotes")}
          </h3>

          <div style={{ marginBottom: 20, background: c.inputBg, borderRadius: 8, border: `1px solid ${c.border}50`, padding: 12 }}>
            <TastingNoteGenerator
              currentNotes={[form.noseNotes, form.tasteNotes, form.finishNotes].filter(Boolean).join(" ")}
              onInsertNote={(note: string) => {
                const nosePatterns = [/^On the nose:?\s*/i, /^The aroma presents:?\s*/i, /^Nose:?\s*/i, /^In der Nase:?\s*/i, /^Das Aroma zeigt:?\s*/i, /^Nase:?\s*/i];
                const palatePatterns = [/^On the palate:?\s*/i, /^The taste reveals:?\s*/i, /^Palate:?\s*/i, /^Am Gaumen:?\s*/i, /^Der Geschmack offenbart:?\s*/i, /^Gaumen:?\s*/i];
                const finishPatterns = [/^The finish is:?\s*/i, /^Finish:?\s*/i, /^It finishes with:?\s*/i, /^Der Abgang ist:?\s*/i, /^Abgang:?\s*/i, /^Er endet mit:?\s*/i];

                const sentences = note.split(/(?<=\.)\s+|\n+/).map(s => s.trim()).filter(Boolean);
                let nosePart = "";
                let palatePart = "";
                let finishPart = "";

                for (const s of sentences) {
                  if (nosePatterns.some(p => p.test(s))) {
                    let cleaned = s;
                    for (const p of nosePatterns) cleaned = cleaned.replace(p, "");
                    nosePart = cleaned.replace(/\.$/, "").trim();
                  } else if (palatePatterns.some(p => p.test(s))) {
                    let cleaned = s;
                    for (const p of palatePatterns) cleaned = cleaned.replace(p, "");
                    palatePart = cleaned.replace(/\.$/, "").trim();
                  } else if (finishPatterns.some(p => p.test(s))) {
                    let cleaned = s;
                    for (const p of finishPatterns) cleaned = cleaned.replace(p, "");
                    finishPart = cleaned.replace(/\.$/, "").trim();
                  }
                }

                setForm(prev => ({
                  ...prev,
                  noseNotes: nosePart ? (prev.noseNotes ? `${prev.noseNotes}, ${nosePart}` : nosePart) : prev.noseNotes,
                  tasteNotes: palatePart ? (prev.tasteNotes ? `${prev.tasteNotes}, ${palatePart}` : palatePart) : prev.tasteNotes,
                  finishNotes: finishPart ? (prev.finishNotes ? `${prev.finishNotes}, ${finishPart}` : finishPart) : prev.finishNotes,
                }));
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="noseNotes" style={labelStyle}>{t("journal.noseNotes")}</label>
              <textarea id="noseNotes" value={form.noseNotes} onChange={set("noseNotes")} placeholder={t("journal.noseNotesPlaceholder")} style={textareaStyle} data-testid="input-journal-nose" />
            </div>
            <div>
              <label htmlFor="tasteNotes" style={labelStyle}>{t("journal.tasteNotes")}</label>
              <textarea id="tasteNotes" value={form.tasteNotes} onChange={set("tasteNotes")} placeholder={t("journal.tasteNotesPlaceholder")} style={textareaStyle} data-testid="input-journal-taste" />
            </div>
            <div>
              <label htmlFor="finishNotes" style={labelStyle}>{t("journal.finishNotes")}</label>
              <textarea id="finishNotes" value={form.finishNotes} onChange={set("finishNotes")} placeholder={t("journal.finishNotesPlaceholder")} style={textareaStyle} data-testid="input-journal-finish" />
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24 }}>
          <div>
            <label htmlFor="personalScore" style={{ ...labelStyle, fontWeight: 600 }}>{t("journal.personalScore")} (0–100)</label>
            <input
              id="personalScore"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.personalScore}
              onChange={set("personalScore")}
              style={{ ...inputStyle, width: 128 }}
              data-testid="input-journal-score"
            />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24 }}>
          <h3 style={sectionHeadingStyle}>{t("journal.body")}</h3>
          <textarea
            value={form.body}
            onChange={set("body")}
            placeholder={t("journal.bodyPlaceholder")}
            style={{ ...textareaStyle, minHeight: 120 }}
            data-testid="input-journal-body"
          />
        </div>

        <div style={{ borderTop: `1px solid ${c.border}50`, paddingTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          <div>
            <label htmlFor="mood" style={labelStyle}>{t("journal.mood")}</label>
            <input id="mood" value={form.mood} onChange={set("mood")} placeholder={t("journal.moodPlaceholder")} style={inputStyle} data-testid="input-journal-mood" />
          </div>
          <div>
            <label htmlFor="occasion" style={labelStyle}>{t("journal.occasion")}</label>
            <input id="occasion" value={form.occasion} onChange={set("occasion")} placeholder={t("journal.occasionPlaceholder")} style={inputStyle} data-testid="input-journal-occasion" />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 16 }}>
          <button
            type="submit"
            disabled={!form.title.trim() || isSaving}
            style={{ ...btnPrimary, opacity: (!form.title.trim() || isSaving) ? 0.5 : 1 }}
            data-testid="button-save-journal-entry"
          >
            {t("journal.save")}
          </button>
          <button type="button" onClick={onBack} style={btnOutline} data-testid="button-cancel-journal">
            {t("journal.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

function TastingHistoryList({ participantId }: { participantId?: string }) {
  const { t } = useTranslation();
  const [expandedWhisky, setExpandedWhisky] = useState<string | null>(null);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["tasting-history", participantId],
    queryFn: () => tastingHistoryApi.get(participantId!),
    enabled: !!participantId,
  });

  const history = useMemo(() => {
    const tastings = rawData?.tastings || rawData || [];
    if (!Array.isArray(tastings)) return [];
    const whiskyMap = new Map<string, any>();
    for (const tasting of tastings) {
      const whiskies = tasting.whiskies || [];
      for (const w of whiskies) {
        const key = w.name || w.id;
        if (!whiskyMap.has(key)) {
          whiskyMap.set(key, {
            whiskyName: w.name,
            distillery: w.distillery,
            age: w.age,
            abv: w.abv,
            region: w.region,
            imageUrl: w.imageUrl,
            count: 0,
            tastings: [],
          });
        }
        const entry = whiskyMap.get(key)!;
        entry.count++;
        entry.tastings.push({
          tastingTitle: tasting.title,
          tastingDate: tasting.date,
          tastingLocation: tasting.location,
          nose: w.myRating?.nose ?? null,
          taste: w.myRating?.taste ?? null,
          finish: w.myRating?.finish ?? null,
          balance: w.myRating?.balance ?? null,
          overall: w.myRating?.overall ?? null,
          notes: w.myRating?.notes ?? null,
        });
      }
    }
    return Array.from(whiskyMap.values());
  }, [rawData]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, background: `${c.card}80`, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <History style={{ width: 48, height: 48, margin: "0 auto 16px", color: `${c.muted}60` }} />
        <p style={{ color: c.muted, fontFamily: serif }} data-testid="text-history-empty">
          {t("journal.historyEmpty")}
        </p>
        <p style={{ fontSize: 13, color: `${c.muted}b0`, marginTop: 4 }}>{t("journal.historyEmptyDesc")}</p>
      </div>
    );
  }

  const totalTastings = history.reduce((sum: number, w: any) => sum + w.count, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, fontSize: 13, color: c.muted }}>
        <span style={badgeStyle}>
          {t("journal.historyWhiskyCount", { count: history.length })}
        </span>
        <span style={{ ...badgeStyle, background: "transparent" }}>
          {t("journal.historyTastingCount", { count: totalTastings })}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.map((whisky: any, i: number) => {
          const isExpanded = expandedWhisky === whisky.whiskyName;
          const validOveralls = whisky.tastings.filter((t: any) => t.overall != null);
          const avgOverall = validOveralls.length > 0
            ? validOveralls.reduce((s: number, t: any) => s + t.overall, 0) / validOveralls.length
            : null;

          return (
            <motion.div
              key={whisky.whiskyName + i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <div
                style={{ ...cardStyle, padding: 16, cursor: "pointer", transition: "border-color 0.2s" }}
                onClick={() => setExpandedWhisky(isExpanded ? null : whisky.whiskyName)}
                data-testid={`card-history-whisky-${i}`}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {whisky.imageUrl ? (
                    <div style={{ width: 40, height: 56, borderRadius: 6, overflow: "hidden", border: `1px solid ${c.border}50`, flexShrink: 0 }}>
                      <img src={whisky.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ width: 40, height: 56, borderRadius: 6, border: `1px solid ${c.border}50`, background: c.inputBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Wine style={{ width: 16, height: 16, color: `${c.muted}60` }} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontFamily: serif, fontWeight: 600, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{whisky.whiskyName}</h3>
                      {whisky.count > 1 && (
                        <span style={badgeAccent}>
                          {whisky.count}×
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 12, color: c.muted, flexWrap: "wrap" }}>
                      {whisky.distillery && (
                        <span>{whisky.distillery}</span>
                      )}
                      {whisky.age && (
                        <span>{whisky.age} {t("journal.years")}</span>
                      )}
                      {whisky.abv && (
                        <span>{whisky.abv}%</span>
                      )}
                      {whisky.region && (
                        <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <MapPin style={{ width: 10, height: 10 }} />
                          {whisky.region}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {avgOverall != null && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.accent, fontFamily: serif }}>{avgOverall.toFixed(1)}</div>
                      <div style={{ fontSize: 9, color: c.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("journal.avgScore")}</div>
                    </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp style={{ width: 16, height: 16, color: c.muted }} />
                    ) : (
                      <ChevronDown style={{ width: 16, height: 16, color: c.muted }} />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${c.border}50`, display: "flex", flexDirection: "column", gap: 12 }}>
                        {whisky.tastings.map((tasting: any, j: number) => (
                          <div key={j} style={{ background: c.inputBg, borderRadius: 8, padding: 12 }} data-testid={`history-tasting-${i}-${j}`}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div>
                                <p style={{ fontSize: 14, fontFamily: serif, fontWeight: 600, color: c.text, margin: 0 }}>{tasting.tastingTitle}</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: c.muted, marginTop: 2 }}>
                                  {tasting.tastingDate && (
                                    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                      <Calendar style={{ width: 10, height: 10 }} />
                                      {new Date(tasting.tastingDate).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                  )}
                                  {tasting.tastingLocation && (
                                    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                      <MapPin style={{ width: 10, height: 10 }} />
                                      {tasting.tastingLocation}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: c.accent, fontFamily: serif }}>{tasting.overall?.toFixed(1)}</span>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 11 }}>
                              <div>
                                <span style={{ color: c.muted }}>{t("journal.historyNose")}</span>
                                <span style={{ marginLeft: 4, fontWeight: 500, color: c.text }}>{tasting.nose?.toFixed(0)}</span>
                              </div>
                              <div>
                                <span style={{ color: c.muted }}>{t("journal.historyTaste")}</span>
                                <span style={{ marginLeft: 4, fontWeight: 500, color: c.text }}>{tasting.taste?.toFixed(0)}</span>
                              </div>
                              <div>
                                <span style={{ color: c.muted }}>{t("journal.historyFinish")}</span>
                                <span style={{ marginLeft: 4, fontWeight: 500, color: c.text }}>{tasting.finish?.toFixed(0)}</span>
                              </div>
                              <div>
                                <span style={{ color: c.muted }}>{t("journal.historyBalance")}</span>
                                <span style={{ marginLeft: 4, fontWeight: 500, color: c.text }}>{tasting.balance?.toFixed(0)}</span>
                              </div>
                            </div>
                            {tasting.notes && (
                              <p style={{ fontSize: 12, color: c.muted, marginTop: 8, fontStyle: "italic" }}>"{tasting.notes}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
