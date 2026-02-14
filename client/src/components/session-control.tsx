import { Button } from "@/components/ui/button";
import { useSessionStore, SessionStatus, RevealAct } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { Play, Lock, Eye, Archive, ChevronRight } from "lucide-react";

export function SessionControl() {
  const { t } = useTranslation();
  const { status, setStatus, currentAct, setAct } = useSessionStore();

  const handleNextState = () => {
    if (status === 'draft') setStatus('open');
    else if (status === 'open') setStatus('closed');
    else if (status === 'closed') setStatus('reveal');
    else if (status === 'reveal') {
       if (currentAct === 'act1') setAct('act2');
       else if (currentAct === 'act2') setAct('act3');
       else if (currentAct === 'act3') setAct('act4');
       else setStatus('archived');
    }
  };

  const getButtonText = () => {
    if (status === 'draft') return { label: t('session.actions.start'), icon: Play };
    if (status === 'open') return { label: t('session.actions.close'), icon: Lock };
    if (status === 'closed') return { label: t('session.actions.reveal'), icon: Eye };
    if (status === 'reveal') return { label: t('session.actions.nextAct'), icon: ChevronRight };
    return { label: t('session.actions.archive'), icon: Archive };
  };

  const { label, icon: Icon } = getButtonText();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-card border border-border/50 shadow-2xl p-4 rounded-lg flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">
          Host Control
        </div>
        <div className="text-sm font-serif font-bold text-primary mb-3">
          Status: {t(`session.status.${status}`)}
          {status === 'reveal' && <span className="ml-2 opacity-70">({t(`reveal.${currentAct}`)})</span>}
        </div>
        <Button 
          onClick={handleNextState} 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
        >
          <Icon className="w-4 h-4 mr-2" /> {label}
        </Button>
      </div>
    </div>
  );
}
