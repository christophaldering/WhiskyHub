import { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles, RefreshCw, Download, ChevronDown, ChevronUp, Trash2, AlertTriangle, ExternalLink, Image as ImageIcon, Pencil, Save, X, ArrowUp, ArrowDown } from "lucide-react";
import { autoHandoutApi } from "@/lib/api";
import { generateAutoHandoutPdf } from "@/components/auto-handout-pdf";
import { RichTextEditor } from "@/components/rich-text-editor";
import DOMPurify from "dompurify";

// Auto-handout chapter content originates from AI summarization of public web
// sources and may be further edited by the host through the rich text editor.
// Both inputs are untrusted (prompt injection / malicious markup) so we always
// sanitize before injecting as HTML. Allow only basic formatting tags — no
// scripts, no event handlers, no embedded resources.
function sanitizeChapterHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "b", "i", "ul", "ol", "li", "a", "h1", "h2", "h3", "blockquote", "code"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}

interface Tasting { id: string; title: string; hostId: string; }

type Tone = "sachlich" | "erzaehlerisch" | "locker";
type LengthPref = "compact" | "medium" | "long";
type Language = "de" | "en";

interface ChapterRef {
  kind: "distillery" | "whisky";
  subjectKey: string;
  subjectName: string;
  chapter: { id: string; title: string; content: string; sources: number[]; confidence: "high" | "medium" | "low" };
  sources: { url: string; title: string; source: string; snippet?: string }[];
  customContent?: string;
  enabled: boolean;
}

interface AutoHandoutSourceRef { url: string; title: string; snippet?: string; source: string; }
interface AutoHandoutImageRef { url: string; title?: string; source: string; license?: string; pageUrl?: string }
interface AutoHandoutSelectedImage { subjectKind: "distillery" | "whisky"; subjectKey: string; url: string; title?: string; source?: string; license?: string; }
interface AutoHandoutSelectionEntry { enabled?: boolean; customContent?: string; }
interface AutoHandoutSelection {
  distilleries?: Record<string, Record<string, AutoHandoutSelectionEntry>>;
  whiskies?: Record<string, Record<string, AutoHandoutSelectionEntry>>;
}
interface AutoHandoutBinding {
  language: Language;
  tone: Tone;
  lengthPref: LengthPref;
  visibility: "always" | "after_first_reveal";
  selection: AutoHandoutSelection;
  selectedImages: AutoHandoutSelectedImage[];
  chapterOrder: string[];
  status: "idle" | "generating" | "ready" | "error";
  progress: number;
  progressTotal: number;
  errorMessage: string | null;
  generatedAt: string | null;
  acknowledgedNotice: boolean;
}
interface AutoHandoutData {
  binding: AutoHandoutBinding;
  guestVisible?: boolean;
  hostName?: string | null;
  chapters: ChapterRef[];
  distilleries: {
    nameKey: string;
    displayName: string;
    images: AutoHandoutImageRef[];
    selectedImage: string | null;
  }[];
  whiskies: { whiskyKey: string; name: string; distillery: string | null; sources: AutoHandoutSourceRef[] }[];
}

const TONE_LABELS: Record<Tone, string> = { sachlich: "Sachlich", erzaehlerisch: "Erzählerisch", locker: "Locker" };
const LENGTH_LABELS: Record<LengthPref, string> = { compact: "Kompakt", medium: "Mittel", long: "Ausführlich" };

function ConfidenceBadge({ c }: { c: "high" | "medium" | "low" }) {
  const map = {
    high: { label: "verlässlich", color: "bg-green-100 text-green-800 border-green-300" },
    medium: { label: "teils belegt", color: "bg-amber-100 text-amber-800 border-amber-300" },
    low: { label: "unsicher", color: "bg-rose-100 text-rose-800 border-rose-300" },
  };
  const m = map[c];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${m.color}`}>{m.label}</span>;
}

function chapterRefId(r: ChapterRef): string {
  return `${r.kind}:${r.subjectKey}:${r.chapter.id}`;
}

export default function AutoHandoutManager({ tasting, hostId }: { tasting: Tasting; hostId: string }) {
  const [data, setData] = useState<AutoHandoutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [regenForId, setRegenForId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await autoHandoutApi.get(tasting.id);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    }
  }, [tasting.id]);

  useEffect(() => { load(); }, [load]);

  // Poll while generating
  useEffect(() => {
    if (data?.binding.status !== "generating") return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [data?.binding.status, load]);

  const startGeneration = async (forceRefresh = false) => {
    setError(null);
    setLoading(true);
    try {
      await autoHandoutApi.generate(tasting.id, {
        language: data?.binding.language || "de",
        tone: data?.binding.tone || "erzaehlerisch",
        length: data?.binding.lengthPref || "medium",
        forceRefresh,
      });
      setExpanded(true);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateBinding = async (patch: Partial<AutoHandoutBinding>) => {
    try {
      await autoHandoutApi.update(tasting.id, patch as any);
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const toggleChapter = async (ref: ChapterRef, enabled: boolean) => {
    if (!data) return;
    const sel = JSON.parse(JSON.stringify(data.binding.selection || {}));
    const bucket = ref.kind === "distillery" ? "distilleries" : "whiskies";
    sel[bucket] = sel[bucket] || {};
    sel[bucket][ref.subjectKey] = sel[bucket][ref.subjectKey] || {};
    sel[bucket][ref.subjectKey][ref.chapter.id] = { ...(sel[bucket][ref.subjectKey][ref.chapter.id] || {}), enabled };
    await updateBinding({ selection: sel });
  };

  const saveEdit = async (ref: ChapterRef) => {
    if (!data) return;
    const sel = JSON.parse(JSON.stringify(data.binding.selection || {}));
    const bucket = ref.kind === "distillery" ? "distilleries" : "whiskies";
    sel[bucket] = sel[bucket] || {};
    sel[bucket][ref.subjectKey] = sel[bucket][ref.subjectKey] || {};
    sel[bucket][ref.subjectKey][ref.chapter.id] = {
      ...(sel[bucket][ref.subjectKey][ref.chapter.id] || { enabled: true }),
      customContent: editText,
    };
    await updateBinding({ selection: sel });
    setEditingId(null);
  };

  const regenerate = async (ref: ChapterRef, tone: Tone, length: LengthPref) => {
    setRegenForId(chapterRefId(ref));
    try {
      await autoHandoutApi.regenerateChapter(tasting.id, {
        kind: ref.kind, subjectKey: ref.subjectKey, chapterId: ref.chapter.id,
        tone, length, language: data?.binding.language || "de",
      });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setRegenForId(null); }
  };

  const moveChapter = async (refId: string, dir: -1 | 1) => {
    if (!data) return;
    const order = data.chapters.map(chapterRefId);
    const i = order.indexOf(refId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    await updateBinding({ chapterOrder: order });
  };

  const selectImage = async (subjectKey: string, url: string, img: AutoHandoutImageRef) => {
    if (!data) return;
    const list = (data.binding.selectedImages || []).filter((x) => x.subjectKey !== subjectKey);
    list.push({ subjectKind: "distillery", subjectKey, url, title: img.title, source: img.source, license: img.license });
    await updateBinding({ selectedImages: list });
  };

  const exportPdf = async () => {
    if (!data) return;
    if (!data.binding.acknowledgedNotice) {
      const ok = confirm("Du hast die KI-Inhalte noch nicht freigegeben. Trotzdem als PDF exportieren? (Gäste sehen das PDF nicht automatisch.)");
      if (!ok) return;
    }
    const selectedImages: Record<string, string> = {};
    for (const img of data.binding.selectedImages || []) {
      selectedImages[img.subjectKey] = img.url;
    }
    await generateAutoHandoutPdf({
      tastingTitle: tasting.title,
      hostName: data.hostName ?? null,
      language: data.binding.language,
      chapters: data.chapters as any,
      generatedAt: data.binding.generatedAt,
      selectedImages,
    });
  };

  const handleDelete = async () => {
    if (!confirm("Auto-Handout wirklich löschen? Die zwischengespeicherten Brennerei-Recherchen bleiben erhalten und können wiederverwendet werden.")) return;
    try {
      await autoHandoutApi.delete(tasting.id);
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const status = data?.binding.status || "idle";
  const hasContent = data && data.chapters.length > 0;
  const distinctSubjects = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const arr: { kind: string; key: string; name: string }[] = [];
    for (const c of data.chapters) {
      const k = `${c.kind}:${c.subjectKey}`;
      if (!seen.has(k)) { seen.add(k); arr.push({ kind: c.kind, key: c.subjectKey, name: c.subjectName }); }
    }
    return arr;
  }, [data]);

  return (
    <div className="labs-card p-4" data-testid="auto-handout-manager">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <div>
            <div className="font-semibold text-base">Auto-Handout-Generator</div>
            <div className="text-xs text-neutral-600">Recherchiert deine Whiskies & Destillen automatisch und baut ein Handout. Ergänzt – nicht ersetzt – ein eigenes Handout.</div>
          </div>
        </div>
        <button
          className="labs-btn-ghost text-xs"
          onClick={() => setExpanded((e) => !e)}
          data-testid="button-toggle-auto-handout"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span data-testid="text-auto-handout-error">{error}</span>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Settings row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">Sprache</label>
              <select
                className="labs-input text-xs w-full"
                value={data?.binding.language || "de"}
                onChange={(e) => updateBinding({ language: e.target.value as Language })}
                data-testid="select-language"
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">Tonalität</label>
              <select
                className="labs-input text-xs w-full"
                value={data?.binding.tone || "erzaehlerisch"}
                onChange={(e) => updateBinding({ tone: e.target.value as Tone })}
                data-testid="select-tone"
              >
                {Object.entries(TONE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">Länge</label>
              <select
                className="labs-input text-xs w-full"
                value={data?.binding.lengthPref || "medium"}
                onChange={(e) => updateBinding({ lengthPref: e.target.value as LengthPref })}
                data-testid="select-length"
              >
                {Object.entries(LENGTH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">Sichtbarkeit</label>
              <select
                className="labs-input text-xs w-full"
                value={data?.binding.visibility || "always"}
                onChange={(e) => updateBinding({ visibility: e.target.value as "always" | "after_first_reveal" })}
                data-testid="select-visibility"
              >
                <option value="always">Immer sichtbar</option>
                <option value="after_first_reveal">Nach erstem Reveal</option>
              </select>
            </div>
          </div>

          {/* Generate / Regenerate buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="labs-btn-primary text-xs"
              onClick={() => startGeneration(false)}
              disabled={loading || status === "generating"}
              data-testid="button-generate-auto-handout"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {hasContent ? "Aktualisieren" : "Auto-Handout generieren"}
            </button>
            {hasContent && (
              <>
                <button
                  className="labs-btn-ghost text-xs"
                  onClick={() => startGeneration(true)}
                  disabled={loading || status === "generating"}
                  data-testid="button-force-refresh-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Alle Quellen neu laden
                </button>
                <button className="labs-btn-ghost text-xs" onClick={exportPdf} data-testid="button-export-pdf">
                  <Download className="w-3.5 h-3.5 mr-1" />
                  PDF exportieren
                </button>
                <button className="labs-btn-ghost text-xs text-rose-700" onClick={handleDelete} data-testid="button-delete-auto-handout">
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Löschen
                </button>
              </>
            )}
          </div>

          {status === "generating" && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2" data-testid="status-generating">
              Generiere… {data?.binding.progress || 0} / {data?.binding.progressTotal || 0}
              <div className="h-1.5 bg-amber-200 rounded mt-1 overflow-hidden">
                <div
                  className="h-full bg-amber-600 transition-all"
                  style={{ width: `${data?.binding.progressTotal ? Math.round(100 * (data.binding.progress / Math.max(1, data.binding.progressTotal))) : 0}%` }}
                />
              </div>
            </div>
          )}
          {status === "error" && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
              {data?.binding.errorMessage || "Fehler"}
            </div>
          )}

          {!hasContent && status === "idle" && (
            <div className="text-xs text-neutral-500 italic">
              Noch keine Inhalte. Klick auf <em>„Auto-Handout generieren“</em> – die App recherchiert Brennereien & Whiskies und schlägt Texte vor, die du editieren oder regenerieren kannst.
            </div>
          )}

          {/* Acknowledgement gate: chapters are NOT shown to guests until host
              has reviewed and confirmed the AI-generated content. */}
          {hasContent && data && !data.binding.acknowledgedNotice && (
            <div className="text-xs bg-amber-50 border border-amber-300 rounded p-3" data-testid="acknowledge-notice">
              <div className="font-semibold text-amber-900 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Vor der Freigabe gegenlesen
              </div>
              <div className="text-amber-900 mb-2">
                Diese Inhalte sind <strong>KI-generiert</strong>. Bitte lies sie einmal durch und korrigiere alles, was nicht stimmt.
                Solange du nicht bestätigst, sehen Gäste das Auto-Handout <strong>nicht</strong> – auch nicht über die API.
              </div>
              <button
                className="labs-btn-primary text-xs"
                onClick={() => updateBinding({ acknowledgedNotice: true })}
                data-testid="button-acknowledge-notice"
              >
                Ich habe gegengelesen – Auto-Handout für Gäste freigeben
              </button>
            </div>
          )}
          {hasContent && data && data.binding.acknowledgedNotice && (
            <div className="text-[11px] text-green-800 bg-green-50 border border-green-200 rounded p-2 flex items-center justify-between gap-2">
              <span>✓ Vom Host freigegeben — Gäste sehen das Auto-Handout (gemäß Sichtbarkeit „{data.binding.visibility === "always" ? "immer" : "nach erstem Reveal"}“).</span>
              <button
                className="text-[11px] underline text-neutral-600 hover:text-amber-700"
                onClick={() => updateBinding({ acknowledgedNotice: false })}
                data-testid="button-revoke-acknowledgement"
              >Freigabe zurückziehen</button>
            </div>
          )}

          {/* Distillery image picker */}
          {data && data.distilleries.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-xs font-semibold mb-2 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Bilder pro Brennerei (Lizenz prüfen!)</div>
              <div className="space-y-3">
                {data.distilleries.map((d) => (
                  <div key={d.nameKey} className="text-xs">
                    <div className="font-medium mb-1">{d.displayName}</div>
                    {d.images.length === 0 ? (
                      <div className="text-neutral-500 italic">Keine Bilder gefunden.</div>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {d.images.slice(0, 8).map((img) => (
                          <button
                            key={img.url}
                            onClick={() => selectImage(d.nameKey, img.url, img)}
                            className={`flex-shrink-0 border-2 rounded overflow-hidden ${d.selectedImage === img.url ? "border-amber-600" : "border-transparent hover:border-neutral-300"}`}
                            title={`${img.title || ""}\n${img.license || ""}`}
                            data-testid={`img-pick-${d.nameKey}`}
                          >
                            <img src={img.url} alt={img.title || ""} className="w-16 h-16 object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-neutral-500 italic mt-1">
                Hinweis: Bilder kommen aus Wikipedia/Commons. Lizenz pro Bild auf Commons prüfen, bevor du das PDF weitergibst.
              </div>
            </div>
          )}

          {/* Chapter list */}
          {hasContent && (
            <div className="border-t pt-3 space-y-3">
              <div className="text-xs font-semibold">Kapitel ({data!.chapters.filter((c) => c.enabled).length} aktiv)</div>
              {distinctSubjects.map((subj) => {
                const items = data!.chapters.filter((c) => c.kind === subj.kind && c.subjectKey === subj.key);
                return (
                  <div key={`${subj.kind}:${subj.key}`} className="border rounded p-2 bg-white/40">
                    <div className="font-semibold text-sm text-amber-800 mb-1">
                      {subj.kind === "distillery" ? "🏛 " : "🥃 "}{subj.name}
                      {subj.kind === "distillery" && (
                        <button
                          className="ml-2 text-[10px] text-neutral-600 underline hover:text-amber-700"
                          onClick={async () => { try { await autoHandoutApi.refreshDistillery(tasting.id, subj.key); await load(); } catch (e: any) { setError(e.message); } }}
                          data-testid={`button-refresh-distillery-${subj.key}`}
                        >Quellen neu laden</button>
                      )}
                    </div>
                    {items.map((ref) => {
                      const id = chapterRefId(ref);
                      const isEditing = editingId === id;
                      const isRegen = regenForId === id;
                      return (
                        <div key={id} className="border-t pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0" data-testid={`chapter-${id}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={ref.enabled}
                                onChange={(e) => toggleChapter(ref, e.target.checked)}
                                data-testid={`checkbox-chapter-${id}`}
                              />
                              <span className="font-medium text-sm">{ref.chapter.title}</span>
                              <ConfidenceBadge c={ref.chapter.confidence} />
                            </div>
                            <div className="flex items-center gap-1">
                              <button className="labs-btn-ghost p-1" onClick={() => moveChapter(id, -1)} title="Hoch"><ArrowUp className="w-3 h-3" /></button>
                              <button className="labs-btn-ghost p-1" onClick={() => moveChapter(id, 1)} title="Runter"><ArrowDown className="w-3 h-3" /></button>
                              {!isEditing && (
                                <button className="labs-btn-ghost p-1" onClick={() => { setEditingId(id); setEditText(ref.customContent || ref.chapter.content); }} title="Editieren">
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="mt-2 space-y-1" data-testid={`editor-edit-${id}`}>
                              <RichTextEditor
                                content={editText}
                                onChange={setEditText}
                                placeholder="Kapitelinhalt bearbeiten…"
                              />
                              <div className="flex gap-1">
                                <button className="labs-btn-primary text-xs" onClick={() => saveEdit(ref)} data-testid={`button-save-edit-${id}`}><Save className="w-3 h-3 mr-1" />Speichern</button>
                                <button className="labs-btn-ghost text-xs" onClick={() => setEditingId(null)}><X className="w-3 h-3 mr-1" />Abbrechen</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="text-xs text-neutral-800 mt-1 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: sanitizeChapterHtml(ref.customContent || ref.chapter.content) }}
                            />
                          )}
                          <div className="mt-1 flex flex-wrap gap-1 text-[10px] items-center">
                            <span className="text-neutral-500">Regenerieren:</span>
                            {(["sachlich", "erzaehlerisch", "locker"] as Tone[]).map((t) => (
                              <button
                                key={t}
                                className="labs-btn-ghost px-1.5 py-0.5"
                                disabled={isRegen}
                                onClick={() => regenerate(ref, t, data!.binding.lengthPref)}
                                data-testid={`button-regen-${id}-${t}`}
                              >{TONE_LABELS[t]}</button>
                            ))}
                            <span className="text-neutral-300">|</span>
                            {(["compact", "medium", "long"] as LengthPref[]).map((l) => (
                              <button
                                key={l}
                                className="labs-btn-ghost px-1.5 py-0.5"
                                disabled={isRegen}
                                onClick={() => regenerate(ref, data!.binding.tone, l)}
                                data-testid={`button-regen-${id}-${l}`}
                              >{LENGTH_LABELS[l]}</button>
                            ))}
                            {isRegen && <span className="text-amber-600">…</span>}
                          </div>
                          {ref.chapter.sources.length > 0 && (
                            <div className="mt-1 text-[10px] text-neutral-500">
                              Quellen: {ref.chapter.sources.map((i) => {
                                const s = ref.sources[i];
                                if (!s) return null;
                                return (
                                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline hover:text-amber-700 mr-2">
                                    [{i + 1}] {s.source}<ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Guest viewer — collapsed "Zusatzinfos" block (read-only).
// Defers to host upload as primary content; renders below it.
// =====================================================================
export function AutoHandoutViewer({ tasting, anyRevealed, hasHostUpload = false }: { tasting: Tasting; anyRevealed: boolean; hasHostUpload?: boolean }) {
  const [data, setData] = useState<AutoHandoutData | null>(null);
  // When the host has uploaded their own handout, the auto-handout is shown as
  // a secondary, collapsible "Zusatzinfos" block. Otherwise it becomes the
  // primary "Handout" presentation, expanded by default.
  const [open, setOpen] = useState(!hasHostUpload);

  useEffect(() => {
    autoHandoutApi.get(tasting.id).then(setData).catch(() => {});
  }, [tasting.id]);

  if (!data || data.binding.status !== "ready" || data.chapters.filter((c) => c.enabled).length === 0) return null;
  // Server already strips chapter content unless guestVisible is true. We
  // additionally hide the entire block to avoid an empty placeholder card.
  if (data.guestVisible === false) return null;
  if (data.binding.visibility === "after_first_reveal" && !anyRevealed) return null;

  const subjects = new Map<string, { kind: string; name: string; chapters: ChapterRef[] }>();
  for (const c of data.chapters) {
    if (!c.enabled) continue;
    const k = `${c.kind}:${c.subjectKey}`;
    if (!subjects.has(k)) subjects.set(k, { kind: c.kind, name: c.subjectName, chapters: [] });
    subjects.get(k)!.chapters.push(c);
  }

  const isPrimary = !hasHostUpload;
  const headingLabel = isPrimary ? "Handout" : "Zusatzinfos der App";

  return (
    <div className={`labs-card p-3 mt-3 ${isPrimary ? "border-amber-300 bg-amber-50/40" : ""}`} data-testid="auto-handout-viewer">
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
        data-testid="button-toggle-auto-handout-viewer"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className={`font-semibold ${isPrimary ? "text-base" : "text-sm"}`}>{headingLabel}</span>
          <span className="text-[10px] text-neutral-500">automatisch recherchiert</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className={`mt-3 space-y-3 ${isPrimary ? "text-sm" : "text-xs"}`}>
          {Array.from(subjects.values()).map((s, idx) => {
            const subjectKey = s.chapters[0]?.subjectKey;
            const dist = data.distilleries.find((d) => d.nameKey === subjectKey);
            const heroImage = s.kind === "distillery" ? dist?.selectedImage : null;
            return (
            <div key={idx} className="border-t pt-2 first:border-t-0 first:pt-0">
              <div className="font-semibold text-amber-800 mb-1">{s.kind === "distillery" ? "🏛 " : "🥃 "}{s.name}</div>
              {heroImage && (
                <img
                  src={heroImage}
                  alt={s.name}
                  className="rounded mb-2 max-h-40 object-cover"
                  data-testid={`img-handout-${subjectKey}`}
                  loading="lazy"
                />
              )}
              {s.chapters.map((ref) => (
                <div key={chapterRefId(ref)} className="mb-2">
                  <div className="font-medium flex items-center gap-1">
                    {ref.chapter.title} <ConfidenceBadge c={ref.chapter.confidence} />
                  </div>
                  <div
                    className="text-neutral-700 prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeChapterHtml(ref.customContent || ref.chapter.content) }}
                  />
                  {ref.chapter.sources.length > 0 && (
                    <div className="text-[10px] text-neutral-500 mt-1">
                      {ref.chapter.sources.map((i) => {
                        const sr = ref.sources[i];
                        if (!sr) return null;
                        return <a key={i} href={sr.url} target="_blank" rel="noopener noreferrer" className="underline mr-2">[{i + 1}] {sr.source}</a>;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            );
          })}
          <div className="text-[10px] italic text-neutral-500 border-t pt-2">
            Hinweis: Diese Inhalte wurden von CaskSense aus öffentlichen Quellen erstellt. Aussagen mit „teils belegt“ oder „unsicher“ bitte gegenprüfen.
          </div>
        </div>
      )}
    </div>
  );
}
