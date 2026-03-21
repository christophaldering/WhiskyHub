import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { Whisky, BookOpen, MapIcon, History, Globe, Building, type IconProps } from "../../icons";
import { SP, FONT, RADIUS } from "../../tokens";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";

type EntdeckenRoute = "explore" | "lexikon" | "guide" | "dest" | "bottlers" | "history";

interface HubItem {
  id: EntdeckenRoute;
  icon: (p: IconProps) => React.JSX.Element;
  label: (t: Translations) => string;
  sub: (t: Translations) => string;
}

const hubItems: HubItem[] = [
  { id: "explore", icon: Whisky, label: (t) => t.entExplore, sub: (t) => t.entExploreSub },
  { id: "lexikon", icon: BookOpen, label: (t) => t.entLexikon, sub: (t) => t.entLexikonSub },
  { id: "guide", icon: MapIcon, label: (t) => t.entGuide, sub: (t) => t.entGuideSub },
  { id: "dest", icon: Building, label: (t) => t.entDest, sub: (t) => t.entDestSub },
  { id: "bottlers", icon: Globe, label: (t) => t.entBottlers, sub: (t) => t.entBottlersSub },
  { id: "history", icon: History, label: (t) => t.entHistory, sub: (t) => t.entHistorySub },
];

interface EntdeckenHubProps {
  onNavigate: (route: EntdeckenRoute) => void;
}

export default function EntdeckenHub({ onNavigate }: EntdeckenHubProps) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();
  const phase = th.phases.palate;

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <div style={{ textAlign: "center", marginBottom: SP.xl }}>
        <h1
          style={{
            fontFamily: FONT.display,
            fontSize: 24,
            fontWeight: 600,
            color: th.text,
            marginBottom: SP.xs,
          }}
          data-testid="text-entdecken-title"
        >
          {t.entTitle}
        </h1>
        <p style={{ fontSize: 14, color: th.muted }} data-testid="text-entdecken-sub">
          {t.entSub}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: SP.md,
        }}
        data-testid="entdecken-hub-grid"
      >
        {hubItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: SP.sm,
              minHeight: 88,
              padding: `${SP.md}px ${SP.sm}px`,
              background: phase.dim,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              cursor: "pointer",
              transition: "background 0.2s, transform 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = phase.glow; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = phase.dim; }}
            data-testid={`entdecken-hub-${item.id}`}
          >
            <item.icon color={phase.accent} size={28} />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: FONT.body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: th.text,
                  lineHeight: 1.3,
                }}
              >
                {item.label(t)}
              </div>
              <div
                style={{
                  fontFamily: FONT.body,
                  fontSize: 11,
                  color: th.muted,
                  marginTop: 2,
                  lineHeight: 1.3,
                }}
              >
                {item.sub(t)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
