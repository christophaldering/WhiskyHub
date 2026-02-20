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
  const { i18n } = useTranslation();
  const isDE = i18n.language === "de";
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
        title: isDE ? "Vielen Dank!" : "Thank you!",
        description: isDE ? "Dein Feedback wurde gesendet." : "Your feedback has been submitted.",
      });
      setMessage("");
      setCategory("feature");
      setOpen(false);
    },
    onError: () => {
      toast({
        title: isDE ? "Fehler" : "Error",
        description: isDE ? "Feedback konnte nicht gesendet werden." : "Could not submit feedback.",
        variant: "destructive",
      });
    },
  });

  const categories = [
    { value: "feature", label: isDE ? "Neue Funktion" : "New Feature" },
    { value: "improvement", label: isDE ? "Verbesserung" : "Improvement" },
    { value: "bug", label: isDE ? "Problem melden" : "Report Issue" },
    { value: "other", label: isDE ? "Sonstiges" : "Other" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-40 w-10 h-10 rounded-full bg-primary/80 hover:bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
        title={isDE ? "Feedback geben" : "Give Feedback"}
        data-testid="button-feedback-open"
      >
        <MessageSquarePlus className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5" />
              {isDE ? "Feedback & Ideen" : "Feedback & Ideas"}
            </DialogTitle>
            <DialogDescription>
              {isDE
                ? "Hilf uns, CaskSense weiterzuentwickeln! Was wünschst du dir?"
                : "Help us improve CaskSense! What would you like to see?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {currentParticipant && (
              <div className="text-xs text-muted-foreground">
                {isDE ? "Absender" : "From"}: <span className="font-medium text-foreground">{currentParticipant.name}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {isDE ? "Kategorie" : "Category"}
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
                {isDE ? "Deine Nachricht" : "Your Message"}
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isDE
                  ? "Beschreibe deine Idee, deinen Wunsch oder das Problem..."
                  : "Describe your idea, wish, or issue..."}
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
              {isDE ? "Feedback senden" : "Submit Feedback"}
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground text-center mt-1">
            {isDE
              ? "Dein Feedback hilft uns, CaskSense besser zu machen. Danke!"
              : "Your feedback helps us make CaskSense better. Thank you!"}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
