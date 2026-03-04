import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import SimpleShell from "@/components/simple/simple-shell";
import { communityApi, leaderboardApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { c } from "@/lib/theme";

type Tab = "twins" | "rankings" | "leaderboard";

const TABS: { value: Tab; label: string }[] = [
  { value: "twins", label: "Twins" },
  { value: "rankings", label: "Rankings" },
  { value: "leaderboard", label: "Leaderboard" },
];

const medals = ["🥇", "🥈", "🥉"];

export default function DiscoverCommunityNative() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const tabParam = params.get("tab");
  const initialTab: Tab = (tabParam === "rankings" || tabParam === "leaderboard") ? tabParam : "twins";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const participant = useAppStore((s) => s.currentParticipant);

  const [rankings, setRankings] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [twins, setTwins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "rankings") {
      setLoading(true);
      communityApi.getScores().then((d: any) => { setRankings(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    } else if (activeTab === "leaderboard") {
      setLoading(true);
      leaderboardApi.get().then((d: any) => { setLeaderboard(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    } else if (activeTab === "twins" && participant?.id) {
      setLoading(true);
      communityApi.getTasteTwins(participant.id).then((d: any) => { setTwins(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [activeTab, participant?.id]);

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    background: active ? c.accent : c.card,
    color: active ? "#1a1714" : c.muted,
    transition: "all 0.2s",
  });

  return (
    <SimpleShell>
      <div data-testid="discover-community-native-page">
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: c.text, marginBottom: 20 }} data-testid="text-community-native-title">
          Community
        </h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }} data-testid="community-native-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={pillStyle(activeTab === tab.value)}
              data-testid={`tab-${tab.value}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <p style={{ color: c.muted, textAlign: "center", padding: 40 }}>Loading…</p>
        )}

        {!loading && activeTab === "twins" && (
          <div data-testid="tab-content-twins">
            {!participant?.id ? (
              <p style={{ color: c.muted, textAlign: "center", padding: 40 }}>Sign in to see your Taste Twins.</p>
            ) : twins.length === 0 ? (
              <p style={{ color: c.muted, textAlign: "center", padding: 40 }}>No taste twins found yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {twins.map((twin: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: c.card,
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      padding: 16,
                    }}
                    data-testid={`card-twin-${i}`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: c.text, fontWeight: 600, fontSize: 15 }} data-testid={`text-twin-name-${i}`}>{twin.name}</span>
                      <span style={{ color: c.accent, fontWeight: 700, fontSize: 16 }} data-testid={`text-twin-similarity-${i}`}>
                        {typeof twin.similarity === "number" ? `${Math.round(twin.similarity)}%` : twin.similarity}
                      </span>
                    </div>
                    {twin.sharedWhiskies != null && (
                      <span style={{ color: c.muted, fontSize: 12, marginTop: 4, display: "block" }}>
                        {twin.sharedWhiskies} shared whiskies
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === "rankings" && (
          <div data-testid="tab-content-rankings">
            {rankings.length === 0 ? (
              <p style={{ color: c.muted, textAlign: "center", padding: 40 }}>No rankings available yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rankings.map((item: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: c.card,
                      border: `1px solid ${c.border}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                    data-testid={`row-ranking-${i}`}
                  >
                    <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>
                      {i < 3 ? medals[i] : <span style={{ color: c.muted, fontSize: 14 }}>{i + 1}</span>}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: c.text, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-testid={`text-ranking-name-${i}`}>
                        {item.whiskyName}
                      </div>
                      {item.distillery && (
                        <div style={{ color: c.muted, fontSize: 12 }}>{item.distillery}</div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: c.accent, fontWeight: 700, fontSize: 16 }} data-testid={`text-ranking-score-${i}`}>
                        {typeof item.avgScore === "number" ? item.avgScore.toFixed(1) : item.avgScore}
                      </div>
                      {item.count != null && (
                        <div style={{ color: c.muted, fontSize: 11 }}>{item.count} ratings</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === "leaderboard" && (
          <div data-testid="tab-content-leaderboard">
            {leaderboard.length === 0 ? (
              <p style={{ color: c.muted, textAlign: "center", padding: 40 }}>No leaderboard data yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {leaderboard.map((entry: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: c.card,
                      border: `1px solid ${c.border}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                    data-testid={`row-leaderboard-${i}`}
                  >
                    <span style={{ color: c.muted, fontWeight: 700, fontSize: 14, width: 24, textAlign: "center" }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, color: c.text, fontWeight: 600, fontSize: 14 }} data-testid={`text-leaderboard-name-${i}`}>
                      {entry.name}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: c.accent, fontWeight: 700, fontSize: 15 }} data-testid={`text-leaderboard-score-${i}`}>
                        {entry.score}
                      </div>
                      {entry.tastings != null && (
                        <div style={{ color: c.muted, fontSize: 11 }}>{entry.tastings} tastings</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SimpleShell>
  );
}
