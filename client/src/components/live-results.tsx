import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rating, Whisky, MOCK_RATINGS } from "@/lib/mock-data";
import { useMemo } from "react";

interface LiveResultsProps {
  whisky: Whisky;
}

export function LiveResults({ whisky }: LiveResultsProps) {
  // In a real app, we would fetch live ratings for this whisky
  const ratings = useMemo(() => {
    return MOCK_RATINGS.filter(r => r.whiskyId === whisky.id);
  }, [whisky.id]);

  const averageStats = useMemo(() => {
    if (ratings.length === 0) return [
      { subject: 'Nose', A: 0, fullMark: 10 },
      { subject: 'Taste', A: 0, fullMark: 10 },
      { subject: 'Finish', A: 0, fullMark: 10 },
      { subject: 'Balance', A: 0, fullMark: 10 },
    ];

    const sum = ratings.reduce((acc, curr) => ({
      nose: acc.nose + curr.nose,
      taste: acc.taste + curr.taste,
      finish: acc.finish + curr.finish,
      balance: acc.balance + curr.balance,
    }), { nose: 0, taste: 0, finish: 0, balance: 0 });

    const count = ratings.length;

    return [
      { subject: 'Nose', A: (sum.nose / count).toFixed(1), fullMark: 10 },
      { subject: 'Taste', A: (sum.taste / count).toFixed(1), fullMark: 10 },
      { subject: 'Finish', A: (sum.finish / count).toFixed(1), fullMark: 10 },
      { subject: 'Balance', A: (sum.balance / count).toFixed(1), fullMark: 10 },
    ];
  }, [ratings]);

  const scoreDistribution = useMemo(() => {
    // Generate simple distribution buckets for Overall score
    const buckets = [
      { range: '0-70', count: 0 },
      { range: '71-80', count: 0 },
      { range: '81-90', count: 0 },
      { range: '91-100', count: 0 },
    ];
    
    ratings.forEach(r => {
      if (r.overall <= 70) buckets[0].count++;
      else if (r.overall <= 80) buckets[1].count++;
      else if (r.overall <= 90) buckets[2].count++;
      else buckets[3].count++;
    });
    
    return buckets;
  }, [ratings]);

  const avgOverall = ratings.length > 0 
    ? Math.round(ratings.reduce((acc, curr) => acc + curr.overall, 0) / ratings.length)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-primary">Flavor Profile</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={averageStats}>
              <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontFamily: "var(--font-serif)" }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="transparent" />
              <Radar
                name={whisky.name}
                dataKey="A"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
              />
              <Tooltip 
                 contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card/40 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="font-serif text-lg text-primary">Crowd Consensus</CardTitle>
          <div className="text-3xl font-bold font-mono text-primary">{avgOverall}<span className="text-sm text-muted-foreground ml-1 font-sans font-normal">avg</span></div>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col justify-end">
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} />
              <XAxis dataKey="range" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {scoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(35, 90%, ${30 + index * 10}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center text-xs text-muted-foreground mt-4">Distribution of overall scores</p>
        </CardContent>
      </Card>
      
      <Card className="col-span-1 lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-primary">Latest Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ratings.slice(-3).map((rating, i) => (
               <div key={i} className="p-4 rounded-md bg-white/5 border border-white/5">
                 <div className="flex justify-between items-start mb-2">
                   <span className="font-serif text-primary">User {rating.userId}</span>
                   <span className="font-mono text-sm font-bold bg-primary/20 px-2 py-0.5 rounded text-primary">{rating.overall}</span>
                 </div>
                 <p className="text-sm text-muted-foreground italic">"{rating.notes}"</p>
               </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
