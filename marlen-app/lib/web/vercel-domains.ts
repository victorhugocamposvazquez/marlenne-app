/** Dominios en el proyecto Vercel (DNS / SSL automático). */

export type DomainVerifyChallenge = {
  type: string;
  domain: string;
  value: string;
  reason?: string;
};

export type DomainStatus = {
  name: string;
  verified: boolean;
  verification?: DomainVerifyChallenge[];
  configuredBy?: string | null;
  mistmatch?: boolean;
};

function token(): string | null {
  return process.env.VERCEL_TOKEN?.trim() || null;
}

function projectId(): string | null {
  return process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_ID_WEB?.trim() || null;
}

function teamId(): string | null {
  return process.env.VERCEL_TEAM_ID?.trim() || null;
}

export function vercelDomainsConfigured(): boolean {
  return Boolean(token() && projectId());
}

function apiUrl(path: string): string {
  const t = teamId();
  const base = `https://api.vercel.com${path}`;
  if (!t) return base;
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${sep}teamId=${encodeURIComponent(t)}`;
}

async function vercelFetch(path: string, init?: RequestInit) {
  const t = token();
  if (!t) throw new Error('VERCEL_TOKEN no configurado');
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export async function addProjectDomain(domain: string): Promise<
  | { ok: true; domain: DomainStatus }
  | { ok: false; error: string; configured: boolean }
> {
  if (!vercelDomainsConfigured()) {
    return { ok: false, configured: false, error: 'Configura VERCEL_TOKEN y VERCEL_PROJECT_ID' };
  }
  const pid = projectId()!;
  const name = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  const { res, json } = await vercelFetch(`/v10/projects/${pid}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res.ok && json?.error?.code !== 'domain_already_in_use') {
    // domain_already_in_use a veces es nuestro; intentamos GET
    if (res.status === 409 || json?.error?.code === 'domain_already_exists') {
      return getProjectDomain(name);
    }
    return {
      ok: false,
      configured: true,
      error: json?.error?.message || `Vercel HTTP ${res.status}`,
    };
  }
  return {
    ok: true,
    domain: {
      name: json.name || name,
      verified: Boolean(json.verified),
      verification: json.verification,
      configuredBy: json.configuredBy,
    },
  };
}

export async function getProjectDomain(domain: string): Promise<
  | { ok: true; domain: DomainStatus }
  | { ok: false; error: string; configured: boolean }
> {
  if (!vercelDomainsConfigured()) {
    return { ok: false, configured: false, error: 'Configura VERCEL_TOKEN y VERCEL_PROJECT_ID' };
  }
  const pid = projectId()!;
  const name = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  const { res, json } = await vercelFetch(`/v9/projects/${pid}/domains/${encodeURIComponent(name)}`);
  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      error: json?.error?.message || `Dominio no encontrado (${res.status})`,
    };
  }
  return {
    ok: true,
    domain: {
      name: json.name || name,
      verified: Boolean(json.verified),
      verification: json.verification,
      configuredBy: json.configuredBy,
    },
  };
}

export async function verifyProjectDomain(domain: string): Promise<
  | { ok: true; domain: DomainStatus }
  | { ok: false; error: string; configured: boolean }
> {
  if (!vercelDomainsConfigured()) {
    return { ok: false, configured: false, error: 'Configura VERCEL_TOKEN y VERCEL_PROJECT_ID' };
  }
  const pid = projectId()!;
  const name = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  const { res, json } = await vercelFetch(
    `/v9/projects/${pid}/domains/${encodeURIComponent(name)}/verify`,
    { method: 'POST' },
  );
  if (!res.ok) {
    // Aún no verificado: devolver estado actual con challenges
    const current = await getProjectDomain(name);
    if (current.ok) return current;
    return {
      ok: false,
      configured: true,
      error: json?.error?.message || `Verify HTTP ${res.status}`,
    };
  }
  return {
    ok: true,
    domain: {
      name: json.name || name,
      verified: Boolean(json.verified),
      verification: json.verification,
      configuredBy: json.configuredBy,
    },
  };
}
