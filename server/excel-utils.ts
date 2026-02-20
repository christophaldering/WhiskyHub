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

export async function buildExcelBuffer(sheets: { name: string; data: Record<string, any>[] }[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const { name, data } of sheets) {
    if (data.length === 0) continue;
    const worksheet = workbook.addWorksheet(name.slice(0, 31));
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    for (const item of data) {
      worksheet.addRow(headers.map(h => item[h] != null ? item[h] : ""));
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
