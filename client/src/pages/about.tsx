import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import authorPhoto from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771448218726.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

type Block = {
  heading?: string;
  lines: string[];
  italic?: boolean;
  accent?: boolean;
};

export default function About() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const blocks = t("about.blocks", { returnObjects: true }) as Block[];

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
            {t("about.title")}
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
            {t("about.backToApp")}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
