# CaskSense Export/Download Audit Report

Generated: 2026-03-05 (updated post-consolidation)

---

## A) Executive Inventory — All User-Visible Downloads

| # | Route / Page | Component File | Button / Trigger | What is Downloaded | File Type | Generation | API Endpoint | Auth | Uses Shared Utility |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `/my-taste/export` | `data-export-dark.tsx` | "CSV" / "Excel" per category + "Alles exportieren" | Profile, Journal, Wishlist, Collection, Friends, Tastings, All | CSV, XLSX | Server-side | `/api/export/{type}` | PIN + participantId | `downloadBlob` ✅ |
| 2 | `/my-journal` (embedded) | `data-export.tsx` → re-exports `data-export-dark.tsx` | Same as #1 (rendered inline) | Same as #1 | CSV, XLSX | Server-side | `/api/export/{type}` | PIN + participantId | `downloadBlob` ✅ |
| 3 | `/tasting-results/:id` | `tasting-results.tsx` | ExportDropdown: "CSV", "Excel" | Tasting results ranked table | CSV, XLSX | Server-side | `/api/tastings/:id/results/export` | None | `downloadBlob` via `exportFromServer` ✅ |
| 4 | `/tasting-results/:id` | `tasting-results.tsx` | ExportDropdown: "PDF" | Tasting results ranked table | PDF | Client-side (jsPDF) | None | None | ❌ raw `doc.save()` |
| 5 | `/tasting-room/:id` (reveal) | `pdf-export-dialog.tsx` | "PDF Export" dialog with layout options | Tasting recap PDF (cover, lineup, scores) | PDF | Client-side (jsPDF) | None | Participant in tasting | ❌ raw `doc.save()` |
| 6 | `/tasting-room/:id` (reveal) | `printable-tasting-sheets.tsx` | "Notizblatt" / "Bewertungsbogen" (print or download) | Score sheet / Note sheet for a specific tasting | PDF | Client-side (jsPDF) | None | Participant in tasting | `saveOrPrintJsPdf` ✅ |
| 7 | `/host-dashboard` | `host-dashboard.tsx` | "Bewertungsbogen (leer)" button | Blank score sheet template | PDF | Client-side (jsPDF) | None | Host | ❌ raw `doc.save()` in `generateBlankTastingSheet` |
| 8 | `/host-dashboard` | `host-dashboard.tsx` | "Tasting Mat (leer)" button | Blank tasting mat template | PDF | Client-side (jsPDF) | None | Host | ❌ raw `doc.save()` in `generateBlankTastingMat` |
| 9 | `/host-dashboard` | `host-dashboard.tsx` | QR code "Save" button | QR code image for tasting invitation | PNG | Client-side (canvas → data URL) | None | Host | `downloadDataUrl` ✅ |
| 10 | `/naked-tasting/:id` (results) | `naked-tasting.tsx` | "Ergebnis herunterladen (PDF)" | Naked tasting ranking results | PDF | Client-side (jsPDF) | None | Participant | ❌ raw `doc.save()` |
| 11 | `/tasting-recap/:id` | `tasting-recap.tsx` | PDF button (FileDown icon) | Tasting recap summary | PDF | Client-side (jsPDF) | None | Participant | ❌ raw `doc.save()` |
| 12 | Tasting analytics panel | `components/tasting-analytics.tsx` (line 90) | Download link (`<a href=... download>`) | Detailed analytics workbook (Summary + My Ratings sheets) | XLSX | Server-side (ExcelJS) | `/api/tastings/:id/analytics/download` | Participant (reveal/archived) | ❌ raw `<a>` tag |
| 13 | `/export-notes` | `export-notes.tsx` | "Word herunterladen" | Personal tasting notes as Word document | DOCX | Server-side (docx library) | `POST /api/export/notes-docx` | participantId | ❌ manual Blob → anchor |
| 14 | `/tour` | `tour.tsx` | "PDF herunterladen" | CaskSense guided tour as PDF | PDF | Server-side (jsPDF on server) | `/api/tour-pdf` | None | ❌ manual Blob → anchor |
| 15 | `/tour` | `tour.tsx` | "PPTX herunterladen" | CaskSense guided tour as PowerPoint | PPTX | Server-side (pptxgenjs) | `/api/tour-pptx` | None | ❌ manual Blob → anchor |
| 16 | `/feature-tour` | `feature-tour.tsx` | "Download PDF" (triggers browser print dialog) | Feature tour as printable HTML | HTML→PDF (browser print) | Client-side (window.open + print) | None | None (public page) | ❌ browser print |
| 17 | `/account` | `account.tsx` | "Daten herunterladen" | All personal data as JSON (GDPR export) | JSON | Server-side (JSON response) | `/api/participants/:id/export-data` | participantId | ❌ manual Blob → anchor |
| 18 | `/log-simple` | `simple-log.tsx` | "Download JSON" (in debug/admin view) | Local manual logs from localStorage | JSON | Client-side (Blob) | None | None | ❌ manual Blob → anchor |
| 19 | `/simple-host` | `simple-host.tsx` | QR code download button | QR code image | PNG | Client-side (canvas) | None | Host | `downloadDataUrl` ✅ |
| 20 | `/tasting-room/:id` | `invite-panel.tsx` | QR code download in invite dialog | QR code image | PNG | Client-side (canvas) | None | In tasting | ❌ manual anchor |

---

## B) Backend Endpoint List — All Download/Export Endpoints

### B1: `GET /api/participants/:id/export-data`
- **File**: `server/routes.ts` lines ~613–641
- **Auth**: participantId in URL (no PIN)
- **Returns**: JSON (not a file download — `res.json()`)
- **Content**: participant info, profile, journal, wishlist, stats, ratingNotes
- **Content-Type**: `application/json`

### B2: `GET /api/tastings/:id/results/export?format=csv|xlsx`
- **File**: `server/routes.ts` lines 2045–2086
- **Auth**: None (data already public once tasting is viewable)
- **Returns**: CSV or XLSX via `sendExport` helper
- **Content**: Ranked whiskies with averages (Overall, Nose, Taste, Finish, Balance) + rating count
- **Filename**: `CaskSense_{title}_results.{csv|xlsx}`
- **Added during**: Consolidation refactor (replaces client-side fake-Excel)

### B3: `GET /api/tastings/:id/analytics/download`
- **File**: `server/routes.ts` lines ~2350–2400
- **Auth**: participantId as query param; tasting must be in `reveal` or `archived` status
- **Returns**: XLSX file (ExcelJS workbook streamed directly)
- **Content**: Summary sheet (ranked whiskies with stats) + optional "My Ratings" sheet
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Filename**: `CaskSense_Analytics_{tastingName}.xlsx`
- **Note**: Uses ExcelJS directly (not `buildExcelBuffer` helper)

### B4: `POST /api/export/notes-docx`
- **File**: `server/routes.ts` lines ~5378–5393
- **Auth**: tastingId + participantId in body
- **Returns**: DOCX file (docx library `Packer.toBuffer`)
- **Content**: Personal tasting notes with whisky details and rating tables
- **Content-Type**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Filename**: `{tastingTitle}_notes.docx`

### B5: `GET /api/export/tastings`
- **File**: `server/routes.ts` lines ~8430–8445
- **Auth**: participantId + PIN + `extended` access (host or admin)
- **Returns**: CSV or XLSX via `sendExport` helper
- **Content**: All tastings with whisky details and personal ratings
- **Filename**: `casksense_tastings_{date}.{csv|xlsx}`

### B6: `GET /api/export/journal`
- **File**: `server/routes.ts` lines ~8448–8465
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX via `sendExport`
- **Content**: Journal entries
- **Filename**: `casksense_journal_{date}.{csv|xlsx}`

### B7: `GET /api/export/profile`
- **File**: `server/routes.ts` lines ~8468–8488
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX via `sendExport`
- **Content**: Profile data (1 row)
- **Filename**: `casksense_profile_{date}.{csv|xlsx}`

### B8: `GET /api/export/friends`
- **File**: `server/routes.ts` lines ~8491–8515
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX via `sendExport`
- **Content**: Whisky friends list
- **Filename**: `casksense_friends_{date}.{csv|xlsx}`

### B9: `GET /api/export/wishlist`
- **File**: `server/routes.ts` lines ~8518–8534
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX via `sendExport`
- **Content**: Wishlist entries
- **Filename**: `casksense_wishlist_{date}.{csv|xlsx}`

### B10: `GET /api/export/collection`
- **File**: `server/routes.ts` lines ~8537–8553
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX via `sendExport`
- **Content**: Whiskybase collection
- **Filename**: `casksense_collection_{date}.{csv|xlsx}`

### B11: `GET /api/export/all`
- **File**: `server/routes.ts` lines ~8556–8632
- **Auth**: participantId + PIN + `admin` access
- **Returns**: CSV (first sheet only) or XLSX (multi-sheet)
- **Content**: Combined: Tastings, Journal, Wishlist, Collection, Friends
- **Filename**: `casksense_all_{date}.{csv|xlsx}`

### B12: `GET /api/tour-pptx`
- **File**: `server/routes.ts` lines ~8850–9025
- **Auth**: None
- **Returns**: PPTX file (pptxgenjs)
- **Content**: CaskSense guided tour presentation (18 slides)
- **Filename**: `CaskSense-Rundgang.pptx`
- **Caching**: File cached to `/tmp/tour-cache/`

### B13: `GET /api/tour-pdf`
- **File**: `server/routes.ts` lines ~9036–9161
- **Auth**: None
- **Returns**: PDF file (jsPDF on server)
- **Content**: CaskSense guided tour as PDF
- **Filename**: `CaskSense-Rundgang.pdf`
- **Caching**: File cached to `/tmp/tour-cache/`

---

## C) Client-Side File Generators

### C1: Tasting Results — PDF only (CSV/XLSX now server-side)
- **File**: `client/src/pages/tasting-results.tsx`
- **Functions**:
  - `exportFromServer(tastingId, format)` — line 178: Fetches `/api/tastings/:id/results/export`, uses `downloadBlob`
  - `exportPdf(data)` — line 189: jsPDF ranked table → `doc.save()`
- **Triggered by**: `ExportDropdown` component (line 277+), three menu items with loading states
- **Library**: `jsPDF` (imported line 9)
- **Status**: CSV/XLSX migrated to server (was fake-Excel TSV before). PDF remains client-side.

### C2: Naked Tasting Results — PDF
- **File**: `client/src/pages/naked-tasting.tsx`
- **Function**: `generatePdf()` — line ~729–799
- **Triggered by**: "Ergebnis herunterladen (PDF)" button
- **Library**: `jsPDF` (imported line 15)
- **Output**: `{tastingTitle}_results.pdf`

### C3: Tasting Recap — PDF
- **File**: `client/src/pages/tasting-recap.tsx`
- **Function**: `handlePdfDownload()` — line ~104–234
- **Triggered by**: PDF button in header
- **Library**: `jsPDF` (imported line 14)
- **Output**: `casksense-{slug}-recap.pdf`

### C4: PDF Export Dialog (Tasting Room) — PDF
- **File**: `client/src/components/pdf-export-dialog.tsx`
- **Function**: Anonymous async in `onClick` handler — line ~280+
- **Triggered by**: Dialog with layout/quote options, "Generate" button
- **Library**: `jsPDF` (imported line 14)
- **Features**: Cover page, participants, lineup, ratings, customizable layout (compact/detailed/cards)
- **Used in**: `tasting-room.tsx`
- **Output**: `{title}_menu.pdf`

### C5: Printable Tasting Sheets — PDF (4 functions)
- **File**: `client/src/components/printable-tasting-sheets.tsx`
- **Library**: `jsPDF` (imported line 10)
- **Functions**:
  - `generateNotizblatt()` (internal): Note sheet → `{title}_Notizblatt.pdf`
  - `generateBewertungsbogen()` (internal): Score sheet → `{title}_Bewertungsbogen.pdf`
  - `generateBlankTastingSheet(lang, slots)` (exported, line ~637): Blank score sheet → `{translated_name}.pdf`
  - `generateBlankTastingMat(lang, slots)` (exported, line ~691): Blank tasting mat → `{translated_name}.pdf`
- **Uses `saveOrPrintJsPdf`**: ✅ for internal functions (Notizblatt, Bewertungsbogen); ❌ for exported blank generators (still raw `doc.save()`)
- **Used in**:
  - `tasting-room.tsx` (`PrintableTastingSheets` component)
  - `host-dashboard.tsx` (`generateBlankTastingSheet`, `generateBlankTastingMat`)

### C6: Feature Tour — Browser Print
- **File**: `client/src/pages/feature-tour.tsx`
- **Function**: `handleDownloadPdf()` — line ~164–265
- **Method**: Opens new window with formatted HTML, triggers `window.print()`
- **No jsPDF**: Uses browser print dialog

### C7: Simple Log — JSON
- **File**: `client/src/pages/simple-log.tsx`
- **Function**: `handleDownloadJson()` — line ~1432–1441
- **Method**: Reads localStorage `simple_manual_logs` → Blob → manual anchor download
- **Output**: `casksense-logs-{date}.json`

### C8: Account Data — JSON
- **File**: `client/src/pages/account.tsx`
- **Function**: `handleDownloadData()` — line ~96–112
- **Method**: Fetches `/api/participants/:id/export-data` → JSON Blob → manual anchor download
- **Output**: `casksense-data-{name}.json`

### C9: QR Code Downloads (3 implementations)
- **Files**:
  - `host-dashboard.tsx` (line ~320–324): Uses `downloadDataUrl` ✅
  - `simple-host.tsx` (line ~735): Uses `downloadDataUrl` ✅
  - `invite-panel.tsx` (line ~149–155): Manual anchor download ❌
- **Method**: Canvas `toDataURL()` → download
- **Output**: `casksense-qr-{title}.png` / `casksense-tasting-{id}-qr.png`

### C10: Tour Downloads — PDF + PPTX
- **File**: `client/src/pages/tour.tsx`
- **Functions**:
  - `handleDownloadPdf()` — line ~494–510: Fetches `/api/tour-pdf` → manual Blob → anchor
  - `handleDownloadPptx()` — line ~513–529: Fetches `/api/tour-pptx` → manual Blob → anchor
- **Not using shared utilities**: Could use `downloadFromEndpoint` from `download.ts`

### C11: Export Notes — DOCX
- **File**: `client/src/pages/export-notes.tsx`
- **Function**: `handleDownloadWord()` — line ~80–103
- **Method**: POST to `/api/export/notes-docx` → Blob → manual anchor download
- **Not using shared utilities**: Could use `downloadBlob` from `download.ts`

---

## D) Shared Utilities

### D1: `client/src/lib/download.ts` (30 lines)
| Function | Line | Description | Call Sites |
|---|---|---|---|
| `downloadBlob(blob, filename)` | 1 | Blob → ObjectURL → anchor download → revoke | `data-export-dark.tsx`, `tasting-results.tsx` (via `exportFromServer`), `downloadFromEndpoint` |
| `downloadUrl(url, filename)` | 10 | Direct URL → anchor download | (available, not yet used) |
| `downloadDataUrl(dataUrl, filename)` | 17 | Data URL → anchor download | `host-dashboard.tsx`, `simple-host.tsx` |
| `downloadFromEndpoint(url, filename)` | 24 | Fetch URL → blob → `downloadBlob` | (available, not yet used — candidate for tour.tsx, export-notes.tsx) |

### D2: `client/src/lib/pdf.ts` (19 lines)
| Function | Line | Description | Call Sites |
|---|---|---|---|
| `saveJsPdf(doc, filename)` | 4 | Wrapper around `doc.save()` | `saveOrPrintJsPdf` |
| `openJsPdfForPrint(doc)` | 8 | `doc.autoPrint()` + `window.open(bloburl)` | `saveOrPrintJsPdf` |
| `saveOrPrintJsPdf(doc, filename, mode)` | 13 | Dispatches to save or print based on mode | `printable-tasting-sheets.tsx` (Notizblatt, Bewertungsbogen) |

### D3: `server/excel-utils.ts` (111 lines)
| Function | Line | Description | Call Sites |
|---|---|---|---|
| `readExcelBuffer(buffer)` | 12 | Reads XLSX buffer into SimpleWorkbook | `routes.ts` (CSV/XLSX import flows) |
| `sheetToArrayOfArrays(sheet)` | 41 | Converts sheet to 2D array | `routes.ts` |
| `sheetToJson(sheet, options?)` | 45 | Converts sheet to array of objects | `routes.ts` |
| `sheetToCsv(sheet)` | 68 | Converts sheet to CSV string | Used by `jsonToCsv` |
| `jsonToSheet(data)` | 82 | Converts JSON array to sheet | Used by `jsonToCsv` |
| `jsonToCsv(data)` | 92 | JSON array → CSV string | `sendExport` helper |
| `buildExcelBuffer(sheets)` | 96 | JSON arrays → XLSX buffer (ExcelJS) | `sendExport` helper |

### D4: `sendExport` helper (server/routes.ts line ~361)
- Shared helper used by endpoints B2, B5–B11
- Handles CSV vs XLSX format branching
- Uses `jsonToCsv` and `buildExcelBuffer` from excel-utils

### D5: `verifyExportAccess` helper (server/routes.ts line ~377)
- Shared auth helper for endpoints B5–B11
- Validates participantId, checks access level (own/extended/admin)

---

## E) Redundancy Evidence

### R1: Two separate "Data Export" page components (PARTIALLY RESOLVED)
- **A)** `client/src/pages/data-export.tsx` — Now a 2-line re-export wrapper: `export default DataExportDark`
- **B)** `client/src/pages/data-export-dark.tsx` (335 lines) — The canonical implementation
- **Route**: `/data-export` redirects to `/my-taste/export` (App.tsx). Canonical route is `/my-taste/export`.
- **Status**: Wrapper exists for backward compatibility (`my-journal.tsx` imports `data-export.tsx`). Could be cleaned up further by changing the import in `my-journal.tsx` to point directly at `data-export-dark.tsx`.

### R2: Two separate PDF generators for tasting results
- **A)** `tasting-results.tsx` `exportPdf()` (line ~189) — Generates a ranked table PDF with scores
- **B)** `naked-tasting.tsx` `generatePdf()` (line ~729–799) — Generates a ranked results PDF with card-style layout
- **Evidence**: Both produce `{title}_results.pdf` with the same data (ranked whiskies by average score), but with different visual layouts. Both use jsPDF with the same basic setup pattern. Neither uses the shared `pdf.ts` utility.

### R3: Three separate PDF recap/results generators
- **A)** `tasting-results.tsx` `exportPdf()` — Tabular results
- **B)** `tasting-recap.tsx` `handlePdfDownload()` — Recap summary
- **C)** `pdf-export-dialog.tsx` — Full customizable PDF with cover page, lineup, and scores
- **Evidence**: All three generate PDFs from tasting data using jsPDF. The pdf-export-dialog is the most feature-rich; the others are simpler/faster alternatives. None uses the shared `pdf.ts` utility.

### R4: Fake Excel export — RESOLVED
- **Before**: `tasting-results.tsx` `exportExcel()` created a TSV file with BOM, saved as `.xlsx` with Excel MIME type (not real XLSX)
- **After**: `ExportDropdown` now calls `exportFromServer(tastingId, "xlsx")` which hits `GET /api/tastings/:id/results/export?format=xlsx`, producing a real XLSX via `buildExcelBuffer` (ExcelJS)
- **Status**: ✅ Fixed

### R5: Two tour download mechanisms
- **A)** `tour.tsx` — Calls server endpoints `/api/tour-pdf` and `/api/tour-pptx` (proper server-generated files)
- **B)** `feature-tour.tsx` — Opens HTML in new window and uses `window.print()` for "PDF download"
- **Evidence**: Two different tour pages with two different PDF generation approaches. The `tour.tsx` version uses the server; `feature-tour.tsx` uses browser print. Neither uses `downloadFromEndpoint` from `download.ts`.

### R6: Account data export vs Data Export page overlap
- **A)** `account.tsx` `handleDownloadData()` — Calls `/api/participants/:id/export-data`, downloads as JSON
- **B)** `data-export-dark.tsx` — Calls `/api/export/profile`, `/api/export/journal`, etc., downloads as CSV/XLSX
- **Evidence**: Both export the same underlying user data (profile, journal, wishlist) but via different endpoints and formats. The account page export is a GDPR-style "download all my data" JSON dump; the data-export page provides structured per-category CSV/XLSX downloads. Intentional separation (different use cases).

### R7: Three QR code download implementations (was two)
- **A)** `host-dashboard.tsx` `handleDownloadQr()` — Uses `downloadDataUrl` ✅
- **B)** `simple-host.tsx` `downloadQr()` — Uses `downloadDataUrl` ✅
- **C)** `invite-panel.tsx` `downloadQr()` — Manual anchor pattern ❌
- **Evidence**: Same pattern (canvas toDataURL → anchor download). Two of three now use shared utility; `invite-panel.tsx` still has manual implementation.

### R8: Manual Blob→anchor pattern still present in 5 files
Files that create Blob → ObjectURL → anchor → click → revoke manually instead of using `downloadBlob`:
1. `account.tsx` line ~102–107 (JSON download)
2. `export-notes.tsx` line ~91–95 (DOCX download)
3. `tour.tsx` line ~499–505 (PDF download)
4. `tour.tsx` line ~519–524 (PPTX download)
5. `simple-log.tsx` line ~1434–1439 (JSON download)

### R9: Analytics download uses raw `<a>` tag instead of fetch
- `tasting-analytics.tsx` line 90+301: Uses `<a href={downloadUrl} download>` directly
- All other server downloads use fetch → Blob → anchor pattern
- This works but provides no error handling or loading state

---

## F) Appendix — Key Code Excerpts

### F1: download.ts — Shared download utilities (lines 1–30)
```typescript
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function downloadFromEndpoint(url: string, filename: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) return false;
  const blob = await res.blob();
  downloadBlob(blob, filename);
  return true;
}
```

### F2: pdf.ts — Shared PDF save/print utilities (lines 1–19)
```typescript
import type jsPDF from "jspdf";
import { downloadBlob } from "./download";

export function saveJsPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function openJsPdfForPrint(doc: jsPDF) {
  doc.autoPrint();
  window.open(doc.output("bloburl") as unknown as string, "_blank");
}

export function saveOrPrintJsPdf(doc: jsPDF, filename: string, mode: "download" | "print") {
  if (mode === "print") {
    openJsPdfForPrint(doc);
  } else {
    saveJsPdf(doc, filename);
  }
}
```

### F3: tasting-results.tsx — exportFromServer (lines 178–187)
```typescript
async function exportFromServer(tastingId: string, format: "csv" | "xlsx"): Promise<boolean> {
  const res = await fetch(`/api/tastings/${tastingId}/results/export?format=${format}`);
  if (!res.ok) return false;
  const blob = await res.blob();
  const disp = res.headers.get("Content-Disposition");
  const filenameMatch = disp?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] || `results.${format}`;
  downloadBlob(blob, filename);
  return true;
}
```

### F4: data-export-dark.tsx — executeExport using downloadBlob (lines ~108–139)
```typescript
const executeExport = useCallback(async (type: string, format: string, pin: string) => {
  if (!currentParticipant) return;
  const key = `${type}-${format}`;
  setLoading(key, true);
  try {
    const url = type === "all"
      ? `/api/export/all?participantId=${currentParticipant.id}&format=${format}&pin=${encodeURIComponent(pin)}`
      : `/api/export/${type}?participantId=${currentParticipant.id}&format=${format}&pin=${encodeURIComponent(pin)}`;
    const res = await fetch(url);
    // ... error handling ...
    const blob = await res.blob();
    downloadBlob(blob, `casksense_${type}_${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "xlsx" : format}`);
    toast({ description: t("dataExport.downloadReady") });
  } // ...
}, [currentParticipant, setLoading, toast, t]);
```

### F5: server/routes.ts — Results export endpoint (lines 2045–2086)
```typescript
app.get("/api/tastings/:id/results/export", async (req, res) => {
  const format = (req.query.format as string) || "csv";
  const tasting = await storage.getTasting(req.params.id);
  if (!tasting) return res.status(404).json({ message: "Not found" });

  const [allRatings, allWhiskies] = await Promise.all([
    storage.getRatingsForTasting(req.params.id),
    storage.getWhiskiesForTasting(req.params.id),
  ]);

  const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;

  const rows = allWhiskies
    .map((w, i) => {
      const rats = allRatings.filter(r => r.whiskyId === w.id);
      const overalls = rats.map(r => r.overall).filter((v): v is number => v != null);
      return {
        Rank: i + 1, Whisky: w.name ?? "Unknown", Distillery: w.distillery ?? "",
        Region: w.region ?? "", Age: w.age ?? "", ABV: w.abv ?? "",
        "Avg Overall": avg(overalls)?.toFixed(1) ?? "",
        "Avg Nose": avg(rats.map(r => r.nose).filter((v): v is number => v != null))?.toFixed(1) ?? "",
        "Avg Taste": avg(rats.map(r => r.taste).filter((v): v is number => v != null))?.toFixed(1) ?? "",
        "Avg Finish": avg(rats.map(r => r.finish).filter((v): v is number => v != null))?.toFixed(1) ?? "",
        "Avg Balance": avg(rats.map(r => r.balance).filter((v): v is number => v != null))?.toFixed(1) ?? "",
        Ratings: rats.length,
      };
    })
    .sort((a, b) => parseFloat(b["Avg Overall"] || "0") - parseFloat(a["Avg Overall"] || "0"))
    .map((row, i) => ({ ...row, Rank: i + 1 }));

  const safeName = (tasting.title || "results").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  await sendExport(res, rows, `CaskSense_${safeName}_results`, format, "Results");
});
```

### F6: server/routes.ts — sendExport helper (line ~361)
```typescript
const sendExport = async (res: Response, data: any[], filename: string, format: string, sheetName: string) => {
  if (!data || data.length === 0) {
    return res.status(404).json({ message: "No data available for export" });
  }
  if (format === "csv") {
    const csv = jsonToCsv(data);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    return res.send("\uFEFF" + csv);
  }
  const buf = await buildExcelBuffer([{ name: sheetName.slice(0, 31), data }]);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
  return res.send(buf);
};
```

### F7: printable-tasting-sheets.tsx — Using saveOrPrintJsPdf (line ~302, ~482)
```typescript
// After generating Notizblatt or Bewertungsbogen:
saveOrPrintJsPdf(doc, `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Notizblatt.pdf`, mode);
// ...
saveOrPrintJsPdf(doc, `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Bewertungsbogen.pdf`, mode);
```

### F8: invite-panel.tsx — QR download NOT using shared utility (line ~149–155)
```typescript
const downloadQr = () => {
  if (!qrDataUrl) return;
  const a = document.createElement("a");
  a.href = qrDataUrl;
  a.download = `casksense-tasting-${tastingId}-qr.png`;
  a.click();
};
```

### F9: account.tsx — GDPR data download NOT using shared utility (line ~96–112)
```typescript
const handleDownloadData = async () => {
  setDownloadLoading(true);
  try {
    const res = await fetch(`/api/participants/${currentParticipant!.id}/export-data`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casksense-data-${currentParticipant!.name}.json`;
    a.click();
  } finally { setDownloadLoading(false); }
};
```

### F10: tour.tsx — Tour downloads NOT using shared utility (line ~494–529)
```typescript
const handleDownloadPdf = async () => {
  setDownloading(true);
  try {
    const res = await fetch("/api/tour-pdf");
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CaskSense-Rundgang.pdf";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) { console.error("PDF download error:", e); }
  finally { setDownloading(false); }
};
// Same pattern for handleDownloadPptx
```

---

## G) Consolidation Progress Tracker

| Item | Status | Notes |
|---|---|---|
| `download.ts` shared utility created | ✅ Done | 4 functions: `downloadBlob`, `downloadUrl`, `downloadDataUrl`, `downloadFromEndpoint` |
| `pdf.ts` shared utility created | ✅ Done | 3 functions: `saveJsPdf`, `openJsPdfForPrint`, `saveOrPrintJsPdf` |
| QR downloads → `downloadDataUrl` | ✅ 2/3 | `host-dashboard.tsx` ✅, `simple-host.tsx` ✅, `invite-panel.tsx` ❌ |
| Data export → `downloadBlob` | ✅ Done | `data-export-dark.tsx` migrated |
| `data-export.tsx` → re-export wrapper | ✅ Done | 2-line file re-exporting `data-export-dark.tsx` |
| `/data-export` → redirect to `/my-taste/export` | ✅ Done | App.tsx route redirect |
| Fake Excel → real server XLSX | ✅ Done | New endpoint `GET /api/tastings/:id/results/export?format=xlsx` |
| `ExportDropdown` → server calls + loading | ✅ Done | Uses `exportFromServer` with `Loader2` spinner |
| `printable-tasting-sheets` → `saveOrPrintJsPdf` | ✅ 2/4 | Notizblatt ✅, Bewertungsbogen ✅, blank generators ❌ |
| `tour.tsx` → `downloadFromEndpoint` | ❌ Pending | Still manual Blob → anchor |
| `export-notes.tsx` → `downloadBlob` | ❌ Pending | Still manual Blob → anchor |
| `account.tsx` → `downloadBlob` | ❌ Pending | Still manual Blob → anchor |
| `simple-log.tsx` → `downloadBlob` | ❌ Pending | Still manual Blob → anchor |
| `invite-panel.tsx` → `downloadDataUrl` | ❌ Pending | Still manual anchor |
| `tasting-analytics.tsx` → fetch-based download | ❌ Pending | Still raw `<a>` tag |

---

## Summary Statistics

| Category | Count |
|---|---|
| User-visible download triggers | 20 |
| Backend download endpoints | 13 |
| Client-side jsPDF generators | 7 (across 5 files) |
| Client-side Blob downloads | 3 (JSON ×2, browser print ×1) |
| Shared utility adoption rate | 6/20 triggers (30%) |
| Remaining manual download patterns | 8 files |
| Resolved redundancies | 2 (R1 partial, R4 full) |
| Remaining redundancies | 6 (R2, R3, R5, R6, R7, R8) |
| Libraries used | jsPDF (client+server), ExcelJS (server), docx/Packer (server), pptxgenjs (server) |
