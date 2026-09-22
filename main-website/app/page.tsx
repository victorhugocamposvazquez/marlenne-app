const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-2">
        Marlén
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        La agenda que habla contigo
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink-2">
        Producto, planes y legal irán aquí. Por ahora, la app de centro y el panel
        ops viven en apps separadas del monorepo.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={appUrl}
          className="rounded-full bg-grad px-6 py-3 text-sm font-semibold text-white shadow-lg"
        >
          Entrar a la app
        </a>
        <span className="rounded-full border border-black/10 px-6 py-3 text-sm text-ink-2">
          Web corporativa · scaffold
        </span>
      </div>
    </main>
  );
}
