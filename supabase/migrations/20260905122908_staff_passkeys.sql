-- Credenciales WebAuthn (huella / cara / Face ID) por miembro del equipo.
-- Solo las toca el servidor con service_role. El cliente no lee ni escribe.

create table staff_passkeys (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references staff(id) on delete cascade,
  credential_id text not null unique,
  public_key    text not null,
  counter       bigint not null default 0,
  transports    text[],
  device_type   text,
  backed_up     boolean not null default false,
  friendly_name text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index staff_passkeys_user_id_idx on staff_passkeys (user_id);

alter table staff_passkeys enable row level security;

revoke all on table staff_passkeys from anon, authenticated, public;
grant all on table staff_passkeys to service_role;
