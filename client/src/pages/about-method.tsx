import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import aboutNose from "@/assets/images/about-nose.png";
import aboutTaste from "@/assets/images/about-taste.png";
import aboutReflect from "@/assets/images/about-reflect.png";
import aboutJournal from "@/assets/images/about-journal.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const sectionImages = [aboutNose, aboutTaste, aboutReflect, aboutJournal];

function Section({
  image,
  title,
  paragraphs,
  reverse,
  index,
}: {
  image: string;
  title: string;
  paragraphs: string[];
  reverse?: boolean;
  index: number;
}) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="py-16 md:py-24"
      data-testid={`section-about-${index}`}
    >
      <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} gap-8 md:gap-14 items-center`}>
        <div className="w-full md:w-1/2">
          <div className="relative rounded-lg overflow-hidden shadow-2xl">
            <img
              src={image}
              alt={title}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        </div>
        <div className="w-full md:w-1/2 space-y-5">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary tracking-tight">
            {title}
          </h2>
          <div className="space-y-4">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-muted-foreground font-serif leading-relaxed text-base md:text-lg"
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function AboutMethod() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const sectionKeys = ["section1", "section2", "section3", "section4"];

  return (
    <div className="min-h-screen bg-background" data-testid="about-method-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative py-20 md:py-32 text-center overflow-hidden"
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
            data-testid="text-about-hero-title"
          >
            {t("aboutMethod.heroTitle")}
          </motion.h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-6 h-px w-24 mx-auto bg-primary/30"
          />
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-6">
        {sectionKeys.map((key, i) => {
          const paragraphs = (t(`aboutMethod.${key}Paragraphs`, { returnObjects: true }) as string[]);
          return (
            <Section
              key={key}
              image={sectionImages[i]}
              title={t(`aboutMethod.${key}Title`)}
              paragraphs={paragraphs}
              reverse={i % 2 === 1}
              index={i + 1}
            />
          );
        })}

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="py-20 md:py-28 text-center border-t border-border/30"
        >
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-8 py-3 border border-primary/40 text-primary rounded-sm font-serif text-sm tracking-wide hover:bg-primary/5 transition-colors"
            data-testid="button-about-back"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("aboutMethod.backToApp")}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
