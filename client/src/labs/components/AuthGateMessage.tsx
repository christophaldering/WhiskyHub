import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { LogIn } from "lucide-react";

interface AuthGateMessageProps {
  message?: string;
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export default function AuthGateMessage({ message, icon, className, compact }: AuthGateMessageProps) {
  const { t } = useTranslation();
  const { openAuthDialog } = useAppStore();

  return (
    <div className={className || "labs-empty labs-fade-in"} style={compact ? undefined : { minHeight: "40vh" }}>
      {icon && <div className="mb-4">{icon}</div>}
      <p className="text-sm mb-4" style={{ color: "var(--labs-text-secondary)" }}>
        {message || t("auth.signInRequired", "Sign in to access this feature")}
      </p>
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
