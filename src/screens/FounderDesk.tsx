import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { ChevronLeftIcon, CheckIcon, RefreshGlyphIcon, ScanGlyphIcon } from '../components/Icons';
import { colors, monoFont } from '../theme';
import * as backend from '../data/backend';

// ─────────────────────────────────────────────────────────────
// FOUNDER DESK — the owner's private admin GUI, inside the app.
// One person (you) holds the founder key; this screen turns it
// into real power: live academy numbers, the JAN 1 region split,
// and FOUNDER broadcasts into any room (they wear the FOUNDER
// badge and fan out live to every phone in the room).
// The key never leaves the device except as a request header.
// ─────────────────────────────────────────────────────────────

const HALLS = [
  { slug: 'dressing-room', label: 'DRESSING ROOM' },
  { slug: 'match-receipts', label: 'RECEIPTS' },
  { slug: 'the-lab', label: 'THE LAB' },
  { slug: 'division-africa', label: 'DIVISION: AFRICA' },
  { slug: 'division-world', label: 'DIVISION: WORLDWIDE' },
];

const HEAD_LABELS = ['TILTED', 'SHOOK', 'OKAY', 'CALM', 'ICE IN VEINS'];

export default function FounderDesk({ founderKey, onForgetKey, onClose }: { founderKey: string; onForgetKey: () => void; onClose: () => void }) {
  const [data, setData] = useState<backend.AdminSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hall, setHall] = useState('division-africa');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [topId, setTopId] = useState('');
  const [topCredits, setTopCredits] = useState('');
  const [topRef, setTopRef] = useState('');
  const [tillBusy, setTillBusy] = useState(false);
  const [tillNote, setTillNote] = useState<string | null>(null);

  // ── the inbox ──
  const [inbox, setInbox] = useState<backend.InboxRow[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyTxt, setReplyTxt] = useState('');
  const [inboxBusy, setInboxBusy] = useState(false);

  // ── invites ──
  const [invites, setInvites] = useState<backend.InviteRow[] | null>(null);
  const [invLabel, setInvLabel] = useState('');
  const [invUses, setInvUses] = useState('1');
  const [invDays, setInvDays] = useState('0');
  const [invNew, setInvNew] = useState<string | null>(null);
  const [inviteOnly, setInviteOnly] = useState<boolean | null>(null);

  // ── packs: credits + the tricks inside ──
  const [packs, setPacks] = useState<backend.PackRow[] | null>(null);
  const [packPick, setPackPick] = useState<string>('NG-MID-30');
  const loadPacks = async () => setPacks(await backend.founderPacks(founderKey));

  /** sell a timed pass — time stacks, upgrades carry days over */
  const givePack = async () => {
    const id = topId.trim().toUpperCase();
    if (!id || tillBusy) return;
    setTillBusy(true);
    setTillNote(null);
    const r = await backend.founderGrantTier(founderKey, id, packPick, topRef.trim() || undefined);
    setTillBusy(false);
    if (r.ok) {
      const until = r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '';
      setTillNote(
        `${id} IS NOW ${String(r.tier ?? '').toUpperCase() === 'MID' ? 'ACADEMY' : String(r.tier ?? '').toUpperCase()}` +
        (until ? ` UNTIL ${until}` : ''),
      );
      setTopId('');
      setTopRef('');
      void loadPacks();
    } else {
      setTillNote(
        r.error?.includes('higher') ? 'THEY ALREADY HOLD A HIGHER LIVE PASS'
        : r.error?.includes('unknown academy') ? 'NO SUCH ACADEMY ID'
        : 'THAT DID NOT GO THROUGH',
      );
    }
  };

  const loadInbox = async () => {
    const r = await backend.founderInbox(founderKey);
    if (r) { setInbox(r.messages); setUnread(r.unread); }
  };
  const loadInvites = async () => setInvites(await backend.founderInvites(founderKey));
  const loadDoor = async () => {
    const c = await backend.founderConfig(founderKey);
    if (c) setInviteOnly(String(c.invite_only ?? 'false') === 'true');
  };

  const sendReply = async (id: number) => {
    const t = replyTxt.trim();
    if (!t || inboxBusy) return;
    setInboxBusy(true);
    const ok = await backend.founderReply(founderKey, id, t);
    setInboxBusy(false);
    if (ok) { setReplyTo(null); setReplyTxt(''); void loadInbox(); }
    else setErr('REPLY FAILED');
  };

  const makeInvite = async () => {
    const code = await backend.founderCreateInvite(
      founderKey, invLabel.trim(), Number(invUses) || 1, Number(invDays) || 0,
    );
    if (code) { setInvNew(code); setInvLabel(''); void loadInvites(); }
    else setErr('COULD NOT CREATE THE CODE');
  };

  const toggleDoor = async () => {
    if (inviteOnly == null) return;
    const next = !inviteOnly;
    const ok = await backend.founderSetConfig(founderKey, 'invite_only', String(next));
    if (ok) setInviteOnly(next);
  };

  const refresh = useCallback(async () => {
    setErr(null);
    void loadInbox();
    void loadInvites();
    void loadDoor();
    void loadPacks();
    const s = await backend.adminSummary(founderKey);
    if (s) setData(s);
    else setErr('SERVER UNREACHABLE OR KEY REJECTED — CHECK ADMIN_KEY ON THE SERVER');
  }, [founderKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const topUp = async () => {
    const id = topId.trim().toUpperCase();
    const credits = Math.round(Number(topCredits));
    if (!id || !Number.isFinite(credits) || credits <= 0 || tillBusy) return;
    setTillBusy(true);
    setTillNote(null);
    setErr(null);
    const r = await backend.tillTopUp(founderKey, id, credits, topRef.trim() || undefined);
    setTillBusy(false);
    if (r.ok) {
      setTillNote(`+${credits} → ${id} · WALLET NOW ${r.balance} CREDITS`);
      setTopCredits('');
      setTopRef('');
      void refresh();
    } else {
      setErr('TOP-UP FAILED — UNKNOWN ACADEMY ID, SERVER OFFLINE, OR KEY REJECTED');
    }
  };

  const activatePro = async () => {
    const id = topId.trim().toUpperCase();
    if (!id || tillBusy) return;
    setTillBusy(true);
    setTillNote(null);
    setErr(null);
    const renews = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const ok = await backend.tillSubscribe(founderKey, id, 'pro', renews);
    setTillBusy(false);
    if (ok) {
      setTillNote(`PRO ACTIVE → ${id} · RENEWS ${renews}`);
      void refresh();
    } else {
      setErr('PRO ACTIVATION FAILED — UNKNOWN ACADEMY ID, SERVER OFFLINE, OR KEY REJECTED');
    }
  };

  const broadcast = async () => {
    const text = msg.trim().slice(0, 500);
    if (!text || busy) return;
    setBusy(true);
    const ok = await backend.postFounderMessage(founderKey, hall, text);
    setBusy(false);
    if (ok) {
      setMsg('');
      setSentCount((n) => n + 1);
    } else {
      setErr('BROADCAST FAILED — SERVER UNREACHABLE OR KEY REJECTED');
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.root}>
      <GridBackground />
      <View style={styles.headerWrap}>
        <Text style={styles.eyebrow}>PSA-FOUNDER · KEY HELD ON THIS DEVICE ONLY</Text>
        <Text style={styles.title}>FOUNDER DESK</Text>
        <Text style={styles.subtitle}>YOUR PRIVATE ADMIN CONSOLE — STATS, THE JAN 1 SPLIT, LIVE BROADCASTS</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        {/* live numbers */}
        <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.statGrid}>
          {[
            { v: data?.users, l: 'PLAYERS' },
            { v: data?.matches, l: 'MATCHES' },
            { v: data?.watcherMatches, l: 'VIA THE EYE' },
            { v: data?.messages, l: 'MESSAGES' },
            { v: data?.matchesThisWeek, l: 'THIS WEEK' },
          ].map((c) => (
            <View key={c.l} style={styles.statCell}>
              <Text style={styles.statVal}>{c.v ?? '—'}</Text>
              <Text style={styles.statLbl}>{c.l}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── THE INBOX — members writing to you privately ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.splitCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTag}>THE INBOX</Text>
            <Text style={[styles.cardTag, unread > 0 && { color: colors.accent }]}>
              {unread > 0 ? `${unread} UNREAD` : 'ALL READ'}
            </Text>
          </View>

          {!inbox || inbox.length === 0 ? (
            <Text style={styles.emptyNote}>NOTHING YET — THE LINE IS OPEN.</Text>
          ) : (
            inbox.slice(0, 12).map((m) => (
              <View key={m.id} style={[styles.inboxRow, !m.read && styles.inboxUnread]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.inboxWho}>
                    {m.handle ?? 'PLAYER'} · {String(m.kind).toUpperCase()}
                  </Text>
                  <Text style={styles.inboxAt}>{new Date(m.at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.inboxBody}>{m.body}</Text>

                {m.reply ? (
                  <Text style={styles.inboxReplied}>YOU: {m.reply}</Text>
                ) : replyTo === m.id ? (
                  <View>
                    <TextInput
                      value={replyTxt}
                      onChangeText={setReplyTxt}
                      placeholder="Your reply…"
                      placeholderTextColor="rgba(143,184,155,0.35)"
                      multiline
                      style={styles.replyInput}
                    />
                    <View style={styles.rowBetween}>
                      <Pressable onPress={() => { setReplyTo(null); setReplyTxt(''); }} hitSlop={6}>
                        <Text style={styles.ghostBtn}>CANCEL</Text>
                      </Pressable>
                      <Pressable onPress={() => void sendReply(m.id)} hitSlop={6}>
                        <Text style={styles.linkBtn}>{inboxBusy ? 'SENDING…' : 'SEND REPLY ›'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => { setReplyTo(m.id); setReplyTxt(''); }} hitSlop={6}>
                    <Text style={styles.linkBtn}>REPLY ›</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </Animated.View>

        {/* ── THE DOOR — invite codes ── */}
        <Animated.View entering={FadeInDown.delay(90).duration(320)} style={styles.splitCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTag}>THE DOOR</Text>
            <Pressable onPress={() => void toggleDoor()} hitSlop={6}>
              <Text style={[styles.doorPill, inviteOnly ? styles.doorShut : styles.doorOpen]}>
                {inviteOnly == null ? '…' : inviteOnly ? 'INVITE-ONLY · TAP TO OPEN' : 'OPEN TO ALL · TAP TO CLOSE'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.emptyNote}>
            OPEN IT FOR THE FREE WEEK, THEN CLOSE IT AGAIN. WHILE OPEN, ANYONE WITH THE APP CAN TAKE A SEAT.
          </Text>

          <View style={styles.invRow}>
            <TextInput
              value={invLabel} onChangeText={setInvLabel}
              placeholder="WHO / WHERE (e.g. LAGOS DEC)"
              placeholderTextColor="rgba(143,184,155,0.35)"
              style={[styles.tillInput, { flex: 2 }]}
            />
            <TextInput
              value={invUses} onChangeText={setInvUses} keyboardType="number-pad"
              placeholder="USES" placeholderTextColor="rgba(143,184,155,0.35)"
              style={[styles.tillInput, { flex: 1 }]}
            />
            <TextInput
              value={invDays} onChangeText={setInvDays} keyboardType="number-pad"
              placeholder="DAYS" placeholderTextColor="rgba(143,184,155,0.35)"
              style={[styles.tillInput, { flex: 1 }]}
            />
          </View>
          <Pressable onPress={() => void makeInvite()} hitSlop={6}>
            <Text style={styles.linkBtn}>CREATE INVITE CODE ›</Text>
          </Pressable>

          {invNew && <Text style={styles.invNew}>NEW CODE — {invNew}</Text>}

          {invites && invites.length > 0 && invites.slice(0, 8).map((iv) => (
            <View key={iv.code} style={styles.invItem}>
              <Text style={[styles.invCode, iv.revoked && styles.invDead]}>{iv.code}</Text>
              <Text style={styles.invMeta}>
                {iv.uses}/{iv.max_uses}{iv.label ? ` · ${iv.label}` : ''}
                {iv.revoked ? ' · REVOKED' : ''}
              </Text>
              {!iv.revoked && (
                <Pressable onPress={() => void backend.founderRevokeInvite(founderKey, iv.code).then(loadInvites)} hitSlop={6}>
                  <Text style={styles.revoke}>REVOKE</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Animated.View>

        {/* the jan 1 split */}
        <Animated.View entering={FadeInDown.delay(100).duration(320)} style={styles.splitCard}>
          <Text style={styles.cardTag}>JAN 1 PRICING SPLIT — LIVE</Text>
          <View style={styles.splitRow}>
            <View style={styles.splitHalf}>
              <Text style={[styles.splitVal, { color: colors.accent }]}>{data?.regions.africa ?? '—'}</Text>
              <Text style={styles.splitLbl}>AFRICA · CREDIT PACKS</Text>
            </View>
            <View style={styles.splitHalf}>
              <Text style={[styles.splitVal, { color: colors.primary }]}>{data?.regions.world ?? '—'}</Text>
              <Text style={styles.splitLbl}>WORLD · SUBSCRIPTION</Text>
            </View>
            <View style={styles.splitHalf}>
              <Text style={styles.splitVal}>{data?.regions.unset ?? '—'}</Text>
              <Text style={styles.splitLbl}>NO REGION YET</Text>
            </View>
          </View>
          {data?.seats ? (
            <Text style={styles.seatsLine}>
              {data.seats.season} · {data.seats.taken}/{data.seats.cap} SEATS CLAIMED
              {data.seats.taken >= data.seats.cap
                ? ` · FULL — ${data.seats.waiting ?? 0} WAITING`
                : ` · ${data.seats.cap - data.seats.taken} LEFT${data.seats.waiting ? ` · ${data.seats.waiting} WAITING` : ''}`}
            </Text>
          ) : null}
          <View style={styles.coachRow}>
            {(data?.coaches ?? []).map((c) => (
              <Text key={c.coach ?? 'none'} style={styles.coachChip}>
                {(c.coach ?? 'NO COACH').toUpperCase()} · {c.n}
              </Text>
            ))}
          </View>
        </Animated.View>

        {/* the till — the founder's money controls */}
        <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.splitCard}>
          <Text style={styles.cardTag}>
            THE TILL — {data ? (data.tillLive ? 'OPEN' : `SHELVES STOCKED · OPENS ${data.goLive?.slice(0, 10) ?? 'SOON'}`) : 'READING…'}
          </Text>
          <View style={styles.splitRow}>
            <View style={styles.splitHalf}>
              <Text style={styles.splitVal}>{data?.till.wallets ?? '—'}</Text>
              <Text style={styles.splitLbl}>WALLETS</Text>
            </View>
            <View style={styles.splitHalf}>
              <Text style={[styles.splitVal, { color: colors.primary }]}>{data?.till.creditsOut ?? '—'}</Text>
              <Text style={styles.splitLbl}>CREDITS OUT</Text>
            </View>
            <View style={styles.splitHalf}>
              <Text style={[styles.splitVal, { color: colors.accent }]}>{data?.till.proSubs ?? '—'}</Text>
              <Text style={styles.splitLbl}>PRO SUBS</Text>
            </View>
          </View>
          <Text style={styles.tillHelp}>
            BANK ALERT LANDS → TYPE THE PLAYER'S ACADEMY ID (THEY SEE IT IN THE TILL) → GIVE THEM THE PACK.
            PASSES ARE TIMED. BUYING THE SAME TIER AGAIN ADDS DAYS; UPGRADING CARRIES THE
            REMAINING DAYS OVER. THE REF IS YOUR RECEIPT.
          </Text>

          {/* pick the pack they paid for */}
          {packs && packs.length > 0 && (
            <View style={styles.packWrap}>
              {packs.map((p) => {
                const on = packPick === p.code;
                return (
                  <Pressable key={p.code} onPress={() => setPackPick(p.code)} hitSlop={4}>
                    <View style={[styles.packChip, on && styles.packChipOn]}>
                      <Text style={[styles.packChipTxt, on && styles.packChipTxtOn]}>
                        {p.title} · {p.price}
                      </Text>
                      <Text style={[styles.packChipSub, on && { color: '#05130a' }]}>
                        {String(p.region).toUpperCase()}
                        {p.items.length ? ` · +${p.items.length} EXTRA` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          <TextInput
            value={topId}
            onChangeText={(t) => setTopId(t.toUpperCase().slice(0, 12))}
            placeholder="ACADEMY ID — PSA-XXXXXX"
            placeholderTextColor={colors.muted}
            style={styles.tillInput}
            autoCapitalize="characters"
          />
          <View style={styles.tillRow}>
            <TextInput
              value={topCredits}
              onChangeText={(t) => setTopCredits(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="CREDITS"
              placeholderTextColor={colors.muted}
              style={[styles.tillInput, { flex: 1, marginTop: 0 }]}
              keyboardType="number-pad"
            />
            <TextInput
              value={topRef}
              onChangeText={(t) => setTopRef(t.slice(0, 40))}
              placeholder="REF (OPTIONAL)"
              placeholderTextColor={colors.muted}
              style={[styles.tillInput, { flex: 2, marginTop: 0 }]}
              autoCapitalize="characters"
            />
          </View>
          <Pressable onPress={() => void givePack()} disabled={!topId.trim() || tillBusy}>
            <View style={[styles.packCta, (!topId.trim() || tillBusy) && { opacity: 0.4 }]}>
              <Text style={styles.packCtaTxt}>
                {tillBusy ? 'DELIVERING…' : `GIVE ${packPick} ›`}
              </Text>
            </View>
          </Pressable>

          <Text style={styles.tillHelp}>OR MOVE CREDITS BY HAND:</Text>
          <View style={styles.tillBtnRow}>
            <Pressable onPress={topUp} disabled={!topId.trim() || !topCredits || tillBusy} style={{ flex: 1 }}>
              <View style={[styles.sendBtn, { marginTop: 0 }, (!topId.trim() || !topCredits || tillBusy) && styles.sendBtnOff]}>
                <Text style={styles.sendTxt}>{tillBusy ? 'WORKING…' : 'CREDIT THE PLAYER ›'}</Text>
              </View>
            </Pressable>
            <Pressable onPress={activatePro} disabled={!topId.trim() || tillBusy} style={{ flex: 1 }}>
              <View style={styles.proBtn}>
                <Text style={styles.proBtnTxt}>ACTIVATE PRO · 30 DAYS</Text>
              </View>
            </Pressable>
          </View>
          {tillNote ? <Text style={styles.sentNote}>{tillNote}</Text> : null}
        </Animated.View>

        {/* founder broadcast */}
        <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.card}>
          <Text style={styles.cardTag}>BROADCAST AS FOUNDER — LANDS LIVE IN THE ROOM</Text>
          <View style={styles.hallRow}>
            {HALLS.map((h) => (
              <Pressable key={h.slug} onPress={() => setHall(h.slug)} style={[styles.chip, hall === h.slug && styles.chipOn]} hitSlop={4}>
                <Text style={[styles.chipTxt, hall === h.slug && styles.chipTxtOn]}>{h.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={msg}
            onChangeText={(t) => setMsg(t.slice(0, 500))}
            placeholder="TYPE THE ANNOUNCEMENT — IT WEARS THE FOUNDER BADGE"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            maxLength={500}
          />
          <Pressable onPress={broadcast} disabled={!msg.trim() || busy}>
            <View style={[styles.sendBtn, (!msg.trim() || busy) && styles.sendBtnOff]}>
              <ScanGlyphIcon size={10} color="#0a0f0a" />
              <Text style={styles.sendTxt}>{busy ? 'BROADCASTING…' : `POST AS FOUNDER — ${HALLS.find((h) => h.slug === hall)?.label}`}</Text>
            </View>
          </Pressable>
          {sentCount > 0 && <Text style={styles.sentNote}>{sentCount} BROADCAST{sentCount === 1 ? '' : 'S'} SENT THIS SESSION — VISIBLE IN THE ROOM NOW</Text>}
        </Animated.View>

        {/* top scorers */}
        <Animated.View entering={FadeInDown.delay(180).duration(320)} style={styles.card}>
          <Text style={styles.cardTag}>TOP SCORERS — LAST 7 DAYS</Text>
          {(data?.topScorersWeek?.length ?? 0) === 0 && <Text style={styles.dim}>Nothing in the last 7 days — the season is young.</Text>}
          {(data?.topScorersWeek ?? []).map((t, i) => (
            <View key={t.handle} style={styles.rowLine}>
              <Text style={styles.rowRank}>{i + 1}</Text>
              <Text style={styles.rowHandle}>{t.handle}</Text>
              <Text style={styles.rowMeta}>{t.goals} GOALS · {t.played} PLAYED</Text>
            </View>
          ))}
        </Animated.View>

        {/* recent vault */}
        <Animated.View entering={FadeInDown.delay(220).duration(320)} style={styles.card}>
          <Text style={styles.cardTag}>RECENT VAULT — SCORES + HEADS + THEIR LINES</Text>
          {(data?.recentMatches?.length ?? 0) === 0 && <Text style={styles.dim}>The academy vault is empty so far.</Text>}
          {(data?.recentMatches ?? []).slice(0, 6).map((m, i) => (
            <View key={`${m.at}-${i}`} style={styles.matchRow}>
              <Text style={styles.matchScore}>{m.gf}–{m.ga}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.matchMeta} numberOfLines={1}>
                  {m.handle} · {m.mode ?? '—'} · {m.source === 'watcher' ? 'THE EYE' : 'HONOR'}
                  {m.composure != null ? ` · HEAD: ${HEAD_LABELS[m.composure - 1] ?? m.composure}` : ''}
                </Text>
                {m.note ? <Text style={styles.matchNote} numberOfLines={2}>“{m.note}”</Text> : null}
              </View>
            </View>
          ))}
        </Animated.View>

        <View style={styles.toolRow}>
          <Pressable onPress={() => void refresh()} style={styles.toolBtn} hitSlop={6}>
            <RefreshGlyphIcon size={11} color={colors.primary} />
            <Text style={styles.toolBtnTxt}>REFRESH</Text>
          </Pressable>
          <Pressable onPress={onForgetKey} style={[styles.toolBtn, styles.toolBtnDanger]} hitSlop={6}>
            <Text style={[styles.toolBtnTxt, { color: colors.loss }]}>FORGET THE KEY ON THIS DEVICE</Text>
          </Pressable>
        </View>
        {!data && !err && <Text style={styles.dim}>Reading the academy…</Text>}
      </ScrollView>

      <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  packChip: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  packChipOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  packChipTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1, color: 'rgba(238,242,236,0.9)' },
  packChipTxtOn: { color: '#05130a' },
  packChipSub: { fontFamily: monoFont, fontSize: 5.6, letterSpacing: 0.9, color: 'rgba(143,184,155,0.7)' },
  packCta: { marginTop: 10, backgroundColor: colors.accent, borderRadius: 11, paddingVertical: 12, alignItems: 'center' },
  packCtaTxt: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.4, color: '#2a1410' },
  emptyNote: { marginTop: 6, fontFamily: monoFont, fontSize: 6, lineHeight: 9.5, letterSpacing: 1, color: 'rgba(143,184,155,0.6)' },

  inboxRow: { marginTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.14)', paddingTop: 8 },
  inboxUnread: { borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 7 },
  inboxWho: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.3, color: colors.accent },
  inboxAt: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1, color: 'rgba(143,184,155,0.5)' },
  inboxBody: { marginTop: 3, fontFamily: monoFont, fontSize: 7.6, lineHeight: 11.5, color: 'rgba(238,242,236,0.92)' },
  inboxReplied: { marginTop: 5, fontFamily: monoFont, fontSize: 7, lineHeight: 11, color: colors.primary },
  replyInput: {
    marginTop: 6, minHeight: 54, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 8, padding: 8,
    color: colors.fg, fontFamily: monoFont, fontSize: 8, backgroundColor: 'rgba(10,15,10,0.6)',
  },
  ghostBtn: { marginTop: 7, fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.2, color: 'rgba(143,184,155,0.7)' },
  linkBtn: { marginTop: 7, fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.3, color: colors.primary },

  doorPill: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 1.1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, overflow: 'hidden' },
  doorShut: { color: '#05130a', backgroundColor: colors.primary },
  doorOpen: { color: '#2a1410', backgroundColor: colors.accent },

  invRow: { flexDirection: 'row', gap: 6, marginTop: 9 },
  invNew: { marginTop: 8, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 2, color: colors.accent },
  invItem: { marginTop: 7, borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.12)', paddingTop: 6 },
  invCode: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.6, color: colors.fg },
  invDead: { color: 'rgba(143,184,155,0.4)', textDecorationLine: 'line-through' },
  invMeta: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1, color: 'rgba(143,184,155,0.6)' },
  revoke: { marginTop: 2, fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 1.2, color: colors.loss },
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingTop: 50, paddingHorizontal: 16 },
  headerWrap: { alignItems: 'center' },
  eyebrow: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '800', letterSpacing: 2.2, color: colors.muted },
  title: { marginTop: 6, fontSize: 19, fontWeight: '900', letterSpacing: 4, color: colors.warm },
  subtitle: { marginTop: 4, fontFamily: monoFont, fontSize: 5.8, fontWeight: '700', letterSpacing: 1.5, color: colors.accent, textAlign: 'center' },

  err: { marginTop: 14, fontFamily: monoFont, fontSize: 7, fontWeight: '800', letterSpacing: 1.3, color: colors.loss, textAlign: 'center' },
  dim: { marginTop: 8, fontFamily: monoFont, fontSize: 7, letterSpacing: 1, color: colors.muted },

  statGrid: { marginTop: 16, flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)', borderRadius: 13, backgroundColor: 'rgba(15,26,19,0.85)' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  statVal: { fontSize: 15, fontWeight: '900', color: colors.fg },
  statLbl: { marginTop: 2, fontFamily: monoFont, fontSize: 4.8, fontWeight: '800', letterSpacing: 1.1, color: colors.muted },

  splitCard: { marginTop: 12, borderWidth: 1.2, borderColor: 'rgba(242,192,120,0.5)', borderRadius: 14, backgroundColor: 'rgba(242,192,120,0.05)', padding: 13 },
  splitRow: { marginTop: 11, flexDirection: 'row' },
  splitHalf: { flex: 1, alignItems: 'center' },
  splitVal: { fontSize: 18, fontWeight: '900', color: colors.fg },
  splitLbl: { marginTop: 3, fontFamily: monoFont, fontSize: 5, fontWeight: '800', letterSpacing: 1.1, color: colors.muted, textAlign: 'center' },
  coachRow: { marginTop: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  seatsLine: { marginTop: 11, fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.8, color: colors.warm, textAlign: 'center' },
  coachChip: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.4, color: colors.muted, borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },

  card: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 14, backgroundColor: 'rgba(15,26,19,0.85)', padding: 13 },
  cardTag: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.8, color: colors.accent },

  hallRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(10,15,10,0.5)' },
  chipOn: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.1)' },
  chipTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.2, color: colors.muted },
  chipTxtOn: { color: colors.accent },
  input: { marginTop: 10, borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)', backgroundColor: '#0a0f0a', borderRadius: 10, color: colors.fg, fontFamily: monoFont, fontSize: 10.5, lineHeight: 16, padding: 10, minHeight: 58, textAlignVertical: 'top' },
  sendBtn: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 11, paddingVertical: 12 },
  sendBtnOff: { backgroundColor: 'rgba(46,42,30,1)' },
  sendTxt: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.6, color: '#0a0f0a' },
  sentNote: { marginTop: 7, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.2, color: colors.primary, textAlign: 'center' },

  rowLine: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  rowRank: { width: 14, fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: colors.accent },
  rowHandle: { flex: 1, fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, color: colors.fg },
  rowMeta: { fontFamily: monoFont, fontSize: 6, fontWeight: '800', letterSpacing: 1.1, color: colors.muted },

  matchRow: { marginTop: 9, flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.12)', paddingTop: 9 },
  matchScore: { width: 42, fontSize: 13, fontWeight: '900', color: colors.fg },
  matchMeta: { fontFamily: monoFont, fontSize: 6, fontWeight: '800', letterSpacing: 1, color: colors.muted },
  matchNote: { marginTop: 3, fontSize: 9.5, lineHeight: 14, fontStyle: 'italic', color: '#d8e6da' },

  tillHelp: { marginTop: 11, fontFamily: monoFont, fontSize: 5.8, fontWeight: '700', letterSpacing: 1, color: colors.muted, lineHeight: 11.5, textAlign: 'center' },
  tillInput: { marginTop: 9, borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)', backgroundColor: '#0a0f0a', borderRadius: 10, color: colors.fg, fontFamily: monoFont, fontSize: 10, paddingHorizontal: 10, paddingVertical: 8 },
  tillRow: { marginTop: 9, flexDirection: 'row', gap: 8 },
  tillBtnRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  proBtn: { borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 11, paddingVertical: 12, alignItems: 'center' },
  proBtnTxt: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.4, color: colors.primary },

  toolRow: { marginTop: 14, flexDirection: 'row', gap: 9 },
  toolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 11, paddingVertical: 11 },
  toolBtnDanger: { borderColor: 'rgba(224,96,92,0.4)' },
  toolBtnTxt: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.4, color: colors.primary },

  backBtn: { position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17, borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)', alignItems: 'center', justifyContent: 'center' },
});
