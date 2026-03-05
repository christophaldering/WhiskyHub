import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { getSession } from "@/lib/session";
import { queryClient } from "@/lib/queryClient";
import { Camera, PenLine, Check } from "lucide-react";

export default function M2TastingsSolo() {
  const { t } = useTranslation();
  const session = getSession();
  const [name, setName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(70);
  const [saved, setSaved] = useState(false);

  const saveDram = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session.pid ? { "x-participant-id": session.pid } : {}),
        },
        body: JSON.stringify({
          participantId: session.pid,
          whiskyName: name,
          distillery,
          notes,
          overallScore: rating,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });

  if (!session.signedIn) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-solo-page">
        <M2BackButton />
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "16px 0" }}>
          {t("m2.solo.title", "Solo Dram")}
        </h1>
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14 }}>
          {t("m2.solo.signInPrompt", "Sign in to log a solo dram")}
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-solo-page">
        <M2BackButton />
        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "32px 20px", textAlign: "center", marginTop: 24 }}>
          <Check style={{ width: 40, height: 40, color: v.success, marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: v.text, margin: "0 0 8px" }}>
            {t("m2.solo.saved", "Dram saved!")}
          </h2>
          <p style={{ fontSize: 13, color: v.textSecondary, margin: "0 0 20px" }}>
            {t("m2.solo.savedDesc", "Your tasting note has been added to your drams.")}
          </p>
          <button
            onClick={() => { setName(""); setDistillery(""); setNotes(""); setRating(70); setSaved(false); }}
            style={{ background: v.accent, color: v.bg, border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
            data-testid="m2-solo-again"
          >
            {t("m2.solo.logAnother", "Log another dram")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }} data-testid="m2-solo-page">
      <M2BackButton />
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "16px 0" }} data-testid="text-m2-solo-title">
        {t("m2.solo.title", "Solo Dram")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.solo.subtitle", "Log a whisky on your own — take notes, rate, and remember.")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: v.textSecondary, display: "block", marginBottom: 4 }}>
            {t("m2.solo.whiskyName", "Whisky Name")} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("m2.solo.namePlaceholder", "e.g. Ardbeg 10")}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${v.border}`, background: v.elevated, color: v.text, fontSize: 15, fontFamily: "system-ui, sans-serif", outline: "none", boxSizing: "border-box" }}
            data-testid="m2-solo-name"
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: v.textSecondary, display: "block", marginBottom: 4 }}>
            {t("m2.solo.distillery", "Distillery")}
          </label>
          <input
            type="text"
            value={distillery}
            onChange={(e) => setDistillery(e.target.value)}
            placeholder={t("m2.solo.distilleryPlaceholder", "e.g. Ardbeg")}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${v.border}`, background: v.elevated, color: v.text, fontSize: 15, fontFamily: "system-ui, sans-serif", outline: "none", boxSizing: "border-box" }}
            data-testid="m2-solo-distillery"
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: v.textSecondary, display: "block", marginBottom: 4 }}>
            {t("m2.solo.notes", "Tasting Notes")}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder={t("m2.solo.notesPlaceholder", "Nose, palate, finish...")}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${v.border}`, background: v.elevated, color: v.text, fontSize: 15, fontFamily: "system-ui, sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            data-testid="m2-solo-notes"
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: v.textSecondary, display: "block", marginBottom: 4 }}>
            {t("m2.solo.rating", "Rating")}: {rating}/100
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            style={{ width: "100%", accentColor: v.accent }}
            data-testid="m2-solo-rating"
          />
        </div>

        <button
          onClick={() => saveDram.mutate()}
          disabled={!name.trim() || saveDram.isPending}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "16px",
            borderRadius: 12,
            border: "none",
            background: !name.trim() ? v.muted : v.accent,
            color: v.bg,
            fontWeight: 700,
            fontSize: 16,
            cursor: !name.trim() || saveDram.isPending ? "not-allowed" : "pointer",
            fontFamily: "system-ui, sans-serif",
            opacity: saveDram.isPending ? 0.6 : 1,
            marginTop: 4,
          }}
          data-testid="m2-solo-save"
        >
          <PenLine style={{ width: 18, height: 18 }} />
          {saveDram.isPending ? t("m2.solo.saving", "Saving...") : t("m2.solo.save", "Save Dram")}
        </button>
      </div>
    </div>
  );
}
