import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Camera, Sparkles, X } from "lucide-react";
import { whiskyApi } from "@/lib/api";
import { InfoHint } from "@/labs/components/InfoHint";
import {
  ProgressLine,
  WbProgressBar,
  startWhiskybaseLookup,
  runChunkedAiImport,
  type WbProgress,
} from "@/labs/pages/LabsHost";

/**
 * Smart-Import als eigenstaendige Komponente.
 *
 * Entstanden, weil der Import nur im Host-Cockpit existierte — wer auf der
 * Tasting-Detailseite ein bestehendes Lineup erweitern wollte, hatte nur das
 * Ein-Feld-Formular. Die schwere Logik (Paket-Analyse, Whiskybase-Suche)
 * lebt weiterhin genau einmal und wird hier importiert; neu ist nur die
 * schlanke Oberflaeche.
 *
 * Bewusst einfacher als das Cockpit-Original: keine Feld-Konfiguration,
 * keine Foto-Umzuordnung — wer das braucht, arbeitet im Cockpit. Hier geht
 * es um den schnellen Nachschub: Fotos rein, pruefen, uebernehmen.
 */
export function SmartImportPanel({
  tastingId,
  hostId,
  existingCount,
  onClose,
}: {
  tastingId: string;
  hostId: string;
  /** Anzahl bereits vorhandener Whiskys — fuer die Sortierreihenfolge. */
  existingCount: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [wbProgress, setWbProgress] = useState<WbProgress>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (arr.length) setFiles((prev) => [...prev, ...arr].slice(0, 60));
  };

  const analyze = async () => {
    if (analyzing || (files.length === 0 && !text.trim())) return;
    setAnalyzing(true);
    setError("");
    setResults([]);
    try {
      const result = await runChunkedAiImport(files, text.trim(), hostId, (done, total) =>
        setProgress({ done, total }),
      );
      const whiskies: any[] = Array.isArray(result?.whiskies) ? result.whiskies : [];
      setResults(whiskies);
      setSelected(new Set(whiskies.map((_: any, i: number) => i)));
      // Whiskybase-Suche startet bewusst NICHT automatisch — nur per Knopf.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
      setProgress(null);
    }
  };

  const addSelected = async () => {
    if (adding) return;
    setAdding(true);
    try {
      let order = existingCount;
      for (let i = 0; i < results.length; i++) {
        if (!selected.has(i)) continue;
        const w = results[i];
        await whiskyApi.create({
          tastingId,
          sortOrder: order++,
          name: w.name || "",
          distillery: w.distillery || "",
          age: w.age || "",
          abv: w.abv ?? null,
          country: w.country || "",
          region: w.region || "",
          caskType: w.caskType || w.cask || "",
          bottler: w.bottler || "",
          distilledYear: w.distilledYear || "",
          bottledYear: w.bottledYear || "",
          category: w.category || "",
          peatLevel: w.peatLevel || "",
          whiskybaseId: w.whiskybaseId || "",
          whiskybaseUrl: w.whiskybaseUrl || "",
          wbScore: w.wbScore != null ? parseFloat(String(w.wbScore)) || null : null,
          imageUrl: w.imageUrl || "",
        } as any);
      }
      await queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });

  return (
    <div className="labs-card p-3 space-y-3" data-testid="smart-import-panel">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium inline-flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          Smart-Import
          <InfoHint text={t("labs.aiImport.uploadHint")} testId="smart-import-hint" />
        </span>
        <button className="labs-btn-ghost p-1" onClick={onClose} data-testid="smart-import-close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className="rounded-xl p-4 text-center space-y-2"
        style={{ border: "2px dashed var(--labs-border)" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <p className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>
          {t("labs.host.dropFiles", "Drop photos, PDFs, Excel or files here")}
        </p>
        <div className="flex gap-2 justify-center">
          <label className="labs-btn-primary text-xs px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            {t("labs.host.camera", "Camera")}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
          <label className="labs-btn-ghost text-xs px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            {t("labs.host.browse", "Browse")}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.csv,.txt,.xlsx"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
        </div>
        {files.length > 0 && (
          <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
            {t("labs.smartImport.filesSelected", "{{count}} files selected", { count: files.length })}
            {" · "}
            <button className="underline" onClick={() => setFiles([])} data-testid="smart-import-clear">
              {t("labs.smartImport.clear", "Clear")}
            </button>
          </p>
        )}
      </div>

      <textarea
        className="labs-input w-full text-sm"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("labs.host.pasteText", "Or paste whisky names, tasting notes, menu text…")}
        data-testid="smart-import-text"
      />

      <button
        className="labs-btn-primary w-full text-sm py-2"
        disabled={analyzing || (files.length === 0 && !text.trim())}
        onClick={() => void analyze()}
        data-testid="smart-import-analyze"
      >
        {analyzing ? t("labs.host.analyzingEllipsis", "Analysing…") : t("labs.host.analyze", "Analyse")}
      </button>

      {analyzing && progress && (
        <ProgressLine
          label={t("labs.aiImport.analyzingPhotos", "Reading labels")}
          done={progress.done}
          total={progress.total}
          countLabel={t("labs.aiImport.photosProgress", "{{done}} of {{total}} photos", {
            done: Math.min(
              Math.round((progress.done / Math.max(1, progress.total)) * files.length),
              files.length,
            ),
            total: files.length,
          })}
        />
      )}
      {results.length > 0 && !wbProgress && (
        <button
          className="labs-btn-ghost text-xs"
          onClick={() => startWhiskybaseLookup(results, hostId, setResults, undefined, setWbProgress)}
          data-testid="smart-import-wb-start"
        >
          {t("labs.wbSaved.start", "Whiskybase lookup")}
        </button>
      )}
      <WbProgressBar progress={wbProgress} t={t} />
      {error && (
        <p className="text-xs" style={{ color: "var(--labs-danger, #b3261e)" }} data-testid="smart-import-error">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2" data-testid="smart-import-results">
          <p className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>
            {t("labs.aiImport.found", "{{count}} bottles recognised", { count: results.length })}
          </p>
          {results.map((w: any, i: number) => (
            <label
              key={i}
              className="flex items-start gap-2 labs-card p-2 cursor-pointer"
              data-testid={`smart-import-row-${i}`}
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggle(i)}
                style={{ marginTop: 3 }}
              />
              {w.imageUrl && (
                <img
                  src={w.imageUrl}
                  alt=""
                  style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                />
              )}
              <span style={{ minWidth: 0 }}>
                <span className="text-sm block">{w.name}</span>
                <span className="text-[11px] block" style={{ color: "var(--labs-text-muted)" }}>
                  {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null, w.region]
                    .filter(Boolean)
                    .join(" · ")}
                  {w._wbPending
                    ? ` · ${t("labs.aiImport.wbSearching", "Looking up Whiskybase entries")}`
                    : w.whiskybaseId
                      ? " · Whiskybase ✓"
                      : ""}
                </span>
              </span>
            </label>
          ))}
          <button
            className="labs-btn-primary w-full text-sm py-2"
            disabled={adding || selected.size === 0}
            onClick={() => void addSelected()}
            data-testid="smart-import-add"
          >
            {adding
              ? t("labs.host.savingEllipsis", "Saving…")
              : t("labs.smartImport.addSelected", "Add {{count}} to lineup", { count: selected.size })}
          </button>
        </div>
      )}
    </div>
  );
}
