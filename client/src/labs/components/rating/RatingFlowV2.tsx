import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LABS_THEME } from "./theme";
import type { RatingData } from "./types";
import RatingModeSelect from "./RatingModeSelect";
import GuidedRating from "./GuidedRating";
import CompactRating from "./CompactRating";

interface RatingFlowV2Props {
  whisky: {
    name?: string;
    region?: string;
    cask?: string;
  };
  onDone: (data: RatingData) => void;
  onBack: () => void;
}

type Step = "mode" | "rating";

export default function RatingFlowV2({ whisky, onDone, onBack }: RatingFlowV2Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"guided" | "compact" | null>(null);
  const [step, setStep] = useState<Step>("mode");

  const th = LABS_THEME;

  const modeLabels = useMemo(() => ({
    modeQ: t("v2.ratingModeQ", "Wie moechtest du bewerten?"),
    modeSub: t("v2.ratingModeSub", "Beide Modi erfassen Nase, Gaumen, Abgang und Gesamt."),
    guided: t("v2.ratingGuided", "Gefuehrt"),
    guidedD: t("v2.ratingGuidedD", "Eine Dimension nach der anderen -- mit Fragen und Aroma-Vorschlaegen."),
    guidedH: t("v2.ratingGuidedH", "Wenn man sich Zeit nimmt."),
    compact: t("v2.ratingCompact", "Kompakt"),
    compactD: t("v2.ratingCompactD", "Alle vier Dimensionen auf einmal -- Score direkt eingeben."),
    compactH: t("v2.ratingCompactH", "Wenn man sein Bewertungsschema kennt."),
    back: t("v2.back", "Zurueck"),
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
    finish2: t("v2.ratingFinish2", "Bewertung abschliessen"),
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

  const handleModeSelect = useCallback((m: "guided" | "compact") => {
    setMode(m);
    setStep("rating");
  }, []);

  const handleRatingDone = useCallback((data: RatingData) => {
    onDone(data);
  }, [onDone]);

  if (step === "mode") {
    return (
      <RatingModeSelect
        th={th}
        labels={modeLabels}
        onSelect={handleModeSelect}
        onBack={onBack}
      />
    );
  }

  if (step === "rating" && mode === "guided") {
    return (
      <GuidedRating
        th={th}
        labels={guidedLabels}
        whisky={{ ...whisky, blind: false }}
        onDone={handleRatingDone}
        onBack={() => setStep("mode")}
      />
    );
  }

  if (step === "rating" && mode === "compact") {
    return (
      <CompactRating
        th={th}
        labels={compactLabels}
        whisky={{ ...whisky, blind: false }}
        onDone={handleRatingDone}
        onBack={() => setStep("mode")}
      />
    );
  }

  return null;
}
