import { Search } from "lucide-react";

interface SearchBarV2Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBarV2({ value, onChange, placeholder }: SearchBarV2Props) {
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--v2-text-muted)" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search..."}
        className="w-full pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
        style={{
          background: "var(--v2-surface)",
          border: "1px solid var(--v2-border)",
          borderRadius: "var(--v2-radius-sm)",
          color: "var(--v2-text)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--v2-accent)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--v2-border)";
        }}
        data-testid="search-input"
      />
    </div>
  );
}
