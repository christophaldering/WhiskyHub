import { Wine } from "lucide-react";

const GRADIENTS = [
  ["#8B6914", "#C4A35A"],
  ["#6B4226", "#A0714F"],
  ["#5C3D2E", "#8B6B4F"],
  ["#7B6544", "#B8A07A"],
  ["#4A3728", "#7D6550"],
  ["#8B4513", "#CD853F"],
  ["#6E4B3A", "#A67B5B"],
  ["#5D4037", "#8D6E63"],
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface WhiskyImageProps {
  imageUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
  testId?: string;
}

export default function WhiskyImage({ imageUrl, name, size = 44, className = "", testId }: WhiskyImageProps) {
  const radius = size >= 40 ? 12 : 8;
  const iconSize = Math.max(16, Math.round(size * 0.4));
  const fontSize = Math.max(12, Math.round(size * 0.35));

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`flex-shrink-0 object-cover ${className}`}
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

  const idx = hashName(name) % GRADIENTS.length;
  const [from, to] = GRADIENTS[idx];
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        border: "1px solid var(--labs-border)",
      }}
      data-testid={testId}
    >
      {size >= 32 ? (
        <span
          style={{
            fontSize,
            fontWeight: 700,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1,
            fontFamily: "var(--labs-font-serif, Georgia, serif)",
          }}
        >
          {initial}
        </span>
      ) : (
        <Wine style={{ width: iconSize, height: iconSize, color: "rgba(255,255,255,0.7)" }} />
      )}
    </div>
  );
}
