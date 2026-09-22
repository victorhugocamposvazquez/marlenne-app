import PanelShell from '@/components/shell/PanelShell';

export default function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <PanelShell title={title} subtitle={subtitle}>
      <div className="rounded-card border border-dashed border-line bg-white p-10 text-center">
        <p className="text-[16px] font-semibold">Pantalla en diseño</p>
        <p className="mt-2 text-[14px] text-ink-2">Datos mock según el handoff. Conectar a API/BD en una fase posterior.</p>
      </div>
    </PanelShell>
  );
}
