import AppShell from '@/components/shell/AppShell';
import StaffReminderEngine from '@/components/StaffReminderEngine';
import ToastProvider from '@/components/Toast';
import StaffPrefsSync from '@/components/StaffPrefsSync';
import { getStaffVoicePrefs } from '@/lib/queries';
import { readOpsSession } from '@/lib/ops-support-audit';
import { staffRoleLabel } from '@/lib/ops-support';
import { requireSession } from '@/lib/require-session';

export const maxDuration = 20;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSession();
  const staffVoice = await getStaffVoicePrefs(me.id);
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
      <StaffPrefsSync staffId={me.id} voice={staffVoice} />
      <StaffReminderEngine />
      <AppShell
        session={{
          role: me.role,
          workspace: me.workspace,
          hasPersonal: me.has_personal,
          fullName: me.full_name,
          email: me.email,
          salonName: me.salon_name,
        }}
        serverOps={serverOps}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
