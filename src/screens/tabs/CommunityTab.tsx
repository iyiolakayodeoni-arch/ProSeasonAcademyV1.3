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
} from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import { ChevronLeftIcon, SendIcon, XMarkIcon, WavesGlyphIcon, PersonIcon } from '../../components/Icons';
import {
  buildUsers,
  ChatUser,
  getRemoteUsers,
  hhmm,
  openThread,
  sendText,
  startLiveRooms,
  useCommunityState,
} from '../../data/community';
import { useCloud } from '../../data/cloudSync';
import * as backend from '../../data/backend';
import { colors, monoFont, displayFont, bodyFont, bodyFontBold, bodyFontHeavy, bodyFontStrong } from '../../theme';
import { isValidReflection } from '../../data/honestyGuard';
import ContactSheet from '../ContactSheet';
import { myPeerPair, peerReview, PeerPair, PeerReview, submitPeerReview } from '../../data/communityProgram';
import { useResponsive } from '../../hooks/useResponsive';

type UserWithAvatar = ChatUser & { avatar?: ImageSourcePropType };

const FALLBACK_USER: ChatUser = {
  id: 'unknown',
  handle: 'PLAYER',
  color: '#8fb89b',
  role: 'member',
  online: false,
  tagline: '',
};

function Ring({
  color,
  online,
  avatar,
  initials = '··',
  size = 32,
}: {
  color: string;
  online?: boolean;
  avatar?: ImageSourcePropType;
  initials?: string;
  size?: number;
}) {
  return (
    <View style={{ width: size, height: size }}>
      {avatar ? (
        <Image
          source={avatar}
          style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.8, borderColor: color }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.8,
            borderColor: color,
            backgroundColor: 'rgba(15,26,19,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: size * 0.32, fontWeight: '900', color }}>
            {initials}
          </Text>
        </View>
      )}
      {online && (
        <View
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: 10,
            height: 10,
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

const initialsOf = (h: string) => h.replace(/[^A-Z0-9]/gi, '').slice(0, 2) || '··';

function MessageBody({ text, users }: { text: string; users: Record<string, UserWithAvatar> }) {
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

export default function CommunityTab({ onClose }: { onClose?: () => void }) {
  const st = useCommunityState();
  const cloud = useCloud();
  const { isMultiColumn, isWide } = useResponsive();
  const users: Record<string, UserWithAvatar> = useMemo(
    () => ({ ...buildUsers(), ...getRemoteUsers() }),
    [st.messages, st.live],
  );

  const [thread, setThread] = useState<string>('general');
  const [profileUser, setProfileUser] = useState<UserWithAvatar | null>(null);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [founderOpen, setFounderOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [peerPair, setPeerPair] = useState<PeerPair | null>(null);
  const [peerOpen, setPeerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void startLiveRooms();
    void myPeerPair().then(setPeerPair);
  }, [cloud.status]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [thread]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [st.messages[thread]?.length]);

  const rawMessages = st.messages[thread] ?? [];
  const rows = rawMessages.map((m) => {
    const author = users[m.authorId] ?? FALLBACK_USER;
    return { m, author, key: m.id };
  });

  const isDm = thread !== 'general';
  const dmOther = isDm ? users[thread.replace(/^dm:/, '')] ?? null : null;

  const submit = () => {
    if (!st.live) return;
    const text = draft.trim();
    if (!text || !isValidReflection(text, { minLength: 2, minWords: 1 })) return;
    sendText(thread, text);
    setDraft('');
  };

  const openDm = (other: UserWithAvatar) => {
    const myId = backend.getMe()?.academyId ?? '';
    if (!myId || !other.id || other.id === myId) return;
    void openThread(`dm:${other.id}`, other.id);
    setThread(`dm:${other.id}`);
    setProfileUser(null);
    setPlayersOpen(false);
  };

  const otherUsers = Object.values(users).filter((u) => u.role !== 'you');

  return (
    <View style={styles.root}>
      <GridBackground />

      <View style={[styles.mainLayout, isMultiColumn && styles.mainLayoutWide]}>
        {/* Desktop Sidebar (Channels & DMs) */}
        {isWide && (
          <View style={styles.chatSidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>CLUBHOUSE</Text>
              <View style={styles.presencePill}>
                <View style={[styles.liveDot, !st.live && styles.liveDotOff]} />
                <Text style={styles.presenceTxt}>{st.live ? `${st.presence} ONLINE` : 'OFFLINE'}</Text>
              </View>
            </View>

            {/* Channels */}
            <Text style={styles.sidebarSectionLabel}>ROOMS</Text>
            <Pressable
              onPress={() => setThread('general')}
              style={[styles.chanItem, thread === 'general' && styles.chanItemActive]}
            >
              <Text style={[styles.chanHash, thread === 'general' && styles.chanHashActive]}>#</Text>
              <Text style={[styles.chanTitle, thread === 'general' && styles.chanTitleActive]}>
                general
              </Text>
            </Pressable>

            {peerPair && (
              <Pressable
                onPress={() => setPeerOpen(true)}
                style={[styles.chanItem, styles.peerChanItem]}
              >
                <Text style={styles.peerIcon}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.peerChanTitle}>MATCH ROOM</Text>
                  <Text style={styles.peerChanSub}>With {peerPair.partner_handle}</Text>
                </View>
              </Pressable>
            )}

            {/* Direct Messages */}
            <Text style={styles.sidebarSectionLabel}>PLAYERS & DMS</Text>
            <ScrollView style={styles.dmsList} showsVerticalScrollIndicator={false}>
              {otherUsers.map((u) => {
                const isSelected = thread === `dm:${u.id}`;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => openDm(u)}
                    style={[styles.dmItem, isSelected && styles.dmItemActive]}
                  >
                    <Ring
                      color={u.color}
                      online={u.online}
                      avatar={u.avatar}
                      initials={initialsOf(u.handle)}
                      size={24}
                    />
                    <Text
                      style={[styles.dmHandle, isSelected && styles.dmHandleActive]}
                      numberOfLines={1}
                    >
                      {u.handle}
                    </Text>
                    {u.role === 'coach' && <Text style={styles.founderMiniBadge}>FOUNDER</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => setFounderOpen(true)}
              style={({ pressed }) => [styles.sidebarFounderBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.sidebarFounderBtnTxt}>★ MESSAGE THE FOUNDER</Text>
            </Pressable>
          </View>
        )}

        {/* Main Chat Area */}
        <View style={styles.chatPane}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            {onClose && !isWide && (
              <Pressable onPress={onClose} hitSlop={8} style={styles.headerBack}>
                <ChevronLeftIcon size={14} color={colors.fg} />
                <Text style={styles.headerBackTxt}>BACK</Text>
              </Pressable>
            )}

            <View style={styles.chatHeaderTitleGroup}>
              <Text style={styles.chatTitle}>
                {isDm ? `@ ${dmOther?.handle || 'DIRECT MESSAGE'}` : '# GENERAL CLUBHOUSE'}
              </Text>
              <Text style={styles.chatSub}>
                {isDm
                  ? 'Private conversation between players'
                  : st.live
                    ? `${st.presence} verified players in the academy`
                    : 'Offline — connecting to Supabase realtime…'}
              </Text>
            </View>

            {!isWide && (
              <View style={styles.mobileChatActions}>
                {peerPair && (
                  <Pressable onPress={() => setPeerOpen(true)} style={styles.mobileActionBtn}>
                    <Text style={styles.mobileActionBtnTxt}>PAIR</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setPlayersOpen(true)} style={styles.mobileActionBtn}>
                  <Text style={styles.mobileActionBtnTxt}>DMS</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Message Feed */}
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesList}
          >
            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeBannerTitle}>
                {isDm
                  ? `THIS IS THE START OF YOUR DIRECT CHAT WITH ${dmOther?.handle || 'PLAYER'}`
                  : 'WELCOME TO THE PROSEASON ACADEMY CLUBHOUSE'}
              </Text>
              <Text style={styles.welcomeBannerSub}>
                {isDm
                  ? 'Keep discussions focused on match tape, tactical reads, and honest reviews.'
                  : 'A dedicated room for serious console players. Share receipts, discuss matches, and hold the standard.'}
              </Text>
            </View>

            {rows.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTag}>
                  {st.live ? 'THE FLOOR IS OPEN' : 'OFFLINE MODE'}
                </Text>
                <Text style={styles.emptyTxt}>
                  {st.live
                    ? 'No messages in this thread yet. Be the first to start the discussion.'
                    : 'Waiting for cloud sync to reconnect.'}
                </Text>
              </View>
            )}

            {rows.map(({ m, author, key }) => (
              <View key={key} style={styles.msgRow}>
                <Pressable onPress={() => setProfileUser(author)} hitSlop={6}>
                  <Ring
                    color={author.color}
                    online={author.online}
                    avatar={author.avatar}
                    initials={initialsOf(author.handle)}
                    size={36}
                  />
                </Pressable>
                <View style={styles.msgCol}>
                  <View style={styles.msgHead}>
                    <Pressable onPress={() => setProfileUser(author)} hitSlop={6}>
                      <Text style={[styles.handle, { color: author.color }]}>{author.handle}</Text>
                    </Pressable>
                    {author.role === 'coach' && (
                      <View style={styles.coachBadge}>
                        <Text style={styles.coachBadgeTxt}>FOUNDER</Text>
                      </View>
                    )}
                    <Text style={styles.time}>{hhmm(m.at)}</Text>
                  </View>
                  <MessageBody text={m.text} users={users} />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Composer */}
          <View style={styles.composerBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              returnKeyType="send"
              placeholder={isDm ? `Message @${dmOther?.handle || 'player'}…` : 'Message the clubhouse… (Press Enter to send)'}
              placeholderTextColor="rgba(143,184,155,0.45)"
              style={styles.composerInput}
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim().length}
              style={({ pressed }) => [
                styles.sendBtn,
                !draft.trim().length && styles.sendBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              <SendIcon size={14} color="#040805" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Profile Modal */}
      {profileUser && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setProfileUser(null)} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(260)}
            exiting={SlideOutDown.duration(200)}
            style={styles.profileSheet}
          >
            <View style={styles.profileSheetHead}>
              <Ring
                color={profileUser.color}
                online={profileUser.online}
                avatar={profileUser.avatar}
                initials={initialsOf(profileUser.handle)}
                size={54}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileSheetHandle, { color: profileUser.color }]}>
                  {profileUser.handle}
                </Text>
                <Text style={styles.profileSheetTag}>
                  {profileUser.role === 'coach' ? 'ACADEMY FOUNDER' : 'VERIFIED MEMBER'}
                </Text>
              </View>
            </View>

            {profileUser.role !== 'you' && st.live && (
              <Pressable
                onPress={() => openDm(profileUser)}
                style={styles.profileSheetAction}
              >
                <Text style={styles.profileSheetActionTxt}>OPEN PRIVATE CHAT ›</Text>
              </Pressable>
            )}

            {profileUser.role === 'coach' && (
              <Pressable
                onPress={() => {
                  setProfileUser(null);
                  setFounderOpen(true);
                }}
                style={[styles.profileSheetAction, styles.profileSheetActionFounder]}
              >
                <Text style={styles.profileSheetActionFounderTxt}>MESSAGE THE FOUNDER DIRECTLY ›</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => setProfileUser(null)}
              style={[styles.profileSheetAction, styles.profileSheetActionGhost]}
            >
              <Text style={styles.profileSheetActionGhostTxt}>CLOSE</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Mobile Player Picker */}
      {playersOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPlayersOpen(false)} />
          </Animated.View>
          <Animated.View entering={SlideInDown.duration(260)} style={styles.profileSheet}>
            <View style={styles.pickerHead}>
              <Text style={styles.pickerTitle}>DIRECT MESSAGES</Text>
              <Pressable onPress={() => setPlayersOpen(false)} hitSlop={8}>
                <XMarkIcon size={14} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300, marginTop: 12 }}>
              {otherUsers.map((u) => (
                <Pressable
                  key={u.id}
                  onPress={() => openDm(u)}
                  style={styles.mobilePickerRow}
                >
                  <Ring
                    color={u.color}
                    online={u.online}
                    avatar={u.avatar}
                    initials={initialsOf(u.handle)}
                    size={28}
                  />
                  <Text style={styles.mobilePickerHandle}>{u.handle}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {peerOpen && peerPair && (
        <PeerReviewSheet
          pair={peerPair}
          onClose={() => setPeerOpen(false)}
          onSubmitted={() => void myPeerPair().then(setPeerPair)}
        />
      )}

      {founderOpen && (
        <View style={StyleSheet.absoluteFill}>
          <ContactSheet onClose={() => setFounderOpen(false)} />
        </View>
      )}
    </View>
  );
}

function PeerReviewSheet({
  pair,
  onClose,
  onSubmitted,
}: {
  pair: PeerPair;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [turning, setTurning] = useState('');
  const [own, setOwn] = useState('');
  const [strength, setStrength] = useState('');
  const [next, setNext] = useState('');
  const [reviews, setReviews] = useState<PeerReview[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void peerReview(pair.pair_id).then(setReviews);
  }, [pair.pair_id]);

  const submitReview = async () => {
    setSaving(true);
    const ok = await submitPeerReview(pair.pair_id, { turning, own, strength, next });
    setSaving(false);
    if (ok) {
      setReviews(await peerReview(pair.pair_id));
      onSubmitted();
    }
  };

  const revealed = reviews.some((review) => review.revealed);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(260)} style={[styles.profileSheet, { maxHeight: '88%' }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.pickerHead}>
            <Text style={styles.pickerTitle}>MATCH ROOM · {pair.partner_handle}</Text>
            <Pressable onPress={onClose}>
              <XMarkIcon size={14} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={styles.pairInstruction}>
            PLAY ONE MATCH. WRITE YOUR FIRST READ ALONE. BOTH REVIEWS REVEAL ONLY AFTER YOU BOTH SUBMIT.
          </Text>
          {!pair.submitted && (
            <>
              <TextInput
                value={turning}
                onChangeText={setTurning}
                multiline
                placeholder="THE TURNING POINT IN THE MATCH"
                placeholderTextColor={colors.muted}
                style={styles.reviewInput}
              />
              <TextInput
                value={own}
                onChangeText={setOwn}
                multiline
                placeholder="MY BIGGEST MISTAKE"
                placeholderTextColor={colors.muted}
                style={styles.reviewInput}
              />
              <TextInput
                value={strength}
                onChangeText={setStrength}
                multiline
                placeholder={`WHAT ${pair.partner_handle} DID WELL`}
                placeholderTextColor={colors.muted}
                style={styles.reviewInput}
              />
              <TextInput
                value={next}
                onChangeText={setNext}
                multiline
                placeholder="MY NEXT ACTION"
                placeholderTextColor={colors.muted}
                style={styles.reviewInput}
              />
              <Pressable
                disabled={saving || [turning, own, strength, next].some((v) => v.trim().length < 8)}
                onPress={submitReview}
                style={styles.reviewSubmit}
              >
                <Text style={styles.reviewSubmitText}>
                  {saving ? 'LOCKING…' : 'LOCK MY HONEST REVIEW'}
                </Text>
              </Pressable>
            </>
          )}
          {pair.submitted && !revealed && (
            <Text style={styles.waitingReview}>
              YOUR ANSWERS ARE LOCKED. {pair.partner_handle} CANNOT SEE THEM UNTIL THEY SUBMIT THEIR OWN REVIEW.
            </Text>
          )}
          {revealed &&
            reviews.map((review) => (
              <View key={review.profile_id} style={styles.revealedReview}>
                <Text style={styles.revealedName}>{review.handle}'S REVIEW</Text>
                <Text style={styles.revealedCopy}>TURNING POINT · {review.turning_point}</Text>
                <Text style={styles.revealedCopy}>OWN MISTAKE · {review.own_mistake}</Text>
                <Text style={styles.revealedCopy}>OPPONENT READ · {review.opponent_strength}</Text>
                <Text style={styles.revealedCopy}>NEXT ACTION · {review.next_action}</Text>
              </View>
            ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  mainLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  mainLayoutWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.2)',
    overflow: 'hidden',
    backgroundColor: 'rgba(12, 20, 14, 0.85)',
    marginVertical: 14,
    minHeight: 680,
  },

  chatSidebar: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: 'rgba(57, 255, 106, 0.16)',
    backgroundColor: 'rgba(8, 14, 10, 0.95)',
    padding: 16,
    flexDirection: 'column',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sidebarTitle: {
    fontFamily: displayFont,
    fontSize: 18,
    letterSpacing: 1.2,
    color: colors.fg,
  },
  presencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(57,255,106,0.1)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveDotOff: {
    backgroundColor: colors.loss,
  },
  presenceTxt: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    color: colors.primary,
  },

  sidebarSectionLabel: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: colors.muted,
    marginBottom: 8,
    marginTop: 12,
  },

  chanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  chanItemActive: {
    backgroundColor: 'rgba(57, 255, 106, 0.12)',
  },
  chanHash: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: colors.muted,
  },
  chanHashActive: {
    color: colors.primary,
  },
  chanTitle: {
    fontFamily: bodyFontBold,
    fontSize: 13,
    color: 'rgba(238,242,236,0.75)',
  },
  chanTitleActive: {
    color: colors.fg,
  },

  peerChanItem: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    backgroundColor: 'rgba(242,192,120,0.06)',
  },
  peerIcon: { fontSize: 13 },
  peerChanTitle: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: colors.accent,
  },
  peerChanSub: {
    fontFamily: bodyFont,
    fontSize: 10,
    color: colors.muted,
  },

  dmsList: {
    flex: 1,
  },
  dmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  dmItemActive: {
    backgroundColor: 'rgba(57, 255, 106, 0.12)',
  },
  dmHandle: {
    flex: 1,
    fontFamily: bodyFontBold,
    fontSize: 12,
    color: colors.muted,
  },
  dmHandleActive: {
    color: colors.fg,
  },
  founderMiniBadge: {
    fontFamily: monoFont,
    fontSize: 6,
    fontWeight: '900',
    color: colors.accent,
    backgroundColor: 'rgba(242,192,120,0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },

  sidebarFounderBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)',
    backgroundColor: 'rgba(242,192,120,0.08)',
    alignItems: 'center',
  },
  sidebarFounderBtnTxt: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.accent,
  },

  chatPane: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
  },
  chatHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57, 255, 106, 0.14)',
    backgroundColor: 'rgba(10, 16, 12, 0.8)',
  },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 10,
  },
  headerBackTxt: {
    fontFamily: monoFont,
    fontSize: 7.5,
    color: colors.fg,
  },
  chatHeaderTitleGroup: {
    flex: 1,
  },
  chatTitle: {
    fontFamily: displayFont,
    fontSize: 16,
    letterSpacing: 0.8,
    color: colors.fg,
  },
  chatSub: {
    fontFamily: monoFont,
    fontSize: 6.5,
    letterSpacing: 1,
    color: colors.muted,
  },
  mobileChatActions: {
    flexDirection: 'row',
    gap: 6,
  },
  mobileActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(57,255,106,0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  mobileActionBtnTxt: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    color: colors.primary,
  },

  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  welcomeBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.16)',
    backgroundColor: 'rgba(15, 26, 19, 0.6)',
    marginBottom: 20,
  },
  welcomeBannerTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  welcomeBannerSub: {
    marginTop: 6,
    fontFamily: bodyFont,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },

  emptyWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyTag: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.accent,
  },
  emptyTxt: {
    marginTop: 6,
    fontFamily: bodyFont,
    fontSize: 12,
    color: colors.muted,
  },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  msgCol: {
    flex: 1,
    marginLeft: 12,
  },
  msgHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  handle: {
    fontFamily: bodyFontBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  coachBadge: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.6)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: 'rgba(242,192,120,0.1)',
  },
  coachBadgeTxt: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    color: colors.accent,
  },
  time: {
    fontFamily: monoFont,
    fontSize: 8,
    color: 'rgba(143,184,155,0.5)',
  },
  body: {
    fontFamily: bodyFont,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#e4eee6',
  },
  mention: {
    fontWeight: '900',
    backgroundColor: 'rgba(57, 255, 106, 0.1)',
    borderRadius: 3,
    paddingHorizontal: 3,
  },

  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(57, 255, 106, 0.16)',
    backgroundColor: 'rgba(10, 16, 12, 0.95)',
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.28)',
    backgroundColor: 'rgba(5, 10, 6, 0.8)',
    paddingHorizontal: 14,
    color: colors.fg,
    fontFamily: bodyFont,
    fontSize: 13.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 7, 4, 0.8)',
  },
  profileSheet: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 0,
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(10, 16, 12, 0.98)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.3)',
    padding: 22,
  },
  profileSheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  profileSheetHandle: {
    fontFamily: displayFont,
    fontSize: 22,
    letterSpacing: 0.8,
  },
  profileSheetTag: {
    marginTop: 4,
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: colors.muted,
  },
  profileSheetAction: {
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(57, 255, 106, 0.12)',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileSheetActionTxt: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: colors.primary,
  },
  profileSheetActionFounder: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 192, 120, 0.12)',
  },
  profileSheetActionFounderTxt: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: colors.accent,
  },
  profileSheetActionGhost: {
    borderColor: 'rgba(143, 184, 155, 0.25)',
    backgroundColor: 'transparent',
  },
  profileSheetActionGhostTxt: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.muted,
  },

  pickerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.primary,
  },
  mobilePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,106,0.1)',
  },
  mobilePickerHandle: {
    fontFamily: bodyFontBold,
    fontSize: 13,
    color: colors.fg,
  },

  pairInstruction: {
    fontFamily: monoFont,
    fontSize: 7.5,
    color: colors.accent,
    marginBottom: 12,
  },
  reviewInput: {
    minHeight: 60,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    fontFamily: bodyFont,
    fontSize: 13,
    color: colors.fg,
    textAlignVertical: 'top',
    backgroundColor: '#0a0f0a',
  },
  reviewSubmit: {
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    marginTop: 6,
  },
  reviewSubmitText: {
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    letterSpacing: 1.4,
    color: '#040805',
  },
  waitingReview: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(242,192,120,0.1)',
    fontFamily: bodyFont,
    fontSize: 13,
    color: '#e6d2aa',
    textAlign: 'center',
  },
  revealedReview: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(57,255,106,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
  },
  revealedName: {
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    color: colors.primary,
  },
  revealedCopy: {
    marginTop: 6,
    fontFamily: bodyFont,
    fontSize: 12.5,
    color: '#d6e2d9',
  },
});
