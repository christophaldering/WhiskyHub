import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Sparkles, Mic, MessageSquare, Wand2 } from "lucide-react";
import { participantApi, participantUpdateApi, pidHeaders } from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { SkeletonList } from "@/labs/components/LabsSkeleton";

type CooperEntryMode = "auto" | "voice" | "type";
type CooperLevel = "auto" | "beginner" | "expert" | "connoisseur";
type CooperDepth = "schnell" | "neugierig" | "rabbithole";

export default function LabsTasteCooper() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const goBack = useBackNavigation("/labs/taste/profile");
  const pid = currentParticipant?.id;

  const [memText, setMemText] = useState<string | null>(null);
  const [memUpdatedAt, setMemUpdatedAt] = useState<string | null>(null);
  const [memEnabled, setMemEnabled] = useState(false);
  const [memBusy, setMemBusy] = useState(false);
  useEffect(() => {
    if (!pid) return;
    (async () => {
      try {
        const res = await fetch("/api/cooper/memory", { headers: { ...pidHeaders() } });
        if (!res.ok) return;
        const data = await res.json();
        setMemText(data?.memory ?? null);
        setMemUpdatedAt(data?.updatedAt ?? null);
        setMemEnabled(data?.enabled === true);
      } catch {}
    })();
  }, [pid]);
  const memStale = !!memUpdatedAt && Date.now() - new Date(memUpdatedAt).getTime() > 30 * 86400000;
  const [introSeen, setIntroSeen] = useState(() => { try { return localStorage.getItem("labs_cooper_area_intro_seen") === "1"; } catch { return false; } });
  const dismissIntro = () => { try { localStorage.setItem("labs_cooper_area_intro_seen", "1"); } catch {} setIntroSeen(true); };
  const downloadMemTxt = async () => {
    if (!memText) return;
    try { await downloadBlob(new Blob([memText], { type: "text/plain;charset=utf-8" }), "casksense-sensorisches-gedaechtnis.txt"); }
    catch { toast({ description: "Download fehlgeschlagen.", variant: "destructive" }); }
  };
  const toggleMemEnabled = async () => {
    const next = !memEnabled;
    setMemEnabled(next);
    try { await participantUpdateApi.update(pid!, { cooperMemoryEnabled: next } as any); }
    catch { setMemEnabled(!next); toast({ description: "Konnte Einstellung nicht speichern.", variant: "destructive" }); }
  };
  const regenMem = async () => {
    setMemBusy(true);
    try {
      const res = await fetch("/api/cooper/memory/generate", { method: "POST", headers: { "Content-Type": "application/json", ...pidHeaders() } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Fehler");
      setMemText(data?.memory ?? null); setMemUpdatedAt(data?.updatedAt ?? null);
    } catch (e: any) { toast({ description: e?.message || "Konnte nicht verdichten.", variant: "destructive" }); }
    finally { setMemBusy(false); }
  };
  const deleteMem = async () => {
    setMemBusy(true);
    try {
      const res = await fetch("/api/cooper/memory", { method: "DELETE", headers: { ...pidHeaders() } });
      if (!res.ok) throw new Error();
      setMemText(null); setMemUpdatedAt(null);
    } catch { toast({ description: "Konnte nicht löschen.", variant: "destructive" }); }
    finally { setMemBusy(false); }
  };

  const { data: participant, isLoading } = useQuery({
    queryKey: ["participant", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const [selected, setSelected] = useState<CooperEntryMode>("auto");
  const [level, setLevel] = useState<CooperLevel>("auto");
  const [depth, setDepth] = useState<CooperDepth>("neugierig");

  useEffect(() => {
    if (participant) {
      const m = (participant as any).cooperEntryMode;
      setSelected(m === "voice" || m === "type" ? m : "auto");
      const lv = (participant as any).cooperLevel;
      setLevel(lv === "beginner" || lv === "expert" || lv === "connoisseur" ? lv : "auto");
      const dp = (participant as any).cooperDepth;
      setDepth(dp === "schnell" || dp === "rabbithole" ? dp : "neugierig");
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

  const levelMutation = useMutation({
    mutationFn: (lvl: CooperLevel) => participantUpdateApi.update(pid!, { cooperLevel: lvl === "auto" ? null : lvl }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["participant", pid] }); toast({ title: t("v2.cooperPrefs.saved", "Gespeichert") }); },
    onError: () => { toast({ title: t("v2.cooperPrefs.saveError", "Konnte nicht gespeichert werden"), variant: "destructive" }); },
  });
  const pickLevel = (lvl: CooperLevel) => { setLevel(lvl); if (pid) levelMutation.mutate(lvl); };

  const depthMutation = useMutation({
    mutationFn: (d: CooperDepth) => participantUpdateApi.update(pid!, { cooperDepth: d }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["participant", pid] }); toast({ title: t("v2.cooperPrefs.saved", "Gespeichert") }); },
    onError: () => { toast({ title: t("v2.cooperPrefs.saveError", "Konnte nicht gespeichert werden"), variant: "destructive" }); },
  });
  const pickDepth = (d: CooperDepth) => { setDepth(d); if (pid) depthMutation.mutate(d); };

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

  const levelOptions: { value: CooperLevel; label: string; desc: string }[] = [
    { value: "auto", label: t("v2.cooperPrefs.levelAuto", "Automatisch"), desc: t("v2.cooperPrefs.levelAutoDesc", "Cooper spürt an deiner Sprache, wie er mit dir reden soll — wärmer bei Unsicheren, knapper bei Kennern.") },
    { value: "beginner", label: t("v2.cooperPrefs.levelBeginner", "Beginner"), desc: t("v2.cooperPrefs.levelBeginnerDesc", "Einfache Sprache, keine Fachbegriffe nötig — Cooper hilft behutsam beim Schärfen.") },
    { value: "expert", label: t("v2.cooperPrefs.levelExpert", "Expert"), desc: t("v2.cooperPrefs.levelExpertDesc", "Setzt Verkoster-Vokabular voraus, normale Tiefe, auf Augenhöhe.") },
    { value: "connoisseur", label: t("v2.cooperPrefs.levelConnoisseur", "Connoisseur"), desc: t("v2.cooperPrefs.levelConnoisseurDesc", "Maximale Zurückhaltung, feinste Nuancen, keine Ermutigung.") },
  ];

  const depthOptions: { value: CooperDepth; label: string; desc: string }[] = [
    { value: "schnell", label: t("v2.cooperPrefs.depthSchnell", "Schnell"), desc: t("v2.cooperPrefs.depthSchnellDesc", "Wenige Nachfragen — zügig durch.") },
    { value: "neugierig", label: t("v2.cooperPrefs.depthNeugierig", "Neugierig"), desc: t("v2.cooperPrefs.depthNeugierigDesc", "Ausgewogen — die wichtigsten Ecken.") },
    { value: "rabbithole", label: t("v2.cooperPrefs.depthRabbithole", "Rabbit Hole"), desc: t("v2.cooperPrefs.depthRabbitholeDesc", "Tief und ausführlich — jede Nuance.") },
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

      {!introSeen && (
        <div className="labs-card p-5 flex flex-col gap-3" data-testid="cooper-area-intro">
          <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Hallo, ich bin Cooper.</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>
            Aus deinen Verkostungen entsteht nach und nach ein Bild von dir — dein Sensorisches Gedächtnis. Es liegt nur in deinem Bereich. Du entscheidest, ob ich im Nachgang darauf zurückgreife, und kannst es jederzeit ansehen, herunterladen oder löschen.
          </p>
          <button onClick={dismissIntro} data-testid="cooper-area-intro-dismiss"
            style={{ alignSelf: "flex-start", minHeight: 40, padding: "0 16px", borderRadius: 10, cursor: "pointer", background: "var(--labs-gold, #D4A847)", color: "#0B0906", fontSize: 14, fontWeight: 600, border: "none" }}>
            Verstanden
          </button>
        </div>
      )}

      <div className="labs-card p-5">
        <p className="labs-serif" style={{ fontSize: 16, lineHeight: 1.6, color: "var(--labs-text-secondary)", fontStyle: "italic", margin: 0 }}>
          {t("v2.cooperPrefs.positioning", "Die meisten KI-Werkzeuge laden zum kognitiven Outsourcing ein \u2014 sie nehmen dir das Denken ab. Cooper ist f\u00fcr das Gegenteil gebaut: Er schmeckt, denkt und urteilt nie f\u00fcr dich, sondern hilft dir, deine eigene Wahrnehmung in deine eigenen Worte zu fassen. Je sicherer du wirst, desto stiller wird er \u2014 sein Ziel ist nicht, unentbehrlich zu werden, sondern dich zu sch\u00e4rfen.")}
        </p>
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

      <div className="labs-card p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{t("v2.cooperPrefs.levelTitle", "Coopers Ebene")}</p>
        {levelOptions.map((opt) => {
          const active = level === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => pickLevel(opt.value)}
              data-testid={`cooper-level-${opt.value}`}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left", width: "100%", padding: "14px 16px", borderRadius: 12, cursor: "pointer", background: active ? "var(--labs-gold-soft, rgba(212,168,71,0.12))" : "var(--labs-surface)", border: active ? "2px solid var(--labs-gold, #D4A847)" : "1px solid var(--labs-border)", transition: "border-color 150ms ease, background 150ms ease" }}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--labs-gold, #D4A847)" : "var(--labs-text)" }}>{opt.label}</span>
                <span style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.4 }}>{opt.desc}</span>
              </span>
            </button>
          );
        })}
        <p className="text-xs" style={{ color: "var(--labs-text-muted)", marginTop: 2 }}>{t("v2.cooperPrefs.levelHint", "Ändert nur, wie Cooper spricht — nie, was er über die Flasche weiß.")}</p>
      </div>

      <div className="labs-card p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{t("v2.cooperPrefs.depthTitle", "Gesprächstiefe")}</p>
        {depthOptions.map((opt) => {
          const active = depth === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => pickDepth(opt.value)}
              data-testid={`cooper-depth-${opt.value}`}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left", width: "100%", padding: "14px 16px", borderRadius: 12, cursor: "pointer", background: active ? "var(--labs-gold-soft, rgba(212,168,71,0.12))" : "var(--labs-surface)", border: active ? "2px solid var(--labs-gold, #D4A847)" : "1px solid var(--labs-border)", transition: "border-color 150ms ease, background 150ms ease" }}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--labs-gold, #D4A847)" : "var(--labs-text)" }}>{opt.label}</span>
                <span style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.4 }}>{opt.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="labs-card p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Was Cooper über dich weiß</p>
        <p className="text-xs" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
          Ein Porträt aus deinen bisherigen Verkostungen. Cooper greift im Nachgang (Fragen &amp; Entdecken) darauf zurück — nie im Moment am Glas.
        </p>
        <button onClick={toggleMemEnabled} data-testid="cooper-memory-optin"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", padding: "14px 16px", borderRadius: 12, cursor: "pointer", background: memEnabled ? "var(--labs-gold-soft, rgba(212,168,71,0.12))" : "var(--labs-surface)", border: memEnabled ? "2px solid var(--labs-gold, #D4A847)" : "1px solid var(--labs-border)" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: memEnabled ? "var(--labs-gold, #D4A847)" : "var(--labs-text)" }}>Cooper darf sich erinnern</span>
          <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{memEnabled ? "An" : "Aus"}</span>
        </button>
        <div data-testid="cooper-memory-text" style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 12, padding: 14, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: memText ? "var(--labs-text)" : "var(--labs-text-muted)" }}>
          {memText || "Noch nicht erzeugt."}
        </div>
        {memUpdatedAt && (
          <p className="text-xs" style={{ color: memStale ? "var(--labs-gold, #D4A847)" : "var(--labs-text-muted)" }}>
            {memStale ? "Vielleicht veraltet — " : "Zuletzt verdichtet: "}{new Date(memUpdatedAt).toLocaleDateString("de-DE")}{memStale ? ". Neu verdichten?" : ""}
          </p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={regenMem} disabled={memBusy} data-testid="cooper-memory-generate"
            style={{ flex: 1, minHeight: 44, borderRadius: 12, cursor: memBusy ? "default" : "pointer", background: "var(--labs-gold, #D4A847)", color: "#0B0906", fontSize: 14, fontWeight: 600, border: "none", opacity: memBusy ? 0.5 : 1 }}>
            {memText ? "Aktualisieren" : "Erzeugen"}
          </button>
          <button onClick={deleteMem} disabled={memBusy || !memText} data-testid="cooper-memory-delete"
            style={{ flex: 1, minHeight: 44, borderRadius: 12, cursor: (memBusy || !memText) ? "default" : "pointer", background: "transparent", color: "var(--labs-text-muted)", fontSize: 14, border: "1px solid var(--labs-border)", opacity: (memBusy || !memText) ? 0.5 : 1 }}>
            Löschen
          </button>
        </div>
        {memText && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={downloadMemTxt} data-testid="cooper-memory-download-txt"
              style={{ flex: 1, minHeight: 40, borderRadius: 10, cursor: "pointer", background: "transparent", color: "var(--labs-text)", fontSize: 13, border: "1px solid var(--labs-border)" }}>
              Als Text
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
