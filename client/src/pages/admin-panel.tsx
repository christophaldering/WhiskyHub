import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { adminApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { ShieldAlert, Users, Wine, Crown, Trash2, Search, UserCog, Shield, User, Calendar, MapPin, Eye, Hash, BarChart3, BookOpen, TrendingUp, ChevronDown, ChevronRight, Database, Mail, Sparkles, Send, Archive, RefreshCw, CheckSquare, Square, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminParticipant {
  id: string;
  name: string;
  email: string | null;
  role: string;
  language: string | null;
  createdAt: string | null;
  hostedTastings: number;
  isHost: boolean;
  canAccessWhiskyDb: boolean;
  newsletterOptIn: boolean;
}

interface AdminTasting {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  code: string;
  hostName: string;
  hostId: string;
  participantCount: number;
  whiskyCount: number;
  blindMode: boolean | null;
}

interface AdminOverview {
  participants: AdminParticipant[];
  tastings: AdminTasting[];
  stats: {
    totalParticipants: number;
    totalHosts: number;
    totalTastings: number;
    totalAdmins: number;
  };
}

interface TastingDetail {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  hostName: string;
  participantCount: number;
  participants: { id: string; name: string }[];
  whiskies: WhiskyDetail[];
}

interface WhiskyDetail {
  id: string;
  name: string;
  distillery: string | null;
  age: string | null;
  abv: number | null;
  region: string | null;
  caskInfluence: string | null;
  peatLevel: string | null;
  imageUrl: string | null;
  avgOverall: number | null;
  ratingCount: number;
  ratings: IndividualRating[];
}

interface IndividualRating {
  participantName: string;
  participantId: string;
  nose: number;
  taste: number;
  finish: number;
  balance: number;
  overall: number;
  notes: string | null;
}

interface JournalEntryAdmin {
  id: string;
  participantId: string;
  participantName: string;
  title: string;
  whiskyName: string | null;
  distillery: string | null;
  region: string | null;
  age: string | null;
  abv: string | null;
  caskType: string | null;
  noseNotes: string | null;
  tasteNotes: string | null;
  finishNotes: string | null;
  personalScore: number | null;
  mood: string | null;
  occasion: string | null;
  body: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

interface AnalyticsData {
  totalRatings: number;
  totalWhiskies: number;
  totalTastings: number;
  totalParticipants: number;
  scoreDistribution: { range: string; count: number }[];
  topWhiskies: { id: string; name: string; distillery: string | null; tastingTitle: string; avgScore: number; ratingCount: number }[];
  participantStats: { id: string; name: string; count: number; avgScore: number; stdDev: number; minScore: number; maxScore: number }[];
  regionCounts: [string, number][];
  tastingsPerMonth: [string, number][];
}

const roleIcon = (role: string) => {
  switch (role) {
    case "admin": return <Shield className="w-4 h-4 text-amber-500" />;
    case "host": return <Crown className="w-4 h-4 text-blue-500" />;
    default: return <User className="w-4 h-4 text-muted-foreground" />;
  }
};

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    open: "bg-green-500/20 text-green-700 dark:text-green-400",
    closed: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    reveal: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
    archived: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
};

interface NewsletterArchiveItem {
  id: string;
  subject: string;
  contentHtml: string;
  recipientCount: number | null;
  sentAt: string | null;
  createdAt: string | null;
}

function NewsletterManagement({ participants, currentParticipantId, t }: {
  participants: AdminParticipant[];
  currentParticipantId: string;
  t: (key: string, opts?: any) => string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const subscribers = participants.filter(p => p.newsletterOptIn && p.email);
  const allWithEmail = participants.filter(p => p.email);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendSelectedIds, setResendSelectedIds] = useState<Set<string>>(new Set());
  const [showResendDialog, setShowResendDialog] = useState<string | null>(null);

  const { data: newsletters = [] } = useQuery<NewsletterArchiveItem[]>({
    queryKey: ["/admin/newsletters", currentParticipantId],
    queryFn: () => adminApi.getNewsletters(currentParticipantId),
    enabled: !!currentParticipantId,
  });

  const toggleRecipient = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllSubscribers = () => {
    setSelectedIds(new Set(subscribers.map(s => s.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const handleGenerate = async (type: "welcome" | "update") => {
    setGenerating(true);
    try {
      const result = await adminApi.generateNewsletter(currentParticipantId, type, customNotes || undefined);
      setSubject(result.subject || "");
      setContentHtml(result.body || "");
      toast({ title: "Newsletter generated", description: "You can edit the content before sending." });
    } catch (e: any) {
      toast({ title: t("admin.error"), description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !contentHtml.trim() || selectedIds.size === 0) return;
    setSending(true);
    try {
      const result = await adminApi.sendNewsletter(currentParticipantId, subject, contentHtml, Array.from(selectedIds));
      toast({ title: t("admin.newsletterSent", { count: result.sent }) });
      setSubject("");
      setContentHtml("");
      setSelectedIds(new Set());
      setCustomNotes("");
      queryClient.invalidateQueries({ queryKey: ["/admin/newsletters"] });
    } catch (e: any) {
      toast({ title: t("admin.error"), description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (newsletterId: string) => {
    if (resendSelectedIds.size === 0) return;
    setResendingId(newsletterId);
    try {
      const result = await adminApi.resendNewsletter(currentParticipantId, newsletterId, Array.from(resendSelectedIds));
      toast({ title: t("admin.newsletterResent", { count: result.sent }) });
      setShowResendDialog(null);
      setResendSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/admin/newsletters"] });
    } catch (e: any) {
      toast({ title: t("admin.error"), description: e.message, variant: "destructive" });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="font-serif text-lg text-primary flex items-center gap-2">
          <Send className="w-4 h-4" /> {t("admin.newsletterCompose")}
        </h3>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate("welcome")}
              disabled={generating}
              data-testid="button-generate-welcome"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              {t("admin.newsletterGenerateWelcome")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate("update")}
              disabled={generating}
              data-testid="button-generate-update"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              {t("admin.newsletterGenerateUpdate")}
            </Button>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{t("admin.newsletterCustomNotes")}</label>
            <textarea
              className="w-full mt-1 p-2 text-sm bg-secondary/20 border border-border/50 rounded-md resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Focus on the new journal feature..."
              data-testid="input-newsletter-notes"
            />
          </div>

          {generating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("admin.newsletterGenerating")}
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{t("admin.newsletterSubject")}</label>
            <Input
              className="mt-1 bg-secondary/20"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Newsletter subject..."
              data-testid="input-newsletter-subject"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{t("admin.newsletterContent")}</label>
              {contentHtml && (
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} data-testid="button-preview-newsletter">
                  <Eye className="w-3.5 h-3.5 mr-1" /> {t("admin.newsletterPreview")}
                </Button>
              )}
            </div>
            {showPreview && contentHtml ? (
              <div
                className="mt-1 p-4 bg-white text-gray-800 border border-border/50 rounded-md max-h-[400px] overflow-y-auto prose prose-sm"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
                data-testid="div-newsletter-preview"
              />
            ) : (
              <textarea
                className="w-full mt-1 p-2 text-sm bg-secondary/20 border border-border/50 rounded-md resize-y min-h-[200px] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder="<h2>Hello!</h2><p>Newsletter content...</p>"
                data-testid="input-newsletter-content"
              />
            )}
          </div>

          <div className="border border-border/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                {t("admin.newsletterRecipients")} — {t("admin.newsletterSelected", { count: selectedIds.size })}
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllSubscribers} data-testid="button-select-all">
                  <CheckSquare className="w-3.5 h-3.5 mr-1" /> {t("admin.newsletterSelectAll")}
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} data-testid="button-deselect-all">
                  {t("admin.newsletterDeselectAll")}
                </Button>
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {allWithEmail.length > 0 ? allWithEmail.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                    selectedIds.has(p.id) ? "bg-primary/10" : "hover:bg-secondary/30"
                  }`}
                  onClick={() => toggleRecipient(p.id)}
                  data-testid={`recipient-${p.id}`}
                >
                  {selectedIds.has(p.id) ? (
                    <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                  </div>
                  {p.newsletterOptIn && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium flex-shrink-0">Opt-in</span>
                  )}
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t("admin.noSubscribers")}</p>
              )}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full"
                disabled={!subject.trim() || !contentHtml.trim() || selectedIds.size === 0 || sending}
                data-testid="button-send-newsletter"
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {sending ? t("admin.newsletterSending") : t("admin.newsletterSend")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("admin.newsletterConfirmSend")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("admin.newsletterConfirmSendDesc", { count: selectedIds.size })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleSend} data-testid="button-confirm-send">
                  {t("admin.newsletterSend")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="border-t border-border/30 pt-6 space-y-4">
        <h3 className="font-serif text-lg text-primary flex items-center gap-2">
          <Archive className="w-4 h-4" /> {t("admin.newsletterArchive")}
        </h3>

        {newsletters.length > 0 ? (
          <div className="space-y-3">
            {newsletters.map((nl: NewsletterArchiveItem) => (
              <Card key={nl.id} data-testid={`card-newsletter-${nl.id}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{nl.subject}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {t("admin.newsletterSentDate")}: {nl.sentAt ? new Date(nl.sentAt).toLocaleDateString() : "-"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("admin.newsletterRecipientsCount", { count: nl.recipientCount || 0 })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowResendDialog(showResendDialog === nl.id ? null : nl.id);
                        setResendSelectedIds(new Set());
                      }}
                      data-testid={`button-resend-${nl.id}`}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t("admin.newsletterResend")}
                    </Button>
                  </div>

                  {showResendDialog === nl.id && (
                    <div className="mt-3 border-t border-border/30 pt-3 space-y-3">
                      <p className="text-xs text-muted-foreground">{t("admin.newsletterRecipients")}</p>
                      <div className="max-h-[150px] overflow-y-auto space-y-1">
                        {allWithEmail.map(p => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-sm ${
                              resendSelectedIds.has(p.id) ? "bg-primary/10" : "hover:bg-secondary/20"
                            }`}
                            onClick={() => {
                              setResendSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                return next;
                              });
                            }}
                          >
                            {resendSelectedIds.has(p.id) ? (
                              <CheckSquare className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <span>{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.email}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        disabled={resendSelectedIds.size === 0 || resendingId === nl.id}
                        onClick={() => handleResend(nl.id)}
                        data-testid={`button-confirm-resend-${nl.id}`}
                      >
                        {resendingId === nl.id ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> {t("admin.newsletterResending")}</>
                        ) : (
                          <><Send className="w-3.5 h-3.5 mr-1" /> {t("admin.newsletterResend")} ({resendSelectedIds.size})</>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">{t("admin.newsletterNoArchive")}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParticipants, setSearchParticipants] = useState("");
  const [searchTastings, setSearchTastings] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedTastingId, setExpandedTastingId] = useState<string | null>(null);
  const [searchJournals, setSearchJournals] = useState("");
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["admin-overview", currentParticipant?.id],
    queryFn: () => adminApi.getOverview(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: tastingDetail, isLoading: isLoadingDetail } = useQuery<TastingDetail>({
    queryKey: ["admin-tasting-detail", expandedTastingId],
    queryFn: () => adminApi.getTastingDetails(expandedTastingId!, currentParticipant!.id),
    enabled: !!expandedTastingId && !!currentParticipant,
  });

  const { data: journalsData, isLoading: isLoadingJournals } = useQuery<JournalEntryAdmin[]>({
    queryKey: ["admin-all-journals", currentParticipant?.id],
    queryFn: () => adminApi.getAllJournals(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["admin-analytics", currentParticipant?.id],
    queryFn: () => adminApi.getAnalytics(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const roleMutation = useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) =>
      adminApi.updateRole(participantId, role, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: t("admin.roleUpdated") });
    },
    onError: (e: Error) => toast({ title: t("admin.error"), description: e.message, variant: "destructive" }),
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: (participantId: string) =>
      adminApi.deleteParticipant(participantId, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: t("admin.participantDeleted") });
    },
    onError: (e: Error) => toast({ title: t("admin.error"), description: e.message, variant: "destructive" }),
  });

  const dbAccessMutation = useMutation({
    mutationFn: ({ participantId, canAccess }: { participantId: string; canAccess: boolean }) =>
      adminApi.updateWhiskyDbAccess(participantId, canAccess, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: t("admin.dbAccessUpdated") });
    },
    onError: (e: Error) => toast({ title: t("admin.error"), description: e.message, variant: "destructive" }),
  });

  const deleteTastingMutation = useMutation({
    mutationFn: (tastingId: string) =>
      adminApi.deleteTasting(tastingId, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: t("admin.tastingDeleted") });
    },
    onError: (e: Error) => toast({ title: t("admin.error"), description: e.message, variant: "destructive" }),
  });

  if (!currentParticipant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center" data-testid="admin-login-required">
        <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-serif">{t("admin.loginRequired")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center" data-testid="admin-access-denied">
        <ShieldAlert className="w-12 h-12 mx-auto text-destructive mb-4" />
        <p className="text-destructive font-serif">{t("admin.accessDenied")}</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12" data-testid="admin-loading">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const filteredParticipants = data.participants.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchParticipants.toLowerCase()) ||
      (p.email?.toLowerCase().includes(searchParticipants.toLowerCase()));
    const matchesRole = filterRole === "all" || p.role === filterRole ||
      (filterRole === "host" && p.isHost);
    return matchesSearch && matchesRole;
  });

  const filteredTastings = data.tastings.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTastings.toLowerCase()) ||
      t.hostName.toLowerCase().includes(searchTastings.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTastings.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const hosts = data.participants.filter(p => p.isHost);

  const filteredJournals = (journalsData || []).filter(j => {
    const q = searchJournals.toLowerCase();
    if (!q) return true;
    return (
      j.participantName.toLowerCase().includes(q) ||
      j.title.toLowerCase().includes(q) ||
      (j.whiskyName?.toLowerCase().includes(q))
    );
  });

  const maxDistribution = analyticsData?.scoreDistribution
    ? Math.max(...analyticsData.scoreDistribution.map(d => d.count), 1)
    : 1;

  return (
    <motion.div
      className="max-w-5xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="admin-panel-page"
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-admin-title">
            {t("admin.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-admin-subtitle">
          {t("admin.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card data-testid="stat-total-participants">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold font-serif">{data.stats.totalParticipants}</div>
            <div className="text-xs text-muted-foreground">{t("admin.statParticipants")}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-hosts">
          <CardContent className="p-4 text-center">
            <Crown className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold font-serif">{data.stats.totalHosts}</div>
            <div className="text-xs text-muted-foreground">{t("admin.statHosts")}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-tastings">
          <CardContent className="p-4 text-center">
            <Wine className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <div className="text-2xl font-bold font-serif">{data.stats.totalTastings}</div>
            <div className="text-xs text-muted-foreground">{t("admin.statTastings")}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-admins">
          <CardContent className="p-4 text-center">
            <Shield className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <div className="text-2xl font-bold font-serif">{data.stats.totalAdmins}</div>
            <div className="text-xs text-muted-foreground">{t("admin.statAdmins")}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" data-testid="admin-tabs">
        <TabsList className="flex flex-wrap w-full mb-6 h-auto gap-1">
          <TabsTrigger value="participants" data-testid="tab-participants" className="flex-1 min-w-0">
            <Users className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">{t("admin.tabParticipants")}</span>
          </TabsTrigger>
          <TabsTrigger value="hosts" data-testid="tab-hosts" className="flex-1 min-w-0">
            <Crown className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">{t("admin.tabHosts")}</span>
          </TabsTrigger>
          <TabsTrigger value="tastings" data-testid="tab-tastings" className="flex-1 min-w-0">
            <Wine className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">{t("admin.tabTastings")}</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions" className="flex-1 min-w-0">
            <Eye className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">Session Details</span>
          </TabsTrigger>
          <TabsTrigger value="journals" data-testid="tab-journals" className="flex-1 min-w-0">
            <BookOpen className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">All Journals</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics" className="flex-1 min-w-0">
            <BarChart3 className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="newsletter" data-testid="tab-newsletter" className="flex-1 min-w-0">
            <Mail className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">{t("admin.newsletterManagement")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("admin.searchParticipants")}
                value={searchParticipants}
                onChange={(e) => setSearchParticipants(e.target.value)}
                className="pl-9"
                data-testid="input-search-participants"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allRoles")}</SelectItem>
                <SelectItem value="admin">{t("admin.roleAdmin")}</SelectItem>
                <SelectItem value="host">{t("admin.roleHost")}</SelectItem>
                <SelectItem value="user">{t("admin.roleUser")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredParticipants.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("admin.noResults")}</p>
            ) : (
              filteredParticipants.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card data-testid={`participant-row-${p.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {roleIcon(p.role)}
                          <div className="min-w-0">
                            <div className="font-serif font-semibold truncate flex items-center gap-2">
                              {p.name}
                              {p.isHost && <span title="Host"><Crown className="w-3 h-3 text-blue-400 inline" /></span>}
                              {p.id === currentParticipant?.id && (
                                <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">{t("admin.you")}</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {p.email || t("admin.noEmail")} · {p.hostedTastings} {t("admin.hostedTastings")}
                              {p.createdAt && ` · ${new Date(p.createdAt).toLocaleDateString()}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select
                            value={p.role}
                            onValueChange={(role) => roleMutation.mutate({ participantId: p.id, role })}
                            disabled={p.id === currentParticipant?.id}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs" data-testid={`select-role-${p.id}`}>
                              <UserCog className="w-3 h-3 mr-1" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">{t("admin.roleUser")}</SelectItem>
                              <SelectItem value="host">{t("admin.roleHost")}</SelectItem>
                              <SelectItem value="admin">{t("admin.roleAdmin")}</SelectItem>
                            </SelectContent>
                          </Select>
                          {p.isHost && p.role !== "admin" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <Database className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground font-serif">DB</span>
                                  <Switch
                                    checked={p.canAccessWhiskyDb}
                                    onCheckedChange={(checked) => dbAccessMutation.mutate({ participantId: p.id, canAccess: checked })}
                                    className="scale-75"
                                    data-testid={`switch-db-access-${p.id}`}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("admin.whiskyDbAccessTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {p.id !== currentParticipant?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" data-testid={`btn-delete-participant-${p.id}`}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("admin.confirmDeleteParticipant")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("admin.confirmDeleteParticipantDesc", { name: p.name })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteParticipantMutation.mutate(p.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t("admin.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="hosts">
          <div className="space-y-2">
            {hosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("admin.noHosts")}</p>
            ) : (
              hosts.map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card data-testid={`host-row-${h.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Crown className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-serif font-semibold">{h.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {h.email || t("admin.noEmail")} · {t("admin.role")}: {h.role}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold font-serif text-primary">{h.hostedTastings}</div>
                          <div className="text-xs text-muted-foreground">{t("admin.tastingsHosted")}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="tastings">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("admin.searchTastings")}
                value={searchTastings}
                onChange={(e) => setSearchTastings(e.target.value)}
                className="pl-9"
                data-testid="input-search-tastings"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="reveal">Reveal</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredTastings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("admin.noResults")}</p>
            ) : (
              filteredTastings.map((tasting, i) => (
                <motion.div
                  key={tasting.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card data-testid={`tasting-row-${tasting.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-serif font-semibold truncate flex items-center gap-2">
                            {tasting.title}
                            {statusBadge(tasting.status)}
                            {tasting.blindMode && <span title="Blind"><Eye className="w-3 h-3 text-muted-foreground" /></span>}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            <span className="flex items-center gap-1"><Crown className="w-3 h-3" /> {tasting.hostName}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {tasting.date}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tasting.location}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tasting.participantCount}</span>
                            <span className="flex items-center gap-1"><Wine className="w-3 h-3" /> {tasting.whiskyCount}</span>
                            <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {tasting.code}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" data-testid={`btn-delete-tasting-${tasting.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("admin.confirmDeleteTasting")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("admin.confirmDeleteTastingDesc", { title: tasting.title })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTastingMutation.mutate(tasting.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t("admin.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Session Details Tab */}
        <TabsContent value="sessions">
          <div className="space-y-2" data-testid="sessions-list">
            {data.tastings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sessions found</p>
            ) : (
              data.tastings.map((tasting, i) => (
                <motion.div
                  key={tasting.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card data-testid={`session-card-${tasting.id}`}>
                    <CardContent className="p-4">
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedTastingId(expandedTastingId === tasting.id ? null : tasting.id)}
                        data-testid={`btn-expand-session-${tasting.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="font-serif font-semibold truncate flex items-center gap-2">
                              {expandedTastingId === tasting.id ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                              {tasting.title}
                              {statusBadge(tasting.status)}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1 ml-6">
                              <span className="flex items-center gap-1"><Crown className="w-3 h-3" /> {tasting.hostName}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {tasting.date}</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tasting.location}</span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tasting.participantCount}</span>
                              <span className="flex items-center gap-1"><Wine className="w-3 h-3" /> {tasting.whiskyCount}</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {expandedTastingId === tasting.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 border-t pt-4"
                          data-testid={`session-detail-${tasting.id}`}
                        >
                          {isLoadingDetail ? (
                            <div className="space-y-3">
                              {[1, 2].map(i => (
                                <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                              ))}
                            </div>
                          ) : tastingDetail ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                                <div><span className="text-muted-foreground">Host:</span> {tastingDetail.hostName}</div>
                                <div><span className="text-muted-foreground">Date:</span> {tastingDetail.date}</div>
                                <div><span className="text-muted-foreground">Location:</span> {tastingDetail.location}</div>
                                <div><span className="text-muted-foreground">Status:</span> {statusBadge(tastingDetail.status)}</div>
                                <div><span className="text-muted-foreground">Participants:</span> {tastingDetail.participantCount}</div>
                              </div>

                              {tastingDetail.participants.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold font-serif mb-2">Participants</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {tastingDetail.participants.map(p => (
                                      <span key={p.id} className="text-xs bg-muted px-2 py-1 rounded-full" data-testid={`session-participant-${p.id}`}>
                                        {p.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {tastingDetail.whiskies.length > 0 && (
                                <div className="space-y-4">
                                  <h4 className="text-sm font-semibold font-serif">Whiskies</h4>
                                  {tastingDetail.whiskies.map(whisky => (
                                    <Card key={whisky.id} className="bg-muted/30" data-testid={`session-whisky-${whisky.id}`}>
                                      <CardContent className="p-4">
                                        <div className="flex gap-4">
                                          {whisky.imageUrl && (
                                            <img
                                              src={whisky.imageUrl}
                                              alt={whisky.name}
                                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                              data-testid={`img-whisky-${whisky.id}`}
                                            />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="font-serif font-semibold">{whisky.name}</div>
                                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                              {whisky.distillery && <span>Distillery: {whisky.distillery}</span>}
                                              {whisky.age && <span>Age: {whisky.age}</span>}
                                              {whisky.abv != null && <span>ABV: {whisky.abv}%</span>}
                                              {whisky.region && <span>Region: {whisky.region}</span>}
                                              {whisky.caskInfluence && <span>Cask: {whisky.caskInfluence}</span>}
                                              {whisky.peatLevel && <span>Peat: {whisky.peatLevel}</span>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-sm">
                                              {whisky.avgOverall != null && (
                                                <span className="font-semibold text-primary">Avg Score: {whisky.avgOverall.toFixed(1)}</span>
                                              )}
                                              <span className="text-muted-foreground">{whisky.ratingCount} ratings</span>
                                            </div>
                                          </div>
                                        </div>

                                        {whisky.ratings.length > 0 && (
                                          <div className="mt-3 overflow-x-auto">
                                            <table className="w-full text-xs" data-testid={`ratings-table-${whisky.id}`}>
                                              <thead>
                                                <tr className="border-b text-muted-foreground">
                                                  <th className="text-left py-1 pr-2">Name</th>
                                                  <th className="text-center py-1 px-1">Nose</th>
                                                  <th className="text-center py-1 px-1">Taste</th>
                                                  <th className="text-center py-1 px-1">Finish</th>
                                                  <th className="text-center py-1 px-1">Balance</th>
                                                  <th className="text-center py-1 px-1">Overall</th>
                                                  <th className="text-left py-1 pl-2">Notes</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {whisky.ratings.map(r => (
                                                  <tr key={r.participantId} className="border-b border-muted/50" data-testid={`rating-row-${whisky.id}-${r.participantId}`}>
                                                    <td className="py-1.5 pr-2 font-medium">{r.participantName}</td>
                                                    <td className="text-center py-1.5 px-1">{r.nose}</td>
                                                    <td className="text-center py-1.5 px-1">{r.taste}</td>
                                                    <td className="text-center py-1.5 px-1">{r.finish}</td>
                                                    <td className="text-center py-1.5 px-1">{r.balance}</td>
                                                    <td className="text-center py-1.5 px-1 font-semibold text-primary">{r.overall}</td>
                                                    <td className="py-1.5 pl-2 text-muted-foreground max-w-[200px] truncate">{r.notes || "—"}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No details available</p>
                          )}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        {/* All Journals Tab */}
        <TabsContent value="journals">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search journals by participant, title, whisky..."
                value={searchJournals}
                onChange={(e) => setSearchJournals(e.target.value)}
                className="pl-9"
                data-testid="input-search-journals"
              />
            </div>
          </div>

          {isLoadingJournals ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2" data-testid="journals-list">
              {filteredJournals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No journal entries found</p>
              ) : (
                filteredJournals.map((journal, i) => (
                  <motion.div
                    key={journal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card data-testid={`journal-card-${journal.id}`}>
                      <CardContent className="p-4">
                        <button
                          className="w-full text-left"
                          onClick={() => setExpandedJournalId(expandedJournalId === journal.id ? null : journal.id)}
                          data-testid={`btn-expand-journal-${journal.id}`}
                        >
                          <div className="flex items-start gap-3">
                            {journal.imageUrl && (
                              <img
                                src={journal.imageUrl}
                                alt={journal.title}
                                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                data-testid={`img-journal-${journal.id}`}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {expandedJournalId === journal.id ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                                <span className="font-serif font-semibold truncate">{journal.title}</span>
                                {journal.personalScore != null && (
                                  <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0">
                                    {journal.personalScore}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1 ml-6">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {journal.participantName}</span>
                                {journal.whiskyName && <span>{journal.whiskyName}</span>}
                                {journal.distillery && <span>{journal.distillery}</span>}
                                {journal.createdAt && <span>{new Date(journal.createdAt).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>
                        </button>

                        {expandedJournalId === journal.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 border-t pt-4 ml-6"
                            data-testid={`journal-detail-${journal.id}`}
                          >
                            <div className="space-y-3 text-sm">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {journal.region && <div><span className="text-muted-foreground">Region:</span> {journal.region}</div>}
                                {journal.age && <div><span className="text-muted-foreground">Age:</span> {journal.age}</div>}
                                {journal.abv && <div><span className="text-muted-foreground">ABV:</span> {journal.abv}</div>}
                                {journal.caskType && <div><span className="text-muted-foreground">Cask:</span> {journal.caskType}</div>}
                                {journal.mood && <div><span className="text-muted-foreground">Mood:</span> {journal.mood}</div>}
                                {journal.occasion && <div><span className="text-muted-foreground">Occasion:</span> {journal.occasion}</div>}
                              </div>
                              {journal.noseNotes && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Nose:</span>
                                  <p className="mt-0.5">{journal.noseNotes}</p>
                                </div>
                              )}
                              {journal.tasteNotes && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Taste:</span>
                                  <p className="mt-0.5">{journal.tasteNotes}</p>
                                </div>
                              )}
                              {journal.finishNotes && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Finish:</span>
                                  <p className="mt-0.5">{journal.finishNotes}</p>
                                </div>
                              )}
                              {journal.body && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Notes:</span>
                                  <p className="mt-0.5">{journal.body}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          {isLoadingAnalytics ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : analyticsData ? (
            <div className="space-y-6" data-testid="analytics-content">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="analytics-summary">
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold font-serif">{analyticsData.totalRatings}</div>
                    <div className="text-xs text-muted-foreground">Total Ratings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Wine className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <div className="text-2xl font-bold font-serif">{analyticsData.totalWhiskies}</div>
                    <div className="text-xs text-muted-foreground">Total Whiskies</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <div className="text-2xl font-bold font-serif">{analyticsData.totalTastings}</div>
                    <div className="text-xs text-muted-foreground">Total Tastings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <div className="text-2xl font-bold font-serif">{analyticsData.totalParticipants}</div>
                    <div className="text-xs text-muted-foreground">Total Participants</div>
                  </CardContent>
                </Card>
              </div>

              {/* Score Distribution */}
              {analyticsData.scoreDistribution.length > 0 && (
                <Card data-testid="analytics-score-distribution">
                  <CardContent className="p-4">
                    <h3 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Score Distribution
                    </h3>
                    <div className="space-y-2">
                      {analyticsData.scoreDistribution.map(d => (
                        <div key={d.range} className="flex items-center gap-3" data-testid={`score-range-${d.range}`}>
                          <span className="text-xs text-muted-foreground w-12 text-right flex-shrink-0">{d.range}</span>
                          <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                            <div
                              className="bg-primary/70 h-full rounded-full transition-all duration-500"
                              style={{ width: `${(d.count / maxDistribution) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-8 flex-shrink-0">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top 20 Whiskies */}
              {analyticsData.topWhiskies.length > 0 && (
                <Card data-testid="analytics-top-whiskies">
                  <CardContent className="p-4">
                    <h3 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Top 20 Whiskies
                    </h3>
                    <div className="space-y-2">
                      {analyticsData.topWhiskies.map((w, i) => (
                        <div key={w.id} className="flex items-center gap-3 py-1.5 border-b border-muted/50 last:border-0" data-testid={`top-whisky-${w.id}`}>
                          <span className="text-xs text-muted-foreground w-6 text-right font-medium">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-serif font-medium text-sm truncate">{w.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {w.distillery && `${w.distillery} · `}{w.tastingTitle}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-sm text-primary">{w.avgScore.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">{w.ratingCount} ratings</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Participant Stats */}
              {analyticsData.participantStats.length > 0 && (
                <Card data-testid="analytics-participant-stats">
                  <CardContent className="p-4">
                    <h3 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Participant Stats
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground text-xs">
                            <th className="text-left py-2 pr-2">Name</th>
                            <th className="text-center py-2 px-2">Ratings</th>
                            <th className="text-center py-2 px-2">Avg Score</th>
                            <th className="text-center py-2 px-2">Std Dev</th>
                            <th className="text-center py-2 px-2">Min</th>
                            <th className="text-center py-2 px-2">Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.participantStats.map(ps => (
                            <tr key={ps.id} className="border-b border-muted/50" data-testid={`participant-stat-${ps.id}`}>
                              <td className="py-2 pr-2 font-medium font-serif">{ps.name}</td>
                              <td className="text-center py-2 px-2">{ps.count}</td>
                              <td className="text-center py-2 px-2 font-semibold text-primary">{ps.avgScore.toFixed(1)}</td>
                              <td className="text-center py-2 px-2 text-muted-foreground">{ps.stdDev.toFixed(1)}</td>
                              <td className="text-center py-2 px-2">{ps.minScore}</td>
                              <td className="text-center py-2 px-2">{ps.maxScore}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Region Breakdown */}
              {analyticsData.regionCounts.length > 0 && (
                <Card data-testid="analytics-regions">
                  <CardContent className="p-4">
                    <h3 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Region Breakdown
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {analyticsData.regionCounts.map(([region, count]) => (
                        <div key={region} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2" data-testid={`region-${region}`}>
                          <span className="text-sm font-medium">{region}</span>
                          <span className="text-sm font-bold text-primary">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tastings per Month */}
              {analyticsData.tastingsPerMonth.length > 0 && (
                <Card data-testid="analytics-timeline">
                  <CardContent className="p-4">
                    <h3 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Tastings per Month
                    </h3>
                    <div className="space-y-1">
                      {analyticsData.tastingsPerMonth.map(([month, count]) => (
                        <div key={month} className="flex items-center gap-3" data-testid={`month-${month}`}>
                          <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{month}</span>
                          <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                            <div
                              className="bg-blue-500/70 h-full rounded-full transition-all duration-500"
                              style={{ width: `${(count / Math.max(...analyticsData.tastingsPerMonth.map(m => m[1]), 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-6 flex-shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No analytics data available</p>
          )}
        </TabsContent>

        <TabsContent value="newsletter">
          <NewsletterManagement
            participants={data?.participants || []}
            currentParticipantId={currentParticipant?.id || ""}
            t={t}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}