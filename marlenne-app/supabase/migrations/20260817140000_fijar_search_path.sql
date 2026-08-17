-- Fija el search_path de las funciones que lo tenían mutable. Sin él, quien
-- pueda crear objetos en un esquema del search_path del llamante podría
-- suplantar las funciones que estas invocan.

alter function set_initials()          set search_path = public;
alter function set_ends_at()           set search_path = public;
alter function check_block_conflict()  set search_path = public;
alter function free_slots(uuid, date, int, uuid, int) set search_path = public;
