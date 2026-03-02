import { useState } from "react";
import SimpleShell from "@/components/simple/simple-shell";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
  success: "#6a9a5b",
};

const cardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: c.bg,
  border: `1px solid ${c.border}`,
  borderRadius: 8,
  color: c.text,
  padding: "12px 14px",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "system-ui, sans-serif",
};

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            data-testid={`button-${label.toLowerCase().replace(/\s/g, "-")}-${n}`}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              border: `1px solid ${n <= value ? c.accent : c.border}`,
              background: n <= value ? c.accent : "transparent",
              color: n <= value ? c.bg : c.muted,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SimpleFeedbackPage() {
  const [name, setName] = useState("");
  const [satisfaction, setSatisfaction] = useState(0);
  const [simplicity, setSimplicity] = useState(0);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildSummary = () => {
    return [
      `CaskSense Feedback`,
      name ? `Name: ${name}` : "Name: (anonymous)",
      `Satisfaction: ${satisfaction}/5`,
      `Simplicity: ${simplicity}/5`,
      text ? `Comments: ${text}` : "",
      `Date: ${new Date().toISOString()}`,
    ].filter(Boolean).join("\n");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (satisfaction === 0 || simplicity === 0) return;

    const entry = { name, satisfaction, simplicity, text, date: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem("simple_feedback") || "[]");
    existing.push(entry);
    localStorage.setItem("simple_feedback", JSON.stringify(existing));
    console.log("[SIMPLE_MODE] feedback saved", entry);
    setSent(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (sent) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }} data-testid="card-feedback-sent">
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 8px" }}>Thank you!</h2>
          <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>Your feedback has been saved.</p>
          <button
            onClick={handleCopy}
            data-testid="button-copy-feedback"
            style={{
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 500,
              background: copied ? c.accent : "transparent",
              color: copied ? c.bg : c.accent,
              border: `1px solid ${c.accent}`,
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? "Copied!" : "Copy feedback to clipboard"}
          </button>
        </div>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell>
      <div style={cardStyle} data-testid="card-feedback-form">
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 20px", color: c.text }}>Feedback</h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Name (optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} data-testid="input-feedback-name" autoComplete="off" placeholder="Anonymous" />
          </div>

          <StarRow label="Overall satisfaction" value={satisfaction} onChange={setSatisfaction} />
          <StarRow label="Simplicity" value={simplicity} onChange={setSimplicity} />

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Comments</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} data-testid="input-feedback-text" placeholder="What could be better?" />
          </div>

          <button
            type="submit"
            disabled={satisfaction === 0 || simplicity === 0}
            data-testid="button-send-feedback"
            style={{
              width: "100%",
              padding: 12,
              fontSize: 15,
              fontWeight: 600,
              background: c.accent,
              color: c.bg,
              border: "none",
              borderRadius: 8,
              cursor: (satisfaction === 0 || simplicity === 0) ? "default" : "pointer",
              opacity: (satisfaction === 0 || simplicity === 0) ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </SimpleShell>
  );
}
