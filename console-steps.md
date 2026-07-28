# MONDAY — The 6 Supabase Clicks (about 30 minutes, no card, ₦0)

This is the whole setup. It looks long because every single click is written out — the
actual work is: **make an account, paste one SQL file, paste 8 small files, paste two
words into the app folder.** A kettle takes longer to boil.

* Plain words: **Supabase** = the free company that will hold the academy's database and
  pass messages between players' phones. Think of it as the academy hall, but we rent
  the building free instead of building our own.

---

## Step 1 — Make the account (2 minutes)

1. Go to **supabase.com** in your browser.
2. Click **Start your project**.
3. Sign up with your **GitHub** account (the one you already have) OR your email.
4. It will NOT ask for a debit card. If anything ever asks for a card, you clicked a
   paid option — stop and tell me.

## Step 2 — Create the project (3 minutes)

1. Click **New project**.
2. Fill it in like this:
   - **Name:** `proseason-academy`
   - **Database password:** click **Generate** → then **copy it somewhere safe**
     (Notes app). You will not need it daily, but don't lose it.
   - **Region:** pick **West EU (London)** — closest fast route for West Africa.
   - **Pricing plan:** make sure it says **Free**.
3. Click **Create new project**. Wait 1–2 minutes while it warms up.

## Step 3 — Paste the brain (the SQL) — 5 minutes

* Plain words: **SQL** = the instructions that build the academy's filing cabinets
  (players, seats, wallets, rooms) inside the database. You are just pasting my
  instructions into Supabase's notebook.

1. In the Supabase left sidebar, click **SQL Editor** (the icon looks like a notebook).
2. Click **New query**.
3. In our app folder, open **supabase → schema.sql** (you can right-click → open with
   any text editor). Select ALL the text (Ctrl+A), copy it.
4. Paste it into the SQL Editor box on the Supabase page.
5. Click the green **Run** button (bottom right of the box).
6. ✅ Success looks like: a green toast saying **"Success. No rows returned"**
   (or similar — the words vary; GREEN is what matters).
7. ❌ If you get a red error: copy the red text and send it to me. Do not keep
   clicking Run — each Run re-runs everything and half-built cabinets confuse it.

## Step 4 — Sanity-check the shelves (2 minutes)

1. Left sidebar → click **Table Editor** (icon looks like a spreadsheet).
2. On the left you should now see cabinet names: **profiles, wallets, ledger, matches,
   products, config, channels, messages, waitlist.**
3. Click **products** → you should see the till shelves:
   **₦500/100cr … ₦5,000/1,700cr** and the **$4.99/mo PRO sub**. ✅
4. Click **config** → you should see **seat_cap 1000** and
   **season_name SEASON ONE**. ✅

## Step 5 — Create the 8 Edge Functions (10–15 minutes of copy-paste)

* Plain words: **Edge Functions** are 8 tiny doormen that run at the hall entrance:
  one checks a player in and hands out seat numbers (`ensure-profile`), one lets you
  read the day's books (`admin-summary`), three run the till, one lets you speak in
  the hall (`founder-broadcast`). They're just more files I've already written —
  you're pasting them into Supabase's function boxes.

For EACH of these 8 names, do the same 5 moves:

  `health` · `ensure-profile` · `till-topup` · `till-subscribe` ·
  `admin-summary` · `founder-broadcast`

(the 2 shared helper files inside `_shared` get pasted in step 5b — one extra move)

1. Left sidebar → **Edge Functions** → **Create a new function** → type the name
   exactly (small letters, hyphens) → **Create function**.
2. It opens a code editor with some sample text. **Delete all of it.**
3. In our app folder open **supabase → functions → [that name] → index.ts**,
   select all, copy.
4. Paste into the Supabase editor → click **Deploy**.
5. Repeat for the next name. (6 functions = 6 times.)

**5b — the shared helpers:** Supabase will complain the functions reference
`../_shared/...`. Fix: Edge Functions → **Create function** → name it `_shared` →
paste nothing yet… actually simpler: Supabase lets you *add a file* inside a
function's folder. When you hit the error, send it to me and I'll walk you through
the 5b clicks for whichever editor version you see (their UI changes every few
months; the logic is always "create a `_shared` folder with those 2 files").

**5c — one secret word:** the functions that only YOU may call (`founder-broadcast`,
`admin-summary`, `till-topup`, `till-subscribe`) are guarded by a secret word.
1. Edge Functions → **Secrets** (or Project Settings → Edge Functions → Secrets).
2. Add secret: name **`FOUNDER_KEY`** → value: your admin word from the keys file
   (the **`PSA_PROD_ADMIN_KEY`** line — hex-word we saved at home). Save.

## Step 6 — Bring me the two public words (2 minutes)

1. Project Settings (gear icon) → **API**.
2. Copy these two and send them to me:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — a long token NEXT TO THE WORDS "anon public"
     (⚠️ NOT the one labelled "service_role" — that one is the master key and must
     never go inside the app or anywhere public).

I then paste them into the app's `.env` file, run the exam against YOUR real hall,
and we cut the Season One phone build.

---

## What free actually means here (read once, then relax)

| Need | Free tier gives | Season One needs | Verdict |
|---|---|---|---|
| Live hall connections at once | ~200 | ~30–60 typical | ✅ PASS |
| Players signed in per month | ~50,000 | 1,000 | ✅ PASS |
| Database room | ~500 MB | ~tens of MB | ✅ PASS |
| Money leaving your pocket | **₦0 — no card on file = nothing to charge** | ₦0 | ✅ PASS |

The one cost: if **nobody plays for about a week** the free hall takes a nap. It
wakes the moment anyone — including you — opens the link or the app. I'll set up a
free weekly nudge so it never even naps.

* Numbers drift a little year to year — the Supabase dashboard itself is the truth
  (Project Settings → Usage shows live meters).
