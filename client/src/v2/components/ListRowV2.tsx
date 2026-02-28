import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface ListRowV2Props {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}

export default function ListRowV2({ icon: Icon, title, subtitle, trailing, onClick }: ListRowV2Props) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${onClick ? "cursor-pointer" : ""}`}
      style={{
        borderBottom: "1px solid var(--v2-border-subtle)",
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.background = "var(--v2-surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
      data-testid="list-row-v2"
    >
      {Icon && (
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: "var(--v2-accent-muted)", color: "var(--v2-accent)" }}
        >
          <Icon className="w-[18px] h-[18px]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "var(--v2-text)" }}>
          {title}
        </div>
        {subtitle && (
          <div className="text-xs truncate mt-0.5" style={{ color: "var(--v2-text-muted)" }}>
            {subtitle}
          </div>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
