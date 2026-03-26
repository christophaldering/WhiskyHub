import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { LogIn } from "lucide-react";

interface AuthGateMessageProps {
  message?: string;
  title?: string;
  bullets?: string[];
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export default function AuthGateMessage({ message, title, bullets, icon, className, compact }: AuthGateMessageProps) {
  const { t } = useTranslation();
  const { openAuthDialog } = useAppStore();

  return (
    <div className={className || "labs-empty labs-fade-in"} style={compact ? undefined : { minHeight: "40vh" }}>
      {icon && <div className="mb-4">{icon}</div>}
      {title && (
        <h2
          className="labs-serif"
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--labs-text)",
            marginBottom: 8,
          }}
          data-testid="text-auth-gate-title"
        >
          {title}
        </h2>
      )}
      {(message || !bullets?.length) && (
        <p className="text-sm mb-4" style={{ color: "var(--labs-text-secondary)" }}>
          {message || t("auth.signInRequired", "Sign in to access this feature")}
        </p>
      )}
      {bullets && bullets.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            textAlign: "left",
            maxWidth: 340,
          }}
          data-testid="list-auth-gate-bullets"
        >
          {bullets.map((bullet, i) => (
            <li
              key={i}
              style={{
                fontSize: 13,
                color: "var(--labs-text-muted)",
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span style={{ color: "var(--labs-accent)", flexShrink: 0 }}>•</span>
              {bullet}
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => openAuthDialog("signin")}
          className="labs-btn-primary flex items-center gap-2"
          style={{ padding: "10px 20px", fontSize: 14 }}
          data-testid="button-auth-gate-signin"
        >
          <LogIn className="w-4 h-4" />
          {t("m2.profile.signIn", "Sign In")}
        </button>
        <button
          onClick={() => openAuthDialog("register")}
          className="labs-btn-secondary flex items-center gap-2"
          style={{ padding: "10px 20px", fontSize: 14 }}
          data-testid="button-auth-gate-register"
        >
          {t("m2.profile.createAccount", "Register")}
        </button>
      </div>
    </div>
  );
}
