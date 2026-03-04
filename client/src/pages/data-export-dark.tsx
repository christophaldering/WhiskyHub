import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { c, cardStyle } from "@/lib/theme";
import { getSession } from "@/lib/session";
import SimpleShell from "@/components/simple/simple-shell";
import {
  HardDriveDownload,
  Wine,
  NotebookPen,
  User,
  Users,
  Star,
  Archive,
  FileSpreadsheet,
  FileText,
  Loader2,
  Shield,
  Lock,
  KeyRound,
  X,
} from "lucide-react";

type AccessLevel = "own" | "extended" | "admin";

interface ExportCard {
  type: string;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  access: AccessLevel;
}

const EXPORT_CARDS: ExportCard[] = [
  { type: "profile", titleKey: "dataExport.profile", descKey: "dataExport.profileDesc", icon: User, access: "own" },
  { type: "journal", titleKey: "dataExport.journal", descKey: "dataExport.journalDesc", icon: NotebookPen, access: "own" },
  { type: "wishlist", titleKey: "dataExport.wishlist", descKey: "dataExport.wishlistDesc", icon: Star, access: "own" },
  { type: "collection", titleKey: "dataExport.collection", descKey: "dataExport.collectionDesc", icon: Archive, access: "own" },
  { type: "friends", titleKey: "dataExport.friends", descKey: "dataExport.friendsDesc", icon: Users, access: "own" },
  { type: "tastings", titleKey: "dataExport.tastings", descKey: "dataExport.tastingsDesc", icon: Wine, access: "extended" },
];

function PinDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
}) {
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...cardStyle,
          maxWidth: 360,
          width: "90%",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            color: c.muted,
            cursor: "pointer",
          }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <KeyRound style={{ width: 20, height: 20, color: c.accent }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: 0 }}>
            {t("dataExport.pinTitle")}
          </h3>
        </div>
        <p style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>
          {t("dataExport.pinDesc")}
        </p>

        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder={t("dataExport.pinPlaceholder")}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && pin.length >= 4) onConfirm(pin);
          }}
          style={{
            width: "100%",
            background: c.inputBg,
            border: `1px solid ${error ? c.error : c.inputBorder}`,
            borderRadius: 10,
            color: c.text,
            padding: "12px 14px",
            fontSize: 15,
            outline: "none",
            boxSizing: "border-box" as const,
            marginBottom: error ? 4 : 16,
          }}
          data-testid="input-export-pin"
          autoFocus
        />
        {error && (
          <p style={{ fontSize: 12, color: c.error, marginBottom: 12 }}>
            {t("dataExport.pinInvalid")}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              background: "transparent",
              color: c.muted,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {t("admin.cancel")}
          </button>
          <button
            onClick={() => pin.length >= 4 && onConfirm(pin)}
            disabled={pin.length < 4}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: pin.length >= 4 ? c.accent : c.border,
              color: pin.length >= 4 ? "#1a1714" : c.muted,
              fontSize: 13,
              fontWeight: 600,
              cursor: pin.length >= 4 ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            data-testid="button-confirm-export-pin"
          >
            <KeyRound style={{ width: 14, height: 14 }} />
            {t("dataExport.pinConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportButton({
  loading,
  onClick,
  icon: Icon,
  label,
}: {
  loading: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: `1px solid ${c.border}`,
        background: "transparent",
        color: loading ? c.muted : c.text,
        fontSize: 12,
        fontWeight: 500,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "all 0.2s",
      }}
    >
      {loading ? (
        <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
      ) : (
        <Icon style={{ width: 14, height: 14 }} />
      )}
      {label}
    </button>
  );
}

export default function DataExportDark() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const session = getSession();
  const participantId = session.pid;

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingExport, setPendingExport] = useState<{ type: string; format: string } | null>(null);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings", participantId],
    queryFn: () => tastingApi.getAll(participantId),
    enabled: !!participantId,
  });

  const isAdmin = false;
  const isHost = participantId && allTastings.some((t: any) => t.hostId === participantId);

  const hasAccess = useCallback(
    (level: AccessLevel) => {
      if (level === "own") return true;
      if (level === "extended") return isAdmin || !!isHost;
      if (level === "admin") return isAdmin;
      return false;
    },
    [isAdmin, isHost]
  );

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

  const executeExport = useCallback(
    async (type: string, format: string, pin: string) => {
      if (!participantId) return;
      const key = `${type}-${format}`;
      setLoading(key, true);
      try {
        const url =
          type === "all"
            ? `/api/export/all?participantId=${participantId}&format=${format}&pin=${encodeURIComponent(pin)}`
            : `/api/export/${type}?participantId=${participantId}&format=${format}&pin=${encodeURIComponent(pin)}`;
        const res = await fetch(url);
        if (res.status === 401) {
          setVerifiedPin(null);
          toast({ description: t("dataExport.pinInvalid"), variant: "destructive" });
          return;
        }
        if (res.status === 403) {
          toast({ description: t("dataExport.noPermission"), variant: "destructive" });
          return;
        }
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = `casksense_${type}_${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "xlsx" : format}`;
        a.click();
        URL.revokeObjectURL(urlObj);
        toast({ description: t("dataExport.downloadReady") });
      } catch {
        toast({ description: t("dataExport.noData"), variant: "destructive" });
      } finally {
        setLoading(key, false);
      }
    },
    [participantId, setLoading, toast, t]
  );

  const requestExport = useCallback(
    (type: string, format: string) => {
      if (verifiedPin) {
        executeExport(type, format, verifiedPin);
      } else {
        setPendingExport({ type, format });
        setShowPinDialog(true);
      }
    },
    [verifiedPin, executeExport]
  );

  const handlePinConfirm = useCallback(
    (pin: string) => {
      setVerifiedPin(pin);
      setShowPinDialog(false);
      if (pendingExport) {
        executeExport(pendingExport.type, pendingExport.format, pin);
        setPendingExport(null);
      }
    },
    [pendingExport, executeExport]
  );

  const accessBadge = (level: AccessLevel) => {
    if (level === "own") return null;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 6,
          border: `1px solid ${c.border}`,
          fontSize: 10,
          color: c.muted,
        }}
      >
        <Shield style={{ width: 10, height: 10 }} />
        {level === "extended" ? t("dataExport.hostOnly") : t("dataExport.adminOnly")}
      </span>
    );
  };

  if (!participantId) {
    return (
      <SimpleShell maxWidth={520}>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Lock style={{ width: 48, height: 48, color: c.muted, marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: c.text, marginBottom: 8 }}>
            {t("dataExport.title")}
          </h2>
          <p style={{ fontSize: 14, color: c.muted }}>
            {t("dataExport.subtitle")}
          </p>
        </div>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell maxWidth={520}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <PinDialog
        open={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onConfirm={handlePinConfirm}
      />

      <div data-testid="data-export-dark-page">
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: c.bg,
          paddingTop: 4,
          paddingBottom: 16,
          marginLeft: -20,
          marginRight: -20,
          paddingLeft: 20,
          paddingRight: 20,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <HardDriveDownload style={{ width: 24, height: 24, color: c.accent }} />
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: c.text,
                margin: 0,
                fontFamily: "'Playfair Display', serif",
              }}
              data-testid="text-data-export-title"
            >
              {t("dataExport.title")}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
            {t("dataExport.subtitle")}
          </p>
        </div>

        <div
          style={{
            background: `${c.accent}10`,
            border: `1px solid ${c.accent}25`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Lock style={{ width: 16, height: 16, color: c.accent, marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: c.mutedLight, lineHeight: 1.5 }}>
            <p style={{ fontWeight: 600, marginBottom: 4, color: c.text }}>{t("dataExport.securityTitle")}</p>
            <p style={{ margin: 0 }}>{t("dataExport.securityDesc")}</p>
          </div>
        </div>

        {verifiedPin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
              fontSize: 12,
              color: c.success,
            }}
          >
            <Shield style={{ width: 14, height: 14 }} />
            <span>{t("dataExport.pinVerified")}</span>
            <button
              onClick={() => setVerifiedPin(null)}
              style={{
                background: "none",
                border: "none",
                color: c.muted,
                fontSize: 11,
                cursor: "pointer",
                textDecoration: "underline",
                marginLeft: 8,
              }}
              data-testid="button-lock-exports"
            >
              {t("dataExport.lockAgain")}
            </button>
          </div>
        )}

        {isAdmin && (
          <div
            style={{ ...cardStyle, marginBottom: 20 }}
            data-testid="card-export-all"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${c.accent}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HardDriveDownload style={{ width: 20, height: 20, color: c.accent }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>
                    {t("dataExport.exportAll")}
                  </span>
                  {accessBadge("admin")}
                </div>
                <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
                  {t("dataExport.exportAllDesc")}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <ExportButton
                loading={!!loadingStates["all-csv"]}
                onClick={() => requestExport("all", "csv")}
                icon={FileText}
                label={loadingStates["all-csv"] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
              />
              <ExportButton
                loading={!!loadingStates["all-xlsx"]}
                onClick={() => requestExport("all", "xlsx")}
                icon={FileSpreadsheet}
                label={loadingStates["all-xlsx"] ? t("dataExport.downloading") : t("dataExport.formatExcel")}
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {EXPORT_CARDS.map((card) => {
            const Icon = card.icon;
            const csvKey = `${card.type}-csv`;
            const xlsxKey = `${card.type}-xlsx`;
            const accessible = hasAccess(card.access);

            return (
              <div
                key={card.type}
                style={{
                  ...cardStyle,
                  opacity: accessible ? 1 : 0.45,
                  transition: "border-color 0.2s",
                }}
                data-testid={`card-export-${card.type}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: accessible ? 12 : 0 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: accessible ? `${c.accent}15` : `${c.muted}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 20, height: 20, color: accessible ? c.accent : c.muted }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>
                        {t(card.titleKey)}
                      </span>
                      {accessBadge(card.access)}
                    </div>
                    <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
                      {t(card.descKey)}
                    </p>
                  </div>
                </div>

                {accessible ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <ExportButton
                      loading={!!loadingStates[csvKey]}
                      onClick={() => requestExport(card.type, "csv")}
                      icon={FileText}
                      label={loadingStates[csvKey] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
                    />
                    <ExportButton
                      loading={!!loadingStates[xlsxKey]}
                      onClick={() => requestExport(card.type, "xlsx")}
                      icon={FileSpreadsheet}
                      label={loadingStates[xlsxKey] ? t("dataExport.downloading") : t("dataExport.formatExcel")}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: c.muted }}>
                    <Lock style={{ width: 12, height: 12 }} />
                    {t("dataExport.noAccess")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SimpleShell>
  );
}
