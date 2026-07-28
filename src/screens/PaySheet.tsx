import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Clipboard, Linking } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { ChevronLeftIcon, CheckIcon } from '../components/Icons';
import { colors, monoFont } from '../theme';
import * as backend from '../data/backend';
import { getSettings } from '../data/settings';

// ─────────────────────────────────────────────────────────────
// PAYING — the trust screen.
//
// Card checkout (Stripe) is the automatic path; the manual claim
// below is the fallback for anyone whose bank refuses the card.
// The danger in that is silence: a member sends money and then has
// no receipt, no status, and no way to prove anything. That is
// exactly when a real business starts to look like a scam.
//
// So this screen does four things:
//   1. shows exactly who the money goes to, and the name on it
//   2. gives them a REFERENCE tied to their seat, server-generated
//   3. records the claim, so both sides see the same thing
//   4. never leaves them wondering — the status is always on screen
// ─────────────────────────────────────────────────────────────

export default function PaySheet({
  product,
  price,
  title,
  payLink,
  onClose,
}: {
  product: string;
  price: string;
  title: string;
  /** automatic card checkout — the pass opens on its own */
  payLink?: string | null;
  onClose: () => void;
}) {
  const [methods, setMethods] = useState<backend.PayMethod[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claims, setClaims] = useState<backend.MyClaim[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);

  const geo = getSettings().geo === 'africa' ? 'africa' : 'world';
  const me = backend.getMe();

  /**
   * The automatic path. The server builds the checkout at TODAY'S
   * converted price with this member's seat attached, so the number
   * shown is exactly the number charged — no fixed button to go stale.
   */
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState<string | null>(null);

  /**
   * The rescue path. A card that fails must never be a dead end — the
   * member wanted to pay, which is the opposite of a problem. Once the
   * checkout has been tried, the other two doors open underneath it:
   * send it manually, or talk to the founder with your ID.
   */
  const [triedCard, setTriedCard] = useState(false);
  const [helpState, setHelpState] = useState<'idle' | 'sending' | 'sent' | 'already'>('idle');

  const askForHelp = async () => {
    if (helpState === 'sending' || helpState === 'sent') return;
    setHelpState('sending');
    const r = await backend.reportPaymentTrouble(product, note.trim() || undefined);
    setHelpState(r === 'ALREADY_SENT' ? 'already' : r === 'SENT' ? 'sent' : 'idle');
    if (r === null) setStartErr('COULD NOT REACH THE FOUNDER. TRY SETTINGS → CONTACT.');
  };

  const payNow = async () => {
    if (starting) return;
    setStarting(true);
    setStartErr(null);
    const r = await backend.startCheckout(product);
    setStarting(false);
    setTriedCard(true);
    if (!r.ok) {
      setStartErr(
        r.error === 'RATE_STALE'
          ? "TODAY'S RATE COULDN'T BE CONFIRMED. TRY AGAIN IN A MOMENT, OR USE ONE OF THE OPTIONS BELOW."
          : 'COULD NOT OPEN THE CHECKOUT. USE ONE OF THE OPTIONS BELOW — YOU WILL NOT LOSE YOUR SEAT.',
      );
      return;
    }
    void Linking.openURL(r.approveUrl).catch(() => {});
    watchForGrant();
  };

  /** automatic checkout is available whenever the member has a seat */
  const canAuto = !!me;

  const load = () => {
    void backend.payMethods(geo).then((m) => {
      if (m) {
        setMethods(m);
        if (m.length && !pick) setPick(m[0].code);
      }
    });
    void backend.myClaims().then(setClaims);
  };
  useEffect(load, []);

  const pending = claims?.find((c) => c.status === 'pending');
  const method = methods?.find((m) => m.code === pick);

  const copy = (text: string, what: string) => {
    Clipboard.setString(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };

  /**
   * They tapped PAY and left the app. The webhook usually lands
   * within seconds, so poll for a short while — the pass then appears
   * on its own and the welcome message is already waiting.
   */
  const watchForGrant = () => {
    let tries = 0;
    const tick = setInterval(async () => {
      tries += 1;
      const a = await backend.myAccess();
      if (a && a.state === 'active' && a.level > 0) {
        clearInterval(tick);
        setGranted(true);
      }
      if (tries >= 20) clearInterval(tick);   // ~100s, then stop
    }, 5000);
  };

  const submit = async () => {
    if (!pick || busy) return;
    setBusy(true);
    setError(null);
    const r = await backend.claimPayment(product, pick, price, note.trim() || undefined);
    setBusy(false);
    if (r.ok) {
      setNote('');
      load();
    } else {
      setError(
        r.error === 'CLAIM_PENDING'
          ? 'YOU ALREADY HAVE A CLAIM WAITING. THE FOUNDER IS CHECKING IT.'
          : r.error === 'OFFLINE'
            ? 'NO SIGNAL — TRY AGAIN WHEN YOU ARE BACK ONLINE.'
            : 'THAT DID NOT GO THROUGH. TRY AGAIN, OR MESSAGE THE FOUNDER.',
      );
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      <GridBackground />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>{title}</Text>
        <Text style={styles.price}>{price}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── it landed ── */}
        {granted && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.doneCard}>
            <Text style={styles.doneTag}>✓ YOU'RE IN</Text>
            <Text style={styles.doneBody}>
              Payment confirmed and your pass is live. Welcome back — let's go and win
              something.
            </Text>
            <Pressable onPress={onClose}>
              <View style={styles.autoCta}>
                <Text style={styles.autoCtaTxt}>BACK TO THE ACADEMY ›</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ── already waiting on one ── */}
        {pending ? (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.waitCard}>
            <Text style={styles.waitTag}>● PAYMENT SENT — BEING CHECKED</Text>
            <Text style={styles.waitRef}>{pending.reference}</Text>
            <Text style={styles.waitBody}>
              The founder checks the account by hand and approves it, usually the same day.
              You will get a message the moment it lands, and your pass starts then — not now,
              so you lose nothing by the wait.
            </Text>
            <Text style={styles.waitFine}>
              Sent the money but something looks wrong? Settings → Contact the founder. A real
              person reads it.
            </Text>
          </Animated.View>
        ) : (
          <>
            {/* ── the automatic path ── */}
        {canAuto && !pending && !granted && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.autoCard}>
            <Text style={styles.autoTag}>PAY BY CARD</Text>
            <Text style={styles.autoBody}>
              Your normal bank card. You come straight back and everything is already
              open — no code to type, no waiting on anyone.
            </Text>
            {startErr && <Text style={styles.error}>{startErr}</Text>}
            <Pressable onPress={() => void payNow()} disabled={starting}>
              <View style={[styles.autoCta, starting && { opacity: 0.5 }]}>
                <Text style={styles.autoCtaTxt}>
                  {starting ? 'OPENING CHECKOUT…' : `PAY ${price} NOW ›`}
                </Text>
              </View>
            </Pressable>
            <Text style={styles.autoFine}>
              STRIPE HANDLES THE PAYMENT. THE ACADEMY NEVER SEES YOUR CARD.
            </Text>
            {geo === 'africa' && (
              <Text style={styles.autoFine}>
                NIGERIAN BANK CARDS WORK — GTBANK, UBA, ACCESS, FIRST BANK, ZENITH,
                WEMA. IF YOUR BANK REFUSES IT, SEND IT MANUALLY BELOW.
              </Text>
            )}
          </Animated.View>
        )}

        {/* ── the rescue path: card refused, nobody is lost ── */}
        {canAuto && !pending && !granted && (triedCard || !!startErr) && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.helpCard}>
            <Text style={styles.helpTag}>CARD DIDN'T GO THROUGH?</Text>
            <Text style={styles.autoBody}>
              That is usually your bank blocking an international payment, not you and
              not us. Two ways round it — and your seat is safe either way.
            </Text>

            <Text style={styles.helpStep}>
              1 · SEND IT MANUALLY — pick a method below, quote the reference it gives
              you, and submit the claim.
            </Text>
            <Text style={styles.helpStep}>
              2 · OR JUST TALK TO ME — one tap sends your ID and I will sort it with you
              personally.
            </Text>

            {helpState === 'sent' || helpState === 'already' ? (
              <View style={styles.helpDone}>
                <Text style={styles.helpDoneTxt}>
                  {helpState === 'already'
                    ? '✓ ALREADY SENT — THE FOUNDER HAS YOUR ID'
                    : '✓ SENT — THE FOUNDER HAS YOUR ID'}
                </Text>
                <Text style={styles.autoFine}>
                  {me?.academyId ? `YOUR ID: ${me.academyId}` : ''}
                </Text>
                <Text style={styles.autoFine}>
                  HE REPLIES IN SETTINGS → CONTACT, USUALLY THE SAME DAY.
                </Text>
              </View>
            ) : (
              <Pressable onPress={() => void askForHelp()} disabled={helpState === 'sending'}>
                <View style={[styles.helpCta, helpState === 'sending' && { opacity: 0.5 }]}>
                  <Text style={styles.helpCtaTxt}>
                    {helpState === 'sending' ? 'SENDING…' : 'TALK TO THE FOUNDER ›'}
                  </Text>
                </View>
              </Pressable>
            )}
          </Animated.View>
        )}

        {canAuto && !pending && !granted && (
          <Text style={styles.orLine}>OR SEND IT MANUALLY</Text>
        )}

        {/* ── 1 · who you are paying ── */}
            <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
              <Text style={styles.step}>1 · WHERE THE MONEY GOES</Text>

              {(methods?.length ?? 0) > 1 && (
                <View style={styles.methodRow}>
                  {methods!.map((m) => {
                    const on = pick === m.code;
                    return (
                      <Pressable key={m.code} onPress={() => setPick(m.code)} hitSlop={4}>
                        <View style={[styles.chip, on && styles.chipOn]}>
                          <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{m.label}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {method ? (
                <>
                  <Pressable onPress={() => copy(method.details, 'details')}>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>{method.label} · {method.currency}</Text>
                      <Text style={styles.detailValue}>{method.details}</Text>
                      {method.holder && <Text style={styles.detailHolder}>{method.holder}</Text>}
                      <Text style={styles.tapCopy}>
                        {copied === 'details' ? 'COPIED ✓' : 'TAP TO COPY'}
                      </Text>
                    </View>
                  </Pressable>
                  {method.note && (
                    <View style={styles.gsBox}>
                      <Text style={styles.gsTag}>⚠ SEND AS GOODS AND SERVICES</Text>
                      <Text style={styles.gsBody}>{method.note}</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.dim}>LOADING PAYMENT DETAILS…</Text>
              )}
            </Animated.View>

            {/* ── 2 · tell him it was you ── */}
            <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.card}>
              <Text style={styles.step}>2 · TELL HIM IT WAS YOU</Text>
              <Text style={styles.body}>
                Send {price}, then tap below. You get a reference tied to your seat — put it in
                the payment note if you can, and keep it either way.
              </Text>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Name or email you paid from (helps him match it)"
                placeholderTextColor="rgba(143,184,155,0.35)"
                style={styles.input}
                maxLength={300}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable onPress={() => void submit()} disabled={!pick || busy}>
                <View style={[styles.cta, (!pick || busy) && styles.ctaOff]}>
                  <Text style={styles.ctaTxt}>{busy ? 'SENDING…' : "I'VE SENT THE MONEY ›"}</Text>
                </View>
              </Pressable>
            </Animated.View>
          </>
        )}

        {/* ── why this is safe ── */}
        <Animated.View entering={FadeInDown.delay(140).duration(300)} style={styles.safeCard}>
          <Text style={styles.safeTag}>WHY THIS IS SAFE FOR YOU</Text>
          <Text style={styles.safeRow}>· Your reference is tied to your seat — it cannot be mixed up with anyone else's.</Text>
          <Text style={styles.safeRow}>· Your pass starts when it is approved, so a slow check costs you no days.</Text>
          <Text style={styles.safeRow}>· Every claim is on the record. You can always see its status here.</Text>
          <Text style={styles.safeRow}>· If you are removed with unused paid time, that balance comes back to you.</Text>
          <Text style={styles.safeRow}>· A real person reads Contact — not a bot, not a queue.</Text>
        </Animated.View>

        {/* ── history ── */}
        {claims && claims.length > 0 && (
          <Animated.View entering={FadeInDown.delay(180).duration(300)} style={styles.card}>
            <Text style={styles.step}>YOUR PAYMENTS</Text>
            {claims.map((c) => (
              <View key={c.id} style={styles.histRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histRef}>{c.reference}</Text>
                  <Text style={styles.histMeta}>
                    {c.product} · {new Date(c.at).toLocaleDateString()}
                  </Text>
                  {c.decidedNote && <Text style={styles.histNote}>{c.decidedNote}</Text>}
                </View>
                <Text
                  style={[
                    styles.histStatus,
                    c.status === 'approved' && { color: colors.primary },
                    c.status === 'rejected' && { color: colors.loss },
                  ]}
                >
                  {c.status === 'approved' ? '✓ CONFIRMED' : c.status === 'rejected' ? 'NOT FOUND' : 'CHECKING…'}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <Pressable onPress={onClose} hitSlop={10} style={styles.back}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 46 },
  header: { paddingHorizontal: 18, paddingBottom: 8, alignItems: 'center' },
  eyebrow: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 2, color: colors.accent },
  price: { marginTop: 4, fontFamily: monoFont, fontSize: 20, fontWeight: '900', letterSpacing: 1.4, color: colors.fg },
  scroll: { paddingHorizontal: 15, paddingTop: 10 },

  doneCard: {
    borderWidth: 1, borderColor: colors.primary,
    backgroundColor: 'rgba(10,32,17,0.9)', borderRadius: 12, padding: 14, marginBottom: 11,
  },
  doneTag: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 2, color: colors.primary },
  doneBody: { marginTop: 7, fontFamily: monoFont, fontSize: 7.6, lineHeight: 12, color: 'rgba(238,242,236,0.92)' },

  autoCard: {
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.5)',
    backgroundColor: 'rgba(10,26,15,0.85)', borderRadius: 12, padding: 13, marginBottom: 11,
  },
  autoTag: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.8, color: colors.primary },
  autoBody: { marginTop: 6, fontFamily: monoFont, fontSize: 7.2, lineHeight: 11.5, color: 'rgba(238,242,236,0.9)' },
  autoCta: { marginTop: 11, backgroundColor: colors.primary, borderRadius: 11, paddingVertical: 14, alignItems: 'center' },
  autoCtaTxt: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1.8, color: '#05130a' },
  autoFine: { marginTop: 8, textAlign: 'center', fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1, color: 'rgba(143,184,155,0.65)' },

  // the rescue card — amber, not red. A failed card is a problem to
  // solve together, not an error the member has committed.
  helpCard: {
    borderWidth: 1, borderColor: 'rgba(240,180,60,0.45)',
    backgroundColor: 'rgba(30,22,8,0.85)', borderRadius: 12, padding: 13, marginBottom: 11,
  },
  helpTag: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.8, color: 'rgb(240,180,60)' },
  helpStep: { marginTop: 8, fontFamily: monoFont, fontSize: 6.8, lineHeight: 11, color: 'rgba(238,242,236,0.82)' },
  helpCta: {
    marginTop: 12, borderWidth: 1, borderColor: 'rgb(240,180,60)',
    borderRadius: 11, paddingVertical: 13, alignItems: 'center',
  },
  helpCtaTxt: { fontFamily: monoFont, fontSize: 8.2, fontWeight: '900', letterSpacing: 1.6, color: 'rgb(240,180,60)' },
  helpDone: { marginTop: 12, alignItems: 'center' },
  helpDoneTxt: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.4, color: colors.primary },

  orLine: { marginBottom: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(143,184,155,0.5)' },

  card: {
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)',
    backgroundColor: 'rgba(10,20,13,0.72)', borderRadius: 12, padding: 12, marginBottom: 11,
  },
  step: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.7, color: 'rgba(143,184,155,0.9)' },
  body: { marginTop: 6, fontFamily: monoFont, fontSize: 7.2, lineHeight: 11.5, color: 'rgba(238,242,236,0.88)' },
  dim: { marginTop: 8, fontFamily: monoFont, fontSize: 6.6, color: 'rgba(143,184,155,0.6)' },

  methodRow: { flexDirection: 'row', gap: 6, marginTop: 9 },
  chip: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  chipOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.13)' },
  chipTxt: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.1, color: 'rgba(143,184,155,0.8)' },
  chipTxtOn: { color: colors.primary },

  detailBox: {
    marginTop: 9, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)',
    backgroundColor: 'rgba(8,18,11,0.9)', borderRadius: 10, padding: 12,
  },
  detailLabel: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(143,184,155,0.75)' },
  detailValue: { marginTop: 5, fontFamily: monoFont, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, color: colors.fg },
  detailHolder: { marginTop: 3, fontFamily: monoFont, fontSize: 7, letterSpacing: 0.8, color: 'rgba(238,242,236,0.75)' },
  tapCopy: { marginTop: 7, fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 1.3, color: colors.primary },
  methodNote: { marginTop: 7, fontFamily: monoFont, fontSize: 6.4, lineHeight: 10, color: '#f2c078' },

  gsBox: {
    marginTop: 9, borderWidth: 1, borderColor: 'rgba(242,192,120,0.55)',
    backgroundColor: 'rgba(40,32,14,0.7)', borderRadius: 9, padding: 10,
  },
  gsTag: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.3, color: '#f2c078' },
  gsBody: { marginTop: 4, fontFamily: monoFont, fontSize: 6.6, lineHeight: 10.4, color: 'rgba(238,242,236,0.9)' },
  input: {
    marginTop: 9, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 9,
    paddingHorizontal: 11, paddingVertical: 10, color: colors.fg,
    fontFamily: monoFont, fontSize: 8, backgroundColor: 'rgba(10,15,10,0.6)',
  },
  error: { marginTop: 8, fontFamily: monoFont, fontSize: 6.4, lineHeight: 10, color: colors.loss },

  cta: { marginTop: 11, backgroundColor: colors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center' },
  ctaOff: { opacity: 0.35 },
  ctaTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.8, color: '#05130a' },

  waitCard: {
    borderWidth: 1, borderColor: 'rgba(242,192,120,0.5)',
    backgroundColor: 'rgba(36,29,12,0.7)', borderRadius: 12, padding: 13, marginBottom: 11,
  },
  waitTag: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.5, color: '#f2c078' },
  waitRef: { marginTop: 6, fontFamily: monoFont, fontSize: 15, fontWeight: '900', letterSpacing: 2, color: colors.fg },
  waitBody: { marginTop: 7, fontFamily: monoFont, fontSize: 7.2, lineHeight: 11.5, color: 'rgba(238,242,236,0.88)' },
  waitFine: { marginTop: 7, fontFamily: monoFont, fontSize: 6.2, lineHeight: 10, color: 'rgba(143,184,155,0.7)' },

  safeCard: {
    borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: 10, marginBottom: 11,
  },
  safeTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.5, color: colors.primary },
  safeRow: { marginTop: 4, fontFamily: monoFont, fontSize: 6.4, lineHeight: 10, color: 'rgba(143,184,155,0.85)' },

  histRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.12)', paddingTop: 8 },
  histRef: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.2, color: colors.fg },
  histMeta: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 0.9, color: 'rgba(143,184,155,0.6)' },
  histNote: { marginTop: 2, fontFamily: monoFont, fontSize: 6, lineHeight: 9.5, color: 'rgba(143,184,155,0.8)' },
  histStatus: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.1, color: '#f2c078' },

  back: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
