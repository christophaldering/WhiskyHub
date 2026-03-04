import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { Camera, Upload, Loader2, Check, AlertTriangle, X, Wine, Plus, Trash2, Edit2, CheckCircle2, Database, ArrowRight, ExternalLink, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAIStatus } from "@/hooks/use-ai-status";
import { useQuery } from "@tanstack/react-query";
import { tastingApi, photoTastingApi } from "@/lib/api";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle, inputStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";

type IdentifiedWhisky = {
  name: string;
  distillery?: string | null;
  region?: string | null;
  country?: string | null;
  age?: string | null;
  abv?: number | null;
  type?: string | null;
  category?: string | null;
  caskInfluence?: string | null;
  peatLevel?: string | null;
  notes?: string | null;
  confidence?: string;
  dbMatch?: boolean;
  benchmarkMatch?: boolean;
  collectionMatch?: boolean;
  whiskybaseSearch?: string | null;
  whiskybaseUrl?: string | null;
  imageUrl?: string | null;
  fileName?: string;
  selected: boolean;
  editing: boolean;
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: c.muted,
  marginBottom: 6,
  display: "block",
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
  fontFamily: "system-ui, sans-serif",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "center",
  transition: "opacity 0.2s",
};

const btnOutline: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${c.border}`,
  color: c.text,
  borderRadius: 10,
  fontWeight: 600,
  padding: "10px 16px",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "opacity 0.2s",
};

const btnSmPrimary: React.CSSProperties = {
  ...btnPrimary,
  padding: "8px 14px",
  fontSize: 13,
};

const btnSmOutline: React.CSSProperties = {
  ...btnOutline,
  padding: "8px 14px",
  fontSize: 13,
};

const editInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 8,
};

export default function PhotoTasting() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const isHost = currentParticipant && allTastings.some((t: any) => t.hostId === currentParticipant.id);
  const isAdmin = currentParticipant?.role === "admin";
  const hasAccess = isHost || isAdmin;

  const { masterDisabled: aiDisabled } = useAIStatus();

  const [step, setStep] = useState<"upload" | "review" | "details" | "done">("upload");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [whiskies, setWhiskies] = useState<IdentifiedWhisky[]>([]);
  const [creating, setCreating] = useState(false);

  const [tastingTitle, setTastingTitle] = useState("");
  const [tastingDate, setTastingDate] = useState(new Date().toISOString().split("T")[0]);
  const [tastingLocation, setTastingLocation] = useState("");

  const hasUnsavedData = photos.length > 0 || whiskies.length > 0 || tastingTitle.trim().length > 0;
  useUnsavedChanges(hasUnsavedData && step !== "done");

  const handlePhotosSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const validFiles = files.filter(f => {
      if (!allowed.includes(f.type)) {
        toast({ title: t("common.uploadInvalidType"), variant: "destructive" });
        return false;
      }
      if (f.size > 2 * 1024 * 1024) {
        toast({ title: t("common.uploadTooLarge"), variant: "destructive" });
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;
    setPhotos(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, [toast, t]);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (photos.length === 0 || !currentParticipant) return;
    setAnalyzing(true);
    setError("");
    try {
      const result = await photoTastingApi.identify(photos, currentParticipant.id);
      const identified = (result.whiskies || []).map((w: any) => ({
        ...w,
        selected: true,
        editing: false,
      }));
      setWhiskies(identified);
      if (identified.length === 0) {
        setError(t("photoTasting.noResults"));
      } else {
        setStep("review");
      }
    } catch (err: any) {
      setError(err.message || t("photoTasting.analysisFailed"));
    } finally {
      setAnalyzing(false);
    }
  }, [photos, currentParticipant, t]);

  const toggleWhisky = (idx: number) => {
    setWhiskies(prev => prev.map((w, i) => i === idx ? { ...w, selected: !w.selected } : w));
  };

  const toggleEdit = (idx: number) => {
    setWhiskies(prev => prev.map((w, i) => i === idx ? { ...w, editing: !w.editing } : w));
  };

  const updateWhisky = (idx: number, field: string, value: string) => {
    setWhiskies(prev => prev.map((w, i) => {
      if (i !== idx) return w;
      if (field === "abv") return { ...w, abv: value ? parseFloat(value) : null };
      return { ...w, [field]: value || null };
    }));
  };

  const removeWhisky = (idx: number) => {
    setWhiskies(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateTasting = useCallback(async () => {
    if (!currentParticipant) return;
    const selected = whiskies.filter(w => w.selected);
    if (selected.length === 0) return;
    if (!tastingTitle.trim()) {
      setError(t("photoTasting.titleRequired"));
      return;
    }
    setCreating(true);
    setError("");
    try {
      const result = await photoTastingApi.createTasting({
        participantId: currentParticipant.id,
        title: tastingTitle,
        date: tastingDate,
        location: tastingLocation,
        coverPhoto: photos.length > 0 ? photos[0] : undefined,
        whiskies: selected.map(w => ({
          name: w.name,
          distillery: w.distillery,
          age: w.age,
          abv: w.abv,
          type: w.type,
          country: w.country,
          category: w.category,
          region: w.region,
          caskInfluence: w.caskInfluence,
          peatLevel: w.peatLevel,
          notes: w.notes,
          imageUrl: w.imageUrl,
        })),
      });
      toast({
        title: t("photoTasting.created"),
        description: t("photoTasting.createdDesc", { count: selected.length }),
      });
      setStep("done");
      setTimeout(() => navigate(`/tasting/${result.tasting.id}`), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create tasting");
    } finally {
      setCreating(false);
    }
  }, [currentParticipant, whiskies, tastingTitle, tastingDate, tastingLocation, t, toast, navigate]);

  if (!currentParticipant) {
    return (
      <SimpleShell>
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <p style={{ color: c.muted, fontSize: 14 }}>{t("photoTasting.loginRequired")}</p>
        </div>
      </SimpleShell>
    );
  }
  if (!hasAccess) {
    return (
      <SimpleShell>
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <p style={{ color: c.muted, fontSize: 14 }}>{t("photoTasting.accessDenied")}</p>
        </div>
      </SimpleShell>
    );
  }

  const selectedCount = whiskies.filter(w => w.selected).length;

  const confidenceIcon = (conf?: string) => {
    if (conf === "high") return <CheckCircle2 style={{ width: 16, height: 16, color: c.success }} />;
    if (conf === "medium") return <AlertTriangle style={{ width: 16, height: 16, color: c.accent }} />;
    return <AlertTriangle style={{ width: 16, height: 16, color: c.error }} />;
  };

  const stepsList = ["upload", "review", "details"] as const;
  const currentStepIdx = stepsList.indexOf(step as any);

  return (
    <SimpleShell maxWidth={800}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24, minWidth: 0, overflowX: "hidden" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 style={pageTitleStyle} data-testid="text-photo-tasting-title">
            {t("photoTasting.title")}
          </h1>
          <p style={pageSubtitleStyle}>{t("photoTasting.subtitle")}</p>
          <p style={{ fontSize: 10, color: `${c.muted}80`, marginTop: 4 }} data-testid="text-ai-notice-photo">{t("legal.aiNotice")}</p>
          <div style={{ width: 48, height: 4, background: `${c.accent}80`, marginTop: 12, borderRadius: 2 }} />
        </motion.div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {stepsList.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {i > 0 && <ArrowRight style={{ width: 16, height: 16, color: `${c.muted}50` }} />}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                transition: "all 0.2s",
                ...(step === s
                  ? { background: c.accent, color: c.bg }
                  : currentStepIdx > i
                    ? { background: `${c.success}30`, color: c.success }
                    : { background: c.border, color: c.muted }
                ),
              }}>
                {currentStepIdx > i ? <Check style={{ width: 12, height: 12 }} /> : <span>{i + 1}</span>}
                <span>{t(`photoTasting.step.${s}`)}</span>
              </div>
            </div>
          ))}
        </div>

        {aiDisabled && (
          <div style={{
            background: `${c.accent}15`,
            border: `1px solid ${c.accent}40`,
            borderRadius: 10,
            padding: 12,
            fontSize: 13,
            color: c.accent,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
            {t("admin.aiDisabledHint")}
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: `${c.error}15`,
              border: `1px solid ${c.error}40`,
              borderRadius: 10,
              padding: 16,
              color: c.error,
              fontSize: 13,
            }}
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{
                    padding: 12,
                    background: `${c.accent}15`,
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}>
                    <Camera style={{ width: 24, height: 24, color: c.accent }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{
                      fontSize: 20,
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 700,
                      color: c.text,
                      margin: 0,
                    }}>{t("photoTasting.uploadTitle")}</h2>
                    <p style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>{t("photoTasting.uploadDesc")}</p>
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: 12,
                }}>
                  {previews.map((preview, idx) => (
                    <div key={idx} style={{
                      position: "relative",
                      aspectRatio: "3/4",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: `1px solid ${c.border}50`,
                    }}>
                      <img src={preview} alt={photos[idx]?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        onClick={() => removePhoto(idx)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          padding: 4,
                          background: "rgba(0,0,0,0.6)",
                          borderRadius: "50%",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        data-testid={`remove-photo-${idx}`}
                      >
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "rgba(0,0,0,0.5)",
                        padding: "2px 8px",
                      }}>
                        <span style={{ fontSize: 10, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{photos[idx]?.name}</span>
                      </div>
                    </div>
                  ))}

                  <label
                    style={{
                      aspectRatio: "3/4",
                      borderRadius: 10,
                      border: `2px dashed ${c.accent}50`,
                      background: `${c.accent}08`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    data-testid="add-photos-button"
                  >
                    <Plus style={{ width: 32, height: 32, color: `${c.accent}80` }} />
                    <span style={{ fontSize: 12, color: `${c.accent}99`, fontWeight: 500 }}>{t("photoTasting.addPhotos")}</span>
                    <span style={{ fontSize: 9, color: `${c.muted}80`, marginTop: 2 }}>{t("common.uploadHint")}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      style={{ display: "none" }}
                      onChange={handlePhotosSelected}
                      data-testid="photo-input"
                    />
                  </label>
                </div>

                {photos.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: c.muted }}>
                      {t("photoTasting.photosSelected", { count: photos.length })}
                    </span>
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing || aiDisabled}
                      style={{
                        ...btnPrimary,
                        opacity: (analyzing || aiDisabled) ? 0.5 : 1,
                        cursor: (analyzing || aiDisabled) ? "not-allowed" : "pointer",
                      }}
                      data-testid="button-analyze"
                      title={aiDisabled ? t("admin.aiDisabledHint") : undefined}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                          {t("photoTasting.identifying")}
                        </>
                      ) : (
                        <>
                          <Upload style={{ width: 16, height: 16 }} />
                          {t("photoTasting.identifyBottles")}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <h2 style={{
                  fontSize: 18,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  color: c.text,
                  margin: 0,
                }}>
                  {t("photoTasting.identifiedWhiskies")} ({whiskies.length})
                </h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={btnSmOutline} onClick={() => setStep("upload")} data-testid="button-back-upload">
                    {t("photoTasting.backToPhotos")}
                  </button>
                  <button
                    style={{
                      ...btnSmPrimary,
                      opacity: selectedCount === 0 ? 0.5 : 1,
                      cursor: selectedCount === 0 ? "not-allowed" : "pointer",
                    }}
                    onClick={() => setStep("details")}
                    disabled={selectedCount === 0}
                    data-testid="button-next-details"
                  >
                    {t("photoTasting.next")} ({selectedCount})
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>

              {whiskies.map((w, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    ...cardStyle,
                    borderColor: w.selected ? `${c.accent}50` : `${c.border}30`,
                    opacity: w.selected ? 1 : 0.5,
                    transition: "all 0.2s",
                  }}
                  data-testid={`whisky-card-${idx}`}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <button
                      onClick={() => toggleWhisky(idx)}
                      style={{
                        marginTop: 4,
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: w.selected ? "none" : `1px solid ${c.muted}60`,
                        background: w.selected ? c.accent : "transparent",
                        color: w.selected ? c.bg : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        padding: 0,
                      }}
                      data-testid={`toggle-whisky-${idx}`}
                    >
                      {w.selected && <Check style={{ width: 12, height: 12 }} />}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: c.text }}>{w.name}</span>
                        {confidenceIcon(w.confidence)}
                        {w.dbMatch && (
                          <span style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: `${c.success}20`,
                            color: c.success,
                            fontWeight: 500,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}>
                            <Database style={{ width: 12, height: 12 }} />
                            {t("photoTasting.dbMatch")}
                          </span>
                        )}
                        {w.benchmarkMatch && (
                          <span style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: `${c.accent}20`,
                            color: c.accent,
                            fontWeight: 500,
                          }}>
                            {t("photoTasting.benchmarkMatch")}
                          </span>
                        )}
                        {!w.dbMatch && !w.benchmarkMatch && (
                          w.whiskybaseUrl ? (
                            <a
                              href={w.whiskybaseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: `${c.accent}20`,
                                color: c.accent,
                                fontWeight: 500,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                textDecoration: "none",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Whiskybase <ExternalLink style={{ width: 10, height: 10 }} />
                            </a>
                          ) : w.whiskybaseSearch ? (
                            <a
                              href={`https://www.whiskybase.com/search?q=${encodeURIComponent(w.whiskybaseSearch)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: `${c.accent}20`,
                                color: c.accent,
                                fontWeight: 500,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                textDecoration: "none",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Search style={{ width: 10, height: 10 }} />
                              {t("photoTasting.searchWhiskybase")}
                            </a>
                          ) : null
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: c.muted, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "0px 12px" }}>
                        {w.distillery && <span>{w.distillery}</span>}
                        {w.region && <span>{w.region}</span>}
                        {w.country && <span>{w.country}</span>}
                        {w.age && <span>{w.age} yo</span>}
                        {w.abv && <span>{w.abv}%</span>}
                        {w.category && <span>{w.category}</span>}
                        {w.caskInfluence && <span>{w.caskInfluence}</span>}
                        {w.peatLevel && <span>Peat: {w.peatLevel}</span>}
                      </div>
                      {w.notes && <p style={{ fontSize: 12, color: `${c.muted}b0`, marginTop: 4, fontStyle: "italic", margin: "4px 0 0" }}>{w.notes}</p>}

                      {w.editing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
                        >
                          {[
                            { key: "name", label: t("photoTasting.field.name") },
                            { key: "distillery", label: t("photoTasting.field.distillery") },
                            { key: "region", label: t("photoTasting.field.region") },
                            { key: "country", label: t("photoTasting.field.country") },
                            { key: "age", label: t("photoTasting.field.age") },
                            { key: "abv", label: t("photoTasting.field.abv") },
                            { key: "category", label: t("photoTasting.field.category") },
                            { key: "caskInfluence", label: t("photoTasting.field.cask") },
                            { key: "peatLevel", label: t("photoTasting.field.peat") },
                            { key: "type", label: t("photoTasting.field.type") },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>{label}</label>
                              <input
                                value={(w as any)[key] ?? ""}
                                onChange={e => updateWhisky(idx, key, e.target.value)}
                                style={editInputStyle}
                                data-testid={`edit-${key}-${idx}`}
                              />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleEdit(idx)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          background: "transparent",
                          border: "none",
                          color: c.muted,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "color 0.15s",
                        }}
                        data-testid={`edit-whisky-${idx}`}
                      >
                        <Edit2 style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        onClick={() => removeWhisky(idx)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          background: "transparent",
                          border: "none",
                          color: c.muted,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "color 0.15s",
                        }}
                        data-testid={`delete-whisky-${idx}`}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {step === "details" && (
            <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{
                    padding: 12,
                    background: `${c.accent}15`,
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}>
                    <Wine style={{ width: 24, height: 24, color: c.accent }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{
                      fontSize: 20,
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 700,
                      color: c.text,
                      margin: 0,
                    }}>{t("photoTasting.tastingDetails")}</h2>
                    <p style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>{t("photoTasting.tastingDetailsDesc")}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>{t("photoTasting.field.tastingTitle")} *</label>
                    <input
                      value={tastingTitle}
                      onChange={e => setTastingTitle(e.target.value)}
                      placeholder={t("photoTasting.titlePlaceholder")}
                      style={inputStyle}
                      data-testid="input-tasting-title"
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={labelStyle}>{t("photoTasting.field.date")}</label>
                      <input
                        type="date"
                        value={tastingDate}
                        onChange={e => setTastingDate(e.target.value)}
                        style={inputStyle}
                        data-testid="input-tasting-date"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("photoTasting.field.location")}</label>
                      <input
                        value={tastingLocation}
                        onChange={e => setTastingLocation(e.target.value)}
                        placeholder={t("photoTasting.locationPlaceholder")}
                        style={inputStyle}
                        data-testid="input-tasting-location"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${c.border}30`, paddingTop: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: c.muted, marginBottom: 8 }}>
                    {t("photoTasting.lineup")} ({selectedCount})
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {whiskies.filter(w => w.selected).map((w, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }}>
                        <Wine style={{ width: 16, height: 16, color: `${c.accent}99`, flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: c.text }}>{w.name}</span>
                        {w.distillery && <span style={{ color: c.muted }}>({w.distillery})</span>}
                        {w.age && <span style={{ color: c.muted }}>{w.age}yo</span>}
                        {w.abv && <span style={{ color: c.muted }}>{w.abv}%</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
                  <button style={btnOutline} onClick={() => setStep("review")} data-testid="button-back-review">
                    {t("photoTasting.back")}
                  </button>
                  <button
                    onClick={handleCreateTasting}
                    disabled={creating || !tastingTitle.trim()}
                    style={{
                      ...btnPrimary,
                      opacity: (creating || !tastingTitle.trim()) ? 0.5 : 1,
                      cursor: (creating || !tastingTitle.trim()) ? "not-allowed" : "pointer",
                    }}
                    data-testid="button-create-tasting"
                  >
                    {creating ? (
                      <>
                        <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                        {t("photoTasting.creating")}
                      </>
                    ) : (
                      <>
                        <Wine style={{ width: 16, height: 16 }} />
                        {t("photoTasting.createTasting")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "64px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{
                display: "inline-flex",
                padding: 16,
                background: `${c.success}20`,
                borderRadius: "50%",
              }}>
                <CheckCircle2 style={{ width: 48, height: 48, color: c.success }} />
              </div>
              <h2 style={{
                fontSize: 24,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700,
                color: c.text,
                margin: 0,
              }}>{t("photoTasting.created")}</h2>
              <p style={{ color: c.muted, fontSize: 14 }}>{t("photoTasting.redirecting")}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SimpleShell>
  );
}
