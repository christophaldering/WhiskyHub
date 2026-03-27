import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useInputFocused } from "@/hooks/use-input-focused";
import type { Tasting, Whisky } from "@shared/schema";

interface RevealViewProps {
  whisky: Whisky;
  tasting: Tasting;
}

export function RevealView({ whisky, tasting }: RevealViewProps) {
  const { t } = useTranslation();
  const inputFocused = useInputFocused();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", tasting.id],
    queryFn: () => tastingApi.getAnalytics(tasting.id),
    enabled: tasting.status === "reveal" || tasting.status === "archived",
    refetchInterval: inputFocused ? false : 5000,
  });

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground font-serif italic">Loading analytics...</p>
      </div>
    );
  }

  const whiskyData = analytics.whiskyAnalytics?.find((w: any) => w.whisky.id === whisky.id);
  const currentAct = tasting.currentAct || "act1";

  const Act1 = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary" />
          <circle
            cx="96" cy="96" r="88"
            stroke="currentColor" strokeWidth="8" fill="transparent"
            strokeDasharray={2 * Math.PI * 88}
            strokeDashoffset={2 * Math.PI * 88 * (1 - (analytics.participantCount / Math.max(analytics.participantCount, 1)))}
            className="text-primary transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-mono font-bold text-primary">{analytics.participantCount}</span>
          <span className="text-sm text-muted-foreground uppercase tracking-widest">evaluated</span>
        </div>
      </div>
      <h3 className="text-2xl font-serif text-center text-primary">{t('reveal.act1')}</h3>
      <p className="text-muted-foreground text-center max-w-md font-serif italic">
        {analytics.totalRatings} evaluations submitted across {analytics.whiskyAnalytics?.length} expressions.
      </p>
    </div>
  );

  const Act2 = () => {
    if (!whiskyData) return <p>No data available.</p>;

    const scale = tasting?.ratingScale || 100;
    const radarData = [
      { subject: t('evaluation.nose'), A: whiskyData.categories.nose, fullMark: scale },
      { subject: t('evaluation.taste'), A: whiskyData.categories.taste, fullMark: scale },
      { subject: t('evaluation.finish'), A: whiskyData.categories.finish, fullMark: scale },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[400px]">
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-primary text-center">{t('reveal.consensus')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            <div className="text-8xl font-serif font-black text-primary tracking-tighter">
              {whiskyData.avg}
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <div className="text-center">
                <div className="font-mono font-bold text-lg text-foreground">{whiskyData.median}</div>
                <div className="text-xs uppercase tracking-widest">Median</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-lg text-foreground">{whiskyData.stdDev}</div>
                <div className="text-xs uppercase tracking-widest">Std Dev</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-lg text-foreground">{whiskyData.count}</div>
                <div className="text-xs uppercase tracking-widest">Votes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/20 border-border/50">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-primary">Profile</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontFamily: "var(--font-serif)" }} />
                <PolarRadiusAxis angle={30} domain={[0, scale]} stroke="transparent" />
                <Radar name={whisky.name} dataKey="A" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.3} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const Act3 = () => {
    if (!whiskyData) return <p>No data.</p>;
    const w = whiskyData.whisky;
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-primary">{t('reveal.act3')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {[
            { label: t('taxonomy.category'), value: w.category },
            { label: t('taxonomy.region'), value: w.region },
            { label: t('taxonomy.cask'), value: w.caskInfluence },
            { label: t('taxonomy.abv'), value: w.abvBand },
            { label: t('taxonomy.age'), value: w.ageBand },
            { label: t('taxonomy.peat'), value: w.peatLevel },
          ].map((item, i) => (
            <div key={i} className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{item.label}</span>
              <div className="font-serif text-xl">{item.value || "—"}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const Act4 = () => {
    const ranking = analytics.ranking || [];
    return (
      <div className="flex flex-col items-center min-h-[400px] space-y-8">
        <h3 className="text-3xl font-serif text-primary mb-4">{t('reveal.act4')}</h3>
        <div className="w-full max-w-2xl space-y-3">
          {ranking.map((item: any, idx: number) => (
            <div key={item.whisky.id} className={cn(
              "flex items-center p-4 rounded-lg border transition-all",
              idx === 0 ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border/50"
            )}>
              <div className="font-mono text-2xl font-bold w-12 opacity-50">#{idx + 1}</div>
              <div className="flex-1">
                <div className="font-serif text-lg">{item.whisky.name}</div>
                <div className="text-xs opacity-70">{item.whisky.distillery}</div>
              </div>
              <div className="font-mono font-bold text-xl">{item.avg}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const acts: Record<string, React.FC> = { act1: Act1, act2: Act2, act3: Act3, act4: Act4 };
  const CurrentAct = acts[currentAct] || Act1;

  return (
    <div className="w-full p-4 md:p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAct}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          <CurrentAct />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
