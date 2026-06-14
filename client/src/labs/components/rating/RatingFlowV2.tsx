import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { RatingData } from "./types";
import type { RatingScale } from "@/labs/hooks/useRatingScale";
import RatingModeSelect from "./RatingModeSelect";
import RatingModeChip from "./RatingModeChip";
import GuidedRating from "./GuidedRating";
import CompactRating from "./CompactRating";
import QuickRating from "./QuickRating";
import TischRating from "./TischRating";

export interface RatingFlowDraftState {
  mode: "guided" | "compact" | "quick" | "tisch" | null;
  phaseIndex: number;
  data: Partial<RatingData>;
}

interface RatingFlowV2Props {
  whisky: {
    name?: string;
    region?: string;
    cask?: string;
    blind?: boolean;
    flavorProfile?: string;
  };
  initialData?: RatingData;
  initialMode?: "guided" | "compact" | "quick" | "tisch" | null;
  initialPhaseIndex?: number;
  onDone: (data: RatingData) => void;
  onBack: () => void;
  onChange?: (draft: RatingFlowDraftState) => void;
  onSaveAsDraft?: (data: RatingData) => void;
  hideQuick?: boolean;
  scale?: RatingScale;
  preferredMode?: "guided" | "compact" | "quick" | "tisch" | null;
  onSetPreferredMode?: (mode: "guided" | "compact" | "quick" | "tisch" | null) => void;
  showTisch?: boolean;
  chipInHeader?: boolean;
  chipPortalTarget?: HTMLElement | null;
  autoSaveHint?: boolean;
}

type Step = "mode" | "rating";

export default function RatingFlowV2({
  whisky,
  initialData,
  initialMode,
  initialPhaseIndex,
  onDone,
  onBack,
  onChange,
  onSaveAsDraft,
  hideQuick,
  scale,
  preferredMode,
  onSetPreferredMode,
  showTisch,
  chipInHeader,
  chipPortalTarget,
  autoSaveHint,
}: RatingFlowV2Props) {
  const { t } = useTranslation();

  const tischSeen = useMemo(() => {
    try {
      if (typeof localStorage === "undefined") return true;
      return localStorage.getItem("labs_tisch_seen") === "1";
    } catch {
      return true;
    }
  }, []);
  const forceTischDiscovery = !!showTisch && !tischSeen && !initialMode;

  const resolvedInitialMode = useMemo<"guided" | "compact" | "quick" | "tisch" | null>(() => {
    if (forceTischDiscovery) return null;
    if (initialMode && (initialMode !== "tisch" || showTisch)) return initialMode;
    if (preferredMode && (preferredMode === "guided" || preferredMode === "compact" || (preferredMode === "quick" && !hideQuick) || (preferredMode === "tisch" && !!showTisch))) {
      return preferredMode;
    }
    return null;
  }, [initialMode, preferredMode, hideQuick, showTisch, forceTischDiscovery]);

  const [mode, setMode] = useState<"guided" | "compact" | "quick" | "tisch" | null>(resolvedInitialMode);
  const [step, setStep] = useState<Step>(resolvedInitialMode ? "rating" : "mode");
  const [liveData, setLiveData] = useState<RatingData | undefined>(initialData);
  const liveDataRef = useRef<RatingData | undefined>(initialData);
  const userPickedModeRef = useRef<boolean>(!!resolvedInitialMode);

  useEffect(() => {
    liveDataRef.current = liveData;
  }, [liveData]);

  useEffect(() => {
    if (forceTischDiscovery) return;
    if (userPickedModeRef.current) return;
    if (initialMode) return;
    if (step !== "mode") return;
    if (!preferredMode) return;
    if (preferredMode === "quick" && hideQuick) return;
    if (preferredMode === "tisch" && !showTisch) return;
    setMode(preferredMode);
    setStep("rating");
  }, [preferredMode, initialMode, hideQuick, showTisch, step, forceTischDiscovery]);

  useEffect(() => {
    if (step === "mode" && showTisch && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("labs_tisch_seen", "1");
      } catch {
        /* ignore storage write failures (private mode / quota) */
      }
    }
  }, [step, showTisch]);

  const modeLabels = useMemo(() => ({
    modeQ: t("v2.ratingModeQ", "Wie moechtest du bewerten?"),
    modeSub: t("v2.ratingModeSub", "Beide Modi erfassen Nase, Gaumen, Abgang und Gesamt."),
    guided: t("v2.ratingGuided", "Gefuehrt"),
    guidedD: t("v2.ratingGuidedD", "Eine Dimension nach der anderen -- mit Fragen und Aroma-Vorschlaegen."),
    guidedH: t("v2.ratingGuidedH", "Wenn man sich Zeit nimmt."),
    compact: t("v2.ratingCompact", "Kompakt"),
    compactD: t("v2.ratingCompactD", "Alle vier Dimensionen auf einmal -- Score direkt eingeben."),
    compactH: t("v2.ratingCompactH", "Wenn man sein Bewertungsschema kennt."),
    quick: t("v2.ratingQuick", "Quick"),
    quickD: t("v2.ratingQuickD", "Nur Overall-Score -- zwei Taps und fertig."),
    quickH: t("v2.ratingQuickH", "Wenn es schnell gehen soll."),
    tisch: t("v2.ratingTisch", "Tisch"),
    tischNew: t("v2.ratingTischNew", "Neu"),
    tischD: t("v2.ratingTischD", "Alle vier Dimensionen als Stufen — ein Tap pro Phase."),
    tischH: t("v2.ratingTischH", "Wenn das Gespräch wichtiger ist."),
    back: t("v2.back", "Zurueck"),
    rememberDefault: t("v2.ratingModeRemember", "Als meine Standard-Form merken"),
  }), [t]);

  const guidedLabels = useMemo(() => ({
    tapEdit: t("v2.ratingTapEdit", "Tippe auf die Zahl zum direkten Eingeben"),
    of: t("v2.ratingOf", "von"),
    band90: t("v2.band90", "Herausragend"),
    band85: t("v2.band85", "Ausgezeichnet"),
    band80: t("v2.band80", "Sehr gut"),
    band75: t("v2.band75", "Gut"),
    band70: t("v2.band70", "Solide"),
    band0: t("v2.band0", "Einfach"),
    aromen: t("v2.ratingAromen", "Aromen waehlen"),
    aromenSub: t("v2.ratingAromenS", "Tippe an was du erkennst -- oder lass es weg."),
    blindLabel: t("v2.ratingBlind", "Blind-Tasting"),
    profileLabel: t("v2.ratingProfile", "Profil:"),
    note: t("v2.ratingNote", "Notiz"),
    noteSub: t("v2.ratingNoteSub", "Optional -- deine eigenen Worte."),
    notePH: t("v2.ratingNotePH", "Was faellt dir auf..."),
    save: t("v2.ratingSave", "speichern"),
    finish2: t("v2.ratingFinish2", "Bewertung speichern"),
    error: t("v2.ratingError", "Fehler beim Speichern"),
    nose: t("v2.ratingNose", "Nase"),
    palate: t("v2.ratingPalate", "Gaumen"),
    finishLabel: t("v2.ratingFinish", "Abgang"),
    overall: t("v2.ratingOverall", "Gesamt"),
    qNose: t("v2.ratingQ_nose", "Was nimmst du zuerst wahr?"),
    qPalate: t("v2.ratingQ_palate", "Was spuerst du beim ersten Schluck?"),
    qFinish: t("v2.ratingQ_finish", "Was bleibt zurueck?"),
    qOverall: t("v2.ratingQ_overall", "Dein Gesamteindruck."),
    hintNose: t("v2.ratingHint_nose", "Lass das Glas kurz atmen."),
    hintPalate: t("v2.ratingHint_palate", "Lass ihn auf der Zunge verweilen."),
    hintFinish: t("v2.ratingHint_finish", "Warte einen Moment."),
    hintOverall: t("v2.ratingHint_overall", "Vertrau deiner Intuition."),
  }), [t]);

  const compactLabels = useMemo(() => ({
    ...guidedLabels,
    done: t("v2.ratingDone", "Gespeichert"),
  }), [t, guidedLabels]);

  const quickLabels = useMemo(() => ({
    tapEdit: guidedLabels.tapEdit,
    of: guidedLabels.of,
    band90: guidedLabels.band90,
    band85: guidedLabels.band85,
    band80: guidedLabels.band80,
    band75: guidedLabels.band75,
    band70: guidedLabels.band70,
    band0: guidedLabels.band0,
    quick: t("v2.ratingQuick", "Quick"),
    quickD: t("v2.ratingQuickD", "Nur Overall-Score -- zwei Taps und fertig."),
    note: guidedLabels.note,
    notePH: guidedLabels.notePH,
    save: guidedLabels.save,
    savedHint: t("v2.ratingAutoSaved", "Automatisch gespeichert"),
    back: modeLabels.back,
  }), [t, guidedLabels, modeLabels.back]);

  const tischLabels = useMemo(() => ({
    tisch: modeLabels.tisch,
    tischTapHint: t("v2.tischTapHint", "Ein Tap pro Phase — Details kannst du später ergänzen."),
    tapEdit: guidedLabels.tapEdit,
    of: guidedLabels.of,
    preciseToggle: t("v2.tischPreciseToggle", "Genauer einstellen"),
    preciseToggleClose: t("v2.tischPreciseClose", "Schneller"),
    next: t("v2.tischNext", "Weiter"),
    done: t("v2.tischDone", "Fertig"),
    band90: guidedLabels.band90,
    band85: guidedLabels.band85,
    band80: guidedLabels.band80,
    band75: guidedLabels.band75,
    band70: guidedLabels.band70,
    band0: guidedLabels.band0,
    nose: guidedLabels.nose,
    palate: guidedLabels.palate,
    finishLabel: guidedLabels.finishLabel,
    overall: guidedLabels.overall,
    qNose: guidedLabels.qNose,
    qPalate: guidedLabels.qPalate,
    qFinish: guidedLabels.qFinish,
    qOverall: guidedLabels.qOverall,
    back: modeLabels.back,
  }), [t, guidedLabels, modeLabels]);

  const chipLabels = useMemo(() => ({
    current: t("v2.ratingModeChipCurrent", "Modus"),
    title: t("v2.ratingModeChipTitle", "Bewertungsform wechseln"),
    guided: modeLabels.guided,
    compact: modeLabels.compact,
    quick: modeLabels.quick,
    tisch: modeLabels.tisch,
    setDefault: t("v2.ratingModeSetDefault", "Als Standard merken"),
    cancel: t("v2.back", "Zurueck"),
  }), [t, modeLabels]);

  const handleModeSelect = useCallback((m: "guided" | "compact" | "quick" | "tisch", remember?: boolean) => {
    setMode(m);
    setStep("rating");
    if (remember && onSetPreferredMode) {
      onSetPreferredMode(m);
    }
    onChange?.({ mode: m, phaseIndex: 0, data: initialData ?? {} });
  }, [onChange, initialData, onSetPreferredMode]);

  const handleRatingDone = useCallback((data: RatingData) => {
    onDone(data);
  }, [onDone]);

  const handleChange = useCallback((phaseIndex: number, data: Partial<RatingData>) => {
    if (data && (data.scores || data.tags || data.notes)) {
      const prev = liveDataRef.current;
      const merged: RatingData = {
        scores: { ...(prev?.scores ?? { nose: 0, palate: 0, finish: 0, overall: 0 }), ...(data.scores ?? {}) },
        tags: { ...(prev?.tags ?? { nose: [], palate: [], finish: [], overall: [] }), ...(data.tags ?? {}) },
        notes: { ...(prev?.notes ?? { nose: "", palate: "", finish: "", overall: "" }), ...(data.notes ?? {}) },
        overallExplicit: data.overallExplicit !== undefined ? data.overallExplicit : prev?.overallExplicit,
      };
      setLiveData(merged);
      liveDataRef.current = merged;
    }
    onChange?.({ mode, phaseIndex, data: liveDataRef.current ?? data });
  }, [mode, onChange]);

  const handleRatingBack = useCallback(() => {
    if (onSaveAsDraft) {
      onBack();
    } else {
      setStep("mode");
    }
  }, [onBack, onSaveAsDraft]);

  const handleSwitchMode = useCallback((next: "guided" | "compact" | "quick" | "tisch", makeDefault?: boolean) => {
    if (next === mode) return;
    if (makeDefault && onSetPreferredMode) {
      onSetPreferredMode(next);
    }
    setMode(next);
    onChange?.({ mode: next, phaseIndex: 0, data: liveDataRef.current ?? {} });
  }, [mode, onChange, onSetPreferredMode]);

  if (step === "mode") {
    return (
      <RatingModeSelect
        labels={modeLabels}
        onSelect={handleModeSelect}
        onBack={onBack}
        hideQuick={hideQuick}
        showTisch={showTisch}
        tischIsNew={!!showTisch && !tischSeen}
        showRememberToggle={!!onSetPreferredMode}
      />
    );
  }

  const subviewInitialData: RatingData | undefined = liveData ?? initialData;

  if (!mode) return null;

  const chipEl = (
    <RatingModeChip
      mode={mode}
      hideQuick={hideQuick}
      showTisch={showTisch}
      labels={chipLabels}
      allowSetDefault={!!onSetPreferredMode}
      onSwitch={handleSwitchMode}
    />
  );
  const chipSlot = chipInHeader
    ? (chipPortalTarget ? createPortal(chipEl, chipPortalTarget) : null)
    : chipEl;

  if (step === "rating" && mode === "guided") {
    return (
      <div style={{ position: "relative" }}>
        {chipSlot}
        <GuidedRating
          labels={guidedLabels}
          whisky={{ ...whisky, blind: whisky.blind ?? false, flavorProfile: whisky.flavorProfile }}
          initialData={subviewInitialData}
          initialPhaseIndex={initialPhaseIndex}
          onDone={handleRatingDone}
          onBack={handleRatingBack}
          onChange={handleChange}
          onSaveAsDraft={onSaveAsDraft}
          scale={scale}
        />
      </div>
    );
  }

  if (step === "rating" && mode === "compact") {
    return (
      <div style={{ position: "relative" }}>
        {chipSlot}
        <CompactRating
          labels={compactLabels}
          whisky={{ ...whisky, blind: whisky.blind ?? false, flavorProfile: whisky.flavorProfile }}
          initialData={subviewInitialData}
          onDone={handleRatingDone}
          onBack={handleRatingBack}
          onChange={handleChange}
          onSaveAsDraft={onSaveAsDraft}
          scale={scale}
        />
      </div>
    );
  }

  if (step === "rating" && mode === "quick") {
    return (
      <div style={{ position: "relative" }}>
        {chipSlot}
        <QuickRating
          labels={quickLabels}
          whisky={{ ...whisky, blind: whisky.blind ?? false }}
          initialData={subviewInitialData}
          onDone={handleRatingDone}
          onBack={onSaveAsDraft ? handleRatingBack : undefined}
          onChange={handleChange}
          onSaveAsDraft={onSaveAsDraft}
          autoSaveHint={autoSaveHint}
          scale={scale}
        />
      </div>
    );
  }

  if (step === "rating" && mode === "tisch") {
    return (
      <div style={{ position: "relative" }}>
        {chipSlot}
        <TischRating
          labels={tischLabels}
          whisky={{ ...whisky, blind: whisky.blind ?? false }}
          initialData={subviewInitialData}
          onDone={handleRatingDone}
          onBack={handleRatingBack}
          onChange={handleChange}
          scale={scale}
        />
      </div>
    );
  }

  return null;
}
