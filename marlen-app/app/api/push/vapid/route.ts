import { getSession } from '@/lib/queries';
import { vapidPublicKey } from '@/lib/staff-reminder-send';

/** Clave pública para suscribir el dispositivo. La privada no sale del servidor. */
export async function GET() {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });
  const publicKey = vapidPublicKey();
  if (!publicKey) return Response.json({ publicKey: null }, { status: 503 });
  return Response.json({ publicKey });
}
