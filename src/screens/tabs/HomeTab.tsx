import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Linking } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
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
import { SideLesson } from '../../data/sideLesson';
import SideLessonSheet from '../SideLessonSheet';
import {
  formatAnnouncementWhen,
  markAnnouncementRead,
  useAnnouncements,
  FounderAnnouncement,
} from '../../data/announcements';
import { fetchPublishedNews, NewsItem } from '../../data/newsFeed';
import { brandMutter, caughtUpLine, greetingLine } from '../../data/humor';
import { useSettings } from '../../data/settings';
import * as backend from '../../data/backend';
import { sfx } from '../../audio/sound';
import StoreSheet from '../StoreSheet';
import { colors, monoFont } from '../../theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const CHIPS = ['ALL', 'FOUNDER', 'NEWS', 'META WATCH', 'COACH & GROUP'] as const;
type Chip = (typeof CHIPS)[number];

const CHIP_KINDS: Record<Chip, FeedCardData['kind'][] | null | 'FOUNDER' | 'NEWS'> = {
  ALL: null,
  FOUNDER: 'FOUNDER',
  NEWS: 'NEWS',
  'META WATCH': ['EXPLOIT', 'SKILL_MOVE', 'TRICK_OF_THE_WEEK', 'PATCH_NOTE', 'META_SHIFT'],
  'COACH & GROUP': ['COACH_UPDATE'],
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
  const [access, setAccess] = useState<backend.MyAccess | null>(null);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const { items: announcements, unread: unreadAnn, refresh: refreshAnn } = useAnnouncements();
  const settings = useSettings();

  const refreshAccess = () => {
    void backend.myAccess().then((a) => a && setAccess(a));
    void backend.myUnlocks().then((u) => u && setUnlocks(u));
  };
  useEffect(refreshAccess, []);
  useEffect(() => {
    void fetchPublishedNews(20).then(setNews);
  }, []);

  const [tillOpen, setTillOpen] = useState(false);
  // the SIDE NOTE — a bot trick opened as an in-app lesson + blog
  const [side, setSide] = useState<SideLesson | null>(null);

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

  const isTrick = (k: string) => k === 'EXPLOIT' || k === 'SKILL_MOVE' || k === 'TRICK_OF_THE_WEEK';
  const trickOpen = (id: string) => (access?.level ?? 0) >= 1 || unlocks.includes(`trick:${id}`);

  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const feed = useMemo(() => buildFeed(coach), [coach]);
  const ticker = useMemo(() => {
    const base = buildTicker(coach);
    const annHeads = announcements.slice(0, 2).map((a) => `FOUNDER: ${a.title}`);
    const newsHeads = news.slice(0, 2).map((n) => n.headline.replace(/[!?]+$/, ''));
    return [...annHeads, ...newsHeads, ...base];
  }, [coach, announcements, news]);

  // ── the HERO — the freshest live trick (real content, not a placeholder).
  // When the bot has exported a fresh approved mechanic with a lesson, the
  // hero shows IT and tapping opens the in-app blog (SideLessonSheet). The
  // fallback only appears when there is genuinely nothing fresh.
  const hero = useMemo(() => {
    const trick = feed.find(
      (c) =>
        (c.kind === 'EXPLOIT' || c.kind === 'SKILL_MOVE' || c.kind === 'TRICK_OF_THE_WEEK') &&
        !!c.sideLesson,
    );
    return trick ?? null;
  }, [feed]);

  const kinds = CHIP_KINDS[chip];
  const showFounder = chip === 'ALL' || chip === 'FOUNDER';
  const showNews = chip === 'ALL' || chip === 'NEWS';
  const filtered = useMemo(() => {
    if (kinds === 'FOUNDER' || kinds === 'NEWS') return [];
    return kinds ? feed.filter((c) => kinds.includes(c.kind)) : feed;
  }, [feed, kinds]);
  const shown = filtered.slice(0, visible);
  const exhausted = visible >= filtered.length && (chip !== 'ALL' || true);

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable onPress={brandTap} hitSlop={8}>
            <Text style={styles.brand}>PROSEASONACADEMY</Text>
          </Pressable>
          <View style={styles.headerIcons}>
            <Pressable hitSlop={10} onPress={() => { setChip('FOUNDER'); refreshAnn(); }}>
              <View>
                <BellIcon size={17} color="rgba(143,184,155,0.75)" />
                {unreadAnn > 0 && (
                  <View style={styles.bellDot}>
                    <Text style={styles.bellDotTxt}>{unreadAnn > 9 ? '9+' : unreadAnn}</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <Pressable hitSlop={10}>
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

        <View style={styles.greetRow}>
          <Text style={styles.greet}>{greetingLine(settings.displayName, nowStamp())}</Text>
          <View style={styles.livePill}>
            <LiveDot />
            <Text style={styles.liveTxt}>LIVE FEED</Text>
          </View>
        </View>

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

        {/* FOUNDER ANNOUNCEMENTS — official, never community-style placeholders */}
        {showFounder && announcements.length > 0 && (
          <View style={styles.annSection}>
            <Text style={styles.annSectionLbl}>FOUNDER ANNOUNCEMENTS</Text>
            {announcements.slice(0, chip === 'FOUNDER' ? 20 : 3).map((a, idx) => (
              <AnnouncementCard
                key={a.id}
                item={a}
                delay={idx * 40}
                onOpen={() => void markAnnouncementRead(a.id)}
              />
            ))}
          </View>
        )}
        {showFounder && announcements.length === 0 && chip === 'FOUNDER' && (
          <Text style={styles.emptyFounder}>NO FOUNDER ANNOUNCEMENTS YET — WHEN POCOLASTONES POSTS, IT LANDS HERE.</Text>
        )}

        {/* Approved FC Mobile news (founder-reviewed drafts only) */}
        {showNews && news.length > 0 && (
          <View style={styles.annSection}>
            <Text style={styles.annSectionLbl}>FC MOBILE NEWS · FOUNDER-APPROVED</Text>
            {news.slice(0, chip === 'NEWS' ? 20 : 3).map((n, idx) => (
              <NewsCard key={n.id} item={n} delay={idx * 40} />
            ))}
          </View>
        )}

        {chip !== 'FOUNDER' && chip !== 'NEWS' && (
          <Animated.View entering={FadeInUp.duration(350)} style={styles.hero}>
            <Pressable
              onPress={() => {
                if (!hero?.sideLesson) return;
                sfx('whoosh');
                setSide(hero.sideLesson); // the in-app blog — never a browser link
              }}
            >
              <View style={styles.heroTagRow}>
                <Text style={styles.heroTag}>{hero ? 'TRICK OF THE WEEK — LIVE FROM THE BOT' : 'TRICK OF THE WEEK'}</Text>
                {hero && <Text style={styles.heroTagLive}>● FRESH</Text>}
              </View>
              <View style={styles.heroThumb}>
                <MiniPitch width={318} height={150} variant={hero?.sideLesson?.clip.variant ?? 'pitchRun'} showPlay />
                <View style={styles.heroDuration}>
                  <Text style={styles.heroDurationTxt}>
                    {hero?.sideLesson?.clip.duration ?? HERO_FALLBACK.duration}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroHeadline}>
                {hero?.headline ?? HERO_FALLBACK.headline}
              </Text>
              <Text style={styles.heroBody}>
                {hero?.body ?? HERO_FALLBACK.body}
              </Text>
              <View style={styles.heroFoot}>
                <Text style={styles.heroCta}>
                  {hero ? 'READ THE IN-APP BLOG ›' : HERO_FALLBACK.cta}{' '}
                  <Text style={styles.heroMeta}>
                    · {hero?.sideLesson?.mechanicName ?? HERO_FALLBACK.meta}
                  </Text>
                </Text>
                <BookmarkIcon size={14} color="rgba(143,184,155,0.7)" />
              </View>
            </Pressable>
          </Animated.View>
        )}

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

        {chip !== 'FOUNDER' && chip !== 'NEWS' && shown.map((card, i) => (
          <FeedCard
            key={card.id + chip}
            card={card}
            coach={coach}
            delay={i * 40}
            liked={!!liked[card.id]}
            onLike={() => { setLiked((s) => ({ ...s, [card.id]: true })); sfx('like'); }}
            locked={isTrick(card.kind) && !trickOpen(card.id)}
            onUnlock={() => { setTillOpen(true); sfx('whoosh'); }}
            onOpenLesson={(l) => { setSide(l); sfx('whoosh'); }}
          />
        ))}

        {chip !== 'FOUNDER' && chip !== 'NEWS' && (
          !exhausted ? (
            <Pressable style={styles.loadMore} onPress={() => { setVisible((v) => v + 4); sfx('tap'); }}>
              <Text style={styles.loadMoreTxt}>{'>'} LOAD MORE UPDATES ▮</Text>
            </Pressable>
          ) : (
            <Text style={styles.caughtUp}>{caughtUpLine()}</Text>
          )
        )}

        <Text style={styles.footVersion}>PROSEASONACADEMY · VERSION {APP_VERSION}</Text>
        <Text style={styles.footTag}>BUILT BY PLAYERS · NO FULLBACKS WERE HARMED</Text>
      </ScrollView>

      {tillOpen && (
        <View style={StyleSheet.absoluteFill}>
          <StoreSheet onClose={() => { setTillOpen(false); refreshAccess(); }} />
        </View>
      )}

      {/* the SIDE NOTE — the bot's trick as an in-app lesson + blog */}
      {side && (
        <View style={StyleSheet.absoluteFill}>
          <SideLessonSheet coach={coach} lesson={side} origin="home" onClose={() => { setSide(null); sfx('tap'); }} />
        </View>
      )}
    </View>
  );
}

function AnnouncementCard({
  item,
  delay,
  onOpen,
}: {
  item: FounderAnnouncement;
  delay: number;
  onOpen: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(320)} style={[styles.annCard, !item.isRead && styles.annCardUnread]}>
      <Pressable
        onPress={() => {
          onOpen();
          if (item.linkUrl) void Linking.openURL(item.linkUrl).catch(() => {});
        }}
      >
        <View style={styles.annTop}>
          <Text style={styles.annBadge}>FOUNDER ANNOUNCEMENT</Text>
          {!item.isRead && <Text style={styles.annNew}>NEW</Text>}
        </View>
        <Text style={styles.annBy}>POSTED BY {item.authorHandle.toUpperCase()}</Text>
        <Text style={styles.annWhen}>{formatAnnouncementWhen(item.publishedAt)}</Text>
        <Text style={styles.annTitle}>{item.title}</Text>
        <Text style={styles.annBody} numberOfLines={5}>{item.body}</Text>
        {!!item.linkUrl && <Text style={styles.annLink}>OPEN LINK ›</Text>}
        <Text style={styles.annType}>{item.updateType.toUpperCase()}</Text>
      </Pressable>
    </Animated.View>
  );
}

function NewsCard({ item, delay }: { item: NewsItem; delay: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(320)} style={styles.newsCard}>
      <Text style={styles.newsTag}>{item.kind.replace(/_/g, ' ')}</Text>
      <Text style={styles.newsHeadline}>{item.headline}</Text>
      <Text style={styles.newsBody} numberOfLines={3}>{item.body}</Text>
      <View style={styles.newsFoot}>
        <Text style={styles.newsSource}>{item.sourceName} · {item.discoveredAt}</Text>
        {!!item.sourceUrl && (
          <Pressable onPress={() => void Linking.openURL(item.sourceUrl).catch(() => {})}>
            <Text style={styles.newsCta}>{item.cta}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
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
  onOpenLesson,
}: {
  card: FeedCardData;
  coach: Coach;
  delay: number;
  liked: boolean;
  onLike: () => void;
  /** a gated trick this member's tier does not open yet */
  locked?: boolean;
  onUnlock?: () => void;
  /** a trick carrying a SIDE NOTE — open the lesson + blog inside the app */
  onOpenLesson?: (lesson: SideLesson) => void;
}) {
  const a = ACCENT[card.accent];
  const open = () => {
    if (card.sideLesson && onOpenLesson) {
      onOpenLesson(card.sideLesson); // the side note reads INSIDE the academy
      return;
    }
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
  bellDot: {
    position: 'absolute',
    right: -8,
    top: -6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.loss,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellDotTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', color: '#fff' },
  avatarBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  annSection: { marginTop: 12 },
  annSectionLbl: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 2.2,
    color: colors.accent,
    marginBottom: 6,
  },
  emptyFounder: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 6.5,
    lineHeight: 12,
    letterSpacing: 1,
    color: colors.muted,
  },
  annCard: {
    marginTop: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(242,192,120,0.55)',
    borderRadius: 14,
    backgroundColor: 'rgba(38,30,12,0.55)',
    padding: 13,
  },
  annCardUnread: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  annTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  annBadge: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.accent,
  },
  annNew: {
    fontFamily: monoFont,
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: '#0a0f0a',
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  annBy: {
    marginTop: 8,
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: 'rgba(242,192,120,0.85)',
  },
  annWhen: {
    marginTop: 2,
    fontFamily: monoFont,
    fontSize: 6,
    letterSpacing: 1.2,
    color: 'rgba(143,184,155,0.65)',
  },
  annTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: colors.fg,
  },
  annBody: {
    marginTop: 6,
    fontSize: 10.5,
    lineHeight: 15,
    color: '#c9d6cc',
  },
  annLink: {
    marginTop: 8,
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: colors.accent,
  },
  annType: {
    marginTop: 8,
    fontFamily: monoFont,
    fontSize: 5.8,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: 'rgba(143,184,155,0.5)',
  },
  newsCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
    borderRadius: 14,
    backgroundColor: 'rgba(15,26,19,0.8)',
    padding: 12,
  },
  newsTag: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: colors.primary,
  },
  newsHeadline: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    color: colors.fg,
  },
  newsBody: {
    marginTop: 5,
    fontSize: 9.5,
    lineHeight: 13.5,
    color: '#a9bbae',
  },
  newsFoot: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsSource: {
    fontFamily: monoFont,
    fontSize: 5.8,
    letterSpacing: 1,
    color: 'rgba(143,184,155,0.6)',
    flex: 1,
  },
  newsCta: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.primary,
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
  heroTagRow: { marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  heroTagLive: {
    fontFamily: monoFont,
    fontSize: 6.4,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: colors.warm,
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
