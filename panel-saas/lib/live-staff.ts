export type LiveStaff = {
  id: string;
  name: string;
  role: string;
  jobTitle: string | null;
  email: string | null;
  active: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administración',
  reception: 'Recepción',
  provider: 'Cabina',
};

export function liveStaffRoleLabel(role: string, jobTitle: string | null): string {
  if (jobTitle?.trim()) return jobTitle.trim();
  return ROLE_LABEL[role] ?? role;
}
