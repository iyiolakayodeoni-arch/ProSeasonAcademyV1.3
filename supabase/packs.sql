-- ═════════════════════════════════════════════════════════════
-- STARTER PACKS — credits AND the tricks that come with them
--
-- Run in Supabase → SQL Editor AFTER schema.sql, seat-gate.sql and
-- security.sql. Safe to re-run.
--
-- The founder's model: "the Home page tricks would be part of each
-- of those starter packs." Until now a pack only dropped credits in
-- a wallet and every trick had to be bought separately. Now a pack
-- is a bundle: its credits AND its tricks land together, in one
-- transaction, and the member owns those tricks permanently.
--
-- Everything is data. Which tricks sit in which pack is a table you
-- edit in the dashboard — no deploy, no code change, and it can be
-- re-cut every season as the meta moves.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · What each pack contains, beyond credits ──────────────
create table if not exists pack_items (
  pack_code text not null references products(code) on delete cascade,
  item text not null,               -- 'trick:mb-2026-07-24-011' | 'stage:3'
  sort int not null default 0,
  primary key (pack_code, item)
);
alter table pack_items enable row level security;

-- members may read the contents so the till can show "WHAT'S INSIDE"
drop policy if exists pack_items_read on pack_items;
create policy pack_items_read on pack_items for select using (true);

-- ── 2 · Granting a pack: credits + tricks, atomically ────────
/**
 * Founder-only. Called after a payment lands, from the Founder Desk.
 * Either everything is delivered or nothing is — a half-delivered
 * pack (credits but no tricks) can never exist.
 *
 * Returns the new credit balance.
 */
create or replace function grant_pack(
  p_academy text,
  p_pack    text,
  p_ref     text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_credits    int;
  v_pack_title text;
  v_pack_cr    int;
  v_plan       text;
  v_granted    int := 0;
begin
  p_academy := upper(trim(p_academy));
  p_pack    := upper(trim(p_pack));

  if not exists (
    select 1 from profiles
     where academy_id = p_academy and academy_id <> 'PSA-FOUNDER'
  ) then
    raise exception 'unknown academy id';
  end if;

  select title, coalesce(credits, 0), plan
    into v_pack_title, v_pack_cr, v_plan
    from products where code = p_pack and active;
  if v_pack_title is null then
    raise exception 'unknown or inactive pack';
  end if;

  -- make sure the wallet exists, then lock it for this transaction
  insert into wallets (academy_id) values (p_academy) on conflict do nothing;
  perform 1 from wallets where academy_id = p_academy for update;

  -- (a) the credits
  if v_pack_cr > 0 then
    update wallets
       set credits = credits + v_pack_cr, updated_at = now()
     where academy_id = p_academy;
    insert into ledger (academy_id, delta, reason, ref, actor)
      values (p_academy, v_pack_cr, 'PACK ' || v_pack_title, left(p_ref, 60), 'founder');
  end if;

  -- (b) a subscription pack activates PRO instead
  if v_plan is not null then
    update wallets
       set plan = v_plan,
           plan_renews = to_char(now() + interval '30 days', 'YYYY-MM-DD'),
           updated_at = now()
     where academy_id = p_academy;
    insert into ledger (academy_id, delta, reason, ref, actor)
      values (p_academy, 0, 'PLAN → ' || upper(v_plan), left(p_ref, 60), 'founder');
  end if;

  -- (c) the tricks that ship inside the pack — free, already paid for
  insert into unlocks (academy_id, item)
  select p_academy, pi.item
    from pack_items pi
   where pi.pack_code = p_pack
  on conflict do nothing;
  get diagnostics v_granted = row_count;

  if v_granted > 0 then
    insert into ledger (academy_id, delta, reason, ref, actor)
      values (p_academy, 0,
              v_granted || ' ITEM(S) FROM ' || v_pack_title,
              left(p_ref, 60), 'founder');
  end if;

  select credits into v_credits from wallets where academy_id = p_academy;
  return coalesce(v_credits, 0);
end $$;
revoke execute on function grant_pack(text, text, text) from public, anon, authenticated;
grant execute on function grant_pack(text, text, text) to service_role;

-- ── 3 · What a member sees before buying ─────────────────────
/**
 * The till's "what's inside" list. Readable by anyone signed in —
 * knowing what a pack contains is not privileged information.
 */
create or replace function pack_contents(p_pack text)
returns table (item text, sort int)
language sql security definer stable as $$
  select item, sort from pack_items
   where pack_code = upper(trim(p_pack))
   order by sort, item;
$$;
grant execute on function pack_contents(text) to anon, authenticated;

-- ── 4 · Seed: the starter packs carry real tricks ────────────
-- These reference the MetaBot items currently in liveFeed.json.
-- Re-cut them any season: delete the rows, insert new ones.
insert into pack_items (pack_code, item, sort) values
  -- STARTER: one trick to prove the format
  ('NG-STARTER', 'trick:mb-2026-07-24-011', 1),

  -- REGULAR: both live tricks
  ('NG-REGULAR', 'trick:mb-2026-07-24-011', 1),
  ('NG-REGULAR', 'trick:mb-2026-07-24-009', 2),

  -- GRINDER: the tricks + the first paid stage
  ('NG-GRINDER', 'trick:mb-2026-07-24-011', 1),
  ('NG-GRINDER', 'trick:mb-2026-07-24-009', 2),
  ('NG-GRINDER', 'stage:3', 3),

  -- PATRON: everything currently gateable
  ('NG-PATRON', 'trick:mb-2026-07-24-011', 1),
  ('NG-PATRON', 'trick:mb-2026-07-24-009', 2),
  ('NG-PATRON', 'stage:3', 3),
  ('NG-PATRON', 'stage:4', 4),
  ('NG-PATRON', 'stage:5', 5),
  ('NG-PATRON', 'stage:6', 6)
on conflict do nothing;

-- ── 5 · Proof ────────────────────────────────────────────────
do $$
declare r record;
begin
  raise notice 'PACK CONTENTS';
  for r in
    select p.code, p.title, coalesce(p.credits, 0) as cr, count(pi.item) as items
      from products p left join pack_items pi on pi.pack_code = p.code
     where p.active group by p.code, p.title, p.credits order by p.sort
  loop
    raise notice '  % (%) · % credits · % bundled item(s)', r.code, r.title, r.cr, r.items;
  end loop;
end $$;
