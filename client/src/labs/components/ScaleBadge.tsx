import { useTranslation } from "react-i18next";

interface ScaleBadgeProps {
  max: number;
  size?: "sm" | "md";
}

export default function ScaleBadge({ max, size = "sm" }: ScaleBadgeProps) {
  const { t } = useTranslation();
  const fontSize = size === "sm" ? 10 : 12;
  const padding = size === "sm" ? "2px 8px" : "3px 10px";

  return (
    <span
      data-testid="badge-scale"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize,
        fontWeight: 600,
        fontFamily: "inherit",
        padding,
        borderRadius: 9999,
        background: "rgba(200, 134, 26, 0.15)",
        color: "#c8861a",
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}
    >
      {t("m2.taste.rating.scaleLabel", { max, defaultValue: `Scale 1–${max}` })}
    </span>
  );
}
