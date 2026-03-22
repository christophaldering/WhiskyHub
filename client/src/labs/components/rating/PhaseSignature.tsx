import type { ThemeTokens } from "./theme";
import type { PhaseId } from "./types";
import { NoseIcon, PalateIcon, FinishIcon, OverallIcon } from "./icons";

const PHASE_ICONS = {
  nose: NoseIcon,
  palate: PalateIcon,
  finish: FinishIcon,
  overall: OverallIcon,
} as const;

interface PhaseSignatureProps {
  phaseId: PhaseId;
  th: ThemeTokens;
  size?: "normal" | "large";
}

export default function PhaseSignature({ phaseId, th, size = "normal" }: PhaseSignatureProps) {
  const px = size === "large" ? 40 : 32;
  const iconSize = Math.round(px * 0.55);
  const phase = th.phases[phaseId];
  const Icon = PHASE_ICONS[phaseId];

  return (
    <div
      data-testid={`phase-sig-${phaseId}`}
      style={{
        width: px,
        height: px,
        borderRadius: px / 2.5,
        background: phase.dim,
        border: `1.5px solid ${phase.accent}70`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon color={phase.accent} size={iconSize} />
    </div>
  );
}
