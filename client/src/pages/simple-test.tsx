import { Link } from "wouter";
import SimpleShell from "@/components/simple/simple-shell";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
};

const cardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  padding: 24,
};

interface CheckItem {
  label: string;
  route: string;
  description: string;
}

const HAPPY_PATH: CheckItem[] = [
  { label: "1. Landing Page", route: "/", description: "3 CTAs visible: Join, Log, My Taste" },
  { label: "2. Join a Tasting", route: "/enter", description: "Name/PIN → code entry → tasting room" },
  { label: "3. Rate in Tasting Room", route: "/enter", description: "Sliders for nose/taste/finish/balance/overall" },
  { label: "4. Log a Whisky", route: "/log-simple", description: "Name + score + notes → save" },
  { label: "5. Scan a Label", route: "/log-simple", description: "Tap Scan → camera → candidates sheet" },
  { label: "6. Select Candidate", route: "/log-simple", description: "Tap candidate → prefill name + distillery → save" },
  { label: "7. My Taste", route: "/my-taste", description: "Snapshot + insight cards" },
  { label: "8. Leave Feedback", route: "/simple-feedback", description: "Satisfaction + simplicity + comments" },
];

const UNKNOWN_PATH: CheckItem[] = [
  { label: "U1. Scan → Create Unknown", route: "/log-simple", description: "Scan → sheet → 'Create as Unknown'" },
  { label: "U2. Fill Unknown Fields", route: "/log-simple", description: "Name (required), distillery, age, abv, cask, wbId, price" },
  { label: "U3. Save Unknown", route: "/log-simple", description: "Saves to journal or localStorage fallback" },
  { label: "U4. Verify Local Logs", route: "/log-simple", description: "Check localStorage key: simple_unknown_logs" },
];

export default function SimpleTestPage() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const buildEnv = import.meta.env.MODE || "unknown";

  return (
    <SimpleShell maxWidth={560}>
      <div style={cardStyle} data-testid="card-test-info">
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px", color: c.text }}>Simple Mode — Test Checklist</h1>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>
          Base URL: <span style={{ fontFamily: "monospace", color: c.accent }}>{baseUrl}</span>
        </div>
        <div style={{ fontSize: 12, color: c.muted }}>
          Build: <span style={{ fontFamily: "monospace", color: c.accent }}>{buildEnv}</span>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <p className="text-xs font-medium uppercase tracking-wider mb-2 px-1" style={{ color: c.muted, opacity: 0.7 }}>Happy Path</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {HAPPY_PATH.map((item) => (
            <Link key={item.label} href={item.route} style={{ textDecoration: "none" }}>
              <div
                style={{ ...cardStyle, padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                data-testid={`test-item-${item.label.substring(0, 2).trim()}`}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{item.description}</div>
                </div>
                <span style={{ color: c.accent, fontSize: 16 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <p className="text-xs font-medium uppercase tracking-wider mb-2 px-1" style={{ color: c.muted, opacity: 0.7 }}>Unknown Whisky Path</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {UNKNOWN_PATH.map((item) => (
            <Link key={item.label} href={item.route} style={{ textDecoration: "none" }}>
              <div
                style={{ ...cardStyle, padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                data-testid={`test-item-${item.label.substring(0, 2).trim()}`}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{item.description}</div>
                </div>
                <span style={{ color: c.accent, fontSize: 16 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 20 }} data-testid="card-test-guide">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px", color: c.text }}>Small Circle Test (1 min)</h2>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: c.muted, lineHeight: 1.8 }}>
          <li>Open Landing. Verify 3 buttons.</li>
          <li>Tap "Join a Tasting" → enter name/PIN → enter code.</li>
          <li>Rate at least one whisky → tap Finish.</li>
          <li>Go back → "Log a Whisky" → tap "Scan label".</li>
          <li>Take a photo → candidates sheet appears → select one.</li>
          <li>Name + distillery auto-filled → add score → Save.</li>
          <li>Tap "Log another" → "Scan label" → "Create as Unknown".</li>
          <li>Fill name + optional fields → Save.</li>
          <li>Open "My Taste" → check snapshot.</li>
          <li>Open /simple-feedback → rate and send.</li>
        </ol>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }} data-testid="card-api-example">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px", color: c.text }}>API: POST /api/whisky/identify</h2>
        <pre style={{ fontSize: 11, color: c.muted, margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
{`Response:
{
  "candidates": [
    { "name": "Lagavulin 16", "distillery": "Lagavulin", "confidence": 0.85 },
    { "name": "Ardbeg Uigeadail", "distillery": "Ardbeg", "confidence": 0.72 },
    { "name": "Balvenie DoubleWood 12", "distillery": "The Balvenie", "confidence": 0.58 }
  ],
  "photoUrl": "/uploads/scan-17xxx.jpg"
}
Phase 1: Mock candidates (no OCR).
Phase 2: Real identification engine.`}
        </pre>
      </div>
    </SimpleShell>
  );
}
