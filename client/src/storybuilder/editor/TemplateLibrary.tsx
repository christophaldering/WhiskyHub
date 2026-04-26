import { useEffect, useState } from "react";
import type { StoryBlock } from "../core/types";
import {
  createStoryTemplate,
  deleteStoryTemplate,
  getStoryTemplate,
  listStoryTemplates,
  type StoryTemplateMeta,
} from "../api";

export type InsertStrategy = "replace" | "append";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "save" | "insert";
  currentBlocks: StoryBlock[];
  onInsert: (blocks: StoryBlock[], strategy: InsertStrategy) => void;
  isAdmin?: boolean;
};

export function TemplateLibrary({ open, onClose, mode, currentBlocks, onInsert, isAdmin }: Props) {
  const [templates, setTemplates] = useState<StoryTemplateMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"user" | "global">("user");
  const [strategy, setStrategy] = useState<InsertStrategy>("replace");

  const refresh = () => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listStoryTemplates()
      .then((rows) => {
        if (!cancelled) setTemplates(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Vorlagen konnten nicht geladen werden");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setScope("user");
    setStrategy("replace");
    return refresh();
  }, [open]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte einen Namen vergeben.");
      return;
    }
    if (currentBlocks.length === 0) {
      setError("Diese Story ist leer und kann nicht als Vorlage gespeichert werden.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createStoryTemplate({
        name: trimmed,
        description: description.trim() || undefined,
        scope,
        blocksJson: currentBlocks,
      });
      setName("");
      setDescription("");
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Vorlage konnte nicht gespeichert werden");
    } finally {
      setBusy(false);
    }
  };

  const handleInsert = async (templateId: string) => {
    setBusy(true);
    setError(null);
    try {
      const tpl = await getStoryTemplate(templateId);
      if (strategy === "replace" && currentBlocks.length > 0) {
        if (!confirm("Aktuelle Blöcke wirklich durch diese Vorlage ersetzen?")) {
          setBusy(false);
          return;
        }
      }
      onInsert(tpl.blocksJson, strategy);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Vorlage konnte nicht eingefügt werden");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Diese Vorlage wirklich löschen?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteStoryTemplate(templateId);
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Vorlage konnte nicht gelöscht werden");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      data-testid="template-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        data-testid="template-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
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
            {mode === "save" ? "Als Vorlage speichern" : "Vorlage einfügen"}
          </h3>
          <button type="button" onClick={onClose} data-testid="button-close-template-modal" style={miniBtn}>✕</button>
        </div>
        {error ? (
          <div style={{ color: "#d97757", fontSize: 12, marginBottom: 8 }} data-testid="template-modal-error">
            {error}
          </div>
        ) : null}
        {mode === "save" ? (
          <div style={{ display: "grid", gap: 8, marginBottom: 16, padding: 12, background: "rgba(201,169,97,0.06)", borderRadius: 4 }}>
            <label style={lbl}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-template-name"
              maxLength={120}
              style={input}
            />
            <label style={lbl}>Beschreibung (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-template-description"
              maxLength={500}
              style={input}
            />
            <label style={lbl}>Sichtbarkeit</label>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={radioLbl}>
                <input
                  type="radio"
                  name="template-scope"
                  checked={scope === "user"}
                  onChange={() => setScope("user")}
                  data-testid="radio-template-scope-user"
                />
                Nur für mich
              </label>
              {isAdmin ? (
                <label style={radioLbl}>
                  <input
                    type="radio"
                    name="template-scope"
                    checked={scope === "global"}
                    onChange={() => setScope("global")}
                    data-testid="radio-template-scope-global"
                  />
                  Für alle (global)
                </label>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              data-testid="button-save-template"
              style={{ ...primaryBtn, marginTop: 4 }}
            >
              {busy ? "Speichert…" : "Vorlage speichern"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <span style={{ ...lbl, margin: 0 }}>Strategie:</span>
            <label style={radioLbl}>
              <input
                type="radio"
                name="insert-strategy"
                checked={strategy === "replace"}
                onChange={() => setStrategy("replace")}
                data-testid="radio-strategy-replace"
              />
              Ersetzen
            </label>
            <label style={radioLbl}>
              <input
                type="radio"
                name="insert-strategy"
                checked={strategy === "append"}
                onChange={() => setStrategy("append")}
                data-testid="radio-strategy-append"
              />
              Anhängen
            </label>
          </div>
        )}
        <h4 style={{ margin: "8px 0 6px 0", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#A89A85" }}>
          Vorhandene Vorlagen
        </h4>
        {loading ? (
          <div style={{ padding: 12, color: "#A89A85", fontSize: 12 }}>Lade Vorlagen…</div>
        ) : templates.length === 0 ? (
          <div style={{ padding: 12, color: "#A89A85", fontSize: 12 }} data-testid="template-modal-empty">
            Noch keine Vorlagen gespeichert.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {templates.map((t) => (
              <div
                key={t.id}
                data-testid={`template-row-${t.id}`}
                style={{
                  border: "1px solid rgba(201,169,97,0.15)",
                  borderRadius: 4,
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#F5EDE0" }}>
                    {t.name}
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 9,
                        letterSpacing: ".15em",
                        textTransform: "uppercase",
                        color: t.scope === "global" ? "#C9A961" : "#A89A85",
                        border: `1px solid ${t.scope === "global" ? "rgba(201,169,97,0.6)" : "rgba(168,154,133,0.4)"}`,
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      {t.scope === "global" ? "Global" : "Privat"}
                    </span>
                  </div>
                  {t.description ? (
                    <div style={{ fontSize: 11, color: "#A89A85", marginTop: 2 }}>{t.description}</div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {mode === "insert" ? (
                    <button
                      type="button"
                      onClick={() => handleInsert(t.id)}
                      disabled={busy}
                      data-testid={`button-template-insert-${t.id}`}
                      style={primaryBtn}
                    >
                      Einfügen
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={busy}
                    data-testid={`button-template-delete-${t.id}`}
                    style={dangerBtn}
                    title="Löschen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

const primaryBtn: React.CSSProperties = {
  background: "#C9A961",
  color: "#0B0906",
  border: "none",
  borderRadius: 3,
  padding: "5px 12px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const dangerBtn: React.CSSProperties = {
  background: "rgba(217,119,87,0.1)",
  border: "1px solid rgba(217,119,87,0.4)",
  borderRadius: 3,
  padding: "3px 8px",
  fontSize: 11,
  color: "#d97757",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const lbl: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  color: "#A89A85",
  margin: "4px 0 2px 0",
};

const input: React.CSSProperties = {
  background: "rgba(11,9,6,0.6)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 3,
  padding: "6px 10px",
  fontSize: 13,
  color: "#F5EDE0",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const radioLbl: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  color: "#F5EDE0",
  cursor: "pointer",
};
