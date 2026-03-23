import { useState, useEffect } from "react";
import type { ThemeTokens } from "../tokens";
import type { Translations } from "../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../tokens";

export interface BottleRecognitionResult {
  whiskyName: string;
  distillery: string;
  region: string;
  caskType: string;
  age: string;
  abv: string;
  confidence: number;
}

type Mode = "review" | "editing" | "confirmed" | "rejected";

interface Props {
  th: ThemeTokens;
  t: Translations;
  result: BottleRecognitionResult;
  participantId: string;
  onConfirm: (data: BottleRecognitionResult) => void;
  onDismiss: () => void;
}

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return "#4caf50";
  if (confidence >= 60) return "#d4a847";
  return "#e53935";
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

export default function BottleRecognitionFeedback({ th, t, result, participantId, onConfirm, onDismiss }: Props) {
  const [mode, setMode] = useState<Mode>("review");
  const [edited, setEdited] = useState<BottleRecognitionResult>({ ...result });

  useEffect(() => {
    if (mode === "confirmed") {
      const timer = setTimeout(() => {
        onConfirm(edited);
      }, 800);
      return () => clearTimeout(timer);
    }
    if (mode === "rejected") {
      const timer = setTimeout(() => {
        onDismiss();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const handleConfirm = () => {
    sendFeedback({
      original: result,
      action: "confirm",
      participantId,
      timestamp: new Date().toISOString(),
    });
    setMode("confirmed");
  };

  const handleReject = () => {
    sendFeedback({
      original: result,
      action: "reject",
      participantId,
      timestamp: new Date().toISOString(),
    });
    setMode("rejected");
  };

  const handleSaveEdit = () => {
    sendFeedback({
      original: result,
      corrected: edited,
      action: "edit",
      participantId,
      timestamp: new Date().toISOString(),
    });
    setMode("confirmed");
  };

  const confidence = result.confidence ?? 0;
  const confColor = confidenceColor(confidence);
  const lowConf = confidence < 70;

  if (mode === "confirmed") {
    return (
      <div data-testid="recognition-confirmed" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: SP.xxl,
        gap: SP.md,
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={th.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    );
  }

  if (mode === "rejected") {
    return (
      <div data-testid="recognition-rejected" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: SP.xxl,
        gap: SP.md,
      }}>
        <p style={{ color: th.muted, fontFamily: FONT.body, fontSize: 16 }}>{t.recognitionRejected}</p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: TOUCH_MIN,
    padding: `${SP.sm}px ${SP.md}px`,
    background: th.inputBg,
    border: `1px solid ${th.border}`,
    borderRadius: RADIUS.sm,
    color: th.text,
    fontFamily: FONT.body,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: th.muted,
    fontFamily: FONT.body,
    marginBottom: 2,
  };

  const fields: { key: keyof BottleRecognitionResult; label: string }[] = [
    { key: "whiskyName", label: t.labelName },
    { key: "distillery", label: t.labelDistillery },
    { key: "region", label: t.labelRegion },
    { key: "age", label: t.labelAge },
    { key: "abv", label: t.labelABV },
    { key: "caskType", label: t.labelCask },
  ];

  if (mode === "editing") {
    return (
      <div data-testid="recognition-editing" style={{
        background: th.bgCard,
        borderRadius: RADIUS.lg,
        padding: SP.lg,
        border: `1px solid ${th.border}`,
      }}>
        <p style={{ color: th.muted, fontFamily: FONT.body, fontSize: 13, marginBottom: SP.md }}>
          {t.recognitionEditHint}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input
                data-testid={`input-recognition-${f.key}`}
                style={inputStyle}
                value={String(edited[f.key] || "")}
                onChange={e => setEdited(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: SP.sm, marginTop: SP.lg }}>
          <button
            data-testid="button-recognition-save"
            onClick={handleSaveEdit}
            style={{
              flex: 1,
              minHeight: TOUCH_MIN,
              background: th.green,
              color: "#fff",
              border: "none",
              borderRadius: RADIUS.md,
              fontFamily: FONT.body,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.recognitionSave}
          </button>
          <button
            data-testid="button-recognition-cancel-edit"
            onClick={() => { setEdited({ ...result }); setMode("review"); }}
            style={{
              flex: 1,
              minHeight: TOUCH_MIN,
              background: "transparent",
              color: th.muted,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.md,
              fontFamily: FONT.body,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            {t.back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="recognition-review" style={{
      background: th.bgCard,
      borderRadius: RADIUS.lg,
      padding: SP.lg,
      border: `1px solid ${th.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.md }}>
        <span style={{ color: th.gold }}><CameraIcon /></span>
        <h3 style={{
          margin: 0,
          fontFamily: FONT.display,
          fontSize: 18,
          color: th.text,
          fontWeight: 600,
        }}>
          {t.recognitionTitle}
        </h3>
      </div>

      <div style={{ marginBottom: SP.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: th.muted, fontFamily: FONT.body }}>
            {t.recognitionConfidence}
          </span>
          <span style={{ fontSize: 13, color: confColor, fontFamily: FONT.body, fontWeight: 600 }}>
            {confidence}%
          </span>
        </div>
        <div style={{
          height: 6,
          borderRadius: RADIUS.full,
          background: th.inputBg,
          overflow: "hidden",
        }}>
          <div data-testid="confidence-bar" style={{
            height: "100%",
            width: `${Math.min(confidence, 100)}%`,
            background: confColor,
            borderRadius: RADIUS.full,
            transition: "width 0.4s ease",
          }} />
        </div>
        {lowConf && (
          <p data-testid="text-low-confidence" style={{
            fontSize: 12,
            color: "#e53935",
            fontFamily: FONT.body,
            marginTop: 4,
            marginBottom: 0,
          }}>
            {t.recognitionLowConf}
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
        {fields.map(f => {
          const val = String(result[f.key] || "");
          if (!val) return null;
          return (
            <div key={f.key} style={{ display: "flex", justifyContent: "space-between", padding: `${SP.xs}px 0` }}>
              <span style={{ fontSize: 13, color: th.muted, fontFamily: FONT.body }}>{f.label}</span>
              <span data-testid={`text-recognition-${f.key}`} style={{ fontSize: 14, color: th.text, fontFamily: FONT.body, fontWeight: 500 }}>{val}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: SP.sm, marginTop: SP.lg }}>
        <button
          data-testid="button-recognition-confirm"
          onClick={handleConfirm}
          style={{
            flex: 1,
            minHeight: TOUCH_MIN,
            background: th.green,
            color: "#fff",
            border: "none",
            borderRadius: RADIUS.md,
            fontFamily: FONT.body,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t.recognitionConfirm}
        </button>
        <button
          data-testid="button-recognition-edit"
          onClick={() => setMode("editing")}
          style={{
            flex: 1,
            minHeight: TOUCH_MIN,
            background: "transparent",
            color: th.gold,
            border: `1px solid ${th.gold}`,
            borderRadius: RADIUS.md,
            fontFamily: FONT.body,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t.recognitionEdit}
        </button>
        <button
          data-testid="button-recognition-reject"
          onClick={handleReject}
          style={{
            flex: 1,
            minHeight: TOUCH_MIN,
            background: "transparent",
            color: "#e53935",
            border: `1px solid rgba(229,57,53,0.3)`,
            borderRadius: RADIUS.md,
            fontFamily: FONT.body,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {t.recognitionReject}
        </button>
      </div>
    </div>
  );
}
