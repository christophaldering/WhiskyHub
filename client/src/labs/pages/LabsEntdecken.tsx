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

  const renderSection = (
    titleKey: string,
    items: Array<{ key: string; path: string }>,
    isLast?: boolean,
  ) => (
    <div style={{ marginBottom: isLast ? 0 : 32 }}>
      <h2 className="ty-section-title" style={{ marginBottom: 12 }}>
        {t(titleKey)}
      </h2>
      <div className="labs-grouped-list">
        {items.map((item) => (
          <div
            key={item.key}
            className="labs-list-row"
            onClick={() => navigate(item.path)}
            style={{ cursor: 'pointer' }}
            data-testid={`link-entdecken-${item.key}`}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ty-ui">{t(`discover.${item.key}`)}</div>
              <div className="ty-caption" style={{ marginTop: 2, opacity: 0.6 }}>
                {t(`discover.${item.key}Sub`)}
              </div>
            </div>
            <span style={{ opacity: 0.3, fontSize: 16, flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem 1.25rem 6rem', maxWidth: '440px', margin: '0 auto' }} data-testid="labs-entdecken-page">
      <h1 className="ty-h1" style={{ marginBottom: '0.25rem' }}>
        {t('discoverHub.title')}
      </h1>
      <p className="ty-sub" style={{ marginBottom: '2rem', opacity: 0.6 }}>
        {t('discoverHub.subtitle')}
      </p>

      <CommunityInsights />

      {renderSection('discover.whiskies', exploreItems)}
      {renderSection('discover.knowledge', knowledgeItems)}
      {renderSection('discover.sectionDeepDive', deepDiveItems, true)}
    </div>
  );
}
