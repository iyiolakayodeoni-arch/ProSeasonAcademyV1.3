# Paste-ready functions (no `_shared` folder needed)

## The error you hit

```
Failed to bundle the function (reason: Module not found
".../_shared/cors.ts" at .../source/index.ts:6:22)
```

The dashboard editor deploys **one file**. It has no sibling `_shared/` folder, so
`import { json } from '../_shared/cors.ts'` points at nothing.

The CLI handles this fine because it uploads the whole directory. The dashboard does not.

## The fix

Every file in this folder is the same function with those 24 lines of helpers **pasted
inside it**. No imports to resolve, nothing else to create.

| Paste this file | Into a function named |
|---|---|
| `ensure-profile.ts` | `ensure-profile` ← **the one that failed** |
| `founder-desk.ts` | `founder-desk` |
| `pay-webhook.ts` | `pay-webhook` |
| `admin-summary.ts` | `admin-summary` |
| `founder-broadcast.ts` | `founder-broadcast` |
| `till-topup.ts` | `till-topup` |
| `till-subscribe.ts` | `till-subscribe` |
| `health.ts` | `health` |

### Steps

1. Supabase → **Edge Functions**
2. Open the existing function (or **Create a new function** with the exact name above)
3. **Select all the code in the editor and delete it** — leaving the sample code behind is
   the most common cause of a second failure
4. Paste the whole file from here
5. **Deploy**

The function name must match exactly: lowercase, hyphens, no spaces. The app calls these
by name, so `founderdesk` or `Founder-Desk` will not be found.

## Only three are needed right now

`ensure-profile` · `founder-desk` · `pay-webhook`

The other five are already deployed on your project and unchanged — leave them alone
unless a later change says otherwise.

## Which folder do I edit?

**`supabase/functions/`** is the source of truth. This folder is generated from it.

If you change a function later, change it in `supabase/functions/<name>/index.ts` and ask
me to regenerate — do not hand-edit these copies, or the two will drift apart.
