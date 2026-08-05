Refunds — founder tooling and examples

This document describes how founders can perform refunds safely and audibly.

Two ways to refund:

1) Quick from founder-desk (recommended):
   - Use the `founder-desk` Edge Function with action `refund`.
   - Requires a founder auth bearer token (the same token used to call other founder-desk actions).
   - Example curl (replace <FOUNDERTOKEN> and host):

     curl -X POST https://<your-supabase>.functions/v1/founder-desk \
       -H "Authorization: Bearer <FOUNDERTOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"action":"refund","payment_intent":"pi_123","reason":"Customer request"}'

   - Response: { ok: true, refund: { ...stripe refund object... } }
   - Notes: This route calls Stripe's refunds API using STRIPE_SECRET from the function environment and writes an audit entry via the audit RPC.

2) Dedicated refund-admin function (alternate):
   - If deployed, refund-admin is a founder-only function that performs the same operation. Use it if you prefer a single-purpose function.
   - Example curl (replace <FOUNDERTOKEN> and host):

     curl -X POST https://<your-supabase>.functions/v1/refund-admin \
       -H "Authorization: Bearer <FOUNDERTOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"provider":"stripe","payment_intent":"pi_123","reason":"Customer request"}'

Audit and reconciliation

- Every refund action writes an audit RPC call recorded in audit_log. Reconcile against Stripe dashboard and the ledger table (ledger.ref / ledger.amount) to ensure internal balances match money movement.
- The SQL refund_due() function calculates refundDays pro-rata — use founder-desk remove action to remove a member and produce a refundDays suggestion; then use refund action to actually refund in Stripe.

Security

- Both endpoints require founder auth and the presence of STRIPE_SECRET as a function environment secret.
- Do NOT set SUPABASE_SERVICE_ROLE_KEY in client apps; only in function secrets/CI.

If you want, I can add an in-UI button in the founder admin panel that calls founder-desk?action=refund for a selected member — confirm if you want the UI change and which file holds the founder admin screen.