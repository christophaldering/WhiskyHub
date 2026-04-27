import { useState } from "react";

interface ParticipantAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  testId?: string;
  background?: string;
  color?: string;
  fontSize?: number;
  borderRadius?: number;
}

export default function ParticipantAvatar({
  name,
  photoUrl,
  size = 32,
  testId,
  background = "var(--labs-accent-muted)",
  color = "var(--labs-accent)",
  fontSize,
  borderRadius,
}: ParticipantAvatarProps) {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").charAt(0).toUpperCase();
  const radius = borderRadius ?? size / 2;
  const computedFontSize = fontSize ?? Math.max(10, Math.round(size * 0.4));

  if (photoUrl && !broken) {
    return (
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        data-testid={testId}
        onError={() => setBroken(true)}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: "cover",
          border: "1px solid var(--labs-border)",
          flexShrink: 0,
          background: "var(--labs-surface-elevated)",
        }}
      />
    );
  }

  return (
    <div
      data-testid={testId}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: computedFontSize,
        fontWeight: 600,
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {initial}
    </div>
  );
}
