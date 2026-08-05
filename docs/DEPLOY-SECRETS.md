Deploy & Secrets Checklist

This checklist consolidates required secrets, per-function JWT settings, and quick deploy notes so deploys are repeatable and avoid the high-impact misconfiguration noted in the repo audit.

1) Global project secrets (store in Supabase Project/Functions and GitHub Actions where noted)

- SUPABASE_URL (public) — e.g. https://<proj>.supabase.co
- SUPABASE_SERVICE_ROLE_KEY (CI-only, NEVER in client builds) — give only to CI and server-side functions
- FOUNDER_KEY (founder-only secret used by founder-desk functions)

2) Payment provider secrets (store as Supabase Function secret values, not in app bundles)

- STRIPE_SECRET — secret API key for creating Checkout Sessions (used by pay-start)
- STRIPE_WEBHOOK_SECRET — webhook signature secret (used by pay-webhook)
- PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID — if using PayPal
- PAYSTACK_SECRET — for Paystack webhooks
- FLW_SECRET_HASH — for Flutterwave webhooks

3) Push & cron secrets

- PUSH_CRON_SECRET — header token required by push-dispatch cron

4) Expo/EAS & Onliversity CI secrets (GitHub Actions)

- EXPO_TOKEN — Expo account token for EAS/CI (Actions secret)
- EAS_PROJECT_ID — EAS project id (Actions secret)
- SUPABASE_SERVICE_ROLE_KEY — required by release-onliversity workflow (CI-only)

5) Per-Function JWT setting guidance (Supabase Function setting)

- ensure-profile: Verify JWT = ON (function called from app authenticated flows)
- pay-start: Verify JWT = ON (creates checkout for an authenticated user)
- pay-webhook: Verify JWT = OFF (provider posts unauthenticated webhooks; verification is done by provider signatures inside the function)
- founder-desk: Verify JWT = ON (founder authenticates via auth token; founderOk uses auth.getUser)
- refresh-fx / push-dispatch: Verify JWT according to use-case (cron headers + secret)

6) Quick deploy steps

- Create the Supabase project and run RUN_ALL.sql / FINISH_PAYMENTS.sql in the project (migrations must be applied in order). Verify price_now and grant_tier exist.
- Deploy Edge Functions (ensure-profile, pay-start, pay-webhook, founder-desk, refresh-fx, push-dispatch, refund-admin).
  - Note: founder-desk now supports a 'refund' action that calls Stripe directly when STRIPE_SECRET is present. Use founder-desk?action=refund or the dedicated refund-admin function. See docs/REFUNDS.md for curl examples.
- Add the secrets above to each function via the Supabase UI. Do NOT inject SUPABASE_SERVICE_ROLE_KEY into client builds or to any public repo.
- For pay-webhook: set Verify JWT = OFF in function settings, then register the webhook URL in Stripe / PayPal using that function URL with parameter ?p=stripe or ?p=paypal.
- Run a real test payment (sandbox/test card for Stripe). Confirm the function logs show grant_tier was called and the entitlements table was updated.

7) Post-deploy smoke checks (manual)

- Verify Stripe webhook events are received and accepted (check function logs).
- Verify a pay-start from the app returns an approveUrl and that completing the checkout results in access in the app.
- Confirm the release-onliversity.yml Action has secrets set and run it in a dry-run on a test tag.

Notes

- Keep this checklist updated in the repo when new functions or secrets are added.
- If you want, I can expand this into an automated deploy script (CI) that sets secrets via the Supabase CLI — requires safe handling of SUPABASE_SERVICE_ROLE_KEY in CI.