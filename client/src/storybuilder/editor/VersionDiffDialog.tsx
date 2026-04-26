import { useMemo } from "react";
import type { StoryBlock } from "../core/types";
import { diffPayloadKeys, diffStoryBlocks, summarizeDiff, type BlockDiffEntry } from "../core/diff";
import { getBlockDefinition } from "../blocks";

const ACCENT = "#C9A961";
const ACCENT_DIM = "rgba(201,169,97,0.25)";
const COLOR_CHANGED = "#D9A757";
const COLOR_CHANGED_BG = "rgba(217,167,87,0.1)";
const COLOR_ADDED = "#7BB077";
const COLOR_ADDED_BG = "rgba(123,176,119,0.1)";
const COLOR_REMOVED = "#d97757";
const COLOR_REMOVED_BG = "rgba(217,119,87,0.1)";
const COLOR_UNCHANGED = "#A89A85";

type Props = {
  open: boolean;
  onClose: () => void;
  oldBlocks: StoryBlock[];
  newBlocks: StoryBlock[];
  oldLabel: string;
  newLabel: string;
};

export function VersionDiffDialog({ open, onClose, oldBlocks, newBlocks, oldLabel, newLabel }: Props) {
  const entries = useMemo(() => diffStoryBlocks(oldBlocks, newBlocks), [oldBlocks, newBlocks]);
  const summary = useMemo(() => summarizeDiff(entries), [entries]);

  if (!open) return null;

  return (
    <div
      data-testid="version-diff-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <div
        data-testid="version-diff-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 1080,
          maxHeight: "90vh",
          background: "#15110C",
          color: "#F5EDE0",
          fontFamily: "'Inter', system-ui, sans-serif",
          border: `1px solid ${ACCENT_DIM}`,
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: `1px solid ${ACCENT_DIM}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: ".25em",
                textTransform: "uppercase",
                color: ACCENT,
              }}
            >
              Versionsvergleich
            </div>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, color: "#F5EDE0", marginTop: 2 }}>
              {oldLabel} <span style={{ color: COLOR_UNCHANGED, fontSize: 16 }}>→</span> {newLabel}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 11 }}>
              <Badge color={COLOR_CHANGED} testid="diff-badge-changed">{summary.changed} geaendert</Badge>
              <Badge color={COLOR_ADDED} testid="diff-badge-added">{summary.added} neu</Badge>
              <Badge color={COLOR_REMOVED} testid="diff-badge-removed">{summary.removed} geloescht</Badge>
              <Badge color={COLOR_UNCHANGED} testid="diff-badge-unchanged">{summary.unchanged} unveraendert</Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="button-close-version-diff"
            style={closeBtn}
            aria-label="Schliessen"
          >
            ✕
          </button>
        </div>
        <div style={{ overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.length === 0 ? (
            <div style={{ padding: 24, color: COLOR_UNCHANGED, fontSize: 12 }} data-testid="diff-empty">
              Keine Bloecke vorhanden.
            </div>
          ) : (
            entries.map((e) => <DiffEntryCard key={`${e.status}-${e.blockId}`} entry={e} />)
          )}
        </div>
        <div
          style={{
            padding: "12px 24px",
            borderTop: `1px solid ${ACCENT_DIM}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button type="button" onClick={onClose} data-testid="button-close-diff-footer" style={primaryBtn}>
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
}

function DiffEntryCard({ entry }: { entry: BlockDiffEntry }) {
  const colors = statusColors(entry.status);
  const block = entry.newBlock ?? entry.oldBlock;
  const def = block ? getBlockDefinition(block.type) : undefined;
  const label = def?.label ?? block?.type ?? entry.blockId;

  return (
    <div
      data-testid={`diff-entry-${entry.status}-${entry.blockId}`}
      style={{
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        borderLeft: `3px solid ${colors.accent}`,
        borderRadius: 4,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 9,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              background: colors.accent,
              color: "#0B0906",
              fontWeight: 600,
            }}
          >
            {statusLabel(entry.status)}
          </span>
          <span style={{ fontSize: 13, color: "#F5EDE0", fontFamily: "'EB Garamond', serif" }}>{label}</span>
          {entry.status === "changed" && entry.changedFields.length > 0 ? (
            <span style={{ fontSize: 10, color: COLOR_UNCHANGED, letterSpacing: ".05em" }}>
              {entry.changedFields.join(", ")}
            </span>
          ) : null}
          {entry.status === "unchanged" && entry.movedOnly ? (
            <span
              data-testid={`diff-moved-${entry.blockId}`}
              style={{ fontSize: 10, color: COLOR_UNCHANGED, letterSpacing: ".05em", fontStyle: "italic" }}
            >
              verschoben
            </span>
          ) : null}
        </div>
        <span style={{ fontSize: 10, color: COLOR_UNCHANGED }}>
          {entry.oldIndex !== undefined ? `#${entry.oldIndex + 1}` : "—"}{" "}
          <span style={{ opacity: 0.5 }}>→</span>{" "}
          {entry.newIndex !== undefined ? `#${entry.newIndex + 1}` : "—"}
        </span>
      </div>
      {entry.status === "changed" ? (
        <ChangedDetails entry={entry} />
      ) : entry.status === "added" && entry.newBlock ? (
        <BlockSummary block={entry.newBlock} accent={COLOR_ADDED} label="Neu" />
      ) : entry.status === "removed" && entry.oldBlock ? (
        <BlockSummary block={entry.oldBlock} accent={COLOR_REMOVED} label="Entfernt" strike />
      ) : null}
    </div>
  );
}

function ChangedDetails({ entry }: { entry: BlockDiffEntry }) {
  const oldPayload = entry.oldBlock?.payload;
  const newPayload = entry.newBlock?.payload;
  const changedKeys = diffPayloadKeys(oldPayload, newPayload);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <ColumnView label="Vorher" accent={COLOR_UNCHANGED} payload={oldPayload} highlightKeys={changedKeys} />
      <ColumnView label="Nachher" accent={COLOR_CHANGED} payload={newPayload} highlightKeys={changedKeys} />
    </div>
  );
}

function ColumnView({
  label,
  accent,
  payload,
  highlightKeys,
}: {
  label: string;
  accent: string;
  payload: Record<string, unknown> | undefined;
  highlightKeys: string[];
}) {
  const summary = payload ? summarizePayload(payload) : "—";
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: ".25em",
          textTransform: "uppercase",
          color: accent,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'EB Garamond', serif",
          fontSize: 13,
          lineHeight: 1.5,
          color: "#F5EDE0",
          whiteSpace: "pre-wrap",
          maxHeight: 240,
          overflow: "auto",
          padding: 8,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 3,
        }}
      >
        {summary}
      </div>
      {highlightKeys.length > 0 ? (
        <div style={{ marginTop: 4, fontSize: 10, color: COLOR_UNCHANGED }}>
          Geaenderte Felder: {highlightKeys.join(", ")}
        </div>
      ) : null}
    </div>
  );
}

function BlockSummary({
  block,
  accent,
  label,
  strike,
}: {
  block: StoryBlock;
  accent: string;
  label: string;
  strike?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: ".25em",
          textTransform: "uppercase",
          color: accent,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'EB Garamond', serif",
          fontSize: 13,
          lineHeight: 1.5,
          color: strike ? COLOR_UNCHANGED : "#F5EDE0",
          whiteSpace: "pre-wrap",
          textDecoration: strike ? "line-through" : "none",
          maxHeight: 240,
          overflow: "auto",
          padding: 8,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 3,
        }}
      >
        {summarizePayload(block.payload)}
      </div>
    </div>
  );
}

function summarizePayload(payload: Record<string, unknown>): string {
  const lines: string[] = [];
  const stringKeys = ["eyebrow", "heading", "body", "kicker", "quote", "tagline", "title", "subtitle", "label", "text", "html"];
  for (const k of stringKeys) {
    const v = payload[k];
    if (typeof v === "string" && v.trim().length > 0) lines.push(`${k}: ${truncate(v.trim(), 240)}`);
  }
  for (const [k, v] of Object.entries(payload)) {
    if (stringKeys.includes(k)) continue;
    if (typeof v === "string" && v.trim().length > 0 && lines.length < 12) {
      lines.push(`${k}: ${truncate(v.trim(), 200)}`);
    } else if (typeof v === "number" || typeof v === "boolean") {
      lines.push(`${k}: ${String(v)}`);
    } else if (Array.isArray(v)) {
      lines.push(`${k}: [${v.length}]`);
    } else if (v && typeof v === "object") {
      lines.push(`${k}: {…}`);
    }
  }
  if (lines.length === 0) {
    try {
      return JSON.stringify(payload, null, 2).slice(0, 600);
    } catch {
      return "—";
    }
  }
  return lines.join("\n");
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function statusColors(status: BlockDiffEntry["status"]): { border: string; bg: string; accent: string } {
  if (status === "changed") return { border: COLOR_CHANGED, bg: COLOR_CHANGED_BG, accent: COLOR_CHANGED };
  if (status === "added") return { border: COLOR_ADDED, bg: COLOR_ADDED_BG, accent: COLOR_ADDED };
  if (status === "removed") return { border: COLOR_REMOVED, bg: COLOR_REMOVED_BG, accent: COLOR_REMOVED };
  return { border: "rgba(168,154,133,0.2)", bg: "transparent", accent: COLOR_UNCHANGED };
}

function statusLabel(status: BlockDiffEntry["status"]): string {
  if (status === "changed") return "geaendert";
  if (status === "added") return "neu";
  if (status === "removed") return "geloescht";
  return "unveraendert";
}

function Badge({ color, children, testid }: { color: string; children: React.ReactNode; testid: string }) {
  return (
    <span
      data-testid={testid}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          display: "inline-block",
        }}
      />
      {children}
    </span>
  );
}

const closeBtn: React.CSSProperties = {
  background: "rgba(201,169,97,0.08)",
  border: `1px solid ${ACCENT_DIM}`,
  borderRadius: 3,
  padding: "4px 10px",
  fontSize: 12,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const primaryBtn: React.CSSProperties = {
  background: ACCENT,
  color: "#0B0906",
  border: "none",
  borderRadius: 3,
  padding: "8px 18px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};
