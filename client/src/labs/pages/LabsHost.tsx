import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import {
  Plus, X, Trash2, Copy, Check, EyeOff, Eye, Play, Square,
  Users, Calendar, MapPin, ChevronLeft, Loader2,
  Wine, BarChart3, CheckCircle2, Clock, CircleDashed,
  ChevronDown, ChevronUp, ChevronRight, Compass, SkipForward, StopCircle, AlertTriangle,
  QrCode, Mail, Send, Star, Monitor, Gauge, Globe, Sliders,
  MessageCircle, Video, FileText, FileSpreadsheet, Settings, Upload, Share2,
  Sparkles, RefreshCw, Camera, BookOpen, Heart, Pencil, Image,
  Download, ExternalLink, Lock, Printer, ScanLine, GripVertical, Layers, ArrowRightLeft, Archive, Info,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { stripGuestSuffix } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FLAVOR_PROFILES, detectFlavorProfile, type FlavorProfileId } from "@/labs/data/flavor-data";
import RatingFlowV2 from "@/labs/components/rating/RatingFlowV2";
import type { RatingData } from "@/labs/components/rating/types";
import { useRatingScale } from "@/labs/hooks/useRatingScale";
import LabsHostCockpit from "@/labs/pages/LabsHostCockpit";
import { tastingApi, whiskyApi, blindModeApi, ratingApi, guidedApi, inviteApi, collectionApi, wishlistApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import FriendsQuickSelect from "@/labs/components/FriendsQuickSelect";
import WhiskyImageUpload from "@/components/WhiskyImageUpload";
import { downloadDataUrl } from "@/lib/download";
import { generateTastingMenu } from "@/components/tasting-menu-pdf";
import { generateBlankTastingSheet, generateBlankTastingMat, generateBatchPersonalizedPdf, generateTastingNotesSheet, generateBlindEvaluationSheet } from "@/components/printable-tasting-sheets";
import QRCode from "qrcode";
import * as XLSX from "xlsx";

const EXCEL_MAX_SIZE = 5 * 1024 * 1024;
const EXCEL_MAX_ROWS = 500;
const EXCEL_ALLOWED_FIELDS = new Set([
  "sortOrder", "name", "distillery", "age", "abv", "category", "region",
  "country", "caskInfluence", "peatLevel", "ppm", "bottler", "vintage",
  "distilledYear", "bottledYear",
  "price", "whiskybaseId", "notes", "hostSummary",
]);
const EXCEL_HEADER_MAP: Record<string, string> = {
  "#": "sortOrder", "name": "name", "name *": "name",
  "distillery": "distillery", "age": "age", "abv %": "abv", "abv": "abv",
  "category": "category", "region": "region", "country": "country",
  "cask type": "caskInfluence", "cask influence": "caskInfluence",
  "peat level": "peatLevel", "ppm": "ppm", "bottler": "bottler",
  "vintage": "vintage", "distilled": "distilledYear", "distilled year": "distilledYear",
  "bottled": "bottledYear", "bottled year": "bottledYear",
  "price": "price", "whiskybase id": "whiskybaseId",
  "notes": "notes", "host summary": "hostSummary",
};

function _parseStandardRows(rows: any[]): any[] {
  return rows
    .map((row) => {
      const mapped: Record<string, any> = Object.create(null);
      for (const [rawKey, val] of Object.entries(row)) {
        const field = EXCEL_HEADER_MAP[rawKey.trim().toLowerCase()];
        if (field && EXCEL_ALLOWED_FIELDS.has(field) && val !== undefined && val !== "") {
          mapped[field] = String(val).trim();
        }
      }
      return mapped;
    })
    .filter((w) => {
      if (!w.name || typeof w.name !== "string") return false;
      const name = w.name.trim();
      if (name.length < 2) return false;
      if (/^\d+$/.test(name)) return false;
      if (/^[-–—_.,;:\/\\#+*=]+$/.test(name)) return false;
      if (/^(total|sum|summe|average|avg|durchschnitt|count|anzahl|blank|empty|leer|n\/a|na|nan|null|undefined|header|kopfzeile|example|beispiel|template|vorlage|muster|test|row|zeile|nr|no|pos|position|#|whisky\s*\d*|sample\s*\d*|probe\s*\d*|dram\s*\d*)$/i.test(name)) return false;
      if (/^[\d\s.,]+$/.test(name)) return false;
      const fieldCount = Object.keys(w).length;
      if (fieldCount <= 1 && name.length < 3) return false;
      w.name = name;
      return true;
    });
}

function _tryParseSheet(sheet: XLSX.WorkSheet): any[] | null {
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rawRows.length === 0) return null;

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    const asStrings = row.map((c: any) => String(c).trim().toLowerCase());
    const matchedFields = asStrings.filter((s: string) => EXCEL_HEADER_MAP[s] !== undefined);
    const hasName = matchedFields.some((s: string) => EXCEL_HEADER_MAP[s] === "name");
    if (matchedFields.length >= 2 || (matchedFields.length >= 1 && hasName)) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx >= 0) {
    const headerRow = rawRows[headerRowIdx].map((c: any) => String(c).trim());
    const dataRows = rawRows.slice(headerRowIdx + 1);
    const jsonRows = dataRows
      .filter((r: any[]) => r.some((c: any) => c !== ""))
      .map((r: any[]) => {
        const obj: Record<string, any> = {};
        headerRow.forEach((h: string, idx: number) => {
          if (h) obj[h] = idx < r.length ? r[idx] : "";
        });
        return obj;
      });
    const whiskies = _parseStandardRows(jsonRows);
    if (whiskies.length > 0) return whiskies;
  }

  const firstCol = rawRows.map((r: any[]) => (r.length > 0 ? String(r[0]).trim().toLowerCase() : ""));
  const transposedMatchedFields = firstCol.filter((s: string) => EXCEL_HEADER_MAP[s] !== undefined);
  const transposedHasName = transposedMatchedFields.some((s: string) => EXCEL_HEADER_MAP[s] === "name");
  if (transposedMatchedFields.length >= 2 || (transposedMatchedFields.length >= 1 && transposedHasName)) {
    const attrRowIndices: number[] = [];
    const attrKeys: string[] = [];
    firstCol.forEach((label: string, idx: number) => {
      if (EXCEL_HEADER_MAP[label] !== undefined) {
        attrRowIndices.push(idx);
        attrKeys.push(label);
      }
    });

    const numCols = Math.max(...rawRows.map((r: any[]) => r.length));
    const jsonRows: Record<string, any>[] = [];
    for (let col = 1; col < numCols; col++) {
      const obj: Record<string, any> = {};
      let hasValue = false;
      attrRowIndices.forEach((rowIdx: number, ai: number) => {
        const val = rowIdx < rawRows.length && col < rawRows[rowIdx].length ? rawRows[rowIdx][col] : "";
        if (val !== "" && val !== undefined) {
          obj[attrKeys[ai]] = val;
          hasValue = true;
        }
      });
      if (hasValue) jsonRows.push(obj);
    }
    const whiskies = _parseStandardRows(jsonRows);
    if (whiskies.length > 0) return whiskies;
  }

  return null;
}

function parseExcelWhiskies(file: File): Promise<any[]> {
  if (file.size > EXCEL_MAX_SIZE) {
    return Promise.reject(new Error("Excel file too large (max 5 MB)."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        let bestResult: any[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const result = _tryParseSheet(sheet);
          if (result && result.length > bestResult.length) {
            bestResult = result;
          }
        }

        if (bestResult.length > EXCEL_MAX_ROWS) {
          reject(new Error(`Too many rows (${bestResult.length}). Max ${EXCEL_MAX_ROWS} whiskies per import.`));
          return;
        }
        resolve(bestResult);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function normalizeAbv(raw: any): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  let val = typeof raw === "string" ? parseFloat(raw.replace(",", ".")) : Number(raw);
  if (isNaN(val)) return null;
  if (val > 0 && val < 1) val = val * 100;
  if (val < 10 || val > 95) return null;
  return Math.round(val * 10) / 10;
}

function normalizePrice(raw: any): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const val = typeof raw === "string" ? parseFloat(raw.replace(",", ".")) : Number(raw);
  if (isNaN(val) || val < 0) return null;
  return Math.round(val * 100) / 100;
}

function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === "") return "";
  const val = typeof price === "string" ? parseFloat(price.replace(",", ".")) : Number(price);
  if (isNaN(val)) return "";
  return val.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

function isExcelFile(file: File): boolean {
  return /\.(xlsx|xls)$/i.test(file.name) ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FileIcon({ file, className }: { file: File; className?: string }) {
  if (isExcelFile(file)) return <FileSpreadsheet className={className} />;
  return <FileText className={className} />;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function FileThumbnail({ file, onRemove, testId }: { file: File; onRemove: () => void; testId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <div className="relative group" data-testid={testId} title={file.name}>
      <img
        src={url}
        alt={file.name}
        className="rounded-lg object-cover"
        style={{ width: 48, height: 48, border: "1px solid color-mix(in srgb, var(--labs-accent) 30%, transparent)" }}
      />
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center"
        style={{ background: "var(--labs-danger)", color: "#fff", border: "none", cursor: "pointer", width: 18, height: 18, padding: 0 }}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

interface LabsHostProps {
  params?: { id?: string };
}

const REVEAL_DEFAULT_ORDER: string[][] = [
  ["name"],
  ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
  ["image"],
];

const normalizeName = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");
const tokenize = (s: string) => normalizeName(s).replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
const tokenSimilarity = (a: string, b: string): number => {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 && tb.length === 0) return 1;
  if (ta.length === 0 || tb.length === 0) return 0;
  const setB = new Set(tb);
  const matches = ta.filter(t => setB.has(t)).length;
  return (2 * matches) / (ta.length + tb.length);
};
const DUPE_THRESHOLD = 0.7;
const isSimilarWhisky = (
  name1: string, dist1: string,
  name2: string, dist2: string,
): boolean => {
  const nameSim = tokenSimilarity(name1, name2);
  if (nameSim >= DUPE_THRESHOLD) {
    if (!dist1 && !dist2) return true;
    if (!dist1 || !dist2) return nameSim >= 0.85;
    return tokenSimilarity(dist1, dist2) >= 0.5;
  }
  return false;
};

function getRevealState(tasting: any, whiskyCount: number, t: (key: string, opts?: any) => string) {
  let stepGroups = REVEAL_DEFAULT_ORDER;
  try {
    if (tasting.revealOrder) {
      const parsed = JSON.parse(tasting.revealOrder);
      if (Array.isArray(parsed) && parsed.length > 0) stepGroups = parsed;
    }
  } catch {}
  const maxSteps = stepGroups.length;
  const revealIndex = tasting.revealIndex ?? 0;
  const revealStep = tasting.revealStep ?? 0;
  const allRevealed = whiskyCount > 0 && revealIndex >= whiskyCount - 1 && revealStep >= maxSteps;

  const FIELD_LABELS: Record<string, string> = {
    name: t("labs.host.fieldName"), distillery: t("labs.host.fieldDistillery"), age: t("labs.host.fieldAge"), abv: t("labs.host.fieldAbv"),
    region: t("labs.host.fieldRegion"), country: t("labs.host.fieldCountry"), category: t("labs.host.fieldCategory"),
    caskInfluence: t("labs.host.fieldCask"), peatLevel: t("labs.host.fieldPeat"), image: t("labs.host.fieldImage"),
    bottler: t("labs.host.fieldBottler"), vintage: t("labs.host.fieldVintage"), distilledYear: t("labs.host.fieldDistilled"),
    bottledYear: t("labs.host.fieldBottled"), hostNotes: t("labs.host.fieldNotes"),
    hostSummary: t("labs.host.fieldSummary"), price: t("labs.host.fieldPrice"), ppm: t("labs.host.fieldPpm"),
    wbId: t("labs.host.fieldWbId"), wbScore: t("labs.host.fieldWbScore"),
  };
  const stepLabels = stepGroups.map((group: string[]) => {
    const labels = group.map(f => FIELD_LABELS[f] || f);
    if (labels.length <= 2) return labels.join(" & ");
    return labels.slice(0, 2).join(" & ") + " +";
  });

  let nextLabelKey = "revealNext";
  let nextLabelParam: string | undefined;
  if (allRevealed) {
    nextLabelKey = "allDramsRevealed";
  } else if (revealStep < maxSteps) {
    const lbl = stepLabels[revealStep];
    if (lbl) { nextLabelKey = "revealLabel"; nextLabelParam = lbl; } else { nextLabelKey = "revealNext"; }
  } else {
    nextLabelKey = "nextDram";
  }

  const revealedFields = new Set<string>();
  for (let s = 0; s < revealStep && s < stepGroups.length; s++) {
    for (const f of stepGroups[s]) revealedFields.add(f);
  }

  return { revealIndex, revealStep, maxSteps, allRevealed, stepLabels, nextLabelKey, nextLabelParam, revealedFields, stepGroups };
}

function isFieldRevealed(rv: ReturnType<typeof getRevealState> | null, fieldOrGroup: string | string[]): boolean {
  if (!rv) return true;
  const fields = Array.isArray(fieldOrGroup) ? fieldOrGroup : [fieldOrGroup];
  return fields.some(f => rv.revealedFields.has(f));
}

import { getStatusConfig } from "@/labs/utils/statusConfig";

type DimKey = "nose" | "taste" | "finish";


function HostRatingPanel({
  whiskies,
  tastingId,
  participantId,
  ratingScale,
  blindMode,
}: {
  whiskies: Array<{ id: string; name?: string; distillery?: string; age?: number; abv?: number }>;
  tastingId: string;
  participantId: string;
  ratingScale: number;
  blindMode: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeIdx, setActiveIdx] = useState(0);

  const [hostScores, setHostScores] = useState<Record<string, Record<DimKey, number>>>({});
  const [hostChips, setHostChips] = useState<Record<string, Record<DimKey, string[]>>>({});
  const [hostTexts, setHostTexts] = useState<Record<string, Record<DimKey, string>>>({});
  const [hostOverall, setHostOverall] = useState<Record<string, number>>({});
  const [hostNotes, setHostNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hostScale = useRatingScale(ratingScale);
  const scaleDefault = 75;
  const emptyChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [] };
  const emptyTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "" };

  const ratingUpsertMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => ratingApi.upsert(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] }),
  });

  const parseSavedNotes = useCallback((rawNotes: string) => {
    const chips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [] };
    const texts: Record<DimKey, string> = { nose: "", taste: "", finish: "" };
    let cleanNotes = rawNotes;
    for (const d of ["nose", "taste", "finish"] as DimKey[]) {
      const re = new RegExp(`\\[${d.toUpperCase()}\\]\\s*([\\s\\S]*?)\\s*\\[\\/${d.toUpperCase()}\\]`);
      const m = rawNotes.match(re);
      if (m) {
        cleanNotes = cleanNotes.replace(m[0], "");
        const content = m[1].trim();
        const parts = content.split(" — ");
        if (parts.length >= 2) {
          chips[d] = parts[0].split(",").map(s => s.trim()).filter(Boolean);
          texts[d] = parts.slice(1).join(" — ");
        } else if (parts.length === 1) {
          const maybeChips = parts[0].split(",").map(s => s.trim()).filter(Boolean);
          if (maybeChips.every(c => c.length < 20)) chips[d] = maybeChips;
          else texts[d] = parts[0];
        }
      }
    }
    const flavorMarker = /\[(Nose|Taste|Finish)\]\s*([^\n]*)/gi;
    let fm: RegExpExecArray | null;
    while ((fm = flavorMarker.exec(cleanNotes)) !== null) {
      const dim = fm[1].toLowerCase() as DimKey;
      if (chips[dim].length === 0) {
        chips[dim] = fm[2].split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    cleanNotes = cleanNotes.replace(/\[(Nose|Taste|Finish)\]\s*[^\n]*/gi, "");
    cleanNotes = cleanNotes.replace(/\[SCORES\][\s\S]*?\[\/SCORES\]/, "");
    cleanNotes = cleanNotes.replace(/\n{2,}/g, "\n").trim();
    return { chips, texts, cleanNotes };
  }, []);

  const buildScoresBlock = useCallback((wId: string) => {
    const ch = hostChips[wId] || emptyChips;
    const tx = hostTexts[wId] || emptyTexts;
    const hasDimData = (["nose", "taste", "finish"] as DimKey[]).some(
      (d) => ch[d].length > 0 || tx[d].trim()
    );
    if (!hasDimData) return "";
    const parts: string[] = [];
    for (const d of ["nose", "taste", "finish"] as DimKey[]) {
      const chipStr = ch[d].length > 0 ? ch[d].join(", ") : "";
      const textStr = tx[d].trim();
      if (chipStr || textStr) {
        parts.push(`[${d.toUpperCase()}] ${[chipStr, textStr].filter(Boolean).join(" — ")} [/${d.toUpperCase()}]`);
      }
    }
    return parts.length > 0 ? "\n" + parts.join("\n") : "";
  }, [hostChips, hostTexts]);

  useEffect(() => {
    if (whiskies.length === 0) return;
    const loadExisting = async () => {
      for (const w of whiskies) {
        if (hostScores[w.id]) continue;
        try {
          const existing = await ratingApi.getMyRating(participantId, w.id);
          if (existing) {
            const parsed = parseSavedNotes(existing.notes || "");
            const toV2 = (v: number | null | undefined) => {
              const raw = v ?? scaleDefault;
              if (raw >= 60) return raw;
              return Math.max(60, Math.min(100, Math.round(hostScale.normalize(raw))));
            };
            setHostScores(prev => ({ ...prev, [w.id]: { nose: toV2(existing.nose), taste: toV2(existing.taste), finish: toV2(existing.finish) } }));
            setHostOverall(prev => ({ ...prev, [w.id]: toV2(existing.overall) }));
            setHostChips(prev => ({ ...prev, [w.id]: parsed.chips }));
            setHostTexts(prev => ({ ...prev, [w.id]: parsed.texts }));
            setHostNotes(prev => ({ ...prev, [w.id]: parsed.cleanNotes }));
          }
        } catch {}
      }
    };
    loadExisting();
  }, [whiskies.length, participantId]);

  const debouncedSave = useCallback((whiskyId: string, freshScores: Record<DimKey, number>, freshOverall: number, freshNotes: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const scoresBlock = buildScoresBlock(whiskyId);
      const combinedNotes = (freshNotes + scoresBlock).trim();
      setSaving(true);
      ratingUpsertMut.mutate({
        participantId,
        whiskyId,
        tastingId,
        nose: freshScores.nose, taste: freshScores.taste, finish: freshScores.finish,
        overall: freshOverall,
        notes: combinedNotes,
      }, { onSettled: () => setSaving(false) });
    }, 800);
  }, [participantId, tastingId, buildScoresBlock]);

  const chipSaveRef = useRef(0);
  useEffect(() => {
    if (!whiskies.length) return;
    const wId = whiskies[activeIdx]?.id;
    if (!wId || !hostScores[wId]) return;
    chipSaveRef.current++;
    const gen = chipSaveRef.current;
    const sc = hostScores[wId];
    const ov = hostOverall[wId] ?? Math.round((sc.nose + sc.taste + sc.finish) / 3);
    const notes = hostNotes[wId] || "";
    const timer = setTimeout(() => {
      if (gen !== chipSaveRef.current) return;
      debouncedSave(wId, sc, ov, notes);
    }, 100);
    return () => clearTimeout(timer);
  }, [hostChips, hostTexts]);

  const defaultScores = (): Record<DimKey, number> => ({ nose: scaleDefault, taste: scaleDefault, finish: scaleDefault });
  const getScores = (wId: string): Record<DimKey, number> => hostScores[wId] || defaultScores();
  const getOverall = (wId: string) => hostOverall[wId] ?? scaleDefault;


  const currentWhisky = whiskies[activeIdx];
  if (!currentWhisky) {
    return (
      <div className="labs-card p-5 text-center" data-testid="host-rating-empty">
        <Star className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("labs.host.noWhiskiesToRate")}</p>
      </div>
    );
  }

  return (
    <div className="labs-card" style={{ padding: 0 }} data-testid="host-rating-panel">
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--labs-border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Star className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{t("labs.host.hostRating")}</span>
        </div>
        {saving && (
          <span style={{ fontSize: 11, color: "var(--labs-accent)", display: "flex", alignItems: "center", gap: 4 }}>
            <Loader2 className="w-3 h-3 animate-spin" />
            {t("labs.host.saving")}
          </span>
        )}
      </div>

      <div style={{
        padding: "10px 16px",
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
        borderBottom: "1px solid var(--labs-border-subtle)",
      }}>
        {whiskies.map((w, idx) => (
          <button
            key={w.id}
            onClick={() => setActiveIdx(idx)}
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              border: idx === activeIdx ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)",
              background: idx === activeIdx ? "var(--labs-surface-elevated)" : "transparent",
              color: idx === activeIdx ? "var(--labs-accent)" : "var(--labs-text-muted)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            data-testid={`host-rating-tab-${idx}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>
            {blindMode ? `Dram ${activeIdx + 1}` : (currentWhisky.name || `Whisky ${activeIdx + 1}`)}
          </p>
          {!blindMode && (
            <p className="text-xs" style={{ color: "var(--labs-text-muted)", marginTop: 2 }}>
              {[currentWhisky.distillery, currentWhisky.age ? `${currentWhisky.age}y` : null, currentWhisky.abv ? `${currentWhisky.abv}%` : null].filter(Boolean).join(" · ") || "—"}
            </p>
          )}
        </div>

        <RatingFlowV2
          key={currentWhisky.id}
          whisky={{
            name: blindMode ? `Dram ${activeIdx + 1}` : (currentWhisky.name || `Whisky ${activeIdx + 1}`),
            region: blindMode ? undefined : (currentWhisky as any).region,
            cask: blindMode ? undefined : (currentWhisky as any).cask,
            blind: blindMode,
            flavorProfile: blindMode ? undefined : ((currentWhisky as any).flavorProfileId ?? undefined),
          }}
          initialData={(() => {
            const wId = currentWhisky.id;
            const sc = getScores(wId);
            const ch = hostChips[wId] || emptyChips;
            const tx = hostTexts[wId] || emptyTexts;
            return {
              scores: {
                nose: sc.nose,
                palate: sc.taste,
                finish: sc.finish,
                overall: getOverall(wId),
              },
              tags: {
                nose: ch.nose,
                palate: ch.taste,
                finish: ch.finish,
                overall: [],
              },
              notes: {
                nose: tx.nose,
                palate: tx.taste,
                finish: tx.finish,
                overall: hostNotes[wId] || "",
              },
            } satisfies RatingData;
          })()}
          onDone={(data: RatingData) => {
            const wId = currentWhisky.id;
            const freshScores: Record<DimKey, number> = {
              nose: data.scores.nose,
              taste: data.scores.palate,
              finish: data.scores.finish,
            };
            setHostScores(prev => ({ ...prev, [wId]: freshScores }));
            setHostOverall(prev => ({ ...prev, [wId]: data.scores.overall }));
            setHostChips(prev => ({
              ...prev,
              [wId]: {
                nose: data.tags.nose,
                taste: data.tags.palate,
                finish: data.tags.finish,
              },
            }));
            setHostTexts(prev => ({
              ...prev,
              [wId]: {
                nose: data.notes.nose,
                taste: data.notes.palate,
                finish: data.notes.finish,
              },
            }));
            setHostNotes(prev => ({ ...prev, [wId]: data.notes.overall }));
            debouncedSave(wId, freshScores, data.scores.overall, data.notes.overall);
          }}
          onBack={() => {}}
        />
      </div>
    </div>
  );
}

function PrintMaterialsSection({
  tasting,
  whiskies,
  participants,
  currentParticipant,
  navigate,
  tastingId,
}: {
  tasting: Record<string, unknown>;
  whiskies: Array<Record<string, unknown>>;
  participants: Array<Record<string, unknown>>;
  currentParticipant: Record<string, unknown>;
  navigate: (to: string) => void;
  tastingId: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [blindMode, setBlindMode] = useState(!!tasting.blindMode);
  const [generating, setGenerating] = useState<string | null>(null);
  const [aiCoverLoading, setAiCoverLoading] = useState(false);
  const coverImageUrl = (tasting.coverImageUrl as string) || null;

  const parsedShared = (() => {
    try {
      const raw = tasting.sharedPrintMaterials as string | null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();
  const [shared, setShared] = useState<Record<string, boolean>>({
    menuCard: !!parsedShared.menuCard,
    scoreSheets: !!parsedShared.scoreSheets,
    tastingMat: !!parsedShared.tastingMat,
    masterSheet: !!parsedShared.masterSheet,
  });

  const saveShared = async (next: Record<string, boolean>) => {
    const prev = { ...shared };
    setShared(next);
    const hasAny = Object.values(next).some(Boolean);
    try {
      const res = await fetch(`/api/tastings/${tasting.id}/shared-print-materials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-participant-id": tasting.hostId as string },
        body: JSON.stringify({ sharedPrintMaterials: hasAny ? next : null }),
      });
      if (!res.ok) {
        setShared(prev);
      }
    } catch {
      setShared(prev);
    }
  };

  const toggleShared = (key: string) => {
    const next = { ...shared, [key]: !shared[key] };
    saveShared(next);
  };

  const whiskyCount = whiskies.length;
  if (whiskyCount === 0) return null;

  const resolveHostName = (): string => {
    const found = participants.find((p: Record<string, unknown>) =>
      (p.participantId || p.id) === tasting.hostId
    );
    return (((found?.participant as Record<string, unknown>)?.name as string) || (found?.name as string) || (currentParticipant as Record<string, unknown>)?.name as string) || t("m2.host.title");
  };

  const handleGenerateMenu = async () => {
    setGenerating("menu");
    try {
      const pList = participants.map((p: Record<string, unknown>) => ({
        name: stripGuestSuffix(((p.participant as Record<string, unknown>)?.name || p.name || t("labs.host.anonymous")) as string),
        photoUrl: ((p.participant as Record<string, unknown>)?.photoUrl || p.photoUrl || null) as string | null,
      }));
      const hostName = resolveHostName();

      let finalCover: string | null = null;
      if (coverImageUrl) {
        try {
          const imgRes = await fetch(coverImageUrl);
          const blob = await imgRes.blob();
          finalCover = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {}
      }

      await generateTastingMenu({
        tasting: tasting as unknown as import("@shared/schema").Tasting,
        whiskies: whiskies as unknown as import("@shared/schema").Whisky[],
        participants: pList,
        hostName,
        coverImageBase64: finalCover,
        orientation,
        blindMode,
        language: "de",
      });
    } catch (e) {
      console.error("Menu generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateBatchSheets = async () => {
    setGenerating("sheets");
    try {
      const pList = participants.map((p: Record<string, unknown>) => ({
        id: (p.participantId || p.id) as string,
        name: stripGuestSuffix(((p.participant as Record<string, unknown>)?.name || p.name || t("labs.host.anonymous")) as string),
      }));
      if (pList.length === 0) return;
      const type = blindMode ? "blind" : "tasting";
      const hostName = resolveHostName();
      await generateBatchPersonalizedPdf(
        tasting as unknown as import("@shared/schema").Tasting,
        whiskies as unknown as import("@shared/schema").Whisky[],
        pList,
        "de",
        type,
        "download",
        hostName,
        orientation,
        null,
      );
    } catch (e) {
      console.error("Batch sheets failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateMasterSheet = async () => {
    setGenerating("master");
    try {
      const hostName = resolveHostName();
      const sheetFn = blindMode ? generateBlindEvaluationSheet : generateTastingNotesSheet;
      await sheetFn(
        tasting as unknown as import("@shared/schema").Tasting,
        whiskies as unknown as import("@shared/schema").Whisky[],
        "de",
        undefined,
        "download",
        hostName,
        orientation,
        null,
      );
    } catch (e) {
      console.error("Master sheet failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateMat = () => {
    setGenerating("mat");
    try {
      generateBlankTastingMat("de", whiskyCount, (tasting.ratingScale as number) || 10);
    } catch (e) {
      console.error("Mat generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateBlankSheet = () => {
    setGenerating("blank");
    try {
      generateBlankTastingSheet("de", whiskyCount);
    } catch (e) {
      console.error("Sheet generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleAiCover = async () => {
    setAiCoverLoading(true);
    try {
      const pid = (currentParticipant as Record<string, unknown>)?.id as string | undefined;
      const res = await fetch(`/api/tastings/${tasting.id}/menu-cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pid ? { "x-participant-id": pid } : {}) },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.imageUrl || (data.coverImageBase64 ? `data:${data.mimeType || "image/png"};base64,${data.coverImageBase64}` : null);
        if (imageUrl) {
          const imgRes = await fetch(imageUrl);
          const blob = await imgRes.blob();
          const file = new File([blob], "ai-cover.png", { type: blob.type || "image/png" });
          await tastingApi.uploadCoverImage(tastingId, file, pid || (tasting.hostId as string));
          queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
        }
      }
    } catch (e) {
      console.error("AI cover generation failed:", e);
    } finally {
      setAiCoverLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="labs-btn-secondary w-full relative flex items-center justify-center gap-2"
        data-testid="toggle-print-materials"
      >
        <Printer className="w-4 h-4" />
        {t("labs.host.printMaterials")}
        <ChevronDown
          className="w-4 h-4 absolute right-3"
          style={{ color: "var(--labs-text-muted)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}
        />
      </button>

      {expanded && (
        <div style={{ paddingTop: 12, animation: "toolsSlideDown 0.2s ease" }} className="space-y-4">
          <div className="labs-card p-4">
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--labs-text)" }}>{t("labs.host.tastingMenuCard")}</p>

            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] mb-1.5" style={{ color: "var(--labs-text-muted)" }}>{t("labs.host.orientation")}</p>
                <div className="flex gap-1">
                  <button
                    className={`labs-btn-ghost text-xs py-2 rounded-lg flex-1 text-center ${orientation === "portrait" ? "ring-1" : ""}`}
                    style={orientation === "portrait" ? { background: "var(--labs-accent-muted)", color: "var(--labs-accent)", ringColor: "var(--labs-accent)", minHeight: 44 } : { minHeight: 44 }}
                    onClick={() => setOrientation("portrait")}
                    data-testid="print-orientation-portrait"
                  >
                    {t("labs.host.portrait")}
                  </button>
                  <button
                    className={`labs-btn-ghost text-xs py-2 rounded-lg flex-1 text-center ${orientation === "landscape" ? "ring-1" : ""}`}
                    style={orientation === "landscape" ? { background: "var(--labs-accent-muted)", color: "var(--labs-accent)", ringColor: "var(--labs-accent)", minHeight: 44 } : { minHeight: 44 }}
                    onClick={() => setOrientation("landscape")}
                    data-testid="print-orientation-landscape"
                  >
                    {t("labs.host.landscape")}
                  </button>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] mb-1.5" style={{ color: "var(--labs-text-muted)" }}>{t("labs.host.contentMode")}</p>
                <div className="flex gap-1">
                  <button
                    className={`labs-btn-ghost text-xs py-2 rounded-lg flex-1 text-center ${!blindMode ? "ring-1" : ""}`}
                    style={!blindMode ? { background: "var(--labs-accent-muted)", color: "var(--labs-accent)", ringColor: "var(--labs-accent)", minHeight: 44 } : { minHeight: 44 }}
                    onClick={() => setBlindMode(false)}
                    data-testid="print-mode-open"
                  >
                    {t("labs.host.contentOpen")}
                  </button>
                  <button
                    className={`labs-btn-ghost text-xs py-2 rounded-lg flex-1 text-center ${blindMode ? "ring-1" : ""}`}
                    style={blindMode ? { background: "var(--labs-accent-muted)", color: "var(--labs-accent)", ringColor: "var(--labs-accent)", minHeight: 44 } : { minHeight: 44 }}
                    onClick={() => setBlindMode(true)}
                    data-testid="print-mode-blind"
                  >
                    {t("labs.host.contentBlind")}
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-3 rounded-lg" style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border-subtle)" }}>
              <div className="flex items-center justify-between px-3 py-2.5" data-testid={coverImageUrl ? "print-cover-status" : "print-cover-hint"}>
                <div className="flex items-center gap-2 min-w-0">
                  <Image className="w-3.5 h-3.5 flex-shrink-0" style={{ color: coverImageUrl ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
                  <span className="text-xs" style={{ color: coverImageUrl ? "var(--labs-text-secondary)" : "var(--labs-text-muted)" }}>
                    {coverImageUrl
                      ? t("labs.host.coverIncluded")
                      : t("labs.host.addCoverOrAi")}
                  </span>
                </div>
                <button
                  className="labs-btn-ghost text-xs px-3 rounded-lg flex items-center gap-1.5 flex-shrink-0"
                  style={{ minHeight: 32 }}
                  onClick={handleAiCover}
                  disabled={aiCoverLoading}
                  data-testid="print-ai-cover"
                >
                  {aiCoverLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />}
                  {aiCoverLoading ? t("labs.host.generatingEllipsis") : t("labs.host.aiCover")}
                </button>
              </div>
            </div>

            <button
              className="labs-btn-primary text-sm flex items-center gap-2 w-full justify-center"
              onClick={handleGenerateMenu}
              disabled={generating === "menu"}
              data-testid="print-generate-menu"
            >
              {generating === "menu" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {generating === "menu" ? t("labs.host.generatingEllipsis") : t("labs.host.generateMenuCard")}
            </button>
          </div>

          <div className="labs-card p-4">
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--labs-text)" }}>{t("labs.host.ratingSheets")}</p>

            <div className="mb-3 rounded-lg p-3" style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border-subtle)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--labs-text)" }}>{t("labs.host.personalizedSheets")}</p>
              <p className="text-[11px] mb-2" style={{ color: "var(--labs-text-muted)" }}>
                {t("labs.host.personalizedSheetsDesc")}
              </p>

              {participants.length > 0 && (
                <div className="mb-2 rounded-lg overflow-hidden" style={{ border: "1px solid var(--labs-border-subtle)" }}>
                  {participants.map((p: Record<string, unknown>, idx: number) => {
                    const pName = stripGuestSuffix(((p.participant as Record<string, unknown>)?.name || p.name || t("labs.host.anonymous")) as string);
                    return (
                      <div
                        key={(p.participantId || p.id) as string}
                        className="flex items-center gap-2 px-3 py-2"
                        style={{
                          background: idx % 2 === 0 ? "var(--labs-surface)" : "transparent",
                          borderBottom: idx < participants.length - 1 ? "1px solid var(--labs-border-subtle)" : "none",
                        }}
                        data-testid={`print-participant-${idx}`}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                        >
                          {pName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs truncate" style={{ color: "var(--labs-text)" }}>{pName}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {participants.length === 0 && (
                <p className="text-[11px] italic mb-2" style={{ color: "var(--labs-text-muted)" }} data-testid="print-no-participants-hint">
                  {t("labs.host.noParticipantsHint")}
                </p>
              )}

              <button
                className="labs-btn-primary text-sm flex items-center gap-2 w-full justify-center"
                onClick={handleGenerateBatchSheets}
                disabled={generating === "sheets" || participants.length === 0}
                data-testid="print-generate-sheets"
              >
                {generating === "sheets" ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : <Download className="w-4 h-4 flex-shrink-0" />}
                <span className="truncate">{generating === "sheets" ? t("labs.host.creatingSheets") : t("labs.host.downloadAllSheets", { count: participants.length })}</span>
              </button>
            </div>

            <div className="rounded-lg p-3" style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border-subtle)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--labs-text)" }}>{t("labs.host.genericSheets")}</p>
              <div className="flex flex-wrap gap-2 min-w-0">
                <div className="flex-1 min-w-[120px]">
                  <button
                    className="labs-btn-secondary text-sm flex items-center gap-2 justify-center w-full"
                    onClick={handleGenerateMasterSheet}
                    disabled={generating === "master"}
                    data-testid="print-generate-master-sheet"
                  >
                    {generating === "master" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {t("labs.host.masterSheet")}
                  </button>
                  <p className="text-[10px] mt-1 text-center" style={{ color: "var(--labs-text-muted)" }}>
                    {t("labs.host.masterSheetDesc")}
                  </p>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <button
                    className="labs-btn-ghost text-sm flex items-center gap-2 justify-center w-full"
                    onClick={handleGenerateBlankSheet}
                    disabled={generating === "blank"}
                    data-testid="print-generate-blank-sheet"
                  >
                    {generating === "blank" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {t("labs.host.blankoSheet")}
                  </button>
                  <p className="text-[10px] mt-1 text-center" style={{ color: "var(--labs-text-muted)" }}>
                    {t("labs.host.blankoSheetDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="labs-card p-4">
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>{t("labs.host.tastingMat")}</p>
            <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
              {t("labs.host.tastingMatDesc", { count: whiskyCount })}
            </p>
            <button
              className="labs-btn-secondary text-sm flex items-center gap-2 w-full justify-center"
              onClick={handleGenerateMat}
              disabled={generating === "mat"}
              data-testid="print-generate-mat"
            >
              {generating === "mat" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {generating === "mat" ? t("labs.host.generatingEllipsis") : t("labs.host.downloadTastingMat")}
            </button>
          </div>

          <div className="labs-card p-4" data-testid="print-share-section">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--labs-text)" }}>
              <Share2 className="w-3.5 h-3.5 inline mr-1.5" style={{ verticalAlign: "-2px" }} />
              {t("printableSheets.shareWithParticipants", "Share with Participants")}
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
              {t("printableSheets.shareWithParticipantsDesc", "Allow participants to download these materials")}
            </p>
            {([
              { key: "menuCard", label: t("printableSheets.menuCard", "Menu Card") },
              { key: "scoreSheets", label: t("printableSheets.scoreSheets", "Score Sheets") },
              { key: "tastingMat", label: t("printableSheets.tastingMat", "Tasting Mat") },
              { key: "masterSheet", label: t("printableSheets.masterSheet", "Master Sheet") },
            ] as const).map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: key !== "masterSheet" ? "1px solid var(--labs-border-subtle)" : "none", cursor: "pointer" }}
                data-testid={`toggle-share-${key}`}
              >
                <span className="text-sm" style={{ color: "var(--labs-text-secondary)" }}>{label}</span>
                <div
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: shared[key] ? "var(--labs-accent)" : "var(--labs-border)",
                    position: "relative", transition: "background 0.2s", cursor: "pointer",
                  }}
                  onClick={() => toggleShared(key)}
                >
                  <div
                    style={{
                      width: 16, height: 16, borderRadius: 8, background: "#fff",
                      position: "absolute", top: 2,
                      left: shared[key] ? 18 : 2,
                      transition: "left 0.2s",
                    }}
                  />
                </div>
              </label>
            ))}
          </div>

          <button
            className="labs-btn-secondary w-full flex items-center justify-center gap-2"
            onClick={() => navigate(`/labs/tastings/${tastingId}/scan`)}
            data-testid="settings-paper-scan"
          >
            <ScanLine className="w-4 h-4" />
            {t("labs.host.paperScanner")}
          </button>
        </div>
      )}
    </div>
  );
}

function MobileCompanion({
  tasting,
  whiskies,
  participants,
  ratings,
  currentParticipant,
  queryClient,
  tastingId,
  navigate,
  onSwitchToManage,
}: {
  tasting: Record<string, unknown>;
  whiskies: Array<Record<string, unknown>>;
  participants: Array<Record<string, unknown>>;
  ratings: Array<Record<string, unknown>>;
  currentParticipant: Record<string, unknown>;
  queryClient: ReturnType<typeof useQueryClient>;
  tastingId: string;
  navigate: (path: string) => void;
  onSwitchToManage?: () => void;
}) {
  const goBack = useLabsBack("/labs/tastings");
  const statusCfg = getStatusConfig(tasting.status as string);
  const whiskyCount = whiskies.length;
  const participantCount = participants.length;
  const ratingCount = ratings.length;
  const { t } = useTranslation();
  const isLive = tasting.status === "open";
  const isDraft = tasting.status === "draft";
  const isEnded = tasting.status === "closed" || tasting.status === "archived" || tasting.status === "reveal";
  const pid = currentParticipant?.id as string;

  const [mobileEditTitle, setMobileEditTitle] = useState<string | null>(null);
  const mobileEditCancelled = useRef(false);
  const [mobileWhiskyListOpen, setMobileWhiskyListOpen] = useState<boolean | null>(null);
  const whiskyListInitRef = useRef(false);
  useEffect(() => {
    if (!whiskyListInitRef.current && whiskyCount > 0) {
      whiskyListInitRef.current = true;
      setMobileWhiskyListOpen(whiskyCount <= 3);
    }
  }, [whiskyCount]);
  const whiskyListExpanded = mobileWhiskyListOpen ?? true;
  const [mobileWhiskyName, setMobileWhiskyName] = useState("");
  const [mobileWbId, setMobileWbId] = useState("");
  const [mobileWbLoading, setMobileWbLoading] = useState(false);
  const [mobileWbResult, setMobileWbResult] = useState("");
  const [mobileShowAdd, setMobileShowAdd] = useState(false);
  const [mobileShowAddPopover, setMobileShowAddPopover] = useState(false);
  const [mobileAiImport, setMobileAiImport] = useState(false);
  const [mobileAiFiles, setMobileAiFiles] = useState<File[]>([]);
  const [mobileAiText, setMobileAiText] = useState("");
  const [mobileAiLoading, setMobileAiLoading] = useState(false);
  const mobileAiLoadingRef = useRef(false);
  const [mobileAiResults, setMobileAiResults] = useState<any[]>([]);
  const [mobileAiSelected, setMobileAiSelected] = useState<Set<number>>(new Set());
  const [mobileDragOver, setMobileDragOver] = useState(false);
  const [confirmEndSession, setConfirmEndSession] = useState(false);

  const lockedDrams: string[] = (() => {
    try { return JSON.parse((tasting as any).lockedDrams || "[]"); } catch { return []; }
  })();
  const isDramLocked = (whiskyId: string) => lockedDrams.includes(whiskyId);
  const toggleDramLock = async (whiskyId: string) => {
    const next = isDramLocked(whiskyId)
      ? lockedDrams.filter(id => id !== whiskyId)
      : [...lockedDrams, whiskyId];
    await tastingApi.updateDetails(tastingId, pid, { lockedDrams: JSON.stringify(next) });
    queryClient.invalidateQueries({ queryKey: [`/api/tastings/${tastingId}`] });
  };
  const [mobileEditId, setMobileEditId] = useState<string | null>(null);
  const [mobileEditName, setMobileEditName] = useState("");

  const patchMobileDetails = async (fields: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/tastings/${tastingId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: pid, ...fields }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
      }
    } catch {}
  };

  const addWhiskyMut = useMutation({
    mutationFn: (data: any) => whiskyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setMobileWhiskyName("");
      setMobileWbId("");
      setMobileWbResult("");
      toast({ title: t("labs.whisky.added", "Whisky added") });
    },
    onError: (e: Error) => {
      toast({ title: t("labs.whisky.addFailed", "Failed to add whisky"), description: e.message, variant: "destructive" });
    },
  });

  const deleteWhiskyMut = useMutation({
    mutationFn: (id: string) => whiskyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      toast({ title: t("labs.whisky.deleted", "Whisky removed") });
    },
    onError: (e: Error) => {
      toast({ title: t("labs.whisky.deleteFailed", "Failed to remove whisky"), description: e.message, variant: "destructive" });
    },
  });

  const updateWhiskyMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => whiskyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setMobileEditId(null);
      toast({ title: t("labs.whisky.updated", "Whisky updated") });
    },
    onError: (e: Error) => {
      toast({ title: t("labs.whisky.updateFailed", "Failed to update whisky"), description: e.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      tastingApi.updateStatus(tastingId, status, undefined, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const guidedAdvanceMut = useMutation({
    mutationFn: () => guidedApi.advance(tastingId, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const revealMutation = useMutation({
    mutationFn: () => blindModeApi.revealNext(tastingId, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const guidedIdx = (tasting.guidedWhiskyIndex as number) ?? -1;
  const activeWhisky = tasting.guidedMode && guidedIdx >= 0 && guidedIdx < whiskyCount ? whiskies[guidedIdx] : null;
  const activeRatedPids = new Set(
    activeWhisky ? ratings.filter((r: Record<string, unknown>) => r.whiskyId === (activeWhisky as Record<string, unknown>).id).map((r: Record<string, unknown>) => r.participantId) : []
  );

  const handleMobileAdd = () => {
    if (!mobileWhiskyName.trim()) return;
    addWhiskyMut.mutate({
      tastingId,
      name: mobileWhiskyName.trim(),
      ...(mobileWbId.trim() ? { whiskybaseId: mobileWbId.trim() } : {}),
      sortOrder: whiskyCount + 1,
    });
  };

  const handleMobileWbLookup = useCallback(async () => {
    const id = mobileWbId.trim();
    if (!id || !/^\d+$/.test(id)) return;
    setMobileWbLoading(true);
    setMobileWbResult("");
    try {
      const headers: Record<string, string> = {};
      if (currentParticipant?.id) headers["x-participant-id"] = currentParticipant.id;
      const res = await fetch(`/api/whiskybase-lookup/${encodeURIComponent(id)}`, { headers });
      if (!res.ok) {
        setMobileWbResult(res.status === 429 ? "rate_limit" : res.status === 400 ? "invalid" : "not_found");
        return;
      }
      const data = await res.json();
      if (data.name) setMobileWhiskyName(data.name);
      setMobileWbResult("ok");
    } catch {
      setMobileWbResult("error");
    } finally {
      setMobileWbLoading(false);
    }
  }, [currentParticipant?.id, mobileWbId]);

  const [mobileAiError, setMobileAiError] = useState("");
  const [mobileAiSummary, setMobileAiSummary] = useState<{ added: number; duplicatesAdded: number; duplicatesSkipped: number; failed: number } | null>(null);

  const getMobileDuplicateIndices = useCallback(() => {
    if (!whiskies || !mobileAiResults.length) return new Set<number>();
    const dupes = new Set<number>();
    mobileAiResults.forEach((w: any, i: number) => {
      const match = whiskies.some((ew: any) =>
        isSimilarWhisky(w.name || "", w.distillery || "", ew.name || "", ew.distillery || "")
      );
      if (match) dupes.add(i);
    });
    return dupes;
  }, [whiskies, mobileAiResults]);

  const handleMobileAiImport = async () => {
    if (mobileAiFiles.length === 0 && !mobileAiText.trim()) return;
    setMobileAiLoading(true);
    mobileAiLoadingRef.current = true;
    setMobileAiError("");
    setMobileAiSummary(null);
    try {
      const excelFile = mobileAiFiles.find(isExcelFile);
      let parsedWhiskies: any[] | null = null;
      if (excelFile) {
        parsedWhiskies = await parseExcelWhiskies(excelFile);
      }
      if (parsedWhiskies && parsedWhiskies.length > 0) {
        setMobileAiResults(parsedWhiskies);
        const existingList = (whiskies || []) as Array<Record<string, unknown>>;
        const nonDupeIndices = new Set(
          parsedWhiskies.map((_: any, i: number) => i).filter((i: number) =>
            !existingList.some((ew: any) => isSimilarWhisky(parsedWhiskies![i].name || "", parsedWhiskies![i].distillery || "", ew.name || "", ew.distillery || ""))
          )
        );
        setMobileAiSelected(nonDupeIndices);
      } else if (excelFile && (!parsedWhiskies || parsedWhiskies.length === 0)) {
        setMobileAiError("No whiskies found in Excel file. Make sure at least a 'Name' column (or row) is filled, or use the import template.");
      } else {
        const result = await tastingApi.aiImport(mobileAiFiles, mobileAiText.trim(), pid);
        if (result?.whiskies?.length) {
          setMobileAiResults(result.whiskies);
          const existingList = (whiskies || []) as Array<Record<string, unknown>>;
          const nonDupeIndices = new Set(
            result.whiskies.map((_: any, i: number) => i).filter((i: number) =>
              !existingList.some((ew: any) => isSimilarWhisky(result.whiskies[i].name || "", result.whiskies[i].distillery || "", ew.name || "", ew.distillery || ""))
            )
          );
          setMobileAiSelected(nonDupeIndices);
        } else {
          setMobileAiError(t("labs.aiImport.noResults", "No whiskies found. Try a clearer photo or text."));
        }
      }
    } catch (e: unknown) {
      setMobileAiError((e instanceof Error ? e.message : null) || t("labs.aiImport.importFailed", "AI import failed. Please try again."));
    }
    setMobileAiLoading(false);
    mobileAiLoadingRef.current = false;
  };

  useEffect(() => {
    if (mobileAiFiles.length === 0) return;
    if (mobileAiLoadingRef.current) return;
    const timer = setTimeout(() => {
      if (!mobileAiLoadingRef.current) {
        handleMobileAiImport();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [mobileAiFiles]);

  const handleMobileAiConfirm = async () => {
    let added = 0, dupeAdded = 0, fail = 0;
    const dupeIndices = getMobileDuplicateIndices();
    const duplicatesSkipped = Array.from(dupeIndices).filter(i => !mobileAiSelected.has(i)).length;
    const existingList = (whiskies || []) as Array<Record<string, unknown>>;
    for (const idx of Array.from(mobileAiSelected)) {
      const w = mobileAiResults[idx];
      if (w) {
        const isDupe = existingList.some((ew: any) => isSimilarWhisky(w.name || "", w.distillery || "", ew.name || "", ew.distillery || ""));
        try {
          await whiskyApi.create({
            tastingId,
            name: w.name || "",
            distillery: w.distillery || "",
            abv: normalizeAbv(w.abv),
            caskInfluence: w.caskInfluence || w.caskType || w.cask || "",
            age: w.age ? String(w.age) : "",
            category: w.category || "",
            country: w.country || "",
            region: w.region || "",
            bottler: w.bottler || "",
            peatLevel: w.peatLevel || "",
            ppm: w.ppm ? parseFloat(w.ppm) || null : null,
            price: normalizePrice(w.price),
            vintage: w.vintage || "",
            distilledYear: w.distilledYear || "",
            bottledYear: w.bottledYear || "",
            whiskybaseId: w.whiskybaseId || "",
            notes: w.notes || "",
            hostSummary: w.hostSummary || "",
            sortOrder: w.sortOrder ? parseInt(w.sortOrder) || (whiskyCount + added + dupeAdded + 1) : (whiskyCount + added + dupeAdded + 1),
          });
          if (isDupe) dupeAdded++; else added++;
        } catch { fail++; }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    setMobileAiSummary({ added, duplicatesAdded: dupeAdded, duplicatesSkipped, failed: fail });
    setMobileAiResults([]);
    setMobileAiSelected(new Set());
    if (fail === 0) {
      setMobileAiFiles([]);
      setMobileAiText("");
      setTimeout(() => { setMobileAiImport(false); setMobileAiSummary(null); }, 2500);
    }
  };

  return (
    <div className="px-4 py-5 labs-fade-in" style={{ paddingBottom: 120 }} data-testid="labs-mobile-companion">
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-mobile-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Tastings
      </button>

      <div className="labs-card p-4 mb-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          {mobileEditTitle !== null ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                className="labs-input flex-1"
                value={mobileEditTitle}
                onChange={e => setMobileEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    mobileEditCancelled.current = true;
                    setMobileEditTitle(null);
                  }
                }}
                onBlur={() => {
                  if (mobileEditCancelled.current) {
                    mobileEditCancelled.current = false;
                    return;
                  }
                  const trimmed = (mobileEditTitle || "").trim();
                  if (trimmed && trimmed !== tasting.title) {
                    patchMobileDetails({ title: trimmed });
                  }
                  setMobileEditTitle(null);
                }}
                autoFocus
                data-testid="labs-mobile-edit-title-input"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h1
                className="labs-h3"
                style={{ color: "var(--labs-text)", margin: 0, cursor: "pointer" }}
                onClick={() => setMobileEditTitle((tasting.title as string) || "")}
                data-testid="labs-mobile-title"
              >
                {(tasting.title as string) || t("m2.host.untitledTasting", "Untitled Tasting")}
              </h1>
              <button
                className="labs-btn-ghost p-1 flex-shrink-0"
                onClick={() => setMobileEditTitle((tasting.title as string) || "")}
                data-testid="labs-mobile-edit-title-btn"
              >
                <Pencil className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />
              </button>
            </div>
          )}
          <span className={statusCfg.cssClass} style={{ flexShrink: 0 }}>
            {isLive && <span className="labs-status-live-dot" />}
            {t(statusCfg.labelKey, statusCfg.fallbackLabel)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { value: whiskyCount, label: t("m2.host.drams", "Drams") },
            { value: participantCount, label: t("m2.host.guests", "Guests") },
            { value: ratingCount, label: t("m2.host.ratings", "Ratings") },
          ].map(({ value, label }) => (
            <div key={label} style={{ flex: 1, background: "var(--labs-surface-elevated)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)" }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {isDraft && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="labs-section-label mb-0">Whiskies ({whiskyCount})</p>
            <div style={{ position: "relative" }}>
              {(mobileShowAdd || mobileAiImport) ? (
                <button
                  className="labs-btn-ghost flex items-center gap-1 text-xs"
                  onClick={() => { setMobileShowAdd(false); setMobileAiImport(false); setMobileShowAddPopover(false); }}
                  data-testid="mobile-add-whisky-toggle"
                >
                  <X className="w-3 h-3" />
                  Close
                </button>
              ) : (
                <button
                  className="labs-btn-ghost flex items-center gap-1 text-xs"
                  onClick={() => setMobileShowAddPopover(!mobileShowAddPopover)}
                  data-testid="mobile-add-whisky-toggle"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
              {mobileShowAddPopover && !mobileShowAdd && !mobileAiImport && (<>
                <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setMobileShowAddPopover(false)} />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 4,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "var(--labs-surface-elevated)",
                    border: "1px solid var(--labs-border)",
                    minWidth: 200,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    zIndex: 20,
                  }}
                >
                  <button
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "14px 16px",
                      fontSize: 14,
                      color: "var(--labs-text)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onClick={() => { setMobileAiImport(true); setMobileShowAdd(false); setMobileShowAddPopover(false); }}
                    data-testid="mobile-ai-import-toggle"
                  >
                    <Sparkles style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
                    {t("hostUi.aiImport")}
                  </button>
                  <div style={{ height: 1, background: "var(--labs-border)", margin: "0 12px" }} />
                  <button
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "14px 16px",
                      fontSize: 14,
                      color: "var(--labs-text)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onClick={() => { setMobileShowAdd(true); setMobileAiImport(false); setMobileShowAddPopover(false); }}
                    data-testid="mobile-manual-add-btn"
                  >
                    <Plus style={{ width: 16, height: 16, color: "var(--labs-text-secondary)" }} />
                    {t("labs.aiImport.orManually", "or add manually").replace(/^or\s+/i, '').replace(/^\w/, (c: string) => c.toUpperCase())}
                  </button>
                </div>
              </>)}
            </div>
          </div>

          {!mobileAiImport && !mobileShowAdd && !mobileShowAddPopover && whiskyCount === 0 && (
            <div className="mb-3" data-testid="mobile-empty-lineup">
              <div style={{ textAlign: "center", padding: "20px 0 12px" }}>
                <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", margin: 0 }}>
                  {t("labs.aiImport.emptyTitle", "No whiskies yet.")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, padding: "0 4px" }}>
                <button
                  onClick={() => { setMobileAiImport(true); setMobileShowAdd(false); }}
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 20px",
                    background: "linear-gradient(135deg, var(--labs-accent), color-mix(in srgb, var(--labs-accent) 80%, #000))",
                    color: "var(--labs-bg)",
                    border: "none",
                    borderRadius: 100,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  data-testid="mobile-ai-import-hero"
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  {t("hostUi.aiImport")}
                </button>
                <button
                  onClick={() => { setMobileShowAdd(true); setMobileAiImport(false); }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "12px 16px",
                    background: "transparent",
                    color: "var(--labs-text-secondary)",
                    border: "1px solid var(--labs-border)",
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 400,
                    cursor: "pointer",
                  }}
                  data-testid="mobile-manual-add-btn"
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  {t("labs.aiImport.orManually", "or add manually").replace(/^or\s+/i, '').replace(/^\w/, (c: string) => c.toUpperCase())}
                </button>
              </div>
            </div>
          )}

          {mobileAiImport && (
            <div className="labs-card mb-3 overflow-hidden" data-testid="mobile-ai-import-panel" style={{ border: "1px solid color-mix(in srgb, var(--labs-accent) 25%, transparent)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: "color-mix(in srgb, var(--labs-accent) 8%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--labs-accent) 15%, transparent)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                <span className="text-sm font-semibold flex-1" style={{ color: "var(--labs-text)" }}>{t("hostUi.aiImport")}</span>
                <button className="labs-btn-ghost text-xs" onClick={() => { setMobileAiImport(false); setMobileAiFiles([]); setMobileAiText(""); setMobileAiResults([]); setMobileAiError(""); }} style={{ padding: "2px 6px" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-3">
                <div
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-sm"
                  style={{
                    border: `2px dashed ${mobileDragOver ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    color: "var(--labs-text-muted)",
                    background: mobileDragOver ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                    transition: "all 0.2s",
                  }}
                  onDragOver={e => { e.preventDefault(); setMobileDragOver(true); }}
                  onDragLeave={() => setMobileDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setMobileDragOver(false);
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length) setMobileAiFiles(prev => [...prev, ...files]);
                  }}
                >
                  <Upload className="w-6 h-6" style={{ color: "var(--labs-accent)", opacity: 0.75 }} />
                  <p className="text-xs text-center" style={{ color: "var(--labs-text-secondary)" }}>
                    Drop photos, PDFs, Excel or files here
                  </p>
                  <a
                    href="/CaskSense_Whisky_Import_Template.xlsx"
                    download
                    className="text-[10px] underline"
                    style={{ color: "var(--labs-accent)", opacity: 0.7 }}
                    onClick={e => e.stopPropagation()}
                    data-testid="mobile-download-excel-template"
                  >
                    <Download className="w-3 h-3 inline mr-0.5" />
                    Download Excel Template
                  </a>
                  <div className="flex gap-2">
                    <label className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none" }}>
                      <Camera className="w-3 h-3" />
                      Camera
                      <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => { if (e.target.files) setMobileAiFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                    </label>
                    <label className="labs-btn-ghost text-xs cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3 h-3" />
                      Browse
                      <input type="file" accept="image/*,.pdf,.csv,.txt,.xlsx" multiple style={{ display: "none" }} onChange={e => { if (e.target.files) setMobileAiFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                    </label>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }} data-testid="text-upload-rights-hint">{t("common.uploadRightsHint")}</p>
                </div>
                {mobileAiFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mobileAiFiles.map((f, i) => (
                      isImageFile(f) ? (
                        <FileThumbnail
                          key={i}
                          file={f}
                          onRemove={() => setMobileAiFiles(prev => prev.filter((_, j) => j !== i))}
                          testId={`mobile-ai-file-${i}`}
                        />
                      ) : (
                        <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 30%, transparent)" }} title={f.name} data-testid={`mobile-ai-file-${i}`}>
                          <FileIcon file={f} className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{f.name.length > 25 ? f.name.slice(0, 22) + "..." : f.name}</span>
                          <span className="text-xs opacity-70">{formatFileSize(f.size)}</span>
                          <button onClick={() => setMobileAiFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )
                    ))}
                  </div>
                )}
                <div style={{ position: "relative" }}>
                  <textarea
                    className="labs-input w-full"
                    rows={2}
                    placeholder={t("labs.host.pasteText")}
                    value={mobileAiText}
                    onChange={e => setMobileAiText(e.target.value)}
                    style={{ resize: "none", fontSize: 13 }}
                    data-testid="mobile-ai-import-text"
                  />
                </div>
                <button
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  onClick={handleMobileAiImport}
                  disabled={mobileAiLoading || (mobileAiFiles.length === 0 && !mobileAiText.trim())}
                  style={{
                    background: (mobileAiFiles.length > 0 || mobileAiText.trim()) ? "var(--labs-accent)" : "var(--labs-surface-elevated)",
                    color: (mobileAiFiles.length > 0 || mobileAiText.trim()) ? "var(--labs-bg)" : "var(--labs-text-muted)",
                    border: "none",
                    cursor: (mobileAiFiles.length > 0 || mobileAiText.trim()) ? "pointer" : "not-allowed",
                    opacity: mobileAiLoading ? 0.7 : 1,
                  }}
                  data-testid="mobile-ai-import-analyze"
                >
                  {mobileAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : mobileAiFiles.some(isExcelFile) ? <Upload className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {mobileAiLoading ? t("labs.host.importingEllipsis") : mobileAiFiles.some(isExcelFile) ? t("labs.host.importExcel") : t("labs.host.analyze")}
                </button>

                {mobileAiError && (
                  <div className="text-xs p-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--labs-danger) 15%, transparent)", color: "var(--labs-danger)" }}>
                    {mobileAiError}
                  </div>
                )}

                {mobileAiSummary && (
                  <div className="text-xs p-3 rounded-lg space-y-1" style={{ background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 20%, transparent)" }} data-testid="mobile-ai-summary">
                    {mobileAiSummary.added > 0 && <p style={{ color: "var(--labs-success)", margin: 0 }}>{mobileAiSummary.added} {t("labs.aiImport.added", "added")}</p>}
                    {mobileAiSummary.duplicatesAdded > 0 && <p style={{ color: "var(--labs-warning, var(--labs-text-muted))", margin: 0 }}>{mobileAiSummary.duplicatesAdded} {t("labs.aiImport.duplicatesAdded", "duplicates added")}</p>}
                    {mobileAiSummary.duplicatesSkipped > 0 && <p style={{ color: "var(--labs-text-muted)", margin: 0 }}>{mobileAiSummary.duplicatesSkipped} {t("labs.aiImport.duplicatesSkipped", "duplicates skipped")}</p>}
                    {mobileAiSummary.failed > 0 && <p style={{ color: "var(--labs-danger)", margin: 0 }}>{mobileAiSummary.failed} {t("labs.aiImport.failed", "failed")}</p>}
                  </div>
                )}

                {mobileAiResults.length > 0 && (() => {
                  const dupeIndices = getMobileDuplicateIndices();
                  const nonDupeCount = mobileAiResults.length - dupeIndices.size;
                  return (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>
                        {t("labs.aiImport.found", "Found {{count}}", { count: mobileAiResults.length })}
                        {dupeIndices.size > 0 && <span style={{ color: "var(--labs-text-muted)" }}> ({dupeIndices.size} {t("labs.aiImport.alreadyInLineup", "already in lineup")})</span>}
                      </span>
                      <button
                        className="labs-btn-ghost text-xs"
                        onClick={() => setMobileAiSelected(mobileAiSelected.size === nonDupeCount ? new Set() : new Set(mobileAiResults.map((_, i) => i).filter(i => !dupeIndices.has(i))))}
                        data-testid="mobile-ai-select-all"
                      >
                        {mobileAiSelected.size === nonDupeCount && nonDupeCount > 0 ? t("labs.aiImport.deselectAll", "Deselect") : t("labs.aiImport.selectNew", "Select New")}
                      </button>
                    </div>
                    {mobileAiResults.map((w: any, i: number) => {
                      const isDupe = dupeIndices.has(i);
                      return (
                      <label key={i} className="labs-card p-2 flex items-center gap-2 cursor-pointer" style={{ opacity: mobileAiSelected.has(i) ? 1 : isDupe ? 0.4 : 0.5 }}>
                        <input type="checkbox" checked={mobileAiSelected.has(i)} onChange={() => { const s = new Set(mobileAiSelected); s.has(i) ? s.delete(i) : s.add(i); setMobileAiSelected(s); }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate" style={{ margin: 0 }}>{w.name}</p>
                            {isDupe && <span className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--labs-warning, #f59e0b) 20%, transparent)", color: "var(--labs-warning, #f59e0b)", whiteSpace: "nowrap" }} data-testid={`mobile-ai-dupe-badge-${i}`}>{t("labs.aiImport.duplicate", "duplicate")}</span>}
                          </div>
                          <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                            {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </label>
                      );
                    })}
                    <button className="labs-btn-primary w-full text-sm" onClick={handleMobileAiConfirm} disabled={mobileAiSelected.size === 0} data-testid="mobile-ai-confirm">
                    {t("labs.aiImport.addCount", "Add {{count}} Whiskies", { count: mobileAiSelected.size })}
                  </button>
                </div>
                  );
                })()}
            </div>
            </div>
          )}

          {mobileShowAdd && (
            <div className="labs-card p-3 mb-3 space-y-2" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex gap-1.5 items-center">
                <input
                  className="labs-input"
                  placeholder={t("labs.host.wbPlaceholder")}
                  value={mobileWbId}
                  onChange={e => { setMobileWbId(e.target.value.replace(/[^0-9]/g, "")); setMobileWbResult(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && mobileWbId.trim()) handleMobileWbLookup(); }}
                  style={{ width: 64, fontSize: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.07)" }}
                  data-testid="mobile-wb-lookup-input"
                />
                <button
                  className="labs-btn-ghost p-1"
                  onClick={handleMobileWbLookup}
                  disabled={!mobileWbId.trim() || mobileWbLoading}
                  data-testid="mobile-wb-lookup-btn"
                  style={{ color: mobileWbResult === "ok" ? "var(--labs-success)" : mobileWbResult && mobileWbResult !== "ok" ? "var(--labs-danger)" : "var(--labs-accent)" }}
                >
                  {mobileWbLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : mobileWbResult === "ok" ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                </button>
                <input
                  className="labs-input flex-1"
                  placeholder={t("labs.host.whiskyNamePlaceholder")}
                  value={mobileWhiskyName}
                  onChange={e => setMobileWhiskyName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleMobileAdd()}
                  data-testid="mobile-whisky-name-input"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  autoFocus
                />
                <button
                  className="labs-btn-ghost px-3"
                  onClick={handleMobileAdd}
                  disabled={!mobileWhiskyName.trim() || addWhiskyMut.isPending}
                  data-testid="mobile-whisky-add-btn"
                  style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8 }}
                >
                  {addWhiskyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                </button>
              </div>
              {mobileWbResult && mobileWbResult !== "ok" && (
                <p className="text-xs" style={{ color: "var(--labs-danger)", margin: 0 }}>
                  {mobileWbResult === "not_found" ? "WB ID not found" : mobileWbResult === "rate_limit" ? "Too many lookups" : mobileWbResult === "invalid" ? "Invalid ID" : "Lookup failed"}
                </p>
              )}
            </div>
          )}

          {whiskyCount > 0 && (
            <div className="space-y-2 mb-3">
              {whiskies.map((w: any, i: number) => (
                <div key={w.id} className="labs-card p-3 flex items-center gap-2" data-testid={`mobile-whisky-${w.id}`}>
                  {mobileEditId === w.id ? (
                    <>
                      <input
                        className="labs-input flex-1"
                        value={mobileEditName}
                        onChange={e => setMobileEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") updateWhiskyMut.mutate({ id: w.id, data: { name: mobileEditName } }); }}
                        autoFocus
                        data-testid="mobile-edit-whisky-input"
                      />
                      <button className="labs-btn-primary px-2 text-xs" onClick={() => updateWhiskyMut.mutate({ id: w.id, data: { name: mobileEditName } })} data-testid="mobile-edit-whisky-save">
                        {updateWhiskyMut.isPending ? "..." : <Check className="w-3 h-3" />}
                      </button>
                      <button className="labs-btn-ghost px-1" onClick={() => setMobileEditId(null)}>
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      {w.imageUrl ? (
                        <img src={w.imageUrl} alt={w.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid var(--labs-border)" }} />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{w.name || `Whisky ${i + 1}`}</p>
                        <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                          {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ") || t("labs.host.noAdditionalDetails")}
                        </p>
                      </div>
                      <button className="labs-btn-ghost p-1" onClick={() => { setMobileEditId(w.id); setMobileEditName(w.name || ""); }} data-testid={`mobile-edit-whisky-${w.id}`}>
                        <Pencil className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />
                      </button>
                      <button className="labs-btn-ghost p-1" onClick={() => deleteWhiskyMut.mutate(w.id)} data-testid={`mobile-delete-whisky-${w.id}`}>
                        <Trash2 className="w-3 h-3" style={{ color: "var(--labs-danger)" }} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {tasting.guidedMode && isLive && activeWhisky && (
        <div className="labs-card p-4 mb-4">
          <p className="labs-section-label">{t("labs.host.currentDram")}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>
                {tasting.blindMode ? `Dram ${String.fromCharCode(65 + guidedIdx)}` : String((activeWhisky as Record<string, unknown>).name ?? "") || `Whisky ${guidedIdx + 1}`}
              </p>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
              {activeRatedPids.size}/{participantCount} rated
            </span>
          </div>
        </div>
      )}

      {(() => {
        const showBlindReveal = tasting.blindMode && !tasting.guidedMode && (isLive || tasting.status === "reveal");
        if (!showBlindReveal || whiskyCount === 0) return null;
        const rv = getRevealState(tasting, whiskyCount, t);
        const currentWhisky = whiskies[rv.revealIndex];
        return (
          <div className="labs-card p-4 mb-4" data-testid="mobile-reveal-state">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p className="labs-section-label mb-0" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Eye className="w-3.5 h-3.5" style={{ color: "var(--labs-info)" }} />
                {t("labs.host.revealProgress")}
              </p>
              <span className="labs-badge" style={{ background: rv.allRevealed ? "var(--labs-success-muted)" : "var(--labs-info-muted)", color: rv.allRevealed ? "var(--labs-success)" : "var(--labs-info)", fontSize: 11 }}>
                {rv.allRevealed ? t("labs.host.allDramsRevealed") : t("labs.host.dramOfTotal", { current: rv.revealIndex + 1, total: whiskyCount })}
              </span>
            </div>

            {currentWhisky && !rv.allRevealed && (
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                >
                  {String.fromCharCode(65 + rv.revealIndex)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                    {isFieldRevealed(rv, "name") ? (currentWhisky.name || `Whisky ${rv.revealIndex + 1}`) : `Dram ${String.fromCharCode(65 + rv.revealIndex)} (Blind)`}
                  </p>
                  {isFieldRevealed(rv, ["distillery", "age", "abv"]) && (
                    <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                      {[currentWhisky.distillery, currentWhisky.age ? `${currentWhisky.age}y` : null, currentWhisky.abv ? `${currentWhisky.abv}%` : null].filter(Boolean).join(" · ") || t("labs.host.noAdditionalDetails")}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-1 mb-1">
              {rv.stepLabels.map((label: string, idx: number) => (
                <div
                  key={label}
                  className="flex-1 h-1.5 rounded-full"
                  style={{
                    background: idx < rv.revealStep ? "var(--labs-accent)" : "var(--labs-border)",
                    transition: "background 300ms ease",
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between">
              {rv.stepLabels.map((label: string, idx: number) => (
                <span key={label} className="text-[11px]" style={{ color: idx < rv.revealStep ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
                  {label}
                </span>
              ))}
            </div>

            {whiskyCount > 1 && (
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {whiskies.map((_: any, i: number) => {
                  let bg = "var(--labs-border)";
                  let fg = "var(--labs-text-muted)";
                  if (i < rv.revealIndex || (i === rv.revealIndex && rv.revealStep >= rv.maxSteps)) {
                    bg = "var(--labs-success)";
                    fg = "var(--labs-bg)";
                  } else if (i === rv.revealIndex) {
                    bg = "var(--labs-accent)";
                    fg = "var(--labs-bg)";
                  }
                  return (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: bg, color: fg }}
                    >
                      {i < rv.revealIndex || (i === rv.revealIndex && rv.revealStep >= rv.maxSteps) ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + i)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {isDraft && (
          <button
            className="labs-btn-primary flex items-center justify-center gap-2 w-full"
            onClick={async () => {
              if (tasting.guidedMode) {
                await guidedApi.updateMode(tastingId, pid, { guidedMode: true, guidedWhiskyIndex: 0, guidedRevealStep: 0 });
              }
              await tastingApi.updateStatus(tastingId, "open", undefined, pid);
              queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
            }}
            disabled={whiskyCount === 0}
            style={{ opacity: whiskyCount === 0 ? 0.5 : 1, minHeight: 48, fontSize: 15, fontWeight: 600, borderRadius: 14 }}
            data-testid="mobile-start-tasting"
          >
            <Play className="w-5 h-5" />
            Start Tasting
          </button>
        )}

        {isLive && tasting.guidedMode && (
          <button
            className="labs-btn-primary flex items-center justify-center gap-2 w-full"
            onClick={() => guidedAdvanceMut.mutate()}
            disabled={guidedAdvanceMut.isPending || guidedIdx >= whiskyCount - 1}
            style={{ opacity: guidedIdx >= whiskyCount - 1 ? 0.5 : 1, minHeight: 48, fontSize: 15, fontWeight: 600, borderRadius: 14 }}
            data-testid="mobile-next-dram"
          >
            {guidedAdvanceMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <SkipForward className="w-5 h-5" />}
            {guidedIdx < 0 ? t("labs.host.startTasting") : guidedIdx >= whiskyCount - 1 ? t("labs.host.done") : t("labs.host.nextDram")}
          </button>
        )}

        {(isLive || tasting.status === "reveal") && tasting.blindMode && !tasting.guidedMode && whiskyCount > 0 && (() => {
          const rv = getRevealState(tasting, whiskyCount, t);
          return (
            <button
              className="labs-btn-primary flex items-center justify-center gap-2 w-full"
              onClick={() => revealMutation.mutate()}
              disabled={revealMutation.isPending || rv.allRevealed}
              style={{ opacity: rv.allRevealed ? 0.5 : 1, minHeight: 48, fontSize: 15, fontWeight: 600, borderRadius: 14 }}
              data-testid="mobile-reveal"
            >
              {revealMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
              {t(`labs.host.${rv.nextLabelKey}`, rv.nextLabelParam ? { label: rv.nextLabelParam } : {})}
            </button>
          );
        })()}

        {isLive && (
          <button
            className="flex items-center justify-center gap-2 w-full"
            onClick={() => navigate(`/labs/live/${tastingId}`)}
            style={{
              minHeight: 48,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 14,
              border: "2px solid var(--labs-accent)",
              background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)",
              color: "var(--labs-accent)",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
            }}
            data-testid="mobile-rate-btn"
          >
            <Star className="w-5 h-5" />
            {t("m2.host.myRating", "Dram bewerten")}
          </button>
        )}

        {isLive && tasting.guidedMode && activeWhisky && (
          <button
            className="labs-btn-secondary flex items-center justify-center gap-2 w-full"
            onClick={() => toggleDramLock((activeWhisky as any).id)}
            data-testid="mobile-lock-dram"
            style={{
              minHeight: 44,
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 12,
              ...(isDramLocked((activeWhisky as any).id) ? { borderColor: "var(--labs-success)", color: "var(--labs-success)" } : {}),
            }}
          >
            {isDramLocked((activeWhisky as any).id)
              ? <><Lock className="w-4 h-4" /> {t("m2.host.lockedBadge", "Locked")} — {t("m2.host.unlockDram", "Tap to Unlock")}</>
              : <><Lock className="w-4 h-4" /> {t("m2.host.lockDram", "Lock Current Dram")}</>
            }
          </button>
        )}

        {isLive && !confirmEndSession && (
          <button
            className="labs-btn-secondary flex items-center justify-center gap-2 w-full"
            onClick={() => setConfirmEndSession(true)}
            disabled={statusMutation.isPending}
            style={{ minHeight: 44, fontSize: 14, fontWeight: 500, borderRadius: 12 }}
            data-testid="mobile-end-tasting"
          >
            <Square className="w-4 h-4" />
            {t("m2.host.endSession")}
          </button>
        )}
        {isLive && confirmEndSession && (
          <div className="labs-card p-4 space-y-3">
            <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{t("m2.host.endSessionConfirmTitle")}</p>
            <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("m2.host.endSessionConfirmDesc")}</p>
            <div className="flex gap-2">
              <button className="labs-btn-ghost flex-1" style={{ minHeight: 44, fontSize: 14, borderRadius: 12 }} onClick={() => setConfirmEndSession(false)}>{t("m2.host.cancel")}</button>
              <button className="labs-btn-danger flex-1 flex items-center justify-center gap-2" style={{ minHeight: 44, fontSize: 14, borderRadius: 12 }} onClick={() => { statusMutation.mutate({ status: "closed" }); setConfirmEndSession(false); }} data-testid="mobile-confirm-end">
                <Square className="w-4 h-4" />
                {t("m2.host.endSessionConfirm")}
              </button>
            </div>
          </div>
        )}

        {isEnded && (
          <button
            className="labs-btn-primary flex items-center justify-center gap-2 w-full"
            onClick={() => navigate(`/labs/results/${tastingId}`)}
            style={{ minHeight: 48, fontSize: 15, fontWeight: 600, borderRadius: 14 }}
            data-testid="mobile-view-results"
          >
            <BarChart3 className="w-5 h-5" />
            View Results
          </button>
        )}
      </div>

      {!isDraft && whiskyCount > 0 && (() => {
        const rv = tasting.blindMode && !tasting.guidedMode ? getRevealState(tasting, whiskyCount, t) : null;
        return (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setMobileWhiskyListOpen(!whiskyListExpanded)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: 0, fontFamily: "inherit" }}
              data-testid="toggle-whisky-list"
            >
              <p className="labs-section-label mb-0">Whiskies ({whiskyCount})</p>
              <ChevronDown
                className="w-4 h-4"
                style={{ color: "var(--labs-text-muted)", transform: whiskyListExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              />
            </button>
            {whiskyListExpanded && (
            <div className="space-y-2 mt-2">
              {whiskies.map((w: any, i: number) => {
                const isRevealed = !rv || i < rv.revealIndex || (i === rv.revealIndex && rv.revealStep >= rv.maxSteps);
                const isActive = rv && i === rv.revealIndex && rv.revealStep < rv.maxSteps;
                const isHidden = rv && !isRevealed && !isActive;
                const itemRv = isActive ? rv : null;
                const showName = isRevealed || isFieldRevealed(itemRv, "name");
                const showDetails = isRevealed || isFieldRevealed(itemRv, ["distillery", "age", "abv"]);
                return (
                  <div key={w.id} className="labs-card p-3 flex items-center gap-2" style={{ opacity: isHidden ? 0.4 : 1, transition: "opacity 300ms" }} data-testid={`mobile-whisky-readonly-${w.id}`}>
                    {w.imageUrl && (isRevealed || isFieldRevealed(itemRv, "image")) ? (
                      <img src={w.imageUrl} alt={w.name || `Whisky ${i + 1}`} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid var(--labs-border)" }} />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: isRevealed ? "var(--labs-success-muted)" : isActive ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                          color: isRevealed ? "var(--labs-success)" : isActive ? "var(--labs-accent)" : "var(--labs-text-muted)",
                        }}
                      >
                        {isRevealed ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + i)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{showName ? (w.name || `Whisky ${i + 1}`) : `Dram ${String.fromCharCode(65 + i)}`}</p>
                      <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                        {showDetails
                          ? ([w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ") || t("labs.host.noAdditionalDetails"))
                          : (isHidden ? t("m2.host.hidden", "Hidden") : t("m2.host.partiallyRevealed", "Partially revealed"))}
                      </p>
                    </div>
                    {isDramLocked(w.id) && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)" }} data-testid={`badge-locked-${w.id}`}>
                        <Lock className="w-2.5 h-2.5 inline mr-0.5" style={{ verticalAlign: "-1px" }} />{t("m2.host.lockedBadge", "Locked")}
                      </span>
                    )}
                    {isActive && !isDramLocked(w.id) && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        );
      })()}

      {onSwitchToManage && (
        <div className="mt-4">
          <button
            className="flex items-center justify-center gap-2 w-full"
            onClick={onSwitchToManage}
            style={{
              minHeight: 44,
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 12,
              border: "1px solid var(--labs-border)",
              background: "transparent",
              color: "var(--labs-text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            data-testid="mobile-switch-manage"
          >
            <Sliders className="w-4 h-4" />
            {t("m2.host.allSettings", "Alle Einstellungen")}
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

function LabsToggle({ checked, onChange, icon, label, description, testId }: {
  checked: boolean; onChange: (v: boolean) => void;
  icon: React.ReactNode; label: string; description: string; testId: string;
}) {
  return (
    <div
      className="labs-card p-4 flex items-center justify-between cursor-pointer"
      onClick={() => onChange(!checked)}
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: checked ? "var(--labs-accent-muted)" : "var(--labs-surface)" }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{label}</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{description}</p>
        </div>
      </div>
      <div
        className="w-12 h-7 rounded-full transition-all flex items-center px-0.5"
        style={{
          background: checked ? "var(--labs-accent)" : "var(--labs-border)",
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <div className="w-6 h-6 rounded-full transition-all" style={{ background: "var(--labs-bg)" }} />
      </div>
    </div>
  );
}

const REVEAL_ALL_FIELDS = [
  "name", "distillery", "age", "abv", "region", "country",
  "category", "caskInfluence", "peatLevel", "bottler", "vintage",
  "distilledYear", "bottledYear",
  "hostNotes", "hostSummary", "image",
] as const;

const getRevealFieldLabels = (t: (key: string) => string): Record<string, string> => ({
  name: t("labs.host.fieldName"), distillery: t("labs.host.fieldDistillery"), age: t("labs.host.fieldAge"), abv: t("labs.host.fieldAbv"),
  region: t("labs.host.fieldRegion"), country: t("labs.host.fieldCountry"), category: t("labs.host.fieldCategory"),
  caskInfluence: t("labs.host.fieldCask"), peatLevel: t("labs.host.fieldPeat"), bottler: t("labs.host.fieldBottler"),
  vintage: t("labs.host.fieldVintage"), distilledYear: t("labs.host.fieldDistilled"), bottledYear: t("labs.host.fieldBottled"),
  hostNotes: t("labs.host.fieldNotes"), hostSummary: t("labs.host.fieldSummary"), image: t("labs.host.fieldImage"),
  ppm: t("labs.host.fieldPpm"), price: t("labs.host.fieldPrice"), wbId: t("labs.host.fieldWbId"), wbScore: t("labs.host.fieldWbScore"),
});

const REVEAL_PRESETS_MAP: Record<string, string[][]> = {
  classic: [["name"], ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"], ["image"]],
  "photo-first": [["image"], ["name"], ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"]],
  "one-by-one": [["name"], ["distillery"], ["age", "abv"], ["region", "country"], ["category", "caskInfluence"], ["peatLevel", "bottler"], ["distilledYear", "bottledYear"], ["hostNotes", "hostSummary"], ["image"]],
  "details-first": [["distillery", "age", "abv", "region", "caskInfluence"], ["name"], ["image"]],
};

function detectPresetKey(order: string[][] | null): string {
  if (!order) return "classic";
  const json = JSON.stringify(order);
  for (const [key, preset] of Object.entries(REVEAL_PRESETS_MAP)) {
    if (JSON.stringify(preset) === json) return key;
  }
  return "custom";
}

function CustomRevealEditor({ steps, onChange }: {
  steps: string[][];
  onChange: (steps: string[][]) => void;
}) {
  const { t } = useTranslation();
  const REVEAL_FIELD_LABELS = getRevealFieldLabels(t);
  const [dragFrom, setDragFrom] = useState<{ step: number; field: number } | null>(null);
  const [dragOverStep, setDragOverStep] = useState<number | null>(null);

  const allUsed = new Set(steps.flat());
  const missingFields = REVEAL_ALL_FIELDS.filter(f => !allUsed.has(f));

  const moveField = (fromStep: number, fromIdx: number, toStep: number) => {
    const next = steps.map(s => [...s]);
    const field = next[fromStep].splice(fromIdx, 1)[0];
    if (toStep >= next.length) {
      next.push([field]);
    } else {
      next[toStep].push(field);
    }
    onChange(next.filter(s => s.length > 0));
  };

  const splitField = (stepIdx: number, fieldIdx: number) => {
    const next = steps.map(s => [...s]);
    const field = next[stepIdx].splice(fieldIdx, 1)[0];
    next.splice(stepIdx + 1, 0, [field]);
    onChange(next.filter(s => s.length > 0));
  };

  const removeField = (stepIdx: number, fieldIdx: number) => {
    const next = steps.map(s => [...s]);
    next[stepIdx].splice(fieldIdx, 1);
    onChange(next.filter(s => s.length > 0));
  };

  const mergeStepUp = (stepIdx: number) => {
    if (stepIdx === 0) return;
    const next = steps.map(s => [...s]);
    next[stepIdx - 1] = [...next[stepIdx - 1], ...next[stepIdx]];
    next.splice(stepIdx, 1);
    onChange(next);
  };

  const moveStepUp = (stepIdx: number) => {
    if (stepIdx === 0) return;
    const next = steps.map(s => [...s]);
    [next[stepIdx - 1], next[stepIdx]] = [next[stepIdx], next[stepIdx - 1]];
    onChange(next);
  };

  const moveStepDown = (stepIdx: number) => {
    if (stepIdx >= steps.length - 1) return;
    const next = steps.map(s => [...s]);
    [next[stepIdx], next[stepIdx + 1]] = [next[stepIdx + 1], next[stepIdx]];
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }} data-testid="custom-reveal-editor">
      {steps.map((step, sIdx) => (
        <div
          key={sIdx}
          onDragOver={(e) => { e.preventDefault(); setDragOverStep(sIdx); }}
          onDragLeave={() => setDragOverStep(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverStep(null);
            if (dragFrom && dragFrom.step !== sIdx) {
              moveField(dragFrom.step, dragFrom.field, sIdx);
            }
            setDragFrom(null);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 8px", borderRadius: 10,
            background: dragOverStep === sIdx ? "var(--labs-accent-muted)" : "var(--labs-surface)",
            border: `1.5px solid ${dragOverStep === sIdx ? "var(--labs-accent)" : "var(--labs-border)"}`,
            transition: "all 0.15s",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => moveStepUp(sIdx)}
              disabled={sIdx === 0}
              style={{
                background: "none", border: "none", cursor: sIdx === 0 ? "default" : "pointer",
                padding: 0, color: sIdx === 0 ? "var(--labs-border)" : "var(--labs-text-muted)",
                fontSize: 11, lineHeight: 1,
              }}
              data-testid={`reveal-step-up-${sIdx}`}
            >
              <ChevronUp style={{ width: 12, height: 12 }} />
            </button>
            <button
              type="button"
              onClick={() => moveStepDown(sIdx)}
              disabled={sIdx >= steps.length - 1}
              style={{
                background: "none", border: "none", cursor: sIdx >= steps.length - 1 ? "default" : "pointer",
                padding: 0, color: sIdx >= steps.length - 1 ? "var(--labs-border)" : "var(--labs-text-muted)",
                fontSize: 11, lineHeight: 1,
              }}
              data-testid={`reveal-step-down-${sIdx}`}
            >
              <ChevronDown style={{ width: 12, height: 12 }} />
            </button>
          </div>

          <span style={{
            fontSize: 11, fontWeight: 700, color: "var(--labs-accent)",
            background: "var(--labs-accent-muted)", borderRadius: 6,
            padding: "2px 6px", flexShrink: 0, minWidth: 16, textAlign: "center",
          }}>
            {sIdx + 1}
          </span>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
            {step.map((field, fIdx) => (
              <div
                key={field}
                draggable
                onDragStart={() => setDragFrom({ step: sIdx, field: fIdx })}
                onDragEnd={() => { setDragFrom(null); setDragOverStep(null); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: "var(--labs-surface-elevated)", color: "var(--labs-text)",
                  border: "1px solid var(--labs-border)", cursor: "grab",
                  userSelect: "none",
                }}
                data-testid={`reveal-field-${field}`}
              >
                <GripVertical style={{ width: 10, height: 10, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                {REVEAL_FIELD_LABELS[field] || field}
                {step.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); splitField(sIdx, fIdx); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 0, color: "var(--labs-text-muted)", fontSize: 11, lineHeight: 1,
                    }}
                    title={t("labs.host.splitIntoStep")}
                    data-testid={`reveal-split-${field}`}
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeField(sIdx, fIdx); }}
                  className="reveal-remove-btn"
                  style={{
                    background: "color-mix(in srgb, var(--labs-danger, #e55) 12%, transparent)", border: "none", cursor: "pointer",
                    padding: "2px 3px", color: "var(--labs-danger, #e55)", fontSize: 11, lineHeight: 1,
                    borderRadius: 4, marginLeft: 2,
                    transition: "background 0.15s, transform 0.1s",
                  }}
                  title={t("labs.host.removeFromReveal")}
                  data-testid={`reveal-remove-${field}`}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </div>

          {sIdx > 0 && (
            <button
              type="button"
              onClick={() => mergeStepUp(sIdx)}
              title={t("labs.host.mergeWithPrevious")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "2px", color: "var(--labs-text-muted)", flexShrink: 0,
              }}
              data-testid={`reveal-merge-${sIdx}`}
            >
              <Layers style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      ))}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOverStep(steps.length); }}
        onDragLeave={() => setDragOverStep(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverStep(null);
          if (dragFrom) {
            moveField(dragFrom.step, dragFrom.field, steps.length);
            setDragFrom(null);
          }
        }}
        style={{
          padding: "8px 12px", borderRadius: 10,
          border: `1.5px dashed ${dragOverStep === steps.length ? "var(--labs-accent)" : "var(--labs-border)"}`,
          background: dragOverStep === steps.length ? "var(--labs-accent-muted)" : "transparent",
          textAlign: "center", fontSize: 11, color: "var(--labs-text-muted)",
          transition: "all 0.15s",
        }}
      >
        Drop here to create new step
      </div>

      {missingFields.length > 0 && (
        <div style={{
          marginTop: 4, padding: "8px 10px", borderRadius: 8,
          background: "var(--labs-surface)", border: "1px dashed var(--labs-border)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-text-muted)", marginBottom: 4 }}>
            Not included (click to add as new step):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {missingFields.map(field => (
              <button
                key={field}
                type="button"
                onClick={() => onChange([...steps, [field]])}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                  background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)",
                  border: "1px solid var(--labs-border)", cursor: "pointer",
                }}
                data-testid={`reveal-add-${field}`}
              >
                <Plus style={{ width: 8, height: 8 }} />
                {REVEAL_FIELD_LABELS[field] || field}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: 4, padding: "8px 10px", borderRadius: 8,
        background: "var(--labs-surface)", fontSize: 11, color: "var(--labs-text-muted)",
        lineHeight: 1.6,
      }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontWeight: 700, color: "var(--labs-accent)", minWidth: 44, flexShrink: 0, fontSize: 11 }}>
              {t("labs.host.revealStepN", { n: i + 1 })}:
            </span>
            <span style={{ color: "var(--labs-text)" }}>
              {step.map(f => REVEAL_FIELD_LABELS[f] || f).join(" & ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabsSegmentedSelect({ value, options, onChange }: {
  value: string | number; options: { value: string | number; label: string; desc?: string; disabled?: boolean }[];
  onChange: (v: any) => void;
}) {
  const cols = options.length <= 4 ? options.length : options.length <= 6 ? 3 : 4;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((opt) => {
        const active = value === opt.value;
        const isDisabled = !!opt.disabled;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => !isDisabled && onChange(opt.value)}
            className="rounded-lg transition-all text-center"
            style={{
              padding: "10px 4px",
              background: isDisabled ? "var(--labs-surface)" : active ? "var(--labs-accent-muted)" : "var(--labs-surface)",
              border: `1.5px solid ${isDisabled ? "var(--labs-border)" : active ? "var(--labs-accent)" : "var(--labs-border)"}`,
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.4 : 1,
            }}
            disabled={isDisabled}
            data-testid={`labs-opt-${opt.value}`}
          >
            <div className="font-bold" style={{ fontSize: 16, color: isDisabled ? "var(--labs-text-muted)" : active ? "var(--labs-accent)" : "var(--labs-text)" }}>{opt.label}</div>
            {opt.desc && <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.2, marginTop: 2 }}>{opt.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

const DRAFT_STORAGE_KEY = "labs-create-tasting-draft";

interface TastingDraft {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  blindMode: boolean;
  revealOrder: string;
  customRevealSteps: string[][];
  ratingScale: number;
  guidedMode: boolean;
  guestMode: string;
  sessionUiMode: string;
  reflectionEnabled: boolean;
  reflectionMode: string;
  reflectionVisibility: string;
  videoLink: string;
  advancedOpen: boolean;
}

function loadDraft(): Partial<TastingDraft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
}

function CreateTastingForm() {
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const { t } = useTranslation();
  const { currentParticipant, openAuthDialog } = useAppStore();

  const draft = useRef(loadDraft()).current;

  const [title, setTitle] = useState(draft?.title || "");
  const [date, setDate] = useState(draft?.date || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(draft?.time || "");
  const [location, setLocation] = useState(draft?.location || "");
  const [description, setDescription] = useState(draft?.description || "");
  const [blindMode, setBlindMode] = useState(draft?.blindMode ?? false);
  const [revealOrder, setRevealOrder] = useState(draft?.revealOrder || "classic");
  const [customRevealSteps, setCustomRevealSteps] = useState<string[][]>(draft?.customRevealSteps || REVEAL_PRESETS_MAP.classic);
  const [ratingScale, setRatingScale] = useState(draft?.ratingScale ?? 100);
  const [guidedMode, setGuidedMode] = useState(draft?.guidedMode ?? false);
  const [guestMode, setGuestMode] = useState(draft?.guestMode || "standard");
  const [sessionUiMode, setSessionUiMode] = useState(draft?.sessionUiMode || "flow");
  const [reflectionEnabled, setReflectionEnabled] = useState(draft?.reflectionEnabled ?? false);
  const [reflectionMode, setReflectionMode] = useState(draft?.reflectionMode || "standard");
  const [reflectionVisibility, setReflectionVisibility] = useState(draft?.reflectionVisibility || "named");
  const [videoLink, setVideoLink] = useState(draft?.videoLink || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(draft?.advancedOpen ?? false);
  const [myCommunities, setMyCommunities] = useState<any[]>([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<Set<string>>(new Set());
  const [draftSaved, setDraftSaved] = useState(!!draft);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formDirtyRef = useRef(!!draft);

  const defaultFormData: TastingDraft = useRef({
    title: "", date: new Date().toISOString().split("T")[0], time: "", location: "",
    description: "", blindMode: false, revealOrder: "classic",
    customRevealSteps: REVEAL_PRESETS_MAP.classic, ratingScale: 100,
    guidedMode: false, guestMode: "standard", sessionUiMode: "flow",
    reflectionEnabled: false, reflectionMode: "standard", reflectionVisibility: "named",
    videoLink: "", advancedOpen: false,
  }).current;

  const formData: TastingDraft = {
    title, date, time, location, description, blindMode, revealOrder,
    customRevealSteps, ratingScale, guidedMode, guestMode, sessionUiMode,
    reflectionEnabled, reflectionMode, reflectionVisibility, videoLink, advancedOpen,
  };

  useEffect(() => {
    const isDirty = JSON.stringify(formData) !== JSON.stringify(defaultFormData);
    formDirtyRef.current = isDirty;

    if (!isDirty) {
      clearDraft();
      return;
    }

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
        setDraftSaved(true);
        if (draftIndicatorRef.current) clearTimeout(draftIndicatorRef.current);
        draftIndicatorRef.current = setTimeout(() => setDraftSaved(false), 2000);
      } catch {}
    }, 800);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [title, date, time, location, description, blindMode, revealOrder,
      customRevealSteps, ratingScale, guidedMode, guestMode, sessionUiMode,
      reflectionEnabled, reflectionMode, reflectionVisibility, videoLink, advancedOpen]);

  useEffect(() => {
    return () => {
      if (draftIndicatorRef.current) clearTimeout(draftIndicatorRef.current);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (currentParticipant?.id) {
      fetch("/api/communities/mine", { headers: { "x-participant-id": currentParticipant.id } })
        .then(r => r.ok ? r.json() : { communities: [] })
        .then(d => setMyCommunities(d.communities || []))
        .catch(() => {});
    }
  }, [currentParticipant?.id]);

  const toggleCommunity = (id: string) => {
    setSelectedCommunityIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleCreate = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!currentParticipant) { setError("Please sign in to create a tasting"); return; }
    setSubmitting(true);
    setError("");
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const result = await tastingApi.create({
        title: title.trim(),
        date,
        time: time.trim() || null,
        location: location.trim() || "",
        description: description.trim() || "",
        hostId: currentParticipant.id,
        code,
        blindMode,
        revealOrder: blindMode && revealOrder !== "classic" ? JSON.stringify(revealOrder === "custom" ? customRevealSteps : (REVEAL_PRESETS_MAP[revealOrder] || REVEAL_PRESETS_MAP.classic)) : null,
        ratingScale,
        guidedMode,
        guestMode,
        sessionUiMode: sessionUiMode || null,
        reflectionEnabled,
        reflectionMode,
        reflectionVisibility,
        videoLink: videoLink.trim() || null,
        status: "draft",
        visibility: selectedCommunityIds.size > 0 ? "group" : undefined,
        targetCommunityIds: selectedCommunityIds.size > 0 ? JSON.stringify(Array.from(selectedCommunityIds)) : null,
      });
      if (result?.id) {
        clearDraft();
        formDirtyRef.current = false;
        navigate(`/labs/host/${result.id}`);
      }
    } catch (err: any) {
      console.error("Failed to create tasting:", err);
      setError(err.message || "Failed to create tasting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="labs-page labs-fade-in" style={{ paddingBottom: 0 }}>
      <div>
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-create-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Zurück
      </button>
      <h1
        className="labs-h2 mb-2"
        style={{ color: "var(--labs-text)" }}
        data-testid="labs-host-title"
      >
        Host a Tasting
      </h1>
      <p className="text-sm mb-2" style={{ color: "var(--labs-text-secondary)" }}>
        Create a new tasting session for your group
      </p>
      <div
        className="text-xs flex items-center gap-1 transition-all duration-300"
        style={{
          color: "var(--labs-text-muted)",
          opacity: draftSaved ? 1 : 0,
          height: draftSaved ? 20 : 0,
          marginBottom: draftSaved ? 24 : 0,
          overflow: "hidden",
        }}
        data-testid="labs-draft-saved-indicator"
      >
        <Check className="w-3 h-3" />
        Draft saved
      </div>

      <div className="space-y-5">
        <div>
          <label className="labs-section-label" htmlFor="tasting-title">{t("m2.host.titleLabel")} *</label>
          <input
            id="tasting-title"
            className="labs-input"
            placeholder={t("labs.host.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            data-testid="labs-host-input-title"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="labs-section-label" htmlFor="tasting-date">{t("m2.host.dateLabel")}</label>
            <input
              id="tasting-date"
              type="date"
              className="labs-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="labs-host-input-date"
            />
          </div>
          <div>
            <label className="labs-section-label" htmlFor="tasting-time">{t("labs.host.timeLabel")}</label>
            <input
              id="tasting-time"
              type="time"
              className="labs-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              data-testid="labs-host-input-time"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="labs-section-label" htmlFor="tasting-location">{t("labs.host.locationPlaceholder")}</label>
            <input
              id="tasting-location"
              className="labs-input"
              placeholder={t("m2.host.optional", "Optional")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              data-testid="labs-host-input-location"
            />
          </div>
        </div>

        <div>
          <label className="labs-section-label" htmlFor="tasting-description">
            <FileText className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
            Description
          </label>
          <textarea
            id="tasting-description"
            className="labs-input"
            placeholder={t("labs.host.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ resize: "vertical", minHeight: 48 }}
            data-testid="labs-host-input-description"
          />
        </div>

        <LabsToggle
          checked={blindMode}
          onChange={setBlindMode}
          icon={<EyeOff className="w-5 h-5" style={{ color: blindMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
          label={t("labs.host.blindTasting")}
          description={t("labs.host.blindTastingDesc")}
          testId="labs-host-toggle-blind"
        />

        {blindMode && (
          <div>
            <label className="labs-section-label">
              <Eye className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
              Reveal Order
            </label>
            <LabsSegmentedSelect
              value={revealOrder}
              options={[
                { value: "classic", label: t("labs.host.revealClassic"), desc: t("labs.host.revealClassicDesc") },
                { value: "photo-first", label: t("labs.host.revealPhotoFirst"), desc: t("labs.host.revealPhotoFirstDesc") },
                { value: "details-first", label: t("labs.host.revealDetails"), desc: t("labs.host.revealDetailsDesc") },
                { value: "one-by-one", label: t("labs.host.revealOneByOne"), desc: t("labs.host.revealOneByOneDesc") },
                { value: "custom", label: t("labs.host.revealCustom"), desc: t("labs.host.revealCustomDesc") },
              ]}
              onChange={(val: string | number) => {
                const v = String(val);
                setRevealOrder(v);
                if (v !== "custom" && REVEAL_PRESETS_MAP[v]) {
                  setCustomRevealSteps(REVEAL_PRESETS_MAP[v]);
                }
                const stepsCount = v === "custom" ? customRevealSteps.length : (REVEAL_PRESETS_MAP[v]?.length ?? 3);
                if (stepsCount > 4 && sessionUiMode === "flow") {
                  setSessionUiMode("focus");
                }
              }}
            />
            {revealOrder === "custom" && (
              <CustomRevealEditor
                steps={customRevealSteps}
                onChange={(newSteps) => {
                  setCustomRevealSteps(newSteps);
                  if (newSteps.length > 4 && sessionUiMode === "flow") {
                    setSessionUiMode("focus");
                  }
                }}
              />
            )}
          </div>
        )}

        <div>
          <label className="labs-section-label">
            <Gauge className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
            {t("labs.host.ratingScale")}
          </label>
          <LabsSegmentedSelect
            value={ratingScale}
            options={[
              { value: 5, label: "5", desc: t("labs.host.simple") },
              { value: 10, label: "10", desc: t("labs.host.classic") },
              { value: 20, label: "20", desc: t("labs.host.detailed") },
              { value: 100, label: "100", desc: t("labs.host.pro") },
            ]}
            onChange={setRatingScale}
          />
        </div>

        {myCommunities.length > 0 && (
          <div>
            <label className="labs-section-label flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
              {t("labs.host.targetCommunities")}
            </label>
            <p className="text-[11px] mb-2" style={{ color: "var(--labs-text-muted)" }}>
              {t("labs.host.targetCommunitiesDesc")}
            </p>
            <div className="labs-card" style={{ padding: "var(--labs-space-sm) var(--labs-space-md)" }}>
              {myCommunities.map((c: any) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }} data-testid={`tasting-community-${c.id}`}>
                  <input type="checkbox" checked={selectedCommunityIds.has(c.id)} onChange={() => toggleCommunity(c.id)} data-testid={`checkbox-tasting-community-${c.id}`} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text)" }}>{c.name}</span>
                  {c.memberCount != null && <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>({c.memberCount})</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="labs-card overflow-hidden" style={{ border: "1px solid var(--labs-border)" }}>
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between"
            style={{
              padding: "14px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--labs-text)",
              fontSize: 14,
              fontWeight: 600,
            }}
            data-testid="labs-host-toggle-advanced"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
              Advanced Options
            </span>
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{
                color: "var(--labs-text-muted)",
                transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {advancedOpen && (
            <div style={{ padding: "0 16px 16px" }} className="space-y-5">
              <LabsToggle
                checked={guidedMode}
                onChange={(v: boolean) => {
                  setGuidedMode(v);
                  if (v && sessionUiMode === "flow") {
                    setSessionUiMode("focus");
                  }
                }}
                icon={<Compass className="w-5 h-5" style={{ color: guidedMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
                label={t("labs.host.hostControlsPace")}
                description={t("labs.host.hostControlsPaceDesc")}
                testId="labs-host-toggle-guided"
              />

              <div>
                <label className="labs-section-label">
                  <Globe className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                  {t("labs.host.howGuestsJoin")}
                </label>
                <p className="text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>
                  {t("labs.host.guestAccountDesc")}
                </p>
                <LabsSegmentedSelect
                  value={guestMode}
                  options={[
                    { value: "standard", label: t("m2.host.guestStandard"), desc: t("m2.host.guestStandardDesc") },
                    { value: "ultra", label: t("m2.host.guestUltra"), desc: t("m2.host.guestUltraDesc") },
                  ]}
                  onChange={setGuestMode}
                />
              </div>

              <div>
                <label className="labs-section-label">
                  <Sliders className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                  {t("labs.host.tastingExperience")}
                </label>
                <p className="text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>
                  {t("labs.host.expFreeDesc")}
                </p>
                <LabsSegmentedSelect
                  value={sessionUiMode}
                  options={[
                    { value: "flow", label: t("labs.host.expFree"), desc: guidedMode ? t("labs.host.expFreeDisabled") : t("labs.host.expFreeDesc"), disabled: guidedMode },
                    { value: "focus", label: t("labs.host.expOneAtATime"), desc: t("labs.host.expOneAtATimeDesc") },
                    { value: "journal", label: t("labs.host.expDram"), desc: t("labs.host.expDramDesc") },
                  ]}
                  onChange={(val: string | number) => {
                    const v = String(val);
                    setSessionUiMode(v);
                    if (v === "flow" && (revealOrder === "one-by-one" || (revealOrder === "custom" && customRevealSteps.length > 4))) {
                      setRevealOrder("classic");
                      setCustomRevealSteps(REVEAL_PRESETS_MAP.classic);
                    }
                  }}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 16 }}>
                <label className="labs-section-label">
                  <MessageCircle className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                  {t("labs.host.groupDiscussion")}
                </label>
                <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
                  {t("labs.host.enableDiscussionDesc")}
                </p>
                <LabsToggle
                  checked={reflectionEnabled}
                  onChange={setReflectionEnabled}
                  icon={<MessageCircle className="w-5 h-5" style={{ color: reflectionEnabled ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
                  label={t("labs.host.enableDiscussion")}
                  description={t("labs.host.enableDiscussionDesc")}
                  testId="labs-host-toggle-reflection"
                />
                {reflectionEnabled && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="labs-section-label" style={{ fontSize: 11 }}>{t("labs.host.discussionFormat")}</label>
                      <LabsSegmentedSelect
                        value={reflectionMode}
                        options={[
                          { value: "standard", label: t("labs.host.discussionStandard"), desc: t("labs.host.discussionStandardDesc") },
                          { value: "custom", label: t("labs.host.discussionCustom"), desc: t("labs.host.discussionCustomDesc") },
                        ]}
                        onChange={setReflectionMode}
                      />
                    </div>
                    <div>
                      <label className="labs-section-label" style={{ fontSize: 11 }}>{t("labs.host.showNames")}</label>
                      <LabsSegmentedSelect
                        value={reflectionVisibility}
                        options={[
                          { value: "named", label: t("labs.host.namesNamed"), desc: t("labs.host.namesNamedDesc") },
                          { value: "anonymous", label: t("labs.host.namesAnonymous"), desc: t("labs.host.namesAnonymousDesc") },
                          { value: "optional", label: t("labs.host.namesOptional"), desc: t("labs.host.namesOptionalDesc") },
                        ]}
                        onChange={setReflectionVisibility}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="labs-section-label">
                  <Video className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                  Video Call Link
                </label>
                <input
                  type="url"
                  className="labs-input"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder={t("m2.host.videoLinkPlaceholder")}
                  data-testid="labs-host-input-video"
                />
                <p className="text-xs mt-1" style={{ color: "var(--labs-text-secondary)" }}>
                  {t("m2.host.videoLinkDesc")}
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            className="rounded-lg text-sm"
            style={{
              padding: "10px 14px",
              color: "var(--labs-danger, #e74c3c)",
              background: "rgba(231, 76, 60, 0.1)",
              border: "1px solid rgba(231, 76, 60, 0.2)",
            }}
            data-testid="labs-host-create-error"
          >
            {error}
          </div>
        )}

        {!currentParticipant && (
          <div
            className="text-sm p-3 rounded-lg flex items-center gap-2"
            style={{
              background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)",
              color: "var(--labs-accent)",
              cursor: "pointer",
            }}
            data-testid="labs-host-signin-hint"
            onClick={() => openAuthDialog("signin")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openAuthDialog("signin"); }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Please sign in to create a tasting
          </div>
        )}
      </div>
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 20px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          background: "linear-gradient(to top, var(--labs-bg) 70%, transparent)",
          zIndex: 10,
        }}
      >
        <button
          className="labs-btn-primary w-full flex items-center justify-center gap-2"
          style={{ maxWidth: "42rem", margin: "0 auto" }}
          onClick={handleCreate}
          disabled={!title.trim() || submitting || !currentParticipant}
          data-testid="labs-host-create-btn"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {submitting ? t("labs.host.savingEllipsis") : t("m2.host.createAndAddWhiskies", "Create & Add Whiskies")}
        </button>
      </div>
    </div>
  );
}

function ParticipantStatusSection({
  participants,
  ratings,
  whiskies,
  whiskyCount,
  tasting,
}: {
  participants: any[];
  ratings: any[];
  whiskies: any[];
  whiskyCount: number;
  tasting?: any;
}) {
  const { t } = useTranslation();
  const [expandedWhisky, setExpandedWhisky] = useState<string | null>(null);

  const sortedParticipants = [...(participants || [])].sort((a: any, b: any) => {
    const aIsHost = a.participantId === tasting?.hostId ? -1 : 0;
    const bIsHost = b.participantId === tasting?.hostId ? -1 : 0;
    return aIsHost - bIsHost;
  });

  const grouped = sortedParticipants.reduce(
    (acc: { done: any[]; progress: any[]; none: any[] }, p: any) => {
      const count = (ratings || []).filter((r: any) => r.participantId === p.participantId).length;
      if (whiskyCount > 0 && count >= whiskyCount) acc.done.push({ ...p, ratedCount: count });
      else if (count > 0) acc.progress.push({ ...p, ratedCount: count });
      else acc.none.push({ ...p, ratedCount: 0 });
      return acc;
    },
    { done: [], progress: [], none: [] },
  );

  const statusGroups = [
    {
      key: "done",
      label: t("labs.host.ratedAll"),
      icon: CheckCircle2,
      color: "var(--labs-success)",
      bg: "var(--labs-success-muted)",
      items: grouped.done,
    },
    {
      key: "progress",
      label: t("labs.host.inProgress"),
      icon: Clock,
      color: "var(--labs-accent)",
      bg: "var(--labs-accent-muted)",
      items: grouped.progress,
    },
    {
      key: "none",
      label: t("labs.host.notStarted"),
      icon: CircleDashed,
      color: "var(--labs-text-muted)",
      bg: "var(--labs-surface)",
      items: grouped.none,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h2 className="labs-section-label">Participants ({(participants || []).length})</h2>
        <div className="space-y-3">
          {statusGroups.map((group) =>
            group.items.length > 0 ? (
              <div key={group.key} className="labs-card overflow-hidden">
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ borderBottom: `1px solid var(--labs-border-subtle)` }}
                >
                  <group.icon className="w-4 h-4" style={{ color: group.color }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: group.color }}>
                    {group.label}
                  </span>
                  <span
                    className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: group.bg, color: group.color }}
                  >
                    {group.items.length}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--labs-border-subtle)" }}>
                  {group.items.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3"
                      data-testid={`labs-host-participant-${p.id}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                      >
                        {stripGuestSuffix((p.participant?.name || p.name || "?") as string).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{stripGuestSuffix((p.participant?.name || p.name || "Anonymous") as string)}</p>
                        {tasting?.hostId && p.participantId === tasting.hostId && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{t("ui.host")}</span>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--labs-text-muted)" }}>
                        {p.ratedCount}/{whiskyCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>

      {whiskyCount > 0 && (participants || []).length > 0 && (
        <div>
          <h2 className="labs-section-label">{t("labs.host.perWhiskyCompletion")}</h2>
          <div className="space-y-2">
            {(whiskies || []).map((w: any, i: number) => {
              const whiskyRatings = (ratings || []).filter((r: any) => r.whiskyId === w.id);
              const ratedIds = new Set(whiskyRatings.map((r: any) => r.participantId));
              const isExpanded = expandedWhisky === w.id;
              return (
                <div key={w.id} className="labs-card overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedWhisky(isExpanded ? null : w.id)}
                    style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}
                    data-testid={`labs-host-whisky-completion-${w.id}`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium truncate flex-1 min-w-0">
                      {w.name || `Whisky ${i + 1}`}
                    </span>
                    <span className="text-xs flex-shrink-0 mr-1" style={{ color: "var(--labs-text-muted)" }}>
                      {ratedIds.size}/{(participants || []).length}
                    </span>
                    <div
                      className="w-16 h-1.5 rounded-full overflow-hidden flex-shrink-0"
                      style={{ background: "var(--labs-border)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(participants || []).length > 0 ? (ratedIds.size / (participants || []).length) * 100 : 0}%`,
                          background: ratedIds.size === (participants || []).length ? "var(--labs-success)" : "var(--labs-accent)",
                        }}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                    ) : (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                    )}
                  </button>
                  {isExpanded && (
                    <div
                      className="px-4 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5"
                      style={{ borderTop: `1px solid var(--labs-border-subtle)` }}
                    >
                      {(participants || []).map((p: any) => {
                        const hasRated = ratedIds.has(p.participantId);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 py-1"
                            data-testid={`labs-host-completion-${w.id}-${p.id}`}
                          >
                            {hasRated ? (
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-success)" }} />
                            ) : (
                              <CircleDashed className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                            )}
                            <span
                              className="text-xs truncate"
                              style={{ color: hasRated ? "var(--labs-text-secondary)" : "var(--labs-text-muted)" }}
                            >
                              {stripGuestSuffix((p.participant?.name || p.name || t("labs.host.anonymous")) as string)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GuidedTastingEngine({
  tasting,
  whiskies,
  participants,
  ratings,
  currentParticipant,
  queryClient,
  tastingId,
}: {
  tasting: any;
  whiskies: any[];
  participants: any[];
  ratings: any[];
  currentParticipant: any;
  queryClient: any;
  tastingId: string;
}) {
  const { t } = useTranslation();
  const whiskyList = whiskies || [];
  const participantList = participants || [];
  const ratingList = ratings || [];
  const whiskyCount = whiskyList.length;
  const guidedIndex = tasting.guidedWhiskyIndex ?? -1;
  const revealStep = tasting.guidedRevealStep ?? 0;
  const isLobby = guidedIndex === -1;
  const isCompleted = guidedIndex >= whiskyCount && whiskyCount > 0;
  const activeWhisky = !isLobby && !isCompleted && whiskyList[guidedIndex] ? whiskyList[guidedIndex] : null;

  const GUIDED_FIELD_LABELS: Record<string, string> = {
    name: t("labs.host.fieldName"), distillery: t("labs.host.fieldDistillery"), age: t("labs.host.fieldAge"), abv: t("labs.host.fieldAbv"),
    region: t("labs.host.fieldRegion"), country: t("labs.host.fieldCountry"), category: t("labs.host.fieldCategory"),
    caskInfluence: t("labs.host.fieldCask"), peatLevel: t("labs.host.fieldPeat"), image: t("labs.host.fieldImage"),
    bottler: t("labs.host.fieldBottler"), vintage: t("labs.host.fieldVintage"), distilledYear: t("labs.host.fieldDistilled"), bottledYear: t("labs.host.fieldBottled"),
    hostNotes: t("labs.host.fieldNotes"), hostSummary: t("labs.host.fieldSummary"), price: t("labs.host.fieldPrice"),
  };
  let parsedRevealOrder = REVEAL_DEFAULT_ORDER;
  try {
    if (tasting.revealOrder) {
      const parsed = JSON.parse(tasting.revealOrder);
      if (Array.isArray(parsed) && parsed.length > 0) parsedRevealOrder = parsed;
    }
  } catch {}
  const revealLabels = ["Blind", ...parsedRevealOrder.map((group: string[]) => {
    const labels = group.map((f: string) => GUIDED_FIELD_LABELS[f] || f);
    if (labels.length <= 2) return labels.join(" & ");
    return labels.slice(0, 2).join(" & ") + " +";
  })];
  const maxRevealStep = parsedRevealOrder.length;

  const [engineError, setEngineError] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] });
  };

  const handleMutationError = (err: any) => {
    const msg = err?.message || "Action failed";
    setEngineError(msg);
    setTimeout(() => setEngineError(null), 5000);
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      await guidedApi.updateMode(tastingId, currentParticipant.id, {
        guidedMode: true,
        guidedWhiskyIndex: 0,
        guidedRevealStep: 0,
      });
      if (tasting.status === "draft") {
        await tastingApi.updateStatus(tastingId, "open", undefined, currentParticipant.id);
      }
    },
    onSuccess: () => { setEngineError(null); invalidateAll(); },
    onError: handleMutationError,
  });

  const advanceMutation = useMutation({
    mutationFn: () => guidedApi.advance(tastingId, currentParticipant.id),
    onSuccess: () => { setEngineError(null); invalidateAll(); },
    onError: handleMutationError,
  });

  const endMutation = useMutation({
    mutationFn: () => tastingApi.updateStatus(tastingId, "closed", undefined, currentParticipant.id),
    onSuccess: () => { setEngineError(null); invalidateAll(); },
    onError: handleMutationError,
  });

  const goToMutation = useMutation({
    mutationFn: ({ idx, step }: { idx: number; step?: number }) =>
      guidedApi.goTo(tastingId, currentParticipant.id, idx, step),
    onSuccess: () => { setEngineError(null); invalidateAll(); },
    onError: handleMutationError,
  });

  const anyPending = startMutation.isPending || advanceMutation.isPending || endMutation.isPending || goToMutation.isPending;

  const activeWhiskyRatings = activeWhisky
    ? ratingList.filter((r: any) => r.whiskyId === activeWhisky.id)
    : [];
  const ratedParticipantIds = new Set(activeWhiskyRatings.map((r: any) => r.participantId));

  let stateLabel = "LOBBY";
  let stateBg = "var(--labs-info-muted)";
  let stateColor = "var(--labs-info)";
  if (isCompleted) {
    stateLabel = "COMPLETED";
    stateBg = "var(--labs-success-muted)";
    stateColor = "var(--labs-success)";
  } else if (!isLobby) {
    stateLabel = `DRAM ${guidedIndex + 1} of ${whiskyCount}`;
    stateBg = "var(--labs-accent-muted)";
    stateColor = "var(--labs-accent)";
  }

  return (
    <div className="mb-6 space-y-4" data-testid="guided-engine">
      <div
        className="labs-card p-4 flex items-center justify-between"
        data-testid="guided-state-bar"
      >
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5" style={{ color: stateColor }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>
              Guided Mode
            </p>
            <p className="text-base font-bold" style={{ color: stateColor }}>
              {stateLabel}
            </p>
          </div>
        </div>
        <span
          className="labs-badge"
          style={{ background: stateBg, color: stateColor }}
          data-testid="guided-state-badge"
        >
          {isLobby ? t("labs.host.waiting") : isCompleted ? t("labs.host.done") : `${t("labs.host.revealLabel", { label: revealLabels[revealStep] || revealStep })}`}
        </span>
      </div>

      {whiskyCount > 0 && (
        <div className="labs-card p-4" data-testid="guided-progress">
          <p className="labs-section-label">{t("labs.host.progress")}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {whiskyList.map((w: any, i: number) => {
              let dotBg = "var(--labs-border)";
              let dotColor = "var(--labs-text-muted)";
              let dotBorder = "transparent";
              if (i < guidedIndex) {
                dotBg = "var(--labs-success)";
                dotColor = "var(--labs-bg)";
              } else if (i === guidedIndex && !isCompleted) {
                dotBg = "var(--labs-accent)";
                dotColor = "var(--labs-bg)";
                dotBorder = "var(--labs-accent-hover)";
              }
              return (
                <button
                  key={w.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: dotBg,
                    color: dotColor,
                    border: `2px solid ${dotBorder}`,
                    cursor: !isLobby && !isCompleted ? "pointer" : "default",
                    opacity: 1,
                  }}
                  title={w.name || `Whisky ${i + 1}`}
                  onClick={() => {
                    if (!isLobby && !isCompleted && i !== guidedIndex) {
                      goToMutation.mutate({ idx: i, step: 0 });
                    }
                  }}
                  disabled={isLobby || isCompleted || anyPending}
                  data-testid={`guided-dot-${i}`}
                >
                  {i < guidedIndex ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    i + 1
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="labs-card p-4" data-testid="guided-controls">
        <p className="labs-section-label">{t("labs.host.controls")}</p>
        <div className="flex flex-wrap gap-2">
          {isLobby && (
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={() => startMutation.mutate()}
              disabled={anyPending || whiskyCount === 0}
              data-testid="guided-start"
            >
              {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Tasting
            </button>
          )}
          {!isLobby && !isCompleted && revealStep < maxRevealStep && (
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={() => advanceMutation.mutate()}
              disabled={anyPending}
              data-testid="guided-reveal"
            >
              {advanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {revealLabels[revealStep + 1] ? t("labs.host.revealLabel", { label: revealLabels[revealStep + 1] }) : t("labs.host.revealNext")}
            </button>
          )}
          {!isLobby && !isCompleted && revealStep >= maxRevealStep && guidedIndex < whiskyCount - 1 && (
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={() => advanceMutation.mutate()}
              disabled={anyPending}
              data-testid="guided-next"
            >
              {advanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
              Next Dram
            </button>
          )}
          {!isLobby && !isCompleted && revealStep >= maxRevealStep && guidedIndex === whiskyCount - 1 && (
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={() => advanceMutation.mutate()}
              disabled={anyPending}
              data-testid="guided-finish"
            >
              {advanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finish Last Dram
            </button>
          )}
          {!isLobby && tasting.status === "open" && (
            <button
              className="labs-btn-secondary flex items-center gap-2"
              onClick={() => endMutation.mutate()}
              disabled={anyPending}
              data-testid="guided-end"
            >
              {endMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
              End Tasting
            </button>
          )}
        </div>
      </div>

      {engineError && (
        <div
          className="labs-card p-3 flex items-center gap-2"
          style={{ background: "var(--labs-danger-muted, rgba(239,68,68,0.1))", border: "1px solid var(--labs-danger, #ef4444)" }}
          data-testid="guided-engine-error"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-danger, #ef4444)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--labs-danger, #ef4444)" }}>
            {engineError}
          </span>
        </div>
      )}

      {activeWhisky && (
        <div className="labs-card p-4" data-testid="guided-current-dram">
          <p className="labs-section-label">{t("labs.host.currentDram")}</p>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
            >
              {String.fromCharCode(65 + guidedIndex)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                {revealStep >= 1 ? (activeWhisky.name || `Whisky ${guidedIndex + 1}`) : `Dram ${String.fromCharCode(65 + guidedIndex)} (Blind)`}
              </p>
              {revealStep >= 2 && (
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                  {[activeWhisky.distillery, activeWhisky.age ? `${activeWhisky.age}y` : null, activeWhisky.abv ? `${activeWhisky.abv}%` : null]
                    .filter(Boolean)
                    .join(" · ") || t("labs.host.noAdditionalDetails")}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold" style={{ color: ratedParticipantIds.size === participantList.length && participantList.length > 0 ? "var(--labs-success)" : "var(--labs-accent)" }}>
                {ratedParticipantIds.size}/{participantList.length}
              </p>
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("ui.rated")}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {revealLabels.map((label, idx) => (
              <div
                key={label}
                className="flex-1 h-1.5 rounded-full"
                style={{
                  background: idx <= revealStep ? "var(--labs-accent)" : "var(--labs-border)",
                  transition: "background 300ms ease",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {revealLabels.map((label, idx) => (
              <span key={label} className="text-[11px]" style={{ color: idx <= revealStep ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeWhisky && participantList.length > 0 && (
        <div className="labs-card p-4" data-testid="guided-participant-grid">
          <p className="labs-section-label">Participant Status — Dram {String.fromCharCode(65 + guidedIndex)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...participantList].sort((a: any, b: any) => {
              const aIsHost = a.participantId === tasting?.hostId ? -1 : 0;
              const bIsHost = b.participantId === tasting?.hostId ? -1 : 0;
              return aIsHost - bIsHost;
            }).map((p: any, idx: number) => {
              const hasRated = ratedParticipantIds.has(p.participantId);
              const isHost = p.participantId === tasting?.hostId;
              const displayName = stripGuestSuffix((p.participant?.name || p.name || "Anonymous") as string);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{
                    background: hasRated ? "var(--labs-success-muted)" : "var(--labs-surface)",
                    border: `1px solid ${hasRated ? "var(--labs-success)" : "var(--labs-border-subtle)"}`,
                    opacity: hasRated ? 1 : 0.7,
                  }}
                  data-testid={`guided-participant-${p.id}`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{
                      background: hasRated ? "var(--labs-success)" : "var(--labs-border)",
                      color: hasRated ? "var(--labs-bg)" : "var(--labs-text-muted)",
                    }}
                  >
                    {hasRated ? <Check className="w-3.5 h-3.5" /> : displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>
                        {displayName}
                      </p>
                      {isHost && (
                        <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{t("ui.host")}</span>
                      )}
                    </div>
                    <p className="text-[11px]" style={{ color: hasRated ? "var(--labs-success)" : "var(--labs-text-muted)" }}>
                      {hasRated ? "SUBMITTED" : "NOT STARTED"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TastingSetupSection({
  tasting,
  tastingId,
  pid,
  queryClient,
}: {
  tasting: Record<string, unknown>;
  tastingId: string;
  pid: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { t } = useTranslation();
  const [ratingPrompt, setRatingPrompt] = useState((tasting.ratingPrompt as string) || "");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [videoLinkLocal, setVideoLinkLocal] = useState((tasting.videoLink as string) || "");
  const [savingVideo, setSavingVideo] = useState(false);
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [forceCustomReveal, setForceCustomReveal] = useState(false);

  const isDraft = tasting.status === "draft";

  const patchDetails = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/tastings/${tastingId}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, ...body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setSaveStatus(err.message || t("labs.host.saveFailed"));
      setTimeout(() => setSaveStatus(null), 3000);
      throw new Error(err.message || t("labs.host.saveFailed"));
    }
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    setSaveStatus(t("labs.host.savedStatus"));
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleToggle = async (field: string, currentValue: boolean) => {
    try { await patchDetails({ [field]: !currentValue }); } catch {}
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try { await patchDetails({ ratingPrompt: ratingPrompt.trim() || null }); } catch {}
    setSavingPrompt(false);
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try { await patchDetails({ videoLink: videoLinkLocal.trim() || null }); } catch {}
    setSavingVideo(false);
  };

  const handleChangeScale = async (scale: number) => {
    try { await patchDetails({ ratingScale: scale }); } catch {}
  };

  const handleChangeGuestMode = async (mode: string) => {
    try { await patchDetails({ guestMode: mode }); } catch {}
  };

  const handleChangeSessionUi = async (mode: string) => {
    const patch: Record<string, unknown> = { sessionUiMode: mode || null };
    if (mode === "flow" && tasting.blindMode) {
      try {
        const parsed = JSON.parse(tasting.revealOrder as string || "null");
        if (Array.isArray(parsed) && parsed.length > 4) {
          patch.revealOrder = null;
        }
      } catch {}
    }
    try { await patchDetails(patch); } catch {}
  };

  const handleToggleReflection = async () => {
    try { await patchDetails({ reflectionEnabled: !tasting.reflectionEnabled }); } catch {}
  };

  const handleChangeReflectionMode = async (mode: string) => {
    try { await patchDetails({ reflectionMode: mode }); } catch {}
  };

  const handleChangeReflectionVis = async (vis: string) => {
    try { await patchDetails({ reflectionVisibility: vis }); } catch {}
  };

  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const handleCoverUpload = async (file: File) => {
    setCoverUploadError(null);
    const previewUrl = URL.createObjectURL(file);
    setLocalCoverUrl(previewUrl);
    try {
      await tastingApi.uploadCoverImage(tastingId, file, pid);
      URL.revokeObjectURL(previewUrl);
      setLocalCoverUrl(null);
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    } catch (e: any) {
      setLocalCoverUrl(null);
      const msg = e?.message || "Upload failed";
      setCoverUploadError(msg);
      setSaveStatus(msg);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  return (
    <div data-testid="labs-tasting-setup-section">
      {saveStatus && (
        <div className="flex items-center gap-2 mb-3" style={{ fontSize: 12, color: saveStatus === t("labs.host.savedStatus") ? "var(--labs-success)" : "var(--labs-danger, #e74c3c)" }}>
          <Check className="w-3 h-3" />
          {saveStatus}
        </div>
      )}

      <div className="labs-card p-4 space-y-4">
          <div>
            <p className="labs-section-label">{t("m2.host.sessionSettingsLabel", "Tasting Settings")}</p>
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Gauge className="w-3 h-3" />
              {t("labs.host.ratingScale")}
              {!isDraft && <Lock className="w-2.5 h-2.5" style={{ color: "var(--labs-text-muted)" }} />}
            </label>
            {isDraft ? (
              <LabsSegmentedSelect
                value={(tasting.ratingScale as number) ?? 100}
                options={[
                  { value: 5, label: "5", desc: t("labs.host.simple") },
                  { value: 10, label: "10", desc: t("labs.host.classic") },
                  { value: 20, label: "20", desc: t("labs.host.detailed") },
                  { value: 100, label: "100", desc: t("labs.host.pro") },
                ]}
                onChange={handleChangeScale}
              />
            ) : (
              <div className="text-sm labs-card p-3" style={{ color: "var(--labs-text)" }}>
                {t("labs.host.pointScale", { scale: (tasting.ratingScale as number) ?? 100 })}
                <span className="text-xs ml-2" style={{ color: "var(--labs-text-muted)" }}>{t("labs.host.lockedWhileActive")}</span>
              </div>
            )}
          </div>

          <LabsToggle
            checked={!!tasting.blindMode}
            onChange={() => handleToggle("blindMode", !!tasting.blindMode)}
            icon={<EyeOff className="w-5 h-5" style={{ color: tasting.blindMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label={t("labs.host.blindTasting")}
            description={t("labs.host.blindTastingDesc")}
            testId="labs-settings-toggle-blind"
          />

          {tasting.blindMode && (() => {
            let detectedKey = "classic";
            let currentSteps = REVEAL_PRESETS_MAP.classic;
            try {
              if (tasting.revealOrder) {
                currentSteps = JSON.parse(tasting.revealOrder as string);
                detectedKey = detectPresetKey(currentSteps);
              }
            } catch {}
            const activeKey = forceCustomReveal ? "custom" : detectedKey;
            return (
              <div>
                <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
                  <Eye className="w-3 h-3" />
                  {t("labs.host.revealOrder")}
                </label>
                <LabsSegmentedSelect
                  value={activeKey}
                  options={[
                    { value: "classic", label: t("labs.host.revealClassic"), desc: t("labs.host.revealClassicDesc") },
                    { value: "photo-first", label: t("labs.host.revealPhotoFirst"), desc: t("labs.host.revealPhotoFirstDesc") },
                    { value: "details-first", label: t("labs.host.revealDetails"), desc: t("labs.host.revealDetailsDesc") },
                    { value: "one-by-one", label: t("labs.host.revealOneByOne"), desc: t("labs.host.revealOneByOneDesc") },
                    { value: "custom", label: t("labs.host.revealCustom"), desc: t("labs.host.revealCustomDesc") },
                  ]}
                  onChange={(val: string | number) => {
                    const key = String(val);
                    if (key === "custom") {
                      setForceCustomReveal(true);
                    } else {
                      setForceCustomReveal(false);
                      const patch: Record<string, unknown> = { revealOrder: key === "classic" ? null : JSON.stringify(REVEAL_PRESETS_MAP[key] || REVEAL_PRESETS_MAP.classic) };
                      if (key === "one-by-one" && (tasting.sessionUiMode as string || "flow") === "flow") {
                        patch.sessionUiMode = "focus";
                      }
                      patchDetails(patch);
                    }
                  }}
                />
                {activeKey === "custom" && (
                  <CustomRevealEditor
                    steps={currentSteps}
                    onChange={(newSteps) => {
                      const patch: Record<string, unknown> = { revealOrder: JSON.stringify(newSteps) };
                      if (newSteps.length > 4 && (tasting.sessionUiMode as string || "flow") === "flow") {
                        patch.sessionUiMode = "focus";
                      }
                      patchDetails(patch);
                    }}
                  />
                )}
              </div>
            );
          })()}

          <LabsToggle
            checked={!!tasting.guidedMode}
            onChange={async () => {
              const newGuided = !tasting.guidedMode;
              const patch: Record<string, unknown> = { guidedMode: newGuided };
              if (newGuided && ((tasting.sessionUiMode as string) || "flow") === "flow") {
                patch.sessionUiMode = "focus";
              }
              try { await patchDetails(patch); } catch {}
            }}
            icon={<Compass className="w-5 h-5" style={{ color: tasting.guidedMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label={t("labs.host.hostControlsPace")}
            description={t("labs.host.hostControlsPaceDesc")}
            testId="labs-settings-toggle-guided"
          />

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Sliders className="w-3 h-3" />
              {t("labs.host.tastingExperience")}
            </label>
            <LabsSegmentedSelect
              value={(tasting.sessionUiMode as string) || "flow"}
              options={[
                { value: "flow", label: t("labs.host.expFree"), desc: tasting.guidedMode ? t("labs.host.expFreeDisabled") : t("labs.host.expFreeDesc"), disabled: !!tasting.guidedMode },
                { value: "focus", label: t("labs.host.expOneAtATime"), desc: t("labs.host.expOneAtATimeDesc") },
                { value: "journal", label: t("labs.host.expDram"), desc: t("labs.host.expDramDesc") },
              ]}
              onChange={handleChangeSessionUi}
            />
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Globe className="w-3 h-3" />
              {t("labs.host.howGuestsJoin")}
            </label>
            <LabsSegmentedSelect
              value={(tasting.guestMode as string) || "standard"}
              options={[
                { value: "standard", label: t("labs.host.guestAccount"), desc: t("labs.host.guestAccountDesc") },
                { value: "ultra", label: t("labs.host.guestInstant"), desc: t("labs.host.guestInstantDesc") },
              ]}
              onChange={handleChangeGuestMode}
            />
          </div>

          <div>
            <p className="labs-section-label">{t("labs.host.whatGuestsSee")}</p>
          </div>

          <LabsToggle
            checked={!!tasting.showRanking}
            onChange={() => handleToggle("showRanking", !!tasting.showRanking)}
            icon={<BarChart3 className="w-5 h-5" style={{ color: tasting.showRanking ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label={t("labs.host.showRanking")}
            description={t("labs.host.showRankingDesc")}
            testId="labs-settings-toggle-ranking"
          />
          {tasting.blindMode && tasting.showRanking && (
            <p className="text-xs mt-1 px-1" style={{ color: "var(--labs-accent)", opacity: 0.8 }} data-testid="blind-ranking-hint">
              {t("labs.host.blindRankingHint")}
            </p>
          )}

          <LabsToggle
            checked={!!tasting.showGroupAvg}
            onChange={() => handleToggle("showGroupAvg", !!tasting.showGroupAvg)}
            icon={<Users className="w-5 h-5" style={{ color: tasting.showGroupAvg ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label={t("labs.host.showGroupScores")}
            description={t("labs.host.showGroupScoresDesc")}
            testId="labs-settings-toggle-avg"
          />

          <LabsToggle
            checked={tasting.showReveal !== false}
            onChange={() => handleToggle("showReveal", tasting.showReveal !== false)}
            icon={<Eye className="w-5 h-5" style={{ color: tasting.showReveal !== false ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label={t("labs.host.showResultsAfter")}
            description={t("labs.host.showResultsAfterDesc")}
            testId="labs-settings-toggle-reveal"
          />

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Star className="w-3 h-3" />
              {t("labs.host.ratingPrompt")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ratingPrompt}
                onChange={e => setRatingPrompt(e.target.value)}
                placeholder={t("labs.host.ratingPromptPlaceholder")}
                className="labs-input flex-1"
                data-testid="labs-settings-rating-prompt"
              />
              <button
                className="labs-btn-primary px-3"
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                data-testid="labs-settings-save-prompt"
              >
                {savingPrompt ? "..." : t("labs.host.save")}
              </button>
            </div>
          </div>

          <div>
            <p className="labs-section-label">{t("labs.host.extras")}</p>
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <MessageCircle className="w-3 h-3" />
              {t("labs.host.groupDiscussion")}
            </label>
            <LabsToggle
              checked={!!tasting.reflectionEnabled}
              onChange={handleToggleReflection}
              icon={<MessageCircle className="w-5 h-5" style={{ color: tasting.reflectionEnabled ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
              label={t("labs.host.enableDiscussion")}
              description={t("labs.host.enableDiscussionDesc")}
              testId="labs-settings-toggle-reflection"
            />
            {tasting.reflectionEnabled && (
              <div className="space-y-3 mt-3">
                <div>
                  <label className="labs-section-label" style={{ fontSize: 11 }}>{t("labs.host.discussionFormat")}</label>
                  <LabsSegmentedSelect
                    value={(tasting.reflectionMode as string) || "standard"}
                    options={[
                      { value: "standard", label: t("labs.host.discussionStandard"), desc: t("labs.host.discussionStandardDesc") },
                      { value: "custom", label: t("labs.host.discussionCustom"), desc: t("labs.host.discussionCustomDesc") },
                    ]}
                    onChange={handleChangeReflectionMode}
                  />
                </div>
                <div>
                  <label className="labs-section-label" style={{ fontSize: 11 }}>{t("labs.host.showNames")}</label>
                  <LabsSegmentedSelect
                    value={(tasting.reflectionVisibility as string) || "named"}
                    options={[
                      { value: "named", label: t("labs.host.namesNamed"), desc: t("labs.host.namesNamedDesc") },
                      { value: "anonymous", label: t("labs.host.namesAnonymous"), desc: t("labs.host.namesAnonymousDesc") },
                      { value: "optional", label: t("labs.host.namesOptional"), desc: t("labs.host.namesOptionalDesc") },
                    ]}
                    onChange={handleChangeReflectionVis}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Video className="w-3 h-3" />
              Video Call Link
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={videoLinkLocal}
                onChange={e => setVideoLinkLocal(e.target.value)}
                placeholder={t("m2.host.videoLinkPlaceholder")}
                className="labs-input flex-1"
                data-testid="labs-settings-video-link"
              />
              <button
                className="labs-btn-primary px-3"
                onClick={handleSaveVideo}
                disabled={savingVideo}
                data-testid="labs-settings-save-video"
              >
                {savingVideo ? "..." : t("labs.host.save")}
              </button>
            </div>
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Image className="w-3 h-3" />
              {t("labs.host.coverImage")}
            </label>
            <label
              className="flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer text-sm"
              style={{
                border: "1px dashed var(--labs-border)",
                color: "var(--labs-text-muted)",
                background: "var(--labs-surface)",
              }}
              data-testid="labs-settings-upload-cover"
            >
              <Upload className="w-4 h-4" />
              {(tasting.coverImageUrl as string) ? t("labs.host.changeCover") : t("labs.host.uploadCover")}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => { if (e.target.files?.[0]) handleCoverUpload(e.target.files[0]); }}
              />
            </label>
            {coverUploadError && (
              <p className="text-xs mt-1.5" style={{ color: "var(--labs-error, #ef4444)" }} data-testid="labs-settings-cover-error">
                {coverUploadError}
              </p>
            )}
            {(localCoverUrl || (tasting.coverImageUrl as string)) && (
              <img
                src={localCoverUrl || (tasting.coverImageUrl as string) || ""}
                alt="Cover"
                className="w-full rounded-lg mt-2"
                style={{ height: 120, objectFit: "cover" }}
                data-testid="labs-settings-cover-preview"
              />
            )}
          </div>

      </div>
    </div>
  );
}

function ManageTasting({ tastingId }: { tastingId: string }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [forceDesktopView, setForceDesktopView] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showEmailInvite, setShowEmailInvite] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [personalNote, setPersonalNote] = useState("");
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastAddedEmail, setLastAddedEmail] = useState<string | null>(null);
  const [topDuplicating, setTopDuplicating] = useState(false);
  const [showDesktopTransfer, setShowDesktopTransfer] = useState(false);
  const [desktopConfirmDelete, setDesktopConfirmDelete] = useState(false);
  const [desktopTransferTargetId, setDesktopTransferTargetId] = useState<string | null>(null);
  const [desktopTransferring, setDesktopTransferring] = useState(false);

  const { data: tasting, isLoading: tastingLoading, isError: tastingError } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const { data: whiskies } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const { data: participants } = useQuery({
    queryKey: ["tasting-participants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const { data: ratings } = useQuery({
    queryKey: ["tasting-ratings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const { data: existingInvites } = useQuery({
    queryKey: ["invites", tastingId],
    queryFn: () => inviteApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, currentAct }: { status: string; currentAct?: string }) =>
      tastingApi.updateStatus(tastingId, status, currentAct, currentParticipant?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    },
  });

  const revealMutation = useMutation({
    mutationFn: () =>
      blindModeApi.revealNext(tastingId, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    },
  });

  const lockedDrams: string[] = (() => {
    try { return JSON.parse((tasting as any)?.lockedDrams || "[]"); } catch { return []; }
  })();
  const isDramLocked = (whiskyId: string) => lockedDrams.includes(whiskyId);
  const toggleDramLock = async (whiskyId: string) => {
    const next = isDramLocked(whiskyId)
      ? lockedDrams.filter(id => id !== whiskyId)
      : [...lockedDrams, whiskyId];
    await tastingApi.updateDetails(tastingId, currentParticipant?.id || "", { lockedDrams: JSON.stringify(next) });
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
  };

  const desktopTransferGuests = (participants || []).filter(
    (tp: { participant: { id: string } }) => tp.participant.id !== currentParticipant?.id
  );

  const [desktopTransferError, setDesktopTransferError] = useState<string | null>(null);

  const handleDesktopTransferHost = async () => {
    if (!desktopTransferTargetId || !currentParticipant) return;
    setDesktopTransferring(true);
    setDesktopTransferError(null);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/transfer-host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: currentParticipant.id, newHostId: desktopTransferTargetId }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
        navigate("/labs/tastings");
      } else {
        const err = await res.json().catch(() => ({}));
        setDesktopTransferError(err.message || "Übertragung fehlgeschlagen");
      }
    } catch {
      setDesktopTransferError("Übertragung fehlgeschlagen");
    }
    setDesktopTransferring(false);
  };

  const [newWhiskyName, setNewWhiskyName] = useState("");
  const [showAddWhisky, setShowAddWhisky] = useState(false);
  const [showAddPopover, setShowAddPopover] = useState(false);
  const [showExtendedFields, setShowExtendedFields] = useState(false);
  const [extFields, setExtFields] = useState<Record<string, string>>({});
  const [extImageFile, setExtImageFile] = useState<File | null>(null);
  const [extImagePreview, setExtImagePreview] = useState<string | null>(null);
  const [extAddPending, setExtAddPending] = useState(false);
  const [editingWhiskyId, setEditingWhiskyId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [wbLookupId, setWbLookupId] = useState("");
  const [wbLookupLoading, setWbLookupLoading] = useState(false);
  const [wbLookupResult, setWbLookupResult] = useState<string>("");
  const [editWbLookupId, setEditWbLookupId] = useState("");
  const [editWbLookupLoading, setEditWbLookupLoading] = useState(false);
  const [editWbLookupResult, setEditWbLookupResult] = useState<string>("");
  const [editWbFetchImageLoading, setEditWbFetchImageLoading] = useState(false);
  const [editWbFetchImageResult, setEditWbFetchImageResult] = useState<string>("");
  const [showAiImport, setShowAiImport] = useState(false);
  const [aiImportFiles, setAiImportFiles] = useState<File[]>([]);
  const [aiImportText, setAiImportText] = useState("");
  const [aiImportLoading, setAiImportLoading] = useState(false);
  const aiImportLoadingRef = useRef(false);
  const [aiImportResults, setAiImportResults] = useState<any[]>([]);
  const [aiImportSelected, setAiImportSelected] = useState<Set<number>>(new Set());
  const [showCollectionImport, setShowCollectionImport] = useState(false);
  const [showWishlistImport, setShowWishlistImport] = useState(false);
  const [showEditTasting, setShowEditTasting] = useState(false);
  const [editTastingFields, setEditTastingFields] = useState<Record<string, string>>({});
  const editTastingInitialRef = useRef<Record<string, string>>({});
  const [editCommunityIds, setEditCommunityIds] = useState<Set<string>>(new Set());
  const editCommunityIdsInitialRef = useRef<Set<string>>(new Set());
  const [editMyCommunities, setEditMyCommunities] = useState<any[]>([]);
  const [editTastingSaving, setEditTastingSaving] = useState(false);
  const [editTastingAutoSaved, setEditTastingAutoSaved] = useState(false);
  const editTastingAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editTastingIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSocial, setShowSocial] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cockpitMode, setCockpitMode] = useState(false);

  const addWhiskyMutation = useMutation({
    mutationFn: (data: any) => whiskyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setNewWhiskyName("");
      setExtFields({});
      setShowExtendedFields(false);
      setShowAddWhisky(false);
      setWbLookupId("");
      setWbLookupResult("");
      toast({ title: t("labs.whisky.added", "Whisky added") });
    },
    onError: (e: Error) => {
      toast({ title: t("labs.whisky.addFailed", "Failed to add whisky"), description: e.message, variant: "destructive" });
    },
  });

  const deleteWhiskyMutation = useMutation({
    mutationFn: (id: string) => whiskyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      toast({ title: t("labs.whisky.deleted", "Whisky removed") });
    },
    onError: (e: Error) => {
      toast({ title: t("labs.whisky.deleteFailed", "Failed to remove whisky"), description: e.message, variant: "destructive" });
    },
  });

  const updateWhiskyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => whiskyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setEditingWhiskyId(null);
      setEditFields({});
      toast({ title: t("labs.whisky.updated", "Whisky updated") });
    },
    onError: (e: Error) => {
      toast({ title: t("labs.whisky.updateFailed", "Failed to update whisky"), description: e.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => whiskyApi.reorder(tastingId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    },
    onError: (e: Error) => {
      toast({ title: t("labs.whisky.reorderFailed", "Failed to reorder whiskies"), description: e.message, variant: "destructive" });
    },
  });

  const handleMoveWhisky = (index: number, direction: "up" | "down") => {
    if (!whiskies) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= whiskies.length) return;
    const reordered = [...whiskies];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    reorderMutation.mutate(reordered.map((w: any, i: number) => ({ id: w.id, sortOrder: i + 1 })));
  };

  const dragState = useRef<{ dragIdx: number; overIdx: number } | null>(null);
  const [dragActiveIdx, setDragActiveIdx] = useState<number | null>(null);
  const touchStartY = useRef<number>(0);
  const whiskyListRef = useRef<HTMLDivElement>(null);

  const commitDrag = () => {
    if (!dragState.current || !whiskies) return;
    const { dragIdx, overIdx } = dragState.current;
    if (dragIdx !== overIdx) {
      const reordered = [...whiskies];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(overIdx, 0, moved);
      reorderMutation.mutate(reordered.map((w: any, i: number) => ({ id: w.id, sortOrder: i + 1 })));
    }
    dragState.current = null;
    setDragActiveIdx(null);
  };

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    dragState.current = { dragIdx: idx, overIdx: idx };
    setDragActiveIdx(idx);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragState.current || !whiskyListRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const cards = whiskyListRef.current.querySelectorAll("[data-whisky-drag-idx]");
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const newIdx = parseInt(card.getAttribute("data-whisky-drag-idx") || "0", 10);
        if (dragState.current.overIdx !== newIdx) {
          dragState.current.overIdx = newIdx;
          setDragActiveIdx(dragState.current.dragIdx);
        }
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    commitDrag();
  };

  const handleWhiskyImageUpload = async (whiskyId: string, file: File) => {
    try {
      await whiskyApi.uploadImage(whiskyId, file);
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    } catch {}
  };

  const [aiImportError, setAiImportError] = useState("");
  const [aiImportSummary, setAiImportSummary] = useState<{ added: number; duplicatesAdded: number; duplicatesSkipped: number; failed: number } | null>(null);

  const getDesktopDuplicateIndices = useCallback(() => {
    if (!whiskies || !aiImportResults.length) return new Set<number>();
    const dupes = new Set<number>();
    aiImportResults.forEach((w: any, i: number) => {
      const match = whiskies.some((ew: any) =>
        isSimilarWhisky(w.name || "", w.distillery || "", ew.name || "", ew.distillery || "")
      );
      if (match) dupes.add(i);
    });
    return dupes;
  }, [whiskies, aiImportResults]);

  const handleAiImport = async () => {
    if (aiImportFiles.length === 0 && !aiImportText.trim()) return;
    setAiImportLoading(true);
    aiImportLoadingRef.current = true;
    setAiImportError("");
    setAiImportSummary(null);
    try {
      const excelFile = aiImportFiles.find(isExcelFile);
      let parsedWhiskies: any[] | null = null;
      if (excelFile) {
        parsedWhiskies = await parseExcelWhiskies(excelFile);
      }
      if (parsedWhiskies && parsedWhiskies.length > 0) {
        setAiImportResults(parsedWhiskies);
        const existingList = (whiskies || []) as Array<Record<string, unknown>>;
        const nonDupeIndices = new Set(
          parsedWhiskies.map((_: any, i: number) => i).filter((i: number) =>
            !existingList.some((ew: any) => isSimilarWhisky(parsedWhiskies![i].name || "", parsedWhiskies![i].distillery || "", ew.name || "", ew.distillery || ""))
          )
        );
        setAiImportSelected(nonDupeIndices);
      } else if (excelFile && (!parsedWhiskies || parsedWhiskies.length === 0)) {
        setAiImportError("No whiskies found in Excel file. Make sure at least a 'Name' column (or row) is filled, or use the import template.");
      } else {
        const result = await tastingApi.aiImport(aiImportFiles, aiImportText.trim(), currentParticipant?.id || "");
        if (result?.whiskies?.length) {
          setAiImportResults(result.whiskies);
          const existingList = (whiskies || []) as Array<Record<string, unknown>>;
          const nonDupeIndices = new Set(
            result.whiskies.map((_: any, i: number) => i).filter((i: number) =>
              !existingList.some((ew: any) => isSimilarWhisky(result.whiskies[i].name || "", result.whiskies[i].distillery || "", ew.name || "", ew.distillery || ""))
            )
          );
          setAiImportSelected(nonDupeIndices);
        } else {
          setAiImportError(t("labs.aiImport.noResults", "No whiskies found. Try a clearer photo or text."));
        }
      }
    } catch (e: unknown) {
      setAiImportError((e instanceof Error ? e.message : null) || t("labs.aiImport.importFailed", "AI import failed. Please try again."));
    }
    setAiImportLoading(false);
    aiImportLoadingRef.current = false;
  };

  useEffect(() => {
    if (aiImportFiles.length === 0) return;
    if (aiImportLoadingRef.current) return;
    const timer = setTimeout(() => {
      if (!aiImportLoadingRef.current) {
        handleAiImport();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [aiImportFiles]);

  const handleAiImportConfirm = async () => {
    let added = 0, dupeAdded = 0, failed = 0;
    const dupeIndices = getDesktopDuplicateIndices();
    const duplicatesSkipped = Array.from(dupeIndices).filter(i => !aiImportSelected.has(i)).length;
    const existingList = (whiskies || []) as Array<Record<string, unknown>>;
    for (const idx of Array.from(aiImportSelected)) {
      const w = aiImportResults[idx];
      if (w) {
        const isDupe = existingList.some((ew: any) => isSimilarWhisky(w.name || "", w.distillery || "", ew.name || "", ew.distillery || ""));
        try {
          await whiskyApi.create({
            tastingId,
            name: w.name || "",
            distillery: w.distillery || "",
            abv: normalizeAbv(w.abv),
            caskInfluence: w.caskInfluence || w.caskType || w.cask || "",
            age: w.age ? String(w.age) : "",
            category: w.category || "",
            country: w.country || "",
            region: w.region || "",
            bottler: w.bottler || "",
            peatLevel: w.peatLevel || "",
            ppm: w.ppm ? parseFloat(w.ppm) || null : null,
            price: normalizePrice(w.price),
            vintage: w.vintage || "",
            distilledYear: w.distilledYear || "",
            bottledYear: w.bottledYear || "",
            whiskybaseId: w.whiskybaseId || "",
            notes: w.notes || "",
            hostSummary: w.hostSummary || "",
            sortOrder: w.sortOrder ? parseInt(w.sortOrder) || ((whiskies?.length || 0) + added + dupeAdded + 1) : ((whiskies?.length || 0) + added + dupeAdded + 1),
          });
          if (isDupe) dupeAdded++; else added++;
        } catch {
          failed++;
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    setAiImportSummary({ added, duplicatesAdded: dupeAdded, duplicatesSkipped, failed });
    setAiImportResults([]);
    setAiImportSelected(new Set());
    setAiImportFiles([]);
    setAiImportText("");
    if (failed === 0) {
      setTimeout(() => { setShowAiImport(false); setAiImportSummary(null); }, 2500);
    }
  };

  const handleWbLookup = useCallback(async (wbIdRaw: string, target: "add" | "edit") => {
    const id = wbIdRaw.trim().replace(/^[Ww][Bb]\s*/i, "");
    if (!id || !/^\d+$/.test(id)) return;
    const setLoading = target === "add" ? setWbLookupLoading : setEditWbLookupLoading;
    const setResult = target === "add" ? setWbLookupResult : setEditWbLookupResult;
    setLoading(true);
    setResult("");
    try {
      const headers: Record<string, string> = {};
      if (currentParticipant?.id) headers["x-participant-id"] = currentParticipant.id;
      const res = await fetch(`/api/whiskybase-lookup/${encodeURIComponent(id)}`, { headers });
      if (!res.ok) {
        if (res.status === 429) { setResult("rate_limit"); return; }
        if (res.status === 400) { setResult("invalid"); return; }
        setResult("not_found"); return;
      }
      const data = await res.json();
      if (target === "add") {
        if (data.name) setNewWhiskyName(data.name);
        setExtFields(prev => ({
          ...prev,
          ...(data.distillery && !prev.distillery ? { distillery: data.distillery } : {}),
          ...(data.age ? { age: String(data.age) } : {}),
          ...(data.abv ? { abv: String(data.abv) } : {}),
          ...(data.caskType && !prev.caskType ? { caskType: data.caskType } : {}),
          ...(data.region && !prev.region ? { region: data.region } : {}),
          ...(data.country && !prev.country ? { country: data.country } : {}),
          ...(data.peatLevel && !prev.peatLevel ? { peatLevel: data.peatLevel } : {}),
          ...(data.bottler && !prev.bottler ? { bottler: data.bottler } : {}),
          ...(data.vintage ? { vintage: String(data.vintage) } : {}),
          ...(data.distilledYear ? { distilledYear: String(data.distilledYear) } : {}),
          ...(data.bottledYear ? { bottledYear: String(data.bottledYear) } : {}),
          ...(data.price && !prev.price ? { price: String(data.price).replace(".", ",") } : {}),
          ...(data.category && !prev.category ? { category: data.category } : {}),
          whiskybaseId: id,
        }));
        setShowExtendedFields(true);
        setResult("ok");
      } else {
        setEditFields(prev => ({
          ...prev,
          ...(data.name && !prev.name ? { name: data.name } : {}),
          ...(data.distillery && !prev.distillery ? { distillery: data.distillery } : {}),
          ...(data.age ? { age: String(data.age) } : {}),
          ...(data.abv ? { abv: String(data.abv) } : {}),
          ...(data.caskType && !prev.caskType ? { caskType: data.caskType } : {}),
          ...(data.region && !prev.region ? { region: data.region } : {}),
          ...(data.country && !prev.country ? { country: data.country } : {}),
          ...(data.peatLevel && !prev.peatLevel ? { peatLevel: data.peatLevel } : {}),
          ...(data.bottler && !prev.bottler ? { bottler: data.bottler } : {}),
          ...(data.vintage ? { vintage: String(data.vintage) } : {}),
          ...(data.distilledYear ? { distilledYear: String(data.distilledYear) } : {}),
          ...(data.bottledYear ? { bottledYear: String(data.bottledYear) } : {}),
          ...(data.price && !prev.price ? { price: String(data.price).replace(".", ",") } : {}),
          ...(data.category && !prev.category ? { category: data.category } : {}),
          whiskybaseId: id,
        }));
        setResult("ok");
      }
    } catch {
      setResult("error");
    } finally {
      setLoading(false);
    }
  }, [currentParticipant?.id]);

  const handleAddWhiskyExtended = async () => {
    if (!newWhiskyName.trim()) return;
    setExtAddPending(true);
    try {
      const created = await whiskyApi.create({
        tastingId,
        name: newWhiskyName.trim(),
        distillery: extFields.distillery || "",
        abv: normalizeAbv(extFields.abv),
        caskInfluence: extFields.caskType || "",
        age: extFields.age || "",
        category: extFields.category || "",
        country: extFields.country || "",
        region: extFields.region || "",
        bottler: extFields.bottler || "",
        vintage: extFields.vintage || "",
        distilledYear: extFields.distilledYear || "",
        bottledYear: extFields.bottledYear || "",
        whiskybaseId: extFields.whiskybaseId || "",
        wbScore: extFields.wbScore ? parseFloat(extFields.wbScore) || null : null,
        price: normalizePrice(extFields.price),
        peatLevel: extFields.peatLevel || "",
        ppm: extFields.ppm ? parseFloat(extFields.ppm) || null : null,
        hostSummary: extFields.hostSummary || "",
        notes: extFields.notes || "",
        flavorProfile: extFields.flavorProfile === "auto" || !extFields.flavorProfile ? null : extFields.flavorProfile,
        sortOrder: (whiskies?.length || 0) + 1,
      });
      if (extImageFile && created?.id) {
        try { await whiskyApi.uploadImage(created.id, extImageFile); } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setNewWhiskyName("");
      setExtFields({});
      setExtImageFile(null);
      setExtImagePreview(null);
      setShowExtendedFields(false);
      setShowAddWhisky(false);
      setWbLookupId("");
      setWbLookupResult("");
      toast({ title: t("labs.whisky.added", "Whisky added") });
    } catch (e: any) {
      toast({ title: t("labs.whisky.addFailed", "Failed to add whisky"), description: e.message, variant: "destructive" });
    } finally {
      setExtAddPending(false);
    }
  };

  const handleSaveEditWhisky = (whiskyId: string) => {
    const coerced: Record<string, unknown> = { ...editFields };
    if (coerced.abv !== undefined) coerced.abv = normalizeAbv(coerced.abv);
    if (coerced.price !== undefined) coerced.price = normalizePrice(coerced.price);
    if (coerced.ppm !== undefined) coerced.ppm = coerced.ppm ? parseFloat(coerced.ppm as string) || null : null;
    if (coerced.wbScore !== undefined) coerced.wbScore = coerced.wbScore ? parseFloat(coerced.wbScore as string) || null : null;
    if (coerced.caskType !== undefined) { coerced.caskInfluence = coerced.caskType; delete coerced.caskType; }
    if (coerced.flavorProfile !== undefined) { coerced.flavorProfile = coerced.flavorProfile === "auto" || !coerced.flavorProfile ? null : coerced.flavorProfile; }
    if (editWbLookupId.trim()) coerced.whiskybaseId = editWbLookupId.trim();
    updateWhiskyMutation.mutate({ id: whiskyId, data: coerced });
  };

  const startEditWhisky = (w: any) => {
    setEditingWhiskyId(w.id);
    setEditWbLookupId(w.whiskybaseId ? String(w.whiskybaseId) : "");
    setEditWbLookupResult("");
    setEditWbFetchImageResult("");
    setEditWbFetchImageLoading(false);
    setEditFields({
      name: w.name || "",
      distillery: w.distillery || "",
      abv: w.abv ? String(w.abv) : "",
      caskType: w.caskInfluence || "",
      age: w.age ? String(w.age) : "",
      category: w.category || "",
      country: w.country || "",
      region: w.region || "",
      bottler: w.bottler || "",
      vintage: w.vintage || "",
      distilledYear: w.distilledYear || "",
      bottledYear: w.bottledYear || "",
      price: w.price ? String(w.price).replace(".", ",") : "",
      hostSummary: w.hostSummary || "",
      notes: w.notes || "",
      flavorProfile: w.flavorProfile || "",
    });
  };

  const [editTastingError, setEditTastingError] = useState("");

  useEffect(() => {
    if (currentParticipant?.id && showEditTasting) {
      fetch("/api/communities/mine", { headers: { "x-participant-id": currentParticipant.id } })
        .then(r => r.ok ? r.json() : { communities: [] })
        .then(d => setEditMyCommunities(d.communities || []))
        .catch(() => {});
    }
  }, [currentParticipant?.id, showEditTasting]);

  const toggleEditCommunity = (id: string) => {
    setEditCommunityIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const doEditTastingSave = useCallback(async (fields: Record<string, string>, silent = false) => {
    const body: Record<string, unknown> = { hostId: currentParticipant?.id };
    if (fields.title) body.title = fields.title;
    if (fields.date !== undefined) body.date = fields.date;
    if (fields.time !== undefined) body.time = fields.time || null;
    if (fields.location !== undefined) body.location = fields.location;
    if (fields.description !== undefined) body.description = fields.description;
    if (!silent) {
      const initialIds = editCommunityIdsInitialRef.current;
      const currentIds = editCommunityIds;
      const communityChanged = initialIds.size !== currentIds.size || [...currentIds].some(id => !initialIds.has(id));
      if (communityChanged) {
        body.targetCommunityIds = currentIds.size > 0 ? JSON.stringify(Array.from(currentIds)) : null;
        if (currentIds.size > 0 && tasting?.visibility !== "public") {
          body.visibility = "group";
        } else if (currentIds.size === 0 && tasting?.visibility === "group") {
          body.visibility = "private";
        }
      }
    }
    setEditTastingError("");
    if (!silent) setEditTastingSaving(true);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || t("labs.host.failedToSave"));
      }
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
      if (silent) {
        setEditTastingAutoSaved(true);
        if (editTastingIndicatorRef.current) clearTimeout(editTastingIndicatorRef.current);
        editTastingIndicatorRef.current = setTimeout(() => setEditTastingAutoSaved(false), 2000);
      }
      return true;
    } catch (e: any) {
      setEditTastingError(e.message || t("labs.host.failedToSave"));
      return false;
    } finally {
      if (!silent) setEditTastingSaving(false);
    }
  }, [tastingId, currentParticipant?.id, queryClient, editCommunityIds]);

  const handleEditTastingSave = async () => {
    const ok = await doEditTastingSave(editTastingFields);
    if (ok) setShowEditTasting(false);
  };

  useEffect(() => {
    if (!showEditTasting) return;
    const hasFields = Object.keys(editTastingFields).length > 0;
    if (!hasFields) return;
    if (JSON.stringify(editTastingFields) === JSON.stringify(editTastingInitialRef.current)) return;

    if (editTastingAutoSaveRef.current) clearTimeout(editTastingAutoSaveRef.current);
    editTastingAutoSaveRef.current = setTimeout(() => {
      doEditTastingSave(editTastingFields, true);
    }, 1500);

    return () => {
      if (editTastingAutoSaveRef.current) clearTimeout(editTastingAutoSaveRef.current);
    };
  }, [editTastingFields, showEditTasting, doEditTastingSave]);

  useEffect(() => {
    return () => {
      if (editTastingIndicatorRef.current) clearTimeout(editTastingIndicatorRef.current);
      if (editTastingAutoSaveRef.current) clearTimeout(editTastingAutoSaveRef.current);
    };
  }, []);

  const handleGenerateNarrative = async () => {
    setNarrativeLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (currentParticipant?.id) headers["x-participant-id"] = currentParticipant.id;
      const res = await fetch(`/api/tastings/${tastingId}/ai-narrative`, {
        method: "POST",
        headers,
        body: JSON.stringify({ hostId: currentParticipant?.id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || errData?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      if (data?.narrative) setAiNarrative(data.narrative);
    } catch (e: any) {
      toast({ title: t("labs.narrative.failed", "Failed to generate narrative"), description: e.message, variant: "destructive" });
    } finally {
      setNarrativeLoading(false);
    }
  };

  const joinUrl = tasting ? `${window.location.origin}/labs/join?code=${tasting?.code}` : "";

  const handleShareSocial = (platform: string) => {
    if (!tasting) return;
    const text = t("labs.host.shareJoinText", { title: tasting.title });
    const url = joinUrl;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent(t("labs.host.shareJoinSubject", { title: tasting.title }))}&body=${encodedText}%20${encodedUrl}`,
    };
    if (links[platform]) window.open(links[platform], "_blank");
  };

  const handleNativeShare = async () => {
    if (!tasting || !navigator.share) return;
    try {
      await navigator.share({
        title: tasting.title,
        text: t("labs.host.shareJoinText", { title: tasting.title }),
        url: joinUrl,
      });
    } catch {}
  };

  const handleDownloadQr = () => {
    if (qrDataUrl && tasting) {
      downloadDataUrl(qrDataUrl, `casksense-${tasting.code}-qr.png`);
    }
  };

  const copyCode = () => {
    if (tasting?.code) {
      navigator.clipboard.writeText(tasting.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (tasting?.code) {
      const joinUrl = `${window.location.origin}/labs/join?code=${tasting.code}`;
      QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#1a1714", light: "#f5f0e8" },
      }).then(setQrDataUrl).catch(() => {});
    }
  }, [tasting?.code]);

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t("labs.host.invalidEmail"));
      setTimeout(() => setEmailError(null), 3000);
      return;
    }
    if (emailList.includes(email)) {
      setEmailError(t("labs.host.alreadyInList"));
      setTimeout(() => setEmailError(null), 3000);
      return;
    }
    const alreadyInvited = Array.isArray(existingInvites) && existingInvites.some((inv: { email?: string }) => inv.email?.toLowerCase() === email);
    if (alreadyInvited) {
      setEmailError(t("labs.host.alreadyInvited"));
      setTimeout(() => setEmailError(null), 3000);
      return;
    }
    setEmailError(null);
    setLastAddedEmail(email);
    setTimeout(() => setLastAddedEmail(null), 1500);
    setEmailList([...emailList, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setEmailList(emailList.filter(e => e !== email));
  };

  const handleSendInvites = async () => {
    if (emailList.length === 0) return;
    const recipientCount = emailList.length;
    setSendingInvites(true);
    try {
      await inviteApi.sendInvites(tastingId, emailList, personalNote.trim() || undefined);
      setInviteSent(true);
      setEmailList([]);
      setPersonalNote("");
      queryClient.invalidateQueries({ queryKey: ["invites", tastingId] });
      setInviteFeedback({ type: "success", message: t("labs.host.invitesSentCount", { count: recipientCount }) });
      setTimeout(() => { setInviteSent(false); setInviteFeedback(null); }, 5000);
    } catch (err) {
      console.error("Failed to send invites:", err);
      setInviteSent(false);
      setInviteFeedback({ type: "error", message: t("labs.host.invitesFailed") });
      setTimeout(() => setInviteFeedback(null), 5000);
    } finally {
      setSendingInvites(false);
    }
  };

  const handleAddWhisky = () => {
    if (!newWhiskyName.trim()) return;
    if (showExtendedFields) {
      handleAddWhiskyExtended();
    } else {
      addWhiskyMutation.mutate({
        tastingId,
        name: newWhiskyName.trim(),
        ...(wbLookupId.trim() ? { whiskybaseId: wbLookupId.trim() } : {}),
        sortOrder: (whiskies?.length || 0) + 1,
      });
    }
  };

  if (tastingError) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>{t("hostUi.tastingNotFound")}</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>{t("hostUi.tastingNoAccess")}</p>
        <button className="labs-btn-secondary" onClick={goBack} data-testid="labs-host-error-back">
          Tastings
        </button>
      </div>
    );
  }

  if (tastingLoading) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--labs-border)", borderTopColor: "var(--labs-accent)" }}
        />
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("hostUi.tastingNotFound")}</p>
        <button className="labs-btn-ghost mt-4" onClick={goBack} data-testid="labs-host-back-to-tastings">
          Tastings
        </button>
      </div>
    );
  }

  const statusCfg = getStatusConfig(tasting.status);
  const whiskyCount = whiskies?.length || 0;
  const participantCount = participants?.length || 0;
  const ratingCount = ratings?.length || 0;
  const totalExpected = whiskyCount * participantCount;
  const ratingProgress = totalExpected > 0 ? Math.round((ratingCount / totalExpected) * 100) : 0;

  if (isMobile && currentParticipant && !forceDesktopView) {
    return (
      <MobileCompanion
        tasting={tasting}
        whiskies={whiskies || []}
        participants={participants || []}
        ratings={ratings || []}
        currentParticipant={currentParticipant}
        queryClient={queryClient}
        tastingId={tastingId}
        navigate={navigate}
        onSwitchToManage={() => setForceDesktopView(true)}
      />
    );
  }

  const showCockpitButton = !isMobile && tasting && (tasting.status === "open" || tasting.status === "reveal");
  const showBackToCompanion = isMobile && forceDesktopView;

  if (cockpitMode && tasting && currentParticipant && (tasting.status === "open" || tasting.status === "reveal")) {
    return (
      <LabsHostCockpit
        tastingId={tastingId}
        onExit={() => setCockpitMode(false)}
      />
    );
  }

  return (
    <div className="labs-page labs-fade-in">
      <div className="flex items-center gap-2 -ml-2 mb-4">
        <button
          onClick={showBackToCompanion ? () => setForceDesktopView(false) : goBack}
          className="labs-btn-ghost flex items-center gap-1"
          style={{ color: "var(--labs-text-muted)" }}
          data-testid="labs-host-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {showBackToCompanion ? t("labs.host.backToSession") : t("labs.host.tastings")}
        </button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="labs-h2 mb-1"
              data-testid="labs-host-tasting-title"
            >
              {tasting.title}
            </h1>
            <button
              className="labs-btn-ghost p-1"
              onClick={() => {
                const initial = {
                  title: tasting.title || "",
                  date: tasting.date || "",
                  time: (tasting as any).time || "",
                  location: tasting.location || "",
                  description: tasting.description || "",
                };
                setEditTastingFields(initial);
                editTastingInitialRef.current = initial;
                try {
                  const ids = tasting.targetCommunityIds ? JSON.parse(tasting.targetCommunityIds) : [];
                  const idSet = new Set<string>(Array.isArray(ids) ? ids : []);
                  setEditCommunityIds(idSet);
                  editCommunityIdsInitialRef.current = new Set(idSet);
                } catch {
                  setEditCommunityIds(new Set());
                  editCommunityIdsInitialRef.current = new Set();
                }
                setShowEditTasting(!showEditTasting);
              }}
              data-testid="labs-host-edit-tasting"
            >
              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--labs-text-muted)" }}>
            {tasting.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {tasting.date}
              </span>
            )}
            {tasting.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {tasting.location}
              </span>
            )}
            {tasting.description && (
              <span className="truncate max-w-[200px]">{tasting.description}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {showCockpitButton && (
            <button
              onClick={() => setCockpitMode(true)}
              className="labs-btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 13 }}
              data-testid="labs-host-cockpit-toggle"
              title={t("labs.host.hostCockpitTooltip")}
            >
              <Gauge className="w-4 h-4" />
              {t("labs.host.hostCockpit")}
            </button>
          )}
          <span
            className={statusCfg.cssClass}
            data-testid="labs-host-status"
          >
            {t(statusCfg.labelKey, statusCfg.fallbackLabel)}
          </span>
        </div>
      </div>

      {showEditTasting && (
        <div className="labs-card p-4 mb-5 space-y-3" data-testid="labs-edit-tasting-form">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{t("labs.host.editTastingDetails")}</span>
          </div>
          <input
            className="labs-input w-full"
            placeholder={t("labs.host.titlePlaceholder")}
            value={editTastingFields.title || ""}
            onChange={e => setEditTastingFields({ ...editTastingFields, title: e.target.value })}
            data-testid="labs-edit-tasting-title"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              className="labs-input"
              type="date"
              value={editTastingFields.date || ""}
              onChange={e => setEditTastingFields({ ...editTastingFields, date: e.target.value })}
              data-testid="labs-edit-tasting-date"
            />
            <input
              className="labs-input"
              type="time"
              value={editTastingFields.time || ""}
              onChange={e => setEditTastingFields({ ...editTastingFields, time: e.target.value })}
              data-testid="labs-edit-tasting-time"
            />
            <input
              className="labs-input"
              placeholder={t("labs.host.locationPlaceholder")}
              value={editTastingFields.location || ""}
              onChange={e => setEditTastingFields({ ...editTastingFields, location: e.target.value })}
              data-testid="labs-edit-tasting-location"
            />
          </div>
          <textarea
            className="labs-input w-full"
            rows={2}
            placeholder={t("labs.host.descriptionPlaceholder")}
            value={editTastingFields.description || ""}
            onChange={e => setEditTastingFields({ ...editTastingFields, description: e.target.value })}
            style={{ resize: "vertical" }}
            data-testid="labs-edit-tasting-description"
          />
          {editMyCommunities.length > 0 && (
            <div>
              <label className="labs-section-label flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                {t("labs.host.targetCommunities")}
              </label>
              <p className="text-[11px] mb-2" style={{ color: "var(--labs-text-muted)" }}>
                {t("labs.host.targetCommunitiesDesc")}
              </p>
              <div className="labs-card" style={{ padding: "var(--labs-space-sm) var(--labs-space-md)" }}>
                {editMyCommunities.map((c: any) => (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }} data-testid={`edit-tasting-community-${c.id}`}>
                    <input type="checkbox" checked={editCommunityIds.has(c.id)} onChange={() => toggleEditCommunity(c.id)} data-testid={`edit-checkbox-tasting-community-${c.id}`} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text)" }}>{c.name}</span>
                    {c.memberCount != null && <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>({c.memberCount})</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
          {editTastingError && (
            <p className="text-xs" style={{ color: "var(--labs-danger, #e74c3c)" }} data-testid="labs-edit-tasting-error">{editTastingError}</p>
          )}
          <div className="flex gap-2 justify-end items-center">
            <span
              className="text-xs flex items-center gap-1 transition-opacity duration-300 mr-auto"
              style={{ color: "var(--labs-text-muted)", opacity: editTastingAutoSaved ? 1 : 0 }}
              data-testid="labs-edit-tasting-autosaved"
            >
              <Check className="w-3 h-3" />
              Auto-saved
            </span>
            <button
              className="labs-btn-ghost text-sm"
              onClick={() => setShowEditTasting(false)}
              data-testid="labs-edit-tasting-cancel"
            >
              Cancel
            </button>
            <button
              className="labs-btn-primary text-sm flex items-center gap-1"
              onClick={handleEditTastingSave}
              disabled={editTastingSaving}
              data-testid="labs-edit-tasting-save"
            >
              {editTastingSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              {editTastingSaving ? t("labs.host.savingEllipsis") : t("labs.host.saveClose")}
            </button>
          </div>
        </div>
      )}

      {tasting.code && (
        <div className="mb-5">
          <h2 className="labs-section-label">{t("labs.host.inviteShare")}</h2>
        <div className="labs-card p-4">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("labs.host.joinCode")}</p>
                <p
                  className="text-2xl font-bold tracking-widest"
                  style={{ color: "var(--labs-accent)", fontFamily: "monospace" }}
                  data-testid="labs-host-code"
                >
                  {tasting.code}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                className="labs-btn-ghost flex items-center gap-1 text-xs px-2 py-1.5"
                onClick={copyCode}
                data-testid="labs-host-copy-code"
              >
                {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {codeCopied ? t("labs.host.copied") : t("labs.host.copy")}
              </button>
              <button
                className="labs-btn-ghost flex items-center gap-1 text-xs px-2 py-1.5"
                onClick={() => setShowQr(!showQr)}
                data-testid="labs-host-toggle-qr"
              >
                <QrCode className="w-3.5 h-3.5" />
                QR
              </button>
              <button
                className="labs-btn-ghost flex items-center gap-1 text-xs px-2 py-1.5"
                onClick={() => setShowEmailInvite(!showEmailInvite)}
                data-testid="labs-host-toggle-email"
              >
                <Mail className="w-3.5 h-3.5" />
                {t("labs.host.invite")}
              </button>
              <button
                className="labs-btn-ghost flex items-center gap-1 text-xs px-2 py-1.5"
                onClick={() => setShowSocial(!showSocial)}
                data-testid="labs-host-toggle-social"
              >
                <Share2 className="w-3.5 h-3.5" />
                {t("labs.host.share")}
              </button>
            </div>
          </div>

          {showQr && qrDataUrl && (
            <div
              className="flex flex-col items-center gap-2 py-4"
              style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                style={{ width: 180, height: 180, borderRadius: 10 }}
                data-testid="img-labs-host-qr"
              />
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                {t("labs.host.scanToJoin")}
              </p>
              <button
                className="labs-btn-ghost flex items-center gap-1.5 text-xs mt-1"
                onClick={handleDownloadQr}
                data-testid="labs-host-download-qr"
              >
                <Download className="w-3.5 h-3.5" />
                {t("labs.host.downloadQr")}
              </button>
            </div>
          )}

          {showSocial && (
            <div
              className="pt-4 space-y-3"
              style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{t("labs.host.shareTasting")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "whatsapp", label: "WhatsApp", color: "#25d366" },
                  { key: "telegram", label: "Telegram", color: "#0088cc" },
                  { key: "facebook", label: "Facebook", color: "#1877f2" },
                  { key: "twitter", label: "X", color: "#1da1f2" },
                  { key: "email", label: "Email", color: "var(--labs-text-muted)" },
                ].map(p => (
                  <button
                    key={p.key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                    style={{
                      background: "var(--labs-surface)",
                      border: "1px solid var(--labs-border)",
                      color: p.color,
                    }}
                    onClick={() => handleShareSocial(p.key)}
                    data-testid={`labs-host-share-${p.key}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {p.label}
                  </button>
                ))}
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium labs-btn-primary"
                    onClick={handleNativeShare}
                    data-testid="labs-host-native-share"
                  >
                    <Share2 className="w-3 h-3" />
                    {t("labs.host.share")}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  readOnly
                  value={joinUrl}
                  className="labs-input flex-1 text-xs"
                  style={{ fontFamily: "monospace" }}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  data-testid="labs-host-share-link"
                />
                <button
                  className="labs-btn-ghost text-xs"
                  onClick={() => { navigator.clipboard.writeText(joinUrl); }}
                  data-testid="labs-host-copy-link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {showEmailInvite && (
            <div
              className="pt-4 space-y-3"
              style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{t("labs.host.emailInvitations")}</span>
              </div>

              {currentParticipant?.id && (
                <FriendsQuickSelect
                  participantId={currentParticipant.id}
                  tastingId={tastingId}
                  selectedEmails={emailList}
                  onToggle={(email, selected) => {
                    if (selected) {
                      if (!emailList.some(e => e.toLowerCase() === email.toLowerCase())) {
                        setEmailList([...emailList, email]);
                      }
                    } else {
                      setEmailList(emailList.filter(e => e.toLowerCase() !== email.toLowerCase()));
                    }
                  }}
                />
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); if (emailError) setEmailError(null); }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                  placeholder={t("labs.host.enterEmail")}
                  className="labs-input flex-1"
                  style={{
                    background: "var(--labs-surface)",
                    border: `1px solid ${emailError ? "#ef4444" : "var(--labs-border)"}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "var(--labs-text)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                  data-testid="input-labs-invite-email"
                />
                <button
                  className="labs-btn-secondary"
                  onClick={addEmail}
                  data-testid="button-labs-add-email"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {emailError && (
                <p
                  className="text-xs"
                  style={{ color: "#ef4444", margin: "-4px 0 0 0" }}
                  data-testid="text-email-error"
                >
                  {emailError}
                </p>
              )}

              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailList.map(email => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{
                        background: "var(--labs-accent-muted)",
                        color: "var(--labs-accent)",
                        transition: "box-shadow 0.3s, transform 0.3s",
                        ...(lastAddedEmail === email ? { boxShadow: "0 0 0 2px var(--labs-accent)", transform: "scale(1.05)" } : {}),
                      }}
                      data-testid={`badge-labs-invite-${email}`}
                    >
                      {email}
                      <button
                        onClick={() => removeEmail(email)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1 }}
                        data-testid={`button-labs-remove-email-${email}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <textarea
                value={personalNote}
                onChange={e => setPersonalNote(e.target.value)}
                placeholder={t("labs.host.personalNote")}
                rows={2}
                style={{
                  width: "100%",
                  background: "var(--labs-surface)",
                  border: "1px solid var(--labs-border)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "var(--labs-text)",
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                data-testid="textarea-labs-invite-note"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                  {emailList.length} {emailList.length !== 1 ? t("labs.host.recipients") : t("labs.host.recipient")}
                </span>
                <button
                  className="labs-btn-primary flex items-center gap-2"
                  onClick={handleSendInvites}
                  disabled={emailList.length === 0 || sendingInvites}
                  style={{ opacity: emailList.length === 0 ? 0.5 : 1 }}
                  data-testid="button-labs-send-invites"
                >
                  {sendingInvites ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : inviteSent ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sendingInvites ? t("labs.host.sending") : inviteSent ? t("labs.host.sent") : t("labs.host.sendInvites")}
                </button>
              </div>

              {inviteFeedback && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: inviteFeedback.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    color: inviteFeedback.type === "success" ? "#22c55e" : "#ef4444",
                    border: `1px solid ${inviteFeedback.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                  }}
                  data-testid="text-invite-feedback"
                >
                  {inviteFeedback.type === "success" ? (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 flex-shrink-0" />
                  )}
                  {inviteFeedback.message}
                </div>
              )}

            </div>
          )}

          {Array.isArray(existingInvites) && existingInvites.length > 0 && (
            <div className="pt-3 mt-2 space-y-2" style={{ borderTop: "1px solid var(--labs-border-subtle)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--labs-text-muted)" }}>
                {t("labs.host.previouslyInvited")} ({existingInvites.length})
              </span>
              <div className="space-y-1">
                {existingInvites.map((inv: any, idx: number) => (
                  <div
                    key={inv.email || idx}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: "var(--labs-surface)", color: "var(--labs-text-secondary)" }}
                    data-testid={`invite-sent-${inv.email || idx}`}
                  >
                    <span style={{ color: "var(--labs-text)" }}>{inv.email}</span>
                    <span className="flex items-center gap-1" style={{ color: inv.status === "accepted" ? "#22c55e" : "var(--labs-text-muted)", fontSize: 11 }}>
                      {inv.status === "accepted" ? <Check className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                      {inv.status === "accepted" ? t("labs.host.joined") : t("labs.host.sent")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {currentParticipant && (
        <div className="mb-6">
          <h2 className="labs-section-label">{t("labs.host.tastingSetup")}</h2>
          <TastingSetupSection
            tasting={tasting}
            tastingId={tastingId}
            pid={currentParticipant.id as string}
            queryClient={queryClient}
          />
        </div>
      )}

      <div className="labs-auto-grid mb-6" style={{ "--grid-min": "120px" } as React.CSSProperties}>
        <div className="labs-card p-4 text-center">
          <Wine className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" data-testid="labs-host-whisky-count">{whiskyCount}</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("tastingDetail.whiskies")}</p>
        </div>
        <div className="labs-card p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" data-testid="labs-host-participant-count">{participantCount}</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("tastingDetail.participants")}</p>
        </div>
        <div className="labs-card p-4 text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" data-testid="labs-host-rating-progress">{ratingProgress}%</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("ui.rated")}</p>
        </div>
      </div>

      {tasting.guidedMode && (
        <GuidedTastingEngine
          tasting={tasting}
          whiskies={whiskies || []}
          participants={participants || []}
          ratings={ratings || []}
          currentParticipant={currentParticipant}
          queryClient={queryClient}
          tastingId={tastingId}
        />
      )}

      {!tasting.guidedMode && (
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="labs-section-label">{t("m2.host.sessionControlsLabel", "Live Session")}</h2>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 8, marginTop: -4 }}>
            {tasting.status === "archived"
              ? t("m2.host.sessionControlsDescArchived", "This session has been archived.")
              : t("m2.host.sessionControlsDesc", "Control the tasting your guests are seeing right now.")}
          </p>
          <div className="labs-card p-4">
            <div className="flex flex-wrap gap-2">
              {tasting.status === "draft" && (
                <button
                  className="labs-btn-primary flex items-center gap-2"
                  onClick={() => statusMutation.mutate({ status: "open" })}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-start"
                >
                  <Play className="w-4 h-4" />
                  {t("m2.host.startTasting", "Start Tasting")}
                </button>
              )}
              {tasting.status === "open" && (
                <button
                  className="labs-btn-secondary flex items-center gap-2"
                  onClick={() => {
                    if (!window.confirm(t("m2.host.endSessionConfirmDesc"))) return;
                    statusMutation.mutate({ status: "closed" });
                  }}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-close"
                >
                  <Square className="w-4 h-4" />
                  {t("m2.host.endSession")}
                </button>
              )}
              {tasting.status === "closed" && (
                <>
                  <button
                    className="labs-btn-primary flex items-center gap-2"
                    onClick={() => statusMutation.mutate({ status: "open" })}
                    disabled={statusMutation.isPending}
                    data-testid="labs-host-reopen"
                  >
                    <Play className="w-4 h-4" />
                    Reopen
                  </button>
                  <button
                    className="labs-btn-ghost flex items-center gap-2"
                    onClick={() => statusMutation.mutate({ status: "archived" })}
                    disabled={statusMutation.isPending}
                    data-testid="labs-host-archive"
                  >
                    Archive
                  </button>
                </>
              )}
              {tasting.status === "reveal" && (
                <button
                  className="labs-btn-ghost flex items-center gap-2"
                  onClick={() => statusMutation.mutate({ status: "archived" })}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-archive-reveal"
                >
                  Complete & Archive
                </button>
              )}
              {tasting.status === "archived" && (
                <div className="flex items-center gap-3 w-full" data-testid="labs-host-archived-info">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--labs-text-muted)" }}>
                    <Archive className="w-4 h-4" />
                    {t("m2.host.archivedMessage", "This session has been archived.")}
                  </div>
                  <button
                    className="labs-btn-primary flex items-center gap-2 ml-auto"
                    onClick={() => statusMutation.mutate({ status: "open" })}
                    disabled={statusMutation.isPending}
                    data-testid="labs-host-reopen-archived"
                  >
                    <Play className="w-4 h-4" />
                    {t("m2.host.reopenSession", "Reopen")}
                  </button>
                </div>
              )}
              {!["draft", "open", "closed", "reveal", "archived"].includes(tasting.status) && (
                <div className="flex items-center gap-3 w-full" data-testid="labs-host-unknown-status">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--labs-text-muted)" }}>
                    <Info className="w-4 h-4" />
                    {t("m2.host.unknownStatusMessage", "Current status: {{status}}", { status: tasting.status })}
                  </div>
                  <button
                    className="labs-btn-primary flex items-center gap-2 ml-auto"
                    onClick={() => statusMutation.mutate({ status: "open" })}
                    disabled={statusMutation.isPending}
                    data-testid="labs-host-reopen-unknown"
                  >
                    <Play className="w-4 h-4" />
                    {t("m2.host.reopenSession", "Reopen")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {tasting.blindMode && (tasting.status === "open" || tasting.status === "closed" || tasting.status === "reveal") && (() => {
          const whiskyCount = (whiskies || []).length;
          const rv = getRevealState(tasting, whiskyCount, t);
          return (
            <div>
              <h2 className="labs-section-label">{t("labs.host.revealControls")}</h2>
              <div className="labs-card p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(tasting.status === "open" || tasting.status === "closed") && (
                    <button
                      className="labs-btn-secondary flex items-center gap-2"
                      onClick={() => statusMutation.mutate({ status: "reveal" })}
                      disabled={statusMutation.isPending}
                      data-testid={tasting.status === "open" ? "labs-host-reveal-mode" : "labs-host-enter-reveal"}
                    >
                      <Eye className="w-4 h-4" />
                      Enter Reveal
                    </button>
                  )}
                  {tasting.status === "reveal" && whiskyCount > 0 && (
                    <button
                      className="labs-btn-primary flex items-center gap-2"
                      onClick={() => revealMutation.mutate()}
                      disabled={revealMutation.isPending || rv.allRevealed}
                      style={{ opacity: rv.allRevealed ? 0.5 : 1 }}
                      data-testid="labs-host-reveal-next"
                    >
                      {revealMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      {t(`labs.host.${rv.nextLabelKey}`, rv.nextLabelParam ? { label: rv.nextLabelParam } : {})}
                    </button>
                  )}
                </div>

                {tasting.status === "reveal" && whiskyCount > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: "var(--labs-text-muted)" }}>
                        {rv.allRevealed ? t("labs.host.allDramsRevealed") : t("labs.host.dramOfTotal", { current: rv.revealIndex + 1, total: whiskyCount })}
                      </span>
                      <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        {t("labs.host.stepOfTotal", { current: Math.min(rv.revealStep, rv.maxSteps), total: rv.maxSteps })}
                      </span>
                    </div>
                    <div className="flex gap-1 mb-1.5">
                      {rv.stepLabels.map((label: string, idx: number) => (
                        <div
                          key={label}
                          className="flex-1 h-1.5 rounded-full"
                          style={{
                            background: idx < rv.revealStep ? "var(--labs-accent)" : "var(--labs-border)",
                            transition: "background 300ms ease",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mb-3">
                      {rv.stepLabels.map((label: string, idx: number) => (
                        <span key={label} className="text-[11px]" style={{ color: idx < rv.revealStep ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(whiskies || []).map((_: any, i: number) => {
                        const fullyDone = i < rv.revealIndex || (i === rv.revealIndex && rv.revealStep >= rv.maxSteps);
                        const isCurrent = i === rv.revealIndex && rv.revealStep < rv.maxSteps;
                        let bg = "var(--labs-border)";
                        let fg = "var(--labs-text-muted)";
                        if (fullyDone) { bg = "var(--labs-success)"; fg = "var(--labs-bg)"; }
                        else if (isCurrent) { bg = "var(--labs-accent)"; fg = "var(--labs-bg)"; }
                        return (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                            style={{ background: bg, color: fg }}
                          >
                            {fullyDone ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + i)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="labs-section-label mb-0">Whiskies ({whiskyCount})</h2>
          {tasting.status === "draft" && (
            <div className="relative">
              {(showAddWhisky || showAiImport) ? (
                <button
                  className="labs-btn-ghost flex items-center gap-1 text-xs"
                  onClick={() => { setShowAddWhisky(false); setShowAiImport(false); setShowAddPopover(false); }}
                  data-testid="labs-host-add-whisky-toggle"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              ) : (
                <button
                  className="labs-btn-ghost flex items-center gap-1 text-xs"
                  onClick={() => setShowAddPopover(!showAddPopover)}
                  data-testid="labs-host-add-whisky-toggle"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
              {showAddPopover && !showAddWhisky && !showAiImport && (<>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddPopover(false)} />
                <div
                  className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-lg z-20"
                  style={{
                    background: "var(--labs-surface-elevated)",
                    border: "1px solid var(--labs-border)",
                    minWidth: 200,
                  }}
                >
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors"
                    style={{ color: "var(--labs-text)", background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--labs-accent-muted)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => { setShowAiImport(true); setShowAddWhisky(false); setShowAddPopover(false); }}
                    data-testid="labs-host-ai-import-toggle"
                  >
                    <Sparkles className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                    {t("hostUi.aiImport")}
                  </button>
                  <div style={{ height: 1, background: "var(--labs-border)" }} />
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors"
                    style={{ color: "var(--labs-text)", background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--labs-accent-muted)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => { setShowAddWhisky(true); setShowAiImport(false); setShowAddPopover(false); }}
                    data-testid="desktop-manual-add-option"
                  >
                    <Plus className="w-4 h-4" style={{ color: "var(--labs-text-secondary)" }} />
                    {t("labs.aiImport.orManually", "or add manually").replace(/^or\s+/i, '').replace(/^\w/, (c: string) => c.toUpperCase())}
                  </button>
                </div>
              </>)}
            </div>
          )}
        </div>

        {tasting.status === "draft" && whiskyCount === 0 && !showAiImport && !showAddWhisky && !showAddPopover && (
          <div className="mb-3 text-center py-6" data-testid="desktop-empty-lineup">
            <p className="text-sm mb-4" style={{ color: "var(--labs-text-secondary)" }}>
              {t("labs.aiImport.emptyTitle", "No whiskies yet.")}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--labs-accent), color-mix(in srgb, var(--labs-accent) 80%, #000))",
                  color: "var(--labs-bg)",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => { setShowAiImport(true); setShowAddWhisky(false); }}
                data-testid="desktop-ai-import-hero"
              >
                <Sparkles className="w-4 h-4" />
                {t("hostUi.aiImport")}
              </button>
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm transition-all"
                style={{
                  background: "transparent",
                  color: "var(--labs-text-secondary)",
                  border: "1px solid var(--labs-border)",
                  cursor: "pointer",
                }}
                onClick={() => { setShowAddWhisky(true); setShowAiImport(false); }}
                data-testid="desktop-manual-add-btn"
              >
                <Plus className="w-4 h-4" />
                {t("labs.aiImport.orManually", "or add manually").replace(/^or\s+/i, '').replace(/^\w/, (c: string) => c.toUpperCase())}
              </button>
            </div>
          </div>
        )}

        {showAiImport && tasting.status === "draft" && (
          <div className="labs-card p-4 mb-3 space-y-3" data-testid="labs-ai-import-panel">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{t("hostUi.aiImport")}</span>
            </div>
            <div
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg text-sm cursor-pointer"
              style={{
                border: `2px dashed ${dragOver ? "var(--labs-accent)" : "var(--labs-border)"}`,
                color: "var(--labs-text-muted)",
                background: dragOver ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                transition: "all 0.2s",
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                if (files.length) setAiImportFiles(prev => [...prev, ...files]);
              }}
            >
              <Upload className="w-6 h-6" />
              <p>{t("labs.host.dropFiles")}</p>
              <a
                href="/CaskSense_Whisky_Import_Template.xlsx"
                download
                className="text-[10px] underline"
                style={{ color: "var(--labs-accent)", opacity: 0.7 }}
                onClick={e => e.stopPropagation()}
                data-testid="desktop-download-excel-template"
              >
                <Download className="w-3 h-3 inline mr-0.5" />
                Download Excel Template
              </a>
              <div className="flex gap-2 mt-1">
                <label className="labs-btn-ghost text-xs cursor-pointer">
                  <Camera className="w-3 h-3 inline mr-1" />
                  Camera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files) setAiImportFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                  />
                </label>
                <label className="labs-btn-ghost text-xs cursor-pointer">
                  <Upload className="w-3 h-3 inline mr-1" />
                  Browse
                  <input
                    type="file"
                    accept="image/*,.pdf,.csv,.txt,.xlsx"
                    multiple
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files) setAiImportFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                  />
                </label>
              </div>
            </div>
            {aiImportFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {aiImportFiles.map((f, i) => (
                  isImageFile(f) ? (
                    <FileThumbnail
                      key={i}
                      file={f}
                      onRemove={() => setAiImportFiles(prev => prev.filter((_, j) => j !== i))}
                      testId={`desktop-ai-file-${i}`}
                    />
                  ) : (
                    <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 30%, transparent)" }} title={f.name} data-testid={`desktop-ai-file-${i}`}>
                      <FileIcon file={f} className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{f.name}</span>
                      <span className="text-xs opacity-70">{formatFileSize(f.size)}</span>
                      <button onClick={() => setAiImportFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )
                ))}
              </div>
            )}
            <textarea
              className="labs-input w-full"
              rows={2}
              placeholder={t("labs.host.pasteText")}
              value={aiImportText}
              onChange={e => setAiImportText(e.target.value)}
              style={{ resize: "vertical" }}
              data-testid="labs-ai-import-text"
            />
            <div className="flex gap-2 justify-end">
              <button className="labs-btn-ghost text-sm" onClick={() => { setShowAiImport(false); setAiImportFiles([]); setAiImportText(""); setAiImportResults([]); setAiImportError(""); setAiImportSummary(null); }}>{t("m2.host.cancel")}</button>
              <button
                className="labs-btn-primary text-sm flex items-center gap-1.5"
                onClick={handleAiImport}
                disabled={aiImportLoading || (aiImportFiles.length === 0 && !aiImportText.trim())}
                data-testid="labs-ai-import-analyze"
              >
                {aiImportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : aiImportFiles.some(isExcelFile) ? <Upload className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiImportLoading ? t("labs.host.importingEllipsis") : aiImportFiles.some(isExcelFile) ? t("labs.host.importExcel") : t("labs.host.analyze")}
              </button>
            </div>

            {aiImportError && (
              <div className="text-xs p-2 rounded-lg mt-2" style={{ background: "color-mix(in srgb, var(--labs-danger) 15%, transparent)", color: "var(--labs-danger)" }} data-testid="labs-ai-import-error">
                {aiImportError}
              </div>
            )}

            {aiImportSummary && (
              <div className="text-xs p-3 rounded-lg space-y-1 mt-2" style={{ background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 20%, transparent)" }} data-testid="labs-ai-import-summary">
                {aiImportSummary.added > 0 && <p style={{ color: "var(--labs-success)", margin: 0 }}>{aiImportSummary.added} {t("labs.aiImport.added", "added")}</p>}
                {aiImportSummary.duplicatesAdded > 0 && <p style={{ color: "var(--labs-warning, var(--labs-text-muted))", margin: 0 }}>{aiImportSummary.duplicatesAdded} {t("labs.aiImport.duplicatesAdded", "duplicates added")}</p>}
                {aiImportSummary.duplicatesSkipped > 0 && <p style={{ color: "var(--labs-text-muted)", margin: 0 }}>{aiImportSummary.duplicatesSkipped} {t("labs.aiImport.duplicatesSkipped", "duplicates skipped")}</p>}
                {aiImportSummary.failed > 0 && <p style={{ color: "var(--labs-danger)", margin: 0 }}>{aiImportSummary.failed} {t("labs.aiImport.failed", "failed")}</p>}
              </div>
            )}

            {aiImportResults.length > 0 && (() => {
              const dupeIndices = getDesktopDuplicateIndices();
              const nonDupeCount = aiImportResults.length - dupeIndices.size;
              return (
              <div className="space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>
                    {t("labs.aiImport.found", "Found {{count}}", { count: aiImportResults.length })}
                    {dupeIndices.size > 0 && <span style={{ color: "var(--labs-text-muted)" }}> ({dupeIndices.size} {t("labs.aiImport.alreadyInLineup", "already in lineup")})</span>}
                  </span>
                  <button
                    className="labs-btn-ghost text-xs"
                    onClick={() => {
                      if (aiImportSelected.size === nonDupeCount && nonDupeCount > 0) {
                        setAiImportSelected(new Set());
                      } else {
                        setAiImportSelected(new Set(aiImportResults.map((_, i) => i).filter(i => !dupeIndices.has(i))));
                      }
                    }}
                    data-testid="labs-ai-import-select-all"
                  >
                    {aiImportSelected.size === nonDupeCount && nonDupeCount > 0 ? t("labs.aiImport.deselectAll", "Deselect All") : t("labs.aiImport.selectNew", "Select New")}
                  </button>
                </div>
                {aiImportResults.map((w: any, i: number) => {
                  const isDupe = dupeIndices.has(i);
                  return (
                  <label
                    key={i}
                    className="labs-card p-3 flex items-center gap-3 cursor-pointer"
                    style={{ opacity: aiImportSelected.has(i) ? 1 : isDupe ? 0.4 : 0.5 }}
                  >
                    <input
                      type="checkbox"
                      checked={aiImportSelected.has(i)}
                      onChange={() => {
                        const s = new Set(aiImportSelected);
                        s.has(i) ? s.delete(i) : s.add(i);
                        setAiImportSelected(s);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium" style={{ margin: 0 }}>{w.name}</p>
                        {isDupe && <span className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--labs-warning, #f59e0b) 20%, transparent)", color: "var(--labs-warning, #f59e0b)", whiteSpace: "nowrap" }} data-testid={`labs-ai-dupe-badge-${i}`}>{t("labs.aiImport.duplicate", "duplicate")}</span>}
                      </div>
                      <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null, w.country].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </label>
                  );
                })}
                <button
                  className="labs-btn-primary w-full text-sm"
                  onClick={handleAiImportConfirm}
                  disabled={aiImportSelected.size === 0}
                  data-testid="labs-ai-import-confirm"
                >
                  {t("labs.aiImport.addCount", "Add {{count}} Whiskies", { count: aiImportSelected.size })}
                </button>
              </div>
              );
            })()}
          </div>
        )}

        {showAddWhisky && tasting.status === "draft" && (
          <div className="labs-card p-4 mb-3 space-y-3">
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1" style={{ position: "relative" }}>
                <input
                  className="labs-input"
                  placeholder={t("labs.host.wbPlaceholder")}
                  value={wbLookupId}
                  onChange={e => { setWbLookupId(e.target.value.replace(/[^0-9]/g, "")); setWbLookupResult(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && wbLookupId.trim()) handleWbLookup(wbLookupId, "add"); }}
                  style={{ width: 80, fontSize: 13, textAlign: "center" }}
                  data-testid="labs-wb-lookup-input"
                />
                <button
                  className="labs-btn-ghost p-1.5"
                  onClick={() => handleWbLookup(wbLookupId, "add")}
                  disabled={!wbLookupId.trim() || wbLookupLoading}
                  title={t("labs.host.wbLookup")}
                  data-testid="labs-wb-lookup-btn"
                  style={{ color: wbLookupResult === "ok" ? "var(--labs-success)" : wbLookupResult && wbLookupResult !== "ok" ? "var(--labs-danger)" : "var(--labs-accent)" }}
                >
                  {wbLookupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : wbLookupResult === "ok" ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                </button>
              </div>
              <input
                className="labs-input flex-1"
                placeholder={t("labs.host.whiskyNamePlaceholder")}
                value={newWhiskyName}
                onChange={(e) => setNewWhiskyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !showExtendedFields && handleAddWhisky()}
                data-testid="labs-host-whisky-name-input"
              />
              <button
                className="labs-btn-ghost text-xs"
                onClick={() => setShowExtendedFields(!showExtendedFields)}
                data-testid="labs-host-toggle-extended"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                className="labs-btn-primary px-4"
                onClick={handleAddWhisky}
                disabled={!newWhiskyName.trim() || addWhiskyMutation.isPending || extAddPending}
                data-testid="labs-host-whisky-add-btn"
              >
                {(addWhiskyMutation.isPending || extAddPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </button>
            </div>
            {wbLookupResult && wbLookupResult !== "ok" && (
              <p className="text-xs" style={{ color: "var(--labs-danger)", margin: 0 }}>
                {wbLookupResult === "not_found" ? "Whiskybase ID not found" : wbLookupResult === "rate_limit" ? "Too many lookups, please wait" : wbLookupResult === "invalid" ? "Invalid Whiskybase ID" : "Lookup failed"}
              </p>
            )}
            {showExtendedFields && (
              <div className="grid grid-cols-2 gap-2">
                <input className="labs-input" placeholder={t("labs.host.fieldDistillery")} value={extFields.distillery || ""} onChange={e => setExtFields({ ...extFields, distillery: e.target.value })} data-testid="labs-ext-distillery" />
                <input className="labs-input" placeholder={t("m2.host.abvLabel")} value={extFields.abv || ""} onChange={e => setExtFields({ ...extFields, abv: e.target.value })} data-testid="labs-ext-abv" />
                <input className="labs-input" placeholder={t("m2.host.caskTypeLabel")} value={extFields.caskType || ""} onChange={e => setExtFields({ ...extFields, caskType: e.target.value })} data-testid="labs-ext-cask" />
                <input className="labs-input" placeholder={t("labs.host.fieldAge")} value={extFields.age || ""} onChange={e => setExtFields({ ...extFields, age: e.target.value })} data-testid="labs-ext-age" />
                <input className="labs-input" placeholder={t("labs.host.fieldCategory")} value={extFields.category || ""} onChange={e => setExtFields({ ...extFields, category: e.target.value })} data-testid="labs-ext-category" />
                <input className="labs-input" placeholder={t("labs.host.fieldCountry")} value={extFields.country || ""} onChange={e => setExtFields({ ...extFields, country: e.target.value })} data-testid="labs-ext-country" />
                <input className="labs-input" placeholder={t("labs.host.fieldRegion")} value={extFields.region || ""} onChange={e => setExtFields({ ...extFields, region: e.target.value })} data-testid="labs-ext-region" />
                <input className="labs-input" placeholder={t("labs.host.fieldBottler")} value={extFields.bottler || ""} onChange={e => setExtFields({ ...extFields, bottler: e.target.value })} data-testid="labs-ext-bottler" />
                <input className="labs-input" placeholder={t("labs.host.fieldDistilled")} value={extFields.distilledYear || ""} onChange={e => setExtFields({ ...extFields, distilledYear: e.target.value })} data-testid="labs-ext-distilled" />
                <input className="labs-input" placeholder={t("labs.host.fieldBottled")} value={extFields.bottledYear || ""} onChange={e => setExtFields({ ...extFields, bottledYear: e.target.value })} data-testid="labs-ext-bottled" />
                <input className="labs-input" placeholder={t("labs.host.fieldPriceEur")} value={extFields.price || ""} onChange={e => setExtFields({ ...extFields, price: e.target.value })} data-testid="labs-ext-price" />
                <input className="labs-input" placeholder={t("labs.host.fieldPeat")} value={extFields.peatLevel || ""} onChange={e => setExtFields({ ...extFields, peatLevel: e.target.value })} data-testid="labs-ext-peat" />
                <input className="labs-input" placeholder={t("labs.host.fieldPpm")} value={extFields.ppm || ""} onChange={e => setExtFields({ ...extFields, ppm: e.target.value })} data-testid="labs-ext-ppm" />
                <select className="labs-input col-span-2" value={extFields.flavorProfile || "auto"} onChange={e => setExtFields({ ...extFields, flavorProfile: e.target.value })} data-testid="labs-ext-flavor-profile" style={{ fontSize: 13 }}>
                  <option value="auto">{`${t("labs.host.flavorAuto")}${(() => { const d = detectFlavorProfile({ region: extFields.region, peatLevel: extFields.peatLevel, caskInfluence: extFields.caskType }); const lbl = d ? FLAVOR_PROFILES.find(p => p.id === d)?.en : null; return lbl ? ` (${t("labs.host.flavorAutoDetected", { label: lbl })})` : ""; })()}`}</option>
                  <option value="none">{t("labs.host.flavorNone")}</option>
                  {FLAVOR_PROFILES.map(fp => <option key={fp.id} value={fp.id}>{fp.en}</option>)}
                </select>
                <textarea className="labs-input col-span-2" rows={2} placeholder={t("labs.host.hostSummaryPlaceholder")} value={extFields.hostSummary || ""} onChange={e => setExtFields({ ...extFields, hostSummary: e.target.value })} style={{ resize: "vertical" }} data-testid="labs-ext-summary" />
                <textarea className="labs-input col-span-2" rows={2} placeholder={t("labs.host.notesPlaceholder")} value={extFields.notes || ""} onChange={e => setExtFields({ ...extFields, notes: e.target.value })} style={{ resize: "vertical" }} data-testid="labs-ext-notes" />
                <div className="col-span-2">
                  <WhiskyImageUpload
                    imageUrl={extImagePreview}
                    onFileSelected={(file) => {
                      setExtImageFile(file);
                      setExtImagePreview(URL.createObjectURL(file));
                    }}
                    onImageDeleted={() => {
                      setExtImageFile(null);
                      setExtImagePreview(null);
                    }}
                    variant="labs"
                    size="sm"
                    testIdPrefix="labs-ext-image"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {(() => {
          const rvDesktop = tasting.blindMode && !tasting.guidedMode && tasting.status === "reveal"
            ? getRevealState(tasting, whiskyCount, t) : null;
          return whiskyCount === 0 ? (
          <div className="labs-card p-6 text-center">
            <Wine className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--labs-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--labs-text-secondary)" }}>
              No whiskies added yet
            </p>
          </div>
        ) : (
          <div className="space-y-2" ref={whiskyListRef}>
            {whiskies?.map((w: any, i: number) => {
              const whiskyRatings = ratings?.filter((r: any) => r.whiskyId === w.id) || [];
              const avgScore = whiskyRatings.length > 0
                ? Math.round(whiskyRatings.reduce((sum: number, r: any) => sum + (r.overall || 0), 0) / whiskyRatings.length)
                : null;
              const rvRevealed = !rvDesktop || i < rvDesktop.revealIndex || (i === rvDesktop.revealIndex && rvDesktop.revealStep >= rvDesktop.maxSteps);
              const rvActive = rvDesktop && i === rvDesktop.revealIndex && rvDesktop.revealStep < rvDesktop.maxSteps;
              const rvHidden = rvDesktop && !rvRevealed && !rvActive;
              const itemRvD = rvActive ? rvDesktop : null;
              const rvShowName = rvRevealed || isFieldRevealed(itemRvD, "name");
              const rvShowDetails = rvRevealed || isFieldRevealed(itemRvD, ["distillery", "age", "abv"]);

              if (editingWhiskyId === w.id) {
                return (
                  <div key={w.id} className="labs-card p-4 space-y-2" data-testid={`labs-host-whisky-edit-${w.id}`}>
                    <div className="flex gap-2 items-center mb-2">
                      <input
                        className="labs-input"
                        placeholder={t("labs.host.wbPlaceholder")}
                        value={editWbLookupId}
                        onChange={e => { setEditWbLookupId(e.target.value.replace(/[^0-9]/g, "")); setEditWbLookupResult(""); }}
                        onKeyDown={e => { if (e.key === "Enter" && editWbLookupId.trim()) handleWbLookup(editWbLookupId, "edit"); }}
                        style={{ width: 80, fontSize: 13, textAlign: "center" }}
                        data-testid="labs-edit-wb-lookup-input"
                      />
                      <button
                        className="labs-btn-ghost p-1.5"
                        onClick={() => handleWbLookup(editWbLookupId, "edit")}
                        disabled={!editWbLookupId.trim() || editWbLookupLoading}
                        title={t("labs.host.wbLookup")}
                        data-testid="labs-edit-wb-lookup-btn"
                        style={{ color: editWbLookupResult === "ok" ? "var(--labs-success)" : editWbLookupResult && editWbLookupResult !== "ok" ? "var(--labs-danger)" : "var(--labs-accent)" }}
                      >
                        {editWbLookupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editWbLookupResult === "ok" ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      </button>
                      {editWbLookupResult && editWbLookupResult !== "ok" && (
                        <span className="text-xs" style={{ color: "var(--labs-danger)" }}>
                          {editWbLookupResult === "not_found" ? "Not found" : editWbLookupResult === "rate_limit" ? "Rate limit" : editWbLookupResult === "invalid" ? "Invalid ID" : "Failed"}
                        </span>
                      )}
                      <span className="text-xs flex-1" style={{ color: "var(--labs-text-muted)", textAlign: "right" }}>Whiskybase Lookup</span>
                    </div>
                    {editWbLookupId.trim() && (
                      <div className="flex items-center gap-2" style={{ marginTop: 4, marginBottom: 4 }}>
                        <button
                          className="labs-btn-ghost text-xs"
                          disabled={editWbFetchImageLoading || !editWbLookupId.trim()}
                          onClick={async () => {
                            setEditWbFetchImageLoading(true);
                            setEditWbFetchImageResult("");
                            try {
                              const res = await fetch(`/api/whiskies/${w.id}/fetch-whiskybase-image`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ whiskybaseId: editWbLookupId.trim() }),
                              });
                              if (res.ok) {
                                setEditWbFetchImageResult("ok");
                                queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
                              } else {
                                const data = await res.json().catch(() => ({}));
                                setEditWbFetchImageResult(data.message || "Failed");
                              }
                            } catch {
                              setEditWbFetchImageResult("Network error");
                            } finally {
                              setEditWbFetchImageLoading(false);
                            }
                          }}
                          data-testid="labs-edit-wb-fetch-image-btn"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "4px 10px", borderRadius: 6,
                            border: `1px solid ${editWbFetchImageResult === "ok" ? "var(--labs-success)" : "var(--labs-accent)"}`,
                            color: editWbFetchImageResult === "ok" ? "var(--labs-success)" : "var(--labs-accent)",
                          }}
                        >
                          {editWbFetchImageLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : editWbFetchImageResult === "ok" ? <Check className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                          Bild von Whiskybase laden
                        </button>
                        {editWbFetchImageResult && editWbFetchImageResult !== "ok" && (
                          <span className="text-xs" style={{ color: "var(--labs-danger)" }}>{editWbFetchImageResult}</span>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input className="labs-input col-span-2" placeholder={t("labs.host.fieldName")} value={editFields.name || ""} onChange={e => setEditFields({ ...editFields, name: e.target.value })} data-testid="labs-edit-whisky-name" />
                      <input className="labs-input" placeholder={t("labs.host.fieldDistillery")} value={editFields.distillery || ""} onChange={e => setEditFields({ ...editFields, distillery: e.target.value })} />
                      <input className="labs-input" placeholder={t("m2.host.abvLabel")} value={editFields.abv || ""} onChange={e => setEditFields({ ...editFields, abv: e.target.value })} />
                      <input className="labs-input" placeholder={t("m2.host.caskTypeLabel")} value={editFields.caskType || ""} onChange={e => setEditFields({ ...editFields, caskType: e.target.value })} />
                      <input className="labs-input" placeholder={t("labs.host.fieldAge")} value={editFields.age || ""} onChange={e => setEditFields({ ...editFields, age: e.target.value })} />
                      <input className="labs-input" placeholder={t("labs.host.fieldCategory")} value={editFields.category || ""} onChange={e => setEditFields({ ...editFields, category: e.target.value })} />
                      <input className="labs-input" placeholder={t("labs.host.fieldCountry")} value={editFields.country || ""} onChange={e => setEditFields({ ...editFields, country: e.target.value })} />
                      <input className="labs-input" placeholder={t("labs.host.fieldRegion")} value={editFields.region || ""} onChange={e => setEditFields({ ...editFields, region: e.target.value })} />
                      <input className="labs-input" placeholder={t("labs.host.fieldBottler")} value={editFields.bottler || ""} onChange={e => setEditFields({ ...editFields, bottler: e.target.value })} />
                      <input className="labs-input" placeholder={t("labs.host.fieldDistilled")} value={editFields.distilledYear || ""} onChange={e => setEditFields({ ...editFields, distilledYear: e.target.value })} data-testid="labs-edit-distilled" />
                      <input className="labs-input" placeholder={t("labs.host.fieldBottled")} value={editFields.bottledYear || ""} onChange={e => setEditFields({ ...editFields, bottledYear: e.target.value })} data-testid="labs-edit-bottled" />
                      <input className="labs-input" placeholder={t("labs.host.fieldPriceEur")} value={editFields.price || ""} onChange={e => setEditFields({ ...editFields, price: e.target.value })} />
                      <select className="labs-input col-span-2" value={editFields.flavorProfile || "auto"} onChange={e => setEditFields({ ...editFields, flavorProfile: e.target.value })} data-testid="labs-edit-flavor-profile" style={{ fontSize: 13 }}>
                        <option value="auto">{`${t("labs.host.flavorAuto")}${(() => { const d = detectFlavorProfile({ region: editFields.region, peatLevel: editFields.peatLevel, caskInfluence: editFields.caskType }); const lbl = d ? FLAVOR_PROFILES.find(p => p.id === d)?.en : null; return lbl ? ` (${t("labs.host.flavorAutoDetected", { label: lbl })})` : ""; })()}`}</option>
                        <option value="none">{t("labs.host.flavorNone")}</option>
                        {FLAVOR_PROFILES.map(fp => <option key={fp.id} value={fp.id}>{fp.en}</option>)}
                      </select>
                      <textarea className="labs-input col-span-2" rows={2} placeholder={t("labs.host.hostSummaryPlaceholder")} value={editFields.hostSummary || ""} onChange={e => setEditFields({ ...editFields, hostSummary: e.target.value })} style={{ resize: "vertical" }} />
                      <textarea className="labs-input col-span-2" rows={2} placeholder={t("labs.host.notesPlaceholder")} value={editFields.notes || ""} onChange={e => setEditFields({ ...editFields, notes: e.target.value })} style={{ resize: "vertical" }} />
                    </div>
                    <WhiskyImageUpload
                      whiskyId={w.id}
                      tastingId={tastingId}
                      imageUrl={w.imageUrl}
                      variant="labs"
                      size="sm"
                      testIdPrefix={`labs-edit-image-${w.id}`}
                    />
                    <div className="flex gap-2 justify-end">
                      <button className="labs-btn-ghost text-sm" onClick={() => setEditingWhiskyId(null)}>{t("labs.host.cancel")}</button>
                      <button className="labs-btn-primary text-sm" onClick={() => handleSaveEditWhisky(w.id)} disabled={updateWhiskyMutation.isPending} data-testid="labs-edit-whisky-save">
                        {updateWhiskyMutation.isPending ? t("labs.host.saving") : t("labs.host.save")}
                      </button>
                    </div>
                  </div>
                );
              }

              const isDragging = dragActiveIdx === i;
              return (
                <div
                  key={w.id}
                  className="labs-card p-4"
                  style={{
                    opacity: rvHidden ? 0.4 : isDragging ? 0.6 : 1,
                    transition: "opacity 300ms, transform 150ms",
                    transform: isDragging ? "scale(0.98)" : undefined,
                  }}
                  data-testid={`labs-host-whisky-${w.id}`}
                  data-whisky-drag-idx={i}
                  draggable={tasting.status === "draft"}
                  onDragStart={(e) => { dragState.current = { dragIdx: i, overIdx: i }; setDragActiveIdx(i); e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(e) => { e.preventDefault(); if (dragState.current) dragState.current.overIdx = i; }}
                  onDragEnd={commitDrag}
                >
                  <div className="flex items-center gap-3">
                    {tasting.status === "draft" && (
                      <div
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                        style={{ color: "var(--labs-text-muted)", touchAction: "none" }}
                        onTouchStart={(e) => handleTouchStart(i, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        data-testid={`labs-host-drag-handle-${w.id}`}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    {w.imageUrl && rvShowDetails ? (
                      <img
                        src={w.imageUrl}
                        alt={w.name}
                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: rvRevealed && rvDesktop ? "var(--labs-success-muted)" : rvActive ? "var(--labs-info-muted)" : "var(--labs-accent-muted)",
                          color: rvRevealed && rvDesktop ? "var(--labs-success)" : rvActive ? "var(--labs-info)" : "var(--labs-accent)",
                        }}
                      >
                        {rvRevealed && rvDesktop ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rvShowName ? (w.name || `Whisky ${i + 1}`) : `Dram ${i + 1}`}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                        {rvShowDetails
                          ? ([w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null, w.country, w.caskType].filter(Boolean).join(" · ") || t("labs.host.noAdditionalDetails"))
                          : (rvHidden ? t("m2.host.hidden", "Hidden") : rvActive ? t("m2.host.partiallyRevealed", "Partially revealed") : t("labs.host.noAdditionalDetails"))}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      {isDramLocked(w.id) && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)" }} data-testid={`desktop-badge-locked-${w.id}`}>
                          <Lock className="w-2.5 h-2.5 inline mr-0.5" style={{ verticalAlign: "-1px" }} />{t("m2.host.lockedBadge", "Locked")}
                        </span>
                      )}
                      {rvActive && !isDramLocked(w.id) && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-info-muted)", color: "var(--labs-info)" }}>
                          Active
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        {whiskyRatings.length}/{participantCount} rated
                      </span>
                      {avgScore !== null && (
                        <span className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
                          {avgScore}
                        </span>
                      )}
                      {tasting.status !== "draft" && (
                        <button
                          className="labs-btn-ghost p-1"
                          onClick={() => toggleDramLock(w.id)}
                          data-testid={`desktop-lock-toggle-${w.id}`}
                          title={isDramLocked(w.id) ? t("m2.host.unlockDram", "Tap to Unlock") : t("m2.host.lockDram", "Lock Current Dram")}
                        >
                          <Lock className="w-3.5 h-3.5" style={{ color: isDramLocked(w.id) ? "var(--labs-success)" : "var(--labs-text-muted)" }} />
                        </button>
                      )}
                      {tasting.status === "draft" && (
                        <>
                          <label className="labs-btn-ghost p-1 cursor-pointer" data-testid={`labs-host-upload-img-${w.id}`} title={t("common.uploadRightsHint")}>
                            <Image className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleWhiskyImageUpload(w.id, e.target.files[0]); }} />
                          </label>
                          <button
                            className="labs-btn-ghost p-1"
                            onClick={() => startEditWhisky(w)}
                            data-testid={`labs-host-edit-whisky-${w.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                          </button>
                          <button
                            className="labs-btn-ghost p-1"
                            onClick={() => deleteWhiskyMutation.mutate(w.id)}
                            data-testid={`labs-host-delete-whisky-${w.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex sm:hidden items-center gap-2 mt-2" style={{ flexWrap: "wrap", paddingLeft: tasting.status === "draft" ? 72 : 44 }}>
                    {isDramLocked(w.id) && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)" }} data-testid={`mobile-badge-locked-${w.id}`}>
                        <Lock className="w-2.5 h-2.5 inline mr-0.5" style={{ verticalAlign: "-1px" }} />{t("m2.host.lockedBadge", "Locked")}
                      </span>
                    )}
                    {rvActive && !isDramLocked(w.id) && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-info-muted)", color: "var(--labs-info)" }}>
                        Active
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {whiskyRatings.length}/{participantCount} rated
                    </span>
                    {avgScore !== null && (
                      <span className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
                        {avgScore}
                      </span>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      {tasting.status !== "draft" && (
                        <button
                          className="labs-btn-ghost p-1"
                          onClick={() => toggleDramLock(w.id)}
                          data-testid={`mobile-lock-toggle-${w.id}`}
                          title={isDramLocked(w.id) ? t("m2.host.unlockDram", "Tap to Unlock") : t("m2.host.lockDram", "Lock Current Dram")}
                        >
                          <Lock className="w-3.5 h-3.5" style={{ color: isDramLocked(w.id) ? "var(--labs-success)" : "var(--labs-text-muted)" }} />
                        </button>
                      )}
                      {tasting.status === "draft" && (
                        <>
                          <label className="labs-btn-ghost p-1 cursor-pointer" data-testid={`mobile-upload-img-${w.id}`} title={t("common.uploadRightsHint")}>
                            <Image className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleWhiskyImageUpload(w.id, e.target.files[0]); }} />
                          </label>
                          <button
                            className="labs-btn-ghost p-1"
                            onClick={() => startEditWhisky(w)}
                            data-testid={`mobile-edit-whisky-${w.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                          </button>
                          <button
                            className="labs-btn-ghost p-1"
                            onClick={() => deleteWhiskyMutation.mutate(w.id)}
                            data-testid={`mobile-delete-whisky-${w.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
        })()}
      </div>

      {participantCount > 0 && !tasting.guidedMode && (
        <ParticipantStatusSection
          participants={participants}
          ratings={ratings}
          whiskies={whiskies}
          whiskyCount={whiskyCount}
          tasting={tasting}
        />
      )}

      {currentParticipant && whiskyCount > 0 && (
        <div className="mt-6 mb-6">
          <h2 className="labs-section-label">{t("labs.host.hostRating")}</h2>
          <HostRatingPanel
            whiskies={whiskies}
            tastingId={tastingId}
            participantId={currentParticipant.id}
            ratingScale={tasting.ratingScale ?? 100}
            blindMode={!!tasting.blindMode}
          />
        </div>
      )}

      {(tasting.status === "closed" || tasting.status === "archived") && (
        <div className="mb-6">
          <h2 className="labs-section-label">{t("labs.host.aiNarrative")}</h2>
          <div className="labs-card p-4">
            {tasting.aiNarrative || aiNarrative ? (
              <div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--labs-text)", lineHeight: 1.7 }} data-testid="labs-host-narrative-text">
                  {aiNarrative || (tasting.aiNarrative as string)}
                </p>
                <button
                  className="labs-btn-ghost text-xs mt-3 flex items-center gap-1.5"
                  onClick={handleGenerateNarrative}
                  disabled={narrativeLoading}
                  data-testid="labs-host-regenerate-narrative"
                >
                  {narrativeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Regenerate
                </button>
              </div>
            ) : (
              <div className="text-center py-3">
                <Sparkles className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--labs-accent)" }} />
                <p className="text-sm mb-3" style={{ color: "var(--labs-text-muted)" }}>
                  Generate an AI summary of this tasting session
                </p>
                <button
                  className="labs-btn-primary text-sm flex items-center gap-1.5 mx-auto"
                  onClick={handleGenerateNarrative}
                  disabled={narrativeLoading}
                  data-testid="labs-host-generate-narrative"
                >
                  {narrativeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {narrativeLoading ? t("labs.host.generatingEllipsis") : t("labs.host.generateNarrative")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {(tasting.status === "archived" || tasting.status === "completed" || tasting.status === "closed") && (whiskies?.length || 0) > 0 && (
        <div className="mb-4">
          <button
            className="labs-btn-primary flex items-center gap-2 w-full justify-center"
            onClick={() => navigate(`/labs/results/${tastingId}/present`)}
            data-testid="labs-host-present-results"
          >
            <Monitor className="w-4 h-4" />
            Present Results
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <button
          className="labs-btn-secondary flex items-center gap-2 flex-1"
          onClick={() => navigate(`/labs/results/${tastingId}`)}
          data-testid="labs-host-view-results"
        >
          <BarChart3 className="w-4 h-4" />
          View Results
        </button>
        <button
          className="labs-btn-secondary flex items-center gap-2 flex-1"
          onClick={() => navigate(`/labs/live/${tastingId}`)}
          data-testid="labs-host-join-live"
        >
          <Play className="w-4 h-4" />
          Join as Participant
        </button>
      </div>

      {currentParticipant && (
        <div className="mb-6">
          <h2 className="labs-section-label">{t("labs.host.tools")}</h2>
          <div className="labs-card p-4 space-y-3">
            {whiskyCount > 0 && (
              <PrintMaterialsSection
                tasting={tasting}
                whiskies={whiskies || []}
                participants={participants || []}
                currentParticipant={currentParticipant}
                navigate={navigate}
                tastingId={tastingId}
              />
            )}

            <button
              className="labs-btn-secondary w-full flex items-center justify-center gap-2"
              onClick={async () => {
                setTopDuplicating(true);
                try {
                  const pid = currentParticipant.id;
                  const newTasting = await tastingApi.duplicate(tastingId, pid);
                  if (newTasting?.id) navigate(`/labs/tastings/${newTasting.id}`);
                } catch {}
                setTopDuplicating(false);
              }}
              disabled={topDuplicating}
              data-testid="labs-host-duplicate"
            >
              <Copy className="w-4 h-4" />
              {topDuplicating ? t("labs.host.duplicating") : t("labs.host.duplicateTasting")}
            </button>

            <button
              className="labs-btn-secondary w-full flex items-center justify-center gap-2"
              onClick={() => { setShowDesktopTransfer(!showDesktopTransfer); setDesktopTransferTargetId(null); }}
              data-testid="labs-host-transfer-host"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {t("labs.host.transferHost")}
            </button>

            {showDesktopTransfer && (
              <div
                className="p-3 rounded-lg space-y-2"
                style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }}
                data-testid="labs-desktop-transfer-panel"
              >
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                  {t("labs.host.transferHostDesc")}
                </p>
                {desktopTransferGuests.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    {t("labs.host.noOtherParticipants")}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {desktopTransferGuests.map((tp: { participant: { id: string; name: string } }) => (
                      <label
                        key={tp.participant.id}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer"
                        style={{
                          background: desktopTransferTargetId === tp.participant.id ? "var(--labs-surface-elevated)" : "transparent",
                          border: desktopTransferTargetId === tp.participant.id ? "1px solid var(--labs-accent)" : "1px solid transparent",
                        }}
                        data-testid={`labs-desktop-transfer-target-${tp.participant.id}`}
                      >
                        <input
                          type="radio"
                          name="desktopTransferTarget"
                          checked={desktopTransferTargetId === tp.participant.id}
                          onChange={() => setDesktopTransferTargetId(tp.participant.id)}
                          style={{ accentColor: "var(--labs-accent)" }}
                        />
                        <span className="text-sm" style={{ color: "var(--labs-text)" }}>
                          {stripGuestSuffix(tp.participant?.name || t("labs.host.anonymous"))}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {desktopTransferError && (
                  <p className="text-xs" style={{ color: "var(--labs-danger, #e74c3c)" }} data-testid="labs-desktop-transfer-error">
                    {desktopTransferError}
                  </p>
                )}
                {desktopTransferTargetId && (
                  <div className="flex gap-2 pt-1">
                    <button
                      className="labs-btn-primary text-sm flex-1"
                      onClick={handleDesktopTransferHost}
                      disabled={desktopTransferring}
                      data-testid="labs-desktop-transfer-confirm"
                    >
                      {desktopTransferring ? t("labs.host.transferring") : t("labs.host.transferHost")}
                    </button>
                    <button
                      className="labs-btn-ghost text-sm"
                      onClick={() => { setShowDesktopTransfer(false); setDesktopTransferTargetId(null); setDesktopTransferError(null); }}
                      data-testid="labs-desktop-transfer-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {currentParticipant && (
        <div className="mb-6">
          <h2 className="labs-section-label" style={{ color: "var(--labs-danger, #e74c3c)" }}>Danger Zone</h2>
          <div className="labs-card p-4" style={{ border: "1px solid color-mix(in srgb, var(--labs-danger, #e74c3c) 25%, transparent)" }}>
            {!desktopConfirmDelete ? (
              <button
                className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg cursor-pointer"
                style={{
                  background: "none",
                  color: "var(--labs-danger, #e74c3c)",
                  border: "1px solid color-mix(in srgb, var(--labs-danger, #e74c3c) 40%, transparent)",
                }}
                onClick={() => setDesktopConfirmDelete(true)}
                data-testid="labs-desktop-delete"
              >
                <Trash2 className="w-4 h-4" />
                Delete Tasting
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg cursor-pointer"
                  style={{ background: "var(--labs-danger, #e74c3c)", color: "#fff", border: "none" }}
                  onClick={async () => {
                    try {
                      await tastingApi.updateStatus(tastingId, "deleted", undefined, currentParticipant.id);
                      navigate("/labs/tastings");
                    } catch (e: any) {
                      console.error("Delete failed:", e);
                    }
                  }}
                  data-testid="labs-desktop-confirm-delete"
                >
                  Yes, Delete
                </button>
                <button
                  className="flex-1 py-2.5 text-sm rounded-lg cursor-pointer"
                  style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text)", border: "none" }}
                  onClick={() => setDesktopConfirmDelete(false)}
                  data-testid="labs-desktop-cancel-delete"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HostPreview() {
  const { t } = useTranslation();
  const { openAuthDialog } = useAppStore();
  const goBack = useLabsBack("/labs/tastings");

  return (
    <div className="labs-page labs-fade-in">
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-host-preview-back"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("common.back", "Back")}
      </button>

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Crown className="w-10 h-10" style={{ color: "var(--labs-accent)", marginBottom: 12 }} />
        <h1 className="labs-serif" style={{ fontSize: 22, color: "var(--labs-text)", marginBottom: 6 }} data-testid="text-preview-host-title">
          {t("authGate.preview.hostWelcome", "Host your own tasting")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", maxWidth: 380, margin: "0 auto" }}>
          {t("authGate.preview.hostSubtitle", "Invite friends, set up a blind tasting, and compare your ratings live.")}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {[
          { icon: <Sparkles className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />, titleKey: "hostFeature1Title", descKey: "hostFeature1Desc", titleFb: "Set up in seconds", descFb: "Add your whiskies, share the invite code -- done." },
          { icon: <BarChart3 className="w-5 h-5" style={{ color: "var(--labs-success, #4ade80)" }} />, titleKey: "hostFeature2Title", descKey: "hostFeature2Desc", titleFb: "Live ratings", descFb: "See your guests' scores and aromas in real time." },
          { icon: <FileText className="w-5 h-5" style={{ color: "var(--labs-info, #60a5fa)" }} />, titleKey: "hostFeature3Title", descKey: "hostFeature3Desc", titleFb: "Results & export", descFb: "PDF summary, CSV data, and a shareable results page." },
        ].map((feat, i) => (
          <div
            key={i}
            className={`labs-card labs-fade-in labs-stagger-${i + 1}`}
            style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: 16 }}
            data-testid={`card-host-feature-${i}`}
          >
            <div style={{ flexShrink: 0, marginTop: 2 }}>{feat.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", marginBottom: 3 }}>
                {t(`authGate.preview.${feat.titleKey}`, feat.titleFb)}
              </div>
              <div style={{ fontSize: 13, color: "var(--labs-text-secondary)" }}>
                {t(`authGate.preview.${feat.descKey}`, feat.descFb)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "20px 16px", borderRadius: 12, background: "var(--labs-surface)" }}>
        <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", marginBottom: 14 }}>
          {t("authGate.preview.hostCta", "A free profile is all you need to host your first tasting")}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => openAuthDialog("register")}
            className="labs-btn-primary"
            style={{ padding: "10px 20px", fontSize: 14 }}
            data-testid="button-preview-host-profile"
          >
            {t("authGate.preview.profileCta", "Create profile")}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 10 }}>
          {t("authGate.preview.alreadyHaveAccount", "Already have a profile?")}{" "}
          <button
            onClick={() => openAuthDialog("signin")}
            style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}
            data-testid="button-preview-host-signin"
          >
            {t("authGate.preview.signInLink", "Sign in here")}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LabsHost({ params }: LabsHostProps) {
  const { currentParticipant } = useAppStore();
  const tastingId = params?.id;

  if (!currentParticipant && !tastingId) {
    return <HostPreview />;
  }

  if (tastingId) {
    return <ManageTasting tastingId={tastingId} />;
  }

  return <CreateTastingForm />;
}
