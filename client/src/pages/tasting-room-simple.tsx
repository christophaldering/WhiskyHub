import { useParams } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
  error: "#c44",
  success: "#6a9a5b",
};

const cardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: c.bg,
  border: `1px solid ${c.border}`,
  borderRadius: 8,
  color: c.text,
  padding: "12px 14px",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "system-ui, sans-serif",
};

interface WhiskyItem {
  id: string;
  name?: string;
  distillery?: string;
  orderIndex?: number;
}

interface RatingData {
  nose: number;
  taste: number;
  finish: number;
  balance: number;
  overall: number;
  notes: string;
}

function RatingSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: c.muted }}>{label}</span>
        <span style={{ fontSize: 13, color: c.accent, fontWeight: 600, fontFamily: "monospace" }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: c.accent }}
        data-testid={`slider-${label.toLowerCase()}`}
      />
    </div>
  );
}

export default function TastingRoomSimple() {
  const params = useParams<{ id: string }>();
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, RatingData>>({});
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const saveTimerRef = { current: null as ReturnType<typeof setTimeout> | null };

  const { data: tasting, isLoading: tastingLoading, error: tastingError } = useQuery({
    queryKey: ["tasting-simple", tastingId],
    queryFn: () => tastingApi.get(tastingId!),
    enabled: !!tastingId,
  });

  const { data: whiskies = [], isLoading: whiskiesLoading } = useQuery<WhiskyItem[]>({
    queryKey: ["tasting-whiskies-simple", tastingId],
    queryFn: () => fetch(`/api/tastings/${tastingId}/whiskies`).then((r) => r.json()),
    enabled: !!tastingId,
  });

  const currentWhisky = whiskies[currentIndex];
  const whiskyId = currentWhisky?.id;

  useEffect(() => {
    if (!pid || !whiskyId) return;
    fetch(`/api/ratings/${pid}/${whiskyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((existing) => {
        if (existing && !ratings[whiskyId]) {
          setRatings((prev) => ({
            ...prev,
            [whiskyId]: {
              nose: existing.nose ?? 5,
              taste: existing.taste ?? 5,
              finish: existing.finish ?? 5,
              balance: existing.balance ?? 5,
              overall: existing.overall ?? 5,
              notes: existing.notes ?? "",
            },
          }));
        }
      })
      .catch((err) => console.error("[SIMPLE_MODE] load rating error", err));
  }, [pid, whiskyId]);

  const currentRating: RatingData = ratings[whiskyId || ""] || {
    nose: 5, taste: 5, finish: 5, balance: 5, overall: 5, notes: "",
  };

  const updateField = useCallback((field: keyof RatingData, value: number | string) => {
    if (!whiskyId) return;
    setRatings((prev) => ({
      ...prev,
      [whiskyId]: { ...prev[whiskyId] || currentRating, [field]: value },
    }));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!pid || !tastingId || !whiskyId) return;
      const r = { ...currentRating, [field]: value };
      setSaving(true);
      fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tastingId, whiskyId, participantId: pid,
          nose: r.nose, taste: r.taste, finish: r.finish, balance: r.balance, overall: r.overall, notes: r.notes,
        }),
      })
        .then(() => console.log("[SIMPLE_MODE] rating saved"))
        .catch((err) => console.error("[SIMPLE_MODE] rating save error", err))
        .finally(() => setSaving(false));
    }, 800);
  }, [whiskyId, pid, tastingId, currentRating]);

  if (tastingLoading || whiskiesLoading) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: c.muted }}>Loading…</p>
        </div>
      </SimpleShell>
    );
  }

  if (tastingError || !tasting) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: c.error }}>Tasting not found.</p>
          <Link href="/enter" style={{ color: c.accent, fontSize: 13, marginTop: 12, display: "inline-block" }}>Try another code</Link>
        </div>
      </SimpleShell>
    );
  }

  if (finished) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }} data-testid="card-finished">
          <div style={{ fontSize: 32, marginBottom: 12 }}>🥃</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: c.text, margin: "0 0 8px" }}>Done!</h2>
          <p style={{ fontSize: 13, color: c.muted, margin: "0 0 24px" }}>Your ratings have been saved.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/my-taste" style={{ textDecoration: "none" }}>
              <div style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, borderRadius: 8, cursor: "pointer" }} data-testid="button-goto-taste">My Taste</div>
            </Link>
            <Link href="/" style={{ textDecoration: "none" }}>
              <div style={{ padding: "10px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: c.text, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }} data-testid="button-done-home">Home</div>
            </Link>
          </div>
        </div>
      </SimpleShell>
    );
  }

  if (!whiskies.length) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <h2 style={{ fontSize: 16, color: c.text, margin: "0 0 8px" }}>{tasting.title}</h2>
          <p style={{ color: c.muted, fontSize: 13 }}>No whiskies added yet. Waiting for the host…</p>
        </div>
      </SimpleShell>
    );
  }

  const isBlind = tasting.blindMode;
  const whiskyLabel = isBlind ? `Dram ${String.fromCharCode(65 + currentIndex)}` : (currentWhisky?.name || `Whisky ${currentIndex + 1}`);

  return (
    <SimpleShell maxWidth={480}>
      <div style={{ ...cardStyle, marginBottom: 16 }} data-testid="card-tasting-header">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>{tasting.title}</h2>
        <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
          {currentIndex + 1} of {whiskies.length} {saving && " · saving…"}
        </p>
      </div>

      <div style={cardStyle} data-testid="card-rating">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: c.accent, margin: 0 }}>{whiskyLabel}</h3>
          {!isBlind && currentWhisky?.distillery && (
            <span style={{ fontSize: 12, color: c.muted }}>{currentWhisky.distillery}</span>
          )}
        </div>

        <RatingSlider label="Nose" value={currentRating.nose} onChange={(v) => updateField("nose", v)} />
        <RatingSlider label="Taste" value={currentRating.taste} onChange={(v) => updateField("taste", v)} />
        <RatingSlider label="Finish" value={currentRating.finish} onChange={(v) => updateField("finish", v)} />
        <RatingSlider label="Balance" value={currentRating.balance} onChange={(v) => updateField("balance", v)} />

        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12, marginTop: 8 }}>
          <RatingSlider label="Overall" value={currentRating.overall} onChange={(v) => updateField("overall", v)} />
        </div>

        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Notes</label>
          <textarea
            value={currentRating.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
            data-testid="input-rating-notes"
            placeholder="Optional notes…"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          data-testid="button-prev"
          style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 500, background: "transparent", color: currentIndex === 0 ? c.muted : c.text, border: `1px solid ${c.border}`, borderRadius: 8, cursor: currentIndex === 0 ? "default" : "pointer", opacity: currentIndex === 0 ? 0.4 : 1 }}
        >
          ← Prev
        </button>
        {currentIndex < whiskies.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            data-testid="button-next"
            style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => setFinished(true)}
            data-testid="button-finish"
            style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Finish
          </button>
        )}
      </div>
    </SimpleShell>
  );
}
