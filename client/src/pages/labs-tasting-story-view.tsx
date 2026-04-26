import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import type { StoryDocument } from "@/storybuilder/core/types";
import { getPublicTastingStory, type TastingStoryResponse } from "@/lib/tastingStoryApi";
import { getPublicTastingStoryData, type TastingStoryDataResponse } from "@/lib/tastingStoryDataApi";
import { TastingStoryDataProvider } from "@/storybuilder/data/TastingStoryDataContext";

type Props = { id: string };

export default function LabsTastingStoryViewPage({ id }: Props) {
  const [fellBack, setFellBack] = useState(false);

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

  return (
    <div data-testid="page-labs-tasting-story-view" style={{ background: "#0B0906", minHeight: "100vh" }}>
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
