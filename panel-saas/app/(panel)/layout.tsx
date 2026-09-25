import { PanelUIProvider } from '@/context/PanelUIContext';
import { getPanelUser } from '@/lib/panel-session';

export default function PanelGroupLayout({ children }: { children: React.ReactNode }) {
  const panelUser = getPanelUser();
  return <PanelUIProvider panelUser={panelUser}>{children}</PanelUIProvider>;
}
