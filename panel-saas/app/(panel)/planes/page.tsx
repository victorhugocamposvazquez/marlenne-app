import PanelShell from '@/components/shell/PanelShell';
import PlanesCatalog from '@/components/planes/PlanesCatalog';

export default function PlanesPage() {
  return (
    <PanelShell title="Planes, bonos y referidos" subtitle="Catálogo de suscripción, márgenes SMS y captación">
      <PlanesCatalog />
    </PanelShell>
  );
}
