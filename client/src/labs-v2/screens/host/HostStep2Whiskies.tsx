import { useState, useCallback, useRef } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Add, Trash, Upload, Printer, ChevronDown } from "../../icons";
import type { WhiskyEntry } from "../../types/host";

interface Props {
  th: ThemeTokens;
  t: Translations;
  tastingId: string;
  blindMode: boolean;
  whiskies: WhiskyEntry[];
  onWhiskiesChange: (ws: WhiskyEntry[]) => void;
  onDone: (ws: WhiskyEntry[]) => void;
}

let localIdCounter = 0;
function nextLocalId() { return `local-${++localIdCounter}-${Date.now()}`; }

interface ParsedRow {
  name?: string;
  distillery?: string;
  region?: string;
  caskInfluence?: string;
  age?: string;
  _row: number;
  _errors: string[];
  _selected?: boolean;
}

export default function HostStep2Whiskies({ th, t, tastingId, blindMode, whiskies, onWhiskiesChange, onDone }: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const addWhisky = useCallback(() => {
    const entry: WhiskyEntry = { localId: nextLocalId(), name: "", region: "", caskInfluence: "", age: "" };
    onWhiskiesChange([...whiskies, entry]);
  }, [whiskies, onWhiskiesChange]);

  const updateWhisky = useCallback((localId: string, field: keyof WhiskyEntry, value: string) => {
    onWhiskiesChange(whiskies.map(w => w.localId === localId ? { ...w, [field]: value } : w));
  }, [whiskies, onWhiskiesChange]);

  const deleteWhisky = useCallback((localId: string) => {
    onWhiskiesChange(whiskies.filter(w => w.localId !== localId));
  }, [whiskies, onWhiskiesChange]);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setParseError(null);
    setParsedRows([]);
    try {
      const fd = new FormData();
      fd.append("spreadsheet", file);
      const res = await fetch(`/api/tastings/${tastingId}/import/parse`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Parse failed");
      }
      const data = await res.json();
      const rows = (data.preview || []).map((r: any) => ({ ...r, _selected: true }));
      setParsedRows(rows);
    } catch (e: any) {
      setParseError(e.message);
    } finally {
      setParsing(false);
    }
  }, [tastingId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleParsedRow = useCallback((idx: number) => {
    setParsedRows(prev => prev.map((r, i) => i === idx ? { ...r, _selected: !r._selected } : r));
  }, []);

  const toggleAll = useCallback(() => {
    const allSelected = parsedRows.every(r => r._selected);
    setParsedRows(prev => prev.map(r => ({ ...r, _selected: !allSelected })));
  }, [parsedRows]);

  const importSelected = useCallback(async () => {
    const selected = parsedRows.filter(r => r._selected && r.name);
    const newEntries: WhiskyEntry[] = [];
    for (const row of selected) {
      try {
        const body = { name: row.name, tastingId, region: row.region || undefined, caskInfluence: row.caskInfluence || undefined, age: row.age || undefined, distillery: row.distillery || undefined };
        const res = await fetch("/api/whiskies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.ok) {
          const w = await res.json();
          newEntries.push({ id: w.id, localId: nextLocalId(), name: w.name || "", region: w.region || "", caskInfluence: w.caskInfluence || "", age: w.age || "" });
        }
      } catch {}
    }
    onWhiskiesChange([...whiskies, ...newEntries]);
    setParsedRows([]);
    setAiOpen(false);
  }, [parsedRows, tastingId, whiskies, onWhiskiesChange]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const deleteWhiskyFromServer = useCallback(async (whiskyId: string) => {
    try {
      await fetch(`/api/whiskies/${whiskyId}`, { method: "DELETE" });
    } catch {}
  }, []);

  const deleteWhiskyFull = useCallback((localId: string) => {
    const entry = whiskies.find(w => w.localId === localId);
    if (entry?.id) deleteWhiskyFromServer(entry.id);
    onWhiskiesChange(whiskies.filter(w => w.localId !== localId));
  }, [whiskies, onWhiskiesChange, deleteWhiskyFromServer]);

  const saveAndContinue = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    const savedWhiskies: WhiskyEntry[] = [];
    let hadError = false;
    for (const w of whiskies) {
      if (!w.name.trim()) continue;
      if (w.id) {
        savedWhiskies.push(w);
        continue;
      }
      try {
        const body = { name: w.name.trim(), tastingId, region: w.region || undefined, caskInfluence: w.caskInfluence || undefined, age: w.age || undefined };
        const res = await fetch("/api/whiskies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.ok) {
          const created = await res.json();
          savedWhiskies.push({ ...w, id: created.id });
        } else {
          hadError = true;
          savedWhiskies.push(w);
        }
      } catch {
        hadError = true;
        savedWhiskies.push(w);
      }
    }
    onWhiskiesChange(savedWhiskies);
    if (hadError) {
      setSaveError("Some whiskies could not be saved. Please try again.");
    } else {
      onDone(savedWhiskies);
    }
    setSaving(false);
  }, [whiskies, tastingId, onWhiskiesChange, onDone]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 36,
    padding: `${SP.xs}px ${SP.sm}px`,
    background: th.inputBg,
    border: `1px solid ${th.border}`,
    borderRadius: RADIUS.sm,
    color: th.text,
    fontSize: 13,
    fontFamily: FONT.body,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
      {whiskies.map((w, idx) => (
        <div
          key={w.localId}
          data-testid={`host-whisky-card-${idx}`}
          style={{
            background: th.bgCard,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.lg,
            padding: SP.md,
            display: "flex",
            flexDirection: "column",
            gap: SP.sm,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: th.gold, fontFamily: FONT.body }}>
              {blindMode ? `${t.hostSampleN} ${idx + 1}` : `${t.hostWhiskyN} ${idx + 1}`}
            </span>
            <button
              data-testid={`host-delete-whisky-${idx}`}
              onClick={() => deleteWhiskyFull(w.localId)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: SP.xs, display: "flex", alignItems: "center" }}
            >
              <Trash color={th.muted} size={18} />
            </button>
          </div>
          <input data-testid={`host-whisky-name-${idx}`} placeholder={blindMode ? t.hostSampleN : t.hostWhiskyN} value={w.name} onChange={e => updateWhisky(w.localId, "name", e.target.value)} style={inputStyle} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: SP.xs }}>
            <input data-testid={`host-whisky-region-${idx}`} placeholder={t.hostRegion} value={w.region} onChange={e => updateWhisky(w.localId, "region", e.target.value)} style={inputStyle} />
            <input data-testid={`host-whisky-cask-${idx}`} placeholder={t.hostCask} value={w.caskInfluence} onChange={e => updateWhisky(w.localId, "caskInfluence", e.target.value)} style={inputStyle} />
            <input data-testid={`host-whisky-age-${idx}`} placeholder={t.hostAge} value={w.age} onChange={e => updateWhisky(w.localId, "age", e.target.value)} style={inputStyle} />
          </div>
        </div>
      ))}

      <button
        data-testid="host-add-whisky-btn"
        onClick={addWhisky}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.sm,
          minHeight: TOUCH_MIN * 1.2,
          background: "transparent",
          border: `2px dashed ${th.border}`,
          borderRadius: RADIUS.lg,
          cursor: "pointer",
          color: th.muted,
          fontSize: 14,
          fontFamily: FONT.body,
          fontWeight: 500,
          transition: "border-color 0.2s ease",
        }}
      >
        <Add color={th.muted} size={20} />
        {t.hostAddW}
      </button>

      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, overflow: "hidden" }}>
        <button
          data-testid="host-ai-import-toggle"
          onClick={() => setAiOpen(!aiOpen)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${SP.sm}px ${SP.md}px`,
            minHeight: TOUCH_MIN,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: FONT.body,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
            <Upload color={th.gold} size={20} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{t.hostAiImport}</div>
              <div style={{ fontSize: 12, color: th.muted }}>{t.hostAiImportDesc}</div>
            </div>
          </div>
          <ChevronDown color={th.muted} size={18} style={{ transform: aiOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>

        {aiOpen && (
          <div style={{ padding: `0 ${SP.md}px ${SP.md}px`, display: "flex", flexDirection: "column", gap: SP.md }}>
            <div
              data-testid="host-ai-dropzone"
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: SP.sm,
                padding: SP.xl,
                border: `2px dashed ${dragOver ? th.gold : th.border}`,
                borderRadius: RADIUS.md,
                cursor: "pointer",
                background: dragOver ? th.bgHover : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              <Upload color={dragOver ? th.gold : th.faint} size={32} />
              <span style={{ fontSize: 14, fontWeight: 500, color: th.text, fontFamily: FONT.body }}>{t.hostDragDrop}</span>
              <span style={{ fontSize: 12, color: th.muted, fontFamily: FONT.body }}>{t.hostDragDropHint}</span>
              <input ref={fileRef} type="file" accept=".xlsx,.csv,.pdf,image/*" onChange={onFileInput} style={{ display: "none" }} data-testid="host-ai-file-input" />
            </div>

            {parsing && <div style={{ textAlign: "center", color: th.muted, fontSize: 13, fontFamily: FONT.body }}>{t.hostParsing}</div>}
            {parseError && <div style={{ color: "#e55", fontSize: 13, fontFamily: FONT.body }} data-testid="host-parse-error">{t.hostParseErr}: {parseError}</div>}

            {parsedRows.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
                <button
                  data-testid="host-select-all-btn"
                  onClick={toggleAll}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: th.gold,
                    fontSize: 13,
                    fontFamily: FONT.body,
                    fontWeight: 500,
                    textAlign: "left",
                    padding: 0,
                  }}
                >
                  {t.hostSelectAll}
                </button>
                {parsedRows.map((row, i) => (
                  <div
                    key={i}
                    data-testid={`host-parsed-row-${i}`}
                    onClick={() => toggleParsedRow(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: SP.sm,
                      padding: SP.sm,
                      background: row._selected ? th.bgHover : "transparent",
                      borderRadius: RADIUS.sm,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: RADIUS.sm,
                        border: `2px solid ${row._selected ? th.gold : th.faint}`,
                        background: row._selected ? th.gold : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {row._selected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: th.text, fontFamily: FONT.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.name || "—"}
                      </div>
                      {(row.region || row.age) && (
                        <div style={{ fontSize: 11, color: th.muted, fontFamily: FONT.body }}>
                          {[row.region, row.age].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  data-testid="host-import-selected-btn"
                  onClick={importSelected}
                  style={{
                    minHeight: TOUCH_MIN,
                    background: th.gold,
                    color: "#fff",
                    border: "none",
                    borderRadius: RADIUS.md,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                  }}
                >
                  {t.hostImportSelected} ({parsedRows.filter(r => r._selected).length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        data-testid="host-print-sheets-btn"
        onClick={() => window.open(`/labs/tastings/${tastingId}?tab=sheets`, "_blank")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.sm,
          minHeight: TOUCH_MIN,
          background: th.bgCard,
          border: `1px solid ${th.border}`,
          borderRadius: RADIUS.lg,
          cursor: "pointer",
          color: th.text,
          fontSize: 14,
          fontFamily: FONT.body,
          fontWeight: 500,
        }}
      >
        <Printer color={th.muted} size={18} />
        {t.hostPrintSheets}
      </button>

      {saveError && (
        <div
          style={{
            padding: SP.sm,
            background: "rgba(220,50,50,0.1)",
            borderRadius: RADIUS.md,
            color: "#e55",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
          data-testid="host-save-error"
        >
          {saveError}
        </div>
      )}

      <button
        data-testid="host-whiskies-next-btn"
        onClick={saveAndContinue}
        disabled={saving}
        style={{
          width: "100%",
          minHeight: TOUCH_MIN,
          background: th.gold,
          color: "#fff",
          border: "none",
          borderRadius: RADIUS.lg,
          fontSize: 16,
          fontWeight: 600,
          fontFamily: FONT.body,
          cursor: saving ? "not-allowed" : "pointer",
          transition: "opacity 0.2s ease",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "…" : t.hostNext}
      </button>
    </div>
  );
}
