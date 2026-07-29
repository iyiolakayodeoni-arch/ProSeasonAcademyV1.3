import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Linking } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Marquee from '../../components/Marquee';
import MiniPitch from '../../components/MiniPitch';
import { BellIcon, HeartIcon, BookmarkIcon, PersonIcon } from '../../components/Icons';
import GridBackground from '../../components/GridBackground';
import { Coach } from '../../data/coaches';
import { buildFeed, buildTicker, HERO_FALLBACK, FeedCardData } from '../../data/homeFeed';
import { brandMutter, caughtUpLine, greetingLine } from '../../data/humor';
import { useSettings } from '../../data/settings';
import * as backend from '../../data/backend';
import { sfx } from '../../audio/sound';
import StoreSheet from '../StoreSheet';
import { colors, monoFont } from '../../theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const CHIPS = ['ALL', 'TRICKS & EXPLOITS', 'WINS', 'LOSSES', 'COACH UPDATES'] as const;
type Chip = (typeof CHIPS)[number];

const CHIP_KINDS: Record<Chip, FeedCardData['kind'][] | null> = {
  ALL: null,
  'TRICKS & EXPLOITS': ['EXPLOIT', 'SKILL_MOVE', 'TRICK_OF_THE_WEEK', 'PATCH_NOTE', 'META_SHIFT'],
  WINS: ['COMMUNITY_WIN'],
  LOSSES: ['COMMUNITY_LOSS'],
  'COACH UPDATES': ['COACH_UPDATE'],
};

const ACCENT = {
  green: { solid: colors.primary, soft: 'rgba(57,255,106,0.4)', dim: 'rgba(57,255,106,0.14)' },
  gold: { solid: colors.warm, soft: 'rgba(255,207,122,0.4)', dim: 'rgba(242,192,120,0.12)' },
  red: { solid: '#e0605c', soft: 'rgba(224,96,92,0.4)', dim: 'rgba(224,96,92,0.10)' },
};

function nowStamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function LiveDot() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.25, { duration: 750 }), -1, true);
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.liveDot, s]} />;
}

export default function HomeTab({ coach }: { coach: Coach }) {
  const [chip, setChip] = useState<Chip>('ALL');
  const [visible, setVisible] = useState(6);
  // ── ACCESS — tricks ride on the tier, not on per-item credits ──
  const [access, setAccess] = useState<backend.MyAccess | null>(null);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const settings = useSettings();

  const refreshAccess = () => {
    void backend.myAccess().then((a) => a && setAccess(a));
    void backend.myUnlocks().then((u) => u && setUnlocks(u));
  };
  useEffect(refreshAccess, []);

  const [tillOpen, setTillOpen] = useState(false);

  // ── the founder mutters when you poke the wordmark enough ──
  const [brandTaps, setBrandTaps] = useState(0);
  const [mutter, setMutter] = useState<string | null>(null);
  const brandTap = () => {
    const n = brandTaps + 1;
    setBrandTaps(n);
    const line = brandMutter(n);
    if (line) {
      setMutter(line);
      sfx('pop');
    }
  };

  /** the teachable kinds are the gated ones; news + community stay free */
  const isTrick = (k: string) => k === 'EXPLOIT' || k === 'SKILL_MOVE' || k === 'TRICK_OF_THE_WEEK';
  /** ACADEMY (level 1) and above see the tricks; a bundled unlock also counts */
  const trickOpen = (id: string) => (access?.level ?? 0) >= 1 || unlocks.includes(`trick:${id}`);

  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const feed = useMemo(() => buildFeed(coach), [coach]);
  const ticker = useMemo(() => buildTicker(coach), [coach]);
  const filtered = useMemo(() => {
    const kinds = CHIP_KINDS[chip];
    return kinds ? feed.filter((c) => kinds.includes(c.kind)) : feed;
  }, [feed, chip]);
  const shown = filtered.slice(0, visible);
  const exhausted = visible >= filtered.length;

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>
        {/* header row */}
        <View style={styles.headerRow}>
          <Pressable onPress={brandTap} hitSlop={8}>
            <Text style={styles.brand}>PROSEASONACADEMY</Text>
          </Pressable>
          <View style={styles.headerIcons}>
            <Pressable hitSlop={10} onPress={() => console.log('[home] notifications tapped (next build)')}>
              <BellIcon size={17} color="rgba(143,184,155,0.75)" />
            </Pressable>
            <Pressable hitSlop={10} onPress={() => console.log('[home] profile tapped (next build)')}>
              <View style={styles.avatarBtn}>
                <PersonIcon size={13} color={colors.muted} />
              </View>
            </Pressable>
          </View>
        </View>
        {mutter && (
          <Text style={styles.mutter} numberOfLines={1} onPress={() => setMutter(null)}>
            {mutter}
          </Text>
        )}

        {/* greeting + live badge */}
        <View style={styles.greetRow}>
          <Text style={styles.greet}>{greetingLine(settings.displayName, nowStamp())}</Text>
          <View style={styles.livePill}>
            <LiveDot />
            <Text style={styles.liveTxt}>LIVE FEED</Text>
          </View>
        </View>

        {/* ticker */}
        <View style={styles.ticker}>
          <Marquee>
            {ticker.map((t, i) => (
              <Text key={i} style={styles.tickerTxt}>
                <Text style={styles.tickerStar}>* </Text>
                {t}
                <Text style={styles.tickerSep}>    </Text>
              </Text>
            ))}
          </Marquee>
        </View>

        {/* TRICK OF THE WEEK hero */}
        <Animated.View entering={FadeInUp.duration(350)} style={styles.hero}>
          <View style={styles.heroTagRow}>
            <Text style={styles.heroTag}>TRICK OF THE WEEK</Text>
          </View>
          <View style={styles.heroThumb}>
            <MiniPitch width={318} height={150} variant="pitchRun" showPlay />
            <View style={styles.heroDuration}>
              <Text style={styles.heroDurationTxt}>{HERO_FALLBACK.duration}</Text>
            </View>
          </View>
          <Text style={styles.heroHeadline}>{HERO_FALLBACK.headline}</Text>
          <Text style={styles.heroBody}>{HERO_FALLBACK.body}</Text>
          <View style={styles.heroFoot}>
            <Text style={styles.heroCta}>
              {HERO_FALLBACK.cta} <Text style={styles.heroMeta}>· {HERO_FALLBACK.meta}</Text>
            </Text>
            <BookmarkIcon size={14} color="rgba(143,184,155,0.7)" />
          </View>
        </Animated.View>

        {/* filter chips */}
        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
            <View style={styles.chipsRow}>
              {CHIPS.map((c) => {
                const on = chip === c;
                return (
                  <Pressable key={c} onPress={() => { setChip(c); setVisible(6); sfx('tap'); }}>
                    <View style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{c}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <LinearGradient
            colors={['rgba(10,15,10,0)', 'rgba(10,15,10,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.chipFade}
            pointerEvents="none"
          />
        </View>

        {/* the feed — tricks are part of the packs; news stays free */}
        {shown.map((card, i) => (
          <FeedCard
            key={card.id + chip}
            card={card}
            coach={coach}
            delay={i * 40}
            liked={!!liked[card.id]}
            onLike={() => { setLiked((s) => ({ ...s, [card.id]: true })); sfx('like'); }}
            locked={isTrick(card.kind) && !trickOpen(card.id)}
            onUnlock={() => { setTillOpen(true); sfx('whoosh'); }}
          />
        ))}

        {/* load more */}
        {!exhausted ? (
          <Pressable style={styles.loadMore} onPress={() => { setVisible((v) => v + 4); sfx('tap'); }}>
            <Text style={styles.loadMoreTxt}>{'>'} LOAD MORE UPDATES ▮</Text>
          </Pressable>
        ) : (
          <Text style={styles.caughtUp}>{caughtUpLine()}</Text>
        )}

        <Text style={styles.footVersion}>PROSEASONACADEMY · VERSION {APP_VERSION}</Text>
        <Text style={styles.footTag}>BUILT BY PLAYERS · NO FULLBACKS WERE HARMED</Text>
      </ScrollView>

      {tillOpen && (
        <View style={StyleSheet.absoluteFill}>
          <StoreSheet onClose={() => { setTillOpen(false); refreshAccess(); }} />
        </View>
      )}
    </View>
  );
}

function FeedCard({
  card,
  coach,
  delay,
  liked,
  onLike,
  locked = false,
  onUnlock,
}: {
  card: FeedCardData;
  coach: Coach;
  delay: number;
  liked: boolean;
  onLike: () => void;
  /** a gated trick this member's tier does not open yet */
  locked?: boolean;
  onUnlock?: () => void;
}) {
  const a = ACCENT[card.accent];
  const open = () => {
    if (card.ctaUrl) {
      void Linking.openURL(card.ctaUrl).catch(() => {});
    } else {
      console.log(`[home] "${card.cta ?? card.tag}" on ${card.id} (hub screens land in a next build)`);
    }
  };
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(320)} style={[styles.card, { borderColor: a.soft }]}>
      {/* top row: tag + time (and LIVE badge) */}
      <View style={styles.cardTop}>
        {card.thumbnail && <View style={styles.thumbSpace} />}
        <View style={styles.cardTopText}>
          <Text style={[styles.cardTag, { color: a.solid }]}>{card.tag}</Text>
          <Text style={styles.cardTime}>
            {card.live ? <Text style={styles.liveNow}>● LIVE NOW</Text> : card.time}
          </Text>
        </View>
      </View>

      <View style={styles.cardMain}>
        {card.thumbnail && (
          <View style={styles.thumb}>
            <MiniPitch width={84} height={62} variant={card.thumbnail} showPlay />
          </View>
        )}
        {card.avatar === 'coach' && <Image source={coach.portrait} style={styles.cardAvatar} />}
        <View style={styles.cardBody}>
          {card.authorHandle && <Text style={styles.cardHandle}>{card.authorHandle}</Text>}
          <Text style={styles.cardHeadline}>{card.headline}</Text>
          {card.body && !locked && (
            <Text style={styles.cardText} numberOfLines={3}>
              {card.body}
            </Text>
          )}

          {/* locked trick — the headline teases, the method is in the pack */}
          {locked && (
            <View style={styles.lockBox}>
              <Text style={styles.lockTag}>ACADEMY & PRO</Text>
              <Text style={styles.lockBody}>
                The how-to comes with an ACADEMY or PRO pass — every trick, for the whole
                period, not one at a time. Same tier wherever you are; only the currency changes.
              </Text>
              <Pressable onPress={onUnlock} hitSlop={6}>
                <Text style={styles.lockCta}>SEE THE PASSES ›</Text>
              </Pressable>
            </View>
          )}

          {(card.cta || card.reactions) && !locked && (
            <View style={styles.cardFoot}>
              {card.cta && (
                <Pressable onPress={open} hitSlop={6}>
                  <Text style={[styles.cardCta, { color: a.solid }]}>{card.cta}</Text>
                </Pressable>
              )}
              {card.reactions ? (
                <Pressable onPress={onLike} hitSlop={8} style={styles.reaction}>
                  <HeartIcon size={13} color={liked ? colors.primary : 'rgba(143,184,155,0.7)'} filled={liked} />
                  <Text style={[styles.reactionCount, liked && { color: colors.primary }]}>
                    {card.reactions.count + (liked ? 1 : 0)}
                  </Text>
                </Pressable>
              ) : card.metaRight ? (
                <Text style={[styles.cardMetaRight, card.accent === 'red' && styles.spotsLeft]}>{card.metaRight}</Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 12 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  brand: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 3,
    color: colors.fg,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
    textShadowColor: 'rgba(57,255,106,0.5)',
    textShadowRadius: 6,
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  greetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  greet: { flexShrink: 1, marginRight: 8, fontFamily: monoFont, fontSize: 7.5, letterSpacing: 1.2, color: 'rgba(143,184,155,0.75)' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.45)',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(57,255,106,0.06)',
  },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  liveTxt: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', letterSpacing: 1.4, color: colors.primary },

  ticker: {
    marginTop: 9,
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.8)',
    borderRadius: 8,
    backgroundColor: 'rgba(15,26,19,0.5)',
    paddingVertical: 6,
  },
  tickerTxt: { fontFamily: monoFont, fontSize: 7, letterSpacing: 1.4, color: 'rgba(238,242,236,0.8)' },
  tickerStar: { color: colors.primary },
  tickerSep: { color: 'rgba(57,255,106,0.35)' },

  hero: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.5)',
    borderRadius: 16,
    backgroundColor: 'rgba(15,26,19,0.8)',
    padding: 13,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  heroTagRow: { marginBottom: 9 },
  heroTag: {
    alignSelf: 'flex-start',
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.55)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(57,255,106,0.08)',
  },
  heroThumb: { alignItems: 'center' },
  heroDuration: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(10,15,10,0.85)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
  },
  heroDurationTxt: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '700', letterSpacing: 1, color: colors.fg },
  heroHeadline: { marginTop: 11, fontSize: 16.5, fontWeight: '800', letterSpacing: 0.2, color: colors.fg },
  heroBody: { marginTop: 7, fontSize: 10.5, lineHeight: 15.5, color: '#b9cabe' },
  heroFoot: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCta: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '800', letterSpacing: 1.6, color: colors.primary },
  heroMeta: { color: 'rgba(143,184,155,0.7)', fontWeight: '400' },

  chipsWrap: { marginTop: 12, marginBottom: 2 },
  chipsRow: { flexDirection: 'row', gap: 7, paddingRight: 26 },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.9)',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'rgba(15,26,19,0.55)',
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(57,255,106,0.1)',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  chipTxt: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '700', letterSpacing: 1.4, color: colors.muted },
  chipTxtOn: { color: colors.primary },
  chipFade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 34 },

  card: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.9)',
    borderRadius: 14,
    backgroundColor: 'rgba(15,26,19,0.72)',
    padding: 11,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  thumbSpace: { width: 84, marginRight: 10 },
  cardTopText: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTag: { fontFamily: monoFont, fontSize: 7, fontWeight: '800', letterSpacing: 1.8 },
  cardTime: { fontFamily: monoFont, fontSize: 6.5, letterSpacing: 1.4, color: 'rgba(143,184,155,0.55)' },
  liveNow: { color: colors.primary, fontWeight: '800' },
  cardMain: { flexDirection: 'row', marginTop: 6 },
  thumb: { marginRight: 10, marginTop: -22 },
  cardAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10, marginTop: 4, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)' },
  cardBody: { flex: 1 },
  cardHandle: { fontFamily: monoFont, fontSize: 6.3, fontWeight: '700', letterSpacing: 1.6, color: 'rgba(143,184,155,0.65)', marginBottom: 4 },
  cardHeadline: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.1, color: colors.fg },
  cardText: { marginTop: 5, fontSize: 9.5, lineHeight: 13.5, color: '#a9bbae' },
  lockBox: {
    marginTop: 7,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)',
    backgroundColor: 'rgba(38,30,12,0.55)',
    borderRadius: 9,
    padding: 9,
  },
  lockTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.5, color: '#f2c078' },
  lockBody: { marginTop: 4, fontFamily: monoFont, fontSize: 6.4, lineHeight: 10, letterSpacing: 0.6, color: 'rgba(238,242,236,0.82)' },
  lockCta: { marginTop: 7, fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.3, color: '#f2c078' },
  unlockErr: { marginTop: 8, marginHorizontal: 14, fontFamily: monoFont, fontSize: 6.4, lineHeight: 10, letterSpacing: 0.8, color: colors.loss },

  cardFoot: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCta: { fontFamily: monoFont, fontSize: 7.2, fontWeight: '800', letterSpacing: 1.5 },
  cardMetaRight: { fontFamily: monoFont, fontSize: 6.5, letterSpacing: 1.2, color: 'rgba(143,184,155,0.6)' },
  spotsLeft: { color: '#e0605c' },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reactionCount: { fontFamily: monoFont, fontSize: 7, fontWeight: '700', color: 'rgba(143,184,155,0.7)' },

  loadMore: {
    marginTop: 13,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.5)',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: 'rgba(57,255,106,0.05)',
  },
  loadMoreTxt: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '800', letterSpacing: 2, color: colors.primary },
  caughtUp: {
    marginTop: 13,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 6.8,
    letterSpacing: 2,
    color: 'rgba(143,184,155,0.45)',
  },
  footVersion: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 6.3,
    letterSpacing: 2.6,
    color: 'rgba(143,184,155,0.4)',
  },
  footTag: {
    marginTop: 5,
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 5.6,
    letterSpacing: 2.2,
    color: 'rgba(143,184,155,0.28)',
  },
  mutter: {
    marginTop: 6,
    fontFamily: monoFont,
    fontSize: 6.2,
    letterSpacing: 1.6,
    color: colors.warm,
    textShadowColor: 'rgba(242,192,120,0.4)',
    textShadowRadius: 5,
  },
});
