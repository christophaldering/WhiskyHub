import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Calendar, FileText, Settings, ChevronRight, ChevronDown, Copy, Check, ArrowRight, X, Trash2, ChevronUp, EyeOff, Share2, QrCode, Download, ExternalLink } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { getSession } from "@/lib/session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCodeLib from "qrcode";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
  success: "#6ec177",
  danger: "#e57373",
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

const blindLabel = (index: number) => String.fromCharCode(65 + index);

type WizardStep = "list" | "step1" | "step2" | "step3";

interface TastingFull {
  id: string;
  title: string;
  status: string;
  code: string;
  date: string | null;
  location: string | null;
  blindMode?: boolean;
}

interface Whisky {
  id: string;
  tastingId: string;
  name: string;
  distillery: string | null;
  abv: number | null;
  notes: string | null;
  sortOrder: number;
  caskInfluence: string | null;
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

function StepBadge({ step }: { step: number }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c.accent, background: `${c.accent}20`, padding: "2px 8px", borderRadius: 10 }}>
      Step {step}
    </span>
  );
}

function CopyButton({ text, label, fullWidth }: { text: string; label: string; fullWidth?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: "none",
        border: `1px solid ${copied ? c.success + "60" : c.border}`,
        borderRadius: 8,
        padding: "8px 14px",
        color: copied ? c.success : c.muted,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
        transition: "all 0.2s",
        width: fullWidth ? "100%" : "auto",
      }}
      data-testid={`button-copy-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function TastingHeader({ tasting }: { tasting: TastingFull }) {
  const [copied, setCopied] = useState(false);
  const isBlind = !!tasting.blindMode;

  return (
    <div style={{ ...cardStyle, border: `1px solid ${c.success}40`, padding: "14px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{tasting.title}</div>
          <div style={{ fontSize: 12, color: c.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Code: <strong style={{ color: c.accent, letterSpacing: "0.08em" }}>{tasting.code}</strong></span>
            {isBlind && (
              <span style={{ fontSize: 10, color: c.accent, background: `${c.accent}20`, padding: "1px 6px", borderRadius: 6 }}>
                <EyeOff style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                Blind
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            try { await navigator.clipboard.writeText(tasting.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
          }}
          style={{ background: "none", border: `1px solid ${c.border}`, borderRadius: 8, padding: "5px 10px", color: copied ? c.success : c.muted, fontSize: 11, cursor: "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: 4 }}
          data-testid="button-copy-code"
        >
          {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function CreateWizard({ pid, onClose, onCreated }: { pid: string; onClose: () => void; onCreated: (tasting: TastingFull) => void }) {
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

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <StepBadge step={1} />
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: c.text }} data-testid="text-wizard-title">
          Create a Tasting Session
        </h3>
      </div>

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
          <div style={{ fontSize: 13, color: c.danger, background: `${c.danger}15`, padding: "8px 12px", borderRadius: 8 }} data-testid="text-create-error">
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

function AddWhiskiesStep({ tasting, onDone, onNext }: { tasting: TastingFull; onDone: () => void; onNext: () => void }) {
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [abv, setAbv] = useState("");
  const [cask, setCask] = useState("");
  const [notes, setNotes] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const isBlind = !!tasting.blindMode;

  const fetchWhiskies = useCallback(async () => {
    try {
      const res = await fetch(`/api/tastings/${tasting.id}/whiskies`);
      if (res.ok) {
        const data = await res.json();
        setWhiskies(data.sort((a: Whisky, b: Whisky) => a.sortOrder - b.sortOrder));
      }
    } catch {}
    setLoading(false);
  }, [tasting.id]);

  useEffect(() => { fetchWhiskies(); }, [fetchWhiskies]);

  const handleAdd = async () => {
    if (!name.trim() || adding) return;
    setAdding(true);
    setError("");

    try {
      const res = await fetch("/api/whiskies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tastingId: tasting.id,
          name: name.trim(),
          distillery: distillery.trim() || null,
          abv: abv ? parseFloat(abv) : null,
          caskInfluence: cask.trim() || null,
          notes: notes.trim() || null,
          sortOrder: whiskies.length,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to add whisky");
      }

      setName("");
      setDistillery("");
      setAbv("");
      setCask("");
      setNotes("");
      setShowDetails(false);
      await fetchWhiskies();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/whiskies/${id}`, { method: "DELETE" });
      await fetchWhiskies();
    } catch {}
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= whiskies.length) return;

    const updated = [...whiskies];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    const order = updated.map((w, i) => ({ id: w.id, sortOrder: i }));
    setWhiskies(updated.map((w, i) => ({ ...w, sortOrder: i })));

    try {
      await fetch(`/api/tastings/${tasting.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TastingHeader tasting={tasting} />

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <StepBadge step={2} />
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: c.text }} data-testid="text-step2-title">
            Add Whiskies
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: "block", marginBottom: 6 }}>
              Whisky Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lagavulin 16"
              style={inputStyle}
              maxLength={200}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              data-testid="input-whisky-name"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: c.muted,
              fontSize: 12,
              fontFamily: "system-ui, sans-serif",
              padding: "2px 0",
            }}
            data-testid="button-toggle-details"
          >
            <ChevronDown style={{ width: 12, height: 12, transform: showDetails ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            Details (optional)
          </button>

          {showDetails && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 4 }}>Distillery</label>
                  <input type="text" value={distillery} onChange={(e) => setDistillery(e.target.value)} placeholder="e.g. Lagavulin" style={{ ...inputStyle, fontSize: 13 }} data-testid="input-whisky-distillery" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 4 }}>ABV %</label>
                  <input type="number" value={abv} onChange={(e) => setAbv(e.target.value)} placeholder="e.g. 43" step="0.1" min="0" max="100" style={{ ...inputStyle, fontSize: 13 }} data-testid="input-whisky-abv" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 4 }}>Cask Type</label>
                <input type="text" value={cask} onChange={(e) => setCask(e.target.value)} placeholder="e.g. Ex-Bourbon, Sherry" style={{ ...inputStyle, fontSize: 13 }} data-testid="input-whisky-cask" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 4 }}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Host notes about this whisky" rows={2} style={{ ...inputStyle, fontSize: 13, resize: "vertical", minHeight: 40 }} data-testid="input-whisky-notes" />
              </div>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: c.danger, background: `${c.danger}15`, padding: "6px 10px", borderRadius: 8 }} data-testid="text-whisky-error">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || adding}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px",
              fontSize: 14,
              fontWeight: 600,
              background: name.trim() ? c.accent : c.border,
              color: name.trim() ? c.bg : c.muted,
              border: "none",
              borderRadius: 10,
              cursor: name.trim() ? "pointer" : "not-allowed",
              fontFamily: "system-ui, sans-serif",
              transition: "background 0.2s",
            }}
            data-testid="button-add-whisky"
          >
            <Plus style={{ width: 16, height: 16 }} />
            {adding ? "Adding…" : "Add Whisky"}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: c.muted, fontSize: 13, padding: "16px 0" }}>Loading…</div>
        ) : whiskies.length > 0 ? (
          <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.muted, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
              <span>{whiskies.length} {whiskies.length === 1 ? "whisky" : "whiskies"} added</span>
              {isBlind && <span style={{ color: c.accent, fontSize: 11 }}><EyeOff style={{ width: 11, height: 11, display: "inline", verticalAlign: "middle", marginRight: 3 }} />Blind labels active</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {whiskies.map((w, i) => (
                <div
                  key={w.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 12px" }}
                  data-testid={`card-whisky-${w.id}`}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                    <button type="button" onClick={() => handleMove(i, "up")} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? c.border : c.muted, padding: 0, lineHeight: 1 }} data-testid={`button-move-up-${w.id}`}>
                      <ChevronUp style={{ width: 14, height: 14 }} />
                    </button>
                    <button type="button" onClick={() => handleMove(i, "down")} disabled={i === whiskies.length - 1} style={{ background: "none", border: "none", cursor: i === whiskies.length - 1 ? "default" : "pointer", color: i === whiskies.length - 1 ? c.border : c.muted, padding: 0, lineHeight: 1 }} data-testid={`button-move-down-${w.id}`}>
                      <ChevronDown style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      {isBlind && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }} data-testid={`text-blind-label-${w.id}`}>
                          {blindLabel(i)}
                        </span>
                      )}
                      {!isBlind && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.muted, fontVariantNumeric: "tabular-nums", minWidth: 18 }}>
                          {i + 1}.
                        </span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 600, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-testid={`text-whisky-name-${w.id}`}>
                        {isBlind ? `${blindLabel(i)} — ${w.name}` : w.name}
                      </span>
                    </div>
                    {(w.distillery || w.abv) && (
                      <div style={{ fontSize: 11, color: c.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[w.distillery, w.abv ? `${w.abv}%` : null, w.caskInfluence].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => handleDelete(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: c.muted, padding: 4, flexShrink: 0 }} data-testid={`button-delete-whisky-${w.id}`}>
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 14, textAlign: "center" }}>
            <p style={{ color: c.muted, fontSize: 13, margin: 0 }} data-testid="text-no-whiskies">
              No whiskies yet. Add your first one above.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={onNext}
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
          data-testid="button-next-to-invite"
        >
          Next: Invite Participants
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
        <button
          type="button"
          onClick={onDone}
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
          data-testid="button-done-whiskies"
        >
          Back to Host
        </button>
      </div>
    </div>
  );
}

function InviteStep({ tasting, onDone }: { tasting: TastingFull; onDone: () => void }) {
  const [, navigate] = useLocation();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const joinUrl = `${window.location.origin}/enter?code=${tasting.code}`;

  useEffect(() => {
    QRCodeLib.toDataURL(joinUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#1a1714", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `casksense-${tasting.code}-qr.png`;
    a.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TastingHeader tasting={tasting} />

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <StepBadge step={3} />
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: c.text }} data-testid="text-step3-title">
            Invite Participants
          </h3>
        </div>

        <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>
          Share the session code or join link with your guests. No login required — they just need the code.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: c.bg, borderRadius: 10, padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: c.muted, marginBottom: 6 }}>
              Session Code
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: c.accent,
                fontFamily: "'Playfair Display', monospace",
                marginBottom: 10,
              }}
              data-testid="text-session-code-large"
            >
              {tasting.code}
            </div>
            <CopyButton text={tasting.code} label="Copy Code" />
          </div>

          <div style={{ background: c.bg, borderRadius: 10, padding: "16px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: c.muted, marginBottom: 8 }}>
              Join Link
            </div>
            <div
              style={{
                fontSize: 13,
                color: c.text,
                background: c.card,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${c.border}`,
                wordBreak: "break-all",
                marginBottom: 10,
                fontFamily: "monospace",
              }}
              data-testid="text-join-link"
            >
              {joinUrl}
            </div>
            <CopyButton text={joinUrl} label="Copy Link" fullWidth />
          </div>

          <div style={{ background: c.bg, borderRadius: 10, padding: "16px" }}>
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: c.text,
                fontSize: 14,
                fontFamily: "system-ui, sans-serif",
                padding: 0,
              }}
              data-testid="button-toggle-qr"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <QrCode style={{ width: 18, height: 18, color: c.accent }} />
                <span style={{ fontWeight: 600 }}>QR Code</span>
              </div>
              <ChevronDown style={{ width: 14, height: 14, color: c.muted, transform: showQr ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>

            {showQr && qrDataUrl && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 14 }}>
                <div style={{ background: "#fff", padding: 12, borderRadius: 10 }}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: 200, height: 200, display: "block" }} data-testid="img-qr-code" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={downloadQr}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "none",
                      border: `1px solid ${c.border}`,
                      borderRadius: 8,
                      padding: "8px 14px",
                      color: c.muted,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                    }}
                    data-testid="button-download-qr"
                  >
                    <Download style={{ width: 14, height: 14 }} />
                    Save
                  </button>
                  <CopyButton text={joinUrl} label="Copy Link" />
                </div>
              </div>
            )}
          </div>

          {typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={() => {
                navigator.share({
                  title: `Join: ${tasting.title}`,
                  text: `Join my whisky tasting "${tasting.title}" on CaskSense!\nSession Code: ${tasting.code}`,
                  url: joinUrl,
                }).catch(() => {});
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px",
                fontSize: 14,
                fontWeight: 600,
                background: `${c.accent}15`,
                color: c.accent,
                border: `1px solid ${c.accent}40`,
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid="button-native-share"
            >
              <Share2 style={{ width: 16, height: 16 }} />
              Share via…
            </button>
          )}
        </div>
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
          data-testid="button-go-to-session"
        >
          Go to Session
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
        <button
          type="button"
          onClick={onDone}
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
          data-testid="button-done-invite"
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

  const [wizardStep, setWizardStep] = useState<WizardStep>("list");
  const [createdTasting, setCreatedTasting] = useState<TastingFull | null>(null);

  const { data: tastings = [], isLoading } = useQuery<TastingFull[]>({
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

  const handleCreated = (tasting: TastingFull) => {
    setCreatedTasting(tasting);
    setWizardStep("step2");
    queryClient.invalidateQueries({ queryKey: ["/api/tastings", pid] });
  };

  const handleDismiss = () => {
    setCreatedTasting(null);
    setWizardStep("list");
    queryClient.invalidateQueries({ queryKey: ["/api/tastings", pid] });
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

  const showingWizard = wizardStep !== "list";

  return (
    <SimpleShell showBack={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        {!showingWizard && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }} data-testid="text-host-title">
                Host a Tasting
              </h2>
              <p style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
                Create a session, add whiskies, and run the tasting live.
              </p>
            </div>
            <button
              onClick={() => setWizardStep("step1")}
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
          </div>
        )}

        {wizardStep === "step1" && (
          <CreateWizard pid={pid} onClose={() => setWizardStep("list")} onCreated={handleCreated} />
        )}

        {wizardStep === "step2" && createdTasting && (
          <AddWhiskiesStep tasting={createdTasting} onDone={handleDismiss} onNext={() => setWizardStep("step3")} />
        )}

        {wizardStep === "step3" && createdTasting && (
          <InviteStep tasting={createdTasting} onDone={handleDismiss} />
        )}

        {!showingWizard && (
          <>
            {isLoading ? (
              <div style={{ textAlign: "center", color: c.muted, padding: "32px 0" }}>
                Loading...
              </div>
            ) : tastings.length === 0 ? (
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
                              <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>Code: {t.code}</div>
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
          </>
        )}
      </div>
    </SimpleShell>
  );
}
