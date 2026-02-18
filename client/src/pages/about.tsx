import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import authorPhoto from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771448218726.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function About() {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";

  const blocks = isDE ? blocksDE : blocksEN;

  return (
    <div className="min-h-screen bg-background min-w-0 overflow-x-hidden" data-testid="about-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative py-20 md:py-28 text-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
          >
            CaskSense
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="text-3xl md:text-5xl font-serif font-bold text-primary tracking-tight mb-4"
            data-testid="text-about-title"
          >
            {isDE ? "Über mich" : "About Me"}
          </motion.h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-6 h-px w-24 mx-auto bg-primary/30"
          />
        </div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 flex justify-center"
        >
          <div className="relative rounded-lg overflow-hidden shadow-2xl max-w-sm w-full">
            <img
              src={authorPhoto}
              alt="Christoph Aldering & Sammy"
              className="w-full h-auto object-cover"
              data-testid="img-about-author"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </motion.div>

        <div className="space-y-8 pb-12">
          {blocks.map((block, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.6, delay: 0.05 * i }}
              data-testid={`about-block-${i}`}
            >
              {block.heading ? (
                <h2 className="text-xl md:text-2xl font-serif font-bold text-primary tracking-tight mb-3">
                  {block.heading}
                </h2>
              ) : null}
              {block.lines.map((line, j) => (
                <p
                  key={j}
                  className={`font-serif leading-relaxed text-base md:text-lg ${
                    block.italic ? "italic text-muted-foreground/80" : "text-muted-foreground"
                  } ${block.accent ? "text-primary font-semibold text-lg md:text-xl" : ""} ${j > 0 ? "mt-3" : ""}`}
                >
                  {line}
                </p>
              ))}
            </motion.div>
          ))}

          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-right font-serif text-primary font-semibold text-lg pt-4"
            data-testid="text-about-signature"
          >
            — Christoph Aldering
          </motion.p>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="py-16 text-center border-t border-border/30"
        >
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-8 py-3 border border-primary/40 text-primary rounded-sm font-serif text-sm tracking-wide hover:bg-primary/5 transition-colors"
            data-testid="button-about-back"
          >
            <ArrowLeft className="w-4 h-4" />
            {isDE ? "Zurück zur App" : "Back to App"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

type Block = {
  heading?: string;
  lines: string[];
  italic?: boolean;
  accent?: boolean;
};

const blocksDE: Block[] = [
  {
    lines: [
      "Ich bin Psychologe, Diagnostiker, Unternehmer.",
      "Aber was mich zuletzt wirklich \u201Evon den Socken gehauen\u201C hat, war etwas ganz anderes.",
    ],
  },
  {
    heading: "Something big is happening.",
    accent: true,
    lines: [],
  },
  {
    lines: [
      "Was ich in den letzten Monaten im Bereich KI-gestützter Entwicklung erlebt habe, fühlt sich nicht wie ein Trend an – sondern wie eine stille, aber fundamentale Revolution. Tools wie OpenClaw zeigen, wie radikal sich Programmierung gerade verändert. Und ehrlicherweise: Ich habe noch keine klare Vorstellung davon, welche massiven Veränderungen das in den kommenden Wochen und Monaten mit sich bringen wird.",
      "Dass sie massiv sein werden, daran habe ich wenig Zweifel.",
    ],
  },
  {
    lines: [
      "Meine persönliche Erkenntnis war überraschend simpel – und gleichzeitig elektrisierend:",
      "KI-gestützte Programmierung ist nicht nur für Entwickler zugänglich. Sie ist denkbar einfach geworden. Ideen lassen sich in kürzester Zeit in funktionierende Strukturen übersetzen. Konzepte werden zu Prototypen, Prototypen zu Produkten.",
    ],
  },
  {
    italic: true,
    lines: ["Aus dieser Faszination heraus entstand CaskSense."],
  },
  {
    lines: [
      "Nicht als strategisches Projekt.",
      "Nicht als Geschäftsmodell.",
      "Sondern als Experiment.",
    ],
  },
  {
    lines: [
      "Ich habe mich gefragt: Was könnte man einfach mal ausprobieren?",
      "Was würde entstehen, wenn man Neugier, Struktur und KI zusammenbringt?",
    ],
  },
  {
    lines: [
      "Das Grobgerüst der Seite war überraschend schnell gebaut.",
      "Und dann passierte etwas, das ich aus anderen Kontexten gut kenne: Mit jeder weiteren Beschäftigung kam ein Feature nach dem anderen hinzu. Aus dem Spiel wurde Ernsthaftigkeit. Aus der Idee wurde ein System.",
    ],
  },
  {
    lines: [
      "Dass ausgerechnet eine Plattform zur bewussten Wahrnehmung von Whisky daraus entstand, passt vielleicht besser zu mir, als es zunächst scheint. Ich trinke gerne Whisky – aber vor allem genieße ich den Austausch darüber. Die Struktur. Die Reflexion. Den Dialog.",
    ],
  },
  {
    lines: [
      "CaskSense ist für mich deshalb mehr als ein Tasting-Tool.",
      "Es ist ein kleines Labor für etwas Größeres:",
      "für die Frage, wie KI Denken nicht ersetzt, sondern erweitert.",
      "Wie sie Gestaltung beschleunigt.",
      "Und wie sie Menschen befähigt, Dinge zu bauen, die sie vor kurzem noch für außerhalb ihrer Reichweite hielten.",
    ],
  },
  {
    lines: [
      "Ich habe keine Ahnung, wohin das alles führt.",
      "Aber ich spüre, dass wir gerade am Anfang von etwas stehen.",
    ],
  },
  {
    italic: true,
    lines: [
      "Und während ich das herausfinde, sitze ich abends mit einem Dram in der Hand – und meinem Golden Retriever Sammy neben mir.",
      "Er bleibt übrigens gelassen.",
      "Er bewertet nicht. Er beobachtet nur.",
    ],
  },
];

const blocksEN: Block[] = [
  {
    lines: [
      "I'm a psychologist, diagnostician, entrepreneur.",
      "But what truly blew me away recently was something entirely different.",
    ],
  },
  {
    heading: "Something big is happening.",
    accent: true,
    lines: [],
  },
  {
    lines: [
      "What I've experienced in the field of AI-assisted development over the past months doesn't feel like a trend – it feels like a quiet but fundamental revolution. Tools like OpenClaw show how radically programming is changing right now. And honestly: I don't yet have a clear picture of what massive changes the coming weeks and months will bring.",
      "That they will be massive – I have little doubt about that.",
    ],
  },
  {
    lines: [
      "My personal realization was surprisingly simple – and electrifying at the same time:",
      "AI-assisted programming isn't just accessible to developers. It has become remarkably easy. Ideas can be translated into working structures in no time. Concepts become prototypes, prototypes become products.",
    ],
  },
  {
    italic: true,
    lines: ["CaskSense was born out of this fascination."],
  },
  {
    lines: [
      "Not as a strategic project.",
      "Not as a business model.",
      "But as an experiment.",
    ],
  },
  {
    lines: [
      "I asked myself: What could I just try out?",
      "What would emerge if you combined curiosity, structure, and AI?",
    ],
  },
  {
    lines: [
      "The basic framework of the site was built surprisingly fast.",
      "And then something happened that I know well from other contexts: with every further engagement, one feature after another was added. Play turned into seriousness. The idea became a system.",
    ],
  },
  {
    lines: [
      "That a platform for the conscious perception of whisky emerged from all this may actually fit me better than it seems at first. I enjoy drinking whisky – but above all, I enjoy the exchange about it. The structure. The reflection. The dialogue.",
    ],
  },
  {
    lines: [
      "CaskSense is therefore more than a tasting tool for me.",
      "It's a small laboratory for something bigger:",
      "for the question of how AI doesn't replace thinking, but extends it.",
      "How it accelerates creation.",
      "And how it empowers people to build things they recently thought were beyond their reach.",
    ],
  },
  {
    lines: [
      "I have no idea where all this is heading.",
      "But I can feel that we're standing at the beginning of something.",
    ],
  },
  {
    italic: true,
    lines: [
      "And while I figure that out, I sit in the evenings with a dram in hand – and my Golden Retriever Sammy beside me.",
      "He stays calm, by the way.",
      "He doesn't judge. He just observes.",
    ],
  },
];
