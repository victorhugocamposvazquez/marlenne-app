import Link from 'next/link';

const LINK = 'grid min-h-[44px] place-items-center text-body font-bold text-v-d';

export default function AuthLinks({
  current,
  email,
}: {
  current: 'login' | 'registro' | 'recuperar';
  email?: string;
}) {
  const recover = email ? `/recuperar?email=${encodeURIComponent(email)}` : '/recuperar';
  return (
    <nav className="flex flex-col items-center pt-1" aria-label="Cuenta">
      {current !== 'login' && <Link className={LINK} href="/login">Ya tengo cuenta</Link>}
      {current !== 'registro' && <Link className={LINK} href="/registro">Crear cuenta</Link>}
      {current !== 'recuperar' && <Link className={LINK} href={recover}>Olvidé la contraseña</Link>}
    </nav>
  );
}
