import type { LucideIcon } from 'lucide-react';

export default function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className = '',
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-row border border-dashed border-handle bg-surface-card/60 px-4 py-8 text-center ${className}`}>
      {Icon && (
        <span className="grid h-11 w-11 place-items-center rounded-icon bg-v-soft text-v-d">
          <Icon size={20} strokeWidth={2} />
        </span>
      )}
      <p className="text-body font-semibold text-ink-2">{title}</p>
      {hint && <p className="text-label font-medium text-ink-3">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
