import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { tastingApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

export default function Sessions() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const { data: tastings = [], isLoading } = useQuery({
    queryKey: ["tastings"],
    queryFn: tastingApi.getAll,
  });

  const active = tastings.filter((s: any) => s.status === "open" || s.status === "closed" || s.status === "reveal");
  const drafts = tastings.filter((s: any) => s.status === "draft");
  const archived = tastings.filter((s: any) => s.status === "archived");

  const sortByDate = (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime();

  active.sort(sortByDate);
  drafts.sort(sortByDate);
  archived.sort(sortByDate);

  const SessionCard = ({ tasting }: { tasting: any }) => (
    <button
      onClick={() => navigate(`/tasting/${tasting.id}`)}
      className="w-full text-left p-4 bg-card border border-border/50 rounded-lg hover:shadow-sm transition-all flex justify-between items-center group"
      data-testid={`card-tasting-${tasting.id}`}
    >
      <div>
        <div className="font-serif font-bold text-primary group-hover:underline">{tasting.title}</div>
        <div className="text-sm text-muted-foreground">{tasting.location} &bull; {new Date(tasting.date).toLocaleDateString()}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground font-mono uppercase">
          {t(`session.status.${tasting.status}`)}
        </span>
        <span className="text-xs font-mono text-muted-foreground">Code: {tasting.code}</span>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );

  const SessionGroup = ({ title, sessions, delay }: { title: string; sessions: any[]; delay: number }) => {
    if (sessions.length === 0) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.6 }}
        className="space-y-3"
      >
        <h2 className="text-lg font-serif font-bold text-primary tracking-tight">{title}</h2>
        <div className="space-y-2">
          {sessions.map((tasting: any) => (
            <SessionCard key={tasting.id} tasting={tasting} />
          ))}
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif italic">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-serif font-black text-primary tracking-tight">{t("nav.sessions")}</h1>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      {tastings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-16"
        >
          <p className="text-muted-foreground font-serif text-lg italic" data-testid="text-no-sessions">
            {t("nav.noSessions")}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          <SessionGroup title={t("nav.sessionsActive")} sessions={active} delay={0.1} />
          <SessionGroup title={t("nav.sessionsDraft")} sessions={drafts} delay={0.2} />
          <SessionGroup title={t("nav.sessionsArchived")} sessions={archived} delay={0.3} />
        </div>
      )}
    </div>
  );
}
