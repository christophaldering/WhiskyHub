import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { communityApi, leaderboardApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { Users, ChevronLeft } from "lucide-react";

type Tab = "twins" | "rankings" | "leaderboard";
const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

export default function LabsCommunity() {
  const [, navigate] = useLocation();
  const session = getSession();
  const pid = session.pid;
  const [tab, setTab] = useState<Tab>("twins");
  const [rankings, setRankings] = useState<Array<Record<string, unknown>>>([]);
  const [leaderboard, setLeaderboard] = useState<Array<Record<string, unknown>>>([]);
  const [twins, setTwins] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  const tabs: Array<{ value: Tab; label: string }> = [
    { value: "twins", label: "Twins" },
    { value: "rankings", label: "Rankings" },
    { value: "leaderboard", label: "Leaderboard" },
  ];

  useEffect(() => {
    if (tab === "rankings") {
      setLoading(true);
      communityApi.getScores()
        .then((d: unknown) => { setRankings(Array.isArray(d) ? d : []); setLoading(false); })
        .catch(() => setLoading(false));
    } else if (tab === "leaderboard") {
      setLoading(true);
      leaderboardApi.get()
        .then((d: unknown) => {
          if (Array.isArray(d)) { setLeaderboard(d); }
          else if (d && typeof d === "object" && "mostActive" in d) {
            setLeaderboard((d as Record<string, unknown>).mostActive as Array<Record<string, unknown>> || []);
          } else { setLeaderboard([]); }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (tab === "twins" && pid) {
      setLoading(true);
      communityApi.getTasteTwins(pid)
        .then((d: unknown) => { setTwins(Array.isArray(d) ? d : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [tab, pid]);

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-community-page">
      <button
        onClick={() => navigate("/labs/circle")}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-community-back"
      >
        <ChevronLeft className="w-4 h-4" /> Circle
      </button>

      <div className="flex items-center gap-2.5 mb-1">
        <Users className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-community-title">
          Community
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
        Rankings, taste twins & leaderboard
      </p>

      <div className="flex gap-2 mb-6" data-testid="labs-community-tabs">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: tab === t.value ? "var(--labs-accent)" : "var(--labs-surface)",
              color: tab === t.value ? "var(--labs-bg)" : "var(--labs-text-muted)",
              border: `1px solid ${tab === t.value ? "var(--labs-accent)" : "var(--labs-border)"}`,
              cursor: "pointer",
            }}
            data-testid={`labs-community-tab-${t.value}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-10">
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Loading…</p>
        </div>
      )}

      {!loading && tab === "twins" && (
        <div data-testid="labs-community-twins">
          {!pid ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--labs-text-muted)" }}>Sign in to see your Taste Twins.</p>
          ) : twins.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--labs-text-muted)" }}>No taste twins found yet.</p>
          ) : (
            <div className="space-y-2">
              {twins.map((twin, i) => (
                <div key={i} className="labs-card p-4 flex items-center justify-between" data-testid={`labs-community-twin-${i}`}>
                  <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{twin.name as string}</span>
                  <div className="text-right">
                    <span className="labs-serif text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
                      {typeof twin.similarity === "number" ? `${Math.round(twin.similarity as number)}%` : String(twin.similarity)}
                    </span>
                    {twin.sharedWhiskies != null && (
                      <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{twin.sharedWhiskies as number} shared</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "rankings" && (
        <div data-testid="labs-community-rankings">
          {rankings.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--labs-text-muted)" }}>No rankings available yet.</p>
          ) : (
            <div className="space-y-2">
              {rankings.map((item, i) => (
                <div key={i} className="labs-card p-4 flex items-center gap-3" data-testid={`labs-community-ranking-${i}`}>
                  <span className="text-lg w-7 text-center">{i < 3 ? MEDALS[i] : <span className="text-xs font-bold" style={{ color: "var(--labs-text-muted)" }}>{i + 1}</span>}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>{item.whiskyName as string}</p>
                    {item.distillery && <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{item.distillery as string}</p>}
                  </div>
                  <div className="text-right">
                    <span className="labs-serif text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
                      {typeof item.avgScore === "number" ? (item.avgScore as number).toFixed(1) : String(item.avgScore)}
                    </span>
                    {item.count != null && <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{item.count as number} ratings</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "leaderboard" && (
        <div data-testid="labs-community-leaderboard">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--labs-text-muted)" }}>No leaderboard data yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div key={i} className="labs-card p-4 flex items-center gap-3" data-testid={`labs-community-leaderboard-${i}`}>
                  <span className="text-xs font-bold w-6 text-center" style={{ color: "var(--labs-text-muted)" }}>{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>{entry.name as string}</span>
                  <div className="text-right">
                    <span className="labs-serif text-sm font-bold" style={{ color: "var(--labs-accent)" }}>{entry.score as number}</span>
                    {entry.tastings != null && <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{entry.tastings as number} tastings</p>}
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
