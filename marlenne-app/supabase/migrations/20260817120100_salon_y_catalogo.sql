-- ============================================================
-- Marlenne — el centro y su catálogo de servicios
-- Se resuelve el salon_id por nombre, así la migración se aplica sola.
-- default_sessions y param_keys alimentan el cierre de sesión.
-- ============================================================

insert into salons (name) values ('Marlenne')
on conflict do nothing;

insert into services (salon_id, name, category, duration_min, price_cents, default_sessions, param_keys, sort_order)
select s.id, v.name, v.category, v.duration_min, v.price_cents, v.default_sessions, v.param_keys, v.sort_order
from salons s
cross join (values
  -- Corporal
  ('Radiofrecuencia',               'corporal'::service_category,  30,  4500, 8, '{POTENCIA,TEMP. PIEL,TIEMPO}'::text[],       10),
  ('Criolipólisis',                 'corporal',                    60, 15000, 6, '{TEMP.,TIEMPO,CABEZAL,VACÍO}',               11),
  ('Criolipólisis - 2 h',           'corporal',                   120, 26000, 6, '{TEMP.,TIEMPO,CABEZAL,VACÍO}',               12),
  ('Cavitación',                    'corporal',                    30,  4000, 6, '{FRECUENCIA,POTENCIA,TIEMPO}',               13),
  ('Presoterapia',                  'corporal',                    30,  3000, 6, '{PRESIÓN,PROGRAMA,TIEMPO}',                  14),
  ('Vacumterapia',                  'corporal',                    30,  3500, 6, '{INTENSIDAD,CABEZAL,TIEMPO}',                15),
  ('Vacumterapia - 1 hora',         'corporal',                    60,  6000, 6, '{INTENSIDAD,CABEZAL,TIEMPO}',                16),
  ('Vacumterapia + cavitación',     'corporal',                    45,  5500, 6, '{INTENSIDAD,POTENCIA,TIEMPO}',               17),
  ('Onnafit Corporal',              'corporal',                    60,  9000, 6, '{PROGRAMA,INTENSIDAD,TIEMPO}',               18),
  ('Lipoláser',                     'corporal',                    60,  9500, 8, '{POTENCIA,PLACAS,TIEMPO}',                   19),
  ('Core fit - 45 min',             'corporal',                    45,  5000, 8, '{PROGRAMA,INTENSIDAD}',                      20),
  -- Facial
  ('Facial radiance lifting - 45 m','facial',                      45,  6500, 4, '{PROTOCOLO,TIEMPO}',                         30),
  ('Facial radiance lifting',       'facial',                      60,  8000, 4, '{PROTOCOLO,TIEMPO}',                         31),
  ('Resurfacing',                   'facial',                      60,  9500, 4, '{PEELING,CONCENTRACIÓN,TIEMPO}',             32),
  ('Tratamiento express',           'facial',                      60,  5500, 1, '{PROTOCOLO}',                                33),
  ('Purifying',                     'facial',                      60,  6000, 4, '{PROTOCOLO,EXTRACCIÓN,MASCARILLA}',          34),
  ('Facial Bloom',                  'facial',                      90, 11000, 4, '{PEELING,TIEMPO,MASCARILLA}',                35),
  ('HIFU - 1 hora',                 'facial',                      60, 18000, 2, '{CARTUCHO,DISPAROS,ENERGÍA,LÍNEAS}',         36),
  -- Depilación láser
  ('D. Láser - 15 min',             'laser',                       15,  2500, 8, '{FLUENCIA,PULSO,FRÍO,FOTOTIPO}',             40),
  ('D. Láser - 30 min',             'laser',                       30,  4500, 8, '{FLUENCIA,PULSO,FRÍO,FOTOTIPO}',             41),
  ('D. Láser - 1 hora',             'laser',                       60,  8000, 8, '{FLUENCIA,PULSO,FRÍO,FOTOTIPO}',             42),
  ('D. Láser - 1 h 30 min',         'laser',                       90, 11500, 8, '{FLUENCIA,PULSO,FRÍO,FOTOTIPO}',             43),
  ('D. Láser - 2 horas',            'laser',                      120, 15000, 8, '{FLUENCIA,PULSO,FRÍO,FOTOTIPO}',             44),
  ('D. Láser - 3 horas',            'laser',                      180, 21000, 8, '{FLUENCIA,PULSO,FRÍO,FOTOTIPO}',             45),
  -- Micropigmentación
  ('Microblading - 30 min',         'micro',                       30,  9000, 2, '{PIGMENTO,AGUJA,PROFUNDIDAD}',               50),
  ('Microblading - 90 min',         'micro',                       90, 24000, 2, '{PIGMENTO,AGUJA,PROFUNDIDAD}',               51),
  -- Bienestar
  ('Masaje relajante',              'bienestar',                   60,  5500, 1, '{PRESIÓN,ACEITE}',                           60),
  -- Valoraciones (0 €, no abren tratamiento)
  ('Valoración gratuita criolipólisis','valoracion',               15,     0, 1, '{}',                                          70),
  ('Valoración criolipólisis',      'valoracion',                  15,     0, 1, '{}',                                          71),
  ('Valoración HIFU',               'valoracion',                  15,     0, 1, '{}',                                          72),
  ('Valoración facial',             'valoracion',                  15,     0, 1, '{}',                                          73),
  ('Valoración corporal',           'valoracion',                  15,     0, 1, '{}',                                          74),
  ('Info / asesoramiento',          'valoracion',                  60,     0, 1, '{}',                                          75)
) as v(name, category, duration_min, price_cents, default_sessions, param_keys, sort_order)
where s.name = 'Marlenne'
  and not exists (
    select 1 from services x where x.salon_id = s.id and x.name = v.name
  );

-- ⚠️ Los precios son estimaciones del prototipo — confirmar con el centro
-- antes de dar el catálogo por bueno.
