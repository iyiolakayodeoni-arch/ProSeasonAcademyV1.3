# ProSeasonAcademy Server — Zero-Naira Deployment Guide

> ## 🅑 BACKUP ONLY — NOT IN USE
>
> **The academy runs on Supabase.** This self-hosted Node/SQLite server is kept
> as a proven fallback in case you ever want off Supabase — it is **not wired
> into the app** and nothing contacts it at runtime.
>
> It still earns its place for two reasons:
> 1. **Escape hatch.** Every behaviour Supabase provides is already implemented
>    here, tested. Switching back means re-pointing one file
>    (`src/data/backend.ts` — the single seam); no screen would change.
> 2. **The map.** It documents exactly what the database must do.
>
> ⚠️ If you revive this, the **1,000-seat SEASON ONE gate lives in Supabase**
> (`config.seat_cap` + the `ensure-profile` edge function). This server predates
> that gate and does **not** enforce it — you would have to port the seat count,
> the waitlist table and the `SEASON_FULL` response before letting anyone in,
> or the cap silently stops existing.
>
> Ignore the rest of this file unless you are actually making that move.

---

This is **your own backend**: guest auth, match-vault sync, and the
Discord-style live community. It costs **₦0/month** to run, 24/7, if you
follow this file. No rented AI, no paid APIs, no credit card surprises.

The server is one small Node.js app with a built-in SQLite database
(a single file on disk — nothing else to install).

---

## 1 · What you need

| Thing | Cost | Why |
|---|---|---|
| Oracle Cloud **Always Free** account | ₦0 forever | the computer that runs the server |
| This folder (`server/`) on that computer | ₦0 | the server itself |
| 20 minutes | — | one-time setup |

> Cloudflare Tunnel (optional, also free) is covered at the bottom as
> the home-PC alternative.

---

## 2 · Create the free computer (one time)

1. Go to `cloud.oracle.com` → **Sign up** → choose **Always Free**.
   (Oracle asks for a card *only* to prove you're human — Always Free
   resources are never billed. Stay inside "Always Free Eligible" shapes
   and you will never pay a kobo.)
2. Once inside, create a **Compute → Instance**:
   - Image: **Ubuntu 22.04 (aarch64)**
   - Shape: **VM.Standard.A1.Flex** (ARM) — tick **Always Free Eligible**,
     take the default 1 CPU / 6 GB RAM (you may use up to 4 CPU / 24 GB RAM free)
   - Add your SSH key: choose **"Generate a key pair for me"** → click
     **Save private key** → a small file (like `ssh-key-2026-….key`)
     downloads. ⚠️ THIS FILE IS THE ONLY KEY TO YOUR SERVER — Oracle
     shows it once and never again. Move it somewhere you won't clean
     out (NOT a Downloads folder you empty). §3 calls it `your-key.pem`
   - Networking: leave the defaults; make sure it gets a **public IPv4**
3. **Open the door for the server — TWO doors, both needed**:
   - Door 1 (this console): instance details → scroll to **Primary VNIC** →
     click the **Subnet** link → **Security lists** → click the (Default)
     Security List → **Ingress rules** → **Add ingress rules**:
       Source CIDR `0.0.0.0/0` · IP Protocol `TCP` · Source port range: blank
       · Destination port range: `8788` → **Add ingress rules**.
     (Later, when you add HTTPS, also open 443 the same way.
     Do NOT touch or delete the existing rules — the port-22 one is your
     own SSH door.)
   - Door 2 (inside the machine): OCI Ubuntu ships an iptables guard that
     blocks all non-SSH traffic. `install.sh` opens port 8788 there for
     you automatically — nothing to type.

## 3 · Put the server on it (copy-paste)

From your own laptop:

```bash
scp -i your-key.pem -r server ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/academy-server
```

Then log in and install Node:

```bash
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP

# everything below runs ON THE SERVER
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
cd academy-server
npm install --omit=dev
```

## 4 · Start it — and keep it alive forever

The lazy route (does everything below for you):

```bash
chmod +x install.sh && ./install.sh
nano .env   # paste your founder key as ADMIN_KEY
sudo systemctl enable --now academy
```

The manual route, if you like seeing every step:

```bash
# choose a secret key ONLY you know (this opens your admin dashboard)
echo 'ADMIN_KEY=pick-a-long-secret-here' > .env

# run it under systemd so it survives reboots and crashes
sudo tee /etc/systemd/system/academy.service > /dev/null <<'EOF'
[Unit]
Description=ProSeasonAcademy server
After=network.target

[Service]
WorkingDirectory=/home/ubuntu/academy-server
EnvironmentFile=/home/ubuntu/academy-server/.env
Environment=PORT=8788
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now academy
```

Check it's alive:

```bash
curl http://YOUR_PUBLIC_IP:8788/health
# → {"ok":true,"uptime":...}
```

## 5 · Point the app at it

The app reads one environment variable at build time:

```bash
EXPO_PUBLIC_PSA_SERVER=http://YOUR_PUBLIC_IP:8788 npx expo export:web  # or eas/gradle build
```

That's it. Every app you build with that variable syncs its Match Vault
and joins the live community. If the variable is missing, the app still
works fully offline — it just quietly retries until the server is back.

## 6 · Your admin desk

Open in your browser:

```
http://YOUR_PUBLIC_IP:8788/admin?key=pick-a-long-secret-here
```

You'll see: total players, matches logged this week, top scorers,
recent vault rows, and live community size. Nobody without the key
gets past the gate (they get a plain 403).

---

## 6b · THE TILL — your charge engine, day to day

**No card numbers ever touch your server.** Paying happens on your own
payment links (Paystack/Flutterwave — free to create once your merchant
account passes KYC; they only skim per sale, never monthly). Your server
keeps *the book of credits* — and only your founder key writes in it.

**The two knobs:**

| File / setting | What it does |
|---|---|
| `products.json` | YOUR PRICE LIST. Edit prices/pack sizes/payment links, save — every phone sees it instantly. No restart. If the file is ever broken, safe defaults keep the store standing. |
| `GO_LIVE` in `.env` | THE OPENING DAY. Future date → players see prices but nothing can be bought/spent (you can still top up to test). Past date → the till is open. Change needs one `sudo systemctl restart academy`. |

**A real payment, step by step (the honest loop):**

1. A player pays ₦500 on your Paystack link and writes their Academy ID
   (`PSA-XXXXXX`, shown to them in THE TILL) in the remark.
2. Your Paystack/bank alert lands. You open the **Founder Desk** in the app
   (Settings → tap the version line 5 times → founder key).
3. In THE TILL card: type their Academy ID + `100` credits + the payment
   reference → **CREDIT THE PLAYER**. Their wallet updates instantly.
4. WORLD-track players: after their subscription payment, **ACTIVATE PRO ·
   30 DAYS** stamps their wallet PRO with a renew date.

Check the book any time: `/admin?key=YOUR_KEY` shows wallets, credits
outstanding, PRO subs, and the last movements.

**Jan 1 morning checklist:** ① merchant links created and pasted into
`products.json` ② run a live test-buy with a friend's phone ③ `GO_LIVE`
already open by itself (date passed) ④ broadcast in the halls: THE TILL
IS OPEN.

---

## 7 · HTTPS (recommended once you're comfortable)

Easiest free path: **Caddy** (automatic certificates).

```bash
sudo apt-get install -y caddy
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
academy.yourdomain.com {
  reverse_proxy 127.0.0.1:8788
}
EOF
sudo systemctl reload caddy
```

You need a domain (~₦0 with Freenom-style free TLDs if available,
otherwise any cheap domain works). Then set
`EXPO_PUBLIC_PSA_SERVER=https://academy.yourdomain.com` — websockets and
HTTP both upgrade automatically.

## 8 · Home-PC alternative (also ₦0)

If you'd rather run it on a laptop at home:

1. `node src/index.js` on the laptop (leave it on).
2. Install **cloudflared** (free Cloudflare Tunnel):
   `cloudflared tunnel --url http://localhost:8788`
3. It prints a public `https://…trycloudflare.com` URL — use that as
   `EXPO_PUBLIC_PSA_SERVER`. Free, HTTPS included, no port-opening.
   (The free trycloudflare URL changes each restart; a named tunnel on a
   free Cloudflare account gives you a permanent one.)

## 9 · How far does ₦0 scale?

Honest numbers for the free ARM box (1–4 OCPU, 6–24 GB RAM, SQLite):

- **Registered players:** hundreds of thousands (one small DB row each)
- **Matches synced:** millions of rows before you need to think
- **Live community:** thousands of concurrent sockets comfortably on
  4 OCPU — websockets are cheap; messages are tiny DB inserts
- **The Match Watcher** runs on each player's phone, so scanning costs
  the server nothing at all

When you outgrow it (good problem): move SQLite → Postgres (one file
change zone in `src/db.js`), and shard websocket rooms across processes
with Redis pub/sub. Both are still free self-hosted software — the
upgrade is time, not money.

## 10 · The moving parts, in one diagram

```
phone A ─┐                         ┌─ REST  /auth /matches /community /admin
phone B ─┼─ EXPO_PUBLIC_PSA_SERVER ┤
phone C ─┘                         └─ WS    /ws  (live rooms, presence, typing)
                                            │
                                     SQLite file (academy.db)
                                     users · matches · channels · messages · reactions
```

All of it code you own, in a folder you can read, on a machine you
control. ₦0 in, ₦0 out, forever.

## FOUNDER DESK (v1.3 addition)
- Set a STRONG `ADMIN_KEY` when starting the server — it is your founder key.
  Example: `ADMIN_KEY=$(openssl rand -hex 24) node src/index.js`
- In the app: Settings → tap the VERSION line 5 times fast → ADMIN ACCESS sheet
  → paste the key → the FOUNDER DESK opens (verified against the server, stored
  on that device only; FORGET THE KEY wipes it).
- The desk shows live players/matches/messages, the JAN 1 AFRICA/WORLD region
  split, top scorers, recent vault incl THE MIND — and can BROADCAST AS FOUNDER
  into any channel (kind=founder, live fan-out).
- Pricing halls: #division-africa + #division-world are seeded channels where
  the community debates credits vs subscriptions before the JAN 1 split.
