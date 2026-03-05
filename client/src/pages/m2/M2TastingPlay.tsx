import { useTranslation } from "react-i18next";
import { useRoute, Link } from "wouter";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";

export default function M2TastingPlay() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/session/:id/play");
  const id = params?.id || "";

  return (
    <div style={{ padding: "16px" }} data-testid="m2-play-page">
      <M2BackButton />
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 24,
          fontWeight: 700,
          color: v.text,
          margin: "16px 0 12px",
        }}
        data-testid="text-m2-play-title"
      >
        {t("m2.play.title", "Tasting Room")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.play.subtitle", "Rate whiskies and share your tasting notes")}
      </p>

      <Link href={`/tasting-room-simple/${id}?from=/m2/tastings/session/${id}`} style={{ textDecoration: "none" }}>
        <div
          style={{
            background: v.accent,
            borderRadius: 12,
            padding: "16px",
            textAlign: "center",
            cursor: "pointer",
            color: v.bg,
            fontWeight: 600,
            fontSize: 15,
          }}
          data-testid="m2-enter-classic-room"
        >
          {t("m2.play.enterRoom", "Enter Tasting Room")}
        </div>
      </Link>
    </div>
  );
}
