import { useEffect, useState } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import { Eye, Sparkle } from "../../icons";
import { useHaptic } from "@/labs/hooks/useHaptic";

type RevealField = "name" | "details" | "photo";
const REVEAL_ORDER: RevealField[] = ["name", "details", "photo"];

interface WhiskyInfo {
  name?: string;
  region?: string;
  cask?: string;
  age?: string;
  abv?: string;
  imageUrl?: string;
  distillery?: string;
}

interface RevealSequenceProps {
  th: ThemeTokens;
  t: Translations;
  whisky: WhiskyInfo;
  revealedFields: Set<string>;
}

export default function RevealSequence({ th, t, whisky, revealedFields }: RevealSequenceProps) {
  const haptic = useHaptic();
  const [flashKey, setFlashKey] = useState(0);

  const hasName = revealedFields.has("name");
  const hasDetails = revealedFields.has("details");
  const hasPhoto = revealedFields.has("photo");

  useEffect(() => {
    if (revealedFields.size > 0) {
      setFlashKey((k) => k + 1);
      haptic.heavy();
    }
  }, [revealedFields.size]);

  if (revealedFields.size === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: `${SP.lg}px`,
          background: th.bgCard,
          borderRadius: RADIUS.lg,
          border: `1px solid ${th.border}`,
        }}
        data-testid="reveal-blind"
      >
        <Eye color={th.faint} size={28} />
        <p
          style={{
            fontFamily: FONT.display,
            fontSize: 16,
            fontWeight: 500,
            color: th.muted,
            marginTop: SP.sm,
            margin: `${SP.sm}px 0 0`,
          }}
        >
          {t.liveBlind}
        </p>
      </div>
    );
  }

  const detailChips: { label: string; value: string }[] = [];
  if (hasDetails) {
    if (whisky.region) detailChips.push({ label: "Region", value: whisky.region });
    if (whisky.cask) detailChips.push({ label: "Cask", value: whisky.cask });
    if (whisky.age) detailChips.push({ label: "Age", value: whisky.age });
    if (whisky.abv) detailChips.push({ label: "ABV", value: whisky.abv });
    if (whisky.distillery) detailChips.push({ label: "Distillery", value: whisky.distillery });
  }

  const fullyRevealed = REVEAL_ORDER.every((f) => revealedFields.has(f));

  return (
    <div
      key={flashKey}
      className="v2-reveal-flash"
      style={{
        padding: `${SP.lg}px`,
        background: th.bgCard,
        borderRadius: RADIUS.lg,
        border: `1px solid ${th.gold}`,
        position: "relative",
        overflow: "hidden",
      }}
      data-testid="reveal-sequence"
    >
      <div
        style={{
          position: "absolute",
          top: -4,
          right: SP.md,
          pointerEvents: "none",
        }}
      >
        <div className="v2-sparkle-float">
          <Sparkle color={th.gold} size={16} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.md }}>
        <Eye color={th.gold} size={18} />
        <span
          style={{
            fontFamily: FONT.body,
            fontSize: 11,
            fontWeight: 600,
            color: th.gold,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
          data-testid="reveal-label"
        >
          {t.liveRevealed}
        </span>
      </div>

      {hasName && whisky.name && (
        <h2
          style={{
            fontFamily: FONT.display,
            fontSize: 24,
            fontWeight: 700,
            color: th.text,
            marginBottom: hasDetails || hasPhoto ? SP.md : 0,
          }}
          data-testid="reveal-name"
        >
          {whisky.name}
        </h2>
      )}

      {hasDetails && detailChips.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: SP.sm,
            marginBottom: hasPhoto ? SP.md : 0,
          }}
          data-testid="reveal-details"
        >
          {detailChips.map((chip) => (
            <span
              key={chip.label}
              style={{
                display: "inline-block",
                padding: `${SP.xs}px ${SP.sm}px`,
                fontSize: 12,
                fontFamily: FONT.body,
                background: th.bgHover,
                borderRadius: RADIUS.sm,
                color: th.text,
              }}
              data-testid={`reveal-chip-${chip.label.toLowerCase()}`}
            >
              {chip.value}
            </span>
          ))}
        </div>
      )}

      {hasPhoto && whisky.imageUrl && (
        <div
          style={{
            marginTop: SP.sm,
            borderRadius: RADIUS.md,
            overflow: "hidden",
            animation: "revealFlash 0.7s ease-out both",
          }}
          data-testid="reveal-photo"
        >
          <img
            src={whisky.imageUrl}
            alt={whisky.name || "Whisky"}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 200,
              objectFit: "cover",
              borderRadius: RADIUS.md,
            }}
          />
        </div>
      )}

      {fullyRevealed && (
        <div
          style={{
            marginTop: SP.md,
            display: "flex",
            alignItems: "center",
            gap: SP.xs,
          }}
          data-testid="reveal-full"
        >
          <Sparkle color={th.gold} size={14} />
          <span
            style={{
              fontSize: 12,
              fontFamily: FONT.body,
              color: th.gold,
              fontWeight: 500,
            }}
          >
            {t.liveRevealed}
          </span>
        </div>
      )}
    </div>
  );
}
