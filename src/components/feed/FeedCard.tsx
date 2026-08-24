import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import SkillMedia from './SkillMedia';
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  DotsIcon,
  VerifiedIcon,
} from './FeedIcons';
import { colors, monoFont, bodyFont, bodyFontBold, bodyFontHeavy, bodyFontStrong } from '../../theme';
import type { FeedItem } from '../../data/fcFeed';

// ─────────────────────────────────────────────────────────────
// FEED CARD — YouTube home layout:
//   media (16:9-ish) on top, then a row of
//   [ channel avatar ] [ title · channel+verified · tries/time ]
//   with a ⋮ menu top-right, then the card-specific body.
//
// compact (desktop grid): uniform height, first-step combo cheat-sheet
// full (mobile column): full HOW TO DO IT steps + action row
// ─────────────────────────────────────────────────────────────

function ComboChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function ComboRow({ combos }: { combos: string[] }) {
  return (
    <View style={styles.comboRow}>
      {combos.map((c) => (
        <ComboChip key={c} label={c} />
      ))}
    </View>
  );
}

function ProAvatar({ size = 36 }: { size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderColor: colors.primary }]}>
      <Text style={[styles.avatarGlyph, { fontSize: size * 0.5, color: colors.primary }]}>
        {'\u221E'}
      </Text>
    </View>
  );
}

function CreatorAvatar({ color, name, size = 36 }: { color: string; name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: color }]}>
      <Text style={[styles.avatarInitials, { fontSize: size * 0.32, color: '#050a06' }]}>{initials}</Text>
    </View>
  );
}

type Props = {
  item: FeedItem;
  compact: boolean;
  width: number;
};

export default function FeedCard({ item, compact, width }: Props) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);

  // hover: lift + lighter surface + green border (like the YouTube hover card)
  const hov = useSharedValue(0);
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: hov.value * -5 }],
    borderColor: `rgba(57,255,106,${0.14 + hov.value * 0.32})`,
    backgroundColor: `rgba(${Math.round(12 + 10 * hov.value)},${Math.round(20 + 14 * hov.value)},${Math.round(14 + 10 * hov.value)},0.94)`,
  }));

  const isCreator = item.kind === 'creator';
  const isNews = item.kind === 'news';
  const isProseasonNews = isNews && item.tags.includes('proseason');
  const mediaWidth = Math.max(120, width - 28);
  const avatarSize = compact ? 36 : 40;

  return (
    <Pressable
      onHoverIn={() => (hov.value = withTiming(1, { duration: 180 }))}
      onHoverOut={() => (hov.value = withTiming(0, { duration: 260 }))}
      style={{ width, height: '100%' }}
    >
      <Animated.View style={[styles.card, lift]}>
        {/* ── media ── */}
        {!isCreator && !isNews && (
          <SkillMedia
            kind={item.media}
            width={mediaWidth}
            tag={item.kind === 'tactic' ? 'TACTIC' : 'SKILL'}
            difficulty={item.difficulty}
          />
        )}

        {/* ── category tag (news / creator) ── */}
        {(isNews || isCreator) && (
          <View style={styles.newsHead}>
            <View style={styles.goldTag}>
              <Text style={styles.goldTagText}>
                {isCreator ? 'CREATOR' : isProseasonNews ? 'PROSEASON NEWS' : 'FC NEWS'}
              </Text>
            </View>
          </View>
        )}

        {/* ── YouTube-style header row ── */}
        <View style={styles.headerRow}>
          {item.creator.isPro ? (
            <ProAvatar size={avatarSize} />
          ) : (
            <CreatorAvatar color={item.creator.color} name={item.creator.name} size={avatarSize} />
          )}
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.title, compact ? styles.titleCompact : null]} numberOfLines={compact ? 2 : 3}>
                {item.title}
              </Text>
              <TouchableOpacity hitSlop={8}>
                <DotsIcon size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.channelRow2}>
              <Text style={styles.channelName} numberOfLines={1}>
                {item.creator.name}
              </Text>
              {item.creator.isPro ? <VerifiedIcon size={14} /> : null}
            </View>
            <Text style={styles.meta}>
              {item.likes.toLocaleString()} {item.metric} {'\u00B7'} {item.timeAgo}
            </Text>
          </View>
        </View>

        {/* ── subtitle (mobile cards) ── */}
        {!compact && item.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}

        {/* ── news body ── */}
        {isNews && item.body ? (
          <Text style={styles.newsBody} numberOfLines={compact ? 3 : 5}>
            {item.body}
          </Text>
        ) : null}

        {/* ── how to do it ── */}
        {compact && item.steps && item.steps.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            <ComboRow combos={item.steps[0].combo} />
          </View>
        ) : null}

        {!compact && item.steps && item.steps.length > 0 ? (
          <View style={styles.howBlock}>
            <Text style={styles.howLabel}>{'HOW TO DO IT'}</Text>
            {item.steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNum}>{String(i + 1)}</Text>
                <Text style={styles.stepLabel} numberOfLines={2}>
                  {s.label}
                </Text>
                <View style={styles.stepCombos}>
                  {s.combo.map((c) => (
                    <ComboChip key={c} label={c} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── creator body (name+avatar are in the header row) ── */}
        {isCreator && (
          <View style={styles.creatorBlock}>
            {item.body ? (
              <Text style={styles.creatorBio} numberOfLines={2}>
                {item.body}
              </Text>
            ) : null}
            <View style={styles.followRow}>
              <Text style={styles.creatorHandle}>{item.creator.followers} followers</Text>
              <TouchableOpacity
                style={[styles.followBtn, following ? styles.followBtnDone : null]}
                onPress={() => setFollowing((f) => !f)}
                hitSlop={6}
              >
                <Text style={[styles.followText, following ? styles.followTextDone : null]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── actions (mobile cards only) ── */}
        {!compact && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => setLiked((l) => !l)} hitSlop={8}>
              <HeartIcon color={liked ? colors.primary : colors.muted} size={23} filled={liked} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8}>
              <CommentIcon color={colors.muted} size={23} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8}>
              <ShareIcon color={colors.muted} size={23} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setSaved((s) => !s)} hitSlop={8}>
              <BookmarkIcon color={saved ? colors.accent : colors.muted} size={23} filled={saved} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(12,20,14,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.14)',
    borderRadius: 18,
    padding: 14,
  },
  newsHead: { marginBottom: 8 },
  goldTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(242,192,120,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  goldTagText: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.6,
  },
  // header row — avatar left, text column right (YouTube layout)
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  avatar: {
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,26,19,0.9)',
  },
  avatarGlyph: {
    fontFamily: monoFont,
    fontWeight: '900',
  },
  avatarInitials: {
    fontFamily: bodyFontBold,
    fontWeight: '800',
  },
  title: {
    flex: 1,
    fontFamily: bodyFontBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.fg,
    lineHeight: 19,
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  channelRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  channelName: {
    fontFamily: bodyFontStrong,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.muted,
  },
  meta: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.mutedDim,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontFamily: bodyFont,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: -2,
    lineHeight: 17,
  },
  newsBody: {
    fontFamily: bodyFont,
    fontSize: 12.5,
    color: colors.fgDim,
    marginTop: 4,
    lineHeight: 17.5,
  },
  howBlock: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(143,184,155,0.14)',
    paddingTop: 10,
  },
  howLabel: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepNum: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedDim,
    width: 14,
  },
  stepLabel: {
    flex: 1,
    fontFamily: bodyFont,
    fontSize: 12,
    color: colors.fgDim,
  },
  stepCombos: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '52%',
  },
  comboRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: 'rgba(19,34,23,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    color: colors.fgDim,
    letterSpacing: 0.6,
  },
  creatorBlock: {
    marginTop: 4,
  },
  creatorBio: {
    fontFamily: bodyFont,
    fontSize: 12.5,
    color: colors.muted,
    lineHeight: 17.5,
  },
  creatorHandle: {
    fontFamily: monoFont,
    fontSize: 10.5,
    color: colors.mutedDim,
    letterSpacing: 0.4,
  },
  followRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  followBtn: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  followBtnDone: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.5)',
  },
  followText: {
    fontFamily: bodyFontBold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#050a06',
  },
  followTextDone: {
    color: colors.accent,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(143,184,155,0.14)',
  },
});
