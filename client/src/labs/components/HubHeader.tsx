import { useTranslation } from "react-i18next";

export type HubKind = "discover" | "meine-welt";

interface Props {
  kind: HubKind;
}

export default function HubHeader({ kind }: Props) {
  const { t } = useTranslation();

  const titleKey = kind === "discover" ? "explore.title" : "myTastePage.title";
  const titleFallback = kind === "discover" ? "Explore" : "My World";
  const subKey = kind === "discover" ? "explore.subtitle" : "myTastePage.subtitle";
  const subFallback =
    kind === "discover" ? "Find whiskies" : "Your personal whisky collection & insights";
  const testId = kind === "discover" ? "labs-hub-header-discover" : "labs-hub-header-meine-welt";

  return (
    <div className="labs-hub-header" data-testid={testId}>
      <h1 className="ty-h1 labs-hub-header-title" style={{ margin: 0 }}>
        {t(titleKey, titleFallback)}
      </h1>
      <p className="ty-sub labs-hub-header-subtitle" style={{ margin: "2px 0 0" }}>
        {t(subKey, subFallback)}
      </p>
    </div>
  );
}
