'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { chooseMetaPage, disconnectMetaPage, type MetaConnectStatus } from '@/app/actions/meta-connect';

const ERRORS: Record<string, string> = {
  apagado: 'Leads no está activado para este centro. Lo enciende OPS.',
  config: 'Faltan el id y el secreto de la app de Meta en el servidor. La bandeja y el alta manual siguen disponibles.',
  estado: 'La conexión no cuadra. Vuelve a intentarlo.',
  token: 'Meta no ha devuelto acceso.',
  paginas: 'Esa cuenta no tiene páginas de Facebook.',
  guardar: 'No se ha podido guardar la página.',
};

export default function MetaConnectCard({
  status,
  error,
}: {
  status: MetaConnectStatus;
  error?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const notice = error ? ERRORS[error] ?? 'No se ha podido conectar.' : null;

  if (!status.enabled) {
    return (
      <p className="text-body leading-snug text-ink-2">
        Leads no está activado para este centro. Lo enciende OPS. Cuando esté, aquí se conecta la página de Facebook.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && <p className="text-label font-semibold text-danger-fg">{notice}</p>}
      {!status.configured && (
        <p className="text-body leading-snug text-ink-2">
          Faltan los anuncios: el servidor aún no tiene el id y el secreto de la app de Meta. Puedes dar de alta leads a mano en la bandeja.
        </p>
      )}
      {status.configured && !status.pageId && (
        <p className="text-body leading-snug text-ink-2">
          Faltan los anuncios. Conecta la página de Facebook para que los formularios entren solos. Mientras, el alta manual sigue en la bandeja.
        </p>
      )}
      {status.pageId && (
        <div className="rounded-row bg-surface-soft px-4 py-3">
          <p className="text-body font-bold">{status.pageName || 'Página conectada'}</p>
          <p className="mt-1 text-label text-ink-2">
            {status.adAccountName || status.adAccountId || 'Sin cuenta publicitaria'}
          </p>
        </div>
      )}
      {status.choices.length > 0 && !status.pageId && (
        <div className="flex flex-col gap-2">
          <p className="text-label font-bold text-ink-2">Elige una página. En esta versión el centro usa una.</p>
          {status.choices.map(choice => (
            <button
              key={choice.id}
              type="button"
              disabled={pending}
              onClick={() => start(async () => {
                const res = await chooseMetaPage(choice.id);
                if (res.ok) router.refresh();
              })}
              className="min-h-[48px] rounded-row bg-surface-soft px-4 text-left text-body font-bold"
            >
              {choice.name}
            </button>
          ))}
        </div>
      )}
      {status.configured && (
        <a
          href="/api/meta/oauth/start"
          className="inline-flex min-h-[48px] items-center justify-center rounded-pill bg-ink px-4 text-body font-bold text-white no-underline"
        >
          {status.pageId ? 'Conectar otra página' : 'Conectar página de Facebook'}
        </a>
      )}
      {status.pageId && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => {
            await disconnectMetaPage();
            router.refresh();
          })}
          className="min-h-[44px] text-label font-bold text-ink-2"
        >
          Quitar la página
        </button>
      )}
    </div>
  );
}
