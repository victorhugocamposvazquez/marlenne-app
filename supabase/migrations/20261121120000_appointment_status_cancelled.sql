-- 1 de 2. Estado «cancelada».
--
-- Va sola en su migración: Postgres no deja usar un valor de enum recién añadido
-- dentro de la misma transacción que lo crea. La migración siguiente ya lo usa.

alter type appointment_status add value if not exists 'cancelled';
