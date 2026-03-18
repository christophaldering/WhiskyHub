import { useLocation, Redirect } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";

export default function LabsHome() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();

  if (currentParticipant) {
    return <Redirect to="/labs/tastings" />;
  }

  return (
    <div style={{ padding: '2rem 1.25rem 6rem', maxWidth: '440px', margin: '0 auto' }}>
      <p className="ty-label" style={{ marginBottom: '0.75rem' }} data-testid="labs-home-eyebrow">
        CaskSense
      </p>
      <h1 className="ty-h1" style={{ marginBottom: '0.5rem', whiteSpace: 'pre-line' }} data-testid="labs-home-title">
        {t('home.greeting')}
      </h1>
      <p className="ty-sub" style={{ marginBottom: '2rem', opacity: 0.6 }} data-testid="labs-home-tagline">
        {t('home.greetingSub')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/labs/solo')}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            border: '0.5px solid var(--labs-border)',
            borderRadius: '14px',
            background: 'transparent',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            color: 'inherit',
          }}
          data-testid="labs-action-solo"
        >
          <div className="ty-ui">{t('home.solo')}</div>
          <div className="ty-caption" style={{ marginTop: '3px', opacity: 0.6 }}>
            {t('home.soloSub')}
          </div>
        </button>

        <button
          onClick={() => navigate('/labs/join')}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            border: '0.5px solid var(--labs-border)',
            borderRadius: '14px',
            background: 'transparent',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            color: 'inherit',
          }}
          data-testid="labs-action-join"
        >
          <div className="ty-ui">{t('home.join')}</div>
          <div className="ty-caption" style={{ marginTop: '3px', opacity: 0.6 }}>
            {t('home.joinSub')}
          </div>
        </button>

        <button
          onClick={() => navigate('/labs/host')}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            border: '0.5px solid var(--labs-border)',
            borderRadius: '14px',
            background: 'transparent',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            color: 'inherit',
          }}
          data-testid="labs-action-host"
        >
          <div className="ty-ui">{t('home.host')}</div>
          <div className="ty-caption" style={{ marginTop: '3px', opacity: 0.6 }}>
            {t('home.hostSub')}
          </div>
        </button>
      </div>

      <p className="ty-caption" style={{ textAlign: 'center', opacity: 0.35 }} data-testid="labs-home-more">
        {t('home.moreAppears')}
      </p>

      <div style={{ marginTop: '3rem', textAlign: 'center' }} data-testid="labs-home-stille">
        <p className="ty-caption" style={{ opacity: 0.3, fontStyle: 'italic', letterSpacing: '0.08em' }}>
          Stille
        </p>
        <p className="ty-caption" style={{ opacity: 0.3, marginTop: '4px' }}>
          {t('home.noAccount')}
        </p>
      </div>
    </div>
  );
}
