import { useCallback, useMemo, useState } from "react";
import type { BlockType, RendererMode, StoryBlock, StoryDocument } from "../core/types";
import { createBlock, getBlockDefinition, listBlockDefinitions, validatePayload } from "../blocks";
import { getTheme } from "../themes";
import { StoryRenderer } from "../renderer/StoryRenderer";

type Props = {
  initialDocument: StoryDocument;
  onChange?: (document: StoryDocument) => void;
};

export function StoryEditor({ initialDocument, onChange }: Props) {
  const [doc, setDoc] = useState<StoryDocument>(initialDocument);
  const [selectedId, setSelectedId] = useState<string | null>(initialDocument.blocks[0]?.id ?? null);
  const [mode, setMode] = useState<RendererMode>("editor-preview");
  const [showPalette, setShowPalette] = useState(false);

  const theme = getTheme(doc.theme);
  const selectedBlock = useMemo(() => doc.blocks.find((b) => b.id === selectedId) ?? null, [doc.blocks, selectedId]);
  const palette = useMemo(() => listBlockDefinitions("generic"), []);

  const update = useCallback(
    (next: StoryDocument) => {
      const stamped: StoryDocument = {
        ...next,
        metadata: { ...next.metadata, updatedAt: new Date().toISOString() },
      };
      setDoc(stamped);
      onChange?.(stamped);
    },
    [onChange],
  );

  const addBlock = useCallback(
    (type: BlockType) => {
      const block = createBlock(type);
      if (!block) return;
      const insertIndex = selectedId
        ? doc.blocks.findIndex((b) => b.id === selectedId) + 1
        : doc.blocks.length;
      const blocks = [...doc.blocks];
      blocks.splice(insertIndex, 0, block);
      update({ ...doc, blocks });
      setSelectedId(block.id);
      setShowPalette(false);
    },
    [doc, selectedId, update],
  );

  const updateBlockPayload = useCallback(
    (id: string, payload: Record<string, unknown>) => {
      const blocks = doc.blocks.map((b) => (b.id === id ? { ...b, payload } : b));
      update({ ...doc, blocks });
    },
    [doc, update],
  );

  const moveBlock = useCallback(
    (id: string, direction: -1 | 1) => {
      const idx = doc.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const target = idx + direction;
      if (target < 0 || target >= doc.blocks.length) return;
      const blocks = [...doc.blocks];
      const tmp = blocks[idx];
      blocks[idx] = blocks[target];
      blocks[target] = tmp;
      update({ ...doc, blocks });
    },
    [doc, update],
  );

  const deleteBlock = useCallback(
    (id: string) => {
      const blocks = doc.blocks.filter((b) => b.id !== id);
      update({ ...doc, blocks });
      if (selectedId === id) setSelectedId(blocks[0]?.id ?? null);
    },
    [doc, selectedId, update],
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const blocks = doc.blocks.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b));
      update({ ...doc, blocks });
    },
    [doc, update],
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const idx = doc.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const original = doc.blocks[idx];
      const copy: StoryBlock = {
        ...original,
        id: "blk_" + Math.random().toString(36).slice(2, 11),
        payload: JSON.parse(JSON.stringify(original.payload)) as Record<string, unknown>,
      };
      const blocks = [...doc.blocks];
      blocks.splice(idx + 1, 0, copy);
      update({ ...doc, blocks });
      setSelectedId(copy.id);
    },
    [doc, update],
  );

  return (
    <div
      data-testid="story-editor"
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr 320px",
        height: "100vh",
        background: "#0B0906",
        color: "#F5EDE0",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <aside
        data-testid="editor-sidebar-blocks"
        style={{
          borderRight: "1px solid rgba(201,169,97,0.15)",
          padding: "16px 12px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: theme.colors.amber }}>Blöcke</h3>
          <button
            type="button"
            onClick={() => setShowPalette((s) => !s)}
            style={primaryButtonStyle}
            data-testid="button-toggle-palette"
          >
            {showPalette ? "Schließen" : "+ Block"}
          </button>
        </div>
        {showPalette ? (
          <div
            data-testid="block-palette"
            style={{
              border: `1px solid ${theme.colors.amberDim}`,
              borderRadius: 4,
              padding: 8,
              marginBottom: 12,
              display: "grid",
              gap: 4,
            }}
          >
            {palette.map((def) => (
              <button
                key={def.type}
                type="button"
                onClick={() => addBlock(def.type)}
                style={paletteItemStyle}
                data-testid={`palette-add-${def.type}`}
                title={def.description}
              >
                <div style={{ fontSize: 13, color: theme.colors.ink }}>{def.label}</div>
                <div style={{ fontSize: 11, color: theme.colors.inkFaint, marginTop: 2 }}>{def.description}</div>
              </button>
            ))}
          </div>
        ) : null}
        <div style={{ display: "grid", gap: 4 }}>
          {doc.blocks.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.colors.inkFaint, padding: 12, textAlign: "center" }}>
              Noch keine Blöcke. Klicke "+ Block".
            </div>
          ) : null}
          {doc.blocks.map((block, idx) => {
            const def = getBlockDefinition(block.type);
            const isSelected = block.id === selectedId;
            return (
              <div
                key={block.id}
                style={{
                  border: `1px solid ${isSelected ? theme.colors.amber : "rgba(201,169,97,0.1)"}`,
                  borderRadius: 4,
                  padding: "8px 10px",
                  background: isSelected ? "rgba(201,169,97,0.08)" : "transparent",
                  cursor: "pointer",
                  opacity: block.hidden ? 0.5 : 1,
                }}
                onClick={() => setSelectedId(block.id)}
                data-testid={`block-item-${block.id}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: theme.colors.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {idx + 1}. {def?.label ?? block.type}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(block.id, -1);
                    }}
                    style={miniButtonStyle}
                    data-testid={`button-move-up-${block.id}`}
                    title="Nach oben"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(block.id, 1);
                    }}
                    style={miniButtonStyle}
                    data-testid={`button-move-down-${block.id}`}
                    title="Nach unten"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateBlock(block.id);
                    }}
                    style={miniButtonStyle}
                    data-testid={`button-duplicate-${block.id}`}
                    title="Duplizieren"
                  >
                    ⎘
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(block.id);
                    }}
                    style={miniButtonStyle}
                    data-testid={`button-toggle-hidden-${block.id}`}
                    title={block.hidden ? "Einblenden" : "Ausblenden"}
                  >
                    {block.hidden ? "○" : "●"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Diesen Block wirklich löschen?")) deleteBlock(block.id);
                    }}
                    style={{ ...miniButtonStyle, color: "#d97757" }}
                    data-testid={`button-delete-${block.id}`}
                    title="Löschen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <main
        data-testid="editor-canvas"
        style={{
          overflowY: "auto",
          background: theme.colors.bg,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "rgba(11,9,6,0.95)",
            borderBottom: "1px solid rgba(201,169,97,0.15)",
            padding: "8px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: theme.colors.inkDim }}>
            Vorschau · {doc.blocks.length} Block(s)
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setMode("editor-preview")}
              style={mode === "editor-preview" ? activeTabStyle : tabStyle}
              data-testid="button-mode-edit"
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setMode("public")}
              style={mode === "public" ? activeTabStyle : tabStyle}
              data-testid="button-mode-public"
            >
              Öffentlich
            </button>
          </div>
        </div>
        <StoryRenderer document={doc} mode={mode} />
      </main>

      <aside
        data-testid="editor-sidebar-properties"
        style={{
          borderLeft: "1px solid rgba(201,169,97,0.15)",
          padding: "16px 16px",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 12, fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: theme.colors.amber }}>
          Eigenschaften
        </h3>
        {selectedBlock ? (
          <SelectedBlockEditor block={selectedBlock} onChange={(payload) => updateBlockPayload(selectedBlock.id, payload)} />
        ) : (
          <div style={{ fontSize: 12, color: theme.colors.inkFaint, padding: 12, textAlign: "center" }}>
            Wähle links einen Block aus.
          </div>
        )}
      </aside>
    </div>
  );
}

function SelectedBlockEditor({ block, onChange }: { block: StoryBlock; onChange: (payload: Record<string, unknown>) => void }) {
  const def = getBlockDefinition(block.type);
  if (!def) {
    return <div style={{ fontSize: 12, color: "#d97757" }}>Unbekannter Block-Typ: {block.type}</div>;
  }
  if (!def.EditorPanel) {
    return <div style={{ fontSize: 12, color: "#A89A85" }}>Für diesen Block ist kein Editor verfügbar.</div>;
  }
  const Panel = def.EditorPanel;
  const validation = validatePayload(block.type, block.payload);
  return (
    <div>
      <div style={{ fontSize: 14, color: "#F5EDE0", marginBottom: 4 }}>{def.label}</div>
      <div style={{ fontSize: 11, color: "#6B5F4F", marginBottom: 16 }}>{def.description}</div>
      {!validation.ok ? (
        <div
          data-testid="editor-validation-warning"
          style={{
            background: "rgba(217,119,87,0.1)",
            color: "#d97757",
            padding: "6px 10px",
            borderRadius: 3,
            fontSize: 11,
            marginBottom: 12,
          }}
        >
          Daten ungültig — Standardwerte geladen.
        </div>
      ) : null}
      <Panel
        payload={validation.payload}
        onChange={(p) => {
          const next = isPlainRecord(p) ? p : {};
          onChange(next);
        }}
      />
    </div>
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const primaryButtonStyle: React.CSSProperties = {
  background: "#C9A961",
  color: "#0B0906",
  border: "none",
  borderRadius: 4,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const paletteItemStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(201,169,97,0.15)",
  borderRadius: 3,
  padding: "8px 10px",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const miniButtonStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.08)",
  border: "1px solid rgba(201,169,97,0.2)",
  borderRadius: 3,
  padding: "2px 6px",
  fontSize: 11,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  minWidth: 24,
};

const tabStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(201,169,97,0.2)",
  borderRadius: 3,
  padding: "4px 12px",
  fontSize: 11,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  letterSpacing: ".1em",
  textTransform: "uppercase",
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  background: "#C9A961",
  color: "#0B0906",
  borderColor: "#C9A961",
};
