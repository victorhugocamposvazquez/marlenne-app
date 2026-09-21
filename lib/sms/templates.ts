export type SmsTemplateVars = {
  cliente?: string;
  servicio?: string;
  /** Día de la semana en español (lunes, martes…). */
  dia?: string;
  fecha?: string;
  hora?: string;
  profesional?: string;
};

export function renderSmsTemplate(body: string, vars: SmsTemplateVars): string {
  return body
    .replaceAll('{{cliente}}', vars.cliente?.trim() || 'cliente')
    .replaceAll('{{servicio}}', vars.servicio?.trim() || 'tu cita')
    .replaceAll('{{dia}}', vars.dia?.trim() || '—')
    .replaceAll('{{fecha}}', vars.fecha?.trim() || '—')
    .replaceAll('{{hora}}', vars.hora?.trim() || '—')
    .replaceAll('{{profesional}}', vars.profesional?.trim() || '');
}
