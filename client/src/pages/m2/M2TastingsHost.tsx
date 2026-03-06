import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading } from "@/components/m2/M2Feedback";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { tastingApi, whiskyApi, inviteApi, guidedApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCodeLib from "qrcode";
import { downloadDataUrl } from "@/lib/download";
import { generateBlankTastingSheet, generateBlankTastingMat } from "@/components/printable-tasting-sheets";
import {
  Plus, X, Trash2, ChevronUp, ChevronDown, ChevronRight, ArrowRight, ArrowLeft,
  Copy, Check, EyeOff, Share2, QrCode, Download, Play, Square, Eye,
  Users, BarChart3, Star, Upload, Mail, Settings, Image, Calendar,
  MapPin, FileText, RefreshCw, Send, Search, BookOpen, Heart, UserPlus,
  MessageCircle, ExternalLink, Sliders, Video, Lock, Globe, Gauge, Monitor,
  ClipboardList, Loader2, Printer,
} from "lucide-react";

type WizardStep = "list" | "step1" | "step2" | "step3" | "step4";

interface TastingFull {
  id: string;
  title: string;
  status: string;
  code: string;
  date: string | null;
  location: string | null;
  description?: string | null;
  blindMode?: boolean;
  activeWhiskyId?: string | null;
  guidedMode?: boolean;
  guidedWhiskyIndex?: number;
  guidedRevealStep?: number;
  showRanking?: boolean;
  showGroupAvg?: boolean;
  showReveal?: boolean;
  ratingPrompt?: string | null;
  coverImageUrl?: string | null;
  hostId?: string;
  ratingScale?: number;
  sessionUiMode?: string | null;
  guestMode?: string;
  reflectionEnabled?: boolean;
  reflectionMode?: string;
  reflectionVisibility?: string;
  videoLink?: string | null;
}

interface Rating {
  id: string;
  whiskyId: string;
  participantId: string;
  overall: number | null;
}

interface TastingParticipant {
  id: string;
  participantId: string;
  participant: { id: string; name: string };
}

interface Whisky {
  id: string;
  tastingId: string;
  name: string;
  distillery: string | null;
  abv: number | null;
  notes: string | null;
  sortOrder: number;
  caskInfluence: string | null;
  imageUrl: string | null;
  age?: number | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 14,
  background: v.inputBg,
  border: `1px solid ${v.inputBorder}`,
  borderRadius: 10,
  color: v.text,
  outline: "none",
  fontFamily: "system-ui, sans-serif",
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  background: v.card,
  border: `1px solid ${v.border}`,
  borderRadius: 14,
  padding: "20px",
};

const blindLabel = (index: number) => String.fromCharCode(65 + index);

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (val: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        background: "none",
        border: "none",
        padding: "8px 0",
        cursor: "pointer",
        color: v.text,
        fontSize: 14,
        fontFamily: "system-ui, sans-serif",
      }}
      data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span>{label}</span>
      <div
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          background: checked ? v.accent : v.border,
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: v.text,
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            transition: "left 0.2s",
          }}
        />
      </div>
    </button>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i + 1 === current ? 28 : 10,
            height: 10,
            borderRadius: 5,
            background: i + 1 === current ? v.accent : i + 1 < current ? v.success : v.border,
            transition: "all 0.2s",
          }}
          data-testid={`step-dot-${i + 1}`}
        />
      ))}
      <span style={{ fontSize: 12, color: v.muted, marginLeft: 8 }}>
        {t("m2.host.stepIndicator", {defaultValue: "Step {{current}} / {{total}}", current, total})}
      </span>
    </div>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: `1px solid ${copied ? v.success : v.border}`,
        borderRadius: 8,
        padding: "8px 14px",
        color: copied ? v.success : v.muted,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
        transition: "all 0.2s",
      }}
      data-testid={`button-copy-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
      {copied ? t("m2.host.copied", "Copied!") : label}
    </button>
  );
}

const RATING_SCALES = [
  { value: 5, label: "5", descKey: "m2.host.ratingScaleDesc5", descFallback: "Simple 5-star" },
  { value: 10, label: "10", descKey: "m2.host.ratingScaleDesc10", descFallback: "Classic 10-point" },
  { value: 20, label: "20", descKey: "m2.host.ratingScaleDesc20", descFallback: "Detailed 20-point" },
  { value: 100, label: "100", descKey: "m2.host.ratingScaleDesc100", descFallback: "Professional 100-point" },
];

const SESSION_UI_MODES = [
  { value: "flow", labelKey: "m2.host.sessionUiFlow", labelFallback: "Flow", descKey: "m2.host.sessionUiFlowDesc", descFallback: "Free navigation between drams" },
  { value: "focus", labelKey: "m2.host.sessionUiFocus", labelFallback: "Focus", descKey: "m2.host.sessionUiFocusDesc", descFallback: "One dram at a time" },
  { value: "journal", labelKey: "m2.host.sessionUiJournal", labelFallback: "Journal", descKey: "m2.host.sessionUiJournalDesc", descFallback: "Guided note-taking style" },
];

function RatingScaleSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 8 }}>
        <Gauge style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
        {t("m2.host.ratingScale", "Rating Scale")}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {RATING_SCALES.map((s) => {
          const active = value === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange(s.value)}
              style={{
                padding: "10px 4px",
                textAlign: "center",
                background: active ? `color-mix(in srgb, ${v.accent} 18%, transparent)` : v.bg,
                border: `1.5px solid ${active ? v.accent : v.border}`,
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
                transition: "all 0.15s",
              }}
              data-testid={`button-scale-${s.value}`}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: active ? v.accent : v.text, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: v.muted, lineHeight: 1.2 }}>{t(s.descKey, s.descFallback)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentedSelect({ value, options, onChange }: { value: string; options: { value: string; label: string; desc?: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 6 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "8px 4px",
              textAlign: "center",
              background: active ? `color-mix(in srgb, ${v.accent} 18%, transparent)` : v.bg,
              border: `1.5px solid ${active ? v.accent : v.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
              transition: "all 0.15s",
            }}
            data-testid={`button-opt-${opt.value}`}
          >
            <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? v.accent : v.text }}>{opt.label}</div>
            {opt.desc && <div style={{ fontSize: 10, color: v.muted, lineHeight: 1.2, marginTop: 2 }}>{opt.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

function AdvancedConfigSection({
  guidedMode, setGuidedMode,
  guestMode, setGuestMode,
  sessionUiMode, setSessionUiMode,
  reflectionEnabled, setReflectionEnabled,
  reflectionMode, setReflectionMode,
  reflectionVisibility, setReflectionVisibility,
  videoLink, setVideoLink,
}: {
  guidedMode: boolean; setGuidedMode: (v: boolean) => void;
  guestMode: string; setGuestMode: (v: string) => void;
  sessionUiMode: string; setSessionUiMode: (v: string) => void;
  reflectionEnabled: boolean; setReflectionEnabled: (v: boolean) => void;
  reflectionMode: string; setReflectionMode: (v: string) => void;
  reflectionVisibility: string; setReflectionVisibility: (v: string) => void;
  videoLink: string; setVideoLink: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background: v.bg, borderRadius: 10, border: `1px solid ${v.border}` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          color: v.text, fontSize: 13, fontFamily: "system-ui, sans-serif", padding: "12px 14px",
        }}
        data-testid="button-toggle-advanced"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sliders style={{ width: 14, height: 14, color: v.muted }} />
          <span style={{ fontWeight: 600 }}>{t("m2.host.advancedOptions", "Advanced Options")}</span>
        </div>
        <ChevronDown style={{ width: 14, height: 14, color: v.muted, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Toggle checked={guidedMode} onChange={setGuidedMode} label={t("m2.host.guidedMode", "Host Controls the Pace")} />
          <div style={{ fontSize: 11, color: v.muted, marginTop: -10, lineHeight: 1.4 }}>
            {t("m2.host.guidedModeDesc", "When enabled, you guide all guests through each dram together. When off, guests can taste at their own pace.")}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
              <Globe style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {t("m2.host.guestModeLabel", "How Guests Join")}
            </label>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 6, lineHeight: 1.4 }}>
              {t("m2.host.guestModeDesc", "Choose whether guests need an account or can join instantly")}
            </div>
            <SegmentedSelect
              value={guestMode}
              options={[
                { value: "standard", label: t("m2.host.guestStandard", "With Account"), desc: t("m2.host.guestStandardDesc", "Guests sign in — ratings are saved") },
                { value: "ultra", label: t("m2.host.guestUltra", "Instant Join"), desc: t("m2.host.guestUltraDesc", "No sign-in needed — anonymous") },
              ]}
              onChange={setGuestMode}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
              <Sliders style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {t("m2.host.sessionUiModeLabel", "Tasting Experience")}
            </label>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 6, lineHeight: 1.4 }}>
              {t("m2.host.sessionUiModeDesc", "How guests navigate through the whiskies")}
            </div>
            <SegmentedSelect
              value={sessionUiMode}
              options={[
                { value: "flow", label: t("m2.host.uiModeFlow", "Free Tasting"), desc: t("m2.host.uiModeFlowDesc", "Guests explore all drams freely") },
                { value: "focus", label: t("m2.host.uiModeFocus", "One at a Time"), desc: t("m2.host.uiModeFocusDesc", "Focus on one dram before the next") },
                { value: "journal", label: t("m2.host.uiModeJournal", "Tasting Journal"), desc: t("m2.host.uiModeJournalDesc", "Step-by-step guided notes") },
              ]}
              onChange={setSessionUiMode}
            />
          </div>

          <div style={{ borderTop: `1px solid ${v.border}`, paddingTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
              <MessageCircle style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {t("m2.host.reflectionLabel", "Group Discussion")}
            </label>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 8, lineHeight: 1.4 }}>
              {t("m2.host.reflectionDesc", "Let guests share thoughts and comments on each whisky after tasting")}
            </div>
            <Toggle checked={reflectionEnabled} onChange={setReflectionEnabled} label={t("m2.host.reflectionEnabled", "Enable Discussion Round")} />
            {reflectionEnabled && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
                    {t("m2.host.reflectionModeLabel", "Discussion Format")}
                  </label>
                  <SegmentedSelect
                    value={reflectionMode}
                    options={[
                      { value: "standard", label: t("m2.host.reflectionStandard", "Standard"), desc: t("m2.host.reflectionStandardDesc", "Pre-set questions") },
                      { value: "custom", label: t("m2.host.reflectionCustom", "Custom"), desc: t("m2.host.reflectionCustomDesc", "Your own questions") },
                    ]}
                    onChange={setReflectionMode}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
                    {t("m2.host.reflectionVisibilityLabel", "Show Names in Discussion")}
                  </label>
                  <SegmentedSelect
                    value={reflectionVisibility}
                    options={[
                      { value: "named", label: t("m2.host.reflectionNamed", "Named"), desc: t("m2.host.reflectionNamedDesc", "Names shown") },
                      { value: "anonymous", label: t("m2.host.reflectionAnonymous", "Anonymous"), desc: t("m2.host.reflectionAnonDesc", "Names hidden") },
                      { value: "optional", label: t("m2.host.reflectionOptional", "Optional"), desc: t("m2.host.reflectionOptDesc", "Guest decides") },
                    ]}
                    onChange={setReflectionVisibility}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
              <Video style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {t("m2.host.videoLinkLabel", "Video Call Link")}
            </label>
            <input
              type="url"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder={t("m2.host.videoLinkPlaceholder", "https://zoom.us/j/...")}
              style={inputStyle}
              data-testid="input-video-link"
            />
            <div style={{ fontSize: 11, color: v.muted, marginTop: 4, lineHeight: 1.4 }}>
              {t("m2.host.videoLinkDesc", "Add a Zoom, Teams or Google Meet link for remote guests")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HostOverview({ pid, onNewTasting, onResume }: { pid: string; onNewTasting: () => void; onResume: (id: string) => void }) {
  const { t, t: t2 } = useTranslation();
  const [, navigate] = useLocation();

  const { data: allTastings = [], isLoading } = useQuery<TastingFull[]>({
    queryKey: ["/api/tastings", "host-overview", pid],
    queryFn: async () => {
      const res = await fetch(`/api/tastings?participantId=${pid}`);
      if (!res.ok) return [];
      const list = await res.json();
      return list.filter((t: TastingFull) => t.hostId === pid);
    },
  });

  const drafts = allTastings.filter((t) => t.status === "draft");
  const opens = allTastings.filter((t) => t.status === "open");
  const closed = allTastings.filter((t) => t.status === "closed" || t.status === "reveal" || t.status === "archived");

  const statusColor = (status: string) => {
    switch (status) {
      case "draft": return v.muted;
      case "open": return v.success;
      case "closed": case "reveal": return v.accent;
      case "archived": return v.muted;
      default: return v.muted;
    }
  };

  const TastingCard = ({ tasting, action, actionLabel, actionIcon }: { tasting: TastingFull; action: () => void; actionLabel: string; actionIcon: React.ReactNode }) => (
    <div
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
      data-testid={`host-tasting-card-${tasting.id}`}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tasting.title}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
            color: statusColor(tasting.status),
            background: `color-mix(in srgb, ${statusColor(tasting.status)} 15%, transparent)`,
            padding: "2px 6px", borderRadius: 4, flexShrink: 0,
          }}>
            {t("m2.tastings.status" + tasting.status.charAt(0).toUpperCase() + tasting.status.slice(1), tasting.status)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: v.muted, display: "flex", gap: 10 }}>
          {tasting.date && <span>{tasting.date.split("T")[0]}</span>}
          <span>{t("m2.host.codeLabel", "Code:")}{" "}{tasting.code}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={action}
        style={{
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 600,
          background: `color-mix(in srgb, ${v.accent} 12%, transparent)`,
          color: v.accent,
          border: `1px solid color-mix(in srgb, ${v.accent} 30%, transparent)`,
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
        data-testid={`button-action-${tasting.id}`}
      >
        {actionIcon}
        {actionLabel}
      </button>
    </div>
  );

  if (isLoading) return <M2Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button
        type="button"
        onClick={onNewTasting}
        style={{
          width: "100%",
          padding: "16px",
          fontSize: 16,
          fontWeight: 700,
          background: v.accent,
          color: v.bg,
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
        data-testid="button-new-tasting"
      >
        <Plus style={{ width: 20, height: 20 }} />
        {t("m2.host.newTasting", "New Tasting")}
      </button>

      {allTastings.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🥃</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: v.text, marginBottom: 6 }}>
            {t("m2.host.noTastingsYet", "No tastings yet")}
          </div>
          <div style={{ fontSize: 13, color: v.muted }}>
            {t("m2.host.createFirstPrompt", "Create your first tasting to get started")}
          </div>
        </div>
      ) : (
        <>
          {drafts.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: v.muted, marginBottom: 8 }}>
                {t("m2.host.draftSection", "Drafts")} ({drafts.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {drafts.map((t) => (
                  <TastingCard key={t.id} tasting={t} action={() => onResume(t.id)} actionLabel={t2("m2.host.actionContinue", "Continue")} actionIcon={<ArrowRight style={{ width: 12, height: 12 }} />} />
                ))}
              </div>
            </div>
          )}

          {opens.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: v.muted, marginBottom: 8 }}>
                {t("m2.host.activeSection", "Active")} ({opens.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {opens.map((t) => (
                  <TastingCard key={t.id} tasting={t} action={() => navigate(`/m2/tastings/host/${t.id}`)} actionLabel={t2("m2.host.actionControl", "Control")} actionIcon={<Play style={{ width: 12, height: 12 }} />} />
                ))}
              </div>
            </div>
          )}

          {closed.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: v.muted, marginBottom: 8 }}>
                {t("m2.host.closedSection", "Completed")} ({closed.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {closed.map((t) => (
                  <TastingCard key={t.id} tasting={t} action={() => navigate(`/m2/tastings/session/${t.id}/results`)} actionLabel={t2("m2.host.actionResults", "Results")} actionIcon={<BarChart3 style={{ width: 12, height: 12 }} />} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Step1Create({ pid, onCreated }: { pid: string; onCreated: (t: TastingFull) => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [blindMode, setBlindMode] = useState(false);
  const [ratingScale, setRatingScale] = useState(100);
  const [guidedMode, setGuidedMode] = useState(false);
  const [guestMode, setGuestMode] = useState("standard");
  const [sessionUiMode, setSessionUiMode] = useState("flow");
  const [reflectionEnabled, setReflectionEnabled] = useState(false);
  const [reflectionMode, setReflectionMode] = useState("standard");
  const [reflectionVisibility, setReflectionVisibility] = useState("named");
  const [videoLink, setVideoLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim().length > 0 && !submitting;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: date || new Date().toISOString().split("T")[0],
          location: location.trim() || "",
          hostId: pid,
          code: generateCode(),
          status: "draft",
          blindMode,
          ratingScale,
          guidedMode,
          guestMode,
          sessionUiMode: sessionUiMode || null,
          reflectionEnabled,
          reflectionMode,
          reflectionVisibility,
          videoLink: videoLink.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("m2.host.failedCreate", "Failed to create tasting"));
      }
      const tasting = await res.json();
      onCreated(tasting);
    } catch (e: any) {
      setError(e.message || t("m2.host.genericError", "Something went wrong"));
      setSubmitting(false);
    }
  };

  return (
    <div style={cardStyle}>
      <StepIndicator current={1} total={4} />
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          margin: "0 0 4px",
          color: v.text,
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
        data-testid="text-step1-title"
      >
        {t("m2.host.step1Title", "Create Tasting")}
      </h3>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>
        {t("m2.host.step1Desc", "Set up the basics for your tasting session")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
            {t("m2.host.titleLabel", "Tasting Title")} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("m2.host.titlePlaceholder", "e.g. Friday Night Whisky Club")}
            style={inputStyle}
            autoFocus
            maxLength={200}
            data-testid="input-tasting-title"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
              <Calendar style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {t("m2.host.dateLabel", "Date")}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }}
              data-testid="input-tasting-date"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
              <MapPin style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {t("m2.host.locationLabel", "Location")}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("m2.host.locationPlaceholder", "e.g. Living room")}
              style={inputStyle}
              data-testid="input-tasting-location"
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
            <FileText style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            {t("m2.host.descriptionLabel", "Description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("m2.host.descriptionPlaceholder", "Optional notes for your guests...")}
            rows={2}
            style={{ ...inputStyle, resize: "vertical", minHeight: 48 }}
            data-testid="input-tasting-description"
          />
        </div>

        <Toggle checked={blindMode} onChange={setBlindMode} label={t("m2.host.blindMode", "Blind Mode")} />

        <RatingScaleSelector value={ratingScale} onChange={setRatingScale} />

        <AdvancedConfigSection
          guidedMode={guidedMode} setGuidedMode={setGuidedMode}
          guestMode={guestMode} setGuestMode={setGuestMode}
          sessionUiMode={sessionUiMode} setSessionUiMode={setSessionUiMode}
          reflectionEnabled={reflectionEnabled} setReflectionEnabled={setReflectionEnabled}
          reflectionMode={reflectionMode} setReflectionMode={setReflectionMode}
          reflectionVisibility={reflectionVisibility} setReflectionVisibility={setReflectionVisibility}
          videoLink={videoLink} setVideoLink={setVideoLink}
        />

        {error && (
          <div style={{ fontSize: 13, color: v.danger, background: `color-mix(in srgb, ${v.danger} 15%, transparent)`, padding: "8px 12px", borderRadius: 8 }} data-testid="text-create-error">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: 15,
            fontWeight: 600,
            background: canSubmit ? v.accent : v.border,
            color: canSubmit ? v.bg : v.muted,
            border: "none",
            borderRadius: 10,
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          data-testid="button-create-session"
        >
          {submitting ? t("m2.host.creating", "Creating...") : t("m2.host.nextAddWhiskies", "Create & Add Whiskies")}
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

function Step2Whiskies({ tasting, pid, onNext, onBack }: { tasting: TastingFull; pid: string; onNext: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [abv, setAbv] = useState("");
  const [cask, setCask] = useState("");
  const [age, setAge] = useState("");
  const [notes, setNotes] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDistillery, setEditDistillery] = useState("");
  const [editAbv, setEditAbv] = useState("");
  const [editCask, setEditCask] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showImport, setShowImport] = useState<"collection" | "wishlist" | null>(null);
  const [importSearch, setImportSearch] = useState("");
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set());
  const [importItems, setImportItems] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  const isBlind = !!tasting.blindMode;

  const fetchWhiskies = useCallback(async () => {
    try {
      const res = await fetch(`/api/tastings/${tasting.id}/whiskies`);
      if (res.ok) {
        const data = await res.json();
        setWhiskies(data.sort((a: Whisky, b: Whisky) => a.sortOrder - b.sortOrder));
      }
    } catch {}
    setLoading(false);
  }, [tasting.id]);

  useEffect(() => { fetchWhiskies(); }, [fetchWhiskies]);

  const showFeedback = (msg: string) => {
    setAddedFeedback(msg);
    setTimeout(() => setAddedFeedback(null), 2000);
  };

  const openImport = async (source: "collection" | "wishlist") => {
    setShowImport(source);
    setImportSearch("");
    setImportSelected(new Set());
    setImportLoading(true);
    try {
      const url = source === "collection"
        ? `/api/collection/${pid}`
        : `/api/wishlist/${pid}`;
      const res = await fetch(url);
      if (res.ok) setImportItems(await res.json());
      else setImportItems([]);
    } catch { setImportItems([]); }
    setImportLoading(false);
  };

  const handleImportSelected = async () => {
    if (importSelected.size === 0) return;
    setAdding(true);
    let count = 0;
    for (const item of importItems.filter((i: any) => importSelected.has(i.id))) {
      try {
        const res = await fetch("/api/whiskies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tastingId: tasting.id,
            name: item.name || item.whiskyName || "Unknown",
            distillery: item.distillery || null,
            abv: item.abv ? parseFloat(item.abv) : null,
            caskInfluence: item.caskType || item.caskInfluence || null,
            notes: item.notes || null,
            imageUrl: item.imageUrl || null,
            sortOrder: whiskies.length + count,
          }),
        });
        if (res.ok) count++;
      } catch {}
    }
    setShowImport(null);
    setImportSelected(new Set());
    await fetchWhiskies();
    showFeedback(t("m2.host.importedCount", `${count} whisky(s) imported`));
    setAdding(false);
  };

  const filteredImportItems = importItems.filter((item: any) => {
    if (!importSearch.trim()) return true;
    const s = importSearch.toLowerCase();
    return (item.name || item.whiskyName || "").toLowerCase().includes(s) || (item.distillery || "").toLowerCase().includes(s);
  });

  const handleAdd = async () => {
    if (!name.trim() || adding) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/whiskies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tastingId: tasting.id,
          name: name.trim(),
          distillery: distillery.trim() || null,
          abv: abv ? parseFloat(abv) : null,
          caskInfluence: cask.trim() || null,
          notes: notes.trim() || null,
          sortOrder: whiskies.length,
        }),
      });
      if (!res.ok) throw new Error(t("m2.host.failedAddWhisky", "Failed to add whisky"));
      setName(""); setDistillery(""); setAbv(""); setCask(""); setAge(""); setNotes(""); setShowDetails(false);
      await fetchWhiskies();
      showFeedback(t("m2.host.whiskyAdded", "Whisky added"));
    } catch (e: any) {
      setError(e.message);
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/whiskies/${id}`, { method: "DELETE" });
      await fetchWhiskies();
    } catch {}
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= whiskies.length) return;
    const updated = [...whiskies];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    const order = updated.map((w, i) => ({ id: w.id, sortOrder: i }));
    setWhiskies(updated.map((w, i) => ({ ...w, sortOrder: i })));
    try {
      await fetch(`/api/tastings/${tasting.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
    } catch {}
  };

  const startEdit = (w: Whisky) => {
    setEditingId(w.id);
    setEditName(w.name);
    setEditDistillery(w.distillery || "");
    setEditAbv(w.abv ? String(w.abv) : "");
    setEditCask(w.caskInfluence || "");
    setEditNotes(w.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await fetch(`/api/whiskies/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          distillery: editDistillery.trim() || null,
          abv: editAbv ? parseFloat(editAbv) : null,
          caskInfluence: editCask.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      setEditingId(null);
      await fetchWhiskies();
    } catch {}
  };

  const handleImageUpload = async (whiskyId: string, file: File) => {
    try {
      await whiskyApi.uploadImage(whiskyId, file);
      await fetchWhiskies();
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={cardStyle}>
        <StepIndicator current={2} total={4} />
        <h3
          style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: v.text, fontFamily: "'Playfair Display', Georgia, serif" }}
          data-testid="text-step2-title"
        >
          {t("m2.host.step2Title", "Add Whiskies")}
        </h3>
        <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>
          {t("m2.host.step2Desc", "Build your tasting lineup")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
              {t("m2.host.whiskyNameLabel", "Whisky Name")} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("m2.host.whiskyNamePlaceholder", "e.g. Lagavulin 16")}
              style={inputStyle}
              maxLength={200}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              data-testid="input-whisky-name"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              color: v.muted, fontSize: 12, fontFamily: "system-ui, sans-serif", padding: "2px 0",
            }}
            data-testid="button-toggle-details"
          >
            <ChevronDown style={{ width: 12, height: 12, transform: showDetails ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            {t("m2.host.detailsOptional", "Details (optional)")}
          </button>

          {showDetails && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 4 }}>{t("m2.host.distilleryLabel", "Distillery")}</label>
                  <input type="text" value={distillery} onChange={(e) => setDistillery(e.target.value)} placeholder={t("m2.host.distilleryPlaceholder", "e.g. Lagavulin")} style={{ ...inputStyle, fontSize: 13 }} data-testid="input-whisky-distillery" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 4 }}>{t("m2.host.abvLabel", "ABV %")}</label>
                  <input type="number" value={abv} onChange={(e) => setAbv(e.target.value)} placeholder={t("m2.host.abvPlaceholder", "e.g. 43")} step="0.1" min="0" max="100" style={{ ...inputStyle, fontSize: 13 }} data-testid="input-whisky-abv" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 4 }}>{t("m2.host.caskTypeLabel", "Cask Type")}</label>
                  <input type="text" value={cask} onChange={(e) => setCask(e.target.value)} placeholder={t("m2.host.caskTypePlaceholder", "e.g. Ex-Bourbon")} style={{ ...inputStyle, fontSize: 13 }} data-testid="input-whisky-cask" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 4 }}>{t("m2.host.ageLabel", "Age")}</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder={t("m2.host.agePlaceholder", "e.g. 16")} min="0" style={{ ...inputStyle, fontSize: 13 }} data-testid="input-whisky-age" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 4 }}>{t("m2.host.notesLabel", "Notes")}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("m2.host.notesPlaceholder", "Host notes about this whisky")} rows={2} style={{ ...inputStyle, fontSize: 13, resize: "vertical", minHeight: 40 }} data-testid="input-whisky-notes" />
              </div>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: v.danger, background: `color-mix(in srgb, ${v.danger} 15%, transparent)`, padding: "6px 10px", borderRadius: 8 }} data-testid="text-whisky-error">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || adding}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px", fontSize: 14, fontWeight: 600,
              background: name.trim() ? v.accent : v.border,
              color: name.trim() ? v.bg : v.muted,
              border: "none", borderRadius: 10,
              cursor: name.trim() ? "pointer" : "not-allowed",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="button-add-whisky"
          >
            <Plus style={{ width: 16, height: 16 }} />
            {adding ? t("m2.host.adding", "Adding...") : t("m2.host.addWhisky", "Add Whisky")}
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => openImport("collection")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", fontSize: 13, fontWeight: 500, background: "none", color: v.muted, border: `1px solid ${v.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-import-collection">
              <BookOpen style={{ width: 14, height: 14 }} />
              {t("m2.host.importCollection", "From Collection")}
            </button>
            <button type="button" onClick={() => openImport("wishlist")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", fontSize: 13, fontWeight: 500, background: "none", color: v.muted, border: `1px solid ${v.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-import-wishlist">
              <Heart style={{ width: 14, height: 14 }} />
              {t("m2.host.importWishlist", "From Wishlist")}
            </button>
          </div>
        </div>

        {addedFeedback && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: `color-mix(in srgb, ${v.success} 15%, transparent)`, color: v.success, fontSize: 13, fontWeight: 600, borderRadius: 8 }} data-testid="text-added-feedback">
            <Check style={{ width: 14, height: 14 }} />
            {addedFeedback}
          </div>
        )}

        {showImport && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowImport(null)} data-testid="modal-import-overlay">
            <div style={{ width: "100%", maxWidth: 480, maxHeight: "80vh", background: v.card, borderRadius: "16px 16px 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${v.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif" }}>
                  {showImport === "collection" ? t("m2.host.importFromCollection", "Import from Collection") : t("m2.host.importFromWishlist", "Import from Wishlist")}
                </h3>
                <button type="button" onClick={() => setShowImport(null)} style={{ background: "none", border: "none", cursor: "pointer", color: v.muted, padding: 4 }}><X style={{ width: 18, height: 18 }} /></button>
              </div>
              <div style={{ padding: "12px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: v.inputBg, border: `1px solid ${v.inputBorder}`, borderRadius: 10, padding: "8px 12px" }}>
                  <Search style={{ width: 14, height: 14, color: v.muted, flexShrink: 0 }} />
                  <input type="text" value={importSearch} onChange={(e) => setImportSearch(e.target.value)} placeholder={t("m2.host.searchWhiskies", "Search...")} style={{ flex: 1, background: "none", border: "none", outline: "none", color: v.text, fontSize: 14, fontFamily: "system-ui, sans-serif" }} data-testid="input-import-search" />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px" }}>
                {importLoading ? <M2Loading /> : filteredImportItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: v.muted, fontSize: 13 }}>{t("m2.host.noItems", "No items found")}</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {filteredImportItems.map((item: any) => {
                      const iName = item.name || item.whiskyName || "Unknown";
                      const selected = importSelected.has(item.id);
                      return (
                        <button key={item.id} type="button" onClick={() => { const next = new Set(importSelected); if (selected) next.delete(item.id); else next.add(item.id); setImportSelected(next); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: selected ? `color-mix(in srgb, ${v.accent} 15%, transparent)` : v.bg, border: `1px solid ${selected ? v.accent : v.border}`, borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "system-ui, sans-serif", width: "100%" }} data-testid={`import-item-${item.id}`}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selected ? v.accent : v.border}`, background: selected ? v.accent : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {selected && <Check style={{ width: 12, height: 12, color: v.bg }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iName}</div>
                            {(item.distillery || item.abv) && <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>{[item.distillery, item.abv ? `${item.abv}%` : null].filter(Boolean).join(" · ")}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {importSelected.size > 0 && (
                <div style={{ padding: "12px 20px", borderTop: `1px solid ${v.border}` }}>
                  <button type="button" onClick={handleImportSelected} disabled={adding} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, background: v.accent, color: v.bg, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} data-testid="button-confirm-import">
                    <Plus style={{ width: 16, height: 16 }} />
                    {t("m2.host.importSelected", `Add ${importSelected.size} to Lineup`)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <M2Loading />
        ) : whiskies.length > 0 ? (
          <div style={{ borderTop: `1px solid ${v.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: v.muted, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
              <span>{whiskies.length} {whiskies.length === 1 ? t("m2.host.whiskyCount", "whisky") : t("m2.host.whiskiesCount", "whiskies")} {t("m2.host.added", "added")}</span>
              {isBlind && (
                <span style={{ color: v.accent, fontSize: 11 }}>
                  <EyeOff style={{ width: 11, height: 11, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                  {t("m2.host.blindLabelsActive", "Blind labels active")}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {whiskies.map((w, i) => (
                <div key={w.id}>
                  {editingId === w.id ? (
                    <div style={{ background: v.elevated, border: `1px solid ${v.accent}`, borderRadius: 10, padding: 12 }} data-testid={`card-whisky-edit-${w.id}`}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} data-testid={`input-edit-name-${w.id}`} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <input type="text" value={editDistillery} onChange={(e) => setEditDistillery(e.target.value)} placeholder={t("m2.host.distilleryLabel", "Distillery")} style={{ ...inputStyle, fontSize: 12 }} data-testid={`input-edit-distillery-${w.id}`} />
                          <input type="number" value={editAbv} onChange={(e) => setEditAbv(e.target.value)} placeholder={t("m2.host.abvLabel", "ABV %")} style={{ ...inputStyle, fontSize: 12 }} data-testid={`input-edit-abv-${w.id}`} />
                        </div>
                        <input type="text" value={editCask} onChange={(e) => setEditCask(e.target.value)} placeholder={t("m2.host.caskTypeLabel", "Cask type")} style={{ ...inputStyle, fontSize: 12 }} data-testid={`input-edit-cask-${w.id}`} />
                        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder={t("m2.host.notesLabel", "Notes")} rows={2} style={{ ...inputStyle, fontSize: 12, resize: "vertical" }} data-testid={`input-edit-notes-${w.id}`} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={handleSaveEdit} style={{ flex: 1, padding: "8px", fontSize: 13, fontWeight: 600, background: v.accent, color: v.bg, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid={`button-save-edit-${w.id}`}>
                            {t("m2.host.save", "Save")}
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} style={{ flex: 1, padding: "8px", fontSize: 13, background: "none", color: v.muted, border: `1px solid ${v.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid={`button-cancel-edit-${w.id}`}>
                            {t("m2.host.cancel", "Cancel")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8, background: v.bg, border: `1px solid ${v.border}`, borderRadius: 8, padding: "10px 12px" }}
                      data-testid={`card-whisky-${w.id}`}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                        <button type="button" onClick={() => handleMove(i, "up")} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? v.border : v.muted, padding: 0, lineHeight: 1 }} data-testid={`button-move-up-${w.id}`}>
                          <ChevronUp style={{ width: 14, height: 14 }} />
                        </button>
                        <button type="button" onClick={() => handleMove(i, "down")} disabled={i === whiskies.length - 1} style={{ background: "none", border: "none", cursor: i === whiskies.length - 1 ? "default" : "pointer", color: i === whiskies.length - 1 ? v.border : v.muted, padding: 0, lineHeight: 1 }} data-testid={`button-move-down-${w.id}`}>
                          <ChevronDown style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                      {w.imageUrl && (
                        <img src={w.imageUrl} alt="" style={{ width: 32, height: 42, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: v.bg }} data-testid={`img-whisky-${w.id}`} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          {isBlind && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: v.accent, fontFamily: "'Playfair Display', serif" }}>
                              {blindLabel(i)}
                            </span>
                          )}
                          {!isBlind && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: v.muted, fontVariantNumeric: "tabular-nums", minWidth: 18 }}>
                              {i + 1}.
                            </span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-testid={`text-whisky-name-${w.id}`}>
                            {w.name}
                          </span>
                        </div>
                        {(w.distillery || w.abv) && (
                          <div style={{ fontSize: 11, color: v.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {[w.distillery, w.abv ? `${w.abv}%` : null, w.caskInfluence].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      <label style={{ cursor: "pointer", color: v.muted, padding: 4, flexShrink: 0 }} data-testid={`button-upload-image-${w.id}`}>
                        <Image style={{ width: 15, height: 15 }} />
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(w.id, e.target.files[0]); }} />
                      </label>
                      <button type="button" onClick={() => startEdit(w)} style={{ background: "none", border: "none", cursor: "pointer", color: v.muted, padding: 4, flexShrink: 0 }} data-testid={`button-edit-whisky-${w.id}`}>
                        <Settings style={{ width: 15, height: 15 }} />
                      </button>
                      <button type="button" onClick={() => handleDelete(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: v.muted, padding: 4, flexShrink: 0 }} data-testid={`button-delete-whisky-${w.id}`}>
                        <Trash2 style={{ width: 15, height: 15 }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ borderTop: `1px solid ${v.border}`, paddingTop: 14, textAlign: "center" }}>
            <p style={{ color: v.muted, fontSize: 13, margin: 0 }} data-testid="text-no-whiskies">
              {t("m2.host.noWhiskies", "No whiskies yet. Add your first one above.")}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "12px 16px", fontSize: 14, background: "none", color: v.muted,
            border: `1px solid ${v.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif",
            display: "flex", alignItems: "center", gap: 6,
          }}
          data-testid="button-back-step1"
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1, padding: "12px", fontSize: 15, fontWeight: 600,
            background: v.accent, color: v.bg, border: "none", borderRadius: 10,
            cursor: "pointer", fontFamily: "system-ui, sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
          data-testid="button-next-to-invite"
        >
          {t("m2.host.nextInvite", "Next: Invite Guests")}
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

function Step3Invite({ tasting, pid, onNext, onBack }: { tasting: TastingFull; pid: string; onNext: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  const joinUrl = `${window.location.origin}/enter?code=${tasting.code}`;
  const shareText = t("m2.host.shareText", {defaultValue: 'Join my whisky tasting "{{title}}" on CaskSense!\nSession Code: {{code}}', title: tasting.title, code: tasting.code});

  const hostName = (() => {
    try { const s = getSession(); return s.name || s.email?.split("@")[0] || ""; } catch { return ""; }
  })();
  const dateFormatted = tasting.date ? new Date(tasting.date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const defaultSubject = t("m2.host.emailDefaultSubject", {defaultValue: "You're invited: {{title}} — CaskSense", title: tasting.title});
  const defaultBody = [
    t("m2.host.emailGreeting", "Hey!"),
    "",
    t("m2.host.emailInviteLine", {defaultValue: 'I\'d like to invite you to a whisky tasting — "{{title}}".', title: tasting.title}),
    "",
    tasting.date ? t("m2.host.emailWhen", {defaultValue: "When: {{date}}", date: dateFormatted}) : null,
    tasting.location ? t("m2.host.emailWhere", {defaultValue: "Where: {{location}}", location: tasting.location}) : null,
    "",
    t("m2.host.emailAppDescription", "We're using CaskSense — an elegant web app for shared whisky tastings. We rate blind, compare impressions and see which dram wins. Everything in the browser, no download needed."),
    "",
    t("m2.host.emailHowToJoin", "How to join:"),
    t("m2.host.emailStep1", "1. Open casksense.com"),
    t("m2.host.emailStep2", {defaultValue: "2. Enter the code: {{code}}", code: tasting.code}),
    t("m2.host.emailStep2Alt", {defaultValue: "   Or use this link: {{link}}", link: joinUrl}),
    "",
    t("m2.host.emailClosing", "Looking forward to a great evening with you!"),
    "",
    hostName ? t("m2.host.emailCheersComma", "Cheers,") : t("m2.host.emailCheers", "Cheers!"),
    hostName || null,
  ].filter((l) => l !== null).join("\n");

  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [emailBody, setEmailBody] = useState(defaultBody);

  useEffect(() => {
    QRCodeLib.toDataURL(joinUrl, {
      width: 240, margin: 2,
      color: { dark: "#1a1714", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    downloadDataUrl(qrDataUrl, `casksense-${tasting.code}-qr.png`);
  };

  const loadFriends = async () => {
    setShowFriends(!showFriends);
    if (friends.length > 0) return;
    setFriendsLoading(true);
    try {
      const res = await fetch(`/api/participants/${pid}/friends`);
      if (res.ok) setFriends(await res.json());
    } catch {}
    setFriendsLoading(false);
  };

  const toggleFriend = (f: any) => {
    const next = new Set(selectedFriends);
    const email = f.email || f.friendEmail || "";
    if (!email) return;
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setSelectedFriends(next);
    const current = emailInput.split(/[,;\n]/).map((e: string) => e.trim()).filter(Boolean);
    if (next.has(email) && !current.includes(email)) {
      setEmailInput([...current, email].join(", "));
    } else if (!next.has(email)) {
      setEmailInput(current.filter((e: string) => e !== email).join(", "));
    }
  };

  const handleSendEmails = async () => {
    const emails = emailInput.split(/[,;\n]/).map(e => e.trim()).filter(e => e.includes("@"));
    if (emails.length === 0) return;
    setSending(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`/api/tastings/${tasting.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails,
          personalNote: emailBody || undefined,
          customSubject: emailSubject || undefined,
          customBody: emailBody || undefined,
        }),
      });
      if (!res.ok) throw new Error(t("m2.host.failedSendInvites", "Failed to send invitations"));
      setEmailStatus(t("m2.host.emailsSent", `${emails.length} invitation(s) sent!`));
      setEmailInput("");
      setSelectedFriends(new Set());
    } catch (e: any) {
      setEmailStatus(e.message || t("m2.host.failedSend", "Failed to send"));
    }
    setSending(false);
  };

  const socialBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 44, height: 44, borderRadius: 12, border: `1px solid ${v.border}`,
    background: v.bg, cursor: "pointer", fontSize: 18, textDecoration: "none",
    color: v.text,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={cardStyle}>
        <StepIndicator current={3} total={4} />
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: v.text, fontFamily: "'Playfair Display', Georgia, serif" }} data-testid="text-step3-title">
          {t("m2.host.step3Title", "Invite Guests")}
        </h3>
        <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>
          {t("m2.host.step3Desc", "Share the code or link so guests can join")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: v.bg, borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: v.muted, marginBottom: 6 }}>
              {t("m2.host.sessionCode", "Session Code")}
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "0.15em", color: v.accent, fontFamily: "'Playfair Display', monospace", marginBottom: 10 }} data-testid="text-session-code-large">
              {tasting.code}
            </div>
            <CopyBtn text={tasting.code} label={t("m2.host.copyCode", "Copy Code")} />
          </div>

          <div style={{ background: v.bg, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: v.muted, marginBottom: 8 }}>
              {t("m2.host.joinLink", "Join Link")}
            </div>
            <div style={{ fontSize: 13, color: v.text, background: v.card, padding: "10px 12px", borderRadius: 8, border: `1px solid ${v.border}`, wordBreak: "break-all", marginBottom: 10, fontFamily: "monospace" }} data-testid="text-join-link">
              {joinUrl}
            </div>
            <CopyBtn text={joinUrl} label={t("m2.host.copyLink", "Copy Link")} />
          </div>

          <div style={{ background: v.bg, borderRadius: 10, padding: 16 }}>
            <button type="button" onClick={() => setShowQr(!showQr)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", color: v.text, fontSize: 14, fontFamily: "system-ui, sans-serif", padding: 0 }} data-testid="button-toggle-qr">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <QrCode style={{ width: 18, height: 18, color: v.accent }} />
                <span style={{ fontWeight: 600 }}>{t("m2.host.qrCode", "QR Code")}</span>
              </div>
              <ChevronDown style={{ width: 14, height: 14, color: v.muted, transform: showQr ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
            {showQr && qrDataUrl && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 14 }}>
                <div style={{ background: "#fff", padding: 12, borderRadius: 10 }}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: 200, height: 200, display: "block" }} data-testid="img-qr-code" />
                </div>
                <button type="button" onClick={downloadQr} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${v.border}`, borderRadius: 8, padding: "8px 14px", color: v.muted, fontSize: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-download-qr">
                  <Download style={{ width: 14, height: 14 }} />
                  {t("m2.host.saveQr", "Save")}
                </button>
              </div>
            )}
          </div>

          {typeof navigator.share === "function" && (
            <button type="button" onClick={() => { navigator.share({ title: t("m2.host.shareTitle", {defaultValue: "Join: {{title}}", title: tasting.title}), text: shareText, url: joinUrl }).catch(() => {}); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", fontSize: 14, fontWeight: 600, background: `color-mix(in srgb, ${v.accent} 15%, transparent)`, color: v.accent, border: `1px solid color-mix(in srgb, ${v.accent} 40%, transparent)`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-native-share">
              <Share2 style={{ width: 16, height: 16 }} />
              {t("m2.host.shareVia", "Share via…")}
            </button>
          )}

          <div style={{ background: v.bg, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: v.muted, marginBottom: 10 }}>
              {t("m2.host.shareOn", "Share on")}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + joinUrl)}`} target="_blank" rel="noopener noreferrer" style={socialBtnStyle} data-testid="button-share-whatsapp" title="WhatsApp">
                <MessageCircle style={{ width: 20, height: 20 }} />
              </a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" style={socialBtnStyle} data-testid="button-share-telegram" title="Telegram">
                <Send style={{ width: 20, height: 20 }} />
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(joinUrl)}&quote=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" style={socialBtnStyle} data-testid="button-share-facebook" title="Facebook">
                <ExternalLink style={{ width: 20, height: 20 }} />
              </a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(joinUrl)}`} target="_blank" rel="noopener noreferrer" style={socialBtnStyle} data-testid="button-share-x" title="X">
                <span style={{ fontWeight: 700, fontSize: 16 }}>𝕏</span>
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(t("m2.host.shareTitle", {defaultValue: "Join: {{title}}", title: tasting.title}))}&body=${encodeURIComponent(shareText + "\n\n" + joinUrl)}`} style={socialBtnStyle} data-testid="button-share-email" title="Email">
                <Mail style={{ width: 20, height: 20 }} />
              </a>
            </div>
          </div>

          <div style={{ background: v.bg, borderRadius: 10, padding: 16 }}>
            <button type="button" onClick={loadFriends} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", color: v.text, fontSize: 14, fontFamily: "system-ui, sans-serif", padding: 0, marginBottom: showFriends ? 10 : 0 }} data-testid="button-toggle-friends">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users style={{ width: 16, height: 16, color: v.accent }} />
                <span style={{ fontWeight: 600 }}>{t("m2.host.inviteFriends", "Invite Friends")}</span>
              </div>
              <ChevronDown style={{ width: 14, height: 14, color: v.muted, transform: showFriends ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
            {showFriends && (
              friendsLoading ? <M2Loading /> : friends.length === 0 ? (
                <div style={{ fontSize: 13, color: v.muted, textAlign: "center", padding: 10 }}>{t("m2.host.noFriends", "No friends added yet")}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {friends.map((f: any) => {
                    const email = f.email || f.friendEmail || "";
                    const fName = f.name || f.friendName || email;
                    const selected = selectedFriends.has(email);
                    return (
                      <button key={f.id || email} type="button" onClick={() => toggleFriend(f)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: selected ? `color-mix(in srgb, ${v.accent} 15%, transparent)` : "transparent", border: `1px solid ${selected ? v.accent : v.border}`, borderRadius: 8, cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "system-ui, sans-serif" }} data-testid={`friend-item-${f.id || email}`}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected ? v.accent : v.border}`, background: selected ? v.accent : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {selected && <Check style={{ width: 10, height: 10, color: v.bg }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fName}</div>
                          {email !== fName && <div style={{ fontSize: 11, color: v.muted }}>{email}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>

          <div style={{ background: v.bg, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Mail style={{ width: 16, height: 16, color: v.accent }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: v.text }}>{t("m2.host.emailInvite", "Email Invitations")}</span>
            </div>
            <textarea value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder={t("m2.host.emailPlaceholder", "Enter email addresses (comma separated)")} rows={2} style={{ ...inputStyle, fontSize: 13, resize: "vertical", marginBottom: 8 }} data-testid="input-invite-emails" />
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>{t("m2.host.emailSubjectLabel", "Subject")}</label>
              <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} data-testid="input-email-subject" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>{t("m2.host.emailBodyLabel", "Message")}</label>
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={6} style={{ ...inputStyle, fontSize: 13, resize: "vertical", lineHeight: 1.5 }} data-testid="input-email-body" />
            </div>
            {emailStatus && (
              <div style={{ fontSize: 12, color: emailStatus.includes("sent") ? v.success : v.danger, marginBottom: 8 }} data-testid="text-email-status">
                {emailStatus}
              </div>
            )}
            <button type="button" onClick={handleSendEmails} disabled={sending || !emailInput.trim()} style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, background: emailInput.trim() ? v.accent : v.border, color: emailInput.trim() ? v.bg : v.muted, border: "none", borderRadius: 8, cursor: emailInput.trim() ? "pointer" : "not-allowed", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} data-testid="button-send-emails">
              <Send style={{ width: 14, height: 14 }} />
              {sending ? t("m2.host.sending", "Sending...") : t("m2.host.sendInvites", "Send Invitations")}
            </button>
          </div>
        </div>
      </div>

      <PrintableTemplatesSection />

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onBack} style={{ padding: "12px 16px", fontSize: 14, background: "none", color: v.muted, border: `1px solid ${v.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: 6 }} data-testid="button-back-step2">
          <ArrowLeft style={{ width: 14, height: 14 }} />
        </button>
        <button type="button" onClick={onNext} style={{ flex: 1, padding: "12px", fontSize: 15, fontWeight: 600, background: v.accent, color: v.bg, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} data-testid="button-next-to-live">
          {t("m2.host.nextLive", "Next: Go Live")}
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

function PrintableTemplatesSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [loadingMat, setLoadingMat] = useState(false);

  const handleSheet = async () => {
    setLoadingSheet(true);
    try { generateBlankTastingSheet(lang); } finally { setLoadingSheet(false); }
  };
  const handleMat = async () => {
    setLoadingMat(true);
    try { generateBlankTastingMat(lang); } finally { setLoadingMat(false); }
  };

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    padding: "12px 14px", borderRadius: 10, border: `1px solid ${v.border}`,
    background: v.card, color: v.text, fontSize: 13, fontWeight: 500,
    cursor: "pointer", transition: "all 0.2s",
    fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "left",
  };

  return (
    <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "16px", marginBottom: 16 }} data-testid="section-printable-templates">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Printer style={{ width: 16, height: 16, color: v.accent }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: v.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t("downloads.templates", "Printable Templates")}
        </span>
      </div>
      <p style={{ fontSize: 12, color: v.muted, margin: "0 0 12px 0" }}>
        {t("downloads.templatesDesc", "Blank tasting sheets and mats for your next session — available in DE & EN.")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={handleSheet} disabled={loadingSheet} style={{ ...btnStyle, opacity: loadingSheet ? 0.6 : 1, cursor: loadingSheet ? "not-allowed" : "pointer" }} data-testid="button-download-score-sheet">
          {loadingSheet
            ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite", flexShrink: 0 }} />
            : <ClipboardList style={{ width: 16, height: 16, color: v.accent, flexShrink: 0 }} />}
          <span>{t("downloads.scoreSheet", "Blank Score Sheet (PDF)")}</span>
          <Download style={{ width: 14, height: 14, marginLeft: "auto", color: v.muted, flexShrink: 0 }} />
        </button>
        <button onClick={handleMat} disabled={loadingMat} style={{ ...btnStyle, opacity: loadingMat ? 0.6 : 1, cursor: loadingMat ? "not-allowed" : "pointer" }} data-testid="button-download-tasting-mat">
          {loadingMat
            ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite", flexShrink: 0 }} />
            : <FileText style={{ width: 16, height: 16, color: v.accent, flexShrink: 0 }} />}
          <span>{t("downloads.tastingMat", "Tasting Mat (PDF)")}</span>
          <Download style={{ width: 14, height: 14, marginLeft: "auto", color: v.muted, flexShrink: 0 }} />
        </button>
      </div>
    </div>
  );
}

function Step1Edit({ tasting, pid, onUpdated }: { tasting: TastingFull; pid: string; onUpdated: (t: TastingFull) => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(tasting.title || "");
  const [date, setDate] = useState(tasting.date ? tasting.date.split("T")[0] : "");
  const [location, setLocation] = useState(tasting.location || "");
  const [description, setDescription] = useState(tasting.description || "");
  const [blindMode, setBlindMode] = useState(!!tasting.blindMode);
  const [ratingScale, setRatingScale] = useState(tasting.ratingScale ?? 100);
  const [guidedMode, setGuidedMode] = useState(!!tasting.guidedMode);
  const [guestMode, setGuestMode] = useState(tasting.guestMode || "standard");
  const [sessionUiMode, setSessionUiMode] = useState(tasting.sessionUiMode || "flow");
  const [reflectionEnabled, setReflectionEnabled] = useState(!!tasting.reflectionEnabled);
  const [reflectionMode, setReflectionMode] = useState(tasting.reflectionMode || "standard");
  const [reflectionVisibility, setReflectionVisibility] = useState(tasting.reflectionVisibility || "named");
  const [videoLink, setVideoLink] = useState(tasting.videoLink || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tastings/${tasting.id}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: pid,
          title: title.trim(),
          date: date || new Date().toISOString().split("T")[0],
          location: location.trim() || "",
          description: description.trim() || "",
          blindMode,
          ratingScale,
          guidedMode,
          guestMode,
          sessionUiMode: sessionUiMode || null,
          reflectionEnabled,
          reflectionMode,
          reflectionVisibility,
          videoLink: videoLink.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(t("m2.host.failedUpdate", "Failed to update tasting"));
      onUpdated({ ...tasting, title: title.trim(), date, location: location.trim(), description: description.trim(), blindMode, ratingScale, guidedMode, guestMode, sessionUiMode, reflectionEnabled, reflectionMode, reflectionVisibility, videoLink });
    } catch (e: any) {
      setError(e.message || t("m2.host.genericError", "Something went wrong"));
    }
    setSaving(false);
  };

  return (
    <div style={cardStyle}>
      <StepIndicator current={1} total={4} />
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: v.text, fontFamily: "'Playfair Display', Georgia, serif" }} data-testid="text-step1-edit-title">
        {t("m2.host.step1EditTitle", "Edit Tasting Details")}
      </h3>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>{t("m2.host.step1Desc", "Set up the basics for your tasting session")}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>{t("m2.host.titleLabel", "Tasting Title")} *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("m2.host.titlePlaceholder", "e.g. Friday Night Whisky Club")} style={inputStyle} maxLength={200} data-testid="input-edit-tasting-title" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}><Calendar style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />{t("m2.host.dateLabel", "Date")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} data-testid="input-edit-tasting-date" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}><MapPin style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />{t("m2.host.locationLabel", "Location")}</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("m2.host.locationPlaceholder", "e.g. Living room")} style={inputStyle} data-testid="input-edit-tasting-location" />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}><FileText style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />{t("m2.host.descriptionLabel", "Description")}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("m2.host.descriptionPlaceholder", "Optional notes for your guests...")} rows={2} style={{ ...inputStyle, resize: "vertical", minHeight: 48 }} data-testid="input-edit-tasting-description" />
        </div>
        <Toggle checked={blindMode} onChange={setBlindMode} label={t("m2.host.blindMode", "Blind Mode")} />
        <RatingScaleSelector value={ratingScale} onChange={setRatingScale} />
        <AdvancedConfigSection
          guidedMode={guidedMode} setGuidedMode={setGuidedMode}
          guestMode={guestMode} setGuestMode={setGuestMode}
          sessionUiMode={sessionUiMode} setSessionUiMode={setSessionUiMode}
          reflectionEnabled={reflectionEnabled} setReflectionEnabled={setReflectionEnabled}
          reflectionMode={reflectionMode} setReflectionMode={setReflectionMode}
          reflectionVisibility={reflectionVisibility} setReflectionVisibility={setReflectionVisibility}
          videoLink={videoLink} setVideoLink={setVideoLink}
        />
        {error && <div style={{ fontSize: 13, color: v.danger, background: `color-mix(in srgb, ${v.danger} 15%, transparent)`, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
        <button type="button" onClick={handleSave} disabled={!canSubmit} style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 600, background: canSubmit ? v.accent : v.border, color: canSubmit ? v.bg : v.muted, border: "none", borderRadius: 10, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} data-testid="button-save-step1">
          {saving ? t("m2.host.saving", "Saving...") : t("m2.host.nextAddWhiskies", "Create & Add Whiskies")}
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

function Step4Live({ tasting: initialTasting, pid, onBack }: { tasting: TastingFull; pid: string; onBack: () => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: liveTasting } = useQuery<TastingFull>({
    queryKey: ["/api/tastings", initialTasting.id, "m2-live"],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${initialTasting.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 3000,
    initialData: initialTasting,
  });
  const tasting = liveTasting || initialTasting;

  const { data: whiskies = [] } = useQuery<Whisky[]>({
    queryKey: ["/api/tastings", tasting.id, "m2-whiskies-live"],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tasting.id}/whiskies`);
      if (!res.ok) return [];
      return (await res.json()).sort((a: Whisky, b: Whisky) => a.sortOrder - b.sortOrder);
    },
  });

  const { data: participants = [] } = useQuery<TastingParticipant[]>({
    queryKey: ["/api/tastings", tasting.id, "m2-participants-live"],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tasting.id}/participants`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: ratings = [] } = useQuery<Rating[]>({
    queryKey: ["/api/tastings", tasting.id, "m2-ratings-live"],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tasting.id}/ratings`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000,
    enabled: tasting.status === "open",
  });

  const [showSettings, setShowSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const isBlind = !!tasting.blindMode;
  const isOpen = tasting.status === "open";
  const isDraft = tasting.status === "draft";
  const isClosed = !isDraft && !isOpen;

  const activeIndex = tasting.guidedWhiskyIndex ?? -1;
  const activeWhisky = activeIndex >= 0 && activeIndex < whiskies.length ? whiskies[activeIndex] : null;
  const revealStep = tasting.guidedRevealStep ?? 0;
  const showResults = !!tasting.showGroupAvg;

  const patchTasting = async (body: Record<string, any>) => {
    await fetch(`/api/tastings/${tasting.id}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, ...body }),
    });
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/tastings/${tasting.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, hostId: pid }),
    });
  };

  const updateGuided = async (body: Record<string, any>) => {
    await fetch(`/api/tastings/${tasting.id}/guided-mode`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, ...body }),
    });
  };

  const goToWhisky = async (index: number) => {
    await fetch(`/api/tastings/${tasting.id}/guided-goto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, whiskyIndex: index, revealStep: 0 }),
    });
  };

  const handleStartSession = async () => {
    await updateStatus("open");
    if (whiskies.length > 0) {
      await updateGuided({ guidedMode: true, guidedWhiskyIndex: 0, guidedRevealStep: 0 });
    }
    await fetch(`/api/tastings/${tasting.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: pid }),
    });
  };

  const handleEndSession = async () => {
    await updateStatus("closed");
  };

  const handleReveal = async () => {
    const nextStep = Math.min((tasting.guidedRevealStep ?? 0) + 1, 3);
    await updateGuided({ guidedRevealStep: nextStep });
  };

  const handleToggleResults = async () => {
    await patchTasting({ showGroupAvg: !showResults, showRanking: !showResults });
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const newTasting = await tastingApi.duplicate(tasting.id, pid);
      if (newTasting?.id) {
        navigate(`/m2/tastings/host`);
      }
    } catch {}
    setDuplicating(false);
  };

  const handleDelete = async () => {
    try {
      await tastingApi.hardDelete(tasting.id, pid);
      navigate("/m2/tastings");
    } catch {}
  };

  const handleCoverUpload = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setLocalCoverUrl(previewUrl);
    try {
      await tastingApi.uploadCoverImage(tasting.id, file, pid);
      queryClient.invalidateQueries({ queryKey: ["/api/tastings", tasting.id] });
    } catch {
      setLocalCoverUrl(null);
    }
  };

  const showSaved = (msg?: string) => {
    setSaveStatus(msg || t("m2.host.saved", "Saved"));
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const activeRatings = activeWhisky ? ratings.filter((r) => r.whiskyId === activeWhisky.id) : [];
  const avgScore = activeRatings.length > 0
    ? Math.round(activeRatings.reduce((sum, r) => sum + (r.overall ?? 0), 0) / activeRatings.length)
    : null;
  const guestParticipants = participants.filter((p) => p.participantId !== pid);
  const ratedParticipantIds = new Set(activeRatings.map((r) => r.participantId));

  if (isDraft) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={cardStyle}>
          <StepIndicator current={4} total={4} />
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: v.text, fontFamily: "'Playfair Display', Georgia, serif" }} data-testid="text-step4-title">
            {t("m2.host.step4Title", "Go Live")}
          </h3>
          <div style={{ fontSize: 20, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif", marginTop: 12, marginBottom: 6 }} data-testid="text-tasting-title">
            {tasting.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: v.muted }}>
            <span>{t("m2.host.codeLabel", "Code:")}{" "}<strong style={{ color: v.accent, letterSpacing: "0.08em" }}>{tasting.code}</strong></span>
            {isBlind && (
              <span style={{ fontSize: 10, color: v.accent, background: `color-mix(in srgb, ${v.accent} 20%, transparent)`, padding: "2px 6px", borderRadius: 6 }}>
                <EyeOff style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                {t("m2.host.blindBadge", "Blind")}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: v.muted, marginTop: 8 }}>
            {whiskies.length === 0 ? t("m2.host.noWhiskiesAddedYet", "No whiskies added yet") : `${whiskies.length} ${whiskies.length === 1 ? t("m2.host.whiskyCount", "whisky") : t("m2.host.whiskiesCount", "whiskies")} ${t("m2.host.ready", "ready")}`}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartSession}
          disabled={whiskies.length === 0}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "16px", fontSize: 16, fontWeight: 700,
            background: whiskies.length > 0 ? v.success : v.border,
            color: whiskies.length > 0 ? "#fff" : v.muted,
            border: "none", borderRadius: 12,
            cursor: whiskies.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "system-ui, sans-serif",
            opacity: whiskies.length === 0 ? 0.5 : 1,
          }}
          data-testid="button-start-session"
        >
          <Play style={{ width: 20, height: 20 }} />
          {t("m2.host.startTasting", "Start Tasting")}
        </button>
        {whiskies.length === 0 && (
          <p style={{ fontSize: 12, color: v.muted, textAlign: "center", margin: 0 }}>
            {t("m2.host.addWhiskiesFirst", "Add whiskies first before starting")}
          </p>
        )}

        <SettingsPanel tasting={tasting} pid={pid} onDuplicate={handleDuplicate} onDelete={handleDelete} duplicating={duplicating} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} onCoverUpload={handleCoverUpload} localCoverUrl={localCoverUrl} saveStatus={saveStatus} onSaved={showSaved} />

        <button type="button" onClick={onBack} style={{ width: "100%", padding: "10px", fontSize: 13, background: "none", color: v.muted, border: `1px solid ${v.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} data-testid="button-back-step3">
          <ArrowLeft style={{ width: 14, height: 14 }} />
          {t("m2.host.backToInvite", "Back")}
        </button>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>{tasting.title}</div>
          <div style={{ fontSize: 13, color: v.muted }}>
            {t("m2.host.statusLabel", "Status:")}{" "}<strong style={{ color: v.text }}>{t("m2.tastings.status" + tasting.status.charAt(0).toUpperCase() + tasting.status.slice(1), tasting.status)}</strong>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/m2/tastings/session/${tasting.id}/results`)}
          style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 700, background: v.accent, color: v.bg, border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          data-testid="button-view-results"
        >
          <BarChart3 style={{ width: 18, height: 18 }} />
          {t("m2.host.viewResults", "View Results")}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/m2/tastings/session/${tasting.id}/recap`)}
          style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, background: v.card, color: v.accent, border: `1px solid ${v.border}`, borderRadius: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          data-testid="button-view-recap"
        >
          {t("m2.host.viewRecap", "View Recap")}
        </button>
        <SettingsPanel tasting={tasting} pid={pid} onDuplicate={handleDuplicate} onDelete={handleDelete} duplicating={duplicating} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} onCoverUpload={handleCoverUpload} localCoverUrl={localCoverUrl} saveStatus={saveStatus} onSaved={showSaved} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={cardStyle} data-testid="section-overview">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif", marginBottom: 4 }} data-testid="text-tasting-title">
              {tasting.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: v.muted }}>
                {t("m2.host.codeLabel", "Code:")}{" "}<strong style={{ color: v.accent, letterSpacing: "0.08em", fontSize: 15 }}>{tasting.code}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isBlind && (
              <span style={{ fontSize: 10, fontWeight: 600, color: v.accent, background: `color-mix(in srgb, ${v.accent} 20%, transparent)`, padding: "3px 8px", borderRadius: 6 }}>
                <EyeOff style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                {t("m2.host.blindBadge", "Blind")}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: v.success, background: `color-mix(in srgb, ${v.success} 20%, transparent)`, padding: "3px 8px", borderRadius: 6 }} data-testid="badge-session-status">
              {t("m2.host.liveBadge", "LIVE")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif" }} data-testid="text-participant-count">
              {guestParticipants.length}
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("m2.host.guestsLabel", "Guests")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif" }}>
              {whiskies.length}
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("m2.host.whiskiesLabel", "Whiskies")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif" }} data-testid="text-rating-count">
              {activeRatings.length}
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("m2.host.ratingsLabel", "Ratings")}</div>
          </div>
          {avgScore !== null && showResults && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: v.accent, fontFamily: "'Playfair Display', serif" }} data-testid="text-avg-score">
                {avgScore}
              </div>
              <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("m2.host.avgLabel", "Avg")}</div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/m2/tastings/session/${tasting.id}/dashboard`)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "14px", fontSize: 14, fontWeight: 700,
          background: v.accent, color: v.bg,
          border: "none", borderRadius: 12,
          cursor: "pointer", fontFamily: "system-ui, sans-serif",
        }}
        data-testid="button-open-dashboard"
      >
        <Monitor style={{ width: 18, height: 18 }} />
        {t("m2.host.openDashboard", "Open Hosting Dashboard")}
      </button>

      <div style={cardStyle} data-testid="section-dram-control">
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: v.muted, marginBottom: 14 }}>
          {t("m2.host.dramControl", "Dram Control")}
        </div>

        <div style={{ background: v.bg, borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: v.muted, marginBottom: 6 }}>
            {t("m2.host.currentDram", "Current Dram")}
          </div>
          {activeWhisky ? (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {activeWhisky.imageUrl && (
                <img src={activeWhisky.imageUrl} alt="" style={{ width: 48, height: 64, objectFit: "cover", borderRadius: 8, flexShrink: 0, background: v.card }} data-testid="img-active-whisky" />
              )}
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: v.accent, fontFamily: "'Playfair Display', serif", marginBottom: 2 }} data-testid="text-active-whisky">
                  {isBlind ? t("m2.host.whiskyBlindLabel", {defaultValue: "Whisky {{label}}", label: blindLabel(activeIndex)}) : activeWhisky.name}
                </div>
                {isBlind && (
                  <div style={{ fontSize: 13, color: v.muted, display: "flex", alignItems: "center", gap: 6 }}>
                    <EyeOff style={{ width: 12, height: 12 }} />
                    {activeWhisky.name}
                    {activeWhisky.distillery && ` · ${activeWhisky.distillery}`}
                  </div>
                )}
                {!isBlind && activeWhisky.distillery && (
                  <div style={{ fontSize: 13, color: v.muted, marginTop: 2 }}>
                    {[activeWhisky.distillery, activeWhisky.abv ? `${activeWhisky.abv}%` : null].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: v.muted }}>{t("m2.host.noWhiskySelected", "No whisky selected")}</div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {whiskies.map((w, i) => {
            const isActivePill = i === activeIndex;
            const whiskyRatings = ratings.filter((r) => r.whiskyId === w.id);
            const done = whiskyRatings.length >= guestParticipants.length && guestParticipants.length > 0;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => goToWhisky(i)}
                style={{
                  padding: "8px 16px", fontSize: 14, fontWeight: isActivePill ? 700 : 500,
                  background: isActivePill ? v.accent : done ? `color-mix(in srgb, ${v.success} 15%, transparent)` : v.bg,
                  color: isActivePill ? v.bg : done ? v.success : v.text,
                  border: `1.5px solid ${isActivePill ? v.accent : done ? `color-mix(in srgb, ${v.success} 40%, transparent)` : v.border}`,
                  borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif",
                  position: "relative",
                }}
                data-testid={`button-select-whisky-${w.id}`}
              >
                {isBlind ? blindLabel(i) : `${i + 1}`}
                {done && !isActivePill && (
                  <Check style={{ width: 10, height: 10, position: "absolute", top: -3, right: -3, color: v.success }} />
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {isBlind && activeWhisky && (
            <button
              type="button"
              onClick={handleReveal}
              disabled={revealStep >= 3}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px", fontSize: 15, fontWeight: 700,
                background: revealStep < 3 ? `color-mix(in srgb, ${v.accent} 15%, transparent)` : v.border,
                color: revealStep < 3 ? v.accent : v.muted,
                border: `1.5px solid ${revealStep < 3 ? `color-mix(in srgb, ${v.accent} 50%, transparent)` : v.border}`,
                borderRadius: 12, cursor: revealStep < 3 ? "pointer" : "not-allowed", fontFamily: "system-ui, sans-serif",
              }}
              data-testid="button-reveal"
            >
              <Eye style={{ width: 18, height: 18 }} />
              {revealStep === 0 ? t("m2.host.revealName", "Reveal Name") : revealStep === 1 ? t("m2.host.revealDetails", "Reveal Details") : revealStep === 2 ? t("m2.host.revealImage", "Reveal Image") : t("m2.host.fullyRevealed", "Fully Revealed")}
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleResults}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", fontSize: 14, fontWeight: 600,
              background: showResults ? `color-mix(in srgb, ${v.success} 15%, transparent)` : v.bg,
              color: showResults ? v.success : v.muted,
              border: `1.5px solid ${showResults ? `color-mix(in srgb, ${v.success} 50%, transparent)` : v.border}`,
              borderRadius: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif",
            }}
            data-testid="button-toggle-results"
          >
            <BarChart3 style={{ width: 16, height: 16 }} />
            {showResults ? t("m2.host.resultsVisible", "Results Visible") : t("m2.host.showResults", "Show Results")}
          </button>

          {tasting.status === "open" && (
            <button
              type="button"
              onClick={() => navigate(`/m2/tastings/session/${tasting.id}`)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px", fontSize: 15, fontWeight: 700,
                background: `color-mix(in srgb, ${v.accent} 15%, transparent)`, color: v.accent,
                border: `1.5px solid color-mix(in srgb, ${v.accent} 50%, transparent)`,
                borderRadius: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif",
              }}
              data-testid="button-host-rate"
            >
              <Star style={{ width: 18, height: 18 }} />
              {t("m2.host.rateWhisky", "Rate This Whisky")}
            </button>
          )}
        </div>
      </div>

      <div style={cardStyle} data-testid="section-participants">
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: v.muted, marginBottom: 14 }}>
          {t("m2.host.participantsTitle", "Participants")} ({guestParticipants.length})
        </div>
        {guestParticipants.length === 0 ? (
          <div style={{ fontSize: 13, color: v.muted, textAlign: "center", padding: "12px 0" }}>
            {t("m2.host.noParticipants", "No guests have joined yet")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {guestParticipants.map((p) => {
              const hasRated = ratedParticipantIds.has(p.participantId);
              return (
                <div
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: v.bg, borderRadius: 8 }}
                  data-testid={`participant-row-${p.participantId}`}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: v.text }}>{p.participant.name}</span>
                  {activeWhisky ? (
                    hasRated ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: v.success, fontWeight: 600 }}>
                        <Check style={{ width: 14, height: 14 }} />
                        {t("m2.host.rated", "Rated")}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: v.muted }}>…</span>
                    )
                  ) : (
                    <span style={{ fontSize: 12, color: v.muted }}>{t("m2.host.joined", "Joined")}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleEndSession}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "14px", fontSize: 16, fontWeight: 700,
          background: `color-mix(in srgb, ${v.danger} 15%, transparent)`, color: v.danger,
          border: `1px solid color-mix(in srgb, ${v.danger} 40%, transparent)`,
          borderRadius: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif",
        }}
        data-testid="button-end-session"
      >
        <Square style={{ width: 20, height: 20 }} />
        {t("m2.host.endTasting", "End Tasting")}
      </button>

      <SettingsPanel tasting={tasting} pid={pid} onDuplicate={handleDuplicate} onDelete={handleDelete} duplicating={duplicating} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} onCoverUpload={handleCoverUpload} localCoverUrl={localCoverUrl} saveStatus={saveStatus} onSaved={showSaved} />
    </div>
  );
}

function SettingsPanel({ tasting, pid, onDuplicate, onDelete, duplicating, confirmDelete, setConfirmDelete, onCoverUpload, localCoverUrl, saveStatus, onSaved }: {
  tasting: TastingFull; pid: string;
  onDuplicate: () => void; onDelete: () => void;
  duplicating: boolean; confirmDelete: boolean; setConfirmDelete: (v: boolean) => void;
  onCoverUpload: (f: File) => void;
  localCoverUrl?: string | null;
  saveStatus?: string | null;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [ratingPrompt, setRatingPrompt] = useState(tasting.ratingPrompt || "");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [videoLinkLocal, setVideoLinkLocal] = useState(tasting.videoLink || "");
  const [savingVideo, setSavingVideo] = useState(false);

  const patchDetails = async (body: Record<string, any>) => {
    await fetch(`/api/tastings/${tasting.id}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, ...body }),
    });
    onSaved?.();
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try { await patchDetails({ ratingPrompt: ratingPrompt.trim() || null }); } catch {}
    setSavingPrompt(false);
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try { await patchDetails({ videoLink: videoLinkLocal.trim() || null }); } catch {}
    setSavingVideo(false);
  };

  const handleToggle = async (field: string, currentVal: boolean) => {
    try { await patchDetails({ [field]: !currentVal }); } catch {}
  };

  const handleToggleGuided = async () => {
    try {
      await fetch(`/api/tastings/${tasting.id}/guided-mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: pid, guidedMode: !tasting.guidedMode }),
      });
      onSaved?.();
    } catch {}
  };

  const handleChangeScale = async (scale: number) => {
    try { await patchDetails({ ratingScale: scale }); } catch {}
  };

  const handleChangeGuestMode = async (mode: string) => {
    try { await patchDetails({ guestMode: mode }); } catch {}
  };

  const handleChangeSessionUi = async (mode: string) => {
    try { await patchDetails({ sessionUiMode: mode || null }); } catch {}
  };

  const handleToggleReflection = async () => {
    try { await patchDetails({ reflectionEnabled: !tasting.reflectionEnabled }); } catch {}
  };

  const handleChangeReflectionMode = async (mode: string) => {
    try { await patchDetails({ reflectionMode: mode }); } catch {}
  };

  const handleChangeReflectionVis = async (vis: string) => {
    try { await patchDetails({ reflectionVisibility: vis }); } catch {}
  };

  const sectionLabel = (text: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: v.muted, marginTop: 4, marginBottom: -4 }}>
      {text}
    </div>
  );

  const isDraft = tasting.status === "draft";

  return (
    <div style={cardStyle}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          color: v.text, fontSize: 14, fontFamily: "system-ui, sans-serif", padding: 0,
        }}
        data-testid="button-toggle-settings"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Settings style={{ width: 16, height: 16, color: v.muted }} />
          <span style={{ fontWeight: 600 }}>{t("m2.host.settings", "Settings & Actions")}</span>
        </div>
        <ChevronDown style={{ width: 14, height: 14, color: v.muted, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>

      {saveStatus && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: v.success, fontWeight: 500 }} data-testid="text-save-status">
          <Check style={{ width: 12, height: 12 }} />
          {saveStatus}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {sectionLabel(t("m2.host.sectionSession", "Session"))}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
              <Gauge style={{ width: 12, height: 12 }} />
              {t("m2.host.ratingScale", "Rating Scale")}
              {!isDraft && <Lock style={{ width: 10, height: 10, color: v.muted }} />}
            </label>
            {isDraft ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {RATING_SCALES.map((s) => {
                  const active = (tasting.ratingScale ?? 100) === s.value;
                  return (
                    <button key={s.value} type="button" onClick={() => handleChangeScale(s.value)} style={{ padding: "6px 2px", textAlign: "center", background: active ? `color-mix(in srgb, ${v.accent} 18%, transparent)` : v.bg, border: `1.5px solid ${active ? v.accent : v.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid={`settings-scale-${s.value}`}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: active ? v.accent : v.text }}>{s.label}</div>
                      <div style={{ fontSize: 9, color: v.muted }}>{t(s.descKey, s.descFallback)}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: v.text, padding: "8px 12px", background: v.bg, borderRadius: 8 }}>
                {t(RATING_SCALES.find((s) => s.value === (tasting.ratingScale ?? 100))?.descKey || "m2.host.ratingScaleDesc100", RATING_SCALES.find((s) => s.value === (tasting.ratingScale ?? 100))?.descFallback || `${tasting.ratingScale}-point`)}
                <span style={{ fontSize: 11, color: v.muted, marginLeft: 8 }}>{t("m2.host.lockedWhileActive", "(locked while session is active)")}</span>
              </div>
            )}
          </div>

          <Toggle checked={!!tasting.blindMode} onChange={() => handleToggle("blindMode", !!tasting.blindMode)} label={t("m2.host.blindMode", "Blind Tasting")} />
          <div style={{ fontSize: 11, color: v.muted, marginTop: -10, lineHeight: 1.4 }}>{t("m2.host.blindModeDesc", "Hide whisky names until you choose to reveal them")}</div>
          <Toggle checked={!!tasting.guidedMode} onChange={handleToggleGuided} label={t("m2.host.guidedMode", "Host Controls the Pace")} />
          <div style={{ fontSize: 11, color: v.muted, marginTop: -10, lineHeight: 1.4 }}>{t("m2.host.guidedModeSettingsDesc", "You decide when guests move to the next dram")}</div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
              {t("m2.host.sessionUiModeLabel", "Tasting Experience")}
            </label>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 6, lineHeight: 1.4 }}>{t("m2.host.sessionUiModeSettingsDesc", "How guests navigate through the whiskies")}</div>
            <SegmentedSelect
              value={tasting.sessionUiMode || "flow"}
              options={[
                { value: "flow", label: t("m2.host.uiModeFlow", "Free Tasting"), desc: t("m2.host.uiModeFlowDesc", "Guests explore all drams freely") },
                { value: "focus", label: t("m2.host.uiModeFocus", "One at a Time"), desc: t("m2.host.uiModeFocusDesc", "Focus on one dram before the next") },
                { value: "journal", label: t("m2.host.uiModeJournal", "Tasting Journal"), desc: t("m2.host.uiModeJournalDesc", "Step-by-step guided notes") },
              ]}
              onChange={handleChangeSessionUi}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
              {t("m2.host.guestModeLabel", "How Guests Join")}
            </label>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 6, lineHeight: 1.4 }}>{t("m2.host.guestModeSettingsDesc", "Choose whether guests need an account or can join instantly")}</div>
            <SegmentedSelect
              value={tasting.guestMode || "standard"}
              options={[
                { value: "standard", label: t("m2.host.guestStandard", "With Account"), desc: t("m2.host.guestStandardDesc", "Guests sign in — ratings are saved") },
                { value: "ultra", label: t("m2.host.guestUltra", "Instant Join"), desc: t("m2.host.guestUltraDesc", "No sign-in needed — anonymous") },
              ]}
              onChange={handleChangeGuestMode}
            />
          </div>

          {sectionLabel(t("m2.host.sectionDisplay", "What Guests See"))}

          <Toggle checked={!!tasting.showRanking} onChange={() => handleToggle("showRanking", !!tasting.showRanking)} label={t("m2.host.showRanking", "Show Ranking to Guests")} />
          <div style={{ fontSize: 11, color: v.muted, marginTop: -10, lineHeight: 1.4 }}>{t("m2.host.showRankingDesc", "Guests can see how whiskies rank against each other")}</div>
          <Toggle checked={!!tasting.showGroupAvg} onChange={() => handleToggle("showGroupAvg", !!tasting.showGroupAvg)} label={t("m2.host.showGroupAvg", "Show Group Scores")} />
          <div style={{ fontSize: 11, color: v.muted, marginTop: -10, lineHeight: 1.4 }}>{t("m2.host.showGroupAvgDesc", "Guests can see the average score from all participants")}</div>
          <Toggle checked={tasting.showReveal !== false} onChange={() => handleToggle("showReveal", tasting.showReveal !== false)} label={t("m2.host.showReveal", "Show Results After Tasting")} />
          <div style={{ fontSize: 11, color: v.muted, marginTop: -10, lineHeight: 1.4 }}>{t("m2.host.showRevealDesc", "Guests can access the results page when the tasting ends")}</div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
              {t("m2.host.ratingPrompt", "Rating Prompt")}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={ratingPrompt} onChange={(e) => setRatingPrompt(e.target.value)} placeholder={t("m2.host.ratingPromptPlaceholder", "e.g. Rate this whisky on your overall impression")} style={{ ...inputStyle, flex: 1 }} data-testid="input-rating-prompt" />
              <button type="button" onClick={handleSavePrompt} disabled={savingPrompt} style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600, background: v.accent, color: v.bg, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-save-prompt">
                {savingPrompt ? "…" : t("m2.host.save", "Save")}
              </button>
            </div>
          </div>

          {sectionLabel(t("m2.host.sectionExtras", "Extras"))}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
              {t("m2.host.reflectionLabel", "Group Discussion")}
            </label>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 8, lineHeight: 1.4 }}>{t("m2.host.reflectionSettingsDesc", "Let guests share thoughts after tasting each whisky")}</div>
            <Toggle checked={!!tasting.reflectionEnabled} onChange={handleToggleReflection} label={t("m2.host.reflectionEnabled", "Enable Discussion Round")} />
            {tasting.reflectionEnabled && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
                    {t("m2.host.reflectionModeLabel", "Discussion Format")}
                  </label>
                  <SegmentedSelect
                    value={tasting.reflectionMode || "standard"}
                    options={[
                      { value: "standard", label: t("m2.host.reflectionStandard", "Standard"), desc: t("m2.host.reflectionStandardDesc", "Pre-set questions") },
                      { value: "custom", label: t("m2.host.reflectionCustom", "Custom"), desc: t("m2.host.reflectionCustomDesc", "Your own questions") },
                    ]}
                    onChange={handleChangeReflectionMode}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>
                    {t("m2.host.reflectionVisibilityLabel", "Show Names in Discussion")}
                  </label>
                  <SegmentedSelect
                    value={tasting.reflectionVisibility || "named"}
                    options={[
                      { value: "named", label: t("m2.host.reflectionNamed", "Named"), desc: t("m2.host.reflectionNamedDesc", "Names shown") },
                      { value: "anonymous", label: t("m2.host.reflectionAnonymous", "Anonymous"), desc: t("m2.host.reflectionAnonDesc", "Names hidden") },
                      { value: "optional", label: t("m2.host.reflectionOptional", "Optional"), desc: t("m2.host.reflectionOptDesc", "Guest decides") },
                    ]}
                    onChange={handleChangeReflectionVis}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
              <Video style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {t("m2.host.videoLinkLabel", "Video Call Link")}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="url" value={videoLinkLocal} onChange={(e) => setVideoLinkLocal(e.target.value)} placeholder={t("m2.host.videoLinkPlaceholder", "https://zoom.us/j/...")} style={{ ...inputStyle, flex: 1 }} data-testid="input-settings-video-link" />
              <button type="button" onClick={handleSaveVideo} disabled={savingVideo} style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600, background: v.accent, color: v.bg, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-save-video">
                {savingVideo ? "…" : t("m2.host.save", "Save")}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
              {t("m2.host.coverImage", "Cover Image")}
            </label>
            <label style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px", fontSize: 13, fontWeight: 500,
              background: v.bg, color: v.muted, border: `1px dashed ${v.border}`, borderRadius: 10,
              cursor: "pointer", fontFamily: "system-ui, sans-serif",
            }} data-testid="button-upload-cover">
              <Upload style={{ width: 16, height: 16 }} />
              {tasting.coverImageUrl ? t("m2.host.changeCover", "Change Cover") : t("m2.host.uploadCover", "Upload Cover Image")}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) onCoverUpload(e.target.files[0]); }} />
            </label>
            {(localCoverUrl || tasting.coverImageUrl) && (
              <img src={localCoverUrl || tasting.coverImageUrl || ""} alt="Cover" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginTop: 8 }} data-testid="img-cover-preview" />
            )}
          </div>

          <div style={{ borderTop: `1px solid ${v.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={onDuplicate}
              disabled={duplicating}
              style={{
                width: "100%", padding: "10px", fontSize: 13, fontWeight: 500,
                background: "none", color: v.muted, border: `1px solid ${v.border}`,
                borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
              data-testid="button-duplicate-tasting"
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
              {duplicating ? t("m2.host.duplicating", "Duplicating...") : t("m2.host.duplicate", "Duplicate Tasting")}
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  width: "100%", padding: "10px", fontSize: 13, fontWeight: 500,
                  background: "none", color: v.danger, border: `1px solid color-mix(in srgb, ${v.danger} 40%, transparent)`,
                  borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
                data-testid="button-delete-tasting"
              >
                <Trash2 style={{ width: 14, height: 14 }} />
                {t("m2.host.deleteTasting", "Delete Tasting")}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={onDelete}
                  style={{
                    flex: 1, padding: "10px", fontSize: 13, fontWeight: 600,
                    background: v.danger, color: "#fff", border: "none",
                    borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif",
                  }}
                  data-testid="button-confirm-delete"
                >
                  {t("m2.host.confirmDelete", "Yes, Delete")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1, padding: "10px", fontSize: 13,
                    background: "none", color: v.muted, border: `1px solid ${v.border}`,
                    borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, sans-serif",
                  }}
                  data-testid="button-cancel-delete"
                >
                  {t("m2.host.cancelDelete", "Cancel")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function M2TastingsHost({ resumeId }: { resumeId?: string } = {}) {
  const { t } = useTranslation();
  const session = getSession();
  const [step, setStep] = useState<WizardStep>(resumeId ? "step2" : "list");
  const [tasting, setTasting] = useState<TastingFull | null>(null);
  const [resumeLoading, setResumeLoading] = useState(!!resumeId);
  const [, navigate] = useLocation();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!resumeId || !session.pid) return;
    (async () => {
      try {
        const res = await fetch(`/api/tastings/${resumeId}`);
        if (!res.ok) throw new Error("Not found");
        const data: TastingFull = await res.json();
        setTasting(data);
        const wRes = await fetch(`/api/tastings/${resumeId}/whiskies`);
        const whiskies = wRes.ok ? await wRes.json() : [];
        if (data.status !== "draft") {
          setStep("step4");
        } else if (whiskies.length === 0) {
          setStep("step2");
        } else {
          setStep("step3");
        }
      } catch {
        navigate("/m2/tastings");
      }
      setResumeLoading(false);
    })();
  }, [resumeId, session.pid]);

  const handleCreated = (newTasting: TastingFull) => {
    setTasting(newTasting);
    setStep("step2");
    queryClient.invalidateQueries({ queryKey: ["/api/tastings"] });
  };

  const handleResume = (id: string) => {
    navigate(`/m2/tastings/host/${id}`);
  };

  if (!session.signedIn || !session.pid) {
    return (
      <div style={{ padding: 16 }} data-testid="m2-host-page">
        <M2BackButton />
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: v.text,
            margin: "16px 0",
          }}
          data-testid="text-m2-host-title"
        >
          {t("m2.host.title", "Host")}
        </h1>
        <div style={{ background: v.elevated, borderRadius: 12, padding: 20, textAlign: "center", color: v.textSecondary }}>
          {t("m2.host.signInRequired", "Please sign in to host a tasting")}
        </div>
      </div>
    );
  }

  if (resumeLoading) {
    return (
      <div style={{ padding: 16 }} data-testid="m2-host-page">
        <M2BackButton />
        <M2Loading />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }} data-testid="m2-host-page">
      <M2BackButton />
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 24,
          fontWeight: 700,
          color: v.text,
          margin: "16px 0 20px",
        }}
        data-testid="text-m2-host-title"
      >
        {t("m2.host.title", "Host")}
      </h1>

      {step === "list" && (
        <HostOverview
          pid={session.pid}
          onNewTasting={() => { setTasting(null); setStep("step1"); }}
          onResume={handleResume}
        />
      )}

      {step === "step1" && !tasting && (
        <Step1Create pid={session.pid} onCreated={handleCreated} />
      )}

      {step === "step1" && tasting && (
        <Step1Edit tasting={tasting} pid={session.pid} onUpdated={(t) => { setTasting(t); setStep("step2"); }} />
      )}

      {step === "step2" && tasting && (
        <Step2Whiskies
          tasting={tasting}
          pid={session.pid}
          onNext={() => setStep("step3")}
          onBack={() => setStep("step1")}
        />
      )}

      {step === "step3" && tasting && (
        <Step3Invite
          tasting={tasting}
          pid={session.pid}
          onNext={() => setStep("step4")}
          onBack={() => setStep("step2")}
        />
      )}

      {step === "step4" && tasting && (
        <Step4Live
          tasting={tasting}
          pid={session.pid}
          onBack={() => setStep("step3")}
        />
      )}
    </div>
  );
}
