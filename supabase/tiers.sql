-- ═════════════════════════════════════════════════════════════
-- ONE SYSTEM, TWO CURRENCIES — FREE · MID · PRO
--
-- Run in Supabase → SQL Editor AFTER schema.sql, seat-gate.sql,
-- security.sql and packs.sql. Safe to re-run.
--
-- WHY THIS REPLACES THE OLD SPLIT
-- Africa bought credits and kept unlocks forever. Abroad paid a
-- monthly sub and lost everything if they stopped. Same academy,
-- two different deals — and the moment those two members compared
-- notes in the halls, one of them was going to feel cheated.
--
-- Now both sides climb the SAME three-rung ladder for the SAME
-- period of time. The only difference is the currency on the price
-- tag: ₦ for Africa, $ for everyone else.
--
--   FREE  · always on, never expires, genuinely useful
--   MID   · the working member's tier
--   PRO   · almost everything
--
-- Access is by TIER + EXPIRY, not by counting individual purchases,
-- so "what do I get?" has one honest answer in every country.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · The ladder ───────────────────────────────────────────
create table if not exists tiers (
  key   text primary key,          -- 'free' | 'mid' | 'pro'
  level int  not null,             -- 0 | 1 | 2 — compare with >=
  title text not null,
  blurb text
);

insert into tiers (key, level, title, blurb) values
  ('free', 0, 'FREE',
   'The first stages, your whole Match Vault, the Loss Journal, the scans and the halls. Free forever — not a trial.'),
  ('mid',  1, 'ACADEMY',
   'The full journey, every stage, and the weekly tricks as they drop.'),
  ('pro',  2, 'PRO',
   'Everything in the academy: the journey, every trick, the film room, and first call on the founder''s time.')
on conflict (key) do update set level = excluded.level,
                                title = excluded.title,
                                blurb = excluded.blurb;

-- ── 2 · Products become timed tier passes ────────────────────
alter table products add column if not exists tier text references tiers(key);
alter table products add column if not exists duration_days int;
alter table products add column if not exists currency text;

-- The SAME ladder in both regions. Prices differ; access does not.
-- Every number here is editable in the Table Editor — nothing is
-- hardcoded, because the pricing is not settled.
insert into products (code, region, title, tier, duration_days, currency, price, sort, active) values
  -- AFRICA · naira
  ('NG-MID-30',  'africa', 'ACADEMY · 1 MONTH',  'mid', 30,  'NGN', '₦1,500',  1, true),
  ('NG-MID-90',  'africa', 'ACADEMY · 3 MONTHS', 'mid', 90,  'NGN', '₦3,900',  2, true),
  ('NG-PRO-30',  'africa', 'PRO · 1 MONTH',      'pro', 30,  'NGN', '₦3,000',  3, true),
  ('NG-PRO-90',  'africa', 'PRO · 3 MONTHS',     'pro', 90,  'NGN', '₦7,800',  4, true),
  ('NG-PRO-365', 'africa', 'PRO · 1 SEASON',     'pro', 365, 'NGN', '₦25,000', 5, true),
  -- WORLD · dollars, same rungs, same durations
  ('WD-MID-30',  'world',  'ACADEMY · 1 MONTH',  'mid', 30,  'USD', '$3.99',   1, true),
  ('WD-MID-90',  'world',  'ACADEMY · 3 MONTHS', 'mid', 90,  'USD', '$9.99',   2, true),
  ('WD-PRO-30',  'world',  'PRO · 1 MONTH',      'pro', 30,  'USD', '$7.99',   3, true),
  ('WD-PRO-90',  'world',  'PRO · 3 MONTHS',     'pro', 90,  'USD', '$19.99',  4, true),
  ('WD-PRO-365', 'world',  'PRO · 1 SEASON',     'pro', 365, 'USD', '$59.99',  5, true)
on conflict (code) do update set tier          = excluded.tier,
                                 duration_days = excluded.duration_days,
                                 currency      = excluded.currency,
                                 title         = excluded.title,
                                 sort          = excluded.sort;

-- retire the old credit packs + the lone monthly sub: they are the
-- unequal deal we are removing. Kept, not deleted, so old ledger
-- rows still resolve to a product name.
update products set active = false
 where code in ('NG-STARTER','NG-REGULAR','NG-GRINDER','NG-PATRON','PRO-MONTHLY');

-- ── 3 · Who is on what, until when ───────────────────────────
create table if not exists entitlements (
  academy_id text primary key references profiles(academy_id) on delete cascade,
  tier       text not null default 'free' references tiers(key),
  expires_at timestamptz,                     -- null = free, never expires
  source     text,                            -- the product code that granted it
  updated_at timestamptz not null default now()
);
alter table entitlements enable row level security;

drop policy if exists entitlements_read_own on entitlements;
create policy entitlements_read_own on entitlements
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * The effective tier for a member RIGHT NOW. An expired pass silently
 * becomes 'free' — nobody is ever locked out of their own vault, they
 * just stop seeing the paid rungs.
 */
create or replace function effective_tier(p_academy text)
returns text
language sql security definer stable set search_path = public as $$
  select coalesce(
    (select e.tier from entitlements e
      where e.academy_id = p_academy
        and (e.expires_at is null or e.expires_at > now())),
    'free');
$$;
grant execute on function effective_tier(text) to anon, authenticated;

/** the caller's own tier + when it runs out — what the app renders */
create or replace function my_access()
returns table (tier text, level int, expires_at timestamptz, days_left int)
language sql security definer stable set search_path = public as $$
  with me as (select academy_id from profiles where auth_user_id = auth.uid())
  select
    t.key,
    t.level,
    e.expires_at,
    case when e.expires_at is null then null
         else greatest(0, ceil(extract(epoch from (e.expires_at - now())) / 86400)::int)
    end
  from me
  left join entitlements e on e.academy_id = me.academy_id
                          and (e.expires_at is null or e.expires_at > now())
  join tiers t on t.key = coalesce(e.tier, 'free');
$$;
grant execute on function my_access() to authenticated;

-- ── 4 · Granting a pass: stack time, never lose it ───────────
/**
 * Founder-only, called when a payment lands.
 *
 * Fairness rules, deliberate:
 *   · Same tier again        → the days ADD to whatever is left.
 *   · Upgrade (mid → pro)    → remaining days carry over, at the
 *                              better tier. Nobody is punished for
 *                              upgrading mid-period.
 *   · Downgrade while active → refused, so a cheaper pass cannot
 *                              silently strip a PRO member.
 */
create or replace function grant_tier(
  p_academy text,
  p_product text,
  p_ref     text default null
) returns table (tier text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_tier   text;
  v_days   int;
  v_title  text;
  v_cur    text;
  v_curexp timestamptz;
  v_newlvl int;
  v_curlvl int;
  v_base   timestamptz;
  v_exp    timestamptz;
begin
  p_academy := upper(trim(p_academy));
  p_product := upper(trim(p_product));

  if not exists (select 1 from profiles
                  where academy_id = p_academy and academy_id <> 'PSA-FOUNDER') then
    raise exception 'unknown academy id';
  end if;

  select tier, duration_days, title into v_tier, v_days, v_title
    from products where code = p_product and active;
  if v_tier is null or v_days is null then
    raise exception 'unknown or non-tier product';
  end if;

  insert into entitlements (academy_id) values (p_academy) on conflict do nothing;
  perform 1 from entitlements where academy_id = p_academy for update;

  select e.tier, e.expires_at into v_cur, v_curexp
    from entitlements e where e.academy_id = p_academy;

  select level into v_newlvl from tiers where key = v_tier;
  select level into v_curlvl from tiers where key = coalesce(v_cur, 'free');

  -- a live, higher pass is never replaced by a cheaper one
  if v_curexp is not null and v_curexp > now() and v_curlvl > v_newlvl then
    raise exception 'ACTIVE_HIGHER_TIER';
  end if;

  -- time stacks: start from whatever is left, or from now
  v_base := greatest(coalesce(v_curexp, now()), now());
  v_exp  := v_base + (v_days || ' days')::interval;

  update entitlements
     set tier = v_tier, expires_at = v_exp, source = p_product, updated_at = now()
   where academy_id = p_academy;

  -- keep the wallet's plan flag in step (older screens still read it)
  insert into wallets (academy_id) values (p_academy) on conflict do nothing;
  update wallets
     set plan = case when v_tier = 'pro' then 'pro' else 'free' end,
         plan_renews = to_char(v_exp, 'YYYY-MM-DD'),
         updated_at = now()
   where academy_id = p_academy;

  insert into ledger (academy_id, delta, reason, ref, actor)
    values (p_academy, 0,
            upper(v_tier) || ' · ' || v_title || ' → ' || to_char(v_exp, 'DD Mon YYYY'),
            left(p_ref, 60), 'founder');

  -- anything bundled with the pass (a specific trick, a bonus stage)
  insert into unlocks (academy_id, item)
  select p_academy, pi.item from pack_items pi where pi.pack_code = p_product
  on conflict do nothing;

  return query select v_tier, v_exp;
end $$;
revoke execute on function grant_tier(text, text, text) from public, anon, authenticated;
grant execute on function grant_tier(text, text, text) to service_role;

-- ── 5 · What each rung opens ─────────────────────────────────
-- Config, not code: move the line any time without a rebuild.
insert into config (key, value) values
  ('free_stages',      '2'),    -- stages 1-2 on the FREE tier
  ('mid_stages',       '6'),    -- MID opens the whole journey
  ('tricks_min_tier',  'mid'),  -- the tier that unlocks Home tricks
  ('filmroom_min_tier','pro')   -- PRO gets the film room
on conflict (key) do update set value = excluded.value;

/**
 * One question the whole app asks: may THIS member open THIS thing?
 * Tier-based, so the answer is identical in Lagos and London.
 */
create or replace function can_access(p_item text)
returns boolean
language plpgsql security definer stable set search_path = public as $$
declare
  v_academy text;
  v_tier    text;
  v_lvl     int;
  v_free    int;
  v_mid     int;
  v_n       int;
  v_need    text;
begin
  select academy_id into v_academy from profiles where auth_user_id = auth.uid();
  if v_academy is null then return false; end if;

  -- a one-off unlock (bundled or bought outright) always wins
  if exists (select 1 from unlocks where academy_id = v_academy and item = p_item) then
    return true;
  end if;

  v_tier := effective_tier(v_academy);
  select level into v_lvl from tiers where key = v_tier;

  if p_item like 'stage:%' then
    v_n    := split_part(p_item, ':', 2)::int;
    select value::int into v_free from config where key = 'free_stages';
    select value::int into v_mid  from config where key = 'mid_stages';
    if v_n <= coalesce(v_free, 2) then return true; end if;                -- free rung
    if v_n <= coalesce(v_mid, 6)  then return v_lvl >= 1; end if;          -- academy rung
    return v_lvl >= 2;                                                     -- pro rung
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

-- ── 6 · Everyone starts on FREE ──────────────────────────────
insert into entitlements (academy_id, tier)
select academy_id, 'free' from profiles where academy_id <> 'PSA-FOUNDER'
on conflict do nothing;

-- ── 7 · Proof ────────────────────────────────────────────────
do $$
declare r record;
begin
  raise notice 'THE LADDER — identical in both regions';
  for r in
    select region, tier, duration_days, price, title
      from products where active and tier is not null
     order by region, sort
  loop
    raise notice '  % · % · % days · % (%)',
      upper(r.region), upper(r.tier), r.duration_days, r.price, r.title;
  end loop;
end $$;
