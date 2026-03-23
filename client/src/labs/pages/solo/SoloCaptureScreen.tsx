import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, PenLine, Barcode, SkipForward, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import BottleRecognitionFeedback, { type BottleRecognitionResult } from "@/labs/components/BottleRecognitionFeedback";

export interface CapturedWhisky {
  name: string;
  distillery: string;
  region: string;
  cask: string;
  age: string;
  abv: string;
  fromAI: boolean;
  barcodeValue?: string;
}

interface Props {
  participantId: string;
  onManual: () => void;
  onCaptured: (w: CapturedWhisky) => void;
  onBarcode: (barcode: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

type Status = "idle" | "identifying" | "error" | "barcode" | "feedback";

export default function SoloCaptureScreen({ participantId, onManual, onCaptured, onBarcode, onSkip, onBack }: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [aiResult, setAiResult] = useState<BottleRecognitionResult | null>(null);

  const handlePhoto = () => {
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("identifying");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("participantId", participantId);

      const res = await fetch("/api/journal/identify-bottle", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("v2.solo.identifyFail", "Identification failed"));
      }

      const data = await res.json();
      const whiskies = Array.isArray(data.whiskies) ? data.whiskies : [];
      const bottle = whiskies[0] || {};

      const recognitionResult: BottleRecognitionResult = {
        whiskyName: bottle.whiskyName || bottle.matchedExisting || "",
        distillery: bottle.distillery || "",
        region: bottle.region || "",
        caskType: bottle.caskType || "",
        age: bottle.age ? String(bottle.age) : "",
        abv: bottle.abv ? String(bottle.abv) : "",
        confidence: typeof bottle.confidence === "number" ? bottle.confidence : 75,
      };
      setAiResult(recognitionResult);
      setStatus("feedback");
    } catch (err: unknown) {
      setStatus("error");
      const message = err instanceof Error ? err.message : t("v2.solo.identifyFail", "Identification failed");
      setErrorMsg(message);
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleBarcodeSubmit = () => {
    const trimmed = barcodeValue.trim();
    if (trimmed.length > 0) {
      onBarcode(trimmed);
    }
  };

  const handleFeedbackConfirm = (data: BottleRecognitionResult) => {
    onCaptured({
      name: data.whiskyName,
      distillery: data.distillery,
      region: data.region,
      cask: data.caskType,
      age: data.age,
      abv: data.abv,
      fromAI: true,
    });
  };

  const handleFeedbackDismiss = () => {
    setAiResult(null);
    setStatus("idle");
  };

  if (status === "feedback" && aiResult) {
    return (
      <div className="labs-fade-in" style={{ padding: "var(--labs-space-xl) var(--labs-space-md)", minHeight: 400 }}>
        <BottleRecognitionFeedback
          result={aiResult}
          participantId={participantId}
          onConfirm={handleFeedbackConfirm}
          onDismiss={handleFeedbackDismiss}
        />
      </div>
    );
  }

  if (status === "identifying") {
    return (
      <div className="labs-fade-in" style={{
        padding: "var(--labs-space-xl) var(--labs-space-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        gap: "var(--labs-space-lg)",
      }}>
        <Loader2 size={48} style={{ color: "var(--labs-phase-nose)", animation: "spin 1s linear infinite" }} />
        <p className="ty-body" style={{ color: "var(--labs-text-muted)" }} data-testid="solo-identifying-text">
          {t("v2.solo.identifying", "Identifying whisky...")}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="labs-fade-in" style={{
        padding: "var(--labs-space-xl) var(--labs-space-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        gap: "var(--labs-space-lg)",
      }}>
        <AlertTriangle size={48} style={{ color: "var(--labs-danger)" }} />
        <p className="ty-body" style={{ color: "var(--labs-text)", textAlign: "center" }} data-testid="solo-error-text">
          {t("v2.solo.identifyFail", "Identification failed")}
        </p>
        {errorMsg && (
          <p className="ty-caption" style={{ color: "var(--labs-text-muted)", textAlign: "center" }}>
            {errorMsg}
          </p>
        )}
        <button
          onClick={() => { setStatus("idle"); setErrorMsg(""); }}
          data-testid="solo-retry-btn"
          className="labs-card"
          style={{
            padding: "var(--labs-space-sm) var(--labs-space-lg)",
            minHeight: 44,
            borderRadius: "var(--labs-radius-xl)",
            color: "var(--labs-text)",
            fontFamily: "var(--font-ui)",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {t("v2.solo.identifyRetry", "Try again")}
        </button>
      </div>
    );
  }

  if (status === "barcode") {
    return (
      <div className="labs-fade-in" style={{ padding: "var(--labs-space-xl) var(--labs-space-md)" }}>
        <button
          onClick={() => { setStatus("idle"); setBarcodeValue(""); }}
          data-testid="solo-barcode-back-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--labs-space-sm)",
            background: "none",
            border: "none",
            color: "var(--labs-accent)",
            fontFamily: "var(--font-ui)",
            fontSize: 15,
            cursor: "pointer",
            padding: 0,
            marginBottom: "var(--labs-space-lg)",
          }}
        >
          <ArrowLeft size={18} />
          {t("v2.back", "Back")}
        </button>

        <h2 className="ty-section-title" style={{ marginBottom: "var(--labs-space-lg)" }}>
          {t("v2.solo.barcodeInput", "Enter barcode")}
        </h2>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--labs-space-lg)",
          padding: "var(--labs-space-xl) 0",
        }}>
          <Barcode size={48} style={{ color: "var(--labs-phase-finish)" }} />

          <input
            type="text"
            inputMode="numeric"
            value={barcodeValue}
            onChange={(e) => setBarcodeValue(e.target.value)}
            placeholder={t("v2.solo.barcodeInputPH", "EAN / UPC number")}
            autoFocus
            data-testid="solo-barcode-input"
            style={{
              width: "100%",
              maxWidth: 300,
              minHeight: 44,
              padding: "var(--labs-space-sm) var(--labs-space-md)",
              borderRadius: "var(--labs-radius-sm)",
              border: "1px solid var(--labs-border)",
              background: "var(--labs-surface)",
              color: "var(--labs-text)",
              fontFamily: "var(--font-ui)",
              fontSize: 18,
              textAlign: "center",
              letterSpacing: "0.1em",
              outline: "none",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeSubmit(); }}
          />

          <p className="ty-caption" style={{ color: "var(--labs-text-muted)", textAlign: "center" }}>
            {t("v2.solo.barcodeDesc", "Read an EAN or QR code")}
          </p>

          <button
            onClick={handleBarcodeSubmit}
            disabled={barcodeValue.trim().length === 0}
            data-testid="solo-barcode-submit-btn"
            style={{
              width: "100%",
              maxWidth: 300,
              minHeight: 44,
              borderRadius: "var(--labs-radius-xl)",
              border: "none",
              background: barcodeValue.trim().length > 0 ? "var(--labs-phase-finish)" : "var(--labs-surface-hover)",
              color: barcodeValue.trim().length > 0 ? "#0e0b05" : "var(--labs-text-muted)",
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 700,
              cursor: barcodeValue.trim().length > 0 ? "pointer" : "default",
              opacity: barcodeValue.trim().length > 0 ? 1 : 0.5,
              transition: "all 0.2s",
            }}
          >
            {t("v2.solo.barcodeSubmit", "Continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="labs-fade-in" style={{ padding: "var(--labs-space-xl) var(--labs-space-md)" }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
        data-testid="solo-file-input"
      />

      <button
        onClick={onBack}
        data-testid="solo-back-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--labs-space-sm)",
          background: "none",
          border: "none",
          color: "var(--labs-accent)",
          fontFamily: "var(--font-ui)",
          fontSize: 15,
          cursor: "pointer",
          padding: 0,
          marginBottom: "var(--labs-space-lg)",
        }}
      >
        <ArrowLeft size={18} />
        {t("v2.back", "Back")}
      </button>

      <h2 className="ty-section-title" data-testid="solo-title" style={{ marginBottom: "var(--labs-space-sm)" }}>
        {t("v2.solo.title", "Log a Dram")}
      </h2>

      <p className="ty-body" style={{
        color: "var(--labs-text-muted)",
        marginBottom: "var(--labs-space-xl)",
      }} data-testid="solo-capture-sub">
        {t("v2.solo.captureSub", "How would you like to capture the whisky?")}
      </p>

      <button
        onClick={handlePhoto}
        data-testid="solo-photo-btn"
        className="labs-card-interactive"
        style={{
          width: "100%",
          height: 120,
          borderRadius: "var(--labs-radius-lg)",
          border: "1px solid var(--labs-phase-nose)",
          background: "var(--labs-phase-nose-dim)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--labs-space-sm)",
          cursor: "pointer",
          marginBottom: "var(--labs-space-lg)",
        }}
      >
        <Camera size={36} style={{ color: "var(--labs-phase-nose)" }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--labs-text)" }}>
          {t("v2.solo.photo", "Take a Photo")}
        </span>
        <span className="ty-caption" style={{ color: "var(--labs-text-muted)" }}>
          {t("v2.solo.photoDesc", "Photograph the bottle and identify via AI")}
        </span>
      </button>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--labs-space-md)",
        marginBottom: "var(--labs-space-lg)",
      }}>
        <button
          onClick={onManual}
          data-testid="solo-manual-btn"
          className="labs-card labs-card-interactive"
          style={{
            padding: "var(--labs-space-md)",
            borderRadius: "var(--labs-radius)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--labs-space-sm)",
            cursor: "pointer",
            minHeight: 80,
          }}
        >
          <PenLine size={24} style={{ color: "var(--labs-phase-palate)" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
            {t("v2.solo.manual", "Manual Entry")}
          </span>
          <span className="ty-caption" style={{ color: "var(--labs-text-muted)", textAlign: "center" }}>
            {t("v2.solo.manualDesc", "Enter name, distillery, and details yourself")}
          </span>
        </button>

        <button
          onClick={() => setStatus("barcode")}
          data-testid="solo-barcode-btn"
          className="labs-card labs-card-interactive"
          style={{
            padding: "var(--labs-space-md)",
            borderRadius: "var(--labs-radius)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--labs-space-sm)",
            cursor: "pointer",
            minHeight: 80,
          }}
        >
          <Barcode size={24} style={{ color: "var(--labs-phase-finish)" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
            {t("v2.solo.barcode", "Scan Barcode")}
          </span>
          <span className="ty-caption" style={{ color: "var(--labs-text-muted)", textAlign: "center" }}>
            {t("v2.solo.barcodeDesc", "Read an EAN or QR code")}
          </span>
        </button>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--labs-space-md)",
        marginBottom: "var(--labs-space-lg)",
      }}>
        <div style={{ flex: 1, height: 1, background: "var(--labs-border)" }} />
      </div>

      <button
        onClick={onSkip}
        data-testid="solo-skip-btn"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--labs-space-sm)",
          padding: "var(--labs-space-sm)",
          minHeight: 44,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--labs-text-muted)",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
        }}
      >
        <SkipForward size={18} />
        {t("v2.solo.skip", "Rate without details")}
      </button>
    </div>
  );
}
