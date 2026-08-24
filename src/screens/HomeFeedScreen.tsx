import React, { useEffect, useMemo, useState } from 'react';
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
  DotsIcon,
} from '../components/feed/FeedIcons';
import { FEED_CATEGORIES, getDrills, type FeedItem } from '../data/fcFeed';
import { useInfiniteFeed } from '../hooks/useInfiniteFeed';
import { colors, monoFont, bodyFont, bodyFontBold, bodyFontHeavy, bodyFontStrong } from '../theme';

// ─────────────────────────────────────────────────────────────
// HOME FEED — the paid home screen. YouTube home layout:
//
//   left rail   · hamburger + ∞ + Home / The Loop / Community / You
//   top bar     · search (icon right) · bell · avatar
//   chips       · All / ProSeason News / FC News / Skill of the Week / Creators
//   grid        · uniform-size cards (avatar-left header + ⋮ menu),
//                 labelled sections, a portrait "SKILLS IN 60 SECONDS"
//                 shelf, and the Instagram/YouTube infinite scroll.
//
// The rail hides on phones — the mobile top bar carries the
// hamburger + ∞ instead (YouTube mobile pattern).
// ─────────────────────────────────────────────────────────────

const TOPBAR_H = 64;
const CHIPS_H = 52;
const RAIL_W = 76;

export default function HomeFeedScreen() {
  const { width, height: winH } = useWindowDimensions();
  const [category, setCategory] = useState('foryou');
  const [menuOpen, setMenuOpen] = useState(false);

  const isPhone = width < 768;
  const railW = isPhone ? 0 : RAIL_W;
  const contentW = Math.min(width - railW, 1440);
  const cols = width - railW >= 1200 ? 3 : width - railW >= 620 ? 2 : 1;
  const gap = 18;
  const pad = isPhone ? 14 : 24;
  const cardW = Math.min((contentW - pad * 2 - gap * (cols - 1)) / cols, 460);

  // RN-web ScrollViews need an explicit height (flex chain won't do it)
  const scrollH = Math.max(0, winH - TOPBAR_H - CHIPS_H);

  return (
    <View style={styles.root}>
      {/* ambient world behind everything */}
      <PitchBackdrop dim={0.84} fixed />
      <FeedOrbs />

      {/* ── left rail (desktop / tablet) ── */}
      {!isPhone && <SideRail onOpenMenu={() => setMenuOpen(true)} />}

      {/* ── main column ── */}
      <View style={styles.mainCol}>
        {/* top bar */}
        <View style={styles.topbar}>
          <View style={[styles.topbarInner, { width: contentW, gap: isPhone ? 10 : 14 }]}>
            {isPhone && (
              <>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
                  <MenuIcon size={21} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={6} onPress={() => {}}>
                  <InfinityCrest size={34} bold />
                </TouchableOpacity>
              </>
            )}
            <View style={[styles.search, !isPhone && styles.searchWide]}>
              <Text style={styles.searchText} numberOfLines={1}>
                Search
              </Text>
              {isPhone ? (
                <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
                  <SearchIcon size={20} />
                </TouchableOpacity>
              ) : (
                <View style={styles.searchIconBox}>
                  <SearchIcon size={19} color={colors.fg} />
                </View>
              )}
            </View>
            <View style={styles.bellBtn}>
              <BellIcon size={isPhone ? 19 : 21} />
              <View style={styles.bellDot} />
            </View>
            <View style={styles.avatarBtn}>
              <Text style={styles.avatarText}>{'IO'}</Text>
            </View>
          </View>
        </View>

        {/* category chips */}
        <View style={styles.chipsRow}>
          <View style={[styles.chipsInner, { width: contentW }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRowContent}>
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

        {/* the feed */}
        <ScrollView
          style={[styles.scroll, { height: scrollH }]}
          contentContainerStyle={[styles.scrollInner, { paddingHorizontal: pad }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <FeedGrid key={category} category={category} cardW={cardW} compact={cols > 1} />
        </ScrollView>
      </View>

      {/* drawer overlays the whole screen (rail included) */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} screenWidth={width} />
    </View>
  );
}

// ── left rail (the YouTube nav rail) ──

function RailItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <TouchableOpacity style={[styles.railItem, active && styles.railItemActive]} hitSlop={4}>
      {icon}
      <Text style={[styles.railLabel, active && styles.railLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SideRail({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <View style={styles.rail}>
      <TouchableOpacity style={styles.railTopBtn} onPress={onOpenMenu} hitSlop={8}>
        <MenuIcon size={22} />
      </TouchableOpacity>
      <TouchableOpacity hitSlop={6} onPress={() => {}}>
        <InfinityCrest size={40} bold />
      </TouchableOpacity>
      <View style={{ height: 16 }} />
      <RailItem icon={<HomeIcon size={22} color={colors.primary} />} label="Home" active />
      <RailItem icon={<LoopIcon size={22} color={colors.fgDim} />} label="The Loop" />
      <RailItem icon={<PeopleIcon size={22} color={colors.fgDim} />} label="Community" />
      <View style={{ flex: 1 }} />
      <TouchableOpacity hitSlop={6}>
        <View style={styles.railAvatar}>
          <Text style={styles.railAvatarTxt}>{'IO'}</Text>
        </View>
        <Text style={styles.railLabel}>{'You'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── the portrait drill shelf (the "Shorts" equivalent) ──

function DrillsShelf() {
  const drills = useMemo(() => getDrills(), []);
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHead}>
        <View style={styles.shelfBadge}>
          <Text style={styles.shelfBadgeTxt}>{'\u25C8'}</Text>
        </View>
        <Text style={styles.shelfTitle}>{'SKILLS IN 60 SECONDS'}</Text>
        <TouchableOpacity hitSlop={8}>
          <DotsIcon size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
        {drills.map((d) => (
          <TouchableOpacity key={d.id} style={styles.shelfCard} hitSlop={4}>
            <View style={styles.shelfCircle} />
            <View style={styles.shelfBottom}>
              <Text style={styles.shelfName} numberOfLines={1}>
                {d.title.split('—')[0].trim()}
              </Text>
              <View style={styles.shelfMetaRow}>
                <Text style={styles.shelfMetaTxt}>
                  {typeof d.difficulty === 'number' ? `${d.difficulty}/5` : ''} {'\u00B7'} {d.timeAgo}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── feed grid with the infinite-scroll mechanism ──

function FeedGrid({
  category,
  cardW,
  compact,
}: {
  category: string;
  cardW: number;
  compact: boolean;
}) {
  const { items, loading, hasMore, sentinelRef } = useInfiniteFeed(category);

  // uniform card height (desktop grid): media aspect + fixed content
  // allowance — every card in the grid is exactly the same size
  const cardH = compact ? Math.round((cardW - 28) * 0.62 + 172) : undefined;

  let prevLabel: string | undefined;

  return (
    <View style={styles.gridWrap}>
      <View style={styles.grid}>
        {items.map((it: FeedItem, i) => {
          const showHeader = !!it.sectionLabel && it.sectionLabel !== prevLabel;
          if (it.sectionLabel) prevLabel = it.sectionLabel;
          return (
            <React.Fragment key={it.id}>
              {/* the drill shelf drops in once, after the first section */}
              {i === 4 ? <DrillsShelf /> : null}
              {showHeader ? <SectionHeader label={it.sectionLabel as string} /> : null}
              <Animated.View
                entering={FadeInUp.delay(70).duration(500)}
                style={{ width: cardW, height: cardH }}
              >
                <FeedCard item={it} compact={compact} width={cardW} height={cardH} />
              </Animated.View>
            </React.Fragment>
          );
        })}
      </View>
      {loading ? <LoadingMore /> : null}
      {!hasMore ? <CaughtUp /> : null}
      <View ref={sentinelRef} style={styles.sentinel} />
    </View>
  );
}

/* full-width labelled divider between feed sections */
function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTxt}>{`[ ${label} ]`}</Text>
      <View style={styles.sectionHeaderLine} />
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

// ── ambient drifting glows ──

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  mainCol: {
    flex: 1,
  },
  // ── left rail ──
  rail: {
    width: RAIL_W,
    borderRightWidth: 1,
    borderRightColor: 'rgba(57,255,106,0.10)',
    backgroundColor: 'rgba(5,10,6,0.6)',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
    zIndex: 20,
  },
  railTopBtn: {
    padding: 8,
  },
  railItem: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  railItemActive: {
    backgroundColor: 'rgba(57,255,106,0.10)',
  },
  railLabel: {
    fontFamily: bodyFont,
    fontSize: 10,
    color: colors.muted,
  },
  railLabelActive: {
    color: colors.fg,
    fontWeight: '700',
  },
  railAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(19,34,23,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  railAvatarTxt: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    color: colors.fg,
  },
  // ── top bar ──
  topbar: {
    height: TOPBAR_H,
    backgroundColor: 'rgba(5,10,6,0.86)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,106,0.10)',
    zIndex: 20,
    justifyContent: 'center',
  },
  topbarInner: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconBtn: {
    padding: 6,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(12,20,14,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.16)',
    borderRadius: 8,
    paddingLeft: 16,
  },
  searchWide: {
    maxWidth: 560,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  searchText: {
    flex: 1,
    fontFamily: bodyFont,
    fontSize: 13,
    color: colors.mutedDim,
  },
  searchIconBox: {
    width: 52,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(143,184,155,0.16)',
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
  // ── chips ─
  chipsRow: {
    height: CHIPS_H,
    backgroundColor: 'rgba(5,10,6,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,106,0.10)',
    zIndex: 20,
    justifyContent: 'center',
  },
  chipsInner: {
    height: '100%',
    justifyContent: 'center',
  },
  chipsRowContent: {
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(15,26,19,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.18)',
  },
  chipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  chipText: {
    fontFamily: bodyFontStrong,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.fgDim,
  },
  chipTextActive: {
    color: '#050a06',
  },
  // ── scroll + grid ──
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingTop: 16,
    paddingBottom: 60,
  },
  gridWrap: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  sectionHeaderTxt: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2.6,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(57,255,106,0.18)',
  },
  sentinel: {
    height: 2,
    width: '100%',
  },
  // ── drill shelf (Shorts-style) ──
  shelf: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'rgba(12,20,14,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.12)',
    borderRadius: 18,
    padding: 14,
  },
  shelfHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  shelfBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(57,255,106,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelfBadgeTxt: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  shelfTitle: {
    flex: 1,
    fontFamily: bodyFontHeavy,
    fontSize: 15,
    fontWeight: '800',
    color: colors.fg,
    letterSpacing: 0.4,
  },
  shelfRow: {
    gap: 12,
    paddingRight: 8,
  },
  shelfCard: {
    width: 148,
    height: 262,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    backgroundColor: 'rgba(8,17,11,0.95)',
    position: 'relative',
    overflow: 'hidden',
  },
  shelfCircle: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    top: 88,
    left: 37,
  },
  shelfBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: 'rgba(5,10,6,0.82)',
  },
  shelfName: {
    fontFamily: bodyFontBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.fg,
    letterSpacing: 0.3,
  },
  shelfMetaRow: {
    marginTop: 3,
  },
  shelfMetaTxt: {
    fontFamily: monoFont,
    fontSize: 9.5,
    color: colors.mutedDim,
    letterSpacing: 0.5,
  },
  // ── loading + caught up ──
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
  // ── drawer ──
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
  // ── ambient orbs ──
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
});
