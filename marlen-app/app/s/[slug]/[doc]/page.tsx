import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadPublicSiteBundle } from '@/lib/web/load-public-site';
import { legalPages } from '@/lib/web/legal-copy';

const DOCS = new Set(['aviso-legal', 'privacidad', 'cookies']);

export default async function PublicLegalPage({
  params,
}: {
  params: Promise<{ slug: string; doc: string }>;
}) {
  const { slug, doc } = await params;
  if (!DOCS.has(doc)) notFound();
  const bundle = await loadPublicSiteBundle(slug);
  if (!bundle) notFound();

  const pages = legalPages({
    salon: bundle.salonName,
    address: bundle.props.address,
    phone: bundle.props.phone,
  });
  const key = doc === 'aviso-legal' ? 'aviso' : doc === 'privacidad' ? 'privacidad' : 'cookies';
  const page = pages[key];

  return (
    <main style={{ minHeight: '100dvh', background: '#F6F6F9', color: '#0F0E1A', fontFamily: "var(--font-sora), 'Sora', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 80px' }}>
        <Link href={`/s/${bundle.site.slug}`} style={{ fontSize: 14, fontWeight: 600, color: '#6E6D7A' }}>
          ← {bundle.salonName}
        </Link>
        <h1 style={{ margin: '24px 0 16px', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>{page.title}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 15, lineHeight: 1.6, color: '#4A4957' }}>
          {page.body.map(p => (
            <p key={p} style={{ margin: 0 }}>{p}</p>
          ))}
        </div>
      </div>
    </main>
  );
}
