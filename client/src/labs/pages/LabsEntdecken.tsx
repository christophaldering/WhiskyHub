import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import CommunityInsights from "@/labs/components/CommunityInsights";

export default function LabsEntdecken() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const exploreItems = [
    { key: 'allWhiskies', path: '/labs/explore' },
  ];

  const knowledgeItems = [
    { key: 'lexicon',       path: '/labs/discover/lexicon' },
    { key: 'distilleries',  path: '/labs/discover/distilleries' },
    { key: 'guide',         path: '/labs/discover/guide' },
    { key: 'templates',     path: '/labs/discover/templates' },
    { key: 'vocabulary',    path: '/labs/discover/flavour-map' },
  ];

  const deepDiveItems = [
    { key: 'rabbitHole',    path: '/labs/discover/rabbit-hole' },
  ];

  return (
    <div style={{ padding: '1.5rem 1.25rem 6rem', maxWidth: '440px', margin: '0 auto' }} data-testid="labs-entdecken-page">
      <h1 className="ty-h1" style={{ marginBottom: '0.25rem' }}>
        {t('discoverHub.title')}
      </h1>
      <p className="ty-sub" style={{ marginBottom: '1.5rem', opacity: 0.6 }}>
        {t('discoverHub.subtitle')}
      </p>

      <CommunityInsights />

      <p className="ty-label" style={{ marginBottom: '0.75rem' }}>
        {t('discover.whiskies')}
      </p>
      <div className="labs-grouped-list" style={{ marginBottom: '1.5rem' }}>
        {exploreItems.map((item) => (
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

      <p className="ty-label" style={{ marginBottom: '0.75rem' }}>
        {t('discover.knowledge')}
      </p>
      <div className="labs-grouped-list" style={{ marginBottom: '1.5rem' }}>
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

      <p className="ty-label" style={{ marginBottom: '0.75rem' }}>
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
