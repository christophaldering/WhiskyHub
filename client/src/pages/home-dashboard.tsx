import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wine,
  ArrowRight,
  Plus,
  BookOpen,
  Users,
  Clock,
  LogIn,
} from "lucide-react";

export default function HomeDashboard() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const { data: tastings = [] } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const activeSessions = tastings.filter(
    (s: any) => s.status !== "archived" && s.status !== "closed"
  );
  const recentSessions = tastings
    .slice()
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  const lastActive = activeSessions[0] as any | undefined;

  const handleJoinSession = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setJoinError("");
    try {
      const tasting = await tastingApi.getByCode(code);
      if (currentParticipant) {
        await tastingApi.join(tasting.id, currentParticipant.id, code);
      }
      navigate(`/tasting/${tasting.id}`);
    } catch (e: any) {
      setJoinError(e.message || "Tasting nicht gefunden");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-serif font-bold tracking-tight text-primary">
          {t("app.name", "CaskSense")}
        </h1>
        <p className="text-sm text-muted-foreground font-serif italic">
          Dein Whisky-Tasting Companion
        </p>
        {currentParticipant && (
          <p className="text-xs text-muted-foreground pt-1">
            Willkommen, <span className="text-primary font-medium">{currentParticipant.name}</span>
          </p>
        )}
      </div>

      <Card className="border-primary/20 bg-card/80 backdrop-blur">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-serif font-semibold text-primary uppercase tracking-widest">
            <LogIn className="w-4 h-4" />
            Session beitreten
          </div>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setJoinError("");
              }}
              placeholder="Code eingeben …"
              className="bg-secondary/20 font-mono tracking-widest text-center uppercase"
              maxLength={8}
              data-testid="input-join-code"
              onKeyDown={(e) => e.key === "Enter" && handleJoinSession()}
            />
            <Button
              onClick={handleJoinSession}
              disabled={!joinCode.trim() || joining}
              className="shrink-0"
              data-testid="button-join-session"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          {joinError && (
            <p className="text-xs text-destructive" data-testid="text-join-error">
              {joinError}
            </p>
          )}
        </CardContent>
      </Card>

      {lastActive && (
        <Card
          className="border-amber-500/30 bg-amber-950/10 cursor-pointer hover:bg-amber-950/20 transition-colors"
          onClick={() => navigate(`/tasting/${lastActive.id}`)}
          data-testid={`card-continue-session-${lastActive.id}`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Wine className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-400/80 font-serif uppercase tracking-wider">
                Letzte Session fortsetzen
              </p>
              <p className="text-sm font-medium truncate">{lastActive.title}</p>
              <p className="text-xs text-muted-foreground">{lastActive.location} · {lastActive.date}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-border/50 hover:border-primary/40"
          onClick={() => navigate("/home")}
          data-testid="button-create-session"
        >
          <Plus className="w-5 h-5 text-primary" />
          <span className="text-xs font-serif">Session erstellen</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-border/50 hover:border-primary/40"
          onClick={() => navigate("/journal")}
          data-testid="button-open-journal"
        >
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-xs font-serif">Journal öffnen</span>
        </Button>
      </div>

      {currentParticipant && recentSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-serif font-semibold text-muted-foreground uppercase tracking-widest">
            <Clock className="w-4 h-4" />
            Letzte Tastings
          </div>
          <div className="space-y-2">
            {recentSessions.map((session: any) => (
              <Link
                key={session.id}
                href={`/tasting/${session.id}`}
                data-testid={`link-recent-tasting-${session.id}`}
              >
                <Card className="border-border/40 hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/40 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.date} · {session.location || "—"}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground capitalize shrink-0">
                      {session.status}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!currentParticipant && (
        <Card className="border-border/30 bg-secondary/10">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Melde dich an, um deine Tastings und dein Journal zu sehen.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/home")}
              data-testid="button-goto-login"
            >
              Anmelden
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
