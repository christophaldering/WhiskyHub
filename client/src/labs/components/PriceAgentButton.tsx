// Tiefensuche-Knopf fuer eine einzelne Flasche. Bewusst gebremst:
// Bestaetigungsdialog mit Kostenhinweis davor, nur ein Lauf pro Host
// (der Server antwortet sonst mit 409), Fortschritt und Protokoll
// direkt in der Zeile. Der Agent ist die Eskalation fuer Flaschen,
// bei denen die normale Preissuche (Kachel) leer ausging.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Telescope, Loader2, X } from "lucide-react";
import { apiUrl } from "@/lib/native";
import { getSessionAuthValue } from "@/lib/api";

type Phase = "idle" | "confirm" | "running" | "done" | "error";

interface Progress { step: number; maxSteps: number; station: string; note: string }
interface AgentResult { priceRrp: number | null; priceMarket: number | null; priceCurrency: string | null; costEur: number; log: string }

export function PriceAgentButton({ whiskyId, whiskyName, agentLog, agentCost, onSaved }: {
  whiskyId: string;
  whiskyName: string;
  agentLog?: string | null;
  agentCost?: number | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState("");
  const [showLog, setShowLog] = useState(false);
  const jobIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const authHeaders = (): Record<string, string> => {
    const v = getSessionAuthValue();
    return v ? { "x-participant-id": v } : {};
  };

  const start = async () => {
    setPhase("running");
    setProgress(null);
    setResult(null);
    setError("");
    try {
      const res = await fetch(apiUrl(`/api/whiskies/${whiskyId}/price-agent`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      jobIdRef.current = data.jobId;
      pollRef.current = setInterval(poll, 3000);
    } catch (e: any) {
      setError(String(e?.message || e));
      setPhase("error");
    }
  };

  const poll = async () => {
    const jobId = jobIdRef.current;
    if (!jobId) return;
    try {
      const res = await fetch(apiUrl(`/api/price-agent/${jobId}`), { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.progress) setProgress(data.progress);
      if (data.status === "done") {
        if (pollRef.current) clearInterval(pollRef.current);
        setResult(data.result || null);
        setPhase("done");
        onSaved();
      } else if (data.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        setError(data.error || t("priceAgent.failed", "Tiefensuche fehlgeschlagen"));
        setPhase("error");
      }
    } catch {
      // Netzwerk-Aussetzer beim Abfragen sind kein Grund abzubrechen.
    }
  };

  const stop = async () => {
    const jobId = jobIdRef.current;
    if (!jobId) return;
    try {
      await fetch(apiUrl(`/api/price-agent/${jobId}/stop`), { method: "POST", headers: authHeaders() });
    } catch { /* der naechste poll meldet den Endzustand */ }
  };

  const stationLabel = (s: string) =>
    s === "whiskybase" ? t("priceAgent.stWb", "Whiskybase")
    : s === "auctions" ? t("priceAgent.stAuctions", "Auktionen")
    : s === "done" ? t("priceAgent.stDone", "Abschluss")
    : t("priceAgent.stShops", "Shop-Suche");

  if (phase === "confirm") {
    return (
      <div className="labs-card" style={{ padding: 12, marginTop: 6, fontSize: 12, lineHeight: 1.5 }} data-testid={`price-agent-confirm-${whiskyId}`}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("priceAgent.title", "Tiefensuche")}: {whiskyName}</div>
        <p style={{ margin: "0 0 6px", color: "var(--labs-text-muted)" }}>
          {t("priceAgent.explain", "Recherchiert bis zu 4 Minuten hartnäckig in Shops und Auktionsarchiven nach UVP und Marktpreis. Nur im Ausnahmefall nutzen — jeder Lauf kostet ca. 0,15–0,50 €.")}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="labs-btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setPhase("idle")} data-testid={`price-agent-cancel-${whiskyId}`}>
            {t("ui.cancel", "Abbrechen")}
          </button>
          <button type="button" className="labs-btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={start} data-testid={`price-agent-start-${whiskyId}`}>
            {t("priceAgent.start", "Tiefensuche starten")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "running") {
    return (
      <div className="labs-card" style={{ padding: "8px 12px", marginTop: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }} data-testid={`price-agent-running-${whiskyId}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--labs-accent)", flexShrink: 0 }} />
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {progress
            ? `${t("priceAgent.stepOf", "Schritt")} ${progress.step}/${progress.maxSteps} · ${stationLabel(progress.station)}${progress.note ? ` — ${progress.note}` : ""}`
            : t("priceAgent.starting", "Tiefensuche startet…")}
        </span>
        <button type="button" className="labs-btn-ghost" style={{ padding: 4, flexShrink: 0 }} onClick={stop} aria-label={t("ui.cancel", "Abbrechen")} data-testid={`price-agent-stop-${whiskyId}`}>
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (phase === "done" || phase === "error") {
    return (
      <div className="labs-card" style={{ padding: "8px 12px", marginTop: 6, fontSize: 12 }} data-testid={`price-agent-result-${whiskyId}`}>
        {phase === "error" ? (
          <span style={{ color: "var(--labs-danger, #e74c3c)" }}>{error}</span>
        ) : (
          <span>
            {result && (result.priceRrp != null || result.priceMarket != null)
              ? t("priceAgent.found", "Gefunden und gespeichert")
              : t("priceAgent.nothing", "Nichts Belastbares gefunden — das Protokoll zeigt, wo gesucht wurde")}
            {result ? ` · ${result.costEur.toFixed(2)} €` : ""}
          </span>
        )}
        {result?.log && (
          <>
            {" "}
            <button type="button" className="labs-btn-ghost" style={{ fontSize: 11, padding: "2px 6px" }} onClick={() => setShowLog(v => !v)} data-testid={`price-agent-log-toggle-${whiskyId}`}>
              {showLog ? t("priceAgent.hideLog", "Protokoll ausblenden") : t("priceAgent.showLog", "Protokoll")}
            </button>
            {showLog && (
              <pre style={{ marginTop: 6, fontSize: 11, whiteSpace: "pre-wrap", color: "var(--labs-text-muted)", fontFamily: "inherit" }}>{result.log}</pre>
            )}
          </>
        )}
        <button type="button" className="labs-btn-ghost" style={{ fontSize: 11, padding: "2px 6px", marginLeft: 6 }} onClick={() => { setPhase("idle"); setShowLog(false); }} data-testid={`price-agent-close-${whiskyId}`}>
          {t("ui.close", "Schließen")}
        </button>
      </div>
    );
  }

  // phase === "idle": nur das Symbol, plus dezenter Hinweis auf einen frueheren Lauf
  return (
    <button
      type="button"
      className="labs-btn-ghost"
      style={{ padding: 4, display: "inline-flex" }}
      onClick={() => setPhase("confirm")}
      title={agentLog
        ? `${t("priceAgent.title", "Tiefensuche")}${agentCost != null ? ` · ${t("priceAgent.lastRun", "letzter Lauf")} ${Number(agentCost).toFixed(2)} €` : ""}`
        : t("priceAgent.title", "Tiefensuche")}
      aria-label={t("priceAgent.title", "Tiefensuche")}
      data-testid={`button-price-agent-${whiskyId}`}
    >
      <Telescope className="w-3 h-3" style={{ color: agentLog ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
    </button>
  );
}
