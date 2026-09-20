-- Contexto breve que el usuario puede mantener en su perfil.
alter table public.profiles
  add column if not exists contexto_personal text;
