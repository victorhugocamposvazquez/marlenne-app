'use client';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export function buildPageNumbers(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const nums: (number | '…')[] = [1];
  if (page > 3) nums.push('…');
  for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) nums.push(i);
  if (page < pages - 2) nums.push('…');
  nums.push(pages);
  return nums;
}

export default function PaginationBar({
  from,
  to,
  total,
  page,
  pages,
  pageSize,
  onPageSize,
  onPage,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  onPageSize: (n: number) => void;
  onPage: (n: number) => void;
}) {
  const pageNums = buildPageNumbers(page, pages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFC] px-4 py-3">
      <span className="text-[13px] text-ink-2">
        {total ? `${from.toLocaleString('es-ES')}–${to.toLocaleString('es-ES')} de ${total.toLocaleString('es-ES')}` : '0 resultados'}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="relative mr-1.5 flex h-[34px] items-center rounded-[10px] border-[1.5px] border-line bg-white py-0 pl-2.5 pr-7">
          <select
            value={pageSize}
            onChange={e => onPageSize(Number(e.target.value))}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          >
            {[25, 50, 100].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="pointer-events-none text-[12px] font-semibold">{pageSize} por página</span>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 text-ink-2" />
        </div>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border-[1.5px] border-line bg-white disabled:opacity-35"
        >
          <ChevronLeft size={14} />
        </button>
        {pageNums.map((p, i) => (
          p === '…' ? (
            <span key={`e${i}`} className="flex h-[34px] min-w-[34px] items-center justify-center px-1.5 text-[13px] font-semibold text-ink-3">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={`flex h-[34px] min-w-[34px] items-center justify-center rounded-[10px] border-[1.5px] px-1.5 text-[13px] font-semibold ${p === page ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'}`}
            >
              {p}
            </button>
          )
        ))}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border-[1.5px] border-line bg-white disabled:opacity-35"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
