import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Activity, Target, TrendingDown, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { getParticipantId, pidHeaders } from "@/lib/api";

interface LiveSnapshot {
  generatedAt: number;
  activeCount: number;
  sessions: Array<{ shortCode: string; firstSeen: number; lastSeen: number; currentPage: string; source: string; device: string; country: string; language: string; eventCount: number }>;
  byPage: Record<string, number>;
  feed: Array<{ ts: number; page: string; type: string; source: string; device: string; country: string; shortCode: string }>;
}

interface FunnelSummary {
  rangeHours: number;
  totals: Record<string, number>;
  topSources: Array<{ source: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  histograms: Record<string, Array<{ label: string; count: number }>>;
  signupFunnel: { view: number; firstFocus: number; submitAttempt: number; submitSuccess: number; dropoffPct: number };
  storyFunnel: { view: number; engaged: number; finished: number; ctaClick: number };
  hourly: Array<{ hour: string; storyView: number; landingView: number; signupSuccess: number }>;
}

interface AnomalyItem { hour: string; metric: string; current: number; median7d: number; deltaPct: number; message: string }

const REFRESH_MS = 5000;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { ...(init?.headers || {}), ...pidHeaders() } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function rel(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `vor ${s}s`;
  const m = Math.floor(s / 60); const r = s % 60;
  return r ? `vor ${m}m ${r}s` : `vor ${m}m`;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon className={`w-5 h-5 mx-auto mb-1 ${color || "text-primary"}`} />
        <div className="text-2xl font-bold font-serif" data-testid={`live-kpi-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function FunnelLivePage() {
  const [, navigate] = useLocation();
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [hours, setHours] = useState(24);
  const [filterSource, setFilterSource] = useState("");
  const [aiText, setAiText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>("");
  const [error, setError] = useState<string>("");

  const pid = getParticipantId();

  useEffect(() => {
    if (!pid) { navigate("/"); return; }
  }, [pid, navigate]);

  const loadLive = async () => {
    try { setLive(await api<LiveSnapshot>("/api/admin/funnel/live")); }
    catch (e) { setError(`Live: ${(e as Error).message}`); }
  };
  const loadSummary = async () => {
    try {
      const qs = new URLSearchParams({ hours: String(hours) });
      if (filterSource) qs.set("utmSource", filterSource);
      setSummary(await api<FunnelSummary>(`/api/admin/funnel/summary?${qs}`));
    } catch (e) { setError(`Summary: ${(e as Error).message}`); }
  };
  const loadAnomalies = async () => {
    try { const r = await api<{ anomalies: AnomalyItem[] }>("/api/admin/funnel/anomalies"); setAnomalies(r.anomalies || []); }
    catch {}
  };

  useEffect(() => {
    loadLive(); loadSummary(); loadAnomalies();
    const t = setInterval(loadLive, REFRESH_MS);
    const t2 = setInterval(loadSummary, 60000);
    return () => { clearInterval(t); clearInterval(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, filterSource]);

  const askAI = async () => {
    setAiLoading(true); setAiError(""); setAiText("");
    try {
      const r = await api<{ available: boolean; text?: string; reason?: string; cached?: boolean }>("/api/admin/funnel/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, utmSource: filterSource || undefined }),
      });
      if (r.available && r.text) setAiText(r.text + (r.cached ? "\n\n(zwischengespeichert, max. 1h alt)" : ""));
      else setAiError(r.reason || "KI nicht verfügbar");
    } catch (e) { setAiError((e as Error).message); }
    finally { setAiLoading(false); }
  };

  const dropoffRows = useMemo(() => {
    if (!summary) return [] as Array<{ stage: string; count: number; lossFromPrev: number }>;
    const sf = summary.storyFunnel; const su = summary.signupFunnel;
    const stages = [
      { stage: "Story aufgerufen", count: sf.view },
      { stage: "Story engaged (≥30s)", count: sf.engaged },
      { stage: "Story Ende erreicht", count: sf.finished },
      { stage: "Story-CTA geklickt", count: sf.ctaClick },
      { stage: "Anmelde-Screen gesehen", count: su.view },
      { stage: "Erstes Anmelde-Feld berührt", count: su.firstFocus },
      { stage: "Anmelde-Submit versucht", count: su.submitAttempt },
      { stage: "Anmelde-Erfolg", count: su.submitSuccess },
    ];
    return stages.map((s, i) => ({ ...s, lossFromPrev: i === 0 ? 0 : Math.max(0, stages[i - 1].count - s.count) }));
  }, [summary]);

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl" data-testid="page-funnel-live">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Funnel · Live</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Aggregierte Counter, keine Cookies. Live-Sessions sind flüchtig (max. 5 Min) und werden nicht gespeichert.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={hours} onChange={e => setHours(parseInt(e.target.value, 10))}
            className="text-xs h-8 px-2 rounded border bg-background"
            data-testid="select-funnel-hours">
            <option value={1}>1h</option>
            <option value={6}>6h</option>
            <option value={24}>24h</option>
            <option value={168}>7 Tage</option>
            <option value={720}>30 Tage</option>
          </select>
          <input
            type="text"
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            placeholder="UTM-Source filtern (z.B. whatsapp)"
            className="text-xs h-8 px-2 rounded border bg-background w-56"
            data-testid="input-utm-filter"
          />
          <Button variant="outline" size="sm" onClick={() => { loadLive(); loadSummary(); loadAnomalies(); }} data-testid="button-refresh-funnel">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {error && <div className="text-xs text-destructive">{error}</div>}

      {anomalies.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="space-y-1 text-sm">
              {anomalies.map((a, i) => (
                <div key={i} data-testid={`anomaly-${a.metric}`}>{a.message}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Aktiv jetzt" value={live?.activeCount ?? "—"} sub="In-Memory, 5 min TTL" color="text-green-500" />
        <StatCard icon={Activity} label="Story-Aufrufe" value={summary?.storyFunnel.view ?? "—"} sub={`Engaged ${summary?.storyFunnel.engaged ?? 0} · Finished ${summary?.storyFunnel.finished ?? 0}`} />
        <StatCard icon={Target} label="Anmelde-Erfolge" value={summary?.signupFunnel.submitSuccess ?? "—"} sub={`Drop-off ${summary?.signupFunnel.dropoffPct ?? 0}%`} color="text-amber-500" />
        <StatCard icon={TrendingDown} label="PDF-Downloads" value={summary?.totals?.pdf_download ?? 0} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> KI-Auswertung "Erkläre mir das"
            </h3>
            <Button size="sm" onClick={askAI} disabled={aiLoading} data-testid="button-ai-analyze">
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              Analysieren
            </Button>
          </div>
          {aiError && <div className="text-xs text-destructive">{aiError}</div>}
          {aiText && <pre className="text-sm whitespace-pre-wrap font-sans" data-testid="ai-analysis-text">{aiText}</pre>}
          {!aiError && !aiText && !aiLoading && (
            <p className="text-xs text-muted-foreground">Klicke "Analysieren", um eine KI-Klartext-Auswertung der gewählten Periode zu erhalten.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-serif font-semibold text-sm mb-3">Master-Funnel (statistische Schätzung)</h3>
          <div className="space-y-1.5">
            {dropoffRows.map((row, i) => {
              const max = dropoffRows[0]?.count || 1;
              const pct = Math.round((row.count / max) * 100);
              const isLoss = row.lossFromPrev > 0;
              return (
                <div key={i} className="flex items-center gap-3 text-xs" data-testid={`funnel-stage-${i}`}>
                  <div className="w-48 truncate">{row.stage}</div>
                  <div className="flex-1 h-5 rounded bg-muted/40 overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: i === 0 ? "hsl(var(--primary))" : (isLoss ? "hsl(var(--destructive)/0.6)" : "hsl(var(--primary)/0.7)") }} />
                  </div>
                  <div className="w-16 text-right font-mono">{row.count}</div>
                  {i > 0 && <div className="w-20 text-right text-muted-foreground">−{row.lossFromPrev}</div>}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Übergänge sind Aggregat-Schätzungen, keine individuelle Verfolgung.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3">Aktive Sessions ({live?.activeCount ?? 0})</h3>
            <div className="space-y-1 max-h-72 overflow-y-auto text-xs">
              {(live?.sessions || []).map(s => (
                <div key={s.shortCode} className="flex items-center justify-between gap-2 py-1 border-b border-muted/30" data-testid={`live-session-${s.shortCode}`}>
                  <Badge variant="outline" className="font-mono text-[10px]">{s.shortCode}</Badge>
                  <div className="flex-1 truncate">{s.currentPage}</div>
                  <div className="text-muted-foreground">{s.source || "direct"}</div>
                  <div className="text-muted-foreground">{s.device}</div>
                  <div className="text-muted-foreground">{rel(s.lastSeen)}</div>
                </div>
              ))}
              {(live?.sessions || []).length === 0 && <div className="text-muted-foreground text-center py-3">Niemand aktiv</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3">Live-Feed (letzte Events, In-Memory)</h3>
            <div className="space-y-1 max-h-72 overflow-y-auto text-xs">
              {(live?.feed || []).slice(0, 50).map((f, i) => (
                <div key={i} className="flex items-center gap-2 py-1 border-b border-muted/20" data-testid={`live-feed-${i}`}>
                  <Badge variant="secondary" className="font-mono text-[10px]">{f.shortCode}</Badge>
                  <div className="flex-1 truncate">{f.type} · {f.page}</div>
                  <div className="text-muted-foreground">{f.source || "direct"}</div>
                  <div className="text-muted-foreground">{rel(f.ts)}</div>
                </div>
              ))}
              {(live?.feed || []).length === 0 && <div className="text-muted-foreground text-center py-3">Noch nichts passiert</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-2">Top Quellen</h3>
            <table className="w-full text-xs">
              <tbody>
                {(summary?.topSources || []).map((s, i) => (
                  <tr key={i} className="border-b border-muted/20" data-testid={`source-row-${i}`}>
                    <td className="py-1">{s.source}</td>
                    <td className="py-1 text-right font-mono">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-2">Top Länder</h3>
            <table className="w-full text-xs">
              <tbody>
                {(summary?.topCountries || []).map((s, i) => (
                  <tr key={i} className="border-b border-muted/20"><td className="py-1">{s.country || "—"}</td><td className="py-1 text-right font-mono">{s.count}</td></tr>
                ))}
                {(summary?.topCountries || []).length === 0 && <tr><td className="py-1 text-muted-foreground">noch keine Daten</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-2">Geräte</h3>
            <table className="w-full text-xs">
              <tbody>
                {(summary?.topDevices || []).map((s, i) => (
                  <tr key={i} className="border-b border-muted/20"><td className="py-1">{s.device}</td><td className="py-1 text-right font-mono">{s.count}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {summary && Object.keys(summary.histograms).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3">Verteilungen (Histogramme)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(summary.histograms).map(([dim, buckets]) => {
                const total = buckets.reduce((a, b) => a + b.count, 0) || 1;
                return (
                  <div key={dim}>
                    <div className="text-xs font-semibold mb-1">{dim}</div>
                    {buckets.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-0.5" data-testid={`histo-${dim}-${b.label}`}>
                        <div className="w-20">{b.label}</div>
                        <div className="flex-1 h-3 rounded bg-muted/40 overflow-hidden">
                          <div className="h-full bg-primary/60" style={{ width: `${Math.round((b.count / total) * 100)}%` }} />
                        </div>
                        <div className="w-10 text-right font-mono">{b.count}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
