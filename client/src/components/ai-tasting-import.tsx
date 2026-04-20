import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { tastingApi, participantApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { c, cardStyle, inputStyle } from "@/lib/theme";
import {
  Upload, FileSpreadsheet, Image, MessageSquare, Sparkles, Loader2,
  Check, X, Trash2, Edit3, ChevronDown, ChevronUp, Wine, ExternalLink, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PersonalRating {
  overall: number | null;
  nose: number | null;
  taste: number | null;
  finish: number | null;
  notes: string | null;
}

interface ImportedWhisky {
  name: string;
  distillery: string | null;
  bottler: string | null;
  age: string | null;
  abv: number | null;
  category: string | null;
  country: string | null;
  region: string | null;
  caskType: string | null;
  distilledYear: string | null;
  whiskybaseId: string | null;
  wbScore: number | null;
  price: number | null;
  peatLevel: string | null;
  ppm: number | null;
  hostNotes: string | null;
  hostSummary: string | null;
  sortOrder: number;
  personalRating?: PersonalRating;
}

interface ImportResult {
  whiskies: ImportedWhisky[];
  tastingMeta: {
    title?: string;
    date?: string;
    dateISO?: string;
    dateDisplay?: string;
    location?: string;
    participants?: string[];
  };
  source: "excel" | "ai";
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: c.muted,
  marginBottom: 6,
  display: "block",
};

const smallLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: c.muted,
  display: "block",
  marginBottom: 2,
};

const btnPrimary: React.CSSProperties = {
  background: c.accent,
  color: c.bg,
  border: "none",
  borderRadius: 10,
  fontWeight: 600,
  padding: "12px",
  fontSize: 15,
  cursor: "pointer",
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: "system-ui, sans-serif",
  transition: "opacity 0.2s",
};

const btnOutline: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${c.border}`,
  color: c.text,
  borderRadius: 10,
  fontWeight: 600,
  padding: "12px",
  fontSize: 15,
  cursor: "pointer",
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: "system-ui, sans-serif",
};

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  height: 28,
  padding: "4px 8px",
  fontSize: 12,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "none" as const,
  lineHeight: 1.5,
  fontFamily: "monospace",
  fontSize: 12,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const panelStyle: React.CSSProperties = {
  background: c.card,
  borderRadius: 16,
  maxWidth: 640,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: 24,
  position: "relative",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  background: "none",
  border: "none",
  color: c.muted,
  cursor: "pointer",
  padding: 4,
  lineHeight: 1,
};

export function AiTastingImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();

  const [step, setStep] = useState<"upload" | "preview" | "creating">("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [editingWhiskies, setEditingWhiskies] = useState<ImportedWhisky[]>([]);
  const [tastingTitle, setTastingTitle] = useState("");
  const [tastingDate, setTastingDate] = useState("");
  const [tastingLocation, setTastingLocation] = useState("");
  const [blindMode, setBlindMode] = useState(true);
  const [expandedWhisky, setExpandedWhisky] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPin, setGuestPin] = useState("");
  const [importConsent, setImportConsent] = useState(false);
  const [includeRatings, setIncludeRatings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUnsavedData = files.length > 0 || pastedText.trim().length > 0 || editingWhiskies.length > 0 || tastingTitle.trim().length > 0;
  useUnsavedChanges(hasUnsavedData && step !== "creating");

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const hostId = currentParticipant?.id || "guest-analyze";
      return tastingApi.aiImport(files, pastedText, hostId);
    },
    onSuccess: (data: ImportResult) => {
      setResult(data);
      const whiskies = data.whiskies.map((w, i) => ({ ...w, sortOrder: i }));
      setEditingWhiskies(whiskies);
      setTastingTitle(data.tastingMeta.title || "");
      setTastingDate(data.tastingMeta.dateISO || data.tastingMeta.date || new Date().toISOString().split("T")[0]);
      setTastingLocation(data.tastingMeta.location || "");
      const hasPersonalRatings = whiskies.some(w => w.personalRating?.overall != null);
      setIncludeRatings(hasPersonalRatings);
      setStep("preview");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let hostId = currentParticipant?.id;
      if (!hostId) {
        if (!guestName.trim()) throw new Error("Please enter your name");
        const participant = await participantApi.loginOrCreate(guestName.trim(), guestPin || undefined, undefined, undefined, importConsent);
        setParticipant(participant);
        hostId = participant.id;
      }
      return tastingApi.createFromImport({
        hostId,
        title: tastingTitle.trim() || "Imported Tasting",
        date: tastingDate || new Date().toISOString().split("T")[0],
        location: tastingLocation.trim() || "Online",
        blindMode,
        whiskies: editingWhiskies,
        includeRatings,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      onOpenChange(false);
      resetState();
      if (data.hasRatings) {
        navigate(`/tasting-results/${data.tasting.id}`);
      } else {
        navigate(`/tasting/${data.tasting.id}`);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const resetState = useCallback(() => {
    setStep("upload");
    setFiles([]);
    setPastedText("");
    setResult(null);
    setEditingWhiskies([]);
    setTastingTitle("");
    setTastingDate("");
    setTastingLocation("");
    setBlindMode(true);
    setExpandedWhisky(null);
    setError(null);
    setGuestName("");
    setGuestPin("");
    setImportConsent(false);
    setIncludeRatings(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateWhisky = (index: number, field: string, value: any) => {
    setEditingWhiskies(prev => prev.map((w, i) => i === index ? { ...w, [field]: value } : w));
  };

  const removeWhisky = (index: number) => {
    setEditingWhiskies(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image size={16} color={c.accent} />;
    if (file.name.match(/\.(xlsx|xls|csv)$/i)) return <FileSpreadsheet size={16} color={c.success} />;
    return <Upload size={16} color={c.muted} />;
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={panelStyle}>
        <button style={closeBtnStyle} onClick={handleClose}>
          <X size={20} />
        </button>

        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: c.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={20} color={c.accent} />
            {t("aiImport.title")}
          </h2>
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, color: c.muted, marginTop: 4 }}>
            {t("aiImport.description")}
          </p>
          <p style={{ fontSize: 10, color: `${c.muted}80`, marginTop: 4 }} data-testid="text-ai-notice-import">{t("legal.aiNotice")}</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${c.border}`,
                  background: c.inputBg,
                  borderRadius: 12,
                  padding: 32,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                data-testid="dropzone-import"
              >
                <Upload size={40} color={`${c.muted}80`} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, color: c.muted, marginBottom: 4 }}>{t("aiImport.dropzoneTitle")}</p>
                <p style={{ fontSize: 12, color: `${c.muted}99` }}>{t("aiImport.dropzoneHint")}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  data-testid="input-import-files"
                />
              </div>
              <p style={{ fontSize: 11, color: `${c.muted}99`, margin: "8px 0 0" }} data-testid="text-upload-rights-hint">{t("common.uploadRightsHint")}</p>

              {files.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {files.map((file, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: `${c.border}30`, borderRadius: 8, fontSize: 13 }}>
                      {getFileIcon(file)}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12, color: c.text }}>{file.name}</span>
                      <span style={{ fontSize: 12, color: c.muted }}>{(file.size / 1024).toFixed(0)} KB</span>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ background: "none", border: "none", color: c.muted, cursor: "pointer", padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MessageSquare size={16} color={c.muted} />
                  <label style={labelStyle}>{t("aiImport.pasteLabel")}</label>
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={t("aiImport.pastePlaceholder")}
                  style={textareaStyle}
                  data-testid="textarea-import-text"
                />
              </div>

              {error && (
                <div style={{ padding: 12, background: `${c.error}15`, border: `1px solid ${c.error}40`, borderRadius: 8, fontSize: 14, color: c.error }}>
                  {error}
                </div>
              )}

              <button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending || (files.length === 0 && !pastedText.trim())}
                style={{ ...btnPrimary, opacity: (analyzeMutation.isPending || (files.length === 0 && !pastedText.trim())) ? 0.5 : 1 }}
                data-testid="button-analyze-import"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    {t("aiImport.analyzing")}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {t("aiImport.analyze")}
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: `${c.success}15`, border: `1px solid ${c.success}40`, borderRadius: 8 }}>
                <Check size={16} color={c.success} />
                <span style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", color: c.success }}>
                  {t("aiImport.found", { count: editingWhiskies.length })}
                  {result?.source === "excel" && ` (Excel)`}
                  {result?.source === "ai" && ` (AI)`}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t("aiImport.tastingTitle")}</label>
                  <input
                    value={tastingTitle}
                    onChange={(e) => setTastingTitle(e.target.value)}
                    placeholder="Whisky Tasting"
                    style={inputStyle}
                    data-testid="input-import-title"
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("aiImport.tastingDate")}</label>
                  <input
                    type="date"
                    value={tastingDate}
                    onChange={(e) => setTastingDate(e.target.value)}
                    style={inputStyle}
                    data-testid="input-import-date"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t("aiImport.location")}</label>
                  <input
                    value={tastingLocation}
                    onChange={(e) => setTastingLocation(e.target.value)}
                    placeholder="Online"
                    style={inputStyle}
                    data-testid="input-import-location"
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: `${c.border}30`, borderRadius: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>{t("aiImport.blindMode")}</label>
                  <button
                    onClick={() => setBlindMode(!blindMode)}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: "none",
                      background: blindMode ? c.accent : c.border,
                      position: "relative",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      flexShrink: 0,
                    }}
                    data-testid="switch-import-blind"
                  >
                    <span style={{
                      position: "absolute",
                      top: 2,
                      left: blindMode ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: c.text,
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              </div>

              {editingWhiskies.some(w => w.personalRating?.overall != null) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: `${c.accent}15`, border: `1px solid ${c.accent}40`, borderRadius: 8 }} data-testid="toggle-include-ratings">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Star size={16} color={c.accent} />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{t("aiImport.includeRatings")}</span>
                      <p style={{ fontSize: 11, color: c.muted, margin: 0 }}>{t("aiImport.includeRatingsHint")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIncludeRatings(!includeRatings)}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: "none",
                      background: includeRatings ? c.accent : c.border,
                      position: "relative",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      flexShrink: 0,
                    }}
                    data-testid="switch-include-ratings"
                  >
                    <span style={{
                      position: "absolute",
                      top: 2,
                      left: includeRatings ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: c.text,
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              )}

              <div style={{ borderTop: `1px solid ${c.border}30`, paddingTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: c.muted, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <Wine size={14} />
                  {t("aiImport.whiskies")} ({editingWhiskies.length})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "40vh", overflowY: "auto", paddingRight: 4 }}>
                  {editingWhiskies.map((w, idx) => (
                    <div key={idx} style={{ border: `1px solid ${c.border}30`, borderRadius: 12, background: c.card }} data-testid={`card-import-whisky-${idx}`}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", cursor: "pointer" }}
                        onClick={() => setExpandedWhisky(expandedWhisky === idx ? null : idx)}
                      >
                        <span style={{ fontSize: 12, fontFamily: "monospace", color: c.muted, width: 20, textAlign: "center" }}>{idx + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 14, color: c.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</p>
                          <p style={{ fontSize: 12, color: c.muted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {[w.distillery, w.bottler, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {includeRatings && w.personalRating?.overall != null && (
                          <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: c.success, display: "inline-flex", alignItems: "center", gap: 2 }} data-testid={`text-rating-score-${idx}`}>
                            <Star size={10} fill={c.success} color={c.success} />{w.personalRating.overall}
                          </span>
                        )}
                        {w.wbScore && (
                          <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: c.accent }}>{w.wbScore}</span>
                        )}
                        {w.price && (
                          <span style={{ fontSize: 12, fontFamily: "monospace", color: c.muted }}>€{w.price}</span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); removeWhisky(idx); }} style={{ background: "none", border: "none", color: c.muted, cursor: "pointer", padding: 2 }}>
                          <Trash2 size={14} />
                        </button>
                        {expandedWhisky === idx ? <ChevronUp size={14} color={c.muted} /> : <ChevronDown size={14} color={c.muted} />}
                      </div>

                      <AnimatePresence>
                        {expandedWhisky === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${c.border}20`, display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <div>
                                  <label style={smallLabelStyle}>Name</label>
                                  <input style={smallInputStyle} value={w.name} onChange={(e) => updateWhisky(idx, "name", e.target.value)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>Distillery</label>
                                  <input style={smallInputStyle} value={w.distillery || ""} onChange={(e) => updateWhisky(idx, "distillery", e.target.value || null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>{t("whisky.bottler")}</label>
                                  <input style={smallInputStyle} value={w.bottler || ""} onChange={(e) => updateWhisky(idx, "bottler", e.target.value || null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>Age</label>
                                  <input style={smallInputStyle} value={w.age || ""} onChange={(e) => updateWhisky(idx, "age", e.target.value || null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>ABV %</label>
                                  <input style={smallInputStyle} type="number" step="0.1" value={w.abv ?? ""} onChange={(e) => updateWhisky(idx, "abv", e.target.value ? parseFloat(e.target.value) : null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>Category</label>
                                  <input style={smallInputStyle} value={w.category || ""} onChange={(e) => updateWhisky(idx, "category", e.target.value || null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>Country</label>
                                  <input style={smallInputStyle} value={w.country || ""} onChange={(e) => updateWhisky(idx, "country", e.target.value || null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>Region</label>
                                  <input style={smallInputStyle} value={w.region || ""} onChange={(e) => updateWhisky(idx, "region", e.target.value || null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>Cask</label>
                                  <input style={smallInputStyle} value={w.caskType || ""} onChange={(e) => updateWhisky(idx, "caskType", e.target.value || null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>{t("whisky.vintage")}</label>
                                  <input style={smallInputStyle} value={w.distilledYear || ""} onChange={(e) => updateWhisky(idx, "distilledYear", e.target.value || null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>{t("whisky.price")}</label>
                                  <input style={smallInputStyle} type="number" step="0.01" value={w.price ?? ""} onChange={(e) => updateWhisky(idx, "price", e.target.value ? parseFloat(e.target.value) : null)} />
                                </div>
                                <div>
                                  <label style={smallLabelStyle}>WB Score</label>
                                  <input style={smallInputStyle} type="number" step="0.1" value={w.wbScore ?? ""} onChange={(e) => updateWhisky(idx, "wbScore", e.target.value ? parseFloat(e.target.value) : null)} />
                                </div>
                              </div>
                              {w.whiskybaseId && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <label style={smallLabelStyle}>Whiskybase</label>
                                  <a href={`https://www.whiskybase.com/whiskies/whisky/${w.whiskybaseId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: c.accent, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    #{w.whiskybaseId} <ExternalLink size={12} />
                                  </a>
                                </div>
                              )}
                              {w.hostSummary && (
                                <div>
                                  <label style={smallLabelStyle}>{t("whisky.hostSummary")}</label>
                                  <textarea style={{ ...smallInputStyle, minHeight: 60, resize: "none" as const, height: "auto" }} value={w.hostSummary} onChange={(e) => updateWhisky(idx, "hostSummary", e.target.value || null)} />
                                </div>
                              )}
                              {includeRatings && (
                                <div style={{ borderTop: `1px solid ${c.border}20`, paddingTop: 8, marginTop: 4 }}>
                                  <label style={{ ...smallLabelStyle, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                                    <Star size={10} color={c.accent} />
                                    {t("aiImport.myRatings")}
                                  </label>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                                    <div>
                                      <label style={smallLabelStyle}>{t("aiImport.ratingOverall")}</label>
                                      <input
                                        style={{ ...smallInputStyle, borderColor: w.personalRating?.overall != null ? c.success : undefined }}
                                        type="number" min="0" max="100" step="1"
                                        value={w.personalRating?.overall ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseFloat(e.target.value) : null;
                                          updateWhisky(idx, "personalRating", { ...w.personalRating, overall: val });
                                        }}
                                        data-testid={`input-rating-overall-${idx}`}
                                      />
                                    </div>
                                    <div>
                                      <label style={smallLabelStyle}>{t("aiImport.ratingNose")}</label>
                                      <input
                                        style={smallInputStyle}
                                        type="number" min="0" max="100" step="1"
                                        value={w.personalRating?.nose ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseFloat(e.target.value) : null;
                                          updateWhisky(idx, "personalRating", { ...w.personalRating, nose: val });
                                        }}
                                        data-testid={`input-rating-nose-${idx}`}
                                      />
                                    </div>
                                    <div>
                                      <label style={smallLabelStyle}>{t("aiImport.ratingTaste")}</label>
                                      <input
                                        style={smallInputStyle}
                                        type="number" min="0" max="100" step="1"
                                        value={w.personalRating?.taste ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseFloat(e.target.value) : null;
                                          updateWhisky(idx, "personalRating", { ...w.personalRating, taste: val });
                                        }}
                                        data-testid={`input-rating-taste-${idx}`}
                                      />
                                    </div>
                                    <div>
                                      <label style={smallLabelStyle}>{t("aiImport.ratingFinish")}</label>
                                      <input
                                        style={smallInputStyle}
                                        type="number" min="0" max="100" step="1"
                                        value={w.personalRating?.finish ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseFloat(e.target.value) : null;
                                          updateWhisky(idx, "personalRating", { ...w.personalRating, finish: val });
                                        }}
                                        data-testid={`input-rating-finish-${idx}`}
                                      />
                                    </div>
                                  </div>
                                  <div style={{ marginTop: 6 }}>
                                    <label style={smallLabelStyle}>{t("aiImport.ratingNotes")}</label>
                                    <input
                                      style={smallInputStyle}
                                      value={w.personalRating?.notes || ""}
                                      onChange={(e) => {
                                        updateWhisky(idx, "personalRating", { ...w.personalRating, notes: e.target.value || null });
                                      }}
                                      placeholder={t("aiImport.ratingNotesPlaceholder")}
                                      data-testid={`input-rating-notes-${idx}`}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              {!currentParticipant && (
                <div style={{ padding: 16, background: `${c.border}50`, border: `1px solid ${c.border}80`, borderRadius: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: 0 }}>{t("aiImport.guestIdentify")}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t("aiImport.guestName")}</label>
                      <input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={t("aiImport.guestNamePlaceholder")}
                        style={inputStyle}
                        data-testid="input-guest-name"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("aiImport.guestPin")}</label>
                      <input
                        value={guestPin}
                        onChange={(e) => setGuestPin(e.target.value)}
                        placeholder={t("aiImport.guestPinPlaceholder")}
                        type="password"
                        style={inputStyle}
                        data-testid="input-guest-pin"
                      />
                    </div>
                  </div>
                </div>
              )}

              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={importConsent}
                  onChange={(e) => setImportConsent(e.target.checked)}
                  style={{ marginTop: 3, accentColor: c.accent }}
                  data-testid="checkbox-import-privacy"
                />
                <span style={{ fontSize: 10, color: `${c.muted}99`, lineHeight: 1.4 }}>
                  {t('login.privacyConsentLabel')}{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: c.accent, textDecoration: "underline" }}>{t('login.privacyConsentLink')}</a>
                </span>
              </label>

              {error && (
                <div style={{ padding: 12, background: `${c.error}15`, border: `1px solid ${c.error}40`, borderRadius: 8, fontSize: 14, color: c.error }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button style={btnOutline} onClick={() => { setStep("upload"); setResult(null); }} data-testid="button-import-back">
                  {t("aiImport.back")}
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || editingWhiskies.length === 0 || (!currentParticipant && (!guestName.trim() || !importConsent))}
                  style={{
                    ...btnPrimary,
                    flex: 1,
                    width: "auto",
                    opacity: (createMutation.isPending || editingWhiskies.length === 0 || (!currentParticipant && (!guestName.trim() || !importConsent))) ? 0.5 : 1,
                  }}
                  data-testid="button-import-create"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      {t("aiImport.creating")}
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {t("aiImport.createTasting")}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
