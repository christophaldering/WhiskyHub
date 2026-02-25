import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import { notificationApi } from "@/lib/api";
import { Bell, CheckCheck, Wine, Users, Sparkles, Megaphone, Gift, ChevronRight, ChevronDown, ChevronUp, Plus, Send, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GuestPreview } from "@/components/guest-preview";

const typeConfig: Record<string, { icon: typeof Bell; color: string; labelKey: string }> = {
  invitation: { icon: Gift, color: "text-blue-600 bg-blue-600/10", labelKey: "news.categoryInvitation" },
  join: { icon: Users, color: "text-green-600 bg-green-600/10", labelKey: "news.categoryJoin" },
  reveal: { icon: Wine, color: "text-amber-600 bg-amber-600/10", labelKey: "news.categoryReveal" },
  platform_update: { icon: Megaphone, color: "text-purple-600 bg-purple-600/10", labelKey: "news.categoryPlatformUpdate" },
  feature_update: { icon: Sparkles, color: "text-rose-600 bg-rose-600/10", labelKey: "news.categoryFeatureUpdate" },
};

export default function News() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postMessage, setPostMessage] = useState("");
  const [postType, setPostType] = useState("platform_update");
  const [postLinkUrl, setPostLinkUrl] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const isAdmin = currentParticipant?.role === "admin";

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", currentParticipant?.id],
    queryFn: () => notificationApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationApi.markRead(notificationId, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
      toast({ title: t("news.markedRead", "Als gelesen markiert") });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
      toast({ title: t("news.allMarkedRead", "Alle als gelesen markiert") });
    },
  });

  const postMutation = useMutation({
    mutationFn: (data: { participantId: string; title: string; message: string; type?: string; linkUrl?: string }) =>
      notificationApi.createGlobal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setShowPostDialog(false);
      setPostTitle("");
      setPostMessage("");
      setPostLinkUrl("");
      toast({ title: t("news.postSuccess") });
    },
  });

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.linkUrl) {
      navigate(notif.linkUrl);
    }
  };

  const handlePost = () => {
    if (!postTitle.trim() || !postMessage.trim()) return;
    postMutation.mutate({
      participantId: currentParticipant!.id,
      title: postTitle.trim(),
      message: postMessage.trim(),
      type: postType,
      linkUrl: postLinkUrl.trim() || undefined,
    });
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const filteredNotifications = useMemo(() => 
    notifications.filter((n: any) => n.type !== "join"),
    [notifications]
  );

  const joinAggregation = useMemo(() => {
    const joinNotifs = notifications.filter((n: any) => n.type === "join");
    if (joinNotifs.length === 0) return null;
    const tastingNames = new Set<string>();
    joinNotifs.forEach((n: any) => {
      if (n.linkUrl) {
        tastingNames.add(n.linkUrl);
      }
    });
    return {
      participants: joinNotifs.length,
      tastings: Math.max(tastingNames.size, 1),
    };
  }, [notifications]);

  const unreadCount = filteredNotifications.filter((n: any) => !n.isRead).length;

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredNotifications.forEach((notif: any) => {
      const category = notif.type || "platform_update";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(notif);
    });
    const categoryOrder = ["invitation", "reveal", "platform_update", "feature_update"];
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      const idxA = categoryOrder.indexOf(a);
      const idxB = categoryOrder.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
    return sortedEntries;
  }, [filteredNotifications]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return t("news.justNow");
    if (mins < 60) return t("news.minutesAgo", { count: mins });
    if (hours < 24) return t("news.hoursAgo", { count: hours });
    if (days < 7) return t("news.daysAgo", { count: days });
    return date.toLocaleDateString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!currentParticipant) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto min-w-0 overflow-x-hidden">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words">{t("news.title")}</h1>
          <div className="w-12 h-1 bg-primary/50 mt-3" />
        </motion.div>
        <GuestPreview featureTitle={t("news.title")} featureDescription={t("news.guestDesc")}>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full p-4 bg-card border border-border/50 rounded-lg">
                <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                <div className="h-3 bg-secondary/60 rounded w-full" />
              </div>
            ))}
          </div>
        </GuestPreview>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto min-w-0 overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words" data-testid="text-news-title">{t("news.title")}</h1>
            <div className="w-12 h-1 bg-primary/50 mt-3" />
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                className="gap-1.5 text-xs"
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t("news.markAllRead")}
              </Button>
            )}
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setShowPostDialog(true)}
                className="gap-1.5 text-xs"
                data-testid="button-post-news"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("news.postUpdate")}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {unreadCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Badge variant="secondary" className="text-xs">
            {t("news.unreadCount", { count: unreadCount })}
          </Badge>
        </motion.div>
      )}

      {joinAggregation && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600/5 border border-green-600/15 text-sm text-green-700 dark:text-green-400" data-testid="text-aggregated-activity">
            <Users className="w-4 h-4 shrink-0" />
            <span>{t("news.aggregatedActivity", { participants: joinAggregation.participants, tastings: joinAggregation.tastings })}</span>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-full p-4 bg-card border border-border/50 rounded-lg animate-pulse">
              <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-secondary/60 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 && !joinAggregation ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-serif">{t("news.empty")}</p>
          <p className="text-sm text-muted-foreground/70 mt-1">{t("news.emptyDesc")}</p>
        </motion.div>
      ) : groupedNotifications.length > 0 && (
        <div className="space-y-4">
          {groupedNotifications.map(([category, items]) => {
            const config = typeConfig[category] || typeConfig.platform_update;
            const CategoryIcon = config.icon;
            const isCollapsed = collapsedCategories[category] ?? false;
            const unreadInCategory = items.filter((n: any) => !n.isRead).length;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-card border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                  data-testid={`button-toggle-category-${category}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                    <CategoryIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-serif font-semibold flex-1 text-left">
                    {t(config.labelKey)}
                  </span>
                  {unreadInCategory > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                      {unreadInCategory}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {items.length}
                  </Badge>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 mt-2 pl-2">
                        {items.map((notif: any, i: number) => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <Card
                              className={`cursor-pointer transition-all hover:shadow-md ${!notif.isRead ? "border-primary/30 bg-primary/[0.02]" : "opacity-75"}`}
                              onClick={() => handleNotificationClick(notif)}
                              data-testid={`card-notification-${notif.id}`}
                            >
                              <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                                  <CategoryIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className={`text-sm font-serif font-semibold truncate ${!notif.isRead ? "text-primary" : "text-muted-foreground"}`} data-testid={`text-notification-title-${notif.id}`}>
                                        {notif.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {!notif.isRead && (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="w-7 h-7 rounded-full border-primary/30 hover:bg-primary/10"
                                          data-testid={`button-mark-read-${notif.id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            markReadMutation.mutate(notif.id);
                                          }}
                                          title={t("news.markRead", "Als gelesen markieren")}
                                        >
                                          <CheckCheck className="w-3.5 h-3.5 text-primary" />
                                        </Button>
                                      )}
                                      {!notif.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                      )}
                                      {notif.linkUrl && (
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                                      <Calendar className="w-3 h-3" />
                                      <span data-testid={`text-notification-date-${notif.id}`}>{formatDate(notif.createdAt)}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/40">·</span>
                                    <span className="text-[10px] text-muted-foreground/60">{formatTime(notif.createdAt)}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{t("news.postUpdate")}</DialogTitle>
            <DialogDescription>{t("news.postDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger data-testid="select-news-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform_update">{t("news.typePlatformUpdate")}</SelectItem>
                <SelectItem value="feature_update">{t("news.typeFeatureUpdate")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
              placeholder={t("news.titlePlaceholder")}
              data-testid="input-news-title"
            />
            <Textarea
              value={postMessage}
              onChange={e => setPostMessage(e.target.value)}
              placeholder={t("news.messagePlaceholder")}
              rows={3}
              data-testid="input-news-message"
            />
            <Input
              value={postLinkUrl}
              onChange={e => setPostLinkUrl(e.target.value)}
              placeholder={t("news.linkPlaceholder")}
              data-testid="input-news-link"
            />
            <Button
              onClick={handlePost}
              disabled={!postTitle.trim() || !postMessage.trim() || postMutation.isPending}
              className="w-full gap-2"
              data-testid="button-submit-news"
            >
              <Send className="w-4 h-4" />
              {t("news.publish")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
