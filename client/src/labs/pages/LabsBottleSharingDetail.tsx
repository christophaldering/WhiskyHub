import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ArrowLeft, Clock, Loader2, Users } from "lucide-react";
import { useLocation } from "wouter";
import AuthGateMessage from "@/labs/components/AuthGateMessage";

type ViewTab = "overview" | "rate" | "results";

export default function LabsBottleSharingDetail({ id }: { id: string }) {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const [sharing, setSharing] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [ratingIdx, setRatingIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, { nose: number; taste: number; finish: number }>>({});
  const [overalls, setOveralls] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [overallTouched, setOverallTouched] = useState<Record<string, boolean>>({});
  const [finalized, setFinalized] = useState<Record<string, boolean>>({});

  const pid = currentParticipant?.id || "";

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      const res = await fetch(`/api/bottle-sharings/${id}`, { headers: { "x-participant-id": pid } });
      if (res.ok) setSharing(await res.json());
    } catch {}
    setLoading(false);
  }, [id, pid]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  useEffect(() => {
    if (!sharing?.whiskies?.length || !pid) return;
    (async () => {
      for (const w of sharing.whiskies) {
        try {
          const res = await fetch(`/api/ratings/${pid}/${w.id}`);
          if (res.ok) {
            const ex = await res.json();
            if (ex) {
              setScores(prev => ({ ...prev, [w.id]: { nose: ex.nose ?? 75, taste: ex.taste ?? 75, finish: ex.finish ?? 75 } }));
              setOveralls(prev => ({ ...prev, [w.id]: ex.overall ?? 75 }));
              if (ex.notes) setNotes(prev => ({ ...prev, [w.id]: ex.notes }));
              if (ex.source && ex.source !== "draft") {
                setFinalized(prev => ({ ...prev, [w.id]: true }));
                setOverallTouched(prev => ({ ...prev, [w.id]: true }));
              }
            }
          }
        } catch {}
      }
    })();
  }, [sharing?.whiskies?.length, pid]);

  if (!currentParticipant) return <AuthGateMessage title={t("authGate.bottleSharingDetail.title")} bullets={[t("authGate.bottleSharingDetail.bullet1"), t("authGate.bottleSharingDetail.bullet2"), t("authGate.bottleSharingDetail.bullet3")]} />;

  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(null), 2000); };

  const isHost = sharing?.hostId === pid;
  const myParticipation = sharing?.sharingParticipants?.find((p: any) => p.participantId === pid);
  const isActive = sharing?.status === "open";
  const whiskies = sharing?.whiskies || [];
  const allRatings = sharing?.ratings || [];

  const handleJoin = async () => {
    await fetch(`/api/bottle-sharings/${id}/join`, { method: "POST", headers: { "Content-Type": "application/json", "x-participant-id": pid } });
    flash(t("bottleSharing.confirmParticipation")); load();
  };
  const handleConfirm = async () => {
    await fetch(`/api/bottle-sharings/${id}/participation`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-participant-id": pid }, body: JSON.stringify({ status: "confirmed" }) });
    flash(t("bottleSharing.confirmed")); load();
  };
  const handleDecline = async () => {
    await fetch(`/api/bottle-sharings/${id}/participation`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-participant-id": pid }, body: JSON.stringify({ status: "declined" }) });
    load();
  };
  const handleStart = async () => {
    await fetch(`/api/bottle-sharings/${id}/start`, { method: "POST", headers: { "Content-Type": "application/json", "x-participant-id": pid } });
    flash(t("bottleSharing.startTasting")); load();
  };

  const saveRating = async (wId: string, isFinal = false) => {
    setSaving(true);
    const sc = scores[wId] || { nose: 75, taste: 75, finish: 75 };
    const overall = overalls[wId] ?? Math.round((sc.nose + sc.taste + sc.finish) / 3);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({ participantId: pid, whiskyId: wId, tastingId: id, nose: sc.nose, taste: sc.taste, finish: sc.finish, overall, notes: notes[wId] || "", source: isFinal ? "app" : "draft" }),
      });
      if (!res.ok) {
        flash(t("bottleSharing.saveError", "Error saving rating"));
      } else if (isFinal) {
        setFinalized(prev => ({ ...prev, [wId]: true }));
        flash(t("bottleSharing.finalized", "Rating finalized!"));
      } else {
        flash(t("bottleSharing.draftSaved", "Draft saved!"));
      }
    } catch { flash(t("bottleSharing.saveError", "Error saving rating")); }
    setSaving(false);
    load();
  };

  const setDimScore = (wId: string, dim: "nose" | "taste" | "finish", val: number) => {
    const cur = scores[wId] || { nose: 75, taste: 75, finish: 75 };
    const upd = { ...cur, [dim]: val };
    setScores(prev => ({ ...prev, [wId]: upd }));
    setOveralls(prev => ({ ...prev, [wId]: Math.round((upd.nose + upd.taste + upd.finish) / 3) }));
  };

  const resultsData = useMemo(() => {
    if (!whiskies.length) return [];
    return whiskies.map((w: any) => {
      const wr = allRatings.filter((r: any) => r.whiskyId === w.id);
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      return {
        whisky: w, ratingCount: wr.length,
        avgNose: avg(wr.map((r: any) => r.nose || 0)), avgTaste: avg(wr.map((r: any) => r.taste || 0)),
        avgFinish: avg(wr.map((r: any) => r.finish || 0)), avgOverall: avg(wr.map((r: any) => r.overall || 0)),
        ratings: wr,
      };
    }).sort((a: any, b: any) => b.avgOverall - a.avgOverall);
  }, [whiskies, allRatings]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 className="labs-spinner" size={24} /></div>;

  if (!sharing) return (
    <div className="labs-page">
      <button onClick={() => navigate("/labs/bottle-sharing")} data-testid="button-sharing-notfound-back" className="labs-back-link" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 14, padding: 0 }}><ArrowLeft size={16} />{t("bottleSharing.back")}</button>
      <p style={{ textAlign: "center", color: "var(--labs-text-muted)", marginTop: 40 }}>Sharing not found or access denied.</p>
    </div>
  );

  const confirmedParts = sharing.sharingParticipants?.filter((p: any) => p.status === "confirmed") || [];
  const interestedParts = sharing.sharingParticipants?.filter((p: any) => p.status === "interested") || [];
  const currentWhisky = whiskies[ratingIdx];

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "overview", label: t("bottleSharing.review") },
    { key: "rate", label: t("bottleSharing.rateNow") },
    { key: "results", label: t("bottleSharing.results") },
  ];

  return (
    <div className="labs-page labs-fade-in">
      <button onClick={() => navigate("/labs/bottle-sharing")} data-testid="button-sharing-view-back" className="labs-back-link" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-sm)", fontSize: 14, padding: 0 }}>
        <ArrowLeft size={16} />{t("bottleSharing.back")}
      </button>

      <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }} data-testid="text-sharing-view-title">{sharing.title}</h1>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-md)" }}>{t("bottleSharing.createdBy")} {sharing.hostName}</p>

      {actionMsg && <div className="labs-toast" style={{ marginBottom: "var(--labs-space-md)", padding: "8px 14px", borderRadius: 8, background: "var(--labs-accent-muted)", color: "var(--labs-accent)", fontSize: 13, textAlign: "center" }}>{actionMsg}</div>}

      <div style={{ display: "flex", background: "var(--labs-bg-card)", borderRadius: 10, padding: 3, marginBottom: "var(--labs-space-lg)", border: "1px solid var(--labs-border)" }} data-testid="sharing-view-tabs">
        {tabs.map(tab => (
          <button key={tab.key} data-testid={`sharing-tab-${tab.key}`} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: activeTab === tab.key ? "var(--labs-accent)" : "transparent", color: activeTab === tab.key ? "#0e0b05" : "var(--labs-text-muted)", fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 500, cursor: "pointer" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
          <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
            <label className="labs-label">{t("bottleSharing.review")}</label>
            {[
              [t("bottleSharing.bottles"), whiskies.length, ""],
              [t("bottleSharing.confirmed"), confirmedParts.length, "var(--labs-success)"],
              [t("bottleSharing.interested"), interestedParts.length, "var(--labs-accent)"],
              ["Status", isActive ? t("bottleSharing.statusActive") : sharing.status === "closed" ? t("bottleSharing.statusCompleted") : t("bottleSharing.statusDraft"), isActive ? "var(--labs-success)" : "var(--labs-accent)"],
            ].map(([label, val, color]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: (color as string) || "var(--labs-text)" }}>{val}</span>
              </div>
            ))}
            {sharing.sharingMessage && <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "var(--labs-accent-muted)", fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)" }}>"{sharing.sharingMessage}"</div>}
          </div>

          <label className="labs-label">{t("bottleSharing.bottles")}</label>
          {whiskies.map((w: any) => (
            <div key={w.id} data-testid={`sharing-whisky-${w.id}`} className="labs-card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{sharing.blindMode ? "Blind Sample" : w.name}</div>
              {!sharing.blindMode && (w.region || w.caskType) && <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 2 }}>{[w.region, w.caskType].filter(Boolean).join(" · ")}</div>}
            </div>
          ))}

          <label className="labs-label">{t("bottleSharing.participants")}</label>
          {confirmedParts.map((p: any) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--labs-success)" }} />
              <span style={{ fontSize: 13 }}>{p.participantName}</span>
              <span style={{ fontSize: 11, color: "var(--labs-success)" }}>{t("bottleSharing.confirmed")}</span>
            </div>
          ))}
          {interestedParts.map((p: any) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--labs-accent)" }} />
              <span style={{ fontSize: 13 }}>{p.participantName}</span>
              <span style={{ fontSize: 11, color: "var(--labs-accent)" }}>{t("bottleSharing.interested")}</span>
            </div>
          ))}

          {!isHost && !myParticipation && (
            <button data-testid="button-join-sharing" onClick={handleJoin} className="labs-btn-primary" style={{ width: "100%" }}>{t("bottleSharing.joinSharing")}</button>
          )}
          {!isHost && myParticipation?.status === "interested" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button data-testid="button-confirm-participation" onClick={handleConfirm} className="labs-btn-primary" style={{ flex: 1 }}>{t("bottleSharing.confirmParticipation")}</button>
              <button data-testid="button-decline-participation" onClick={handleDecline} className="labs-btn-outline">{t("bottleSharing.leave")}</button>
            </div>
          )}
          {isHost && !isActive && (
            <button data-testid="button-start-sharing" onClick={handleStart} className="labs-btn-primary" style={{ width: "100%" }}>{t("bottleSharing.startTasting")}</button>
          )}
        </div>
      )}

      {activeTab === "rate" && (
        !isActive ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--labs-text-muted)" }}>
            <Clock size={40} style={{ color: "var(--labs-text-faint)", marginBottom: 16 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>{t("bottleSharing.waitingForHost")}</p>
          </div>
        ) : currentWhisky ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {whiskies.map((_: any, i: number) => (
                <button key={i} data-testid={`button-rating-nav-${i}`} onClick={() => setRatingIdx(i)} style={{ width: 30, height: 30, borderRadius: 6, border: i === ratingIdx ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)", background: i === ratingIdx ? "var(--labs-accent-muted)" : "transparent", color: i === ratingIdx ? "var(--labs-accent)" : "var(--labs-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {i + 1}
                </button>
              ))}
            </div>

            <div style={{ textAlign: "center" }}>
              <div className="labs-label">Dram {ratingIdx + 1} / {whiskies.length}</div>
              <div className="labs-serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{sharing.blindMode ? "Blind Sample" : currentWhisky.name}</div>
            </div>

            <div style={{ padding: "8px 14px", borderRadius: 8, background: "var(--labs-accent-muted)", textAlign: "center", fontSize: 12, color: "var(--labs-accent)" }}>{t("bottleSharing.asyncInfo")}</div>

            {(["nose", "taste", "finish"] as const).map(dim => {
              const sc = scores[currentWhisky.id] || { nose: 75, taste: 75, finish: 75 };
              const dimLabel = dim === "nose" ? "Nose" : dim === "taste" ? "Palate" : "Finish";
              return (
                <div key={dim} className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{dimLabel}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--labs-accent)" }}>{sc[dim]}</span>
                  </div>
                  <input data-testid={`slider-${dim}-${currentWhisky.id}`} type="range" min={60} max={100} value={sc[dim]} onChange={e => setDimScore(currentWhisky.id, dim, parseInt(e.target.value))} style={{ width: "100%", accentColor: "var(--labs-accent)" }} />
                </div>
              );
            })}

            <div className="labs-card" style={{ padding: "var(--labs-space-md)", borderColor: "var(--labs-accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Overall</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)" }}>{overalls[currentWhisky.id] ?? 75}</span>
              </div>
              <input data-testid={`slider-overall-${currentWhisky.id}`} type="range" min={60} max={100} value={overalls[currentWhisky.id] ?? 75} onChange={e => { setOveralls(prev => ({ ...prev, [currentWhisky.id]: parseInt(e.target.value) })); setOverallTouched(prev => ({ ...prev, [currentWhisky.id]: true })); }} style={{ width: "100%", accentColor: "var(--labs-accent)" }} />
            </div>

            <div>
              <label className="labs-label">Notes</label>
              <textarea data-testid={`input-notes-${currentWhisky.id}`} value={notes[currentWhisky.id] || ""} onChange={e => setNotes(prev => ({ ...prev, [currentWhisky.id]: e.target.value }))} placeholder="What stands out..." rows={3} className="labs-input" style={{ resize: "none" }} />
            </div>

            <button data-testid={`button-save-rating-${currentWhisky.id}`} onClick={() => saveRating(currentWhisky.id, false)} disabled={saving} className="labs-btn-primary" style={{ width: "100%", background: "var(--labs-surface)", color: "var(--labs-text)", border: "1px solid var(--labs-border)" }}>
              {saving ? t("bottleSharing.saving") : t("bottleSharing.saveDraft", "Save Draft")}
            </button>
            <button data-testid={`button-finalize-rating-${currentWhisky.id}`} onClick={() => saveRating(currentWhisky.id, true)} disabled={saving || !overallTouched[currentWhisky.id] || finalized[currentWhisky.id]} className="labs-btn-primary" style={{ width: "100%", marginTop: 8, opacity: overallTouched[currentWhisky.id] && !finalized[currentWhisky.id] ? 1 : 0.5 }}>
              {finalized[currentWhisky.id] ? "✓ Finalized" : overallTouched[currentWhisky.id] ? "Finalize" : "Rate Overall to finalize"}
            </button>
          </div>
        ) : null
      )}

      {activeTab === "results" && (
        resultsData.length === 0 || resultsData.every((d: any) => d.ratingCount === 0) ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--labs-text-muted)" }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{t("bottleSharing.noRatingsYet")}</p>
            <p style={{ fontSize: 12, color: "var(--labs-text-faint)" }}>{t("bottleSharing.resultsSub")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <div style={{ fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center" }}>{t("bottleSharing.resultsSub")}</div>
            {resultsData.map((d: any, i: number) => (
              <div key={d.whisky.id} data-testid={`result-card-${d.whisky.id}`} className="labs-card" style={{ padding: "var(--labs-space-md)", borderLeft: i === 0 ? "3px solid var(--labs-accent)" : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{d.whisky.name}</div>
                    {(d.whisky.region || d.whisky.caskType) && <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{[d.whisky.region, d.whisky.caskType].filter(Boolean).join(" · ")}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-accent)" }}>{d.avgOverall > 0 ? d.avgOverall.toFixed(1) : "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-faint)" }}>{d.ratingCount} rating{d.ratingCount !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                {d.ratingCount > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {[{ label: "Nose", val: d.avgNose }, { label: "Palate", val: d.avgTaste }, { label: "Finish", val: d.avgFinish }].map(dim => (
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
