import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Camera, Check, Loader2, Sparkles, X } from "lucide-react";
import ModalPortal from "@/labs/components/ModalPortal";
import { pidHeaders } from "@/lib/api";
import { useUpload } from "@/hooks/use-upload";
import {
  getTastingStory,
  pollTastingStoryWizard,
  startTastingStoryWizard,
  type TastingStoryResponse,
  type WizardProgressResponse,
  type WizardStep,
} from "@/lib/tastingStoryApi";

export type AutoStoryEventPhoto = {
  id: string;
  photoUrl: string;
  caption?: string | null;
};

type AutoStorySheetProps = {
  open: boolean;
  tastingId: string;
  eventPhotos: AutoStoryEventPhoto[];
  onClose: () => void;
};

type Phase = "select" | "confirm-overwrite" | "generating" | "error";

async function addEventPhotoApi(tastingId: string, photoUrl: string) {
  const res = await fetch(`/api/tastings/${tastingId}/event-photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ photoUrl }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? "Upload fehlgeschlagen");
  }
  return res.json() as Promise<AutoStoryEventPhoto>;
}

export default function AutoStorySheet({ open, tastingId, eventPhotos, onClose }: AutoStorySheetProps) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { uploadFile } = useUpload();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [phase, setPhase] = useState<Phase>("select");
  const [heroUrl, setHeroUrl] = useState<string>("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<WizardProgressResponse | null>(null);
  const [pendingUploaded, setPendingUploaded] = useState<AutoStoryEventPhoto[]>([]);

  const story = useQuery<TastingStoryResponse>({
    queryKey: ["/api/tasting-stories", tastingId],
    queryFn: () => getTastingStory(tastingId),
    enabled: open && !!tastingId,
  });

  const storyResolved = !story.isLoading && story.fetchStatus !== "fetching";
  const hasExistingStory = !!story.data && (story.data.document.blocks?.length ?? 0) > 0;

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setPhase("select");
      setHeroUrl("");
      setGalleryUrls([]);
      setUploadError(null);
      setValidationError(null);
      setErrorMessage(null);
      setJobId(null);
      setProgress(null);
      setPendingUploaded([]);
    }
  }, [open]);

  // Combined photo list (server eventPhotos + local pending uploads, deduped)
  const allPhotos = useMemo<AutoStoryEventPhoto[]>(() => {
    const seen = new Set<string>();
    const out: AutoStoryEventPhoto[] = [];
    for (const p of pendingUploaded) {
      if (seen.has(p.photoUrl)) continue;
      seen.add(p.photoUrl);
      out.push(p);
    }
    for (const p of eventPhotos) {
      if (seen.has(p.photoUrl)) continue;
      seen.add(p.photoUrl);
      out.push(p);
    }
    return out;
  }, [eventPhotos, pendingUploaded]);

  // Once a pending upload appears in eventPhotos, drop it from pending list
  useEffect(() => {
    if (pendingUploaded.length === 0) return;
    const known = new Set(eventPhotos.map((p) => p.photoUrl));
    setPendingUploaded((prev) => prev.filter((p) => !known.has(p.photoUrl)));
  }, [eventPhotos, pendingUploaded.length]);

  // Polling for wizard progress
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (!jobId || phase !== "generating") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await pollTastingStoryWizard(tastingId, jobId);
        if (cancelled) return;
        setProgress(next);
        if (next.status === "done") {
          qc.invalidateQueries({ queryKey: ["/api/tasting-stories", tastingId] });
          qc.invalidateQueries({ queryKey: ["recap-event-photos", tastingId] });
          onClose();
          navigate(`/labs/results/${tastingId}/story`);
          return;
        }
        if (next.status === "error") {
          setErrorMessage(next.error ?? "Generierung fehlgeschlagen");
          setPhase("error");
          return;
        }
        pollRef.current = window.setTimeout(tick, 800);
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : "Status-Abfrage fehlgeschlagen");
        setPhase("error");
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
  }, [jobId, phase, tastingId, qc, navigate]);

  const galleryCount = galleryUrls.length;

  const validate = (): string | null => {
    if (!heroUrl) return "Bitte wähle ein Hero-Bild aus oder lade eines hoch.";
    if (galleryCount > 0 && (galleryCount < 3 || galleryCount > 8)) {
      return "Galerie braucht entweder kein Bild oder zwischen 3 und 8 Bildern.";
    }
    return null;
  };

  const handleHeroToggle = (url: string) => {
    setHeroUrl((cur) => (cur === url ? "" : url));
    setValidationError(null);
  };

  const handleGalleryToggle = (url: string) => {
    setGalleryUrls((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 8) return prev;
      return [...prev, url];
    });
    setValidationError(null);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const remaining = Math.max(0, 10 - allPhotos.length);
      if (remaining <= 0) {
        setUploadError("Maximal 10 Fotos erlaubt.");
        return;
      }
      const limit = Math.min(files.length, remaining);
      const newlyAdded: AutoStoryEventPhoto[] = [];
      for (let i = 0; i < limit; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const result = await uploadFile(file);
        if (result?.objectPath) {
          const publicUrl = result.objectPath.startsWith("http")
            ? result.objectPath
            : `/api/uploads/serve/${result.objectPath}`;
          const created = await addEventPhotoApi(tastingId, publicUrl);
          newlyAdded.push({
            id: created?.id ?? `pending-${publicUrl}`,
            photoUrl: created?.photoUrl ?? publicUrl,
            caption: created?.caption ?? null,
          });
        }
      }
      if (newlyAdded.length > 0) {
        setPendingUploaded((prev) => [...newlyAdded, ...prev]);
        // Auto-select the first new upload as hero if none chosen yet
        if (!heroUrl) setHeroUrl(newlyAdded[0].photoUrl);
      }
      qc.invalidateQueries({ queryKey: ["recap-event-photos", tastingId] });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const beginGenerate = async (overwrite: boolean) => {
    setErrorMessage(null);
    try {
      setPhase("generating");
      const start = await startTastingStoryWizard(tastingId, {
        tone: "casual",
        headlineOverride: null,
        subtitleOverride: null,
        heroImageUrl: heroUrl || null,
        galleryImageUrls: galleryUrls,
        spotlightParticipantIds: [],
        highlightContext: null,
        overwriteExisting: overwrite,
      });
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
      setPhase("error");
    }
  };

  const handleSubmit = () => {
    if (!storyResolved) return;
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    if (hasExistingStory) {
      setPhase("confirm-overwrite");
    } else {
      void beginGenerate(false);
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setProgress(null);
    setJobId(null);
    setPhase("select");
  };

  const canCloseDuringGeneration = phase !== "generating";
  const closeAndCleanup = () => {
    if (!canCloseDuringGeneration) return;
    onClose();
  };

  const photoTiles = allPhotos;

  return (
    <ModalPortal
      open={open}
      onClose={closeAndCleanup}
      closeOnEscape={canCloseDuringGeneration}
      closeOnOverlayClick={canCloseDuringGeneration}
      testId="modal-auto-story"
    >
      <div
        className="labs-card"
        style={{
          width: "min(720px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--labs-bg, #0F0E0C)",
          border: "1px solid var(--labs-border, rgba(201,169,97,0.25))",
          borderRadius: 10,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--labs-border)",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--labs-accent)" }}>
                Auto-Story
              </div>
              <h2 className="labs-serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>
                Story automatisch erstellen
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAndCleanup}
            disabled={!canCloseDuringGeneration}
            aria-label="Schließen"
            data-testid="button-auto-story-close"
            style={{
              background: "transparent",
              border: "1px solid var(--labs-border)",
              borderRadius: 6,
              padding: 6,
              cursor: canCloseDuringGeneration ? "pointer" : "not-allowed",
              color: "var(--labs-text-muted)",
              opacity: canCloseDuringGeneration ? 1 : 0.5,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
          {phase === "select" ? (
            <SelectPhase
              eventPhotos={photoTiles}
              heroUrl={heroUrl}
              galleryUrls={galleryUrls}
              onHero={handleHeroToggle}
              onGallery={handleGalleryToggle}
              onUploadClick={() => fileRef.current?.click()}
              uploading={uploading}
              uploadError={uploadError}
              validationError={validationError}
              fileRef={fileRef}
              onFiles={handleFiles}
              hasExistingStory={hasExistingStory}
            />
          ) : null}

          {phase === "confirm-overwrite" ? (
            <ConfirmOverwritePhase
              onCancel={() => setPhase("select")}
              onConfirm={() => void beginGenerate(true)}
            />
          ) : null}

          {phase === "generating" ? <GeneratingPhase progress={progress} /> : null}

          {phase === "error" ? (
            <ErrorPhase message={errorMessage ?? "Etwas ist schief gelaufen."} onRetry={handleRetry} />
          ) : null}
        </div>

        {phase === "select" ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 20px",
              borderTop: "1px solid var(--labs-border)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }} data-testid="text-auto-story-counter">
              Hero: {heroUrl ? "1" : "0"}/1 · Galerie: {galleryCount}/8
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="labs-btn-ghost"
                type="button"
                onClick={closeAndCleanup}
                data-testid="button-auto-story-cancel"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Abbrechen
              </button>
              <button
                className="labs-btn-primary"
                type="button"
                onClick={handleSubmit}
                disabled={!heroUrl || uploading || !storyResolved}
                data-testid="button-auto-story-submit"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {storyResolved ? (
                  <Sparkles style={{ width: 14, height: 14 }} />
                ) : (
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                )}
                Jetzt erstellen
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </ModalPortal>
  );
}

function SelectPhase({
  eventPhotos,
  heroUrl,
  galleryUrls,
  onHero,
  onGallery,
  onUploadClick,
  uploading,
  uploadError,
  validationError,
  fileRef,
  onFiles,
  hasExistingStory,
}: {
  eventPhotos: AutoStoryEventPhoto[];
  heroUrl: string;
  galleryUrls: string[];
  onHero: (url: string) => void;
  onGallery: (url: string) => void;
  onUploadClick: () => void;
  uploading: boolean;
  uploadError: string | null;
  validationError: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  hasExistingStory: boolean;
}) {
  return (
    <div data-testid="auto-story-phase-select">
      <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", margin: "0 0 12px", lineHeight: 1.55 }}>
        Wähle ein Hero-Bild (Pflicht) und optional 3–8 Galerie-Bilder. Stimmung, Headline, Highlight und Spotlight werden
        automatisch mit Standardwerten erzeugt — du kannst alles später im Story-Editor anpassen.
      </p>

      {hasExistingStory ? (
        <div
          data-testid="auto-story-existing-hint"
          style={{
            background: "rgba(217,167,87,0.08)",
            border: "1px solid rgba(217,167,87,0.4)",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 12,
            color: "var(--labs-text-secondary)",
            marginBottom: 14,
          }}
        >
          Es existiert bereits eine Story. Du wirst vor dem Start gefragt, ob sie ersetzt werden soll.
        </div>
      ) : null}

      <div style={{ marginBottom: 14 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => onFiles(e.target.files)}
          data-testid="input-auto-story-upload"
        />
        <button
          className="labs-btn-secondary"
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          data-testid="button-auto-story-upload"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {uploading ? (
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          ) : (
            <Camera style={{ width: 14, height: 14 }} />
          )}
          {uploading ? "Lade hoch…" : "Foto hochladen oder Foto machen"}
        </button>
        {uploadError ? (
          <div role="alert" style={{ color: "var(--labs-danger)", fontSize: 12, marginTop: 8 }} data-testid="text-auto-story-upload-error">
            {uploadError}
          </div>
        ) : null}
      </div>

      {eventPhotos.length === 0 ? (
        <div
          data-testid="text-auto-story-empty"
          style={{
            border: "1px dashed var(--labs-border)",
            borderRadius: 8,
            padding: "20px 16px",
            textAlign: "center",
            color: "var(--labs-text-muted)",
            fontSize: 13,
          }}
        >
          Noch keine Fotos vorhanden — lade ein Foto hoch, um zu starten.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: 10,
          }}
          data-testid="grid-auto-story-photos"
        >
          {eventPhotos.map((p) => {
            const isHero = heroUrl === p.photoUrl;
            const inGallery = galleryUrls.includes(p.photoUrl);
            return (
              <div
                key={p.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${isHero || inGallery ? "var(--labs-accent)" : "var(--labs-border)"}`,
                  borderRadius: 8,
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
                data-testid={`tile-auto-story-photo-${p.id}`}
              >
                <img
                  src={p.photoUrl}
                  alt={p.caption ?? "Foto"}
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 4, display: "block" }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => onHero(p.photoUrl)}
                    data-testid={`button-auto-story-hero-${p.id}`}
                    style={{
                      flex: 1,
                      fontSize: 10,
                      letterSpacing: ".15em",
                      textTransform: "uppercase",
                      padding: "4px 6px",
                      borderRadius: 3,
                      border: `1px solid ${isHero ? "var(--labs-accent)" : "var(--labs-border)"}`,
                      background: isHero ? "var(--labs-accent)" : "transparent",
                      color: isHero ? "#0B0906" : "var(--labs-accent)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    {isHero ? <Check style={{ width: 10, height: 10 }} /> : null} Hero
                  </button>
                  <button
                    type="button"
                    onClick={() => onGallery(p.photoUrl)}
                    data-testid={`button-auto-story-gallery-${p.id}`}
                    style={{
                      flex: 1,
                      fontSize: 10,
                      letterSpacing: ".15em",
                      textTransform: "uppercase",
                      padding: "4px 6px",
                      borderRadius: 3,
                      border: `1px solid ${inGallery ? "var(--labs-accent)" : "var(--labs-border)"}`,
                      background: inGallery ? "var(--labs-accent)" : "transparent",
                      color: inGallery ? "#0B0906" : "var(--labs-accent)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    {inGallery ? <Check style={{ width: 10, height: 10 }} /> : null} Galerie
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {validationError ? (
        <div
          role="alert"
          style={{ marginTop: 12, color: "var(--labs-danger)", fontSize: 13 }}
          data-testid="text-auto-story-validation-error"
        >
          {validationError}
        </div>
      ) : null}
    </div>
  );
}

function ConfirmOverwritePhase({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div data-testid="auto-story-phase-confirm">
      <h3 className="labs-serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 8px" }}>
        Bestehende Story ersetzen?
      </h3>
      <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.55, margin: 0 }}>
        Es gibt bereits eine Story für diese Verkostung. Wenn du fortfährst, wird sie durch eine neu generierte Version
        ersetzt. Die alte Version bleibt im Versionsverlauf erhalten.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
        <button
          className="labs-btn-ghost"
          type="button"
          onClick={onCancel}
          data-testid="button-auto-story-overwrite-cancel"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          Zurück
        </button>
        <button
          className="labs-btn-primary"
          type="button"
          onClick={onConfirm}
          data-testid="button-auto-story-overwrite-confirm"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Sparkles style={{ width: 14, height: 14 }} />
          Ersetzen und erstellen
        </button>
      </div>
    </div>
  );
}

function GeneratingPhase({ progress }: { progress: WizardProgressResponse | null }) {
  const total = progress?.totalSteps ?? 0;
  const done = progress?.completedSteps ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div data-testid="auto-story-phase-generating">
      <h3 className="labs-serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 6px" }}>
        Wir bauen deine Story…
      </h3>
      <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", margin: "0 0 14px", lineHeight: 1.55 }}>
        Das kann einen Moment dauern. Du wirst danach automatisch zur Story weitergeleitet.
      </p>

      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "rgba(201,169,97,0.15)",
          overflow: "hidden",
          marginBottom: 16,
        }}
        data-testid="bar-auto-story-progress"
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--labs-accent)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {(progress?.steps ?? []).map((s) => (
          <ProgressRow key={s.key} step={s} />
        ))}
      </div>

      {progress ? (
        <div
          style={{ marginTop: 12, fontSize: 12, color: "var(--labs-text-muted)" }}
          data-testid="text-auto-story-progress-counter"
        >
          {done} / {total} Schritte abgeschlossen
        </div>
      ) : null}
    </div>
  );
}

function ProgressRow({ step }: { step: WizardStep }) {
  const accent = "var(--labs-accent)";
  const muted = "var(--labs-text-muted)";
  const icon =
    step.status === "done" ? <Check style={{ width: 12, height: 12, color: accent }} /> :
    step.status === "running" ? <Loader2 style={{ width: 12, height: 12, color: accent, animation: "spin 1s linear infinite" }} /> :
    step.status === "error" ? <X style={{ width: 12, height: 12, color: "var(--labs-danger)" }} /> :
    step.status === "skipped" ? <span style={{ color: muted, fontSize: 12 }}>·</span> :
    <span style={{ color: muted, fontSize: 12 }}>○</span>;
  return (
    <div
      data-testid={`auto-story-step-${step.key}`}
      data-step-status={step.status}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        border: `1px solid ${step.status === "running" ? accent : "var(--labs-border)"}`,
        background: step.status === "running" ? "rgba(201,169,97,0.08)" : "transparent",
        borderRadius: 4,
      }}
    >
      <div style={{ width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div style={{ fontSize: 12, color: "var(--labs-text)" }}>{step.label}</div>
    </div>
  );
}

function ErrorPhase({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div data-testid="auto-story-phase-error">
      <h3 className="labs-serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 6px" }}>
        Story konnte nicht erstellt werden
      </h3>
      <p
        role="alert"
        style={{ fontSize: 13, color: "var(--labs-danger)", margin: "0 0 16px", lineHeight: 1.55 }}
        data-testid="text-auto-story-error"
      >
        {message}
      </p>
      <button
        className="labs-btn-primary"
        type="button"
        onClick={onRetry}
        data-testid="button-auto-story-retry"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <BookOpen style={{ width: 14, height: 14 }} />
        Erneut versuchen
      </button>
    </div>
  );
}
