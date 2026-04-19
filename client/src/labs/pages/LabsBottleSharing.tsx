import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { tastingApi, whiskyApi } from "@/lib/api";
import {
  Share2, Plus, Users, ChevronRight, ChevronLeft, Eye, EyeOff, Lock, Globe,
  UsersRound, Trash2, Sparkles, Wand2, Edit3, Upload, Loader2, ChevronDown,
  ChevronUp, FileSpreadsheet, Image, MessageSquare, Wine, Check, X, BarChart3
} from "lucide-react";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { useIsEmbeddedInTastings } from "@/labs/embeddedTastingsContext";
import { friendsApi } from "@/lib/api";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import WhiskyImageUpload from "@/components/WhiskyImageUpload";

type WizardStep = "bottles" | "visibility" | "review";
type Visibility = "public" | "private" | "group";
type Format = "blind" | "open";
type BottleInputMode = "manual" | "ai-import" | "curation";

interface BottleEntry {
  name: string;
  distillery?: string;
  age?: string;
  abv?: number | null;
  region?: string;
  caskType?: string;
  category?: string;
  country?: string;
  whiskybaseId?: string;
  bottler?: string;
  distilledYear?: string;
  peatLevel?: string;
  ppm?: number | null;
  wbScore?: number | null;
  price?: number | null;
  hostNotes?: string;
  hostSummary?: string;
  imageUrl?: string;
  imageFile?: File;
}

const REGION_KEYS = ["islay", "speyside", "highland", "lowland", "campbeltown", "islands", "ireland", "japan", "usa", "world"] as const;
const STYLE_KEYS = ["heavilyPeated", "lightlyPeated", "unpeated", "sherried", "bourbonCask", "wineCask", "exoticCask", "caskStrength", "singleCask"] as const;

const STYLE_API_MAP: Record<string, string> = {
  heavilyPeated: "peated", lightlyPeated: "peated", unpeated: "unpeated",
  sherried: "sherried", bourbonCask: "bourbon", wineCask: "wine",
  exoticCask: "exotic", caskStrength: "caskStrength", singleCask: "singleCask",
};

export default function LabsBottleSharing() {
  const { currentParticipant, openAuthDialog } = useAppStore();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const goBackToHome = useBackNavigation("/labs/tastings");
  const isEmbedded = useIsEmbeddedInTastings();

  const [publicSharings, setPublicSharings] = useState<any[]>([]);
  const [mySharings, setMySharings] = useState<any[]>([]);
  const [showWizard, setShowWizard] = useState(isEmbedded);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<WizardStep>("bottles");
  const [title, setTitle] = useState("");
  const [bottles, setBottles] = useState<BottleEntry[]>([{ name: "" }]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [format, setFormat] = useState<Format>("open");
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const [bottleInputMode, setBottleInputMode] = useState<BottleInputMode>("manual");
  const [expandedBottle, setExpandedBottle] = useState<number | null>(null);

  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiPastedText, setAiPastedText] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [curationSource, setCurationSource] = useState<"world" | "collection">("world");
  const [curationRegions, setCurationRegions] = useState<string[]>([]);
  const [curationStyles, setCurationStyles] = useState<string[]>([]);
  const [curationFlightSize, setCurationFlightSize] = useState("6");

  const pid = currentParticipant?.id || "";

  useEffect(() => {
    if (!pid) { setLoading(false); return; }
    Promise.all([
      fetch("/api/bottle-sharings/public").then(r => r.ok ? r.json() : []),
      fetch("/api/bottle-sharings/mine", { headers: { "x-participant-id": pid } }).then(r => r.ok ? r.json() : []),
    ]).then(([pub, mine]) => { setPublicSharings(pub); setMySharings(mine); }).catch(() => {}).finally(() => setLoading(false));

    friendsApi.getAll(pid).then(setFriends).catch(() => {});
    fetch("/api/communities/mine", { headers: { "x-participant-id": pid } })
      .then(r => r.ok ? r.json() : []).then(setCommunities).catch(() => {});
  }, [pid]);

  if (!currentParticipant) {
    return (
      <div className="labs-page labs-fade-in">
        {!isEmbedded && (
          <button
            onClick={goBackToHome}
            className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
            style={{ color: "var(--labs-text-muted)" }}
            data-testid="labs-sharing-preview-back"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("common.back", "Back")}
          </button>
        )}

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Share2 className="w-10 h-10" style={{ color: "var(--labs-accent)", marginBottom: 12 }} />
          <h1 className="labs-serif" style={{ fontSize: 22, color: "var(--labs-text)", marginBottom: 6 }} data-testid="text-preview-sharing-title">
            {t("authGate.preview.sharingWelcome", "Bottle-Sharing")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", maxWidth: 380, margin: "0 auto" }}>
            {t("authGate.preview.sharingSubtitle", "Organize joint tastings of special bottles.")}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32, paddingLeft: 4, paddingRight: 4 }}>
          {[
            { icon: <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />, titleKey: "sharingFeature1Title", descKey: "sharingFeature1Desc", titleFb: "Organize joint tastings of special bottles", descFb: "Bring together rare and special bottles for a shared tasting experience." },
            { icon: <Users className="w-4 h-4" style={{ color: "var(--labs-success, #4ade80)" }} />, titleKey: "sharingFeature2Title", descKey: "sharingFeature2Desc", titleFb: "Share experiences with your circle", descFb: "Invite friends and enjoy unique whiskies together." },
            { icon: <BarChart3 className="w-4 h-4" style={{ color: "var(--labs-info, #60a5fa)" }} />, titleKey: "sharingFeature3Title", descKey: "sharingFeature3Desc", titleFb: "Manage participants and ratings", descFb: "Keep track of who's joining and compare everyone's scores." },
          ].map((feat, i) => (
            <div
              key={i}
              className={`labs-fade-in labs-stagger-${i + 1}`}
              style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              data-testid={`card-sharing-feature-${i}`}
            >
              <div style={{ flexShrink: 0, marginTop: 1, opacity: 0.85 }}>{feat.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 2 }}>
                  {t(`authGate.preview.${feat.titleKey}`, feat.titleFb)}
                </div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                  {t(`authGate.preview.${feat.descKey}`, feat.descFb)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "24px 20px", borderRadius: 16, background: "linear-gradient(135deg, var(--labs-surface), var(--labs-bg))", border: "1px solid var(--labs-border)" }}>
          <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", marginBottom: 16 }}>
            {t("authGate.preview.sharingCta", "Create a free profile to organize your first sharing")}
          </p>
          <button
            onClick={() => openAuthDialog("register")}
            className="labs-btn-primary"
            style={{ padding: "12px 32px", fontSize: 15, fontWeight: 600, width: "100%", maxWidth: 280 }}
            data-testid="button-preview-sharing-profile"
          >
            {t("authGate.preview.profileCta", "Create profile")}
          </button>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 12 }}>
            {t("authGate.preview.alreadyHaveAccount", "Already have a profile?")}{" "}
            <button
              onClick={() => openAuthDialog("signin")}
              style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}
              data-testid="button-preview-sharing-signin"
            >
              {t("authGate.preview.signInLink", "Sign in here")}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const validBottles = bottles.filter(b => b.name.trim());
  const friendsWithEmail = friends.filter((f: any) => f.email && f.status === "accepted");
  const steps: WizardStep[] = ["bottles", "visibility", "review"];
  const stepIdx = steps.indexOf(step);
  const canProceed = step === "bottles" ? validBottles.length > 0 :
    step === "visibility" && visibility === "group" ? selectedCommunityIds.size > 0 : true;

  const addBottle = () => setBottles([...bottles, { name: "" }]);
  const removeBottle = (i: number) => {
    if (bottles[i].imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(bottles[i].imageUrl!);
    }
    setBottles(bottles.filter((_, idx) => idx !== i));
  };
  const updateBottle = (i: number, field: keyof BottleEntry, val: any) => {
    const u = [...bottles]; u[i] = { ...u[i], [field]: val }; setBottles(u);
  };
  const toggleFriend = (id: string) => setSelectedFriendIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCommunity = (id: string) => setSelectedCommunityIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCreate = async () => {
    if (validBottles.length === 0) return;
    setCreating(true);
    try {
      const sharingTitle = title.trim() || `Bottle-Sharing (${validBottles.length} ${t("bottleSharing.bottles")})`;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const res = await fetch("/api/tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({
          title: sharingTitle, date: new Date().toISOString().split("T")[0], location: "Bottle-Sharing",
          hostId: pid, code, status: "draft", blindMode: format === "blind", tastingType: "bottle-sharing",
          visibility, sharingMessage: message || null,
          targetCommunityIds: selectedCommunityIds.size > 0 ? JSON.stringify(Array.from(selectedCommunityIds)) : null,
          invitedFriendIds: selectedFriendIds.size > 0 ? Array.from(selectedFriendIds) : undefined,
          ratingScale: 100,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const tasting = await res.json();
      for (let i = 0; i < validBottles.length; i++) {
        const b = validBottles[i];
        const whiskyRes = await fetch("/api/whiskies", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-participant-id": pid },
          body: JSON.stringify({
            tastingId: tasting.id,
            name: b.name,
            distillery: b.distillery || undefined,
            age: b.age || undefined,
            abv: b.abv ?? undefined,
            region: b.region || undefined,
            caskType: b.caskType || undefined,
            category: b.category || undefined,
            country: b.country || undefined,
            whiskybaseId: b.whiskybaseId || undefined,
            bottler: b.bottler || undefined,
            distilledYear: b.distilledYear || undefined,
            peatLevel: b.peatLevel || undefined,
            ppm: b.ppm ?? undefined,
            wbScore: b.wbScore ?? undefined,
            price: b.price ?? undefined,
            hostNotes: b.hostNotes || undefined,
            hostSummary: b.hostSummary || undefined,
            sortOrder: i,
          }),
        });
        if (whiskyRes.ok && b.imageFile) {
          try {
            const whisky = await whiskyRes.json();
            await whiskyApi.uploadImage(whisky.id, b.imageFile);
          } catch (imgErr) {
            console.error("Failed to upload image for bottle:", b.name, imgErr);
          }
        }
      }
      navigate(`/labs/bottle-sharing/${tasting.id}`);
    } catch (e) {
      console.error("Failed to create bottle sharing:", e);
    } finally { setCreating(false); }
  };

  const handleAiAnalyze = async () => {
    if (aiFiles.length === 0 && !aiPastedText.trim()) return;
    setAiAnalyzing(true);
    setAiError(null);
    try {
      const result = await tastingApi.aiImport(aiFiles, aiPastedText, pid);
      const imported: BottleEntry[] = (result.whiskies || []).map((w: any) => ({
        name: w.name || "",
        distillery: w.distillery || undefined,
        age: w.age || undefined,
        abv: w.abv ?? null,
        region: w.region || undefined,
        caskType: w.caskType || undefined,
        category: w.category || undefined,
        country: w.country || undefined,
        whiskybaseId: w.whiskybaseId || undefined,
        bottler: w.bottler || undefined,
        distilledYear: w.distilledYear || undefined,
        peatLevel: w.peatLevel || undefined,
        ppm: w.ppm ?? null,
        wbScore: w.wbScore ?? null,
        price: w.price ?? null,
        hostNotes: w.hostNotes || undefined,
        hostSummary: w.hostSummary || undefined,
      }));
      if (imported.length > 0) {
        const existingValid = bottles.filter(b => b.name.trim());
        setBottles([...existingValid, ...imported]);
      }
      setAiFiles([]);
      setAiPastedText("");
      setBottleInputMode("manual");
    } catch (e: any) {
      setAiError(e.message || "Import failed");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setAiFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAiFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  }, []);

  const addCurationWhisky = (w: any) => {
    const entry: BottleEntry = {
      name: w.name || "",
      distillery: w.distillery || undefined,
      age: w.age || undefined,
      abv: w.abv ? (typeof w.abv === "number" ? w.abv : parseFloat(w.abv)) : null,
      region: w.region || undefined,
      caskType: w.caskType || undefined,
      category: w.category || undefined,
      country: w.country || undefined,
      peatLevel: w.peatLevel || undefined,
      whiskybaseId: w.whiskybaseId || undefined,
      bottler: w.bottler || undefined,
      distilledYear: w.distilledYear || (w as any).vintage || undefined,
      wbScore: w.wbScore ? (typeof w.wbScore === "number" ? w.wbScore : parseFloat(w.wbScore)) : null,
      price: w.price ? (typeof w.price === "number" ? w.price : parseFloat(w.price)) : null,
    };
    const existingValid = bottles.filter(b => b.name.trim());
    setBottles([...existingValid, entry]);
  };

  const regionsParam = curationRegions.join(",");
  const stylesParam = Array.from(new Set(curationStyles.map(s => STYLE_API_MAP[s] || s))).join(",");

  const { data: curationSuggestions, isLoading: curationLoading } = useQuery<any[]>({
    queryKey: ["curation-suggestions-sharing", pid, regionsParam, stylesParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (pid) params.set("participantId", pid);
      if (regionsParam) params.set("regions", regionsParam);
      if (stylesParam) params.set("styles", stylesParam);
      const res = await fetch(`/api/curation/suggestions?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.suggestions || [];
    },
    enabled: bottleInputMode === "curation" && curationSource === "world" && !!pid && (curationRegions.length > 0 || curationStyles.length > 0),
  });

  const { data: collectionSuggestionsData, isLoading: collectionLoading } = useQuery<any>({
    queryKey: ["collection-suggest-sharing", pid, regionsParam, stylesParam, curationFlightSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (regionsParam) params.set("regions", regionsParam);
      if (stylesParam) params.set("styles", stylesParam);
      params.set("theme", "mixed");
      params.set("count", curationFlightSize);
      const res = await fetch(`/api/collection/${pid}/suggest-tasting?${params.toString()}`);
      if (!res.ok) return { suggestions: [] };
      return res.json();
    },
    enabled: bottleInputMode === "curation" && curationSource === "collection" && !!pid,
  });

  const toggleCurationArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const regionLabel = (key: string) => t(`curation.regionOpts.${key}` as any);
  const styleLabel = (key: string) => t(`curation.styleOpts.${key}` as any);

  const isWhiskyAlreadyAdded = (name: string) => bottles.some(b => b.name.trim().toLowerCase() === name.trim().toLowerCase());

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "10px 8px",
    fontSize: 12,
    fontWeight: 600,
    border: "none",
    borderBottom: active ? "2px solid var(--labs-accent)" : "2px solid transparent",
    background: "none",
    color: active ? "var(--labs-accent)" : "var(--labs-text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "all 0.2s",
  });

  if (showWizard) {
    return (
      <div className="labs-page labs-fade-in">
        {!isEmbedded && (
          <button onClick={() => stepIdx > 0 ? setStep(steps[stepIdx - 1]) : setShowWizard(false)} className="labs-btn-ghost" data-testid="button-sharing-back" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: "var(--labs-space-sm)" }}>
            <ChevronLeft className="w-4 h-4" />{t("bottleSharing.back")}
          </button>
        )}
        {!isEmbedded && (
          <>
            <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }} data-testid="text-sharing-title">{t("bottleSharing.title")}</h1>
            <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-lg)" }}>{t("bottleSharing.subtitle")}</p>
          </>
        )}
        <div style={{ display: "flex", gap: 4, marginBottom: "var(--labs-space-lg)" }}>
          {steps.map((s, i) => (<div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= stepIdx ? "var(--labs-accent)" : "var(--labs-border)" }} />))}
        </div>

        {step === "bottles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <div>
              <label className="labs-label">Sharing-Name</label>
              <input data-testid="input-sharing-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Highland Selection" className="labs-input" />
            </div>

            <label className="labs-label">{t("bottleSharing.selectBottles")}</label>

            <div style={{ display: "flex", borderBottom: "1px solid var(--labs-border)" }}>
              <button data-testid="tab-manual" onClick={() => setBottleInputMode("manual")} style={tabStyle(bottleInputMode === "manual")}>
                <Edit3 size={14} /> {t("bottleSharing.manualEntry") || "Manual"}
              </button>
              <button data-testid="tab-ai-import" onClick={() => setBottleInputMode("ai-import")} style={tabStyle(bottleInputMode === "ai-import")}>
                <Sparkles size={14} /> {t("bottleSharing.aiImport") || "AI Import"}
              </button>
              <button data-testid="tab-curation" onClick={() => setBottleInputMode("curation")} style={tabStyle(bottleInputMode === "curation")}>
                <Wand2 size={14} /> {t("bottleSharing.curation") || "Curation"}
              </button>
            </div>

            {bottleInputMode === "manual" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
                {bottles.map((b, i) => (
                  <div key={i} className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span className="labs-label" style={{ color: "var(--labs-accent)" }}>{t("bottleSharing.bottles")} #{i + 1}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setExpandedBottle(expandedBottle === i ? null : i)} data-testid={`button-expand-bottle-${i}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {expandedBottle === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {bottles.length > 1 && (
                          <button onClick={() => removeBottle(i)} data-testid={`button-remove-bottle-${i}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                      <WhiskyImageUpload
                        imageUrl={b.imageUrl}
                        onFileSelected={(file: File) => {
                          const preview = URL.createObjectURL(file);
                          const updated = [...bottles];
                          if (updated[i].imageUrl?.startsWith("blob:")) {
                            URL.revokeObjectURL(updated[i].imageUrl!);
                          }
                          updated[i] = { ...updated[i], imageFile: file, imageUrl: preview };
                          setBottles(updated);
                        }}
                        onImageDeleted={() => {
                          const updated = [...bottles];
                          if (updated[i].imageUrl?.startsWith("blob:")) {
                            URL.revokeObjectURL(updated[i].imageUrl!);
                          }
                          updated[i] = { ...updated[i], imageFile: undefined, imageUrl: undefined };
                          setBottles(updated);
                        }}
                        variant="labs"
                        size="sm"
                        testIdPrefix={`bottle-image-${i}`}
                      />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <input data-testid={`input-bottle-name-${i}`} value={b.name} onChange={e => updateBottle(i, "name", e.target.value)} placeholder="Name *" className="labs-input" />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input data-testid={`input-bottle-distillery-${i}`} value={b.distillery || ""} onChange={e => updateBottle(i, "distillery", e.target.value)} placeholder="Distillery" className="labs-input" />
                      <input data-testid={`input-bottle-region-${i}`} value={b.region || ""} onChange={e => updateBottle(i, "region", e.target.value)} placeholder="Region" className="labs-input" />
                      <input data-testid={`input-bottle-age-${i}`} value={b.age || ""} onChange={e => updateBottle(i, "age", e.target.value)} placeholder="Age" className="labs-input" />
                      <input data-testid={`input-bottle-abv-${i}`} type="number" step="0.1" value={b.abv ?? ""} onChange={e => updateBottle(i, "abv", e.target.value ? parseFloat(e.target.value) : null)} placeholder="ABV %" className="labs-input" />
                      <input data-testid={`input-bottle-cask-${i}`} value={b.caskType || ""} onChange={e => updateBottle(i, "caskType", e.target.value)} placeholder="Cask" className="labs-input" />
                      <input data-testid={`input-bottle-whiskybase-${i}`} value={b.whiskybaseId || ""} onChange={e => updateBottle(i, "whiskybaseId", e.target.value)} placeholder="Whiskybase ID" className="labs-input" />
                    </div>

                    {expandedBottle === i && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--labs-border)" }}>
                        <input data-testid={`input-bottle-category-${i}`} value={b.category || ""} onChange={e => updateBottle(i, "category", e.target.value)} placeholder="Category" className="labs-input" />
                        <input data-testid={`input-bottle-country-${i}`} value={b.country || ""} onChange={e => updateBottle(i, "country", e.target.value)} placeholder="Country" className="labs-input" />
                        <input data-testid={`input-bottle-bottler-${i}`} value={b.bottler || ""} onChange={e => updateBottle(i, "bottler", e.target.value)} placeholder="Bottler" className="labs-input" />
                        <input data-testid={`input-bottle-distilledYear-${i}`} value={b.distilledYear || ""} onChange={e => updateBottle(i, "distilledYear", e.target.value)} placeholder="Vintage" className="labs-input" />
                        <input data-testid={`input-bottle-peat-${i}`} value={b.peatLevel || ""} onChange={e => updateBottle(i, "peatLevel", e.target.value)} placeholder="Peat Level" className="labs-input" />
                        <input data-testid={`input-bottle-ppm-${i}`} type="number" step="1" value={b.ppm ?? ""} onChange={e => updateBottle(i, "ppm", e.target.value ? parseFloat(e.target.value) : null)} placeholder="PPM" className="labs-input" />
                        <input data-testid={`input-bottle-price-${i}`} type="number" step="0.01" value={b.price ?? ""} onChange={e => updateBottle(i, "price", e.target.value ? parseFloat(e.target.value) : null)} placeholder="Price" className="labs-input" />
                        <input data-testid={`input-bottle-wbscore-${i}`} type="number" step="0.1" value={b.wbScore ?? ""} onChange={e => updateBottle(i, "wbScore", e.target.value ? parseFloat(e.target.value) : null)} placeholder="WB Score" className="labs-input" />
                        <textarea data-testid={`input-bottle-hostnotes-${i}`} value={b.hostNotes || ""} onChange={e => updateBottle(i, "hostNotes", e.target.value)} placeholder="Host Notes" className="labs-input" style={{ gridColumn: "1 / -1", resize: "none", minHeight: 48 }} rows={2} />
                        <textarea data-testid={`input-bottle-hostsummary-${i}`} value={b.hostSummary || ""} onChange={e => updateBottle(i, "hostSummary", e.target.value)} placeholder="Host Summary" className="labs-input" style={{ gridColumn: "1 / -1", resize: "none", minHeight: 48 }} rows={2} />
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addBottle} data-testid="button-add-bottle" className="labs-btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Plus size={18} />{t("bottleSharing.selectBottles")}
                </button>
              </div>
            )}

            {bottleInputMode === "ai-import" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-sharing-import"
                  style={{
                    border: "2px dashed var(--labs-border)",
                    background: "var(--labs-bg-subtle, var(--labs-bg))",
                    borderRadius: 12,
                    padding: 24,
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={32} style={{ color: "var(--labs-text-muted)", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: 4 }}>{t("aiImport.dropzoneTitle") || "Drop files here or click to upload"}</p>
                  <p style={{ fontSize: 11, color: "var(--labs-text-faint)" }}>{t("aiImport.dropzoneHint") || "Photos, Excel, PDF, Text"}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.pdf,.txt,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    data-testid="input-sharing-import-files"
                  />
                </div>

                {aiFiles.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {aiFiles.map((file, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--labs-accent-muted)", borderRadius: 8, fontSize: 12 }}>
                        {file.type.startsWith("image/") ? <Image size={14} /> : file.name.match(/\.(xlsx|xls|csv)$/i) ? <FileSpreadsheet size={14} /> : <Upload size={14} />}
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                        <span style={{ color: "var(--labs-text-muted)", fontSize: 11 }}>{(file.size / 1024).toFixed(0)} KB</span>
                        <button onClick={(e) => { e.stopPropagation(); setAiFiles(prev => prev.filter((_, idx) => idx !== i)); }} style={{ background: "none", border: "none", color: "var(--labs-text-muted)", cursor: "pointer", padding: 2 }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <MessageSquare size={14} style={{ color: "var(--labs-text-muted)" }} />
                    <label className="labs-label" style={{ marginBottom: 0 }}>{t("aiImport.pasteLabel") || "Or paste text"}</label>
                  </div>
                  <textarea
                    value={aiPastedText}
                    onChange={(e) => setAiPastedText(e.target.value)}
                    placeholder={t("aiImport.pastePlaceholder") || "Paste whisky list, tasting notes, etc."}
                    rows={4}
                    className="labs-input"
                    style={{ resize: "none" }}
                    data-testid="textarea-sharing-import-text"
                  />
                </div>

                {aiError && (
                  <div style={{ padding: 10, background: "var(--labs-error-muted, #fee)", borderRadius: 8, fontSize: 13, color: "var(--labs-error, #c00)" }}>
                    {aiError}
                  </div>
                )}

                <button
                  onClick={handleAiAnalyze}
                  disabled={aiAnalyzing || (aiFiles.length === 0 && !aiPastedText.trim())}
                  className="labs-btn-primary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (aiAnalyzing || (aiFiles.length === 0 && !aiPastedText.trim())) ? 0.5 : 1 }}
                  data-testid="button-sharing-analyze"
                >
                  {aiAnalyzing ? (
                    <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {t("aiImport.analyzing") || "Analyzing..."}</>
                  ) : (
                    <><Sparkles size={16} /> {t("aiImport.analyze") || "Analyze & Import"}</>
                  )}
                </button>

                {validBottles.length > 0 && (
                  <div style={{ padding: 10, background: "var(--labs-accent-muted)", borderRadius: 8, fontSize: 12, color: "var(--labs-text-muted)" }}>
                    <Check size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    {validBottles.length} {t("bottleSharing.bottles")} {t("bottleSharing.alreadyAdded") || "already in list"}
                  </div>
                )}
              </div>
            )}

            {bottleInputMode === "curation" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    data-testid="btn-curation-source-world"
                    onClick={() => setCurationSource("world")}
                    className={`labs-card ${curationSource === "world" ? "labs-card--active" : ""}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: 12, cursor: "pointer",
                      border: curationSource === "world" ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                      background: curationSource === "world" ? "var(--labs-accent-muted)" : undefined,
                    }}
                  >
                    <Globe size={16} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{t("curation.sourceWorld") || "Community"}</div>
                      <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{t("curation.sourceWorldDesc") || "From community data"}</div>
                    </div>
                  </button>
                  <button
                    data-testid="btn-curation-source-collection"
                    onClick={() => setCurationSource("collection")}
                    className={`labs-card ${curationSource === "collection" ? "labs-card--active" : ""}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: 12, cursor: "pointer",
                      border: curationSource === "collection" ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                      background: curationSource === "collection" ? "var(--labs-accent-muted)" : undefined,
                    }}
                  >
                    <Wine size={16} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{t("curation.sourceCollection") || "My Collection"}</div>
                      <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{t("curation.sourceCollectionDesc") || "From your bottles"}</div>
                    </div>
                  </button>
                </div>

                <div>
                  <label className="labs-label" style={{ fontSize: 11, marginBottom: 6 }}>{t("curation.regions") || "Regions"}</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {REGION_KEYS.map(key => (
                      <button
                        key={key}
                        data-testid={`badge-sharing-region-${key}`}
                        onClick={() => setCurationRegions(prev => toggleCurationArray(prev, key))}
                        style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer",
                          border: curationRegions.includes(key) ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                          background: curationRegions.includes(key) ? "var(--labs-accent)" : "transparent",
                          color: curationRegions.includes(key) ? "var(--labs-bg, #fff)" : "var(--labs-text)",
                        }}
                      >
                        {regionLabel(key)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="labs-label" style={{ fontSize: 11, marginBottom: 6 }}>{t("curation.styles") || "Styles"}</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {STYLE_KEYS.map(key => (
                      <button
                        key={key}
                        data-testid={`badge-sharing-style-${key}`}
                        onClick={() => setCurationStyles(prev => toggleCurationArray(prev, key))}
                        style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer",
                          border: curationStyles.includes(key) ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                          background: curationStyles.includes(key) ? "var(--labs-accent)" : "transparent",
                          color: curationStyles.includes(key) ? "var(--labs-bg, #fff)" : "var(--labs-text)",
                        }}
                      >
                        {styleLabel(key)}
                      </button>
                    ))}
                  </div>
                </div>

                {curationSource === "world" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {curationLoading ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: "var(--labs-text-muted)" }}>
                        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                      </div>
                    ) : (curationRegions.length === 0 && curationStyles.length === 0) ? (
                      <div style={{ textAlign: "center", padding: 16, color: "var(--labs-text-muted)", fontSize: 13 }}>
                        {t("curation.selectFilters") || "Select regions or styles to see suggestions"}
                      </div>
                    ) : !curationSuggestions || curationSuggestions.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 16, color: "var(--labs-text-muted)", fontSize: 13 }}>
                        {t("curation.noSuggestions") || "No suggestions found"}
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600 }}>
                          {curationSuggestions.length} {t("curation.matchCount") || "matches"}
                        </div>
                        <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                          {curationSuggestions.map((w: any, i: number) => {
                            const added = isWhiskyAlreadyAdded(w.name);
                            return (
                              <div key={w.id || i} className="labs-card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }} data-testid={`card-sharing-suggestion-${i}`}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                                    {[w.distillery, w.region, w.age ? `${w.age}y` : null].filter(Boolean).join(" · ")}
                                  </div>
                                </div>
                                {added ? (
                                  <span style={{ fontSize: 11, color: "var(--labs-success, green)", display: "flex", alignItems: "center", gap: 4 }}>
                                    <Check size={12} /> {t("curation.added") || "Added"}
                                  </span>
                                ) : (
                                  <button
                                    data-testid={`btn-add-sharing-suggestion-${i}`}
                                    onClick={() => addCurationWhisky(w)}
                                    style={{ background: "none", border: "1px solid var(--labs-accent)", borderRadius: 6, color: "var(--labs-accent)", cursor: "pointer", padding: "4px 10px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                                  >
                                    <Plus size={12} /> {t("curation.addToTasting") || "Add"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {curationSource === "collection" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {collectionLoading ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: "var(--labs-text-muted)" }}>
                        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                      </div>
                    ) : !collectionSuggestionsData?.suggestions || collectionSuggestionsData.suggestions.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 16, color: "var(--labs-text-muted)", fontSize: 13 }}>
                        {collectionSuggestionsData?.message || t("curation.noCollectionSuggestions") || "No collection suggestions found"}
                      </div>
                    ) : (
                      <>
                        {collectionSuggestionsData.theme && (
                          <div style={{ padding: 10, background: "var(--labs-accent-muted)", borderRadius: 8, fontSize: 12 }}>
                            <div style={{ fontWeight: 600, color: "var(--labs-accent)" }}>{collectionSuggestionsData.theme}</div>
                            {collectionSuggestionsData.description && <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>{collectionSuggestionsData.description}</div>}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600 }}>
                          {collectionSuggestionsData.suggestions.length} {t("curation.matchCount") || "matches"}
                        </div>
                        <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                          {collectionSuggestionsData.suggestions.map((s: any, i: number) => {
                            const added = isWhiskyAlreadyAdded(s.name);
                            return (
                              <div key={i} className="labs-card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }} data-testid={`card-sharing-collection-suggestion-${i}`}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                                    {[s.distillery, s.region].filter(Boolean).join(" · ")}
                                  </div>
                                  {s.reason && <div style={{ fontSize: 10, color: "var(--labs-text-faint)", fontStyle: "italic", marginTop: 2 }}>{s.reason}</div>}
                                </div>
                                {added ? (
                                  <span style={{ fontSize: 11, color: "var(--labs-success, green)", display: "flex", alignItems: "center", gap: 4 }}>
                                    <Check size={12} /> {t("curation.added") || "Added"}
                                  </span>
                                ) : (
                                  <button
                                    data-testid={`btn-add-sharing-collection-suggestion-${i}`}
                                    onClick={() => addCurationWhisky(s)}
                                    style={{ background: "none", border: "1px solid var(--labs-accent)", borderRadius: 6, color: "var(--labs-accent)", cursor: "pointer", padding: "4px 10px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                                  >
                                    <Plus size={12} /> {t("curation.addToTasting") || "Add"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {validBottles.length > 0 && (
                  <div style={{ padding: 10, background: "var(--labs-accent-muted)", borderRadius: 8, fontSize: 12, color: "var(--labs-text-muted)" }}>
                    <Check size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    {validBottles.length} {t("bottleSharing.bottles")} {t("bottleSharing.alreadyAdded") || "in list"} —{" "}
                    <button onClick={() => setBottleInputMode("manual")} style={{ background: "none", border: "none", color: "var(--labs-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, textDecoration: "underline" }}>
                      {t("bottleSharing.viewEdit") || "View & Edit"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === "visibility" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <label className="labs-label">{t("bottleSharing.visibility")}</label>
            {([
              { key: "public" as Visibility, label: t("bottleSharing.visPublic"), desc: t("bottleSharing.visPublicDesc"), icon: <Globe size={18} /> },
              { key: "private" as Visibility, label: t("bottleSharing.visPrivate"), desc: t("bottleSharing.visPrivateDesc"), icon: <Lock size={18} /> },
              { key: "group" as Visibility, label: t("bottleSharing.visGroup"), desc: t("bottleSharing.visGroupDesc"), icon: <UsersRound size={18} /> },
            ]).map(v => (
              <button key={v.key} data-testid={`button-visibility-${v.key}`} onClick={() => setVisibility(v.key)} className={`labs-card ${visibility === v.key ? "labs-card--active" : ""}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, cursor: "pointer", textAlign: "left", border: visibility === v.key ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)", background: visibility === v.key ? "var(--labs-accent-muted)" : undefined }}>
                <span style={{ color: visibility === v.key ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>{v.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: visibility === v.key ? "var(--labs-accent)" : "var(--labs-text)" }}>{v.label}</div>
                  <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{v.desc}</div>
                </div>
              </button>
            ))}

            {visibility === "private" && friendsWithEmail.length > 0 && (
              <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                <label className="labs-label">{t("bottleSharing.friends")}</label>
                {friendsWithEmail.map((f: any) => {
                  const sel = selectedFriendIds.has(f.id);
                  return (
                    <label key={f.id} data-testid={`sharing-friend-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", borderBottom: "1px solid var(--labs-border)" }}>
                      <input type="checkbox" checked={sel} onChange={() => toggleFriend(f.id)} data-testid={`checkbox-friend-${f.id}`} />
                      <div><div style={{ fontSize: 13, fontWeight: 500 }}>{f.firstName} {f.lastName}</div><div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{f.email}</div></div>
                    </label>
                  );
                })}
              </div>
            )}

            {visibility === "group" && communities.length > 0 && (
              <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                <label className="labs-label">{t("bottleSharing.groups")}</label>
                {communities.map((c: any) => (
                  <label key={c.id} data-testid={`sharing-community-${c.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                    <input type="checkbox" checked={selectedCommunityIds.has(c.id)} onChange={() => toggleCommunity(c.id)} data-testid={`checkbox-community-${c.id}`} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                  </label>
                ))}
              </div>
            )}

            {visibility === "group" && communities.length === 0 && (
              <div className="labs-card" data-testid="empty-communities" style={{ padding: "var(--labs-space-md)", textAlign: "center" }}>
                <UsersRound size={32} style={{ color: "var(--labs-text-muted)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 12px" }}>{t("bottleSharing.noCommunities")}</p>
                <button data-testid="button-go-to-circle" onClick={() => navigate("/labs/circle")} className="labs-btn-primary" style={{ fontSize: 13 }}>{t("bottleSharing.goToCircle")}</button>
              </div>
            )}

            <label className="labs-label" style={{ marginTop: 8 }}>{t("bottleSharing.format")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["open", "blind"] as Format[]).map(f => (
                <button key={f} data-testid={`button-format-${f}`} onClick={() => setFormat(f)} className={`labs-card ${format === f ? "labs-card--active" : ""}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 14, cursor: "pointer", border: format === f ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)" }}>
                  {f === "blind" ? <EyeOff size={18} /> : <Eye size={18} />}
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f === "blind" ? t("bottleSharing.blind") : t("bottleSharing.open")}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="labs-label">{t("bottleSharing.message")}</label>
              <textarea data-testid="input-sharing-message" value={message} onChange={e => setMessage(e.target.value)} placeholder={t("bottleSharing.messagePH")} rows={3} className="labs-input" style={{ resize: "none" }} />
            </div>
          </div>
        )}

        {step === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
              <label className="labs-label">{t("bottleSharing.review")}</label>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSharing.bottles")}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{validBottles.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSharing.visibility")}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>{visibility === "public" ? t("bottleSharing.visPublic") : visibility === "private" ? t("bottleSharing.visPrivate") : t("bottleSharing.visGroup")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSharing.format")}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{format === "blind" ? t("bottleSharing.blind") : t("bottleSharing.open")}</span>
              </div>
              {message && <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "var(--labs-accent-muted)", fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)" }}>"{message}"</div>}
            </div>
            <label className="labs-label">{t("bottleSharing.bottles")}</label>
            {validBottles.map((b, i) => (
              <div key={i} className="labs-card" style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 2 }}>
                  {[b.distillery, b.region, b.age ? `${b.age}y` : null, b.abv ? `${b.abv}%` : null, b.caskType].filter(Boolean).join(" · ")}
                </div>
                {b.whiskybaseId && <div style={{ fontSize: 11, color: "var(--labs-text-faint)", marginTop: 2 }}>WB #{b.whiskybaseId}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "var(--labs-space-lg)" }}>
          {step === "review" ? (
            <button data-testid="button-create-sharing" onClick={handleCreate} disabled={creating} className="labs-btn-primary" style={{ width: "100%" }}>
              {creating ? t("bottleSharing.saving") : t("bottleSharing.create")}
            </button>
          ) : (
            <button data-testid="button-sharing-next" onClick={() => setStep(steps[stepIdx + 1])} disabled={!canProceed} className="labs-btn-primary" style={{ width: "100%", opacity: canProceed ? 1 : 0.4 }}>
              {t("bottleSharing.next")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="labs-page labs-fade-in">
      {!isEmbedded && (
        <button onClick={goBackToHome} className="labs-btn-ghost" data-testid="button-bs-back-home" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: "var(--labs-space-sm)" }}>
          <ChevronLeft className="w-4 h-4" />{t("bottleSharing.back")}
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--labs-space-lg)" }}>
        <div>
          <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{t("bottleSharing.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSharing.subtitle")}</p>
        </div>
        <button onClick={() => setShowWizard(true)} data-testid="button-new-sharing" className="labs-btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <Plus size={16} />{t("bottleSharing.create")}
        </button>
      </div>

      {loading ? (
        <div className="labs-skeleton" style={{ height: 200 }} />
      ) : (
        <>
          {mySharings.length > 0 && (
            <div style={{ marginBottom: "var(--labs-space-xl)" }}>
              <span className="labs-section-label">{t("bottleSharing.yourSharings")}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mySharings.map((s: any) => (
                  <button key={s.id} data-testid={`my-sharing-${s.id}`} onClick={() => navigate(`/labs/bottle-sharing/${s.id}`)} className="labs-card" style={{ display: "flex", alignItems: "center", padding: 14, cursor: "pointer", width: "100%", textAlign: "left", border: "1px solid var(--labs-border)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                      <Share2 size={18} style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{s.whiskyCount} {t("bottleSharing.bottleCount")} · {s.confirmedCount} {t("bottleSharing.confirmedCount")}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {publicSharings.length > 0 && (
            <div>
              <span className="labs-section-label">{t("bottleSharing.publicSharings")}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {publicSharings.map((s: any) => (
                  <button key={s.id} data-testid={`public-sharing-${s.id}`} onClick={() => navigate(`/labs/bottle-sharing/${s.id}`)} className="labs-card" style={{ display: "flex", alignItems: "center", padding: 14, cursor: "pointer", width: "100%", textAlign: "left", border: "1px solid var(--labs-border)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                      <Globe size={18} style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{t("bottleSharing.createdBy")} {s.hostName} · {s.whiskyCount} {t("bottleSharing.bottleCount")}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--labs-success)" }}>{s.confirmedCount} {t("bottleSharing.confirmedCount")}</div>
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{s.interestedCount} {t("bottleSharing.interested")}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mySharings.length === 0 && publicSharings.length === 0 && (
            <div style={{ textAlign: "center", padding: "var(--labs-space-xxl) 0", color: "var(--labs-text-muted)" }}>
              <Share2 size={40} style={{ color: "var(--labs-text-faint)", marginBottom: "var(--labs-space-md)" }} />
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t("bottleSharing.noParticipants")}</p>
              <p style={{ fontSize: 12, color: "var(--labs-text-faint)" }}>{t("bottleSharing.subtitle")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
