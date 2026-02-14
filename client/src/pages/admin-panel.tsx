import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { adminApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { ShieldAlert, Users, Wine, Crown, Trash2, Search, UserCog, Shield, User, Calendar, MapPin, Eye, Hash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function AdminPanel() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParticipants, setSearchParticipants] = useState("");
  const [searchTastings, setSearchTastings] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["admin-overview", currentParticipant?.id],
    queryFn: () => adminApi.getOverview(currentParticipant!.id),
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

  return (
    <motion.div
      className="max-w-5xl mx-auto px-4 py-8"
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
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="participants" data-testid="tab-participants">
            <Users className="w-4 h-4 mr-1" /> {t("admin.tabParticipants")}
          </TabsTrigger>
          <TabsTrigger value="hosts" data-testid="tab-hosts">
            <Crown className="w-4 h-4 mr-1" /> {t("admin.tabHosts")}
          </TabsTrigger>
          <TabsTrigger value="tastings" data-testid="tab-tastings">
            <Wine className="w-4 h-4 mr-1" /> {t("admin.tabTastings")}
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
      </Tabs>
    </motion.div>
  );
}
