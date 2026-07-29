# Match Scan Ritual — manual-first, serious-player design

This is the intended direction for ProSeasonAcademy’s match scan.

The academy is **not** trying to become a fake automatic coach that pretends it understands a full FC Mobile match. The product should attract serious players who are willing to watch themselves, write honestly, and learn from their own decisions.

## The principle

> The scan does not hand the player the lesson. It forces the player to reason their way to it.

The coach’s job is not to play for them. The coach asks the right questions, at the right moments, so the player sees the pattern for himself.

## The user flow

### 1 · Film room lesson

The player enters the stage room.

They see:

- coach text, not voice notes
- the mechanic for the stage
- a silent animated board explaining the concept
- the match objective
- `START MATCH SCAN`

The lesson is sourced from approved MetaBot/founder content, rewritten in ProSeasonAcademy language, and paired with a coded animation board.

### 2 · Start session

When the player taps `START MATCH SCAN`:

- the app starts a scan session
- the app explains what will be recorded and why
- Android asks for screen-record permission if the native recorder is available
- the player switches to FC Mobile and plays the match

If native recording is unavailable, the flow falls back to manual logging and written reflection.

### 3 · During the match

Ideal Android/private-build version:

- a lightweight overlay/floating prompt can appear during safe pauses/half-time
- the coach asks short questions, not tactical commands
- the prompt is reflective, not distracting

Example half-time prompt:

> What is the opponent actually trying to make you do?
>
> Where did you rush? Where did you stay calm?

Important: overlaying another app requires Android native work and special permission. It may be intrusive, so it must be optional and carefully tested.

### 4 · Recording and key moments

The session records the match locally on the phone.

Target zero-naira design:

- record low resolution
- low FPS where possible
- compress aggressively
- keep only a temporary local review file
- delete after the session is sealed
- save answers and match metadata, not permanent video

Default privacy rule:

> Video stays on the player’s phone. Server stores answers, score, tags and receipts — not the raw match video.

Server upload is only a later opt-in feature if absolutely needed.

### 5 · What can be detected honestly

Reliable / realistic with zero-naira native work:

- match score changes from scoreboard frames
- match duration / phase rough timing
- user-created key moments
- post-match stats entered manually
- composure and written reflection

Hard / not honest to promise yet:

- automatically knowing every ball loss
- automatically knowing counters
- automatically understanding red/yellow cards
- automatically judging defensive shape
- automatically explaining why a goal happened

Those require real computer vision/model work and a large test set. Until that exists, the app should not pretend.

## Key-moment system

The serious-player version uses a mixed system:

### Auto markers

- goal for you
- goal against you
- score changed
- session started
- full time / scan ended

### Player markers

The player can tag moments during review:

- LOST BALL
- COUNTER AGAINST
- BAD DEFENDING
- MISSED CHANCE
- PANIC PASS
- TILT MOMENT
- CARD / FOUL
- MECHANIC USED
- GOOD DECISION

The player watches their own clip, pauses at these moments, and answers coach questions.

## Coach question style

The coach should never just say “you lost because X.”

The coach asks questions that guide reasoning.

### Examples

After conceding:

- What happened **two actions before** the goal?
- Did you lose the ball because of pressure, greed, or bad spacing?
- Were you defending the ball or defending the next pass?
- What did the opponent repeat before the goal?

After losing the ball:

- What did you see before you passed?
- Was the safer option available?
- Did you force the stage mechanic when the picture was not there?

After a missed chance:

- Did you shoot because it was open, or because you were tired of the attack?
- Was the keeper moved before the shot?
- What would one extra pass have changed?

After a tilt moment:

- What did your body want to do?
- What did the game actually need?
- What was the first rushed input after the mistake?

## What gets saved

Save permanently:

- score
- mode
- opponent style
- stage mechanic used count
- objective counts
- composure score
- written answers
- tagged moment labels
- timestamps of tagged moments
- stage scan result

Delete after session:

- raw screen recording
- temporary compressed review video
- any clip frames not needed for local replay

## Backend cost strategy

Zero naira means:

- no raw video storage by default
- no paid video AI
- no paid CV API
- no paid transcription
- no third-party match-analysis service

The phone does the local recording/review. Supabase stores small text/metadata rows only.

## Native Android work required later

To make the full scan ritual real:

1. MediaProjection screen recorder
2. optional floating overlay prompt
3. local compression with MediaCodec
4. scoreboard/key-frame sampler
5. local temp video lifecycle/delete
6. foreground service notification while recording
7. safe fallback to manual mode

This should remain Android-first. iOS cannot support the same overlay/recording pattern in the same way.

## MetaBot lesson source rule

The bot should study public real-player material:

- FC Mobile YouTube tutorials
- real H2H gameplay videos
- patch notes
- guide posts
- community findings

But it must not copy them. It should:

- store the source URL
- extract the concept
- rewrite in academy language
- create a structured lesson
- attach a silent coded animation board
- wait for founder approval

No unapproved bot lesson should reach players.

## Coach path rule

Chinedu and Obinna are not random skins. Each path should teach through its coach’s style:

- Chinedu: discipline, pressure, winning habits, ruthless correction
- Obinna: calm, control, composure, patient correction

The curriculum can be inspired by public play-style research, but it must not use real player names/likenesses inside the app.

## Final product definition

A Match Scan is not an automatic grade.

A Match Scan is:

1. a match session,
2. a temporary recording,
3. a set of key moments,
4. coach questions,
5. player-written reasoning,
6. a vault receipt,
7. stage progress only when the objective evidence is there.

That is what makes the academy serious.
