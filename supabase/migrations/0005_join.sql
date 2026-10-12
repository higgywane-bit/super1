-- =====================================================================================
-- SUPER1 · phase 1: the counter QR.
-- An existing member who links their tag and email ("Already a member") has signed before: they
-- need a name, the tag number and an email, not a new waiver. New sign-ups still need agree + signature.
-- =====================================================================================

create or replace function public.create_signup(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_waiver uuid; v_coach uuid; v_kind text := coalesce(p->>'kind', 'new');
begin
  if v_kind not in ('new', 'link') then raise exception 'Unknown sign-up kind' using errcode = 'P0001'; end if;
  select id into v_waiver from public.waiver_versions order by version desc limit 1;
  if nullif(trim(p->>'first_name'), '') is null then raise exception 'First name is required.' using errcode = 'P0001'; end if;
  if v_kind = 'new' then
    if nullif(trim(p->>'phone'), '') is null and nullif(trim(p->>'email'), '') is null then raise exception 'Phone or email is required.' using errcode = 'P0001'; end if;
    if coalesce((p->>'agreed')::boolean, false) is not true or nullif(p->>'signature_path', '') is null then raise exception 'The waiver must be signed.' using errcode = 'P0001'; end if;
  else
    if length(public.normalize_code(p->>'link_tag')) < 3 then raise exception 'Type the number on your tag.' using errcode = 'P0001'; end if;
    if nullif(trim(p->>'email'), '') is null then raise exception 'Email is required.' using errcode = 'P0001'; end if;
  end if;
  if (p->>'coach_id') is not null and v_kind = 'new' then
    select id into v_coach from public.coaches where id = (p->>'coach_id')::uuid and on_qr and active;
  end if;
  insert into public.signups (kind, first_name, last_name, phone, email, lang, coach_id, waiver_version_id, signature_path, link_tag)
  values (v_kind, trim(p->>'first_name'), coalesce(trim(p->>'last_name'), ''), nullif(trim(p->>'phone'), ''),
          nullif(lower(trim(p->>'email')), ''), coalesce(p->>'lang', 'en'), v_coach,
          case when v_kind = 'new' then v_waiver end, case when v_kind = 'new' then p->>'signature_path' end,
          nullif(public.normalize_code(p->>'link_tag'), ''))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'first_name', trim(p->>'first_name'), 'coach', (select name from public.coaches where id = v_coach));
end $$;

revoke execute on function public.create_signup(jsonb) from public;
grant execute on function public.create_signup(jsonb) to anon, authenticated;
