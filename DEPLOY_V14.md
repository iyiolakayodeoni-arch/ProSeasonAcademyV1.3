# Deploy v14 platform (sign-in, announcements, news, push, location)

Run these on your Supabase project after pulling this branch.

## 1. SQL

Supabase → SQL Editor → paste and run:

```
supabase/v14-platform.sql
```

This adds:

- `is_founder`, email/username, country codes on `profiles`
- `founder_announcements` + read state
- `news_drafts` (MetaBot → founder review → Home)
- `push_tokens` + `notification_queue`
- location → pricing helpers (Nigeria shelf = `NG` only)
- open registration default (`invite_only = false`)
- till stays closed until you open it from the Desk

## 2. Edge functions

Deploy (Dashboard or CLI), **in any order**:

| Function | JWT verify |
|---|---|
| `auth-register` | OFF (public sign-up) |
| `auth-login` | OFF |
| `auth-reset` | OFF |
| `auth-delete` | ON (uses member session) |
| `geo-verify` | ON |
| `push-dispatch` | OFF (cron secret) |
| `ensure-profile` | ON (legacy) |
| `founder-desk` | ON (founder session) |
| `founder-broadcast` | ON |
| `admin-summary` | ON |
| `till-topup` / `till-subscribe` | ON |

Set secrets:

- `FOUNDER_KEY` — still required server-side for cron-style gates; **not** shipped to the app
- `PUSH_CRON_SECRET` — shared with your scheduler for `push-dispatch`
- Standard Supabase URL / anon / service_role (auto)

## 3. Auth settings (Dashboard → Authentication)

- Enable **Email** provider
- Decide **Confirm email**:
  - Off → instant seats (current `auth-register` marks confirmed)
  - On → flip `email_confirm: true` off in `auth-register` and handle `EMAIL_NOT_CONFIRMED`
- Review **invite_only** in `config` (Desk can toggle). Default after v14 SQL: **open registration**
- Redirect URL for reset: `proseasonacademy://reset-password` (or your scheme)

## 4. Founder account

1. Create the founder user in Auth (email/password)
2. Link profile:

```sql
update profiles
   set auth_user_id = '<founder-auth-uuid>',
       is_founder = true,
       email = 'you@example.com',
       handle = 'POCOLASTONES',
       username = 'POCOLASTONES'
 where academy_id = 'PSA-FOUNDER';
```

If no row: insert one with `academy_id = 'PSA-FOUNDER'`, `is_founder = true`.

## 5. Push schedule

Cron (every 5 min) → `POST /functions/v1/push-dispatch`  
Header: `x-cron-secret: <PUSH_CRON_SECRET>`

## 6. MetaBot → Desk

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run export
```

(from `metabot/`) upserts drafts into `news_drafts` for founder approval.

## 7. App env

```
EXPO_PUBLIC_PSA_SUPABASE_URL=...
EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY=...
```

## Smoke checklist

- [ ] Create seat (username + email + password + country)
- [ ] Academy token shown once
- [ ] Sign out → sign in
- [ ] Wrong password → clear error
- [ ] Reset email request
- [ ] Founder Desk opens only for `is_founder`
- [ ] Publish Home announcement → appears on Home
- [ ] Approve news draft → appears under FC MOBILE NEWS
- [ ] Nigeria country → africa pricing region; non-NG Africa → world shelf
- [ ] Till still closed until Desk opens `go_live` / `till_closed`
- [ ] Delete account wipes remote + local
- [ ] Push permission + token row in `push_tokens`
