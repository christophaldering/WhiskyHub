import { useEffect, useState } from "react";
import type { StoryBlock, StoryDocument } from "../core/types";
import { StoryRenderer } from "../renderer/StoryRenderer";
import { getStoryVersion, listStoryVersions, restoreStoryVersion, type StoryVersionMeta } from "../api";
import { VersionDiffDialog } from "./VersionDiffDialog";
import type { StoryPersistenceAdapter } from "../core/adapter";

type Filter = "all" | "auto" | "manual";

type Props = {
  open: boolean;
  onClose: () => void;
  sourceType: string;
  sourceId: string;
  currentTheme: string;
  onRestored: (blocks: StoryBlock[]) => void;
  currentBlocks?: StoryBlock[];
  adapter?: StoryPersistenceAdapter;
};

export function VersionDrawer({ open, onClose, sourceType, sourceId, currentTheme, onRestored, currentBlocks, adapter }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [versions, setVersions] = useState<StoryVersionMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<StoryDocument | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffBlocks, setDiffBlocks] = useState<StoryBlock[] | null>(null);
  const [diffMeta, setDiffMeta] = useState<{ id: string; createdAt: string } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const loader = adapter ? adapter.listVersions(filter) : listStoryVersions(sourceType, sourceId, filter);
    loader
      .then((rows) => {
        if (!cancelled) setVersions(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Versionen konnten nicht geladen werden");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, filter, sourceType, sourceId, adapter]);

  useEffect(() => {
    if (!open) {
      setPreviewId(null);
      setPreviewDoc(null);
    }
  }, [open]);

  const handlePreview = async (versionId: string) => {
    setPreviewId(versionId);
    setPreviewLoading(true);
    setError(null);
    try {
      const v = adapter
        ? await adapter.getVersion(versionId)
        : await getStoryVersion(sourceType, sourceId, versionId);
      const now = new Date().toISOString();
      setPreviewDoc({
        schemaVersion: 1,
        theme: currentTheme,
        blocks: v.blocksJson,
        metadata: { createdAt: now, updatedAt: now },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Vorschau konnte nicht geladen werden");
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm("Diese Version wirklich wiederherstellen? Der aktuelle Stand wird durch sie ersetzt.")) return;
    setRestoring(true);
    setError(null);
    try {
      if (adapter) {
        const result = await adapter.restoreVersion(versionId);
        onRestored(result.blocks);
      } else {
        const result = await restoreStoryVersion(sourceType, sourceId, versionId);
        onRestored(result.blocksJson);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Wiederherstellen fehlgeschlagen");
    } finally {
      setRestoring(false);
    }
  };

  const handleCompare = async (versionId: string) => {
    if (!currentBlocks) return;
    const v = versions.find((x) => x.id === versionId);
    setDiffLoading(true);
    setError(null);
    try {
      const full = adapter
        ? await adapter.getVersion(versionId)
        : await getStoryVersion(sourceType, sourceId, versionId);
      setDiffBlocks(full.blocksJson);
      setDiffMeta({ id: versionId, createdAt: v?.createdAt ?? full.createdAt });
      setDiffOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Vergleich konnte nicht geladen werden");
    } finally {
      setDiffLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      data-testid="version-drawer-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        data-testid="version-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(960px, 100%)",
          height: "100%",
          background: "#0B0906",
          color: "#F5EDE0",
          fontFamily: "'Inter', system-ui, sans-serif",
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          borderLeft: "1px solid rgba(201,169,97,0.25)",
        }}
      >
        <div
          style={{
            borderRight: "1px solid rgba(201,169,97,0.15)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ padding: "16px 16px 8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: "#C9A961" }}>Versionsverlauf</h3>
            <button
              type="button"
              onClick={onClose}
              data-testid="button-close-version-drawer"
              style={miniBtn}
              title="Schließen"
            >
              ✕
            </button>
          </div>
          <div style={{ display: "flex", gap: 4, padding: "0 16px 8px 16px" }}>
            {(["all", "auto", "manual"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                data-testid={`button-version-filter-${f}`}
                style={filter === f ? activePill : pill}
              >
                {f === "all" ? "Alle" : f === "auto" ? "Auto" : "Manuell"}
              </button>
            ))}
          </div>
          {error ? (
            <div style={{ padding: "8px 16px", color: "#d97757", fontSize: 12 }} data-testid="version-drawer-error">
              {error}
            </div>
          ) : null}
          <div style={{ overflowY: "auto", padding: "0 8px 16px 8px", flex: 1 }}>
            {loading ? (
              <div style={{ padding: 16, color: "#A89A85", fontSize: 12 }}>Lade Versionen…</div>
            ) : versions.length === 0 ? (
              <div style={{ padding: 16, color: "#A89A85", fontSize: 12 }} data-testid="version-drawer-empty">
                Keine Versionen vorhanden.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {versions.map((v) => {
                  const dt = new Date(v.createdAt);
                  const isSelected = previewId === v.id;
                  return (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => handlePreview(v.id)}
                      data-testid={`button-version-${v.id}`}
                      style={{
                        textAlign: "left",
                        background: isSelected ? "rgba(201,169,97,0.12)" : "transparent",
                        border: `1px solid ${isSelected ? "#C9A961" : "rgba(201,169,97,0.15)"}`,
                        borderRadius: 4,
                        padding: "10px 12px",
                        cursor: "pointer",
                        color: "#F5EDE0",
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#F5EDE0" }}>
                          {dt.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            letterSpacing: ".15em",
                            textTransform: "uppercase",
                            color: v.isAuto ? "#A89A85" : "#C9A961",
                            border: `1px solid ${v.isAuto ? "rgba(168,154,133,0.4)" : "rgba(201,169,97,0.6)"}`,
                            padding: "1px 6px",
                            borderRadius: 999,
                          }}
                        >
                          {v.isAuto ? "Auto" : "Manuell"}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "#A89A85", marginTop: 4, letterSpacing: ".05em" }}>
                        {v.blockCount} {v.blockCount === 1 ? "Block" : "Blöcke"}
                      </div>
                      {v.name ? (
                        <div style={{ fontSize: 11, color: "#A89A85", marginTop: 2 }}>{v.name}</div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(201,169,97,0.15)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#A89A85" }}>
              {previewId ? "Vorschau" : "Wähle eine Version"}
            </span>
            {previewId ? (
              <div style={{ display: "flex", gap: 8 }}>
                {currentBlocks ? (
                  <button
                    type="button"
                    onClick={() => handleCompare(previewId)}
                    disabled={diffLoading || previewLoading}
                    data-testid="button-compare-version"
                    style={secondaryBtn}
                  >
                    {diffLoading ? "Lade Vergleich…" : "Vergleichen"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleRestore(previewId)}
                  disabled={restoring || previewLoading}
                  data-testid="button-restore-version"
                  style={primaryBtn}
                >
                  {restoring ? "Wiederherstelle…" : "Wiederherstellen"}
                </button>
              </div>
            ) : null}
          </div>
          <div style={{ flex: 1, overflowY: "auto", background: "#0B0906" }}>
            {previewLoading ? (
              <div style={{ padding: 24, color: "#A89A85", fontSize: 12 }}>Lade Vorschau…</div>
            ) : previewDoc ? (
              <div data-testid="version-preview">
                <StoryRenderer document={previewDoc} mode="public" />
              </div>
            ) : (
              <div style={{ padding: 24, color: "#A89A85", fontSize: 12 }}>
                Klicke links auf eine Version, um sie hier anzusehen.
              </div>
            )}
          </div>
        </div>
      </div>
      {diffOpen && diffBlocks && currentBlocks ? (
        <VersionDiffDialog
          open={diffOpen}
          onClose={() => setDiffOpen(false)}
          oldBlocks={diffBlocks}
          newBlocks={currentBlocks}
          oldLabel={diffMeta ? new Date(diffMeta.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Version"}
          newLabel="Aktueller Stand"
        />
      ) : null}
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

const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  color: "#C9A961",
  border: "1px solid rgba(201,169,97,0.5)",
  borderRadius: 3,
  padding: "8px 14px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const pill: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 999,
  padding: "3px 12px",
  fontSize: 10,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  letterSpacing: ".1em",
  textTransform: "uppercase",
};

const activePill: React.CSSProperties = {
  ...pill,
  background: "#C9A961",
  color: "#0B0906",
  borderColor: "#C9A961",
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
