import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { recapApi, tastingApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Heart, Mail, Send, Loader2, Users, CheckCircle } from "lucide-react";

interface ThankYouDialogProps {
  tastingId: string;
  tastingTitle: string;
  trigger?: React.ReactNode;
}

export function ThankYouDialog({ tastingId, tastingTitle, trigger }: ThankYouDialogProps) {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const { data: participants = [] } = useQuery<any[]>({
    queryKey: ["tasting-participants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: open,
  });

  const recipientsWithEmail = participants.filter(
    (p: any) => p.email && p.id !== currentParticipant?.id
  );

  const sendMutation = useMutation({
    mutationFn: () =>
      recapApi.sendThankYou(
        tastingId,
        currentParticipant!.id,
        message,
        i18n.language
      ),
    onSuccess: (data: any) => {
      setSent(true);
      toast({
        title: t("thankYou.sent"),
        description: t("thankYou.sentDescription", { count: data.sent }),
      });
    },
    onError: () => {
      toast({
        title: t("thankYou.error"),
        variant: "destructive",
      });
    },
  });

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setTimeout(() => {
        setSent(false);
        setMessage("");
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="font-serif text-xs border-primary/30 text-primary"
            data-testid="button-thank-you"
          >
            <Heart className="w-3.5 h-3.5 mr-1" />
            {t("thankYou.button")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
            <Heart className="w-5 h-5" />
            {t("thankYou.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("thankYou.description", { title: tastingTitle })}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="font-serif text-lg text-primary">{t("thankYou.sentTitle")}</p>
            <p className="text-sm text-muted-foreground text-center">
              {t("thankYou.sentMessage")}
            </p>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="mt-2"
              data-testid="button-thank-you-close"
            >
              {t("thankYou.close")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="text-sm">
                <span className="text-muted-foreground">{t("thankYou.recipients")}: </span>
                <span className="font-semibold text-foreground" data-testid="text-recipient-count">
                  {recipientsWithEmail.length} {t("thankYou.participantsWithEmail")}
                </span>
              </div>
            </div>

            {recipientsWithEmail.length === 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
                {t("thankYou.noRecipients")}
              </div>
            )}

            <div className="space-y-2">
              <label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">
                {t("thankYou.personalMessage")}
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("thankYou.messagePlaceholder")}
                rows={3}
                className="bg-secondary/20 resize-none"
                data-testid="textarea-thank-you-message"
              />
              <p className="text-xs text-muted-foreground">{t("thankYou.messageHint")}</p>
            </div>

            <div className="p-3 rounded-lg bg-secondary/20 border border-border/20">
              <p className="text-xs text-muted-foreground mb-1">{t("thankYou.emailPreview")}</p>
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  <span className="font-serif font-semibold text-primary">🏆 Top 3</span>
                  <span className="text-muted-foreground"> + </span>
                  <span className="text-sm text-muted-foreground">{t("thankYou.recapLink")}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || recipientsWithEmail.length === 0}
              className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
              data-testid="button-send-thank-you"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("thankYou.sending")}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t("thankYou.send")}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
