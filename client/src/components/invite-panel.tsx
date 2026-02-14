import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { inviteApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Copy, Check, AlertCircle } from "lucide-react";

interface InvitePanelProps {
  tastingId: string;
}

interface InviteResult {
  email: string;
  status: string;
  link?: string;
}

interface ExistingInvite {
  id: string;
  email: string;
  status: string;
  token: string;
}

export function InvitePanel({ tastingId }: InvitePanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: smtpStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["smtpStatus"],
    queryFn: () => inviteApi.smtpStatus(),
  });

  const { data: existingInvites = [] } = useQuery<ExistingInvite[]>({
    queryKey: ["invites", tastingId],
    queryFn: () => inviteApi.getForTasting(tastingId),
    enabled: !!tastingId && open,
  });

  const sendMutation = useMutation({
    mutationFn: ({ emailList, note }: { emailList: string[]; note?: string }) =>
      inviteApi.sendInvites(tastingId, emailList, note),
    onSuccess: (data: { results: InviteResult[] }) => {
      setResults(data.results);
      setEmails("");
      setPersonalNote("");
      queryClient.invalidateQueries({ queryKey: ["invites", tastingId] });
    },
  });

  const handleSend = () => {
    const emailList = emails
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (emailList.length === 0) return;
    sendMutation.mutate({ emailList, note: personalNote.trim() || undefined });
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setResults(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-open-invite-panel">
          <Mail className="w-4 h-4 mr-1" /> {t("invite.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-invite-panel">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{t("invite.title")}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t("invite.subtitle")}</p>
        </DialogHeader>

        {smtpStatus && !smtpStatus.configured && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" data-testid="text-smtp-warning">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">{t("invite.smtpNotConfigured")}</p>
          </div>
        )}

        {!results ? (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("invite.emailsLabel")}</Label>
              <Textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder={t("invite.emailsPlaceholder")}
                rows={4}
                data-testid="textarea-invite-emails"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("invite.personalNote")}</Label>
              <Textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder={t("invite.notePlaceholder")}
                rows={2}
                data-testid="textarea-invite-note"
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || emails.trim().length === 0}
              className="w-full font-serif"
              data-testid="button-send-invites"
            >
              <Mail className="w-4 h-4 mr-1" />
              {sendMutation.isPending ? t("invite.sending") : t("invite.send")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 mt-2" data-testid="invite-results">
            <p className="text-sm font-serif font-bold text-primary">{t("invite.sent")}</p>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm border-b border-border/20 pb-2 last:border-b-0">
                  <span className="truncate text-muted-foreground">{r.email}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant={r.status === "sent" ? "default" : "secondary"} className="text-[10px]">
                      {r.status}
                    </Badge>
                    {r.link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(r.link!);
                          setCopiedToken(r.email);
                          setTimeout(() => setCopiedToken(null), 2000);
                        }}
                        data-testid={`button-copy-result-link-${i}`}
                      >
                        {copiedToken === r.email ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full font-serif"
              onClick={() => setResults(null)}
              data-testid="button-invite-new"
            >
              {t("invite.title")}
            </Button>
          </div>
        )}

        {existingInvites.length > 0 && (
          <div className="border-t border-border/30 pt-4 mt-2 space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("invite.status")}</p>
            <div className="space-y-1.5">
              {existingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 text-sm" data-testid={`invite-row-${inv.id}`}>
                  <span className="truncate text-muted-foreground">{inv.email}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge
                      variant={inv.status === "joined" ? "default" : "outline"}
                      className="text-[10px]"
                      data-testid={`badge-invite-status-${inv.id}`}
                    >
                      {inv.status === "joined" ? t("invite.statusJoined") : t("invite.statusInvited")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyLink(inv.token)}
                      data-testid={`button-copy-invite-link-${inv.id}`}
                    >
                      {copiedToken === inv.token ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {existingInvites.length === 0 && !results && (
          <p className="text-xs text-muted-foreground italic text-center pt-2" data-testid="text-no-invites">
            {t("invite.noInvites")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
