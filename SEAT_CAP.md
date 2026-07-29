# The 1,000-Seat Cap — how to make it actually hold

**Status: the fix is written and committed, but NOT yet applied to your database.**
It takes one paste. Instructions in §3.

---

## 1 · What was wrong

The cap was enforced in **one place**: the `ensure-profile` edge function. That left two
ways past it — and one of them needed no secret at all.

### Hole 1 — anyone could mint their own seat (the serious one)

This policy shipped in `schema.sql`:

```sql
create policy profiles_insert_own on profiles
  for insert to authenticated with check (auth_user_id = auth.uid());
```

`to authenticated` means **any signed-in device** could write its own row straight into
`profiles` via the public REST API — never calling `ensure-profile`, never touching the
seat count:

```
POST /rest/v1/profiles
{ "auth_user_id": "<their own id>", "handle": "ME", "academy_id": "PSA-WHATEVER" }
```

Anonymous sign-in is open (it has to be — it's how members get in), and the anon key ships
inside the app, so anyone who unpacked the APK had everything needed. Season One would
have quietly grown past 1,000 with no error and nothing in the Founder Desk to flag it.

### Hole 2 — the last seat could be sold twice

`ensure-profile` counted seats and inserted in two separate round-trips:

```ts
const { data: seats0 } = await sb.rpc('season_seats')  // reads taken = 999
if (taken >= cap) { ...reject... }
// ← another signup lands here
await sb.from('profiles').insert(...)                  // both insert → 1001
```

Classic time-of-check/time-of-use race. Rare with trickling signups; **likely on launch
day**, which is exactly when everyone arrives at once.

---

## 2 · The fix

The cap is now a rule of the **database**, not of one function.

**`supabase/seat-gate.sql`** does four things:

1. **Drops `profiles_insert_own`.** Members no longer create their own row. Only
   `ensure-profile` (service_role, which bypasses RLS) mints a seat — so the gate is
   always on the path. Members keep `SELECT` on their own row and a new `UPDATE` policy
   for their handle/coach/platform.

2. **Adds a `BEFORE INSERT` trigger** that locks the `seat_cap` config row
   (`SELECT ... FOR UPDATE`), recounts inside the same transaction, and raises
   `SEASON_FULL` if the season is full. Postgres serialises concurrent signups on that
   lock, so **seat 1,001 cannot exist** — no matter who asks or how many ask at once.
   That single lock closes both holes.

3. **Pins seat identity.** `academy_id` and `auth_user_id` become immutable after
   creation, so nobody can edit their way into someone else's seat.

4. **Reports the waitlist.** `season_seats()` now also returns `waiting` and `is_full`,
   surfaced in the Founder Desk as `847/1000 SEATS CLAIMED · 153 LEFT · 12 WAITING`.

`ensure-profile` was updated to catch the trigger's `SEASON_FULL` and return a clean
**409** — so a member who loses the last seat by milliseconds lands on the waitlist panel
properly instead of seeing a 500.

Two details that matter and are easy to get wrong:

- The trigger is `SECURITY DEFINER`. Without it the function runs as the caller, RLS
  restricts the count to the caller's own rows, it reports **0 seats taken**, and the gate
  lets everyone through — worse than no gate, because it looks like it works.
- The founder row (`PSA-FOUNDER`) is exempt, so your own seat never consumes a member's.

---

## 3 · Apply it (2 minutes)

1. Supabase dashboard → **SQL Editor** → **New query**
2. Open `supabase/seat-gate.sql`, copy **all** of it, paste, click **Run**
3. Success looks like a green result plus a notice:
   `SEAT GATE ARMED · SEASON ONE · 0/1000 taken · 0 waiting · full=false`
4. Redeploy the **`ensure-profile`** function (paste the updated
   `supabase/functions/ensure-profile/index.ts` over it) so the 409 path is live

Safe to re-run. It only drops/recreates policies and functions — no member data is touched.

### Prove it holds

Paste `supabase/tests/seat-gate.test.sql` into the SQL Editor and run it. It temporarily
shrinks the season to 3 seats, tries to take a 4th, and checks 10 behaviours — then
**rolls everything back**, so your real data is never altered.

Expect:

```
PASS 1 · founder row excluded from the count
PASS 2 · seats fill to the cap (3/3, is_full=true)
PASS 3 · seat 4 REFUSED by the database (SEASON_FULL: 3 of 3 seats taken)
PASS 4 · count intact at 3 after the refusal
PASS 5 · founder row insertable even at a full cap
PASS 6 · a released seat can be re-taken
PASS 7 · raising seat_cap opens seats (Season Two path)
PASS 8 · lowering the cap keeps members, blocks new ones
PASS 9 · waitlist counted (2 waiting)
PASS 10 · academy_id is immutable
ALL SEAT GATE TESTS PASS
```

Test 3 is the one that matters — that insert **succeeded** before this fix.

---

## 4 · Running the season

**Check seats any time** — SQL Editor, or just open the Founder Desk:

```sql
select * from season_seats();
```

**Open Season Two** (or adjust the cap) — one statement, effective immediately:

```sql
update config set value = '2000'       where key = 'seat_cap';
update config set value = 'SEASON TWO' where key = 'season_name';
```

Lowering the cap **never evicts anyone**. It just stops new seats until the count falls
back below it.

**See who's waiting:**

```sql
select handle, region, at from waitlist order by at;
```

**Let a specific waitlisted person in** — raise the cap by one, tell them to reopen the
app; their next sign-in claims the seat and clears them from the list.

---

## 5 · What a member sees when it's full

Nothing breaks. `ensure-profile` returns 409 `SEASON_FULL`, and the app already handles it:

- the **SEASON FULL** panel with the real numbers (`1000/1000 SEATS CLAIMED`)
- an honest note that they're on the waitlist
- **and they can still train solo** — journey, vault, scans and the loss journal all work
  offline; only the rooms and the till wait for a seat

That was already built. This fix is what makes the number in that panel true.
