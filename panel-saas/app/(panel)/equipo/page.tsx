import PanelShell from '@/components/shell/PanelShell';
import EquipoView from '@/components/equipo/EquipoView';

export default function EquipoPage() {
  return (
    <PanelShell title="Equipo" subtitle="Roles, permisos y registro de soporte">
      <EquipoView />
    </PanelShell>
  );
}
