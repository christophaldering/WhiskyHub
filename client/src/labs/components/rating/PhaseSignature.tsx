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
  size?: "normal" | "large";
}

export default function PhaseSignature({ phaseId, size = "normal" }: PhaseSignatureProps) {
  const px = size === "large" ? 40 : 32;
  const iconSize = Math.round(px * 0.55);
  const accent = `var(--labs-phase-${phaseId})`;
  const dim = `var(--labs-phase-${phaseId}-dim)`;
  const Icon = PHASE_ICONS[phaseId];

  return (
    <div
      data-testid={`phase-sig-${phaseId}`}
      style={{
        width: px,
        height: px,
        borderRadius: px / 2.5,
        background: dim,
        border: `1.5px solid color-mix(in srgb, ${accent} 44%, transparent)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon color={accent} size={iconSize} />
    </div>
  );
}
