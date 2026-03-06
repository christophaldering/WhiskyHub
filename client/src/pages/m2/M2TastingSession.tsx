import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { Crown, Users, Wine, ChevronRight, Copy, Check, QrCode, User, Image as ImageIcon } from "lucide-react";
import QRCode from "qrcode";

export default function M2TastingSession() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/session/:id");
  const id = params?.id || "";
  const session = getSession();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

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

  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", id],
    queryFn: () => tastingApi.getParticipants(id),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const isHost = tasting?.hostId === session.pid;

  useEffect(() => {
    if (tasting?.code) {
      const joinUrl = `${window.location.origin}/m2/tastings/join?code=${tasting.code}`;
      QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#1a1714", light: "#f5f0e8" },
      }).then(setQrDataUrl).catch(() => {});
    }
  }, [tasting?.code]);

  const handleCopyCode = () => {
    if (!tasting?.code) return;
    navigator.clipboard.writeText(tasting.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

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

      {tasting.coverImageUrl && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 180,
            borderRadius: 14,
            overflow: "hidden",
            marginTop: 12,
            marginBottom: 16,
          }}
          data-testid="m2-session-cover"
        >
          <img
            src={tasting.coverImageUrl}
            alt={tasting.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            data-testid="img-m2-session-cover"
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
            }}
          />
        </div>
      )}

      <div style={{ marginTop: tasting.coverImageUrl ? 0 : 12 }}>
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
          {tasting.location && (
            <span style={{ fontSize: 12, color: v.muted }}>
              · {tasting.location}
            </span>
          )}
        </div>
      </div>

      {tasting.code && (
        <div
          style={{
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            textAlign: "center",
          }}
          data-testid="m2-session-code-section"
        >
          <div style={{ fontSize: 12, color: v.muted, marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {t("m2.session.joinCode", "Join Code")}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.15em",
                fontFamily: "monospace",
                color: v.accent,
              }}
              data-testid="text-session-code"
            >
              {tasting.code}
            </span>
            <button
              onClick={handleCopyCode}
              style={{
                background: "none",
                border: `1px solid ${v.border}`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                color: codeCopied ? v.success : v.muted,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
              }}
              data-testid="button-copy-code"
            >
              {codeCopied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
              {codeCopied ? t("common.copied", "Copied") : t("common.copy", "Copy")}
            </button>
          </div>

          {qrDataUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <img
                src={qrDataUrl}
                alt="QR Code"
                style={{ width: 160, height: 160, borderRadius: 10 }}
                data-testid="img-session-qr"
              />
              <span style={{ fontSize: 11, color: v.muted }}>
                {t("m2.session.scanToJoin", "Scan to join this tasting")}
              </span>
            </div>
          )}
        </div>
      )}

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

      {participants.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Users style={{ width: 16, height: 16, color: v.accent }} />
            {t("m2.session.participants", "Participants")} ({participants.length})
          </h2>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
            data-testid="m2-participants-list"
          >
            {participants.map((p: any, i: number) => (
              <div
                key={p.id || i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderBottom: i < participants.length - 1 ? `1px solid ${v.border}` : "none",
                }}
                data-testid={`m2-participant-${p.id || i}`}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: v.elevated,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <User style={{ width: 14, height: 14, color: v.muted }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name || t("m2.session.anonymous", "Anonymous")}
                  </div>
                </div>
                {p.id === tasting.hostId && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: v.accent,
                      background: `color-mix(in srgb, ${v.accent} 12%, transparent)`,
                      padding: "2px 8px",
                      borderRadius: 6,
                    }}
                    data-testid="badge-host"
                  >
                    {t("m2.session.host", "Host")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
