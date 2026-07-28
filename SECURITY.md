# Security — a closed ecosystem, not a public app

ProSeasonAcademy is private software for an invited membership. It is not on any store
and is not meant to be found. This document is the threat model and what enforces it.

**Apply:** run `supabase/security.sql` in the SQL Editor (after `schema.sql` and
`seat-gate.sql`), then redeploy `ensure-profile`.

---

## 1 · The hole that mattered most

The seat cap counted seats but never asked **who** was taking one.

The anon key ships inside every APK — it has to, that is how the app talks to Supabase.
So anyone who obtained the file could sign in anonymously and spend one of your 1,000
seats. "Capped at 1,000" was true; "my 1,000" was not.

**Now:** the door asks for an invite code you issued.

```
config.invite_only = 'true'
  → ensure-profile demands a code
  → claim_invite() consumes it atomically (locked row: two people
    cannot spend the last use of the same code)
  → no code, or a used/expired/revoked one → 403, no seat burned
```

Every member row records `invite_code`, so you can see who came in on which code — and
which of your inviters actually bring people who stay.

### Handing out invites

```sql
-- one person, one use
insert into invites (code, label, max_uses)
values ('CHINEDU-07', 'handed out at the viewing party', 1);

-- a batch for a group, expiring in a week
insert into invites (code, label, max_uses, expires_at)
values ('LAGOS-DEC', 'December Lagos cohort', 25, now() + interval '7 days');

-- kill one instantly
update invites set revoked = true where code = 'LAGOS-DEC';

-- who used what
select p.handle, p.academy_id, p.invite_code, p.created_at
  from profiles p where p.invite_code is not null order by p.created_at desc;
```

To open the doors for a period (your free week), flip one row:

```sql
update config set value = 'false' where key = 'invite_only';  -- open
update config set value = 'true'  where key = 'invite_only';  -- closed again
```

---

## 2 · The full threat model

| Threat | Before | Now |
|---|---|---|
| Stranger with the APK takes a seat | ✅ possible | ❌ invite required |
| Two people take the last seat | ✅ race existed | ❌ row lock serialises |
| Member reads another's vault | ❌ blocked (RLS) | ❌ blocked |
| Member reads another's wallet | ❌ blocked | ❌ blocked |
| Member fakes a FOUNDER message | ❌ blocked (RLS) | ❌ blocked |
| Member floods the halls | ✅ **unlimited** | ❌ 20 msg/min |
| Member floods the vault | ✅ unlimited | ❌ 200/min |
| Member spams your inbox | n/a | ❌ 5/hour |
| Member edits their `academy_id` | ✅ possible | ❌ immutable |
| Removed member keeps posting | n/a | ❌ blocked at RLS + trigger |
| Anyone reads the invite list | n/a | ❌ no policy = no access |
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
| **`FOUNDER_KEY`** | Supabase → Edge Function Secrets | 🔴 never — typed by you, verified server-side |
| Founder key on device | AsyncStorage, only after the server confirms it | stored post-verification |

Verify any build before distributing:

```bash
grep -c 'service_role' dist/_expo/static/js/web/index-*.js   # must be 0
```

**Rotate the founder key** if a device holding it is lost: change `FOUNDER_KEY` in the
dashboard. Every stored copy stops working immediately.

---

## 5 · Residual risks (honest list)

- **A member can share their invite code before using it.** Codes are `max_uses`-limited,
  so the damage is bounded — but the wrong person can still take a seat. Use `max_uses: 1`
  for people you actually know.
- **A determined member can share their signed-in device.** Seats are device-held; there
  is no biometric binding. At 1,000 invited members this is a social problem, not a
  technical one.
- **The anon key is extractable from the APK.** That is unavoidable and fine — it grants
  nothing beyond what RLS allows.
- **No end-to-end encryption on messages.** Supabase can technically read the halls, as
  can you via the dashboard. Say so if members ask; do not imply otherwise.
- **Rate limits are per-account, not per-IP.** Someone with many invite codes could still
  make noise. `set_member_status(..., 'removed')` is the answer.

---

## 6 · Routine checks

```sql
-- who is in, and how they got in
select handle, academy_id, region, invite_code, status, created_at
  from profiles where academy_id <> 'PSA-FOUNDER' order by created_at desc;

-- unread messages to you
select handle, kind, body, at from contact_messages
 where not read order by at desc;

-- invite codes still live
select code, label, uses, max_uses, expires_at, revoked from invites;

-- every founder action
select action, target, at from audit_log order by at desc limit 50;
```

**Do this too:** make the GitHub repo **private** (Settings → Danger Zone → Change
visibility). The source, the coaching system and the journey fiction are the product.
