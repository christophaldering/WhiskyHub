import { useParams } from "wouter";
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";
import { Trophy, ChevronDown, Download, ArrowLeft } from "lucide-react";
import { c, cardStyle } from "@/lib/theme";

interface WhiskyResult {
  whiskyId: string;
  name: string;
  distillery: string | null;
  age: string | null;
  abv: number | null;
  region: string | null;
  ratingCount: number;
  avgOverall: number | null;
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  avgBalance: number | null;
  ratings: Array<{
    participantId: string;
    overall: number | null;
    nose: number | null;
    taste: number | null;
    finish: number | null;
    balance: number | null;
    notes: string | null;
  }>;
}

interface ResultsData {
  tastingId: string;
  title: string;
  status: string;
  blindMode: boolean;
  whiskyCount: number;
  totalRatings: number;
  results: WhiskyResult[];
}

const medals = [c.gold, c.silver, c.bronze];

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = Math.min(value, 10) * 10;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: c.muted, width: 52, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: c.bg, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: c.accent, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 12, color: c.text, fontFamily: "monospace", width: 28, textAlign: "right", flexShrink: 0 }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function WhiskyResultCard({ result, rank }: { result: WhiskyResult; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = result.avgNose != null || result.avgTaste != null || result.avgFinish != null || result.avgBalance != null;
  const medalColor = rank < 3 ? medals[rank] : c.muted;

  return (
    <div style={cardStyle} data-testid={`card-result-${result.whiskyId}`}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: rank < 3 ? 14 : 13,
          fontWeight: 700,
          background: rank < 3 ? `${medalColor}20` : c.bg,
          color: medalColor,
          border: `1.5px solid ${rank < 3 ? medalColor + "60" : c.border}`,
          flexShrink: 0,
        }} data-testid={`badge-rank-${rank + 1}`}>
          {rank + 1}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: c.text,
            margin: "0 0 2px",
            fontFamily: "'Playfair Display', serif",
          }} data-testid={`text-result-name-${result.whiskyId}`}>
            {result.name}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 12, color: c.muted }}>
            {result.distillery && <span>{result.distillery}</span>}
            {result.distillery && (result.age || result.abv || result.region) && <span>·</span>}
            {result.age && <span>{result.age}y</span>}
            {result.abv && <span>{result.abv}%</span>}
            {result.region && <span>{result.region}</span>}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: rank === 0 ? c.gold : c.accent,
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1,
          }} data-testid={`text-avg-score-${result.whiskyId}`}>
            {result.avgOverall?.toFixed(1) ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
            {result.ratingCount} {result.ratingCount === 1 ? "rating" : "ratings"}
          </div>
        </div>
      </div>

      {hasDetails && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: c.muted,
              fontSize: 12,
              fontWeight: 500,
              padding: 0,
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid={`button-expand-${result.whiskyId}`}
          >
            <ChevronDown style={{
              width: 14,
              height: 14,
              transition: "transform 0.2s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }} />
            {expanded ? "Hide breakdown" : "Show breakdown"}
          </button>

          {expanded && (
            <div style={{ marginTop: 10, padding: "12px 0 0", borderTop: `1px solid ${c.border}` }}>
              <ScoreBar label="Nose" value={result.avgNose} />
              <ScoreBar label="Taste" value={result.avgTaste} />
              <ScoreBar label="Finish" value={result.avgFinish} />
              <ScoreBar label="Balance" value={result.avgBalance} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function exportCsv(data: ResultsData) {
  const header = "Rank,Whisky,Distillery,Region,Age,ABV,Avg Overall,Avg Nose,Avg Taste,Avg Finish,Avg Balance,Ratings";
  const rows = data.results.map((r, i) => {
    const esc = (v: string | null) => v ? `"${v.replace(/"/g, '""')}"` : "";
    return [
      i + 1,
      esc(r.name),
      esc(r.distillery),
      esc(r.region),
      esc(r.age),
      r.abv ?? "",
      r.avgOverall?.toFixed(1) ?? "",
      r.avgNose?.toFixed(1) ?? "",
      r.avgTaste?.toFixed(1) ?? "",
      r.avgFinish?.toFixed(1) ?? "",
      r.avgBalance?.toFixed(1) ?? "",
      r.ratingCount,
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.title.replace(/[^a-zA-Z0-9]/g, "_")}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TastingResultsPage() {
  const params = useParams<{ id: string }>();
  const tastingId = params.id;

  const { data, isLoading, error } = useQuery<ResultsData>({
    queryKey: ["tasting-results", tastingId],
    queryFn: () => fetch(`/api/tastings/${tastingId}/results`).then((r) => {
      if (!r.ok) throw new Error("Failed to load results");
      return r.json();
    }),
    enabled: !!tastingId,
  });

  if (isLoading) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: c.muted }}>Loading results…</p>
        </div>
      </SimpleShell>
    );
  }

  if (error || !data) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: c.muted }}>Could not load results.</p>
          <Link href="/host" style={{ color: c.accent, fontSize: 13, marginTop: 12, display: "inline-block" }}>
            Back to Host
          </Link>
        </div>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell maxWidth={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="tasting-results-page">
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <Trophy style={{ width: 28, height: 28, color: c.gold, marginBottom: 8 }} />
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            color: c.text,
            margin: "0 0 4px",
          }} data-testid="text-results-title">
            {data.title}
          </h1>
          <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
            {data.whiskyCount} {data.whiskyCount === 1 ? "whisky" : "whiskies"} · {data.totalRatings} {data.totalRatings === 1 ? "rating" : "ratings"}
          </p>
        </div>

        {data.results.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center" }} data-testid="text-no-results">
            <p style={{ color: c.muted, fontSize: 14, margin: 0 }}>No ratings submitted yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.results.map((result, i) => (
              <WhiskyResultCard key={result.whiskyId} result={result} rank={i} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {data.results.length > 0 && (
            <button
              onClick={() => exportCsv(data)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px",
                fontSize: 13,
                fontWeight: 600,
                background: `${c.accent}15`,
                color: c.accent,
                border: `1px solid ${c.accent}40`,
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid="button-export-csv"
            >
              <Download style={{ width: 14, height: 14 }} />
              Export CSV
            </button>
          )}
          <Link href="/host" style={{ textDecoration: "none", flex: 1 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px",
              fontSize: 13,
              fontWeight: 500,
              color: c.muted,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              cursor: "pointer",
            }} data-testid="button-back-to-host">
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back to Host
            </div>
          </Link>
        </div>
      </div>
    </SimpleShell>
  );
}
