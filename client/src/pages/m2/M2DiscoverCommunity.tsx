import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import { communityApi, leaderboardApi } from "@/lib/api";
import M2BackButton from "@/components/m2/M2BackButton";
import { Users } from "lucide-react";

type Tab = "twins" | "rankings" | "leaderboard";
const medals = ["🥇", "🥈", "🥉"];

const card: React.CSSProperties = { background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: "12px 16px" };

export default function M2DiscoverCommunity() {
  const { t } = useTranslation();
  const session = getSession();
  const pid = session.participantId;
  const [activeTab, setActiveTab] = useState<Tab>("twins");
  const [rankings, setRankings] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [twins, setTwins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const TABS: { value: Tab; label: string }[] = [
    { value: "twins", label: t("m2.discover.communityTabTwins", "Twins") },
    { value: "rankings", label: t("m2.discover.communityTabRankings", "Rankings") },
    { value: "leaderboard", label: t("m2.discover.communityTabLeaderboard", "Leaderboard") },
  ];

  useEffect(() => {
    if (activeTab === "rankings") {
      setLoading(true);
      communityApi.getScores().then((d: any) => { setRankings(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    } else if (activeTab === "leaderboard") {
      setLoading(true);
      leaderboardApi.get().then((d: any) => { setLeaderboard(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    } else if (activeTab === "twins" && pid) {
      setLoading(true);
      communityApi.getTasteTwins(pid).then((d: any) => { setTwins(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [activeTab, pid]);

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-community-page">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <Users style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-community-title">{t("m2.discover.communityTitle", "Community")}</h1>
      </div>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>{t("m2.discover.communitySubtitle", "Rankings, taste twins & leaderboard")}</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }} data-testid="m2-community-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            style={{
              padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: activeTab === tab.value ? v.accent : v.card,
              color: activeTab === tab.value ? v.bg : v.muted,
              transition: "all 0.2s",
            }}
            data-testid={`m2-tab-${tab.value}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: v.muted, textAlign: "center", padding: 40 }}>{t("m2.discover.communityLoading", "Loading…")}</p>}

      {!loading && activeTab === "twins" && (
        <div data-testid="m2-tab-content-twins">
          {!pid ? (
            <p style={{ color: v.muted, textAlign: "center", padding: 40 }}>{t("m2.discover.communitySignInTwins", "Sign in to see your Taste Twins.")}</p>
          ) : twins.length === 0 ? (
            <p style={{ color: v.muted, textAlign: "center", padding: 40 }}>{t("m2.discover.communityNoTwins", "No taste twins found yet.")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {twins.map((twin: any, i: number) => (
                <div key={i} style={card} data-testid={`m2-twin-${i}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: v.text, fontWeight: 600, fontSize: 14 }}>{twin.name}</span>
                    <span style={{ color: v.accent, fontWeight: 700, fontSize: 15 }}>{typeof twin.similarity === "number" ? `${Math.round(twin.similarity)}%` : twin.similarity}</span>
                  </div>
                  {twin.sharedWhiskies != null && <span style={{ color: v.muted, fontSize: 11, marginTop: 3, display: "block" }}>{t("m2.discover.communitySharedWhiskies", "{{count}} shared whiskies", { count: twin.sharedWhiskies })}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === "rankings" && (
        <div data-testid="m2-tab-content-rankings">
          {rankings.length === 0 ? (
            <p style={{ color: v.muted, textAlign: "center", padding: 40 }}>{t("m2.discover.communityNoRankings", "No rankings available yet.")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rankings.map((item: any, i: number) => (
                <div key={i} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }} data-testid={`m2-ranking-${i}`}>
                  <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{i < 3 ? medals[i] : <span style={{ color: v.muted, fontSize: 13 }}>{i + 1}</span>}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: v.text, fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.whiskyName}</div>
                    {item.distillery && <div style={{ color: v.muted, fontSize: 11 }}>{item.distillery}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: v.accent, fontWeight: 700, fontSize: 15 }}>{typeof item.avgScore === "number" ? item.avgScore.toFixed(1) : item.avgScore}</div>
                    {item.count != null && <div style={{ color: v.muted, fontSize: 10 }}>{t("m2.discover.communityRatings", "{{count}} ratings", { count: item.count })}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === "leaderboard" && (
        <div data-testid="m2-tab-content-leaderboard">
          {leaderboard.length === 0 ? (
            <p style={{ color: v.muted, textAlign: "center", padding: 40 }}>{t("m2.discover.communityNoLeaderboard", "No leaderboard data yet.")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {leaderboard.map((entry: any, i: number) => (
                <div key={i} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }} data-testid={`m2-leaderboard-${i}`}>
                  <span style={{ color: v.muted, fontWeight: 700, fontSize: 13, width: 22, textAlign: "center" }}>{i + 1}</span>
                  <span style={{ flex: 1, color: v.text, fontWeight: 600, fontSize: 13 }}>{entry.name}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: v.accent, fontWeight: 700, fontSize: 14 }}>{entry.score}</div>
                    {entry.tastings != null && <div style={{ color: v.muted, fontSize: 10 }}>{t("m2.discover.communityTastings", "{{count}} tastings", { count: entry.tastings })}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
