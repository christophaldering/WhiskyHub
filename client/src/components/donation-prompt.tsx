import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Heart, HandHeart } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PAYPAL_URL = "https://www.paypal.com/giving/campaigns?campaign_id=XGB4YN3CQEMFE";
const HOSPIZ_NAME = "Christina-Kleintjes-Hospiz-Stiftung";

function getDonationKey(tastingId: string) {
  return `donation_prompt_shown_${tastingId}`;
}

export function DonationPromptDialog({ tastingId, open, onClose }: { tastingId: string; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const key = getDonationKey(tastingId);
      try {
        if (localStorage.getItem(key)) {
          onClose();
          return;
        }
      } catch {}
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [open, tastingId]);

  const dismiss = () => {
    try { localStorage.setItem(getDonationKey(tastingId), "true"); } catch {}
    setVisible(false);
    onClose();
  };

  const handleDonate = () => {
    try { localStorage.setItem(getDonationKey(tastingId), "true"); } catch {}
    window.open(PAYPAL_URL, "_blank", "noopener,noreferrer");
    setVisible(false);
    onClose();
  };

  return (
    <Dialog open={visible} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden" data-testid="donation-prompt-dialog">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-4">
              <Heart className="w-8 h-8 text-primary" fill="currentColor" />
            </div>
          </motion.div>
          <h2 className="text-xl font-serif font-bold text-primary" data-testid="text-donation-title">
            {t("donationPrompt.title")}
          </h2>
        </div>

        <div className="px-6 pb-2 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            {t("donationPrompt.message")}
          </p>

          <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3 border border-border/30">
            <HandHeart className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("donationPrompt.charityInfo", { name: HOSPIZ_NAME })}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-2">
          <Button
            onClick={handleDonate}
            className="w-full gap-2 font-serif"
            data-testid="button-donate-yes"
          >
            <Heart className="w-4 h-4" />
            {t("donationPrompt.yesButton")}
          </Button>
          <Button
            variant="ghost"
            onClick={dismiss}
            className="w-full text-muted-foreground text-sm font-normal"
            data-testid="button-donate-no"
          >
            {t("donationPrompt.noButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
