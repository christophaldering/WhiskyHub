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

const CHECKLIST: CheckItem[] = [
  { label: "1. Landing Page", route: "/", description: "3 CTAs visible: Join, Log, My Taste" },
  { label: "2. Join a Tasting", route: "/enter", description: "Name/PIN → code entry → tasting room" },
  { label: "3. Rate in Tasting Room", route: "/enter", description: "Sliders for nose/taste/finish/balance/overall" },
  { label: "4. Log a Whisky", route: "/log-simple", description: "Name + score + notes → save" },
  { label: "5. My Taste", route: "/my-taste", description: "Snapshot + insight cards" },
  { label: "6. Leave Feedback", route: "/simple-feedback", description: "Satisfaction + simplicity + comments" },
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

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {CHECKLIST.map((item) => (
          <Link key={item.label} href={item.route} style={{ textDecoration: "none" }}>
            <div
              style={{
                ...cardStyle,
                padding: "14px 16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "border-color 0.2s",
              }}
              data-testid={`test-item-${item.label.charAt(0)}`}
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

      <div style={{ ...cardStyle, marginTop: 16 }} data-testid="card-test-guide">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px", color: c.text }}>Small Circle Test (1 min)</h2>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: c.muted, lineHeight: 1.8 }}>
          <li>Open the Landing Page. Verify 3 buttons.</li>
          <li>Tap "Join a Tasting" → enter name/PIN → enter a session code.</li>
          <li>Rate at least one whisky → tap Finish.</li>
          <li>Go back → tap "Log a Whisky" → fill form → save.</li>
          <li>Tap "My Taste" → check snapshot values.</li>
          <li>Open /simple-feedback → rate and send.</li>
        </ol>
      </div>
    </SimpleShell>
  );
}
