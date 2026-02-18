import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Heart, ExternalLink, HandHeart, Eye } from "lucide-react";

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
        data-testid="donate-paypal-iframe"
      >
        <iframe
          src="https://www.paypal.com/giving/campaigns?campaign_id=XGB4YN3CQEMFE"
          title="PayPal donate campaign card"
          frameBorder="0"
          width={382}
          height={550}
          scrolling="no"
          className="rounded-xl border-0 max-w-full"
        />
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
