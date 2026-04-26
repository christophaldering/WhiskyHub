import { useEffect, useState } from "react";
import { fetchPublicCmsPage, type CmsPublicPage } from "@/lib/cms-api";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import type { StoryDocument } from "@/storybuilder/core/types";

type State =
  | { status: "loading" }
  | { status: "cms"; page: CmsPublicPage }
  | { status: "missing" };

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
          setState({ status: "missing" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "missing" });
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

  return (
    <div
      data-testid="landing-cms-missing"
      style={{
        minHeight: "100vh",
        background: "#0B0906",
        color: "#F5EDE0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "'EB Garamond', serif",
      }}
    >
      <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", margin: 0, color: "#C9A961" }}>CaskSense Labs</h1>
      <p style={{ marginTop: "1.5rem", color: "#A89A85", maxWidth: 520, lineHeight: 1.6 }}>
        Die Startseite ist noch nicht eingerichtet. Bitte im Admin-Bereich unter <code style={{ color: "#C9A961" }}>/admin/cms</code>{" "}
        die Seite mit Slug "home" erstellen und veröffentlichen.
      </p>
      <a
        href="/admin/cms"
        data-testid="link-admin-cms"
        style={{
          marginTop: "2rem",
          display: "inline-block",
          background: "#C9A961",
          color: "#0B0906",
          padding: "12px 28px",
          textDecoration: "none",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: ".75rem",
          fontWeight: 600,
          letterSpacing: ".25em",
          textTransform: "uppercase",
          borderRadius: 3,
        }}
      >
        Zum Admin
      </a>
    </div>
  );
}
