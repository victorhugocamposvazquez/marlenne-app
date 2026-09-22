import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export default function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className = '',
}: {
  icon?: LucideIcon;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-row bg-surface-soft px-4 py-10 text-center ${className}`}>
      {Icon && (
        <span className="grid h-11 w-11 place-items-center rounded-pill bg-track text-ink">
          <Icon size={20} strokeWidth={2} />
        </span>
      )}
      <p className="text-body font-semibold text-ink-2">{title}</p>
      {hint && <p className="text-label font-medium text-ink-2">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
