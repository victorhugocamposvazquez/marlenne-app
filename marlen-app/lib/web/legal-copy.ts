/** Textos legales básicos generados con datos del centro. */

export function legalPages(input: {
  salon: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const who = input.salon;
  const addr = (input.address || '').trim() || 'la dirección indicada en la web';
  const phone = (input.phone || '').trim();
  const contact = [phone && `Tel. ${phone}`, input.email].filter(Boolean).join(' · ') || addr;

  return {
    aviso: {
      title: 'Aviso legal',
      body: [
        `Este sitio web pertenece a ${who}, con domicilio en ${addr}.`,
        `Para contactar: ${contact}.`,
        'Los contenidos de esta web (textos, imágenes y marcas) están protegidos. Queda prohibida su reproducción sin autorización.',
        'La información de servicios y precios puede actualizarse; en caso de duda, confirma en el centro o al reservar online.',
      ],
    },
    privacidad: {
      title: 'Política de privacidad',
      body: [
        `${who} trata los datos personales que nos facilitas (nombre, teléfono, email) para gestionar citas y responder a tus solicitudes.`,
        'La base legal es la ejecución de la relación precontractual/contractual y, cuando corresponda, tu consentimiento.',
        'No vendemos tus datos. Pueden acceder proveedores técnicos necesarios para el servicio (agenda, hosting), bajo contrato.',
        'Puedes ejercer acceso, rectificación, supresión, oposición y otros derechos escribiendo al centro. También puedes reclamar ante la AEPD.',
        'Conservamos los datos el tiempo necesario para la finalidad y las obligaciones legales.',
      ],
    },
    cookies: {
      title: 'Política de cookies',
      body: [
        'Esta web puede usar cookies técnicas necesarias para su funcionamiento.',
        'Si en el futuro se activan cookies de medición, te pediremos consentimiento cuando sea obligatorio.',
        'Puedes configurar tu navegador para bloquear o eliminar cookies.',
      ],
    },
  };
}
