import { useEffect, useState } from "react";
import { fetchPublicCmsPage, type CmsPublicPage } from "@/lib/cms-api";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import type { StoryDocument } from "@/storybuilder/core/types";
import LandingNew from "@/pages/landing-new";

type State =
  | { status: "loading" }
  | { status: "cms"; page: CmsPublicPage }
  | { status: "fallback" };

export default function LandingCmsPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchPublicCmsPage("home")
      .then((page) => {
        if (cancelled) return;
        if (page && Array.isArray(page.blocksJson) && page.blocksJson.length > 0) {
          setState({ status: "cms", page });
        } else {
          setState({ status: "fallback" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "fallback" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div
        data-testid="landing-cms-loading"
        style={{
          minHeight: "100vh",
          background: "#0B0906",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#A89A85",
          fontFamily: "'EB Garamond', serif",
          fontSize: 18,
          letterSpacing: ".1em",
        }}
      >
        Lade…
      </div>
    );
  }

  if (state.status === "cms") {
    const document: StoryDocument = {
      schemaVersion: 1,
      theme: state.page.theme,
      blocks: state.page.blocksJson,
      metadata: {
        createdAt: state.page.publishedAt,
        updatedAt: state.page.publishedAt,
        title: state.page.title,
      },
    };
    return (
      <div data-testid="landing-cms-rendered">
        <StoryRenderer document={document} mode="public" />
      </div>
    );
  }

  return <LandingNew />;
}
