import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { getSession } from "@/lib/session";
import { BookOpen, Star } from "lucide-react";

export default function M2TasteDrams() {
  const { t } = useTranslation();
  const session = getSession();

  const { data: journal = [], isLoading } = useQuery({
    queryKey: ["journal", session.pid],
    queryFn: async () => {
      if (!session.pid) return [];
      const res = await fetch(`/api/journal?participantId=${session.pid}`, {
        headers: { "x-participant-id": session.pid },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session.pid,
  });

  return (
    <div style={{ padding: "16px" }} data-testid="m2-taste-drams">
      <M2BackButton />
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "16px 0 12px" }}>
        {t("m2.taste.journal", "My Drams")}
      </h1>

      {!session.signedIn ? (
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14 }}>
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: 32, color: v.muted }}>{t("common.loading", "Loading...")}</div>
      ) : journal.length === 0 ? (
        <div style={{ background: v.elevated, borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
          <BookOpen style={{ width: 40, height: 40, color: v.muted, marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 6px" }}>
            {t("m2.taste.noDrams", "No drams yet")}
          </h3>
          <p style={{ fontSize: 13, color: v.textSecondary, margin: 0 }}>
            {t("m2.taste.noDramsDesc", "Start logging solo drams or join a tasting to build your collection.")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {journal.map((entry: any) => (
            <div
              key={entry.id}
              style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: "14px 16px" }}
              data-testid={`m2-dram-${entry.id}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{entry.whiskyName || "—"}</div>
                {entry.overallScore != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: v.accent }}>
                    <Star style={{ width: 14, height: 14 }} />
                    {entry.overallScore}
                  </div>
                )}
              </div>
              {entry.distillery && <div style={{ fontSize: 12, color: v.textSecondary, marginTop: 2 }}>{entry.distillery}</div>}
              {entry.date && <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>{new Date(entry.date).toLocaleDateString()}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
