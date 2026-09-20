import { ajustesCardCls, ajustesSectionTitleCls } from '@/components/ajustes/AjustesSection';
import type { ReadyItem } from '@/lib/ready';

export default function ReadyList({ items }: { items: ReadyItem[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <h2 className={ajustesSectionTitleCls}>Antes de clientas reales</h2>
      <ul className={ajustesCardCls}>
        {items.map(item => (
          <li key={item.label} className="flex items-start gap-3 border-b border-surface-line py-4 last:border-0">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.ok ? 'bg-ok' : 'bg-danger'}`} />
            <span>
              <span className="block text-body-lg font-bold">{item.label}</span>
              <span className="mt-0.5 block text-body leading-snug text-ink-2">{item.hint}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}