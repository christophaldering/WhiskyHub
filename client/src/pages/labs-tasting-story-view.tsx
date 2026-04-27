import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import type { StoryDocument } from "@/storybuilder/core/types";
import { getPublicTastingStory, type TastingStoryResponse } from "@/lib/tastingStoryApi";
import { getPublicTastingStoryData, type TastingStoryDataResponse } from "@/lib/tastingStoryDataApi";
import { TastingStoryDataProvider } from "@/storybuilder/data/TastingStoryDataContext";
import { exportTastingStoryBlocksPdfFor } from "@/lib/pdf-story-blocks";

type Props = { id: string };

export default function LabsTastingStoryViewPage({ id }: Props) {
  const [fellBack, setFellBack] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<TastingStoryResponse>({
    queryKey: ["/api/public/tasting-stories", id],
    queryFn: () => getPublicTastingStory(id),
    enabled: !!id,
    retry: false,
  });

  const { data: storyData, isError: storyDataError } = useQuery<TastingStoryDataResponse>({
    queryKey: ["/api/public/tasting-stories", id, "data"],
    queryFn: () => getPublicTastingStoryData(id),
    enabled: !!id && !!data,
    retry: false,
  });

  useEffect(() => {
    if (data && (!data.document.blocks || data.document.blocks.length === 0)) {
      if (!fellBack) {
        setFellBack(true);
        window.location.replace(`/tasting-story/${encodeURIComponent(id)}?legacy=1`);
      }
    }
  }, [data, fellBack, id]);

  useEffect(() => {
    if (data?.tasting?.title) {
      document.title = `${data.tasting.title} – Story`;
    }
  }, [data]);

  const document_: StoryDocument | null = useMemo(() => data?.document ?? null, [data]);

  if (isLoading) {
    return (
      <div
        style={baseScreen}
        data-testid="tasting-story-view-loading"
      >
        Lade Story…
      </div>
    );
  }

  if (isError) {
    const status = (error as { status?: number } | null)?.status;
    const msg =
      status === 403
        ? "Diese Story ist noch nicht freigegeben."
        : status === 404
          ? "Story nicht gefunden."
          : error instanceof Error
            ? error.message
            : "Story konnte nicht geladen werden.";
    return (
      <div style={baseScreen} data-testid="tasting-story-view-error">
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: ".3em",
              textTransform: "uppercase",
              color: "#C9A961",
              marginBottom: 12,
            }}
          >
            Tasting-Story
          </div>
          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 28, color: "#F5EDE0" }}>{msg}</div>
        </div>
      </div>
    );
  }

  if (!document_ || document_.blocks.length === 0) {
    return (
      <div style={baseScreen} data-testid="tasting-story-view-fallback">
        <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, color: "#A89A85" }}>
          Lade ältere Story-Ansicht…
        </div>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    setPdfError(null);
    try {
      await exportTastingStoryBlocksPdfFor(id, data?.tasting?.title ?? undefined);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Story-PDF konnte nicht erzeugt werden.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div data-testid="page-labs-tasting-story-view" style={{ background: "#0B0906", minHeight: "100vh", position: "relative" }}>
      <div
        data-testid="story-view-download-bar"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "flex-end",
        }}
      >
        <button
          onClick={handleDownloadPdf}
          disabled={pdfBusy}
          data-testid="button-story-view-download-pdf"
          aria-label="Story als PDF herunterladen"
          title="Story als PDF herunterladen"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            background: pdfBusy ? "rgba(201,169,97,0.45)" : "#C9A961",
            color: "#1A1714",
            border: "none",
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            cursor: pdfBusy ? "wait" : "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
          }}
        >
          {pdfBusy
            ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
            : <Download style={{ width: 14, height: 14 }} />}
          {pdfBusy ? "Wird vorbereitet…" : "Story-PDF"}
        </button>
        {pdfError && (
          <span
            data-testid="text-story-view-download-error"
            style={{
              maxWidth: 240,
              padding: "6px 10px",
              borderRadius: 6,
              background: "rgba(224,96,96,0.15)",
              color: "#E06060",
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              textAlign: "right",
            }}
          >
            {pdfError}
          </span>
        )}
      </div>
      {storyDataError ? (
        <div
          data-testid="banner-tasting-data-unavailable"
          style={{
            background: "rgba(217,167,87,0.1)",
            color: "#D9A757",
            padding: "8px 24px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            letterSpacing: ".15em",
            textTransform: "uppercase",
            textAlign: "center",
            borderBottom: "1px solid rgba(217,167,87,0.3)",
          }}
        >
          Live-Daten fuer einzelne Bloecke konnten nicht geladen werden.
        </div>
      ) : null}
      <TastingStoryDataProvider data={storyData ?? null}>
        <StoryRenderer document={document_} mode="public" />
      </TastingStoryDataProvider>
    </div>
  );
}

const baseScreen: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0B0906",
  color: "#A89A85",
  fontFamily: "'EB Garamond', serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  textAlign: "center",
};
