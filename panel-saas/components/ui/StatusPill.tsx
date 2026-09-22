import { STATUS_COLOR } from '@/lib/format';
import type { CompanyStatus } from '@/lib/types';

export default function StatusPill({ status }: { status: CompanyStatus }) {
  const color = STATUS_COLOR[status] ?? '#9A97A8';
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color }}>
      <span className="h-2 w-2 rounded-pill" style={{ background: color }} />
      {status}
    </span>
  );
}
