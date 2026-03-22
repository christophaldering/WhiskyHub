import { useState } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Check, ChevronDown } from "../../icons";
import SoloVoiceMemo from "./SoloVoiceMemo";
import AccountUpgradePromptV2 from "../../components/AccountUpgradePromptV2";

interface Props {
  th: ThemeTokens;
  t: Translations;
  whiskyName: string;
  score: number;
  participantId: string;
  onAnother: () => void;
  onHub: () => void;
}

export default function SoloDoneScreen({ th, t, whiskyName, score, participantId, onAnother, onHub }: Props) {
  const [memoOpen, setMemoOpen] = useState(false);

  const scoreBand = score >= 90 ? th.green : score >= 80 ? th.gold : th.amber;

  return (
    <div className="v2-fade-up" style={{
      padding: `${SP.xl}px ${SP.md}px`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: SP.lg,
    }}>
      <div className="v2-save-flash" style={{
        width: 72,
        height: 72,
        borderRadius: RADIUS.full,
        background: th.phases.overall.dim,
        border: `2px solid ${th.phases.overall.accent}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }} data-testid="solo-done-check">
        <Check color={th.phases.overall.accent} size={36} />
      </div>

      <h2 style={{
        fontFamily: FONT.display,
        fontSize: 22,
        fontWeight: 700,
        color: th.text,
        margin: 0,
        textAlign: "center",
      }} data-testid="solo-done-whisky">
        {whiskyName}
      </h2>

      <div style={{
        fontSize: 48,
        fontWeight: 700,
        fontFamily: FONT.body,
        color: scoreBand,
        fontVariantNumeric: "tabular-nums",
      }} data-testid="solo-done-score">
        {score}
      </div>

      <p style={{
        fontFamily: FONT.body,
        fontSize: 15,
        color: th.muted,
        margin: 0,
      }} data-testid="solo-done-saved">
        {t.soloSaved}
      </p>

      <div style={{
        width: "100%",
        borderRadius: RADIUS.lg,
        border: `1px solid ${th.border}`,
        background: th.bgCard,
        overflow: "hidden",
      }}>
        <button
          onClick={() => setMemoOpen(!memoOpen)}
          data-testid="solo-memo-toggle"
          style={{
            width: "100%",
            padding: `${SP.sm}px ${SP.md}px`,
            minHeight: TOUCH_MIN,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 14,
            color: th.text,
          }}
        >
          <span>{t.soloVoiceMemo}</span>
          <ChevronDown
            color={th.muted}
            size={18}
            style={{
              transition: "transform 0.2s",
              transform: memoOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
        {memoOpen && (
          <div style={{ padding: `0 ${SP.md}px ${SP.md}px` }}>
            <SoloVoiceMemo th={th} t={t} participantId={participantId} />
          </div>
        )}
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: SP.sm, marginTop: SP.md }}>
        <button
          onClick={onAnother}
          data-testid="solo-another-btn"
          style={{
            width: "100%",
            minHeight: TOUCH_MIN,
            borderRadius: RADIUS.full,
            border: "none",
            background: th.phases.nose.accent,
            color: "#0e0b05",
            fontFamily: FONT.display,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t.soloAnother}
        </button>

        <button
          onClick={onHub}
          data-testid="solo-to-hub-btn"
          style={{
            width: "100%",
            minHeight: TOUCH_MIN,
            borderRadius: RADIUS.full,
            border: `1px solid ${th.border}`,
            background: "none",
            color: th.text,
            fontFamily: FONT.body,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {t.soloToHub}
        </button>
      </div>

      <AccountUpgradePromptV2 th={th} t={t} participantId={participantId} />
    </div>
  );
}
