import * as XLSX from 'xlsx';
import { normHeader } from '@/lib/csv';

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
  const headerAt = findHeaderRowIndex(norm);
  const table = norm.slice(headerAt);
  const csvLines = table.map(cells => cells.map(csvEscape).join(','));
  return csvLines.join('\n');
}

/** SimplyBook y otros exports meten título del informe antes de la fila de cabeceras. */
function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const norms = rows[i].map(normHeader).filter(Boolean);
    if (!norms.length) continue;
    const hasName = norms.some(n =>
      n === 'nombre'
      || n === 'name'
      || n === 'nombre_completo'
      || n === 'full_name'
      || n === 'cliente',
    );
    const hasContact = norms.some(n =>
      n.includes('telefono')
      || n.includes('phone')
      || n.includes('movil')
      || n.includes('mobile')
      || n === 'email'
      || n === 'e_mail'
      || n === 'correo',
    );
    if (hasName && hasContact) return i;
  }
  return 0;
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
