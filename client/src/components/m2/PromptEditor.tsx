import { useState } from "react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import { Lightbulb, ChevronDown, Eye, EyeOff } from "lucide-react";

interface PromptEditorProps {
  value: string;
  onChange: (val: string) => void;
  basePromptKey: string;
  placeholderKey: string;
  placeholderFallback: string;
  testIdPrefix: string;
  maxLength?: number;
  variant?: "collapsible" | "inline";
}

export default function PromptEditor({
  value,
  onChange,
  basePromptKey,
  placeholderKey,
  placeholderFallback,
  testIdPrefix,
  maxLength = 500,
  variant = "collapsible",
}: PromptEditorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(variant === "inline");
  const [showBasePrompt, setShowBasePrompt] = useState(false);

  const basePrompt = t(basePromptKey);

  if (variant === "inline") {
    return (
      <div style={{ marginBottom: 8 }} data-testid={`${testIdPrefix}-editor`}>
        <label style={{ fontSize: 12, color: v.muted, display: "block", marginBottom: 6, fontFamily: "system-ui, sans-serif" }}>
          {t("promptEditor.label", "AI Prompt")} <span style={{ fontWeight: 400, opacity: 0.7 }}>({t("customPrompt.optional", "Optional")})</span>
        </label>
        <button
          type="button"
          onClick={() => setShowBasePrompt(!showBasePrompt)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: v.accent,
            fontSize: 11,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid={`${testIdPrefix}-toggle-base`}
        >
          {showBasePrompt ? <EyeOff style={{ width: 12, height: 12 }} /> : <Eye style={{ width: 12, height: 12 }} />}
          <span>{showBasePrompt ? t("promptEditor.hideBasePrompt", "Hide AI instructions") : t("promptEditor.showBasePrompt", "Show AI instructions")}</span>
        </button>
        {showBasePrompt && (
          <div
            style={{
              padding: "10px 12px",
              fontSize: 12,
              fontFamily: "system-ui, sans-serif",
              color: v.textSecondary,
              background: `color-mix(in srgb, ${v.accent} 5%, ${v.bg})`,
              border: `1px solid color-mix(in srgb, ${v.accent} 15%, ${v.border})`,
              borderRadius: 8,
              marginBottom: 8,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
            data-testid={`${testIdPrefix}-base-prompt`}
          >
            {basePrompt}
          </div>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={t(placeholderKey, placeholderFallback)}
          rows={2}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            color: v.text,
            background: v.inputBg || v.elevated,
            border: `1px solid ${v.border}`,
            borderRadius: 8,
            outline: "none",
            fontFamily: "system-ui, sans-serif",
            boxSizing: "border-box" as const,
            resize: "vertical",
            lineHeight: 1.5,
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = v.accent; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = v.border; }}
          data-testid={`${testIdPrefix}-custom-input`}
        />
        <div style={{ textAlign: "right", fontSize: 11, color: v.muted, marginTop: 4, fontFamily: "system-ui, sans-serif" }}>
          {value.length}/{maxLength}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }} data-testid={`${testIdPrefix}-editor`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 4px",
          background: "none",
          border: "none",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          width: "100%",
        }}
        data-testid={`${testIdPrefix}-toggle`}
      >
        <Lightbulb style={{ width: 16, height: 16, color: value.trim() ? v.accent : v.muted }} />
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600, color: v.textSecondary, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
          {t("promptEditor.label", "AI Prompt")}
          <span style={{ fontWeight: 400, color: v.muted, marginLeft: 6, fontSize: 12 }}>
            ({t("customPrompt.optional", "Optional")})
          </span>
        </span>
        <ChevronDown
          style={{
            width: 14,
            height: 14,
            color: v.muted,
            transition: "transform 0.25s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          strokeWidth={2}
        />
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setShowBasePrompt(!showBasePrompt)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: v.accent,
              fontSize: 11,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 4,
            }}
            data-testid={`${testIdPrefix}-toggle-base`}
          >
            {showBasePrompt ? <EyeOff style={{ width: 12, height: 12 }} /> : <Eye style={{ width: 12, height: 12 }} />}
            <span>{showBasePrompt ? t("promptEditor.hideBasePrompt", "Hide AI instructions") : t("promptEditor.showBasePrompt", "Show AI instructions")}</span>
          </button>
          {showBasePrompt && (
            <div
              style={{
                padding: "10px 14px",
                fontSize: 12,
                fontFamily: "system-ui, sans-serif",
                color: v.textSecondary,
                background: `color-mix(in srgb, ${v.accent} 5%, ${v.bg})`,
                border: `1px solid color-mix(in srgb, ${v.accent} 15%, ${v.border})`,
                borderRadius: 10,
                marginBottom: 8,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
              data-testid={`${testIdPrefix}-base-prompt`}
            >
              {basePrompt}
            </div>
          )}
          <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 4, fontFamily: "system-ui, sans-serif", paddingLeft: 4 }}>
            {t("promptEditor.customLabel", "Your additions")}:
          </label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            placeholder={t(placeholderKey, placeholderFallback)}
            rows={2}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: 14,
              fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
              color: v.text,
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 10,
              resize: "vertical",
              outline: "none",
              lineHeight: 1.5,
              transition: "border-color 0.2s ease",
              boxSizing: "border-box",
              marginTop: 0,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = v.accent; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = v.border; }}
            data-testid={`${testIdPrefix}-custom-input`}
          />
          <div style={{ textAlign: "right", fontSize: 11, color: v.muted, marginTop: 4, fontFamily: "system-ui, sans-serif" }}>
            {value.length}/{maxLength}
          </div>
        </div>
      </div>
    </div>
  );
}
