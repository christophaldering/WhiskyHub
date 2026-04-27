import { useEffect, useState, lazy, Suspense } from "react";
import { fetchPublicCmsPage, type CmsPublicPage } from "@/lib/cms-api";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import type { StoryDocument } from "@/storybuilder/core/types";

const LandingNew = lazy(() => import("@/pages/landing-new"));

const FALLBACK_TIMEOUT_MS = 1500;

type State =
  | { status: "loading" }
  | { status: "cms"; page: CmsPublicPage }
  | { status: "fallback" };

export default function LandingCmsPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let lockedToFallback = false;

    void import("@/pages/landing-new");

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      lockedToFallback = true;
      setState((prev) => (prev.status === "loading" ? { status: "fallback" } : prev));
    }, FALLBACK_TIMEOUT_MS);

    fetchPublicCmsPage("home")
      .then((page) => {
        if (cancelled || lockedToFallback) return;
        if (page && Array.isArray(page.blocksJson) && page.blocksJson.length > 0) {
          setState({ status: "cms", page });
        } else {
          setState({ status: "fallback" });
        }
      })
      .catch(() => {
        if (cancelled || lockedToFallback) return;
        setState({ status: "fallback" });
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div
        data-testid="landing-cms-loading"
        style={{
          minHeight: "100vh",
          background: "#0B0906",
        }}
      />
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

  return (
    <div data-testid="landing-cms-fallback">
      <Suspense fallback={<div data-testid="landing-cms-fallback-loading" style={{ minHeight: "100vh", background: "#0B0906" }} />}>
        <LandingNew />
      </Suspense>
    </div>
  );
}
