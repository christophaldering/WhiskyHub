import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { participantApi, journalApi, statsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";
import { GitCompareArrows, BarChart3, BookOpen, ChevronRight, Lock, Radar, Archive, Heart, FlaskConical, ClipboardList, Sparkles, Wine, Download, PenLine, Library, Building2, Package, Map, Users, Trophy, Activity, Info, HandHeart } from "lucide-react";
import { c, cardStyle, inputStyle, sectionHeadingStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";
import { v, alpha } from "@/lib/themeVars";
import { NAV_VERSION, MY_TASTE_STRUCTURE, UI_SKIN } from "@/lib/config";
import { ApplePage, AppleSection, AppleRow, AppleButton, AppleCard } from "@/components/apple";

const LS_KEY = "casksense_participant_id";
const isApple = UI_SKIN === "apple_dark_warm";
const isTwoTab = NAV_VERSION === "v2_two_tab";

function StatRow({ label, value }: { label: string; value: number | null | undefined }) {
  const display = value != null ? value.toFixed(1) : "—";
  const hasValue = value != null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: v.text }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: "monospace", color: hasValue ? v.accent : v.muted, fontWeight: hasValue ? 600 : 400 }}>{display}</span>
    </div>
  );
}

function UnlockCard({ onUnlock }: { onUnlock: (p: { id: string; name: string; role?: string }) => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await participantApi.loginByEmail(email.trim(), pin.trim());
      if (result?.id) {
        localStorage.setItem(LS_KEY, result.id);
        onUnlock({ id: result.id, name: result.name, role: result.role });
      } else {
        setError(t("myTastePage.errorUnexpected"));
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid p") || msg.includes("Invalid P") || msg.includes("Wrong")) {
        setError(t("myTastePage.errorWrongPassword"));
      } else if (msg.includes("not found") || msg.includes("No account")) {
        setError(t("myTastePage.errorNoAccount"));
      } else {
        setError(msg || t("myTastePage.errorSignIn"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle} data-testid="card-unlock">
      <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 6px" }}>
        {t("myTastePage.signIn")}
      </h2>
      <p style={{ fontSize: 12, color: v.mutedLight, margin: "0 0 14px" }}>
        {t("myTastePage.signInDesc")}
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }} autoComplete="off">
        <input type="text" name="cs_trap_user" autoComplete="username" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
        <input type="password" name="cs_trap_pw" autoComplete="current-password" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
        <input type="email" placeholder={t("myTastePage.emailPlaceholder")} name="cs_email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} data-testid="input-unlock-email" autoComplete="off" autoCapitalize="none" spellCheck={false} data-form-type="other" />
        <input type="password" placeholder={t("myTastePage.passwordPlaceholder")} name="cs_password" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-unlock-pin" autoComplete="new-password" autoCapitalize="none" spellCheck={false} data-form-type="other" />
        <button
          type="submit"
          disabled={loading || !email.trim() || !pin.trim()}
          data-testid="button-unlock"
          style={{
            width: "100%", padding: "10px", fontSize: 15, fontWeight: 600,
            background: loading ? v.border : v.accent, color: v.bg, border: "none", borderRadius: 8,
            cursor: loading ? "wait" : "pointer", opacity: (!email.trim() || !pin.trim()) ? 0.5 : 1, transition: "opacity 0.2s",
          }}
        >
          {loading ? "…" : t("myTastePage.signInButton")}
        </button>
        {error && <p style={{ fontSize: 12, color: v.error, margin: 0, textAlign: "center" }} data-testid="text-unlock-error">{error}</p>}
      </form>
    </div>
  );
}

const ANALYTICS_THRESHOLD = 10;

function AnalyticsPreviewCard({ pid, stats }: { pid: string | undefined; stats: any }) {
  const { t } = useTranslation();
  const totalRatings = stats?.totalRatings ?? stats?.ratingCount ?? 0;
  const totalJournal = stats?.totalJournalEntries ?? 0;
  const whiskyCount = totalRatings + totalJournal;
  const isLocked = whiskyCount < ANALYTICS_THRESHOLD;
  const avgOverall = stats?.avgOverall ?? stats?.averageOverall ?? null;

  return (
    <Link href="/my-taste/analytics">
      <div style={{ ...cardStyle, padding: "16px 20px", cursor: "pointer", opacity: isLocked ? 0.85 : 1 }} data-testid="card-analytics">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: alpha(v.accent, "15"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isLocked ? <Lock style={{ width: 16, height: 16, color: v.mutedLight }} /> : <BarChart3 style={{ width: 18, height: 18, color: v.accent }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: isLocked ? v.mutedLight : v.text }}>{t("myTastePage.myAnalytics")}</div>
            <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>
              {isLocked ? t("myTastePage.analyticsLocked", { count: whiskyCount, threshold: ANALYTICS_THRESHOLD }) : t("myTastePage.analyticsUnlocked")}
            </div>
          </div>
          {isLocked && (
            <div style={{ height: 4, width: 40, background: v.bg, borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${(whiskyCount / ANALYTICS_THRESHOLD) * 100}%`, background: v.accent, borderRadius: 2 }} />
            </div>
          )}
          {!isLocked && <ChevronRight style={{ width: 14, height: 14, color: v.muted, flexShrink: 0 }} />}
        </div>
      </div>
    </Link>
  );
}

interface NavCardProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
  badge?: string | number | null;
}

function NavCard({ icon: Icon, label, description, href, testId, badge }: NavCardProps) {
  return (
    <Link href={href}>
      <div
        style={{
          ...cardStyle,
          padding: "14px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 14,
          transition: "all 0.2s ease",
        }}
        data-testid={testId}
      >
        <div style={{ width: 38, height: 38, borderRadius: 12, background: alpha(v.accent, "12"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 18, height: 18, color: v.accent }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: v.text, letterSpacing: "-0.01em" }}>{label}</div>
          <div style={{ fontSize: 12, color: v.muted, marginTop: 3, lineHeight: 1.4 }}>{description}</div>
        </div>
        {badge != null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: v.accent, background: alpha(v.accent, "12"), padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>{badge}</span>
        )}
        <ChevronRight style={{ width: 16, height: 16, color: alpha(v.muted, "80"), flexShrink: 0 }} strokeWidth={1.8} />
      </div>
    </Link>
  );
}

export default function MyTastePage() {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  const { data: participant } = useQuery({
    queryKey: ["participant-detail", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const { data: insightData } = useQuery({
    queryKey: ["participant-insights", pid],
    queryFn: () => fetch(`/api/participants/${pid}/insights`, { headers: { "x-participant-id": pid! } }).then((r) => r.json()),
    enabled: !!pid,
  });

  const { data: journalEntries } = useQuery({
    queryKey: ["journal-entries", pid],
    queryFn: () => journalApi.getAll(pid!),
    enabled: !!pid,
  });

  const { data: stats } = useQuery({
    queryKey: ["participant-stats", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
  });

  const stability = participant?.ratingStabilityScore ?? null;
  const exploration = participant?.explorationIndex ?? null;
  const smoke = participant?.smokeAffinityIndex ?? null;
  const hasStats = stability != null || exploration != null || smoke != null;
  const insight = insightData?.insight ?? null;
  const journalCount = Array.isArray(journalEntries) ? journalEntries.length : 0;
  const tastingCount = stats?.totalTastings ?? stats?.tastingCount ?? null;

  const handleUnlock = (p: { id: string; name: string; role?: string }) => {
    setParticipant(p);
  };

  const isV2 = MY_TASTE_STRUCTURE === "v2_experience_first";

  if (isApple) {
    return (
      <SimpleShell>
        <ApplePage title={t("myTastePage.title")} subtitle={t("myTastePage.subtitle")} center>

          {pid && isV2 && (
            <>
              <AppleSection title={t("myTastePage.sectionDrams")}>
                <p style={{ fontSize: 13, color: v.text, marginTop: -8, marginBottom: 4, lineHeight: 1.5 }}>
                  {t("myTastePage.dramsSubtitle")}
                </p>
                <p style={{ fontSize: 11, color: v.muted, margin: "0 0 12px", lineHeight: 1.5, fontStyle: "italic" }}>
                  {t("myTastePage.dramsExplainer")}
                </p>
                <NavCard
                  icon={BookOpen}
                  label={t("myTastePage.journal")}
                  description={t("myTastePage.journalDesc")}
                  href="/my-taste/drams?from=/my-taste"
                  testId="link-drams"
                  badge={journalCount > 0 ? journalCount : null}
                />
                <NavCard
                  icon={ClipboardList}
                  label={t("myTastePage.myTastings")}
                  description={t("myTastePage.myTastingsDesc")}
                  href="/sessions"
                  testId="link-my-tastings"
                  badge={tastingCount != null && tastingCount > 0 ? tastingCount : null}
                />
              </AppleSection>

              <div style={cardStyle} data-testid="card-taste-snapshot">
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 12px" }}>
                  {t("myTastePage.tasteSnapshot")}
                </h2>
                {hasStats ? (
                  <div>
                    <StatRow label={t("myTastePage.stability")} value={stability} />
                    <StatRow label={t("myTastePage.exploration")} value={exploration} />
                    <StatRow label={t("myTastePage.smokeAffinity")} value={smoke} />
                    {tastingCount != null && <StatRow label={t("myTastePage.tastings")} value={tastingCount} />}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: v.muted, margin: 0 }} data-testid="text-snapshot-empty">{t("myTastePage.snapshotEmpty")}</p>
                )}
              </div>

              {insight && (
                <div style={cardStyle} data-testid="card-taste-insight">
                  <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 12px" }}>
                    {t("myTastePage.tasteInsight")}
                  </h2>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: v.text, margin: 0 }} data-testid="text-insight-message">{insight.message}</p>
                </div>
              )}

              <AppleSection title={t("myTastePage.sectionAnalyse")}>
                <NavCard
                  icon={Radar}
                  label={t("myTastePage.flavorProfile")}
                  description={t("myTastePage.flavorProfileDesc")}
                  href="/my-taste/profile?from=/my-taste"
                  testId="link-flavor-profile"
                />
                <AnalyticsPreviewCard pid={pid} stats={stats} />
                <NavCard
                  icon={GitCompareArrows}
                  label={t("myTastePage.comparison")}
                  description={t("myTastePage.comparisonDesc")}
                  href="/my-taste/compare?from=/my-taste"
                  testId="link-comparison"
                />
                <NavCard
                  icon={Sparkles}
                  label={t("myTastePage.recommendations")}
                  description={t("myTastePage.recommendationsDesc")}
                  href="/my-taste/recommendations?from=/my-taste"
                  testId="link-recommendations"
                />
                <NavCard
                  icon={FlaskConical}
                  label={t("myTastePage.benchmarkAnalyzer")}
                  description={t("myTastePage.benchmarkDesc")}
                  href="/my-taste/benchmark?from=/my-taste"
                  testId="link-benchmark"
                />
              </AppleSection>

              {isTwoTab && (
                <>
                  <AppleSection title={t("myTastePage.sectionKnowledge")}>
                    <NavCard
                      icon={Library}
                      label={t("myTastePage.lexicon")}
                      description={t("myTastePage.lexiconDesc")}
                      href="/discover/lexicon"
                      testId="link-knowledge-lexicon"
                    />
                    <NavCard
                      icon={Building2}
                      label={t("myTastePage.distilleries")}
                      description={t("myTastePage.distilleriesDesc")}
                      href="/discover/distilleries"
                      testId="link-knowledge-distilleries"
                    />
                    <NavCard
                      icon={Package}
                      label={t("myTastePage.independentBottlers")}
                      description={t("myTastePage.independentBottlersDesc")}
                      href="/discover/bottlers"
                      testId="link-knowledge-bottlers"
                    />
                    <NavCard
                      icon={Map}
                      label={t("myTastePage.tastingGuide")}
                      description={t("myTastePage.tastingGuideDesc")}
                      href="/discover/guide"
                      testId="link-knowledge-guide"
                    />
                    <NavCard
                      icon={FlaskConical}
                      label={t("myTastePage.rabbitHole")}
                      description={t("myTastePage.rabbitHoleDesc")}
                      href="/discover/rabbit-hole"
                      testId="link-knowledge-rabbit-hole"
                    />
                  </AppleSection>

                  <AppleSection title={t("myTastePage.sectionCollection")}>
                    <p style={{ fontSize: 13, color: v.text, marginTop: -8, marginBottom: 4, lineHeight: 1.5 }}>
                      {t("myTastePage.collectionSubtitle")}
                    </p>
                    <p style={{ fontSize: 11, color: v.muted, margin: "0 0 12px", lineHeight: 1.5, fontStyle: "italic" }}>
                      {t("myTastePage.collectionExplainer")}
                    </p>
                    <NavCard
                      icon={Archive}
                      label={t("myTastePage.myCollection")}
                      description={t("myTastePage.collectionDesc")}
                      href="/my-taste/collection?from=/my-taste"
                      testId="link-collection"
                    />
                    <NavCard
                      icon={Heart}
                      label={t("myTastePage.wishlist")}
                      description={t("myTastePage.wishlistDesc")}
                      href="/my-taste/wishlist?from=/my-taste"
                      testId="link-wishlist"
                    />
                  </AppleSection>

                  <AppleSection title={t("myTastePage.sectionDownloads")}>
                    <NavCard
                      icon={Download}
                      label={t("downloads.title")}
                      description={t("myTastePage.downloadsDesc")}
                      href="/my-taste/downloads?from=/my-taste"
                      testId="link-downloads-export"
                    />
                  </AppleSection>

                  <AppleSection title={t("myTastePage.sectionCommunity")}>
                    <NavCard
                      icon={Users}
                      label={t("myTastePage.tasteTwins")}
                      description={t("myTastePage.tasteTwinsDesc")}
                      href="/discover/community?tab=twins"
                      testId="link-community-twins"
                    />
                    <NavCard
                      icon={Trophy}
                      label={t("myTastePage.communityRankings")}
                      description={t("myTastePage.communityRankingsDesc")}
                      href="/discover/community?tab=rankings"
                      testId="link-community-rankings"
                    />
                    <NavCard
                      icon={Activity}
                      label={t("myTastePage.activityFeed")}
                      description={t("myTastePage.activityFeedDesc")}
                      href="/discover/activity"
                      testId="link-community-activity"
                    />
                  </AppleSection>

                  <AppleSection title={t("myTastePage.sectionAbout")}>
                    <NavCard
                      icon={Info}
                      label={t("myTastePage.about")}
                      description={t("myTastePage.aboutDesc")}
                      href="/discover/about"
                      testId="link-about"
                    />
                    <NavCard
                      icon={HandHeart}
                      label={t("myTastePage.donate")}
                      description={t("myTastePage.donateDesc")}
                      href="/discover/donate"
                      testId="link-donate"
                    />
                  </AppleSection>
                </>
              )}
            </>
          )}

          {pid && !isV2 && (
            <>
              {NAV_VERSION === "v2_simplified" && (
                <Link href="/log-simple">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "14px 20px",
                      background: v.accent,
                      color: v.bg,
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                    }}
                    data-testid="button-log-dram"
                  >
                    <PenLine style={{ width: 18, height: 18 }} strokeWidth={2} />
                    {t("myTastePage.logDram")}
                  </div>
                </Link>
              )}

              <div style={cardStyle} data-testid="card-taste-snapshot">
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 12px" }}>
                  {t("myTastePage.tasteSnapshot")}
                </h2>
                {hasStats ? (
                  <div>
                    <StatRow label={t("myTastePage.stability")} value={stability} />
                    <StatRow label={t("myTastePage.exploration")} value={exploration} />
                    <StatRow label={t("myTastePage.smokeAffinity")} value={smoke} />
                    {tastingCount != null && <StatRow label={t("myTastePage.tastings")} value={tastingCount} />}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: v.muted, margin: 0 }} data-testid="text-snapshot-empty">{t("myTastePage.snapshotEmpty")}</p>
                )}
              </div>

              <div style={cardStyle} data-testid="card-taste-insight">
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 12px" }}>
                  {t("myTastePage.tasteInsight")}
                </h2>
                {insight ? (
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: v.text, margin: 0 }} data-testid="text-insight-message">{insight.message}</p>
                ) : (
                  <p style={{ fontSize: 13, color: v.muted, margin: 0 }} data-testid="text-insight-empty">{t("myTastePage.insightEmpty")}</p>
                )}
              </div>

              <AppleSection title={t("myTastePage.sectionProfile")}>
                <NavCard
                  icon={Radar}
                  label={t("myTastePage.flavorProfile")}
                  description={t("myTastePage.flavorProfileDesc")}
                  href="/my-taste/profile?from=/my-taste"
                  testId="link-flavor-profile"
                />
              </AppleSection>

              <AppleSection title={t("myTastePage.sectionAnalytics")}>
                <AnalyticsPreviewCard pid={pid} stats={stats} />
                <NavCard
                  icon={GitCompareArrows}
                  label={t("myTastePage.comparison")}
                  description={t("myTastePage.comparisonDesc")}
                  href="/my-taste/compare?from=/my-taste"
                  testId="link-comparison"
                />
                <NavCard
                  icon={Sparkles}
                  label={t("myTastePage.recommendations")}
                  description={t("myTastePage.recommendationsDesc")}
                  href="/my-taste/recommendations?from=/my-taste"
                  testId="link-recommendations"
                />
                <NavCard
                  icon={FlaskConical}
                  label={t("myTastePage.benchmarkAnalyzer")}
                  description={t("myTastePage.benchmarkDesc")}
                  href="/my-taste/benchmark?from=/my-taste"
                  testId="link-benchmark"
                />
              </AppleSection>

              <AppleSection title={t("myTastePage.sectionTasted")}>
                <p style={{ fontSize: 11, color: v.muted, marginTop: -8, marginBottom: 8, lineHeight: 1.5 }}>
                  {t("myTastePage.tastedDesc")}
                </p>
                <NavCard
                  icon={BookOpen}
                  label={t("myTastePage.journal")}
                  description={t("myTastePage.journalDesc")}
                  href="/my-taste/drams?from=/my-taste"
                  testId="link-drams"
                  badge={journalCount > 0 ? journalCount : null}
                />
                <NavCard
                  icon={ClipboardList}
                  label={t("myTastePage.myTastings")}
                  description={t("myTastePage.myTastingsDesc")}
                  href="/sessions"
                  testId="link-my-tastings"
                  badge={tastingCount != null && tastingCount > 0 ? tastingCount : null}
                />
                <NavCard
                  icon={Download}
                  label={t("myTastePage.dataExport")}
                  description={t("myTastePage.dataExportDesc")}
                  href="/my-taste/export?from=/my-taste"
                  testId="link-data-export"
                />
              </AppleSection>

              <AppleSection title={t("myTastePage.sectionLibrary")}>
                <p style={{ fontSize: 11, color: v.muted, marginTop: -8, marginBottom: 8, lineHeight: 1.5 }}>
                  {t("myTastePage.libraryDesc")}
                </p>
                <NavCard
                  icon={Archive}
                  label={t("myTastePage.myCollection")}
                  description={t("myTastePage.collectionDesc")}
                  href="/my-taste/collection?from=/my-taste"
                  testId="link-collection"
                />
                <NavCard
                  icon={Heart}
                  label={t("myTastePage.wishlist")}
                  description={t("myTastePage.wishlistDesc")}
                  href="/my-taste/wishlist?from=/my-taste"
                  testId="link-wishlist"
                />
              </AppleSection>
            </>
          )}

          {!pid && <UnlockCard onUnlock={handleUnlock} />}
        </ApplePage>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ ...pageTitleStyle, textAlign: "center" }} data-testid="text-my-taste-title">
            {t("myTastePage.title")}
          </h1>
          <p style={{ ...pageSubtitleStyle, textAlign: "center" }}>
            {t("myTastePage.subtitle")}
          </p>
        </div>

        {pid && isV2 && (
          <>
            <div>
              <h3 style={{ ...sectionHeadingStyle, color: v.accent, fontSize: 18 }}>
                {t("myTastePage.sectionDrams")}
              </h3>
              <p style={{ fontSize: 13, color: v.muted, marginTop: -8, marginBottom: 12, lineHeight: 1.5 }}>
                {t("myTastePage.dramsSubtitle")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavCard
                  icon={BookOpen}
                  label={t("myTastePage.journal")}
                  description={t("myTastePage.journalDesc")}
                  href="/my-taste/drams?from=/my-taste"
                  testId="link-drams"
                  badge={journalCount > 0 ? journalCount : null}
                />
                <NavCard
                  icon={ClipboardList}
                  label={t("myTastePage.myTastings")}
                  description={t("myTastePage.myTastingsDesc")}
                  href="/sessions"
                  testId="link-my-tastings"
                  badge={tastingCount != null && tastingCount > 0 ? tastingCount : null}
                />
              </div>
            </div>

            <div style={cardStyle} data-testid="card-taste-snapshot">
              <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 12px" }}>
                {t("myTastePage.tasteSnapshot")}
              </h2>
              {hasStats ? (
                <div>
                  <StatRow label={t("myTastePage.stability")} value={stability} />
                  <StatRow label={t("myTastePage.exploration")} value={exploration} />
                  <StatRow label={t("myTastePage.smokeAffinity")} value={smoke} />
                  {tastingCount != null && <StatRow label={t("myTastePage.tastings")} value={tastingCount} />}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: v.muted, margin: 0 }} data-testid="text-snapshot-empty">{t("myTastePage.snapshotEmpty")}</p>
              )}
            </div>

            {insight && (
              <div style={cardStyle} data-testid="card-taste-insight">
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 12px" }}>
                  {t("myTastePage.tasteInsight")}
                </h2>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: v.text, margin: 0 }} data-testid="text-insight-message">{insight.message}</p>
              </div>
            )}

            <div>
              <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                {t("myTastePage.sectionAnalyse")}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavCard
                  icon={Radar}
                  label={t("myTastePage.flavorProfile")}
                  description={t("myTastePage.flavorProfileDesc")}
                  href="/my-taste/profile?from=/my-taste"
                  testId="link-flavor-profile"
                />
                <AnalyticsPreviewCard pid={pid} stats={stats} />
                <NavCard
                  icon={GitCompareArrows}
                  label={t("myTastePage.comparison")}
                  description={t("myTastePage.comparisonDesc")}
                  href="/my-taste/compare?from=/my-taste"
                  testId="link-comparison"
                />
                <NavCard
                  icon={Sparkles}
                  label={t("myTastePage.recommendations")}
                  description={t("myTastePage.recommendationsDesc")}
                  href="/my-taste/recommendations?from=/my-taste"
                  testId="link-recommendations"
                />
                <NavCard
                  icon={FlaskConical}
                  label={t("myTastePage.benchmarkAnalyzer")}
                  description={t("myTastePage.benchmarkDesc")}
                  href="/my-taste/benchmark?from=/my-taste"
                  testId="link-benchmark"
                />
              </div>
            </div>

            {isTwoTab && (
              <>
                <div>
                  <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                    {t("myTastePage.sectionKnowledge")}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <NavCard icon={Library} label={t("myTastePage.lexicon")} description={t("myTastePage.lexiconDesc")} href="/discover/lexicon" testId="link-knowledge-lexicon" />
                    <NavCard icon={Building2} label={t("myTastePage.distilleries")} description={t("myTastePage.distilleriesDesc")} href="/discover/distilleries" testId="link-knowledge-distilleries" />
                    <NavCard icon={Package} label={t("myTastePage.independentBottlers")} description={t("myTastePage.independentBottlersDesc")} href="/discover/bottlers" testId="link-knowledge-bottlers" />
                    <NavCard icon={Map} label={t("myTastePage.tastingGuide")} description={t("myTastePage.tastingGuideDesc")} href="/discover/guide" testId="link-knowledge-guide" />
                    <NavCard icon={FlaskConical} label={t("myTastePage.rabbitHole")} description={t("myTastePage.rabbitHoleDesc")} href="/discover/rabbit-hole" testId="link-knowledge-rabbit-hole" />
                  </div>
                </div>

                <div>
                  <h3 style={{ ...sectionHeadingStyle, color: v.accent, fontSize: 15 }}>
                    {t("myTastePage.sectionCollection")}
                  </h3>
                  <p style={{ fontSize: 13, color: v.text, marginTop: -8, marginBottom: 4, lineHeight: 1.5 }}>
                    {t("myTastePage.collectionSubtitle")}
                  </p>
                  <p style={{ fontSize: 11, color: v.muted, margin: "0 0 12px", lineHeight: 1.5, fontStyle: "italic" }}>
                    {t("myTastePage.collectionExplainer")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <NavCard
                      icon={Archive}
                      label={t("myTastePage.myCollection")}
                      description={t("myTastePage.collectionDesc")}
                      href="/my-taste/collection?from=/my-taste"
                      testId="link-collection"
                    />
                    <NavCard
                      icon={Heart}
                      label={t("myTastePage.wishlist")}
                      description={t("myTastePage.wishlistDesc")}
                      href="/my-taste/wishlist?from=/my-taste"
                      testId="link-wishlist"
                    />
                  </div>
                </div>

                <div>
                  <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                    {t("myTastePage.sectionDownloads")}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <NavCard icon={Download} label={t("downloads.title")} description={t("myTastePage.downloadsDesc")} href="/my-taste/downloads" testId="link-downloads-export" />
                  </div>
                </div>

                <div>
                  <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                    {t("myTastePage.sectionCommunity")}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <NavCard icon={Users} label={t("myTastePage.tasteTwins")} description={t("myTastePage.tasteTwinsDesc")} href="/discover/community?tab=twins" testId="link-community-twins" />
                    <NavCard icon={Trophy} label={t("myTastePage.communityRankings")} description={t("myTastePage.communityRankingsDesc")} href="/discover/community?tab=rankings" testId="link-community-rankings" />
                    <NavCard icon={Activity} label={t("myTastePage.activityFeed")} description={t("myTastePage.activityFeedDesc")} href="/discover/activity" testId="link-community-activity" />
                  </div>
                </div>

                <div>
                  <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                    {t("myTastePage.sectionAbout")}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <NavCard icon={Info} label={t("myTastePage.about")} description={t("myTastePage.aboutDesc")} href="/discover/about" testId="link-about" />
                    <NavCard icon={HandHeart} label={t("myTastePage.donate")} description={t("myTastePage.donateDesc")} href="/discover/donate" testId="link-donate" />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {pid && !isV2 && (
          <>
            {NAV_VERSION === "v2_simplified" && (
              <Link href="/log-simple">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "14px 20px",
                    background: v.accent,
                    color: v.bg,
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                  data-testid="button-log-dram"
                >
                  <PenLine style={{ width: 18, height: 18 }} strokeWidth={2} />
                  {t("myTastePage.logDram")}
                </div>
              </Link>
            )}

            <div style={cardStyle} data-testid="card-taste-snapshot">
              <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 12px" }}>
                {t("myTastePage.tasteSnapshot")}
              </h2>
              {hasStats ? (
                <div>
                  <StatRow label={t("myTastePage.stability")} value={stability} />
                  <StatRow label={t("myTastePage.exploration")} value={exploration} />
                  <StatRow label={t("myTastePage.smokeAffinity")} value={smoke} />
                  {tastingCount != null && <StatRow label={t("myTastePage.tastings")} value={tastingCount} />}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: v.muted, margin: 0 }} data-testid="text-snapshot-empty">{t("myTastePage.snapshotEmpty")}</p>
              )}
            </div>

            <div style={cardStyle} data-testid="card-taste-insight">
              <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 12px" }}>
                {t("myTastePage.tasteInsight")}
              </h2>
              {insight ? (
                <p style={{ fontSize: 14, lineHeight: 1.6, color: v.text, margin: 0 }} data-testid="text-insight-message">{insight.message}</p>
              ) : (
                <p style={{ fontSize: 13, color: v.muted, margin: 0 }} data-testid="text-insight-empty">{t("myTastePage.insightEmpty")}</p>
              )}
            </div>

            <div>
              <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                {t("myTastePage.sectionProfile")}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavCard
                  icon={Radar}
                  label={t("myTastePage.flavorProfile")}
                  description={t("myTastePage.flavorProfileDesc")}
                  href="/my-taste/profile?from=/my-taste"
                  testId="link-flavor-profile"
                />
              </div>
            </div>

            <div>
              <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                {t("myTastePage.sectionAnalytics")}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <AnalyticsPreviewCard pid={pid} stats={stats} />
                <NavCard
                  icon={GitCompareArrows}
                  label={t("myTastePage.comparison")}
                  description={t("myTastePage.comparisonDesc")}
                  href="/my-taste/compare?from=/my-taste"
                  testId="link-comparison"
                />
                <NavCard
                  icon={Sparkles}
                  label={t("myTastePage.recommendations")}
                  description={t("myTastePage.recommendationsDesc")}
                  href="/my-taste/recommendations?from=/my-taste"
                  testId="link-recommendations"
                />
                <NavCard
                  icon={FlaskConical}
                  label={t("myTastePage.benchmarkAnalyzer")}
                  description={t("myTastePage.benchmarkDesc")}
                  href="/my-taste/benchmark?from=/my-taste"
                  testId="link-benchmark"
                />
              </div>
            </div>

            <div>
              <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                {t("myTastePage.sectionTasted")}
              </h3>
              <p style={{ fontSize: 11, color: v.muted, marginTop: -8, marginBottom: 8, lineHeight: 1.5 }}>
                {t("myTastePage.tastedDesc")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavCard
                  icon={BookOpen}
                  label={t("myTastePage.journal")}
                  description={t("myTastePage.journalDesc")}
                  href="/my-taste/drams?from=/my-taste"
                  testId="link-drams"
                  badge={journalCount > 0 ? journalCount : null}
                />
                <NavCard
                  icon={ClipboardList}
                  label={t("myTastePage.myTastings")}
                  description={t("myTastePage.myTastingsDesc")}
                  href="/sessions"
                  testId="link-my-tastings"
                  badge={tastingCount != null && tastingCount > 0 ? tastingCount : null}
                />
                <NavCard
                  icon={Download}
                  label={t("myTastePage.dataExport")}
                  description={t("myTastePage.dataExportDesc")}
                  href="/my-taste/export?from=/my-taste"
                  testId="link-data-export"
                />
              </div>
            </div>

            <div>
              <h3 style={{ ...sectionHeadingStyle, color: v.accent }}>
                {t("myTastePage.sectionLibrary")}
              </h3>
              <p style={{ fontSize: 11, color: v.muted, marginTop: -8, marginBottom: 8, lineHeight: 1.5 }}>
                {t("myTastePage.libraryDesc")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavCard
                  icon={Archive}
                  label={t("myTastePage.myCollection")}
                  description={t("myTastePage.collectionDesc")}
                  href="/my-taste/collection?from=/my-taste"
                  testId="link-collection"
                />
                <NavCard
                  icon={Heart}
                  label={t("myTastePage.wishlist")}
                  description={t("myTastePage.wishlistDesc")}
                  href="/my-taste/wishlist?from=/my-taste"
                  testId="link-wishlist"
                />
              </div>
            </div>
          </>
        )}

        {!pid && <UnlockCard onUnlock={handleUnlock} />}
      </div>
    </SimpleShell>
  );
}
