import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2 } from "lucide-react";
import { whiskyApi, tastingApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { stripGuestSuffix } from "@/lib/utils";
import { generateTastingMenu } from "@/components/tasting-menu-pdf";
import {
  generateBlankTastingMat,
  generateTastingNotesSheet,
  generateBlindEvaluationSheet,
} from "@/components/printable-tasting-sheets";
import type { Tasting, Whisky } from "@shared/schema";

interface SharedPrintMaterials {
  menuCard?: boolean;
  scoreSheets?: boolean;
  tastingMat?: boolean;
  masterSheet?: boolean;
}

interface TastingParticipantRow {
  id?: string;
  participantId?: string;
  name?: string;
  photoUrl?: string | null;
  participant?: { name?: string; photoUrl?: string | null };
}

function parseSharedMaterials(tasting: Tasting): SharedPrintMaterials | null {
  try {
    const raw = tasting.sharedPrintMaterials;
    if (!raw) return null;
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as SharedPrintMaterials;
    const hasAny = obj.menuCard || obj.scoreSheets || obj.tastingMat || obj.masterSheet;
    return hasAny ? obj : null;
  } catch {
    return null;
  }
}

function useDownloadHandlers(tasting: Tasting) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const { currentParticipant } = useAppStore();
  const [generating, setGenerating] = useState<string | null>(null);

  const shared = parseSharedMaterials(tasting);

  const { data: whiskies = [] } = useQuery<Whisky[]>({
    queryKey: ["whiskies", tasting.id],
    queryFn: () => whiskyApi.getForTasting(tasting.id),
    enabled: !!tasting.id && !!shared,
  });

  const { data: participants = [] } = useQuery<TastingParticipantRow[]>({
    queryKey: ["tasting-participants", tasting.id],
    queryFn: () => tastingApi.getParticipants(tasting.id),
    enabled: !!tasting.id && !!shared?.menuCard,
  });

  const resolveHostName = (): string => {
    const found = participants.find((p) =>
      (p.participantId || p.id) === tasting.hostId
    );
    return stripGuestSuffix(found?.name || found?.participant?.name || "Host");
  };

  const handleMenuCard = async () => {
    if (whiskies.length === 0) return;
    setGenerating("menuCard");
    try {
      const pList = participants.map((p) => ({
        name: stripGuestSuffix(p.name || p.participant?.name || "Unknown"),
        photoUrl: p.photoUrl || p.participant?.photoUrl || null,
      }));
      await generateTastingMenu({
        tasting,
        whiskies,
        participants: pList,
        hostName: resolveHostName(),
        coverImageBase64: null,
        orientation: "portrait",
        blindMode: !!tasting.blindMode,
        language: lang,
      });
    } catch (e) {
      console.error("Menu generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleScoreSheets = async () => {
    if (whiskies.length === 0) return;
    setGenerating("scoreSheets");
    try {
      const sheetFn = tasting.blindMode ? generateBlindEvaluationSheet : generateTastingNotesSheet;
      await sheetFn(
        tasting,
        whiskies,
        lang,
        currentParticipant ? { name: stripGuestSuffix(currentParticipant.name) } : undefined,
        "download",
        resolveHostName(),
        "portrait",
        null,
      );
    } catch (e) {
      console.error("Score sheet generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleTastingMat = async () => {
    setGenerating("tastingMat");
    try {
      await generateBlankTastingMat(lang, whiskies.length, tasting.ratingScale || 10);
    } catch (e) {
      console.error("Mat generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleMasterSheet = async () => {
    if (whiskies.length === 0) return;
    setGenerating("masterSheet");
    try {
      const sheetFn = tasting.blindMode ? generateBlindEvaluationSheet : generateTastingNotesSheet;
      await sheetFn(
        tasting,
        whiskies,
        lang,
        undefined,
        "download",
        resolveHostName(),
        "portrait",
        null,
      );
    } catch (e) {
      console.error("Master sheet generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handlers: Record<string, () => Promise<void> | void> = {
    menuCard: handleMenuCard,
    scoreSheets: handleScoreSheets,
    tastingMat: handleTastingMat,
    masterSheet: handleMasterSheet,
  };

  return { shared, generating, handlers };
}

function buildItemsList(shared: SharedPrintMaterials, t: (key: string, fallback: string) => string) {
  return [
    shared.menuCard && { key: "menuCard", label: t("printableSheets.menuCard", "Menu Card") },
    shared.scoreSheets && { key: "scoreSheets", label: t("printableSheets.scoreSheets", "Score Sheets") },
    shared.tastingMat && { key: "tastingMat", label: t("printableSheets.tastingMat", "Tasting Mat") },
    shared.masterSheet && { key: "masterSheet", label: t("printableSheets.masterSheet", "Master Sheet") },
  ].filter((x): x is { key: string; label: string } => !!x);
}

export function LabsParticipantDownloads({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const { shared, generating, handlers } = useDownloadHandlers(tasting);
  if (!shared) return null;

  const items = buildItemsList(shared, t);
  if (items.length === 0) return null;

  return (
    <div className="labs-card p-4 mb-6" data-testid="labs-participant-downloads">
      <div className="labs-section-label flex items-center gap-2">
        <Download className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
        {t("printableSheets.participantDownloads", "Downloads")}
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
        {t("printableSheets.participantDownloadsDesc", "Materials shared by the host")}
      </p>
      <div className="space-y-2">
        {items.map(({ key, label }) => (
          <button
            key={key}
            className="labs-btn-secondary text-sm flex items-center gap-2 w-full justify-center"
            onClick={() => handlers[key]?.()}
            disabled={generating === key}
            data-testid={`download-${key}`}
          >
            {generating === key ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {generating === key ? t("printableSheets.generating", "Generating...") : label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function M2ParticipantDownloads({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const { shared, generating, handlers } = useDownloadHandlers(tasting);
  if (!shared) return null;

  const items = buildItemsList(shared, t);
  if (items.length === 0) return null;

  const v = {
    card: "var(--m2-card, #1a1714)",
    border: "var(--m2-border, #2a2520)",
    text: "var(--m2-text, #e8e0d4)",
    muted: "var(--m2-muted, #8a7e6e)",
    accent: "var(--m2-accent, #d4a256)",
  };

  return (
    <div
      style={{
        background: v.card,
        border: `1px solid ${v.border}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
      data-testid="m2-participant-downloads"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Download style={{ width: 16, height: 16, color: v.accent }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: v.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t("printableSheets.participantDownloads", "Downloads")}
        </span>
      </div>
      <p style={{ fontSize: 12, color: v.muted, margin: "0 0 12px 0" }}>
        {t("printableSheets.participantDownloadsDesc", "Materials shared by the host")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlers[key]?.()}
            disabled={generating === key}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "12px 14px", borderRadius: 10, border: `1px solid ${v.border}`,
              background: v.card, color: v.text, fontSize: 13, fontWeight: 500,
              cursor: generating === key ? "not-allowed" : "pointer",
              opacity: generating === key ? 0.6 : 1,
              transition: "all 0.2s",
              fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "left" as const,
            }}
            data-testid={`m2-download-${key}`}
          >
            {generating === key ? (
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite", flexShrink: 0 }} />
            ) : (
              <FileText style={{ width: 16, height: 16, color: v.accent, flexShrink: 0 }} />
            )}
            <span>{generating === key ? t("printableSheets.generating", "Generating...") : label}</span>
            <Download style={{ width: 14, height: 14, marginLeft: "auto", color: v.muted, flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompactDownloadButton({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { shared, generating, handlers } = useDownloadHandlers(tasting);

  if (!shared) return null;

  const items = buildItemsList(shared, t);
  if (items.length === 0) return null;

  return (
    <div style={{ position: "relative", display: "inline-block" }} data-testid="compact-download-trigger">
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--labs-accent, var(--m2-accent, #d4a256))",
        }}
        title={t("printableSheets.participantDownloads", "Downloads")}
        data-testid="button-compact-downloads"
      >
        <Download style={{ width: 18, height: 18 }} />
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: 4,
              minWidth: 180,
              background: "var(--labs-surface, var(--m2-card, #1a1714))",
              border: "1px solid var(--labs-border, var(--m2-border, #2a2520))",
              borderRadius: 10,
              padding: 8,
              zIndex: 100,
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
            data-testid="compact-downloads-dropdown"
          >
            {items.map(({ key, label }) => (
              <button
                key={key}
                onClick={async () => {
                  await handlers[key]?.();
                  setOpen(false);
                }}
                disabled={generating === key}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 10px", borderRadius: 6, border: "none",
                  background: "transparent",
                  color: "var(--labs-text, var(--m2-text, #e8e0d4))",
                  fontSize: 13, cursor: generating === key ? "wait" : "pointer",
                  fontFamily: "system-ui, sans-serif", textAlign: "left" as const,
                }}
                data-testid={`compact-download-${key}`}
              >
                {generating === key ? (
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite", flexShrink: 0 }} />
                ) : (
                  <FileText style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.7 }} />
                )}
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
