import { ReactNode } from "react";

interface CardV2Props {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  elevated?: boolean;
}

export default function CardV2({ children, onClick, className, elevated }: CardV2Props) {
  return (
    <div
      onClick={onClick}
      className={`transition-all duration-200 ${onClick ? "cursor-pointer" : ""} ${className ?? ""}`}
      style={{
        background: elevated ? "var(--v2-surface-elevated)" : "var(--v2-surface)",
        border: "1px solid var(--v2-border)",
        borderRadius: "var(--v2-radius)",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = "var(--v2-surface-hover)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = elevated ? "var(--v2-surface-elevated)" : "var(--v2-surface)";
        e.currentTarget.style.boxShadow = "none";
      }}
      data-testid="card-v2"
    >
      {children}
    </div>
  );
}
