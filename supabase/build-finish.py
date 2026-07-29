#!/usr/bin/env python3
"""
Build the runnable SQL from the section files.

Produces:
  · FINISH_PAYMENTS.sql  — the sections the live DB is still missing
  · fx.sql / fx2.sql / fx3.sql get a PREFLIGHT block injected so each
    one is ALSO safe to paste on its own

WHY THE PREFLIGHT EXISTS
  The sections used to form a column chain:
      fx  → amount_minor, base_currency
      fx2 → charge_currency
      fx3 → charge_minor
  Running one without the previous produced:
      ERROR 42703: column p.amount_minor does not exist
      ERROR 42703: column "charge_currency" ... does not exist

  And because the Supabase SQL Editor wraps a script in ONE
  transaction, a failure near the bottom rolled back the ALTER TABLEs
  at the top — so the columns never persisted and a re-run gave the
  identical error, which reads as "the fix didn't work".

  The preflight creates every column, the fx_rates table and the FX
  config up front, and clears the price functions (whose return type
  changes between files, which would otherwise raise 42P13). After
  that, order does not matter and any file can be run alone.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent

SECTIONS = ["claims", "paypal-only", "fx", "fx2", "fx3"]
NEEDS_PREFLIGHT = ("fx", "fx2", "fx3")

BEGIN = "-- ── PREFLIGHT · make this file safe to run ON ITS OWN ────────"
END = "-- ── end preflight ────────────────────────────────────────────"

HEADER = """-- ═══════════════════════════════════════════════════════════
-- FINISH PAYMENTS — the only SQL you still need to run
--
-- GENERATED. Edit the section files, then: python3 supabase/build-finish.py
--
-- Already on your database: schema, seat-gate, security, packs,
-- tiers, access, consult, enforcement, notices.  ✅
-- This adds the rest: claims, paypal-only, fx, fx2, fx3 — the till,
-- the prices, and PayPal.
--
-- Paste the WHOLE file into Supabase → SQL Editor → Run.
-- Safe to re-run. About 15 seconds.
--
-- Every column is created up front, so section order cannot break it.
-- ═══════════════════════════════════════════════════════════
"""

FOOTER = """

-- ▓▓▓▓▓▓▓▓▓▓ FINAL CHECK ▓▓▓▓▓▓▓▓▓▓
-- Fails loudly rather than letting you think this worked when it did not.
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


def strip_preflight(text: str) -> str:
    """Remove a previously injected preflight so this stays idempotent."""
    if BEGIN in text and END in text:
        head, rest = text.split(BEGIN, 1)
        _, tail = rest.split(END, 1)
        return head + tail.lstrip("\n")
    return text


def main() -> None:
    preflight = strip_preflight((ROOT / "_preflight.sql").read_text()).strip()
    preflight = (ROOT / "_preflight.sql").read_text().strip()

    # 1 · make each fx file standalone
    for name in NEEDS_PREFLIGHT:
        path = ROOT / f"{name}.sql"
        body = strip_preflight(path.read_text())
        # keep the file's own banner comment on top, inject after it
        lines = body.split("\n")
        cut = 0
        for i, line in enumerate(lines):
            if line.strip() and not line.lstrip().startswith("--"):
                cut = i
                break
        merged = "\n".join(lines[:cut]).rstrip() + "\n\n" + preflight + "\n\n" + "\n".join(lines[cut:]).lstrip("\n")
        path.write_text(merged)
        print(f"  preflight → {name}.sql")

    # 2 · build the combined file
    out = [HEADER]
    for name in SECTIONS:
        out.append(f"\n\n-- ▓▓▓▓▓▓▓▓▓▓ {name}.sql ▓▓▓▓▓▓▓▓▓▓\n\n")
        out.append((ROOT / f"{name}.sql").read_text())
    out.append(FOOTER)
    text = "".join(out)

    # 3 · self-checks — never ship a file that cannot run
    assert text.count("$$") % 2 == 0, "unbalanced $$ quoting"
    for m in re.finditer(r"create or replace function\s+(\w+)", text):
        assert "language" in text[m.start(): m.start() + 900].lower(), \
            f"truncated function: {m.group(1)}"

    dest = ROOT / "FINISH_PAYMENTS.sql"
    dest.write_text(text)
    print(f"\nwrote {dest.name} · {len(text.splitlines())} lines")
    print(f"  sections: {' → '.join(SECTIONS)}")


if __name__ == "__main__":
    main()
