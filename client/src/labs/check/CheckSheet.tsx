import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Camera, Image as ImageIcon, Type, ScanLine, Loader2, type LucideIcon } from "lucide-react";
import ModalPortal from "@/labs/components/ModalPortal";
import { FONT } from "@/labs/components/rating/theme";
import {
  identifyByPhoto,
  lookupWhisky,
  RateLimitError,
  type CheckIdentifyCandidate,
  type CheckLookupResponse,
} from "./checkApi";
import CheckResultCard from "./CheckResultCard";

type CheckSheetProps = {
  open: boolean;
  onClose: () => void;
};

type Phase =
  | { kind: "pickup" }
  | { kind: "loading"; step: "identifying" | "looking-up" }
  | { kind: "result"; data: CheckLookupResponse }
  | { kind: "ambiguous"; candidates: CheckIdentifyCandidate[] }
  | { kind: "no-match" }
  | { kind: "rate-limited"; retryAfterSec: number }
  | { kind: "error"; message: string };

export default function CheckSheet({ open, onClose }: CheckSheetProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ kind: "pickup" });
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setPhase({ kind: "pickup" });
    }
  }, [open]);

  const handleFile = async (file: File) => {
    if (!file) return;
    setPhase({ kind: "loading", step: "identifying" });

    try {
      const identifyRes = await identifyByPhoto(file);
      const candidates = identifyRes.candidates || [];

      if (candidates.length === 0) {
        setPhase({ kind: "no-match" });
        return;
      }

      const top = candidates[0];

      if (top.whiskyId && top.confidence >= 0.4) {
        setPhase({ kind: "loading", step: "looking-up" });
        try {
          const lookupRes = await lookupWhisky(top.whiskyId);
          setPhase({ kind: "result", data: lookupRes });
        } catch (lookupErr) {
          const msg = lookupErr instanceof Error ? lookupErr.message : "Lookup failed";
          setPhase({ kind: "error", message: msg });
        }
        return;
      }

      setPhase({ kind: "ambiguous", candidates: candidates.slice(0, 3) });
    } catch (err) {
      if (err instanceof RateLimitError) {
        setPhase({ kind: "rate-limited", retryAfterSec: err.retryAfterSec });
        return;
      }
      const msg = err instanceof Error ? err.message : "Identifikation fehlgeschlagen";
      setPhase({ kind: "error", message: msg });
    }
  };

  const handleCameraClick = () => cameraRef.current?.click();
  const handleGalleryClick = () => galleryRef.current?.click();

  const onCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (cameraRef.current) cameraRef.current.value = "";
  };
  const onGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const handleSelectCandidate = async (candidate: CheckIdentifyCandidate) => {
    if (!candidate.whiskyId) return;
    setPhase({ kind: "loading", step: "looking-up" });
    try {
      const lookupRes = await lookupWhisky(candidate.whiskyId);
      setPhase({ kind: "result", data: lookupRes });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      setPhase({ kind: "error", message: msg });
    }
  };

  const resetToPickup = () => setPhase({ kind: "pickup" });

  return (
    <ModalPortal
      open={open}
      onClose={onClose}
      overlayStyle={{ alignItems: "flex-end", padding: 0 }}
      testId="check-sheet-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--labs-surface)",
          width: "100%",
          maxWidth: 640,
          maxHeight: "80vh",
          borderRadius: "20px 20px 0 0",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          overflow: "auto",
          animation: "checkSheetSlideUp 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        data-testid="check-sheet-panel"
      >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2
              style={{
                fontFamily: FONT.display,
                fontSize: 22,
                fontWeight: 600,
                color: "var(--labs-text)",
                margin: 0,
              }}
              data-testid="check-sheet-title"
            >
              {t("check.title", "Whisky-Check")}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "var(--labs-surface-elevated)",
                border: "1px solid var(--labs-border)",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--labs-text-secondary)",
              }}
              aria-label={t("ui.close", "Schließen")}
              data-testid="check-sheet-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={onCameraChange}
            data-testid="check-camera-input"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onGalleryChange}
            data-testid="check-gallery-input"
          />

          {phase.kind === "pickup" && (
            <CheckPickup onCamera={handleCameraClick} onGallery={handleGalleryClick} />
          )}
          {phase.kind === "loading" && <CheckLoading step={phase.step} />}
          {phase.kind === "result" && <CheckResultCard data={phase.data} />}
          {phase.kind === "ambiguous" && (
            <CheckAmbiguous
              candidates={phase.candidates}
              onSelect={handleSelectCandidate}
              onReset={resetToPickup}
            />
          )}
          {phase.kind === "no-match" && <CheckNoMatch onReset={resetToPickup} />}
          {phase.kind === "rate-limited" && (
            <CheckRateLimited retryAfterSec={phase.retryAfterSec} onClose={onClose} />
          )}
          {phase.kind === "error" && (
            <CheckError message={phase.message} onReset={resetToPickup} />
          )}
      </div>
    </ModalPortal>
  );
}

function CheckPickup({ onCamera, onGallery }: { onCamera: () => void; onGallery: () => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <p
        style={{
          fontFamily: FONT.serif,
          fontSize: 16,
          color: "var(--labs-text-secondary)",
          marginBottom: 16,
        }}
        data-testid="check-pickup-hint"
      >
        {t("check.pickup.hint", "Wie möchtest du den Whisky identifizieren?")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PickupButton
          icon={Camera}
          label={t("check.pickup.photo", "Foto aufnehmen")}
          onClick={onCamera}
          testid="check-pickup-photo"
        />
        <PickupButton
          icon={ImageIcon}
          label={t("check.pickup.gallery", "Foto auswählen")}
          onClick={onGallery}
          testid="check-pickup-gallery"
        />
        <PickupButton
          icon={Type}
          label={t("check.pickup.name", "Name eingeben (bald)")}
          onClick={() => {}}
          testid="check-pickup-name"
          disabled
        />
        <PickupButton
          icon={ScanLine}
          label={t("check.pickup.barcode", "Barcode (bald)")}
          onClick={() => {}}
          testid="check-pickup-barcode"
          disabled
        />
      </div>
    </div>
  );
}

function PickupButton({
  icon: Icon,
  label,
  onClick,
  testid,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  testid: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "20px 12px",
        borderRadius: 16,
        border: "1px solid var(--labs-border)",
        background: "var(--labs-surface-elevated)",
        color: disabled ? "var(--labs-text-muted)" : "var(--labs-text)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: FONT.body,
        transition: "transform 120ms ease",
      }}
      data-testid={testid}
    >
      <Icon className="w-6 h-6" style={{ color: "var(--labs-accent)" }} />
      <span>{label}</span>
    </button>
  );
}

function CheckLoading({ step }: { step: "identifying" | "looking-up" }) {
  const { t } = useTranslation();
  const label =
    step === "identifying"
      ? t("check.loading.identifying", "Identifiziere Whisky…")
      : t("check.loading.lookingUp", "Lade Daten…");
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--labs-text-secondary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        fontFamily: FONT.body,
      }}
      data-testid="check-loading"
    >
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--labs-accent)" }} />
      <p style={{ fontSize: 14 }}>{label}</p>
    </div>
  );
}

function CheckAmbiguous({
  candidates,
  onSelect,
  onReset,
}: {
  candidates: CheckIdentifyCandidate[];
  onSelect: (c: CheckIdentifyCandidate) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div data-testid="check-ambiguous">
      <p
        style={{
          fontFamily: FONT.serif,
          fontSize: 16,
          color: "var(--labs-text-secondary)",
          marginBottom: 16,
        }}
        data-testid="check-ambiguous-hint"
      >
        {t("check.ambiguous.hint", "Mehrere mögliche Treffer. Welcher passt?")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.map((c, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(c)}
            disabled={!c.whiskyId}
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid var(--labs-border)",
              background: "var(--labs-surface-elevated)",
              color: !c.whiskyId ? "var(--labs-text-muted)" : "var(--labs-text)",
              cursor: !c.whiskyId ? "not-allowed" : "pointer",
              opacity: !c.whiskyId ? 0.6 : 1,
              textAlign: "left",
              fontFamily: FONT.body,
            }}
            data-testid={`check-ambiguous-candidate-${idx}`}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {c.name || t("check.unknownWhisky", "Unbekannter Whisky")}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--labs-text-secondary)",
                marginTop: 4,
              }}
            >
              {c.distillery || "—"}
              {c.confidence ? ` · ${Math.round(c.confidence * 100)}% Konfidenz` : ""}
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={onReset}
        style={{
          marginTop: 16,
          padding: "10px 16px",
          background: "transparent",
          border: "1px solid var(--labs-border)",
          borderRadius: 8,
          color: "var(--labs-text-secondary)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: FONT.body,
        }}
        data-testid="check-ambiguous-reset"
      >
        {t("check.tryAgain", "Erneut versuchen")}
      </button>
    </div>
  );
}

function CheckNoMatch({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
        color: "var(--labs-text-secondary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        fontFamily: FONT.body,
      }}
      data-testid="check-no-match"
    >
      <p style={{ fontSize: 15 }}>
        {t("check.noMatch", "Keine eindeutige Identifikation.")}
      </p>
      <p style={{ fontSize: 13, opacity: 0.7, maxWidth: 320 }}>
        {t(
          "check.noMatchHint",
          "Versuche ein klareres Foto des Labels oder gib den Namen manuell ein (bald verfügbar).",
        )}
      </p>
      <button
        onClick={onReset}
        style={{
          padding: "10px 20px",
          background: "var(--labs-accent)",
          border: "none",
          borderRadius: 8,
          color: "var(--labs-bg)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT.body,
        }}
        data-testid="check-no-match-reset"
      >
        {t("check.tryAgain", "Erneut versuchen")}
      </button>
    </div>
  );
}

function CheckRateLimited({
  retryAfterSec,
  onClose,
}: {
  retryAfterSec: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const minutes = Math.ceil(retryAfterSec / 60);
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
        color: "var(--labs-text-secondary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        fontFamily: FONT.body,
      }}
      data-testid="check-rate-limited"
    >
      <p style={{ fontSize: 15 }}>{t("check.rateLimited", "Zu viele Anfragen.")}</p>
      <p style={{ fontSize: 13, opacity: 0.7, maxWidth: 320 }}>
        {t(
          "check.rateLimitedHint",
          "Bitte in ca. {{min}} Minute(n) erneut versuchen oder anmelden.",
          { min: minutes },
        )}
      </p>
      <button
        onClick={onClose}
        style={{
          padding: "10px 20px",
          background: "var(--labs-surface-elevated)",
          border: "1px solid var(--labs-border)",
          borderRadius: 8,
          color: "var(--labs-text-secondary)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: FONT.body,
        }}
        data-testid="check-rate-limited-close"
      >
        {t("ui.close", "Schließen")}
      </button>
    </div>
  );
}

function CheckError({ message, onReset }: { message: string; onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
        color: "var(--labs-text-secondary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        fontFamily: FONT.body,
      }}
      data-testid="check-error"
    >
      <p style={{ fontSize: 15, color: "var(--labs-text)" }}>
        {t("check.error", "Etwas ist schiefgegangen.")}
      </p>
      <p style={{ fontSize: 12, opacity: 0.6, maxWidth: 320 }}>{message}</p>
      <button
        onClick={onReset}
        style={{
          padding: "10px 20px",
          background: "var(--labs-accent)",
          border: "none",
          borderRadius: 8,
          color: "var(--labs-bg)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT.body,
        }}
        data-testid="check-error-reset"
      >
        {t("check.tryAgain", "Erneut versuchen")}
      </button>
    </div>
  );
}
