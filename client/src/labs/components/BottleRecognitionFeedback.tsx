import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export interface BottleRecognitionResult {
  whiskyName: string;
  distillery: string;
  country: string;
  region: string;
  caskType: string;
  age: string;
  abv: string;
  confidence: number;
}

type Mode = "review" | "editing" | "confirmed" | "rejected";

interface Props {
  result: BottleRecognitionResult;
  participantId: string;
  onConfirm: (data: BottleRecognitionResult) => void;
  onDismiss: () => void;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return "var(--labs-success, #4caf50)";
  if (confidence >= 60) return "var(--labs-accent, #d4a847)";
  return "var(--labs-danger, #e53935)";
}

async function sendFeedback(payload: {
  original: BottleRecognitionResult;
  corrected?: BottleRecognitionResult;
  action: "confirm" | "edit" | "reject";
  participantId: string;
  timestamp: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/bottle-recognition/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("non-ok");
    return true;
  } catch {
    try {
      const pending = JSON.parse(localStorage.getItem("bottleFeedbackQueue") || "[]");
      pending.push(payload);
      localStorage.setItem("bottleFeedbackQueue", JSON.stringify(pending));
    } catch {}
    return false;
  }
}

export default function BottleRecognitionFeedback({ result, participantId, onConfirm, onDismiss }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("review");
  const [edited, setEdited] = useState<BottleRecognitionResult>({ ...result });

  useEffect(() => {
    if (mode === "confirmed") {
      const timer = setTimeout(() => onConfirm(edited), 800);
      return () => clearTimeout(timer);
    }
    if (mode === "rejected") {
      const timer = setTimeout(() => onDismiss(), 800);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const handleConfirm = () => {
    sendFeedback({ original: result, action: "confirm", participantId, timestamp: new Date().toISOString() });
    setMode("confirmed");
  };

  const handleReject = () => {
    sendFeedback({ original: result, action: "reject", participantId, timestamp: new Date().toISOString() });
    setMode("rejected");
  };

  const handleSaveEdit = () => {
    sendFeedback({ original: result, corrected: edited, action: "edit", participantId, timestamp: new Date().toISOString() });
    setMode("confirmed");
  };

  const confidence = result.confidence ?? 0;
  const confColor = confidenceColor(confidence);
  const lowConf = confidence < 70;

  if (mode === "confirmed") {
    return (
      <div data-testid="recognition-confirmed" className="flex flex-col items-center justify-center py-12 gap-3">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--labs-success, #4caf50)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    );
  }

  if (mode === "rejected") {
    return (
      <div data-testid="recognition-rejected" className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-base" style={{ color: "var(--labs-text-secondary)" }}>
          {t("v2.recognition.rejected", "Result dismissed")}
        </p>
      </div>
    );
  }

  const fields: { key: keyof BottleRecognitionResult; labelKey: string; fallback: string }[] = [
    { key: "whiskyName", labelKey: "v2.recognition.labelName", fallback: "Name" },
    { key: "distillery", labelKey: "v2.recognition.labelDistillery", fallback: "Distillery" },
    { key: "country", labelKey: "v2.recognition.labelCountry", fallback: "Country" },
    { key: "region", labelKey: "v2.recognition.labelRegion", fallback: "Region" },
    { key: "age", labelKey: "v2.recognition.labelAge", fallback: "Age" },
    { key: "abv", labelKey: "v2.recognition.labelABV", fallback: "ABV" },
    { key: "caskType", labelKey: "v2.recognition.labelCask", fallback: "Cask" },
  ];

  if (mode === "editing") {
    return (
      <div
        data-testid="recognition-editing"
        className="rounded-2xl p-5"
        style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)" }}
      >
        <p className="text-[13px] mb-4" style={{ color: "var(--labs-text-secondary)" }}>
          {t("v2.recognition.editHint", "Correct the fields and save")}
        </p>
        <div className="flex flex-col gap-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs mb-0.5 block" style={{ color: "var(--labs-text-secondary)" }}>
                {t(f.labelKey, f.fallback)}
              </label>
              <input
                data-testid={`input-recognition-${f.key}`}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg text-[15px]"
                style={{
                  background: "var(--labs-bg)",
                  border: "1px solid var(--labs-border)",
                  color: "var(--labs-text)",
                  outline: "none",
                }}
                value={String(edited[f.key] || "")}
                onChange={e => setEdited(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button
            data-testid="button-recognition-save"
            onClick={handleSaveEdit}
            className="flex-1 min-h-[44px] rounded-xl text-[15px] font-semibold"
            style={{ background: "var(--labs-success, #4caf50)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            {t("v2.recognition.save", "Save")}
          </button>
          <button
            data-testid="button-recognition-cancel-edit"
            onClick={() => { setEdited({ ...result }); setMode("review"); }}
            className="flex-1 min-h-[44px] rounded-xl text-[15px]"
            style={{ background: "transparent", color: "var(--labs-text-secondary)", border: "1px solid var(--labs-border)", cursor: "pointer" }}
          >
            {t("v2.back", "Back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="recognition-review"
      className="rounded-2xl p-5"
      style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--labs-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <h3 className="text-lg font-semibold m-0" style={{ color: "var(--labs-text)" }}>
          {t("v2.recognition.title", "Recognized Whisky")}
        </h3>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>
            {t("v2.recognition.confidence", "Confidence")}
          </span>
          <span className="text-[13px] font-semibold" style={{ color: confColor }}>
            {confidence}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--labs-bg)" }}>
          <div
            data-testid="confidence-bar"
            className="h-full rounded-full"
            style={{
              width: `${Math.min(confidence, 100)}%`,
              background: confColor,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        {lowConf && (
          <p data-testid="text-low-confidence" className="text-xs mt-1 mb-0" style={{ color: "var(--labs-danger, #e53935)" }}>
            {t("v2.recognition.lowConf", "Low confidence – please verify data")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {fields.map(f => {
          const val = String(result[f.key] || "");
          if (!val) return null;
          const isName = f.key === "whiskyName";
          if (isName) {
            return (
              <div key={f.key} className="flex flex-col py-1">
                <span className="text-[13px]" style={{ color: "var(--labs-text-secondary)" }}>{t(f.labelKey, f.fallback)}</span>
                <span data-testid={`text-recognition-${f.key}`} className="text-sm font-medium" style={{ color: "var(--labs-text)", marginTop: 2 }}>{val}</span>
              </div>
            );
          }
          return (
            <div key={f.key} className="flex justify-between py-1">
              <span className="text-[13px]" style={{ color: "var(--labs-text-secondary)" }}>{t(f.labelKey, f.fallback)}</span>
              <span data-testid={`text-recognition-${f.key}`} className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{val}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-5">
        <button
          data-testid="button-recognition-confirm"
          onClick={handleConfirm}
          className="flex-1 min-h-[44px] rounded-xl text-[15px] font-semibold"
          style={{ background: "var(--labs-success, #4caf50)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          {t("v2.recognition.confirm", "Correct")}
        </button>
        <button
          data-testid="button-recognition-edit"
          onClick={() => setMode("editing")}
          className="flex-1 min-h-[44px] rounded-xl text-[15px] font-semibold"
          style={{ background: "transparent", color: "var(--labs-accent)", border: "1px solid var(--labs-accent)", cursor: "pointer" }}
        >
          {t("v2.recognition.edit", "Edit")}
        </button>
        <button
          data-testid="button-recognition-reject"
          onClick={handleReject}
          className="flex-1 min-h-[44px] rounded-xl text-[15px]"
          style={{ background: "transparent", color: "var(--labs-danger, #e53935)", border: "1px solid rgba(229,57,53,0.3)", cursor: "pointer" }}
        >
          {t("v2.recognition.reject", "Wrong")}
        </button>
      </div>
    </div>
  );
}
