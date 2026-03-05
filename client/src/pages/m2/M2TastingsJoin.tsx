import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { useState } from "react";
import { useLocation } from "wouter";
import { tastingApi } from "@/lib/api";
import { getSession } from "@/lib/session";

export default function M2TastingsJoin() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const session = getSession();

  const handleJoin = async () => {
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const tasting = await tastingApi.getByCode(code.trim().toUpperCase());
      if (tasting && tasting.id) {
        if (session.pid) {
          await tastingApi.join(tasting.id, session.pid, code.trim().toUpperCase());
        }
        navigate(`/m2/tastings/session/${tasting.id}`);
      }
    } catch (e: any) {
      setError(e.message || t("m2.join.error", "Could not find tasting"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px" }} data-testid="m2-join-page">
      <M2BackButton />
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 24,
          fontWeight: 700,
          color: v.text,
          margin: "16px 0",
        }}
        data-testid="text-m2-join-title"
      >
        {t("m2.join.title", "Join Tasting")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.join.subtitle", "Enter the tasting code to join")}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("m2.join.placeholder", "Tasting Code")}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 10,
            border: `1px solid ${v.border}`,
            background: v.inputBg,
            color: v.text,
            fontSize: 16,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.1em",
            outline: "none",
          }}
          data-testid="input-join-code"
        />
        <button
          onClick={handleJoin}
          disabled={loading || !code.trim()}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: v.accent,
            color: v.bg,
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? "wait" : "pointer",
            opacity: loading || !code.trim() ? 0.5 : 1,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="button-join-submit"
        >
          {t("m2.join.button", "Join")}
        </button>
      </div>

      {error && (
        <div style={{ color: v.error, fontSize: 13, marginTop: 8 }} data-testid="text-join-error">
          {error}
        </div>
      )}
    </div>
  );
}
