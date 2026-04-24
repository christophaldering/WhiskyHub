import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { ShieldAlert, ArrowLeft, Menu, X } from "lucide-react";
import { c } from "@/lib/theme";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: c.bg,
        color: c.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      data-testid="admin-layout"
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: c.card,
          borderBottom: `1px solid ${c.border}`,
          padding: "0 16px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        data-testid="admin-header"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ShieldAlert style={{ width: 22, height: 22, color: c.accent }} />
          <div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 17,
                fontWeight: 700,
                color: c.accent,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Admin
            </h1>
            <p
              style={{
                fontSize: 11,
                color: c.muted,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Backoffice
            </p>
          </div>
        </div>

        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: c.muted,
            textDecoration: "none",
          }}
          data-testid="link-admin-back-to-app"
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          {t("about.backToApp", "Back to App")}
        </Link>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 0 80px 0",
        }}
      >
        {children}
      </main>
    </div>
  );
}
