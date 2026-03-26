import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, Users, Clock, TrendingUp, Activity, Download, FileText,
  ChevronDown, ChevronRight, ArrowLeft, Eye, LogOut, UserPlus,
  Target, Loader2, Calendar
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area
} from "recharts";

interface AnalyticsDashboardProps {
  currentParticipantId: string;
}

const PERIOD_OPTIONS = [
  { value: "1", label: "24h" },
  { value: "7", label: "7 Tage" },
  { value: "30", label: "30 Tage" },
  { value: "90", label: "90 Tage" },
  { value: "0", label: "Gesamt" },
];

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
    queryKey: ["/admin/analytics/funnels", currentParticipantId],
    queryFn: () => adminApi.getAnalyticsFunnels(currentParticipantId),
    enabled: !!currentParticipantId && activeSection === "funnels",
  });

  const { data: retentionData, isLoading: loadingRetention } = useQuery({
    queryKey: ["/admin/analytics/retention", currentParticipantId],
    queryFn: () => adminApi.getAnalyticsRetention(currentParticipantId),
    enabled: !!currentParticipantId && activeSection === "retention",
  });

  const { data: userDeepDive, isLoading: loadingDeepDive } = useQuery({
    queryKey: ["/admin/analytics/user-deep-dive", currentParticipantId, selectedUserId],
    queryFn: () => adminApi.getUserDeepDive(currentParticipantId, selectedUserId!),
    enabled: !!currentParticipantId && !!selectedUserId,
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
    { id: "overview", label: "Overview" },
    { id: "pages", label: "Seiten & Navigation" },
    { id: "engagement", label: "Nutzer-Engagement" },
    { id: "funnels", label: "Funnel-Analyse" },
    { id: "retention", label: "Retention" },
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
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleCsvExport("engagement")} data-testid="button-export-csv">
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdfExport} data-testid="button-export-pdf">
            <FileText className="w-3.5 h-3.5 mr-1" /> Report
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

          {activeSection === "funnels" && (
            <FunnelSection data={funnelData} loading={loadingFunnels} />
          )}

          {activeSection === "retention" && (
            <RetentionSection data={retentionData} loading={loadingRetention} />
          )}
        </>
      )}
    </div>
  );
}

function OverviewSection({ dashboard, pageViewData, loadingPageViews }: { dashboard: any; pageViewData: any; loadingPageViews: boolean }) {
  const kpis = dashboard?.kpis || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" data-testid="kpi-cards">
        <KpiCard icon={Users} label="DAU" value={kpis.activeToday || 0} sub="Heute aktiv" color="text-green-500" />
        <KpiCard icon={Users} label="WAU" value={kpis.active7d || 0} sub="7 Tage" color="text-blue-500" />
        <KpiCard icon={Users} label="MAU" value={kpis.active30d || 0} sub="30 Tage" color="text-purple-500" />
        <KpiCard icon={Clock} label="Ø Verweildauer" value={`${kpis.avgDuration || 0}m`} sub="pro Session" />
        <KpiCard icon={UserPlus} label="Neue Nutzer" value={kpis.newUsersWeek || 0} sub="letzte 7 Tage" color="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon={Activity} label="Sessions" value={kpis.totalSessions || 0} />
        <KpiCard icon={Target} label="Conversion" value={`${kpis.conversionRate || 0}%`} sub={`${kpis.acceptedInvites || 0}/${kpis.totalInvites || 0} Einladungen`} />
        <KpiCard icon={TrendingUp} label="Ø Seiten/Session" value={dashboard?.engagementTable?.length > 0 ? Math.round((dashboard.engagementTable.reduce((s: number, e: any) => s + (e.sessionCount || 0), 0) / dashboard.engagementTable.length) || 0) : 0} />
      </div>

      {dashboard?.dauSeries?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> DAU/WAU Trend
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
              <UserPlus className="w-4 h-4 text-amber-500" /> Registrierungen
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
              <Eye className="w-4 h-4 text-blue-500" /> Top Seiten
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
              <Target className="w-4 h-4 text-green-500" /> Einladungs-Conversion
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Verschickt</span>
                  <span className="font-bold">{dashboard.inviteConversion.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Angenommen</span>
                  <span className="font-bold text-green-600">{dashboard.inviteConversion.accepted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conversion Rate</span>
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
            <h3 className="font-serif font-semibold text-sm mb-3">Meistbesuchte Seiten</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-2">Seite</th>
                    <th className="text-center py-2 px-2">Aufrufe</th>
                    <th className="text-center py-2 px-2">Nutzer</th>
                    <th className="text-center py-2 px-2">Ø Dauer</th>
                  </tr>
                </thead>
                <tbody>
                  {pageViewData.topPages.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-muted/30" data-testid={`top-page-row-${i}`}>
                      <td className="py-2 pr-2 font-mono text-xs">{p.page}</td>
                      <td className="text-center py-2 px-2 font-bold">{p.views}</td>
                      <td className="text-center py-2 px-2">{p.uniqueUsers}</td>
                      <td className="text-center py-2 px-2">{p.avgDuration}s</td>
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
              <Clock className="w-4 h-4" /> Verweildauer pro Seite
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(200, pageViewData.dwellTime.length * 28)}>
              <BarChart data={pageViewData.dwellTime.slice(0, 15)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} label={{ value: "Sekunden", position: "bottom", fontSize: 10 }} />
                <YAxis type="category" dataKey="page" tick={{ fontSize: 9 }} width={140} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [`${v}s`, "Ø Verweildauer"]} />
                <Bar dataKey="avgSeconds" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} name="Ø Sekunden" />
              </BarChart>
            </ResponsiveContainer>
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
                  <SortHeader field="sessionCount">Sessions</SortHeader>
                  <SortHeader field="totalDuration">Gesamt</SortHeader>
                  <SortHeader field="avgDuration">Ø Min</SortHeader>
                  <SortHeader field="ratingCount">Ratings</SortHeader>
                  <th className="py-2 px-2 text-center">Letzte Aktivität</th>
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
                    <td className="text-center py-2 px-2 font-bold">{u.totalDuration}m</td>
                    <td className="text-center py-2 px-2">{u.avgDuration}m</td>
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

function RetentionSection({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data?.cohorts?.length) return <p className="text-center text-muted-foreground py-8">Keine Retention-Daten</p>;

  const maxWeek = Math.max(...data.cohorts.flatMap((c: any) => Object.keys(c.weeks).map(Number)), 0);
  const weekHeaders = Array.from({ length: Math.min(maxWeek + 1, 13) }, (_, i) => i);

  return (
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
                  <td className="text-center py-1.5 px-1 font-bold">{cohort.cohortSize}</td>
                  {weekHeaders.map(w => {
                    const retained = cohort.weeks[w] ?? 0;
                    const pct = cohort.cohortSize > 0 ? Math.round((retained / cohort.cohortSize) * 100) : 0;
                    const intensity = Math.min(pct / 100, 1);
                    return (
                      <td
                        key={w}
                        className="text-center py-1.5 px-1"
                        style={{
                          backgroundColor: pct > 0 ? `hsla(var(--primary), ${intensity * 0.4 + 0.05})` : undefined,
                        }}
                      >
                        {retained > 0 ? `${pct}%` : "-"}
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
        <KpiCard icon={Clock} label="Gesamtdauer" value={`${stats.totalDuration}m`} />
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
                const intensity = Math.min((d.totalMinutes || 0) / 30, 1);
                return (
                  <div
                    key={d.day}
                    className="w-3 h-3 rounded-sm border border-border/30"
                    style={{ backgroundColor: intensity > 0 ? `hsla(var(--primary), ${intensity * 0.7 + 0.1})` : undefined }}
                    title={`${d.day}: ${d.sessions} Sessions, ${d.totalMinutes}min`}
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
                        {session.durationMinutes}min · {session.pageCount || 0} Seiten
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
                            <span className="text-muted-foreground flex-shrink-0">{pv.durationSeconds}s</span>
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
