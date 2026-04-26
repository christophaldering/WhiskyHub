import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { StoryEditor } from "@/storybuilder/editor/StoryEditor";
import type { StoryDocument, StoryBlock } from "@/storybuilder/core/types";
import { listThemes } from "@/storybuilder/themes";
import { getCmsPage, updateCmsPage, publishCmsPage, type CmsPageFull, type CmsPageStatus } from "@/lib/cms-api";
import { pidHeaders } from "@/lib/api";
import { ShieldAlert } from "lucide-react";

const ACCENT = "#C9A961";
const ACCENT_DIM = "rgba(201,169,97,0.25)";

function StatusBadge({ status }: { status: CmsPageStatus }) {
  const map: Record<CmsPageStatus, { bg: string; color: string; label: string }> = {
    draft: { bg: "rgba(168,154,133,0.15)", color: "#A89A85", label: "Entwurf" },
    live: { bg: "rgba(123,176,119,0.15)", color: "#7BB077", label: "Live" },
    "live-changes": { bg: "rgba(217,167,87,0.15)", color: "#D9A757", label: "Live · Änderungen" },
  };
  const s = map[status];
  return (
    <span
      data-testid={`editor-status-${status}`}
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 10,
        letterSpacing: ".2em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {s.label}
    </span>
  );
}

type Props = { id: string };

export default function AdminCmsEditorPage({ id }: Props) {
  const { currentParticipant } = useAppStore();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const isAdmin = currentParticipant?.role === "admin";
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<CmsPageFull>({
    queryKey: ["/api/admin/cms/pages", id],
    queryFn: () => getCmsPage(id),
    enabled: isAdmin && !!id,
  });

  const themes = useMemo(() => listThemes(), []);

  const initialDoc: StoryDocument | null = useMemo(() => {
    if (!data) return null;
    const blocks: StoryBlock[] = Array.isArray(data.draftBlocksJson) && data.draftBlocksJson.length > 0
      ? data.draftBlocksJson
      : Array.isArray(data.blocksJson)
        ? data.blocksJson
        : [];
    return {
      schemaVersion: 1,
      theme: data.theme,
      blocks,
      metadata: { createdAt: data.createdAt, updatedAt: data.updatedAt, title: data.title },
    };
  }, [data]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [theme, setTheme] = useState("casksense-editorial");
  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setSlug(data.slug);
      setTheme(data.theme);
    }
  }, [data]);

  const metaSaveMut = useMutation({
    mutationFn: (patch: { title?: string; slug?: string; theme?: string }) => updateCmsPage(id, patch),
    onSuccess: (next) => {
      qc.setQueryData(["/api/admin/cms/pages", id], next);
      qc.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      setActionError(null);
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const publishMut = useMutation({
    mutationFn: () => publishCmsPage(id),
    onSuccess: (next) => {
      qc.setQueryData(["/api/admin/cms/pages", id], next);
      qc.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      setActionError(null);
    },
    onError: (e: Error) => setActionError(e.message),
  });

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, color: "#A89A85", fontFamily: "'Inter', sans-serif" }} data-testid="cms-editor-no-access">
        <ShieldAlert style={{ width: 24, height: 24, color: ACCENT, marginBottom: 8 }} />
        <h1 style={{ fontFamily: "'EB Garamond', serif", color: "#F5EDE0", fontSize: 24 }}>Zugang verweigert</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 32, color: "#A89A85", fontFamily: "'EB Garamond', serif" }} data-testid="cms-editor-loading">
        Lade Seite…
      </div>
    );
  }

  if (isError || !data || !initialDoc) {
    return (
      <div style={{ padding: 32, color: "#d97757", fontFamily: "'EB Garamond', serif" }} data-testid="cms-editor-error">
        Seite konnte nicht geladen werden.
        <div style={{ marginTop: 8, fontSize: 12, color: "#A89A85" }}>{error instanceof Error ? error.message : ""}</div>
        <button type="button" onClick={() => navigate("/admin/cms")} style={linkButton} data-testid="button-back-to-list">
          ← Zur Übersicht
        </button>
      </div>
    );
  }

  const handleEditorSave = async (next: StoryDocument): Promise<void> => {
    const updated = await updateCmsPage(id, { draftBlocksJson: next.blocks });
    qc.setQueryData(["/api/admin/cms/pages", id], updated);
    qc.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
  };

  const handleManualSnapshot = async (next: StoryDocument, name?: string): Promise<void> => {
    await updateCmsPage(id, { draftBlocksJson: next.blocks });
    const res = await fetch(`/api/admin/storybuilder/page/${encodeURIComponent(id)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...pidHeaders() },
      body: JSON.stringify({ blocksJson: next.blocks, isAuto: false, name: name ?? undefined }),
    });
    if (!res.ok) {
      let msg = "Snapshot fehlgeschlagen";
      try {
        const dataMsg = await res.json();
        if (dataMsg && typeof dataMsg.message === "string") msg = dataMsg.message;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
  };

  const titleChanged = title !== data.title;
  const slugChanged = slug !== data.slug;
  const themeChanged = theme !== data.theme;
  const metaDirty = titleChanged || slugChanged || themeChanged;

  return (
    <div data-testid="page-admin-cms-editor" style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0B0906" }}>
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
          <Link href="/admin/cms" data-testid="link-back-to-list" style={{ color: "#A89A85", textDecoration: "none", fontFamily: "'Inter', sans-serif", fontSize: 12, letterSpacing: ".15em", textTransform: "uppercase" }}>
            ← Übersicht
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={titleInputStyle}
            data-testid="input-page-title"
          />
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#A89A85" }}>/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ ...slugInputStyle, width: 180 }}
            data-testid="input-page-slug"
          />
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={selectStyle}
            data-testid="select-page-theme"
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <StatusBadge status={data.status} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {metaDirty ? (
            <button
              type="button"
              onClick={() => metaSaveMut.mutate({ title, slug, theme })}
              disabled={metaSaveMut.isPending}
              style={secondaryButton}
              data-testid="button-save-meta"
            >
              {metaSaveMut.isPending ? "…" : "Meta speichern"}
            </button>
          ) : null}
          <Link
            href={`/admin/cms/${id}/preview`}
            style={{ ...secondaryButton, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            data-testid="link-preview-draft"
          >
            Vorschau
          </Link>
          <button
            type="button"
            onClick={() => {
              if (confirm("Aktuellen Entwurf jetzt veröffentlichen?")) publishMut.mutate();
            }}
            disabled={publishMut.isPending}
            style={primaryButton}
            data-testid="button-publish-page"
          >
            {publishMut.isPending ? "Veröffentliche…" : "Veröffentlichen"}
          </button>
          {data.publishedAt ? (
            <a
              href={`/${data.slug === "home" ? "" : data.slug}`}
              target="_blank"
              rel="noreferrer"
              style={linkButton}
              data-testid="link-view-public"
            >
              Live ansehen ↗
            </a>
          ) : null}
        </div>
      </header>
      {actionError ? (
        <div
          data-testid="cms-editor-error-banner"
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
        <StoryEditor
          initialDocument={initialDoc}
          onSave={handleEditorSave}
          onManualSnapshot={handleManualSnapshot}
          sourceContext={{ sourceType: "page", sourceId: id }}
          isAdmin
          paletteCategories={["generic", "landing"]}
        />
      </div>
    </div>
  );
}

const titleInputStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  borderBottom: `1px solid transparent`,
  color: "#F5EDE0",
  fontFamily: "'EB Garamond', serif",
  fontSize: 22,
  outline: "none",
  padding: "4px 0",
  flex: "0 1 320px",
  minWidth: 120,
};

const slugInputStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.04)",
  border: `1px solid ${ACCENT_DIM}`,
  color: "#F5EDE0",
  fontFamily: "monospace",
  fontSize: 12,
  outline: "none",
  padding: "6px 10px",
  borderRadius: 3,
};

const selectStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.04)",
  border: `1px solid ${ACCENT_DIM}`,
  color: "#F5EDE0",
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 3,
  outline: "none",
};

const primaryButton: React.CSSProperties = {
  background: ACCENT,
  color: "#0B0906",
  border: "none",
  padding: "8px 16px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  borderRadius: 3,
};

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
