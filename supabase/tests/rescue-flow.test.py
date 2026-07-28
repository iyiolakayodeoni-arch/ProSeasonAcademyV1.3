#!/usr/bin/env python3
"""
THE RESCUE PATH — end-to-end, on a real Postgres.

A member whose card is refused must never hit a dead end. This walks
the whole journey on a replica of the live database:

    card fails  ->  one tap  ->  founder gets the ID, product and price
                ->  member is told a human has it
                ->  they send it to OPay instead
                ->  the desk shows the claim against the same person

It also pins a real bug this test found: claim_payment() used
gen_random_bytes(), which needs the pgcrypto extension that Supabase
does not enable by default. Every claim would have failed with

    ERROR 42883: function gen_random_bytes(integer) does not exist

at the worst possible moment — a member whose card had just been
refused, trying the fallback.

Needs:  pip install pgserver
Run:    python3 supabase/tests/rescue-flow.test.py
"""
import pgserver, pathlib, shutil, sys
REPO = pathlib.Path(__file__).resolve().parent.parent
SHIM = """create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid());
create or replace function auth.uid() returns uuid language sql stable as $f$ select current_setting('test.uid', true)::uuid $f$;
do $f$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $f$;
create publication supabase_realtime;"""
d=pathlib.Path('/tmp/pg_flow'); shutil.rmtree(d,ignore_errors=True); d.mkdir(parents=True)
db=pgserver.get_server(d)
db.psql("set client_min_messages=warning;\n"+SHIM)
for n in ["schema","seat-gate","security","packs","tiers","access","consult","enforcement","notices"]:
    db.psql("set client_min_messages=warning;\n"+(REPO/f"{n}.sql").read_text())
for f in ["FINISH_PAYMENTS.sql","stripe.sql","rescue.sql"]:
    db.psql("begin;\nset client_min_messages=warning;\n"+(REPO/f).read_text()+"\ncommit;")

# a real seated member
db.psql("""set client_min_messages=warning;
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into profiles (auth_user_id, handle, region, academy_id)
values ('11111111-1111-1111-1111-111111111111','TUNDE','africa','PSA-TEST01');""")

def as_member(sql):
    return db.psql("set client_min_messages=warning;\nset test.uid='11111111-1111-1111-1111-111111111111';\n"+sql)

p=f=0
def check(name, got, want):
    global p, f
    ok = want in got
    if ok: p += 1
    else:  f += 1
    print(f"{'PASS' if ok else 'FAIL'} · {name}")
    if not ok: print("      got:", got.strip()[:200])

r = as_member("select payment_trouble('NG-PRO-90','my gtbank card kept failing');")
check("member reports a failed card", r, "SENT")

r2 = as_member("select payment_trouble('NG-PRO-90','trying again');")
check("second report within the hour is throttled", r2, "ALREADY_SENT")

r3 = db.psql("select academy_id, kind from contact_messages where kind='payment';")
check("it reached the founder inbox", r3, "PSA-TEST01")

r4 = db.psql("select body from contact_messages where kind='payment';")
for want,label in [("PSA-TEST01","carries the ID"),("NG-PRO-90","carries the product"),
                   ("₦7,800","carries the price"),("gtbank","carries their note")]:
    check(f"message {label}", r4, want)

r5 = db.psql("select body from contact_messages where academy_id='PSA-TEST01' and kind<>'payment';")
check("member is reassured in-app", r5, "not going anywhere")

r6 = db.psql("select academy_id, has_claim, paid_since from stuck_payments();")
check("founder desk lists them", r6, "PSA-TEST01")

# they then send it manually — the claim should show against the same row
as_member("select claim_payment('NG-PRO-90','opay','₦7,800','sent from opay');")
r7 = db.psql("select academy_id, has_claim from stuck_payments();")
check("desk shows they since sent it manually", r7, "| t")

print(f"\n{p} passed · {f} failed")
sys.exit(1 if f else 0)
