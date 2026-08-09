import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { InputCombo, ControllerButton } from '../components/ButtonGlyph';
import { ChevronLeftIcon, BookmarkIcon, HeartIcon } from '../components/Icons';
import { Coach } from '../data/coaches';
import { buildFeed, FeedCardData } from '../data/homeFeed';
import { SideLesson } from '../data/sideLesson';
import SideLessonSheet from './SideLessonSheet';
import {
  formatAnnouncementWhen,
  markAnnouncementRead,
  useAnnouncements,
  FounderAnnouncement,
} from '../data/announcements';
import { fetchPublishedNews, NewsItem } from '../data/newsFeed';
import { sfx } from '../audio/sound';
import {
  colors,
  monoFont,
  displayFont,
  bodyFont,
  bodyFontBold,
  bodyFontHeavy,
} from '../theme';

const COMBO_MAP: Record<string, ControllerButton[]> = {
  'controlled-sprint': ['R1', 'LS'],
  'late-cross': ['L1', 'R1', 'CIRCLE'],
  'driven-pass': ['R1', 'CROSS'],
  'second-ball': ['LS', 'CIRCLE'],
  'lane-change': ['L1', 'RS_FLICK'],
  'tactics-window': ['DPAD_DOWN', 'DPAD_UP'],
};

const CHIPS = ['ALL', 'PATCH NOTES & META', 'FOUNDER NOTICES'] as const;
type Chip = (typeof CHIPS)[number];

export default function AcademyUpdatesScreen({
  coach,
  onClose,
}: {
  coach: Coach;
  onClose: () => void;
}) {
  const { width: winW } = useWindowDimensions();
  const colW = Math.min(winW, 430);
  const [chip, setChip] = useState<Chip>('ALL');
  const [news, setNews] = useState<NewsItem[]>([]);
  const { items: announcements, unread: unreadAnn, refresh: refreshAnn } = useAnnouncements();
  const [side, setSide] = useState<SideLesson | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const firstName = coach.name.split(' ')[0];

  useEffect(() => {
    void fetchPublishedNews(20).then(setNews);
  }, []);

  const feed = useMemo(() => buildFeed(coach), [coach]);

  const metaItems = useMemo(() => {
    return feed.filter(
      (c) =>
        c.kind === 'EXPLOIT' ||
        c.kind === 'SKILL_MOVE' ||
        c.kind === 'PATCH_NOTE' ||
        c.kind === 'META_SHIFT' ||
        c.kind === 'TRICK_OF_THE_WEEK',
    );
  }, [feed]);

  return (
    <View style={styles.flex}>
      <GridBackground />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[styles.scroll, { maxWidth: colW, alignSelf: 'center' }]}
      >
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              sfx('tap');
              onClose();
            }}
            hitSlop={10}
            style={styles.backBtn}
          >
            <ChevronLeftIcon size={14} color={colors.primary} />
            <Text style={styles.backTxt}>BACK TO TODAY</Text>
          </Pressable>

          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>FC 26/27 INTEL</Text>
          </View>
        </View>

        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ACADEMY INTEL & UPDATES</Text>
          <Text style={styles.title}>FC 26/27 UPDATES</Text>
          <Text style={styles.sub}>
            “I pulled the important gameplay updates, patch notes, and academy notices. No noise, only what helps you win.” — {firstName}
          </Text>
        </View>

        {/* Category Filters */}
        <View style={styles.chipsRow}>
          {CHIPS.map((c) => {
            const on = chip === c;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  sfx('tap');
                  setChip(c);
                  if (c === 'FOUNDER NOTICES') refreshAnn();
                }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{c}</Text>
                {c === 'FOUNDER NOTICES' && unreadAnn > 0 && (
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountTxt}>{unreadAnn}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* FOUNDER NOTICES SECTION */}
        {(chip === 'ALL' || chip === 'FOUNDER NOTICES') && announcements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>FOUNDER NOTICES</Text>
              <Text style={styles.sectionMeta}>{announcements.length} POSTS</Text>
            </View>
            {announcements.map((a, idx) => (
              <AnnouncementCard
                key={a.id}
                item={a}
                delay={idx * 30}
                onOpen={() => void markAnnouncementRead(a.id)}
              />
            ))}
          </View>
        )}

        {/* PUBLISHED / SCRAPED NEWS */}
        {(chip === 'ALL' || chip === 'PATCH NOTES & META') && news.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>CONSOLE NEWS & PATCH NOTES</Text>
              <Text style={styles.sectionMeta}>{news.length} ITEMS</Text>
            </View>
            {news.map((n, idx) => (
              <NewsCard key={n.id} item={n} delay={idx * 30} />
            ))}
          </View>
        )}

        {/* GAMEPLAY MECHANICS & META SHIFTS */}
        {(chip === 'ALL' || chip === 'PATCH NOTES & META') && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>GAMEPLAY MECHANICS & META</Text>
              <Text style={styles.sectionMeta}>{metaItems.length} MECHANICS</Text>
            </View>
            {metaItems.map((card, idx) => (
              <MetaCard
                key={card.id}
                card={card}
                delay={idx * 30}
                liked={!!liked[card.id]}
                onLike={() => {
                  setLiked((s) => ({ ...s, [card.id]: true }));
                  sfx('like');
                }}
                onOpenLesson={(l) => {
                  sfx('whoosh');
                  setSide(l);
                }}
              />
            ))}
          </View>
        )}

        <View style={styles.footBlock}>
          <Text style={styles.footNotice}>
            UPDATES ARE FILTERED STRICTLY FOR PS5 & XBOX SERIES X|S COMPETITIVE PLAY.
          </Text>
        </View>
      </ScrollView>

      {/* Side Lesson Sheet: in-app breakdown modal */}
      {side && (
        <View style={StyleSheet.absoluteFill}>
          <SideLessonSheet
            coach={coach}
            lesson={side}
            origin="home"
            onClose={() => {
              setSide(null);
              sfx('tap');
            }}
          />
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
    <Animated.View entering={FadeInUp.delay(delay).duration(280)} style={[styles.card, styles.founderCard, !item.isRead && styles.cardUnread]}>
      <Pressable
        onPress={() => {
          onOpen();
          if (item.linkUrl) void Linking.openURL(item.linkUrl).catch(() => {});
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.tagGold}>
            <Text style={styles.tagGoldTxt}>FOUNDER NOTICE</Text>
          </View>
          <Text style={styles.cardTime}>{formatAnnouncementWhen(item.publishedAt)}</Text>
        </View>

        <Text style={styles.cardHeadline}>{item.title}</Text>
        <Text style={styles.cardBody} numberOfLines={5}>{item.body}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.authorTxt}>BY {item.authorHandle.toUpperCase()}</Text>
          {!!item.linkUrl && <Text style={styles.actionTxt}>OPEN ATTACHMENT ›</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function NewsCard({ item, delay }: { item: NewsItem; delay: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(280)} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tagGreen}>
          <Text style={styles.tagGreenTxt}>{item.kind.replace(/_/g, ' ')}</Text>
        </View>
        <Text style={styles.cardTime}>{item.discoveredAt || 'CURRENT PATCH'}</Text>
      </View>

      <Text style={styles.cardHeadline}>{item.headline}</Text>
      <Text style={styles.cardBody} numberOfLines={4}>{item.body}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.sourceTxt}>{item.sourceName.toUpperCase()}</Text>
        {!!item.sourceUrl && (
          <Pressable onPress={() => void Linking.openURL(item.sourceUrl).catch(() => {})}>
            <Text style={styles.actionTxt}>{item.cta || 'SOURCE ›'}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

function MetaCard({
  card,
  delay,
  liked,
  onLike,
  onOpenLesson,
}: {
  card: FeedCardData;
  delay: number;
  liked: boolean;
  onLike: () => void;
  onOpenLesson: (lesson: SideLesson) => void;
}) {
  const combo = card.sideLesson?.topic ? COMBO_MAP[card.sideLesson.topic] : null;

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(280)} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tagGreen}>
          <Text style={styles.tagGreenTxt}>{card.tag}</Text>
        </View>
        <Text style={styles.cardTime}>{card.time}</Text>
      </View>

      <Text style={styles.cardHeadline}>{card.headline}</Text>

      {combo && (
        <View style={styles.comboRow}>
          <Text style={styles.comboLabel}>CONTROLLER INPUT: </Text>
          <InputCombo combo={combo} size={15} />
        </View>
      )}

      {card.body ? <Text style={styles.cardBody} numberOfLines={4}>{card.body}</Text> : null}

      <View style={styles.cardFooter}>
        {card.sideLesson ? (
          <Pressable onPress={() => onOpenLesson(card.sideLesson!)} hitSlop={6}>
            <Text style={styles.actionTxtPrimary}>READ IN-APP LESSON ›</Text>
          </Pressable>
        ) : card.ctaUrl ? (
          <Pressable onPress={() => void Linking.openURL(card.ctaUrl!).catch(() => {})} hitSlop={6}>
            <Text style={styles.actionTxt}>{card.cta || 'LEARN MORE ›'}</Text>
          </Pressable>
        ) : <View />}

        <Pressable onPress={onLike} hitSlop={8} style={styles.likeBtn}>
          <HeartIcon size={14} color={liked ? colors.primary : 'rgba(143,184,155,0.7)'} filled={liked} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 40, width: '100%' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(57,255,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
  },
  backTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(15,26,19,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveTxt: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.primary,
  },

  header: {
    marginTop: 6,
    marginBottom: 20,
  },
  eyebrow: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.primary,
  },
  title: {
    marginTop: 6,
    fontFamily: displayFont,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.5,
    color: colors.fg,
  },
  sub: {
    marginTop: 8,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(143,184,155,0.92)',
  },

  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.9)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(15,26,19,0.7)',
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(57,255,106,0.12)',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  chipTxt: {
    fontFamily: bodyFontBold,
    fontSize: 10.5,
    letterSpacing: 1,
    color: colors.muted,
  },
  chipTxtOn: {
    color: colors.primary,
  },
  badgeCount: {
    backgroundColor: colors.loss,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeCountTxt: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
  },

  section: {
    marginTop: 14,
    gap: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: colors.fg,
  },
  sectionMeta: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.muted,
  },

  card: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 14,
    backgroundColor: 'rgba(15,26,19,0.85)',
    padding: 14,
    gap: 8,
  },
  founderCard: {
    borderColor: 'rgba(242,192,120,0.4)',
    backgroundColor: 'rgba(28,22,10,0.7)',
  },
  cardUnread: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagGreen: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    backgroundColor: 'rgba(57,255,106,0.08)',
  },
  tagGreenTxt: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: colors.primary,
  },
  tagGold: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.5)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    backgroundColor: 'rgba(242,192,120,0.1)',
  },
  tagGoldTxt: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: colors.accent,
  },
  cardTime: {
    fontFamily: monoFont,
    fontSize: 8,
    letterSpacing: 1,
    color: 'rgba(143,184,155,0.6)',
  },
  cardHeadline: {
    fontFamily: bodyFontBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.fg,
  },
  cardBody: {
    fontFamily: bodyFont,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#b9cabe',
  },
  comboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  comboLabel: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.accent,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(143,184,155,0.12)',
    paddingTop: 8,
  },
  authorTxt: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.accent,
  },
  sourceTxt: {
    fontFamily: monoFont,
    fontSize: 8,
    letterSpacing: 1,
    color: 'rgba(143,184,155,0.6)',
  },
  actionTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.accent,
  },
  actionTxtPrimary: {
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.primary,
  },
  likeBtn: {
    padding: 4,
  },

  footBlock: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.14)',
    alignItems: 'center',
  },
  footNotice: {
    fontFamily: monoFont,
    fontSize: 7,
    letterSpacing: 1.2,
    color: 'rgba(143,184,155,0.45)',
    textAlign: 'center',
    lineHeight: 12,
  },
});
