import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Library, Pencil, Loader2, Check, AlertCircle } from "lucide-react";
import { FONT } from "@/labs/components/rating/theme";
import {
  saveToCollection,
  saveToJournal,
  saveToWishlist,
  deleteCollectionEntry,
  deleteJournalEntry,
  deleteWishlistEntry,
  type CheckCandidateMeta,
  type SaveResult,
} from "./checkActions";

type Saving = null | "wishlist" | "collection" | "journal";
type Kind = "wishlist" | "collection" | "journal";
type Pill = { kind: Kind; id: string; status: "success" } | { kind: Kind; status: "error"; message: string } | null;

type Props = {
  pid: string | null;
  meta: CheckCandidateMeta;
};

export default function CheckActionCard({ pid, meta }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState<Saving>(null);
  const [pill, setPill] = useState<Pill>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const pillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    };
  }, []);

  const showPill = (next: Pill, autoHideMs = 5000) => {
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    setPill(next);
    if (next && autoHideMs > 0) {
      pillTimerRef.current = setTimeout(() => setPill(null), autoHideMs);
    }
  };

  const handleResult = (kind: Kind, res: SaveResult) => {
    if (res.ok) {
      showPill({ kind, id: res.id, status: "success" });
    } else {
      showPill({ kind, status: "error", message: res.message }, 6000);
    }
  };

  const onWishlist = async () => {
    if (!pid) return;
    setSaving("wishlist");
    const res = await saveToWishlist(pid, meta);
    setSaving(null);
    handleResult("wishlist", res);
  };

  const onCollection = async () => {
    if (!pid) return;
    setSaving("collection");
    const res = await saveToCollection(pid, meta);
    setSaving(null);
    handleResult("collection", res);
  };

  const onJournalSubmit = async (payload: { noseNotes?: string; tasteNotes?: string; finishNotes?: string; personalScore?: number }) => {
    if (!pid) return;
    setSaving("journal");
    const res = await saveToJournal(pid, meta, payload);
    setSaving(null);
    setJournalOpen(false);
    handleResult("journal", res);
  };

  const onUndo = async () => {
    if (!pid || !pill || pill.status !== "success") return;
    const id = pill.id;
    const kind = pill.kind;
    let ok = false;
    if (kind === "wishlist") ok = await deleteWishlistEntry(pid, id);
    else if (kind === "collection") ok = await deleteCollectionEntry(pid, id);
    else if (kind === "journal") ok = await deleteJournalEntry(pid, id);
    if (ok) {
      showPill(null);
    } else {
      showPill({ kind, status: "error", message: t("check.actions.undoFailed", "Rückgängig fehlgeschlagen.") }, 6000);
    }
  };

  const recognizedOnly = !meta.whiskyId;
  const disabled = !pid || saving !== null;

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: 14,
        border: "1px solid var(--labs-border)",
        background: "var(--labs-surface-elevated)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
      data-testid="check-action-card"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--labs-accent)",
          fontFamily: FONT.body,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        <span>{t("check.actions.title", "Was möchtest du tun?")}</span>
      </div>

      {recognizedOnly && pid && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(200, 169, 126, 0.10)",
            border: "1px solid rgba(200, 169, 126, 0.35)",
            color: "var(--labs-text-secondary)",
            fontFamily: FONT.body,
            fontSize: 12,
            lineHeight: 1.45,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
          data-testid="check-action-recognized-only"
        >
          <AlertCircle className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)", marginTop: 2, flexShrink: 0 }} />
          <span>
            {t(
              "check.actions.recognizedOnly",
              "Noch nicht in CaskSense — beim Speichern legen wir den Eintrag auf Basis der erkannten Daten an.",
            )}
          </span>
        </div>
      )}

      {!pid && (
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 12,
            color: "var(--labs-text-secondary)",
          }}
          data-testid="check-action-login-hint"
        >
          {t("check.actions.loginHint", "Melde dich an, um diese Flasche zu speichern.")}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        <ActionButton
          icon={<Heart className="w-4 h-4" />}
          label={t("check.actions.wishlist", "Wunschliste")}
          onClick={onWishlist}
          loading={saving === "wishlist"}
          disabled={disabled}
          testid="button-check-save-wishlist"
        />
        <ActionButton
          icon={<Library className="w-4 h-4" />}
          label={t("check.actions.collection", "Sammlung")}
          onClick={onCollection}
          loading={saving === "collection"}
          disabled={disabled}
          testid="button-check-save-collection"
        />
        <ActionButton
          icon={<Pencil className="w-4 h-4" />}
          label={t("check.actions.journal", "Schnellnotiz")}
          onClick={() => setJournalOpen((v) => !v)}
          loading={false}
          disabled={!pid}
          testid="button-check-save-journal"
          active={journalOpen}
        />
      </div>

      {journalOpen && pid && (
        <JournalInlineForm
          onCancel={() => setJournalOpen(false)}
          onSubmit={onJournalSubmit}
          submitting={saving === "journal"}
        />
      )}

      {pill && (
        <ResultPill
          pill={pill}
          onUndo={onUndo}
          onDismiss={() => showPill(null)}
        />
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  loading,
  disabled,
  testid,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  testid: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "12px 8px",
        borderRadius: 10,
        border: active ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
        background: active ? "rgba(200, 169, 126, 0.12)" : "var(--labs-surface)",
        color: disabled ? "var(--labs-text-muted)" : "var(--labs-text)",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT.body,
        fontSize: 12,
        fontWeight: 500,
        transition: "all 120ms ease",
      }}
      data-testid={testid}
    >
      <span style={{ color: disabled ? "var(--labs-text-muted)" : "var(--labs-accent)" }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function JournalInlineForm({
  onCancel,
  onSubmit,
  submitting,
}: {
  onCancel: () => void;
  onSubmit: (payload: { noseNotes?: string; tasteNotes?: string; finishNotes?: string; personalScore?: number }) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState<number>(80);

  const handleSubmit = () => {
    const trimmed = notes.trim();
    onSubmit({
      tasteNotes: trimmed.length > 0 ? trimmed : undefined,
      personalScore: score,
    });
  };

  return (
    <div
      style={{
        padding: "12px",
        borderRadius: 10,
        border: "1px solid var(--labs-border)",
        background: "var(--labs-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      data-testid="check-journal-form"
    >
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t("check.journal.placeholder", "Kurze Notiz: Nase, Geschmack, Abgang…")}
        rows={3}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: 8,
          border: "1px solid var(--labs-border)",
          background: "var(--labs-bg)",
          color: "var(--labs-text)",
          fontFamily: FONT.body,
          fontSize: 13,
          resize: "vertical",
          minHeight: 70,
        }}
        data-testid="input-check-journal-notes"
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label
          style={{
            fontFamily: FONT.body,
            fontSize: 12,
            color: "var(--labs-text-secondary)",
            flexShrink: 0,
          }}
        >
          {t("check.journal.score", "Bewertung")}
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          style={{ flex: 1, accentColor: "var(--labs-accent)" }}
          data-testid="input-check-journal-score"
        />
        <span
          style={{
            fontFamily: FONT.display,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--labs-text)",
            minWidth: 32,
            textAlign: "right",
          }}
          data-testid="text-check-journal-score-value"
        >
          {score}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--labs-border)",
            background: "transparent",
            color: "var(--labs-text-secondary)",
            cursor: submitting ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
          }}
          data-testid="button-check-journal-cancel"
        >
          {t("ui.cancel", "Abbrechen")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--labs-accent)",
            color: "var(--labs-bg)",
            cursor: submitting ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          data-testid="button-check-journal-submit"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t("check.journal.save", "Speichern")}
        </button>
      </div>
    </div>
  );
}

function ResultPill({
  pill,
  onUndo,
  onDismiss,
}: {
  pill: NonNullable<Pill>;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  if (pill.status === "error") {
    return (
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(220, 80, 80, 0.10)",
          border: "1px solid rgba(220, 80, 80, 0.35)",
          color: "var(--labs-text)",
          fontFamily: FONT.body,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: "space-between",
        }}
        data-testid="check-action-pill-error"
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{t("check.actions.error", "Fehler:")} {pill.message}</span>
        </span>
        <button
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--labs-text-secondary)",
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 12,
            textDecoration: "underline",
          }}
          data-testid="button-check-action-pill-dismiss"
        >
          {t("ui.close", "Schließen")}
        </button>
      </div>
    );
  }

  const labels: Record<Kind, string> = {
    wishlist: t("check.actions.savedWishlist", "In Wunschliste gespeichert"),
    collection: t("check.actions.savedCollection", "In Sammlung gespeichert"),
    journal: t("check.actions.savedJournal", "Im Journal gespeichert"),
  };

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(120, 180, 120, 0.10)",
        border: "1px solid rgba(120, 180, 120, 0.35)",
        color: "var(--labs-text)",
        fontFamily: FONT.body,
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifyContent: "space-between",
      }}
      data-testid={`check-action-pill-success-${pill.kind}`}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Check className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
        <span>{labels[pill.kind]}</span>
      </span>
      <button
        onClick={onUndo}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--labs-accent)",
          cursor: "pointer",
          fontFamily: FONT.body,
          fontSize: 12,
          fontWeight: 600,
          textDecoration: "underline",
        }}
        data-testid="button-check-action-undo"
      >
        {t("ui.undo", "Rückgängig")}
      </button>
    </div>
  );
}
