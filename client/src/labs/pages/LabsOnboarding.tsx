import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  trackSignupView,
  trackSignupFieldFocus,
  trackSignupFieldBlurEmpty,
  trackSignupValidationError,
  trackSignupSubmitAttempt,
} from "@/lib/funnelTracker";

const ACCENT_GOLD = "rgba(201,151,43,1)";
const ACCENT_GOLD_DIM = "rgba(201,151,43,0.6)";

function GlencairnSolo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={ACCENT_GOLD} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 7h10l.3 3.5c.3 2.5.5 4.8.1 6.5-.6 2.5-2.2 4-3.5 5L16 23.2 14.1 22c-1.3-1-2.9-2.5-3.5-5-.4-1.7-.2-4 .1-6.5Z" />
      <line x1="13" y1="23.2" x2="19" y2="23.2" />
      <line x1="12" y1="26" x2="20" y2="26" />
      <line x1="16" y1="23.2" x2="16" y2="26" />
    </svg>
  );
}

function GlencairnTriple({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 32" fill="none" stroke={ACCENT_GOLD} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(0,2) scale(0.7)">
        <path d="M11 7h10l.3 3.5c.3 2.5.5 4.8.1 6.5-.6 2.5-2.2 4-3.5 5L16 23.2 14.1 22c-1.3-1-2.9-2.5-3.5-5-.4-1.7-.2-4 .1-6.5Z" />
        <line x1="13" y1="23.2" x2="19" y2="23.2" />
        <line x1="12" y1="26" x2="20" y2="26" />
        <line x1="16" y1="23.2" x2="16" y2="26" />
      </g>
      <g transform="translate(12,0) scale(0.7)">
        <path d="M11 7h10l.3 3.5c.3 2.5.5 4.8.1 6.5-.6 2.5-2.2 4-3.5 5L16 23.2 14.1 22c-1.3-1-2.9-2.5-3.5-5-.4-1.7-.2-4 .1-6.5Z" />
        <line x1="13" y1="23.2" x2="19" y2="23.2" />
        <line x1="12" y1="26" x2="20" y2="26" />
        <line x1="16" y1="23.2" x2="16" y2="26" />
      </g>
      <g transform="translate(24,2) scale(0.7)">
        <path d="M11 7h10l.3 3.5c.3 2.5.5 4.8.1 6.5-.6 2.5-2.2 4-3.5 5L16 23.2 14.1 22c-1.3-1-2.9-2.5-3.5-5-.4-1.7-.2-4 .1-6.5Z" />
        <line x1="13" y1="23.2" x2="19" y2="23.2" />
        <line x1="12" y1="26" x2="20" y2="26" />
        <line x1="16" y1="23.2" x2="16" y2="26" />
      </g>
    </svg>
  );
}

function BottleSharingIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={ACCENT_GOLD} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 6h4v2l1 3v6c0 1.5-.8 2.5-1.5 3L12 21.5 10.5 20C9.8 19.5 9 18.5 9 17V12l1-3V6Z" />
      <line x1="10.5" y1="21.5" x2="13.5" y2="21.5" />
      <line x1="10" y1="24" x2="14" y2="24" />
      <line x1="12" y1="21.5" x2="12" y2="24" />
      <path d="M18 6h4v2l1 3v6c0 1.5-.8 2.5-1.5 3L20 21.5 18.5 20c-.7-.5-1.5-1.5-1.5-3V12l1-3V6Z" />
      <line x1="18.5" y1="21.5" x2="21.5" y2="21.5" />
      <line x1="18" y1="24" x2="22" y2="24" />
      <line x1="20" y1="21.5" x2="20" y2="24" />
      <path d="M14 13l4-2" strokeDasharray="2 1.5" />
      <path d="M14 16l4-2" strokeDasharray="2 1.5" />
    </svg>
  );
}

function TicketIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={ACCENT_GOLD} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="24" height="16" rx="3" />
      <line x1="12" y1="8" x2="12" y2="24" strokeDasharray="2 2" />
      <rect x="17" y="12" width="7" height="7" rx="1" />
      <line x1="19" y1="14" x2="22" y2="14" />
      <line x1="19" y1="16" x2="22" y2="16" />
      <rect x="19" y="12" width="1.5" height="1.5" />
      <rect x="22" y="12" width="1.5" height="1.5" />
      <rect x="19" y="15.5" width="1.5" height="1.5" />
    </svg>
  );
}

const easing = "cubic-bezier(0.16,1,0.3,1)";

interface CardData {
  icon: React.ReactNode;
  titleKey: string;
  subtitleKey: string;
  testId: string;
  action: "navigate" | "join";
  href?: string;
}

const ONBOARDING_SEEN_KEY = "casksense_onboarding_seen";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hasSeenOnboardingToday(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === getToday();
  } catch {
    return false;
  }
}

function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_SEEN_KEY, getToday());
  } catch {}
}

export default function LabsOnboarding() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeFocusedOnce, setCodeFocusedOnce] = useState(false);

  const [alreadySeen] = useState(() => hasSeenOnboardingToday());

  const completeOnboarding = useCallback((dest: string) => {
    navigate(dest);
  }, [navigate]);

  const handleJoin = useCallback(() => {
    const trimmed = code.trim().toUpperCase();
    trackSignupSubmitAttempt("labs-onboarding-join");
    if (!trimmed) {
      trackSignupValidationError("code", "empty");
      return;
    }
    if (trimmed.length < 3) {
      trackSignupValidationError("code", "too_short");
      return;
    }
    completeOnboarding(`/labs/join/${trimmed}`);
  }, [code, completeOnboarding]);

  useEffect(() => {
    if (alreadySeen) {
      navigate("/labs/tastings", { replace: true });
    } else {
      markOnboardingSeen();
      trackSignupView("labs-onboarding");
    }
  }, [alreadySeen, navigate]);

  if (alreadySeen) {
    return null;
  }

  const cards: CardData[] = [
    {
      icon: <GlencairnSolo size={32} />,
      titleKey: "onboarding.solo.title",
      subtitleKey: "onboarding.solo.subtitle",
      testId: "card-onboard-solo",
      action: "navigate",
      href: "/labs/solo",
    },
    {
      icon: <GlencairnTriple size={32} />,
      titleKey: "onboarding.host.title",
      subtitleKey: "onboarding.host.subtitle",
      testId: "card-onboard-host",
      action: "navigate",
      href: "/labs/host",
    },
    {
      icon: <BottleSharingIcon size={32} />,
      titleKey: "onboarding.bottleSharing.title",
      subtitleKey: "onboarding.bottleSharing.subtitle",
      testId: "card-onboard-bottle-sharing",
      action: "navigate",
      href: "/labs/bottle-sharing",
    },
    {
      icon: <TicketIcon size={32} />,
      titleKey: "onboarding.join.title",
      subtitleKey: "onboarding.join.subtitle",
      testId: "card-onboard-join",
      action: "join",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px 32px",
        background: "#1a1714",
        color: "#f5f0e8",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .onboard-anim { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
        }
        @keyframes onboardFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes onboardFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div
        className="onboard-anim"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 40,
          animation: `onboardFade 0.6s ${easing} both`,
          animationDelay: "0s",
        }}
      >
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: ACCENT_GOLD,
          boxShadow: `0 0 8px ${ACCENT_GOLD_DIM}`,
        }} />
        <span style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: "-0.02em",
        }}>
          CaskSense
        </span>
      </div>

      <h1
        className="onboard-anim"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 36,
          fontWeight: 400,
          fontStyle: "italic",
          textAlign: "center",
          marginBottom: 40,
          lineHeight: 1.2,
          animation: `onboardFadeUp 0.6s ${easing} both`,
          animationDelay: "0.15s",
        }}
        data-testid="text-onboarding-title"
      >
        {t("onboarding.title")}
      </h1>

      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
        {cards.map((card, i) => (
          <div
            key={card.testId}
            className="onboard-anim"
            style={{
              animation: `onboardFadeUp 0.6s ${easing} both`,
              animationDelay: `${0.25 + i * 0.1}s`,
            }}
          >
            <div
              role="button"
              tabIndex={0}
              data-testid={card.testId}
              onClick={() => {
                if (card.action === "navigate" && card.href) {
                  completeOnboarding(card.href);
                } else {
                  setJoinOpen(!joinOpen);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (card.action === "navigate" && card.href) {
                    completeOnboarding(card.href);
                  } else {
                    setJoinOpen(!joinOpen);
                  }
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "20px 24px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(201,151,43,0.18)",
                cursor: "pointer",
                transition: `all 0.3s ${easing}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(201,151,43,0.4)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(201,151,43,0.18)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ flexShrink: 0, width: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {card.icon}
              </div>
              <div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 3,
                  color: "#f5f0e8",
                }}>
                  {t(card.titleKey)}
                </div>
                <div style={{
                  fontSize: 13,
                  color: "rgba(138,126,109,1)",
                  lineHeight: 1.4,
                }}>
                  {t(card.subtitleKey)}
                </div>
              </div>
            </div>

            {card.action === "join" && joinOpen && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  borderRadius: 50,
                  border: "1.5px solid rgba(74,64,56,1)",
                  overflow: "hidden",
                  background: "rgba(201,151,43,0.04)",
                  maxWidth: 300,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onFocus={() => {
                    if (!codeFocusedOnce) {
                      setCodeFocusedOnce(true);
                      trackSignupFieldFocus("code");
                    }
                  }}
                  onBlur={() => {
                    if (!code.trim()) trackSignupFieldBlurEmpty("code");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="CODE"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: "11px 18px",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: "0.12em",
                    color: "#f5f0e8",
                    textTransform: "uppercase",
                  }}
                  data-testid="input-onboard-code"
                />
                <button
                  onClick={handleJoin}
                  disabled={!code.trim()}
                  style={{
                    padding: "11px 20px",
                    border: "none",
                    borderLeft: "1px solid rgba(74,64,56,1)",
                    background: code.trim() ? ACCENT_GOLD : "transparent",
                    color: code.trim() ? "#1a1714" : "rgba(138,126,109,1)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: code.trim() ? "pointer" : "default",
                    transition: "all 0.2s",
                  }}
                  data-testid="button-onboard-join"
                >
                  {t("onboarding.join.go")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="onboard-anim"
        style={{
          marginTop: 48,
          fontSize: 13,
          color: "rgba(138,126,109,0.7)",
          textAlign: "center",
          animation: `onboardFadeUp 0.6s ${easing} both`,
          animationDelay: "0.6s",
        }}
      >
        <span>{t("onboarding.signIn.label")} </span>
        <a
          href="/labs/tastings"
          onClick={(e) => {
            e.preventDefault();
            completeOnboarding("/labs/tastings");
          }}
          style={{ color: ACCENT_GOLD_DIM, textDecoration: "underline", textUnderlineOffset: 3 }}
          data-testid="link-onboard-signin"
        >
          {t("onboarding.signIn.link")}
        </a>
      </div>
    </div>
  );
}
