import { useState, useEffect, useMemo } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { Back, History, Search, Lock, Spinner, Trophy, CalendarIcon } from "../../icons";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";

interface HistTasting {
  id: string;
  tastingNumber: number;
  titleDe: string | null;
  titleEn: string | null;
  tastingDate: string | null;
  whiskyCount: number;
  avgTotalScore: number | null;
  winnerDistillery: string | null;
  winnerName: string | null;
  winnerScore: number | null;
}

interface HistAnalytics {
  totalTastings: number;
  totalEntries: number;
  regionBreakdown: Record<string, number>;
  smokyBreakdown: { smoky: number; nonSmoky: number; unknown: number };
}

interface HistoricalArchiveProps {
  onBack: () => void;
}

export default function HistoricalArchive({ onBack }: HistoricalArchiveProps) {
  const { th } = useV2Theme();
  const { t, lang } = useV2Lang();

  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [tastings, setTastings] = useState<HistTasting[]>([]);
  const [analytics, setAnalytics] = useState<HistAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pid = localStorage.getItem("casksense_participant_id") || "";
        const headers: Record<string, string> = {};
        if (pid) headers["x-participant-id"] = pid;

        const commRes = await fetch("/api/communities/mine", { headers });
        if (!commRes.ok) {
          if (!cancelled) { setIsMember(false); setLoading(false); }
          return;
        }
        const commData = await commRes.json();
        const member = (commData.communities?.length ?? 0) > 0;
        if (!cancelled) setIsMember(member);

        if (!member) {
          if (!cancelled) setLoading(false);
          return;
        }

        const [tastingsRes, analyticsRes] = await Promise.all([
          fetch(`/api/historical/tastings?limit=200&enriched=true`, { headers }),
          fetch("/api/historical/analytics", { headers }),
        ]);

        if (!cancelled) {
          if (tastingsRes.ok) {
            const td = await tastingsRes.json();
            setTastings(td.tastings ?? []);
          }
          if (analyticsRes.ok) {
            setAnalytics(await analyticsRes.json());
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setIsMember(false); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return tastings.filter((tast) => {
      if (search) {
        const title = (lang === "de" ? tast.titleDe : tast.titleEn) || tast.titleDe || "";
        if (!title.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [tastings, search, lang]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "\u2014";
    try {
      return new Date(dateStr).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { year: "numeric", month: "short" });
    } catch {
      return dateStr;
    }
  };

  const getTitle = (tast: HistTasting) =>
    (lang === "de" ? tast.titleDe : tast.titleEn) || tast.titleDe || `Tasting #${tast.tastingNumber}`;

  if (loading) {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
        <div style={{ textAlign: "center", padding: SP.xxl }}>
          <Spinner color={th.muted} size={24} />
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: SP.xs,
            background: "none",
            border: "none",
            color: th.muted,
            fontSize: 14,
            fontFamily: FONT.body,
            cursor: "pointer",
            marginBottom: SP.md,
            minHeight: TOUCH_MIN,
            padding: 0,
          }}
          data-testid="button-back-history"
        >
          <Back color={th.muted} size={18} />
          {t.entTitle}
        </button>

        <div style={{ textAlign: "center", padding: `${SP.xxl}px ${SP.md}px` }} data-testid="history-gate">
          <div
            style={{
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              padding: `${SP.xl}px ${SP.lg}px`,
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            <Lock color={th.muted} size={40} style={{ marginBottom: SP.md }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>{t.historyGated}</p>
            <p style={{ fontSize: 13, color: th.muted }}>{t.historyJoin}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalTastings = analytics?.totalTastings ?? 0;
  const totalWhiskies = analytics?.totalEntries ?? 0;
  const regionCount = analytics ? Object.keys(analytics.regionBreakdown).length : 0;
  const smokyPct = analytics && analytics.totalEntries > 0
    ? Math.round((analytics.smokyBreakdown.smoky / analytics.totalEntries) * 100)
    : 0;

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.xs,
          background: "none",
          border: "none",
          color: th.muted,
          fontSize: 14,
          fontFamily: FONT.body,
          cursor: "pointer",
          marginBottom: SP.md,
          minHeight: TOUCH_MIN,
          padding: 0,
        }}
        data-testid="button-back-history"
      >
        <Back color={th.muted} size={18} />
        {t.entTitle}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
        <History color={th.gold} size={22} />
        <h1
          style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, margin: 0 }}
          data-testid="text-history-title"
        >
          {t.entHistory}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: th.muted, marginBottom: SP.md }}>{t.entHistorySub}</p>

      {analytics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP.sm, marginBottom: SP.md }}>
          {[
            { value: totalTastings, label: "Tastings" },
            { value: totalWhiskies, label: "Whiskies" },
            { value: regionCount, label: lang === "de" ? "Regionen" : "Regions" },
            { value: `${smokyPct}%`, label: t.entHistSmoky },
          ].map(({ value, label }) => (
            <div
              key={label}
              style={{
                background: th.bgCard,
                border: `1px solid ${th.border}`,
                borderRadius: RADIUS.md,
                padding: `${SP.md}px ${SP.sm}px`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: th.gold, fontVariantNumeric: "tabular-nums" }}>{value}</div>
              <div style={{ fontSize: 10, color: th.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "relative", marginBottom: SP.sm }}>
        <Search color={th.muted} size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.entHistSearch}
          style={{
            width: "100%",
            boxSizing: "border-box",
            height: TOUCH_MIN,
            paddingLeft: 36,
            paddingRight: SP.md,
            background: th.inputBg,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.md,
            color: th.text,
            fontSize: 14,
            fontFamily: FONT.body,
            outline: "none",
          }}
          data-testid="input-history-search"
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: SP.xxl }} data-testid="text-history-empty">
          <History color={th.faint} size={40} style={{ marginBottom: SP.md }} />
          <p style={{ fontSize: 14, color: th.muted }}>
            {search ? (lang === "de" ? "Keine Ergebnisse." : "No results found.") : (lang === "de" ? "Noch keine historischen Tastings." : "No historical tastings yet.")}
          </p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: th.muted, marginBottom: SP.sm }}>{filtered.length} tastings</div>
          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
            {filtered.map((tast) => {
              const winnerLabel = [tast.winnerDistillery, tast.winnerName].filter(Boolean).join(" \u2014 ");
              return (
                <div
                  key={tast.id}
                  style={{
                    background: th.bgCard,
                    border: `1px solid ${th.border}`,
                    borderRadius: RADIUS.md,
                    padding: `14px ${SP.md}px`,
                    cursor: "pointer",
                  }}
                  data-testid={`history-card-${tast.tastingNumber}`}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: SP.md }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: th.phases.palate.dim,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: th.gold, fontVariantNumeric: "tabular-nums" }}>
                        #{tast.tastingNumber}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {getTitle(tast)}
                      </div>
                      <div style={{ display: "flex", gap: SP.md, fontSize: 12, color: th.muted, marginTop: 3, flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <CalendarIcon color={th.muted} size={11} /> {formatDate(tast.tastingDate)}
                        </span>
                        <span>{tast.whiskyCount} whiskies</span>
                        {tast.avgTotalScore != null && (
                          <span>\u00d8 {Math.round(tast.avgTotalScore * 10) / 10}/100</span>
                        )}
                      </div>
                      {winnerLabel && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 12, color: th.gold }}>
                          <Trophy color={th.gold} size={11} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{winnerLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
