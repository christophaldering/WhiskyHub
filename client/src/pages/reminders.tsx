import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";

const OFFSET_OPTIONS = [
  { value: 1440, key: "offset1440" },
  { value: 360, key: "offset360" },
  { value: 60, key: "offset60" },
  { value: 30, key: "offset30" },
];

export default function Reminders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const [selectedOffset, setSelectedOffset] = useState<number>(1440);

  const { data: reminders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reminders", currentParticipant?.id],
    queryFn: () => fetch(`/api/reminders/${currentParticipant?.id}`).then(r => r.json()),
    enabled: !!currentParticipant?.id,
  });

  const { data: tastings = [] } = useQuery<any[]>({
    queryKey: ["/api/tastings", currentParticipant?.id],
    queryFn: () => fetch(`/api/tastings?participantId=${currentParticipant?.id}`).then(r => r.json()),
    enabled: !!currentParticipant?.id,
  });

  const { data: participant } = useQuery<any>({
    queryKey: [`/api/participants/${currentParticipant?.id}`],
    enabled: !!currentParticipant?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (data: { tastingId?: string; enabled: boolean; offsetMinutes: number }) => {
      const res = await apiRequest("POST", `/api/reminders/${currentParticipant!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t("reminders.saved") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reminders/${currentParticipant!.id}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t("reminders.deleted") });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (reminder: any) => {
      const res = await apiRequest("POST", `/api/reminders/${currentParticipant!.id}`, {
        tastingId: reminder.tastingId,
        enabled: !reminder.enabled,
        offsetMinutes: reminder.offsetMinutes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  if (!currentParticipant) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 min-w-0">
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight" data-testid="text-reminders-title">
          {t("reminders.title")}
        </h1>
        <p className="text-muted-foreground">{t("reminders.noEmail")}</p>
      </div>
    );
  }

  const hasVerifiedEmail = participant?.email && participant?.emailVerified;

  const globalReminders = reminders.filter((r: any) => !r.tastingId);
  const tastingReminders = reminders.filter((r: any) => r.tastingId);

  const upcomingTastings = tastings.filter((t: any) => {
    const tastingDate = new Date(t.date + "T23:59:59");
    return tastingDate >= new Date() && t.status !== "archived";
  });

  const getOffsetLabel = (minutes: number) => {
    const opt = OFFSET_OPTIONS.find(o => o.value === minutes);
    return opt ? t(`reminders.${opt.key}`) : `${minutes} min`;
  };

  const getTastingTitle = (tastingId: string) => {
    const tasting = tastings.find((t: any) => t.id === tastingId);
    return tasting?.title || tastingId;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 min-w-0 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight" data-testid="text-reminders-title">
          {t("reminders.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("reminders.subtitle")}</p>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      {!hasVerifiedEmail && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{t("reminders.emailRequired")}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="bg-card border border-border/50 rounded-xl p-5 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-full">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-serif font-bold text-primary">{t("reminders.globalReminder")}</h2>
        </div>

        {globalReminders.length > 0 ? (
          <div className="space-y-3">
            {globalReminders.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3" data-testid={`reminder-global-${r.id}`}>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={() => toggleMutation.mutate(r)}
                    disabled={!hasVerifiedEmail}
                    data-testid={`toggle-reminder-${r.id}`}
                  />
                  <span className={cn("text-sm", !r.enabled && "text-muted-foreground line-through")}>
                    {getOffsetLabel(r.offsetMinutes)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                  data-testid={`delete-reminder-${r.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("reminders.noReminders")}</p>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Select value={String(selectedOffset)} onValueChange={(v) => setSelectedOffset(Number(v))}>
            <SelectTrigger className="w-48" data-testid="select-offset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFSET_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={String(opt.value)} data-testid={`option-${opt.value}`}>
                  {t(`reminders.${opt.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => addMutation.mutate({ enabled: true, offsetMinutes: selectedOffset })}
            disabled={!hasVerifiedEmail || addMutation.isPending}
            data-testid="button-add-global-reminder"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t("reminders.addReminder")}
          </Button>
        </div>
      </motion.div>

      {upcomingTastings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-serif font-bold text-primary">{t("reminders.perTasting")}</h2>

          {upcomingTastings.map((tasting: any) => {
            const tastingRems = tastingReminders.filter((r: any) => r.tastingId === tasting.id);
            return (
              <div
                key={tasting.id}
                className="bg-card border border-border/50 rounded-xl p-4 space-y-3"
                data-testid={`tasting-reminder-card-${tasting.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-semibold text-primary">{tasting.title}</h3>
                    <p className="text-xs text-muted-foreground">{tasting.date} · {tasting.location}</p>
                  </div>
                  {tastingRems.some((r: any) => r.enabled) ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>

                {tastingRems.length > 0 && (
                  <div className="space-y-2">
                    {tastingRems.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={r.enabled}
                            onCheckedChange={() => toggleMutation.mutate(r)}
                            disabled={!hasVerifiedEmail}
                          />
                          <span className={cn("text-sm", !r.enabled && "text-muted-foreground line-through")}>
                            {getOffsetLabel(r.offsetMinutes)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(r.id)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Select value={String(selectedOffset)} onValueChange={(v) => setSelectedOffset(Number(v))}>
                    <SelectTrigger className="w-44 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFSET_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {t(`reminders.${opt.key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addMutation.mutate({ tastingId: tasting.id, enabled: true, offsetMinutes: selectedOffset })}
                    disabled={!hasVerifiedEmail || addMutation.isPending}
                    className="h-9"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {t("reminders.addReminder")}
                  </Button>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
