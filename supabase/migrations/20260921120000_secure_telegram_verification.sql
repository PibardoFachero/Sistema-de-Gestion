-- La verificación confirma el control de una cuenta de Telegram, no del número telefónico.
alter table public.profiles
  add column if not exists telegram_username text,
  add column if not exists telegram_verified_at timestamp with time zone;

-- Los OTP nunca deben poder leerse o actualizarse directamente desde el cliente.
alter table public.verifications enable row level security;
revoke all on table public.verifications from anon, authenticated;

create or replace function public.verify_telegram_otp(
  p_identifier text,
  p_otp text
)
returns table(telegram_username text, verified_at timestamp with time zone)
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_verification_id uuid;
  normalized_identifier text := lower(ltrim(btrim(p_identifier), '@'));
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select verification.id
    into matched_verification_id
  from public.verifications verification
  where lower(verification.phone_or_username) = normalized_identifier
    and verification.otp_code = btrim(p_otp)
    and verification.is_verified is false
    and verification.expires_at >= now()
  order by verification.created_at desc
  limit 1
  for update;

  if matched_verification_id is null then
    return;
  end if;

  update public.verifications
  set is_verified = true
  where id = matched_verification_id;

  update public.profiles
  set telegram_username = normalized_identifier,
      telegram_verified_at = now(),
      updated_at = now()
  where id = (select auth.uid())
  returning public.profiles.telegram_username, public.profiles.telegram_verified_at
    into telegram_username, verified_at;

  if telegram_username is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  return next;
end;
$$;

revoke all on function public.verify_telegram_otp(text, text) from public;
grant execute on function public.verify_telegram_otp(text, text) to authenticated;
revoke all on function public.verify_telegram_otp(text, text) from anon;
