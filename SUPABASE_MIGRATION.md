# ProSeasonAcademy × Supabase — same app, new engine room

> Decision record: the custom Node/SQLite server (`server/`) remains in the
> repo, tested and proven, as a permanent fallback. The production backend
> moves to **Supabase free tier** (hosted Postgres + auth + realtime +
> edge functions). ₦0, no card on file, so no bill can ever exist.

---

## 0 · What changes for players: nothing. For you: less stress, one GUI.

Every screen, the coaches, the journeys, the vault, manual console review, the live
rooms, the Founder Desk, THE TILL — pixel-identical. The app was built
with a **backend seam**: one file (`src/data/backend.ts`) is the only
place that knows how the academy talks to its backend. We swap the
insides of that seam; every screen keeps calling the same functions.

| Player-facing thing | Before (custom server) | After (Supabase) |
|---|---|---|
| Sign-in (no password) | guest token from our `/auth/guest` | Supabase **anonymous sign-in** |
| Vault sync | POST to our `/matches/sync` | insert rows into `matches` table |
| Live rooms | our websocket server | Supabase **Realtime** (postgres changes) |
| Founder Desk stats | our `/admin/summary` + founder key | `admin-summary` edge function + founder key |
| Till wallets/top-ups | our SQLite wallets + founder key | `wallets`/`ledger` tables + edge functions + founder key |
| Prices | edit `products.json` on a server | edit the `products` table **in a browser GUI** |
| Jan 1 switch | `GO_LIVE` env var | one row in a `config` table (edit in GUI) |

---

## 1 · The new map

```
PHONES (the app, unchanged UI)
   │
   │  supabase-js (HTTPS + one realtime socket)
   ▼
SUPABASE PROJECT  "proseason-academy" — region: West EU (London)
   ├── Auth ............ anonymous sign-ins (each player = one auth user)
   ├── Postgres ........ profiles · matches · channels · messages
   │                     wallets · ledger · products · config
   ├── Row Level Security  the guard: players touch only their own rows;
   │                       wallets read-only to players; founder kind
   │                       blocked at the database itself
   ├── Realtime ........ live room fan-out from message INSERTs
   │                     (+ presence + typing broadcasts)
   └── Edge Functions .. ensure-profile · admin-summary · founder-broadcast
                         till-topup · till-subscribe · till-spend · react
                         (each founder move checks your FOUNDER_KEY header)

YOUR BROWSER — the Supabase dashboard
   ├── Table editor: prices/products/config edits with no code
   ├── SQL editor: one paste to create everything (§3–§6 below)
   └── Functions → secrets: FOUNDER_KEY = your founder key
```

---

## 2 · Auth without passwords (the guest system, preserved)

Today: app asks for a handle + country at sign-up; server mints a guest
token + `PSA-XXXXXX` Academy ID.

After: `supabase.auth.signInAnonymously()` gives the phone a session
(supabase-js persists it in AsyncStorage exactly like our token). Then the
app calls the **`ensure-profile`** function once: it creates the player's
`profiles` row (cleaned handle, coach, platform, **region**,
`PSA-XXXXXX`). Returning players skip creation — same idempotence as
now. Sessions are how every RLS rule knows WHO is asking.

---

## 3 · Postgres schema (this SQL is the whole brain)

```sql
-- players (founder row has auth_user_id NULL — it never logs in)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  handle text not null,
  coach_id text,
  platform text,
  region text not null default 'unset',          -- 'africa' | 'world'
  academy_id text unique not null,               -- PSA-XXXXXX
  created_at timestamptz not null default now()
);

create table matches (                            -- the vault
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  client_id text not null,
  at timestamptz not null,
  gf int not null default 0,
  ga int not null default 0,
  mode text, opp_style text, pass_acc int,
  no_sprint boolean not null default false,
  mechanics_used int not null default 0,
  led_at75 boolean,
  decisive text,
  source text not null default 'manual',
  composure int,
  note text,
  unique (user_id, client_id)                     -- idempotent sync, same as now
);

create table channels (                           -- the five rooms
  slug text primary key,
  name text not null,
  topic text
);
insert into channels values
  ('dressing-room', 'THE DRESSING ROOM', 'GENERAL — THE WHOLE ACADEMY IN ONE ROOM'),
  ('match-receipts', 'MATCH RECEIPTS', 'POST YOUR DUBS — RECEIPTS ONLY'),
  ('the-lab', 'THE LAB', 'LOSSES GO HERE TO DIE — BRING NOTES'),
  ('division-africa', 'DIVISION: AFRICA', 'PRICING HALL — CREDIT PACKS VS SUBS'),
  ('division-world', 'DIVISION: WORLDWIDE', 'PRICING HALL — THE SUBSCRIPTION DEBATE');

create table messages (
  id bigint generated always as identity primary key,
  channel_slug text not null references channels(slug) on delete cascade,
  user_id uuid not null references profiles(id),
  handle text not null,
  kind text not null default 'text',              -- 'text' | 'founder'
  text text not null,
  at timestamptz not null default now(),
  reactions jsonb not null default '{}'::jsonb
);
create index on messages (channel_slug, id);

create table wallets (                            -- THE TILL
  academy_id text primary key references profiles(academy_id),
  credits int not null default 0,
  plan text not null default 'free',
  plan_renews text,
  updated_at timestamptz not null default now()
);

create table ledger (                             -- every credit movement
  id bigint generated always as identity primary key,
  academy_id text not null,
  delta int not null,                             -- + top-up, − spend, 0 plan
  reason text not null,
  ref text,
  actor text not null default 'system',
  at timestamptz not null default now()
);
create index on ledger (academy_id, at);

create table products (                           -- YOUR PRICE LIST (GUI-editable)
  code text primary key,
  region text not null,                           -- 'africa' | 'world'
  title text not null,
  credits int,                                    -- africa packs
  plan text,                                      -- world subscriptions
  price text not null,                            -- display text
  pay_link text not null default 'ASK-IN-HALL',   -- paste paystack/flutterwave link
  sort int not null default 0,
  active boolean not null default true
);
insert into products (code, region, title, credits, price, sort) values
  ('NG-STARTER','africa','STARTER PACK',100,'₦500',1),
  ('NG-REGULAR','africa','REGULAR PACK',300,'₦1,200',2),
  ('NG-GRINDER','africa','GRINDER PACK',750,'₦2,500',3),
  ('NG-PATRON','africa','PATRON PACK',1700,'₦5,000',4);
insert into products (code, region, title, plan, price) values
  ('PRO-MONTHLY','world','PRO MONTHLY','pro','$4.99 / MONTH');

create table config (
  key text primary key,
  value text not null
);
insert into config values ('go_live', '2027-01-01T00:00:00Z');

-- the seeded FOUNDER identity (auth_user_id NULL — never logs in)
insert into profiles (auth_user_id, handle, region, academy_id)
values (null, 'FOUNDER', 'world', 'PSA-FOUNDER');
```

---

## 4 · Row Level Security — the guard rules (plain words)

RLS is Postgres enforcing *ownership inside the database itself* — even if
someone steals nothing more than the public anon key (it's public by
design), they can only ever do what these rules allow:

- `profiles`: you can read/update **only your own** row
  (`auth_user_id = auth.uid()`).
- `matches`: insert/read **only where you are the owner**; the
  `unique (user_id, client_id)` keeps sync idempotent like today.
- `channels`, `products`, `config`: **read-only for everyone**.
  Only YOU change them — from the dashboard, logged in as project owner.
- `messages`: everyone reads; insert only as yourself and only
  `kind = 'text'` — **impossible to fake the FOUNDER badge from a
  phone**, the database itself rejects it. Founder posts come from the
  edge function with the service role after the key check.
- `wallets`, `ledger`: **read your own row only; write — never**, for
  any player. Every credit move flows through the edge functions, which
  call the SQL below with the service role.
- Reactions never free-write either: a SECURITY DEFINER function
  `toggle_reaction(message_id, emoji)` looks up YOUR handle from your
  own session and toggles only it — no spoofing other people's emoji.

---

## 5 · Realtime rooms (replaces our websocket server)

The app's `joinRoom(slug, handler)` seam becomes:

```ts
const ch = supabase
  .channel(`room:${slug}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `channel_slug=eq.${slug}` },
      (payload) => handler({ type: 'message', message: payload.new }))
  .on('presence', { event: 'sync' }, /* who is online */)
  .on('broadcast', { event: 'typing' }, /* somebody types */)
  .subscribe();
```

Sending a message = one `insert` into `messages`; Realtime fans it out to
every subscribed phone — the exact behavior our custom WS had, including
the founder badge streaming live. Presence uses `channel.track(...)`;
typing uses broadcast (not stored). History with cursor pagination =
`select … where channel_slug = ? and id > ? order by id` — same contract
as `pullMessages(slug, afterSeq)` today.

---

## 6 · THE TILL on Postgres — atomic, still human-confirm-first

Money rules move into three SQL functions (called only via edge
functions, never directly from phones). Atomicity identical to the
SQLite transactions:

```sql
create or replace function till_topup(p_academy text, p_delta int,
  p_reason text default 'FOUNDER TOP-UP', p_ref text default null,
  p_actor text default 'founder') returns int
language plpgsql security definer as $$
declare p_credits int;
begin
  insert into wallets (academy_id) values (p_academy)
    on conflict (academy_id) do nothing;
  update wallets set credits = credits + p_delta, updated_at = now()
    where academy_id = p_academy returning credits into p_credits;
  insert into ledger (academy_id, delta, reason, ref, actor)
    values (p_academy, p_delta, p_reason, p_ref, p_actor);
  return p_credits;
end $$;

create or replace function till_spend(p_academy text, p_amount int,
  p_reason text) returns table (ok boolean, credits int)
language plpgsql security definer as $$
declare p_credits int; p_go_live timestamptz;
begin
  select value::timestamptz into p_go_live from config where key = 'go_live';
  if now() < p_go_live then
    return query select false, -1;            -- STORE_NOT_LIVE
  end if;
  update wallets set credits = credits - p_amount, updated_at = now()
    where academy_id = p_academy and wallets.credits >= p_amount
    returning wallets.credits into p_credits;  -- one statement = atomic guard
  if not found then
    return query select false,
      (select w.credits from wallets w where w.academy_id = p_academy);
  else
    insert into ledger (academy_id, delta, reason, actor)
      values (p_academy, -p_amount, p_reason, 'player');
    return query select true, p_credits;
  end if;
end $$;

create or replace function till_plan(p_academy text, p_plan text,
  p_renews text, p_actor text default 'founder') returns void
language plpgsql security definer as $$
begin
  insert into wallets (academy_id) values (p_academy)
    on conflict (academy_id) do nothing;
  update wallets set plan = p_plan, plan_renews = p_renews, updated_at = now()
    where academy_id = p_academy;
  insert into ledger (academy_id, delta, reason, ref, actor)
    values (p_academy, 0, 'PLAN → ' || upper(p_plan), p_renews, p_actor);
end $$;
```

The honest loop is untouched: payment lands in YOUR bank via your link →
**Founder Desk → CREDIT THE PLAYER** → `till-topup` (founder-key-checked)
→ wallet + ledger. The only upgrade: prices/products/`go_live` are now
**rows you edit in Supabase's spreadsheet GUI** — no files at all.

---

## 7 · The seven edge functions (TypeScript, paste-deploy in the dashboard)

| Function | Who calls it | What it does |
|---|---|---|
| `ensure-profile` | app at sign-in/boot | create-or-return the player's profile + Academy ID |
| `react` | app | validated emoji toggle (your handle only) |
| `founder-broadcast` | Founder Desk | key check → insert `kind:'founder'` message as PSA-FOUNDER |
| `admin-summary` | Founder Desk | key check → the exact JSON shape the desk renders today |
| `till-topup` | Founder Desk | key check → `till_topup` SQL |
| `till-subscribe` | Founder Desk | key check → `till_plan` SQL |
| `till-spend` | app (when live) | session → own academy id → `till_spend` SQL |

Founder move verification = `x-founder-key` header must equal a secret
env var (`FOUNDER_KEY`) you set once in the dashboard — same gate as
`ADMIN_KEY` today, same single-secret model, stored only on your
devices + in their secrets vault.

---

## 8 · App-side surgery list (the seam, honored)

**Rewrite internals (same exported names):** `src/data/backend.ts`

**New files:** `src/data/supabaseClient.ts` (client init),
`src/config.ts` gains two env reads:
`EXPO_PUBLIC_PSA_SUPABASE_URL`, `EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY`.

**Zero-touch files (proof the UI is engine-agnostic):**
`FounderDesk.tsx` · `StoreSheet.tsx` · `CommunityTab.tsx` ·
`SettingsTab.tsx` · `cloudSync.ts` · `matches.ts` · all coaches/journey/
scan logic. The Founder Desk will not know anything changed.

**Retired to fallback:** `server/` (custom Node/SQLite — kept, tested).

---

## 9 · YOUR total console burden — the honest complete list

1. `supabase.com` → sign up (GitHub/Google/email — **no card**). ~3 min.
2. **New project** → name `proseason-academy` → region **West EU
   (London)** → save the database password it generates. ~4 min.
3. **SQL Editor** → paste the ONE migration I hand you (everything in
   §3–§6) → **Run**. ~2 min.
4. **Table Editor** → glance at `products` — that's your new price GUI. ~1 min.
5. **Edge Functions** → create 7 functions pasting the code I hand you
   (dashboard editor, no installs) → set secret `FOUNDER_KEY`. ~20 min.
6. Copy **Project URL + anon public key** → give them to me for the build.

Total ≈ 30–40 minutes *with me live in chat*, spread across one or two
sessions. Compare with the Oracle path's remaining SSH/scp installs —
this is why the stress leaves: **no terminals, no keys, no firewalls.**

---

## 10 · Free-tier truth (numbers drift — dashboard is the live source)

- **Database 500 MB** ≈ millions of our small rows — years of headroom.
- **Auth 50,000 monthly-active free** — far ahead.
- **Realtime ≈ 200 concurrent connections free** — this is the FIRST real
  ceiling: ~200 people in live rooms at the same moment. The day you
  brush against it (post-launch, post-revenue): one click to Pro ($25/mo)
  — or the custom server in this repo runs thousands for ₦0. Both doors
  stay unlocked.
- **Pause after ~7 days of zero activity** — real players keep it awake;
  if it ever pauses, open the dashboard once and press resume.
- **No card on file = billing is structurally impossible.** Free tier
  throttles/pauses at limits; it can never charge.
- **Lock-in honesty:** leaving later = port the SQL + functions back
  (the custom server already implements every behavior; it is the map).
- Quotas as of mid-2026; Supabase changes them occasionally — your
  dashboard's billing page is always the truth.

---

## 11 · Build & test plan to v1.3

1. I write: migration SQL (this doc, refined) + `supabase/functions/*` +
   new `src/data/backend.ts` + `supabaseClient.ts`. TypeScript clean.
2. You do console steps §9 with me live (~30–40 min).
3. I re-run the full proof battery against YOUR project: guest/auth,
   vault sync idempotence, live rooms (send → appears on second
   client), founder broadcast over realtime, till top-up → balance →
   spend guard → PRO activate → admin-summary shape — same assertions
   as today's 8/8 and 8-group suites, pointed at Supabase.
4. Rebuild v1.3 APK/AAB with your Supabase URL + anon key baked in.
5. Manual sanity on your phone: sign-in → community live → FOUNDER DESK
   → TILL. Ship.

---

## 12 · SEASON ONE — the 1,000-seat system (locked design)

The academy grows in **seasons** so coaching stays personal. Season One = 1,000
seats, enforced **in code**, never by promise.

- `config` rows in schema: **`seat_cap = 1000`**, **`season_name = SEASON ONE`**,
  `go_live = 2027-01-01T00:00:00Z`. One SQL `update` changes the cap or opens
  Season Two later.
- **Gate lives in the `ensure-profile` edge function:** on a NEW player's first
  sign-in, count seats; if full → insert into the **`waitlist`** table and return
  HTTP **409 `{error:'SEASON_FULL', season, cap, taken}`** — the app shows the
  SEASON FULL panel + waitlist note, and in-app play continues (offline features
  always work; rooms + till light up when their seat opens).
- **`season_seats()`** counts profile rows **excluding the seeded `PSA-FOUNDER`
  row** — your own seat never eats a player's.
- **Founder Desk** shows `{season} · taken/cap SEATS CLAIMED` (+ `FULL — WAITLIST
  RUNNING`) via `admin_rollup()`'s `seats` block.
- Player-facing line everywhere: *"The academy grows in seasons so coaching stays
  personal. Season One: 1,000 seats."*
- Tests: `supabase/tests/verify.sql` proves seat counting, founder-row exclusion,
  and the spend/seat SQL; live E2E will force a tiny temporary `seat_cap` to prove
  the SEASON_FULL path end-to-end against the real project, then restore 1000.
