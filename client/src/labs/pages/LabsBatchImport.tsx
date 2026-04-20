import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useSession } from "@/lib/session";
import { Upload, Loader2, Check, X, AlertCircle, FileText, Database, Wine, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

interface BatchWhisky {
  name: string;
  distillery: string;
  age: string | null;
  abv: number | null;
  caskType: string | null;
  category: string | null;
  bottler: string | null;
  distilledYear: string | null;
  bottledYear: string | null;
  ppm: number | null;
  noseNotes: string | null;
  tasteNotes: string | null;
  finishNotes: string | null;
  hostSummary: string | null;
  existingWhiskyId: string | null;
  existingLibraryId: string | null;
  isNew: boolean;
  selected: boolean;
}

interface BatchDistillery {
  name: string;
  country: string | null;
  region: string | null;
  founded: number | null;
  description: string | null;
  existingDistilleryId: string | null;
  isNewDistillery: boolean;
  selected: boolean;
  whiskies: BatchWhisky[];
}

interface BatchFileResult {
  filename: string;
  status: "ok" | "error";
  error: string | null;
  fileUrl: string | null;
  contentType: string | null;
  distilleries: BatchDistillery[];
}

interface CommitSummary {
  distilleriesCreated: number;
  distilleriesMerged: number;
  whiskiesCreated: number;
  whiskiesUpdated: number;
  handoutsLinked: number;
}

export default function LabsBatchImport() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const session = useSession();
  const pid = session.pid || "";

  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [results, setResults] = useState<BatchFileResult[] | null>(null);
  const [summary, setSummary] = useState<CommitSummary | null>(null);
  const [error, setError] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  }, []);

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const analyze = async () => {
    setError(""); setAnalyzing(true); setResults(null); setSummary(null);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      fd.append("hostId", pid);
      const res = await fetch("/api/labs/batch-import/analyze", {
        method: "POST",
        headers: { "x-participant-id": pid },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || t("batchImport.analysisFailed"));
      setResults(json.files as BatchFileResult[]);
    } catch (e: any) {
      setError(e?.message || t("batchImport.analysisFailed"));
    } finally {
      setAnalyzing(false);
    }
  };

  const updateDist = (fi: number, di: number, patch: Partial<BatchDistillery>) => {
    setResults(prev => prev ? prev.map((f, i) => i !== fi ? f : { ...f, distilleries: f.distilleries.map((d, j) => j !== di ? d : { ...d, ...patch }) }) : prev);
  };
  const updateWhisky = (fi: number, di: number, wi: number, patch: Partial<BatchWhisky>) => {
    setResults(prev => prev ? prev.map((f, i) => i !== fi ? f : { ...f, distilleries: f.distilleries.map((d, j) => j !== di ? d : { ...d, whiskies: d.whiskies.map((w, k) => k !== wi ? w : { ...w, ...patch }) }) }) : prev);
  };

  const commit = async () => {
    if (!results) return;
    setError(""); setCommitting(true);
    try {
      const res = await fetch("/api/labs/batch-import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({ hostId: pid, files: results }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || t("batchImport.commitFailed"));
      setSummary(json.summary as CommitSummary);
    } catch (e: any) {
      setError(e?.message || t("batchImport.commitFailed"));
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setFiles([]); setResults(null); setSummary(null); setError(""); setExpanded({});
    if (inputRef.current) inputRef.current.value = "";
  };

  if (!session.signedIn || !pid) {
    return (
      <div className="labs-page" data-testid="labs-batch-import">
        <div className="labs-card p-6 text-center">
          <p style={{ color: "var(--labs-text-muted)" }}>{t("batchImport.signInRequired")}</p>
        </div>
      </div>
    );
  }

  const totalSelectedWhiskies = (results || []).flatMap(f => f.distilleries.filter(d => d.selected).flatMap(d => d.whiskies.filter(w => w.selected))).length;

  return (
    <div className="labs-page" data-testid="labs-batch-import">
      <div className="mb-5 flex items-center gap-3">
        <button className="labs-btn-ghost" onClick={() => navigate("/labs/host")} style={{ padding: "6px 8px" }} data-testid="button-back-host">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="labs-h2" style={{ color: "var(--labs-accent)" }} data-testid="text-batch-import-title">{t("batchImport.title")}</h1>
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("batchImport.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="labs-card p-4 mb-4" style={{ borderColor: "var(--labs-danger)" }} data-testid="text-batch-error">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--labs-danger)" }} />
            <p className="text-sm" style={{ color: "var(--labs-danger)" }}>{error}</p>
          </div>
        </div>
      )}

      {summary && (
        <div className="labs-card p-5 mb-4" style={{ borderColor: "var(--labs-success)" }} data-testid="text-batch-summary">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5" style={{ color: "var(--labs-success)" }} />
            <h2 className="labs-h3" style={{ color: "var(--labs-success)" }}>{t("batchImport.done")}</h2>
          </div>
          <ul className="text-sm space-y-1" style={{ color: "var(--labs-text)" }}>
            <li>{t("batchImport.summaryDistilleriesCreated", { count: summary.distilleriesCreated })}</li>
            <li>{t("batchImport.summaryDistilleriesMerged", { count: summary.distilleriesMerged })}</li>
            <li>{t("batchImport.summaryWhiskiesCreated", { count: summary.whiskiesCreated })}</li>
            <li>{t("batchImport.summaryWhiskiesUpdated", { count: summary.whiskiesUpdated })}</li>
            <li>{t("batchImport.summaryHandoutsLinked", { count: summary.handoutsLinked })}</li>
          </ul>
          <div className="flex gap-2 mt-4">
            <button className="labs-btn-primary" onClick={reset} data-testid="button-batch-import-again">{t("batchImport.importAnother")}</button>
            <button className="labs-btn-secondary" onClick={() => navigate("/labs/explore?tab=bibliothek&section=brennereien")} data-testid="button-batch-view-distilleries">{t("batchImport.viewDistilleries")}</button>
          </div>
        </div>
      )}

      {!results && !summary && (
        <div className="labs-card p-6 text-center" style={{ marginBottom: 16 }}>
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            style={{
              border: "2px dashed var(--labs-border)", background: "var(--labs-bg)", borderRadius: 12,
              padding: 32, textAlign: "center", cursor: "pointer",
            }}
            data-testid="dropzone-batch-import"
          >
            <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--labs-text-muted)" }} />
            <p className="labs-serif text-sm mb-1">{t("batchImport.dropzoneTitle")}</p>
            <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("batchImport.dropzoneHint")}</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onPick}
              style={{ display: "none" }}
              data-testid="input-batch-files"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-4 text-left" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "var(--labs-surface-elevated)" }} data-testid={`item-batch-file-${i}`}>
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                  <span className="flex-1 text-sm truncate" style={{ color: "var(--labs-text)" }}>{f.name}</span>
                  <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{(f.size / 1024).toFixed(0)} KB</span>
                  <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="labs-btn-ghost" style={{ padding: 2 }} data-testid={`button-batch-remove-file-${i}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={analyzing || files.length === 0}
            className="labs-btn-primary mt-4"
            style={{ padding: "10px 20px", opacity: (analyzing || files.length === 0) ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}
            data-testid="button-batch-analyze"
          >
            {analyzing ? <><Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> {t("batchImport.analyzing")}</> : <><Database className="w-4 h-4" /> {t("batchImport.analyze", { count: files.length })}</>}
          </button>
        </div>
      )}

      {results && !summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {results.map((file, fi) => (
            <div key={fi} className="labs-card p-4" data-testid={`card-batch-file-${fi}`}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" style={{ color: file.status === "ok" ? "var(--labs-success)" : "var(--labs-danger)" }} />
                <span className="labs-serif text-sm font-semibold" style={{ flex: 1 }} data-testid={`text-batch-filename-${fi}`}>{file.filename}</span>
                {file.status === "error"
                  ? <span className="labs-badge" style={{ background: "var(--labs-danger)", color: "var(--labs-bg)" }}>{file.error}</span>
                  : <span className="labs-badge labs-badge-accent">{file.distilleries.length} {t("batchImport.distilleries")}</span>}
              </div>

              {file.distilleries.map((dist, di) => {
                const key = `${fi}-${di}`;
                const open = expanded[key] ?? true;
                return (
                  <div key={di} className="rounded-lg p-3 mb-2" style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }} data-testid={`card-batch-distillery-${fi}-${di}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={dist.selected} onChange={e => updateDist(fi, di, { selected: e.target.checked })} data-testid={`checkbox-batch-distillery-${fi}-${di}`} />
                      <Database className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                      <input
                        value={dist.name}
                        onChange={e => updateDist(fi, di, { name: e.target.value })}
                        className="labs-input"
                        style={{ flex: 1, fontSize: 14, fontWeight: 600, padding: "4px 8px", height: 28 }}
                        data-testid={`input-batch-distillery-name-${fi}-${di}`}
                      />
                      <span className="labs-badge" style={{ background: dist.isNewDistillery ? "var(--labs-accent)" : "var(--labs-text-muted)", color: "var(--labs-bg)", fontSize: 10 }}>
                        {dist.isNewDistillery ? t("batchImport.new") : t("batchImport.merge")}
                      </span>
                      <button className="labs-btn-ghost" style={{ padding: 4 }} onClick={() => setExpanded(p => ({ ...p, [key]: !open }))} data-testid={`button-batch-toggle-${fi}-${di}`}>
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {open && (
                      <>
                        <div className="grid mt-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                          <input value={dist.region || ""} onChange={e => updateDist(fi, di, { region: e.target.value })} placeholder={t("batchImport.region")} className="labs-input" style={{ fontSize: 12, padding: "4px 8px", height: 26 }} data-testid={`input-batch-region-${fi}-${di}`} />
                          <input value={dist.country || ""} onChange={e => updateDist(fi, di, { country: e.target.value })} placeholder={t("batchImport.country")} className="labs-input" style={{ fontSize: 12, padding: "4px 8px", height: 26 }} data-testid={`input-batch-country-${fi}-${di}`} />
                          <input value={dist.founded?.toString() || ""} onChange={e => updateDist(fi, di, { founded: e.target.value ? parseInt(e.target.value) : null })} placeholder={t("batchImport.founded")} className="labs-input" style={{ fontSize: 12, padding: "4px 8px", height: 26 }} data-testid={`input-batch-founded-${fi}-${di}`} />
                        </div>

                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                          {dist.whiskies.map((w, wi) => (
                            <div key={wi} className="rounded p-2" style={{ background: "var(--labs-bg)", border: "1px solid var(--labs-border)" }} data-testid={`row-batch-whisky-${fi}-${di}-${wi}`}>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={w.selected} onChange={e => updateWhisky(fi, di, wi, { selected: e.target.checked })} data-testid={`checkbox-batch-whisky-${fi}-${di}-${wi}`} />
                                <Wine className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                                <input
                                  value={w.name}
                                  onChange={e => updateWhisky(fi, di, wi, { name: e.target.value })}
                                  className="labs-input"
                                  style={{ flex: 1, fontSize: 12, padding: "3px 6px", height: 24 }}
                                  data-testid={`input-batch-whisky-name-${fi}-${di}-${wi}`}
                                />
                                <span className="labs-badge" style={{ background: w.isNew ? "var(--labs-accent)" : "var(--labs-text-muted)", color: "var(--labs-bg)", fontSize: 9 }}>
                                  {w.isNew ? t("batchImport.new") : t("batchImport.exists")}
                                </span>
                              </div>
                              <div className="grid mt-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 4 }}>
                                <input value={w.age || ""} onChange={e => updateWhisky(fi, di, wi, { age: e.target.value || null })} placeholder={t("batchImport.age")} className="labs-input" style={{ fontSize: 11, padding: "2px 6px", height: 22 }} data-testid={`input-batch-age-${fi}-${di}-${wi}`} />
                                <input value={w.abv?.toString() || ""} onChange={e => updateWhisky(fi, di, wi, { abv: e.target.value ? parseFloat(e.target.value) : null })} placeholder="ABV" className="labs-input" style={{ fontSize: 11, padding: "2px 6px", height: 22 }} data-testid={`input-batch-abv-${fi}-${di}-${wi}`} />
                                <input value={w.caskType || ""} onChange={e => updateWhisky(fi, di, wi, { caskType: e.target.value || null })} placeholder={t("batchImport.cask")} className="labs-input" style={{ fontSize: 11, padding: "2px 6px", height: 22 }} data-testid={`input-batch-cask-${fi}-${di}-${wi}`} />
                                <input value={w.category || ""} onChange={e => updateWhisky(fi, di, wi, { category: e.target.value || null })} placeholder={t("batchImport.category")} className="labs-input" style={{ fontSize: 11, padding: "2px 6px", height: 22 }} data-testid={`input-batch-category-${fi}-${di}-${wi}`} />
                              </div>
                              {(w.noseNotes || w.tasteNotes || w.finishNotes) && (
                                <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--labs-text-muted)" }} data-testid={`text-batch-notes-${fi}-${di}-${wi}`}>
                                  {[w.noseNotes && `Nase: ${w.noseNotes}`, w.tasteNotes && `Geschmack: ${w.tasteNotes}`, w.finishNotes && `Abgang: ${w.finishNotes}`].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="labs-card p-4 flex items-center gap-3 flex-wrap" style={{ position: "sticky", bottom: 8 }}>
            <span className="text-sm flex-1" style={{ color: "var(--labs-text-muted)" }} data-testid="text-batch-selected-count">
              {t("batchImport.selectedCount", { count: totalSelectedWhiskies })}
            </span>
            <button onClick={reset} className="labs-btn-secondary" data-testid="button-batch-cancel">{t("batchImport.cancel")}</button>
            <button onClick={commit} disabled={committing || totalSelectedWhiskies === 0} className="labs-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: (committing || totalSelectedWhiskies === 0) ? 0.5 : 1 }} data-testid="button-batch-commit">
              {committing ? <><Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> {t("batchImport.importing")}</> : <><Check className="w-4 h-4" /> {t("batchImport.commit")}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
