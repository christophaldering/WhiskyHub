import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { Crown, Users, Wine, ChevronRight } from "lucide-react";

export default function M2TastingSession() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/session/:id");
  const id = params?.id || "";
  const session = getSession();

  const { data: tasting, isLoading } = useQuery({
    queryKey: ["tasting", id],
    queryFn: () => tastingApi.get(id),
    enabled: !!id,
  });

  const { data: whiskies = [] } = useQuery({
    queryKey: ["whiskies", id],
    queryFn: () => whiskyApi.getForTasting(id),
    enabled: !!id,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["ratings", id],
    queryFn: () => ratingApi.getForTasting(id),
    enabled: !!id,
  });

  const isHost = tasting?.hostId === session.pid;

  if (isLoading) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: v.muted }}>
        {t("common.loading", "Loading...")}
      </div>
    );
  }

  if (!tasting) {
    return (
      <div style={{ padding: 16 }}>
        <M2BackButton />
        <div style={{ textAlign: "center", padding: 32, color: v.muted }}>
          {t("m2.session.notFound", "Tasting not found")}
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: v.success,
    closed: v.accent,
    reveal: v.accent,
    archived: v.muted,
    draft: v.muted,
  };

  return (
    <div style={{ padding: "16px" }} data-testid="m2-session-page">
      <M2BackButton />

      <div style={{ marginTop: 12 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: v.text,
            margin: "0 0 4px",
          }}
          data-testid="text-m2-session-title"
        >
          {tasting.title || t("m2.tastings.untitled", "Untitled Tasting")}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              color: statusColors[tasting.status] || v.muted,
              letterSpacing: "0.05em",
            }}
            data-testid="text-session-status"
          >
            {tasting.status}
          </span>
          {tasting.date && (
            <span style={{ fontSize: 12, color: v.muted }}>
              {new Date(tasting.date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {isHost && (
          <Link href={`/m2/tastings/session/${id}/host`} style={{ textDecoration: "none", flex: 1 }}>
            <div
              style={{
                background: v.accent,
                borderRadius: 12,
                padding: "14px 16px",
                textAlign: "center",
                cursor: "pointer",
                color: v.bg,
                fontWeight: 600,
                fontSize: 14,
              }}
              data-testid="m2-host-control-btn"
            >
              <Crown style={{ width: 18, height: 18, marginBottom: 4 }} />
              <div>{t("m2.session.hostControl", "Host Control")}</div>
            </div>
          </Link>
        )}
        <Link href={`/m2/tastings/session/${id}/play`} style={{ textDecoration: "none", flex: 1 }}>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              textAlign: "center",
              cursor: "pointer",
              color: v.text,
              fontWeight: 600,
              fontSize: 14,
            }}
            data-testid="m2-play-btn"
          >
            <Wine style={{ width: 18, height: 18, marginBottom: 4, color: v.accent }} />
            <div>{t("m2.session.enterRoom", "Enter Tasting Room")}</div>
          </div>
        </Link>
      </div>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 12 }}>
          {t("m2.session.lineup", "Line-up")} ({whiskies.length})
        </h2>
        {whiskies.length === 0 && (
          <div style={{ color: v.muted, fontSize: 13 }}>
            {t("m2.session.noWhiskies", "No whiskies added yet")}
          </div>
        )}
        {whiskies.map((w: any, i: number) => (
          <div
            key={w.id}
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
            data-testid={`m2-whisky-${w.id}`}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: v.accent, minWidth: 24 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: v.text }}>
                {w.name || t("m2.session.unknownWhisky", "Unknown")}
              </div>
              {w.distillery && (
                <div style={{ fontSize: 12, color: v.muted }}>{w.distillery}</div>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
