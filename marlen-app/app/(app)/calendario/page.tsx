import { redirect } from 'next/navigation';

/** El calendario personal queda unificado en /tareas. */
export default function CalendarioRedirect({
  searchParams,
}: {
  searchParams: { dia?: string };
}) {
  const dia = searchParams.dia ? `?dia=${encodeURIComponent(searchParams.dia)}&scope=personal` : '?scope=personal';
  redirect(`/tareas${dia}`);
}
