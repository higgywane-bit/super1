-- =====================================================================================
-- SUPER1 · phase 0: languages per login.
-- profiles are written by Pete only (RLS), but anyone may change their own language.
-- A member's language also drives the emails SUPER1 sends them (members.lang).
-- =====================================================================================

create or replace function public.set_my_lang(p_lang text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_lang not in ('en', 'th', 'ru') then raise exception 'Unknown language %', p_lang using errcode = 'P0001'; end if;
  if auth.uid() is null then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.profiles set lang = p_lang where id = auth.uid() and lang is distinct from p_lang;
  update public.members set lang = p_lang where user_id = auth.uid() and lang is distinct from p_lang;
end $$;

revoke execute on function public.set_my_lang(text) from public, anon;
grant execute on function public.set_my_lang(text) to authenticated;
