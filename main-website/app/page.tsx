const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.marlenapp.com';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_-10%,rgba(255,36,85,0.18),transparent_55%),radial-gradient(90%_70%_at_95%_0%,rgba(8,121,255,0.16),transparent_50%),radial-gradient(70%_50%_at_50%_100%,rgba(208,0,168,0.12),transparent_60%),linear-gradient(180deg,#FBFBFD_0%,#F3F3F8_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-brand-pink/10 blur-3xl motion-safe:animate-float-slow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl motion-safe:animate-float-delayed"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <img
          src="/logo.png"
          alt="Marlén"
          width={220}
          height={72}
          className="h-14 w-auto select-none motion-safe:animate-rise sm:h-16"
          decoding="async"
        />

        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.22em] text-ink-2 motion-safe:animate-rise motion-safe:[animation-delay:80ms]">
          Próximamente
        </p>

        <h1 className="mt-4 max-w-xl text-balance text-3xl font-semibold tracking-tight text-ink motion-safe:animate-rise motion-safe:[animation-delay:140ms] sm:text-4xl">
          La web de Marlén está en camino
        </h1>

        <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-ink-2 motion-safe:animate-rise motion-safe:[animation-delay:200ms] sm:text-lg">
          Mientras tanto, la agenda del centro ya está lista en la app.
        </p>

        <a
          href={appUrl}
          className="mt-10 inline-flex items-center justify-center rounded-2xl bg-grad px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(208,0,168,0.55)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_16px_36px_-12px_rgba(8,121,255,0.45)] motion-safe:animate-rise motion-safe:[animation-delay:260ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
        >
          Ir a la app
        </a>
      </div>

      <footer className="relative z-10 pb-8 text-center text-xs text-ink-2/80">
        © {new Date().getFullYear()} Marlén
      </footer>
    </main>
  );
}
