import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export function SuggestEntryDialog({ type }: { type: "distillery" | "bottler" }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", country: "", region: "", founded: "", description: "", feature: "", website: "" });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/encyclopedia-suggestions", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("encyclopedia.suggestionSubmitted"), description: t("encyclopedia.suggestionSubmittedDesc") });
      setOpen(false);
      setForm({ name: "", country: "", region: "", founded: "", description: "", feature: "", website: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      type,
      name: form.name,
      country: form.country,
      region: form.region,
      founded: form.founded ? parseInt(form.founded) : undefined,
      description: form.description || undefined,
      feature: form.feature || undefined,
      website: type === "bottler" ? form.website || undefined : undefined,
      submittedBy: currentParticipant?.id,
      submitterName: currentParticipant?.name,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid={`button-suggest-${type}`}>
          <Plus className="w-4 h-4" />
          {t("encyclopedia.suggestEntry")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(type === "distillery" ? "encyclopedia.suggestDistillery" : "encyclopedia.suggestBottler")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("encyclopedia.name")} *</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required data-testid="input-suggestion-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("encyclopedia.country")} *</Label>
              <Input value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} required data-testid="input-suggestion-country" />
            </div>
            <div className="space-y-2">
              <Label>{t("encyclopedia.region")} *</Label>
              <Input value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))} required data-testid="input-suggestion-region" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("encyclopedia.founded")}</Label>
            <Input type="number" value={form.founded} onChange={(e) => setForm(f => ({ ...f, founded: e.target.value }))} placeholder="e.g. 1824" data-testid="input-suggestion-founded" />
          </div>
          <div className="space-y-2">
            <Label>{t("encyclopedia.description")}</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} data-testid="input-suggestion-description" />
          </div>
          <div className="space-y-2">
            <Label>{type === "distillery" ? t("encyclopedia.signatureFeature") : t("encyclopedia.specialty")}</Label>
            <Textarea value={form.feature} onChange={(e) => setForm(f => ({ ...f, feature: e.target.value }))} rows={2} data-testid="input-suggestion-feature" />
          </div>
          {type === "bottler" && (
            <div className="space-y-2">
              <Label>{t("encyclopedia.website")}</Label>
              <Input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." data-testid="input-suggestion-website" />
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("encyclopedia.suggestionNote")}</p>
          <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-suggestion">
            {mutation.isPending ? t("encyclopedia.submitting") : t("encyclopedia.submitSuggestion")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
