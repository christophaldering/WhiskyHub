import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Back } from "../../icons";

interface Props {
  th: ThemeTokens;
  title: string;
  onBack: () => void;
  backTestId?: string;
  titleTestId?: string;
}

export default function SubScreenHeader({ th, title, onBack, backTestId = "mw-back-btn", titleTestId }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.lg }}>
      <button
        onClick={onBack}
        data-testid={backTestId}
        style={{
          background: th.bgCard,
          border: `1px solid ${th.border}`,
          borderRadius: RADIUS.full,
          minWidth: TOUCH_MIN,
          minHeight: TOUCH_MIN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <Back color={th.text} size={20} />
      </button>
      <h1 data-testid={titleTestId} style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, margin: 0 }}>
        {title}
      </h1>
    </div>
  );
}
