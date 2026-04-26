import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { StoryEditor } from "@/storybuilder/editor/StoryEditor";
import { createBlock } from "@/storybuilder/blocks";
import { createEmptyDocument, type StoryBlock, type StoryDocument } from "@/storybuilder/core/types";
import { pidHeaders } from "@/lib/api";

const STORY_SOURCE_TYPE = "demo";
const STORY_SOURCE_ID = "default";

function buildSeedDocument(): StoryDocument {
  const doc = createEmptyDocument("casksense-editorial");
  const blocks: StoryBlock[] = [];

  const hero = createBlock("hero-cover");
  if (hero) {
    hero.payload = {
      eyebrow: "CaskSense Labs · Demo",
      title: "Eine Reise in Bernstein",
      subtitle: "Sechs Drams. Vier Verkoster. Ein Abend, der bleibt.",
      meta: "Berlin · 25. April 2026",
      imageUrl: "",
      alignment: "center",
    };
    blocks.push(hero);
  }

  const intro = createBlock("text-section");
  if (intro) {
    intro.payload = {
      eyebrow: "Akt I",
      heading: "Die Erwartung",
      body: "<p>Bevor das erste Glas die Lippen berührt, beginnt die Geschichte bereits im Kopf. Was erwarten wir? Welche Erinnerungen wecken die Etiketten, die Farben, die Namen? Heute Abend lassen wir uns überraschen.</p>",
      alignment: "left",
      variant: "act-intro",
    };
    blocks.push(intro);
  }

  const div1 = createBlock("divider");
  if (div1) {
    div1.payload = { variant: "line" };
    blocks.push(div1);
  }

  const quote = createBlock("quote");
  if (quote) {
    quote.payload = {
      text: "<p>Whisky ist Sonnenlicht, gefangen mit Wasser.</p>",
      attribution: "Schottisches Sprichwort",
      role: "",
      variant: "block",
    };
    blocks.push(quote);
  }

  const text2 = createBlock("text-section");
  if (text2) {
    text2.payload = {
      eyebrow: "",
      heading: "",
      body: "<p>Ein Storybuilder-Demo zeigt, wie verschiedene Block-Typen zu einem stimmigen Ganzen werden. Füge links neue Blöcke hinzu, sortiere sie per Drag-and-Drop, bearbeite ihre Eigenschaften rechts und sieh die Vorschau in Echtzeit in der Mitte.</p>",
      alignment: "left",
      variant: "default",
    };
    blocks.push(text2);
  }

  return { ...doc, blocks };
}

type AdminProbe = { status: "loading" | "ok" | "denied" | "error" };

function useAdminProbe(): AdminProbe {
  const { isLoading, isError, error } = useQuery({
    queryKey: ["/api/admin/overview", "storybuilder-demo-probe"],
    queryFn: async () => {
      const res = await fetch("/api/admin/overview", { credentials: "include", headers: pidHeaders() });
      if (!res.ok) {
        const code = res.status === 500 ? "error" : "denied";
        const err = new Error(code);
        (err as Error & { code?: string }).code = code;
        throw err;
      }
      return true;
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  if (isLoading) return { status: "loading" };
  if (isError) {
    const code = (error as (Error & { code?: string }) | undefined)?.code;
    return { status: code === "error" ? "error" : "denied" };
  }
  return { status: "ok" };
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; doc: StoryDocument; loadedFromBackend: boolean };

function useStoredDocument(seed: StoryDocument): LoadState {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/storybuilder", STORY_SOURCE_TYPE, STORY_SOURCE_ID],
    queryFn: async () => {
      const res = await fetch(`/api/admin/storybuilder/${STORY_SOURCE_TYPE}/${STORY_SOURCE_ID}`, {
        credentials: "include",
        headers: pidHeaders(),
      });
      if (!res.ok) throw new Error("load-failed");
      return (await res.json()) as { exists: boolean; blocksJson?: unknown };
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  if (isLoading) return { status: "loading" };

  if (data && data.exists && Array.isArray(data.blocksJson)) {
    const restoredBlocks = data.blocksJson as StoryBlock[];
    const restored: StoryDocument = { ...seed, blocks: restoredBlocks };
    return { status: "ready", doc: restored, loadedFromBackend: true };
  }
  return { status: "ready", doc: seed, loadedFromBackend: false };
}

export default function StorybuilderDemoPage() {
  const probe = useAdminProbe();
  const seed = useMemo(() => buildSeedDocument(), []);
  const stored = useStoredDocument(seed);
  const [latest, setLatest] = useState<StoryDocument>(seed);

  const handleSave = async (doc: StoryDocument) => {
    const res = await fetch(`/api/admin/storybuilder/${STORY_SOURCE_TYPE}/${STORY_SOURCE_ID}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...pidHeaders() },
      body: JSON.stringify({ blocksJson: doc.blocks, isAuto: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Speichern fehlgeschlagen" }));
      throw new Error(err.message || "Speichern fehlgeschlagen");
    }
  };

  if (probe.status === "loading") {
    return (
      <div
        data-testid="storybuilder-demo-loading"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0906",
          color: "#A89A85",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13,
          letterSpacing: ".15em",
          textTransform: "uppercase",
        }}
      >
        Prüfe Berechtigung…
      </div>
    );
  }

  if (probe.status !== "ok") {
    return (
      <div
        data-testid="storybuilder-demo-denied"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#0B0906",
          color: "#F5EDE0",
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", color: "#C9A961" }}>
          Storybuilder · Vorschau
        </div>
        <h1
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            fontWeight: 500,
            margin: 0,
            color: "#F5EDE0",
          }}
        >
          Diese Seite ist nur für Administratoren
        </h1>
        <p style={{ color: "#A89A85", maxWidth: 480, margin: 0, lineHeight: 1.6 }}>
          {probe.status === "denied"
            ? "Bitte melde dich mit einem Admin-Konto an, um die Storybuilder-Vorschau zu öffnen."
            : "Die Berechtigung konnte nicht geprüft werden. Versuche es später erneut."}
        </p>
        <Link
          href="/login"
          data-testid="link-storybuilder-demo-login"
          style={{
            marginTop: 8,
            color: "#0B0906",
            background: "#C9A961",
            padding: "10px 22px",
            fontSize: 11,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            fontWeight: 600,
            textDecoration: "none",
            borderRadius: 3,
          }}
        >
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  if (stored.status === "loading") {
    return (
      <div
        data-testid="storybuilder-demo-doc-loading"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0906",
          color: "#A89A85",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13,
          letterSpacing: ".15em",
          textTransform: "uppercase",
        }}
      >
        Lade Story…
      </div>
    );
  }

  return (
    <div data-testid="page-storybuilder-demo">
      <StoryEditor initialDocument={stored.doc} onChange={setLatest} onSave={handleSave} />
      <div style={{ display: "none" }} data-testid="debug-block-count">
        {latest.blocks.length}
      </div>
      <div style={{ display: "none" }} data-testid="debug-loaded-from-backend">
        {stored.loadedFromBackend ? "yes" : "no"}
      </div>
    </div>
  );
}
