import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, Users, Clock, TrendingUp, Activity, Download, FileText,
  ChevronDown, ChevronRight, ArrowLeft, Eye, LogOut, UserPlus,
  Target, Loader2, Calendar, Bell, Search, Globe, Zap
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie
} from "recharts";

interface AnalyticsDashboardProps {
  currentParticipantId: string;
}

const PERIOD_OPTIONS_KEYS = [
  { value: "1", labelKey: "analyticsUi.period24h" },
  { value: "7", labelKey: "analyticsUi.period7Days" },
  { value: "30", labelKey: "analyticsUi.period30Days" },
  { value: "90", labelKey: "analyticsUi.period90Days" },
  { value: "0", labelKey: "analyticsUi.periodAll" },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatMedianTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function KpiCard({ icon: Icon, label, value, sub, color = "text-primary" }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
        <div className="text-2xl font-bold font-serif" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboard({ currentParticipantId }: AnalyticsDashboardProps) {
  const { t } = useTranslation();
  const [days, setDays] = useState("30");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");

  const daysNum = parseInt(days) || 0;

  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ["/admin/analytics/dashboard", currentParticipantId, days],
    queryFn: () => adminApi.getAnalyticsDashboard(currentParticipantId, daysNum),
    enabled: !!currentParticipantId,
  });

  const { data: pageViewData, isLoading: loadingPageViews } = useQuery({
    queryKey: ["/admin/analytics/page-views", currentParticipantId, days],
    queryFn: () => adminApi.getAnalyticsPageViews(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && (activeSection === "overview" || activeSection === "pages"),
  });

  const { data: funnelData, isLoading: loadingFunnels } = useQuery({
    queryKey: ["/admin/analytics/funnels", currentParticipantId, days],
    queryFn: () => adminApi.getAnalyticsFunnels(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && activeSection === "funnels",
  });

  const { data: retentionData, isLoading: loadingRetention } = useQuery({
    queryKey: ["/admin/analytics/retention", currentParticipantId, days],
    queryFn: () => adminApi.getAnalyticsRetention(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && activeSection === "retention",
  });

  const { data: userDeepDive, isLoading: loadingDeepDive } = useQuery({
    queryKey: ["/admin/analytics/user-deep-dive", currentParticipantId, selectedUserId],
    queryFn: () => adminApi.getUserDeepDive(currentParticipantId, selectedUserId!),
    enabled: !!currentParticipantId && !!selectedUserId,
  });

  const { data: featureData, isLoading: loadingFeatures } = useQuery({
    queryKey: ["/admin/analytics/feature-adoption", currentParticipantId, days],
    queryFn: () => adminApi.getFeatureAdoption(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && activeSection === "features",
  });

  const { data: activationData, isLoading: loadingActivation } = useQuery({
    queryKey: ["/admin/analytics/activation-funnel", currentParticipantId, days],
    queryFn: () => adminApi.getActivationFunnel(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && activeSection === "activation",
  });

  const { data: cohortData, isLoading: loadingCohorts } = useQuery({
    queryKey: ["/admin/analytics/cohorts", currentParticipantId, days],
    queryFn: () => adminApi.getCohorts(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && activeSection === "retention",
  });

  const { data: notifData, isLoading: loadingNotifs } = useQuery({
    queryKey: ["/admin/analytics/notifications", currentParticipantId, days],
    queryFn: () => adminApi.getNotificationEngagement(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && activeSection === "notifications",
  });

  const { data: searchData, isLoading: loadingSearch } = useQuery({
    queryKey: ["/admin/analytics/search", currentParticipantId, days],
    queryFn: () => adminApi.getSearchAnalytics(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && activeSection === "search",
  });

  const { data: acquisitionData, isLoading: loadingAcquisition } = useQuery({
    queryKey: ["/admin/analytics/acquisition", currentParticipantId, days],
    queryFn: () => adminApi.getAcquisition(currentParticipantId, daysNum),
    enabled: !!currentParticipantId && activeSection === "acquisition",
  });

  const handleCsvExport = (type: string) => {
    const url = adminApi.exportCsv(currentParticipantId, type, daysNum);
    window.open(url, "_blank");
  };

  const handlePdfExport = () => {
    const url = adminApi.exportPdf(currentParticipantId, daysNum);
    window.open(url, "_blank");
  };

  if (selectedUserId) {
    return (
      <UserDeepDiveView
        data={userDeepDive}
        loading={loadingDeepDive}
        onBack={() => setSelectedUserId(null)}
        participantId={currentParticipantId}
        days={daysNum}
      />
    );
  }

  const sections = [
    { id: "overview", label: t("analyticsUi.overview") },
    { id: "pages", label: t("analyticsUi.pagesNavigation") },
    { id: "engagement", label: t("analyticsUi.userEngagement") },
    { id: "features", label: t("analyticsUi.featureAdoption") },
    { id: "activation", label: t("analyticsUi.activation") },
    { id: "funnels", label: t("analyticsUi.funnelAnalysis") },
    { id: "retention", label: t("analyticsUi.retentionCohorts") },
    { id: "notifications", label: t("analyticsUi.notificationsTab") },
    { id: "search", label: t("analyticsUi.searchTab") },
    { id: "acquisition", label: t("analyticsUi.acquisition") },
  ];

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {sections.map(s => (
            <Button
              key={s.id}
              variant={activeSection === s.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection(s.id)}
              data-testid={`tab-${s.id}`}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS_KEYS.map(o => (
                <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => {
            const typeMap: Record<string, string> = {
              overview: "engagement", pages: "pageviews", engagement: "engagement",
              features: "feature-adoption", activation: "activation-funnel", funnels: "funnels",
              retention: "cohorts", notifications: "notifications", search: "search",
              acquisition: "acquisition",
            };
            handleCsvExport(typeMap[activeSection] || "engagement");
          }} data-testid="button-export-csv">
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdfExport} data-testid="button-export-pdf">
            <FileText className="w-3.5 h-3.5 mr-1" /> {t("analyticsUi.report")}
          </Button>
        </div>
      </div>

      {loadingDashboard ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {(activeSection === "overview") && dashboard && (
            <OverviewSection
              dashboard={dashboard}
              pageViewData={pageViewData}
              loadingPageViews={loadingPageViews}
            />
          )}

          {activeSection === "pages" && (
            <PagesSection
              pageViewData={pageViewData}
              loading={loadingPageViews}
              onExport={() => handleCsvExport("pageviews")}
            />
          )}

          {activeSection === "engagement" && dashboard && (
            <EngagementSection
              dashboard={dashboard}
              onSelectUser={setSelectedUserId}
              onExport={() => handleCsvExport("engagement")}
              onSessionExport={() => handleCsvExport("sessions")}
            />
          )}

          {activeSection === "features" && (
            <FeatureAdoptionSection data={featureData} loading={loadingFeatures} />
          )}

          {activeSection === "activation" && (
            <ActivationFunnelSection data={activationData} loading={loadingActivation} />
          )}

          {activeSection === "funnels" && (
            <FunnelSection data={funnelData} loading={loadingFunnels} />
          )}

          {activeSection === "retention" && (
            <RetentionSection data={retentionData} loading={loadingRetention} cohortData={cohortData} loadingCohorts={loadingCohorts} />
          )}

          {activeSection === "notifications" && (
            <NotificationSection data={notifData} loading={loadingNotifs} />
          )}

          {activeSection === "search" && (
            <SearchSection data={searchData} loading={loadingSearch} />
          )}

          {activeSection === "acquisition" && (
            <AcquisitionSection data={acquisitionData} loading={loadingAcquisition} />
          )}
        </>
      )}
    </div>
  );
}

function OverviewSection({ dashboard, pageViewData, loadingPageViews }: { dashboard: any; pageViewData: any; loadingPageViews: boolean }) {
  const { t } = useTranslation();
  const kpis = dashboard?.kpis || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3" data-testid="kpi-cards">
        <KpiCard icon={Users} label={t("analyticsUi.dau")} value={kpis.activeToday || 0} sub={t("analyticsUi.activeToday")} color="text-green-500" />
        <KpiCard icon={Users} label={t("analyticsUi.wau")} value={kpis.active7d || 0} sub={t("analyticsUi.period7Days")} color="text-blue-500" />
        <KpiCard icon={Users} label={t("analyticsUi.mau")} value={kpis.active30d || 0} sub={t("analyticsUi.period30Days")} color="text-purple-500" />
        <KpiCard icon={Clock} label={t("analyticsUi.avgDuration")} value={formatDuration(kpis.avgDurationSec || 0)} sub={t("analyticsUi.avgDuration")} />
        <KpiCard icon={Clock} label={t("analyticsUi.median")} value={formatDuration(kpis.medianDurationSec || 0)} sub={t("analyticsUi.avgDuration")} color="text-cyan-500" />
        <KpiCard icon={UserPlus} label={t("analyticsUi.newUsers")} value={kpis.newUsersWeek || 0} sub={t("analyticsUi.last7Days")} color="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon={Activity} label={t("analyticsUi.sessions")} value={kpis.totalSessions || 0} />
        <KpiCard icon={Target} label={t("analyticsUi.conversion")} value={`${kpis.conversionRate || 0}%`} sub={`${kpis.acceptedInvites || 0}/${kpis.totalInvites || 0}`} />
        <KpiCard icon={TrendingUp} label={t("analyticsUi.avgPagesPerSession")} value={dashboard?.engagementTable?.length > 0 ? Math.round((dashboard.engagementTable.reduce((s: number, e: any) => s + (e.sessionCount || 0), 0) / dashboard.engagementTable.length) || 0) : 0} />
      </div>

      {dashboard?.durationDistribution?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> {t("analyticsUi.sessionDurationDistribution")}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dashboard.durationDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {dashboard?.dropOffCurve?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" /> {t("analyticsUi.dropOffCurve")}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{t("analyticsUi.dropOffDesc")}</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dashboard.dropOffCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Noch aktiv"]} />
                <Line type="monotone" dataKey="percentage" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: "hsl(var(--destructive))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {dashboard?.dauSeries?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> {t("analyticsUi.dauWauTrend")}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dashboard.dauSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={(v: string) => `Datum: ${v}`} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="Aktive Nutzer" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {dashboard?.registrationSeries?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-500" /> {t("analyticsUi.registrations")}
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dashboard.registrationSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Registrierungen" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {dashboard?.topPages?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" /> {t("analyticsUi.topPages")}
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(200, dashboard.topPages.length * 28)}>
              <BarChart data={dashboard.topPages.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="page" tick={{ fontSize: 10 }} width={150} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} name="Aufrufe" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {dashboard?.inviteConversion && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" /> {t("analyticsUi.inviteConversion")}
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("analyticsUi.invitesSent")}</span>
                  <span className="font-bold">{dashboard.inviteConversion.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("analyticsUi.invitesAccepted")}</span>
                  <span className="font-bold text-green-600">{dashboard.inviteConversion.accepted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("analyticsUi.conversionRate")}</span>
                  <span className="font-bold text-primary">{dashboard.inviteConversion.rate}%</span>
                </div>
              </div>
              <div className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center">
                <span className="text-lg font-bold">{dashboard.inviteConversion.rate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PagesSection({ pageViewData, loading, onExport }: { pageViewData: any; loading: boolean; onExport: () => void }) {
  const { t } = useTranslation();
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!pageViewData) return <p className="text-center text-muted-foreground py-8">Keine Page-View-Daten vorhanden</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onExport} data-testid="button-export-pageviews">
          <Download className="w-3.5 h-3.5 mr-1" /> Page Views CSV
        </Button>
      </div>

      {pageViewData.topPages?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3">{t("analyticsUi.mostVisitedPages")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-2">{t("analyticsUi.page")}</th>
                    <th className="text-center py-2 px-2">{t("analyticsUi.views")}</th>
                    <th className="text-center py-2 px-2">{t("analyticsUi.users")}</th>
                    <th className="text-center py-2 px-2">{t("analyticsUi.avgDurationCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageViewData.topPages.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-muted/30" data-testid={`top-page-row-${i}`}>
                      <td className="py-2 pr-2 font-mono text-xs">{p.page}</td>
                      <td className="text-center py-2 px-2 font-bold">{p.views}</td>
                      <td className="text-center py-2 px-2">{p.uniqueUsers}</td>
                      <td className="text-center py-2 px-2">{formatDuration(p.avgDuration || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pageViewData.dwellTime?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> {t("analyticsUi.dwellTimePerPage")}
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(200, pageViewData.dwellTime.length * 28)}>
              <BarChart data={pageViewData.dwellTime.slice(0, 15)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} label={{ value: "Sekunden", position: "bottom", fontSize: 10 }} />
                <YAxis type="category" dataKey="page" tick={{ fontSize: 9 }} width={140} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [formatDuration(v), "Ø Verweildauer"]} />
                <Bar dataKey="avgSeconds" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} name="Ø Sekunden" />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 cursor-pointer hover:text-primary" data-testid="dwell-sort-page">Seite</th>
                    <th className="text-right py-1 cursor-pointer hover:text-primary" data-testid="dwell-sort-avg">Ø Sek.</th>
                    <th className="text-right py-1 cursor-pointer hover:text-primary" data-testid="dwell-sort-median">Median Sek.</th>
                    <th className="text-right py-1" data-testid="dwell-sort-views">Aufrufe</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pageViewData.dwellTime].sort((a: any, b: any) => b.avgSeconds - a.avgSeconds).map((d: any, i: number) => (
                    <tr key={i} className="border-b border-muted" data-testid={`dwell-row-${i}`}>
                      <td className="py-1 font-mono truncate max-w-[200px]">{d.page}</td>
                      <td className="text-right py-1">{formatDuration(d.avgSeconds)}</td>
                      <td className="text-right py-1">{formatDuration(d.medianSeconds)}</td>
                      <td className="text-right py-1">{d.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pageViewData.exitPages?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-red-500" /> Drop-off Seiten
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Auf diesen Seiten enden Sessions am häufigsten</p>
            <div className="space-y-2">
              {pageViewData.exitPages.slice(0, 10).map((p: any, i: number) => {
                const max = pageViewData.exitPages[0]?.exits || 1;
                return (
                  <div key={i} className="flex items-center gap-3" data-testid={`exit-page-${i}`}>
                    <span className="text-xs font-mono w-[140px] truncate flex-shrink-0">{p.page}</span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div className="bg-red-500/60 h-full rounded-full" style={{ width: `${(p.exits / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-8 flex-shrink-0">{p.exits}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {pageViewData.pageFlow?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Seitenfluss (Top Übergänge)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Von</th>
                    <th className="text-center py-2 px-2">→</th>
                    <th className="text-left py-2">Nach</th>
                    <th className="text-right py-2">Anzahl</th>
                  </tr>
                </thead>
                <tbody>
                  {pageViewData.pageFlow.slice(0, 20).map((f: any, i: number) => (
                    <tr key={i} className="border-b border-muted/30">
                      <td className="py-1.5 font-mono text-xs">{f.fromPage}</td>
                      <td className="text-center text-muted-foreground">→</td>
                      <td className="py-1.5 font-mono text-xs">{f.toPage}</td>
                      <td className="text-right font-bold text-xs">{f.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EngagementSection({ dashboard, onSelectUser, onExport, onSessionExport }: { dashboard: any; onSelectUser: (id: string) => void; onExport: () => void; onSessionExport: () => void }) {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<string>("totalDuration");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const table = [...(dashboard?.engagementTable || [])].sort((a: any, b: any) => {
    const aVal = a[sortBy] ?? 0;
    const bVal = b[sortBy] ?? 0;
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th
      className="py-2 px-2 cursor-pointer hover:text-primary transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortBy === field && <span className="text-[10px]">{sortDir === "desc" ? "▼" : "▲"}</span>}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onExport} data-testid="button-export-engagement">
          <Download className="w-3.5 h-3.5 mr-1" /> Engagement CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onSessionExport} data-testid="button-export-sessions">
          <Download className="w-3.5 h-3.5 mr-1" /> Sessions CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-serif font-semibold text-sm mb-3">Nutzer-Engagement</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="engagement-table">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-2">Name</th>
                  <SortHeader field="sessionCount">{t("analyticsUi.sessions")}</SortHeader>
                  <SortHeader field="totalDuration">{t("analyticsUi.totalDuration")}</SortHeader>
                  <SortHeader field="avgDuration">{t("analyticsUi.avgDurationCol")}</SortHeader>
                  <SortHeader field="ratingCount">{t("resultsUi.ratings")}</SortHeader>
                  <th className="py-2 px-2 text-center">{t("analyticsUi.last7Days")}</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {table.map((u: any) => (
                  <tr key={u.id} className="border-b border-muted/30 hover:bg-muted/20 transition-colors" data-testid={`engagement-row-${u.id}`}>
                    <td className="py-2 pr-2">
                      <div className="font-medium font-serif">{u.name}</div>
                      <div className="text-[10px] text-muted-foreground">{u.role}</div>
                    </td>
                    <td className="text-center py-2 px-2">{u.sessionCount}</td>
                    <td className="text-center py-2 px-2 font-bold">{formatDuration(u.totalDuration || 0)}</td>
                    <td className="text-center py-2 px-2">{formatDuration(u.avgDuration || 0)}</td>
                    <td className="text-center py-2 px-2">{u.ratingCount}</td>
                    <td className="text-center py-2 px-2 text-xs text-muted-foreground">
                      {u.lastActivity ? new Date(u.lastActivity).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td className="py-2 px-2">
                      <Button variant="ghost" size="sm" onClick={() => onSelectUser(u.id)} data-testid={`button-deep-dive-${u.id}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelSection({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <p className="text-center text-muted-foreground py-8">Keine Funnel-Daten</p>;

  const renderFunnel = (title: string, steps: any[]) => {
    const maxCount = steps[0]?.count || 1;
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="font-serif font-semibold text-sm mb-4">{title}</h3>
          <div className="space-y-3">
            {steps.map((step: any, i: number) => {
              const prevCount = i > 0 ? steps[i - 1].count : step.count;
              const dropOff = prevCount > 0 ? Math.round(((prevCount - step.count) / prevCount) * 100) : 0;
              return (
                <div key={i} data-testid={`funnel-step-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{step.step}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{step.count}</span>
                      {i > 0 && dropOff > 0 && (
                        <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">
                          -{dropOff}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(step.count / maxCount) * 100}%`,
                        backgroundColor: `hsl(${120 + (i * 60)}, 60%, 50%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {data.registration && renderFunnel("Registrierungs-Funnel", data.registration)}
      {data.invitation && renderFunnel("Einladungs-Funnel", data.invitation)}
    </div>
  );
}

function FeatureAdoptionSection({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <p className="text-center text-muted-foreground py-8">Keine Feature-Daten</p>;

  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Feature-Adoption ({data.totalUsers} Nutzer gesamt)
          </h3>
          <div className="space-y-3">
            {data.features?.map((f: any, i: number) => (
              <div key={f.feature} data-testid={`feature-adoption-${f.feature.toLowerCase()}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{f.feature}</span>
                  <span className="text-xs">
                    <span className="font-bold">{f.users}</span>
                    <span className="text-muted-foreground ml-1">({f.percentage}%)</span>
                  </span>
                </div>
                <div className="bg-muted rounded-full h-4 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.aiFeatures?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" /> AI-Feature-Nutzung
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Feature</th>
                    <th className="text-center py-2">Nutzungen</th>
                    <th className="text-center py-2">Nutzer</th>
                  </tr>
                </thead>
                <tbody>
                  {data.aiFeatures.map((f: any) => (
                    <tr key={f.featureId} className="border-b border-muted/30" data-testid={`ai-feature-${f.featureId}`}>
                      <td className="py-2 font-mono text-xs">{f.featureId}</td>
                      <td className="text-center py-2 font-bold">{f.uses}</td>
                      <td className="text-center py-2">{f.uniqueUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data.dwellCorrelation?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Feature ↔ Verweildauer
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Feature</th>
                    <th className="text-center py-2">Nutzer</th>
                    <th className="text-center py-2">Ø Verweildauer</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dwellCorrelation.map((d: any) => (
                    <tr key={d.feature} className="border-b border-muted/30" data-testid={`dwell-${d.feature.toLowerCase()}`}>
                      <td className="py-2 font-medium">{d.feature}</td>
                      <td className="text-center py-2">{d.users}</td>
                      <td className="text-center py-2 font-bold">{formatDuration(d.avg_dwell_seconds || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data.featureTrends?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3">Feature-Nutzung über Zeit</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={(() => {
                const byDay: Record<string, any> = {};
                for (const row of data.featureTrends) {
                  if (!byDay[row.day]) byDay[row.day] = { day: row.day };
                  byDay[row.day][row.feature] = row.count;
                }
                return Object.values(byDay).sort((a: any, b: any) => a.day.localeCompare(b.day));
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="rating" stroke="#22c55e" strokeWidth={2} dot={false} name="Ratings" />
                <Line type="monotone" dataKey="journal" stroke="#3b82f6" strokeWidth={2} dot={false} name="Journal" />
                <Line type="monotone" dataKey="wishlist" stroke="#f59e0b" strokeWidth={2} dot={false} name="Wishlist" />
                <Line type="monotone" dataKey="voice_memo" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Voice Memo" />
                <Line type="monotone" dataKey="friend" stroke="#06b6d4" strokeWidth={2} dot={false} name="Freunde" />
                <Line type="monotone" dataKey="group" stroke="#ef4444" strokeWidth={2} dot={false} name="Gruppen" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActivationFunnelSection({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data?.funnel) return <p className="text-center text-muted-foreground py-8">Keine Aktivierungsdaten</p>;

  const funnel = data.funnel;
  const maxCount = funnel[0]?.count || 1;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-serif font-semibold text-sm mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-500" /> Aktivierungs-Funnel
        </h3>
        <div className="space-y-4">
          {funnel.map((step: any, i: number) => {
            const prevCount = i > 0 ? funnel[i - 1].count : step.count;
            const dropOff = prevCount > 0 ? Math.round(((prevCount - step.count) / prevCount) * 100) : 0;
            return (
              <div key={i} data-testid={`activation-step-${i}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{step.step}</span>
                    {step.medianSeconds > 0 && (
                      <span className="text-[10px] text-muted-foreground">Median: {formatMedianTime(step.medianSeconds)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{step.count}</span>
                    {i > 0 && dropOff > 0 && (
                      <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">-{dropOff}%</Badge>
                    )}
                  </div>
                </div>
                <div className="bg-muted rounded-full h-6 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(step.count / maxCount) * 100}%`, backgroundColor: `hsl(${180 - (i * 25)}, 60%, 50%)` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RetentionSection({ data, loading, cohortData, loadingCohorts }: { data: any; loading: boolean; cohortData: any; loadingCohorts: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const maxWeek = data?.cohorts?.length > 0 ? Math.max(...data.cohorts.map((c: any) => c.weeks?.length || 0), 0) : 0;
  const weekHeaders = Array.from({ length: Math.min(maxWeek, 13) }, (_, i) => i);

  return (
    <div className="space-y-6">
      {data?.cohorts?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Kohortenbasierte Retention
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Nutzer gruppiert nach Registrierungswoche. Prozent = Wiederkehrrate.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="retention-table">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2 font-medium">Kohorte</th>
                    <th className="text-center py-2 px-1 font-medium">Größe</th>
                    {weekHeaders.map(w => (
                      <th key={w} className="text-center py-2 px-1 font-medium">W{w}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map((cohort: any) => (
                    <tr key={cohort.cohortWeek} className="border-b border-muted/30" data-testid={`retention-row-${cohort.cohortWeek}`}>
                      <td className="py-1.5 pr-2 font-mono">{cohort.cohortWeek?.slice(5) || "?"}</td>
                      <td className="text-center py-1.5 px-1 font-bold">{cohort.size}</td>
                      {weekHeaders.map(w => {
                        const pct = cohort.weeks?.[w] ?? 0;
                        const intensity = Math.min(pct / 100, 1);
                        return (
                          <td
                            key={w}
                            className="text-center py-1.5 px-1"
                            style={{
                              backgroundColor: pct > 0 ? `hsla(var(--primary), ${intensity * 0.4 + 0.05})` : undefined,
                            }}
                          >
                            {pct > 0 ? `${pct}%` : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {cohortData?.contentVelocity?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Content-Velocity
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Wie schnell erstellen aktive Nutzer ihren n-ten Eintrag (Ratings)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Meilenstein</th>
                    <th className="text-center py-2">Nutzer erreicht</th>
                    <th className="text-center py-2">Median-Zeit ab Registrierung</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortData.contentVelocity.map((v: any) => (
                    <tr key={v.milestone} className="border-b border-muted/30" data-testid={`velocity-${v.milestone}`}>
                      <td className="py-2 font-medium">Rating #{v.milestone}</td>
                      <td className="text-center py-2 font-bold">{v.users_reached}</td>
                      <td className="text-center py-2">{formatMedianTime(v.median_seconds_from_signup)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!data?.cohorts?.length && !loadingCohorts && (
        <p className="text-center text-muted-foreground py-8">Keine Retention-Daten</p>
      )}
    </div>
  );
}

function NotificationSection({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  const { t } = useTranslation();
  if (!data) return <p className="text-center text-muted-foreground py-8">{t("analyticsUi.noPageViewData")}</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon={Bell} label={t("analyticsUi.total")} value={data.totalNotifications || 0} />
        <KpiCard icon={Eye} label={t("analyticsUi.read")} value={data.totalRead || 0} color="text-green-500" />
        <KpiCard icon={Target} label={t("analyticsUi.readRate")} value={`${data.overallReadRate || 0}%`} color="text-blue-500" />
      </div>

      {data.returnCorrelation && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Rückkehr-Korrelation (30 Min.)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xl font-bold" data-testid="text-notifs-with-readers">{data.returnCorrelation.notifsWithReaders}</div>
                <div className="text-xs text-muted-foreground">Gelesene Benachrichtigungen</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xl font-bold text-green-600" data-testid="text-notifs-with-return">{data.returnCorrelation.notifsWithReturn}</div>
                <div className="text-xs text-muted-foreground">Mit Rückkehr (&le;30 Min.)</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xl font-bold text-blue-600" data-testid="text-return-rate">{data.returnCorrelation.returnRatePct}%</div>
                <div className="text-xs text-muted-foreground">Rückkehrrate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.byType?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Leserate nach Typ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Typ</th>
                    <th className="text-center py-2">Gesamt</th>
                    <th className="text-center py-2">Gelesen</th>
                    <th className="text-center py-2">Leserate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byType.map((t: any) => (
                    <tr key={t.type} className="border-b border-muted/30" data-testid={`notif-type-${t.type}`}>
                      <td className="py-2 font-medium capitalize">{t.type}</td>
                      <td className="text-center py-2">{t.total}</td>
                      <td className="text-center py-2 font-bold text-green-600">{t.read}</td>
                      <td className="text-center py-2">
                        <Badge variant={t.readRate >= 50 ? "default" : "outline"} className="text-xs">{t.readRate}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SearchSection({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <p className="text-center text-muted-foreground py-8">Keine Suchdaten</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon={Search} label="Suchen gesamt" value={data.totalSearches || 0} />
        <KpiCard icon={Users} label="Suchende Nutzer" value={data.uniqueSearchUsers || 0} color="text-blue-500" />
        <KpiCard icon={Target} label="Null-Ergebnis" value={data.nullResultSearches || 0} sub="Suchen ohne Treffer" color="text-red-500" />
      </div>

      {data.topSearches?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" /> Meistgesuchte Begriffe
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Suchbegriff</th>
                    <th className="text-center py-2">Suchen</th>
                    <th className="text-center py-2">Nutzer</th>
                    <th className="text-center py-2">Ø Ergebnisse</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSearches.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-muted/30" data-testid={`search-term-${i}`}>
                      <td className="py-2 font-mono text-xs">{s.query}</td>
                      <td className="text-center py-2 font-bold">{s.count}</td>
                      <td className="text-center py-2">{s.uniqueUsers}</td>
                      <td className="text-center py-2">{s.avgResults}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data.nullResults?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-red-500" /> Null-Ergebnis-Suchen
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Was Nutzer suchen und nicht finden</p>
            <div className="space-y-2">
              {data.nullResults.map((s: any, i: number) => {
                const max = data.nullResults[0]?.count || 1;
                return (
                  <div key={i} className="flex items-center gap-3" data-testid={`null-search-${i}`}>
                    <span className="text-xs font-mono w-[140px] truncate flex-shrink-0">{s.query}</span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div className="bg-red-500/40 h-full rounded-full" style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-8 flex-shrink-0">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AcquisitionSection({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <p className="text-center text-muted-foreground py-8">Keine Akquisitionsdaten</p>;

  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiCard icon={Globe} label="Besuche gesamt" value={data.totalVisits || 0} />
        <KpiCard icon={Users} label="Eindeutige Besucher" value={data.uniqueVisitors || 0} color="text-blue-500" />
      </div>

      {data.bySource?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Traffic nach Quelle
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.bySource} dataKey="visits" nameKey="source" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {data.bySource.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2">Quelle</th>
                      <th className="text-center py-2">Besuche</th>
                      <th className="text-center py-2">Nutzer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySource.map((s: any, i: number) => (
                      <tr key={i} className="border-b border-muted/30" data-testid={`source-${s.source}`}>
                        <td className="py-2 font-mono text-xs">{s.source}</td>
                        <td className="text-center py-2 font-bold">{s.visits}</td>
                        <td className="text-center py-2">{s.uniqueUsers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.byReferrer?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3">Top Referrer</h3>
            <div className="space-y-2">
              {data.byReferrer.slice(0, 10).map((r: any, i: number) => {
                const max = data.byReferrer[0]?.visits || 1;
                return (
                  <div key={i} className="flex items-center gap-3" data-testid={`referrer-${i}`}>
                    <span className="text-xs font-mono w-[180px] truncate flex-shrink-0">{r.referrer}</span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div className="bg-blue-500/40 h-full rounded-full" style={{ width: `${(r.visits / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-8 flex-shrink-0">{r.visits}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UserDeepDiveView({ data, loading, onBack, participantId, days }: { data: any; loading: boolean; onBack: () => void; participantId: string; days: number }) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const handleCsvExport = (type: string) => {
    const url = adminApi.exportCsv(participantId, type, days, data?.user?.id);
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return <p className="text-center text-muted-foreground py-8">Nutzer nicht gefunden</p>;

  const user = data.user;
  const stats = data.stats;
  const getDurationSec = (s: any) => s.durationSeconds != null ? s.durationSeconds : (s.durationMinutes || 0) * 60;

  return (
    <div className="space-y-6" data-testid="user-deep-dive">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-from-deep-dive">
          <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleCsvExport("pageviews")} data-testid="button-export-user-pageviews">
            <Download className="w-3.5 h-3.5 mr-1" /> Page Views
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleCsvExport("sessions")} data-testid="button-export-user-sessions">
            <Download className="w-3.5 h-3.5 mr-1" /> Sessions
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg" data-testid="text-user-name">{user.name}</h2>
              <p className="text-xs text-muted-foreground">{user.email || "Keine E-Mail"} · {user.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Activity} label="Sessions" value={stats.totalSessions} />
        <KpiCard icon={Clock} label="Gesamtdauer" value={formatDuration(stats.totalDurationSec || 0)} />
        <KpiCard icon={BarChart3} label="Ratings" value={stats.ratingCount} />
        <KpiCard icon={FileText} label="Journal" value={stats.journalCount} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Erstmals gesehen</div>
            <div className="font-serif font-medium">{stats.firstSeen ? new Date(stats.firstSeen).toLocaleDateString("de-DE") : "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Zuletzt gesehen</div>
            <div className="font-serif font-medium">{stats.lastSeen ? new Date(stats.lastSeen).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</div>
          </CardContent>
        </Card>
      </div>

      {data.topPages?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3">Häufigste Seiten</h3>
            <div className="space-y-1.5">
              {data.topPages.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs truncate flex-1">{p.page}</span>
                  <span className="font-bold ml-2">{p.views}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.activityCalendar?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Aktivitäts-Kalender
            </h3>
            <div className="flex flex-wrap gap-1">
              {data.activityCalendar.slice(-90).map((d: any) => {
                const totalSec = d.totalSeconds || (d.totalMinutes || 0) * 60;
                const intensity = Math.min(totalSec / 1800, 1);
                return (
                  <div
                    key={d.day}
                    className="w-3 h-3 rounded-sm border border-border/30"
                    style={{ backgroundColor: intensity > 0 ? `hsla(var(--primary), ${intensity * 0.7 + 0.1})` : undefined }}
                    title={`${d.day}: ${d.sessions} Sessions, ${formatDuration(totalSec)}`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-serif font-semibold text-sm mb-3">Session-Timeline</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {data.sessions?.slice(0, 50).map((session: any) => (
              <div key={session.id} className="border border-border/50 rounded-lg overflow-hidden" data-testid={`session-${session.id}`}>
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedSession === session.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <div>
                      <span className="text-xs font-medium">
                        {new Date(session.startedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        {" "}
                        {new Date(session.startedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDuration(getDurationSec(session))} · {session.pageCount || 0} Seiten
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {session.entryPage && <Badge variant="outline" className="text-[10px]">{session.entryPage}</Badge>}
                  </div>
                </div>
                {expandedSession === session.id && session.pageViews?.length > 0 && (
                  <div className="border-t border-border/30 p-3 bg-muted/10">
                    <div className="space-y-1.5">
                      {session.pageViews.map((pv: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground w-12 flex-shrink-0">
                            {new Date(pv.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <span className="font-mono flex-1 truncate">{pv.pagePath}</span>
                          {pv.durationSeconds != null && (
                            <span className="text-muted-foreground flex-shrink-0">{formatDuration(pv.durationSeconds)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {(!data.sessions || data.sessions.length === 0) && (
              <p className="text-center text-muted-foreground text-sm py-4">Keine Sessions vorhanden</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
