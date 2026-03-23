import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { Share2, Plus, Users, ChevronRight, ArrowLeft, Eye, EyeOff, Lock, Globe, UsersRound, Trash2 } from "lucide-react";
import { friendsApi } from "@/lib/api";
import AuthGateMessage from "@/labs/components/AuthGateMessage";

type WizardStep = "bottles" | "visibility" | "review";
type Visibility = "public" | "private" | "group";
type Format = "blind" | "open";

interface BottleEntry {
  name: string;
  region?: string;
  cask?: string;
}

export default function LabsBottleSharing() {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const [publicSharings, setPublicSharings] = useState<any[]>([]);
  const [mySharings, setMySharings] = useState<any[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<WizardStep>("bottles");
  const [title, setTitle] = useState("");
  const [bottles, setBottles] = useState<BottleEntry[]>([{ name: "" }]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [format, setFormat] = useState<Format>("open");
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const pid = currentParticipant?.id || "";

  useEffect(() => {
    if (!pid) { setLoading(false); return; }
    Promise.all([
      fetch("/api/bottle-sharings/public").then(r => r.ok ? r.json() : []),
      fetch("/api/bottle-sharings/mine", { headers: { "x-participant-id": pid } }).then(r => r.ok ? r.json() : []),
    ]).then(([pub, mine]) => { setPublicSharings(pub); setMySharings(mine); }).catch(() => {}).finally(() => setLoading(false));

    friendsApi.getAll(pid).then(setFriends).catch(() => {});
    fetch("/api/communities/mine", { headers: { "x-participant-id": pid } })
      .then(r => r.ok ? r.json() : []).then(setCommunities).catch(() => {});
  }, [pid]);

  if (!currentParticipant) return <AuthGateMessage />;

  const validBottles = bottles.filter(b => b.name.trim());
  const friendsWithEmail = friends.filter((f: any) => f.email && f.status === "accepted");
  const steps: WizardStep[] = ["bottles", "visibility", "review"];
  const stepIdx = steps.indexOf(step);
  const canProceed = step === "bottles" ? validBottles.length > 0 : true;

  const addBottle = () => setBottles([...bottles, { name: "" }]);
  const removeBottle = (i: number) => setBottles(bottles.filter((_, idx) => idx !== i));
  const updateBottle = (i: number, field: keyof BottleEntry, val: string) => {
    const u = [...bottles]; u[i] = { ...u[i], [field]: val }; setBottles(u);
  };
  const toggleFriend = (id: string) => setSelectedFriendIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCommunity = (id: string) => setSelectedCommunityIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCreate = async () => {
    if (validBottles.length === 0) return;
    setCreating(true);
    try {
      const sharingTitle = title.trim() || `Bottle-Sharing (${validBottles.length} ${t("bottleSharing.bottles")})`;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const res = await fetch("/api/tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({
          title: sharingTitle, date: new Date().toISOString().split("T")[0], location: "Bottle-Sharing",
          hostId: pid, code, status: "draft", blindMode: format === "blind", tastingType: "bottle-sharing",
          visibility, sharingMessage: message || null,
          targetCommunityIds: selectedCommunityIds.size > 0 ? JSON.stringify(Array.from(selectedCommunityIds)) : null,
          invitedFriendIds: selectedFriendIds.size > 0 ? Array.from(selectedFriendIds) : undefined,
          ratingScale: 100,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const tasting = await res.json();
      for (let i = 0; i < validBottles.length; i++) {
        const b = validBottles[i];
        await fetch("/api/whiskies", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-participant-id": pid },
          body: JSON.stringify({ tastingId: tasting.id, name: b.name, region: b.region || undefined, caskInfluence: b.cask || undefined, sortOrder: i }),
        });
      }
      navigate(`/labs/bottle-sharing/${tasting.id}`);
    } catch (e) {
      console.error("Failed to create bottle sharing:", e);
    } finally { setCreating(false); }
  };

  if (showWizard) {
    return (
      <div className="labs-fade-in" style={{ maxWidth: 600, margin: "0 auto", padding: "var(--labs-space-md)" }}>
        <button onClick={() => stepIdx > 0 ? setStep(steps[stepIdx - 1]) : setShowWizard(false)} className="labs-back-link" data-testid="button-sharing-back" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-sm)", fontSize: 14, padding: 0 }}>
          <ArrowLeft size={16} />{t("bottleSharing.back")}
        </button>
        <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }} data-testid="text-sharing-title">{t("bottleSharing.title")}</h1>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-lg)" }}>{t("bottleSharing.subtitle")}</p>
        <div style={{ display: "flex", gap: 4, marginBottom: "var(--labs-space-lg)" }}>
          {steps.map((s, i) => (<div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= stepIdx ? "var(--labs-accent)" : "var(--labs-border)" }} />))}
        </div>

        {step === "bottles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <div>
              <label className="labs-label">Sharing-Name</label>
              <input data-testid="input-sharing-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Highland Selection" className="labs-input" />
            </div>
            <label className="labs-label">{t("bottleSharing.selectBottles")}</label>
            {bottles.map((b, i) => (
              <div key={i} className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="labs-label" style={{ color: "var(--labs-accent)" }}>{t("bottleSharing.bottles")} #{i + 1}</span>
                  {bottles.length > 1 && (<button onClick={() => removeBottle(i)} data-testid={`button-remove-bottle-${i}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={16} /></button>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input data-testid={`input-bottle-name-${i}`} value={b.name} onChange={e => updateBottle(i, "name", e.target.value)} placeholder="Name" className="labs-input" style={{ gridColumn: "1 / -1" }} />
                  <input data-testid={`input-bottle-region-${i}`} value={b.region || ""} onChange={e => updateBottle(i, "region", e.target.value)} placeholder="Region" className="labs-input" />
                  <input data-testid={`input-bottle-cask-${i}`} value={b.cask || ""} onChange={e => updateBottle(i, "cask", e.target.value)} placeholder="Cask" className="labs-input" />
                </div>
              </div>
            ))}
            <button onClick={addBottle} data-testid="button-add-bottle" className="labs-btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Plus size={18} />{t("bottleSharing.selectBottles")}</button>
          </div>
        )}

        {step === "visibility" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <label className="labs-label">{t("bottleSharing.visibility")}</label>
            {([
              { key: "public" as Visibility, label: t("bottleSharing.visPublic"), desc: t("bottleSharing.visPublicDesc"), icon: <Globe size={18} /> },
              { key: "private" as Visibility, label: t("bottleSharing.visPrivate"), desc: t("bottleSharing.visPrivateDesc"), icon: <Lock size={18} /> },
              { key: "group" as Visibility, label: t("bottleSharing.visGroup"), desc: t("bottleSharing.visGroupDesc"), icon: <UsersRound size={18} /> },
            ]).map(v => (
              <button key={v.key} data-testid={`button-visibility-${v.key}`} onClick={() => setVisibility(v.key)} className={`labs-card ${visibility === v.key ? "labs-card--active" : ""}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, cursor: "pointer", textAlign: "left", border: visibility === v.key ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)", background: visibility === v.key ? "var(--labs-accent-muted)" : undefined }}>
                <span style={{ color: visibility === v.key ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>{v.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: visibility === v.key ? "var(--labs-accent)" : "var(--labs-text)" }}>{v.label}</div>
                  <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{v.desc}</div>
                </div>
              </button>
            ))}

            {visibility === "private" && friendsWithEmail.length > 0 && (
              <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                <label className="labs-label">{t("bottleSharing.friends")}</label>
                {friendsWithEmail.map((f: any) => {
                  const sel = selectedFriendIds.has(f.id);
                  return (
                    <label key={f.id} data-testid={`sharing-friend-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", borderBottom: "1px solid var(--labs-border)" }}>
                      <input type="checkbox" checked={sel} onChange={() => toggleFriend(f.id)} data-testid={`checkbox-friend-${f.id}`} />
                      <div><div style={{ fontSize: 13, fontWeight: 500 }}>{f.firstName} {f.lastName}</div><div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{f.email}</div></div>
                    </label>
                  );
                })}
              </div>
            )}

            {visibility === "group" && communities.length > 0 && (
              <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
                <label className="labs-label">{t("bottleSharing.groups")}</label>
                {communities.map((c: any) => (
                  <label key={c.id} data-testid={`sharing-community-${c.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                    <input type="checkbox" checked={selectedCommunityIds.has(c.id)} onChange={() => toggleCommunity(c.id)} data-testid={`checkbox-community-${c.id}`} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                  </label>
                ))}
              </div>
            )}

            <label className="labs-label" style={{ marginTop: 8 }}>{t("bottleSharing.format")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["open", "blind"] as Format[]).map(f => (
                <button key={f} data-testid={`button-format-${f}`} onClick={() => setFormat(f)} className={`labs-card ${format === f ? "labs-card--active" : ""}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 14, cursor: "pointer", border: format === f ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)" }}>
                  {f === "blind" ? <EyeOff size={18} /> : <Eye size={18} />}
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f === "blind" ? t("bottleSharing.blind") : t("bottleSharing.open")}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="labs-label">{t("bottleSharing.message")}</label>
              <textarea data-testid="input-sharing-message" value={message} onChange={e => setMessage(e.target.value)} placeholder={t("bottleSharing.messagePH")} rows={3} className="labs-input" style={{ resize: "none" }} />
            </div>
          </div>
        )}

        {step === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
            <div className="labs-card" style={{ padding: "var(--labs-space-md)" }}>
              <label className="labs-label">{t("bottleSharing.review")}</label>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSharing.bottles")}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{validBottles.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSharing.visibility")}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>{visibility === "public" ? t("bottleSharing.visPublic") : visibility === "private" ? t("bottleSharing.visPrivate") : t("bottleSharing.visGroup")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSharing.format")}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{format === "blind" ? t("bottleSharing.blind") : t("bottleSharing.open")}</span>
              </div>
              {message && <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "var(--labs-accent-muted)", fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)" }}>"{message}"</div>}
            </div>
            <label className="labs-label">{t("bottleSharing.bottles")}</label>
            {validBottles.map((b, i) => (
              <div key={i} className="labs-card" style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</div>
                {(b.region || b.cask) && <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 2 }}>{[b.region, b.cask].filter(Boolean).join(" · ")}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "var(--labs-space-lg)" }}>
          {step === "review" ? (
            <button data-testid="button-create-sharing" onClick={handleCreate} disabled={creating} className="labs-btn-primary" style={{ width: "100%" }}>
              {creating ? t("bottleSharing.saving") : t("bottleSharing.create")}
            </button>
          ) : (
            <button data-testid="button-sharing-next" onClick={() => setStep(steps[stepIdx + 1])} disabled={!canProceed} className="labs-btn-primary" style={{ width: "100%", opacity: canProceed ? 1 : 0.4 }}>
              {t("bottleSharing.next")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="labs-fade-in" style={{ maxWidth: 600, margin: "0 auto", padding: "var(--labs-space-md)" }}>
      <button onClick={() => navigate("/labs/home")} className="labs-back-link" data-testid="button-bs-back-home" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", marginBottom: "var(--labs-space-sm)", fontSize: 14, padding: 0 }}>
        <ArrowLeft size={16} />{t("bottleSharing.back")}
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--labs-space-lg)" }}>
        <div>
          <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{t("bottleSharing.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("bottleSharing.subtitle")}</p>
        </div>
        <button onClick={() => setShowWizard(true)} data-testid="button-new-sharing" className="labs-btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <Plus size={16} />{t("bottleSharing.create")}
        </button>
      </div>

      {loading ? (
        <div className="labs-skeleton" style={{ height: 200 }} />
      ) : (
        <>
          {mySharings.length > 0 && (
            <div style={{ marginBottom: "var(--labs-space-xl)" }}>
              <span className="labs-section-label">{t("bottleSharing.yourSharings")}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mySharings.map((s: any) => (
                  <button key={s.id} data-testid={`my-sharing-${s.id}`} onClick={() => navigate(`/labs/bottle-sharing/${s.id}`)} className="labs-card" style={{ display: "flex", alignItems: "center", padding: 14, cursor: "pointer", width: "100%", textAlign: "left", border: "1px solid var(--labs-border)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                      <Share2 size={18} style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{s.whiskyCount} {t("bottleSharing.bottleCount")} · {s.confirmedCount} {t("bottleSharing.confirmedCount")}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {publicSharings.length > 0 && (
            <div>
              <span className="labs-section-label">{t("bottleSharing.publicSharings")}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {publicSharings.map((s: any) => (
                  <button key={s.id} data-testid={`public-sharing-${s.id}`} onClick={() => navigate(`/labs/bottle-sharing/${s.id}`)} className="labs-card" style={{ display: "flex", alignItems: "center", padding: 14, cursor: "pointer", width: "100%", textAlign: "left", border: "1px solid var(--labs-border)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                      <Globe size={18} style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{t("bottleSharing.createdBy")} {s.hostName} · {s.whiskyCount} {t("bottleSharing.bottleCount")}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--labs-success)" }}>{s.confirmedCount} {t("bottleSharing.confirmedCount")}</div>
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{s.interestedCount} {t("bottleSharing.interested")}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mySharings.length === 0 && publicSharings.length === 0 && (
            <div style={{ textAlign: "center", padding: "var(--labs-space-xxl) 0", color: "var(--labs-text-muted)" }}>
              <Share2 size={40} style={{ color: "var(--labs-text-faint)", marginBottom: "var(--labs-space-md)" }} />
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t("bottleSharing.noParticipants")}</p>
              <p style={{ fontSize: 12, color: "var(--labs-text-faint)" }}>{t("bottleSharing.subtitle")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
