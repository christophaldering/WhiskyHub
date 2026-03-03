import { Link } from "wouter";
import { useState, useEffect } from "react";
import SimpleShell from "@/components/simple/simple-shell";
import { getSimpleAuth } from "@/lib/simple-auth";
import { BuildFooter } from "@/components/build-footer";

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
  { label: "5. Identify → Take Photo", route: "/log-simple", description: "Tap Identify → Take Photo → camera → candidates" },
  { label: "6. Identify → Upload Photo(s)", route: "/log-simple", description: "Tap Identify → Upload → select files → candidates" },
  { label: "7. Identify → Describe", route: "/log-simple", description: "Tap Identify → Describe → type text → Find matches" },
  { label: "8. Select Candidate", route: "/log-simple", description: "Tap candidate → prefill name + distillery → save" },
  { label: "9. My Taste", route: "/my-taste", description: "Snapshot + insight cards" },
  { label: "10. Leave Feedback", route: "/simple-feedback", description: "Satisfaction + simplicity + comments" },
];

const IDENTIFY_TESTS: CheckItem[] = [
  { label: "I1. Label Photo", route: "/log-simple", description: "Photo of whisky bottle label → OCR → confidence badges" },
  { label: "I2. Menu/Text Photo", route: "/log-simple", description: "Photo of menu/list → 'Multiple items detected' hint" },
  { label: "I3. Text Describe", route: "/log-simple", description: "Type 'Lagavulin 16' → instant matches (no OCR)" },
  { label: "I4. Cache Test", route: "/log-simple", description: "Same photo twice → second is instant (cache hit)" },
  { label: "I5. Unknown Fallback", route: "/log-simple", description: "No match → 'Create as Unknown' → fill fields → save" },
  { label: "I6. Multi-Photo", route: "/log-simple", description: "Upload 2-5 photos → best result used" },
  { label: "I7. Log from Menu", route: "/log-simple", description: "After save → 'Log another from same menu' → re-opens cached result" },
  { label: "I8. Rate Limit", route: "/log-simple", description: "6th identify in 5 min → 429 error message" },
];

const UNKNOWN_PATH: CheckItem[] = [
  { label: "U1. Create Unknown", route: "/log-simple", description: "Identify → sheet → 'Create as Unknown'" },
  { label: "U2. Fill Unknown Fields", route: "/log-simple", description: "Name (required), distillery, age, abv, cask, wbId, price" },
  { label: "U3. Save Unknown", route: "/log-simple", description: "Saves to journal or localStorage fallback" },
  { label: "U4. Copy/Download JSON", route: "/log-simple", description: "Copy JSON + Download JSON buttons on success" },
];

function TestSection({ title, items }: { title: string; items: CheckItem[] }) {
  return (
    <div style={{ marginTop: 20 }}>
      <p className="text-xs font-medium uppercase tracking-wider mb-2 px-1" style={{ color: c.muted, opacity: 0.7 }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <Link key={item.label} href={item.route} style={{ textDecoration: "none" }}>
            <div
              style={{ ...cardStyle, padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              data-testid={`test-item-${item.label.substring(0, 3).trim()}`}
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
  );
}

export default function SimpleTestPage() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const buildEnv = import.meta.env.MODE || "unknown";
  const auth = getSimpleAuth();
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/simple/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "__probe__" }),
    })
      .then((res) => {
        if (res.status === 500) setPinConfigured(false);
        else setPinConfigured(true);
      })
      .catch(() => setPinConfigured(null));
  }, []);

  return (
    <SimpleShell maxWidth={560}>
      <div style={cardStyle} data-testid="card-test-info">
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px", color: c.text }}>Simple Mode — Test Checklist</h1>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>
          Base URL: <span style={{ fontFamily: "monospace", color: c.accent }}>{baseUrl}</span>
        </div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>
          Build: <span style={{ fontFamily: "monospace", color: c.accent }}>{buildEnv}</span>
        </div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>
          OCR Provider: <span style={{ fontFamily: "monospace", color: c.success }}>GPT-4o Vision (Replit AI Integration)</span>
        </div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>
          SIMPLE_MODE_PIN: <span style={{ fontFamily: "monospace", color: pinConfigured === null ? c.muted : pinConfigured ? c.success : c.accent }} data-testid="text-pin-status">
            {pinConfigured === null ? "checking..." : pinConfigured ? "configured ✓" : "not set (dev mode)"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: c.muted }}>
          Session: <span style={{ fontFamily: "monospace", color: auth.unlocked ? c.success : c.muted }} data-testid="text-session-status">
            {auth.unlocked ? `unlocked (${auth.name || "Guest"})` : "locked"}
          </span>
        </div>
      </div>

      <TestSection title="Happy Path" items={HAPPY_PATH} />
      <TestSection title="Identification Tests" items={IDENTIFY_TESTS} />
      <TestSection title="Unknown Whisky Path" items={UNKNOWN_PATH} />

      <div style={{ ...cardStyle, marginTop: 20 }} data-testid="card-test-guide">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px", color: c.text }}>Small Circle Test (2 min)</h2>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: c.muted, lineHeight: 1.8 }}>
          <li>Open Landing. Verify 3 buttons.</li>
          <li>Tap "Join a Tasting" → enter name/PIN → enter code.</li>
          <li>Rate at least one whisky → tap Finish.</li>
          <li>Go back → "Log a Whisky" → tap "Identify".</li>
          <li>Try "Take Photo" → camera → candidates sheet.</li>
          <li>Try "Describe" → type "Ardbeg Uigeadail" → Find matches.</li>
          <li>Select a candidate → name + distillery auto-filled → Save.</li>
          <li>Tap "Log another from same menu" → re-selects from cache.</li>
          <li>Tap "Identify" → "Take Photo" → "Create as Unknown".</li>
          <li>Fill name + optional fields → Save.</li>
          <li>Open "My Taste" → check snapshot.</li>
          <li>Open /simple-feedback → rate and send.</li>
        </ol>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }} data-testid="card-api-endpoints">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px", color: c.text }}>API Endpoints</h2>
        <pre style={{ fontSize: 11, color: c.muted, margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
{`POST /api/whisky/identify (multipart: photo)
POST /api/whisky/identify-text (JSON: { query })

Response:
{
  "candidates": [
    { "name": "Lagavulin", "distillery": "Lagavulin",
      "confidence": 0.81, "source": "local" }
  ],
  "debug": {
    "detectedMode": "label" | "menu" | "text",
    "tookMs": 1574, "indexSize": 15
  },
  "photoUrl": "/uploads/scan-17xxx.jpg"
}

Badges: High >=0.78 | Medium 0.55-0.77 | Low <0.55
Rate limit: 5 requests / 5 minutes per IP`}
        </pre>
      </div>
      <BuildFooter />
    </SimpleShell>
  );
}
