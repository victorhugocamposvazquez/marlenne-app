const OPS_LOGIN_ERRORS: Record<string, string> = {
  ops: 'Enlace de soporte incompleto. Vuelve a entrar desde el panel.',
  ops_expired: 'El enlace de soporte ha caducado (5 min). Cierra y abre de nuevo modo soporte.',
  ops_used: 'Ese enlace ya se usó. Genera uno nuevo desde el panel (cambia de pestaña Agenda/Clientas).',
  ops_config: 'La app no tiene service role en el servidor. Revisa Vercel (marlenne-app).',
  ops_staff: 'No hay cuenta de recepción/admin activa en el centro.',
  ops_session: 'No se pudo abrir la sesión automática. Revisa service role y redeploy de la app.',
};

export function opsLoginErrorMessage(code: string | undefined): string | null {
  if (!code?.startsWith('ops')) return null;
  return OPS_LOGIN_ERRORS[code] ?? 'No se pudo entrar en modo soporte. Prueba otra vez desde el panel.';
}
