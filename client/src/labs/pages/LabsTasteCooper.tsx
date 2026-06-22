import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Sparkles, Mic, MessageSquare, Wand2 } from "lucide-react";
import { participantApi, participantUpdateApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { SkeletonList } from "@/labs/components/LabsSkeleton";

type CooperEntryMode = "auto" | "voice" | "type";

export default function LabsTasteCooper() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const goBack = useBackNavigation("/labs/taste/profile");
  const pid = currentParticipant?.id;

  const { data: participant, isLoading } = useQuery({
    queryKey: ["participant", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const [selected, setSelected] = useState<CooperEntryMode>("auto");

  useEffect(() => {
    if (participant) {
      const m = (participant as any).cooperEntryMode;
      setSelected(m === "voice" || m === "type" ? m : "auto");
    }
  }, [participant]);

  const mutation = useMutation({
    mutationFn: (mode: CooperEntryMode) =>
      participantUpdateApi.update(pid!, { cooperEntryMode: mode === "auto" ? null : mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participant", pid] });
      toast({ title: t("v2.cooperPrefs.saved", "Gespeichert") });
    },
    onError: () => {
      toast({ title: t("v2.cooperPrefs.saveError", "Konnte nicht gespeichert werden"), variant: "destructive" });
    },
  });

  const pick = (mode: CooperEntryMode) => {
    setSelected(mode);
    if (pid) mutation.mutate(mode);
  };

  if (!currentParticipant) {
    return (
      <div className="labs-page">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} className="labs-btn-ghost flex items-center gap-1 -ml-2" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-profile"><ChevronLeft className="w-4 h-4" /> Profile</button>
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }}>Cooper</h1>
        </div>
        <AuthGateMessage
          icon={<Sparkles className="w-10 h-10" style={{ color: "var(--labs-text-muted)" }} />}
          title={t("v2.cooperPrefs.authTitle", "Melde dich an, um Cooper einzustellen")}
          className="labs-empty"
          compact
        />
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ padding: 16 }}><SkeletonList count={3} /></div>;
  }

  const options: { value: CooperEntryMode; icon: typeof Wand2; label: string; desc: string }[] = [
    { value: "auto", icon: Wand2, label: t("v2.cooperPrefs.autoLabel", "Nach Situation"), desc: t("v2.cooperPrefs.autoDesc", "Bei Solo und einzelnen Drams beginnt Cooper im Gespr\u00e4ch, im Gruppen-Tasting beim Tippen.") },
    { value: "voice", icon: Mic, label: t("v2.cooperPrefs.voiceLabel", "Immer Stimme"), desc: t("v2.cooperPrefs.voiceDesc", "Cooper beginnt \u00fcberall im Sprach-Gespr\u00e4ch.") },
    { value: "type", icon: MessageSquare, label: t("v2.cooperPrefs.typeLabel", "Immer Tippen"), desc: t("v2.cooperPrefs.typeDesc", "Cooper beginnt \u00fcberall im Text-Dialog.") },
  ];

  return (
    <div className="labs-page flex flex-col gap-6" data-testid="labs-taste-cooper">
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="labs-btn-ghost flex items-center gap-1 -ml-2" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-profile"><ChevronLeft className="w-4 h-4" /> Profile</button>
        <div>
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-cooper-title">Cooper</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{t("v2.cooperPrefs.subtitle", "Wie Cooper deinen ersten Eindruck aufnimmt")}</p>
        </div>
      </div>

      <div className="labs-card p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{t("v2.cooperPrefs.entryTitle", "Einstieg")}</p>
        {options.map((opt) => {
          const active = selected === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => pick(opt.value)}
              data-testid={`cooper-entry-${opt.value}`}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left",
                width: "100%", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                background: active ? "var(--labs-gold-soft, rgba(212,168,71,0.12))" : "var(--labs-surface)",
                border: active ? "2px solid var(--labs-gold, #D4A847)" : "1px solid var(--labs-border)",
                transition: "border-color 150ms ease, background 150ms ease",
              }}
            >
              <Icon className="w-5 h-5" style={{ color: active ? "var(--labs-gold, #D4A847)" : "var(--labs-text-muted)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--labs-gold, #D4A847)" : "var(--labs-text)" }}>{opt.label}</span>
                <span style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.4 }}>{opt.desc}</span>
              </span>
            </button>
          );
        })}
        <p className="text-xs" style={{ color: "var(--labs-text-muted)", marginTop: 2 }}>{t("v2.cooperPrefs.hint", "Im Moment selbst kannst du jederzeit zwischen Stimme und Tippen wechseln.")}</p>
      </div>
    </div>
  );
}
