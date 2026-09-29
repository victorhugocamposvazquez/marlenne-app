import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CitasFeaturesCard from '@/components/ajustes/CitasFeaturesCard';
import { requireRole } from '@/lib/require-session';
import { getSalonAgendaFeatures } from '@/lib/queries';

export default async function AjustesCitasPage() {
  const me = await requireRole('admin');
  const features = await getSalonAgendaFeatures(me.salon_id);

  return (
    <AjustesHeader title="Citas">
      <p className="mb-2 text-body leading-snug text-ink-2">
        Opciones de la agenda y de Hoy para este centro. Solo las cambia una administradora.
      </p>
      <CitasFeaturesCard initial={features} />
    </AjustesHeader>
  );
}
