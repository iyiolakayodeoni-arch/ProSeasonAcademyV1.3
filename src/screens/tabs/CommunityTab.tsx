import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, ImageSourcePropType, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import { ChevronLeftIcon, SendIcon, XMarkIcon } from '../../components/Icons';
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

type UserWithAvatar = ChatUser & { avatar?: ImageSourcePropType };

const FALLBACK_USER: ChatUser = { id: 'unknown', handle: 'PLAYER', color: '#8fb89b', role: 'member', online: false, tagline: '' };

function Ring({ color, online, avatar, initials = '··', size = 30 }: { color: string; online?: boolean; avatar?: ImageSourcePropType; initials?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      {avatar ? (
        <Image source={avatar} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.6, borderColor: color }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.6, borderColor: color, backgroundColor: 'rgba(15,26,19,0.8)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: monoFont, fontSize: size * 0.3, fontWeight: '900', color }}>{initials}</Text>
        </View>
      )}
      {online && (
        <View style={{ position: 'absolute', right: -2, bottom: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.bg }} />
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
          return <Text key={i} style={[styles.mention, { color: u?.color ?? colors.primary }]}>{p}</Text>;
        }
        return <Text key={i}>{p}</Text>;
      })}
    </Text>
  );
}

export default function CommunityTab({ onClose }: { onClose: () => void }) {
  const st = useCommunityState();
  const cloud = useCloud();
  const { width: winW } = useWindowDimensions();
  const users: Record<string, UserWithAvatar> = useMemo(() => ({ ...buildUsers(), ...getRemoteUsers() }), [st.messages, st.live]);

  const [thread, setThread] = useState<string>('general');
  const [profileUser, setProfileUser] = useState<UserWithAvatar | null>(null);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [founderOpen, setFounderOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void startLiveRooms();
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

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* ── header ── */}
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={8} style={styles.headerBack}>
          <ChevronLeftIcon size={14} color={colors.fg} />
          <Text style={styles.headerBackTxt}>TODAY</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.titleChannel}>{isDm ? (dmOther ? dmOther.handle : 'PRIVATE CHAT') : 'GENERAL'}</Text>
          <View style={styles.subRow}>
            <View style={[styles.liveDot, !st.live && styles.liveDotOff]} />
            <Text style={styles.subText}>
              {isDm ? 'PRIVATE · JUST THE TWO OF YOU' : st.live ? `THE CLUBHOUSE · ${st.presence} ONLINE` : 'OFFLINE — CLOSED UNTIL THE CLOUD ANSWERS'}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setPlayersOpen(true)} hitSlop={8} style={styles.headerBtn}>
          <Text style={styles.headerBtnTxt}>DM</Text>
        </Pressable>
      </View>
      <View style={styles.headerRule} />

      {/* ── message list ── */}
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <Text style={styles.dateDivider}>{isDm ? `PRIVATE CHAT · ${dmOther?.handle ?? 'PLAYER'}` : 'GENERAL · THE WHOLE ACADEMY'}</Text>
        {rows.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTag}>{st.live ? 'REAL ROOM · ZERO MESSAGES' : 'ROOM CLOSED · OFFLINE'}</Text>
            <Text style={styles.emptyTxt}>
              {st.live ? 'No bots, no scripts. When a real player speaks, it lands here. The first word can be yours.' : 'The cloud is unreachable, so the room is shut — nothing here pretends to send.'}
            </Text>
          </View>
        )}
        {rows.map(({ m, author, key }) => (
          <View key={key} style={styles.msgRow}>
            <Pressable onPress={() => setProfileUser(author)} hitSlop={6}>
              <Ring color={author.color} online={author.online} avatar={author.avatar} initials={initialsOf(author.handle)} size={28} />
            </Pressable>
            <View style={styles.msgCol}>
              <View style={styles.msgHead}>
                <Pressable onPress={() => setProfileUser(author)} hitSlop={6}>
                  <Text style={[styles.handle, { color: author.color }]}>{author.handle}</Text>
                </Pressable>
                {author.role === 'coach' && <View style={styles.coachBadge}><Text style={styles.coachBadgeTxt}>FOUNDER</Text></View>}
                <Text style={styles.time}>{hhmm(m.at)}</Text>
              </View>
              <MessageBody text={m.text} users={users} />
            </View>
          </View>
        ))}
        <View style={{ height: 10 }} />
      </ScrollView>

      {/* ── composer ── */}
      {!st.live ? (
        <View style={styles.readOnlyBar}>
          <Text style={styles.readOnlyTxt}>ROOM SHUT WHILE OFFLINE — NOTHING HERE PRETENDS TO SEND</Text>
        </View>
      ) : (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            returnKeyType="send"
            placeholder={isDm ? `> message ${dmOther?.handle ?? 'them'}…` : '> message the clubhouse…'}
            placeholderTextColor="rgba(143,184,155,0.5)"
            style={styles.input}
          />
          {draft.trim().length > 0 && (
            <Pressable onPress={submit} hitSlop={8}>
              <View style={styles.sendBtn}><SendIcon size={13} color="#05130a" /></View>
            </Pressable>
          )}
        </View>
      )}

      {/* ── player profile / actions sheet ── */}
      {profileUser && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setProfileUser(null)} />
          </Animated.View>
          <Animated.View entering={SlideInDown.duration(260)} exiting={SlideOutDown.duration(200)} style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Ring color={profileUser.color} online={profileUser.online} avatar={profileUser.avatar} initials={initialsOf(profileUser.handle)} size={44} />
              <View style={styles.sheetIdCol}>
                <Text style={[styles.sheetHandle, { color: profileUser.color }]}>{profileUser.handle}</Text>
                <Text style={styles.sheetTag}>{profileUser.tagline}</Text>
              </View>
            </View>
            {profileUser.role !== 'you' && st.live && (
              <Pressable onPress={() => openDm(profileUser)}>
                <View style={styles.sheetAction}><Text style={styles.sheetActionTxt}>MESSAGE PRIVATELY ›</Text></View>
              </Pressable>
            )}
            {profileUser.role === 'coach' && (
              <Pressable onPress={() => { setProfileUser(null); setFounderOpen(true); }}>
                <View style={styles.sheetAction}><Text style={styles.sheetActionTxt}>CONTACT THE FOUNDER ›</Text></View>
              </Pressable>
            )}
            <Pressable onPress={() => setProfileUser(null)}>
              <View style={[styles.sheetAction, styles.sheetActionGhost]}><Text style={styles.sheetActionDimTxt}>CLOSE</Text></View>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* ── DM player picker ── */}
      {playersOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPlayersOpen(false)} />
          </Animated.View>
          <Animated.View entering={SlideInDown.duration(260)} exiting={SlideOutDown.duration(200)} style={styles.sheet}>
            <View style={styles.pickerHead}>
              <Text style={styles.sheetEyebrow}>START A PRIVATE CHAT</Text>
              <Pressable onPress={() => setPlayersOpen(false)} hitSlop={8}><XMarkIcon size={11} color={colors.muted} /></Pressable>
            </View>
            <Text style={styles.pickerNote}>TAP A PLAYER TO MESSAGE THEM PRIVATELY. NAMES APPEAR WHEN THEY REALLY SPEAK.</Text>
            {Object.values(users).filter((u) => u.role !== 'you').length === 0 && (
              <Text style={styles.emptyTxt}>NO ONE HAS SPOKEN YET — BE THE FIRST WORD IN THE ROOM.</Text>
            )}
            {Object.values(users).filter((u) => u.role !== 'you').map((u) => (
              <Pressable key={u.id} onPress={() => openDm(u)}>
                <View style={styles.pickerRow}>
                  <Ring color={u.color} online={u.online} avatar={u.avatar} initials={initialsOf(u.handle)} size={26} />
                  <View style={{ flex: 1, marginLeft: 9 }}>
                    <Text style={styles.chanName}>{u.handle}</Text>
                    <Text style={styles.chanDesc}>{u.role === 'coach' ? 'THE FOUNDER' : 'ACADEMY PLAYER'}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => { setPlayersOpen(false); setFounderOpen(true); }}>
              <View style={styles.founderCta}><Text style={styles.founderCtaTxt}>CAN'T FIND WHAT YOU NEED? MESSAGE THE FOUNDER ›</Text></View>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* ── founder DM ── */}
      {founderOpen && (
        <View style={StyleSheet.absoluteFill}>
          <ContactSheet onClose={() => setFounderOpen(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 9 },
  headerBack: { width: 68, flexDirection: 'row', alignItems: 'center', gap: 3 },
  headerBackTxt: { fontFamily: monoFont, fontSize: 6.3, fontWeight: '900', letterSpacing: 1, color: colors.fg },
  headerBtn: { width: 34, height: 30, borderRadius: 9, borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.45)', backgroundColor: 'rgba(57,255,106,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerBtnTxt: { fontFamily: bodyFontHeavy, fontSize: 8.5, letterSpacing: 1.4, color: colors.primary },
  titleWrap: { flex: 1 },
  titleChannel: { fontFamily: displayFont, fontSize: 20, letterSpacing: 1, color: colors.primary, textTransform: 'uppercase' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  liveDot: { width: 4.5, height: 4.5, borderRadius: 3, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  liveDotOff: { backgroundColor: colors.loss, shadowColor: colors.loss },
  subText: { fontFamily: bodyFontBold, fontSize: 9, letterSpacing: 1.2, color: 'rgba(143,184,155,0.75)' },
  headerRule: { height: 1, backgroundColor: 'rgba(57,255,106,0.28)' },

  list: { paddingHorizontal: 13, paddingTop: 12, paddingBottom: 6 },
  dateDivider: { alignSelf: 'center', marginBottom: 12, fontFamily: monoFont, fontSize: 9, letterSpacing: 2.2, color: 'rgba(143,184,155,0.55)' },

  emptyWrap: { marginTop: 46, marginHorizontal: 18, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(143,184,155,0.3)', borderRadius: 14, paddingVertical: 22, paddingHorizontal: 18 },
  emptyTag: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 2.2, color: colors.accent },
  emptyTxt: { marginTop: 8, fontFamily: bodyFont, fontSize: 12, lineHeight: 18, textAlign: 'center', color: 'rgba(238,242,236,0.72)' },

  msgRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  msgCol: { flex: 1, marginLeft: 9 },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2.5 },
  handle: { fontFamily: bodyFontBold, fontSize: 12.5, letterSpacing: 0.3 },
  coachBadge: { borderWidth: 1, borderColor: 'rgba(242,192,120,0.6)', borderRadius: 3.5, paddingHorizontal: 4, paddingVertical: 1.5 },
  coachBadgeTxt: { fontFamily: bodyFontHeavy, fontSize: 8, letterSpacing: 1.2, color: colors.accent },
  time: { fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1, color: 'rgba(143,184,155,0.5)' },
  body: { fontFamily: bodyFont, fontSize: 12.5, lineHeight: 18, color: '#d3ded6' },
  mention: { fontWeight: '900' },

  composer: { marginHorizontal: 11, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 22, backgroundColor: 'rgba(12,20,14,0.92)', paddingHorizontal: 12, paddingVertical: 7 },
  input: { flex: 1, fontFamily: bodyFontStrong, fontSize: 13, color: colors.fg, paddingVertical: 3 },
  sendBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  readOnlyBar: { marginHorizontal: 11, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderStyle: 'dashed', borderRadius: 22, paddingVertical: 13, alignItems: 'center' },
  readOnlyTxt: { fontFamily: bodyFontBold, fontSize: 9.5, letterSpacing: 1.6, color: 'rgba(143,184,155,0.6)' },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,8,5,0.72)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,14,10,0.99)', borderTopWidth: 1.2, borderTopColor: 'rgba(57,255,106,0.4)', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
  sheetIdCol: { flex: 1 },
  sheetHandle: { fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  sheetTag: { marginTop: 3, fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.4, color: 'rgba(143,184,155,0.7)' },
  sheetEyebrow: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.4, color: colors.primary },
  sheetAction: { borderWidth: 1, borderColor: 'rgba(57,255,106,0.35)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 9 },
  sheetActionGhost: { borderColor: 'rgba(143,184,155,0.25)' },
  sheetActionTxt: { fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 2.2, color: colors.primary },
  sheetActionDimTxt: { fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(238,242,236,0.7)' },

  pickerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerNote: { marginTop: 6, fontFamily: monoFont, fontSize: 6, lineHeight: 10, letterSpacing: 1.1, color: 'rgba(242,192,120,0.75)' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8.5, paddingHorizontal: 6, borderRadius: 10 },
  chanName: { fontSize: 12, fontWeight: '900', letterSpacing: 0.4, color: 'rgba(238,242,236,0.85)' },
  chanDesc: { marginTop: 2, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.1, color: 'rgba(143,184,155,0.6)' },
  founderCta: { marginTop: 10, borderWidth: 1, borderColor: 'rgba(242,192,120,0.5)', borderRadius: 11, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(242,192,120,0.05)' },
  founderCtaTxt: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
});
