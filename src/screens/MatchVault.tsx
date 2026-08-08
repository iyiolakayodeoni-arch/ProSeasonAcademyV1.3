import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import { colors, monoFont, displayFont, bodyFont, bodyFontHeavy } from '../theme';

// the match moment — the vault's face: receipts are earned under these lights
const VAULT_ART = require('../../assets/art/vault-match.jpg');
import { Coach } from '../data/coaches';
import {
  MATCH_MODES,
  OPP_STYLES,
  MatchDraft,
  MatchMode,
  OppStyle,
  DecisiveWindow,
  addMatch,
  clampGoals,
  describeMatch,
  removeMatch,
  resultOf,
  useMatches,
} from '../data/matches';
import { dayLabel } from '../data/journal';
import HonestyBadge from '../components/HonestyBadge';
import { isValidReflection } from '../data/honestyGuard';

// MANUAL BY DESIGN — we do not watch or tag your match for you.
// Record your match as usual, watch it back, and note key moments yourself.
// Manual observation and reporting is where mental resilience is forged.
const COMPOSURE_LABELS = ['TILTED', 'SHOOK', 'OKAY', 'CALM', 'ICE IN VEINS'];
const MIND_FRAME: Record<string, string> = {
  chinedu:
    'There is a special connection a biro has to a book that cannot be typed, little bro. Record your match as usual, watch your tape, and write your key moments on paper. Cool down for 30 minutes after full time, then type your truth into your database. Tech is meant to elevate and not make you dormant — that is the Chinedu Way.',
};
import {
  CheckIcon,
  ChevronLeftIcon,
  EyeIcon,
  FlameIcon,
  GamepadIcon,
  RouteIcon,
  XMarkIcon,
} from '../components/Icons';

// ─────────────────────────────────────────────────────────────
// MATCH HISTORY SCREEN — the front door of the match-scan backend.
// Log the truth in ~15 seconds: score, mode, their style, and
// (on your honor) the rules you kept. The scan grades THIS vault.
// Composer on top, log below, newest first, stats strip on top.
// ─────────────────────────────────────────────────────────────

const DECISIVE_OPTIONS: { key: DecisiveWindow; label: string }[] = [
  { key: 'EARLY', label: 'BEFORE 60’' },
  { key: 'AFTER 60', label: '60’–79’' },
  { key: 'AFTER 80', label: '80’+' },
];

function Stepper({ value, onChange, min, max, accent }: { value: number; onChange: (n: number) => void; min: number; max: number; accent?: boolean }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnTxt}>−</Text>
      </Pressable>
      <Text style={[styles.stepValue, accent && { color: colors.primary }]}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnTxt}>+</Text>
      </Pressable>
    </View>
  );
}

export default function MatchVault({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const v = useMatches();
  const coachFirst = coach.name.split(' ')[0].toUpperCase();
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  // ── composer state ──
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [mode, setMode] = useState<MatchMode>('RANKED');
  const [style, setStyle] = useState<OppStyle>('LOW BLOCK');
  const [passAcc, setPassAcc] = useState<number | null>(null);
  const [noSprint, setNoSprint] = useState(false);
  const [mechanics, setMechanics] = useState(0);
  const [ledAt75, setLedAt75] = useState(false);
  const [decisive, setDecisive] = useState<DecisiveWindow | null>(null);
  const [ack, setAck] = useState<string | null>(null);
  // ── THE MIND (yours by design) ──
  const [composure, setComposure] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const result = resultOf({ gf, ga });
  const isWin = result === 'W';

  const logMatch = () => {
    const draft: MatchDraft = {
      gf: clampGoals(gf),
      ga: clampGoals(ga),
      mode,
      oppStyle: style,
      passAcc,
      noSprint,
      mechanicsUsed: mechanics,
      ledAt75: isWin ? ledAt75 : null,
      decisive: isWin ? decisive : null,
      // THE MIND — the part only you can fill in (by design)
      composure,
      note: note.trim() ? note : null,
    };
    addMatch(draft, 'manual');
    setComposure(null);
    setNote('');
    // chain-logging: scores reset, mode/style stay (same session, same ladder)
    setGf(0);
    setGa(0);
    setPassAcc(null);
    setNoSprint(false);
    setMechanics(0);
    setLedAt75(false);
    setDecisive(null);
    setAck(
      result === 'L'
        ? coach.id === 'chinedu'
          ? 'A loss you log is worth ten you hide. Loss note next — the rule is the rule.'
          : 'It happens, little one. Write the one line, breathe, then forward.'
        : coach.id === 'chinedu'
          ? 'Logged. Winning is a habit — keep the receipts coming.'
          : 'Well done, little one. Enjoy it — then we go again.',
    );
    setTimeout(() => setAck(null), 6000);
  };

  // day-grouped log
  const groups = useMemo(() => {
    const out: { label: string; items: typeof v.matches }[] = [];
    for (const m of v.matches) {
      const label = dayLabel(m.at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(m);
      else out.push({ label, items: [m] });
    }
    return out;
  }, [v.matches]);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      <GridBackground />

      {/* the match band — the vault's face: every receipt below was earned here */}
      <ArtBand
        source={VAULT_ART}
        width={bandW}
        height={158}
        warmAt={{ x: bandW * 0.22, y: 44, r: bandW * 0.55 }}
        style={{ marginTop: -50, marginHorizontal: -16 }}
      >
        <Text style={styles.eyebrow}>{coachFirst} GRADES WHAT YOU LOG</Text>
        <Text style={styles.bandTitle}>MATCH HISTORY</Text>
        <Text style={styles.subtitle}>HONOR-SYSTEM INGEST — MANUAL CONSOLE LOG</Text>
      </ArtBand>

      {/* stats */}
      <View style={styles.statStrip}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{v.played}</Text>
          <Text style={styles.statLabel}>LOGGED</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder]}>
          <Text style={styles.statValue}>
            {v.w}<Text style={styles.statDim}>–</Text>{v.d}<Text style={styles.statDim}>–</Text>{v.l}
          </Text>
          <Text style={styles.statLabel}>W·D·L</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder]}>
          <Text style={styles.statValue}>
            {v.gf}<Text style={styles.statDim}>:</Text>{v.ga}
          </Text>
          <Text style={styles.statLabel}>GOALS</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder]}>
          {v.winStreak > 0 && <FlameIcon size={12} color={colors.accent} />}
          <Text style={[styles.statValue, v.winStreak > 0 && { color: colors.accent }]}>
            {v.winStreak > 0 ? v.winStreak : v.cleanSheets}
          </Text>
          <Text style={styles.statLabel}>{v.winStreak > 0 ? 'WIN STREAK' : 'CLEAN SHEETS'}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 26 }} showsVerticalScrollIndicator={false}>
        {/* ── THE CHINEDU WAY: PEN TO PAPER & MANUAL OBSERVATION PHILOSOPHY ── */}
        <View style={styles.watchCard}>
          <View style={styles.watchHead}>
            <GamepadIcon size={14} color={colors.primary} />
            <Text style={styles.watchTitle}>YOUR REVIEW ROUTINE — PEN TO PAPER BEFORE YOU TYPE</Text>
          </View>
          <Text style={styles.watchTagline}>THE HARD WAY IS THE EASY WAY · TECH IS MEANT TO ELEVATE</Text>
          <Text style={styles.watchNote}>
            Watch your match back. Pen the key moments, cool down 30 minutes, then type your truth in. The hard way is the easy way — tech should elevate you, never make you dormant.
          </Text>
        </View>

        {/* ── composer ── */}
        <View style={styles.composer}>
          <Text style={styles.composerEyebrow}>FULL-TIME — LOG THE MATCH:</Text>

          {/* score steppers */}
          <View style={styles.scoreRow}>
            <View style={styles.scoreSide}>
              <Text style={styles.scoreLabel}>YOU</Text>
              <Stepper value={gf} onChange={setGf} min={0} max={9} accent={isWin} />
            </View>
            <View style={[styles.resultPill, result === 'W' && styles.pillW, result === 'D' && styles.pillD, result === 'L' && styles.pillL]}>
              <Text style={styles.resultPillTxt}>{result}</Text>
            </View>
            <View style={styles.scoreSide}>
              <Text style={styles.scoreLabel}>THEM</Text>
              <Stepper value={ga} onChange={setGa} min={0} max={9} accent={result === 'L'} />
            </View>
          </View>

          {/* mode */}
          <Text style={styles.fieldLabel}>MODE</Text>
          <View style={styles.chipRow}>
            {MATCH_MODES.map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[styles.chip, mode === m && styles.chipActive]}>
                <Text style={[styles.chipTxt, mode === m && styles.chipTxtActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          {/* their style */}
          <Text style={styles.fieldLabel}>THEIR GAME — WHAT DID YOU FACE?</Text>
          <View style={styles.chipRow}>
            {OPP_STYLES.map((s) => (
              <Pressable key={s} onPress={() => setStyle(s)} style={[styles.chip, style === s && styles.chipActive]}>
                <Text style={[styles.chipTxt, style === s && styles.chipTxtActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          {/* pass accuracy — read off the post-match screen */}
          <View style={styles.inlineRow}>
            <Text style={styles.inlineLabel}>PASS ACCURACY — OFF THE POST-MATCH SCREEN</Text>
            <View style={styles.inlineCtrl}>
              {passAcc != null ? (
                <>
                  <Pressable onPress={() => setPassAcc((p) => (p != null && p > 50 ? p - 5 : p))} hitSlop={8} style={styles.miniBtn}>
                    <Text style={styles.miniBtnTxt}>−</Text>
                  </Pressable>
                  <Pressable onPress={() => setPassAcc(null)} hitSlop={6}>
                    <Text style={styles.passVal}>{passAcc}%</Text>
                  </Pressable>
                  <Pressable onPress={() => setPassAcc((p) => (p != null && p < 95 ? p + 5 : p))} hitSlop={8} style={styles.miniBtn}>
                    <Text style={styles.miniBtnTxt}>+</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => setPassAcc(70)} style={styles.chip} hitSlop={6}>
                  <Text style={styles.chipTxt}>ADD IT</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* self-cert — honor chips */}
          <Text style={styles.fieldLabel}>ON YOUR HONOR — {coachFirst} TRUSTS THE LEDGER</Text>
          <View style={styles.chipRow}>
            <Pressable onPress={() => setNoSprint((p) => !p)} style={[styles.chip, noSprint && styles.chipActive]}>
              <Text style={[styles.chipTxt, noSprint && styles.chipTxtActive]}>{noSprint ? '✓ ' : ''}NO-SPRINT RULE KEPT</Text>
            </Pressable>
          </View>
          <View style={styles.inlineRow}>
            <Text style={styles.inlineLabel}>TAUGHT MECHANICS USED</Text>
            <View style={styles.inlineCtrl}>
              {[0, 1, 2, 3].map((n) => (
                <Pressable key={n} onPress={() => setMechanics(n)} style={[styles.numChip, mechanics === n && styles.numChipActive]}>
                  <Text style={[styles.numChipTxt, mechanics === n && styles.numChipTxtActive]}>{n === 3 ? '3+' : n}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* winner detail — only on a W */}
          {isWin && (
            <>
              <View style={styles.inlineRow}>
                <Text style={styles.inlineLabel}>YOUR WINNER WENT IN…</Text>
                <View style={styles.inlineCtrl}>
                  {DECISIVE_OPTIONS.map((d) => (
                    <Pressable key={d.key} onPress={() => setDecisive(decisive === d.key ? null : d.key)} style={[styles.chip, decisive === d.key && styles.chipGold]}>
                      <Text style={[styles.chipTxt, decisive === d.key && { color: colors.accent }]}>{d.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.chipRowLast}>
                <Pressable onPress={() => setLedAt75((p) => !p)} style={[styles.chip, ledAt75 && styles.chipActive]}>
                  <Text style={[styles.chipTxt, ledAt75 && styles.chipTxtActive]}>{ledAt75 ? '✓ ' : ''}LEADING AT 75’ — CLOSED IT OUT</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── THE MIND — yours by design ── */}
          <View style={styles.mindBox}>
            <Text style={styles.mindTitle}>THE MIND — THE PART THE MACHINE CANNOT SCAN</Text>
            <Text style={styles.mindFrame}>{MIND_FRAME[coach.id] ?? MIND_FRAME.chinedu}</Text>

            <Text style={styles.fieldLabel}>YOUR HEAD, FULL 90 — HOW WAS IT?</Text>
            <View style={styles.chipRow}>
              {COMPOSURE_LABELS.map((label, i) => (
                <Pressable
                  key={label}
                  onPress={() => setComposure(composure === i + 1 ? null : i + 1)}
                  style={[styles.chip, composure === i + 1 && styles.chipActive]}
                >
                  <Text style={[styles.chipTxt, composure === i + 1 && styles.chipTxtActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>ONE LINE — WHAT ACTUALLY HAPPENED / WHAT WERE YOU THINKING?</Text>
            <TextInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, 140))}
              placeholder="e.g. TILTED AFTER 2–0 DOWN, CHASED THE GAME, LEFT THE BACK OPEN"
              placeholderTextColor={colors.muted}
              style={styles.mindInput}
              multiline
              maxLength={140}
            />
            <HonestyBadge
              text={note}
              options={{ minLength: 3, minWords: 2 }}
              defaultNote="THIS LINE IS YOURS — YOUR WORDS, YOUR ACCOUNTABILITY"
              coachId={coach.id}
            />
          </View>

          <Pressable
            onPress={logMatch}
            disabled={!!(note.trim() && !isValidReflection(note, { minLength: 3, minWords: 2 }))}
            style={({ pressed }) => [
              styles.logBtn,
              !!(note.trim() && !isValidReflection(note, { minLength: 3, minWords: 2 })) && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <CheckIcon size={10} color="#0a0f0a" />
            <Text style={styles.logBtnTxt}>LOG MATCH — {result} {gf}–{ga}</Text>
          </Pressable>
          <Text style={styles.honor}>
            CONSOLE MATCHES ARE LOGGED BY YOU — YOUR MATCH HISTORY IS ON YOUR HONOR, AND THE SCAN ONLY GRADES WHAT'S LOGGED.
          </Text>
        </View>

        {/* coach ack after logging */}
        {ack && (
          <Animated.View entering={FadeInUp.duration(250)} style={styles.ackCard}>
            <Image source={coach.portrait} style={styles.ackAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ackText}>"{ack}"</Text>
              <Text style={styles.ackBy}>— {coachFirst} READS YOUR MATCH HISTORY HIMSELF</Text>
            </View>
          </Animated.View>
        )}

        {/* rule strip */}
        <View style={styles.ruleStrip}>
          <GamepadIcon size={13} color="#57d07c" />
          <Text style={styles.ruleTxt}>YOUR MATCH HISTORY FEEDS THE REVIEW — YOUR PROGRESS MOVES WHEN THIS RECORD GROWS</Text>
        </View>

        {/* the log */}
        {v.matches.length === 0 && (
          <View style={styles.empty}>
            <RouteIcon size={18} color="rgba(143,184,155,0.5)" />
            <Text style={styles.emptyTitle}>NO MATCHES SAVED YET</Text>
            <Text style={styles.emptyBody}>
              {coach.id === 'chinedu'
                ? 'Play one. Come back, log it honest — 0–4 teaches more than a fake 5–0 ever will.'
                : 'Play one match, then tell the vault the truth. That is all the scan asks, little one.'}
            </Text>
          </View>
        )}
        {groups.map((g) => (
          <View key={g.label}>
            <Text style={styles.dayLabel}>{g.label}</Text>
            {g.items.map((m, idx) => {
              const r = resultOf(m);
              return (
                <Animated.View key={m.id} entering={FadeInUp.delay(Math.min(idx * 45, 250)).duration(220)} style={styles.entry}>
                  <View style={[styles.resultDot, r === 'W' && styles.dotW, r === 'D' && styles.dotD, r === 'L' && styles.dotL]}>
                    <Text style={styles.resultDotTxt}>{r}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryScore}>
                      {m.gf}–{m.ga} <Text style={styles.entryMode}>{m.mode}</Text>
                    </Text>
                    <Text style={styles.entryMeta} numberOfLines={1}>
                      VS {m.oppStyle}
                      {m.mechanicsUsed > 0 ? ` · ${m.mechanicsUsed}${m.mechanicsUsed === 3 ? '+' : ''} MECH` : ''}
                      {m.noSprint ? ' · NO-SPRINT' : ''}
                      {m.passAcc != null ? ` · ${m.passAcc}% PA` : ''}
                      {m.decisive && m.decisive !== 'EARLY' ? ` · WINNER ${m.decisive}` : ''}
                    </Text>
                    {m.composure != null && (
                      <Text style={styles.entryMind}>
                        HEAD: {COMPOSURE_LABELS[m.composure - 1]}
                      </Text>
                    )}
                    {m.note ? (
                      <Text style={styles.entryNote} numberOfLines={2}>“{m.note}”</Text>
                    ) : null}
                    <Text style={styles.entryTime}>
                      {new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — VIA HONOR LOG
                    </Text>
                  </View>
                  <Pressable onPress={() => removeMatch(m.id)} hitSlop={8} style={styles.entryDel}>
                    <XMarkIcon size={9} color="rgba(224,96,92,0.75)" />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}

        {/* how the scan reads it */}
        <View style={styles.eyeNote}>
          <EyeIcon size={11} color={colors.muted} />
          <Text style={styles.eyeNoteTxt}>
            {v.lastMatch ? `LAST MATCH SAVED — ${describeMatch(v.lastMatch)}` : 'THE REVIEW READS YOUR SAVED MATCHES, NOT YOUR MEMORY'}
          </Text>
        </View>
      </ScrollView>

      {/* back */}
      <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  watchCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  watchHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  watchTitle: { color: colors.fg, fontFamily: bodyFontHeavy, fontSize: 12, letterSpacing: 0.6, flex: 1 },
  watchTagline: { color: colors.accent, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.2, lineHeight: 13 },
  watchLive: {
    color: '#0a0f0a',
    backgroundColor: colors.primary,
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 1.4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  watchNote: { marginTop: 7, color: '#c4d4c8', fontFamily: bodyFont, fontSize: 12.5, lineHeight: 18 },
  watchErr: { color: colors.loss, fontFamily: monoFont, fontSize: 10 },
  watchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexGrow: 1,
  },
  watchBtnTxt: { color: '#0a0f0a', fontFamily: monoFont, fontSize: 11, letterSpacing: 1.4, fontWeight: '700' },
  watchBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  watchBtnGhostTxt: { color: colors.fg },
  watchBtnRow: { flexDirection: 'row', gap: 10 },
  watchScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  watchScoreLabel: { color: colors.muted, fontFamily: monoFont, fontSize: 10, letterSpacing: 1.6 },
  watchScoreValue: { color: colors.primary, fontFamily: monoFont, fontSize: 30, fontWeight: '700' },
  watchScoreDim: { color: colors.muted, fontSize: 22 },
  watchMeta: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 1.2, textAlign: 'center' },
  watchEvent: { color: colors.accent, fontFamily: monoFont, fontSize: 10, letterSpacing: 0.8, textAlign: 'center' },
  watchPrefillNote: { color: colors.accent, fontFamily: monoFont, fontSize: 9, letterSpacing: 1.2, marginBottom: 8 },
  mindBox: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 4 },
  mindTitle: { color: colors.fg, fontFamily: monoFont, fontSize: 11, letterSpacing: 1.6 },
  mindFrame: { color: colors.warm, fontFamily: monoFont, fontSize: 9.5, lineHeight: 15, letterSpacing: 0.4, marginTop: 6, marginBottom: 4 },
  mindInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0a0f0a',
    borderRadius: 10,
    color: colors.fg,
    fontFamily: monoFont,
    fontSize: 11,
    padding: 10,
    minHeight: 54,
    textAlignVertical: 'top',
  },
  entryMind: { color: colors.warm, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.2, marginTop: 3 },
  entryNote: { color: colors.fg, fontFamily: monoFont, fontSize: 9.5, lineHeight: 14, marginTop: 3, fontStyle: 'italic' },
  mindCount: { color: colors.muted, fontFamily: monoFont, fontSize: 8, letterSpacing: 1, textAlign: 'right', marginTop: 2 },

  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingTop: 50, paddingHorizontal: 16 },

  eyebrow: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2.4, color: colors.primary },
  bandTitle: { marginTop: 5, fontFamily: displayFont, fontSize: 31, lineHeight: 31, letterSpacing: 0.8, color: colors.fg, textShadowColor: 'rgba(57,255,106,0.5)', textShadowRadius: 10 },
  subtitle: { marginTop: 7, fontFamily: monoFont, fontSize: 6, fontWeight: '700', letterSpacing: 1.6, color: 'rgba(238,242,236,0.85)' },

  statStrip: {
    flexDirection: 'row', marginTop: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)', borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.82)',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  statCellBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(57,255,106,0.14)' },
  statValue: { fontSize: 14, fontWeight: '900', color: colors.primary },
  statDim: { color: 'rgba(143,184,155,0.55)', fontSize: 11 },
  statLabel: { fontFamily: monoFont, fontSize: 5.4, fontWeight: '700', letterSpacing: 1.2, color: colors.muted },

  composer: {
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 14,
    backgroundColor: 'rgba(15,26,19,0.85)', padding: 13,
  },
  composerEyebrow: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2, color: colors.primary },

  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  scoreSide: { alignItems: 'center', gap: 5, width: 118 },
  scoreLabel: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '800', letterSpacing: 2.4, color: colors.muted },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 11,
    backgroundColor: 'rgba(10,15,10,0.6)', paddingHorizontal: 4, paddingVertical: 4,
  },
  stepBtn: { width: 27, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(57,255,106,0.07)' },
  stepBtnTxt: { fontSize: 15, fontWeight: '800', color: colors.primary, marginTop: -1 },
  stepValue: { width: 30, textAlign: 'center', fontSize: 17, fontWeight: '900', color: colors.fg },
  resultPill: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.4, borderColor: 'rgba(143,184,155,0.4)',
  },
  pillW: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.1)', shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  pillD: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.08)' },
  pillL: { borderColor: colors.loss, backgroundColor: 'rgba(224,96,92,0.09)' },
  resultPillTxt: { fontSize: 15, fontWeight: '900', color: colors.fg },

  fieldLabel: { marginTop: 13, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.8, color: colors.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chipRowLast: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', backgroundColor: 'rgba(10,15,10,0.5)',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  chipGold: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.09)' },
  chipTxt: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.2, color: colors.muted },
  chipTxtActive: { color: colors.primary },

  inlineRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  inlineLabel: { flex: 1, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.4, lineHeight: 10, color: colors.muted },
  inlineCtrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBtn: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', backgroundColor: 'rgba(57,255,106,0.06)' },
  miniBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.primary, marginTop: -1 },
  passVal: { width: 44, textAlign: 'center', fontSize: 13, fontWeight: '900', color: colors.fg },
  numChip: {
    width: 28, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', backgroundColor: 'rgba(10,15,10,0.5)',
  },
  numChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.14)' },
  numChipTxt: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: colors.muted },
  numChipTxtActive: { color: colors.primary },

  logBtn: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13,
    shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  logBtnTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.8, color: '#0a0f0a' },
  honor: { marginTop: 9, fontFamily: monoFont, fontSize: 5.4, lineHeight: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center', color: '#42584a' },

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
    flexDirection: 'row', gap: 11, padding: 12, marginBottom: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.16)', borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.78)',
  },
  resultDot: { width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2 },
  dotW: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  dotD: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.09)' },
  dotL: { borderColor: colors.loss, backgroundColor: 'rgba(224,96,92,0.1)' },
  resultDotTxt: { fontSize: 8.5, fontWeight: '900', color: colors.fg },
  entryScore: { fontSize: 13.5, fontWeight: '900', letterSpacing: 1.2, color: '#dde7de' },
  entryMode: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.6, color: colors.primary },
  entryMeta: { marginTop: 3, fontFamily: monoFont, fontSize: 5.6, fontWeight: '700', letterSpacing: 1, color: colors.muted },
  entryTime: { marginTop: 3, fontFamily: monoFont, fontSize: 5.2, fontWeight: '700', letterSpacing: 1, color: '#42584a' },
  entryDel: {
    width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(224,96,92,0.3)',
  },

  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 10, fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 3, color: colors.muted },
  emptyBody: { marginTop: 10, fontFamily: monoFont, fontSize: 8, lineHeight: 14, letterSpacing: 0.6, color: '#77907f', textAlign: 'center' },

  eyeNote: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center' },
  eyeNoteTxt: { fontFamily: monoFont, fontSize: 5.4, fontWeight: '700', letterSpacing: 1.2, color: colors.muted },

  backBtn: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
