export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { panelUrl } from '@/lib/panel-url';

export default function PlatformCentrosPage() {
  redirect(panelUrl('/empresas'));
}
