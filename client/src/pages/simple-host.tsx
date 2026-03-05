import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Calendar, FileText, Settings, ChevronRight, ChevronLeft, ChevronDown, Copy, Check, ArrowRight, X, Trash2, ChevronUp, EyeOff, Share2, QrCode, Download, Play, Square, Eye, Users, BarChart3, Star, BookOpen, ClipboardList, Camera, FileSpreadsheet, Sparkles, Wine, ScanLine } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { getSession } from "@/lib/session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCodeLib from "qrcode";
import { c, cardStyle } from "@/lib/theme";
import { downloadDataUrl } from "@/lib/download";
import { AiTastingImportDialog } from "@/components/ai-tasting-import";
import { useTranslation } from "react-i18next";
import BackButton from "@/components/back-button";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  background: c.inputBg,
  border: `1px solid ${c.inputBorder}`,
  borderRadius: 10,
  color: c.text,
  outline: "none",
  fontFamily: "system-ui, sans-serif",
  boxSizing: "border-box",
};

const blindLabel = (index: number) => String.fromCharCode(65 + index);

type WizardStep = "list" | "step1" | "step2" | "step3" | "step4";

interface TastingFull {
  id: string;
  title: string;
  status: string;
  code: string;
  date: string | null;
  location: string | null;
  blindMode?: boolean;
  activeWhiskyId?: string | null;
  guidedMode?: boolean;
  guidedWhiskyIndex?: number;
  guidedRevealStep?: number;
  showRanking?: boolean;
  showGroupAvg?: boolean;
  ratingPrompt?: string | null;
}

interface Rating {
  id: string;
  whiskyId: string;
  participantId: string;
  overall: number | null;
}

interface TastingParticipant {
  id: string;
  participantId: string;
  participant: { id: string; name: string };
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
  imageUrl: string | null;
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
  const { t } = useTranslation();
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c.accent, background: `${c.accent}20`, padding: "2px 8px", borderRadius: 10 }}>
      {t("simpleHost.step", { n: step })}
    </span>
  );
}

function CopyButton({ text, label, fullWidth }: { text: string; label: string; fullWidth?: boolean }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

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
      {copied ? t("simpleHost.copied") : label}
    </button>
  );
}

function TastingHeader({ tasting }: { tasting: TastingFull }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  const isBlind = !!tasting.blindMode;

  return (
    <div style={{ ...cardStyle, border: `1px solid ${c.success}40`, padding: "14px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{tasting.title}</div>
          <div style={{ fontSize: 12, color: c.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{t("simpleHost.code")}: <strong style={{ color: c.accent, letterSpacing: "0.08em" }}>{tasting.code}</strong></span>
            {isBlind && (
              <span style={{ fontSize: 10, color: c.accent, background: `${c.accent}20`, padding: "1px 6px", borderRadius: 6 }}>
                <EyeOff style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                {t("simpleHost.blind")}
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
          {copied ? t("simpleHost.copiedShort") : t("simpleHost.copy")}
        </button>
      </div>
    </div>
  );
}

function CreateWizard({ pid, onClose, onCreated }: { pid: string; onClose: () => void; onCreated: (tasting: TastingFull) => void }) {
  const { t } = useTranslation();
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
        throw new Error(data.message || t("simpleHost.failedCreate"));
      }

      const tasting = await res.json();
      onCreated(tasting);
    } catch (e: any) {
      setError(e.message || t("simpleHost.somethingWrong"));
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
          {t("simpleHost.createTitle")}
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: "block", marginBottom: 6 }}>
            {t("simpleHost.tastingTitleLabel")}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("simpleHost.tastingTitlePlaceholder")}
            style={inputStyle}
            autoFocus
            maxLength={200}
            data-testid="input-tasting-title"
          />
        </div>

        <Toggle checked={blindMode} onChange={setBlindMode} label={t("simpleHost.blindMode")} />

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
          {t("simpleHost.advancedOptions")}
        </button>

        {showAdvanced && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingLeft: 4 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: "block", marginBottom: 6 }}>
                {t("simpleHost.dateLabel")}
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
                {t("simpleHost.descriptionLabel")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("simpleHost.descriptionPlaceholder")}
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
          {submitting ? t("simpleHost.creating") : t("simpleHost.createTasting")}
        </button>
      </div>
    </div>
  );
}

function AddWhiskiesStep({ tasting, onDone, onNext }: { tasting: TastingFull; onDone: () => void; onNext: () => void }) {
  const { t } = useTranslation();
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
        throw new Error(data.message || t("simpleHost.failedAddWhisky"));
      }

      setName("");
      setDistillery("");
      setAbv("");
      setCask("");
      setNotes("");
      setShowDetails(false);
      await fetchWhiskies();
    } catch (e: any) {
      setError(e.message || t("simpleHost.somethingWrong"));
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
            {t("simpleHost.addWhiskiesTitle")}
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
              placeholder={t("simpleHost.whiskyNamePlaceholder")}
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
            {adding ? t("simpleHost.adding") : t("simpleHost.addWhisky")}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: c.muted, fontSize: 13, padding: "16px 0" }}>Loading…</div>
        ) : whiskies.length > 0 ? (
          <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.muted, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
              <span>{whiskies.length === 1 ? t("simpleHost.whiskyAdded", { count: whiskies.length }) : t("simpleHost.whiskiesAdded", { count: whiskies.length })}</span>
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
                  {w.imageUrl && (
                    <img src={w.imageUrl} alt="" style={{ width: 32, height: 42, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: c.bg }} data-testid={`img-whisky-${w.id}`} />
                  )}
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
          {t("simpleHost.doneButton")}
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
          {t("simpleHost.backToHost")}
        </button>
      </div>
    </div>
  );
}

function InviteStep({ tasting, onDone, onNext }: { tasting: TastingFull; onDone: () => void; onNext: () => void }) {
  const { t } = useTranslation();
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
    downloadDataUrl(qrDataUrl, `casksense-${tasting.code}-qr.png`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TastingHeader tasting={tasting} />

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <StepBadge step={3} />
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: c.text }} data-testid="text-step3-title">
            {t("simpleHost.inviteTitle")}
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
            <CopyButton text={tasting.code} label={t("simpleHost.copyCode")} />
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
            <CopyButton text={joinUrl} label={t("simpleHost.copyLink")} fullWidth />
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
                <span style={{ fontWeight: 600 }}>{t("simpleHost.shareQR")}</span>
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
                  <CopyButton text={joinUrl} label={t("simpleHost.copyLink")} />
                </div>
              </div>
            )}
          </div>

          {typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={() => {
                navigator.share({
                  title: t("simpleHost.joinPrefix", { title: tasting.title }),
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
          data-testid="button-next-to-live"
        >
          {t("simpleHost.goLive")}
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
          {t("simpleHost.backToHost")}
        </button>
      </div>
    </div>
  );
}

function RunLiveStep({ tasting: initialTasting, pid, onDone }: { tasting: TastingFull; pid: string; onDone: () => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const { data: liveTasting } = useQuery<TastingFull>({
    queryKey: ["/api/tastings", initialTasting.id, "live"],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${initialTasting.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 3000,
    initialData: initialTasting,
  });
  const tasting = liveTasting || initialTasting;

  const { data: whiskies = [] } = useQuery<Whisky[]>({
    queryKey: ["/api/tastings", tasting.id, "whiskies-live"],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tasting.id}/whiskies`);
      if (!res.ok) return [];
      return (await res.json()).sort((a: Whisky, b: Whisky) => a.sortOrder - b.sortOrder);
    },
  });

  const { data: participants = [] } = useQuery<TastingParticipant[]>({
    queryKey: ["/api/tastings", tasting.id, "participants-live"],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tasting.id}/participants`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: ratings = [] } = useQuery<Rating[]>({
    queryKey: ["/api/tastings", tasting.id, "ratings-live"],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tasting.id}/ratings`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000,
    enabled: tasting.status === "open",
  });

  const isBlind = !!tasting.blindMode;
  const isOpen = tasting.status === "open";
  const isDraft = tasting.status === "draft";

  const activeIndex = tasting.guidedWhiskyIndex ?? -1;
  const activeWhisky = activeIndex >= 0 && activeIndex < whiskies.length ? whiskies[activeIndex] : null;
  const revealStep = tasting.guidedRevealStep ?? 0;
  const showResults = !!tasting.showGroupAvg;

  const patchTasting = async (body: Record<string, any>) => {
    await fetch(`/api/tastings/${tasting.id}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/tastings/${tasting.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, hostId: pid }),
    });
  };

  const updateGuided = async (body: Record<string, any>) => {
    await fetch(`/api/tastings/${tasting.id}/guided-mode`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, ...body }),
    });
  };

  const goToWhisky = async (index: number) => {
    await fetch(`/api/tastings/${tasting.id}/guided-goto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, whiskyIndex: index, revealStep: 0 }),
    });
  };

  const handleStartSession = async () => {
    await updateStatus("open");
    if (whiskies.length > 0) {
      await updateGuided({ guidedMode: true, guidedWhiskyIndex: 0, guidedRevealStep: 0 });
    }
    await fetch(`/api/tastings/${tasting.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: pid }),
    });
  };

  const handleEndSession = async () => {
    await updateStatus("closed");
  };

  const handleReveal = async () => {
    const nextStep = Math.min((tasting.guidedRevealStep ?? 0) + 1, 3);
    await updateGuided({ guidedRevealStep: nextStep });
  };

  const handleToggleResults = async () => {
    await patchTasting({ showGroupAvg: !showResults, showRanking: !showResults });
  };

  const activeRatings = activeWhisky ? ratings.filter((r) => r.whiskyId === activeWhisky.id) : [];
  const avgScore = activeRatings.length > 0
    ? Math.round(activeRatings.reduce((sum, r) => sum + (r.overall ?? 0), 0) / activeRatings.length)
    : null;

  const guestParticipants = participants.filter((p) => p.participantId !== pid);
  const ratedParticipantIds = new Set(activeRatings.map((r) => r.participantId));

  const sectionCard: React.CSSProperties = {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: "20px",
  };

  const sectionTitle = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: c.muted, marginBottom: 14 }}>
      {label}
    </div>
  );

  const bigButton = (opts: { onClick: () => void; icon: React.ElementType; label: string; bg: string; color: string; borderColor?: string; disabled?: boolean; testId: string }) => {
    const Icon = opts.icon;
    return (
      <button
        type="button"
        onClick={opts.onClick}
        disabled={opts.disabled}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "14px",
          fontSize: 16,
          fontWeight: 700,
          background: opts.bg,
          color: opts.color,
          border: opts.borderColor ? `1px solid ${opts.borderColor}` : "none",
          borderRadius: 12,
          cursor: opts.disabled ? "not-allowed" : "pointer",
          fontFamily: "system-ui, sans-serif",
          opacity: opts.disabled ? 0.5 : 1,
          transition: "opacity 0.2s",
        }}
        data-testid={opts.testId}
      >
        <Icon style={{ width: 20, height: 20 }} />
        {opts.label}
      </button>
    );
  };

  if (isDraft) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={sectionCard}>
          {sectionTitle(t("simpleHost.tastingOverview"))}
          <div style={{ fontSize: 20, fontWeight: 700, color: c.text, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>{tasting.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: c.muted }}>
            <span>{t("simpleHost.code")}: <strong style={{ color: c.accent, letterSpacing: "0.08em" }}>{tasting.code}</strong></span>
            {isBlind && (
              <span style={{ fontSize: 10, color: c.accent, background: `${c.accent}20`, padding: "2px 6px", borderRadius: 6 }}>
                <EyeOff style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                {t("simpleHost.blind")}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: c.muted, marginTop: 8 }}>
            {whiskies.length === 0
              ? t("simpleHost.noWhiskiesYet")
              : t("simpleHost.whiskiesReady", { count: whiskies.length, unit: whiskies.length === 1 ? t("simpleHost.whisky") : t("simpleHost.whiskies") })}
          </div>
        </div>

        <div style={{ padding: "8px 0" }}>
          {bigButton({
            onClick: handleStartSession,
            icon: Play,
            label: t("simpleHost.startTasting"),
            bg: whiskies.length > 0 ? c.success : c.border,
            color: whiskies.length > 0 ? "#fff" : c.muted,
            disabled: whiskies.length === 0,
            testId: "button-start-session",
          })}
          {whiskies.length === 0 && (
            <p style={{ fontSize: 12, color: c.muted, textAlign: "center", marginTop: 8 }}>{t("simpleHost.addWhiskiesFirst")}</p>
          )}
        </div>

        <button type="button" onClick={onDone} style={{ width: "100%", padding: "10px", fontSize: 13, background: "none", color: c.muted, border: `1px solid ${c.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-done-live">
          {t("simpleHost.backToHost")}
        </button>
      </div>
    );
  }

  if (!isDraft && !isOpen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={sectionCard}>
          {sectionTitle(t("simpleHost.tastingOverview"))}
          <div style={{ fontSize: 20, fontWeight: 700, color: c.text, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>{tasting.title}</div>
          <div style={{ fontSize: 13, color: c.muted }}>
            {t("simpleHost.tastingIs")} <strong style={{ color: c.text }}>{tasting.status}</strong>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bigButton({
            onClick: () => navigate(`/tasting-results/${tasting.id}`),
            icon: BarChart3,
            label: t("simpleHost.viewResults"),
            bg: c.accent,
            color: c.bg,
            testId: "button-view-results",
          })}
          {bigButton({
            onClick: () => navigate(`/recap/${tasting.id}`),
            icon: ClipboardList,
            label: t("simpleHost.viewRecap"),
            bg: c.card,
            color: c.accent,
            testId: "button-view-recap",
          })}
          <button
            type="button"
            onClick={() => navigate(`/legacy/tasting/${tasting.id}`)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px", fontSize: 13, fontWeight: 500, background: "none", color: c.muted,
              border: `1px solid ${c.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif",
            }}
            data-testid="button-view-session"
          >
            {t("simpleHost.fullDashboard")}
          </button>
        </div>

        <button type="button" onClick={onDone} style={{ width: "100%", padding: "10px", fontSize: 13, background: "none", color: c.muted, border: `1px solid ${c.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-done-live">
          {t("simpleHost.backToHost")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <div style={sectionCard} data-testid="section-overview">
        {sectionTitle(t("simpleHost.tastingOverview"))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.text, fontFamily: "'Playfair Display', serif", marginBottom: 4 }} data-testid="text-tasting-title">
              {tasting.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: c.muted }}>
                {t("simpleHost.code")}: <strong style={{ color: c.accent, letterSpacing: "0.08em", fontSize: 15 }}>{tasting.code}</strong>
              </span>
              <button
                type="button"
                onClick={async () => { try { await navigator.clipboard.writeText(tasting.code); } catch {} }}
                style={{ background: "none", border: "none", cursor: "pointer", color: c.muted, padding: 2 }}
                data-testid="button-copy-code"
              >
                <Copy style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isBlind && (
              <span style={{ fontSize: 10, fontWeight: 600, color: c.accent, background: `${c.accent}20`, padding: "3px 8px", borderRadius: 6 }}>
                <EyeOff style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                {t("simpleHost.blind")}
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              color: c.success, background: `${c.success}20`, padding: "3px 8px", borderRadius: 6,
            }} data-testid="badge-session-status">
              {t("simpleHost.live")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.text, fontFamily: "'Playfair Display', serif" }} data-testid="text-participant-count">
              {guestParticipants.length}
            </div>
            <div style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("simpleHost.participants")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.text, fontFamily: "'Playfair Display', serif" }}>
              {whiskies.length}
            </div>
            <div style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("simpleHost.whiskies")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.text, fontFamily: "'Playfair Display', serif" }} data-testid="text-rating-count">
              {activeRatings.length}
            </div>
            <div style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("simpleHost.ratingsLabel")}</div>
          </div>
          {avgScore !== null && showResults && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }} data-testid="text-avg-score">
                {avgScore}
              </div>
              <div style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("simpleHost.avgScore")}</div>
            </div>
          )}
        </div>
      </div>

      <div style={sectionCard} data-testid="section-dram-control">
        {sectionTitle(t("simpleHost.dramControl"))}

        <div style={{ background: c.bg, borderRadius: 12, padding: "18px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: c.muted, marginBottom: 6 }}>
            {t("simpleHost.currentDram")}
          </div>
          {activeWhisky ? (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {activeWhisky.imageUrl && (
                <img src={activeWhisky.imageUrl} alt="" style={{ width: 48, height: 64, objectFit: "cover", borderRadius: 8, flexShrink: 0, background: c.card }} data-testid="img-active-whisky" />
              )}
              <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif", marginBottom: 2 }} data-testid="text-active-whisky">
                {isBlind ? `Whisky ${blindLabel(activeIndex)}` : activeWhisky.name}
              </div>
              {isBlind && (
                <div style={{ fontSize: 13, color: c.muted, display: "flex", alignItems: "center", gap: 6 }} data-testid="text-active-whisky-real">
                  <EyeOff style={{ width: 12, height: 12 }} />
                  {activeWhisky.name}
                  {activeWhisky.distillery && ` · ${activeWhisky.distillery}`}
                </div>
              )}
              {!isBlind && activeWhisky.distillery && (
                <div style={{ fontSize: 13, color: c.muted, marginTop: 2 }}>
                  {[activeWhisky.distillery, activeWhisky.abv ? `${activeWhisky.abv}%` : null].filter(Boolean).join(" · ")}
                </div>
              )}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: c.muted }}>{t("simpleHost.noWhiskySelected")}</div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {whiskies.map((w, i) => {
            const isActive = i === activeIndex;
            const whiskyRatings = ratings.filter((r) => r.whiskyId === w.id);
            const done = whiskyRatings.length >= guestParticipants.length && guestParticipants.length > 0;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => goToWhisky(i)}
                style={{
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? c.accent : done ? `${c.success}15` : c.bg,
                  color: isActive ? c.bg : done ? c.success : c.text,
                  border: `1.5px solid ${isActive ? c.accent : done ? c.success + "40" : c.border}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  transition: "all 0.15s",
                  position: "relative",
                }}
                data-testid={`button-select-whisky-${w.id}`}
              >
                {isBlind ? blindLabel(i) : `${i + 1}`}
                {done && !isActive && (
                  <Check style={{ width: 10, height: 10, position: "absolute", top: -3, right: -3, color: c.success }} />
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {isBlind && activeWhisky && (
            <button
              type="button"
              onClick={handleReveal}
              disabled={revealStep >= 3}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                background: revealStep < 3 ? `${c.accent}15` : c.border,
                color: revealStep < 3 ? c.accent : c.muted,
                border: `1.5px solid ${revealStep < 3 ? c.accent + "50" : c.border}`,
                borderRadius: 12,
                cursor: revealStep < 3 ? "pointer" : "not-allowed",
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid="button-reveal"
            >
              <Eye style={{ width: 18, height: 18 }} />
              {revealStep === 0 ? t("simpleHost.revealName") : revealStep === 1 ? t("simpleHost.revealDetails") : revealStep === 2 ? t("simpleHost.revealImage") : t("simpleHost.fullyRevealed")}
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleResults}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px",
              fontSize: 14,
              fontWeight: 600,
              background: showResults ? `${c.success}15` : c.bg,
              color: showResults ? c.success : c.muted,
              border: `1.5px solid ${showResults ? c.success + "50" : c.border}`,
              borderRadius: 12,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="button-toggle-results"
          >
            <BarChart3 style={{ width: 16, height: 16 }} />
            {showResults ? t("simpleHost.resultsVisible") : t("simpleHost.showResults")}
          </button>
          {tasting.status === "open" && (
            <button
              type="button"
              onClick={() => navigate(`/tasting-room-simple/${tasting.id}`)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                background: `${c.accent}15`,
                color: c.accent,
                border: `1.5px solid ${c.accent}50`,
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid="button-host-rate"
            >
              <Star style={{ width: 18, height: 18 }} />
              {t("simpleHost.rateThisWhisky")}
            </button>
          )}
        </div>
      </div>

      <div style={sectionCard} data-testid="section-participants">
        {sectionTitle(t("simpleHost.participantsCount", { count: guestParticipants.length }))}

        {guestParticipants.length === 0 ? (
          <div style={{ fontSize: 13, color: c.muted, textAlign: "center", padding: "12px 0" }}>
            {t("simpleHost.noParticipants")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {guestParticipants.map((p) => {
              const hasRated = ratedParticipantIds.has(p.participantId);
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: c.bg,
                    borderRadius: 8,
                  }}
                  data-testid={`participant-row-${p.participantId}`}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: c.text }}>
                    {p.participant.name}
                  </span>
                  {activeWhisky ? (
                    hasRated ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: c.success, fontWeight: 600 }}>
                        <Check style={{ width: 14, height: 14 }} />
                        {t("simpleHost.rated")}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: c.muted }}>...</span>
                    )
                  ) : (
                    <span style={{ fontSize: 12, color: c.muted }}>{t("simpleHost.joined")}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bigButton({
          onClick: handleEndSession,
          icon: Square,
          label: t("simpleHost.endTasting"),
          bg: `${c.danger}15`,
          color: c.danger,
          borderColor: `${c.danger}40`,
          testId: "button-end-session",
        })}

        <button type="button" onClick={onDone} style={{ width: "100%", padding: "10px", fontSize: 13, background: "none", color: c.muted, border: `1px solid ${c.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-done-live">
          {t("simpleHost.backToHost")}
        </button>
      </div>
    </div>
  );
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  status: string;
  code: string;
  hostName: string;
  participantCount: number;
  whiskyCount: number;
}

function parseCalendarDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime()) && dateStr.includes("-")) return iso;
  const euMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) return new Date(+euMatch[3], +euMatch[2] - 1, +euMatch[1]);
  return null;
}

function HostCalendar({ pid }: { pid: string }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
    queryFn: async () => {
      const res = await fetch("/api/calendar");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = parseCalendarDate(ev.date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedEvents = selectedDay ? (eventsByDate.get(selectedDay) || []) : [];

  const statusColor = (status: string) => {
    if (status === "open" || status === "reveal") return c.success;
    if (status === "draft") return "#888";
    return c.accent;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          style={{ background: "none", border: "none", color: c.text, cursor: "pointer", padding: 4 }}
          data-testid="button-calendar-prev"
        >
          <ChevronLeft style={{ width: 20, height: 20 }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: c.text }}>
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          style={{ background: "none", border: "none", color: c.text, cursor: "pointer", padding: 4 }}
          data-testid="button-calendar-next"
        >
          <ChevronRight style={{ width: 20, height: 20 }} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
        {dayNames.map((d) => (
          <div key={d} style={{ fontSize: 11, fontWeight: 600, color: c.muted, padding: "4px 0", textTransform: "uppercase" }}>
            {d}
          </div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDay;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : dateKey)}
              style={{
                background: isSelected ? c.accent : isToday ? `${c.accent}20` : "transparent",
                color: isSelected ? c.bg : c.text,
                border: "none",
                borderRadius: 8,
                padding: "6px 0 2px",
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
                fontSize: 14,
                fontWeight: isToday || isSelected ? 700 : 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minHeight: 36,
              }}
              data-testid={`calendar-day-${dateKey}`}
            >
              {day}
              {dayEvents.length > 0 && (
                <div style={{ display: "flex", gap: 2 }}>
                  {dayEvents.slice(0, 3).map((ev, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: isSelected ? c.bg : statusColor(ev.status),
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && selectedEvents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {selectedEvents.map((ev) => (
            <Link key={ev.id} href={ev.status === "closed" || ev.status === "archived" ? `/tasting-results/${ev.id}` : "#"}>
              <div
                style={{
                  ...cardStyle,
                  padding: "12px 14px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderLeft: `3px solid ${statusColor(ev.status)}`,
                }}
                data-testid={`calendar-event-${ev.id}`}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
                    {ev.whiskyCount} whiskies · {ev.participantCount} participants
                  </div>
                </div>
                <StatusBadge status={ev.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {selectedDay && selectedEvents.length === 0 && (
        <div style={{ fontSize: 13, color: c.muted, textAlign: "center", padding: "8px 0" }}>
          No tastings on this day.
        </div>
      )}
    </div>
  );
}

function parseTastingDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime()) && dateStr.includes("-")) return iso;
  const euMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) return new Date(+euMatch[3], +euMatch[2] - 1, +euMatch[1]);
  return null;
}

interface TimeGroup {
  key: string;
  label: string;
  tastings: TastingFull[];
}

function groupByTimePeriod(tastings: TastingFull[]): TimeGroup[] {
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const groups: TimeGroup[] = [
    { key: "30d", label: "last30", tastings: [] },
    { key: "90d", label: "last90", tastings: [] },
    { key: "year", label: "thisYear", tastings: [] },
    { key: "older", label: "older", tastings: [] },
  ];

  const sorted = [...tastings].sort((a, b) => {
    const da = parseTastingDate(a.date);
    const db = parseTastingDate(b.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  });

  for (const t of sorted) {
    const d = parseTastingDate(t.date);
    if (!d || d >= d30) groups[0].tastings.push(t);
    else if (d >= d90) groups[1].tastings.push(t);
    else if (d >= yearStart) groups[2].tastings.push(t);
    else groups[3].tastings.push(t);
  }

  return groups.filter(g => g.tastings.length > 0);
}

function CollapsibleSection({ label, count, labelColor, defaultOpen, children, testId }: {
  label: string;
  count: number;
  labelColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  testId: string;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }} data-testid={testId}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: c.text,
          fontFamily: "system-ui, sans-serif",
        }}
        data-testid={`button-toggle-${testId}`}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: labelColor || c.muted }}>
            {label}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: c.accent,
            background: `${c.accent}18`,
            padding: "2px 8px",
            borderRadius: 10,
          }}>
            {count}
          </span>
        </div>
        {open
          ? <ChevronUp style={{ width: 16, height: 16, color: c.muted }} />
          : <ChevronDown style={{ width: 16, height: 16, color: c.muted }} />
        }
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function HistoryAccordion({ tastings }: { tastings: TastingFull[] }) {
  const { t } = useTranslation();
  const groups = useMemo(() => groupByTimePeriod(tastings), [tastings]);

  if (tastings.length === 0) return null;

  return (
    <CollapsibleSection label={t("simpleHost.history")} count={tastings.length} defaultOpen={false} testId="section-history">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.map(group => (
          <CollapsibleSection key={group.key} label={t(`simpleHost.${group.label}`)} count={group.tastings.length} defaultOpen={groups[0]?.key === group.key} testId={`history-group-${group.key}`}>
            {group.tastings.map(ts => (
              <div
                key={ts.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                }}
                data-testid={`card-tasting-${ts.id}`}
              >
                <Link href={`/tasting-results/${ts.id}`}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{ts.title}</div>
                      {ts.date && <div style={{ fontSize: 11, color: c.muted, marginTop: 3 }}>{ts.date}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusBadge status={ts.status} />
                      <ChevronRight style={{ width: 14, height: 14, color: c.muted }} />
                    </div>
                  </div>
                </Link>
                {(ts.status === "closed" || ts.status === "archived" || ts.status === "reveal") && (
                  <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${c.border}` }}>
                    <Link href={`/tasting-results/${ts.id}`}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: c.accent, cursor: "pointer" }} data-testid={`results-link-${ts.id}`}>
                        <BarChart3 style={{ width: 12, height: 12 }} /> Results
                      </span>
                    </Link>
                    <Link href={`/recap/${ts.id}`}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: c.mutedLight, cursor: "pointer" }} data-testid={`recap-link-${ts.id}`}>
                        <ClipboardList style={{ width: 12, height: 12 }} /> Recap
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </CollapsibleSection>
        ))}
      </div>
    </CollapsibleSection>
  );
}

export default function SimpleHostPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [sessionState, setSessionState] = useState(getSession());

  useEffect(() => {
    const refresh = () => setSessionState(getSession());
    window.addEventListener("session-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("session-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const pid = sessionState.pid || null;

  const [wizardStep, setWizardStep] = useState<WizardStep>("list");
  const [createdTasting, setCreatedTasting] = useState<TastingFull | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const { data: tastings = [], isLoading } = useQuery<TastingFull[]>({
    queryKey: ["/api/tastings", pid],
    queryFn: async () => {
      if (!pid) return [];
      const res = await fetch(`/api/tastings?participantId=${pid}`);
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
            {t("simpleHost.pageTitle")}
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
      <BackButton fallback="/tasting" />
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        {!showingWizard && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }} data-testid="text-host-title">
              {t("simpleHost.pageTitle")}
            </h2>
            <p style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
              {t("simpleHost.pageSubtitle")}
            </p>
          </div>
        )}

        {wizardStep === "step1" && (
          <CreateWizard pid={pid} onClose={() => setWizardStep("list")} onCreated={handleCreated} />
        )}

        {wizardStep === "step2" && createdTasting && (
          <AddWhiskiesStep tasting={createdTasting} onDone={handleDismiss} onNext={() => setWizardStep("step3")} />
        )}

        {wizardStep === "step3" && createdTasting && (
          <InviteStep tasting={createdTasting} onDone={handleDismiss} onNext={() => setWizardStep("step4")} />
        )}

        {wizardStep === "step4" && createdTasting && pid && (
          <RunLiveStep tasting={createdTasting} pid={pid} onDone={handleDismiss} />
        )}

        {!showingWizard && (
          <>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "14px 20px",
                  background: c.accent,
                  border: "none",
                  borderRadius: 14,
                  color: "#1a1714",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  letterSpacing: "-0.01em",
                }}
                data-testid="button-new-tasting"
              >
                <Plus style={{ width: 18, height: 18 }} strokeWidth={2.5} />
                Neues Tasting
              </button>

              {createMenuOpen && (
                <div
                  style={{
                    ...cardStyle,
                    marginTop: 8,
                    padding: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    overflow: "hidden",
                  }}
                  data-testid="menu-create-options"
                >
                  {[
                    { label: t("simpleHost.manualEntry"), desc: t("simpleHost.manualEntryDesc"), icon: Plus, color: c.accent, bg: `${c.accent}18`, action: () => { setWizardStep("step1"); setCreateMenuOpen(false); }, testId: "card-create-manual" },
                    { label: "Photo / AI", desc: "Snap & identify bottles", icon: Camera, color: "#60a5fa", bg: "rgba(96,165,250,0.15)", href: "/photo-tasting", testId: "card-create-photo" },
                    { label: "Barcode", desc: "Scan bottle barcode", icon: ScanLine, color: "#f59e0b", bg: "rgba(245,158,11,0.15)", href: "/log-simple?barcode=1", testId: "card-create-barcode" },
                    { label: "Excel / CSV Import", desc: "From spreadsheet or text", icon: FileSpreadsheet, color: "#4ade80", bg: "rgba(74,222,128,0.15)", action: () => { setImportDialogOpen(true); setCreateMenuOpen(false); }, testId: "card-create-import" },
                    { label: t("simpleHost.aiLineup"), desc: t("simpleHost.aiLineupDesc"), icon: Sparkles, color: c.accent, bg: `${c.accent}15`, href: "/ai-curation", testId: "card-ai-curation" },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const content = (
                      <div
                        key={item.testId}
                        onClick={item.action}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          cursor: "pointer",
                          borderRadius: 10,
                          transition: "background 0.15s",
                        }}
                        data-testid={item.testId}
                      >
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <IconComp style={{ width: 17, height: 17, color: item.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{item.desc}</div>
                        </div>
                        <ChevronRight style={{ width: 14, height: 14, color: `${c.muted}60`, flexShrink: 0 }} />
                      </div>
                    );
                    return item.href ? <Link key={item.testId} href={item.href}>{content}</Link> : <div key={item.testId}>{content}</div>;
                  })}
                </div>
              )}
            </div>

            <AiTastingImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

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
                  <CollapsibleSection label={t("simpleHost.live")} count={activeTastings.length} labelColor={c.accent} defaultOpen={true} testId="section-live">
                    {activeTastings.map((ts) => (
                      <div
                        key={ts.id}
                        onClick={() => { setCreatedTasting(ts); setWizardStep("step4"); }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: c.bg,
                          border: `1px solid ${c.border}`,
                          cursor: "pointer",
                        }}
                        data-testid={`card-tasting-${ts.id}`}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{ts.title}</div>
                          <div style={{ fontSize: 11, color: c.muted, marginTop: 3 }}>{t("simpleHost.code")}: {ts.code}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={ts.status} />
                          <ChevronRight style={{ width: 14, height: 14, color: c.muted }} />
                        </div>
                      </div>
                    ))}
                  </CollapsibleSection>
                )}

              </>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.muted, marginBottom: 2 }}>
                Tools
              </h3>
              <div style={cardStyle} data-testid="section-calendar">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Calendar style={{ width: 18, height: 18, color: c.accent }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Calendar</span>
                </div>
                {pid && <HostCalendar pid={pid} />}
              </div>
              <Link href="/my-taste/pairings">
                <div style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} data-testid="link-lineup-suggestions">
                  <Wine style={{ width: 18, height: 18, color: c.accent }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Lineup-Ergänzung</span>
                    <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Whisky-Vorschläge für dein Tasting-Lineup</div>
                  </div>
                  <ChevronRight style={{ width: 14, height: 14, color: c.muted, flexShrink: 0 }} />
                </div>
              </Link>
              <Link href="/host-dashboard">
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
