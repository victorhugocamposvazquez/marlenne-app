import AppShell from '@/components/shell/AppShell';
import { WaTemplateProvider } from '@/components/WaTemplateProvider';
import StaffReminderEngine from '@/components/StaffReminderEngine';
import ToastProvider from '@/components/Toast';
import StaffPrefsSync from '@/components/StaffPrefsSync';
import { getStaffVoicePrefs, listStaff } from '@/lib/queries';
import { leadsEnabled } from '@/lib/leads-enabled';
import { readOpsSession } from '@/lib/ops-support-audit';
import { staffRoleLabel } from '@/lib/ops-support';
import { requireSession } from '@/lib/require-session';

export const maxDuration = 20;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSession();
  const [staffVoice, staff, leads] = await Promise.all([
    getStaffVoicePrefs(me.id),
    listStaff(),
    leadsEnabled(me.salon_id),
  ]);
  const opsCtx = readOpsSession();
  const serverOps = opsCtx
    ? {
      staffName: me.full_name,
      staffRole: staffRoleLabel(me.role),
      opsEmail: opsCtx.opsEmail,
      company: opsCtx.companyName,
    }
    : null;

  return (
    <ToastProvider>
      <WaTemplateProvider template={me.wa_confirm_template}>
        <StaffPrefsSync staffId={me.id} voice={staffVoice} />
        <StaffReminderEngine />
        <AppShell
          session={{
            role: me.role,
            fullName: me.full_name,
            email: me.email,
            salonName: me.salon_name,
            leads: leads && me.role !== 'provider',
          }}
          staff={staff.map(s => ({ id: s.id, full_name: s.full_name }))}
          serverOps={serverOps}
        >
          {children}
        </AppShell>
      </WaTemplateProvider>
    </ToastProvider>
  );
}
