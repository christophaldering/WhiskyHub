import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { inviteApi, friendsApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Copy, Check, AlertCircle, Users, QrCode, Download } from "lucide-react";
import QRCode from "qrcode";

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

interface WhiskyFriend {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function InvitePanel({ tastingId }: InvitePanelProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const { data: smtpStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["smtpStatus"],
    queryFn: () => inviteApi.smtpStatus(),
  });

  const { data: existingInvites = [] } = useQuery<ExistingInvite[]>({
    queryKey: ["invites", tastingId],
    queryFn: () => inviteApi.getForTasting(tastingId),
    enabled: !!tastingId && open,
  });

  const { data: friends = [] } = useQuery<WhiskyFriend[]>({
    queryKey: ["friends", currentParticipant?.id],
    queryFn: () => friendsApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant?.id && open,
  });

  const sendMutation = useMutation({
    mutationFn: ({ emailList, note }: { emailList: string[]; note?: string }) =>
      inviteApi.sendInvites(tastingId, emailList, note),
    onSuccess: (data: { invites: any[]; smtpConfigured: boolean }) => {
      const mapped: InviteResult[] = (data.invites || []).map((inv: any) => ({
        email: inv.email,
        status: inv.emailSent ? "sent" : "link-only",
        link: inv.link,
      }));
      setResults(mapped);
      setEmails("");
      setPersonalNote("");
      setSelectedFriends(new Set());
      queryClient.invalidateQueries({ queryKey: ["invites", tastingId] });
    },
  });

  const alreadyInvitedEmails = new Set(existingInvites.map((inv) => inv.email.toLowerCase()));

  const toggleFriend = (friend: WhiskyFriend) => {
    if (!friend.email) return;
    const next = new Set(selectedFriends);
    const currentEmails = emails
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (next.has(friend.id)) {
      next.delete(friend.id);
      const filtered = currentEmails.filter(
        (e) => e.toLowerCase() !== friend.email.toLowerCase()
      );
      setEmails(filtered.join("\n"));
    } else {
      next.add(friend.id);
      if (!currentEmails.some((e) => e.toLowerCase() === friend.email.toLowerCase())) {
        setEmails([...currentEmails, friend.email].join("\n"));
      }
    }
    setSelectedFriends(next);
  };

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
      setSelectedFriends(new Set());
      setShowQr(false);
    }
  };

  const tastingJoinUrl = `${window.location.origin}/tasting/${tastingId}`;

  useEffect(() => {
    if (open && tastingId) {
      QRCode.toDataURL(tastingJoinUrl, {
        width: 256,
        margin: 2,
        color: { dark: "#1a1a2e", light: "#ffffff" },
        errorCorrectionLevel: "M",
      }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }
  }, [open, tastingId, tastingJoinUrl]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `casksense-tasting-${tastingId}-qr.png`;
    a.click();
  };

  const copyQrLink = async () => {
    await navigator.clipboard.writeText(tastingJoinUrl);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  const availableFriends = friends.filter(
    (f) => f.email && !alreadyInvitedEmails.has(f.email.toLowerCase())
  );

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
            <p className="text-xs text-amber-400">{t("invite.smtpNotConfigured")}</p>
          </div>
        )}

        <div className="border border-border/40 rounded-lg p-4 space-y-3" data-testid="qr-code-section">
          <button
            className="w-full flex items-center justify-between text-left"
            onClick={() => setShowQr(!showQr)}
            data-testid="button-toggle-qr"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              <span className="text-sm font-serif font-semibold text-foreground">{t("invite.qrTitle")}</span>
            </div>
            <span className="text-xs text-muted-foreground">{showQr ? "▲" : "▼"}</span>
          </button>
          {showQr && qrDataUrl && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="text-xs text-muted-foreground text-center">{t("invite.qrDescription")}</p>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" data-testid="img-qr-code" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="font-serif text-xs" onClick={downloadQr} data-testid="button-download-qr">
                  <Download className="w-3.5 h-3.5 mr-1" /> {t("invite.qrDownload")}
                </Button>
                <Button variant="outline" size="sm" className="font-serif text-xs" onClick={copyQrLink} data-testid="button-copy-qr-link">
                  {qrCopied ? <Check className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {qrCopied ? t("invite.qrCopied") : t("invite.qrCopyLink")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {!results ? (
          <div className="space-y-4 mt-2">
            {availableFriends.length > 0 && (
              <div className="space-y-2" data-testid="friends-quick-add">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {t("invite.friendsList")}
                  </Label>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/20">
                  {availableFriends.map((friend) => {
                    const emailsLower = emails.split("\n").map((e) => e.trim().toLowerCase());
                    const isSelected = selectedFriends.has(friend.id) || emailsLower.includes(friend.email.toLowerCase());
                    return (
                      <label
                        key={friend.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        data-testid={`friend-row-${friend.id}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFriend(friend)}
                          data-testid={`checkbox-friend-${friend.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {friend.firstName} {friend.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {friends.length > availableFriends.length && (
                  <p className="text-[10px] text-muted-foreground italic">
                    {t("invite.friendsAlreadyInvited", { count: friends.length - availableFriends.length })}
                  </p>
                )}
              </div>
            )}

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

        {existingInvites.length === 0 && !results && availableFriends.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center pt-2" data-testid="text-no-invites">
            {t("invite.noInvites")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
