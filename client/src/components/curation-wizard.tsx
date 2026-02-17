import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, ExternalLink, ChevronRight, ChevronLeft, Copy, Check, Lightbulb, Star } from "lucide-react";
import { useAppStore } from "@/lib/store";

const REGION_KEYS = ["islay", "speyside", "highland", "lowland", "campbeltown", "islands", "ireland", "japan", "usa", "world"] as const;
const STYLE_KEYS = ["heavilyPeated", "lightlyPeated", "unpeated", "sherried", "bourbonCask", "wineCask", "exoticCask", "caskStrength", "singleCask"] as const;
const AGE_KEYS = ["nas", "young", "classic", "mature", "oldRare", "mixed"] as const;
const THEME_KEYS = ["region", "distillery", "style", "blind", "age", "cask", "custom"] as const;

const STYLE_API_MAP: Record<string, string> = {
  heavilyPeated: "peated",
  lightlyPeated: "peated",
  unpeated: "unpeated",
  sherried: "sherried",
  bourbonCask: "bourbon",
  wineCask: "wine",
  exoticCask: "exotic",
  caskStrength: "caskStrength",
  singleCask: "singleCask",
};

export function CurationWizard() {
  const { t } = useTranslation();
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({
    theme: "",
    regions: [] as string[],
    styles: [] as string[],
    ageRange: "",
    flightSize: "6",
    budget: "",
    notes: "",
  });

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const reset = () => {
    setStep(0);
    setConfig({ theme: "", regions: [], styles: [], ageRange: "", flightSize: "6", budget: "", notes: "" });
    setCopied(false);
  };

  const regionLabel = (key: string) => t(`curation.regionOpts.${key}` as any);
  const styleLabel = (key: string) => t(`curation.styleOpts.${key}` as any);
  const ageLabel = (key: string) => t(`curation.ageOpts.${key}` as any);
  const themeLabel = (key: string) => t(`curation.themeOpts.${key}` as any);

  const buildSearchQueries = () => {
    const queries: { label: string; url: string }[] = [];
    const base = "https://www.whiskybase.com/search?q=";

    if (config.regions.length > 0) {
      config.regions.forEach(regionKey => {
        const label = regionLabel(regionKey);
        const terms = [label.replace(" / Bourbon", "")];
        if (config.styles.length > 0) terms.push(styleLabel(config.styles[0]));
        queries.push({
          label: `${label} ${config.styles.length > 0 ? styleLabel(config.styles[0]) : ""}`.trim(),
          url: `${base}${encodeURIComponent(terms.join(" "))}`,
        });
      });
    }

    if (config.styles.length > 0 && config.regions.length === 0) {
      config.styles.forEach(styleKey => {
        const label = styleLabel(styleKey);
        queries.push({
          label,
          url: `${base}${encodeURIComponent(label)}`,
        });
      });
    }

    if (queries.length === 0) {
      queries.push({
        label: t("curation.generalSearch"),
        url: `${base}${encodeURIComponent("single malt scotch")}`,
      });
    }

    return queries;
  };

  const buildSummary = () => {
    const parts: string[] = [];
    if (config.theme) parts.push(`${t("curation.theme")}: ${themeLabel(config.theme)}`);
    if (config.regions.length) parts.push(`${t("curation.regions")}: ${config.regions.map(regionLabel).join(", ")}`);
    if (config.styles.length) parts.push(`${t("curation.styles")}: ${config.styles.map(styleLabel).join(", ")}`);
    if (config.ageRange) parts.push(`${t("curation.ageRange")}: ${ageLabel(config.ageRange)}`);
    parts.push(`${t("curation.flightSize")}: ${config.flightSize} ${t("curation.expressions")}`);
    if (config.budget) parts.push(`${t("curation.budget")}: ${config.budget}`);
    if (config.notes) parts.push(`${t("curation.notes")}: ${config.notes}`);
    return parts.join("\n");
  };

  const curatorTips = [
    { title: t("curation.tipRegionalTitle"), desc: t("curation.tipRegionalDesc") },
    { title: t("curation.tipAgeTitle"), desc: t("curation.tipAgeDesc") },
    { title: t("curation.tipCaskTitle"), desc: t("curation.tipCaskDesc") },
    { title: t("curation.tipContrastTitle"), desc: t("curation.tipContrastDesc") },
  ];

  const regionsParam = config.regions.join(",");
  const stylesParam = Array.from(new Set(config.styles.map((s) => STYLE_API_MAP[s] || s))).join(",");

  const { data: matchedWhiskies, isLoading: suggestionsLoading } = useQuery<any[]>({
    queryKey: ["curation-suggestions", currentParticipant?.id, regionsParam, stylesParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentParticipant?.id) params.set("participantId", currentParticipant.id);
      if (regionsParam) params.set("regions", regionsParam);
      if (stylesParam) params.set("styles", stylesParam);
      const res = await fetch(`/api/curation/suggestions?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.suggestions || [];
    },
    enabled: open && step >= 3 && !!currentParticipant?.id && (config.regions.length > 0 || config.styles.length > 0),
  });

  const steps = [
    <div key="theme" className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("curation.step1Desc")}</p>
      <div className="grid grid-cols-2 gap-2">
        {THEME_KEYS.map(key => (
          <Button
            key={key}
            variant={config.theme === key ? "default" : "outline"}
            size="sm"
            className="justify-start text-xs h-auto py-2"
            onClick={() => setConfig(p => ({ ...p, theme: key }))}
            data-testid={`btn-theme-${key}`}
          >
            {themeLabel(key)}
          </Button>
        ))}
      </div>
    </div>,

    <div key="region" className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("curation.step2Desc")}</p>
      <div className="flex flex-wrap gap-2">
        {REGION_KEYS.map(key => (
          <Badge
            key={key}
            variant={config.regions.includes(key) ? "default" : "outline"}
            className="cursor-pointer text-xs py-1 px-3"
            onClick={() => setConfig(p => ({ ...p, regions: toggleArray(p.regions, key) }))}
            data-testid={`badge-region-${key}`}
          >
            {regionLabel(key)}
          </Badge>
        ))}
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t("curation.styleLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {STYLE_KEYS.map(key => (
            <Badge
              key={key}
              variant={config.styles.includes(key) ? "default" : "outline"}
              className="cursor-pointer text-xs py-1 px-3"
              onClick={() => setConfig(p => ({ ...p, styles: toggleArray(p.styles, key) }))}
              data-testid={`badge-style-${key}`}
            >
              {styleLabel(key)}
            </Badge>
          ))}
        </div>
      </div>
    </div>,

    <div key="details" className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t("curation.ageRangeLabel")}</Label>
        <Select value={config.ageRange} onValueChange={(v) => setConfig(p => ({ ...p, ageRange: v }))}>
          <SelectTrigger data-testid="select-age-range"><SelectValue placeholder={t("curation.selectAge")} /></SelectTrigger>
          <SelectContent>
            {AGE_KEYS.map(key => <SelectItem key={key} value={key}>{ageLabel(key)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("curation.flightSizeLabel")}</Label>
          <Select value={config.flightSize} onValueChange={(v) => setConfig(p => ({ ...p, flightSize: v }))}>
            <SelectTrigger data-testid="select-flight-size"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["3", "4", "5", "6", "7", "8", "10", "12"].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("curation.budgetLabel")}</Label>
          <Select value={config.budget} onValueChange={(v) => setConfig(p => ({ ...p, budget: v }))}>
            <SelectTrigger data-testid="select-budget"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t("curation.budgetLow")}</SelectItem>
              <SelectItem value="medium">{t("curation.budgetMedium")}</SelectItem>
              <SelectItem value="high">{t("curation.budgetHigh")}</SelectItem>
              <SelectItem value="premium">{t("curation.budgetPremium")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t("curation.notesLabel")}</Label>
        <Textarea
          value={config.notes}
          onChange={(e) => setConfig(p => ({ ...p, notes: e.target.value }))}
          placeholder={t("curation.notesPlaceholder")}
          rows={3}
          data-testid="textarea-curation-notes"
        />
      </div>
    </div>,

    <div key="suggestions" className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("curation.suggestionsDesc")}</p>
      {suggestionsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !matchedWhiskies || matchedWhiskies.length === 0 ? (
        <div className="bg-secondary/30 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">{t("curation.noSuggestions")}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs" data-testid="badge-match-count">
              {matchedWhiskies.length} {t("curation.matchCount")}
            </Badge>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {matchedWhiskies.map((w: any, i: number) => (
              <div
                key={w.id || i}
                className="bg-secondary/20 rounded-lg p-3 space-y-1 border border-border/20"
                data-testid={`card-suggestion-${w.id || i}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{w.name}</p>
                    {w.distillery && (
                      <p className="text-xs text-muted-foreground">{w.distillery}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {w.avgScore != null && Number(w.avgScore) > 8 && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-0.5" data-testid={`badge-top-rated-${w.id || i}`}>
                        <Star className="w-3 h-3" />
                        {t("curation.topRated")}
                      </Badge>
                    )}
                    <a
                      href={`https://www.whiskybase.com/search?q=${encodeURIComponent(w.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid={`link-wb-suggestion-${w.id || i}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {w.avgScore != null && (
                    <span data-testid={`text-avg-score-${w.id || i}`}>
                      {t("curation.avgRating")} {Number(w.avgScore).toFixed(1)}
                    </span>
                  )}
                  {w.ratingCount != null && (
                    <span>
                      {w.ratingCount} {t("curation.ratings")}
                    </span>
                  )}
                  {w.tastingTitle && (
                    <span className="truncate max-w-[200px]">
                      {t("curation.fromTasting")} {w.tastingTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground italic mt-2">{t("curation.suggestionsHint")}</p>
    </div>,

    <div key="result" className="space-y-5">
      <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("curation.yourPlan")}</p>
        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{buildSummary()}</pre>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs mt-2"
          onClick={() => {
            navigator.clipboard.writeText(buildSummary());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          data-testid="btn-copy-plan"
        >
          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? t("curation.copied") : t("curation.copyPlan")}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("curation.searchWhiskybase")}</p>
        <div className="space-y-2">
          {buildSearchQueries().map((q, i) => (
            <a
              key={i}
              href={q.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
              data-testid={`link-wb-search-${i}`}
            >
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              {q.label}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("curation.tips")}</p>
        </div>
        {curatorTips.map((s, i) => (
          <div key={i} className="bg-primary/5 rounded-md p-3">
            <p className="text-xs font-semibold text-primary">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>,
  ];

  const stepLabels = [
    t("curation.stepTheme"),
    t("curation.stepFocus"),
    t("curation.stepDetails"),
    t("curation.stepSuggestions"),
    t("curation.stepResult"),
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-curation-wizard">
          <Wand2 className="w-4 h-4 mr-1" /> {t("curation.planTasting")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{t("curation.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4 font-medium">
          {step + 1}/{stepLabels.length}: {stepLabels[step]}
        </p>

        {steps[step]}

        <div className="flex justify-between mt-6 pt-4 border-t border-border/30">
          <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {t("curation.back")}
          </Button>
          {step < steps.length - 1 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} data-testid="btn-curation-next">
              {t("curation.next")} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => { setOpen(false); reset(); }} data-testid="btn-curation-done">
              {t("curation.done")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
