import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { AuthFlowPanel, type AuthInitialTab } from "@/components/auth-flow-panel";
import { useAppStore } from "@/lib/store";
import { getSession } from "@/lib/session";

interface AuthPageProps {
  initialTab: AuthInitialTab;
}

export default function AuthPage({ initialTab }: AuthPageProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const isSignIn = initialTab === "signin";

  const session = getSession();
  const alreadySignedIn = session.signedIn || !!currentParticipant;

  useEffect(() => {
    const baseTitle = "CaskSense";
    const pageTitle = isSignIn
      ? t("auth.signInPageTitle", "Anmelden bei CaskSense")
      : t("auth.registerPageTitle", "Konto erstellen");
    const description = isSignIn
      ? t("auth.signInPageDesc", "Melde dich mit deiner E-Mail und deinem Passwort an.")
      : t("auth.registerPageDesc", "Erstelle dein CaskSense-Konto in wenigen Sekunden.");

    document.title = `${pageTitle} · ${baseTitle}`;

    const setMeta = (selector: string, attr: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [key, val] = attr.split("=");
        if (key && val) el.setAttribute(key, val.replace(/"/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const prevDesc = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.getAttribute("content");
    setMeta('meta[name="description"]', 'name="description"', description);
    const prevOgT = document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.getAttribute("content");
    const prevOgD = document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.getAttribute("content");
    setMeta('meta[property="og:title"]', 'property="og:title"', `${pageTitle} · ${baseTitle}`);
    setMeta('meta[property="og:description"]', 'property="og:description"', description);
    const prevTwT = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.getAttribute("content");
    const prevTwD = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.getAttribute("content");
    setMeta('meta[name="twitter:title"]', 'name="twitter:title"', `${pageTitle} · ${baseTitle}`);
    setMeta('meta[name="twitter:description"]', 'name="twitter:description"', description);

    return () => {
      document.title = baseTitle;
      if (prevDesc) setMeta('meta[name="description"]', 'name="description"', prevDesc);
      if (prevOgT) setMeta('meta[property="og:title"]', 'property="og:title"', prevOgT);
      if (prevOgD) setMeta('meta[property="og:description"]', 'property="og:description"', prevOgD);
      if (prevTwT) setMeta('meta[name="twitter:title"]', 'name="twitter:title"', prevTwT);
      if (prevTwD) setMeta('meta[name="twitter:description"]', 'name="twitter:description"', prevTwD);
    };
  }, [isSignIn, t]);

  const handleSuccess = (returnTo: string | null) => {
    if (returnTo && returnTo.startsWith("/labs/")) {
      navigate(returnTo);
    } else {
      navigate("/labs/tastings");
    }
  };

  if (alreadySignedIn) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center space-y-6 p-8 rounded-2xl border border-border bg-card">
          <h1 className="font-serif text-2xl text-primary" data-testid="text-already-signed-in">
            {t("auth.alreadySignedIn", "Du bist bereits angemeldet.")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.name || currentParticipant?.name}
          </p>
          <button
            type="button"
            onClick={() => navigate("/labs/tastings")}
            className="inline-flex items-center justify-center w-full rounded-md bg-primary text-primary-foreground font-serif tracking-wide px-4 py-2.5 hover:bg-primary/90 transition-colors"
            data-testid="button-to-app"
          >
            {t("auth.toApp", "Zur App")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md mb-4 self-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          data-testid="link-back-home"
        >
          <ChevronLeft className="w-3 h-3" />
          CaskSense
        </Link>
      </div>
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-border bg-card space-y-4">
        <AuthFlowPanel
          dialogMode={false}
          initialTab={initialTab}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
