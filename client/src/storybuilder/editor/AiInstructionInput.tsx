import { useId } from "react";

export type AiInstructionPreset = {
  id: string;
  label: string;
};

export type AiLengthLevel = "compact" | "default" | "expanded" | "epic";

export type AiInstructionValue = {
  customInstructions: string;
  stylePresets: string[];
  lengthLevel: AiLengthLevel;
};

export const DEFAULT_PRESETS_DE: AiInstructionPreset[] = [
  { id: "factual", label: "Sachlich" },
  { id: "narrative", label: "Erzählerisch" },
  { id: "humorous", label: "Humorvoll" },
  { id: "expert", label: "Fachlich/Experten" },
  { id: "warm", label: "Persönlich/Warm" },
  { id: "short", label: "Knapp" },
];

export const DEFAULT_PRESETS_EN: AiInstructionPreset[] = [
  { id: "factual", label: "Factual" },
  { id: "narrative", label: "Narrative" },
  { id: "humorous", label: "Humorous" },
  { id: "expert", label: "Expert" },
  { id: "warm", label: "Personal/Warm" },
  { id: "short", label: "Concise" },
];

export type AiLengthOption = { id: AiLengthLevel; label: string };

export const LENGTH_OPTIONS_DE: AiLengthOption[] = [
  { id: "compact", label: "Kompakt" },
  { id: "default", label: "Standard" },
  { id: "expanded", label: "Ausführlich" },
  { id: "epic", label: "Episch" },
];

export const LENGTH_OPTIONS_EN: AiLengthOption[] = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Standard" },
  { id: "expanded", label: "Expanded" },
  { id: "epic", label: "Epic" },
];

type Props = {
  value: AiInstructionValue;
  onChange: (value: AiInstructionValue) => void;
  presets?: AiInstructionPreset[];
  lengthOptions?: AiLengthOption[];
  placeholder?: string;
  textareaLabel?: string;
  presetsLabel?: string;
  lengthLabel?: string;
  rows?: number;
  compact?: boolean;
  testIdPrefix?: string;
  showLengthSelector?: boolean;
};

export function AiInstructionInput({
  value,
  onChange,
  presets,
  lengthOptions,
  placeholder,
  textareaLabel,
  presetsLabel,
  lengthLabel,
  rows,
  compact,
  testIdPrefix = "ai-instruction",
  showLengthSelector = true,
}: Props) {
  const items = presets ?? DEFAULT_PRESETS_DE;
  const lengths = lengthOptions ?? LENGTH_OPTIONS_DE;
  const ph = placeholder ?? "z. B. Lockerer schreiben, Fokus auf Torf, Zitat einer Islay-Brennerei einbauen.";
  const taLabel = textareaLabel ?? "Zusätzliche Anweisungen (optional)";
  const psLabel = presetsLabel ?? "Stil-Presets";
  const lnLabel = lengthLabel ?? "Länge";
  const taId = useId();

  const togglePreset = (id: string) => {
    const has = value.stylePresets.includes(id);
    const next = has
      ? value.stylePresets.filter((p) => p !== id)
      : [...value.stylePresets, id];
    onChange({ ...value, stylePresets: next });
  };

  const setLength = (id: AiLengthLevel) => {
    onChange({ ...value, lengthLevel: id });
  };

  return (
    <div style={{ display: "grid", gap: compact ? 6 : 10 }} data-testid={`${testIdPrefix}-root`}>
      <div style={{ display: "grid", gap: 4 }}>
        <label
          htmlFor={taId}
          style={{
            fontSize: 10,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "#A89A85",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {taLabel}
        </label>
        <textarea
          id={taId}
          data-testid={`${testIdPrefix}-textarea`}
          value={value.customInstructions}
          onChange={(e) => onChange({ ...value, customInstructions: e.target.value })}
          placeholder={ph}
          rows={rows ?? (compact ? 2 : 3)}
          style={{
            width: "100%",
            background: "rgba(11,9,6,0.55)",
            border: "1px solid rgba(201,169,97,0.3)",
            borderRadius: 4,
            color: "#F5EDE0",
            padding: "8px 10px",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            lineHeight: 1.45,
            resize: "vertical",
            outline: "none",
          }}
        />
      </div>
      {showLengthSelector ? (
        <div style={{ display: "grid", gap: 4 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "#A89A85",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {lnLabel}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid={`${testIdPrefix}-lengths`}>
            {lengths.map((l) => {
              const active = value.lengthLevel === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLength(l.id)}
                  data-testid={`${testIdPrefix}-length-${l.id}`}
                  data-active={active ? "true" : "false"}
                  aria-pressed={active}
                  style={{
                    background: active ? "#C9A961" : "rgba(201,169,97,0.08)",
                    border: `1px solid ${active ? "#C9A961" : "rgba(201,169,97,0.3)"}`,
                    color: active ? "#0B0906" : "#F5EDE0",
                    borderRadius: 999,
                    padding: "4px 12px",
                    fontSize: 11,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    cursor: "pointer",
                    letterSpacing: ".05em",
                  }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 4 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "#A89A85",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {psLabel}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid={`${testIdPrefix}-presets`}>
          {items.map((p) => {
            const active = value.stylePresets.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePreset(p.id)}
                data-testid={`${testIdPrefix}-preset-${p.id}`}
                data-active={active ? "true" : "false"}
                aria-pressed={active}
                style={{
                  background: active ? "#C9A961" : "rgba(201,169,97,0.08)",
                  border: `1px solid ${active ? "#C9A961" : "rgba(201,169,97,0.3)"}`,
                  color: active ? "#0B0906" : "#F5EDE0",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontSize: 11,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: "pointer",
                  letterSpacing: ".05em",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
