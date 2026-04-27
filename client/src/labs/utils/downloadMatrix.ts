import type React from "react";
import {
  FileSpreadsheet,
  FileText,
  Download,
  BookOpen,
  Presentation,
  FileType2,
} from "lucide-react";
import {
  labsExportFromServer,
  labsExportPdf,
  labsExportPdfForTasting,
  labsExportStoryPdfForTasting,
  labsExportPresentationPdfForTasting,
  labsExportNotesDocxForTasting,
} from "@/labs/utils/labsExports";

export type DownloadFormat = "pdf" | "xlsx" | "csv" | "docx";

export type DownloadContentType =
  | "tasting-results"
  | "tasting-story"
  | "tasting-presentation"
  | "tasting-notes";

export type DownloadKind =
  | "tasting-results-pdf"
  | "tasting-results-xlsx"
  | "tasting-results-csv"
  | "tasting-story-pdf"
  | "tasting-presentation-pdf"
  | "tasting-notes-docx";

export type AvailabilityFlag = "story" | "presentation" | "notes";

export interface DownloadContext {
  tastingId: string;
  participantId?: string | null;
  inlineData?: { tasting: unknown; whiskyResults: unknown[] };
  t: (key: string, opts?: unknown) => string;
}

export interface DownloadDescriptor {
  kind: DownloadKind;
  contentType: DownloadContentType;
  format: DownloadFormat;
  icon: React.ElementType;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  badgeKey?: string;
  badgeFallback: string;
  requiresParticipant: boolean;
  availabilityFlag?: AvailabilityFlag;
  run: (ctx: DownloadContext) => Promise<void>;
}

export const DOWNLOAD_MATRIX: DownloadDescriptor[] = [
  {
    kind: "tasting-results-pdf",
    contentType: "tasting-results",
    format: "pdf",
    icon: Download,
    titleKey: "resultsUi.downloadPdfTitle",
    titleFallback: "Auswertungs-PDF",
    descKey: "resultsUi.downloadPdfDesc",
    descFallback: "Kompakte Rangliste & Statistiken (1-3 Seiten, ideal zum Versenden)",
    badgeFallback: "PDF",
    requiresParticipant: false,
    run: async ({ tastingId, inlineData, t }) => {
      if (inlineData) {
        await labsExportPdf(inlineData.tasting, inlineData.whiskyResults, t);
        return;
      }
      await labsExportPdfForTasting(tastingId, t);
    },
  },
  {
    kind: "tasting-results-xlsx",
    contentType: "tasting-results",
    format: "xlsx",
    icon: FileSpreadsheet,
    titleKey: "resultsUi.downloadExcelTitle",
    titleFallback: "Excel-Tabelle",
    descKey: "resultsUi.downloadExcelDesc",
    descFallback: "Alle Bewertungen tabellarisch für eigene Statistik-Auswertung",
    badgeFallback: ".xlsx",
    requiresParticipant: false,
    run: async ({ tastingId, t }) => {
      await labsExportFromServer(tastingId, "xlsx", t);
    },
  },
  {
    kind: "tasting-results-csv",
    contentType: "tasting-results",
    format: "csv",
    icon: FileText,
    titleKey: "resultsUi.downloadCsvTitle",
    titleFallback: "CSV-Datei",
    descKey: "resultsUi.downloadCsvDesc",
    descFallback: "Rohdaten für Import in andere Tools",
    badgeFallback: ".csv",
    requiresParticipant: false,
    run: async ({ tastingId, t }) => {
      await labsExportFromServer(tastingId, "csv", t);
    },
  },
  {
    kind: "tasting-story-pdf",
    contentType: "tasting-story",
    format: "pdf",
    icon: BookOpen,
    titleKey: "resultsUi.downloadStoryTitle",
    titleFallback: "Story-PDF",
    descKey: "resultsUi.downloadStoryDesc",
    descFallback: "Magazin-Stil mit Fotos, Geschichten und Profilen",
    badgeKey: "resultsUi.formatStoryBadge",
    badgeFallback: "Premium PDF",
    requiresParticipant: false,
    availabilityFlag: "story",
    run: async ({ tastingId, t }) => {
      await labsExportStoryPdfForTasting(tastingId, t);
    },
  },
  {
    kind: "tasting-presentation-pdf",
    contentType: "tasting-presentation",
    format: "pdf",
    icon: Presentation,
    titleKey: "resultsUi.downloadPresentationTitle",
    titleFallback: "Präsentations-PDF",
    descKey: "resultsUi.downloadPresentationDesc",
    descFallback: "Slide-Deck im Landscape-Format zur Präsentation der Ergebnisse",
    badgeFallback: "PDF",
    requiresParticipant: false,
    availabilityFlag: "presentation",
    run: async ({ tastingId, t }) => {
      await labsExportPresentationPdfForTasting(tastingId, t);
    },
  },
  {
    kind: "tasting-notes-docx",
    contentType: "tasting-notes",
    format: "docx",
    icon: FileType2,
    titleKey: "resultsUi.downloadNotesTitle",
    titleFallback: "Notizen (DOCX)",
    descKey: "resultsUi.downloadNotesDesc",
    descFallback: "Deine persönlichen Bewertungen & Notizen als Word-Dokument",
    badgeFallback: ".docx",
    requiresParticipant: true,
    availabilityFlag: "notes",
    run: async ({ tastingId, participantId, t }) => {
      if (!participantId) {
        throw new Error(
          t("downloads.notesNoParticipant", {
            defaultValue: "Notes export requires a participant session.",
          }),
        );
      }
      await labsExportNotesDocxForTasting(tastingId, participantId, t);
    },
  },
];

export interface AvailabilityState {
  story?: boolean;
  presentation?: boolean;
  notes?: boolean;
}

export function isDescriptorVisible(
  descriptor: DownloadDescriptor,
  availability: AvailabilityState,
  participantId?: string | null,
): boolean {
  if (descriptor.requiresParticipant && !participantId) return false;
  if (descriptor.availabilityFlag) {
    if (!availability[descriptor.availabilityFlag]) return false;
  }
  return true;
}

export function selectDescriptors(
  kinds: DownloadKind[],
  availability: AvailabilityState,
  participantId?: string | null,
): DownloadDescriptor[] {
  return kinds
    .map(k => DOWNLOAD_MATRIX.find(d => d.kind === k))
    .filter((d): d is DownloadDescriptor => !!d)
    .filter(d => isDescriptorVisible(d, availability, participantId));
}

export function getDownloadDescriptor(kind: DownloadKind): DownloadDescriptor {
  const found = DOWNLOAD_MATRIX.find(d => d.kind === kind);
  if (!found) {
    throw new Error(`Unknown download kind: ${kind}`);
  }
  return found;
}

export function getDescriptorsForContentType(contentType: DownloadContentType): DownloadDescriptor[] {
  return DOWNLOAD_MATRIX.filter(d => d.contentType === contentType);
}

export const DEFAULT_TASTING_KINDS: DownloadKind[] = [
  "tasting-results-pdf",
  "tasting-results-xlsx",
  "tasting-results-csv",
  "tasting-story-pdf",
  "tasting-presentation-pdf",
  "tasting-notes-docx",
];

export function buildSourceHref(contentType: DownloadContentType, tastingId: string): string {
  switch (contentType) {
    case "tasting-results":
      return `/labs/results/${tastingId}`;
    case "tasting-story":
      return `/labs/results/${tastingId}/story`;
    case "tasting-presentation":
      return `/labs/results/${tastingId}/present`;
    case "tasting-notes":
      return `/labs/results/${tastingId}`;
    default:
      return `/labs/results/${tastingId}`;
  }
}
