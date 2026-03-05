import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { getSession } from "@/lib/session";
import { Wine } from "lucide-react";

export default function M2TasteCollection() {
  const { t } = useTranslation();
  const session = getSession();

  const { data: collection = [], isLoading } = useQuery({
    queryKey: ["collection", session.pid],
    queryFn: async () => {
      if (!session.pid) return [];
      const res = await fetch(`/api/collection?participantId=${session.pid}`, {
        headers: { "x-participant-id": session.pid },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session.pid,
  });

  return (
    <div style={{ padding: "16px" }} data-testid="m2-taste-collection">
      <M2BackButton />
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "16px 0 12px" }}>
        {t("m2.taste.collection", "Collection")}
      </h1>

      {!session.signedIn ? (
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14 }}>
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: 32, color: v.muted }}>{t("common.loading", "Loading...")}</div>
      ) : collection.length === 0 ? (
        <div style={{ background: v.elevated, borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
          <Wine style={{ width: 40, height: 40, color: v.muted, marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 6px" }}>
            {t("m2.taste.noCollection", "No bottles yet")}
          </h3>
          <p style={{ fontSize: 13, color: v.textSecondary, margin: 0 }}>
            {t("m2.taste.noCollectionDesc", "Import your Whiskybase collection or add bottles manually.")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {collection.map((bottle: any) => (
            <div
              key={bottle.id}
              style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: "14px 16px" }}
              data-testid={`m2-bottle-${bottle.id}`}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{bottle.name || "—"}</div>
              {bottle.distillery && <div style={{ fontSize: 12, color: v.textSecondary, marginTop: 2 }}>{bottle.distillery}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
