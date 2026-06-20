import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FONT, SP, RADIUS, LABS_THEME, TOUCH_MIN } from "@/labs/components/rating/theme";
import SoloCaptureScreen, { type CapturedWhisky } from "./SoloCaptureScreen";
import SoloWhiskyForm from "./SoloWhiskyForm";

interface Props {
  participantId: string;
  isAuthenticated: boolean;
  /**
   * Ordnet den identifizierten Whisky dem bereits erfassten Eindruck + Bewertung zu
   * und finalisiert das Speichern. w === null bedeutet "Ohne Namen speichern".
   */
  onResolve: (w: CapturedWhisky | null, imageFile?: File | null) => void;
}

/**
 * Namens-Nachtrag mit voller Methodenwahl (Foto / Hochladen / Barcode / Sammlung / Manuell).
 * Erscheint NUR im Eindruck-zuerst-Pfad, NACHDEM Eindruck + Bewertung festgehalten wurden,
 * damit die Identifikation nie vor dem ersten Eindruck steht (Nordstern). Der hier bestimmte
 * Whisky wird dem bestehenden Eintrag zugeordnet (kein neuer Eintrag) - das traegt DNA,
 * Sensorische Signatur und Vergleiche. Vollstaendig ueberspringbar via "Ohne Namen speichern".
 */
export default function SoloNamingCapture({ participantId, isAuthenticated, onResolve }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"choose" | "confirm">("choose");
  const [draft, setDraft] = useState<CapturedWhisky | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [nameInput, setNameInput] = useState("");

  if (phase === "confirm") {
    return (
      <SoloWhiskyForm
        initial={draft || undefined}
        fromAI={draft?.fromAI}
        initialImageFile={imageFile}
        onSubmit={(w, img) => onResolve(w, img)}
        onBack={() => setPhase("choose")}
        submitLabel={t("v2.solo.namingContinue", "Weiter")}
      />
    );
  }

  return (
    <div className="labs-fade-in" style={{ maxWidth: 440, margin: "0 auto" }}>
      <div style={{ padding: "0 var(--labs-space-md)", marginBottom: SP.md }}>
        <div style={{ fontFamily: FONT.display, fontSize: 26, color: LABS_THEME.text, marginBottom: SP.sm }}>
          {t("v2.solo.namingTitle", "Wie hie\u00df der Dram?")}
        </div>
        <div style={{ fontFamily: FONT.serif, fontSize: 17, color: LABS_THEME.muted, lineHeight: 1.45 }}>
          {t(
            "v2.solo.namingSub",
            "Damit dein Eindruck sp\u00e4ter zu diesem Whisky findet \u2014 f\u00fcr DNA, Signatur und Vergleiche. Du kannst das auch \u00fcberspringen.",
          )}
        </div>
      </div>

      <div style={{ padding: "0 var(--labs-space-md)", marginBottom: SP.lg }}>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder={t("v2.solo.namingNamePlaceholder", "z.B. Lagavulin 16")}
          data-testid="solo-naming-name-input"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: LABS_THEME.inputBg,
            border: `1px solid ${LABS_THEME.border}`,
            borderRadius: RADIUS.md,
            color: LABS_THEME.text,
            fontFamily: FONT.serif,
            fontSize: 16,
            minHeight: TOUCH_MIN,
            padding: SP.md,
          }}
        />
        <button
          type="button"
          disabled={nameInput.trim().length < 2}
          onClick={() => onResolve({ name: nameInput.trim(), distillery: "", country: "", region: "", cask: "", age: "", abv: "", fromAI: false })}
          data-testid="solo-naming-name-submit"
          className="labs-btn-primary"
          style={{ width: "100%", minHeight: TOUCH_MIN, marginTop: SP.sm }}
        >
          {t("v2.solo.namingNameSubmit", "Weiter")}
        </button>
      </div>

      <div style={{ padding: "0 var(--labs-space-md)", marginBottom: SP.md }}>
        <span className="labs-section-label">{t("v2.solo.namingOrMethods", "Oder per Foto, Barcode oder Sammlung")}</span>
      </div>

      <SoloCaptureScreen
        participantId={participantId}
        isAuthenticated={isAuthenticated}
        onManual={() => { setDraft(null); setImageFile(null); setPhase("confirm"); }}
        onCaptured={(w, img) => { setDraft(w); setImageFile(img || null); setPhase("confirm"); }}
        onBarcode={(code) => { setDraft({ name: code, distillery: "", country: "", region: "", cask: "", age: "", abv: "", fromAI: false, barcodeValue: code }); setImageFile(null); setPhase("confirm"); }}
        onCollectionSelect={(w) => onResolve(w)}
        onBack={() => {}}
        hideBack
        hideHeader
      />

      <div style={{ padding: "var(--labs-space-md) var(--labs-space-md) var(--labs-space-lg)" }}>
        <button
          type="button"
          onClick={() => onResolve(null)}
          data-testid="solo-naming-skip"
          className="labs-btn-ghost"
          style={{ width: "100%", minHeight: TOUCH_MIN, color: LABS_THEME.muted }}
        >
          {t("v2.solo.namingSkip", "Ohne Namen speichern")}
        </button>
      </div>
    </div>
  );
}
