import { useState } from "react";
import { StoryEditor } from "@/storybuilder/editor/StoryEditor";
import { createBlock } from "@/storybuilder/blocks";
import { createEmptyDocument, type StoryBlock, type StoryDocument } from "@/storybuilder/core/types";

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
      body: "Bevor das erste Glas die Lippen berührt, beginnt die Geschichte bereits im Kopf. Was erwarten wir? Welche Erinnerungen wecken die Etiketten, die Farben, die Namen? Heute Abend lassen wir uns überraschen.",
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
      text: "Whisky ist Sonnenlicht, gefangen mit Wasser.",
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
      body: "Ein Storybuilder-Demo zeigt, wie verschiedene Block-Typen zu einem stimmigen Ganzen werden. Füge links neue Blöcke hinzu, bearbeite ihre Eigenschaften rechts und sieh die Vorschau in Echtzeit in der Mitte.",
      alignment: "left",
      variant: "default",
    };
    blocks.push(text2);
  }

  return { ...doc, blocks };
}

export default function StorybuilderDemoPage() {
  const [doc] = useState<StoryDocument>(() => buildSeedDocument());
  const [latest, setLatest] = useState<StoryDocument>(doc);

  return (
    <div data-testid="page-storybuilder-demo">
      <StoryEditor initialDocument={doc} onChange={setLatest} />
      <div style={{ display: "none" }} data-testid="debug-block-count">
        {latest.blocks.length}
      </div>
    </div>
  );
}
