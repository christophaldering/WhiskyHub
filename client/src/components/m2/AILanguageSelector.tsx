import { v, alpha } from "@/lib/themeVars";
import { useTranslation } from "react-i18next";

interface AILanguageSelectorProps {
  value: "de" | "en";
  onChange: (lang: "de" | "en") => void;
  compact?: boolean;
}

export default function AILanguageSelector({ value, onChange, compact }: AILanguageSelectorProps) {
  const { t } = useTranslation();
  const options: { key: "de" | "en"; label: string }[] = [
    { key: "de", label: "Deutsch" },
    { key: "en", label: "English" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 6 : 10,
        ...(compact ? {} : { marginBottom: 12 }),
      }}
      data-testid="ai-language-selector"
    >
      {!compact && (
        <span
          style={{
            fontSize: 12,
            color: v.muted,
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {t("m2.ai.reportLanguage", "Report language")}:
        </span>
      )}
      <div style={{ display: "flex", gap: 4 }}>
        {options.map(({ key, label }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              style={{
                padding: compact ? "4px 10px" : "5px 14px",
                borderRadius: 8,
                border: active ? `1.5px solid ${v.accent}` : `1px solid ${v.border}`,
                background: active ? alpha(v.accent, "15") : "transparent",
                color: active ? v.accent : v.muted,
                fontSize: compact ? 11 : 12,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
                transition: "all 0.15s ease",
              }}
              data-testid={`button-ai-lang-${key}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
