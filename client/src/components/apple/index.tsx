import { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, Loader2 } from "lucide-react";
import { radius, space, shadow, typo } from "@/lib/theme";
import { v, alpha } from "@/lib/themeVars";
import { UI_SKIN } from "@/lib/config";

const isApple = UI_SKIN === "apple_dark_warm";

export function ApplePage({
  title,
  subtitle,
  rightSlot,
  children,
  center,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  center?: boolean;
}) {
  if (!isApple) {
    return <>{children}</>;
  }
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: space.lg }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: space.xs }}>
        <div style={{ textAlign: center ? "center" : undefined, flex: 1 }}>
          <h1 style={{ ...typo.pageTitle, margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ ...typo.pageSubtitle, margin: 0, marginTop: 6 }}>{subtitle}</p>}
        </div>
        {rightSlot && <div style={{ flexShrink: 0 }}>{rightSlot}</div>}
      </div>
      {children}
    </div>
  );
}

export function AppleSection({
  title,
  action,
  children,
  gap = space.sm,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  gap?: number;
}) {
  if (!isApple) {
    return <>{children}</>;
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.md }}>
        <span style={typo.sectionHeading}>{title}</span>
        {action}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>
    </div>
  );
}

export function AppleCard({
  children,
  onClick,
  href,
  padding,
  testId,
  style: extraStyle,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  padding?: string | number;
  testId?: string;
  style?: React.CSSProperties;
}) {
  const style: React.CSSProperties = {
    background: v.card,
    borderRadius: radius.lg,
    padding: padding ?? `${space.lg}px`,
    boxShadow: shadow.card,
    border: "1px solid " + alpha(v.border, "20"),
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    cursor: onClick || href ? "pointer" : undefined,
    ...extraStyle,
  };

  if (href) {
    return (
      <Link href={href}>
        <div style={style} data-testid={testId}>{children}</div>
      </Link>
    );
  }
  return (
    <div style={style} onClick={onClick} data-testid={testId}>{children}</div>
  );
}

export function AppleRow({
  icon: Icon,
  label,
  value,
  href,
  onClick,
  chevron = true,
  testId,
  badge,
  description,
}: {
  icon?: React.ElementType;
  label: string;
  value?: string | number | null;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  testId?: string;
  badge?: string | number | null;
  description?: string;
}) {
  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: space.md,
        padding: `${space.md}px ${space.lg - 4}px`,
        background: v.card,
        borderRadius: radius.md,
        boxShadow: shadow.subtle,
        border: "1px solid " + alpha(v.border, "15"),
        cursor: href || onClick ? "pointer" : undefined,
        transition: "background 0.15s",
      }}
      onClick={onClick}
      data-testid={testId}
    >
      {Icon && (
        <div style={{
          width: 36, height: 36, borderRadius: radius.sm,
          background: alpha(v.accent, "10"), display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon style={{ width: 18, height: 18, color: v.accent }} strokeWidth={1.8} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...typo.label }}>{label}</div>
        {description && <div style={{ ...typo.caption, marginTop: 2 }}>{description}</div>}
      </div>
      {value != null && (
        <span style={{ ...typo.caption, fontFamily: "monospace", color: v.accent, fontWeight: 600 }}>{value}</span>
      )}
      {badge != null && (
        <span style={{
          fontSize: 11, fontWeight: 600, color: v.accent,
          background: alpha(v.accent, "12"), padding: "3px 10px",
          borderRadius: radius.pill, flexShrink: 0,
        }}>{badge}</span>
      )}
      {(href || onClick) && chevron && (
        <ChevronRight style={{ width: 16, height: 16, color: alpha(v.muted, "60"), flexShrink: 0 }} strokeWidth={1.8} />
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function AppleButton({
  children,
  variant = "primary",
  onClick,
  disabled,
  loading,
  type,
  fullWidth = true,
  testId,
  style: extraStyle,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  fullWidth?: boolean;
  testId?: string;
  style?: React.CSSProperties;
}) {
  const isDisabled = disabled || loading;
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    width: fullWidth ? "100%" : undefined,
    padding: "13px 20px",
    fontSize: 15,
    fontWeight: 650,
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: radius.md,
    border: "none",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.5 : 1,
    transition: "all 0.15s ease",
    letterSpacing: "-0.01em",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { ...base, background: v.accent, color: v.bg },
    secondary: { ...base, background: "transparent", color: v.text, border: `1px solid ${v.border}` },
    ghost: { ...base, background: "transparent", color: v.accent, padding: "10px 16px" },
  };

  return (
    <button
      type={type || "button"}
      onClick={onClick}
      disabled={isDisabled}
      style={{ ...variants[variant], ...extraStyle }}
      data-testid={testId}
    >
      {loading && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
      {children}
    </button>
  );
}

export function AppleInput({
  value,
  onChange,
  placeholder,
  type = "text",
  testId,
  style: extraStyle,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  testId?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: v.inputBg,
        border: `1px solid ${v.inputBorder}`,
        borderRadius: radius.md,
        color: v.text,
        padding: "13px 16px",
        fontSize: 15,
        outline: "none",
        boxSizing: "border-box" as const,
        fontFamily: "system-ui, -apple-system, sans-serif",
        transition: "border-color 0.2s",
        ...extraStyle,
      }}
      data-testid={testId}
      {...props}
    />
  );
}

export function AppleEmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{
      textAlign: "center",
      padding: `${space.xxl}px ${space.lg}px`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: space.md,
    }}>
      {Icon && (
        <div style={{
          width: 52, height: 52, borderRadius: radius.lg,
          background: alpha(v.accent, "10"),
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ width: 24, height: 24, color: v.mutedLight }} strokeWidth={1.6} />
        </div>
      )}
      <div>
        <div style={{ ...typo.label, color: v.mutedLight }}>{title}</div>
        {hint && <div style={{ ...typo.caption, marginTop: space.xs }}>{hint}</div>}
      </div>
      {action}
    </div>
  );
}

export function AppleSkeleton({ lines = 3, height = 14 }: { lines?: number; height?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.sm, padding: space.lg }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            borderRadius: radius.sm,
            background: alpha(v.border, "60"),
            width: i === lines - 1 ? "60%" : "100%",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );
}

export function AppleActionCard({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  testId,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  testId?: string;
}) {
  const content = (
    <div
      style={{
        background: v.card,
        border: "1px solid " + alpha(v.border, "20"),
        borderRadius: radius.xl,
        padding: `${space.xl}px ${space.lg}px`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: space.md,
        textAlign: "center",
        boxShadow: shadow.card,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onClick={onClick}
      data-testid={testId}
    >
      <div style={{
        width: 52, height: 52, borderRadius: radius.lg,
        background: alpha(v.accent, "12"),
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon style={{ width: 26, height: 26, color: v.accent }} strokeWidth={1.6} />
      </div>
      <div>
        <div style={{
          fontSize: 17, fontWeight: 700, color: v.text,
          fontFamily: "'Playfair Display', serif", letterSpacing: "-0.01em",
        }}>{title}</div>
        {description && (
          <div style={{ ...typo.caption, marginTop: space.xs }}>{description}</div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
