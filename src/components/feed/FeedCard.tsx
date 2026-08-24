import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import SkillMedia from './SkillMedia';
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  VerifiedIcon,
} from './FeedIcons';
import { colors, monoFont, bodyFont, bodyFontBold, bodyFontHeavy, bodyFontStrong } from '../../theme';
import type { FeedItem } from '../../data/fcFeed';

// ─────────────────────────────────────────────────────────────
// FEED CARD — one unit of the infinite feed.
//
// compact (desktop grid):  media + channel + title + meta + the
//   first step's button combo (the cheat-sheet line).
// full (mobile column):    everything, plus the complete
//   "HOW TO DO IT" step list and the action row.
// ─────────────────────────────────────────────────────────────

function ComboChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function ComboRow({ combos, small = false }: { combos: string[]; small?: boolean }) {
  return (
    <View style={styles.comboRow}>
      {combos.map((c) => (
        <ComboChip key={c} label={c} />
      ))}
      {small ? null : null}
    </View>
  );
}

function ProAvatar({ size = 28 }: { size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderColor: colors.primary }]}>
      <Text style={[styles.avatarGlyph, { fontSize: size * 0.52, color: colors.primary }]}>
        {'\u221E'}
      </Text>
    </View>
  );
}

function CreatorAvatar({ color, name, size = 28 }: { color: string; name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: color }]}>
      <Text style={[styles.avatarInitials, { fontSize: size * 0.34, color: '#050a06' }]}>{initials}</Text>
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

  const isCreator = item.kind === 'creator';
  const isNews = item.kind === 'news';
  const isProseasonNews = isNews && item.tags.includes('proseason');
  const mediaWidth = Math.max(120, width - 28);

  return (
    <View style={[styles.card, { width }]}>
      {/* ── media ─ */}
      {!isCreator && !isNews && (
        <SkillMedia
          kind={item.media}
          width={mediaWidth}
          tag={item.kind === 'tactic' ? 'TACTIC' : 'SKILL'}
          difficulty={item.difficulty}
        />
      )}

      {/* ── news header (gold tag + headline treatment) ── */}
      {isNews && (
        <View style={styles.newsHead}>
          <View style={styles.goldTag}>
            <Text style={styles.goldTagText}>{isProseasonNews ? 'PROSEASON NEWS' : 'FC NEWS'}</Text>
          </View>
        </View>
      )}

      {/* ── channel row ── */}
      <View style={styles.channelRow}>
        {item.creator.isPro ? (
          <ProAvatar size={28} />
        ) : (
          <CreatorAvatar color={item.creator.color} name={item.creator.name} size={28} />
        )}
        <Text style={styles.channelName} numberOfLines={1}>
          {item.creator.name}
        </Text>
        {item.creator.isPro ? <VerifiedIcon size={15} /> : null}
      </View>

      {/* ── title ── */}
      <Text style={[styles.title, compact ? styles.titleCompact : null]} numberOfLines={compact ? 2 : 3}>
        {item.title}
      </Text>

      {/* ── meta ── */}
      <Text style={styles.meta}>
        {item.likes.toLocaleString()} {item.metric} {'\u00B7'} {item.timeAgo}
      </Text>

      {/* ── subtitle / body ── */}
      {!compact && item.subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {item.subtitle}
        </Text>
      ) : null}
      {isNews && item.body ? (
        <Text style={styles.newsBody} numberOfLines={compact ? 2 : 4}>
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

      {/* ── creator spotlight ── */}
      {isCreator && (
        <View style={styles.creatorBlock}>
          <View style={styles.creatorTopRow}>
            <CreatorAvatar color={item.creator.color} name={item.creator.name} size={56} />
            <View style={styles.creatorInfo}>
              <View style={styles.goldTag}>
                <Text style={styles.goldTagText}>{'CREATOR'}</Text>
              </View>
              <Text style={styles.creatorName} numberOfLines={1}>
                {item.creator.name}
              </Text>
              <Text style={styles.creatorHandle} numberOfLines={1}>
                {item.creator.handle} {'\u00B7'} {item.creator.followers} followers
              </Text>
            </View>
          </View>
          {item.body ? (
            <Text style={styles.creatorBio} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <View style={styles.followRow}>
            <TouchableOpacity
              style={[styles.followBtn, following ? styles.followBtnDone : null]}
              onPress={() => setFollowing((f) => !f)}
            >
              <Text style={[styles.followText, following ? styles.followTextDone : null]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── actions (full/mobile cards only) ── */}
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
    </View>
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
  newsHead: { marginBottom: 10 },
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
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
  channelName: {
    flex: 1,
    fontFamily: bodyFontStrong,
    fontSize: 13,
    fontWeight: '600',
    color: colors.fg,
  },
  title: {
    fontFamily: bodyFontBold,
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.fg,
    lineHeight: 20,
  },
  titleCompact: {
    fontSize: 14.5,
    lineHeight: 19,
  },
  meta: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.mutedDim,
    marginTop: 6,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontFamily: bodyFont,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 17,
  },
  newsBody: {
    fontFamily: bodyFont,
    fontSize: 12.5,
    color: colors.fgDim,
    marginTop: 8,
    lineHeight: 17.5,
  },
  howBlock: {
    marginTop: 12,
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
  creatorTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  creatorInfo: {
    flex: 1,
    gap: 4,
  },
  creatorName: {
    fontFamily: bodyFontHeavy,
    fontSize: 18,
    fontWeight: '800',
    color: colors.fg,
  },
  creatorHandle: {
    fontFamily: monoFont,
    fontSize: 10.5,
    color: colors.mutedDim,
    letterSpacing: 0.4,
  },
  creatorBio: {
    fontFamily: bodyFont,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 10,
    lineHeight: 17.5,
  },
  followRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
