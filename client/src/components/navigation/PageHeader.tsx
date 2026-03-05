import type { ReactNode } from "react";
import BackButton from "./BackButton";
import { v } from "@/lib/themeVars";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backFallback?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  showBack = true,
  backFallback,
  actions,
  icon,
}: PageHeaderProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 15,
        background: v.bg,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        paddingTop: 8,
        paddingBottom: 12,
        marginBottom: 8,
      }}
      data-testid="page-header"
    >
      {showBack && <BackButton fallback={backFallback} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {icon}
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "'Playfair Display', Georgia, serif",
                color: v.accent,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
              data-testid="text-page-title"
            >
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 13, color: v.muted, marginTop: 3, lineHeight: 1.4 }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>
    </div>
  );
}
