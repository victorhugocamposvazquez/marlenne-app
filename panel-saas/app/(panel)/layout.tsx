import { PanelUIProvider } from '@/context/PanelUIContext';

export default function PanelGroupLayout({ children }: { children: React.ReactNode }) {
  return <PanelUIProvider>{children}</PanelUIProvider>;
}
