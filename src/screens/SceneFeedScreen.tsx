import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { ChevronLeftIcon } from '../components/Icons';
import {
  FiftyPlayer,
  ScenePost,
  THE_FIFTY,
  fiftySorted,
  playerById,
  sceneFeed,
  sceneTimeLabel,
  SCENE_COMPILED_AT,
} from '../data/theFifty';
import { socialEntries } from '../data/fiftySocials';
import { FC_MECHANICS, FcMechanic } from '../data/fcMechanics';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont, bodyFont, bodyFontStrong, bodyFontBold } from '../theme';

type Tab = 'FEED' | 'FIFTY' | 'MECHANICS';

export default function SceneFeedScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('FEED');
  const [openId, setOpenId] = useState<string | null>(null);
  const [mechId, setMechId] = useState<string | null>(null);
  const feed = useMemo(() => sceneFeed(), []);
  const book = useMemo(() => fiftySorted(), []);
  const selected = openId ? playerById(openId) : undefined;
  const mech = mechId ? FC_MECHANICS.find((m) => m.id === mechId) : undefined;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.root}>
      <GridBackground />
      <Pressable onPress={onClose} hitSlop={10} style={styles.back}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>ROLE MODEL UPDATES · THE SCENE</Text>
        <Text style={styles.title}>THE FIFTY</Text>
        <Text style={styles.lead}>
          {THE_FIFTY.length} current FC Pro names. Official public handles. Titles and results.
          We do not scrape Instagram or X — tap through to their page.
        </Text>
        <Text style={styles.compiled}>COMPILED {SCENE_COMPILED_AT} · PUBLIC RECORD ONLY</Text>

        <View style={styles.tabs}>
          {(['FEED', 'FIFTY', 'MECHANICS'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setTab(t);
                setOpenId(null);
                setMechId(null);
                sfx('tap');
              }}
            >
              <View style={[styles.tab, tab === t && styles.tabOn]}>
                <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>
                  {t === 'FEED' ? 'THE FEED' : t === 'FIFTY' ? `THE BOOK · ${THE_FIFTY.length}` : `MECHANICS · ${FC_MECHANICS.length}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {tab === 'FEED' &&
          feed.map((post, i) => (
            <FeedPost
              key={post.id}
              post={post}
              delay={i * 40}
              onOpenPlayer={(id) => {
                setTab('FIFTY');
                setOpenId(id);
                sfx('tap');
              }}
              onOpenMechanic={(id) => {
                setTab('MECHANICS');
                setMechId(id);
                sfx('tap');
              }}
            />
          ))}

        {tab === 'MECHANICS' && !mech &&
          FC_MECHANICS.map((m, i) => (
            <MechanicRow
              key={m.id}
              mechanic={m}
              delay={Math.min(i * 24, 280)}
              onPress={() => {
                setMechId(m.id);
                sfx('tap');
              }}
            />
          ))}

        {tab === 'MECHANICS' && mech && <MechanicSheet mechanic={mech} onBack={() => setMechId(null)} />}

        {tab === 'FIFTY' && !selected &&
          book.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              delay={Math.min(i * 18, 280)}
              onPress={() => {
                setOpenId(p.id);
                sfx('tap');
              }}
            />
          ))}

        {tab === 'FIFTY' && selected && (
          <PlayerSheet
            player={selected}
            posts={feed.filter((p) => p.playerId === selected.id)}
            onBack={() => setOpenId(null)}
          />
        )}

        <Text style={styles.disclaimer}>
          PUBLIC TOURNAMENT RECORD ONLY. WE DO NOT INVENT THEIR LIVES. NO PRIVATE POSTS. NO LIKENESSES.
        </Text>
      </ScrollView>
    </Animated.View>
  );
}

function FeedPost({
  post,
  delay,
  onOpenPlayer,
  onOpenMechanic,
}: {
  post: ScenePost;
  delay: number;
  onOpenPlayer: (id: string) => void;
  onOpenMechanic: (id: string) => void;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(320)} style={styles.post}>
      <View style={styles.postTop}>
        <Text style={styles.postKind}>{post.kind}</Text>
        <Text style={styles.postTime}>{sceneTimeLabel(post.date)}</Text>
      </View>
      <Text style={styles.postHandle}>{post.handle}</Text>
      <Text style={styles.postHead}>{post.headline}</Text>
      <Text style={styles.postBody}>{post.body}</Text>
      <View style={styles.postFoot}>
        {post.mechanicId ? (
          <Pressable onPress={() => onOpenMechanic(post.mechanicId!)} hitSlop={6}>
            <Text style={styles.postCta}>LEARN THE MECHANIC ›</Text>
          </Pressable>
        ) : post.playerId ? (
          <Pressable onPress={() => onOpenPlayer(post.playerId!)} hitSlop={6}>
            <Text style={styles.postCta}>OPEN IN THE BOOK ›</Text>
          </Pressable>
        ) : (
          <Text style={styles.postSrc}>{post.source}</Text>
        )}
        <Pressable onPress={() => void Linking.openURL(post.sourceUrl).catch(() => {})} hitSlop={6}>
          <Text style={styles.postSrc}>SOURCE</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function PlayerRow({
  player,
  delay,
  onPress,
}: {
  player: FiftyPlayer;
  delay: number;
  onPress: () => void;
}) {
  const initials = player.handle.slice(0, 2).toUpperCase();
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(260)}>
      <Pressable onPress={onPress} style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{initials}</Text>
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowHandle}>{player.handle}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {player.country}
            {player.org ? ` · ${player.org}` : ''}
          </Text>
        </View>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {socialEntries(player.id).filter((s) => s.key !== 'liquipedia').map((s) => s.label).join(' · ') || player.titles[0] || ''}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function MechanicRow({
  mechanic,
  delay,
  onPress,
}: {
  mechanic: FcMechanic;
  delay: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(260)}>
      <Pressable onPress={onPress} style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{mechanic.kind.slice(0, 2)}</Text>
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowHandle}>{mechanic.name}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>{mechanic.tag} · {mechanic.newIn}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MechanicSheet({ mechanic, onBack }: { mechanic: FcMechanic; onBack: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.sheet}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Text style={styles.sheetBack}>‹ BACK TO MECHANICS</Text>
      </Pressable>
      <Text style={styles.postKind}>{mechanic.tag}</Text>
      <Text style={styles.sheetHandle}>{mechanic.name}</Text>
      <Text style={styles.sheetName}>{mechanic.headline}</Text>
      <Text style={styles.sheetLast}>{mechanic.why}</Text>
      {mechanic.input && (
        <View style={styles.inputBox}>
          <Text style={styles.inputLbl}>PLAYSTATION</Text>
          <Text style={styles.inputTxt}>{mechanic.input.ps}</Text>
          <Text style={[styles.inputLbl, { marginTop: 10 }]}>XBOX</Text>
          <Text style={styles.inputTxt}>{mechanic.input.xbox}</Text>
        </View>
      )}
      <Text style={styles.learnHead}>HOW TO LEARN IT</Text>
      {mechanic.learn.map((line, i) => (
        <View key={line} style={styles.learnRow}>
          <Text style={styles.learnN}>0{i + 1}</Text>
          <Text style={styles.learnTxt}>{line}</Text>
        </View>
      ))}
      <Text style={styles.rule}>“{mechanic.rule}”</Text>
      <Pressable onPress={() => void Linking.openURL(mechanic.sourceUrl).catch(() => {})} hitSlop={6}>
        <Text style={styles.postCta}>{mechanic.source.toUpperCase()} ›</Text>
      </Pressable>
    </Animated.View>
  );
}

function PlayerSheet({
  player,
  posts,
  onBack,
}: {
  player: FiftyPlayer;
  posts: ScenePost[];
  onBack: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.sheet}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Text style={styles.sheetBack}>‹ BACK TO THE BOOK</Text>
      </Pressable>
      <Text style={styles.sheetHandle}>{player.handle}</Text>
      {player.name ? <Text style={styles.sheetName}>{player.name}</Text> : null}
      <Text style={styles.sheetMeta}>
        {player.country}
        {player.org ? ` · ${player.org}` : ''}
      </Text>
      <View style={styles.socialRow}>
        {socialEntries(player.id).map((s) => (
          <Pressable key={s.key} onPress={() => void Linking.openURL(s.url).catch(() => {})}>
            <View style={styles.socialPill}>
              <Text style={styles.socialPillTxt}>{s.label}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {player.titles.length > 0 && (
        <View style={styles.titleList}>
          {player.titles.map((t) => (
            <View key={t} style={styles.titlePill}>
              <Text style={styles.titlePillTxt}>{t}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.sheetLast}>{player.last}</Text>
      <Text style={styles.sheetNote}>{player.note}</Text>
      {posts.map((p) => (
        <View key={p.id} style={styles.sheetPost}>
          <Text style={styles.postKind}>{p.kind}</Text>
          <Text style={styles.sheetPostHead}>{p.headline}</Text>
          <Text style={styles.postBody}>{p.body}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 52 },
  back: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.4)',
    backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 16, paddingTop: 46, paddingBottom: 32 },
  eyebrow: { fontFamily: monoFont, fontSize: 9, letterSpacing: 2.2, color: colors.primary, marginBottom: 8 },
  title: { fontFamily: displayFont, fontSize: 42, lineHeight: 44, color: colors.fg, letterSpacing: 1 },
  lead: { marginTop: 10, fontFamily: bodyFont, fontSize: 14.5, lineHeight: 21, color: colors.muted, maxWidth: 420 },
  compiled: { marginTop: 8, fontFamily: monoFont, fontSize: 9, letterSpacing: 1.4, color: colors.mutedDim },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 18, marginBottom: 8 },
  tab: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceGlass,
  },
  tabOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.1)' },
  tabTxt: { fontFamily: bodyFontBold, fontSize: 11, letterSpacing: 1.3, color: colors.muted },
  tabTxtOn: { color: colors.primary },
  post: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    backgroundColor: colors.surfaceGlass,
    padding: 14,
  },
  postTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postKind: { fontFamily: monoFont, fontSize: 10, letterSpacing: 2, color: colors.primary },
  postTime: { fontFamily: monoFont, fontSize: 10, letterSpacing: 1.3, color: colors.mutedDim },
  postHandle: { marginTop: 8, fontFamily: bodyFontBold, fontSize: 12, letterSpacing: 1.2, color: colors.fg },
  postHead: { marginTop: 6, fontFamily: bodyFontStrong, fontSize: 17, lineHeight: 22, color: colors.fg },
  postBody: { marginTop: 8, fontFamily: bodyFont, fontSize: 13.5, lineHeight: 20, color: colors.muted },
  postFoot: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postCta: { fontFamily: bodyFontBold, fontSize: 11, letterSpacing: 1.2, color: colors.primary },
  postSrc: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.1, color: colors.mutedDim },
  row: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    backgroundColor: colors.surfaceGlass,
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(57,255,106,0.08)',
  },
  avatarTxt: { fontFamily: monoFont, fontSize: 11, fontWeight: '800', color: colors.primary },
  rowCopy: { flex: 1, minWidth: 0 },
  rowHandle: { fontFamily: bodyFontBold, fontSize: 14, color: colors.fg },
  rowMeta: { marginTop: 2, fontFamily: bodyFont, fontSize: 11.5, color: colors.muted },
  rowTitle: { maxWidth: 120, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 0.8, color: colors.accent, textAlign: 'right' },
  sheet: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 16,
  },
  sheetBack: { fontFamily: bodyFontBold, fontSize: 11, letterSpacing: 1.4, color: colors.primary, marginBottom: 12 },
  sheetHandle: { fontFamily: displayFont, fontSize: 34, lineHeight: 36, color: colors.fg },
  sheetName: { marginTop: 4, fontFamily: bodyFont, fontSize: 14, color: colors.muted },
  sheetMeta: { marginTop: 6, fontFamily: monoFont, fontSize: 11, letterSpacing: 1.2, color: colors.primary },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  socialPill: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(57,255,106,0.08)',
  },
  socialPillTxt: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.1, color: colors.primary },
  titleList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  titlePill: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(242,192,120,0.08)',
  },
  titlePillTxt: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1, color: colors.accent },
  sheetLast: { marginTop: 14, fontFamily: bodyFont, fontSize: 14, lineHeight: 21, color: colors.fg },
  sheetNote: { marginTop: 8, fontFamily: bodyFont, fontSize: 13.5, lineHeight: 20, color: colors.muted },
  sheetPost: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  sheetPostHead: { marginTop: 6, fontFamily: bodyFontStrong, fontSize: 15, color: colors.fg },
  inputBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(57,255,106,0.05)',
  },
  inputLbl: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.6, color: colors.primary, marginBottom: 4 },
  inputTxt: { fontFamily: bodyFont, fontSize: 13.5, lineHeight: 19, color: colors.fg },
  learnHead: { marginTop: 18, fontFamily: monoFont, fontSize: 10, letterSpacing: 1.8, color: colors.accent },
  learnRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'flex-start' },
  learnN: { fontFamily: monoFont, fontSize: 11, color: colors.primary, marginTop: 2 },
  learnTxt: { flex: 1, fontFamily: bodyFont, fontSize: 13.5, lineHeight: 19, color: colors.muted },
  rule: { marginTop: 16, fontFamily: bodyFont, fontStyle: 'italic', fontSize: 14, lineHeight: 20, color: colors.fg },
  disclaimer: {
    marginTop: 22,
    fontFamily: monoFont,
    fontSize: 8.5,
    lineHeight: 13,
    letterSpacing: 1,
    textAlign: 'center',
    color: '#42584a',
  },
});
