import { useV2Theme, useV2Lang } from "./LabsV2Layout";
import { TabDiscover, TabWorld, TabCircle, Whisky, Solo, Host, Join, Live, Add, type IconProps } from "./icons";
import { SP, FONT, RADIUS } from "./tokens";
import type { Translations } from "./i18n";

type TabVariant = "discover" | "world" | "circle";

interface PlaceholderTabProps {
  variant: TabVariant;
}

interface VariantConfig {
  getTitle: (t: Translations) => string;
  getSub: (t: Translations) => string;
  icon: (p: IconProps) => React.JSX.Element;
  icons: ((p: IconProps) => React.JSX.Element)[];
}

const config: Record<TabVariant, VariantConfig> = {
  discover: {
    getTitle: (t) => t.entTitle,
    getSub: (t) => t.entSub,
    icon: TabDiscover,
    icons: [TabDiscover, Whisky, Solo, Host, Join, Live, Add, TabWorld],
  },
  world: {
    getTitle: (t) => t.mwTitle,
    getSub: (t) => t.mwSub,
    icon: TabWorld,
    icons: [TabWorld, Whisky, Live, TabDiscover, Add, Host, Join, Solo],
  },
  circle: {
    getTitle: (t) => t.circleTitle,
    getSub: (t) => t.circleSub,
    icon: TabCircle,
    icons: [TabCircle, Join, Whisky, Add, Solo, Live, TabWorld, Host],
  },
};

export default function PlaceholderTab({ variant }: PlaceholderTabProps) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();

  const cfg = config[variant];
  const phase = th.phases.palate;

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <div style={{ textAlign: "center", marginBottom: SP.xl }}>
        <cfg.icon color={th.gold} size={40} style={{ marginBottom: SP.md }} />
        <h1
          style={{
            fontFamily: FONT.display,
            fontSize: 24,
            fontWeight: 600,
            color: th.text,
            marginBottom: SP.sm,
          }}
          data-testid={`v2-placeholder-title-${variant}`}
        >
          {cfg.getTitle(t)}
        </h1>
        <p style={{ fontSize: 14, color: th.muted }} data-testid={`v2-placeholder-desc-${variant}`}>
          {cfg.getSub(t)}
        </p>
        <div
          style={{
            display: "inline-block",
            marginTop: SP.md,
            padding: `${SP.xs}px ${SP.sm}px`,
            background: th.bgCard,
            borderRadius: RADIUS.full,
            fontSize: 12,
            fontWeight: 500,
            color: th.gold,
          }}
          data-testid={`v2-placeholder-badge-${variant}`}
        >
          {t.comingSoon}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: SP.md,
        }}
        data-testid={`v2-placeholder-grid-${variant}`}
      >
        {cfg.icons.map((Icon, idx) => (
          <div
            key={idx}
            style={{
              aspectRatio: "1",
              background: phase.dim,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon color={th.faint} size={28} />
          </div>
        ))}
      </div>
    </div>
  );
}
