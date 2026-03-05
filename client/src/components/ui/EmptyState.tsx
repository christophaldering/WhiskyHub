import type { ElementType, ReactNode } from "react";
import { Link } from "wouter";
import { v, alpha } from "@/lib/themeVars";

interface EmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  children,
}: EmptyStateProps) {
  const button = actionLabel ? (
    <button
      onClick={onAction}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 20px",
        borderRadius: 10,
        border: "none",
        background: v.accent,
        color: v.bg,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
      }}
      data-testid="empty-state-cta"
    >
      {actionLabel}
    </button>
  ) : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
      }}
      data-testid="empty-state"
    >
      {Icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: alpha(v.accent, "12"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Icon style={{ width: 28, height: 28, color: v.accent }} />
        </div>
      )}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: v.text,
          margin: "0 0 6px",
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px", maxWidth: 280, lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {actionLabel && actionHref ? (
        <Link href={actionHref}>{button}</Link>
      ) : (
        button
      )}
      {children}
    </div>
  );
}
