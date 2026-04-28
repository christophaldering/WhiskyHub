import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { ShieldAlert, ChevronLeft, ChevronRight, Sparkles, Camera, Upload, Check, X, Loader2 } from "lucide-react";
import {
  getTastingStory,
  startTastingStoryWizard,
  pollTastingStoryWizard,
  suggestTastingStoryHeadline,
  type TastingStoryResponse,
  type WizardGenerateInput,
  type WizardProgressResponse,
  type WizardStep,
  type WizardTone,
} from "@/lib/tastingStoryApi";
import { getTastingStoryData, createTastingStoryImagePoolEntry, type TastingStoryDataResponse, type TastingStoryImageItem } from "@/lib/tastingStoryDataApi";
import { pidHeaders } from "@/lib/api";
import { TastingStoryDataProvider } from "@/storybuilder/data/TastingStoryDataContext";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import { StoryImagePool } from "@/storybuilder/editor/StoryImagePool";
import type { StoryBlock, StoryDocument } from "@/storybuilder/core/types";

const ACCENT = "#C9A961";
const ACCENT_DIM = "rgba(201,169,97,0.25)";

type Props = { id: string };

type Stage = "intro" | "questions" | "generating" | "preview" | "error";

type WizardState = {
  tone: WizardTone | null;
  headlineOverride: string;
  subtitleOverride: string;
  heroImageUrl: string;
  galleryImageUrls: string[];
  imageCategories: Record<string, string[]>;
  customCategories: string[];
  spotlightParticipantIds: string[];
  highlightContext: string;
  detailPrompt: string;
};

const PHOTO_CATEGORY_HERO = "Hero";
const PHOTO_CATEGORY_GALLERY = "Galerie";
const PHOTO_CATEGORY_PARTICIPANT = "Teilnehmer";
const PHOTO_CATEGORY_GROUP = "Gruppenbild";
const PHOTO_CATEGORY_MOOD = "Szene & Stimmung";
const PHOTO_CATEGORY_WHISKY_SETUP = "Whisky/Setup";

const BUILTIN_PHOTO_CATEGORIES: string[] = [
  PHOTO_CATEGORY_HERO,
  PHOTO_CATEGORY_GALLERY,
  PHOTO_CATEGORY_PARTICIPANT,
  PHOTO_CATEGORY_GROUP,
  PHOTO_CATEGORY_MOOD,
  PHOTO_CATEGORY_WHISKY_SETUP,
];

function categoryTestId(cat: string): string {
  return cat
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "custom";
}

const TONE_OPTIONS: Array<{ value: WizardTone; label: string; hint: string }> = [
  { value: "festive", label: "Festlich", hint: "Feierlich, warm, einladend" },
  { value: "casual", label: "Locker", hint: "Freundschaftlich, nahbar" },
  { value: "analytical", label: "Analytisch", hint: "Praezise, sensorisch" },
  { value: "poetic", label: "Poetisch", hint: "Sinnlich, bildhaft" },
];

const STORAGE_KEY_PREFIX = "tasting-story-wizard:";

function loadFromSession(tastingId: string): WizardState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + tastingId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    const heroImageUrl = typeof parsed.heroImageUrl === "string" ? parsed.heroImageUrl : "";
    const galleryImageUrls = Array.isArray(parsed.galleryImageUrls)
      ? parsed.galleryImageUrls.filter((u): u is string => typeof u === "string")
      : [];
    let imageCategories: Record<string, string[]> = {};
    if (parsed.imageCategories && typeof parsed.imageCategories === "object" && !Array.isArray(parsed.imageCategories)) {
      for (const [url, cats] of Object.entries(parsed.imageCategories as Record<string, unknown>)) {
        if (typeof url !== "string" || !url) continue;
        if (!Array.isArray(cats)) continue;
        const cleaned = cats.filter((c): c is string => typeof c === "string" && c.length > 0).slice(0, 10);
        imageCategories[url] = cleaned;
      }
    }
    if (Object.keys(imageCategories).length === 0) {
      const migrated: Record<string, string[]> = {};
      if (heroImageUrl) migrated[heroImageUrl] = [PHOTO_CATEGORY_HERO];
      for (const url of galleryImageUrls) {
        if (!url) continue;
        const existing = migrated[url] ?? [];
        if (!existing.includes(PHOTO_CATEGORY_GALLERY)) existing.push(PHOTO_CATEGORY_GALLERY);
        migrated[url] = existing;
      }
      imageCategories = migrated;
    } else {
      let heroSeen = false;
      for (const [url, cats] of Object.entries(imageCategories)) {
        if (!cats.includes(PHOTO_CATEGORY_HERO)) continue;
        if (!heroSeen) {
          heroSeen = true;
          continue;
        }
        imageCategories[url] = cats.filter((c) => c !== PHOTO_CATEGORY_HERO);
      }
    }
    const customCategoriesRaw = Array.isArray(parsed.customCategories)
      ? parsed.customCategories.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      : [];
    const customCategories = Array.from(new Set(customCategoriesRaw.map((c) => c.trim()))).slice(0, 12);
    return {
      tone: (parsed.tone as WizardTone) ?? null,
      headlineOverride: typeof parsed.headlineOverride === "string" ? parsed.headlineOverride : "",
      subtitleOverride: typeof parsed.subtitleOverride === "string" ? parsed.subtitleOverride : "",
      heroImageUrl,
      galleryImageUrls,
      imageCategories,
      customCategories,
      spotlightParticipantIds: Array.isArray(parsed.spotlightParticipantIds) ? parsed.spotlightParticipantIds.filter((u): u is string => typeof u === "string") : [],
      highlightContext: typeof parsed.highlightContext === "string" ? parsed.highlightContext : "",
      detailPrompt: typeof parsed.detailPrompt === "string" ? parsed.detailPrompt : "",
    };
  } catch {
    return null;
  }
}

function persistToSession(tastingId: string, state: WizardState) {
  try {
    sessionStorage.setItem(STORAGE_KEY_PREFIX + tastingId, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function clearFromSession(tastingId: string) {
  try {
    sessionStorage.removeItem(STORAGE_KEY_PREFIX + tastingId);
  } catch {
    /* ignore */
  }
}

export default function LabsTastingStoryWizardPage({ id }: Props) {
  const { currentParticipant } = useAppStore();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const initialWizardState = useMemo<WizardState>(() => {
    const stored = loadFromSession(id);
    return (
      stored ?? {
        tone: null,
        headlineOverride: "",
        subtitleOverride: "",
        heroImageUrl: "",
        galleryImageUrls: [],
        imageCategories: {},
        customCategories: [],
        spotlightParticipantIds: [],
        highlightContext: "",
        detailPrompt: "",
      }
    );
  }, [id]);

  const [state, setState] = useState<WizardState>(initialWizardState);
  const [stage, setStage] = useState<Stage>("intro");
  const [questionStep, setQuestionStep] = useState(0);
  const [overwriteAck, setOverwriteAck] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<WizardProgressResponse | null>(null);
  const [previewBlocks, setPreviewBlocks] = useState<StoryBlock[] | null>(null);
  const [publishing, setPublishing] = useState(false);

  const story = useQuery<TastingStoryResponse>({
    queryKey: ["/api/tasting-stories", id],
    queryFn: () => getTastingStory(id),
    enabled: !!id && !!currentParticipant?.id,
  });

  const storyData = useQuery<TastingStoryDataResponse>({
    queryKey: ["/api/tasting-stories", id, "data"],
    queryFn: () => getTastingStoryData(id),
    enabled: !!id && !!currentParticipant?.id,
  });

  useEffect(() => {
    persistToSession(id, state);
  }, [id, state]);

  const hasExistingStory = !!story.data && (story.data.document.blocks?.length ?? 0) > 0;

  useEffect(() => {
    if (hasExistingStory) {
      setStage((s) => (s === "intro" ? "intro" : s));
    }
  }, [hasExistingStory]);

  const photoOptions = useMemo(() => {
    const urls = new Set<string>();
    const out: Array<{ url: string; label: string }> = [];
    const meta = story.data?.tasting;
    if (meta?.coverImageUrl) {
      urls.add(meta.coverImageUrl);
      out.push({ url: meta.coverImageUrl, label: "Cover" });
    }
    for (const w of storyData.data?.whiskies ?? []) {
      if (w.imageUrl && !urls.has(w.imageUrl)) {
        urls.add(w.imageUrl);
        out.push({ url: w.imageUrl, label: w.name });
      }
    }
    for (const ph of storyData.data?.eventPhotos ?? []) {
      if (ph.url && !urls.has(ph.url)) {
        urls.add(ph.url);
        out.push({ url: ph.url, label: ph.caption ?? "Foto" });
      }
    }
    return out;
  }, [story.data?.tasting, storyData.data]);

  const participants = storyData.data?.participants ?? [];

  // --- Polling effect ---
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (!jobId || stage !== "generating") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await pollTastingStoryWizard(id, jobId);
        if (cancelled) return;
        setProgress(next);
        if (next.status === "done") {
          setPreviewBlocks(next.blocks ?? []);
          qc.invalidateQueries({ queryKey: ["/api/tasting-stories", id] });
          setStage("preview");
          return;
        }
        if (next.status === "error") {
          setErrorMessage(next.error ?? "Generierung fehlgeschlagen");
          setStage("error");
          return;
        }
        pollRef.current = window.setTimeout(tick, 800);
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : "Status-Abfrage fehlgeschlagen");
        setStage("error");
      }
    };
    pollRef.current = window.setTimeout(tick, 400);
    return () => {
      cancelled = true;
      if (pollRef.current) {
        window.clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobId, stage, id, qc]);

  const handleStart = useCallback(async () => {
    setErrorMessage(null);
    try {
      const categorizedPhotos = Object.entries(state.imageCategories)
        .map(([url, categories]) => ({
          url: url.trim(),
          categories: Array.from(new Set((categories ?? []).filter((c) => typeof c === "string" && c.length > 0))),
        }))
        .filter((p) => p.url.length > 0 && p.categories.length > 0);
      const heroEntry = categorizedPhotos.find((p) => p.categories.includes(PHOTO_CATEGORY_HERO));
      const derivedHero = heroEntry?.url ?? state.heroImageUrl.trim();
      const galleryFromCategories = Array.from(
        new Set(categorizedPhotos.filter((p) => p.url !== heroEntry?.url).map((p) => p.url)),
      );
      const galleryUrls = categorizedPhotos.length > 0
        ? galleryFromCategories
        : state.galleryImageUrls.filter((u) => u.trim().length > 0);
      const input: WizardGenerateInput = {
        tone: state.tone,
        headlineOverride: state.headlineOverride.trim() || null,
        subtitleOverride: state.subtitleOverride.trim() || null,
        heroImageUrl: derivedHero || null,
        galleryImageUrls: galleryUrls,
        categorizedPhotos: categorizedPhotos.length > 0 ? categorizedPhotos : undefined,
        spotlightParticipantIds: state.spotlightParticipantIds,
        highlightContext: state.highlightContext.trim() || null,
        detailPrompt: state.detailPrompt.trim() || null,
        overwriteExisting: hasExistingStory && overwriteAck,
      };
      setStage("generating");
      const start = await startTastingStoryWizard(id, input);
      setJobId(start.jobId);
      setProgress({
        jobId: start.jobId,
        status: "running",
        currentStepKey: null,
        completedSteps: 0,
        totalSteps: start.steps.length,
        steps: start.steps,
        error: null,
        blocks: null,
      });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Wizard konnte nicht gestartet werden");
      setStage("error");
    }
  }, [id, state, hasExistingStory, overwriteAck]);

  const handlePublish = useCallback(async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/tastings/${encodeURIComponent(id)}/story-enabled`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-participant-id": currentParticipant?.id ?? "" },
        body: JSON.stringify({ storyEnabled: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Veroeffentlichen fehlgeschlagen");
      }
      qc.invalidateQueries({ queryKey: ["/api/tasting-stories", id] });
      clearFromSession(id);
      navigate(`/tasting-story/${id}`);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Veroeffentlichen fehlgeschlagen");
    } finally {
      setPublishing(false);
    }
  }, [publishing, id, currentParticipant?.id, qc, navigate]);

  if (!currentParticipant?.id) {
    return (
      <FullPageNotice testId="wizard-no-access" icon={<ShieldAlert style={{ width: 24, height: 24, color: ACCENT }} />}>
        Anmeldung erforderlich.
      </FullPageNotice>
    );
  }

  if (story.isLoading) {
    return (
      <FullPageNotice testId="wizard-loading">
        Lade Tasting-Daten…
      </FullPageNotice>
    );
  }

  if (story.isError || !story.data) {
    return (
      <FullPageNotice testId="wizard-error">
        Tasting konnte nicht geladen werden.
        <div style={{ marginTop: 12 }}>
          <Link href={`/labs/tastings/${id}`} style={{ color: ACCENT, textDecoration: "underline" }}>← Zur Verkostung</Link>
        </div>
      </FullPageNotice>
    );
  }

  if (!story.data.canEdit) {
    return (
      <FullPageNotice testId="wizard-forbidden" icon={<ShieldAlert style={{ width: 24, height: 24, color: ACCENT }} />}>
        Diese Story kann nur vom Host oder einem Admin bearbeitet werden.
      </FullPageNotice>
    );
  }

  return (
    <div
      data-testid="page-tasting-story-wizard"
      style={{
        minHeight: "100vh",
        background: "#0B0906",
        color: "#F5EDE0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: `1px solid ${ACCENT_DIM}`,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
          <Link
            href={`/labs/tastings/${id}`}
            data-testid="link-wizard-back"
            style={{ color: "#A89A85", textDecoration: "none", fontSize: 12, letterSpacing: ".15em", textTransform: "uppercase" }}
          >
            ← Verkostung
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: ".25em", textTransform: "uppercase", color: ACCENT }}>
              Tasting-Story Wizard
            </div>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, color: "#F5EDE0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-testid="text-wizard-title">
              {story.data.tasting.title}
            </div>
          </div>
        </div>
        <Link
          href={`/labs/tastings/${id}/story-editor`}
          data-testid="link-advanced-edit"
          style={secondaryLinkStyle}
        >
          Erweiterte Bearbeitung →
        </Link>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          data-testid="wizard-error-banner"
          style={{ background: "rgba(217,119,87,0.1)", color: "#d97757", padding: "8px 24px", fontSize: 12, borderBottom: "1px solid rgba(217,119,87,0.3)" }}
        >
          {errorMessage}
        </div>
      ) : null}

      {stage === "intro" ? (
        <IntroStage
          summary={{
            whiskyCount: storyData.data?.whiskies.length ?? 0,
            participantCount: storyData.data?.participants.length ?? 0,
            winnerName: storyData.data?.winner?.name ?? null,
            blindMode: !!story.data.tasting && (storyData.data?.blindResults?.length ?? 0) > 0,
            photoCount: storyData.data?.eventPhotos.length ?? 0,
          }}
          hasExistingStory={hasExistingStory}
          overwriteAck={overwriteAck}
          onOverwrite={() => {
            setOverwriteAck(true);
            setStage("questions");
            setQuestionStep(0);
          }}
          onJumpToEditor={() => navigate(`/labs/tastings/${id}/story-editor`)}
          onStart={() => {
            setStage("questions");
            setQuestionStep(0);
          }}
        />
      ) : null}

      {stage === "questions" ? (
        <QuestionsStage
          id={id}
          state={state}
          setState={setState}
          step={questionStep}
          setStep={setQuestionStep}
          photoOptions={photoOptions}
          participants={participants}
          onSubmit={handleStart}
        />
      ) : null}

      {stage === "generating" ? (
        <GeneratingStage progress={progress} />
      ) : null}

      {stage === "preview" ? (
        <PreviewStage
          tastingId={id}
          blocks={previewBlocks ?? []}
          storyData={storyData.data ?? null}
          publishing={publishing}
          onPublish={handlePublish}
          onRegen={() => {
            setStage("questions");
            setQuestionStep(0);
            setProgress(null);
            setJobId(null);
            setPreviewBlocks(null);
          }}
          onOpenEditor={() => navigate(`/labs/tastings/${id}/story-editor`)}
        />
      ) : null}

      {stage === "error" ? (
        <FullPageNotice testId="wizard-stage-error">
          {errorMessage ?? "Etwas ist schief gelaufen."}
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" style={primaryButtonStyle} onClick={() => setStage("questions")} data-testid="button-wizard-retry">
              Nochmal versuchen
            </button>
            <button type="button" style={ghostButtonStyle} onClick={() => navigate(`/labs/tastings/${id}/story-editor`)} data-testid="button-wizard-fallback-editor">
              Direkt zum Editor
            </button>
          </div>
        </FullPageNotice>
      ) : null}
    </div>
  );
}

// ---------- Intro stage ----------
function IntroStage({
  summary,
  hasExistingStory,
  overwriteAck,
  onOverwrite,
  onJumpToEditor,
  onStart,
}: {
  summary: { whiskyCount: number; participantCount: number; winnerName: string | null; blindMode: boolean; photoCount: number };
  hasExistingStory: boolean;
  overwriteAck: boolean;
  onOverwrite: () => void;
  onJumpToEditor: () => void;
  onStart: () => void;
}) {
  return (
    <div style={pageContainerStyle} data-testid="wizard-stage-intro">
      <h1 style={pageTitleStyle}>Lass uns deine Tasting-Story bauen</h1>
      <p style={leadStyle}>
        Wir haben deine Verkostung schon ausgewertet. In ein paar kurzen Fragen baut der Wizard daraus eine vollwertige Story –
        ohne dass du den ganzen Editor anfassen musst.
      </p>

      <div style={summaryGridStyle} data-testid="wizard-auto-summary">
        <SummaryStat value={summary.whiskyCount} label={summary.whiskyCount === 1 ? "Whisky" : "Whiskys"} />
        <SummaryStat value={summary.participantCount} label={summary.participantCount === 1 ? "Teilnehmer" : "Teilnehmer"} />
        {summary.winnerName ? <SummaryStat value="🏆" label={`Sieger: ${summary.winnerName}`} compact /> : null}
        {summary.photoCount > 0 ? <SummaryStat value={summary.photoCount} label={summary.photoCount === 1 ? "Event-Foto" : "Event-Fotos"} /> : null}
        {summary.blindMode ? <SummaryStat value="🎭" label="Blindverkostung" compact /> : null}
      </div>

      {hasExistingStory && !overwriteAck ? (
        <div style={warningCardStyle} data-testid="wizard-overwrite-confirm">
          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 20, color: "#F5EDE0", marginBottom: 8 }}>
            Es gibt bereits eine Story
          </div>
          <p style={{ fontSize: 14, color: "#C9C2B4", marginBottom: 16 }}>
            Wenn du den Wizard erneut startest, wird die bestehende Story durch eine neue Version ersetzt.
            Die alte Version bleibt im Versionsverlauf erhalten.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={primaryButtonStyle} onClick={onOverwrite} data-testid="button-wizard-overwrite">
              Wizard neu starten
            </button>
            <button type="button" style={ghostButtonStyle} onClick={onJumpToEditor} data-testid="button-wizard-jump-editor">
              Direkt zum Editor
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" style={primaryButtonStyle} onClick={onStart} data-testid="button-wizard-start">
            <Sparkles style={{ width: 16, height: 16 }} /> Los gehts
          </button>
          <button type="button" style={ghostButtonStyle} onClick={onJumpToEditor} data-testid="button-wizard-skip-to-editor">
            Lieber im Editor öffnen
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ value, label, compact }: { value: string | number; label: string; compact?: boolean }) {
  return (
    <div style={{ background: "rgba(201,169,97,0.06)", border: `1px solid ${ACCENT_DIM}`, borderRadius: 6, padding: compact ? "12px 14px" : "16px 18px" }}>
      <div style={{ fontFamily: "'EB Garamond', serif", fontSize: compact ? 22 : 30, color: ACCENT, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "#A89A85", marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ---------- Questions stage ----------
function QuestionsStage({
  id,
  state,
  setState,
  step,
  setStep,
  photoOptions,
  participants,
  onSubmit,
}: {
  id: string;
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  step: number;
  setStep: (next: number) => void;
  photoOptions: Array<{ url: string; label: string }>;
  participants: Array<{ id: string; name: string }>;
  onSubmit: () => void;
}) {
  const totalSteps = 6;
  const stepLabels = ["Stimmung", "Headline", "Fotos", "Highlight", "Briefing", "Spotlight"];
  const [stepError, setStepError] = useState<string | null>(null);

  const validateStep = (idx: number): string | null => {
    if (idx === 2) {
      const heroEntries = Object.entries(state.imageCategories).filter(
        ([, cats]) => Array.isArray(cats) && cats.includes(PHOTO_CATEGORY_HERO),
      );
      if (heroEntries.length === 0) {
        return "Bitte markiere genau ein Foto als Hero-Bild.";
      }
      if (heroEntries.length > 1) {
        return "Es darf nur ein Hero-Bild gesetzt sein. Entferne den Hero-Tag bei den anderen Fotos.";
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step + 1 < totalSteps) setStep(step + 1);
    else onSubmit();
  };
  const goPrev = () => {
    setStepError(null);
    if (step > 0) setStep(step - 1);
  };

  return (
    <div style={pageContainerStyle} data-testid="wizard-stage-questions">
      <ProgressBar step={step} total={totalSteps} labels={stepLabels} />

      <div style={questionCardStyle}>
        {step === 0 ? <ToneStep state={state} setState={setState} /> : null}
        {step === 1 ? <HeadlineStep state={state} setState={setState} tastingId={id} /> : null}
        {step === 2 ? <PhotosStep state={state} setState={setState} photoOptions={photoOptions} tastingId={id} /> : null}
        {step === 3 ? <HighlightStep state={state} setState={setState} /> : null}
        {step === 4 ? <BriefingStep state={state} setState={setState} /> : null}
        {step === 5 ? <SpotlightStep state={state} setState={setState} participants={participants} /> : null}
      </div>

      {stepError ? (
        <div role="alert" style={{ marginTop: 16, color: "#d97757", fontSize: 13 }} data-testid="text-wizard-step-error">
          {stepError}
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12, flexWrap: "wrap" }}>
        <button type="button" style={ghostButtonStyle} onClick={goPrev} disabled={step === 0} data-testid="button-wizard-prev">
          <ChevronLeft style={{ width: 16, height: 16 }} /> Zurueck
        </button>
        <button type="button" style={primaryButtonStyle} onClick={goNext} data-testid="button-wizard-next">
          {step + 1 === totalSteps ? (
            <>
              <Sparkles style={{ width: 16, height: 16 }} /> Story erstellen
            </>
          ) : (
            <>
              Weiter <ChevronRight style={{ width: 16, height: 16 }} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ProgressBar({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div
            key={i}
            data-testid={`wizard-step-indicator-${i}`}
            style={{
              flex: "1 1 80px",
              minWidth: 60,
              padding: "8px 10px",
              borderBottom: `2px solid ${active ? ACCENT : done ? "rgba(201,169,97,0.5)" : "rgba(255,255,255,0.08)"}`,
              fontSize: 11,
              letterSpacing: ".15em",
              textTransform: "uppercase",
              color: active ? ACCENT : done ? "#A89A85" : "#665B49",
            }}
          >
            {i + 1}. {labels[i]}
          </div>
        );
      })}
    </div>
  );
}

function ToneStep({ state, setState }: { state: WizardState; setState: (u: (p: WizardState) => WizardState) => void }) {
  return (
    <div>
      <h2 style={questionTitleStyle}>Wie soll der Abend klingen?</h2>
      <p style={questionHintStyle}>Die Stimmung fliesst als Hinweis in alle KI-Texte ein. Du kannst spaeter einzelne Bloecke neu generieren.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
        {TONE_OPTIONS.map((opt) => {
          const selected = state.tone === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setState((p) => ({ ...p, tone: selected ? null : opt.value }))}
              data-testid={`button-wizard-tone-${opt.value}`}
              style={{
                ...selectableCardStyle,
                borderColor: selected ? ACCENT : "rgba(201,169,97,0.18)",
                background: selected ? "rgba(201,169,97,0.12)" : "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 20, color: selected ? ACCENT : "#F5EDE0" }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: "#A89A85", marginTop: 4 }}>{opt.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeadlineStep({
  state,
  setState,
  tastingId,
}: {
  state: WizardState;
  setState: (u: (p: WizardState) => WizardState) => void;
  tastingId: string;
}) {
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const handleSuggest = async () => {
    if (suggestBusy) return;
    setSuggestBusy(true);
    setSuggestError(null);
    try {
      const result = await suggestTastingStoryHeadline(tastingId, state.tone);
      setState((p) => ({
        ...p,
        headlineOverride: result.headline || p.headlineOverride,
        subtitleOverride: result.subtitle || p.subtitleOverride,
      }));
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Vorschlag fehlgeschlagen");
    } finally {
      setSuggestBusy(false);
    }
  };
  return (
    <div>
      <h2 style={questionTitleStyle}>Headline & Untertitel (optional)</h2>
      <p style={questionHintStyle}>Wenn leer, nutzen wir den Tasting-Titel und den Ort.</p>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggestBusy}
          style={{ ...miniGhostButton, gap: 6 }}
          data-testid="button-wizard-headline-suggest"
        >
          {suggestBusy ? (
            <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
          ) : (
            <Sparkles style={{ width: 12, height: 12 }} />
          )}
          KI-Vorschlag
        </button>
      </div>
      <label style={labelStyle}>
        <span>Headline</span>
        <input
          type="text"
          value={state.headlineOverride}
          onChange={(e) => setState((p) => ({ ...p, headlineOverride: e.target.value }))}
          placeholder="z.B. Ein Abend mit Lagavulin"
          maxLength={200}
          style={inputStyle}
          data-testid="input-wizard-headline"
        />
      </label>
      <label style={{ ...labelStyle, marginTop: 12 }}>
        <span>Untertitel</span>
        <input
          type="text"
          value={state.subtitleOverride}
          onChange={(e) => setState((p) => ({ ...p, subtitleOverride: e.target.value }))}
          placeholder="z.B. Im Bibliothekszimmer"
          maxLength={200}
          style={inputStyle}
          data-testid="input-wizard-subtitle"
        />
      </label>
      {suggestError ? (
        <div role="alert" style={{ color: "#d97757", fontSize: 12, marginTop: 8 }} data-testid="text-wizard-headline-suggest-error">
          {suggestError}
        </div>
      ) : null}
    </div>
  );
}

function PhotosStep({
  state,
  setState,
  photoOptions,
  tastingId,
}: {
  state: WizardState;
  setState: (u: (p: WizardState) => WizardState) => void;
  photoOptions: Array<{ url: string; label: string }>;
  tastingId: string;
}) {
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newCategoryDraft, setNewCategoryDraft] = useState("");
  const [poolOpen, setPoolOpen] = useState(false);

  const ensurePhoto = (mapping: Record<string, string[]>, url: string): Record<string, string[]> => {
    if (mapping[url]) return mapping;
    return { ...mapping, [url]: [] };
  };

  const upload = async (file: File) => {
    setUploadBusy(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/image-pool/upload`, {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: { ...pidHeaders() },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Upload fehlgeschlagen");
      }
      const data = (await resp.json()) as { url?: string };
      if (!data.url) throw new Error("Antwort ohne URL");
      const newUrl = data.url;
      setState((p) => ({ ...p, imageCategories: ensurePhoto(p.imageCategories, newUrl) }));
      try {
        await createTastingStoryImagePoolEntry(tastingId, {
          url: newUrl,
          name: file.name.replace(/\.[^/.]+$/, "").slice(0, 200),
        });
      } catch (poolErr) {
        console.warn("[wizard/photo] pool entry create failed", poolErr);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploadBusy(false);
    }
  };

  const handlePoolPick = useCallback(
    (item: TastingStoryImageItem) => {
      const url = item.url;
      setState((p) => ({ ...p, imageCategories: ensurePhoto(p.imageCategories, url) }));
    },
    [setState],
  );

  const toggleCategory = (url: string, category: string) => {
    setState((p) => {
      const current = p.imageCategories[url] ?? [];
      const has = current.includes(category);
      const next: Record<string, string[]> = {};
      if (category === PHOTO_CATEGORY_HERO && !has) {
        for (const [k, cats] of Object.entries(p.imageCategories)) {
          next[k] = cats.filter((c) => c !== PHOTO_CATEGORY_HERO);
        }
      } else {
        for (const [k, cats] of Object.entries(p.imageCategories)) {
          next[k] = [...cats];
        }
      }
      const updated = has
        ? current.filter((c) => c !== category)
        : Array.from(new Set([...current, category]));
      next[url] = updated;
      return { ...p, imageCategories: next };
    });
  };

  const removePhoto = (url: string) => {
    setState((p) => {
      const next: Record<string, string[]> = {};
      for (const [k, cats] of Object.entries(p.imageCategories)) {
        if (k === url) continue;
        next[k] = cats;
      }
      return { ...p, imageCategories: next };
    });
  };

  const addCustomCategory = () => {
    const draft = newCategoryDraft.trim().slice(0, 40);
    if (!draft) return;
    setState((p) => {
      const all = new Set([...BUILTIN_PHOTO_CATEGORIES.map((c) => c.toLowerCase()), ...p.customCategories.map((c) => c.toLowerCase())]);
      if (all.has(draft.toLowerCase())) return p;
      return { ...p, customCategories: [...p.customCategories, draft].slice(0, 12) };
    });
    setNewCategoryDraft("");
  };

  const removeCustomCategory = (cat: string) => {
    setState((p) => {
      const nextCustoms = p.customCategories.filter((c) => c !== cat);
      const nextMap: Record<string, string[]> = {};
      for (const [k, cats] of Object.entries(p.imageCategories)) {
        nextMap[k] = cats.filter((c) => c !== cat);
      }
      return { ...p, customCategories: nextCustoms, imageCategories: nextMap };
    });
  };

  const allCategories = useMemo(
    () => [...BUILTIN_PHOTO_CATEGORIES, ...state.customCategories],
    [state.customCategories],
  );

  const tasting = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ url: string; label: string; selected: boolean; categories: string[] }> = [];
    for (const opt of photoOptions) {
      if (seen.has(opt.url)) continue;
      seen.add(opt.url);
      const cats = state.imageCategories[opt.url] ?? [];
      out.push({ url: opt.url, label: opt.label, selected: !!state.imageCategories[opt.url], categories: cats });
    }
    return out;
  }, [photoOptions, state.imageCategories]);

  const uploadedPhotos = useMemo(() => {
    const tastingUrls = new Set(photoOptions.map((p) => p.url));
    return Object.entries(state.imageCategories)
      .filter(([url]) => !tastingUrls.has(url))
      .map(([url, categories]) => ({ url, categories }));
  }, [photoOptions, state.imageCategories]);

  const totalSelected = Object.keys(state.imageCategories).length;
  const heroCount = Object.values(state.imageCategories).filter((cats) => cats.includes(PHOTO_CATEGORY_HERO)).length;

  return (
    <div>
      <h2 style={questionTitleStyle}>Fotos kategorisieren</h2>
      <p style={questionHintStyle}>
        Lade beliebig viele Fotos hoch oder waehle aus den Tasting-Bildern. Tagge jedes Foto mit einer oder mehreren Kategorien. Genau ein Foto muss als <strong>Hero</strong> markiert werden.
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "#A89A85" }}>
        <span data-testid="text-wizard-photo-count">Fotos: {totalSelected}</span>
        <span data-testid="text-wizard-hero-count" style={{ color: heroCount === 1 ? ACCENT : "#d97757" }}>
          Hero: {heroCount}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <UploadInline
          busy={uploadBusy}
          onPick={(file) => upload(file)}
          testId="upload-wizard-photo"
          accept="image/*"
          captureCamera
        />
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setPoolOpen(true)}
            style={{
              background: "transparent",
              color: ACCENT,
              border: `1px solid ${ACCENT_DIM}`,
              borderRadius: 4,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            data-testid="button-wizard-photo-from-pool"
          >
            Aus Bild-Pool wählen
          </button>
        </div>
      </div>

      {uploadError ? (
        <div role="alert" style={{ color: "#d97757", fontSize: 12, marginTop: 8 }} data-testid="text-wizard-upload-error">
          {uploadError}
        </div>
      ) : null}

      <StoryImagePool
        tastingId={tastingId}
        mode="pick"
        open={poolOpen}
        onClose={() => setPoolOpen(false)}
        onPick={(item) => {
          handlePoolPick(item);
          setPoolOpen(false);
        }}
        testIdPrefix="wizard-image-pool"
      />

      <div style={{ marginTop: 22 }}>
        <div style={subSectionTitle}>Eigene Kategorien</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {state.customCategories.length === 0 ? (
            <span style={{ fontSize: 12, color: "#665B49" }}>Noch keine eigenen Kategorien.</span>
          ) : (
            state.customCategories.map((cat) => (
              <span
                key={cat}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(201,169,97,0.08)",
                  border: `1px solid ${ACCENT_DIM}`,
                  borderRadius: 3,
                  padding: "3px 8px",
                  fontSize: 11,
                  color: "#F5EDE0",
                }}
                data-testid={`chip-custom-category-${categoryTestId(cat)}`}
              >
                {cat}
                <button
                  type="button"
                  onClick={() => removeCustomCategory(cat)}
                  style={{ background: "transparent", border: "none", color: "#A89A85", cursor: "pointer", padding: 0, lineHeight: 0 }}
                  aria-label={`${cat} entfernen`}
                  data-testid={`button-remove-custom-category-${categoryTestId(cat)}`}
                >
                  <X style={{ width: 10, height: 10 }} />
                </button>
              </span>
            ))
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input
            type="text"
            value={newCategoryDraft}
            onChange={(e) => setNewCategoryDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomCategory();
              }
            }}
            placeholder="z.B. Cigars, Snacks, Glaeser…"
            maxLength={40}
            style={{ ...inputStyle, flex: "1 1 200px", minWidth: 0 }}
            data-testid="input-wizard-custom-category"
          />
          <button
            type="button"
            style={miniGhostButton}
            onClick={addCustomCategory}
            disabled={!newCategoryDraft.trim()}
            data-testid="button-wizard-add-custom-category"
          >
            Hinzufuegen
          </button>
        </div>
      </div>

      {tasting.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <div style={subSectionTitle}>Aus bestehenden Tasting-Bildern</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {tasting.map((opt) => (
              <PhotoTile
                key={opt.url}
                url={opt.url}
                alt={opt.label}
                categories={opt.categories}
                allCategories={allCategories}
                onToggle={(cat) => toggleCategory(opt.url, cat)}
                onRemove={opt.selected ? () => removePhoto(opt.url) : null}
                testId={`photo-option-${opt.url.slice(-12)}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {uploadedPhotos.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <div style={subSectionTitle}>Eigene Uploads</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {uploadedPhotos.map((p, idx) => (
              <PhotoTile
                key={p.url}
                url={p.url}
                alt={`Foto ${idx + 1}`}
                categories={p.categories}
                allCategories={allCategories}
                onToggle={(cat) => toggleCategory(p.url, cat)}
                onRemove={() => removePhoto(p.url)}
                testId={`photo-upload-${idx}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PhotoTile({
  url,
  alt,
  categories,
  allCategories,
  onToggle,
  onRemove,
  testId,
}: {
  url: string;
  alt: string;
  categories: string[];
  allCategories: string[];
  onToggle: (category: string) => void;
  onRemove: (() => void) | null;
  testId: string;
}) {
  return (
    <div style={photoTileStyle} data-testid={testId}>
      <div style={{ position: "relative" }}>
        <img
          src={url}
          alt={alt}
          style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", borderRadius: 4 }}
        />
        {onRemove ? (
          <button
            type="button"
            style={{ position: "absolute", top: 4, right: 4, ...miniGhostButton, padding: "2px 4px" }}
            onClick={onRemove}
            aria-label="Foto entfernen"
            data-testid={`${testId}-remove`}
          >
            <X style={{ width: 10, height: 10 }} />
          </button>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        {allCategories.map((cat) => {
          const active = categories.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              style={{
                ...tagButton,
                flex: "0 0 auto",
                color: active ? "#0B0906" : ACCENT,
                background: active ? ACCENT : "transparent",
              }}
              onClick={() => onToggle(cat)}
              data-testid={`${testId}-tag-${categoryTestId(cat)}`}
            >
              {active ? <Check style={{ width: 10, height: 10 }} /> : null} {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BriefingStep({
  state,
  setState,
}: {
  state: WizardState;
  setState: (u: (p: WizardState) => WizardState) => void;
}) {
  return (
    <div>
      <h2 style={questionTitleStyle}>Briefing fuer die KI</h2>
      <p style={questionHintStyle}>
        Optional. Beschreibe in eigenen Worten, wie die Story klingen soll, welche Details wichtig sind oder was die KI vermeiden soll. Diese Anweisungen fliessen in alle KI-generierten Bloecke ein.
      </p>
      <textarea
        value={state.detailPrompt}
        onChange={(e) => setState((p) => ({ ...p, detailPrompt: e.target.value }))}
        placeholder="z.B. Bitte mit Fokus auf den Vergleich zwischen Highland und Islay. Keine Pathos-Saetze. Nenne Anna besonders herzlich, sie war Gastgeberin."
        maxLength={4000}
        rows={12}
        style={{ ...inputStyle, minHeight: 260, resize: "vertical" }}
        data-testid="input-wizard-detail-prompt"
      />
      <div style={{ fontSize: 11, color: "#665B49", marginTop: 6, textAlign: "right" }}>
        {state.detailPrompt.length} / 4000
      </div>
    </div>
  );
}

function HighlightStep({ state, setState }: { state: WizardState; setState: (u: (p: WizardState) => WizardState) => void }) {
  return (
    <div>
      <h2 style={questionTitleStyle}>Was war besonders an diesem Abend?</h2>
      <p style={questionHintStyle}>Optional. Dein Text fliesst als Kontext in den Closing- und Highlight-Block.</p>
      <textarea
        value={state.highlightContext}
        onChange={(e) => setState((p) => ({ ...p, highlightContext: e.target.value }))}
        placeholder="z.B. Spontane Whisky-Geschichten beim Lagavulin, der Sieger ueberraschte alle, …"
        maxLength={1500}
        rows={6}
        style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
        data-testid="input-wizard-highlight"
      />
    </div>
  );
}

function SpotlightStep({
  state,
  setState,
  participants,
}: {
  state: WizardState;
  setState: (u: (p: WizardState) => WizardState) => void;
  participants: Array<{ id: string; name: string }>;
}) {
  const toggle = (pid: string) => {
    setState((p) => {
      if (p.spotlightParticipantIds.includes(pid)) {
        return { ...p, spotlightParticipantIds: p.spotlightParticipantIds.filter((x) => x !== pid) };
      }
      if (p.spotlightParticipantIds.length >= 2) return p;
      return { ...p, spotlightParticipantIds: [...p.spotlightParticipantIds, pid] };
    });
  };
  return (
    <div>
      <h2 style={questionTitleStyle}>Teilnehmer-Spotlight (optional)</h2>
      <p style={questionHintStyle}>Bis zu 2 Teilnehmer hervorheben. Ihr KI-Fun-Fact wird besonders prominent platziert.</p>
      {participants.length === 0 ? (
        <div style={questionHintStyle}>Keine Teilnehmer gefunden.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 12 }}>
          {participants.map((p) => {
            const active = state.spotlightParticipantIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                data-testid={`button-wizard-spotlight-${p.id}`}
                style={{
                  ...selectableCardStyle,
                  textAlign: "left",
                  borderColor: active ? ACCENT : "rgba(201,169,97,0.18)",
                  background: active ? "rgba(201,169,97,0.12)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {active ? <Check style={{ width: 14, height: 14, color: ACCENT }} /> : null}
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UploadInline({
  busy,
  onPick,
  testId,
  accept,
  disabled,
  captureCamera,
}: {
  busy: boolean;
  onPick: (file: File) => void;
  testId: string;
  accept?: string;
  disabled?: boolean;
  captureCamera?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        capture={captureCamera ? "environment" : undefined}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          if (fileRef.current) fileRef.current.value = "";
        }}
        data-testid={`input-${testId}`}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy || disabled}
        data-testid={`button-${testId}`}
        style={{
          ...ghostButtonStyle,
          opacity: busy || disabled ? 0.5 : 1,
          cursor: busy || disabled ? "not-allowed" : "pointer",
          minWidth: 200,
        }}
      >
        {busy ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Upload style={{ width: 14, height: 14 }} />}
        {busy ? "Lade hoch…" : "Bild hochladen oder Foto machen"}
        <Camera style={{ width: 14, height: 14, opacity: 0.6 }} />
      </button>
    </div>
  );
}

// ---------- Generating stage ----------
function GeneratingStage({ progress }: { progress: WizardProgressResponse | null }) {
  return (
    <div style={pageContainerStyle} data-testid="wizard-stage-generating">
      <h1 style={pageTitleStyle}>Wir bauen deine Story…</h1>
      <p style={leadStyle}>Das kann einen Moment dauern. Die KI arbeitet im Hintergrund.</p>
      <div style={{ marginTop: 24, display: "grid", gap: 8 }}>
        {(progress?.steps ?? []).map((s) => (
          <ProgressStepRow key={s.key} step={s} />
        ))}
      </div>
      {progress ? (
        <div style={{ marginTop: 16, fontSize: 12, color: "#A89A85" }} data-testid="text-wizard-progress-counter">
          {progress.completedSteps} / {progress.totalSteps} Schritte abgeschlossen
        </div>
      ) : null}
    </div>
  );
}

function ProgressStepRow({ step }: { step: WizardStep }) {
  const color =
    step.status === "done"
      ? ACCENT
      : step.status === "running"
      ? "#F5EDE0"
      : step.status === "error"
      ? "#d97757"
      : step.status === "skipped"
      ? "#665B49"
      : "#665B49";
  return (
    <div
      data-testid={`wizard-progress-step-${step.key}`}
      data-step-status={step.status}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        border: `1px solid ${step.status === "running" ? ACCENT : "rgba(201,169,97,0.15)"}`,
        background: step.status === "running" ? "rgba(201,169,97,0.08)" : "transparent",
        borderRadius: 4,
      }}
    >
      <div style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {step.status === "done" ? <Check style={{ width: 14, height: 14, color: ACCENT }} /> :
          step.status === "running" ? <Loader2 style={{ width: 14, height: 14, color: ACCENT }} className="animate-spin" /> :
          step.status === "error" ? <X style={{ width: 14, height: 14, color: "#d97757" }} /> :
          step.status === "skipped" ? <span style={{ color: "#665B49", fontSize: 14 }}>·</span> :
          <span style={{ color: "#665B49", fontSize: 14 }}>○</span>}
      </div>
      <div style={{ fontSize: 13, color }}>{step.label}</div>
    </div>
  );
}

// ---------- Preview stage ----------
function PreviewStage({
  tastingId,
  blocks,
  storyData,
  publishing,
  onPublish,
  onRegen,
  onOpenEditor,
}: {
  tastingId: string;
  blocks: StoryBlock[];
  storyData: TastingStoryDataResponse | null;
  publishing: boolean;
  onPublish: () => void;
  onRegen: () => void;
  onOpenEditor: () => void;
}) {
  const doc: StoryDocument = {
    schemaVersion: 1,
    theme: "casksense-editorial",
    blocks,
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), title: "Tasting-Story" },
  };
  return (
    <div data-testid="wizard-stage-preview">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: `1px solid ${ACCENT_DIM}`,
          background: "#0B0906",
          position: "sticky",
          top: 0,
          zIndex: 10,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".25em", textTransform: "uppercase", color: ACCENT }}>Vorschau</div>
          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 18 }}>So sieht deine Story aus</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={ghostButtonStyle} onClick={onRegen} data-testid="button-wizard-regenerate">
            Erneut generieren
          </button>
          <button type="button" style={ghostButtonStyle} onClick={onOpenEditor} data-testid="button-wizard-open-editor">
            Im Editor weiter anpassen
          </button>
          <button
            type="button"
            style={{ ...primaryButtonStyle, opacity: publishing ? 0.6 : 1, cursor: publishing ? "wait" : "pointer" }}
            onClick={onPublish}
            disabled={publishing}
            data-testid="button-wizard-publish"
          >
            {publishing ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Check style={{ width: 14, height: 14 }} />}
            Veroeffentlichen
          </button>
        </div>
      </div>
      <div style={{ background: "#0B0906" }}>
        <TastingStoryDataProvider data={storyData}>
          <StoryRenderer document={doc} mode="public" />
        </TastingStoryDataProvider>
      </div>
    </div>
  );
}

// ---------- shared UI ----------
function FullPageNotice({ children, testId, icon }: { children: React.ReactNode; testId: string; icon?: React.ReactNode }) {
  return (
    <div
      data-testid={testId}
      style={{
        minHeight: "100vh",
        background: "#0B0906",
        color: "#A89A85",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        {icon ? <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>{icon}</div> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

// ---------- Styles ----------
const pageContainerStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "32px 20px 64px",
};

const pageTitleStyle: React.CSSProperties = {
  fontFamily: "'EB Garamond', serif",
  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
  fontWeight: 400,
  margin: 0,
  color: "#F5EDE0",
};

const leadStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 14,
  color: "#C9C2B4",
  lineHeight: 1.6,
};

const summaryGridStyle: React.CSSProperties = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};

const warningCardStyle: React.CSSProperties = {
  marginTop: 24,
  padding: "20px 22px",
  background: "rgba(217,167,87,0.08)",
  border: "1px solid rgba(217,167,87,0.4)",
  borderRadius: 6,
};

const questionCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: `1px solid ${ACCENT_DIM}`,
  borderRadius: 6,
  padding: "24px 22px",
};

const questionTitleStyle: React.CSSProperties = {
  fontFamily: "'EB Garamond', serif",
  fontSize: "clamp(1.2rem, 2.4vw, 1.7rem)",
  fontWeight: 400,
  margin: 0,
  color: "#F5EDE0",
};

const questionHintStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#A89A85",
  marginTop: 6,
};

const subSectionTitle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  color: ACCENT,
  marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "#A89A85",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.06)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 4,
  padding: "10px 12px",
  color: "#F5EDE0",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  outline: "none",
};

const selectableCardStyle: React.CSSProperties = {
  border: "1px solid rgba(201,169,97,0.18)",
  borderRadius: 4,
  padding: "14px 14px",
  cursor: "pointer",
  background: "rgba(255,255,255,0.02)",
  color: "#F5EDE0",
  textAlign: "left",
  fontFamily: "'Inter', sans-serif",
};

const primaryButtonStyle: React.CSSProperties = {
  background: ACCENT,
  color: "#0B0906",
  border: `1px solid ${ACCENT}`,
  padding: "10px 18px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: 3,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const ghostButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#F5EDE0",
  border: `1px solid ${ACCENT_DIM}`,
  padding: "10px 16px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: 3,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const miniGhostButton: React.CSSProperties = {
  background: "rgba(0,0,0,0.6)",
  color: "#F5EDE0",
  border: `1px solid ${ACCENT_DIM}`,
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
  borderRadius: 3,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const photoTileStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: `1px solid ${ACCENT_DIM}`,
  borderRadius: 4,
  padding: 6,
};

const tagButton: React.CSSProperties = {
  flex: 1,
  border: `1px solid ${ACCENT_DIM}`,
  borderRadius: 3,
  fontSize: 10,
  letterSpacing: ".15em",
  textTransform: "uppercase",
  padding: "4px 6px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  fontFamily: "'Inter', sans-serif",
};

const secondaryLinkStyle: React.CSSProperties = {
  background: "transparent",
  color: "#A89A85",
  border: `1px solid ${ACCENT_DIM}`,
  padding: "8px 14px",
  fontSize: 11,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  textDecoration: "none",
  borderRadius: 3,
};
