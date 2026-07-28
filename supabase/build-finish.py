#!/usr/bin/env python3
"""
Build supabase/FINISH_PAYMENTS.sql — the remaining migrations, joined.

WHY THIS EXISTS
  fx.sql, fx2.sql and fx3.sql each REDEFINE price_now() and prices_now()
  with a different column list (6 -> 10 -> 8, and 11 -> 13). Postgres
  refuses to change a function's return type via CREATE OR REPLACE:

      ERROR: 42P13 cannot change return type of existing function

  Running the three files back to back in ONE script therefore fails
  partway through, which is exactly the error the founder already hit
  twice. So a catalogue-driven DROP is injected before each section.

  They are pure read-only price calculators — dropping them loses no
  data, and the very next statement rebuilds them.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent

# Only what the live database is still missing, in dependency order.
SECTIONS = ["claims", "paypal-only", "fx", "fx2", "fx3"]

# Functions whose shape changes between sections.
VOLATILE = ("price_now", "prices_now", "subsidy_check", "resync_charge_amounts")

DROP_BLOCK = """do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ({names})
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;
""".format(names=", ".join(f"'{n}'" for n in VOLATILE))

HEADER = """-- ═══════════════════════════════════════════════════════════
-- FINISH PAYMENTS — the only SQL you still need to run
--
-- GENERATED FILE. Edit the section files, then re-run:
--     python3 supabase/build-finish.py
--
-- Your database already has: schema, seat-gate, security, packs,
-- tiers, access, consult, enforcement, notices.  ✅
--
-- Missing: claims, paypal-only, fx, fx2, fx3 — everything the till
-- and PayPal actually need.
--
-- ── RUN THIS WHOLE FILE. DO NOT RUN THE SECTIONS SEPARATELY. ──
--
-- Each section depends on columns the one before it adds:
--     tiers  → tier, duration_days
--     fx     → amount_minor, base_currency      ← easy one to miss
--     fx2    → charge_currency
--     fx3    → charge_minor
--
-- Running fx2 on its own gives:
--     ERROR 42703: column p.amount_minor does not exist
-- Running fx3 on its own gives:
--     ERROR 42703: column "charge_currency" ... does not exist
--
-- And because the SQL Editor wraps a script in ONE transaction, a
-- failure at the bottom silently undoes the columns added at the
-- top — so a half-run script leaves nothing behind. That is why the
-- errors repeat even though the ALTER TABLE "already ran".
--
-- Every column is created up front below, so this file no longer
-- depends on section order at all.
--
-- The price functions are dropped before each section that changes
-- their shape, so ERROR 42P13 cannot happen either. They hold no data.
--
-- Paste the WHOLE file into Supabase → SQL Editor → Run.
-- Safe to re-run. About 15 seconds.
-- ═══════════════════════════════════════════════════════════

-- ── 0 · Every column this file needs, created up front ───────
-- Belt and braces: if a section is ever run out of order, or a past
-- partial run was rolled back, these still exist.
alter table products add column if not exists tier            text;
alter table products add column if not exists duration_days   int;
alter table products add column if not exists currency        text;
alter table products add column if not exists price_note      text;
alter table products add column if not exists amount_minor    bigint;
alter table products add column if not exists base_currency   text;
alter table products add column if not exists charge_currency text;
alter table products add column if not exists charge_minor    bigint;
"""

FOOTER = """

-- ▓▓▓▓▓▓▓▓▓▓ FINAL CHECK ▓▓▓▓▓▓▓▓▓▓
-- Fails loudly if anything above did not take, so you never think
-- this worked when it did not.
do $$
declare n int; bad int; r record;
begin
  raise notice '';
  raise notice '═══════════════════════════════════════════════';

  if to_regclass('public.pay_methods') is null then
    raise exception 'pay_methods missing — claims section did not apply';
  end if;
  if to_regclass('public.fx_rates') is null then
    raise exception 'fx_rates missing — fx section did not apply';
  end if;

  select count(*) into n from products where tier is not null and active;
  if n = 0 then raise exception 'no active passes — tiers.sql did not apply'; end if;

  select count(*) into bad from products
   where tier is not null and active and coalesce(charge_currency, '') <> 'GBP';
  if bad > 0 then
    raise exception '% pass(es) not charging GBP — PayPal would reject them', bad;
  end if;

  select count(*) into bad from products
   where tier is not null and active and coalesce(charge_minor, 0) <= 0;
  if bad > 0 then
    raise exception '% pass(es) have no charge amount', bad;
  end if;

  -- the naira headline must survive: Africa prices are stored in NGN
  select count(*) into bad from products
   where region = 'africa' and tier is not null and active
     and coalesce(amount_minor, 0) <= 0;
  if bad > 0 then
    raise exception '% Africa pass(es) lost their naira price', bad;
  end if;

  -- the 1-month passes stay retired: PayPal's flat ~30p fee ate them
  select count(*) into bad from products
   where duration_days = 30 and tier is not null and active;
  if bad > 0 then
    raise exception '% monthly pass(es) still active — should be retired', bad;
  end if;

  raise notice 'PAYMENTS READY · % passes, all charging GBP', n;
  raise notice '';
  for r in select code, display, amount from prices_now() loop
    raise notice '  % shown %  → charges £%',
      rpad(r.code, 12), rpad(r.display, 10), to_char(r.amount, 'FM999990.00');
  end loop;
  raise notice '';
  raise notice 'NEXT: deploy pay-start, pay-webhook, refresh-fx,';
  raise notice '      then set the PayPal secrets.';
  raise notice '═══════════════════════════════════════════════';
end $$;
"""


def main() -> None:
    out = [HEADER]
    for name in SECTIONS:
        body = (ROOT / f"{name}.sql").read_text()
        out.append(f"\n\n-- ▓▓▓▓▓▓▓▓▓▓ {name}.sql ▓▓▓▓▓▓▓▓▓▓\n\n")
        # Only the fx family reshapes the price functions.
        if re.search(r"create or replace function\s+price_now\b", body):
            out.append(
                "-- shape of price_now/prices_now changes here — clear the old ones\n"
            )
            out.append(DROP_BLOCK)
            out.append("\n")
        out.append(body)
    out.append(FOOTER)

    text = "".join(out)

    # ── self-checks: never ship a file that cannot run ──
    assert text.count("$$") % 2 == 0, "unbalanced $$ quoting"
    for m in re.finditer(r"create or replace function\s+(\w+)", text):
        seg = text[m.start(): m.start() + 900]
        assert "language" in seg.lower(), f"truncated function: {m.group(1)}"

    dest = ROOT / "FINISH_PAYMENTS.sql"
    dest.write_text(text)
    print(f"wrote {dest.relative_to(ROOT.parent)} · {len(text.splitlines())} lines")
    print(f"  sections: {' → '.join(SECTIONS)}")
    print(f"  drop guards: {text.count('drop function if exists')}")


if __name__ == "__main__":
    main()
