import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  aiDescribeTastingStoryImage,
  aiDescribeTastingStoryImagesBatch,
  createTastingStoryImagePoolEntry,
  deleteTastingStoryImagePoolEntry,
  listTastingStoryImagePool,
  updateTastingStoryImagePoolEntry,
  type ImagePoolDescribeFields,
  type ImagePoolMetadataPatch,
  type TastingStoryImageItem,
} from "../../lib/tastingStoryDataApi";

export type StoryImagePoolMode = "manage" | "pick";

type Participant = { id: string; name?: string | null; displayName?: string | null };
type Whisky = { id: string; name?: string | null; distillery?: string | null };

type Props = {
  tastingId: string;
  mode: StoryImagePoolMode;
  open: boolean;
  language?: "de" | "en";
  participants?: Participant[];
  whiskies?: Whisky[];
  initialFilterCategory?: string | null;
  initialFilterParticipantId?: string | null;
  onClose: () => void;
  onPick?: (item: TastingStoryImageItem) => void;
  testIdPrefix?: string;
};

const COMMON_CATEGORIES = ["Hero", "Galerie", "Atmosphäre", "Teilnehmer", "Whisky", "Detail", "Raum", "Sonstiges"];

export function StoryImagePool({
  tastingId,
  mode,
  open,
  language = "de",
  participants = [],
  whiskies = [],
  initialFilterCategory = null,
  initialFilterParticipantId = null,
  onClose,
  onPick,
  testIdPrefix = "image-pool",
}: Props) {
  const [items, setItems] = useState<TastingStoryImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>(initialFilterCategory ?? "");
  const [filterParticipantId, setFilterParticipantId] = useState<string>(initialFilterParticipantId ?? "");
  useEffect(() => {
    if (!open) return;
    setFilterCategory(initialFilterCategory ?? "");
    setFilterParticipantId(initialFilterParticipantId ?? "");
  }, [open, initialFilterCategory, initialFilterParticipantId]);
  const [filterText, setFilterText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Array<{ name: string; status: "uploading" | "done" | "error"; message?: string }>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [aiPreview, setAiPreview] = useState<{
    items: Array<{
      id: string;
      url: string;
      currentName: string | null;
      currentCaption: string | null;
      currentAltText: string | null;
      currentMoodDescription: string | null;
      suggested: { name?: string | null; caption?: string | null; altText?: string | null; moodDescription?: string | null; suggestedParticipantIds?: string[]; suggestedWhiskyIds?: string[] };
      apply: { name: boolean; caption: boolean; altText: boolean; moodDescription: boolean; participants: boolean; whiskies: boolean };
    }>;
    failedIds: string[];
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listTastingStoryImagePool(tastingId);
      setItems(list);
      if (selectedId && !list.some((it) => it.id === selectedId)) setSelectedId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bild-Pool konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [tastingId, selectedId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const uploadFile = useCallback(
    async (file: File, slotIndex: number) => {
      try {
        if (file.size > 20 * 1024 * 1024) {
          throw new Error("Datei zu groß (max 20 MB)");
        }
        const fd = new FormData();
        fd.append("file", file);
        const resp = await fetch(`/api/tasting-stories/${tastingId}/image-pool/upload`, { method: "POST", body: fd, credentials: "include" });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          let parsed = "";
          try {
            const j = txt ? JSON.parse(txt) : null;
            if (j && typeof j.message === "string") parsed = j.message;
          } catch {
            parsed = txt;
          }
          throw new Error(parsed || "Upload fehlgeschlagen");
        }
        const data = (await resp.json()) as { url?: string };
        if (!data.url) throw new Error("Antwort ohne URL");
        const created = await createTastingStoryImagePoolEntry(tastingId, {
          url: data.url,
          name: file.name.replace(/\.[^/.]+$/, "").slice(0, 200),
        });
        setItems((prev) => {
          if (prev.some((it) => it.id === created.id)) return prev;
          return [...prev, created];
        });
        setSelectedId(created.id);
        setUploadProgress((prev) => prev.map((p, i) => (i === slotIndex ? { ...p, status: "done" } : p)));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Upload fehlgeschlagen";
        setUploadProgress((prev) => prev.map((p, i) => (i === slotIndex ? { ...p, status: "error", message: msg } : p)));
      }
    },
    [tastingId],
  );

  const onPickFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return;
      const arr: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f) arr.push(f);
      }
      if (arr.length === 0) return;
      setBusy(true);
      setError(null);
      const baseIndex = uploadProgress.length;
      setUploadProgress((prev) => [
        ...prev,
        ...arr.map((f) => ({ name: f.name, status: "uploading" as const })),
      ]);
      try {
        await Promise.all(arr.map((f, i) => uploadFile(f, baseIndex + i)));
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [uploadFile, uploadProgress.length],
  );

  const dismissUploadProgress = useCallback(() => {
    setUploadProgress([]);
  }, []);

  const onDragOverDropZone = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDragOver(true);
    }
  }, []);
  const onDragLeaveDropZone = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);
  const onDropFiles = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const dt = e.dataTransfer;
      if (!dt) return;
      const files = dt.files;
      if (files && files.length > 0) void onPickFiles(files);
    },
    [onPickFiles],
  );

  const filtered = useMemo(() => {
    const ftxt = filterText.trim().toLowerCase();
    return items.filter((it) => {
      if (filterCategory && !it.categories.includes(filterCategory)) return false;
      if (filterParticipantId && !it.participantIds.includes(filterParticipantId)) return false;
      if (ftxt) {
        const hay = [it.name ?? "", it.caption ?? "", it.altText ?? "", it.moodDescription ?? "", ...it.categories]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(ftxt)) return false;
      }
      return true;
    });
  }, [items, filterCategory, filterParticipantId, filterText]);

  const selected = useMemo(() => items.find((it) => it.id === selectedId) ?? null, [items, selectedId]);

  const updateItem = useCallback(
    async (imageId: string, patch: ImagePoolMetadataPatch) => {
      setBusy(true);
      setError(null);
      try {
        const updated = await updateTastingStoryImagePoolEntry(tastingId, imageId, patch);
        setItems((prev) => prev.map((it) => (it.id === imageId ? updated : it)));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Aktualisierung fehlgeschlagen");
      } finally {
        setBusy(false);
      }
    },
    [tastingId],
  );

  const removeItem = useCallback(
    async (imageId: string) => {
      if (!window.confirm("Dieses Bild aus dem Pool entfernen?")) return;
      setBusy(true);
      setError(null);
      try {
        await deleteTastingStoryImagePoolEntry(tastingId, imageId);
        setItems((prev) => prev.filter((it) => it.id !== imageId));
        if (selectedId === imageId) setSelectedId(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
      } finally {
        setBusy(false);
      }
    },
    [tastingId, selectedId],
  );

  const aiDescribeOne = useCallback(
    async (imageId: string, fields?: ImagePoolDescribeFields[]) => {
      setBusy(true);
      setError(null);
      try {
        const result = await aiDescribeTastingStoryImage(tastingId, imageId, { fields, language });
        setItems((prev) => prev.map((it) => (it.id === imageId ? result.item : it)));
        if (result.suggestedParticipantIds.length > 0 || result.suggestedWhiskyIds.length > 0) {
          const merged = {
            ...result.item,
            participantIds: Array.from(new Set([...result.item.participantIds, ...result.suggestedParticipantIds])),
            whiskyIds: Array.from(new Set([...result.item.whiskyIds, ...result.suggestedWhiskyIds])),
          };
          const updated = await updateTastingStoryImagePoolEntry(tastingId, imageId, {
            participantIds: merged.participantIds,
            whiskyIds: merged.whiskyIds,
          });
          setItems((prev) => prev.map((it) => (it.id === imageId ? updated : it)));
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "KI-Beschreibung fehlgeschlagen");
      } finally {
        setBusy(false);
      }
    },
    [tastingId, language],
  );

  const aiDescribeAll = useCallback(async () => {
    if (filtered.length === 0) return;
    setBatchBusy(true);
    setError(null);
    try {
      const ids = filtered.map((it) => it.id);
      const result = await aiDescribeTastingStoryImagesBatch(tastingId, ids, { language, onlyMissing: false, dryRun: true });
      const previews = result.previews ?? [];
      if (previews.length === 0) {
        setError(`Keine KI-Vorschläge erhalten. (Fehlgeschlagen: ${result.failedIds.length})`);
        return;
      }
      const itemsById = new Map(items.map((it) => [it.id, it] as const));
      setAiPreview({
        items: previews.map((p) => {
          const cur = itemsById.get(p.id);
          return {
            id: p.id,
            url: p.current.url,
            currentName: cur?.name ?? p.current.name,
            currentCaption: cur?.caption ?? p.current.caption,
            currentAltText: cur?.altText ?? p.current.altText,
            currentMoodDescription: cur?.moodDescription ?? p.current.moodDescription,
            suggested: {
              name: p.suggested.name ?? null,
              caption: p.suggested.caption ?? null,
              altText: p.suggested.altText ?? null,
              moodDescription: p.suggested.moodDescription ?? null,
              suggestedParticipantIds: p.suggestedParticipantIds,
              suggestedWhiskyIds: p.suggestedWhiskyIds,
            },
            apply: {
              name: typeof p.suggested.name === "string" && p.suggested.name.length > 0,
              caption: typeof p.suggested.caption === "string" && p.suggested.caption.length > 0,
              altText: typeof p.suggested.altText === "string" && p.suggested.altText.length > 0,
              moodDescription: typeof p.suggested.moodDescription === "string" && p.suggested.moodDescription.length > 0,
              participants: p.suggestedParticipantIds.length > 0,
              whiskies: p.suggestedWhiskyIds.length > 0,
            },
          };
        }),
        failedIds: result.failedIds,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Batch-Beschreibung fehlgeschlagen");
    } finally {
      setBatchBusy(false);
    }
  }, [tastingId, filtered, language, items]);

  const togglePreviewApply = useCallback(
    (imageId: string, key: "name" | "caption" | "altText" | "moodDescription" | "participants" | "whiskies") => {
      setAiPreview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.id === imageId ? { ...it, apply: { ...it.apply, [key]: !it.apply[key] } } : it,
          ),
        };
      });
    },
    [],
  );

  const applyAiPreview = useCallback(async () => {
    if (!aiPreview) return;
    setBatchBusy(true);
    setError(null);
    try {
      const itemsById = new Map(items.map((it) => [it.id, it] as const));
      const updates: TastingStoryImageItem[] = [];
      for (const entry of aiPreview.items) {
        const current = itemsById.get(entry.id);
        if (!current) continue;
        const patch: ImagePoolMetadataPatch = {};
        let changed = false;
        if (entry.apply.name && typeof entry.suggested.name === "string" && entry.suggested.name.length > 0) {
          patch.name = entry.suggested.name;
          changed = true;
        }
        if (entry.apply.caption && typeof entry.suggested.caption === "string" && entry.suggested.caption.length > 0) {
          patch.caption = entry.suggested.caption;
          changed = true;
        }
        if (entry.apply.altText && typeof entry.suggested.altText === "string" && entry.suggested.altText.length > 0) {
          patch.altText = entry.suggested.altText;
          changed = true;
        }
        if (entry.apply.moodDescription && typeof entry.suggested.moodDescription === "string" && entry.suggested.moodDescription.length > 0) {
          patch.moodDescription = entry.suggested.moodDescription;
          changed = true;
        }
        if (entry.apply.participants && entry.suggested.suggestedParticipantIds && entry.suggested.suggestedParticipantIds.length > 0) {
          patch.participantIds = Array.from(new Set([...current.participantIds, ...entry.suggested.suggestedParticipantIds]));
          changed = true;
        }
        if (entry.apply.whiskies && entry.suggested.suggestedWhiskyIds && entry.suggested.suggestedWhiskyIds.length > 0) {
          patch.whiskyIds = Array.from(new Set([...current.whiskyIds, ...entry.suggested.suggestedWhiskyIds]));
          changed = true;
        }
        if (!changed) continue;
        try {
          const updated = await updateTastingStoryImagePoolEntry(tastingId, entry.id, patch);
          updates.push(updated);
        } catch (err) {
          console.warn("[image-pool/preview-apply] failed for", entry.id, err);
        }
      }
      if (updates.length > 0) {
        const map = new Map(updates.map((it) => [it.id, it] as const));
        setItems((prev) => prev.map((it) => map.get(it.id) ?? it));
      }
      setAiPreview(null);
    } finally {
      setBatchBusy(false);
    }
  }, [aiPreview, items, tastingId]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bild-Pool"
      data-testid={`dialog-${testIdPrefix}`}
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modalStyle}>
        <header style={headerStyle}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: "#C9A961" }}>
              Bild-Pool
            </div>
            <div style={{ fontSize: 16, color: "#F5EDE0", marginTop: 4 }}>
              {mode === "pick" ? "Bild auswählen" : "Bilder verwalten"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={primaryBtn}
              disabled={busy}
              data-testid={`button-${testIdPrefix}-upload`}
            >
              {busy ? "Lädt…" : "Hochladen"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={(e) => void onPickFiles(e.target.files)}
              style={{ display: "none" }}
              data-testid={`fileinput-${testIdPrefix}`}
            />
            <button
              type="button"
              onClick={() => void aiDescribeAll()}
              style={ghostBtn}
              disabled={batchBusy || filtered.length === 0}
              data-testid={`button-${testIdPrefix}-ai-all`}
              title="Alle gefilterten Bilder per KI beschreiben (nur leere Felder)"
            >
              {batchBusy ? "KI läuft…" : `KI: alle (${filtered.length})`}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={ghostBtn}
              data-testid={`button-${testIdPrefix}-close`}
            >
              Schließen
            </button>
          </div>
        </header>

        <div style={filtersStyle}>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Suche in Name, Caption, Alt-Text…"
            style={inputStyle}
            data-testid={`input-${testIdPrefix}-search`}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={inputStyle}
            data-testid={`select-${testIdPrefix}-category`}
          >
            <option value="">Alle Kategorien</option>
            {COMMON_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {participants.length > 0 ? (
            <select
              value={filterParticipantId}
              onChange={(e) => setFilterParticipantId(e.target.value)}
              style={inputStyle}
              data-testid={`select-${testIdPrefix}-participant`}
            >
              <option value="">Alle Teilnehmer</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName || p.name || p.id}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {error ? (
          <div role="alert" style={errorStyle} data-testid={`error-${testIdPrefix}`}>
            {error}
          </div>
        ) : null}

        <div style={bodyStyle}>
          <div style={gridStyle} data-testid={`grid-${testIdPrefix}`}>
            {loading ? (
              <div style={{ color: "#A89A85", padding: 24 }}>Lade Bilder…</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: "#A89A85", padding: 24, gridColumn: "1 / -1", textAlign: "center" }}>
                Keine Bilder im Pool. Lade ein Bild hoch.
              </div>
            ) : (
              filtered.map((it) => {
                const isSelected = selectedId === it.id;
                return (
                  <div key={it.id} style={cardStyle(isSelected)} data-testid={`card-${testIdPrefix}-${it.id}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(it.id)}
                      style={cardImageBtn}
                      title={it.name ?? it.caption ?? ""}
                      data-testid={`button-${testIdPrefix}-select-${it.id}`}
                    >
                      <img
                        src={it.url}
                        alt={it.altText ?? it.name ?? ""}
                        loading="lazy"
                        decoding="async"
                        style={cardImg}
                      />
                    </button>
                    <div style={cardMetaStyle}>
                      <div style={cardTitleStyle} data-testid={`text-${testIdPrefix}-name-${it.id}`}>
                        {it.name || "(ohne Name)"}
                      </div>
                      <div style={cardTagsStyle}>
                        {it.categories.slice(0, 3).map((c) => (
                          <span key={c} style={tagStyle}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    {mode === "pick" && onPick ? (
                      <button
                        type="button"
                        onClick={() => onPick(it)}
                        style={pickBtn}
                        data-testid={`button-${testIdPrefix}-pick-${it.id}`}
                      >
                        Auswählen
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
          <aside style={inspectorStyle} data-testid={`inspector-${testIdPrefix}`}>
            {selected ? (
              <ImageInspector
                key={selected.id}
                item={selected}
                participants={participants}
                whiskies={whiskies}
                busy={busy}
                onChange={(patch) => void updateItem(selected.id, patch)}
                onAiDescribe={(fields) => void aiDescribeOne(selected.id, fields)}
                onDelete={() => void removeItem(selected.id)}
                testIdPrefix={`${testIdPrefix}-inspector`}
              />
            ) : (
              <div style={{ color: "#A89A85", padding: 16 }}>Wähle ein Bild aus, um Details zu bearbeiten.</div>
            )}
          </aside>
        </div>
      </div>
      {aiPreview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="KI-Vorschau"
          data-testid={`dialog-${testIdPrefix}-ai-preview`}
          style={{ ...overlayStyle, zIndex: 90 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAiPreview(null);
          }}
        >
          <div style={{ ...modalStyle, width: "min(1000px, 100%)" }}>
            <header style={headerStyle}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: "#C9A961" }}>
                  KI-Vorschläge
                </div>
                <div style={{ fontSize: 16, color: "#F5EDE0", marginTop: 4 }}>
                  {aiPreview.items.length} Bild(er) · prüfen und übernehmen
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setAiPreview(null)}
                  style={ghostBtn}
                  data-testid={`button-${testIdPrefix}-ai-preview-cancel`}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => void applyAiPreview()}
                  style={primaryBtn}
                  disabled={batchBusy}
                  data-testid={`button-${testIdPrefix}-ai-preview-apply`}
                >
                  {batchBusy ? "Übernehme…" : "Ausgewählte übernehmen"}
                </button>
              </div>
            </header>
            <div style={{ padding: 12, overflowY: "auto", display: "grid", gap: 12 }}>
              {aiPreview.failedIds.length > 0 ? (
                <div style={errorStyle} role="alert">
                  Fehlgeschlagen: {aiPreview.failedIds.length}
                </div>
              ) : null}
              {aiPreview.items.map((entry) => {
                const renderRow = (
                  fieldKey: "name" | "caption" | "altText" | "moodDescription",
                  label: string,
                  current: string | null,
                  suggested: string | null | undefined,
                ) => {
                  if (!suggested) return null;
                  return (
                    <div style={{ display: "grid", gap: 4, padding: 8, border: "1px solid rgba(201,169,97,0.18)", borderRadius: 4 }}>
                      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#C9A961", fontSize: 12, letterSpacing: ".15em", textTransform: "uppercase" }}>
                        <input
                          type="checkbox"
                          checked={entry.apply[fieldKey]}
                          onChange={() => togglePreviewApply(entry.id, fieldKey)}
                          data-testid={`checkbox-${testIdPrefix}-ai-preview-${entry.id}-${fieldKey}`}
                        />
                        {label}
                      </label>
                      <div style={{ fontSize: 12, color: "#A89A85" }}>Aktuell: {current && current.length > 0 ? current : "(leer)"}</div>
                      <div style={{ fontSize: 13, color: "#F5EDE0" }}>Vorschlag: {suggested}</div>
                    </div>
                  );
                };
                const renderLinks = (
                  key: "participants" | "whiskies",
                  label: string,
                  ids: string[] | undefined,
                  resolveLabel: (id: string) => string,
                ) => {
                  if (!ids || ids.length === 0) return null;
                  return (
                    <div style={{ display: "grid", gap: 4, padding: 8, border: "1px solid rgba(201,169,97,0.18)", borderRadius: 4 }}>
                      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#C9A961", fontSize: 12, letterSpacing: ".15em", textTransform: "uppercase" }}>
                        <input
                          type="checkbox"
                          checked={entry.apply[key]}
                          onChange={() => togglePreviewApply(entry.id, key)}
                          data-testid={`checkbox-${testIdPrefix}-ai-preview-${entry.id}-${key}`}
                        />
                        {label}
                      </label>
                      <div style={{ fontSize: 13, color: "#F5EDE0" }}>{ids.map((id) => resolveLabel(id)).join(", ")}</div>
                    </div>
                  );
                };
                return (
                  <div
                    key={entry.id}
                    style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, padding: 10, border: "1px solid rgba(201,169,97,0.25)", borderRadius: 6, background: "rgba(201,169,97,0.04)" }}
                    data-testid={`row-${testIdPrefix}-ai-preview-${entry.id}`}
                  >
                    <img
                      src={entry.url}
                      alt={entry.currentAltText ?? entry.currentName ?? ""}
                      style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 4 }}
                    />
                    <div style={{ display: "grid", gap: 8 }}>
                      {renderRow("name", "Name", entry.currentName, entry.suggested.name ?? null)}
                      {renderRow("caption", "Caption", entry.currentCaption, entry.suggested.caption ?? null)}
                      {renderRow("altText", "Alt-Text", entry.currentAltText, entry.suggested.altText ?? null)}
                      {renderRow("moodDescription", "Stimmung", entry.currentMoodDescription, entry.suggested.moodDescription ?? null)}
                      {renderLinks("participants", "Teilnehmer-Vorschlag", entry.suggested.suggestedParticipantIds, (id) => {
                        const p = participants.find((x) => x.id === id);
                        return p ? (p.displayName || p.name || id) : id;
                      })}
                      {renderLinks("whiskies", "Whisky-Vorschlag", entry.suggested.suggestedWhiskyIds, (id) => {
                        const w = whiskies.find((x) => x.id === id);
                        return w ? ([w.distillery, w.name].filter(Boolean).join(" – ") || id) : id;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type InspectorProps = {
  item: TastingStoryImageItem;
  participants: Participant[];
  whiskies: Whisky[];
  busy: boolean;
  onChange: (patch: ImagePoolMetadataPatch) => void;
  onAiDescribe: (fields?: ImagePoolDescribeFields[]) => void;
  onDelete: () => void;
  testIdPrefix: string;
};

function ImageInspector({ item, participants, whiskies, busy, onChange, onAiDescribe, onDelete, testIdPrefix }: InspectorProps) {
  const [name, setName] = useState(item.name ?? "");
  const [caption, setCaption] = useState(item.caption ?? "");
  const [altText, setAltText] = useState(item.altText ?? "");
  const [mood, setMood] = useState(item.moodDescription ?? "");
  const [categories, setCategories] = useState<string[]>(item.categories);
  const [participantIds, setParticipantIds] = useState<string[]>(item.participantIds);
  const [whiskyIds, setWhiskyIds] = useState<string[]>(item.whiskyIds);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    setName(item.name ?? "");
    setCaption(item.caption ?? "");
    setAltText(item.altText ?? "");
    setMood(item.moodDescription ?? "");
    setCategories(item.categories);
    setParticipantIds(item.participantIds);
    setWhiskyIds(item.whiskyIds);
  }, [item]);

  const commit = useCallback(() => {
    onChange({
      name: name.trim() ? name.trim() : null,
      caption: caption.trim() ? caption.trim() : null,
      altText: altText.trim() ? altText.trim() : null,
      moodDescription: mood.trim() ? mood.trim() : null,
      categories,
      participantIds,
      whiskyIds,
    });
  }, [name, caption, altText, mood, categories, participantIds, whiskyIds, onChange]);

  const toggleCategory = (c: string) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };
  const addCustomCategory = () => {
    const v = newCategory.trim();
    if (!v) return;
    if (!categories.includes(v)) setCategories((prev) => [...prev, v]);
    setNewCategory("");
  };
  const togglePid = (pid: string) => {
    setParticipantIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };
  const toggleWid = (wid: string) => {
    setWhiskyIds((prev) => (prev.includes(wid) ? prev.filter((x) => x !== wid) : [...prev, wid]));
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <img
        src={item.url}
        alt={item.altText ?? item.name ?? ""}
        style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 4 }}
        data-testid={`img-${testIdPrefix}`}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onAiDescribe()} disabled={busy} style={primaryBtn} data-testid={`button-${testIdPrefix}-ai`}>
          {busy ? "…" : "KI: alles beschreiben"}
        </button>
        <button type="button" onClick={() => onAiDescribe(["caption"])} disabled={busy} style={ghostBtn} data-testid={`button-${testIdPrefix}-ai-caption`}>
          KI: Caption
        </button>
        <button type="button" onClick={() => onAiDescribe(["altText"])} disabled={busy} style={ghostBtn} data-testid={`button-${testIdPrefix}-ai-alt`}>
          KI: Alt-Text
        </button>
        <button type="button" onClick={() => onAiDescribe(["moodDescription"])} disabled={busy} style={ghostBtn} data-testid={`button-${testIdPrefix}-ai-mood`}>
          KI: Stimmung
        </button>
      </div>
      <label style={labelStyle}>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          style={inputStyle}
          data-testid={`input-${testIdPrefix}-name`}
        />
      </label>
      <label style={labelStyle}>
        Caption
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={commit}
          rows={2}
          style={textareaStyle}
          data-testid={`textarea-${testIdPrefix}-caption`}
        />
      </label>
      <label style={labelStyle}>
        Alt-Text
        <textarea
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          onBlur={commit}
          rows={2}
          style={textareaStyle}
          data-testid={`textarea-${testIdPrefix}-alt`}
        />
      </label>
      <label style={labelStyle}>
        Stimmung
        <textarea
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          onBlur={commit}
          rows={3}
          style={textareaStyle}
          data-testid={`textarea-${testIdPrefix}-mood`}
        />
      </label>
      <div>
        <div style={labelStyle}>Kategorien</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {COMMON_CATEGORIES.map((c) => {
            const active = categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  toggleCategory(c);
                  setTimeout(commit, 0);
                }}
                style={chipStyle(active)}
                data-testid={`chip-${testIdPrefix}-category-${c}`}
              >
                {c}
              </button>
            );
          })}
          {categories.filter((c) => !COMMON_CATEGORIES.includes(c)).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                toggleCategory(c);
                setTimeout(commit, 0);
              }}
              style={chipStyle(true)}
              data-testid={`chip-${testIdPrefix}-category-custom-${c}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Neue Kategorie"
            style={inputStyle}
            data-testid={`input-${testIdPrefix}-newcategory`}
          />
          <button
            type="button"
            onClick={() => {
              addCustomCategory();
              setTimeout(commit, 0);
            }}
            style={ghostBtn}
            data-testid={`button-${testIdPrefix}-newcategory-add`}
          >
            +
          </button>
        </div>
      </div>
      {participants.length > 0 ? (
        <div>
          <div style={labelStyle}>Teilnehmer</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {participants.map((p) => {
              const active = participantIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    togglePid(p.id);
                    setTimeout(commit, 0);
                  }}
                  style={chipStyle(active)}
                  data-testid={`chip-${testIdPrefix}-participant-${p.id}`}
                >
                  {p.displayName || p.name || p.id}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {whiskies.length > 0 ? (
        <div>
          <div style={labelStyle}>Whiskys</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {whiskies.map((w) => {
              const active = whiskyIds.includes(w.id);
              const lbl = [w.distillery, w.name].filter(Boolean).join(" – ") || w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    toggleWid(w.id);
                    setTimeout(commit, 0);
                  }}
                  style={chipStyle(active)}
                  data-testid={`chip-${testIdPrefix}-whisky-${w.id}`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <button type="button" onClick={onDelete} style={dangerBtn} data-testid={`button-${testIdPrefix}-delete`}>
          Aus Pool entfernen
        </button>
        <button type="button" onClick={commit} style={primaryBtn} data-testid={`button-${testIdPrefix}-save`}>
          Speichern
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 80,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: "#0B0906",
  border: "1px solid rgba(201,169,97,0.35)",
  borderRadius: 6,
  width: "min(1200px, 100%)",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  color: "#F5EDE0",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "14px 18px",
  borderBottom: "1px solid rgba(201,169,97,0.2)",
  flexWrap: "wrap",
  gap: 8,
};

const filtersStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "10px 18px",
  borderBottom: "1px solid rgba(201,169,97,0.12)",
  flexWrap: "wrap",
};

const bodyStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: 12,
  padding: 12,
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 10,
  overflowY: "auto",
  padding: 4,
};

const inspectorStyle: React.CSSProperties = {
  borderLeft: "1px solid rgba(201,169,97,0.15)",
  paddingLeft: 12,
  overflowY: "auto",
};

const cardStyle = (selected: boolean): React.CSSProperties => ({
  border: `1px solid ${selected ? "#C9A961" : "rgba(201,169,97,0.18)"}`,
  borderRadius: 4,
  background: "rgba(201,169,97,0.04)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

const cardImageBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  display: "block",
};

const cardImg: React.CSSProperties = {
  width: "100%",
  height: 120,
  objectFit: "cover",
  display: "block",
};

const cardMetaStyle: React.CSSProperties = {
  padding: 6,
  borderTop: "1px solid rgba(201,169,97,0.12)",
  display: "grid",
  gap: 4,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#F5EDE0",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const cardTagsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 3,
};

const tagStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  background: "rgba(201,169,97,0.12)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 2,
  padding: "1px 4px",
  color: "#C9A961",
};

const pickBtn: React.CSSProperties = {
  background: "#C9A961",
  color: "#0B0906",
  border: "none",
  borderRadius: 0,
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.06)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 4,
  padding: "6px 8px",
  color: "#F5EDE0",
  fontSize: 12,
  outline: "none",
  flex: 1,
  minWidth: 120,
  fontFamily: "inherit",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 11,
  color: "#A89A85",
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const primaryBtn: React.CSSProperties = {
  background: "#C9A961",
  color: "#0B0906",
  border: "none",
  borderRadius: 3,
  padding: "6px 12px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "#C9A961",
  border: "1px solid rgba(201,169,97,0.4)",
  borderRadius: 3,
  padding: "6px 12px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};

const dangerBtn: React.CSSProperties = {
  ...ghostBtn,
  color: "#d97757",
  borderColor: "rgba(217,119,87,0.5)",
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "rgba(201,169,97,0.25)" : "rgba(201,169,97,0.05)",
  color: active ? "#F5EDE0" : "#A89A85",
  border: `1px solid ${active ? "#C9A961" : "rgba(201,169,97,0.25)"}`,
  borderRadius: 3,
  padding: "3px 8px",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
});

const errorStyle: React.CSSProperties = {
  background: "rgba(217,119,87,0.12)",
  color: "#d97757",
  fontSize: 12,
  padding: "8px 18px",
  borderBottom: "1px solid rgba(217,119,87,0.25)",
};
