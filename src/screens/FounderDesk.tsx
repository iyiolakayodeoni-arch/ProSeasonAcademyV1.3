import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { ChevronLeftIcon, RefreshGlyphIcon, ScanGlyphIcon } from '../components/Icons';
import { colors, monoFont } from '../theme';
import * as backend from '../data/backend';
import {
  triageMessage,
  sortInboxByPriority,
  triageFlag,
  lapsedRecommendation,
  deskDigest,
  pricingDigest,
  PRIORITY_LABEL,
  CATEGORY_COLOR,
  DeskCategory,
} from '../data/founderAssist';
import { useCannedReplies, addCanned, cannedFor } from '../data/cannedReplies';
import { publishAnnouncement } from '../data/announcements';
import { fetchPendingNews, reviewNews, NewsItem } from '../data/newsFeed';

// ─────────────────────────────────────────────────────────────
// FOUNDER DESK — the owner's private admin GUI, inside the app.
// One person (you) holds the founder key; this screen turns it
// into real power: live academy numbers, the regional price split,
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

  // ── Home founder announcements ──
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annLink, setAnnLink] = useState('');
  const [annType, setAnnType] = useState<'update' | 'alert' | 'patch' | 'welcome'>('update');
  const [annDays, setAnnDays] = useState('');
  const [annBusy, setAnnBusy] = useState(false);
  const [annNote, setAnnNote] = useState<string | null>(null);

  // ── MetaBot news review ──
  const [pendingNews, setPendingNews] = useState<NewsItem[]>([]);
  const loadNews = async () => setPendingNews(await fetchPendingNews());

  // ── the inbox ──
  const [inbox, setInbox] = useState<backend.InboxRow[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyTxt, setReplyTxt] = useState('');
  const [inboxBusy, setInboxBusy] = useState(false);

  // ── the free week ──
  const [trialArmed, setTrialArmed] = useState(false);
  const [trialNote, setTrialNote] = useState<string | null>(null);
  const [lapsed, setLapsed] = useState<backend.LapsedRow[] | null>(null);

  const loadLapsed = async () => setLapsed(await backend.founderLapsed(founderKey));

  const [consult, setConsult] = useState<any[] | null>(null);
  const [closeArmed, setCloseArmed] = useState(false);
  const loadConsult = async () => setConsult(await backend.founderConsultResults(founderKey));

  const [flags, setFlags] = useState<backend.FlagRow[] | null>(null);
  const [sweepArmed, setSweepArmed] = useState(false);
  const [sweepNote, setSweepNote] = useState<string | null>(null);
  const loadFlags = async () => setFlags(await backend.founderFlags(founderKey));

  const [claims, setClaims] = useState<backend.ClaimRow[] | null>(null);
  const [claimBusy, setClaimBusy] = useState<number | null>(null);
  const loadClaims = async () => setClaims(await backend.founderClaims(founderKey));

  /** people whose card was refused — a sale you still have if you answer */
  const [stuck, setStuck] = useState<backend.StuckRow[] | null>(null);
  const loadStuck = async () => setStuck(await backend.founderStuck(founderKey));

  const decide = async (id: number, approve: boolean) => {
    setClaimBusy(id);
    const r = await backend.founderDecideClaim(founderKey, id, approve);
    setClaimBusy(null);
    if (!r.ok) setErr(r.error ?? 'CLAIM FAILED');
    void loadClaims();
    void loadStuck();
  };

  const runSweep = async () => {
    if (!sweepArmed) { setSweepArmed(true); return; }
    setSweepArmed(false);
    const r = await backend.founderSweep(founderKey);
    setSweepNote(r == null ? 'SWEEP FAILED' : r.length === 0 ? 'NOBODY WAS DUE — NOTHING CHANGED' : `${r.length} SEAT(S) RELEASED`);
    void loadLapsed();
  };

  const strike = async (academyId: string, reason: string, id: number) => {
    const n = await backend.founderStrike(founderKey, academyId, reason, 'warning');
    if (n != null) { await backend.founderReviewFlag(founderKey, id, `warned (${n})`); void loadFlags(); }
  };
  const dismissFlag = async (id: number) => {
    await backend.founderReviewFlag(founderKey, id, 'dismissed');
    void loadFlags();
    void loadClaims();
    void loadStuck();
  };

  // the founder's saved-reply library + a one-tap per-seat release
  const canned = useCannedReplies();
  const releaseSeat = async (academyId: string) => {
    await backend.founderSetStatus(founderKey, academyId, 'removed');
    void loadLapsed();
  };
  const closeConsult = async () => {
    if (!closeArmed) { setCloseArmed(true); return; }
    setCloseArmed(false);
    if (await backend.founderCloseConsult(founderKey)) void loadConsult();
  };

  /** open the free window to everyone holding a seat */
  const openTrial = async () => {
    if (!trialArmed) { setTrialArmed(true); return; }
    setTrialArmed(false);
    const n = await backend.founderGrantTrial(founderKey);
    setTrialNote(n == null ? 'THAT DID NOT GO THROUGH' : `${n} MEMBER(S) NOW ON THE TRIAL PASS`);
  };

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
    void loadLapsed();
    void loadConsult();
    void loadFlags();
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

  const sendReply = async (id: number) => {
    const t = replyTxt.trim();
    if (!t || inboxBusy) return;
    setInboxBusy(true);
    const ok = await backend.founderReply(founderKey, id, t);
    setInboxBusy(false);
    if (ok) { setReplyTo(null); setReplyTxt(''); void loadInbox(); }
    else setErr('REPLY FAILED');
  };

  const postHomeAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim() || annBusy) return;
    setAnnBusy(true);
    setAnnNote(null);
    const r = await publishAnnouncement({
      title: annTitle.trim(),
      body: annBody.trim(),
      linkUrl: annLink.trim() || undefined,
      updateType: annType,
      expiresDays: annDays ? Number(annDays) : undefined,
      author: 'POCOLASTONES',
    });
    setAnnBusy(false);
    if (r.ok) {
      setAnnNote(`POSTED TO HOME · ID ${r.id} · PUSH QUEUED`);
      setAnnTitle('');
      setAnnBody('');
      setAnnLink('');
      setAnnDays('');
    } else {
      setAnnNote(
        r.error === 'FOUNDER_ONLY'
          ? 'FOUNDER SESSION REQUIRED — SIGN IN AS FOUNDER AGAIN'
          : 'COULD NOT PUBLISH — CHECK SIGNAL / SQL v14',
      );
    }
  };

  const refresh = useCallback(async () => {
    setErr(null);
    void loadInbox();
    void loadPacks();
    void loadLapsed();
    void loadConsult();
    void loadFlags();
    void loadStuck();
    void loadNews();
    const s = await backend.adminSummary(founderKey);
    if (s) setData(s);
    else setErr('SERVER UNREACHABLE OR FOUNDER SESSION REJECTED — SIGN IN AS FOUNDER AGAIN');
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
        <Text style={styles.eyebrow}>PSA-FOUNDER · AUTHENTICATED SESSION · NO CLIENT KEY</Text>
        <Text style={styles.title}>FOUNDER DESK</Text>
        <Text style={styles.subtitle}>HOME ANNOUNCEMENTS · NEWS REVIEW · STATS · BROADCASTS · THE TILL</Text>
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

        {/* ── TODAY AT THE DESK — one pass, top to bottom (the daily digest) ── */}
        {(() => {
          const d = deskDigest({ stuck, claims, flags, lapsed, inboxUnread: unread });
          if (d.clear) return null;
          const tone = (t: string) =>
            t === 'payment' ? colors.accent : t === 'flag' ? colors.loss : t === 'seat' ? colors.warm : colors.primary;
          return (
            <Animated.View entering={FadeInDown.delay(70).duration(320)} style={styles.digestCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.digestTag}>TODAY AT THE DESK</Text>
                <Text style={styles.digestTotal}>{d.total}</Text>
              </View>
              <Text style={styles.digestHead}>{d.headline}</Text>
              {d.actions.map((a, i) => (
                <View key={i} style={styles.digestActionRow}>
                  <View style={[styles.digestDot, { backgroundColor: tone(a.tone) }]} />
                  <Text style={styles.digestActionTxt}>{a.count}× {a.label}</Text>
                </View>
              ))}
              <Text style={styles.emptyNote}>ONE PASS, TOP TO BOTTOM — EACH SECTION BELOW HAS THE ACTION READY.</Text>
            </Animated.View>
          );
        })()}

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
            sortInboxByPriority(inbox).slice(0, 12).map((m) => {
              const t = triageMessage(m);
              return (
              <View key={m.id} style={[styles.inboxRow, !m.read && styles.inboxUnread]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.inboxWho}>
                    {m.handle ?? 'PLAYER'} · {String(m.kind).toUpperCase()}
                  </Text>
                  <Text style={styles.inboxAt}>{new Date(m.at).toLocaleDateString()}</Text>
                </View>
                {/* auto-triage: category + priority + a one-line "what they want".
                    The assistant sorts and labels — the founder still reads + decides. */}
                <View style={[styles.triageChip, { borderColor: CATEGORY_COLOR[t.category] }]}>
                  <Text style={[styles.triageChipTxt, { color: CATEGORY_COLOR[t.category] }]}>
                    {t.category} · {PRIORITY_LABEL[t.priority]}
                  </Text>
                  <Text style={styles.triageConf}>{t.confidence.toUpperCase()}</Text>
                </View>
                <Text style={styles.triageSum}>{t.summary}</Text>
                <Text style={styles.inboxBody}>{m.body}</Text>

                {m.reply ? (
                  <Text style={styles.inboxReplied}>YOU: {m.reply}</Text>
                ) : replyTo === m.id ? (
                  <View>
                    <Text style={styles.draftHint}>DRAFT PRE-FILLED — EDIT, THEN SEND. NOTHING GOES WITHOUT YOUR TAP.</Text>
                    {/* saved-reply library: tap to fill, or save this edit for next time */}
                    {(() => {
                      const opts = cannedFor(canned, t.category).slice(0, 4);
                      if (!opts.length) return null;
                      return (
                        <View style={styles.cannedWrap}>
                          <Text style={styles.cannedLbl}>USE A SAVED REPLY · {t.category}:</Text>
                          <View style={styles.cannedChips}>
                            {opts.map((c) => (
                              <Pressable
                                key={c.id}
                                onPress={() =>
                                  setReplyTxt(c.body.replace('{ACADEMY_ID}', m.academy_id ?? m.handle ?? 'YOUR ID'))
                                }
                                hitSlop={4}
                              >
                                <View style={[styles.cannedChip, c.custom && styles.cannedChipCustom]}>
                                  <Text style={styles.cannedChipTxt} numberOfLines={1}>
                                    {c.custom ? '★ ' : ''}{c.body.slice(0, 34)}
                                  </Text>
                                </View>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      );
                    })()}
                    <TextInput
                      value={replyTxt}
                      onChangeText={setReplyTxt}
                      placeholder="Your reply…"
                      placeholderTextColor="rgba(143,184,155,0.35)"
                      multiline
                      style={styles.replyInput}
                    />
                    <View style={styles.rowBetween}>
                      <Pressable onPress={() => { addCanned(t.category, replyTxt); }} hitSlop={6}>
                        <Text style={styles.ghostBtn}>SAVE REPLY</Text>
                      </Pressable>
                      <Pressable onPress={() => { setReplyTo(null); setReplyTxt(''); }} hitSlop={6}>
                        <Text style={styles.ghostBtn}>CANCEL</Text>
                      </Pressable>
                      <Pressable onPress={() => void sendReply(m.id)} hitSlop={6}>
                        <Text style={styles.linkBtn}>{inboxBusy ? 'SENDING…' : 'SEND REPLY ›'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => { setReplyTo(m.id); setReplyTxt(t.draft); }} hitSlop={6}>
                    <Text style={styles.linkBtn}>REPLY (DRAFT READY) ›</Text>
                  </Pressable>
                )}
              </View>
              );
            })
          )}
        </Animated.View>

        {/* ── WHAT THE MEMBERS SAID ── */}
        {consult && consult.length > 0 && (
          <Animated.View entering={FadeInDown.delay(82).duration(320)} style={styles.splitCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTag}>THE PRICING TABLE</Text>
              <Pressable onPress={() => void closeConsult()} hitSlop={6}>
                <Text style={[styles.linkBtn, { marginTop: 0 }, closeArmed && { color: colors.loss }]}>
                  {closeArmed ? 'TAP AGAIN TO CLOSE IT' : 'CLOSE THE TABLE'}
                </Text>
              </Pressable>
            </View>

            {(() => {
              const pd = pricingDigest(consult);
              if (!pd) return null;
              return (
                <View style={styles.digestCard}>
                  <Text style={styles.digestTag}>PRICING DIGEST</Text>
                  <Text style={styles.digestHead}>{pd.read}</Text>
                </View>
              );
            })()}

            {consult.map((r: any) => (
              <View key={r.slug} style={styles.inboxRow}>
                <Text style={styles.inboxWho}>{r.prompt}</Text>
                <Text style={styles.invMeta}>
                  {r.answers} ANSWER(S)
                  {r.region ? ` · ${String(r.region).toUpperCase()}` : ''}
                  {!r.open ? ' · CLOSED' : ''}
                </Text>

                {r.median != null && (
                  <Text style={styles.consultBig}>
                    MEDIAN {Number(r.median).toLocaleString()}
                    {r.low != null ? `  (${Number(r.low).toLocaleString()}–${Number(r.high).toLocaleString()})` : ''}
                  </Text>
                )}

                {r.choices && Object.keys(r.choices).length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    {Object.entries(r.choices as Record<string, number>)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, n]) => (
                        <Text key={k} style={styles.consultRow}>
                          {n}× {k}
                        </Text>
                      ))}
                  </View>
                )}

                {Array.isArray(r.notes) && r.notes.length > 0 && (
                  <View style={{ marginTop: 5 }}>
                    {r.notes.slice(0, 4).map((n: any, i: number) => (
                      <Text key={i} style={styles.consultNote}>
                        “{n.note}” — {n.handle}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
            <Text style={styles.emptyNote}>
              MEDIAN, NOT AVERAGE — TWO SILLY NUMBERS CANNOT DRAG THE ANSWER.
            </Text>
          </Animated.View>
        )}

        {/* ── COULDN'T PAY — answer these first ── */}
        {(stuck?.length ?? 0) > 0 && (
          <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.stuckCard}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTag, { color: 'rgb(240,180,60)' }]}>CARD REFUSED — THEY WANT TO PAY</Text>
              <Text style={[styles.cardTag, { color: 'rgb(240,180,60)' }]}>{stuck!.length}</Text>
            </View>
            <Text style={styles.emptyNote}>
              THESE PEOPLE TRIED TO GIVE YOU MONEY AND THEIR BANK REFUSED IT. EACH ONE IS A SALE
              YOU STILL HAVE IF YOU ANSWER TODAY. REPLY IN THE INBOX ABOVE — THEY GET IT IN-APP.
            </Text>
            {stuck!.map((s) => (
              <View key={s.id} style={styles.stuckRow}>
                <View style={styles.rowBetween}>
                  <Text style={styles.stuckId}>{s.academy_id}</Text>
                  <Text style={styles.stuckWhen}>
                    {s.paid_since ? '✓ SORTED SINCE' : s.has_claim ? '● SENT IT MANUALLY' : 'WAITING ON YOU'}
                  </Text>
                </View>
                <Text style={styles.stuckBody}>{s.body}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── MONEY WAITING ON YOU ── */}
        <Animated.View entering={FadeInDown.delay(70).duration(320)} style={styles.splitCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTag}>PAYMENT CLAIMS</Text>
            <Text style={[styles.cardTag, (claims?.length ?? 0) > 0 && { color: colors.accent }]}>
              {claims?.length ? `${claims.length} WAITING` : 'NONE WAITING'}
            </Text>
          </View>
          <Text style={styles.emptyNote}>
            CHECK THE REFERENCE AGAINST YOUR PAYPAL / OPAY, THEN CONFIRM. CONFIRMING GRANTS THE
            PASS AUTOMATICALLY — YOU CANNOT APPROVE A PAYMENT WITHOUT THEM GETTING WHAT THEY PAID FOR.
          </Text>

          {claims?.map((c) => (
            <View key={c.id} style={styles.inboxRow}>
              <View style={styles.rowBetween}>
                <Text style={styles.inboxWho}>{c.handle ?? c.academy_id}</Text>
                <Text style={styles.inboxAt}>{new Date(c.at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.claimRef}>{c.reference}</Text>
              <Text style={styles.invMeta}>
                {c.product} · {c.amount ?? '—'} · via {String(c.method).toUpperCase()}
              </Text>
              {c.sender_note ? <Text style={styles.inboxBody}>{c.sender_note}</Text> : null}
              <View style={styles.rowBetween}>
                <Pressable onPress={() => void decide(c.id, false)} hitSlop={6} disabled={claimBusy === c.id}>
                  <Text style={styles.ghostBtn}>CANNOT FIND IT</Text>
                </Pressable>
                <Pressable onPress={() => void decide(c.id, true)} hitSlop={6} disabled={claimBusy === c.id}>
                  <Text style={styles.linkBtn}>
                    {claimBusy === c.id ? 'GRANTING…' : 'CONFIRM & GRANT ›'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* ── FLAGGED FOR YOUR EYES ── */}
        <Animated.View entering={FadeInDown.delay(84).duration(320)} style={styles.splitCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTag}>FLAGGED CONTENT</Text>
            <Text style={[styles.cardTag, (flags?.length ?? 0) > 0 && { color: colors.loss }]}>
              {flags?.length ? `${flags.length} TO READ` : 'NOTHING PENDING'}
            </Text>
          </View>
          <Text style={styles.emptyNote}>
            THE FILTER ONLY CATCHES EXTREME THINGS — SEXUAL CONTENT AND HATE. SWEARING AND BANTER
            NEVER APPEAR HERE. NOBODY IS REMOVED AUTOMATICALLY FOR THIS; YOU READ IT AND DECIDE.
          </Text>

          {flags?.slice(0, 8).map((f) => {
            const ft = triageFlag(f);
            return (
            <View key={f.id} style={styles.inboxRow}>
              <View style={styles.rowBetween}>
                <Text style={styles.inboxWho}>{f.handle ?? '—'} · #{f.channel}</Text>
                <Text style={styles.inboxAt}>MATCHED "{f.matched}"</Text>
              </View>
              {/* auto-triage: severity + a recommendation. The assistant only
                  labels — WARN / FALSE ALARM are still the founder's tap. */}
              <View style={[styles.triageChip, {
                borderColor: ft.recommendation === 'WARN' ? colors.loss : colors.accent,
              }]}>
                <Text style={[styles.triageChipTxt, {
                  color: ft.recommendation === 'WARN' ? colors.loss : colors.accent,
                }]}>
                  {ft.severity.replace('_', ' ')} · SUGGESTED: {ft.recommendation === 'WARN' ? 'WARN' : 'READ FIRST'}
                </Text>
                <Text style={styles.triageConf}>{ft.confidence.toUpperCase()}</Text>
              </View>
              <Text style={styles.triageSum}>{ft.reason}</Text>
              <Text style={styles.inboxBody}>{f.text}</Text>
              <View style={styles.rowBetween}>
                <Pressable onPress={() => void dismissFlag(f.id)} hitSlop={6}>
                  <Text style={styles.ghostBtn}>FALSE ALARM</Text>
                </Pressable>
                <Pressable onPress={() => void strike(f.academy_id ?? '', 'INAPPROPRIATE CONTENT', f.id)} hitSlop={6}>
                  <Text style={[styles.linkBtn, { color: colors.loss }]}>WARN THEM ›</Text>
                </Pressable>
              </View>
            </View>
            );
          })}
        </Animated.View>

        {/* ── THE SWEEPER ── */}
        <Animated.View entering={FadeInDown.delay(86).duration(320)} style={styles.splitCard}>
          <Text style={styles.cardTag}>UNPAID SEATS</Text>
          <Text style={styles.emptyNote}>
            REMOVES ONLY MEMBERS PAST THEIR DEADLINE WHO NEVER PAID. ANYONE HOLDING A LIVE PASS,
            INSIDE GRACE, OR WHO HAS EVER PAID IS LEFT ALONE. RUNS NIGHTLY BY ITSELF.
          </Text>
          <Pressable onPress={() => void runSweep()} hitSlop={6}>
            <Text style={[styles.linkBtn, sweepArmed && { color: colors.loss }]}>
              {sweepArmed ? 'TAP AGAIN — RELEASE THOSE SEATS' : 'RUN THE SWEEP NOW ›'}
            </Text>
          </Pressable>
          {sweepNote && <Text style={styles.invNew}>{sweepNote}</Text>}
        </Animated.View>

        {/* ── THE FREE WEEK ── */}
        <Animated.View entering={FadeInDown.delay(85).duration(320)} style={styles.splitCard}>
          <Text style={styles.cardTag}>THE FREE WEEK</Text>
          <Text style={styles.emptyNote}>
            GIVES EVERY SEATED MEMBER THE TRIAL PASS. ANYONE ALREADY HOLDING A LONGER PASS KEEPS IT —
            NOBODY IS DOWNGRADED. PEOPLE WHO JOIN DURING THE WINDOW GET IT AUTOMATICALLY.
          </Text>
          <Pressable onPress={() => void openTrial()} hitSlop={6}>
            <Text style={[styles.linkBtn, trialArmed && { color: colors.accent }]}>
              {trialArmed ? 'TAP AGAIN TO CONFIRM — GRANT TO EVERYONE' : 'OPEN THE FREE WEEK ›'}
            </Text>
          </Pressable>
          {trialNote && <Text style={styles.invNew}>{trialNote}</Text>}

          {lapsed && lapsed.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.cardTag}>SEATS THAT COULD BE RECLAIMED</Text>
              {lapsed.slice(0, 8).map((m) => {
                const lr = lapsedRecommendation(m);
                const tone = lr.action === 'RELEASE' ? colors.loss : lr.action === 'GRACE' ? colors.accent : 'rgba(143,184,155,0.6)';
                return (
                  <View key={m.academy_id} style={styles.inboxRow}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.inboxWho}>{m.handle} · {m.academy_id}</Text>
                      <Text style={styles.inboxAt}>{m.tier} · LAPSED {m.days_lapsed}D</Text>
                    </View>
                    <View style={[styles.triageChip, { borderColor: tone }]}>
                      <Text style={[styles.triageChipTxt, { color: tone }]}>SUGGESTED: {lr.action}</Text>
                      <Text style={styles.triageConf}>{lr.confidence.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.triageSum}>{lr.reason}</Text>
                    <View style={[styles.rowBetween, { marginTop: 4 }]}>
                      <Text style={styles.ghostBtn}>YOUR CALL — NOTHING AUTO</Text>
                      <Pressable onPress={() => void releaseSeat(m.academy_id)} hitSlop={6}>
                        <Text style={[styles.linkBtn, { color: colors.loss }]}>RELEASE SEAT ›</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              <Text style={styles.emptyNote}>
                NOTHING IS AUTOMATIC — REMOVING SOMEONE IS ALWAYS YOUR TAP.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* regional price split */}
        <Animated.View entering={FadeInDown.delay(100).duration(320)} style={styles.splitCard}>
          <Text style={styles.cardTag}>REGIONAL PRICING SPLIT — LIVE</Text>
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

        {/* HOME FOUNDER ANNOUNCEMENT — official, not community chat */}
        <Animated.View entering={FadeInDown.delay(130).duration(320)} style={styles.splitCard}>
          <Text style={styles.cardTag}>FOUNDER ANNOUNCEMENT → HOME</Text>
          <Text style={styles.emptyNote}>
            POSTS TO THE OFFICIAL HOME BLOCK AS POCOLASTONES. QUEUES A PUSH TO EVERY SEATED MEMBER.
            NOT COMMUNITY CHAT — MEMBERS SEE IT ABOVE THE FEED.
          </Text>
          <View style={styles.hallRow}>
            {(['update', 'alert', 'patch', 'welcome'] as const).map((t) => (
              <Pressable key={t} onPress={() => setAnnType(t)} style={[styles.chip, annType === t && styles.chipOn]} hitSlop={4}>
                <Text style={[styles.chipTxt, annType === t && styles.chipTxtOn]}>{t.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={annTitle}
            onChangeText={(t) => setAnnTitle(t.slice(0, 120))}
            placeholder="TITLE"
            placeholderTextColor={colors.muted}
            style={styles.tillInput}
          />
          <TextInput
            value={annBody}
            onChangeText={(t) => setAnnBody(t.slice(0, 4000))}
            placeholder="MESSAGE"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <TextInput
            value={annLink}
            onChangeText={setAnnLink}
            placeholder="OPTIONAL LINK URL"
            placeholderTextColor={colors.muted}
            style={styles.tillInput}
            autoCapitalize="none"
          />
          <TextInput
            value={annDays}
            onChangeText={(t) => setAnnDays(t.replace(/[^0-9]/g, '').slice(0, 3))}
            placeholder="EXPIRES IN DAYS (BLANK = NEVER)"
            placeholderTextColor={colors.muted}
            style={styles.tillInput}
            keyboardType="number-pad"
          />
          <Pressable onPress={() => void postHomeAnnouncement()} disabled={!annTitle.trim() || !annBody.trim() || annBusy}>
            <View style={[styles.sendBtn, (!annTitle.trim() || !annBody.trim() || annBusy) && styles.sendBtnOff]}>
              <Text style={styles.sendTxt}>{annBusy ? 'PUBLISHING…' : 'PUBLISH TO HOME + QUEUE PUSH ›'}</Text>
            </View>
          </Pressable>
          {annNote ? <Text style={styles.sentNote}>{annNote}</Text> : null}
        </Animated.View>

        {/* MetaBot news review — drafts never auto-publish */}
        <Animated.View entering={FadeInDown.delay(135).duration(320)} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTag}>FC MOBILE NEWS · PENDING REVIEW</Text>
            <Text style={[styles.cardTag, pendingNews.length > 0 && { color: colors.accent }]}>
              {pendingNews.length} DRAFT{pendingNews.length === 1 ? '' : 'S'}
            </Text>
          </View>
          <Text style={styles.emptyNote}>
            METABOT CREATES DRAFTS ONLY. NOTHING REACHES HOME UNTIL YOU APPROVE. EACH ROW KEEPS SOURCE URL + DATE.
          </Text>
          {pendingNews.length === 0 && <Text style={styles.dim}>No drafts waiting — run the bot, then refresh.</Text>}
          {pendingNews.map((n) => (
            <View key={n.id} style={styles.inboxRow}>
              <Text style={styles.inboxWho}>{n.kind} · {n.id}</Text>
              <Text style={styles.inboxBody}>{n.headline}</Text>
              <Text style={styles.invMeta}>{n.sourceName} · {n.discoveredAt} · conf {n.confidence}</Text>
              {!!n.sourceUrl && (
                <Pressable onPress={() => void Linking.openURL(n.sourceUrl).catch(() => {})} hitSlop={6}>
                  <Text style={styles.linkBtn}>OPEN SOURCE ›</Text>
                </Pressable>
              )}
              <View style={styles.rowBetween}>
                <Pressable
                  onPress={async () => {
                    await reviewNews(n.id, false);
                    void loadNews();
                  }}
                  hitSlop={6}
                >
                  <Text style={styles.ghostBtn}>REJECT</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    await reviewNews(n.id, true);
                    void loadNews();
                  }}
                  hitSlop={6}
                >
                  <Text style={styles.linkBtn}>APPROVE → HOME ›</Text>
                </Pressable>
              </View>
            </View>
          ))}
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
            <Text style={[styles.toolBtnTxt, { color: colors.loss }]}>CLOSE FOUNDER SESSION</Text>
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
  triageChip: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: 'rgba(15,26,19,0.6)',
  },
  triageChipTxt: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.2 },
  triageConf: { fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1, color: 'rgba(143,184,155,0.6)' },
  triageSum: { marginTop: 4, fontFamily: monoFont, fontSize: 6.4, lineHeight: 10, letterSpacing: 0.6, color: 'rgba(238,242,236,0.8)', fontStyle: 'italic' },
  draftHint: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '900', letterSpacing: 1, color: colors.accent, marginBottom: 5 },
  // daily digest
  digestCard: {
    marginTop: 10, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 14,
    backgroundColor: 'rgba(12,20,14,0.92)', padding: 13,
    shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  digestTag: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.8, color: colors.primary },
  digestTotal: { fontFamily: monoFont, fontSize: 16, fontWeight: '900', color: colors.primary },
  digestHead: { marginTop: 7, fontFamily: monoFont, fontSize: 7.4, lineHeight: 12, letterSpacing: 0.8, fontWeight: '700', color: colors.fg },
  digestActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  digestDot: { width: 7, height: 7, borderRadius: 4 },
  digestActionTxt: { fontFamily: monoFont, fontSize: 7, letterSpacing: 1, color: '#cdd9cf' },
  // canned-reply picker
  cannedWrap: { marginTop: 6, marginBottom: 6 },
  cannedLbl: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '900', letterSpacing: 1, color: 'rgba(143,184,155,0.7)', marginBottom: 4 },
  cannedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  cannedChip: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: 'rgba(15,26,19,0.7)', maxWidth: 150 },
  cannedChipCustom: { borderColor: 'rgba(242,192,120,0.5)', backgroundColor: 'rgba(38,30,12,0.4)' },
  cannedChipTxt: { fontFamily: monoFont, fontSize: 5.6, letterSpacing: 0.4, color: '#cdd9cf' },
  replyInput: {
    marginTop: 6, minHeight: 54, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 8, padding: 8,
    color: colors.fg, fontFamily: monoFont, fontSize: 8, backgroundColor: 'rgba(10,15,10,0.6)',
  },
  ghostBtn: { marginTop: 7, fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.2, color: 'rgba(143,184,155,0.7)' },
  linkBtn: { marginTop: 7, fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.3, color: colors.primary },

  invNew: { marginTop: 8, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 2, color: colors.accent },
  invMeta: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1, color: 'rgba(143,184,155,0.6)' },
  claimRef: { marginTop: 3, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1.8, color: colors.fg },
  consultBig: { marginTop: 4, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: colors.accent },
  consultRow: { fontFamily: monoFont, fontSize: 6.4, letterSpacing: 1, color: 'rgba(238,242,236,0.85)' },
  consultNote: { marginTop: 2, fontFamily: monoFont, fontSize: 6.2, lineHeight: 9.6, color: 'rgba(143,184,155,0.85)' },
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

  // card refused — brighter than a claim, because these expire as
  // people give up, whereas a claim is money already sent
  stuckCard: {
    marginTop: 12, borderWidth: 1.2, borderColor: 'rgb(240,180,60)',
    borderRadius: 14, backgroundColor: 'rgba(240,180,60,0.09)', padding: 13,
  },
  stuckRow: {
    marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(240,180,60,0.25)', paddingTop: 9,
  },
  stuckId: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.2, color: colors.fg },
  stuckWhen: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '800', letterSpacing: 1, color: 'rgb(240,180,60)' },
  stuckBody: { marginTop: 5, fontFamily: monoFont, fontSize: 6.4, lineHeight: 10, color: 'rgba(238,242,236,0.82)' },
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
