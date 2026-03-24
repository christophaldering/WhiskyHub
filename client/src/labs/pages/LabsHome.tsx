import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Share2 } from "lucide-react";
import BackLink from "@/labs/components/BackLink";
import { JoinIcon, GlassIcon, HostIcon } from "@/labs/components/FlavourIcons";
import { tastingHistoryApi } from "@/lib/api";
import { useEffect, useMemo } from "react";
import i18n from "i18next";

function getTimeGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "hub.timeGreetingMorning";
  if (h < 18) return "hub.timeGreetingAfternoon";
  return "hub.timeGreetingEvening";
}

function HubPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();

  const { data: historyData } = useQuery({
    queryKey: ["tasting-history", currentParticipant?.id],
    queryFn: () => tastingHistoryApi.get(currentParticipant!.id),
    enabled: !!currentParticipant?.id,
    staleTime: 60_000,
  });

  const recentDrams = useMemo(() => {
    if (!historyData?.tastings) return [];
    const items: { id: string; whiskyName: string; score: number; date: string }[] = [];
    for (const tasting of historyData.tastings) {
      if (!tasting.ratings) continue;
      for (const r of tasting.ratings) {
        items.push({
          id: `${tasting.id}-${r.whiskyId}`,
          whiskyName: r.whiskyName || "Unknown Whisky",
          score: r.normalizedScore ?? r.overall ?? 0,
          date: r.updatedAt || tasting.date || "",
        });
      }
    }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 5);
  }, [historyData]);

  const displayName = currentParticipant?.name?.trim() || t("hub.guest");
  const timeKey = getTimeGreetingKey();

  const actions = [
    {
      key: "join",
      icon: JoinIcon,
      label: t("hub.joinTasting"),
      sub: t("hub.joinSub"),
      href: "/labs/join",
      colorClass: "labs-hub-icon-join",
    },
    {
      key: "solo",
      icon: GlassIcon,
      label: t("hub.soloDram"),
      sub: t("hub.soloSub"),
      href: "/labs/solo",
      colorClass: "labs-hub-icon-solo",
    },
    {
      key: "host",
      icon: HostIcon,
      label: t("hub.hostTasting"),
      sub: t("hub.hostSub"),
      href: "/labs/host",
      colorClass: "labs-hub-icon-host",
    },
    {
      key: "bottle-sharing",
      icon: Share2,
      label: t("hub.bottleSharing"),
      sub: t("hub.bottleSharingSub"),
      href: "/labs/bottle-sharing",
      colorClass: "labs-hub-icon-solo",
    },
  ];

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-hub">
      <BackLink href="/labs/tastings" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-home">
          <ChevronLeft className="w-4 h-4" /> Tastings
        </button>
      </BackLink>
      <div className="labs-hub-greeting">
        <span className="labs-hub-greeting-time" data-testid="hub-time-greeting">
          {t(timeKey)}
        </span>
        <h1 className="labs-hub-greeting-name" data-testid="hub-greeting-name">
          {displayName}
        </h1>
        <p className="labs-hub-greeting-mood" data-testid="hub-mood-line">
          {t("hub.moodLine")}
        </p>
      </div>

      <div className="labs-hub-actions">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              className={`labs-hub-action-card labs-fade-in labs-stagger-${i + 1}`}
              onClick={() => navigate(a.href)}
              data-testid={`hub-action-${a.key}`}
            >
              <div className={`labs-hub-action-icon ${a.colorClass}`}>
                <Icon size={22} />
              </div>
              <div className="labs-hub-action-text">
                <span className="labs-hub-action-label">{a.label}</span>
                <span className="labs-hub-action-sub">{a.sub}</span>
              </div>
              <ChevronRight size={18} className="labs-hub-action-chevron" />
            </button>
          );
        })}
      </div>

      {currentParticipant && (
        <div className="labs-hub-recent labs-fade-in labs-stagger-4" data-testid="hub-recent-section">
          <span className="labs-section-label">{t("hub.recentlyRated")}</span>
          {recentDrams.length > 0 ? (
            <div className="labs-hub-dram-list">
              {recentDrams.map((d) => (
                <div key={d.id} className="labs-dram-item" data-testid={`dram-item-${d.id}`}>
                  <div className="labs-dram-info">
                    <span className="labs-dram-name">{d.whiskyName}</span>
                    <span className="labs-dram-date">
                      {d.date ? new Date(d.date).toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US") : ""}
                    </span>
                  </div>
                  <div className={`labs-dram-score${Math.round(d.score) >= 90 ? " labs-dram-score--high" : ""}`}>{Math.round(d.score)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="labs-hub-empty" data-testid="hub-no-drams">
              {t("hub.noDrams")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabsHome() {
  const { currentParticipant, openAuthDialog } = useAppStore();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!currentParticipant) {
      try {
        const returnTo = sessionStorage.getItem("returnTo");
        if (returnTo) {
          openAuthDialog("signin");
        }
      } catch {}
    }
  }, [currentParticipant, openAuthDialog]);

  if (currentParticipant) {
    return <HubPage />;
  }

  return (
    <div className="labs-home-container labs-fade-in">
      <div className="labs-home-header">
        <p className="ty-label labs-home-eyebrow" data-testid="labs-home-eyebrow">
          CaskSense
        </p>
        <h1 className="ty-h1 labs-home-title" data-testid="labs-home-title">
          {t('home.greeting')}
        </h1>
        <p className="ty-sub labs-home-tagline" data-testid="labs-home-tagline">
          {t('home.greetingSub')}
        </p>
      </div>

      <div className="labs-home-cards">
        <button
          className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-1"
          onClick={() => navigate('/labs/solo')}
          data-testid="labs-action-solo"
        >
          <div className="labs-home-action-icon">
            <GlassIcon size={20} />
          </div>
          <div className="labs-home-action-text">
            <div className="ty-ui">{t('home.solo')}</div>
            <div className="ty-caption labs-home-action-sub">
              {t('home.soloSub')}
            </div>
          </div>
        </button>

        <button
          className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-2"
          onClick={() => navigate('/labs/join')}
          data-testid="labs-action-join"
        >
          <div className="labs-home-action-icon">
            <JoinIcon size={20} />
          </div>
          <div className="labs-home-action-text">
            <div className="ty-ui">{t('home.join')}</div>
            <div className="ty-caption labs-home-action-sub">
              {t('home.joinSub')}
            </div>
          </div>
        </button>

        <button
          className="labs-card labs-card-interactive labs-home-action-card labs-fade-in labs-stagger-3"
          onClick={() => navigate('/labs/host')}
          data-testid="labs-action-host"
        >
          <div className="labs-home-action-icon">
            <HostIcon size={20} />
          </div>
          <div className="labs-home-action-text">
            <div className="ty-ui">{t('home.host')}</div>
            <div className="ty-caption labs-home-action-sub">
              {t('home.hostSub')}
            </div>
          </div>
        </button>
      </div>

      <p className="ty-caption labs-home-more labs-fade-in labs-stagger-4" data-testid="labs-home-more">
        {t('home.moreAppears')}
      </p>

      <div className="labs-home-divider labs-fade-in labs-stagger-5" />

      <div className="labs-home-stille labs-fade-in labs-stagger-6" data-testid="labs-home-stille">
        <p className="ty-caption labs-home-stille-title">
          Stille
        </p>
        <p className="ty-caption labs-home-stille-sub">
          {t('home.noAccount')}
        </p>
      </div>
    </div>
  );
}
