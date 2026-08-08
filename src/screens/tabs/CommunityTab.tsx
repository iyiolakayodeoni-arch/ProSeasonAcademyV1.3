import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ImageSourcePropType,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideInLeft, SlideInRight, SlideOutDown, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import ArtBand from '../../components/ArtBand';

// the huddle — the boot room's face: the standard sits on the team, not on chrome
const HUDDLE = require('../../../assets/art/community-huddle.jpg');
import {
  ChevronLeftIcon,
  EyeIcon,
  FlameIcon,
  FriendsIcon,
  LaughIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  XMarkIcon,
} from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { getProgress } from '../../data/progress';
import {
  buildUsers,
  CHANNELS,
  ChatMessage,
  ChatUser,
  hhmm,
  ReactionIcon,
  sendText,
  setActiveThread,
  shareScanResult,
  startLiveRooms,
  getRemoteUsers,
  toggleMute,
  toggleReaction,
  useCommunityState,
} from '../../data/community';
import { useCloud } from '../../data/cloudSync';
import * as backend from '../../data/backend';
import { colors, monoFont, displayFont, bodyFont, bodyFontItalic, bodyFontStrong, bodyFontBold, bodyFontHeavy } from '../../theme';
import { isValidReflection } from '../../data/honestyGuard';

type UserWithAvatar = ChatUser & { avatar?: ImageSourcePropType };

/** Safety net for a message whose author isn't in the roster — should
 *  never happen (authors join the map with their message), but the UI
 *  must never crash on a shape surprise from the wire. */
const FALLBACK_USER: ChatUser = { id: 'unknown', handle: 'PLAYER', color: '#8fb89b', role: 'member', online: false, tagline: '' };

// ── tiny helpers ──────────────────────────────────────────────

function Ring({ color, online, avatar, initials = '··', size = 30 }: { color: string; online?: boolean; avatar?: ImageSourcePropType; initials?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      {avatar ? (
        <Image source={avatar} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.6, borderColor: color }} />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.6,
            borderColor: color,
            backgroundColor: 'rgba(15,26,19,0.8)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: size * 0.3, fontWeight: '900', color }}>{initials}</Text>
        </View>
      )}
      {online && (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.bg,
          }}
        />
      )}
    </View>
  );
}

// ── message body with @mention coloring ───────────────────────
const initialsOf = (h: string) => h.replace(/[^A-Z0-9]/gi, '').slice(0, 2) || '··';

function MessageBody({ text, users, muted }: { text: string; users: Record<string, UserWithAvatar>; muted?: boolean }) {
  if (muted) {
    return <Text style={[styles.body, styles.bodyMuted]}>· message muted ·</Text>;
  }
  const parts = text.split(/(@[A-Z_][A-Z0-9_]*)/g);
  return (
    <Text style={styles.body}>
      {parts.map((p, i) => {
        if (p.startsWith('@')) {
          const u = Object.values(users).find((x) => x.handle === p.slice(1));
          return (
            <Text key={i} style={[styles.mention, { color: u?.color ?? colors.primary }]}>
              {p}
            </Text>
          );
        }
        return <Text key={i}>{p}</Text>;
      })}
    </Text>
  );
}

// ── reaction pill ─────────────────────────────────────────────
const REACTION_ICON = { fire: FlameIcon, laugh: LaughIcon, eye: EyeIcon };
const REACTION_COLOR = { fire: '#f2c078', laugh: '#ffcf7a', eye: '#8fb89b' };

function ReactionPill({
  icon,
  count,
  toggled,
  onPress,
}: {
  icon: ReactionIcon;
  count?: number;
  toggled: boolean;
  onPress: () => void;
}) {
  const Icon = REACTION_ICON[icon];
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View style={[styles.pill, toggled && styles.pillOn]}>
        <Icon size={11} color={toggled ? '#05130a' : REACTION_COLOR[icon]} />
        {count != null && <Text style={[styles.pillCount, toggled && { color: '#05130a' }]}>{count}</Text>}
      </View>
    </Pressable>
  );
}

// ── typing dots ───────────────────────────────────────────────
function TypingDots() {
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 180} />
      ))}
    </View>
  );
}
function Dot({ delay }: { delay: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => setOn((v) => !v), 540);
    const t = setTimeout(() => setOn(true), delay);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [delay]);
  return <View style={[styles.dot, on && { opacity: 1 }]} />;
}

// ── main component ────────────────────────────────────────────

export default function CommunityTab({ coach, onClose }: { coach: Coach; onClose?: () => void }) {
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430) - 24; // standard card margins are 12 a side
  const st = useCommunityState();
  const cloud = useCloud();
  const users: Record<string, UserWithAvatar> = useMemo(() => {
    // You + whoever has actually spoken in the live rooms. That IS the
    // whole roster — nobody fictional padding the benches. (P1 honesty)
    return { ...buildUsers(), ...getRemoteUsers() };
  }, [st.messages, st.live]);

  // REAL OR CLOSED: if the academy cloud answers, the channels mirror
  // real Supabase rooms. If it doesn't, they stay closed and SAY so —
  // an honest empty hall beats a scripted crowd, every single time.
  useEffect(() => {
    void startLiveRooms(backend.getMe());
  }, [cloud.status]);

  const channel = CHANNELS.find((c) => c.id === st.activeThreadId);

  // ── composer state ──
  const [draft, setDraft] = useState('');
  const [plusOpen, setPlusOpen] = useState(false);

  // ── panels / sheets ──
  const [panel, setPanel] = useState<'channels' | 'members' | null>(null);
  const [profileUser, setProfileUser] = useState<UserWithAvatar | null>(null);

  // ── search ──
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState('');

  // ── scroll management ──
  const scrollRef = useRef<ScrollView>(null);
  const atBottom = useRef(true);
  const [pendingNew, setPendingNew] = useState(0);

  const rawMessages = st.messages[st.activeThreadId] ?? [];
  const messages = useMemo(() => {
    if (!searchMode || !query.trim()) return rawMessages;
    const q = query.trim().toLowerCase();
    return rawMessages.filter((m) => m.text.toLowerCase().includes(q));
  }, [rawMessages, searchMode, query]);
  const msgCount = messages.length;

  useEffect(() => {
    atBottom.current = true;
    setPendingNew(0);
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [st.activeThreadId]);

  useEffect(() => {
    if (searchMode) return;
    if (atBottom.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    } else {
      setPendingNew((c) => c + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgCount]);

  const typingIds = st.typing[st.activeThreadId] ?? [];

  // ── actions ──
  const submit = () => {
    if (!st.live) return; // closed rooms take no words — never a fake send
    const text = draft.trim();
    if (!text || !isValidReflection(text, { minLength: 2, minWords: 1 })) return;
    sendText(st.activeThreadId, text);
    setDraft('');
  };

  const shareMyScan = () => {
    const p = getProgress();
    const done = Object.entries(p.completed);
    setPlusOpen(false);
    if (done.length === 0) {
      shareScanResult(st.activeThreadId, 'no cleared scans yet — passing stage 1 today though. receipt drops here first.');
      return;
    }
    const [stage, c] = done[done.length - 1];
    shareScanResult(
      st.activeThreadId,
      `scan receipt: STAGE ${stage} CLEARED · +${c.xp} XP${c.badge ? ` · ${c.badge}` : ''}. logged it, scanned it, cleared it — the receipt speaks.`,
    );
  };

  const shareMyStage = () => {
    const p = getProgress();
    const clearedCount = Object.keys(p.completed).length;
    setPlusOpen(false);
    shareScanResult(
      st.activeThreadId,
      `current pin: stage ${p.currentStage} on the path${clearedCount > 0 ? ` (${clearedCount} cleared, ${p.xp} XP banked)` : ''}. watch me work.`,
    );
  };

  // ── rendered message rows (group consecutive author runs) ──
  let coachDividerShown = false;
  const rows = messages.map((m, i) => {
    const prev = messages[i - 1];
    const author = users[m.authorId] ?? FALLBACK_USER;
    const grouped = !!prev && prev.authorId === m.authorId && m.at - prev.at < 120000;
    const isCoachMsg = author.role === 'coach';
    const showCoachDivider = isCoachMsg && !coachDividerShown;
    if (isCoachMsg) coachDividerShown = true;
    return { m, author, grouped, showCoachDivider, key: m.id };
  });

  return (
    <View style={styles.flex}>
      <GridBackground />

      {/* ── header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => { if (onClose) onClose(); else setPanel(null); }} hitSlop={8} style={[styles.headerBtn, onClose && styles.headerBackBtn]}>
          <ChevronLeftIcon size={14} color={colors.fg} />
          {onClose && <Text style={styles.headerBackTxt}>TODAY</Text>}
        </Pressable>

        {searchMode ? (
          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="> search this thread…"
              placeholderTextColor="rgba(143,184,155,0.5)"
              style={styles.searchInput}
              autoFocus
            />
            <Text style={styles.searchCount}>{messages.length} HITS</Text>
            <Pressable onPress={() => { setSearchMode(false); setQuery(''); }} hitSlop={8}>
              <XMarkIcon size={10} color="rgba(143,184,155,0.8)" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setPanel('channels')} style={styles.titleWrap} hitSlop={4}>
            <Text style={styles.titleChannel}>#{channel?.name ?? 'general'}</Text>
            <View style={styles.subRow}>
              <View style={[styles.liveDot, !st.live && styles.liveDotOff]} />
              <Text style={styles.subText}>
                {st.live
                  ? `${channel?.desc} · ${st.presence[channel?.id ?? 'general'] ?? 0} ONLINE`
                  : 'OFFLINE — ROOMS OPEN WHEN THE CLOUD ANSWERS'}
              </Text>
            </View>
          </Pressable>
        )}

        <Pressable onPress={() => setPanel('members')} hitSlop={8} style={styles.headerBtn}>
          <FriendsIcon size={16} color={colors.fg} />
        </Pressable>
        <Pressable onPress={() => setSearchMode((s) => !s)} hitSlop={8} style={styles.headerBtn}>
          <SearchIcon size={15} color={searchMode ? colors.primary : colors.fg} />
        </Pressable>
      </View>
      <View style={styles.headerRule} />

      {/* ── season gate: sold-out season → you train solo until your seat opens ── */}
      {backend.getSeasonGate() ? (
        <View style={styles.gateBanner}>
          <Text style={styles.gateBannerTxt}>
            {backend.getSeasonGate()!.season} FULL · {backend.getSeasonGate()!.taken}/{backend.getSeasonGate()!.cap} SEATS — YOU'RE ON THE WAITLIST. ROOMS LIGHT UP WHEN YOUR SEAT OPENS.
          </Text>
        </View>
      ) : null}

      {/* ── ACADEMY COMMUNITY STANDARD — riding on the huddle. Not chrome:
          this strip is the room's constitution — how you talk, and who is
          (and is NOT) allowed to exist in here. ── */}
      <ArtBand
        source={HUDDLE}
        width={bandW}
        height={108}
        veil="light"
        warmAt={{ x: bandW * 0.24, y: 26, r: bandW * 0.55 }}
        style={{ marginHorizontal: 12, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)' }}
        overlayStyle={{ paddingHorizontal: 13, paddingBottom: 11 }}
      >
        <Text style={{ fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 1.2, color: colors.primary }}>
          YOUR REVIEW ROUTINE · PEN TO PAPER BEFORE YOU TYPE
        </Text>
        <Text style={{ marginTop: 3, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 15.5, color: 'rgba(238,242,236,0.82)' }}>
          Record & watch · pen your moments first · cool down 30m · then log your truth.
        </Text>
        <Text style={{ marginTop: 5, fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(242,192,120,0.9)' }}>
          NO BOTS · NO SCRIPTS — EVERY NAME IN HERE IS A REAL PLAYER
        </Text>
      </ArtBand>

      {/* ── message list ── */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const dist = contentSize.height - layoutMeasurement.height - contentOffset.y;
          const nowBottom = dist < 70;
          atBottom.current = nowBottom;
          if (nowBottom && pendingNew > 0) setPendingNew(0);
        }}
        scrollEventThrottle={60}
      >
        <Text style={styles.dateDivider}>TODAY · #{channel?.name?.toUpperCase() ?? 'GENERAL'}</Text>

        {/* the honest room: empty is a STATE, not a failure worth faking over */}
        {rows.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTag}>{st.live ? 'REAL ROOM · ZERO MESSAGES' : 'ROOM CLOSED · OFFLINE'}</Text>
            <Text style={styles.emptyTxt}>
              {st.live
                ? 'Quiet in here — no bots, no scripts, no fake crowd warming the bench. When a real player speaks, it lands here. The first word can be yours.'
                : 'The academy cloud is unreachable, so the rooms are shut — nothing here pretends to send, and nobody here is pretend.'}
            </Text>
          </View>
        )}

        {rows.map(({ m, author, grouped, showCoachDivider }) => (
          <React.Fragment key={m.id}>
            {showCoachDivider && (
              <View style={styles.coachDividerRow}>
                <View style={styles.divLineGlow} />
                <Text style={styles.coachDividerTxt}>COACHES IN THE ROOM</Text>
                <View style={styles.divLineGlow} />
              </View>
            )}

            <View style={[styles.msgRow, grouped && styles.msgRowGrouped]}>
              {!grouped ? (
                <Pressable onPress={() => setProfileUser(author)} hitSlop={6}>
                  <Ring color={author.color} online={author.online && !grouped} avatar={author.avatar} initials={initialsOf(author.handle)} size={28} />
                </Pressable>
              ) : (
                <View style={styles.groupSpacer} />
              )}
              <View style={styles.msgCol}>
                {!grouped && (
                  <View style={styles.msgHead}>
                    <Pressable onPress={() => setProfileUser(author)} hitSlop={6}>
                      <Text style={[styles.handle, { color: author.color }]}>{author.handle}</Text>
                    </Pressable>
                    {author.role === 'coach' && (
                      <View style={styles.coachBadge}>
                        <Text style={styles.coachBadgeTxt}>COACH</Text>
                      </View>
                    )}
                    <Text style={styles.time}>{hhmm(m.at)}</Text>
                  </View>
                )}

                {m.kind === 'voice' ? (
                  <VoiceNote secs={m.voiceSecs ?? 0} accent={author.color} />
                ) : (
                  <MessageBody text={m.text} users={users} muted={st.muted.includes(author.id)} />
                )}

                {m.reactions && !st.muted.includes(author.id) && (
                  <View style={styles.pillsRow}>
                    {m.reactions.map((r) => {
                      const toggled = (st.toggled[m.id] ?? []).includes(r.icon);
                      const count = r.count == null ? undefined : r.count + (toggled ? 1 : 0);
                      return (
                        <ReactionPill
                          key={r.icon}
                          icon={r.icon}
                          count={count}
                          toggled={toggled}
                          onPress={() => toggleReaction(st.activeThreadId, m.id, r.icon)}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </React.Fragment>
        ))}
        <View style={{ height: 10 }} />
      </ScrollView>

      {/* typing indicator */}
      {typingIds.length > 0 && (
        <View style={styles.typingRow}>
          <TypingDots />
          <Text style={styles.typingTxt}>
            {typingIds.map((id) => users[id]?.handle ?? '…').join(' + ')} IS TYPING…
          </Text>
        </View>
      )}

      {/* new-messages pill (when scrolled up) */}
      {pendingNew > 0 && !searchMode && (
        <Pressable
          onPress={() => {
            scrollRef.current?.scrollToEnd({ animated: true });
            setPendingNew(0);
          }}
          style={styles.newPill}
        >
          <Text style={styles.newPillTxt}>{pendingNew} NEW ↓</Text>
        </Pressable>
      )}

      {/* ── composer — open only while the room is REAL. Offline there is
          nobody to talk to, so the door is honestly shut. ── */}
      {!st.live ? (
        <View style={styles.readOnlyBar}>
          <Text style={styles.readOnlyTxt}>ROOMS SHUT WHILE OFFLINE — NOTHING HERE PRETENDS TO SEND</Text>
        </View>
      ) : (
        <View>
          {plusOpen && (
            <View style={styles.plusRow}>
              <Pressable onPress={shareMyScan} hitSlop={6}>
                <Text style={styles.plusAction}>SHARE MATCH SCAN ›</Text>
              </Pressable>
              <Pressable onPress={shareMyStage} hitSlop={6}>
                <Text style={styles.plusAction}>SHARE MY STAGE ›</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.composer}>
            <Pressable onPress={() => setPlusOpen((o) => !o)} hitSlop={8} style={styles.composeBtn}>
              <PlusIcon size={16} color={plusOpen ? colors.primary : 'rgba(143,184,155,0.85)'} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              returnKeyType="send"
              placeholder={`> message #${channel?.name}…`}
              placeholderTextColor="rgba(143,184,155,0.5)"
              style={styles.input}
            />
            {draft.trim().length > 0 && (
              <Pressable onPress={submit} hitSlop={8}>
                <View style={styles.sendBtn}>
                  <SendIcon size={13} color="#05130a" />
                </View>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ── channel list panel (left slide-in) ── */}
      {panel === 'channels' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPanel(null)} />
          </Animated.View>
          <Animated.View entering={SlideInLeft} exiting={SlideOutLeft} style={styles.panelLeft}>
            <Text style={styles.panelTitle}>CHANNELS</Text>
            <Text style={styles.panelSection}>CLUBHOUSE</Text>
            {CHANNELS.map((c) => {
              const unread = st.unreads[c.id] ?? 0;
              const active = c.id === st.activeThreadId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setActiveThread(c.id);
                    setPanel(null);
                  }}
                >
                  <View style={[styles.chanRow, active && styles.chanRowActive]}>
                    <View style={styles.chanMain}>
                      <Text style={[styles.chanName, unread > 0 && { color: colors.fg }]}>#{c.name}</Text>
                      <Text style={styles.chanDesc}>{c.desc}</Text>
                    </View>
                    <View style={styles.chanMeta}>
                      <Text style={styles.chanCount}>{st.presence[c.id] ?? 0} IN</Text>
                      {unread > 0 && (
                        <View style={styles.unreadDot}>
                          <Text style={styles.unreadTxt}>{unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {/* DMs deliberately absent in v1: a private message that can
                never reach the other person is just an echo in a costume.
                Squad cards are benched too — a squad tool with nobody in
                the seats is a toy. Both return when they're real. */}
            <Text style={styles.panelNote}>
              DIRECT MESSAGES RETURN IN V2 — WITH REAL DELIVERY. SQUADS RETURN WHEN REAL PLAYERS FILL THE SEATS. UNTIL THEN, @ SOMEONE IN THE OPEN ROOM.
            </Text>
          </Animated.View>
        </View>
      )}

      {/* ── members panel (right slide-in) ── */}
      {panel === 'members' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPanel(null)} />
          </Animated.View>
          <Animated.View entering={SlideInRight} exiting={SlideOutRight} style={styles.panelRight}>
            <Text style={styles.panelTitle}>IN THE ROOM</Text>
            {/* a name appears here ONLY because that person really posted.
                Presence numbers live in the header; this is the roll of
                real speakers — no fictional bench-warmers. */}
            {Object.values(users).filter((u) => u.role === 'coach').length > 0 && (
              <>
                <Text style={styles.panelSection}>FOUNDER</Text>
                {Object.values(users)
                  .filter((u) => u.role === 'coach')
                  .map((u) => (
                    <MemberRow key={u.id} u={u} onPress={() => setProfileUser(u)} />
                  ))}
              </>
            )}
            <Text style={styles.panelSection}>SPOKEN IN THE ROOMS — {Object.values(users).filter((u) => u.role !== 'coach').length}</Text>
            {Object.values(users)
              .filter((u) => u.role !== 'coach')
              .map((u) => (
                <MemberRow key={u.id} u={u} onPress={() => setProfileUser(u)} />
              ))}
            <Text style={styles.panelNote}>NAMES APPEAR WHEN REAL PLAYERS SPEAK. THE LIVE COUNT SITS IN THE HEADER.</Text>
          </Animated.View>
        </View>
      )}

      {/* ── profile / actions sheet ── */}
      {profileUser && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setProfileUser(null)} />
          </Animated.View>
          <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Ring color={profileUser.color} online={profileUser.online} avatar={profileUser.avatar} initials={initialsOf(profileUser.handle)} size={44} />
              <View style={styles.sheetIdCol}>
                <Text style={[styles.sheetHandle, { color: profileUser.color }]}>{profileUser.handle}</Text>
                <Text style={styles.sheetTag}>{profileUser.tagline}</Text>
              </View>
            </View>
            {/* Reach a real player the only way that actually reaches
                them in v1: a public @-mention in the live room. */}
            {profileUser.role !== 'you' && st.live && (
              <Pressable
                onPress={() => {
                  setDraft(`@${profileUser.handle} `);
                  setProfileUser(null);
                  setPanel(null);
                }}
              >
                <View style={styles.sheetAction}>
                  <Text style={styles.sheetActionTxt}>CALL OUT IN THE ROOM ›</Text>
                </View>
              </Pressable>
            )}
            <Pressable onPress={() => console.log('[community] view profile TODO(real-profiles)')}>
              <View style={styles.sheetAction}>
                <Text style={styles.sheetActionDimTxt}>VIEW PROFILE ›</Text>
              </View>
            </Pressable>
            {profileUser.role !== 'you' && (
              <Pressable
                onPress={() => {
                  toggleMute(profileUser.id);
                  setProfileUser(null);
                }}
              >
                <View style={styles.sheetAction}>
                  <Text style={[styles.sheetActionDimTxt, st.muted.includes(profileUser.id) && { color: colors.accent }]}>
                    {st.muted.includes(profileUser.id) ? 'UNMUTE ›' : 'MUTE ›'}
                  </Text>
                </View>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ── member row ────────────────────────────────────────────────
function MemberRow({ u, onPress, dim }: { u: UserWithAvatar; onPress: () => void; dim?: boolean }) {
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.pickerRow, dim && { opacity: 0.55 }]}>
        <Ring color={u.color} online={u.online} avatar={u.avatar} initials={initialsOf(u.handle)} size={26} />
        <View style={[styles.chanMain, { marginLeft: 9 }]}>
          <Text style={styles.chanName}>{u.handle}</Text>
          <Text style={styles.chanDesc} numberOfLines={1}>
            {u.tagline}
          </Text>
        </View>
        {u.role === 'coach' && (
          <View style={styles.coachBadge}>
            <Text style={styles.coachBadgeTxt}>COACH</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── chat voice note (recorded via the mic toggle) ─────────────
function VoiceNote({ secs, accent }: { secs: number; accent: string }) {
  const [playing, setPlaying] = useState(false);
  const [left, setLeft] = useState(secs);
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setPlaying(false);
          return secs;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [playing, secs]);
  const bars = useMemo(() => Array.from({ length: 16 }, (_, i) => 4 + ((i * 11 + 7) % 13)), []);
  return (
    <View style={styles.voiceWrap}>
      <Pressable onPress={() => setPlaying((p) => !p)} hitSlop={6}>
        <View style={[styles.voicePlay, { backgroundColor: playing ? accent : 'rgba(57,255,106,0.15)', borderColor: accent }]}>
          {playing ? <View style={styles.voiceStop} /> : <View style={styles.voiceTri} />}
        </View>
      </Pressable>
      <View style={styles.voiceBars}>
        {bars.map((h, i) => (
          <View key={i} style={[styles.voiceBar, { height: h, backgroundColor: accent, opacity: playing ? 0.4 + ((i * 7 + Date.now() / 300) % 60) / 100 : 0.35 }]} />
        ))}
      </View>
      <Text style={styles.voiceDur}>0:{String(left).padStart(2, '0')}</Text>
      {/* TODO(real-audio): attach the recorded clip */}
    </View>
  );
}

const styles = StyleSheet.create({
  consultBar: {
    marginHorizontal: 12, marginTop: 8, borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.5)', backgroundColor: 'rgba(10,26,15,0.85)',
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11,
  },
  consultTag: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.6, color: colors.primary },
  consultTxt: { marginTop: 3, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17, letterSpacing: 0.3, color: 'rgba(238,242,236,0.9)' },

  founderWeek: {
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.5)',
    backgroundColor: 'rgba(40,32,14,0.7)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  founderWeekTag: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.6, color: '#f2c078' },
  founderWeekTxt: { marginTop: 3, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17, letterSpacing: 0.3, color: 'rgba(238,242,236,0.9)' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 9 },
  headerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.1,
    borderColor: 'rgba(143,184,155,0.4)',
    backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackBtn: { width: 68, flexDirection: 'row', gap: 3 },
  headerBackTxt: { fontFamily: monoFont, fontSize: 6.3, fontWeight: '900', letterSpacing: 1, color: colors.fg },
  titleWrap: { flex: 1 },
  titleCol: { flex: 1 },
  titleChannel: {
    fontFamily: displayFont,
    fontSize: 22,
    letterSpacing: 1,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.5)',
    textShadowRadius: 9,
    textTransform: 'uppercase',
  },
  titleName: { fontFamily: displayFont, fontSize: 19, letterSpacing: 1, textTransform: 'uppercase' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  liveDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  subText: { fontFamily: bodyFontBold, fontSize: 9, letterSpacing: 1.4, color: 'rgba(143,184,155,0.75)' },
  liveDotOff: { backgroundColor: colors.loss, shadowColor: colors.loss },
  headerRule: { height: 1, backgroundColor: 'rgba(57,255,106,0.28)', shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },

  emptyWrap: {
    marginTop: 46,
    marginHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(143,184,155,0.3)',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  emptyTag: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 2.2, color: colors.accent },
  emptyTxt: { marginTop: 8, fontFamily: bodyFont, fontSize: 12, lineHeight: 18, textAlign: 'center', color: 'rgba(238,242,236,0.72)' },
  gateBanner: { marginHorizontal: 12, marginTop: 8, borderWidth: 1, borderColor: 'rgba(242,192,120,0.5)', borderRadius: 10, backgroundColor: 'rgba(242,192,120,0.07)', paddingHorizontal: 12, paddingVertical: 9 },
  gateBannerTxt: { fontFamily: bodyFontBold, fontSize: 10, letterSpacing: 0.8, color: colors.warm, textAlign: 'center', lineHeight: 15 },

  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  searchInput: { flex: 1, fontFamily: bodyFontStrong, fontSize: 13, color: colors.fg, paddingVertical: 4 },
  searchCount: { fontFamily: monoFont, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, color: colors.primary },

  list: { paddingHorizontal: 13, paddingTop: 12, paddingBottom: 6 },
  dateDivider: {
    alignSelf: 'center',
    marginBottom: 12,
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 2.2,
    color: 'rgba(143,184,155,0.55)',
  },

  msgRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 11 },
  msgRowGrouped: { marginTop: -6 },
  groupSpacer: { width: 28 },
  msgCol: { flex: 1, marginLeft: 9 },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2.5 },
  handle: { fontFamily: bodyFontBold, fontSize: 12.5, letterSpacing: 0.3 },
  coachBadge: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.6)',
    borderRadius: 3.5,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  coachBadgeTxt: { fontFamily: bodyFontHeavy, fontSize: 8, letterSpacing: 1.2, color: colors.accent },
  time: { fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1, color: 'rgba(143,184,155,0.5)' },
  body: { fontFamily: bodyFont, fontSize: 12.5, lineHeight: 18, color: '#d3ded6' },
  bodyMuted: { color: 'rgba(143,184,155,0.45)', fontStyle: 'italic' },
  mention: { fontWeight: '900' },

  pillsRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    backgroundColor: 'rgba(15,26,19,0.6)',
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillCount: { fontFamily: monoFont, fontSize: 9.5, fontWeight: '900', color: colors.primary },

  coachDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 6, marginBottom: 12 },
  divLineGlow: { flex: 1, height: 1, backgroundColor: 'rgba(57,255,106,0.28)' },
  coachDividerTxt: { fontFamily: bodyFontHeavy, fontSize: 8.5, letterSpacing: 2.2, color: colors.primary },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 3 },
  dotsRow: { flexDirection: 'row', gap: 3.5, alignItems: 'center' },
  dot: { width: 3.6, height: 3.6, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.25 },
  typingTxt: { fontFamily: bodyFontItalic, fontSize: 10, letterSpacing: 1, color: 'rgba(143,184,155,0.75)' },

  newPill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 88,
    borderWidth: 1.1,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: 'rgba(8,13,9,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  newPillTxt: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.6, color: colors.primary },

  composer: {
    marginHorizontal: 11,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(57,255,106,0.5)',
    borderRadius: 22,
    backgroundColor: 'rgba(12,20,14,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  composeBtn: { padding: 3 },
  input: { flex: 1, fontFamily: bodyFontStrong, fontSize: 13, color: colors.fg, paddingVertical: 3 },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  readOnlyBar: {
    marginHorizontal: 11,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.3)',
    borderStyle: 'dashed',
    borderRadius: 22,
    paddingVertical: 13,
    alignItems: 'center',
  },
  readOnlyTxt: { fontFamily: bodyFontBold, fontSize: 9.5, letterSpacing: 1.6, color: 'rgba(143,184,155,0.6)' },

  plusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 7 },
  plusAction: {
    fontFamily: bodyFontHeavy,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
    overflow: 'hidden',
  },

  recWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.loss },
  recTxt: { fontFamily: bodyFontBold, fontSize: 10.5, letterSpacing: 1.2, color: colors.loss },

  voiceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.3)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: 'rgba(15,26,19,0.7)',
    alignSelf: 'flex-start',
  },
  voicePlay: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center' },
  voiceTri: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderLeftWidth: 7,
    borderTopWidth: 4.6,
    borderBottomWidth: 4.6,
    borderLeftColor: colors.primary,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  voiceStop: { width: 7, height: 7, borderRadius: 1.5, backgroundColor: '#05130a' },
  voiceBars: { flexDirection: 'row', alignItems: 'center', gap: 2.2, height: 18 },
  voiceBar: { width: 2.2, borderRadius: 1.5 },
  voiceDur: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '800', color: 'rgba(143,184,155,0.85)' },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,8,5,0.72)' },

  panelLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 292,
    backgroundColor: 'rgba(8,14,10,0.98)',
    borderRightWidth: 1.2,
    borderRightColor: 'rgba(57,255,106,0.35)',
    paddingHorizontal: 15,
    paddingTop: 56,
  },
  panelRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 292,
    backgroundColor: 'rgba(8,14,10,0.98)',
    borderLeftWidth: 1.2,
    borderLeftColor: 'rgba(57,255,106,0.35)',
    paddingHorizontal: 15,
    paddingTop: 56,
  },
  panelTitle: { fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 2.6, color: colors.fg, marginBottom: 14 },
  panelSection: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(143,184,155,0.6)', marginTop: 14, marginBottom: 8 },
  panelNote: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '700', letterSpacing: 1.3, lineHeight: 12, color: 'rgba(242,192,120,0.75)', marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.18)' },

  chanRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10 },
  chanRowActive: { backgroundColor: 'rgba(57,255,106,0.08)' },
  chanMain: { flex: 1 },
  chanName: { fontSize: 11.5, fontWeight: '900', letterSpacing: 0.4, color: 'rgba(238,242,236,0.85)' },
  chanDesc: { marginTop: 2, fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.1, color: 'rgba(143,184,155,0.6)' },
  chanMeta: { alignItems: 'flex-end', gap: 4 },
  chanCount: { fontFamily: monoFont, fontSize: 6, fontWeight: '700', letterSpacing: 1, color: 'rgba(143,184,155,0.55)' },
  unreadDot: { minWidth: 15, height: 15, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', color: '#05130a' },

  dmHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  dmNew: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.primary, marginTop: 14 },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,14,10,0.99)',
    borderTopWidth: 1.2,
    borderTopColor: 'rgba(57,255,106,0.4)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 26,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
  sheetIdCol: { flex: 1 },
  sheetHandle: { fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  sheetTag: { marginTop: 3, fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.4, color: 'rgba(143,184,155,0.7)' },
  sheetAction: { borderWidth: 1, borderColor: 'rgba(57,255,106,0.35)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 9 },
  sheetActionTxt: { fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 2.2, color: colors.primary },
  sheetActionDimTxt: { fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(238,242,236,0.7)' },

  pickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8.5, paddingHorizontal: 6, borderRadius: 10 },
  pickerInput: { borderWidth: 1, borderColor: 'rgba(57,255,106,0.35)', borderRadius: 12, paddingHorizontal: 11, marginBottom: 8, marginTop: 2 },
});
