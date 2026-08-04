import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { colors, monoFont } from '../theme';
import { Coach } from '../data/coaches';
import {
  LOSS_TAGS,
  LOSS_LINE_LIMIT,
  LossTag,
  addEntry,
  dayLabel,
  removeEntry,
  useJournal,
} from '../data/journal';
import { ChevronLeftIcon, FlameIcon, JournalIcon, SendIcon, XMarkIcon } from '../components/Icons';
import HonestyMeter from '../components/HonestyMeter';
import { isValidReflection } from '../data/honestyGuard';

// ─────────────────────────────────────────────────────────────
// LOSS JOURNAL SCREEN — one line per loss. Composer at top,
// honest lines below, newest first, stats strip on top.
// The coach reads every line the moment it lands (his reaction
// strip appears after you log) — still one-way, still his rules.
// ─────────────────────────────────────────────────────────────

export default function LossJournal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const j = useJournal();
  const [text, setText] = useState('');
  const [tag, setTag] = useState<LossTag>('COMPOSURE');
  const [ack, setAck] = useState<string | null>(null);

  const coachFirst = coach.name.split(' ')[0].toUpperCase();

  const logLine = () => {
    const entry = addEntry(tag, text);
    if (!entry) return;
    setText('');
    setAck(
      coach.id === 'chinedu'
        ? 'Good. Now it happened for a reason. Next line better say something different.'
        : 'Breathe. Written is lighter. Did they score? Forward — always forward.',
    );
    setTimeout(() => setAck(null), 6000);
  };

  // group entries by day label
  const groups = useMemo(() => {
    const out: { label: string; items: typeof j.entries }[] = [];
    for (const e of j.entries) {
      const label = dayLabel(e.at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(e);
      else out.push({ label, items: [e] });
    }
    return out;
  }, [j.entries]);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      <GridBackground />

      <View style={styles.headerWrap}>
        <Text style={styles.eyebrow}>{coachFirst}'S RULE — ONE LINE PER LOSS</Text>
        <Text style={styles.title}>LOSS JOURNAL</Text>
        <Text style={styles.subtitle}>NOT A DIARY — A PATTERN HE CAN FIX</Text>
      </View>

      {/* stats */}
      <View style={styles.statStrip}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{j.total}</Text>
          <Text style={styles.statLabel}>LINES LOGGED</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder]}>
          <Text style={styles.statValue}>{j.thisWeek}</Text>
          <Text style={styles.statLabel}>LAST 7 DAYS</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder, styles.streakCell]}>
          <FlameIcon size={13} color={colors.accent} />
          <Text style={styles.statValue}>{j.streakDays}</Text>
          <Text style={styles.statLabel}>DAY STREAK</Text>
        </View>
      </View>

      {/* ── THE CHINEDU WAY: LOSS JOURNAL PHILOSOPHY ── */}
      <View style={[styles.ruleStrip, { borderColor: 'rgba(57,255,106,0.35)', backgroundColor: 'rgba(57,255,106,0.04)', flexDirection: 'column', alignItems: 'flex-start' }]}>
        <Text style={[styles.ruleTxt, { color: colors.primary, fontSize: 8, fontWeight: '800' }]}>
          THE CHINEDU WAY · HOW YOU LOG A LOSS
        </Text>
        <Text style={[styles.ruleTxt, { marginTop: 4, fontSize: 9.5, lineHeight: 14.5 }]}>
          1. RECORD & WATCH: Watch your match tape back. Don't look away from what went wrong.
          {'\n'}2. PEN TO PAPER: There is a special connection a biro has to a book that cannot be typed. Pen the unusual things and mistake patterns on paper first.
          {'\n'}3. 24–30 MIN COOL-DOWN: Never log while tilted. Let your mind cool down for 24–30 minutes after full time.
          {'\n'}4. LOG TO DATABASE: Once your head has cooled, open the app and type your one honest line into your database.
          {'\n\n'}In a world looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Tech is meant to elevate and not make you dormant.
        </Text>
      </View>

      {/* ── composer: what killed you? ── */}
      <View style={styles.composer}>
        <Text style={styles.composerEyebrow}>LOST ONE? ONE HONEST LINE:</Text>
        <View style={styles.chipRow}>
          {LOSS_TAGS.map((t) => (
            <Pressable key={t} onPress={() => setTag(t)} style={[styles.chip, tag === t && styles.chipActive]}>
              <Text style={[styles.chipTxt, tag === t && styles.chipTxtActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="what killed you? keep it to one line…"
            placeholderTextColor="#3d5445"
            style={styles.input}
            maxLength={LOSS_LINE_LIMIT}
            onSubmitEditing={logLine}
            returnKeyType="send"
          />
          <Pressable
            onPress={logLine}
            disabled={!isValidReflection(text, { minLength: 4, minWords: 2 })}
            style={[styles.logBtn, !isValidReflection(text, { minLength: 4, minWords: 2 }) && { opacity: 0.4 }]}
            hitSlop={6}
          >
            <SendIcon size={14} color="#0a0f0a" />
            <Text style={styles.logBtnTxt}>LOG IT</Text>
          </Pressable>
        </View>
        <HonestyMeter
          text={text}
          options={{ minLength: 4, minWords: 2 }}
          defaultNote="PEN TO PAPER FIRST · COOL DOWN FOR 24–30 MINS · ONE HONEST LINE"
          coachId={coach.id}
        />
      </View>

      {/* coach acknowledgement after logging */}
      {ack && (
        <Animated.View entering={FadeInUp.duration(250)} style={styles.ackCard}>
          <Image source={coach.portrait} style={styles.ackAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ackText}>"{ack}"</Text>
            <Text style={styles.ackBy}>— {coach.name.split(' ')[0].toUpperCase()} READS EVERY LINE</Text>
          </View>
        </Animated.View>
      )}

      {/* rule strip */}
      <View style={styles.ruleStrip}>
        <JournalIcon size={13} color="#57d07c" />
        <Text style={styles.ruleTxt}>THE CHINEDU WAY — PEN YOUR LOSS ON PAPER FIRST, COOL DOWN FOR 24–30 MINS, THEN TYPE YOUR ONE HONEST LINE INTO YOUR DATABASE</Text>
      </View>

      {/* entries */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {j.entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>NO LINES YET</Text>
            <Text style={styles.emptyBody}>
              {coach.id === 'chinedu'
                ? 'The first line is the hardest to write. Lose, then come back here and write it.'
                : 'Nothing here yet, and that is alright. When one slips away, one small line — that is all he asks.'}
            </Text>
          </View>
        )}
        {groups.map((g) => (
          <View key={g.label}>
            <Text style={styles.dayLabel}>{g.label}</Text>
            {g.items.map((e, idx) => (
              <Animated.View key={e.id} entering={FadeInUp.delay(Math.min(idx * 50, 300)).duration(240)} style={styles.entry}>
                <Text style={styles.entryNo}>#{String(j.total - j.entries.indexOf(e)).padStart(3, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryText}>"{e.text}"</Text>
                  <View style={styles.entryMetaRow}>
                    <View style={styles.entryTag}>
                      <Text style={styles.entryTagTxt}>{e.tag}</Text>
                    </View>
                    <Text style={styles.entryTime}>
                      {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => removeEntry(e.id)} hitSlop={8} style={styles.entryDel}>
                  <XMarkIcon size={9} color="rgba(224,96,92,0.75)" />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* back */}
      <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingTop: 50, paddingHorizontal: 16 },

  headerWrap: { alignItems: 'center' },
  eyebrow: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2.4, color: colors.muted },
  title: { marginTop: 6, fontSize: 20, fontWeight: '900', letterSpacing: 4.5, color: colors.fg },
  subtitle: { marginTop: 4, fontFamily: monoFont, fontSize: 6.4, fontWeight: '700', letterSpacing: 1.8, color: colors.muted },

  statStrip: {
    flexDirection: 'row', marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)', borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.82)',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  statCellBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(57,255,106,0.14)' },
  streakCell: { gap: 4 },
  statValue: { fontSize: 14.5, fontWeight: '900', color: colors.primary },
  statLabel: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '700', letterSpacing: 1.4, color: colors.muted },

  composer: {
    marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 14,
    backgroundColor: 'rgba(15,26,19,0.85)', padding: 13,
  },
  composerEyebrow: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2, color: colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', backgroundColor: 'rgba(10,15,10,0.5)',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  chipTxt: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.2, color: colors.muted },
  chipTxtActive: { color: colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 },
  input: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.fg,
    fontFamily: monoFont, fontSize: 9.5, letterSpacing: 0.4, backgroundColor: 'rgba(10,15,10,0.6)',
  },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10,
  },
  logBtnTxt: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.6, color: '#0a0f0a' },
  limit: { marginTop: 7, textAlign: 'right', fontFamily: monoFont, fontSize: 5.6, fontWeight: '700', letterSpacing: 1.4, color: '#42584a' },

  ackCard: {
    marginTop: 12, flexDirection: 'row', gap: 11, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 13,
    backgroundColor: 'rgba(57,255,106,0.07)', padding: 12,
  },
  ackAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.primary },
  ackText: { fontSize: 11, fontStyle: 'italic', lineHeight: 17, color: '#d8e6da' },
  ackBy: { marginTop: 4, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.6, color: colors.primary },

  ruleStrip: {
    marginTop: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 9,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.16)', borderRadius: 11,
    backgroundColor: 'rgba(15,26,19,0.6)', paddingHorizontal: 12, paddingVertical: 9,
  },
  ruleTxt: { flex: 1, fontFamily: monoFont, fontSize: 5.8, fontWeight: '700', letterSpacing: 1.2, lineHeight: 10, color: colors.muted },

  dayLabel: { marginTop: 14, marginBottom: 7, fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2.4, color: colors.muted },
  entry: {
    flexDirection: 'row', gap: 11, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.16)', borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.78)',
  },
  entryNo: { fontFamily: monoFont, fontSize: 7, fontWeight: '800', letterSpacing: 1, color: '#42584a', marginTop: 2 },
  entryText: { fontSize: 12, fontStyle: 'italic', lineHeight: 18, color: '#dde7de' },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  entryTag: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)', backgroundColor: 'rgba(242,192,120,0.06)',
  },
  entryTagTxt: { fontFamily: monoFont, fontSize: 5.4, fontWeight: '800', letterSpacing: 1.2, color: colors.warm },
  entryTime: { fontFamily: monoFont, fontSize: 6, fontWeight: '700', letterSpacing: 1.2, color: '#42584a' },
  entryDel: {
    width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(224,96,92,0.3)', alignSelf: 'center',
  },

  empty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 3, color: colors.muted },
  emptyBody: { marginTop: 10, fontFamily: monoFont, fontSize: 8, lineHeight: 14, letterSpacing: 0.6, color: '#77907f', textAlign: 'center' },

  backBtn: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
