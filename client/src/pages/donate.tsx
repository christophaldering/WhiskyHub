import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Heart, ExternalLink, HandHeart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAYPAL_DONATE_URL = "https://www.paypal.com/donate/?hosted_button_id=PLACEHOLDER";

const HOSPIZ_NAME = "Christina-Kleintjes-Hospiz-Stiftung";
const HOSPIZ_URL = "https://c-kleintjes-hospiz-stiftung.de";

export default function Donate() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto space-y-10 min-w-0 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight" data-testid="text-donate-title">
          {t("donate.title")}
        </h1>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="bg-card border border-border/50 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-full shrink-0">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold text-primary">{t("donate.whyTitle")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("donate.whyText")}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="bg-card border border-border/50 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-500/10 rounded-full shrink-0">
            <HandHeart className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-primary">{t("donate.charityTitle")}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("donate.charityText", { name: HOSPIZ_NAME })}
            </p>
            <a
              href={HOSPIZ_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              data-testid="link-hospiz"
            >
              {HOSPIZ_NAME} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="bg-card border border-border/50 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 rounded-full shrink-0">
            <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold text-primary">{t("donate.transparencyTitle")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("donate.transparencyText")}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="flex justify-center"
      >
        <a
          href={PAYPAL_DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-donate-paypal"
        >
          <Button
            size="lg"
            className="bg-[#0070ba] hover:bg-[#005ea6] text-white font-serif text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.65h6.23c2.094 0 3.612.56 4.514 1.664.396.484.655 1.015.776 1.578.127.59.128 1.3.003 2.107l-.009.054v.464l.362.205c.305.168.548.365.736.594.318.388.524.87.613 1.435.09.582.06 1.262-.09 2.019-.174.882-.456 1.65-.839 2.282a4.86 4.86 0 0 1-1.337 1.49 5.124 5.124 0 0 1-1.806.876c-.67.19-1.43.286-2.262.286H11.94a.94.94 0 0 0-.93.794l-.038.2-.629 3.99-.03.145a.94.94 0 0 1-.928.794H7.076z" />
              <path d="M18.282 7.977l-.012.074c-.87 4.465-3.845 6.007-7.647 6.007H8.703a.94.94 0 0 0-.929.794l-.99 6.278a.493.493 0 0 0 .486.57h3.42a.821.821 0 0 0 .81-.691l.034-.174.642-4.073.041-.225a.82.82 0 0 1 .81-.692h.51c3.302 0 5.886-1.34 6.642-5.217.316-1.62.152-2.972-.683-3.922a3.258 3.258 0 0 0-.935-.73z" opacity=".7" />
            </svg>
            {t("donate.donateButton")}
          </Button>
        </a>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-center text-xs text-muted-foreground/60 italic"
        data-testid="text-donate-disclaimer"
      >
        {t("donate.disclaimer")}
      </motion.p>
    </div>
  );
}
