import type { ReadyItem } from '@/lib/ready';

export default function ReadyList({ items }: { items: ReadyItem[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[.04em] text-ink-3">
        Antes de clientas reales
      </h2>
      <ul className="rounded-card bg-surface-soft px-4">
        {items.map(item => (
          <li key={item.label} className="flex items-start gap-2.5 border-b border-[#E6E5EC] py-3.5 last:border-0">
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.ok ? 'bg-ok' : 'bg-danger'}`} />
            <span>
              <span className="block text-body font-semibold">{item.label}</span>
              <span className="block text-caption font-medium leading-snug text-ink-2">{item.hint}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}