# ProSeasonAcademy — the whole experience, screen by screen

Ten mockups of the real journey, from first launch to paid. Colours, copy and
prices are taken from the actual code and the live database — not invented.

**Palette** (`src/theme.ts`): background `#0a0f0a` · neon `#39FF6A` ·
amber `#f2c078` · muted sage `#8fb89b` · monospace throughout.

> **Read these as layout, not as final text.** The image model renders headings
> and numbers correctly but turns small paragraph text into nonsense — you will
> see that in a few of the body blocks. The structure, spacing, colour and
> hierarchy are what to judge. Real copy is in the screen files.

---

## 1 · Splash — `01-splash.png`
First 1.5 seconds. Crest, wordmark, loading bar, "Almost there, Player…" and
the version pinned at the bottom. Sets the tone before a single word of
coaching: this is a terminal, not a toy.

## 2 · Sign in — `02-signin.png`
**The door.** Academy name, country, then create your seat. Sign-up is open to
anyone with the app up to the 1,000-seat cap — no invite code. Country selection
is not cosmetic — it decides whether you see ₦ or £ for the rest of your time
here.

## 3 · Coach selection — `03-coach-select.png`
Three coaches, scout files to read first, and a permanent lock. The amber
warning is deliberate: **you cannot switch later.** That single constraint is
what makes the relationship mean something.

## 4 · Home — `04-home.png`
Where they land every day. Live feed, trick of the week, days left on the pass.
The bottom bar is the whole app: HOME · JOURNEY · HALLS · SETTINGS.

## 5 · Journey — `05-journey.png`
**The product.** A vertical path of stages — cleared, current, locked — ending
at FINISH. Match Vault and Loss Journal hang off the bottom. Stages unlock by
tier, so a FREE member can see the road ahead without walking it.

## 6 · The halls — `06-community.png`
Three rooms: Clubhouse, Coaches, DMs. Rate-limited at 20 messages a minute.
Messages from THE ACADEMY come through amber so a warning is never mistaken for
chat. Swearing is fine; only sexual and hate content gets flagged, and it comes
to you before anything automatic happens.

## 7 · Lapsed gate — `07-lapsed-gate.png`
Trial over, nothing paid. The floor closes — but the wording matters:
**"NOTHING HAS BEEN DELETED."** Their progress is intact and the contact line
stays open. This is a locked door, not an eviction.

## 8 · Pricing — `08-pricing.png`
Three passes. Nigerian members see **₦3,900 / ₦7,800 / ₦25,000** as the headline
with the honest "CHARGED AS £x" line underneath, because the card is charged in
pounds. The amber strip explains the subsidy out loud rather than hiding it.

## 9 · Card refused — `09-card-refused.png`
**The screen I am proudest of.** Amber, not red — this is a problem you solve
together, not an error they committed. Two ways out: send it to OPay
`8112179292` with a reference, or one tap to reach you directly. Nobody who
wants to pay ever hits a wall.

## 10 · You're in — `10-paid.png`
Money lands, the webhook fires, the pass opens, and this appears on its own
within seconds. "WELCOME BACK — LET'S GO WIN SOMETHING." No code to type, no
waiting on you.

---

## Still to draw

**Founder Desk** — the screen only you see: seats taken, unread count,
"CARD REFUSED — THEY WANT TO PAY" pinned above payment claims, approve/reject
buttons. Hit the image limit for this session; it is next.

---

## Where the real thing differs

These are static mockups. The built app also has:

- **Motion** — the splash crest pulses, cards fade up on entry, the zoom
  transition from splash into Home
- **The match scanner** — camera watching a live scoreboard, detecting goals,
  grading the performance afterwards
- **Coach banter** — written in each coach's voice, reacting to how you played
- **Live data** — every price, every day-count and every seat number on these
  screens is pulled from Supabase at runtime, not hardcoded
