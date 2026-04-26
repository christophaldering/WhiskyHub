import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { getSession } from "@/lib/session";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import type { StoryDocument, StoryBlock } from "@/storybuilder/core/types";
import { getCmsPage, type CmsPageFull } from "@/lib/cms-api";
import { ShieldAlert } from "lucide-react";

const ACCENT = "#C9A961";

type Props = { id: string };

export default function AdminCmsPreviewPage({ id }: Props) {
  const { currentParticipant } = useAppStore();
  const isAdmin = currentParticipant?.role === "admin" || getSession().role === "admin";

  const { data, isLoading, isError, error } = useQuery<CmsPageFull>({
    queryKey: ["/api/admin/cms/pages", id],
    queryFn: () => getCmsPage(id),
    enabled: isAdmin && !!id,
  });

  const document: StoryDocument | null = useMemo(() => {
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

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, color: "#A89A85", fontFamily: "'Inter', sans-serif" }} data-testid="cms-preview-no-access">
        <ShieldAlert style={{ width: 24, height: 24, color: ACCENT, marginBottom: 8 }} />
        <h1 style={{ fontFamily: "'EB Garamond', serif", color: "#F5EDE0", fontSize: 24 }}>Zugang verweigert</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 32, color: "#A89A85", fontFamily: "'EB Garamond', serif" }} data-testid="cms-preview-loading">
        Lade Vorschau…
      </div>
    );
  }

  if (isError || !data || !document) {
    return (
      <div style={{ padding: 32, color: "#d97757", fontFamily: "'EB Garamond', serif" }} data-testid="cms-preview-error">
        Vorschau konnte nicht geladen werden.
        <div style={{ marginTop: 8, fontSize: 12, color: "#A89A85" }}>{error instanceof Error ? error.message : ""}</div>
      </div>
    );
  }

  return (
    <div data-testid="page-admin-cms-preview" style={{ background: "#0B0906", minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(217,167,87,0.12)",
          borderBottom: "1px solid rgba(217,167,87,0.4)",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: "#D9A757",
          letterSpacing: ".15em",
          textTransform: "uppercase",
          backdropFilter: "blur(6px)",
        }}
        data-testid="preview-banner"
      >
        <span>Vorschau · Entwurf · {data.title}</span>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href={`/admin/cms/${id}`} style={previewLink} data-testid="link-back-to-editor">
            ← Zurück zum Editor
          </Link>
          {data.publishedAt ? (
            <a
              href={`/${data.slug === "home" ? "" : data.slug}`}
              target="_blank"
              rel="noreferrer"
              style={previewLink}
              data-testid="link-view-live"
            >
              Live-Version ↗
            </a>
          ) : null}
        </div>
      </div>
      <div data-testid="preview-content">
        <StoryRenderer document={document} mode="public" />
      </div>
    </div>
  );
}

const previewLink: React.CSSProperties = {
  color: "#D9A757",
  textDecoration: "none",
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  letterSpacing: ".15em",
  textTransform: "uppercase",
};
