import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  FadeInUp,
  Easing,
} from 'react-native-reanimated';
import InfinityCrest from '../components/InfinityCrest';
import PitchBackdrop from '../components/PitchBackdrop';
import FeedCard from '../components/feed/FeedCard';
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  HomeIcon,
  LoopIcon,
  PeopleIcon,
} from '../components/feed/FeedIcons';
import { FEED_CATEGORIES, type FeedItem } from '../data/fcFeed';
import { useInfiniteFeed } from '../hooks/useInfiniteFeed';
import { colors, monoFont, bodyFont, bodyFontBold, bodyFontHeavy, bodyFontStrong } from '../theme';

// ─────────────────────────────────────────────────────────────
// HOME FEED — the paid home screen (design v4).
//
// Top bar:  hamburger · ∞ logo · search · bell · avatar
// Drawer:   Home (active) · The Loop (COURSE) · Community
// Chips:    All · ProSeason News · FC News · New Skill of the
//           Week · Creators
// Feed:     responsive grid (3 / 2 / 1 columns) with the
//           Instagram/YouTube infinite-scroll mechanism.
// ─────────────────────────────────────────────────────────────

const TOPBAR_H = 64;
const CHIPS_H = 54;

export default function HomeFeedScreen() {
  const { width, height: winH } = useWindowDimensions();
  const [category, setCategory] = useState('foryou');
  const [menuOpen, setMenuOpen] = useState(false);

  const contentW = Math.min(width, 1440);
  const cols = width >= 1280 ? 3 : width >= 768 ? 2 : 1;
  const isPhone = width < 768;
  const gap = 18;
  const pad = isPhone ? 14 : 24;
  const cardW = Math.min((contentW - pad * 2 - gap * (cols - 1)) / cols, 460);

  return (
    <View style={styles.root}>
      {/* ambient world behind the feed — dimmed pitch + drifting glows */}
      <PitchBackdrop dim={0.84} fixed />
      <FeedOrbs />

      {/* ── top bar ── */}
      <View style={styles.topbarOuter}>
        <View style={[styles.topbar, { width: contentW, gap: isPhone ? 10 : 14 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
            <MenuIcon size={isPhone ? 21 : 23} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={6} onPress={() => {}}>
            <InfinityCrest size={isPhone ? 34 : 42} bold />
          </TouchableOpacity>
          {isPhone ? (
            <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
              <SearchIcon size={20} />
            </TouchableOpacity>
          ) : (
            <View style={styles.search}>
              <SearchIcon size={18} />
              <Text style={styles.searchText}>Search</Text>
            </View>
          )}
          <View style={styles.bellBtn}>
            <BellIcon size={isPhone ? 19 : 21} />
            <View style={styles.bellDot} />
          </View>
          <View style={styles.avatarBtn}>
            <Text style={styles.avatarText}>{'IO'}</Text>
          </View>
        </View>
      </View>

      {/* ── category chips ── */}
      <View style={styles.chipsOuter}>
        <View style={[styles.chips, { width: contentW }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {FEED_CATEGORIES.map((c) => {
              const active = c.id === category;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => setCategory(c.id)}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ── the feed ── */}
      <ScrollView
        style={[styles.scroll, { height: winH }]}
        contentContainerStyle={[styles.scrollInner, { paddingTop: TOPBAR_H + CHIPS_H + 16, paddingHorizontal: pad }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <FeedGrid key={category} category={category} cols={cols} cardW={cardW} compact={cols > 1} />
      </ScrollView>

      {/* ── drawer ── */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} screenWidth={width} />
    </View>
  );
}

// ── ambient drifting glows behind the feed ──

function FeedOrbs() {
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  useEffect(() => {
    t1.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }), -1, true);
    t2.value = withRepeat(withTiming(1, { duration: 10500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [t1, t2]);
  const s1 = useAnimatedStyle(() => ({
    opacity: 0.5 + t1.value * 0.3,
    transform: [{ translateY: t1.value * -40 }, { translateX: t1.value * 22 }],
  }));
  const s2 = useAnimatedStyle(() => ({
    opacity: 0.4 + t2.value * 0.28,
    transform: [{ translateY: t2.value * 36 }, { translateX: t2.value * -28 }],
  }));
  return (
    <>
      <Animated.View style={[styles.feedOrb, styles.feedOrbGreen, s1]} />
      <Animated.View style={[styles.feedOrb, styles.feedOrbGold, s2]} />
    </>
  );
}

// ── feed grid with the infinite-scroll mechanism ──

function FeedGrid({
  category,
  cols,
  cardW,
  compact,
}: {
  category: string;
  cols: number;
  cardW: number;
  compact: boolean;
}) {
  const { items, loading, hasMore, sentinelRef } = useInfiniteFeed(category);

  return (
    <View style={styles.gridWrap}>
      <View style={styles.grid}>
        {items.map((it: FeedItem, i) => (
          <Animated.View
            key={it.id}
            entering={FadeInUp.delay(Math.min(i % 4, 3) * 70).duration(500)}
            style={{ width: cardW }}
          >
            <FeedCard item={it} compact={compact} width={cardW} />
          </Animated.View>
        ))}
      </View>
      {loading ? <LoadingMore /> : null}
      {!hasMore ? <CaughtUp /> : null}
      <View ref={sentinelRef} style={styles.sentinel} />
    </View>
  );
}

function LoadingMore() {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 600);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={styles.loadingRow}>
      <View style={[styles.loadingDot, pulse ? styles.loadingDotOn : null]} />
      <Text style={styles.loadingText}>{'LOADING MORE\u2026'}</Text>
    </View>
  );
}

function CaughtUp() {
  return (
    <View style={styles.caughtUp}>
      <Text style={styles.caughtUpTitle}>{'\u2726  You\u2019re all caught up'}</Text>
      <Text style={styles.caughtUpSub}>{'New FC 27 content drops weekly. Check back soon.'}</Text>
    </View>
  );
}

// ── the hamburger drawer ──

function Drawer({ open, onClose, screenWidth }: { open: boolean; onClose: () => void; screenWidth: number }) {
  const drawerW = screenWidth < 768 ? Math.min(300, screenWidth * 0.8) : 300;
  const tx = useSharedValue(-(drawerW + 24));
  const bg = useSharedValue(0);

  useEffect(() => {
    tx.value = withTiming(open ? 0 : -(drawerW + 24), { duration: 320, easing: Easing.out(Easing.cubic) });
    bg.value = withTiming(open ? 1 : 0, { duration: 320 });
  }, [open, drawerW, tx, bg]);

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: bg.value }));

  return (
    <>
      {/* When closed the wrapper ignores ALL pointer events, so the
          invisible layer can never sit on top of the feed and eat
          scroll gestures. */}
      <View pointerEvents={open ? 'auto' : 'none'} style={styles.backdropTouch}>
        <TouchableOpacity activeOpacity={1} style={styles.backdropHit} onPress={onClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.drawer, { width: drawerW }, drawerStyle]}>
        <View style={styles.drawerBrand}>
          <InfinityCrest size={54} bold />
        </View>
        <View style={styles.drawerNav}>
          <View style={styles.menuItemActive}>
            <HomeIcon size={20} color="#050a06" />
            <Text style={styles.menuItemTextActive}>{'Home'}</Text>
            <Text style={styles.menuActiveTag}>{'ACTIVE'}</Text>
          </View>
          <TouchableOpacity style={styles.menuItem} onPress={onClose}>
            <LoopIcon size={20} color={colors.fg} />
            <Text style={styles.menuItemText}>{'The Loop'}</Text>
            <View style={styles.menuGoldTag}>
              <Text style={styles.menuGoldTagText}>{'COURSE'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onClose}>
            <PeopleIcon size={20} color={colors.fg} />
            <Text style={styles.menuItemText}>{'Community'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // top bar
  // top bar + chips are centred inside the content column on wide screens
  topbarOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'rgba(5,10,6,0.86)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,106,0.10)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  topbar: {
    height: TOPBAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  iconBtn: {
    padding: 6,
  },
  search: {
    flex: 1,
    maxWidth: 560,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(12,20,14,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.16)',
    borderRadius: 999,
    paddingHorizontal: 14,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  searchText: {
    fontFamily: bodyFont,
    fontSize: 13,
    color: colors.mutedDim,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(19,34,23,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '800',
    color: colors.fg,
    letterSpacing: 0.5,
  },
  // chips
  chipsOuter: {
    position: 'absolute',
    top: TOPBAR_H,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'rgba(5,10,6,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,106,0.10)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  chips: {
    height: CHIPS_H,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,26,19,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.18)',
  },
  chipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  chipText: {
    fontFamily: bodyFontStrong as string,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.fgDim,
  },
  chipTextActive: {
    color: '#050a06',
  },
  // scroll + grid
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingBottom: 60,
  },
  gridWrap: {
    alignItems: 'center',
  },
  feedOrb: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    zIndex: 1,
  },
  feedOrbGreen: {
    top: 180,
    left: -140,
    backgroundColor: 'rgba(57,255,106,0.04)',
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 90,
    shadowOffset: { width: 0, height: 0 },
  },
  feedOrbGold: {
    top: 700,
    right: -160,
    backgroundColor: 'rgba(242,192,120,0.04)',
    shadowColor: colors.accent,
    shadowOpacity: 0.14,
    shadowRadius: 90,
    shadowOffset: { width: 0, height: 0 },
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  sentinel: {
    height: 2,
    width: '100%',
  },
  // loading + caught up
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 26,
    alignSelf: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(57,255,106,0.25)',
  },
  loadingDotOn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  loadingText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedDim,
    letterSpacing: 2,
  },
  caughtUp: {
    alignItems: 'center',
    marginTop: 34,
    paddingVertical: 22,
    alignSelf: 'stretch',
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.14)',
  },
  caughtUpTitle: {
    fontFamily: bodyFontBold,
    fontSize: 15,
    color: colors.fg,
  },
  caughtUpSub: {
    fontFamily: bodyFont,
    fontSize: 12,
    color: colors.mutedDim,
    marginTop: 6,
  },
  // drawer
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  backdropHit: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: 'rgba(8,15,10,0.97)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(57,255,106,0.28)',
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 10, height: 0 },
    paddingTop: 26,
    paddingHorizontal: 22,
  },
  drawerBrand: {
    alignItems: 'center',
    marginBottom: 30,
  },
  drawerNav: {
    gap: 10,
  },
  menuItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    flex: 1,
    fontFamily: bodyFontBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.fg,
  },
  menuItemTextActive: {
    flex: 1,
    fontFamily: bodyFontHeavy,
    fontSize: 15,
    fontWeight: '800',
    color: '#050a06',
  },
  menuActiveTag: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(5,10,6,0.75)',
    letterSpacing: 1.4,
  },
  menuGoldTag: {
    backgroundColor: 'rgba(242,192,120,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  menuGoldTagText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.4,
  },
});
