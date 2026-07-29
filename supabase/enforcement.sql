-- ═════════════════════════════════════════════════════════════
-- THE RULES, ENFORCED BY THE SYSTEM — not by the founder's time
--
-- Run in Supabase → SQL Editor AFTER consult.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   · Existing members: one month to decide. No payment → out.
--   · New members: 14 days to try it. No payment → out.
--   · Conduct: warned, warned, warned — then out. Extreme content
--     is flagged instantly for the founder, never auto-removed.
--   · Refunds: you paid for what you used, so no refund for that.
--     Removed with unused time left → that balance comes back.
--   · Terms are sent to every member on enrolment so nobody is
--     ever surprised by why they were removed.
--
-- WHY THIS IS A SEPARATE FILE
--   Everything here REMOVES people or takes money decisions. It is
--   deliberately the most conservative code in the project: every
--   automatic removal is logged with a reason, every strike is
--   reversible, and extreme-content flags always wait for a human.
-- ═════════════════════════════════════════════════════════════

insert into config (key, value) values
  ('existing_grace_days', '30'),   -- current members: a month to decide
  ('trial_days',          '14'),   -- new members: two weeks
  ('strikes_to_remove',   '3'),    -- warnings before removal
  ('auto_remove',         'true'), -- the sweeper is armed
  ('tos_version',         '1')     -- bump to re-send the terms
on conflict (key) do update set value = excluded.value;

-- ── 1 · Why someone left, on the record ──────────────────────
alter table profiles add column if not exists removed_at    timestamptz;
alter table profiles add column if not exists removed_reason text;
alter table profiles add column if not exists strikes        int not null default 0;
alter table profiles add column if not exists tos_version    int not null default 0;
alter table profiles add column if not exists deadline_at    timestamptz;

/**
 * Everyone gets a personal deadline the moment they join, so the
 * app can always answer "how long have I got?" honestly instead of
 * springing a removal on someone.
 */
create or replace function set_deadline(p_academy text, p_days int)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_at timestamptz;
begin
  v_at := now() + (p_days || ' days')::interval;
  update profiles set deadline_at = v_at where academy_id = p_academy;
  return v_at;
end $$;
revoke execute on function set_deadline(text, int) from public, anon, authenticated;
grant execute on function set_deadline(text, int) to service_role;

-- existing members who have never paid get the one-month clock now
update profiles p
   set deadline_at = now() + ((select value::int from config where key = 'existing_grace_days') || ' days')::interval
 where p.academy_id <> 'PSA-FOUNDER'
   and p.deadline_at is null
   and not exists (
     select 1 from entitlements e
      where e.academy_id = p.academy_id and e.source is distinct from 'TRIAL'
   );

-- ── 2 · THE SWEEPER — removes only who it must ───────────────
/**
 * Removes members whose deadline has passed and who never paid.
 *
 * Four things it will NOT do, on purpose:
 *   · touch anyone holding a live pass
 *   · touch anyone inside the grace window
 *   · touch anyone who has EVER paid (source <> 'TRIAL')
 *   · touch the founder
 *
 * Nothing is deleted — status becomes 'removed', the seat frees up,
 * and every removal is written to audit_log with its reason.
 */
create or replace function sweep_unpaid()
returns table (academy_id text, handle text, reason text)
language plpgsql security definer set search_path = public as $$
declare
  v_on    boolean;
  v_grace int;
  r       record;
begin
  select (value = 'true') into v_on from config where key = 'auto_remove';
  if not coalesce(v_on, false) then return; end if;

  select value::int into v_grace from config where key = 'grace_days';
  v_grace := coalesce(v_grace, 3);

  for r in
    select p.academy_id, p.handle
      from profiles p
      left join entitlements e on e.academy_id = p.academy_id
     where p.academy_id <> 'PSA-FOUNDER'
       and p.status <> 'removed'
       and p.deadline_at is not null
       and p.deadline_at + (v_grace || ' days')::interval < now()
       -- never paid: no entitlement at all, or only ever a trial
       and (e.academy_id is null or coalesce(e.source, 'TRIAL') = 'TRIAL')
       -- and not currently inside any live pass
       and (e.expires_at is null or e.expires_at < now())
  loop
    update profiles
       set status = 'removed', removed_at = now(), removed_reason = 'NO PLAN AFTER THE DEADLINE'
     where profiles.academy_id = r.academy_id;

    perform audit('auto_remove', r.academy_id, jsonb_build_object('reason', 'unpaid'));

    academy_id := r.academy_id;
    handle     := r.handle;
    reason     := 'NO PLAN AFTER THE DEADLINE';
    return next;
  end loop;
end $$;
revoke execute on function sweep_unpaid() from public, anon, authenticated;
grant execute on function sweep_unpaid() to service_role;

-- Run it nightly if pg_cron is available; harmless if it is not.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('psa-sweep') where exists (select 1 from cron.job where jobname = 'psa-sweep');
    perform cron.schedule('psa-sweep', '0 3 * * *', 'select sweep_unpaid();');
    raise notice 'sweeper scheduled nightly at 03:00 UTC';
  else
    raise notice 'pg_cron not enabled — run sweep_unpaid() from the Founder Desk instead';
  end if;
exception when others then
  raise notice 'could not schedule the sweeper: % (run it from the Desk)', sqlerrm;
end $$;

-- ── 3 · CONDUCT — warned, warned, warned, then out ───────────
create table if not exists strikes (
  id         bigint generated always as identity primary key,
  academy_id text not null references profiles(academy_id) on delete cascade,
  reason     text not null,
  detail     text,
  severity   text not null default 'warning',   -- 'warning' | 'severe'
  by_founder boolean not null default false,
  at         timestamptz not null default now(),
  revoked    boolean not null default false
);
alter table strikes enable row level security;

-- a member may read their own record — no secret files
drop policy if exists strikes_read_own on strikes;
create policy strikes_read_own on strikes
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * Add a strike. At the limit the member is removed automatically —
 * but only for ordinary warnings. 'severe' never auto-removes: the
 * founder said he speaks to those people himself.
 */
create or replace function add_strike(
  p_academy  text,
  p_reason   text,
  p_detail   text default null,
  p_severity text default 'warning',
  p_founder  boolean default false
) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int; v_limit int;
begin
  insert into strikes (academy_id, reason, detail, severity, by_founder)
  values (upper(trim(p_academy)), p_reason, p_detail, p_severity, p_founder);

  select count(*) into v_n from strikes
   where academy_id = upper(trim(p_academy)) and not revoked;
  update profiles set strikes = v_n where academy_id = upper(trim(p_academy));

  select value::int into v_limit from config where key = 'strikes_to_remove';

  if p_severity <> 'severe' and v_n >= coalesce(v_limit, 3) then
    update profiles
       set status = 'removed', removed_at = now(),
           removed_reason = 'CONDUCT — ' || coalesce(v_limit, 3) || ' WARNINGS'
     where academy_id = upper(trim(p_academy)) and status <> 'removed';
    perform audit('auto_remove', p_academy, jsonb_build_object('reason', 'strikes', 'count', v_n));
  end if;

  return v_n;
end $$;
revoke execute on function add_strike(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function add_strike(text, text, text, text, boolean) to service_role;

/** a strike given in error should cost nothing */
create or replace function revoke_strike(p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_academy text; v_n int;
begin
  update strikes set revoked = true where id = p_id returning academy_id into v_academy;
  if v_academy is null then return false; end if;
  select count(*) into v_n from strikes where academy_id = v_academy and not revoked;
  update profiles set strikes = v_n where academy_id = v_academy;
  return true;
end $$;
revoke execute on function revoke_strike(bigint) from public, anon, authenticated;
grant execute on function revoke_strike(bigint) to service_role;

-- ── 4 · The content filter — extreme only, humour untouched ──
-- The founder was explicit: nobody is removed for saying "fuck".
-- This looks ONLY for sexual content and hate, and it never removes
-- anyone by itself — it flags for the founder to read.
create table if not exists flagged_messages (
  id         bigint generated always as identity primary key,
  message_id bigint,
  academy_id text,
  handle     text,
  channel    text,
  text       text not null,
  matched    text not null,
  at         timestamptz not null default now(),
  reviewed   boolean not null default false,
  action     text
);
alter table flagged_messages enable row level security;   -- founder only

create table if not exists banned_terms (
  term     text primary key,
  category text not null default 'sexual'   -- 'sexual' | 'hate'
);
alter table banned_terms enable row level security;

-- Seeded conservatively. Ordinary profanity is deliberately absent.
insert into banned_terms (term, category) values
  ('porn', 'sexual'), ('pornhub', 'sexual'), ('xvideos', 'sexual'),
  ('onlyfans', 'sexual'), ('nudes', 'sexual'), ('nsfw', 'sexual'),
  ('cp', 'sexual'), ('rape', 'sexual'), ('paedo', 'sexual'), ('pedo', 'sexual'),
  ('nigger', 'hate'), ('faggot', 'hate'), ('tranny', 'hate'), ('kike', 'hate')
on conflict (term) do nothing;

create or replace function flag_message()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_term text; v_handle text;
begin
  select term into v_term
    from banned_terms
   where position(term in lower(new.text)) > 0
   limit 1;

  if v_term is not null then
    select handle into v_handle from profiles where id = new.user_id;
    insert into flagged_messages (message_id, academy_id, handle, channel, text, matched)
    values (new.id, new.academy_id, coalesce(v_handle, new.handle), new.channel_slug, new.text, v_term);
    -- flagged, NOT removed: the founder reads it and decides
  end if;
  return new;
end $$;

drop trigger if exists trg_flag_message on messages;
create trigger trg_flag_message
  after insert on messages
  for each row execute function flag_message();

-- ── 5 · REFUNDS — you paid for what you used ─────────────────
/**
 * Pro-rata refund of UNUSED days only. Someone removed with 12 of 30
 * days left is owed those 12 days; the 18 they used are not refunded.
 * This records what is owed — the money still moves in your bank.
 */
create or replace function refund_due(p_academy text)
returns table (days_left int, tier text, source text, note text)
language plpgsql security definer stable set search_path = public as $$
declare v_exp timestamptz; v_tier text; v_src text;
begin
  select e.expires_at, e.tier, e.source into v_exp, v_tier, v_src
    from entitlements e where e.academy_id = upper(trim(p_academy));

  if v_exp is null or v_exp <= now() or coalesce(v_src, 'TRIAL') = 'TRIAL' then
    return query select 0, coalesce(v_tier, 'free'), coalesce(v_src, 'NONE'),
      'NOTHING OWED — NO UNUSED PAID TIME'::text;
    return;
  end if;

  return query select
    ceil(extract(epoch from (v_exp - now())) / 86400)::int,
    v_tier, v_src,
    'REFUND THE UNUSED DAYS ONLY — WHAT WAS USED IS NOT REFUNDED'::text;
end $$;
revoke execute on function refund_due(text) from public, anon, authenticated;
grant execute on function refund_due(text) to service_role;

/** remove someone, on the record, with the refund position attached */
create or replace function remove_member(p_academy text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_days int; v_tier text; v_src text; v_note text;
begin
  select days_left, tier, source, note into v_days, v_tier, v_src, v_note
    from refund_due(p_academy);

  update profiles
     set status = 'removed', removed_at = now(), removed_reason = left(p_reason, 120)
   where academy_id = upper(trim(p_academy)) and academy_id <> 'PSA-FOUNDER';

  if not found then return jsonb_build_object('ok', false, 'error', 'unknown academy id'); end if;

  perform audit('remove_member', p_academy,
                jsonb_build_object('reason', p_reason, 'refundDays', v_days));

  return jsonb_build_object('ok', true, 'academyId', upper(trim(p_academy)),
                            'reason', p_reason, 'refundDays', v_days,
                            'tier', v_tier, 'note', v_note);
end $$;
revoke execute on function remove_member(text, text) from public, anon, authenticated;
grant execute on function remove_member(text, text) to service_role;

-- ── 6 · TERMS OF SERVICE — everyone is told, in writing ──────
create table if not exists tos (
  version    int primary key,
  body       text not null,
  created_at timestamptz not null default now()
);
alter table tos enable row level security;
drop policy if exists tos_read on tos;
create policy tos_read on tos for select using (true);

insert into tos (version, body) values (1,
'PROSEASONACADEMY — HOW THIS WORKS

You have a seat in a capped academy. Season One is 1,000 places, so a
seat that is not being used is a seat someone else wanted.

1 · YOUR TRIAL
Every new member gets 14 days of full access. No card, no catch. Use it
properly and decide honestly.

2 · AFTER THE TRIAL
The academy is paid. If you do not take a plan by your deadline, your
seat is released and you are removed. The date is always shown in the
app — you will never be surprised by it.

3 · IF YOUR PASS RUNS OUT
Nothing is deleted. Your Match Vault, Loss Journal, XP, badges and the
stages you cleared all wait for you. Renew and you continue from the
same node.

4 · CONDUCT
Talk like a normal person. Swearing, jokes, banter and arguing about
football are all fine — nobody is removed for saying "fuck".

You will be warned for: spam, advertising, repeatedly derailing rooms.
Three warnings and you are out.

You are removed immediately, without warnings, for: sexual content,
content involving minors, hate speech targeting race, religion,
sexuality or disability, threats, or sharing another member''s private
information. These are read by a human first — the founder will speak
to you before anything final.

5 · REFUNDS
You are not refunded for time you have already used. If you are removed
while you still have unused paid time, that unused balance is returned
to you.

6 · YOUR DATA
Your match data, journal entries and messages live on your device and on
the academy''s server. The founder can read the public halls and the
messages you send him directly. He cannot read anything you have not
sent. Delete your account and your data goes with it.

7 · CHANGES
Prices and rules can change, and members are asked before they do — that
is what THE PRICING TABLE is for. You will always be told in the app
before anything affects you.

Questions about any of this: Settings → Contact the founder.')
on conflict (version) do nothing;

/** who still needs to be shown the current terms */
create or replace function tos_pending()
returns table (academy_id text, handle text)
language sql security definer stable set search_path = public as $$
  select p.academy_id, p.handle from profiles p
   where p.academy_id <> 'PSA-FOUNDER'
     and p.status <> 'removed'
     and p.tos_version < (select value::int from config where key = 'tos_version');
$$;
revoke execute on function tos_pending() from public, anon, authenticated;
grant execute on function tos_pending() to service_role;

/** the member confirms they have read them */
create or replace function accept_tos(p_version int)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update profiles set tos_version = p_version where auth_user_id = auth.uid();
  return found;
end $$;
grant execute on function accept_tos(int) to authenticated;

/** what the app shows: the terms + whether this member has accepted */
create or replace function my_tos()
returns table (version int, body text, accepted boolean, deadline_at timestamptz, strikes int)
language sql security definer stable set search_path = public as $$
  select t.version, t.body,
         (p.tos_version >= t.version),
         p.deadline_at,
         p.strikes
    from profiles p
    cross join lateral (
      select version, body from tos
       where version = (select value::int from config where key = 'tos_version')
    ) t
   where p.auth_user_id = auth.uid();
$$;
grant execute on function my_tos() to authenticated;

-- ── 7 · Proof ────────────────────────────────────────────────
do $$
declare v_due int; v_flag int; v_pend int;
begin
  select count(*) into v_due from profiles
   where academy_id <> 'PSA-FOUNDER' and status <> 'removed' and deadline_at is not null;
  select count(*) into v_flag from flagged_messages where not reviewed;
  select count(*) into v_pend from tos_pending();
  raise notice 'ENFORCEMENT ARMED';
  raise notice '  % member(s) on a deadline · % unreviewed flag(s) · % awaiting the terms',
    v_due, v_flag, v_pend;
  raise notice '  sweep manually any time:  select * from sweep_unpaid();';
end $$;
