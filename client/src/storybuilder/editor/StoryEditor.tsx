import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { InfoHint } from "@/components/InfoHint";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BlockType, RendererMode, StoryBlock, StoryDocument } from "../core/types";
import { createBlock, getBlockDefinition, listBlockDefinitions, listBlocksForConsumerScope, validatePayload } from "../blocks";
import type { StoryPersistenceAdapter } from "../core/adapter";
import { getTheme } from "../themes";
import { StoryRenderer } from "../renderer/StoryRenderer";
import { VersionDrawer } from "./VersionDrawer";
import { TemplateLibrary, type InsertStrategy } from "./TemplateLibrary";
import { AiActionPanel } from "./AiActionPanel";

const HISTORY_LIMIT = 50;
const AUTO_SAVE_DELAY_MS = 2000;

export type StoryEditorSaveStatus = "idle" | "saving" | "saved" | "error";

export type StoryEditorSourceContext = {
  sourceType: string;
  sourceId: string;
};

type Props = {
  initialDocument: StoryDocument;
  onChange?: (document: StoryDocument) => void;
  onSave?: (document: StoryDocument) => Promise<void>;
  onManualSnapshot?: (document: StoryDocument, name?: string) => Promise<void>;
  sourceContext?: StoryEditorSourceContext;
  isAdmin?: boolean;
  paletteCategories?: Array<"generic" | "tasting" | "landing">;
  adapter?: StoryPersistenceAdapter;
  onRegenerateBlock?: (
    blockId: string,
    blockType: string,
    currentBlocks: StoryBlock[],
  ) => Promise<Record<string, unknown> | null>;
  onRegenerateStory?: (currentBlocks: StoryBlock[]) => Promise<StoryBlock[] | null>;
};

type HistoryState = {
  past: StoryDocument[];
  present: StoryDocument;
  future: StoryDocument[];
};

function pushHistory(state: HistoryState, next: StoryDocument): HistoryState {
  if (next === state.present) return state;
  const past = [...state.past, state.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [] };
}

function undoHistory(state: HistoryState): HistoryState {
  if (state.past.length === 0) return state;
  const past = state.past.slice(0, -1);
  const previous = state.past[state.past.length - 1];
  return { past, present: previous, future: [state.present, ...state.future].slice(0, HISTORY_LIMIT) };
}

function redoHistory(state: HistoryState): HistoryState {
  if (state.future.length === 0) return state;
  const [next, ...rest] = state.future;
  return { past: [...state.past, state.present].slice(-HISTORY_LIMIT), present: next, future: rest };
}

export function StoryEditor({ initialDocument, onChange, onSave, onManualSnapshot, sourceContext, isAdmin, paletteCategories, adapter, onRegenerateBlock, onRegenerateStory }: Props) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryState>({ past: [], present: initialDocument, future: [] });
  const doc = history.present;

  const [selectedId, setSelectedId] = useState<string | null>(initialDocument.blocks[0]?.id ?? null);
  const [mode, setMode] = useState<RendererMode>("editor-preview");
  const [showPalette, setShowPalette] = useState(false);
  const [saveStatus, setSaveStatus] = useState<StoryEditorSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [templateMode, setTemplateMode] = useState<"save" | "insert" | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [snapshotInfo, setSnapshotInfo] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(max-width: 1023px)").matches;
  });
  const [mobilePanel, setMobilePanel] = useState<"blocks" | "properties" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    setIsCompact(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  const lastSavedJsonRef = useRef<string>(JSON.stringify(initialDocument.blocks));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSnapshotRef = useRef<StoryDocument | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const theme = getTheme(doc.theme);
  const selectedBlock = useMemo(() => doc.blocks.find((b) => b.id === selectedId) ?? null, [doc.blocks, selectedId]);
  const palette = useMemo(() => {
    if (adapter) {
      return listBlocksForConsumerScope(adapter.consumerScope);
    }
    const categories: Array<"generic" | "tasting" | "landing"> =
      paletteCategories && paletteCategories.length > 0 ? paletteCategories : ["generic"];
    const seen = new Set<string>();
    const result: ReturnType<typeof listBlockDefinitions> = [];
    for (const cat of categories) {
      for (const def of listBlockDefinitions(cat)) {
        if (seen.has(def.type)) continue;
        seen.add(def.type);
        result.push(def);
      }
    }
    return result;
  }, [paletteCategories, adapter]);

  const update = useCallback(
    (next: StoryDocument) => {
      const stamped: StoryDocument = {
        ...next,
        metadata: { ...next.metadata, updatedAt: new Date().toISOString() },
      };
      setHistory((h) => pushHistory(h, stamped));
      onChange?.(stamped);
    },
    [onChange],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveImpl = adapter ? (next: StoryDocument) => adapter.saveDraft(next.blocks) : onSave;
  const snapshotImpl = adapter
    ? (next: StoryDocument, name?: string) => adapter.createVersion(next.blocks, name)
    : onManualSnapshot;

  const enqueueSave = useCallback(
    (snapshot: StoryDocument) => {
      if (!saveImpl) return;
      pendingSnapshotRef.current = snapshot;
      saveChainRef.current = saveChainRef.current.then(async () => {
        const next = pendingSnapshotRef.current;
        if (!next) return;
        pendingSnapshotRef.current = null;
        const json = JSON.stringify(next.blocks);
        if (json === lastSavedJsonRef.current) {
          if (isMountedRef.current) setSaveStatus("saved");
          return;
        }
        if (isMountedRef.current) {
          setSaveStatus("saving");
          setSaveError(null);
        }
        try {
          await saveImpl(next);
          if (!isMountedRef.current) return;
          lastSavedJsonRef.current = json;
          setSaveStatus("saved");
          setLastSavedAt(new Date());
        } catch (err: unknown) {
          if (!isMountedRef.current) return;
          setSaveStatus("error");
          setSaveError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
        }
      });
    },
    [saveImpl],
  );

  useEffect(() => {
    if (!saveImpl) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const json = JSON.stringify(doc.blocks);
    if (json === lastSavedJsonRef.current) return;
    saveTimerRef.current = setTimeout(() => {
      enqueueSave(doc);
    }, AUTO_SAVE_DELAY_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [doc, saveImpl, enqueueSave]);

  const triggerSaveNow = useCallback(() => {
    if (!saveImpl) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    enqueueSave(doc);
  }, [doc, saveImpl, enqueueSave]);

  const triggerManualSnapshot = useCallback(async () => {
    if (!snapshotImpl || snapshotBusy) return;
    const name = window.prompt("Name für diese Version (optional):", "")?.trim();
    setSnapshotBusy(true);
    setSnapshotInfo(null);
    try {
      await snapshotImpl(doc, name && name.length > 0 ? name : undefined);
      setSnapshotInfo("Version gespeichert");
      setTimeout(() => setSnapshotInfo(null), 2500);
    } catch (err: unknown) {
      setSnapshotInfo(err instanceof Error ? err.message : "Snapshot fehlgeschlagen");
    } finally {
      setSnapshotBusy(false);
    }
  }, [doc, snapshotImpl, snapshotBusy]);

  const handleVersionRestored = useCallback(
    (blocks: StoryBlock[]) => {
      const next: StoryDocument = {
        ...doc,
        blocks,
        metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
      };
      setHistory((h) => pushHistory(h, next));
      onChange?.(next);
      lastSavedJsonRef.current = JSON.stringify(blocks);
      setSelectedId(blocks[0]?.id ?? null);
    },
    [doc, onChange],
  );

  const handleTemplateInsert = useCallback(
    (blocks: StoryBlock[], strategy: InsertStrategy) => {
      const fresh = blocks.map((b) => ({
        ...b,
        id: "blk_" + Math.random().toString(36).slice(2, 11),
        payload: JSON.parse(JSON.stringify(b.payload)) as Record<string, unknown>,
      }));
      const merged = strategy === "replace" ? fresh : [...doc.blocks, ...fresh];
      const next: StoryDocument = {
        ...doc,
        blocks: merged,
        metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
      };
      setHistory((h) => pushHistory(h, next));
      onChange?.(next);
      setSelectedId(fresh[0]?.id ?? merged[0]?.id ?? null);
    },
    [doc, onChange],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const next = undoHistory(h);
      onChange?.(next.present);
      return next;
    });
  }, [onChange]);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = redoHistory(h);
      onChange?.(next.present);
      return next;
    });
  }, [onChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      } else if (key === "s") {
        e.preventDefault();
        triggerSaveNow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, triggerSaveNow]);

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
      const blocks = arrayMove(doc.blocks, idx, target);
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

  const toggleLocked = useCallback(
    (id: string) => {
      const blocks = doc.blocks.map((b) => (b.id === id ? { ...b, locked: !b.locked } : b));
      update({ ...doc, blocks });
    },
    [doc, update],
  );

  const [storyRegenBusy, setStoryRegenBusy] = useState(false);
  const [storyRegenInfo, setStoryRegenInfo] = useState<string | null>(null);

  const handleStoryRegenerate = useCallback(async () => {
    if (!onRegenerateStory || storyRegenBusy) return;
    const lockedCount = doc.blocks.filter((b) => b.locked).length;
    const lockedNote = lockedCount > 0 ? `\n\nGesperrte Bloecke (${lockedCount}) werden uebersprungen.` : "";
    if (!window.confirm(`Alle KI-Texte in dieser Story neu generieren?${lockedNote}`)) return;
    setStoryRegenBusy(true);
    setStoryRegenInfo(null);
    try {
      const result = await onRegenerateStory(doc.blocks);
      if (result) {
        const next: StoryDocument = {
          ...doc,
          blocks: result,
          metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
        };
        setHistory((h) => pushHistory(h, next));
        onChange?.(next);
        setStoryRegenInfo("Story neu generiert");
      } else {
        setStoryRegenInfo("Keine Aenderungen");
      }
    } catch (err: unknown) {
      setStoryRegenInfo(err instanceof Error ? err.message : "Regenerierung fehlgeschlagen");
    } finally {
      setStoryRegenBusy(false);
      setTimeout(() => setStoryRegenInfo(null), 3500);
    }
  }, [doc, onChange, onRegenerateStory, storyRegenBusy]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const fromIdx = doc.blocks.findIndex((b) => b.id === active.id);
      const toIdx = doc.blocks.findIndex((b) => b.id === over.id);
      if (fromIdx === -1 || toIdx === -1) return;
      const blocks = arrayMove(doc.blocks, fromIdx, toIdx);
      update({ ...doc, blocks });
    },
    [doc, update],
  );

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const blocksAsideStyle: React.CSSProperties = isCompact
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: "min(85vw, 320px)",
        background: "#0B0906",
        borderRight: "1px solid rgba(201,169,97,0.25)",
        boxShadow: "0 0 40px rgba(0,0,0,0.6)",
        padding: "16px 12px",
        overflowY: "auto",
        zIndex: 30,
        transform: mobilePanel === "blocks" ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .2s",
      }
    : {
        borderRight: "1px solid rgba(201,169,97,0.15)",
        padding: "16px 12px",
        overflowY: "auto",
      };

  const propertiesAsideStyle: React.CSSProperties = isCompact
    ? {
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(90vw, 360px)",
        background: "#0B0906",
        borderLeft: "1px solid rgba(201,169,97,0.25)",
        boxShadow: "0 0 40px rgba(0,0,0,0.6)",
        padding: "16px 16px",
        overflowY: "auto",
        zIndex: 30,
        transform: mobilePanel === "properties" ? "translateX(0)" : "translateX(100%)",
        transition: "transform .2s",
      }
    : {
        borderLeft: "1px solid rgba(201,169,97,0.15)",
        padding: "16px 16px",
        overflowY: "auto",
      };

  return (
    <div
      data-testid="story-editor"
      data-layout={isCompact ? "compact" : "wide"}
      style={{
        display: "grid",
        gridTemplateColumns: isCompact ? "1fr" : "260px 1fr 320px",
        height: "100vh",
        background: "#0B0906",
        color: "#F5EDE0",
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
      }}
    >
      {isCompact && mobilePanel ? (
        <div
          data-testid="mobile-panel-backdrop"
          onClick={() => setMobilePanel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 25,
          }}
        />
      ) : null}
      <aside
        id="story-editor-blocks-panel"
        data-testid="editor-sidebar-blocks"
        aria-label="Blöcke"
        aria-hidden={isCompact && mobilePanel !== "blocks" ? true : undefined}
        role={isCompact ? "dialog" : undefined}
        aria-modal={isCompact && mobilePanel === "blocks" ? true : undefined}
        {...(isCompact && mobilePanel !== "blocks" ? { inert: "" as unknown as boolean } : {})}
        style={blocksAsideStyle}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "inline-flex", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: theme.colors.amber }}>Blöcke</h3>
            <InfoHint
              text={t("storyEditor.tooltips.blocks")}
              testId="info-hint-blocks"
              side="bottom"
              align="start"
            />
            <InfoHint
              text={t("storyEditor.tooltips.moveArrows")}
              testId="info-hint-move-arrows"
              side="bottom"
              align="start"
            />
          </div>
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
              maxHeight: "50vh",
              overflowY: "auto",
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={doc.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {doc.blocks.map((block, idx) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  index={idx}
                  isSelected={block.id === selectedId}
                  onSelect={() => setSelectedId(block.id)}
                  onMoveUp={() => moveBlock(block.id, -1)}
                  onMoveDown={() => moveBlock(block.id, 1)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onToggleHidden={() => toggleHidden(block.id)}
                  onToggleLocked={() => toggleLocked(block.id)}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
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
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {isCompact ? (
              <button
                type="button"
                onClick={() => setMobilePanel(mobilePanel === "blocks" ? null : "blocks")}
                style={toolbarBtnStyle}
                aria-label="Blockliste öffnen"
                aria-expanded={mobilePanel === "blocks"}
                aria-controls="story-editor-blocks-panel"
                data-testid="button-toggle-mobile-blocks"
              >
                Blöcke
              </button>
            ) : null}
            <div style={{ display: "inline-flex", alignItems: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: theme.colors.inkDim }}>
                Vorschau · {doc.blocks.length} Block(s)
              </div>
              <InfoHint
                text={t("storyEditor.tooltips.blockCount")}
                testId="info-hint-block-count"
                side="bottom"
                align="start"
              />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                style={canUndo ? historyButtonStyle : { ...historyButtonStyle, opacity: 0.3, cursor: "not-allowed" }}
                title="Rückgängig (Cmd/Ctrl+Z)"
                aria-label="Rückgängig"
                data-testid="button-undo"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                style={canRedo ? historyButtonStyle : { ...historyButtonStyle, opacity: 0.3, cursor: "not-allowed" }}
                title="Wiederherstellen (Cmd/Ctrl+Shift+Z)"
                aria-label="Wiederherstellen"
                data-testid="button-redo"
              >
                ↷
              </button>
            </div>
            {saveImpl ? (
              <div style={{ display: "inline-flex", alignItems: "center" }}>
                <SaveBadge status={saveStatus} lastSavedAt={lastSavedAt} error={saveError} onRetry={triggerSaveNow} />
                <InfoHint
                  text={t("storyEditor.tooltips.autoSave")}
                  testId="info-hint-auto-save"
                  side="bottom"
                  align="start"
                />
              </div>
            ) : null}
            {onRegenerateStory ? (
              <div style={{ display: "inline-flex", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleStoryRegenerate}
                  disabled={storyRegenBusy}
                  style={storyRegenBusy ? { ...toolbarBtnStyle, opacity: 0.5, cursor: "wait" } : toolbarBtnStyle}
                  data-testid="button-regenerate-story"
                  title="Alle KI-Texte der Story neu generieren"
                >
                  {storyRegenBusy ? "Generiere…" : "KI-Story neu"}
                </button>
                <InfoHint
                  text={t("storyEditor.tooltips.aiStoryRegenerate")}
                  testId="info-hint-ai-story-regen"
                  side="bottom"
                  align="start"
                />
              </div>
            ) : null}
            {storyRegenInfo ? (
              <span
                data-testid="story-regen-info"
                style={{ fontSize: 11, color: "#7BB077", letterSpacing: ".05em" }}
              >
                {storyRegenInfo}
              </span>
            ) : null}
            {snapshotInfo ? (
              <span
                data-testid="snapshot-info"
                style={{ fontSize: 11, color: "#7BB077", letterSpacing: ".05em" }}
              >
                {snapshotInfo}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {isCompact ? (
              <button
                type="button"
                onClick={() => setMobilePanel(mobilePanel === "properties" ? null : "properties")}
                style={toolbarBtnStyle}
                aria-label="Eigenschaften öffnen"
                aria-expanded={mobilePanel === "properties"}
                aria-controls="story-editor-properties-panel"
                data-testid="button-toggle-mobile-properties"
              >
                Eigenschaften
              </button>
            ) : null}
            {sourceContext ? (
              <>
                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setShowVersions(true)}
                    style={toolbarBtnStyle}
                    data-testid="button-open-versions"
                    title="Versionsverlauf öffnen"
                  >
                    Verlauf
                  </button>
                  <InfoHint
                    text={t("storyEditor.tooltips.versionHistory")}
                    testId="info-hint-version-history"
                    side="bottom"
                    align="end"
                  />
                </div>
                {snapshotImpl ? (
                  <div style={{ display: "inline-flex", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={triggerManualSnapshot}
                      disabled={snapshotBusy}
                      style={toolbarBtnStyle}
                      data-testid="button-manual-snapshot"
                      title="Aktuelle Version dauerhaft sichern"
                    >
                      {snapshotBusy ? "Sichere…" : "Snapshot"}
                    </button>
                    <InfoHint
                      text={t("storyEditor.tooltips.snapshot")}
                      testId="info-hint-snapshot"
                      side="bottom"
                      align="end"
                    />
                  </div>
                ) : null}
                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setTemplateMode("save")}
                    style={toolbarBtnStyle}
                    data-testid="button-save-as-template"
                    title="Aktuelle Story als Vorlage speichern"
                  >
                    Als Vorlage
                  </button>
                  <InfoHint
                    text={t("storyEditor.tooltips.saveAsTemplate")}
                    testId="info-hint-save-as-template"
                    side="bottom"
                    align="end"
                  />
                </div>
                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setTemplateMode("insert")}
                    style={toolbarBtnStyle}
                    data-testid="button-insert-template"
                    title="Vorlage einfügen"
                  >
                    Vorlage einfügen
                  </button>
                  <InfoHint
                    text={t("storyEditor.tooltips.insertTemplate")}
                    testId="info-hint-insert-template"
                    side="bottom"
                    align="end"
                  />
                </div>
              </>
            ) : null}
            <div style={{ display: "inline-flex", alignItems: "center" }}>
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
              <InfoHint
                text={t("storyEditor.tooltips.modeToggle")}
                testId="info-hint-mode-toggle"
                side="bottom"
                align="end"
              />
            </div>
          </div>
        </div>
        <StoryRenderer document={doc} mode={mode} />
      </main>

      <aside
        id="story-editor-properties-panel"
        data-testid="editor-sidebar-properties"
        aria-label="Eigenschaften"
        aria-hidden={isCompact && mobilePanel !== "properties" ? true : undefined}
        role={isCompact ? "dialog" : undefined}
        aria-modal={isCompact && mobilePanel === "properties" ? true : undefined}
        {...(isCompact && mobilePanel !== "properties" ? { inert: "" as unknown as boolean } : {})}
        style={propertiesAsideStyle}
      >
        <div style={{ display: "inline-flex", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: theme.colors.amber }}>
            Eigenschaften
          </h3>
          <InfoHint
            text={t("storyEditor.tooltips.properties")}
            testId="info-hint-properties"
            side="bottom"
            align="start"
          />
        </div>
        {selectedBlock ? (
          <SelectedBlockEditor
            block={selectedBlock}
            onChange={(payload) => updateBlockPayload(selectedBlock.id, payload)}
            onRegenerateBlock={
              onRegenerateBlock
                ? (blockId, blockType) => onRegenerateBlock(blockId, blockType, doc.blocks)
                : undefined
            }
          />
        ) : (
          <div style={{ fontSize: 12, color: theme.colors.inkFaint, padding: 12, textAlign: "center" }}>
            Wähle links einen Block aus.
          </div>
        )}
      </aside>
      {sourceContext ? (
        <VersionDrawer
          open={showVersions}
          onClose={() => setShowVersions(false)}
          sourceType={sourceContext.sourceType}
          sourceId={sourceContext.sourceId}
          currentTheme={doc.theme}
          onRestored={handleVersionRestored}
          currentBlocks={doc.blocks}
          adapter={adapter}
        />
      ) : null}
      {sourceContext && templateMode ? (
        <TemplateLibrary
          open={true}
          mode={templateMode}
          onClose={() => setTemplateMode(null)}
          currentBlocks={doc.blocks}
          onInsert={handleTemplateInsert}
          isAdmin={isAdmin}
        />
      ) : null}
    </div>
  );
}

function SortableBlockItem({
  block,
  index,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onToggleHidden,
  onToggleLocked,
  onDelete,
}: {
  block: StoryBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onDelete: () => void;
}) {
  const def = getBlockDefinition(block.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: `1px solid ${isSelected ? "#C9A961" : "rgba(201,169,97,0.1)"}`,
    borderRadius: 4,
    padding: "8px 10px",
    background: isSelected ? "rgba(201,169,97,0.08)" : "transparent",
    cursor: "pointer",
    opacity: block.hidden ? 0.5 : isDragging ? 0.7 : 1,
    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.5)" : undefined,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      data-testid={`block-item-${block.id}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Block ${index + 1} ${def?.label ?? block.type} ziehen, um zu sortieren`}
          title="Ziehen zum Sortieren"
          data-testid={`drag-handle-${block.id}`}
          style={{
            cursor: "grab",
            background: "transparent",
            border: "none",
            color: "#A89A85",
            fontSize: 14,
            padding: "0 6px 0 0",
            userSelect: "none",
            touchAction: "none",
          }}
        >
          ⋮⋮
        </button>
        <div style={{ fontSize: 12, color: "#F5EDE0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {index + 1}. {def?.label ?? block.type}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          style={miniButtonStyle}
          data-testid={`button-move-up-${block.id}`}
          aria-label={`Block ${index + 1} nach oben verschieben`}
          title="Nach oben"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          style={miniButtonStyle}
          data-testid={`button-move-down-${block.id}`}
          aria-label={`Block ${index + 1} nach unten verschieben`}
          title="Nach unten"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          style={miniButtonStyle}
          data-testid={`button-duplicate-${block.id}`}
          aria-label={`Block ${index + 1} duplizieren`}
          title="Duplizieren"
        >
          ⎘
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleHidden();
          }}
          style={miniButtonStyle}
          data-testid={`button-toggle-hidden-${block.id}`}
          aria-label={block.hidden ? `Block ${index + 1} einblenden` : `Block ${index + 1} ausblenden`}
          aria-pressed={block.hidden}
          title={block.hidden ? "Einblenden" : "Ausblenden"}
        >
          {block.hidden ? "○" : "●"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLocked();
          }}
          style={block.locked ? { ...miniButtonStyle, color: "#C9A961", borderColor: "#C9A961" } : miniButtonStyle}
          data-testid={`button-toggle-locked-${block.id}`}
          aria-label={block.locked ? `Block ${index + 1} entsperren` : `Block ${index + 1} sperren`}
          aria-pressed={block.locked}
          title={block.locked ? "Entsperren (Story-Regen erlaubt)" : "Sperren (vor Story-Regen schuetzen)"}
        >
          {block.locked ? "\u{1F512}" : "\u{1F513}"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Diesen Block wirklich löschen?")) onDelete();
          }}
          style={{ ...miniButtonStyle, color: "#d97757" }}
          data-testid={`button-delete-${block.id}`}
          aria-label={`Block ${index + 1} löschen`}
          title="Löschen"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function SaveBadge({
  status,
  lastSavedAt,
  error,
  onRetry,
}: {
  status: StoryEditorSaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
  onRetry: () => void;
}) {
  let label = "Auto-Save aktiv";
  let bg = "rgba(201,169,97,0.08)";
  let color = "#A89A85";
  if (status === "saving") {
    label = "Speichert…";
    bg = "rgba(201,169,97,0.18)";
    color = "#C9A961";
  } else if (status === "saved") {
    if (lastSavedAt) {
      label = `Gespeichert · ${lastSavedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    } else {
      label = "Gespeichert";
    }
    bg = "rgba(86,160,80,0.16)";
    color = "#7BB077";
  } else if (status === "error") {
    label = "Fehler beim Speichern";
    bg = "rgba(217,119,87,0.18)";
    color = "#d97757";
  }
  return (
    <div
      data-testid="badge-save-status"
      data-status={status}
      style={{
        background: bg,
        color,
        border: `1px solid ${color}`,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        letterSpacing: ".05em",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
      title={error ?? undefined}
    >
      <span>{label}</span>
      {status === "error" ? (
        <button
          type="button"
          onClick={onRetry}
          data-testid="button-save-retry"
          style={{
            background: "transparent",
            border: "none",
            color,
            cursor: "pointer",
            textDecoration: "underline",
            fontSize: 11,
            padding: 0,
          }}
        >
          Erneut
        </button>
      ) : null}
    </div>
  );
}

const TASTING_REGEN_TYPES = new Set(["winner-hero", "finale-card", "taster-grid", "ranking-list", "blind-results", "whisky-card-grid"]);

function SelectedBlockEditor({
  block,
  onChange,
  onRegenerateBlock,
}: {
  block: StoryBlock;
  onChange: (payload: Record<string, unknown>) => void;
  onRegenerateBlock?: (
    blockId: string,
    blockType: string,
  ) => Promise<Record<string, unknown> | null>;
}) {
  const def = getBlockDefinition(block.type);
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenInfo, setRegenInfo] = useState<string | null>(null);
  if (!def) {
    return <div style={{ fontSize: 12, color: "#d97757" }}>Unbekannter Block-Typ: {block.type}</div>;
  }
  if (!def.EditorPanel) {
    return <div style={{ fontSize: 12, color: "#A89A85" }}>Für diesen Block ist kein Editor verfügbar.</div>;
  }
  const Panel = def.EditorPanel;
  const validation = validatePayload(block.type, block.payload);
  const aiFields = collectAiFields(block.type, validation.payload);
  const canRegen = !!onRegenerateBlock && TASTING_REGEN_TYPES.has(block.type);
  const handleRegen = async () => {
    if (!onRegenerateBlock || regenBusy) return;
    setRegenBusy(true);
    setRegenInfo(null);
    try {
      const next = await onRegenerateBlock(block.id, block.type);
      if (next) {
        onChange(next);
        setRegenInfo("Neu generiert");
      } else {
        setRegenInfo("Kein Ergebnis");
      }
    } catch (err: unknown) {
      setRegenInfo(err instanceof Error ? err.message : "Fehler bei Regenerierung");
    } finally {
      setRegenBusy(false);
      setTimeout(() => setRegenInfo(null), 3000);
    }
  };
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
      {canRegen ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            background: "rgba(201,169,97,0.06)",
            border: "1px solid rgba(201,169,97,0.2)",
            borderRadius: 4,
            padding: "8px 10px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, color: "#A89A85", letterSpacing: ".05em" }}>
            {regenInfo ?? "KI-Vorschlaege fuer diesen Block aktualisieren"}
          </div>
          <button
            type="button"
            onClick={handleRegen}
            disabled={regenBusy}
            style={regenBusy ? { ...primaryButtonStyle, opacity: 0.5, cursor: "wait" } : primaryButtonStyle}
            data-testid={`button-regenerate-block-${block.id}`}
          >
            {regenBusy ? "Generiere…" : "Neu generieren"}
          </button>
        </div>
      ) : null}
      {aiFields.length > 0 ? (
        <AiActionPanel
          fields={aiFields}
          onApply={(key, html) => {
            const current = isPlainRecord(validation.payload) ? validation.payload : {};
            onChange({ ...current, [key]: html });
          }}
        />
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

function collectAiFields(
  blockType: string,
  payload: unknown,
): Array<{ key: string; label: string; value: string }> {
  if (!isPlainRecord(payload)) return [];
  const out: Array<{ key: string; label: string; value: string }> = [];
  const pickString = (key: string): string => {
    const v = payload[key];
    return typeof v === "string" ? v : "";
  };
  if (blockType === "text-section") {
    out.push({ key: "body", label: "Fließtext", value: pickString("body") });
  } else if (blockType === "quote") {
    out.push({ key: "text", label: "Zitat", value: pickString("text") });
  } else if (blockType === "two-column") {
    out.push({ key: "leftBody", label: "Linke Spalte", value: pickString("leftBody") });
    out.push({ key: "rightBody", label: "Rechte Spalte", value: pickString("rightBody") });
  }
  return out;
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

const historyButtonStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.08)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 3,
  padding: "3px 9px",
  fontSize: 13,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  minWidth: 28,
};

const toolbarBtnStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.08)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 3,
  padding: "4px 10px",
  fontSize: 11,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  letterSpacing: ".1em",
  textTransform: "uppercase",
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
