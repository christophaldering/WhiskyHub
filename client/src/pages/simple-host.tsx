import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Calendar, FileText, Settings, ChevronRight, ChevronDown, Copy, Check, ArrowRight, X } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { getSession } from "@/lib/session";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
  success: "#6ec177",
};

const cardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  padding: "20px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  background: c.bg,
  border: `1px solid ${c.border}`,
  borderRadius: 8,
  color: c.text,
  outline: "none",
  fontFamily: "system-ui, sans-serif",
  boxSizing: "border-box",
};

interface Tasting {
  id: string;
  title: string;
  status: string;
  code: string;
  date: string | null;
  location: string | null;
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const badgeColors: Record<string, string> = {
    draft: "#888",
    open: c.success,
    closed: c.accent,
    reveal: "#c084fc",
    archived: "#666",
  };

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: badgeColors[status] || c.muted,
        background: `${badgeColors[status] || c.muted}20`,
        padding: "2px 8px",
        borderRadius: 6,
      }}
      data-testid={`badge-status-${status}`}
    >
      {status}
    </span>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        background: "none",
        border: "none",
        padding: "8px 0",
        cursor: "pointer",
        color: c.text,
        fontSize: 14,
        fontFamily: "system-ui, sans-serif",
      }}
      data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span>{label}</span>
      <div
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          background: checked ? c.accent : c.border,
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: c.text,
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            transition: "left 0.2s",
          }}
        />
      </div>
    </button>
  );
}

function CreateWizard({ pid, onClose, onCreated }: { pid: string; onClose: () => void; onCreated: (tasting: Tasting) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [blindMode, setBlindMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim().length > 0 && !submitting;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: date || new Date().toISOString().split("T")[0],
          location: description.trim() || "",
          hostId: pid,
          code: generateCode(),
          status: "draft",
          blindMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create session");
      }

      const tasting = await res.json();
      onCreated(tasting);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ ...cardStyle, position: "relative" }}>
      <button
        type="button"
        onClick={onClose}
        style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: c.muted, padding: 4 }}
        data-testid="button-close-wizard"
      >
        <X style={{ width: 18, height: 18 }} />
      </button>

      <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: c.text }} data-testid="text-wizard-title">
        Create a Tasting Session
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: "block", marginBottom: 6 }}>
            Tasting Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Islay Night, Highland Classics"
            style={inputStyle}
            autoFocus
            maxLength={200}
            data-testid="input-tasting-title"
          />
        </div>

        <Toggle checked={blindMode} onChange={setBlindMode} label="Blind Mode" />

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: c.muted,
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
            padding: "4px 0",
          }}
          data-testid="button-toggle-advanced"
        >
          <ChevronDown
            style={{
              width: 14,
              height: 14,
              transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
          Advanced options
        </button>

        {showAdvanced && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingLeft: 4 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: "block", marginBottom: 6 }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: "dark" }}
                data-testid="input-tasting-date"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: "block", marginBottom: 6 }}>
                Description / Location
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about the session"
                rows={2}
                style={{ ...inputStyle, resize: "vertical", minHeight: 48 }}
                data-testid="input-tasting-description"
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: "#e57373", background: "#e5737315", padding: "8px 12px", borderRadius: 8 }} data-testid="text-create-error">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: 15,
            fontWeight: 600,
            background: canSubmit ? c.accent : c.border,
            color: canSubmit ? c.bg : c.muted,
            border: "none",
            borderRadius: 10,
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "system-ui, sans-serif",
            transition: "background 0.2s",
          }}
          data-testid="button-create-session"
        >
          {submitting ? "Creating…" : "Create Session"}
        </button>
      </div>
    </div>
  );
}

function SuccessCard({ tasting, onDismiss }: { tasting: Tasting; onDismiss: () => void }) {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tasting.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{ ...cardStyle, border: `1px solid ${c.success}40` }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🥃</div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 4px" }} data-testid="text-success-title">
          Session Created!
        </h3>
        <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
          {tasting.title}
        </p>
      </div>

      <div style={{ background: c.bg, borderRadius: 10, padding: "16px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: c.muted, marginBottom: 6 }}>
          Session Code
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: c.accent,
            fontFamily: "'Playfair Display', monospace",
          }}
          data-testid="text-session-code"
        >
          {tasting.code}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            background: "none",
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            padding: "6px 14px",
            color: copied ? c.success : c.muted,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
            transition: "color 0.2s",
          }}
          data-testid="button-copy-code"
        >
          {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
          {copied ? "Copied!" : "Copy Code"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={() => navigate(`/legacy/tasting/${tasting.id}`)}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: 15,
            fontWeight: 600,
            background: c.accent,
            color: c.bg,
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          data-testid="button-continue-whiskies"
        >
          Continue to Add Whiskies
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: 13,
            background: "none",
            color: c.muted,
            border: `1px solid ${c.border}`,
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="button-dismiss-success"
        >
          Back to Host
        </button>
      </div>
    </div>
  );
}

export default function SimpleHostPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const session = getSession();
  const pid = session.pid || localStorage.getItem("casksense_participant_id");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [createdTasting, setCreatedTasting] = useState<Tasting | null>(null);

  const { data: tastings = [], isLoading } = useQuery<Tasting[]>({
    queryKey: ["/api/tastings", pid],
    queryFn: async () => {
      if (!pid) return [];
      const res = await fetch(`/api/tastings?hostId=${pid}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!pid,
  });

  const activeTastings = tastings.filter((t) => t.status === "open" || t.status === "reveal");
  const draftTastings = tastings.filter((t) => t.status === "draft");
  const pastTastings = tastings.filter((t) => t.status === "closed" || t.status === "archived");

  const handleCreated = (tasting: Tasting) => {
    setCreatedTasting(tasting);
    setWizardOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/tastings", pid] });
  };

  const handleDismissSuccess = () => {
    setCreatedTasting(null);
  };

  if (!pid) {
    return (
      <SimpleShell showBack={false}>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }} data-testid="text-host-title">
            Host a Tasting
          </h2>
          <p style={{ color: c.muted, fontSize: 14, marginBottom: 24 }} data-testid="text-sign-in-prompt">
            Sign in to create and manage your tastings.
          </p>
          <p style={{ color: c.muted, fontSize: 13 }}>
            Use the key icon above to sign in first.
          </p>
        </div>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell showBack={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }} data-testid="text-host-title">
              Host a Tasting
            </h2>
            <p style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
              Create a session, add whiskies, and run the tasting live.
            </p>
          </div>
          {!wizardOpen && !createdTasting && (
            <button
              onClick={() => setWizardOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: c.accent,
                color: c.bg,
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
              }}
              data-testid="button-create-tasting"
            >
              <Plus style={{ width: 16, height: 16 }} />
              New
            </button>
          )}
        </div>

        {createdTasting && (
          <SuccessCard tasting={createdTasting} onDismiss={handleDismissSuccess} />
        )}

        {wizardOpen && !createdTasting && (
          <CreateWizard pid={pid} onClose={() => setWizardOpen(false)} onCreated={handleCreated} />
        )}

        {isLoading ? (
          <div style={{ textAlign: "center", color: c.muted, padding: "32px 0" }}>
            Loading...
          </div>
        ) : tastings.length === 0 && !wizardOpen && !createdTasting ? (
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <p style={{ color: c.muted, fontSize: 14, margin: "8px 0" }} data-testid="text-no-tastings">
              No tastings yet. Create your first one!
            </p>
          </div>
        ) : (
          <>
            {activeTastings.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.accent, marginBottom: 10 }}>
                  Live
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeTastings.map((t) => (
                    <Link key={t.id} href={`/legacy/tasting/${t.id}`}>
                      <div style={{ ...cardStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`card-tasting-${t.id}`}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                          <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>
                            Code: {t.code}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={t.status} />
                          <ChevronRight style={{ width: 16, height: 16, color: c.muted }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {draftTastings.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.muted, marginBottom: 10 }}>
                  Drafts
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {draftTastings.map((t) => (
                    <Link key={t.id} href={`/legacy/tasting/${t.id}`}>
                      <div style={{ ...cardStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`card-tasting-${t.id}`}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                          {t.date && <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>{t.date}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={t.status} />
                          <ChevronRight style={{ width: 16, height: 16, color: c.muted }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {pastTastings.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.muted, marginBottom: 10 }}>
                  History
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pastTastings.slice(0, 5).map((t) => (
                    <Link key={t.id} href={`/legacy/tasting/${t.id}`}>
                      <div style={{ ...cardStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`card-tasting-${t.id}`}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                          {t.date && <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>{t.date}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={t.status} />
                          <ChevronRight style={{ width: 16, height: 16, color: c.muted }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {pastTastings.length > 5 && (
                    <Link href="/legacy/tasting/sessions">
                      <div style={{ textAlign: "center", color: c.accent, fontSize: 13, padding: 8, cursor: "pointer" }} data-testid="link-all-sessions">
                        Show all {pastTastings.length} tastings →
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.muted, marginBottom: 2 }}>
            Tools
          </h3>
          <Link href="/legacy/tasting?tab=templates">
            <div style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} data-testid="link-templates">
              <FileText style={{ width: 18, height: 18, color: c.accent }} />
              <span style={{ fontSize: 14 }}>Tasting Templates</span>
              <ChevronRight style={{ width: 14, height: 14, color: c.muted, marginLeft: "auto" }} />
            </div>
          </Link>
          <Link href="/legacy/tasting/calendar">
            <div style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} data-testid="link-calendar">
              <Calendar style={{ width: 18, height: 18, color: c.accent }} />
              <span style={{ fontSize: 14 }}>Calendar</span>
              <ChevronRight style={{ width: 14, height: 14, color: c.muted, marginLeft: "auto" }} />
            </div>
          </Link>
          <Link href="/legacy/tasting/host">
            <div style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} data-testid="link-host-dashboard">
              <Settings style={{ width: 18, height: 18, color: c.accent }} />
              <span style={{ fontSize: 14 }}>Full Host Dashboard</span>
              <ChevronRight style={{ width: 14, height: 14, color: c.muted, marginLeft: "auto" }} />
            </div>
          </Link>
        </div>
      </div>
    </SimpleShell>
  );
}
