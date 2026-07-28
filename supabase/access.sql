-- ═════════════════════════════════════════════════════════════
-- SERIOUS MEMBERS ONLY — the trial, then a paid academy
--
-- Run in Supabase → SQL Editor AFTER tiers.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   · The free week grants a real pass to everyone holding a seat.
--   · After the trial, no plan = no app. Limited seats, serious
--     people. Like paying for a course with a capped intake.
--   · The pricing model is then discussed WITH the members — they
--     helped build it, so they help price it.
--
-- WHAT THIS CHANGES
--   'free' stops being a permanent tier you can sit on forever.
--   It becomes LAPSED: the door is shut, but nothing is deleted.
--   Their vault, journal, XP and badges wait for them.
--
-- ⚠️ THE GRACE WINDOW — why it exists
--   Payment is manual: they pay, you see the alert, you grant the
--   pass. That lag is human, not instant. Without a grace period a
--   member who paid at 11pm gets locked out at midnight through no
--   fault of their own — and that is exactly the kind of thing that
--   costs you a member and a reputation. Default 3 days.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · The ladder, restated ─────────────────────────────────
update tiers set title = 'LAPSED',
  blurb = 'Your pass has run out. Nothing is lost — your vault, journal, XP and badges are exactly where you left them. Pick a pass and the doors open again.'
 where key = 'free';

insert into config (key, value) values
  ('trial_tier',        'mid'),   -- what the free week grants
  ('trial_days',        '14'),    -- the founder said two weeks
  ('grace_days',        '3'),     -- manual-payment cushion after expiry
  ('lapsed_seat_days',  '30'),    -- lapsed this long → seat may be reclaimed
  ('paid_only',         'true')   -- after the trial, a plan is required
on conflict (key) do update set value = excluded.value;

-- ── 2 · Access, with the grace window ────────────────────────
/**
 * The real question: is this member's door open right now?
 *
 *   'active'  — inside a paid (or trial) pass
 *   'grace'   — expired within grace_days; still let them in, and
 *               tell them plainly. Protects anyone whose payment is
 *               sitting in your inbox unprocessed.
 *   'lapsed'  — past grace. Read-only shell, nothing deleted.
 */
create or replace function access_state(p_academy text)
returns table (state text, tier text, expires_at timestamptz, days_left int, grace_left int)
language plpgsql security definer stable set search_path = public as $$
declare
  v_tier  text;
  v_exp   timestamptz;
  v_grace int;
begin
  select value::int into v_grace from config where key = 'grace_days';
  v_grace := coalesce(v_grace, 3);

  select e.tier, e.expires_at into v_tier, v_exp
    from entitlements e where e.academy_id = p_academy;

  -- never had a pass, or explicitly lapsed
  if v_tier is null or v_exp is null then
    return query select 'lapsed'::text, 'free'::text, null::timestamptz, 0, 0;
    return;
  end if;

  if v_exp > now() then
    return query select
      'active'::text, v_tier, v_exp,
      greatest(0, ceil(extract(epoch from (v_exp - now())) / 86400)::int),
      0;
    return;
  end if;

  if v_exp + (v_grace || ' days')::interval > now() then
    return query select
      'grace'::text, v_tier, v_exp, 0,
      greatest(0, ceil(extract(epoch from ((v_exp + (v_grace || ' days')::interval) - now())) / 86400)::int);
    return;
  end if;

  return query select 'lapsed'::text, 'free'::text, v_exp, 0, 0;
end $$;
grant execute on function access_state(text) to anon, authenticated;

/** the caller's own state — what every screen reads */
create or replace function my_access()
returns table (tier text, level int, expires_at timestamptz, days_left int,
               state text, grace_left int, paid_only boolean)
language plpgsql security definer stable set search_path = public as $$
declare
  v_academy text;
  r         record;
  v_lvl     int;
  v_paid    boolean;
begin
  select academy_id into v_academy from profiles where auth_user_id = auth.uid();
  select (value = 'true') into v_paid from config where key = 'paid_only';

  if v_academy is null then
    return query select 'free'::text, 0, null::timestamptz, 0, 'lapsed'::text, 0, coalesce(v_paid, true);
    return;
  end if;

  select * into r from access_state(v_academy);
  select level into v_lvl from tiers where key = r.tier;

  return query select
    r.tier,
    case when r.state = 'lapsed' then 0 else coalesce(v_lvl, 0) end,
    r.expires_at, r.days_left, r.state, r.grace_left, coalesce(v_paid, true);
end $$;
grant execute on function my_access() to authenticated;

-- can_access() must respect the lapsed state: a one-off unlock does
-- NOT reopen a closed door once the academy is paid-only.
create or replace function can_access(p_item text)
returns boolean
language plpgsql security definer stable set search_path = public as $$
declare
  v_academy text;
  v_state   text;
  v_tier    text;
  v_lvl     int;
  v_free    int;
  v_mid     int;
  v_n       int;
  v_need    text;
  v_paid    boolean;
begin
  select academy_id into v_academy from profiles where auth_user_id = auth.uid();
  if v_academy is null then return false; end if;

  select (value = 'true') into v_paid from config where key = 'paid_only';
  select state, tier into v_state, v_tier from access_state(v_academy);

  -- paid-only academy: a lapsed member opens nothing until they renew
  if coalesce(v_paid, true) and v_state = 'lapsed' then
    return false;
  end if;

  if exists (select 1 from unlocks where academy_id = v_academy and item = p_item) then
    return true;
  end if;

  select level into v_lvl from tiers where key = v_tier;
  v_lvl := coalesce(v_lvl, 0);

  if p_item like 'stage:%' then
    v_n := split_part(p_item, ':', 2)::int;
    select value::int into v_free from config where key = 'free_stages';
    select value::int into v_mid  from config where key = 'mid_stages';
    if v_n <= coalesce(v_free, 2) then return not coalesce(v_paid, true) or v_state <> 'lapsed'; end if;
    if v_n <= coalesce(v_mid, 6)  then return v_lvl >= 1; end if;
    return v_lvl >= 2;
  end if;

  if p_item like 'trick:%' then
    select value into v_need from config where key = 'tricks_min_tier';
    return v_lvl >= (select level from tiers where key = coalesce(v_need, 'mid'));
  end if;

  if p_item = 'filmroom' then
    select value into v_need from config where key = 'filmroom_min_tier';
    return v_lvl >= (select level from tiers where key = coalesce(v_need, 'pro'));
  end if;

  return false;
end $$;
grant execute on function can_access(text) to authenticated;

-- ── 3 · THE FREE WEEK — grant it to everyone with a seat ─────
/**
 * Founder-only. Gives every seated member the trial tier.
 *
 * Deliberately additive: anyone already holding a longer pass keeps
 * it (greatest(...)), so a paying member is never downgraded by the
 * trial. New members who claim a seat DURING the window get it too
 * (see grant_trial_one, called from ensure-profile).
 */
create or replace function grant_trial(p_days int default null, p_tier text default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_days int;
  v_tier text;
  v_exp  timestamptz;
  v_n    int;
begin
  select coalesce(p_days, (select value::int from config where key = 'trial_days'), 14) into v_days;
  select coalesce(p_tier, (select value from config where key = 'trial_tier'), 'mid') into v_tier;
  v_exp := now() + (v_days || ' days')::interval;

  insert into entitlements (academy_id, tier, expires_at, source)
  select p.academy_id, v_tier, v_exp, 'TRIAL'
    from profiles p
   where p.academy_id <> 'PSA-FOUNDER' and p.status <> 'removed'
  on conflict (academy_id) do update
    set tier = case when entitlements.expires_at > v_exp then entitlements.tier else v_tier end,
        expires_at = greatest(coalesce(entitlements.expires_at, v_exp), v_exp),
        source = case when entitlements.expires_at > v_exp then entitlements.source else 'TRIAL' end,
        updated_at = now();

  get diagnostics v_n = row_count;

  insert into ledger (academy_id, delta, reason, actor)
  select p.academy_id, 0,
         'TRIAL · ' || upper(v_tier) || ' → ' || to_char(v_exp, 'DD Mon YYYY'), 'founder'
    from profiles p
   where p.academy_id <> 'PSA-FOUNDER' and p.status <> 'removed';

  return v_n;
end $$;
revoke execute on function grant_trial(int, text) from public, anon, authenticated;
grant execute on function grant_trial(int, text) to service_role;

/** one member — used when someone joins mid-trial */
create or replace function grant_trial_one(p_academy text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_tier  text;
begin
  select value::timestamptz into v_start from config where key = 'founder_week_start';
  select value::timestamptz into v_end   from config where key = 'founder_week_end';
  select value into v_tier from config where key = 'trial_tier';

  -- only inside the announced window
  if v_start is null or v_end is null or now() < v_start or now() >= v_end then
    return false;
  end if;

  insert into entitlements (academy_id, tier, expires_at, source)
  values (p_academy, coalesce(v_tier, 'mid'), v_end, 'TRIAL')
  on conflict (academy_id) do update
    set tier = case when entitlements.expires_at > v_end then entitlements.tier else coalesce(v_tier, 'mid') end,
        expires_at = greatest(coalesce(entitlements.expires_at, v_end), v_end),
        updated_at = now();
  return true;
end $$;
revoke execute on function grant_trial_one(text) from public, anon, authenticated;
grant execute on function grant_trial_one(text) to service_role;

-- ── 4 · Seats: lapsed members eventually free theirs ─────────
/**
 * Who has been lapsed long enough that their seat could go to
 * someone on the waitlist. REPORTS ONLY — it never removes anyone.
 * Taking a seat back is a decision you make, not a cron job.
 */
create or replace function lapsed_members()
returns table (academy_id text, handle text, tier text, expired_at timestamptz, days_lapsed int)
language sql security definer stable set search_path = public as $$
  select p.academy_id, p.handle, e.tier, e.expires_at,
         floor(extract(epoch from (now() - e.expires_at)) / 86400)::int
    from profiles p
    join entitlements e on e.academy_id = p.academy_id
   where p.academy_id <> 'PSA-FOUNDER'
     and p.status <> 'removed'
     and e.expires_at is not null
     and e.expires_at + ((select value::int from config where key = 'lapsed_seat_days') || ' days')::interval < now()
   order by e.expires_at;
$$;
revoke execute on function lapsed_members() from public, anon, authenticated;
grant execute on function lapsed_members() to service_role;

-- ── 5 · Proof ────────────────────────────────────────────────
do $$
declare v_t text; v_d text; v_g text; v_p text; v_seated int; v_active int;
begin
  select value into v_t from config where key = 'trial_tier';
  select value into v_d from config where key = 'trial_days';
  select value into v_g from config where key = 'grace_days';
  select value into v_p from config where key = 'paid_only';
  select count(*) into v_seated from profiles where academy_id <> 'PSA-FOUNDER';
  select count(*) into v_active from entitlements where expires_at > now();
  raise notice 'ACCESS ARMED · trial=% for % days · grace % days · paid_only=%',
    upper(v_t), v_d, v_g, v_p;
  raise notice '  % seated member(s) · % holding a live pass', v_seated, v_active;
  raise notice '  run  select grant_trial();  to open the free window to everyone';
end $$;
