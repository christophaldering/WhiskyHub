# CaskSense Export/Download Audit Report

Generated: 2026-03-05

---

## A) Executive Inventory — All User-Visible Downloads

| # | Route / Page | Component File | Button / Trigger | What is Downloaded | File Type | Generation | API Endpoint | Auth |
|---|---|---|---|---|---|---|---|---|
| 1 | `/data-export` | `data-export-dark.tsx` | "CSV" / "Excel" per category + "Alles exportieren" | Profile, Journal, Wishlist, Collection, Friends, Tastings, All | CSV, XLSX | Server-side | `/api/export/{type}` | PIN + participantId |
| 2 | `/my-journal` (embedded) | `data-export.tsx` (imported as component) | Same as #1 (rendered inline) | Same as #1 | CSV, XLSX | Server-side | `/api/export/{type}` | PIN + participantId |
| 3 | `/tasting-results/:id` | `tasting-results.tsx` | ExportDropdown: "CSV", "Excel", "PDF" | Tasting results ranked table | CSV, XLS (TSV), PDF | Client-side (jsPDF + Blob) | None | None (data already loaded) |
| 4 | `/tasting-room/:id` (reveal) | `pdf-export-dialog.tsx` | "PDF Export" dialog with layout options | Tasting recap PDF (cover, lineup, scores) | PDF | Client-side (jsPDF) | None | Participant in tasting |
| 5 | `/tasting-room/:id` (reveal) | `printable-tasting-sheets.tsx` (`PrintableTastingSheets`) | "Notizblatt" / "Bewertungsbogen" (print or download) | Score sheet / Note sheet for a specific tasting | PDF | Client-side (jsPDF) | None | Participant in tasting |
| 6 | `/host-dashboard` | `host-dashboard.tsx` | "Bewertungsbogen (leer)" button | Blank score sheet template | PDF | Client-side (jsPDF via `generateBlankTastingSheet`) | None | Host |
| 7 | `/host-dashboard` | `host-dashboard.tsx` | "Tasting Mat (leer)" button | Blank tasting mat template | PDF | Client-side (jsPDF via `generateBlankTastingMat`) | None | Host |
| 8 | `/host-dashboard` | `host-dashboard.tsx` | QR code "Save" button | QR code image for tasting invitation | PNG | Client-side (canvas → data URL) | None | Host |
| 9 | `/host-dashboard` | `host-dashboard.tsx` | "Datenexport" link → `/data-export` | Navigation only | — | — | — | — |
| 10 | `/naked-tasting/:id` (results) | `naked-tasting.tsx` | "Ergebnis herunterladen (PDF)" | Naked tasting ranking results | PDF | Client-side (jsPDF) | None | Participant |
| 11 | `/tasting-recap/:id` | `tasting-recap.tsx` | PDF button (FileDown icon) | Tasting recap summary | PDF | Client-side (jsPDF) | None | Participant |
| 12 | Tasting analytics panel | `components/tasting-analytics.tsx` (line 90) | Download link (`downloadUrl`) | Detailed analytics workbook (Summary + My Ratings sheets) | XLSX | Server-side (ExcelJS) | `/api/tastings/:id/analytics/download` | Participant (reveal/archived) |
| 13 | `/export-notes` | `export-notes.tsx` | "Word herunterladen" | Personal tasting notes as Word document | DOCX | Server-side (docx library) | `POST /api/export/notes-docx` | participantId |
| 14 | `/tour` | `tour.tsx` | "PDF herunterladen" | CaskSense guided tour as PDF | PDF | Server-side (jsPDF on server) | `/api/tour-pdf` | None |
| 15 | `/tour` | `tour.tsx` | "PPTX herunterladen" | CaskSense guided tour as PowerPoint | PPTX | Server-side (pptxgenjs) | `/api/tour-pptx` | None |
| 16 | `/feature-tour` | `feature-tour.tsx` | "Download PDF" (triggers browser print dialog) | Feature tour as printable HTML | HTML→PDF (browser print) | Client-side (window.open + print) | None | None (public page) |
| 17 | `/account` | `account.tsx` | "Daten herunterladen" | All personal data as JSON (GDPR export) | JSON | Server-side (JSON response) | `/api/participants/:id/export-data` | participantId |
| 18 | `/log-simple` | `simple-log.tsx` | "Download JSON" (in debug/admin view) | Local manual logs from localStorage | JSON | Client-side (Blob) | None | None |
| 19 | `/simple-host` | `simple-host.tsx` | QR code download button | QR code image | PNG | Client-side (canvas) | None | Host |

---

## B) Backend Endpoint List — All Download/Export Endpoints

### B1: `GET /api/participants/:id/export-data`
- **File**: `server/routes.ts` lines 613–641
- **Auth**: participantId in URL (no PIN)
- **Returns**: JSON (not a file download — `res.json()`)
- **Content**: participant info, profile, journal, wishlist, stats, ratingNotes
- **Content-Type**: `application/json`

### B2: `GET /api/tastings/:id/analytics/download`
- **File**: `server/routes.ts` lines 2206–2322
- **Auth**: participantId as query param; tasting must be in `reveal` or `archived` status
- **Returns**: XLSX file (ExcelJS workbook streamed)
- **Content**: Summary sheet (ranked whiskies with stats) + optional "My Ratings" sheet
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Filename**: `CaskSense_Analytics_{tastingName}.xlsx`

### B3: `POST /api/export/notes-docx`
- **File**: `server/routes.ts` lines 5178–5317
- **Auth**: tastingId + participantId in body
- **Returns**: DOCX file (docx library `Packer.toBuffer`)
- **Content**: Personal tasting notes with whisky details and rating tables
- **Content-Type**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Filename**: `{tastingTitle}_notes.docx`

### B4: `GET /api/export/tastings`
- **File**: `server/routes.ts` lines 8369–8403
- **Auth**: participantId + PIN + `extended` access (host or admin)
- **Returns**: CSV or XLSX via `sendExport` helper
- **Content**: All tastings with whisky details and personal ratings
- **Filename**: `casksense_tastings_{date}.{csv|xlsx}`

### B5: `GET /api/export/journal`
- **File**: `server/routes.ts` lines 8406–8423
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX
- **Content**: Journal entries
- **Filename**: `casksense_journal_{date}.{csv|xlsx}`

### B6: `GET /api/export/profile`
- **File**: `server/routes.ts` lines 8426–8446
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX
- **Content**: Profile data (1 row)
- **Filename**: `casksense_profile_{date}.{csv|xlsx}`

### B7: `GET /api/export/friends`
- **File**: `server/routes.ts` lines 8449–8473
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX
- **Content**: Whisky friends list
- **Filename**: `casksense_friends_{date}.{csv|xlsx}`

### B8: `GET /api/export/wishlist`
- **File**: `server/routes.ts` lines 8476–8492
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX
- **Content**: Wishlist entries
- **Filename**: `casksense_wishlist_{date}.{csv|xlsx}`

### B9: `GET /api/export/collection`
- **File**: `server/routes.ts` lines 8495–8511
- **Auth**: participantId + PIN + `own` access
- **Returns**: CSV or XLSX
- **Content**: Whiskybase collection
- **Filename**: `casksense_collection_{date}.{csv|xlsx}`

### B10: `GET /api/export/all`
- **File**: `server/routes.ts` lines 8514–8591
- **Auth**: participantId + PIN + `admin` access
- **Returns**: CSV (first sheet only) or XLSX (multi-sheet)
- **Content**: Combined: Tastings, Journal, Wishlist, Collection, Friends
- **Filename**: `casksense_all_{date}.{csv|xlsx}`

### B11: `GET /api/tour-pptx`
- **File**: `server/routes.ts` lines 8795–8981
- **Auth**: None
- **Returns**: PPTX file (pptxgenjs)
- **Content**: CaskSense guided tour presentation (18 slides)
- **Filename**: `CaskSense-Rundgang.pptx`
- **Caching**: File cached to `/tmp/tour-cache/`

### B12: `GET /api/tour-pdf`
- **File**: `server/routes.ts` lines 8988–9117
- **Auth**: None
- **Returns**: PDF file (jsPDF on server)
- **Content**: CaskSense guided tour as PDF
- **Filename**: `CaskSense-Rundgang.pdf`
- **Caching**: File cached to `/tmp/tour-cache/`

---

## C) Client-Side File Generators

### C1: Tasting Results — CSV, XLS (TSV), PDF
- **File**: `client/src/pages/tasting-results.tsx`
- **Functions**:
  - `exportCsv(data)` — lines 165–202: Manual CSV string → Blob → download
  - `exportExcel(data)` — lines 204–234: TSV with BOM as `.xlsx` (NOT real XLSX, just tab-separated with Excel MIME)
  - `exportPdf(data)` — lines 236–322: jsPDF with ranked table
- **Triggered by**: `ExportDropdown` component (line 324+), three menu items
- **Library**: `jsPDF` (imported line 8)

### C2: Naked Tasting Results — PDF
- **File**: `client/src/pages/naked-tasting.tsx`
- **Function**: `generatePdf()` — lines 729–799
- **Triggered by**: "Ergebnis herunterladen (PDF)" button (line 937)
- **Library**: `jsPDF` (imported line 15)
- **Output**: `{tastingTitle}_results.pdf`

### C3: Tasting Recap — PDF
- **File**: `client/src/pages/tasting-recap.tsx`
- **Function**: `handlePdfDownload()` — lines 104–234
- **Triggered by**: PDF button in header (line 359)
- **Library**: `jsPDF` (imported line 14)
- **Output**: `casksense-{slug}-recap.pdf`

### C4: PDF Export Dialog (Tasting Room) — PDF
- **File**: `client/src/components/pdf-export-dialog.tsx`
- **Function**: Anonymous async in `onClick` handler — line 280+
- **Triggered by**: Dialog with layout/quote options, "Generate" button (line 801)
- **Library**: `jsPDF` (imported line 14)
- **Features**: Cover page, participants, lineup, ratings, customizable layout (compact/detailed/cards)
- **Used in**: `tasting-room.tsx` line 2081

### C5: Printable Tasting Sheets — PDF (4 functions)
- **File**: `client/src/components/printable-tasting-sheets.tsx`
- **Library**: `jsPDF` (imported line 10)
- **Functions**:
  - `generateNotizblatt()` (internal, ~line 138): Note sheet for specific tasting → `{title}_Notizblatt.pdf` (line 303)
  - `generateBewertungsbogen()` (internal, ~line 309): Score sheet for specific tasting → `{title}_Bewertungsbogen.pdf` (line 489)
  - `generateBlankTastingSheet(lang, slots)` — line 637: Blank score sheet template → `{translated_name}.pdf` (line 688)
  - `generateBlankTastingMat(lang, slots)` — line 691: Blank tasting mat → `{translated_name}.pdf` (line 740)
- **Used in**:
  - `tasting-room.tsx` line 1505 (`PrintableTastingSheets` component)
  - `host-dashboard.tsx` lines 751, 774 (`generateBlankTastingSheet`, `generateBlankTastingMat`)

### C6: Feature Tour — Browser Print
- **File**: `client/src/pages/feature-tour.tsx`
- **Function**: `handleDownloadPdf()` — lines 164–265
- **Method**: Opens new window with formatted HTML, triggers `window.print()`
- **No jsPDF**: Uses browser print dialog

### C7: Simple Log — JSON
- **File**: `client/src/pages/simple-log.tsx`
- **Function**: `handleDownloadJson()` — lines 1432–1441
- **Method**: Reads localStorage `simple_manual_logs` → Blob → download
- **Output**: `casksense-logs-{date}.json`

### C8: Account Data — JSON
- **File**: `client/src/pages/account.tsx`
- **Function**: `handleDownloadData()` — lines 96–112
- **Method**: Fetches `/api/participants/:id/export-data` → JSON Blob → download
- **Output**: `casksense-data-{name}.json`

### C9: QR Code Downloads
- **Files**: `host-dashboard.tsx` (line 320–324), `simple-host.tsx` (line 735+)
- **Method**: Canvas `toDataURL()` → `<a>` download
- **Output**: `casksense-qr-{title}.png`

---

## D) Shared Utilities

### D1: `server/excel-utils.ts` (lines 1–111)
| Function | Line | Description | Call Sites |
|---|---|---|---|
| `readExcelBuffer(buffer)` | 12 | Reads XLSX buffer into SimpleWorkbook | `routes.ts` (CSV/XLSX import flows) |
| `sheetToArrayOfArrays(sheet)` | 41 | Converts sheet to 2D array | `routes.ts` |
| `sheetToJson(sheet, options?)` | 45 | Converts sheet to array of objects | `routes.ts` |
| `sheetToCsv(sheet)` | 68 | Converts sheet to CSV string | Used by `jsonToCsv` |
| `jsonToSheet(data)` | 82 | Converts JSON array to sheet | Used by `jsonToCsv` |
| `jsonToCsv(data)` | 92 | JSON array → CSV string | `routes.ts` lines 8339, 8579 |
| `buildExcelBuffer(sheets)` | 96 | JSON arrays → XLSX buffer (ExcelJS) | `routes.ts` lines 8344, 8585 |

### D2: `sendExport` helper (server/routes.ts lines 8334–8348)
- Shared helper used by endpoints B4–B10
- Handles CSV vs XLSX format branching
- Uses `jsonToCsv` and `buildExcelBuffer` from excel-utils

### D3: `verifyExportAccess` helper (server/routes.ts lines 8350–8367)
- Shared auth helper for endpoints B4–B10
- Validates participantId, checks access level (own/extended/admin)

---

## E) Redundancy Evidence

### R1: Two separate "Data Export" page components
- **A)** `client/src/pages/data-export.tsx` (476 lines) — Light-themed, used as embedded component in `my-journal.tsx` (line 85: `<DataExport />`)
- **B)** `client/src/pages/data-export-dark.tsx` (335 lines) — Dark Warm themed, mounted at route `/data-export` (App.tsx line 164)
- **Evidence**: Both have identical `EXPORT_CARDS` arrays (same 6 categories), same `executeExport` logic calling the same `/api/export/{type}` endpoints, same PIN verification flow. The dark version is the actively routed one.

### R2: Two separate PDF generators for tasting results
- **A)** `tasting-results.tsx` `exportPdf()` (lines 236–322) — Generates a ranked table PDF with scores
- **B)** `naked-tasting.tsx` `generatePdf()` (lines 729–799) — Generates a ranked results PDF with card-style layout
- **Evidence**: Both produce `{title}_results.pdf` with the same data (ranked whiskies by average score), but with different visual layouts. Both use jsPDF with the same basic setup pattern.

### R3: Three separate PDF recap/results generators
- **A)** `tasting-results.tsx` `exportPdf()` — Tabular results
- **B)** `tasting-recap.tsx` `handlePdfDownload()` — Recap summary
- **C)** `pdf-export-dialog.tsx` — Full customizable PDF with cover page, lineup, and scores
- **Evidence**: All three generate PDFs from tasting data using jsPDF. The pdf-export-dialog is the most feature-rich; the others are simpler/faster alternatives.

### R4: Fake Excel export in tasting-results
- **A)** `tasting-results.tsx` `exportExcel()` (lines 204–234) — Creates a **tab-separated** text file with BOM, saves as `.xlsx` with MIME `application/vnd.ms-excel`
- **B)** Server-side `buildExcelBuffer` in `excel-utils.ts` — Creates proper XLSX via ExcelJS
- **Evidence**: The client-side "Excel" export is not a real XLSX file. It's a TSV with an Excel MIME type. This may cause issues in some Excel versions. The analytics download endpoint (B2) produces a proper XLSX for the same type of data.

### R5: Two tour download mechanisms
- **A)** `tour.tsx` — Calls server endpoints `/api/tour-pdf` and `/api/tour-pptx` (proper server-generated files)
- **B)** `feature-tour.tsx` — Opens HTML in new window and uses `window.print()` for "PDF download"
- **Evidence**: Two different tour pages with two different PDF generation approaches. The `tour.tsx` version uses the server; `feature-tour.tsx` uses browser print.

### R6: Account data export vs Data Export page overlap
- **A)** `account.tsx` `handleDownloadData()` — Calls `/api/participants/:id/export-data`, downloads as JSON
- **B)** `data-export-dark.tsx` — Calls `/api/export/profile`, `/api/export/journal`, etc., downloads as CSV/XLSX
- **Evidence**: Both export the same underlying user data (profile, journal, wishlist) but via different endpoints and formats. The account page export is a GDPR-style "download all my data" JSON dump; the data-export page provides structured per-category CSV/XLSX downloads.

### R7: Two QR code download implementations
- **A)** `host-dashboard.tsx` `handleDownloadQr()` — lines 320–324
- **B)** `simple-host.tsx` `downloadQr()` — line 735+
- **Evidence**: Same pattern (canvas toDataURL → anchor download), duplicated across two host views.

---

## F) Appendix — Key Code Excerpts

### F1: data-export-dark.tsx — executeExport (lines 108–143)
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
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = `casksense_${type}_${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(urlObj);
  } // ...
}, [currentParticipant, setLoading, toast, t]);
```

### F2: tasting-results.tsx — exportExcel (Fake XLSX) (lines 204–234)
```typescript
function exportExcel(data: ResultsData) {
  const rows = data.results.map((r, i) => ({ /* ... */ }));
  const headers = Object.keys(rows[0] || {});
  const csvContent = [
    headers.join("\t"),
    ...rows.map(row => headers.map(h => (row as any)[h]).join("\t")),
  ].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.title.replace(/[^a-zA-Z0-9]/g, "_")}_results.xlsx`;
  a.click();
}
```

### F3: server/routes.ts — sendExport helper (lines 8334–8348)
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

### F4: server/routes.ts — Analytics XLSX (lines 2206–2322)
```typescript
app.get("/api/tastings/:id/analytics/download", async (req, res) => {
  // ... validation ...
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CaskSense";
  const summarySheet = workbook.addWorksheet("Summary");
  // ... columns, data population ...
  if (validRequesterId) {
    const mySheet = workbook.addWorksheet("My Ratings");
    // ... personal ratings ...
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});
```

### F5: printable-tasting-sheets.tsx — Exported functions (lines 498, 637, 691)
```typescript
export function PrintableTastingSheets({ tasting, whiskies }: Props) { /* UI with print/download buttons */ }
export function generateBlankTastingSheet(lang: string, slots = 6) { /* jsPDF blank sheet */ }
export function generateBlankTastingMat(lang: string, slots = 6) { /* jsPDF blank mat */ }
```

### F6: account.tsx — GDPR data download (lines 96–112)
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

### F7: export-notes.tsx — Word download (lines 80–103)
```typescript
const handleDownloadWord = useCallback(async () => {
  setDownloading(true);
  try {
    const res = await fetch("/api/export/notes-docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tastingId: selectedTastingId, participantId: currentParticipant.id }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notesData.tasting.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_notes.docx`;
    a.click();
  } finally { setDownloading(false); }
}, [/* deps */]);
```

---

## Summary Statistics

| Category | Count |
|---|---|
| User-visible download triggers | 19 |
| Backend download endpoints | 12 |
| Client-side jsPDF generators | 7 (across 5 files) |
| Client-side Blob downloads | 4 (CSV, TSV-as-XLSX, JSON ×2) |
| Suspected redundancies | 7 |
| Libraries used | jsPDF (client+server), ExcelJS (server), docx/Packer (server), pptxgenjs (server) |
