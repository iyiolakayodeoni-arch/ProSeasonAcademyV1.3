# Security — a closed ecosystem, not a public app

ProSeasonAcademy is private software for a capped membership of 1,000 seats. It is not
on any store and is not meant to be found. This document is the threat model and what
enforces it.

**Apply:** run `supabase/security.sql` in the SQL Editor (after `schema.sql` and
`seat-gate.sql`), redeploy `ensure-profile`, and deploy the new **`founder-desk`**
function (`supabase/functions/founder-desk/index.ts`).

Once deployed you run the academy from inside the app — Settings → tap VERSION ×5 →
sign in with the founder account → Founder Desk gives you the inbox, replies, the till
and moderation. No SQL needed for day-to-day work; the queries in this file are the
manual fallback.

---

## 1 · The hole that mattered most

The seat cap counted seats but never asked **who** was taking one.

The anon key ships inside every APK — it has to, that is how the app talks to Supabase.
So anyone who obtained the file could sign in anonymously and spend one of your 1,000
seats. "Capped at 1,000" was true; "my 1,000" was not.

**Now:** sign-up is open to anyone with the app, but the seat cap is enforced **in
Postgres** by a `BEFORE INSERT` trigger — it locks the `seat_cap` config row, recounts
inside the same transaction, and refuses once the season is full. The race that used to
let two devices split the last seat is gone, and the app is private by distribution
rather than by an invite gate. The 1,000 seats are the boundary; there are no invite
codes.

---

## 2 · The full threat model

| Threat | Before | Now |
|---|---|---|
| Stranger with the APK takes a seat | ✅ possible | ✅ possible — but only up to the 1,000 cap, private by distribution |
| Two people take the last seat | ✅ race existed | ❌ row lock serialises |
| Member reads another's vault | ❌ blocked (RLS) | ❌ blocked |
| Member reads another's wallet | ❌ blocked | ❌ blocked |
| Member fakes a FOUNDER message | ❌ blocked (RLS) | ❌ blocked |
| Member floods the halls | ✅ **unlimited** | ❌ 20 msg/min |
| Member floods the vault | ✅ unlimited | ❌ 200/min |
| Member spams your inbox | n/a | ❌ 5/hour |
| Member edits their `academy_id` | ✅ possible | ❌ immutable |
| Removed member keeps posting | n/a | ❌ blocked at RLS + trigger |
| Anyone reads your audit log | n/a | ❌ no policy = no access |
| Founder actions untraceable | ✅ | ❌ `audit_log` |

Everything above is enforced **in Postgres**, not in the app. A modified APK, a raw REST
call or a leaked anon key changes none of it.

---

## 3 · Removing someone

A seat is yours to give and to take back. Removing frees the seat for re-issue.

```sql
select set_member_status('PSA-ABC123', 'muted');    -- can read, cannot speak
select set_member_status('PSA-ABC123', 'removed');  -- out; seat returns to the pool
select set_member_status('PSA-ABC123', 'active');   -- back in
```

`season_seats()` excludes removed members, so the count stays honest.

---

## 4 · Keys — what lives where

| Key | Where it belongs | Ships in the app? |
|---|---|---|
| **anon key** | `.env`, `eas.json` | ✅ yes — public by design, RLS protects everything |
| **`service_role`** | Supabase → Edge Function Secrets | 🔴 **never** |
| Founder access | `profiles.is_founder` on the founder's Supabase account | 🔴 no key exists — the functions verify the session against the flag server-side |

Verify any build before distributing:

```bash
grep -c 'service_role' dist/_expo/static/js/web/index-*.js   # must be 0
```

**Founder access is the founder account.** If a device holding that session is lost,
sign the account out / rotate its password — every admin action stops working
immediately. There is no key to rotate.

---

## 5 · Residual risks (honest list)

- **Anyone who gets the APK can claim a seat** until the cap is full. The app is private
  by distribution, not by an invite gate. If the file leaks publicly, seats can fill
  before the people you actually want them in.
- **A determined member can share their signed-in device.** Seats are device-held; there
  is no biometric binding. At 1,000 capped members this is a social problem, not a
  technical one.
- **The anon key is extractable from the APK.** That is unavoidable and fine — it grants
  nothing beyond what RLS allows.
- **No end-to-end encryption on messages.** Supabase can technically read the halls, as
  can you via the dashboard. Say so if members ask; do not imply otherwise.
- **Rate limits are per-account, not per-IP.** A coordinated flood is still possible.
  `set_member_status(..., 'removed')` is the answer.

---

## 6 · Routine checks

```sql
-- who is in, and where they stand
select handle, academy_id, region, status, created_at
  from profiles where academy_id <> 'PSA-FOUNDER' order by created_at desc;

-- unread messages to you
select handle, kind, body, at from contact_messages
 where not read order by at desc;

-- how full the season is
select * from season_seats();

-- every founder action
select action, target, at from audit_log order by at desc limit 50;
```

**Do this too:** make the GitHub repo **private** (Settings → Danger Zone → Change
visibility). The source, the coaching system and the journey fiction are the product.
