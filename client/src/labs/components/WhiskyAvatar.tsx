import { Wine } from "lucide-react";

const REGION_COLORS: Record<string, string> = {
  Speyside: "#D4A574",
  Highland: "#8B6F47",
  Highlands: "#8B6F47",
  Islay: "#5A7A6F",
  Island: "#6B8E9F",
  Islands: "#6B8E9F",
  Lowland: "#A3B18A",
  Lowlands: "#A3B18A",
  Campbeltown: "#B07D62",
  Kentucky: "#C4813D",
  Japan: "#9B4D5E",
  Ireland: "#6D9B76",
  India: "#C2955A",
  Taiwan: "#7A8FA8",
};

function getColorForWhisky(name?: string | null, region?: string | null): string {
  if (region && REGION_COLORS[region]) return REGION_COLORS[region];
  if (!name) return "var(--labs-accent)";
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const palette = ["#D4A574", "#8B6F47", "#5A7A6F", "#6B8E9F", "#B07D62", "#C4813D", "#9B4D5E"];
  return palette[hash % palette.length];
}

interface WhiskyAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  region?: string | null;
  size?: number;
  className?: string;
  testId?: string;
}

export default function WhiskyAvatar({ imageUrl, name, region, size = 44, className = "", testId }: WhiskyAvatarProps) {
  const radius = size >= 48 ? 16 : size >= 36 ? 12 : 8;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || "Whisky"}
        className={`object-cover flex-shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          border: "1px solid var(--labs-border)",
        }}
        data-testid={testId}
      />
    );
  }

  const color = getColorForWhisky(name, region);
  const initial = (name || "W").charAt(0).toUpperCase();
  const iconSize = size >= 48 ? 24 : size >= 36 ? 18 : 14;
  const fontSize = size >= 48 ? 20 : size >= 36 ? 15 : 11;

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${color}22`,
        border: `1px solid ${color}44`,
      }}
      data-testid={testId}
    >
      {name ? (
        <span style={{ color, fontSize, fontWeight: 700, fontFamily: "var(--labs-serif, Georgia, serif)" }}>
          {initial}
        </span>
      ) : (
        <Wine style={{ width: iconSize, height: iconSize, color }} />
      )}
    </div>
  );
}
