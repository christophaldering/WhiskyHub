import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

export default function LabsEntdecken() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const knowledgeItems = [
    { key: 'lexicon',       path: '/labs/discover/lexicon' },
    { key: 'distilleries',  path: '/labs/discover/distilleries' },
    { key: 'guide',         path: '/labs/discover/guide' },
    { key: 'templates',     path: '/labs/discover/templates' },
    { key: 'vocabulary',    path: '/labs/discover/flavour-map' },
    { key: 'research',      path: '/labs/discover/research' },
  ];

  const deepDiveItems = [
    { key: 'rabbitHole',    path: '/labs/discover/rabbit-hole' },
  ];

  return (
    <div style={{ padding: '1.5rem 1.25rem 6rem', maxWidth: '440px', margin: '0 auto' }} data-testid="labs-entdecken-page">
      <p className="ty-label" style={{ marginBottom: '0.5rem' }}>
        {t('nav.discover')}
      </p>
      <h1 className="ty-h1" style={{ marginBottom: '0.35rem' }}>
        {t('discover.title')}
      </h1>
      <p className="ty-sub" style={{ marginBottom: '2rem', opacity: 0.6 }}>
        {t('discover.sub')}
      </p>

      <p className="ty-label" style={{ marginBottom: '0.75rem' }}>
        {t('discover.whiskies')}
      </p>
      <div className="labs-grouped-list" style={{ marginBottom: '2rem' }}>
        <div
          className="labs-list-row"
          onClick={() => navigate('/labs/explore')}
          style={{ cursor: 'pointer' }}
          data-testid="link-entdecken-explore"
        >
          <div>
            <div className="ty-ui">{t('discover.allWhiskies')}</div>
            <div className="ty-caption" style={{ marginTop: '2px', opacity: 0.6 }}>
              {t('discover.allWhiskiesSub')}
            </div>
          </div>
          <span style={{ opacity: 0.3, fontSize: '16px' }}>›</span>
        </div>
        <div
          className="labs-list-row"
          onClick={() => navigate('/labs/taste/compare')}
          style={{ cursor: 'pointer' }}
          data-testid="link-entdecken-compare"
        >
          <div>
            <div className="ty-ui">{t('discover.compare')}</div>
            <div className="ty-caption" style={{ marginTop: '2px', opacity: 0.6 }}>
              {t('discover.compareSub')}
            </div>
          </div>
          <span style={{ opacity: 0.3, fontSize: '16px' }}>›</span>
        </div>
      </div>

      <p className="ty-label" style={{ marginBottom: '0.75rem' }}>
        {t('discover.knowledge')}
      </p>
      <div className="labs-grouped-list">
        {knowledgeItems.map((item) => (
          <div
            key={item.key}
            className="labs-list-row"
            onClick={() => navigate(item.path)}
            style={{ cursor: 'pointer' }}
            data-testid={`link-entdecken-${item.key}`}
          >
            <div>
              <div className="ty-ui">{t(`discover.${item.key}`)}</div>
              <div className="ty-caption" style={{ marginTop: '2px', opacity: 0.6 }}>
                {t(`discover.${item.key}Sub`)}
              </div>
            </div>
            <span style={{ opacity: 0.3, fontSize: '16px' }}>›</span>
          </div>
        ))}
      </div>

      <p className="ty-label" style={{ marginTop: '2rem', marginBottom: '0.75rem' }}>
        {t('discover.sectionDeepDive', 'Deep Dives')}
      </p>
      <div className="labs-grouped-list">
        {deepDiveItems.map((item) => (
          <div
            key={item.key}
            className="labs-list-row"
            onClick={() => navigate(item.path)}
            style={{ cursor: 'pointer' }}
            data-testid={`link-entdecken-${item.key}`}
          >
            <div>
              <div className="ty-ui">{t(`discover.${item.key}`)}</div>
              <div className="ty-caption" style={{ marginTop: '2px', opacity: 0.6 }}>
                {t(`discover.${item.key}Sub`)}
              </div>
            </div>
            <span style={{ opacity: 0.3, fontSize: '16px' }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
