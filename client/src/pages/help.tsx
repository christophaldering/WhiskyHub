import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useMutation } from "@tanstack/react-query";
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Wine,
  Users,
  Eye,
  Star,
  Shield,
  BarChart3,
  Settings,
  Sparkles,
  CheckCircle2,
  Rows3,
  Minimize2,
  Gift,
  Puzzle,
  Camera,
  Download,
  Construction,
  MessageSquare,
  DatabaseZap,
  Lightbulb,
  Layers,
  BookMarked,
  Heart,
  EyeOff,
  FileSpreadsheet,
  Bot,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface FaqItem {
  questionKey: string;
  answerKey: string;
  icon: typeof HelpCircle;
  category: string;
}

function FaqAccordion({ item, isOpen, onToggle, t }: { item: FaqItem; isOpen: boolean; onToggle: () => void; t: any }) {
  const Icon = item.icon;
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden" data-testid={`faq-item-${item.questionKey}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="flex-1 text-sm font-serif font-semibold text-foreground">{t(item.questionKey)}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-[3.75rem] text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {t(item.answerKey)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ManualSection({ icon: Icon, titleKey, contentKey, t }: { icon: typeof BookOpen; titleKey: string; contentKey: string; t: any }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-primary mb-2">{t(titleKey)}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{t(contentKey)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Help() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [questionName, setQuestionName] = useState(currentParticipant?.name || "");
  const [questionEmail, setQuestionEmail] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; question: string }) => {
      const res = await fetch("/api/support-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setQuestionText("");
      toast({ title: t("help.questionSent") });
    },
  });

  const faqItems: FaqItem[] = [
    { questionKey: "help.faq.q1", answerKey: "help.faq.a1", icon: Wine, category: "basics" },
    { questionKey: "help.faq.q13", answerKey: "help.faq.a13", icon: Construction, category: "basics" },
    { questionKey: "help.faq.q2", answerKey: "help.faq.a2", icon: Users, category: "basics" },
    { questionKey: "help.faq.q3", answerKey: "help.faq.a3", icon: Shield, category: "basics" },
    { questionKey: "help.faq.q14", answerKey: "help.faq.a14", icon: MessageSquare, category: "basics" },
    { questionKey: "help.faq.q15", answerKey: "help.faq.a15", icon: DatabaseZap, category: "basics" },
    { questionKey: "help.faq.q4", answerKey: "help.faq.a4", icon: Eye, category: "tasting" },
    { questionKey: "help.faq.q5", answerKey: "help.faq.a5", icon: Rows3, category: "tasting" },
    { questionKey: "help.faq.q6", answerKey: "help.faq.a6", icon: Minimize2, category: "tasting" },
    { questionKey: "help.faq.q7", answerKey: "help.faq.a7", icon: Star, category: "tasting" },
    { questionKey: "help.faq.q8", answerKey: "help.faq.a8", icon: BarChart3, category: "features" },
    { questionKey: "help.faq.q9", answerKey: "help.faq.a9", icon: Sparkles, category: "features" },
    { questionKey: "help.faq.q10", answerKey: "help.faq.a10", icon: Camera, category: "features" },
    { questionKey: "help.faq.q11", answerKey: "help.faq.a11", icon: Gift, category: "features" },
    { questionKey: "help.faq.q12", answerKey: "help.faq.a12", icon: Download, category: "features" },
    { questionKey: "help.faq.q16", answerKey: "help.faq.a16", icon: Lightbulb, category: "features" },
  ];

  const manualSections = [
    { icon: Wine, titleKey: "help.manual.gettingStartedTitle", contentKey: "help.manual.gettingStarted" },
    { icon: Layers, titleKey: "help.manual.experienceLevelsTitle", contentKey: "help.manual.experienceLevels" },
    { icon: Users, titleKey: "help.manual.hostingTitle", contentKey: "help.manual.hosting" },
    { icon: Eye, titleKey: "help.manual.ratingModesTitle", contentKey: "help.manual.ratingModes" },
    { icon: EyeOff, titleKey: "help.manual.blindModeTitle", contentKey: "help.manual.blindMode" },
    { icon: BarChart3, titleKey: "help.manual.analyticsTitle", contentKey: "help.manual.analytics" },
    { icon: Settings, titleKey: "help.manual.profileTitle", contentKey: "help.manual.profile" },
    { icon: BookMarked, titleKey: "help.manual.journalTitle", contentKey: "help.manual.journal" },
    { icon: Heart, titleKey: "help.manual.wishlistTitle", contentKey: "help.manual.wishlist" },
    { icon: FileSpreadsheet, titleKey: "help.manual.dataTitle", contentKey: "help.manual.data" },
    { icon: Bot, titleKey: "help.manual.aiTitle", contentKey: "help.manual.ai" },
    { icon: Puzzle, titleKey: "help.manual.tipsTitle", contentKey: "help.manual.tips" },
    { icon: Handshake, titleKey: "help.manual.feedbackTitle", contentKey: "help.manual.feedback" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto min-w-0 overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words" data-testid="text-help-title">
          {t("help.title")}
        </h1>
        <p className="text-muted-foreground mt-2 font-serif">{t("help.subtitle")}</p>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="faq" className="font-serif text-xs gap-1.5" data-testid="tab-faq">
            <HelpCircle className="w-3.5 h-3.5" />
            {t("help.tabFaq")}
          </TabsTrigger>
          <TabsTrigger value="manual" className="font-serif text-xs gap-1.5" data-testid="tab-manual">
            <BookOpen className="w-3.5 h-3.5" />
            {t("help.tabManual")}
          </TabsTrigger>
          <TabsTrigger value="question" className="font-serif text-xs gap-1.5" data-testid="tab-question">
            <MessageCircle className="w-3.5 h-3.5" />
            {t("help.tabQuestion")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-4">
          <div className="space-y-2">
            {faqItems.map((item) => (
              <FaqAccordion
                key={item.questionKey}
                item={item}
                isOpen={openFaq === item.questionKey}
                onToggle={() => setOpenFaq(openFaq === item.questionKey ? null : item.questionKey)}
                t={t}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <div className="space-y-4">
            {manualSections.map((section) => (
              <ManualSection key={section.titleKey} {...section} t={t} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="question" className="mt-4">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="p-8 text-center border-green-500/30 bg-green-500/5">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-serif font-bold text-lg text-primary mb-2">{t("help.questionSentTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("help.questionSentDesc")}</p>
                <Button variant="outline" size="sm" onClick={() => setSubmitted(false)} data-testid="button-new-question">
                  {t("help.askAnother")}
                </Button>
              </Card>
            </motion.div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="text-center mb-2">
                  <MessageCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-serif">{t("help.questionIntro")}</p>
                </div>
                <Input
                  value={questionName}
                  onChange={(e) => setQuestionName(e.target.value)}
                  placeholder={t("help.namePlaceholder")}
                  data-testid="input-help-name"
                />
                <Input
                  value={questionEmail}
                  onChange={(e) => setQuestionEmail(e.target.value)}
                  placeholder={t("help.emailPlaceholder")}
                  type="email"
                  data-testid="input-help-email"
                />
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={t("help.questionPlaceholder")}
                  rows={4}
                  data-testid="input-help-question"
                />
                <Button
                  onClick={() => submitMutation.mutate({ name: questionName, email: questionEmail, question: questionText })}
                  disabled={!questionText.trim() || submitMutation.isPending}
                  className="w-full gap-2 font-serif"
                  data-testid="button-submit-question"
                >
                  <Send className="w-4 h-4" />
                  {t("help.sendQuestion")}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
