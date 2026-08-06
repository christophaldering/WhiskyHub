import ExcelJS from "exceljs";

export interface SimpleWorkbook {
  SheetNames: string[];
  Sheets: Record<string, SimpleSheet>;
}

export interface SimpleSheet {
  _rows: any[][];
}

export async function readExcelBuffer(buffer: Buffer): Promise<SimpleWorkbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const result: SimpleWorkbook = { SheetNames: [], Sheets: {} };

  for (const worksheet of workbook.worksheets) {
    const name = worksheet.name;
    result.SheetNames.push(name);

    const rows: any[][] = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const values: any[] = [];
      for (let col = 1; col <= (row.cellCount || 0); col++) {
        const cell = row.getCell(col);
        values.push(cell.value != null ? cell.value : null);
      }
      while (rows.length < rowNumber - 1) {
        rows.push([]);
      }
      rows.push(values);
    });

    result.Sheets[name] = { _rows: rows };
  }

  return result;
}

export function sheetToArrayOfArrays(sheet: SimpleSheet): any[][] {
  return sheet._rows;
}

export function sheetToJson(sheet: SimpleSheet, options?: { defval?: any }): Record<string, any>[] {
  const rows = sheet._rows;
  if (rows.length < 1) return [];

  const headers = rows[0].map((h: any) => (h != null ? String(h).trim() : ""));
  const result: Record<string, any>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c: any) => c == null || c === "")) continue;

    const obj: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      const val = row[j];
      obj[headers[j]] = val != null ? val : (options?.defval !== undefined ? options.defval : undefined);
    }
    result.push(obj);
  }

  return result;
}

export function sheetToCsv(sheet: SimpleSheet): string {
  const rows = sheet._rows;
  return rows.map(row =>
    (row || []).map((cell: any) => {
      if (cell == null) return "";
      const s = String(cell);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(",")
  ).join("\n");
}

export function jsonToSheet(data: Record<string, any>[]): SimpleSheet {
  if (data.length === 0) return { _rows: [] };
  const headers = Object.keys(data[0]);
  const rows: any[][] = [headers];
  for (const item of data) {
    rows.push(headers.map(h => item[h] != null ? item[h] : ""));
  }
  return { _rows: rows };
}

export function jsonToCsv(data: Record<string, any>[]): string {
  return sheetToCsv(jsonToSheet(data));
}

/** Ein in ein Blatt eingebettetes Bild. rowIndex ist 0-basiert OHNE Kopfzeile. */
export interface ExcelSheetImage {
  rowIndex: number;
  colIndex: number;
  buffer: Buffer;
  extension: "png" | "jpeg";
  widthPx: number;
  heightPx: number;
}

export interface ExcelSheetSpec {
  name: string;
  data: Record<string, any>[];
  images?: ExcelSheetImage[];
  imageColumnWidth?: number;
  imageRowHeight?: number;
}

export async function buildExcelBuffer(sheets: ExcelSheetSpec[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const { name, data, images, imageColumnWidth, imageRowHeight } of sheets) {
    if (data.length === 0) continue;
    const worksheet = workbook.addWorksheet(name.slice(0, 31));
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    for (const item of data) {
      worksheet.addRow(headers.map(h => item[h] != null ? item[h] : ""));
    }
    if (images && images.length > 0) {
      // Ohne gesetzte Breite/Hoehe ueberlappt das Bild die Nachbarzellen.
      const cols = new Set(images.map(im => im.colIndex));
      for (const c of Array.from(cols)) worksheet.getColumn(c + 1).width = imageColumnWidth ?? 10;
      for (const im of images) {
        // +1 Kopfzeile, +1 weil ExcelJS-Zeilen 1-basiert sind.
        worksheet.getRow(im.rowIndex + 2).height = imageRowHeight ?? 58;
        const id = workbook.addImage({ buffer: im.buffer as any, extension: im.extension });
        worksheet.addImage(id, {
          tl: { col: im.colIndex + 0.15, row: im.rowIndex + 1.1 },
          ext: { width: im.widthPx, height: im.heightPx },
          editAs: "oneCell",
        });
      }
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
