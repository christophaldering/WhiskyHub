import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { StoryEditor } from "@/storybuilder/editor/StoryEditor";
import type { StoryBlock, StoryDocument } from "@/storybuilder/core/types";
import type { StoryPersistenceAdapter } from "@/storybuilder/core/adapter";
import { getStoryVersion, listStoryVersions, restoreStoryVersion } from "@/storybuilder/api";
import {
  getTastingStory,
  saveTastingStory,
  snapshotTastingStory,
  type TastingStoryResponse,
} from "@/lib/tastingStoryApi";
import {
  getTastingStoryData,
  regenerateTastingStoryBlocks,
  type TastingStoryDataResponse,
} from "@/lib/tastingStoryDataApi";
import { TastingStoryDataProvider } from "@/storybuilder/data/TastingStoryDataContext";
import { ShieldAlert } from "lucide-react";

const ACCENT = "#C9A961";
const ACCENT_DIM = "rgba(201,169,97,0.25)";

type Props = { id: string };

export default function LabsTastingStoryEditorPage({ id }: Props) {
  const { currentParticipant } = useAppStore();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRegen, setPendingRegen] = useState<{
    original: StoryBlock[];
    regenerated: StoryBlock[];
    regeneratedIds: Set<string>;
    skippedIds: Set<string>;
  } | null>(null);
  const pendingRegenAcceptedRef = useRef<Record<string, boolean>>({});
  const pendingRegenResolveRef = useRef<((next: StoryBlock[] | null) => void) | null>(null);

  const { data, isLoading, isError, error } = useQuery<TastingStoryResponse>({
    queryKey: ["/api/tasting-stories", id],
    queryFn: () => getTastingStory(id),
    enabled: !!id && !!currentParticipant?.id,
  });

  const { data: storyData } = useQuery<TastingStoryDataResponse>({
    queryKey: ["/api/tasting-stories", id, "data"],
    queryFn: () => getTastingStoryData(id),
    enabled: !!id && !!currentParticipant?.id && !!data?.canEdit,
  });

  const initialDoc: StoryDocument | null = useMemo(() => {
    if (!data) return null;
    return data.document;
  }, [data]);

  useEffect(() => {
    if (isError && error instanceof Error) {
      setActionError(error.message);
    }
  }, [isError, error]);

  if (!currentParticipant?.id) {
    return (
      <div
        style={{ padding: 32, color: "#A89A85", fontFamily: "'Inter', sans-serif" }}
        data-testid="tasting-story-editor-no-access"
      >
        <ShieldAlert style={{ width: 24, height: 24, color: ACCENT, marginBottom: 8 }} />
        <h1 style={{ fontFamily: "'EB Garamond', serif", color: "#F5EDE0", fontSize: 24 }}>Anmeldung erforderlich</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{ padding: 32, color: "#A89A85", fontFamily: "'EB Garamond', serif" }}
        data-testid="tasting-story-editor-loading"
      >
        Lade Story…
      </div>
    );
  }

  if (isError || !data || !initialDoc) {
    return (
      <div
        style={{ padding: 32, color: "#d97757", fontFamily: "'EB Garamond', serif" }}
        data-testid="tasting-story-editor-error"
      >
        Story konnte nicht geladen werden.
        <div style={{ marginTop: 8, fontSize: 12, color: "#A89A85" }}>
          {error instanceof Error ? error.message : ""}
        </div>
        <button
          type="button"
          onClick={() => navigate(`/labs/tastings/${id}`)}
          style={linkButton}
          data-testid="button-back-to-tasting"
        >
          ← Zur Verkostung
        </button>
      </div>
    );
  }

  if (!data.canEdit) {
    return (
      <div
        style={{ padding: 32, color: "#A89A85", fontFamily: "'Inter', sans-serif" }}
        data-testid="tasting-story-editor-forbidden"
      >
        <ShieldAlert style={{ width: 24, height: 24, color: ACCENT, marginBottom: 8 }} />
        <h1 style={{ fontFamily: "'EB Garamond', serif", color: "#F5EDE0", fontSize: 24 }}>Kein Zugriff</h1>
        <p style={{ marginTop: 12 }}>Diese Story kann nur vom Host oder einem Admin bearbeitet werden.</p>
      </div>
    );
  }

  const handleEditorSave = async (next: StoryDocument): Promise<void> => {
    await saveTastingStory(id, next.blocks);
    qc.invalidateQueries({ queryKey: ["/api/tasting-stories", id] });
    setActionError(null);
  };

  const tastingAdapter: StoryPersistenceAdapter = {
    sourceType: "tasting",
    sourceId: id,
    consumerScope: "tasting",
    isAdmin: currentParticipant?.role === "admin",
    saveDraft: async (blocks) => {
      await saveTastingStory(id, blocks);
      qc.invalidateQueries({ queryKey: ["/api/tasting-stories", id] });
    },
    createSnapshot: async (blocks, name) => {
      await saveTastingStory(id, blocks);
      await snapshotTastingStory(id, blocks, name);
      qc.invalidateQueries({ queryKey: ["/api/tasting-stories", id] });
    },
    listVersions: (filter) => listStoryVersions("tasting", id, filter),
    getVersion: (versionId) => getStoryVersion("tasting", id, versionId),
    restoreVersion: async (versionId) => {
      const result = await restoreStoryVersion("tasting", id, versionId);
      return { blocks: result.blocksJson };
    },
  };

  const handleManualSnapshot = async (next: StoryDocument, name?: string): Promise<void> => {
    await saveTastingStory(id, next.blocks);
    await snapshotTastingStory(id, next.blocks, name);
    qc.invalidateQueries({ queryKey: ["/api/tasting-stories", id] });
  };

  const handleRegenerateBlock = async (
    blockId: string,
    _blockType: string,
    currentBlocks: StoryBlock[],
  ): Promise<Record<string, unknown> | null> => {
    const payload = currentBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      payload: b.payload,
      hidden: b.hidden,
      locked: b.locked,
      editedByHost: b.editedByHost,
    }));
    const result = await regenerateTastingStoryBlocks(id, payload, "single", blockId);
    const updated = result.blocks.find((b) => b.id === blockId);
    if (!updated) return null;
    return updated.payload;
  };

  const handleRegenerateStory = async (currentBlocks: StoryBlock[]): Promise<StoryBlock[] | null> => {
    const payload = currentBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      payload: b.payload,
      hidden: b.hidden,
      locked: b.locked,
      editedByHost: b.editedByHost,
    }));
    const result = await regenerateTastingStoryBlocks(id, payload, "all");
    const regeneratedIds = new Set(result.regenerated);
    const skippedIds = new Set(result.skipped);
    if (regeneratedIds.size === 0) {
      return null;
    }
    const regenSanitized: StoryBlock[] = [];
    for (const b of result.blocks) {
      const original = currentBlocks.find((c) => c.id === b.id);
      if (!original) continue;
      regenSanitized.push({
        id: b.id,
        type: original.type,
        payload: b.payload,
        hidden: b.hidden,
        locked: b.locked,
        editedByHost: b.editedByHost,
      });
    }
    const accepted: Record<string, boolean> = {};
    for (const rid of result.regenerated) accepted[rid] = true;
    pendingRegenAcceptedRef.current = accepted;
    return new Promise<StoryBlock[] | null>((resolve) => {
      pendingRegenResolveRef.current = resolve;
      setPendingRegen({
        original: currentBlocks,
        regenerated: regenSanitized,
        regeneratedIds,
        skippedIds,
      });
    });
  };

  const finishRegenPreview = (apply: boolean) => {
    const resolve = pendingRegenResolveRef.current;
    const preview = pendingRegen;
    pendingRegenResolveRef.current = null;
    setPendingRegen(null);
    if (!resolve) return;
    if (!apply || !preview) {
      resolve(null);
      return;
    }
    const accepted = pendingRegenAcceptedRef.current;
    const merged: StoryBlock[] = preview.original.map((orig) => {
      if (!preview.regeneratedIds.has(orig.id)) return orig;
      if (!accepted[orig.id]) return orig;
      const next = preview.regenerated.find((r) => r.id === orig.id);
      return next ?? orig;
    });
    resolve(merged);
  };

  const meta = data.tasting;

  return (
    <div
      data-testid="page-labs-tasting-story-editor"
      style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0B0906" }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          borderBottom: `1px solid ${ACCENT_DIM}`,
          background: "#0B0906",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 0 }}>
          <Link
            href={`/labs/tastings/${id}`}
            data-testid="link-back-to-tasting"
            style={{
              color: "#A89A85",
              textDecoration: "none",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              letterSpacing: ".15em",
              textTransform: "uppercase",
            }}
          >
            ← Verkostung
          </Link>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                letterSpacing: ".25em",
                textTransform: "uppercase",
                color: ACCENT,
              }}
            >
              Tasting-Story
            </div>
            <div
              style={{
                fontFamily: "'EB Garamond', serif",
                fontSize: 22,
                color: "#F5EDE0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              data-testid="text-tasting-title"
            >
              {meta.title}
            </div>
          </div>
          {data.autoGenerated ? (
            <span
              data-testid="badge-auto-generated"
              style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 10,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                background: "rgba(217,167,87,0.15)",
                color: "#D9A757",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Erstentwurf
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {currentParticipant?.role === "admin" ? (
            <AdminMigrationPanel tastingId={id} onChanged={() => qc.invalidateQueries({ queryKey: ["/api/tasting-stories", id] })} />
          ) : null}
          <a
            href={`/tasting-story/${id}`}
            target="_blank"
            rel="noreferrer"
            style={{ ...secondaryButton, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            data-testid="link-view-public-story"
          >
            Öffentliche Story ↗
          </a>
        </div>
      </header>
      {actionError ? (
        <div
          data-testid="tasting-story-editor-error-banner"
          style={{
            background: "rgba(217,119,87,0.1)",
            color: "#d97757",
            padding: "8px 24px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            borderBottom: "1px solid rgba(217,119,87,0.3)",
          }}
        >
          {actionError}
        </div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0 }}>
        <TastingStoryDataProvider data={storyData ?? null}>
          <StoryEditor
            initialDocument={initialDoc}
            onSave={handleEditorSave}
            onManualSnapshot={handleManualSnapshot}
            sourceContext={{ sourceType: "tasting", sourceId: id }}
            isAdmin={currentParticipant?.role === "admin"}
            adapter={tastingAdapter}
            onRegenerateBlock={handleRegenerateBlock}
            onRegenerateStory={handleRegenerateStory}
          />
        </TastingStoryDataProvider>
      </div>
      {pendingRegen ? (
        <RegenPreviewModal
          preview={pendingRegen}
          acceptedRef={pendingRegenAcceptedRef}
          onCancel={() => finishRegenPreview(false)}
          onApply={() => finishRegenPreview(true)}
        />
      ) : null}
    </div>
  );
}

type RegenPreviewState = {
  original: StoryBlock[];
  regenerated: StoryBlock[];
  regeneratedIds: Set<string>;
  skippedIds: Set<string>;
};

function RegenPreviewModal({
  preview,
  acceptedRef,
  onCancel,
  onApply,
}: {
  preview: RegenPreviewState;
  acceptedRef: React.MutableRefObject<Record<string, boolean>>;
  onCancel: () => void;
  onApply: () => void;
}) {
  const [, forceRender] = useState(0);
  const items = preview.original.filter((b) => preview.regeneratedIds.has(b.id));
  const acceptedCount = items.reduce((sum, it) => sum + (acceptedRef.current[it.id] ? 1 : 0), 0);
  const toggle = (id: string) => {
    acceptedRef.current = { ...acceptedRef.current, [id]: !acceptedRef.current[id] };
    forceRender((x) => x + 1);
  };
  const setAll = (val: boolean) => {
    const next: Record<string, boolean> = {};
    for (const it of items) next[it.id] = val;
    acceptedRef.current = next;
    forceRender((x) => x + 1);
  };
  return (
    <div
      data-testid="modal-regen-preview"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          maxHeight: "90vh",
          overflow: "hidden",
          background: "#15110C",
          border: `1px solid ${ACCENT_DIM}`,
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
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
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                letterSpacing: ".25em",
                textTransform: "uppercase",
                color: ACCENT,
              }}
            >
              KI-Vorschau
            </div>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, color: "#F5EDE0" }}>
              {items.length} {items.length === 1 ? "Block" : "Bloecke"} neu generiert
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#A89A85", marginTop: 4 }}>
              Pruefe die Vorschlaege und uebernimm nur, was du moechtest.{preview.skippedIds.size > 0 ? ` ${preview.skippedIds.size} gesperrte Bloecke wurden uebersprungen.` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setAll(true)}
              data-testid="button-regen-preview-accept-all"
              style={ghostButton}
            >
              Alle annehmen
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              data-testid="button-regen-preview-reject-all"
              style={ghostButton}
            >
              Alle abwaehlen
            </button>
          </div>
        </div>
        <div style={{ overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((orig) => {
            const next = preview.regenerated.find((r) => r.id === orig.id);
            const isAccepted = !!acceptedRef.current[orig.id];
            const oldText = extractBlockSummary(orig.payload);
            const newText = next ? extractBlockSummary(next.payload) : "";
            return (
              <div
                key={orig.id}
                data-testid={`regen-preview-item-${orig.id}`}
                style={{
                  border: `1px solid ${isAccepted ? ACCENT : "rgba(168,154,133,0.2)"}`,
                  borderRadius: 4,
                  padding: 12,
                  background: "#0B0906",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAccepted}
                    onChange={() => toggle(orig.id)}
                    data-testid={`checkbox-accept-${orig.id}`}
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      letterSpacing: ".2em",
                      textTransform: "uppercase",
                      color: "#F5EDE0",
                    }}
                  >
                    {orig.type}
                  </span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <DiffColumn label="Vorher" text={oldText} accent="#A89A85" />
                  <DiffColumn label="Vorschlag" text={newText} accent={ACCENT} />
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            padding: "12px 24px",
            borderTop: `1px solid ${ACCENT_DIM}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#A89A85" }}>
            {acceptedCount} von {items.length} ausgewaehlt
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              data-testid="button-regen-preview-cancel"
              style={ghostButton}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={acceptedCount === 0}
              data-testid="button-regen-preview-apply"
              style={{
                ...primaryButton,
                opacity: acceptedCount === 0 ? 0.4 : 1,
                cursor: acceptedCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              {acceptedCount} uebernehmen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffColumn({ label, text, accent }: { label: string; text: string; accent: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
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
          maxHeight: 220,
          overflow: "auto",
          padding: 8,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 3,
        }}
      >
        {text || "—"}
      </div>
    </div>
  );
}

function extractBlockSummary(payload: Record<string, unknown>): string {
  const lines: string[] = [];
  const stringKeys = ["eyebrow", "heading", "body", "kicker", "quote", "tagline", "title", "subtitle"];
  for (const k of stringKeys) {
    const v = payload[k];
    if (typeof v === "string" && v.trim().length > 0) lines.push(`${k}: ${v.trim()}`);
  }
  const overrides = payload.overrides;
  if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
    const entries = Object.entries(overrides as Record<string, unknown>);
    for (const [id, value] of entries) {
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const parts: string[] = [];
      for (const [vk, vv] of Object.entries(v)) {
        if (typeof vv === "string" && vv.trim().length > 0) parts.push(`${vk}: ${vv.trim()}`);
      }
      if (parts.length > 0) lines.push(`${id} → ${parts.join(" | ")}`);
    }
  }
  if (lines.length === 0) {
    try {
      return JSON.stringify(payload, null, 2).slice(0, 600);
    } catch {
      return "";
    }
  }
  return lines.join("\n");
}

const secondaryButton: React.CSSProperties = {
  background: "transparent",
  color: "#F5EDE0",
  border: `1px solid ${ACCENT_DIM}`,
  padding: "8px 16px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: 3,
};

const linkButton: React.CSSProperties = {
  background: "transparent",
  color: ACCENT,
  border: "none",
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
  textDecoration: "none",
};

const ghostButton: React.CSSProperties = {
  background: "transparent",
  color: "#F5EDE0",
  border: `1px solid ${ACCENT_DIM}`,
  padding: "6px 12px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 10,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: 3,
};

const primaryButton: React.CSSProperties = {
  background: ACCENT,
  color: "#0B0906",
  border: `1px solid ${ACCENT}`,
  padding: "8px 18px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  borderRadius: 3,
  fontWeight: 600,
};

type AdminMigrationPanelProps = {
  tastingId: string;
  onChanged: () => void;
};

function AdminMigrationPanel({ tastingId, onChanged }: AdminMigrationPanelProps) {
  const [busy, setBusy] = useState<null | "blocks" | "versions" | "unmigrate">(null);
  const [force, setForce] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function call(kind: "blocks" | "versions" | "unmigrate") {
    const endpoint =
      kind === "blocks"
        ? `/api/admin/tasting-stories/${encodeURIComponent(tastingId)}/migrate-blocks`
        : kind === "versions"
        ? `/api/admin/tasting-stories/${encodeURIComponent(tastingId)}/migrate-versions`
        : `/api/admin/tasting-stories/${encodeURIComponent(tastingId)}/unmigrate-blocks`;
    setBusy(kind);
    setStatusMsg(null);
    try {
      const body = kind === "blocks" ? JSON.stringify({ force }) : "{}";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) {
        let msg = `Fehler ${res.status}`;
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {
          void 0;
        }
        setStatusMsg(msg);
        return;
      }
      const j = await res.json();
      const summary =
        kind === "blocks"
          ? `Status: ${j?.result?.status ?? "?"} (${j?.result?.blockCount ?? 0} Bloecke)`
          : kind === "versions"
          ? `Importiert: ${j?.result?.imported ?? 0}, uebersprungen: ${(j?.result?.skippedExisting ?? 0) + (j?.result?.skippedInvalid ?? 0)}`
          : `Zurueckgesetzt (${j?.result?.previousCount ?? 0} Bloecke entfernt)`;
      setStatusMsg(summary);
      onChanged();
    } catch (e: unknown) {
      setStatusMsg(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ position: "relative" }} data-testid="admin-migration-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={ghostButton}
        data-testid="button-admin-migration-toggle"
      >
        Story-Migration
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "#15110C",
            border: `1px solid ${ACCENT_DIM}`,
            padding: 12,
            borderRadius: 4,
            minWidth: 280,
            zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
          data-testid="admin-migration-panel-content"
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: 8,
            }}
          >
            Migrations-Werkzeuge
          </div>
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: "#F5EDE0",
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
              data-testid="checkbox-migration-force"
            />
            Force (bestehende Bloecke ueberschreiben)
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => call("blocks")}
              style={ghostButton}
              data-testid="button-migrate-blocks"
            >
              {busy === "blocks" ? "Migriere..." : "Slide-Cache -> Bloecke"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => call("versions")}
              style={ghostButton}
              data-testid="button-migrate-versions"
            >
              {busy === "versions" ? "Migriere..." : "Alte Versionen importieren"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => call("unmigrate")}
              style={ghostButton}
              data-testid="button-unmigrate-blocks"
            >
              {busy === "unmigrate" ? "Setze zurueck..." : "Bloecke zuruecksetzen"}
            </button>
          </div>
          {statusMsg ? (
            <div
              style={{
                marginTop: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: "#A89A85",
                wordBreak: "break-word",
              }}
              data-testid="text-migration-status"
            >
              {statusMsg}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
