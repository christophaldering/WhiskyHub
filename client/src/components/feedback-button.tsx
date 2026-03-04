import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { feedbackApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquarePlus, Send, Loader2 } from "lucide-react";

export function FeedbackButton() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("feature");

  const submitMutation = useMutation({
    mutationFn: () => feedbackApi.submit({
      participantId: currentParticipant?.id,
      participantName: currentParticipant?.name,
      category,
      message,
    }),
    onSuccess: () => {
      toast({
        title: t("feedbackButton.thankYou"),
        description: t("feedbackButton.feedbackSubmitted"),
      });
      setMessage("");
      setCategory("feature");
      setOpen(false);
    },
    onError: () => {
      toast({
        title: t("feedbackButton.error"),
        description: t("feedbackButton.couldNotSubmit"),
        variant: "destructive",
      });
    },
  });

  const categories = [
    { value: "feature", label: t("feedbackButton.feature") },
    { value: "improvement", label: t("feedbackButton.improvement") },
    { value: "bug", label: t("feedbackButton.bug") },
    { value: "other", label: t("feedbackButton.other") },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-40 w-10 h-10 rounded-full bg-primary/80 hover:bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
        title={t("feedbackButton.giveFeedback")}
        data-testid="button-feedback-open"
      >
        <MessageSquarePlus className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5" />
              {t("feedbackButton.feedbackAndIdeas")}
            </DialogTitle>
            <DialogDescription>
              {t("feedbackButton.helpImprove")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {currentParticipant && (
              <div className="text-xs text-muted-foreground">
                {t("feedbackButton.from")}: <span className="font-medium text-foreground">{currentParticipant.name}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("feedbackButton.category")}
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-feedback-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("feedbackButton.yourMessage")}
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("feedbackButton.placeholder")}
                rows={4}
                className="resize-none"
                data-testid="textarea-feedback-message"
              />
            </div>

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!message.trim() || submitMutation.isPending}
              className="w-full"
              data-testid="button-feedback-submit"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {t("feedbackButton.submitFeedback")}
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground text-center mt-1">
            {t("feedbackButton.helpNote")}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
