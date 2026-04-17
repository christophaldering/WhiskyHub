import { Library } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CollectionBadgeProps {
  testId?: string;
  size?: "xs" | "sm";
  style?: React.CSSProperties;
}

export default function CollectionBadge({ testId, size = "sm", style }: CollectionBadgeProps) {
  const { t } = useTranslation();
  const isXs = size === "xs";
  return (
    <span
      data-testid={testId || "badge-in-collection"}
      title={t("inYourCollection", "In your collection")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: isXs ? "2px 6px" : "2px 8px",
        borderRadius: 999,
        background: "color-mix(in srgb, var(--labs-gold) 14%, transparent)",
        border: "1px solid color-mix(in srgb, var(--labs-gold) 45%, transparent)",
        color: "var(--labs-gold)",
        fontSize: isXs ? 9 : 10,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...style,
      }}
    >
      <Library className={isXs ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {t("inYourCollection", "In your collection")}
    </span>
  );
}
