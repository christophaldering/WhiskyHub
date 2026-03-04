import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { c, cardStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";
import { GuestPreview } from "@/components/guest-preview";
import { useToast } from "@/hooks/use-toast";
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

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 8,
  border: `1px solid ${c.border}`,
  background: c.inputBg,
  color: c.text,
  cursor: "pointer",
  transition: "border-color 0.2s, opacity 0.2s",
};

const btnDisabledExtra: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10,
  fontWeight: 400,
  border: `1px solid ${c.border}`,
  borderRadius: 6,
  padding: "2px 8px",
  color: c.muted,
};

const iconBoxStyle = (active: boolean): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: active ? `${c.accent}18` : c.inputBg,
  color: active ? c.accent : c.muted,
  flexShrink: 0,
});

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  ...cardStyle,
  width: "90%",
  maxWidth: 420,
  padding: 24,
};

export default function DataExport() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pendingExport, setPendingExport] = useState<{ type: string; format: string } | null>(null);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const isAdmin = currentParticipant?.role === "admin";
  const isHost = currentParticipant && allTastings.some((t: any) => t.hostId === currentParticipant.id);

  const hasAccess = useCallback((level: AccessLevel) => {
    if (level === "own") return true;
    if (level === "extended") return isAdmin || isHost;
    if (level === "admin") return isAdmin;
    return false;
  }, [isAdmin, isHost]);

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

  const executeExport = useCallback(
    async (type: string, format: string, pin: string) => {
      if (!currentParticipant) return;
      const key = `${type}-${format}`;
      setLoading(key, true);
      try {
        const url = type === "all"
          ? `/api/export/all?participantId=${currentParticipant.id}&format=${format}&pin=${encodeURIComponent(pin)}`
          : `/api/export/${type}?participantId=${currentParticipant.id}&format=${format}&pin=${encodeURIComponent(pin)}`;
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
    [currentParticipant, setLoading, toast, t]
  );

  const requestExport = useCallback((type: string, format: string) => {
    if (verifiedPin) {
      executeExport(type, format, verifiedPin);
    } else {
      setPendingExport({ type, format });
      setPinInput("");
      setPinError(false);
      setShowPinDialog(true);
    }
  }, [verifiedPin, executeExport]);

  const handlePinConfirm = useCallback(() => {
    if (pinInput.length < 4) return;
    setVerifiedPin(pinInput);
    setShowPinDialog(false);
    if (pendingExport) {
      executeExport(pendingExport.type, pendingExport.format, pinInput);
      setPendingExport(null);
    }
  }, [pinInput, pendingExport, executeExport]);

  const accessBadge = (level: AccessLevel) => {
    if (level === "own") return null;
    if (level === "extended") {
      return (
        <span style={badgeStyle}>
          <Shield style={{ width: 12, height: 12 }} />
          {t("dataExport.hostOnly")}
        </span>
      );
    }
    return (
      <span style={badgeStyle}>
        <Shield style={{ width: 12, height: 12 }} />
        {t("dataExport.adminOnly")}
      </span>
    );
  };

  if (!currentParticipant) {
    return (
      <GuestPreview
        featureTitle={t("dataExport.title")}
        featureDescription={t("dataExport.subtitle")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ ...pageTitleStyle, fontSize: 22 }}>{t("dataExport.title")}</h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {EXPORT_CARDS.filter(c => c.access === "own").slice(0, 3).map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.type} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16, padding: 16 }}>
                  <div style={iconBoxStyle(true)}>
                    <Icon style={{ width: 20, height: 20 }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text }}>{t(card.titleKey)}</div>
                    <div style={{ fontSize: 13, color: c.muted }}>{t(card.descKey)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GuestPreview>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px", minWidth: 0, overflowX: "hidden" }} data-testid="data-export-page">
      {showPinDialog && (
        <div style={overlayStyle} onClick={() => setShowPinDialog(false)}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <KeyRound style={{ width: 20, height: 20, color: c.accent }} />
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, margin: 0, fontSize: 18 }}>
                {t("dataExport.pinTitle")}
              </h2>
            </div>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>
              {t("dataExport.pinDesc")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder={t("dataExport.pinPlaceholder")}
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                style={{
                  width: "100%",
                  background: c.inputBg,
                  border: `1px solid ${pinError ? c.error : c.inputBorder}`,
                  borderRadius: 10,
                  color: c.text,
                  padding: "10px 14px",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePinConfirm()}
                data-testid="input-export-pin"
                autoFocus
              />
              {pinError && (
                <p style={{ fontSize: 12, color: c.error, margin: 0 }}>{t("dataExport.pinInvalid")}</p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                style={{ ...btnStyle, background: "transparent" }}
                onClick={() => setShowPinDialog(false)}
              >
                {t("admin.cancel")}
              </button>
              <button
                style={{
                  ...btnStyle,
                  background: c.accent,
                  color: c.bg,
                  border: "none",
                  ...(pinInput.length < 4 ? btnDisabledExtra : {}),
                }}
                onClick={handlePinConfirm}
                disabled={pinInput.length < 4}
                data-testid="button-confirm-export-pin"
              >
                <KeyRound style={{ width: 16, height: 16 }} />
                {t("dataExport.pinConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <HardDriveDownload style={{ width: 28, height: 28, color: c.accent }} />
          <h1 style={pageTitleStyle} data-testid="text-data-export-title">
            {t("dataExport.title")}
          </h1>
        </div>
        <p style={pageSubtitleStyle}>{t("dataExport.subtitle")}</p>

        <div style={{
          background: `${c.accent}10`,
          border: `1px solid ${c.accent}30`,
          borderRadius: 10,
          padding: 16,
          marginTop: 16,
          marginBottom: 32,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}>
          <Lock style={{ width: 16, height: 16, color: c.accent, marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: c.text, lineHeight: 1.6 }}>
            <p style={{ fontWeight: 600, marginBottom: 4, margin: 0 }}>{t("dataExport.securityTitle")}</p>
            <p style={{ margin: 0 }}>{t("dataExport.securityDesc")}</p>
          </div>
        </div>

        {verifiedPin && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 12, color: c.success }}>
            <Shield style={{ width: 14, height: 14 }} />
            <span>{t("dataExport.pinVerified")}</span>
            <button
              onClick={() => setVerifiedPin(null)}
              style={{
                background: "none",
                border: "none",
                color: c.muted,
                textDecoration: "underline",
                cursor: "pointer",
                marginLeft: 8,
                fontSize: 12,
                padding: 0,
              }}
              data-testid="button-lock-exports"
            >
              {t("dataExport.lockAgain")}
            </button>
          </div>
        )}

        {isAdmin && (
          <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }} data-testid="card-export-all">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={iconBoxStyle(true)}>
                  <HardDriveDownload style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, margin: 0, fontSize: 15 }}>{t("dataExport.exportAll")}</h2>
                    {accessBadge("admin")}
                  </div>
                  <p style={{ fontSize: 12, color: c.muted, margin: "4px 0 0" }}>{t("dataExport.exportAllDesc")}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  style={{ ...btnStyle, ...(loadingStates["all-csv"] ? btnDisabledExtra : {}) }}
                  onClick={() => requestExport("all", "csv")}
                  disabled={loadingStates["all-csv"]}
                  data-testid="button-export-all-csv"
                >
                  {loadingStates["all-csv"]
                    ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    : <FileText style={{ width: 16, height: 16 }} />}
                  {loadingStates["all-csv"] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
                </button>
                <button
                  style={{ ...btnStyle, ...(loadingStates["all-xlsx"] ? btnDisabledExtra : {}) }}
                  onClick={() => requestExport("all", "xlsx")}
                  disabled={loadingStates["all-xlsx"]}
                  data-testid="button-export-all-xlsx"
                >
                  {loadingStates["all-xlsx"]
                    ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    : <FileSpreadsheet style={{ width: 16, height: 16 }} />}
                  {loadingStates["all-xlsx"] ? t("dataExport.downloading") : t("dataExport.formatExcel")}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {EXPORT_CARDS.map((card, index) => {
            const Icon = card.icon;
            const csvKey = `${card.type}-csv`;
            const xlsxKey = `${card.type}-xlsx`;
            const accessible = hasAccess(card.access);
            return (
              <motion.div
                key={card.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                style={{
                  ...cardStyle,
                  padding: 20,
                  opacity: accessible ? 1 : 0.5,
                  transition: "border-color 0.2s",
                }}
                data-testid={`card-export-${card.type}`}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={iconBoxStyle(accessible)}>
                      <Icon style={{ width: 20, height: 20 }} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, margin: 0, fontSize: 15 }}>{t(card.titleKey)}</h3>
                        {accessBadge(card.access)}
                      </div>
                      <p style={{ fontSize: 12, color: c.muted, margin: "4px 0 0" }}>{t(card.descKey)}</p>
                    </div>
                  </div>
                  {accessible ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        style={{ ...btnStyle, ...(loadingStates[csvKey] ? btnDisabledExtra : {}) }}
                        onClick={() => requestExport(card.type, "csv")}
                        disabled={loadingStates[csvKey]}
                        data-testid={`button-export-${card.type}-csv`}
                      >
                        {loadingStates[csvKey]
                          ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                          : <FileText style={{ width: 16, height: 16 }} />}
                        {loadingStates[csvKey] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
                      </button>
                      <button
                        style={{ ...btnStyle, ...(loadingStates[xlsxKey] ? btnDisabledExtra : {}) }}
                        onClick={() => requestExport(card.type, "xlsx")}
                        disabled={loadingStates[xlsxKey]}
                        data-testid={`button-export-${card.type}-xlsx`}
                      >
                        {loadingStates[xlsxKey]
                          ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                          : <FileSpreadsheet style={{ width: 16, height: 16 }} />}
                        {loadingStates[xlsxKey] ? t("dataExport.downloading") : t("dataExport.formatExcel")}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.muted }}>
                      <Lock style={{ width: 14, height: 14 }} />
                      {t("dataExport.noAccess")}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
