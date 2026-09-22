export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { panelUrl } from '@/lib/panel-url';

export default function PlatformCentroPage({ params }: { params: { id: string } }) {
  redirect(panelUrl(`/empresas/${params.id}`));
}
