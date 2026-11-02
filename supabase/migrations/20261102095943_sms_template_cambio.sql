-- Plantilla distinta cuando el SMS sale al crear/editar fuera de la ventana (p. ej. tras las 21:00).

insert into public.sms_templates (salon_id, clave, nombre, cuerpo)
select
  s.id,
  'recordatorio_cita_cambio',
  'Confirmación / cambio de cita',
  'Hola {{cliente}}, te confirmamos tu cita de {{servicio}} el {{dia}} {{fecha}} a las {{hora}}. ¡Te esperamos!'
from public.salons s
on conflict (salon_id, clave) do nothing;
