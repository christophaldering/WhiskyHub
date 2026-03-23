import { useRef, useState } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Camera, Edit, Barcode, Skip, Spinner, AlertTriangle } from "../../icons";
import BottleRecognitionFeedback, { type BottleRecognitionResult } from "../../components/BottleRecognitionFeedback";
import SubScreenHeader from "../meinewelt/SubScreenHeader";

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
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onManual: () => void;
  onCaptured: (w: CapturedWhisky) => void;
  onBarcode: (barcode: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

type Status = "idle" | "identifying" | "error" | "barcode" | "feedback";

export default function SoloCaptureScreen({ th, t, participantId, onManual, onCaptured, onBarcode, onSkip, onBack }: Props) {
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
        throw new Error(data.message || t.soloIdentifyFail);
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
      const message = err instanceof Error ? err.message : t.soloIdentifyFail;
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

  const nosePhase = th.phases.nose;

  if (status === "feedback" && aiResult) {
    return (
      <div className="v2-fade-up" style={{
        padding: `${SP.xl}px ${SP.md}px`,
        minHeight: 400,
      }}>
        <BottleRecognitionFeedback
          th={th}
          t={t}
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
      <div className="v2-fade-up" style={{
        padding: `${SP.xl}px ${SP.md}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        gap: SP.lg,
      }}>
        <Spinner color={nosePhase.accent} size={48} />
        <p style={{ fontFamily: FONT.body, fontSize: 16, color: th.muted }} data-testid="solo-identifying-text">
          {t.soloIdentifying}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="v2-fade-up" style={{
        padding: `${SP.xl}px ${SP.md}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        gap: SP.lg,
      }}>
        <AlertTriangle color={th.amber} size={48} />
        <p style={{ fontFamily: FONT.body, fontSize: 16, color: th.text, textAlign: "center" }} data-testid="solo-error-text">
          {t.soloIdentifyFail}
        </p>
        {errorMsg && (
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: th.muted, textAlign: "center" }}>
            {errorMsg}
          </p>
        )}
        <button
          onClick={() => { setStatus("idle"); setErrorMsg(""); }}
          data-testid="solo-retry-btn"
          style={{
            padding: `${SP.sm}px ${SP.lg}px`,
            minHeight: TOUCH_MIN,
            borderRadius: RADIUS.full,
            border: `1px solid ${th.border}`,
            background: th.bgCard,
            color: th.text,
            fontFamily: FONT.body,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {t.soloIdentifyRetry}
        </button>
      </div>
    );
  }

  if (status === "barcode") {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
        <SubScreenHeader th={th} title={t.soloBarcodeInput} onBack={() => { setStatus("idle"); setBarcodeValue(""); }} backTestId="solo-barcode-back-btn" />

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: SP.lg,
          padding: `${SP.xl}px 0`,
        }}>
          <Barcode color={th.phases.finish.accent} size={48} />

          <input
            type="text"
            inputMode="numeric"
            value={barcodeValue}
            onChange={(e) => setBarcodeValue(e.target.value)}
            placeholder={t.soloBarcodeInputPH}
            autoFocus
            data-testid="solo-barcode-input"
            style={{
              width: "100%",
              maxWidth: 300,
              minHeight: TOUCH_MIN,
              padding: `${SP.sm}px ${SP.md}px`,
              borderRadius: RADIUS.md,
              border: `1px solid ${th.border}`,
              background: th.inputBg,
              color: th.text,
              fontFamily: FONT.body,
              fontSize: 18,
              textAlign: "center",
              letterSpacing: "0.1em",
              outline: "none",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeSubmit(); }}
          />

          <p style={{ fontFamily: FONT.body, fontSize: 13, color: th.muted, textAlign: "center" }}>
            {t.soloBarcodeDesc}
          </p>

          <button
            onClick={handleBarcodeSubmit}
            disabled={barcodeValue.trim().length === 0}
            data-testid="solo-barcode-submit-btn"
            style={{
              width: "100%",
              maxWidth: 300,
              minHeight: TOUCH_MIN,
              borderRadius: RADIUS.full,
              border: "none",
              background: barcodeValue.trim().length > 0 ? th.phases.finish.accent : th.bgHover,
              color: barcodeValue.trim().length > 0 ? "#0e0b05" : th.faint,
              fontFamily: FONT.display,
              fontSize: 16,
              fontWeight: 700,
              cursor: barcodeValue.trim().length > 0 ? "pointer" : "default",
              opacity: barcodeValue.trim().length > 0 ? 1 : 0.5,
              transition: "all 0.2s",
            }}
          >
            {t.soloBarcodeSubmit}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
        data-testid="solo-file-input"
      />

      <SubScreenHeader th={th} title={t.soloTitle} onBack={onBack} backTestId="solo-back-btn" titleTestId="solo-title" />

      <p style={{
        fontFamily: FONT.body,
        fontSize: 15,
        color: th.muted,
        marginBottom: SP.xl,
      }} data-testid="solo-capture-sub">
        {t.soloCaptureSub}
      </p>

      <button
        onClick={handlePhoto}
        data-testid="solo-photo-btn"
        style={{
          width: "100%",
          height: 120,
          borderRadius: RADIUS.xl,
          border: `2px dashed ${nosePhase.accent}`,
          background: nosePhase.dim,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.sm,
          cursor: "pointer",
          marginBottom: SP.lg,
        }}
      >
        <Camera color={nosePhase.accent} size={36} />
        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: th.text }}>
          {t.soloPhoto}
        </span>
        <span style={{ fontFamily: FONT.body, fontSize: 13, color: th.muted }}>
          {t.soloPhotoDesc}
        </span>
      </button>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: SP.md,
        marginBottom: SP.lg,
      }}>
        <button
          onClick={onManual}
          data-testid="solo-manual-btn"
          style={{
            padding: SP.md,
            borderRadius: RADIUS.lg,
            border: `1px solid ${th.border}`,
            background: th.bgCard,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: SP.sm,
            cursor: "pointer",
            minHeight: TOUCH_MIN + SP.lg,
          }}
        >
          <Edit color={th.phases.palate.accent} size={24} />
          <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 600, color: th.text }}>
            {t.soloManual}
          </span>
          <span style={{ fontFamily: FONT.body, fontSize: 12, color: th.muted, textAlign: "center" }}>
            {t.soloManualDesc}
          </span>
        </button>

        <button
          onClick={() => setStatus("barcode")}
          data-testid="solo-barcode-btn"
          style={{
            padding: SP.md,
            borderRadius: RADIUS.lg,
            border: `1px solid ${th.border}`,
            background: th.bgCard,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: SP.sm,
            cursor: "pointer",
            minHeight: TOUCH_MIN + SP.lg,
          }}
        >
          <Barcode color={th.phases.finish.accent} size={24} />
          <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 600, color: th.text }}>
            {t.soloBarcode}
          </span>
          <span style={{ fontFamily: FONT.body, fontSize: 12, color: th.muted, textAlign: "center" }}>
            {t.soloBarcodeDesc}
          </span>
        </button>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: SP.md,
        marginBottom: SP.lg,
      }}>
        <div style={{ flex: 1, height: 1, background: th.border }} />
      </div>

      <button
        onClick={onSkip}
        data-testid="solo-skip-btn"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.sm,
          padding: `${SP.sm}px`,
          minHeight: TOUCH_MIN,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: th.muted,
          fontFamily: FONT.body,
          fontSize: 14,
        }}
      >
        <Skip color={th.muted} size={18} />
        {t.soloSkip}
      </button>
    </div>
  );
}
