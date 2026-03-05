import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { useState } from "react";
import { useLocation } from "wouter";
import { tastingApi } from "@/lib/api";
import { getSession } from "@/lib/session";

export default function M2TastingsHost() {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const session = getSession();

  const handleCreate = async () => {
    if (!session.pid) return;
    setLoading(true);
    try {
      const tasting = await tastingApi.create({
        title: title || t("m2.host.defaultTitle", "New Tasting"),
        hostId: session.pid,
        date: new Date().toISOString(),
      });
      if (tasting?.id) {
        navigate(`/m2/tastings/session/${tasting.id}/host`);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px" }} data-testid="m2-host-page">
      <M2BackButton />
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 24,
          fontWeight: 700,
          color: v.text,
          margin: "16px 0",
        }}
        data-testid="text-m2-host-title"
      >
        {t("m2.host.title", "Host a Tasting")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.host.subtitle", "Create a new tasting and invite your friends")}
      </p>

      {!session.signedIn && (
        <div style={{ background: v.elevated, borderRadius: 12, padding: 20, textAlign: "center", color: v.textSecondary }}>
          {t("m2.host.signInRequired", "Please sign in to host a tasting")}
        </div>
      )}

      {session.signedIn && (
        <>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("m2.host.titlePlaceholder", "Tasting name...")}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${v.border}`,
              background: v.inputBg,
              color: v.text,
              fontSize: 15,
              fontFamily: "system-ui, sans-serif",
              outline: "none",
              marginBottom: 16,
              boxSizing: "border-box",
            }}
            data-testid="input-host-title"
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              border: "none",
              background: v.accent,
              color: v.bg,
              fontWeight: 600,
              fontSize: 15,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="button-host-create"
          >
            {t("m2.host.create", "Create Tasting")}
          </button>
        </>
      )}
    </div>
  );
}
