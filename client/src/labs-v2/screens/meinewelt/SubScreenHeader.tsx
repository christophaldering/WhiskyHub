import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Back } from "../../icons";

interface Props {
  th: ThemeTokens;
  title: string;
  onBack: () => void;
}

export default function SubScreenHeader({ th, title, onBack }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.lg }}>
      <button
        onClick={onBack}
        data-testid="mw-back-btn"
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
      <h1 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, margin: 0 }}>
        {title}
      </h1>
    </div>
  );
}
