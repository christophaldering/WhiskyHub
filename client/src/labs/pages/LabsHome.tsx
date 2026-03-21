import { useLocation, Redirect } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { PenLine, Ticket, Crown } from "lucide-react";

export default function LabsHome() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();

  if (currentParticipant) {
    return <Redirect to="/labs/tastings" />;
  }

  return (
    <div className="labs-home-container labs-fade-in">
      <div className="labs-home-header">
        <p className="ty-label labs-home-eyebrow" data-testid="labs-home-eyebrow">
          CaskSense
        </p>
        <h1 className="ty-h1 labs-home-title" data-testid="labs-home-title">
          {t('home.greeting')}
        </h1>
        <p className="ty-sub labs-home-tagline" data-testid="labs-home-tagline">
          {t('home.greetingSub')}
        </p>
      </div>

      <div className="labs-home-cards">
        <button
          className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-1"
          onClick={() => navigate('/labs/solo')}
          data-testid="labs-action-solo"
        >
          <div className="labs-home-action-icon">
            <PenLine size={20} strokeWidth={1.6} />
          </div>
          <div className="labs-home-action-text">
            <div className="ty-ui">{t('home.solo')}</div>
            <div className="ty-caption labs-home-action-sub">
              {t('home.soloSub')}
            </div>
          </div>
        </button>

        <button
          className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-2"
          onClick={() => navigate('/labs/join')}
          data-testid="labs-action-join"
        >
          <div className="labs-home-action-icon">
            <Ticket size={20} strokeWidth={1.6} />
          </div>
          <div className="labs-home-action-text">
            <div className="ty-ui">{t('home.join')}</div>
            <div className="ty-caption labs-home-action-sub">
              {t('home.joinSub')}
            </div>
          </div>
        </button>

        <button
          className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-3"
          onClick={() => navigate('/labs/host')}
          data-testid="labs-action-host"
        >
          <div className="labs-home-action-icon">
            <Crown size={20} strokeWidth={1.6} />
          </div>
          <div className="labs-home-action-text">
            <div className="ty-ui">{t('home.host')}</div>
            <div className="ty-caption labs-home-action-sub">
              {t('home.hostSub')}
            </div>
          </div>
        </button>
      </div>

      <p className="ty-caption labs-home-more labs-fade-in labs-stagger-4" data-testid="labs-home-more">
        {t('home.moreAppears')}
      </p>

      <div className="labs-home-divider labs-fade-in labs-stagger-5" />

      <div className="labs-home-stille labs-fade-in labs-stagger-6" data-testid="labs-home-stille">
        <p className="ty-caption labs-home-stille-title">
          Stille
        </p>
        <p className="ty-caption labs-home-stille-sub">
          {t('home.noAccount')}
        </p>
      </div>
    </div>
  );
}
