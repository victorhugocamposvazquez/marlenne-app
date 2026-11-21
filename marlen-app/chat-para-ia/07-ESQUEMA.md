# Esquema actual (citas, clientas, servicios, bonos)

Reconstruido desde `supabase/migrations/`. No hay tipos generados en el repo (`supabase gen types` no está volcado).

Todas las filas de negocio cuelgan de `salon_id`. RLS: `salon_id = my_salon()`.

## Enums

```sql
-- services.category empezó como este enum y pasó a text (slug de service_categories).
-- 'corporal' | 'facial' | 'laser' | 'micro' | 'bienestar' | 'valoracion'

appointment_status: 'prog' | 'curso' | 'done' | 'noshow'
-- No hay estado «cancelada». Cancelar borra la fila.
-- El exclusion de solapes ignora status = 'noshow'.
```

## clients

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid pk | |
| salon_id | uuid → salons | |
| full_name | text not null | |
| name_fold | text generated | `fold_text(full_name)`, sin acentos, minúsculas. Buscador. |
| phone | text | Comentario original: E.164. El alta guarda lo que se escribe. |
| email | text | |
| birth_date | date | |
| tags | text[] default '{}' | 'VIP', etc. |
| notes | text | |
| sms_opt_in | boolean default true | |
| import_batch_id | uuid → import_batches | null si no vino de un import |
| created_at | timestamptz | |

Índices: salon, phone, gin sobre `to_tsvector('spanish', full_name)`, name_fold en la migración del 2026-11-20.

## service_categories

| Columna | Tipo |
| --- | --- |
| id | uuid pk |
| salon_id | uuid |
| slug | text, único por salón |
| name | text |
| color | text |
| sort_order | int |
| is_active | boolean |
| opens_treatment | boolean default true |

## services

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid pk | |
| salon_id | uuid | |
| name | text | |
| category | text | Slug. Antes era enum. |
| category_id | uuid not null → service_categories | |
| duration_min | int > 0 | |
| price_cents | int ≥ 0 | |
| default_sessions | int default 1 | |
| param_keys | text[] | |
| color | text | Null = color de la categoría. |
| is_active | boolean | |
| sort_order | int | |
| bookable_online | boolean default true | |
| booking_slug | text | Único por salón si no es null. |
| import_batch_id | uuid | |

## appointments

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid pk | |
| salon_id | uuid | |
| client_id | uuid → clients on delete set null | |
| client_name | text | Si aún no hay ficha. Hace falta `client_id` o `client_name`. |
| service_id | uuid not null → services | |
| provider_id | uuid not null → staff | |
| treatment_id | uuid → treatments | |
| client_pack_id | uuid → client_packs | Bono que gasta la cita, si hay. |
| session_no | int | |
| starts_at | timestamptz | |
| duration_min | int > 0 | |
| ends_at | timestamptz | Trigger al cambiar inicio o duración. |
| status | appointment_status default 'prog' | |
| price_cents | int | Precio congelado del catálogo. |
| paid_cents | int default 0 | Cobrado, aparte del estado. |
| payment_method | text | `cash` \| `card` \| `bizum` \| `mixed` \| null |
| payment_split | jsonb | Solo si mixed. Claves cash/card/bizum → céntimos. |
| note | text | |
| source | text default 'agenda' | `agenda` \| `online` \| `import` |
| confirmed_at | timestamptz | |
| reminder_due_at | timestamptz | SMS |
| reminder_sent_at | timestamptz | |
| reminder_skipped_reason | text | |
| reminder_skipped_phone | text | |
| staff_reminded_at | timestamptz | Push al equipo |
| booking_link_id | uuid → booking_links | |
| stripe_checkout_session_id | text | |
| stripe_payment_intent_id | text | |
| import_batch_id | uuid | |
| created_by | uuid → staff | |
| created_at / updated_at | timestamptz | |

Solape: exclusion gist por `provider_id` + rango, salvo `noshow`. Un trigger impide pisar un `time_blocks`.

## pack_templates (plantilla de bono)

| Columna | Tipo |
| --- | --- |
| id | uuid pk |
| salon_id | uuid |
| name | text |
| service_id | uuid → services, null si se borra el servicio |
| sessions_total | int ≥ 1 |
| price_cents | int ≥ 0 |
| valid_days | int, null = sin caducidad |
| is_active | boolean |
| sort_order | int |
| created_at | timestamptz |

## client_packs (bono vendido)

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid pk | |
| salon_id | uuid | |
| template_id | uuid → pack_templates | |
| name | text | |
| service_id | uuid → services | |
| owner_client_id | uuid not null → clients | |
| friend_client_id | uuid → clients | Comparte saldo. No puede ser la dueña. |
| sessions_total | int ≥ 1 | |
| sessions_done | int default 0 | Se consume al marcar la cita hecha, no al reservar. |
| price_cents | int | |
| paid_cents | int default 0 | |
| payment_method | text | Igual que la cita. |
| payment_split | jsonb | |
| purchased_at | date | |
| expires_at | date | |
| note | text | |
| created_by | uuid → staff | |
| created_at | timestamptz | |

No hay columna de sesiones apartadas. El comentario de la migración dice que el saldo baja al cerrar la cita.

## treatments

No es un bono. Es la ficha clínica (zona, sesiones, parámetros). La cita puede apuntar a un `treatment_id`. El chat no lo usa.
