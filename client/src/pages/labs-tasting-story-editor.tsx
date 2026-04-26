import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { StoryEditor } from "@/storybuilder/editor/StoryEditor";
import type { StoryDocument } from "@/storybuilder/core/types";
import {
  getTastingStory,
  saveTastingStory,
  snapshotTastingStory,
  type TastingStoryResponse,
} from "@/lib/tastingStoryApi";
import { ShieldAlert } from "lucide-react";

const ACCENT = "#C9A961";
const ACCENT_DIM = "rgba(201,169,97,0.25)";

type Props = { id: string };

export default function LabsTastingStoryEditorPage({ id }: Props) {
  const { currentParticipant } = useAppStore();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<TastingStoryResponse>({
    queryKey: ["/api/tasting-stories", id],
    queryFn: () => getTastingStory(id),
    enabled: !!id && !!currentParticipant?.id,
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

  const handleManualSnapshot = async (next: StoryDocument, name?: string): Promise<void> => {
    await saveTastingStory(id, next.blocks);
    await snapshotTastingStory(id, next.blocks, name);
    qc.invalidateQueries({ queryKey: ["/api/tasting-stories", id] });
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
        <StoryEditor
          initialDocument={initialDoc}
          onSave={handleEditorSave}
          onManualSnapshot={handleManualSnapshot}
          sourceContext={{ sourceType: "tasting", sourceId: id }}
          isAdmin={currentParticipant?.role === "admin"}
          paletteCategories={["generic", "tasting"]}
        />
      </div>
    </div>
  );
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
