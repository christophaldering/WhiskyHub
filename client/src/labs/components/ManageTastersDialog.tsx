import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  X,
  Users,
  Eye,
  EyeOff,
  GitMerge,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Crown,
  Info,
} from "lucide-react";
import ModalPortal from "@/labs/components/ModalPortal";
import { tastingApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export type ManageTastersParticipant = {
  id?: string;
  participantId?: string;
  excludedFromResults?: boolean;
  ratingCount?: number;
  joinedAt?: string | null;
  participant?: { id?: string; name?: string | null; email?: string | null } | null;
  name?: string | null;
  email?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  tastingId: string;
  participants: ManageTastersParticipant[];
  hostId?: string | null;
  /** Optional extra invalidations (e.g. for non-standard query keys). */
  extraQueryKeys?: unknown[][];
  /** Optional confirm action shown next to the close button (e.g. "Tasting schließen"). */
  confirmAction?: {
    label: string;
    onConfirm: () => void | Promise<void>;
    icon?: ReactNode;
    variant?: "primary" | "danger";
    busy?: boolean;
  } | null;
};

const STANDARD_KEYS = (tastingId: string) => [
  ["tasting", tastingId],
  ["tasting-participants", tastingId],
  ["tastingParticipants", tastingId],
  ["tasting-ratings", tastingId],
  ["tastingRatings", tastingId],
  ["tasting-ai-report", tastingId],
  ["tasting-results", tastingId],
  ["tasting-analytics", tastingId],
  ["tastings"],
] as const;

export function invalidateTastingAggregates(queryClient: ReturnType<typeof useQueryClient>, tastingId: string, extra: unknown[][] = []) {
  for (const key of STANDARD_KEYS(tastingId)) {
    queryClient.invalidateQueries({ queryKey: key as unknown as readonly unknown[] });
  }
  for (const key of extra) {
    queryClient.invalidateQueries({ queryKey: key as unknown as readonly unknown[] });
  }
}

function pId(p: ManageTastersParticipant): string {
  return (p.participantId || p.participant?.id || p.id || "") as string;
}
function pName(p: ManageTastersParticipant): string {
  const raw = p.participant?.name ?? p.name ?? "";
  return stripGuestSuffix(raw).trim() || (p.participant?.email ?? p.email ?? "Anonymous");
}
function pEmail(p: ManageTastersParticipant): string {
  return (p.participant?.email ?? p.email ?? "") as string;
}
function pRatingCount(p: ManageTastersParticipant): number {
  return typeof p.ratingCount === "number" ? p.ratingCount : 0;
}

function normalizeName(p: ManageTastersParticipant): string {
  return pName(p).toLowerCase().replace(/\s+/g, " ").trim();
}
function emailLocal(p: ManageTastersParticipant): string {
  const e = pEmail(p).toLowerCase().trim();
  if (!e || !e.includes("@")) return "";
  return e.split("@")[0];
}

/** Returns set of participantIds that are part of any potential-duplicate cluster. */
function detectDuplicateIds(list: ManageTastersParticipant[]): Set<string> {
  const dupIds = new Set<string>();
  const byName = new Map<string, string[]>();
  const byEmail = new Map<string, string[]>();
  const byEmailLocal = new Map<string, string[]>();

  for (const p of list) {
    const id = pId(p);
    if (!id) continue;
    const n = normalizeName(p);
    const e = pEmail(p).toLowerCase().trim();
    const local = emailLocal(p);
    if (n) {
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n)!.push(id);
    }
    if (e) {
      if (!byEmail.has(e)) byEmail.set(e, []);
      byEmail.get(e)!.push(id);
    }
    if (local) {
      if (!byEmailLocal.has(local)) byEmailLocal.set(local, []);
      byEmailLocal.get(local)!.push(id);
    }
  }

  const collect = (m: Map<string, string[]>) => {
    Array.from(m.values()).forEach(ids => {
      if (ids.length > 1) ids.forEach(id => dupIds.add(id));
    });
  };
  collect(byName);
  collect(byEmail);
  collect(byEmailLocal);

  return dupIds;
}

export default function ManageTastersDialog({
  open,
  onClose,
  tastingId,
  participants,
  hostId,
  extraQueryKeys,
  confirmAction,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [pendingMergeId, setPendingMergeId] = useState<string | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(max-width: 600px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 600px)");
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    setIsCompact(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  const invalidateAll = () => invalidateTastingAggregates(queryClient, tastingId, extraQueryKeys);

  const inclusionMut = useMutation({
    mutationFn: ({ participantId, excluded }: { participantId: string; excluded: boolean }) =>
      tastingApi.setParticipantInclusion(tastingId, participantId, excluded),
    onSuccess: () => invalidateAll(),
  });

  const mergeMut = useMutation({
    mutationFn: ({ source, target }: { source: string; target: string }) =>
      tastingApi.mergeParticipants(tastingId, source, target),
    onSuccess: (res: any) => {
      invalidateAll();
      toast({
        title: t("manageTasters.mergeDoneTitle", "Taster zusammengeführt"),
        description: t(
          "manageTasters.mergeDoneDesc",
          "{{moved}} Bewertungen übertragen, {{discarded}} Doppelbewertungen verworfen.",
          { moved: res?.ratingsMoved ?? 0, discarded: res?.ratingsDiscarded ?? 0 },
        ),
      });
    },
    onError: (e: any) => {
      toast({
        title: t("manageTasters.mergeErrorTitle", "Zusammenführen fehlgeschlagen"),
        description: e?.message || "",
        variant: "destructive",
      });
    },
  });

  const list = useMemo(() => participants || [], [participants]);

  const duplicateIds = useMemo(() => detectDuplicateIds(list), [list]);

  const sortedList = useMemo(() => {
    const arr = [...list];
    arr.sort((a, b) => {
      const aIsHost = hostId && pId(a) === hostId ? 1 : 0;
      const bIsHost = hostId && pId(b) === hostId ? 1 : 0;
      if (aIsHost !== bIsHost) return bIsHost - aIsHost; // host first
      const aDup = duplicateIds.has(pId(a)) ? 1 : 0;
      const bDup = duplicateIds.has(pId(b)) ? 1 : 0;
      if (aDup !== bDup) return bDup - aDup; // duplicates next
      const aName = normalizeName(a);
      const bName = normalizeName(b);
      return aName.localeCompare(bName);
    });
    return arr;
  }, [list, duplicateIds, hostId]);

  const includedCount = list.filter(p => !p.excludedFromResults).length;
  const excludedCount = list.length - includedCount;

  const handleStartMerge = (id: string) => {
    setMergeSourceId(id);
    setMergeTargetId("");
  };

  const handleConfirmMerge = async () => {
    if (!mergeSourceId || !mergeTargetId) return;
    const sourceP = list.find(p => pId(p) === mergeSourceId);
    const targetP = list.find(p => pId(p) === mergeTargetId);
    if (!sourceP || !targetP) return;
    const ok = window.confirm(
      t(
        "manageTasters.mergeConfirmText",
        "Bewertungen von „{{source}}\" werden auf „{{target}}\" übertragen, Duplikate verworfen, „{{source}}\" wird danach aus der Auswertung ausgeschlossen. Fortfahren?",
        { source: pName(sourceP), target: pName(targetP) },
      ),
    );
    if (!ok) return;
    setPendingMergeId(mergeSourceId);
    try {
      await mergeMut.mutateAsync({ source: mergeSourceId, target: mergeTargetId });
      setMergeSourceId(null);
      setMergeTargetId("");
    } catch {
      // toast handled in onError
    } finally {
      setPendingMergeId(null);
    }
  };

  const handleToggle = async (p: ManageTastersParticipant) => {
    const id = pId(p);
    if (!id) return;
    setPendingToggleId(id);
    try {
      await inclusionMut.mutateAsync({ participantId: id, excluded: !p.excludedFromResults });
    } finally {
      setPendingToggleId(null);
    }
  };

  return (
    <ModalPortal
      open={open}
      onClose={onClose}
      closeOnOverlayClick={false}
      testId="modal-manage-tasters"
    >
      <div
        style={{
          background: "var(--labs-surface)",
          borderRadius: 16,
          padding: isCompact ? "18px 14px" : "24px 22px",
          maxWidth: 560,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "85vh",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Users style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
              <h2 className="labs-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
                {t("manageTasters.title", "Taster verwalten")}
              </h2>
            </div>
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.55, margin: 0 }}>
              {t(
                "manageTasters.intro",
                "Lege erst Doubletten zusammen, schließe danach übrige Test- oder Beobachter-Konten aus. Änderungen wirken sofort auf alle Auswertungen, Charts, Exporte und KI-Analysen.",
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--labs-text-muted)",
              padding: 4,
            }}
            data-testid="modal-manage-tasters-close"
            aria-label={t("ui.close", "Schließen")}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(212,162,86,0.06)",
            border: "1px solid rgba(212,162,86,0.18)",
            fontSize: 11,
            color: "var(--labs-text-muted)",
          }}
          data-testid="manage-tasters-counts"
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--labs-text)", fontWeight: 600 }}>
            <CheckCircle2 style={{ width: 12, height: 12, color: "var(--labs-success)" }} />
            {t("manageTasters.includedCount", "{{count}} eingeschlossen", { count: includedCount })}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <EyeOff style={{ width: 12, height: 12 }} />
            {t("manageTasters.excludedCount", "{{count}} ausgeschlossen", { count: excludedCount })}
          </span>
          {duplicateIds.size > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--labs-warning, #e67e22)" }}>
              <AlertTriangle style={{ width: 12, height: 12 }} />
              {t("manageTasters.duplicateCount", "{{count}} mögliche Doublette(n)", { count: duplicateIds.size })}
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingRight: 4,
          }}
          data-testid="manage-tasters-list"
        >
          {sortedList.length === 0 && (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>
              {t("manageTasters.empty", "Keine Teilnehmer in diesem Tasting.")}
            </div>
          )}
          {sortedList.map(p => {
            const id = pId(p);
            const isHost = !!hostId && id === hostId;
            const isExcluded = !!p.excludedFromResults;
            const isDuplicate = duplicateIds.has(id);
            const ratingCount = pRatingCount(p);
            const email = pEmail(p);
            const isMerging = mergeSourceId === id;
            const togglingThis = pendingToggleId === id;
            const otherTargets = sortedList.filter(o => {
              const oId = pId(o);
              if (oId === id) return false;
              if (isHost) return false; // host can't be source
              return true;
            });

            return (
              <div
                key={id || pName(p)}
                style={{
                  border: `1px solid ${isDuplicate ? "rgba(230, 126, 34, 0.45)" : "var(--labs-border)"}`,
                  borderRadius: 10,
                  background: "var(--labs-surface-elevated, var(--labs-surface))",
                  opacity: isExcluded ? 0.75 : 1,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
                data-testid={`manage-taster-row-${id}`}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: isCompact ? "flex-start" : "center",
                    gap: isCompact ? 8 : 10,
                    padding: "12px 12px",
                    flexWrap: isCompact ? "wrap" : "nowrap",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      background: "var(--labs-accent-muted)",
                      color: "var(--labs-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {pName(p).charAt(0).toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, width: isCompact ? "auto" : undefined }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: isExcluded ? "var(--labs-text-muted)" : "var(--labs-text)",
                          textDecoration: isExcluded ? "line-through" : "none",
                        }}
                        data-testid={`manage-taster-name-${id}`}
                      >
                        {pName(p)}
                      </span>
                      {isHost && (
                        <span
                          title={t("ui.host", "Host")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 6,
                            background: "var(--labs-accent-muted)",
                            color: "var(--labs-accent)",
                          }}
                        >
                          <Crown style={{ width: 9, height: 9 }} />
                          {t("ui.host", "Host")}
                        </span>
                      )}
                      {isDuplicate && !isHost && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 6,
                            background: "rgba(230,126,34,0.14)",
                            color: "var(--labs-warning, #e67e22)",
                          }}
                          data-testid={`manage-taster-duplicate-badge-${id}`}
                        >
                          <AlertTriangle style={{ width: 9, height: 9 }} />
                          {t("manageTasters.duplicateBadge", "Mögliche Doublette")}
                        </span>
                      )}
                      {isExcluded && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            color: "var(--labs-text-muted)",
                            background: "rgba(255,255,255,0.06)",
                            padding: "1px 6px",
                            borderRadius: 6,
                          }}
                        >
                          {t("manageTasters.excludedBadge", "Ausgeschlossen")}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {ratingCount === 0 && <AlertTriangle style={{ width: 10, height: 10, color: "var(--labs-warning, #e67e22)" }} />}
                        {t("manageTasters.ratingsCount", "{{count}} Bewertungen", { count: ratingCount })}
                      </span>
                      {email && (
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }} title={email}>
                          · {email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      flexWrap: "wrap",
                      width: isCompact ? "100%" : "auto",
                      justifyContent: isCompact ? "flex-end" : "flex-start",
                      marginTop: isCompact ? 4 : 0,
                    }}
                  >
                    {!isHost && otherTargets.length > 0 && (
                      <button
                        onClick={() => (isMerging ? setMergeSourceId(null) : handleStartMerge(id))}
                        title={t("manageTasters.mergeAction", "Mit anderem Taster zusammenlegen")}
                        data-testid={`manage-taster-merge-${id}`}
                        style={{
                          padding: isCompact ? "8px 10px" : "5px 8px",
                          minHeight: isCompact ? 36 : undefined,
                          borderRadius: 8,
                          border: "1px solid var(--labs-border)",
                          background: isMerging ? "rgba(212,162,86,0.16)" : "transparent",
                          color: isMerging ? "var(--labs-accent)" : "var(--labs-text-muted)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: isCompact ? 12 : 11,
                          fontWeight: 600,
                        }}
                      >
                        <GitMerge style={{ width: 12, height: 12 }} />
                        {t("manageTasters.merge", "Zusammenlegen")}
                      </button>
                    )}
                    {!isHost && (
                      <button
                        onClick={() => handleToggle(p)}
                        disabled={togglingThis}
                        title={
                          isExcluded
                            ? t("manageTasters.includeAction", "In Auswertung einbeziehen")
                            : t("manageTasters.excludeAction", "Aus Auswertung ausschließen")
                        }
                        data-testid={`manage-taster-toggle-${id}`}
                        style={{
                          padding: isCompact ? "8px 10px" : "5px 8px",
                          minHeight: isCompact ? 36 : undefined,
                          borderRadius: 8,
                          border: "1px solid var(--labs-border)",
                          background: "transparent",
                          color: isExcluded ? "var(--labs-success)" : "var(--labs-text-muted)",
                          cursor: togglingThis ? "wait" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: isCompact ? 12 : 11,
                          fontWeight: 600,
                        }}
                      >
                        {togglingThis ? (
                          <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                        ) : isExcluded ? (
                          <Eye style={{ width: 12, height: 12 }} />
                        ) : (
                          <EyeOff style={{ width: 12, height: 12 }} />
                        )}
                        {isExcluded
                          ? t("manageTasters.include", "Einbeziehen")
                          : t("manageTasters.exclude", "Ausschließen")}
                      </button>
                    )}
                  </div>
                </div>

                {isMerging && (
                  <div
                    style={{
                      borderTop: "1px solid var(--labs-border-subtle, var(--labs-border))",
                      background: "var(--labs-surface)",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                    data-testid={`manage-taster-merge-panel-${id}`}
                  >
                    <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>
                      {t(
                        "manageTasters.mergeIntoLabel",
                        "„{{name}}\" zusammenführen mit:",
                        { name: pName(p) },
                      )}
                    </p>
                    <select
                      value={mergeTargetId}
                      onChange={e => setMergeTargetId(e.target.value)}
                      data-testid={`manage-taster-merge-select-${id}`}
                      className="labs-input"
                      style={{ fontSize: 12, padding: "6px 8px" }}
                    >
                      <option value="">{t("manageTasters.mergeSelectPlaceholder", "Ziel-Taster wählen…")}</option>
                      {otherTargets.map(o => {
                        const oId = pId(o);
                        const oName = pName(o);
                        return (
                          <option key={oId} value={oId}>
                            {oName}
                            {duplicateIds.has(oId) ? ` · ${t("manageTasters.duplicateInline", "mögliche Doublette")}` : ""}
                          </option>
                        );
                      })}
                    </select>
                    <p style={{ fontSize: 10, color: "var(--labs-text-muted)", margin: 0, display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <Info style={{ width: 11, height: 11, marginTop: 1, flexShrink: 0 }} />
                      <span>
                        {t(
                          "manageTasters.mergeWarning",
                          "Alle Bewertungen werden auf den Ziel-Taster übertragen. Bei Doppelbewertungen behält das Ziel seine Werte. Diese Aktion kann nicht rückgängig gemacht werden.",
                        )}
                      </span>
                    </p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={handleConfirmMerge}
                        disabled={!mergeTargetId || pendingMergeId === id}
                        className="labs-btn-primary"
                        style={{ flex: 1, fontSize: 12, padding: "6px 10px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                        data-testid={`manage-taster-merge-confirm-${id}`}
                      >
                        {pendingMergeId === id ? (
                          <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                        ) : (
                          <GitMerge style={{ width: 12, height: 12 }} />
                        )}
                        {t("manageTasters.mergeConfirm", "Zusammenführen")}
                      </button>
                      <button
                        onClick={() => {
                          setMergeSourceId(null);
                          setMergeTargetId("");
                        }}
                        className="labs-btn-ghost"
                        style={{ fontSize: 12, padding: "6px 10px" }}
                        disabled={pendingMergeId === id}
                        data-testid={`manage-taster-merge-cancel-${id}`}
                      >
                        {t("ui.cancel", "Abbrechen")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid var(--labs-border)" }}>
          <button
            onClick={onClose}
            className="labs-btn-ghost"
            style={{ flex: 1, fontSize: 13, padding: "8px 12px" }}
            data-testid="manage-tasters-done"
          >
            {confirmAction ? t("ui.cancel", "Abbrechen") : t("manageTasters.done", "Fertig")}
          </button>
          {confirmAction && (
            <button
              onClick={() => void confirmAction.onConfirm()}
              className={confirmAction.variant === "danger" ? "cockpit-action-btn cockpit-action-danger" : "labs-btn-primary"}
              style={{ flex: 2, fontSize: 13, padding: "8px 12px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              data-testid="manage-tasters-confirm-action"
              disabled={!!confirmAction.busy}
            >
              {confirmAction.busy ? (
                <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              ) : (
                confirmAction.icon
              )}
              {confirmAction.label}
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
