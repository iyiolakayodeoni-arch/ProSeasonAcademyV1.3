# Local brain verification (optional, he never has to run this)

`schema.sql` was verified end-to-end on a scratch PostgreSQL 17 before
it ever touched the real project:

1. start any local postgres, `createdb psatest`
2. `psql -d psatest -v ON_ERROR_STOP=1 -f tests/local-stubs.sql -f schema.sql`
   (the stubs shim Supabase's roles / auth.uid() / publication locally)
3. `psql -d psatest -v ON_ERROR_STOP=1 -f tests/verify.sql`
   → `ALL SUPABASE BRAIN TESTS PASSED`

Covers: seat counter (founder excluded), founder top-ups + ghost-id 404s,
go-live spend gate, atomic debit + insufficient guard, PRO activation +
ledger lines, reaction toggle (own handle only), RLS (own rows only,
wallet writes blocked, FOUNDER badge unforgeable from a phone), waitlist,
and the admin_rollup JSON the Founder Desk renders.
