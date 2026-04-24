import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import {
  Scissors, Plus, ChevronLeft, ChevronRight, Loader2, Trash2, ChevronDown, ChevronUp, Globe, Lock, UsersRound
} from "lucide-react";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import WhiskyImageUpload from "@/components/WhiskyImageUpload";

type WizardStep = "bottles" | "pricing" | "visibility" | "review";
type Visibility = "public" | "private" | "group";

interface BottleEntry {
  name: string;
  distillery?: string;
  age?: string;
  abv?: number | null;
  region?: string;
  category?: string;
  country?: string;
  caskType?: string;
  peatLevel?: string;
  whiskybaseId?: string;
  bottler?: string;
  ppm?: number | null;
  distilledYear?: string;
  bottledYear?: string;
  price?: number | null;
  wbScore?: number | null;
  notes?: string;
  hostSummary?: string;
  flavorProfile?: string;
  imageFile?: File | null;
  imagePreview?: string;
  totalVolumeMl: number;
  ownerKeepMl: number;
  sampleOptions: Array<{ sizeMl: number; priceEur: number }>;
}

type ViewTab = "browse" | "my-splits" | "my-claims";

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--labs-text-muted)",
  open: "var(--labs-success)",
  confirmed: "var(--labs-accent)",
  distributed: "#6c63ff",
  tasting: "#e67e22",
  completed: "var(--labs-text-muted)",
  cancelled: "#e74c3c",
};

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Entwurf", open: "Offen", confirmed: "Bestätigt",
    distributed: "Verteilt", tasting: "Tasting aktiv", completed: "Abgeschlossen", cancelled: "Abgebrochen",
  };
  return map[status] || status;
}

export default function LabsBottleSplit() {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const goBackToHome = useBackNavigation("/labs/tastings");

  const [publicSplits, setPublicSplits] = useState<any[]>([]);
  const [mySplits, setMySplits] = useState<any[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>("browse");

  const [step, setStep] = useState<WizardStep>("bottles");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bottles, setBottles] = useState<BottleEntry[]>([{
    name: "", totalVolumeMl: 700, ownerKeepMl: 50,
    sampleOptions: [{ sizeMl: 3, priceEur: 5 }],
  }]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState("");
  const [minClaims, setMinClaims] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedBottle, setExpandedBottle] = useState<number | null>(0);

  const pid = currentParticipant?.id || "";

  useEffect(() => {
    if (!pid) { setLoading(false); return; }
    Promise.all([
      fetch("/api/bottle-splits/public").then(r => r.ok ? r.json() : []),
      fetch("/api/bottle-splits/mine", { headers: { "x-participant-id": pid } }).then(r => r.ok ? r.json() : []),
    ]).then(([pub, mine]) => { setPublicSplits(pub); setMySplits(mine); }).catch(() => {}).finally(() => setLoading(false));

    fetch("/api/communities/mine", { headers: { "x-participant-id": pid } })
      .then(r => r.ok ? r.json() : []).then(setCommunities).catch(() => {});
  }, [pid]);

  if (!currentParticipant) return <AuthGateMessage title={t("authGate.bottleSplit.title")} bullets={[t("authGate.bottleSplit.bullet1"), t("authGate.bottleSplit.bullet2"), t("authGate.bottleSplit.bullet3")]} />;

  const steps: WizardStep[] = ["bottles", "pricing", "visibility", "review"];
  const stepIdx = steps.indexOf(step);
  const validBottles = bottles.filter(b => b.name.trim());
  const canProceed = step === "bottles" ? validBottles.length > 0 :
    step === "pricing" ? validBottles.every(b => b.totalVolumeMl > 0 && b.sampleOptions.length > 0) :
    step === "visibility" && visibility === "group" ? selectedCommunityIds.size > 0 : true;

  const addBottle = () => setBottles([...bottles, {
    name: "", totalVolumeMl: 700, ownerKeepMl: 50,
    sampleOptions: [{ sizeMl: 3, priceEur: 5 }],
  }]);
  const removeBottle = (i: number) => setBottles(bottles.filter((_, idx) => idx !== i));
  const updateBottle = (i: number, field: keyof BottleEntry, val: any) => {
    const u = [...bottles]; u[i] = { ...u[i], [field]: val }; setBottles(u);
  };

  const addSampleOption = (bottleIdx: number) => {
    const u = [...bottles];
    u[bottleIdx] = { ...u[bottleIdx], sampleOptions: [...u[bottleIdx].sampleOptions, { sizeMl: 5, priceEur: 8 }] };
    setBottles(u);
  };
  const removeSampleOption = (bottleIdx: number, optIdx: number) => {
    const u = [...bottles];
    u[bottleIdx] = { ...u[bottleIdx], sampleOptions: u[bottleIdx].sampleOptions.filter((_, i) => i !== optIdx) };
    setBottles(u);
  };
  const updateSampleOption = (bottleIdx: number, optIdx: number, field: "sizeMl" | "priceEur", val: number) => {
    const u = [...bottles];
    const opts = [...u[bottleIdx].sampleOptions];
    opts[optIdx] = { ...opts[optIdx], [field]: val };
    u[bottleIdx] = { ...u[bottleIdx], sampleOptions: opts };
    setBottles(u);
  };

  const toggleCommunity = (id: string) => setSelectedCommunityIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const handleCreate = async () => {
    if (validBottles.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/bottle-splits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({
          title: title.trim() || `Flaschenteilung (${validBottles.length} Flaschen)`,
          description: description || null,
          visibility,
          targetCommunityIds: selectedCommunityIds.size > 0 ? Array.from(selectedCommunityIds) : null,
          deadline: deadline || null,
          minClaims: minClaims ? parseInt(minClaims) : null,
          bottles: validBottles.map(b => ({
            name: b.name, distillery: b.distillery, age: b.age, abv: b.abv,
            region: b.region, category: b.category, country: b.country,
            caskType: b.caskType, peatLevel: b.peatLevel,
            whiskybaseId: b.whiskybaseId, bottler: b.bottler,
            ppm: b.ppm, distilledYear: b.distilledYear, bottledYear: b.bottledYear,
            price: b.price, wbScore: b.wbScore, notes: b.notes,
            hostSummary: b.hostSummary, flavorProfile: b.flavorProfile,
            imageUrl: b.imagePreview && b.imagePreview.startsWith("http") ? b.imagePreview : undefined,
            totalVolumeMl: b.totalVolumeMl, ownerKeepMl: b.ownerKeepMl,
            sampleOptions: b.sampleOptions,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to create split");
      const split = await res.json();
      navigate(`/labs/splits/${split.id}`);
    } catch (e) {
      console.error("Failed to create split:", e);
    } finally { setCreating(false); }
  };

  const myClaims = mySplits.filter(s => s.hostId !== pid);
  const myHosted = mySplits.filter(s => s.hostId === pid);

  const renderSplitCard = (s: any) => {
    const btls = (s.bottles as any[]) || [];
    const totalAvailable = btls.reduce((sum, b) => sum + (b.totalVolumeMl - (b.ownerKeepMl || 0)), 0);
    const remainingMl = totalAvailable - (s.totalClaimedMl || 0);
    const pct = totalAvailable > 0 ? ((totalAvailable - remainingMl) / totalAvailable) * 100 : 0;
    const priceRange = btls.flatMap((b: any) => (b.sampleOptions || []).map((o: any) => o.priceEur));
    const minPrice = priceRange.length > 0 ? Math.min(...priceRange) : 0;
    const maxPrice = priceRange.length > 0 ? Math.max(...priceRange) : 0;

    return (
      <button
        key={s.id}
        data-testid={`split-card-${s.id}`}
        onClick={() => navigate(`/labs/splits/${s.id}`)}
        className="labs-card"
        style={{ padding: "var(--labs-space-md)", textAlign: "left", width: "100%", cursor: "pointer", border: "1px solid var(--labs-border)", background: "var(--labs-bg-card)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
              {s.hostName} · {btls.length} {btls.length === 1 ? "Flasche" : "Flaschen"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[s.status] || "var(--labs-text-muted)", textTransform: "uppercase" }}>
              {statusLabel(s.status)}
            </span>
            <ChevronRight size={16} style={{ color: "var(--labs-text-muted)" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--labs-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--labs-accent)", borderRadius: 3, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--labs-text-muted)", whiteSpace: "nowrap" }}>{remainingMl}ml frei</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--labs-text-muted)" }}>
          <span>{s.claimCount || 0} {t("bottleSplitUi.claims")}</span>
          {minPrice > 0 && <span>{minPrice === maxPrice ? `${minPrice}€` : `${minPrice}–${maxPrice}€`}</span>}
        </div>
      </button>
    );
  };

  if (showWizard) {
    return (
      <div className="labs-page labs-fade-in">
        <button onClick={() => stepIdx > 0 ? setStep(steps[stepIdx - 1]) : setShowWizard(false)} className="labs-btn-ghost" data-testid="button-split-back" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: "var(--labs-space-sm)" }}>
          <ChevronLeft className="w-4 h-4" />Zurück
        </button>
        <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }} data-testid="text-split-create-title">Flaschenteilung erstellen</h1>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-lg)" }}>Teile eine Flasche mit der Community</p>
        <div style={{ display: "flex", gap: 4, marginBottom: "var(--labs-space-lg)" }}>
          {steps.map((s, i) => (<div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= stepIdx ? "var(--labs-accent)" : "var(--labs-border)" }} />))}
        </div>

        {step === "bottles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <div>
              <label className="labs-label">Split-Name</label>
              <input data-testid="input-split-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Islay Selection Split" className="labs-input" />
            </div>
            <div>
              <label className="labs-label">Beschreibung (optional)</label>
              <textarea data-testid="input-split-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Was macht diesen Split besonders?" className="labs-input" rows={3} style={{ resize: "none" }} />
            </div>

            <label className="labs-label">Flaschen</label>
            {bottles.map((b, i) => (
              <div key={i} className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="labs-label" style={{ color: "var(--labs-accent)" }}>Flasche #{i + 1}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setExpandedBottle(expandedBottle === i ? null : i)} data-testid={`button-expand-split-bottle-${i}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {expandedBottle === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {bottles.length > 1 && (
                      <button onClick={() => removeBottle(i)} data-testid={`button-remove-split-bottle-${i}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input data-testid={`input-split-bottle-name-${i}`} value={b.name} onChange={e => updateBottle(i, "name", e.target.value)} placeholder={t("bottleSplitUi.namePlaceholder")} className="labs-input" style={{ gridColumn: "1 / -1" }} />
                  <input data-testid={`input-split-bottle-distillery-${i}`} value={b.distillery || ""} onChange={e => updateBottle(i, "distillery", e.target.value)} placeholder={t("bottleSplitUi.distilleryPlaceholder")} className="labs-input" />
                  <input data-testid={`input-split-bottle-region-${i}`} value={b.region || ""} onChange={e => updateBottle(i, "region", e.target.value)} placeholder={t("bottleSplitUi.regionPlaceholder")} className="labs-input" />
                </div>

                {expandedBottle === i && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--labs-border)" }}>
                    <input data-testid={`input-split-bottle-age-${i}`} value={b.age || ""} onChange={e => updateBottle(i, "age", e.target.value)} placeholder={t("bottleSplitUi.agePlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-abv-${i}`} type="number" step="0.1" value={b.abv ?? ""} onChange={e => updateBottle(i, "abv", e.target.value ? parseFloat(e.target.value) : null)} placeholder={t("bottleSplitUi.abvPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-cask-${i}`} value={b.caskType || ""} onChange={e => updateBottle(i, "caskType", e.target.value)} placeholder={t("bottleSplitUi.caskPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-category-${i}`} value={b.category || ""} onChange={e => updateBottle(i, "category", e.target.value)} placeholder={t("bottleSplitUi.categoryPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-country-${i}`} value={b.country || ""} onChange={e => updateBottle(i, "country", e.target.value)} placeholder={t("bottleSplitUi.countryPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-peat-${i}`} value={b.peatLevel || ""} onChange={e => updateBottle(i, "peatLevel", e.target.value)} placeholder={t("bottleSplitUi.peatLevelPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-ppm-${i}`} type="number" step="0.1" value={b.ppm ?? ""} onChange={e => updateBottle(i, "ppm", e.target.value ? parseFloat(e.target.value) : null)} placeholder={t("bottleSplitUi.ppmPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-bottler-${i}`} value={b.bottler || ""} onChange={e => updateBottle(i, "bottler", e.target.value)} placeholder={t("bottleSplitUi.bottlerPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-distilled-${i}`} value={b.distilledYear || ""} onChange={e => updateBottle(i, "distilledYear", e.target.value)} placeholder={t("bottleSplitUi.distilledYearPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-bottled-${i}`} value={b.bottledYear || ""} onChange={e => updateBottle(i, "bottledYear", e.target.value)} placeholder={t("bottleSplitUi.bottledYearPlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-price-${i}`} type="number" step="0.01" value={b.price ?? ""} onChange={e => updateBottle(i, "price", e.target.value ? parseFloat(e.target.value) : null)} placeholder={t("bottleSplitUi.pricePlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-wbscore-${i}`} type="number" step="0.1" value={b.wbScore ?? ""} onChange={e => updateBottle(i, "wbScore", e.target.value ? parseFloat(e.target.value) : null)} placeholder={t("bottleSplitUi.wbScorePlaceholder")} className="labs-input" />
                    <input data-testid={`input-split-bottle-whiskybase-${i}`} value={b.whiskybaseId || ""} onChange={e => updateBottle(i, "whiskybaseId", e.target.value)} placeholder={t("bottleSplitUi.whiskybaseIdPlaceholder")} className="labs-input" />
                    <textarea data-testid={`input-split-bottle-notes-${i}`} value={b.notes || ""} onChange={e => updateBottle(i, "notes", e.target.value)} placeholder={t("bottleSplitUi.notesPlaceholder")} className="labs-input" rows={2} style={{ resize: "none", gridColumn: "1 / -1" }} />
                    <textarea data-testid={`input-split-bottle-summary-${i}`} value={b.hostSummary || ""} onChange={e => updateBottle(i, "hostSummary", e.target.value)} placeholder={t("bottleSplitUi.hostSummaryPlaceholder")} className="labs-input" rows={2} style={{ resize: "none", gridColumn: "1 / -1" }} />
                    <select data-testid={`input-split-bottle-flavor-${i}`} value={b.flavorProfile || ""} onChange={e => updateBottle(i, "flavorProfile", e.target.value)} className="labs-input" style={{ gridColumn: "1 / -1" }}>
                      <option value="">{t("bottleSplitUi.flavorProfileAuto")}</option>
                      <option value="smoky-peaty">{t("bottleSplitUi.smokyPeaty")}</option>
                      <option value="fruity-sweet">{t("bottleSplitUi.fruitySweetOpt")}</option>
                      <option value="rich-sherried">{t("bottleSplitUi.richSherried")}</option>
                      <option value="light-floral">{t("bottleSplitUi.lightFloral")}</option>
                      <option value="spicy-complex">{t("bottleSplitUi.spicyComplex")}</option>
                      <option value="maritime-coastal">{t("bottleSplitUi.maritimeCoastal")}</option>
                    </select>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <WhiskyImageUpload
                        imageUrl={b.imagePreview || null}
                        onFileSelected={async (file) => {
                          const preview = URL.createObjectURL(file);
                          const u = [...bottles];
                          u[i] = { ...u[i], imageFile: file, imagePreview: preview };
                          setBottles(u);
                          try {
                            const formData = new FormData();
                            formData.append("image", file);
                            const res = await fetch("/api/bottle-splits/upload-image", { method: "POST", body: formData, headers: { "x-participant-id": pid } });
                            if (res.ok) {
                              const { imageUrl } = await res.json();
                              const u2 = [...bottles];
                              u2[i] = { ...u2[i], imagePreview: imageUrl };
                              setBottles(u2);
                            }
                          } catch {}
                        }}
                        onImageDeleted={() => {
                          const u = [...bottles];
                          u[i] = { ...u[i], imageFile: null, imagePreview: undefined };
                          setBottles(u);
                        }}
                        variant="labs"
                        size="sm"
                        testIdPrefix={`split-bottle-image-${i}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addBottle} data-testid="button-add-split-bottle" className="labs-btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Plus size={18} />{t("bottleSplitUi.addBottle")}
            </button>
          </div>
        )}

        {step === "pricing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <label className="labs-label">Kapazität & Preise</label>
            {bottles.map((b, origIdx) => {
              if (!b.name.trim()) return null;
              const availableMl = b.totalVolumeMl - b.ownerKeepMl;
              return (
                <div key={origIdx} className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{b.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div>
                      <label className="labs-label" style={{ fontSize: 11 }}>Flaschenvolumen (ml)</label>
                      <input data-testid={`input-split-volume-${origIdx}`} type="number" value={b.totalVolumeMl} onChange={e => updateBottle(origIdx, "totalVolumeMl", parseInt(e.target.value) || 0)} className="labs-input" />
                    </div>
                    <div>
                      <label className="labs-label" style={{ fontSize: 11 }}>Eigenbedarf (ml)</label>
                      <input data-testid={`input-split-keep-${origIdx}`} type="number" value={b.ownerKeepMl} onChange={e => updateBottle(origIdx, "ownerKeepMl", parseInt(e.target.value) || 0)} className="labs-input" />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--labs-accent)", marginBottom: 8, fontWeight: 600 }}>
                    Verfügbar: {availableMl > 0 ? availableMl : 0}ml
                  </div>

                  <label className="labs-label" style={{ fontSize: 11 }}>Sample-Größen & Preise</label>
                  {b.sampleOptions.map((opt, oi) => (
                    <div key={oi} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <input data-testid={`input-sample-size-${origIdx}-${oi}`} type="number" value={opt.sizeMl} onChange={e => updateSampleOption(origIdx, oi, "sizeMl", parseInt(e.target.value) || 0)} placeholder="ml" className="labs-input" style={{ fontSize: 13 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>ml →</span>
                      <div style={{ flex: 1 }}>
                        <input data-testid={`input-sample-price-${origIdx}-${oi}`} type="number" step="0.5" value={opt.priceEur} onChange={e => updateSampleOption(origIdx, oi, "priceEur", parseFloat(e.target.value) || 0)} placeholder="€" className="labs-input" style={{ fontSize: 13 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>€</span>
                      {b.sampleOptions.length > 1 && (
                        <button onClick={() => removeSampleOption(origIdx, oi)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addSampleOption(origIdx)} data-testid={`button-add-sample-${origIdx}`} className="labs-btn-outline" style={{ fontSize: 12, padding: "6px 12px", marginTop: 4 }}>
                    <Plus size={14} /> Größe hinzufügen
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {step === "visibility" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <label className="labs-label">Sichtbarkeit</label>
            {([
              { key: "public" as Visibility, icon: Globe, label: "Öffentlich", desc: "Jeder kann diesen Split sehen und beanspruchen" },
              { key: "private" as Visibility, icon: Lock, label: "Privat", desc: "Nur über den direkten Link erreichbar" },
              { key: "group" as Visibility, icon: UsersRound, label: "Community", desc: "Sichtbar für ausgewählte Communities" },
            ]).map(v => (
              <button
                key={v.key}
                data-testid={`button-visibility-${v.key}`}
                onClick={() => setVisibility(v.key)}
                className="labs-card"
                style={{ padding: "var(--labs-space-md)", textAlign: "left", cursor: "pointer", borderColor: visibility === v.key ? "var(--labs-accent)" : undefined }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <v.icon size={18} style={{ color: visibility === v.key ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v.label}</div>
                    <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{v.desc}</div>
                  </div>
                </div>
              </button>
            ))}

            {visibility === "group" && communities.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="labs-label">Communities auswählen</label>
                {communities.map((c: any) => (
                  <button key={c.id} data-testid={`button-community-${c.id}`} onClick={() => toggleCommunity(c.id)} className="labs-card" style={{ padding: "10px 14px", textAlign: "left", cursor: "pointer", borderColor: selectedCommunityIds.has(c.id) ? "var(--labs-accent)" : undefined }}>
                    <span style={{ fontSize: 13, fontWeight: selectedCommunityIds.has(c.id) ? 600 : 400 }}>{c.name}</span>
                  </button>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label className="labs-label" style={{ fontSize: 11 }}>Deadline (optional)</label>
                <input data-testid="input-split-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="labs-input" />
              </div>
              <div>
                <label className="labs-label" style={{ fontSize: 11 }}>Min. Claims (optional)</label>
                <input data-testid="input-split-min-claims" type="number" value={minClaims} onChange={e => setMinClaims(e.target.value)} placeholder="z.B. 3" className="labs-input" />
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <label className="labs-label">Zusammenfassung</label>
            <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title || `Flaschenteilung (${validBottles.length} Flaschen)`}</div>
              {description && <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: 8, fontStyle: "italic" }}>"{description}"</div>}
              <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 4 }}>
                Sichtbarkeit: {visibility === "public" ? "Öffentlich" : visibility === "private" ? "Privat" : "Community"}
              </div>
              {deadline && <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 4 }}>Deadline: {deadline}</div>}
              {minClaims && <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 4 }}>Min. Claims: {minClaims}</div>}
            </div>

            {validBottles.map((b, i) => (
              <div key={i} className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{b.name}</div>
                {b.distillery && <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{b.distillery} {b.region ? `· ${b.region}` : ""}</div>}
                <div style={{ fontSize: 12, color: "var(--labs-accent)", marginTop: 6 }}>
                  {b.totalVolumeMl}ml gesamt · {b.ownerKeepMl}ml Eigenbedarf · {b.totalVolumeMl - b.ownerKeepMl}ml verfügbar
                </div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 4 }}>
                  {b.sampleOptions.map(o => `${o.sizeMl}ml = ${o.priceEur}€`).join(" | ")}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: "var(--labs-space-lg)" }}>
          {stepIdx < steps.length - 1 && (
            <button data-testid="button-split-next" onClick={() => setStep(steps[stepIdx + 1])} disabled={!canProceed} className="labs-btn-primary" style={{ flex: 1 }}>
              Weiter
            </button>
          )}
          {stepIdx === steps.length - 1 && (
            <button data-testid="button-split-create" onClick={handleCreate} disabled={creating || !canProceed} className="labs-btn-primary" style={{ flex: 1 }}>
              {creating ? <Loader2 className="labs-spinner" size={16} /> : "Split erstellen"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 className="labs-spinner" size={24} /></div>;

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "browse", label: "Entdecken" },
    { key: "my-splits", label: "Meine Splits" },
    { key: "my-claims", label: "Meine Claims" },
  ];

  return (
    <div className="labs-page labs-fade-in">
      <button onClick={goBackToHome} className="labs-btn-ghost" data-testid="button-splits-home" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: "var(--labs-space-sm)" }}>
        <ChevronLeft className="w-4 h-4" />Home
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--labs-space-md)" }}>
        <div>
          <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 600, marginBottom: 2 }} data-testid="text-splits-title">
            <Scissors size={22} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
            Flaschenteilung
          </h1>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>Flaschen teilen, Samples verteilen, gemeinsam verkosten</p>
        </div>
      </div>

      <button data-testid="button-create-split" onClick={() => setShowWizard(true)} className="labs-btn-primary" style={{ width: "100%", marginBottom: "var(--labs-space-lg)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Plus size={18} />{t("bottleSplitUi.createNewSplit")}
      </button>

      <div style={{ display: "flex", background: "var(--labs-bg-card)", borderRadius: 10, padding: 3, marginBottom: "var(--labs-space-lg)", border: "1px solid var(--labs-border)" }} data-testid="splits-tabs">
        {tabs.map(tab => (
          <button key={tab.key} data-testid={`splits-tab-${tab.key}`} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: activeTab === tab.key ? "var(--labs-accent)" : "transparent", color: activeTab === tab.key ? "#0e0b05" : "var(--labs-text-muted)", fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 500, cursor: "pointer" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "browse" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
          {publicSplits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--labs-text-muted)" }}>
              <Scissors size={40} style={{ color: "var(--labs-text-faint)", marginBottom: 16 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Noch keine öffentlichen Splits</p>
              <p style={{ fontSize: 12, color: "var(--labs-text-faint)" }}>Erstelle den ersten Split!</p>
            </div>
          ) : publicSplits.map(renderSplitCard)}
        </div>
      )}

      {activeTab === "my-splits" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
          {myHosted.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--labs-text-muted)" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Du hast noch keine Splits erstellt</p>
            </div>
          ) : myHosted.map(renderSplitCard)}
        </div>
      )}

      {activeTab === "my-claims" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
          {myClaims.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--labs-text-muted)" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Du hast noch keine Claims</p>
              <p style={{ fontSize: 12, color: "var(--labs-text-faint)" }}>Entdecke öffentliche Splits und beanspruche Samples</p>
            </div>
          ) : myClaims.map(renderSplitCard)}
        </div>
      )}
    </div>
  );
}
