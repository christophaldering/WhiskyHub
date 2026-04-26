import { useState } from "react";
import { runStoryAiAction, type StoryAiAction } from "../api";
import { sanitizeStoryHtml } from "./RichTextEditor";

type Field = {
  key: string;
  label: string;
  value: string;
};

type Props = {
  fields: Field[];
  onApply: (key: string, html: string) => void;
};

const ACTIONS: { id: StoryAiAction; label: string }[] = [
  { id: "shorten", label: "Kürzen" },
  { id: "inspire", label: "Inspirierender" },
  { id: "translate", label: "Englisch" },
  { id: "correct", label: "Korrigieren" },
];

export function AiActionPanel({ fields, onApply }: Props) {
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<{
    fieldKey: string;
    fieldLabel: string;
    action: StoryAiAction;
    original: string;
    proposal: string;
  } | null>(null);

  const handleAction = async (field: Field, action: StoryAiAction) => {
    setOpenMenuFor(null);
    setBusy(true);
    setError(null);
    try {
      const html = field.value && field.value.trim().length > 0 ? field.value : "";
      if (!html) {
        setError("Dieses Feld ist leer.");
        setBusy(false);
        return;
      }
      const proposal = await runStoryAiAction(action, html);
      setDiff({
        fieldKey: field.key,
        fieldLabel: field.label,
        action,
        original: html,
        proposal: sanitizeStoryHtml(proposal),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "KI-Aktion fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const accept = () => {
    if (!diff) return;
    onApply(diff.fieldKey, diff.proposal);
    setDiff(null);
  };

  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 12 }} data-testid="ai-action-panel">
      <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#A89A85" }}>
        KI-Aktionen
      </div>
      {error ? (
        <div style={{ color: "#d97757", fontSize: 11 }} data-testid="ai-action-error">{error}</div>
      ) : null}
      <div style={{ display: "grid", gap: 4 }}>
        {fields.map((f) => (
          <div key={f.key} style={{ position: "relative", display: "flex", gap: 6, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setOpenMenuFor((cur) => (cur === f.key ? null : f.key))}
              disabled={busy}
              data-testid={`button-ai-toggle-${f.key}`}
              style={sparkleBtn}
              title={`KI-Aktion für "${f.label}"`}
            >
              ✦
            </button>
            <span style={{ fontSize: 11, color: "#A89A85" }}>{f.label}</span>
            {openMenuFor === f.key ? (
              <div
                data-testid={`ai-menu-${f.key}`}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "#13100B",
                  border: "1px solid rgba(201,169,97,0.3)",
                  borderRadius: 4,
                  padding: 4,
                  display: "grid",
                  gap: 2,
                  zIndex: 5,
                  minWidth: 180,
                }}
              >
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleAction(f, a.id)}
                    disabled={busy}
                    data-testid={`button-ai-action-${f.key}-${a.id}`}
                    style={menuItem}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {busy ? (
        <div style={{ fontSize: 11, color: "#C9A961" }} data-testid="ai-action-busy">KI denkt nach…</div>
      ) : null}
      {diff ? (
        <DiffPreviewModal
          diff={diff}
          onAccept={accept}
          onReject={() => setDiff(null)}
        />
      ) : null}
    </div>
  );
}

function DiffPreviewModal({
  diff,
  onAccept,
  onReject,
}: {
  diff: { fieldKey: string; fieldLabel: string; action: StoryAiAction; original: string; proposal: string };
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div
      data-testid="ai-diff-backdrop"
      onClick={onReject}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        data-testid="ai-diff-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#13100B",
          border: "1px solid rgba(201,169,97,0.25)",
          color: "#F5EDE0",
          fontFamily: "'Inter', system-ui, sans-serif",
          borderRadius: 6,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 12, letterSpacing: ".25em", textTransform: "uppercase", color: "#C9A961" }}>
            KI-Vorschlag · {diff.fieldLabel}
          </h3>
          <button type="button" onClick={onReject} data-testid="button-ai-diff-close" style={miniBtn}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#A89A85", marginBottom: 6 }}>Original</div>
            <div
              data-testid="ai-diff-original"
              dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(diff.original) }}
              style={diffBox}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A961", marginBottom: 6 }}>Vorschlag</div>
            <div
              data-testid="ai-diff-proposal"
              dangerouslySetInnerHTML={{ __html: diff.proposal }}
              style={{ ...diffBox, borderColor: "rgba(201,169,97,0.5)" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onReject} data-testid="button-ai-diff-reject" style={secondaryBtn}>
            Verwerfen
          </button>
          <button type="button" onClick={onAccept} data-testid="button-ai-diff-accept" style={primaryBtn}>
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}

const sparkleBtn: React.CSSProperties = {
  background: "rgba(201,169,97,0.12)",
  border: "1px solid rgba(201,169,97,0.4)",
  borderRadius: 3,
  padding: "2px 6px",
  fontSize: 13,
  color: "#C9A961",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const miniBtn: React.CSSProperties = {
  background: "rgba(201,169,97,0.08)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 3,
  padding: "3px 8px",
  fontSize: 11,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const menuItem: React.CSSProperties = {
  background: "transparent",
  border: "none",
  textAlign: "left",
  padding: "5px 8px",
  fontSize: 12,
  color: "#F5EDE0",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  borderRadius: 3,
};

const diffBox: React.CSSProperties = {
  background: "rgba(11,9,6,0.6)",
  border: "1px solid rgba(201,169,97,0.2)",
  borderRadius: 4,
  padding: 12,
  fontSize: 13,
  lineHeight: 1.55,
  color: "#F5EDE0",
  maxHeight: "50vh",
  overflowY: "auto",
};

const primaryBtn: React.CSSProperties = {
  background: "#C9A961",
  color: "#0B0906",
  border: "none",
  borderRadius: 3,
  padding: "6px 14px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".15em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(201,169,97,0.25)",
  color: "#A89A85",
  borderRadius: 3,
  padding: "6px 14px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".15em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};
