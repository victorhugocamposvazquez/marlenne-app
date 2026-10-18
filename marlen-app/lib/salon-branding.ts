export type SalonBranding = {
  name: string;
  legalName: string;
  taxId: string;
  fiscalAddress: string;
  phone: string;
  logoPath: string | null;
  /** URL pública del logo si hay path. */
  logoUrl: string | null;
};

export type SalonEmisor = {
  marca: string;
  nombre: string;
  nif: string;
  dir: string;
  tel: string;
  logoUrl: string | null;
};

const EMPTY: SalonBranding = {
  name: '',
  legalName: '',
  taxId: '',
  fiscalAddress: '',
  phone: '',
  logoPath: null,
  logoUrl: null,
};

export function publicLogoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/salon-branding/${logoPath}`;
}

export function salonBrandingFromRow(row: {
  name?: string | null;
  legal_name?: string | null;
  tax_id?: string | null;
  fiscal_address?: string | null;
  phone?: string | null;
  logo_path?: string | null;
} | null | undefined): SalonBranding {
  if (!row) return { ...EMPTY };
  const logoPath = row.logo_path ?? null;
  return {
    name: (row.name ?? '').trim(),
    legalName: (row.legal_name ?? '').trim(),
    taxId: (row.tax_id ?? '').trim(),
    fiscalAddress: (row.fiscal_address ?? '').trim(),
    phone: (row.phone ?? '').trim(),
    logoPath,
    logoUrl: publicLogoUrl(logoPath),
  };
}

/** Emisor para preview de factura: rellena con lo guardado o placeholders suaves. */
export function salonEmisorFromBranding(b: SalonBranding): SalonEmisor {
  const marca = b.name || 'Tu centro';
  const nombre = b.legalName || marca;
  const nif = b.taxId
    ? (b.taxId.toUpperCase().startsWith('NIF') || b.taxId.toUpperCase().startsWith('CIF')
      ? b.taxId
      : `NIF/CIF ${b.taxId}`)
    : 'NIF/CIF pendiente';
  return {
    marca,
    nombre,
    nif,
    dir: b.fiscalAddress || 'Dirección fiscal pendiente',
    tel: b.phone || '',
    logoUrl: b.logoUrl,
  };
}
