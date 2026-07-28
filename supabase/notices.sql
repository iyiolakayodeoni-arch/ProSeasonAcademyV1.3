-- ═════════════════════════════════════════════════════════════
-- THE ACADEMY BOT — nobody is ever removed without being told
--
-- Run in Supabase → SQL Editor AFTER enforcement.sql. Safe to re-run.
--
-- THE GAP THIS CLOSES
--   The founder said: "a bot sends u a message ... so when we kick u
--   out u know why we did." Strikes were being recorded silently —
--   a member could collect three warnings without ever seeing one,
--   then find themselves removed. That is exactly the surprise the
--   founder is trying to avoid.
--
--   Now every warning, every deadline reminder and the terms
--   themselves arrive as a message in the member's own inbox, from
--   THE ACADEMY. They can read it, and reply to a human.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · Messages the academy sends TO a member ───────────────
-- contact_messages already carries member → founder. This adds the
-- other direction, so one inbox holds the whole conversation.
alter table contact_messages add column if not exists from_academy boolean not null default false;
alter table contact_messages add column if not exists kind_detail  text;

create or replace function notify_member(
  p_academy text,
  p_kind    text,
  p_body    text,
  p_detail  text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_uid uuid; v_handle text;
begin
  select id, handle into v_uid, v_handle
    from profiles where academy_id = upper(trim(p_academy));
  if v_uid is null then return null; end if;

  insert into contact_messages
    (user_id, handle, academy_id, kind, body, from_academy, kind_detail, read)
  values
    (v_uid, v_handle, upper(trim(p_academy)), p_kind, p_body, true, p_detail, false)
  returning id into v_id;

  return v_id;
end $$;
revoke execute on function notify_member(text, text, text, text) from public, anon, authenticated;
grant execute on function notify_member(text, text, text, text) to service_role;

-- ── 2 · A warning now ARRIVES ────────────────────────────────
/**
 * Same rules as before — three warnings and out, severe never
 * auto-removes — but the member is TOLD each time, in plain words,
 * with the count and what happens next.
 */
create or replace function add_strike(
  p_academy  text,
  p_reason   text,
  p_detail   text default null,
  p_severity text default 'warning',
  p_founder  boolean default false
) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int; v_limit int; v_left int; v_msg text;
begin
  insert into strikes (academy_id, reason, detail, severity, by_founder)
  values (upper(trim(p_academy)), p_reason, p_detail, p_severity, p_founder);

  select count(*) into v_n from strikes
   where academy_id = upper(trim(p_academy)) and not revoked;
  update profiles set strikes = v_n where academy_id = upper(trim(p_academy));

  select value::int into v_limit from config where key = 'strikes_to_remove';
  v_limit := coalesce(v_limit, 3);
  v_left  := greatest(0, v_limit - v_n);

  if p_severity = 'severe' then
    v_msg :=
      'WARNING ' || v_n || ' OF ' || v_limit || E'\n\n' ||
      'Reason: ' || p_reason || E'\n\n' ||
      'This one is serious enough that the founder will speak to you himself before ' ||
      'anything is decided. Nothing has happened to your seat yet. If you think this ' ||
      'is a mistake, reply here — he reads every message.';
  elsif v_left > 0 then
    v_msg :=
      'WARNING ' || v_n || ' OF ' || v_limit || E'\n\n' ||
      'Reason: ' || p_reason || E'\n\n' ||
      'You have ' || v_left || ' warning' || case when v_left = 1 then '' else 's' end ||
      ' left before your seat is released. Nobody is warned for swearing, jokes or ' ||
      'arguing about football — this is about something else. Read the terms in ' ||
      'Settings, and reply here if you disagree.';
  else
    v_msg :=
      'YOUR SEAT HAS BEEN RELEASED' || E'\n\n' ||
      'Reason: ' || p_reason || E'\n\n' ||
      'This was warning ' || v_n || ' of ' || v_limit || '. You were told each time. ' ||
      'Nothing of yours has been deleted. If you had unused paid time, that balance is ' ||
      'refunded. If you believe this is wrong, reply here — a human reads it.';
  end if;

  perform notify_member(p_academy, 'warning', v_msg, p_reason);

  if p_severity <> 'severe' and v_n >= v_limit then
    update profiles
       set status = 'removed', removed_at = now(),
           removed_reason = 'CONDUCT — ' || v_limit || ' WARNINGS'
     where academy_id = upper(trim(p_academy)) and status <> 'removed';
    perform audit('auto_remove', p_academy, jsonb_build_object('reason', 'strikes', 'count', v_n));
  end if;

  return v_n;
end $$;
revoke execute on function add_strike(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function add_strike(text, text, text, text, boolean) to service_role;

-- ── 3 · The welcome — terms land in the inbox on enrolment ───
/**
 * The founder: "you get a message telling u our terms of service
 * everything u need to know as u are enrolled." The blocking screen
 * still exists, but this leaves a copy they can re-read any time.
 */
create or replace function welcome_member(p_academy text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare v_days int; v_msg text;
begin
  select value::int into v_days from config where key = 'trial_days';
  v_days := coalesce(v_days, 14);

  v_msg :=
    'WELCOME TO PROSEASONACADEMY' || E'\n\n' ||
    'Your seat is live. Here is everything that matters, in short:' || E'\n\n' ||
    '· You have ' || v_days || ' days of full access, free. No card needed.' || E'\n' ||
    '· After that the academy is paid — Season One is capped, so a seat ' ||
    'that is not used is a seat someone else wanted.' || E'\n' ||
    '· Your deadline is always visible in Settings. You will never be ' ||
    'surprised by it.' || E'\n' ||
    '· If a pass runs out, NOTHING is deleted. Your vault, journal, XP and ' ||
    'badges wait for you.' || E'\n' ||
    '· Talk like a normal person. Swearing and banter are fine. Warnings are ' ||
    'for spam and hate; three and the seat goes.' || E'\n' ||
    '· Removed with unused paid time? That balance comes back to you.' || E'\n\n' ||
    'The full terms are in Settings. This thread is your direct line to the ' ||
    'founder — questions, bugs, ideas, or if something feels wrong. He reads ' ||
    'every one.';

  return notify_member(p_academy, 'message', v_msg, 'WELCOME');
end $$;
revoke execute on function welcome_member(text) from public, anon, authenticated;
grant execute on function welcome_member(text) to service_role;

-- ── 4 · Deadline reminders, before it is too late ────────────
/**
 * Nudges at 7 days, 3 days and 1 day out. Idempotent per member per
 * milestone, so running it twice in a day never double-messages.
 */
create table if not exists notice_log (
  academy_id text not null,
  notice     text not null,
  at         timestamptz not null default now(),
  primary key (academy_id, notice)
);
alter table notice_log enable row level security;

create or replace function remind_deadlines()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_sent int := 0; v_key text; v_msg text; v_d int;
begin
  for r in
    select p.academy_id, p.handle, p.deadline_at,
           ceil(extract(epoch from (p.deadline_at - now())) / 86400)::int as days
      from profiles p
      left join entitlements e on e.academy_id = p.academy_id
     where p.academy_id <> 'PSA-FOUNDER'
       and p.status <> 'removed'
       and p.deadline_at is not null
       and p.deadline_at > now()
       and (e.academy_id is null or coalesce(e.source, 'TRIAL') = 'TRIAL')
  loop
    v_d := r.days;
    if v_d not in (1, 3, 7) then continue; end if;

    v_key := 'deadline-' || v_d;
    if exists (select 1 from notice_log
                where academy_id = r.academy_id and notice = v_key) then
      continue;
    end if;

    v_msg := case
      when v_d = 7 then
        'ONE WEEK LEFT ON YOUR TRIAL' || E'\n\n' ||
        'Seven days until your seat needs a plan. If the academy has been worth it, ' ||
        'pick a pass in Settings → THE TILL. If it has not, tell me why in this thread — ' ||
        'that is more useful to me than silence.'
      when v_d = 3 then
        'THREE DAYS LEFT' || E'\n\n' ||
        'Your seat is released in three days without a plan. Everything you have built ' ||
        'stays saved either way — but the seat goes to someone on the waitlist.'
      else
        'LAST DAY' || E'\n\n' ||
        'Your seat is decided today. Settings → THE TILL. If money is the problem, ' ||
        'reply here and talk to me — I would rather know than lose you quietly.'
    end;

    perform notify_member(r.academy_id, 'message', v_msg, v_key);
    insert into notice_log (academy_id, notice) values (r.academy_id, v_key)
      on conflict do nothing;
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end $$;
revoke execute on function remind_deadlines() from public, anon, authenticated;
grant execute on function remind_deadlines() to service_role;

-- ── 5 · Removal always explains itself ───────────────────────
create or replace function remove_member(p_academy text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_days int; v_tier text; v_src text; v_note text; v_msg text;
begin
  select days_left, tier, source, note into v_days, v_tier, v_src, v_note
    from refund_due(p_academy);

  update profiles
     set status = 'removed', removed_at = now(), removed_reason = left(p_reason, 120)
   where academy_id = upper(trim(p_academy)) and academy_id <> 'PSA-FOUNDER';

  if not found then return jsonb_build_object('ok', false, 'error', 'unknown academy id'); end if;

  v_msg :=
    'YOUR SEAT HAS BEEN RELEASED' || E'\n\n' ||
    'Reason: ' || p_reason || E'\n\n' ||
    case when coalesce(v_days, 0) > 0
      then 'You had ' || v_days || ' day' || case when v_days = 1 then '' else 's' end ||
           ' of paid time left. That balance is refunded — you are not charged for ' ||
           'what you did not use.' || E'\n\n'
      else 'You are not owed a refund: the time you paid for was used.' || E'\n\n'
    end ||
    'Nothing of yours has been deleted. If you believe this is a mistake, reply here.';

  perform notify_member(p_academy, 'message', v_msg, 'REMOVED');
  perform audit('remove_member', p_academy,
                jsonb_build_object('reason', p_reason, 'refundDays', v_days));

  return jsonb_build_object('ok', true, 'academyId', upper(trim(p_academy)),
                            'reason', p_reason, 'refundDays', v_days,
                            'tier', v_tier, 'note', v_note);
end $$;
revoke execute on function remove_member(text, text) from public, anon, authenticated;
grant execute on function remove_member(text, text) to service_role;

-- the sweeper tells people too, instead of just vanishing them
create or replace function sweep_unpaid()
returns table (academy_id text, handle text, reason text)
language plpgsql security definer set search_path = public as $$
declare v_on boolean; v_grace int; r record;
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
       and (e.academy_id is null or coalesce(e.source, 'TRIAL') = 'TRIAL')
       and (e.expires_at is null or e.expires_at < now())
  loop
    update profiles
       set status = 'removed', removed_at = now(),
           removed_reason = 'NO PLAN AFTER THE DEADLINE'
     where profiles.academy_id = r.academy_id;

    perform notify_member(r.academy_id, 'message',
      'YOUR SEAT HAS BEEN RELEASED' || E'\n\n' ||
      'Your deadline passed without a plan. You were reminded at seven days, three ' ||
      'days and on the last day.' || E'\n\n' ||
      'Nothing has been deleted — your vault, journal, XP and badges are all still ' ||
      'here. Take a pass any time and you carry on from the same node, if a seat is ' ||
      'free. If money was the problem, reply here and talk to me.',
      'SWEPT');

    perform audit('auto_remove', r.academy_id, jsonb_build_object('reason', 'unpaid'));

    academy_id := r.academy_id;
    handle     := r.handle;
    reason     := 'NO PLAN AFTER THE DEADLINE';
    return next;
  end loop;
end $$;
revoke execute on function sweep_unpaid() from public, anon, authenticated;
grant execute on function sweep_unpaid() to service_role;

-- ── 6 · Nightly: remind first, then sweep ────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('psa-remind') where exists (select 1 from cron.job where jobname = 'psa-remind');
    perform cron.schedule('psa-remind', '0 9 * * *', 'select remind_deadlines();');
    raise notice 'reminders scheduled daily at 09:00 UTC';
  else
    raise notice 'pg_cron not enabled — run remind_deadlines() from the Desk';
  end if;
exception when others then
  raise notice 'could not schedule reminders: %', sqlerrm;
end $$;

-- ── 7 · Proof ────────────────────────────────────────────────
do $$
declare v_from int;
begin
  select count(*) into v_from from contact_messages where from_academy;
  raise notice 'THE ACADEMY BOT ARMED · % message(s) sent so far', v_from;
  raise notice '  every warning, reminder and removal now lands in the member''s inbox';
end $$;
