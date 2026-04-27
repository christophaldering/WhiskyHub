import { useEffect, useState, lazy, Suspense } from "react";
import {
  fetchPublicCmsPage,
  readCachedPublicCmsPage,
  writeCachedPublicCmsPage,
  clearCachedPublicCmsPage,
  type CmsPublicPage,
} from "@/lib/cms-api";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import type { StoryDocument } from "@/storybuilder/core/types";

const LandingNew = lazy(() => import("@/pages/landing-new"));

const FALLBACK_TIMEOUT_MS = 1500;
const CMS_HOME_SLUG = "home";

type State =
  | { status: "loading" }
  | { status: "cms"; page: CmsPublicPage }
  | { status: "fallback" };

export default function LandingCmsPage() {
  const [state, setState] = useState<State>(() => {
    const cached = readCachedPublicCmsPage(CMS_HOME_SLUG);
    return cached ? { status: "cms", page: cached } : { status: "loading" };
  });

  useEffect(() => {
    let cancelled = false;
    let lockedToFallback = false;

    void import("@/pages/landing-new");

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setState((prev) => {
        if (prev.status === "loading") {
          lockedToFallback = true;
          return { status: "fallback" };
        }
        return prev;
      });
    }, FALLBACK_TIMEOUT_MS);

    fetchPublicCmsPage(CMS_HOME_SLUG)
      .then((page) => {
        if (cancelled) return;
        if (page && Array.isArray(page.blocksJson) && page.blocksJson.length > 0) {
          writeCachedPublicCmsPage(CMS_HOME_SLUG, page);
          if (lockedToFallback) return;
          setState({ status: "cms", page });
        } else {
          clearCachedPublicCmsPage(CMS_HOME_SLUG);
          if (lockedToFallback) return;
          setState((prev) => (prev.status === "cms" ? prev : { status: "fallback" }));
        }
      })
      .catch(() => {
        if (cancelled || lockedToFallback) return;
        setState((prev) => (prev.status === "cms" ? prev : { status: "fallback" }));
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
          background: "transparent",
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
      <Suspense fallback={<div data-testid="landing-cms-fallback-loading" style={{ minHeight: "100vh", background: "transparent" }} />}>
        <LandingNew />
      </Suspense>
    </div>
  );
}
