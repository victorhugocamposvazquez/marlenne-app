import * as XLSX from 'xlsx';

const EXCEL_EXT = /\.(xlsx|xls|xlsm)$/i;

/** CSV o Excel (.xlsx/.xls) → texto CSV para el motor de importación. */
export async function readImportFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  return readImportBuffer(buf, file.name);
}

export function readImportBuffer(buf: ArrayBuffer, filename: string): string {
  if (EXCEL_EXT.test(filename)) return excelBufferToCsv(buf);
  return new TextDecoder('utf-8').decode(buf);
}

function excelBufferToCsv(buf: ArrayBuffer): string {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
  const name = wb.SheetNames[0];
  if (!name) return '';
  const sheet = wb.Sheets[name];
  if (!sheet) return '';

  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as (string | number | Date | null)[][];

  if (!rows.length) return '';

  const norm = rows.map(row => row.map(cellToImportString));
  const csvLines = norm.map(cells => cells.map(csvEscape).join(','));
  return csvLines.join('\n');
}

function cellToImportString(v: string | number | Date | null | undefined): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '';
    const d = String(v.getDate()).padStart(2, '0');
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const y = v.getFullYear();
    const h = v.getHours();
    const min = v.getMinutes();
    if (h === 0 && min === 0) return `${d}/${m}/${y}`;
    return `${d}/${m}/${y} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  return String(v).trim();
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
