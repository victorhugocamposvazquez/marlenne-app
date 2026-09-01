import { fold } from '@/lib/voice';

export function normHeader(h: string) {
  return fold(h).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function detectDelimiter(headerLine: string): string {
  let commas = 0;
  let semis = 0;
  let tabs = 0;
  let q = false;
  for (let i = 0; i < headerLine.length; i++) {
    const c = headerLine[i];
    if (c === '"') {
      if (q && headerLine[i + 1] === '"') { i += 1; continue; }
      q = !q;
      continue;
    }
    if (q) continue;
    if (c === ',') commas += 1;
    else if (c === ';') semis += 1;
    else if (c === '\t') tabs += 1;
  }
  if (tabs > commas && tabs > semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i += 1; continue; }
      q = !q;
      continue;
    }
    if (!q && c === delim) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** CSV con BOM, comillas y ; de Excel en español. Cabeceras plegadas. */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const raw = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!raw) return { headers: [], rows: [] };

  const lines: string[] = [];
  let buf = '';
  let q = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      buf += c;
      if (q && raw[i + 1] === '"') { buf += raw[i + 1]; i += 1; continue; }
      q = !q;
      continue;
    }
    if (c === '\n' && !q) {
      if (buf.trim()) lines.push(buf);
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) lines.push(buf);
  if (!lines.length) return { headers: [], rows: [] };

  const delim = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delim).map(normHeader).filter(Boolean);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], delim);
    if (cells.every(c => !c)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    rows.push(row);
  }
  return { headers, rows };
}

export function cell(row: Record<string, string>, ...aliases: string[]) {
  for (const a of aliases) {
    const v = row[normHeader(a)];
    if (v) return v;
  }
  return '';
}
