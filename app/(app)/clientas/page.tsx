import Link from 'next/link';
import { listClients } from '@/lib/queries';
import { avatarColor, initials } from '@/lib/categories';
import { Search } from 'lucide-react';

export default async function ClientasPage({ searchParams }: { searchParams: { q?: string } }) {
  const clients = await listClients(searchParams.q ?? '');

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-5 pb-3 pt-5">
        <h1 className="text-[23px] font-extrabold tracking-[-.025em]">Clientas</h1>
        <p className="mt-px text-[13px] font-medium text-ink-2">{clients.length} en la base</p>
        <form className="mt-3.5 flex items-center gap-2.5 rounded-field border border-surface-line bg-white px-3.5 shadow-card">
          <Search size={17} className="text-ink-3" strokeWidth={2.2} />
          <input
            name="q" defaultValue={searchParams.q ?? ''} placeholder="Buscar nombre o teléfono"
            className="flex-1 border-0 bg-transparent py-3 text-sm font-medium outline-none"
          />
        </form>
      </header>

      <div className="flex flex-1 flex-col gap-2.5 overflow-auto px-5 pb-3 pt-0.5">
        {clients.map(c => (
          <Link
            key={c.id} href={`/clientas/${c.id}`}
            className="flex items-center gap-3 rounded-row border border-surface-line bg-white p-3.5 shadow-card transition hover:-translate-y-0.5"
          >
            <span
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] text-[13px] font-bold text-white"
              style={{ background: avatarColor(c.full_name) }}
            >
              {initials(c.full_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[14.5px] font-bold tracking-[-.01em]">{c.full_name}</span>
                {c.tags?.includes('VIP') && (
                  <span className="shrink-0 rounded-[7px] bg-v-soft px-[7px] py-0.5 text-[9.5px] font-extrabold text-v-d">VIP</span>
                )}
              </span>
              <span className="block truncate text-[11.5px] font-medium text-ink-3">
                {c.open_treatments?.length ? c.open_treatments.join(' · ') : `${c.phone ?? ''} · sin tratamiento abierto`}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
