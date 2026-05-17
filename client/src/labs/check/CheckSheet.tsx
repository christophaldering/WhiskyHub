import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Camera, Image as ImageIcon, Type, ScanLine } from "lucide-react";
import ModalPortal from "@/labs/components/ModalPortal";

type CheckSheetProps = {
  open: boolean;
  onClose: () => void;
};

type Phase = "pickup" | "loading" | "result" | "error";

export default function CheckSheet({ open, onClose }: CheckSheetProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("pickup");

  useEffect(() => {
    if (open) {
      setPhase("pickup");
    }
  }, [open]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
        data-testid="check-sheet-backdrop"
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
                fontFamily: "'Playfair Display', serif",
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

          {phase === "pickup" && <CheckPickup />}
          {phase === "loading" && <CheckLoading />}
          {phase === "result" && <CheckResultPlaceholder />}
          {phase === "error" && <CheckErrorPlaceholder />}

          <div
            style={{
              marginTop: "auto",
              paddingTop: 12,
              borderTop: "1px dashed var(--labs-border)",
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              fontSize: 11,
              color: "var(--labs-text-muted)",
            }}
            data-testid="check-sheet-dev-switcher"
          >
            <span style={{ alignSelf: "center" }}>Dev-Preview:</span>
            {(["pickup", "loading", "result", "error"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--labs-border)",
                  background: phase === p ? "var(--labs-accent-muted)" : "transparent",
                  color: "var(--labs-text-secondary)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "'DM Sans', sans-serif",
                }}
                data-testid={`check-phase-${p}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function CheckPickup() {
  const { t } = useTranslation();
  const buttons = [
    { icon: Camera, label: t("check.pickup.photo", "Foto aufnehmen"), testid: "check-pickup-photo", disabled: false },
    { icon: ImageIcon, label: t("check.pickup.gallery", "Foto auswählen"), testid: "check-pickup-gallery", disabled: false },
    { icon: Type, label: t("check.pickup.name", "Name eingeben"), testid: "check-pickup-name", disabled: false },
    { icon: ScanLine, label: t("check.pickup.barcode", "Barcode (bald)"), testid: "check-pickup-barcode", disabled: true },
  ];
  return (
    <div>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 16,
          color: "var(--labs-text-secondary)",
          marginBottom: 16,
        }}
        data-testid="check-pickup-hint"
      >
        {t("check.pickup.hint", "Wie möchtest du den Whisky identifizieren?")}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {buttons.map(({ icon: Icon, label, testid, disabled }) => (
          <button
            key={testid}
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
              fontFamily: "'DM Sans', sans-serif",
              transition: "transform 120ms ease",
            }}
            data-testid={testid}
          >
            <Icon className="w-6 h-6" style={{ color: "var(--labs-accent)" }} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckLoading() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--labs-text-secondary)",
      }}
      data-testid="check-loading"
    >
      <p style={{ fontSize: 14 }}>{t("check.loading", "Identifiziere…")}</p>
      <p style={{ fontSize: 12, marginTop: 8, opacity: 0.6 }}>
        (Skelett-Platzhalter, kommt in Stufe 2b)
      </p>
    </div>
  );
}

function CheckResultPlaceholder() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: "24px 0",
        color: "var(--labs-text-secondary)",
      }}
      data-testid="check-result-placeholder"
    >
      <p style={{ fontSize: 14, marginBottom: 16 }}>
        {t("check.resultPlaceholder", "Hier erscheinen die Status-Karten:")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {["Identifikation", "Community-Bewertung", "Deine Historie", "Aktionen"].map((label) => (
          <div
            key={label}
            style={{
              padding: 16,
              borderRadius: 12,
              border: "1px dashed var(--labs-border)",
              background: "var(--labs-surface-elevated)",
              fontSize: 13,
              color: "var(--labs-text-muted)",
            }}
            data-testid={`check-result-card-${label.toLowerCase()}`}
          >
            {label} — Platzhalter
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckErrorPlaceholder() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: "32px 24px",
        textAlign: "center",
        color: "var(--labs-text-secondary)",
      }}
      data-testid="check-error-placeholder"
    >
      <p style={{ fontSize: 14, marginBottom: 8 }}>
        {t("check.errorPlaceholder", "Hier erscheint später eine Fehlermeldung.")}
      </p>
      <p style={{ fontSize: 12, opacity: 0.6 }}>(Skelett-Platzhalter)</p>
    </div>
  );
}
