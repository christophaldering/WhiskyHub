import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ArrowLeft, Loader2, Trash2, Play, Check, X, Wine } from "lucide-react";
import { useLocation } from "wouter";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useLabsBack } from "@/labs/LabsLayout";
import { useRatingScale } from "@/labs/hooks/useRatingScale";

type ViewTab = "overview" | "claims" | "rate" | "results";

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--labs-text-muted)", open: "var(--labs-success)", confirmed: "var(--labs-accent)",
  distributed: "#6c63ff", tasting: "#e67e22", completed: "var(--labs-text-muted)", cancelled: "#e74c3c",
};

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Entwurf", open: "Offen", confirmed: "Bestätigt",
    distributed: "Verteilt", tasting: "Tasting aktiv", completed: "Abgeschlossen", cancelled: "Abgebrochen",
  };
  return map[status] || status;
}

export default function LabsBottleSplitDetail({ id }: { id: string }) {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();
  useLocation();
  const goBack = useLabsBack("/labs/splits");

  const [split, setSplit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  const [ratingIdx, setRatingIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, { nose: number; taste: number; finish: number }>>({});
  const [overalls, setOveralls] = useState<Record<string, number>>({});
  const [ratingNotes, setRatingNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [overallTouched, setOverallTouched] = useState<Record<string, boolean>>({});
  const [finalized, setFinalized] = useState<Record<string, boolean>>({});

  const pid = currentParticipant?.id || "";
  const splitScale = useRatingScale(split?.tasting?.ratingScale ?? split?.ratingScale);
  const splitScaleMin = splitScale.max === 100 ? 60 : 0;
  const splitScaleMax = splitScale.max;
  const splitScaleMid = Math.round(splitScaleMax * 0.75);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      const res = await fetch(`/api/bottle-splits/${id}`, { headers: { "x-participant-id": pid } });
      if (res.ok) setSplit(await res.json());
    } catch {}
    setLoading(false);
  }, [id, pid]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const iv = setInterval(load, 15000); return () => clearInterval(iv); }, [load]);

  useEffect(() => {
    if (!split?.tasting?.whiskies?.length || !pid) return;
    (async () => {
      for (const w of split.tasting.whiskies) {
        try {
          const res = await fetch(`/api/ratings/${pid}/${w.id}`);
          if (res.ok) {
            const ex = await res.json();
            if (ex) {
              setScores(prev => ({ ...prev, [w.id]: { nose: ex.nose ?? splitScaleMid, taste: ex.taste ?? splitScaleMid, finish: ex.finish ?? splitScaleMid } }));
              setOveralls(prev => ({ ...prev, [w.id]: ex.overall ?? splitScaleMid }));
              if (ex.notes) setRatingNotes(prev => ({ ...prev, [w.id]: ex.notes }));
              if (ex.source && ex.source !== "draft") {
                setFinalized(prev => ({ ...prev, [w.id]: true }));
                setOverallTouched(prev => ({ ...prev, [w.id]: true }));
              }
            }
          }
        } catch {}
      }
    })();
  }, [split?.tasting?.whiskies?.length, pid]);

  if (!currentParticipant) return <AuthGateMessage title={t("authGate.bottleSplitDetail.title")} bullets={[t("authGate.bottleSplitDetail.bullet1"), t("authGate.bottleSplitDetail.bullet2"), t("authGate.bottleSplitDetail.bullet3")]} />;
  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(null), 2000); };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 className="labs-spinner" size={24} /></div>;

  if (!split) return (
    <div className="labs-page">
      <button onClick={goBack} data-testid="button-split-notfound-back" className="labs-back-link" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 14, padding: 0 }}>
        <ArrowLeft size={16} />{t("ui.back")}
      </button>
      <p style={{ textAlign: "center", color: "var(--labs-text-muted)", marginTop: 40 }}>{t("bottleSplitUi.splitNotFound")}</p>
    </div>
  );

  const isHost = split.hostId === pid;
  const bottles = (split.bottles as any[]) || [];
  const claims = split.claims || [];
  const myClaims = claims.filter((c: any) => c.participantId === pid);
  const tasting = split.tasting;
  const whiskies = tasting?.whiskies || [];
  const allRatings = tasting?.ratings || [];

  const getBottleCapacity = (bottleIndex: number) => {
    const bottle = bottles[bottleIndex];
    if (!bottle) return { total: 0, available: 0, claimed: 0 };
    const total = bottle.totalVolumeMl - (bottle.ownerKeepMl || 0);
    const bottleClaims = claims.filter((c: any) => c.bottleIndex === bottleIndex);
    const claimed = bottleClaims.reduce((s: number, c: any) => s + c.sizeMl, 0);
    return { total, available: total - claimed, claimed };
  };

  const handleClaim = async (bottleIndex: number, sizeMl: number) => {
    setClaiming(true);
    try {
      const res = await fetch(`/api/bottle-splits/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({ bottleIndex, sizeMl }),
      });
      if (!res.ok) {
        const err = await res.json();
        flash(err.message || "Claim fehlgeschlagen");
      } else {
        flash("Sample beansprucht!");
        load();
      }
    } catch { flash("Fehler beim Beanspruchen"); }
    setClaiming(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusChanging(true);
    try {
      const res = await fetch(`/api/bottle-splits/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { flash(`Status: ${statusLabel(newStatus)}`); load(); }
      else { const err = await res.json(); flash(err.message || "Fehler"); }
    } catch { flash("Fehler"); }
    setStatusChanging(false);
  };

  const handleRemoveClaim = async (claimId: string) => {
    try {
      const res = await fetch(`/api/bottle-splits/${id}/claims/${claimId}`, {
        method: "DELETE",
        headers: { "x-participant-id": pid },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Fehler" }));
        flash(err.message || "Fehler beim Entfernen");
        return;
      }
      flash("Claim entfernt");
      load();
    } catch { flash("Fehler"); }
  };

  const handleStartTasting = async () => {
    setStatusChanging(true);
    try {
      const res = await fetch(`/api/bottle-splits/${id}/start-tasting`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
      });
      if (res.ok) { flash("Tasting gestartet!"); load(); }
      else { const err = await res.json(); flash(err.message || "Fehler"); }
    } catch { flash("Fehler"); }
    setStatusChanging(false);
  };

  const saveRating = async (wId: string, isFinal = false) => {
    setSaving(true);
    const sc = scores[wId] || { nose: splitScaleMid, taste: splitScaleMid, finish: splitScaleMid };
    const overall = overalls[wId] ?? Math.round((sc.nose + sc.taste + sc.finish) / 3);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({ participantId: pid, whiskyId: wId, tastingId: tasting.id, nose: sc.nose, taste: sc.taste, finish: sc.finish, overall, notes: ratingNotes[wId] || "", source: isFinal ? "app" : "draft" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Fehler" }));
        flash(err.message || "Fehler beim Speichern");
      } else {
        if (isFinal) {
          setFinalized(prev => ({ ...prev, [wId]: true }));
          flash("Bewertung abgeschlossen!");
        } else {
          flash("Entwurf gespeichert!");
        }
      }
    } catch { flash("Fehler beim Speichern"); }
    setSaving(false);
    load();
  };

  const setDimScore = (wId: string, dim: "nose" | "taste" | "finish", val: number) => {
    const cur = scores[wId] || { nose: splitScaleMid, taste: splitScaleMid, finish: splitScaleMid };
    const upd = { ...cur, [dim]: val };
    setScores(prev => ({ ...prev, [wId]: upd }));
    setOveralls(prev => ({ ...prev, [wId]: Math.round((upd.nose + upd.taste + upd.finish) / 3) }));
  };

  const resultsData = useMemo(() => {
    if (!whiskies.length) return [];
    return whiskies.map((w: any) => {
      const wr = allRatings.filter((r: any) => r.whiskyId === w.id);
      const avg = (arr: number[]) => arr.length ? arr.reduce((a: number, b: number) => a + b, 0) / arr.length : 0;
      return {
        whisky: w, ratingCount: wr.length,
        avgNose: avg(wr.map((r: any) => r.nose || 0)), avgTaste: avg(wr.map((r: any) => r.taste || 0)),
        avgFinish: avg(wr.map((r: any) => r.finish || 0)), avgOverall: avg(wr.map((r: any) => r.overall || 0)),
        ratings: wr,
      };
    }).sort((a: any, b: any) => b.avgOverall - a.avgOverall);
  }, [whiskies, allRatings]);

  const totalClaimedMl = claims.reduce((s: number, c: any) => s + c.sizeMl, 0);
  const totalRevenue = claims.reduce((s: number, c: any) => s + c.priceEur, 0);
  const uniqueClaimants = [...new Set(claims.map((c: any) => c.participantId))].length;

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "overview", label: "Übersicht" },
    { key: "claims", label: `Claims (${claims.length})` },
    ...(tasting ? [{ key: "rate" as ViewTab, label: "Bewerten" }] : []),
    ...(tasting ? [{ key: "results" as ViewTab, label: "Ergebnisse" }] : []),
  ];

  return (
    <div className="labs-page labs-fade-in">
      <button onClick={goBack} data-testid="button-split-detail-back" className="labs-back-link" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-sm)", fontSize: 14, padding: 0 }}>
        <ArrowLeft size={16} />{t("ui.back")}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 600 }} data-testid="text-split-detail-title">{split.title}</h1>
        <span data-testid="text-split-status" style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[split.status], textTransform: "uppercase", padding: "4px 10px", borderRadius: 6, background: `${STATUS_COLORS[split.status]}18` }}>
          {statusLabel(split.status)}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-md)" }}>
        von {split.hostName} · {bottles.length} {bottles.length === 1 ? "Flasche" : "Flaschen"}
      </p>

      {actionMsg && <div className="labs-toast" style={{ marginBottom: "var(--labs-space-md)", padding: "8px 14px", borderRadius: 8, background: "var(--labs-accent-muted)", color: "var(--labs-accent)", fontSize: 13, textAlign: "center" }}>{actionMsg}</div>}

      <div style={{ display: "flex", background: "var(--labs-bg-card)", borderRadius: 10, padding: 3, marginBottom: "var(--labs-space-lg)", border: "1px solid var(--labs-border)" }} data-testid="split-detail-tabs">
        {tabs.map(tab => (
          <button key={tab.key} data-testid={`split-tab-${tab.key}`} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: activeTab === tab.key ? "var(--labs-accent)" : "transparent", color: activeTab === tab.key ? "#0e0b05" : "var(--labs-text-muted)", fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 500, cursor: "pointer" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
          {split.description && (
            <div className="labs-card" style={{ padding: "var(--labs-space-md)", fontStyle: "italic", fontSize: 13, color: "var(--labs-text-muted)" }}>
              "{split.description}"
            </div>
          )}

          <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
            <label className="labs-label">Zusammenfassung</label>
            {[
              ["Flaschen", bottles.length, ""],
              ["Claims", claims.length, "var(--labs-accent)"],
              ["Teilnehmer", uniqueClaimants, ""],
              ["Beansprucht", `${totalClaimedMl}ml`, "var(--labs-accent)"],
              ...(isHost ? [["Umsatz", `${totalRevenue.toFixed(2)}€`, "var(--labs-success)"]] : []),
            ].map(([label, val, color]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: (color as string) || "var(--labs-text)" }}>{val}</span>
              </div>
            ))}
          </div>

          <label className="labs-label">Flaschen & Kapazität</label>
          {bottles.map((b: any, i: number) => {
            const cap = getBottleCapacity(i);
            const pct = cap.total > 0 ? (cap.claimed / cap.total) * 100 : 0;
            return (
              <div key={i} className="labs-card" style={{ padding: "var(--labs-space-md)" }} data-testid={`split-bottle-${i}`}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{b.name}</div>
                {(b.distillery || b.region) && <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 6 }}>{[b.distillery, b.region, b.abv ? `${b.abv}%` : null].filter(Boolean).join(" · ")}</div>}

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--labs-border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: cap.available > 0 ? "var(--labs-accent)" : "#e74c3c", borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: cap.available > 0 ? "var(--labs-accent)" : "#e74c3c", whiteSpace: "nowrap" }}>
                    {cap.available}ml frei
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 8 }}>
                  {b.totalVolumeMl}ml gesamt · {b.ownerKeepMl}ml Eigenbedarf · {cap.claimed}ml beansprucht
                </div>

                {split.status === "open" && cap.available > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(b.sampleOptions || []).map((opt: any, oi: number) => {
                      const canClaim = opt.sizeMl <= cap.available;
                      return (
                        <button
                          key={oi}
                          data-testid={`button-claim-${i}-${opt.sizeMl}`}
                          disabled={claiming || !canClaim}
                          onClick={() => handleClaim(i, opt.sizeMl)}
                          className={canClaim ? "labs-btn-primary" : "labs-btn-outline"}
                          style={{ fontSize: 12, padding: "6px 14px", opacity: canClaim ? 1 : 0.5 }}
                        >
                          {opt.sizeMl}ml · {opt.priceEur}€
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {myClaims.length > 0 && (
            <>
              <label className="labs-label">Meine Claims</label>
              {myClaims.map((c: any) => (
                <div key={c.id} className="labs-card" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{bottles[c.bottleIndex]?.name || `Flasche #${c.bottleIndex + 1}`}</div>
                    <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{c.sizeMl}ml · {c.priceEur}€</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: c.status === "confirmed" ? "var(--labs-success)" : "var(--labs-accent)", textTransform: "uppercase" }}>
                    {c.status === "claimed" ? "Beansprucht" : "Bestätigt"}
                  </span>
                </div>
              ))}
            </>
          )}

          {isHost && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "var(--labs-space-sm)" }}>
              <label className="labs-label">Host-Aktionen</label>
              {split.status === "draft" && (
                <button data-testid="button-open-split" onClick={() => handleStatusChange("open")} disabled={statusChanging} className="labs-btn-primary" style={{ width: "100%" }}>
                  <Play size={16} style={{ marginRight: 6 }} />Split öffnen (Claims annehmen)
                </button>
              )}
              {split.status === "open" && (
                <button data-testid="button-confirm-split" onClick={() => handleStatusChange("confirmed")} disabled={statusChanging} className="labs-btn-primary" style={{ width: "100%" }}>
                  <Check size={16} style={{ marginRight: 6 }} />Split bestätigen
                </button>
              )}
              {split.status === "confirmed" && (
                <button data-testid="button-distribute-split" onClick={() => handleStatusChange("distributed")} disabled={statusChanging} className="labs-btn-primary" style={{ width: "100%" }}>
                  Samples als verteilt markieren
                </button>
              )}
              {["distributed", "confirmed"].includes(split.status) && !tasting && (
                <button data-testid="button-start-tasting" onClick={handleStartTasting} disabled={statusChanging} className="labs-btn-primary" style={{ width: "100%", background: "#e67e22" }}>
                  <Wine size={16} style={{ marginRight: 6 }} />Tasting starten
                </button>
              )}
              {split.status === "tasting" && (
                <button data-testid="button-complete-split" onClick={() => handleStatusChange("completed")} disabled={statusChanging} className="labs-btn-primary" style={{ width: "100%" }}>
                  Split abschließen
                </button>
              )}
              {!["completed", "cancelled"].includes(split.status) && (
                <button data-testid="button-cancel-split" onClick={() => handleStatusChange("cancelled")} disabled={statusChanging} className="labs-btn-outline" style={{ width: "100%", color: "#e74c3c", borderColor: "#e74c3c" }}>
                  <X size={16} style={{ marginRight: 6 }} />Split abbrechen
                </button>
              )}
            </div>
          )}

          {tasting && (
            <div className="labs-card" style={{ padding: "var(--labs-space-md)", borderColor: "#e67e22" }}>
              <label className="labs-label" style={{ color: "#e67e22" }}>Tasting</label>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {allRatings.length} Bewertungen · {tasting.participantCount} Teilnehmer
              </div>
              <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 8 }}>
                Async-Modus: Jeder bewertet sein Sample zuhause in eigenem Tempo
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button data-testid="button-goto-rate" onClick={() => setActiveTab("rate")} className="labs-btn-primary" style={{ flex: 1, fontSize: 12 }}>
                  Bewerten
                </button>
                <button data-testid="button-goto-results" onClick={() => setActiveTab("results")} className="labs-btn-outline" style={{ flex: 1, fontSize: 12 }}>
                  Ergebnisse
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "claims" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
          {claims.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--labs-text-muted)" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{t("bottleSplitUi.noClaims")}</p>
            </div>
          ) : (
            <>
              <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSplitUi.totalVolume")}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{totalClaimedMl}ml</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSplitUi.revenue")}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-success)" }}>{totalRevenue.toFixed(2)}€</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("tastingDetail.participants")}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{uniqueClaimants}</span>
                </div>
              </div>

              {claims.map((c: any, idx: number) => (
                <div key={c.id} data-testid={`claim-row-${c.id}`} className="labs-card" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.participantName}</div>
                    <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                      {bottles[c.bottleIndex]?.name || `#${c.bottleIndex + 1}`} · {c.sizeMl}ml · {c.priceEur}€
                    </div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-faint)" }}>
                      #{idx + 1} · {c.status === "confirmed" ? "Bestätigt" : "Beansprucht"}
                    </div>
                  </div>
                  {isHost && ["draft", "open"].includes(split.status) && (
                    <button data-testid={`button-remove-claim-${c.id}`} onClick={() => handleRemoveClaim(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", padding: 8 }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === "rate" && tasting && (
        whiskies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--labs-text-muted)" }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Keine Whiskies zum Bewerten</p>
          </div>
        ) : (() => {
          const currentWhisky = whiskies[ratingIdx];
          if (!currentWhisky) return null;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {whiskies.map((_: any, i: number) => (
                  <button key={i} data-testid={`button-split-rating-nav-${i}`} onClick={() => setRatingIdx(i)} style={{ width: 30, height: 30, borderRadius: 6, border: i === ratingIdx ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)", background: i === ratingIdx ? "var(--labs-accent-muted)" : "transparent", color: i === ratingIdx ? "var(--labs-accent)" : "var(--labs-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {i + 1}
                  </button>
                ))}
              </div>

              <div style={{ textAlign: "center" }}>
                <div className="labs-label">Sample {ratingIdx + 1} / {whiskies.length}</div>
                <div className="labs-serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{currentWhisky.name}</div>
              </div>

              <div style={{ padding: "8px 14px", borderRadius: 8, background: "var(--labs-accent-muted)", textAlign: "center", fontSize: 12, color: "var(--labs-accent)" }}>
                Async-Tasting: Bewerte dein Sample in deinem Tempo
              </div>

              {(["nose", "taste", "finish"] as const).map(dim => {
                const sc = scores[currentWhisky.id] || { nose: splitScaleMid, taste: splitScaleMid, finish: splitScaleMid };
                const dimLabel = dim === "nose" ? "Nose" : dim === "taste" ? "Palate" : "Finish";
                return (
                  <div key={dim} className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{dimLabel}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--labs-accent)" }}>{sc[dim]}</span>
                    </div>
                    <input data-testid={`slider-split-${dim}-${currentWhisky.id}`} type="range" min={splitScaleMin} max={splitScaleMax} step={splitScale.step} value={sc[dim]} onChange={e => setDimScore(currentWhisky.id, dim, Number(e.target.value))} style={{ width: "100%", accentColor: "var(--labs-accent)" }} />
                  </div>
                );
              })}

              <div className="labs-card" style={{ padding: "var(--labs-space-md)", borderColor: "var(--labs-accent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Overall</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)" }}>{overalls[currentWhisky.id] ?? splitScaleMid}</span>
                </div>
                <input data-testid={`slider-split-overall-${currentWhisky.id}`} type="range" min={splitScaleMin} max={splitScaleMax} step={splitScale.step} value={overalls[currentWhisky.id] ?? splitScaleMid} onChange={e => { setOveralls(prev => ({ ...prev, [currentWhisky.id]: Number(e.target.value) })); setOverallTouched(prev => ({ ...prev, [currentWhisky.id]: true })); }} style={{ width: "100%", accentColor: "var(--labs-accent)" }} />
              </div>

              <div>
                <label className="labs-label">Notizen</label>
                <textarea data-testid={`input-split-notes-${currentWhisky.id}`} value={ratingNotes[currentWhisky.id] || ""} onChange={e => setRatingNotes(prev => ({ ...prev, [currentWhisky.id]: e.target.value }))} placeholder="Was fällt dir auf..." rows={3} className="labs-input" style={{ resize: "none" }} />
              </div>

              <button data-testid={`button-save-split-rating-${currentWhisky.id}`} onClick={() => saveRating(currentWhisky.id, false)} disabled={saving} className="labs-btn-primary" style={{ width: "100%", background: "var(--labs-surface)", color: "var(--labs-text)", border: "1px solid var(--labs-border)" }}>
                {saving ? <Loader2 className="labs-spinner" size={16} /> : "Entwurf speichern"}
              </button>
              <button data-testid={`button-finalize-split-rating-${currentWhisky.id}`} onClick={() => saveRating(currentWhisky.id, true)} disabled={saving || !overallTouched[currentWhisky.id] || finalized[currentWhisky.id]} className="labs-btn-primary" style={{ width: "100%", marginTop: 8, opacity: overallTouched[currentWhisky.id] && !finalized[currentWhisky.id] ? 1 : 0.5 }}>
                {finalized[currentWhisky.id] ? "✓ Abgeschlossen" : overallTouched[currentWhisky.id] ? "Abschließen" : "Bewerte Overall um abzuschließen"}
              </button>
            </div>
          );
        })()
      )}

      {activeTab === "results" && tasting && (
        resultsData.length === 0 || resultsData.every((d: any) => d.ratingCount === 0) ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--labs-text-muted)" }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Noch keine Bewertungen</p>
            <p style={{ fontSize: 12, color: "var(--labs-text-faint)" }}>Sobald Teilnehmer bewerten, erscheinen hier die Ergebnisse</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <div style={{ fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center" }}>
              {allRatings.length} Bewertungen von {tasting.participantCount} Teilnehmern
            </div>
            {resultsData.map((d: any, i: number) => (
              <div key={d.whisky.id} data-testid={`split-result-card-${d.whisky.id}`} className="labs-card" style={{ padding: "var(--labs-space-md)", borderLeft: i === 0 ? "3px solid var(--labs-accent)" : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{d.whisky.name}</div>
                    {(d.whisky.region || d.whisky.caskType) && <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{[d.whisky.region, d.whisky.caskType].filter(Boolean).join(" · ")}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-accent)" }}>{d.avgOverall > 0 ? d.avgOverall.toFixed(1) : "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-faint)" }}>{d.ratingCount} {d.ratingCount === 1 ? "Bewertung" : "Bewertungen"}</div>
                  </div>
                </div>
                {d.ratingCount > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {[{ label: "Nose", val: d.avgNose }, { label: "Palate", val: d.avgTaste }, { label: "Finish", val: d.avgFinish }].map((dim: any) => (
                      <div key={dim.label} style={{ textAlign: "center", padding: "4px 0", background: "var(--labs-accent-muted)", borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{dim.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{dim.val.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {d.ratings.filter((r: any) => r.notes).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {d.ratings.filter((r: any) => r.notes).map((r: any) => (
                      <div key={r.id} style={{ fontSize: 12, color: "var(--labs-text-muted)", padding: "4px 0", borderTop: "1px solid var(--labs-border)" }}>
                        <span style={{ fontWeight: 600 }}>{r.overall}</span> — {r.notes}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
