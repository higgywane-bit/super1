-- Phase 6 · Launch: push tokens for the app shells, exercise media, renewal reminders, a push for each PT session.

-- Push tokens from the iOS / Android shells (Capacitor, FCM). A token is never deleted: a dead one is revoked.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  platform text not null check (platform in ('ios', 'android', 'web')),
  token text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id) where revoked_at is null;
alter table public.push_tokens enable row level security;
revoke delete, truncate on public.push_tokens from anon, authenticated;
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'push_tokens_no_delete') then
    create trigger push_tokens_no_delete before delete on public.push_tokens for each row execute function public.forbid_delete();
    create trigger push_tokens_no_truncate before truncate on public.push_tokens for each statement execute function public.forbid_delete();
  end if;
  if not exists (select 1 from pg_policies where tablename = 'push_tokens' and policyname = 'push_tokens_own') then
    create policy push_tokens_own on public.push_tokens for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

-- The app registers its token on each launch (re-registering moves it to this login and wakes it up).
create or replace function public.register_push(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_platform not in ('ios', 'android', 'web') or length(coalesce(p_token, '')) < 20 then raise exception 'Bad push token.' using errcode = 'P0001'; end if;
  insert into public.push_tokens (user_id, platform, token) values (auth.uid(), p_platform, p_token)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now(), revoked_at = null;
end $$;
revoke execute on function public.register_push(text, text) from public, anon;
grant execute on function public.register_push(text, text) to authenticated;

-- Exercise media (short loop or still) in the `exercises` bucket, shown in the library (C06) and the live workout (M05).
alter table public.exercises add column if not exists media_path text;

-- A push when a PT session is logged (member: "5 sessions left"); the worker sends it if they have the app.
create or replace function public.pt_session_push() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.outbox (kind, payload) values ('pt_push', jsonb_build_object('session_id', new.id, 'member_id', new.member_id));
  return new;
end $$;
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'pt_sessions_push') then
    create trigger pt_sessions_push after insert on public.pt_sessions for each row execute function public.pt_session_push();
  end if;
end $$;

-- Nightly: renewal reminders 7 and 1 days before the cover ends, and a win-back 3 days after it ended
-- (only when nothing new was bought). One per member, kind and end date; in the member's language.
create or replace function public.queue_renewal_reminders(p_day date default public.today_bkk()) returns integer
language plpgsql security definer set search_path = public as $$
declare r record; v_n int := 0; v_when text;
begin
  for r in
    select m.id as root, m.email, m.lang,
           public.coverage_end(m.id, 'membership', max(ms.ends_on) filter (where p_day between ms.starts_on and ms.ends_on)) as cover,
           max(ms.ends_on) as last_end
    from public.members m
    join public.members g on g.root_id = m.id
    join public.memberships ms on ms.member_id = g.id and ms.kind = 'membership' and ms.voided_at is null
    where m.id = m.root_id and m.archived_at is null and m.email is not null
    group by m.id, m.email, m.lang
  loop
    v_when := case
      when r.cover = p_day + 7 then 'before_7'
      when r.cover = p_day + 1 then 'before_1'
      when r.cover is null and r.last_end = p_day - 3 then 'after_3'
    end;
    continue when v_when is null;
    continue when exists (select 1 from public.outbox o where o.kind = 'renewal_reminder' and o.payload->>'member_id' = r.root::text
                          and o.payload->>'when' = v_when and o.payload->>'ends_on' = coalesce(r.cover, r.last_end)::text);
    insert into public.outbox (kind, payload)
    values ('renewal_reminder', jsonb_build_object('member_id', r.root, 'when', v_when, 'ends_on', coalesce(r.cover, r.last_end), 'lang', r.lang));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke execute on function public.queue_renewal_reminders(date) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.queue_renewal_reminders(date) to service_role;
  end if;
end $$;
