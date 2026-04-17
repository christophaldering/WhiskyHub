import { BookmarkCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WishlistBadgeProps {
  testId?: string;
  size?: "xs" | "sm";
  style?: React.CSSProperties;
}

export default function WishlistBadge({ testId, size = "sm", style }: WishlistBadgeProps) {
  const { t } = useTranslation();
  const isXs = size === "xs";
  return (
    <span
      data-testid={testId || "badge-on-wishlist"}
      title={t("onYourWishlist", "On your wishlist")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: isXs ? "2px 6px" : "2px 8px",
        borderRadius: 999,
        background: "color-mix(in srgb, var(--labs-accent) 14%, transparent)",
        border: "1px solid color-mix(in srgb, var(--labs-accent) 45%, transparent)",
        color: "var(--labs-accent)",
        fontSize: isXs ? 9 : 10,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...style,
      }}
    >
      <BookmarkCheck className={isXs ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {t("onYourWishlist", "On your wishlist")}
    </span>
  );
}
