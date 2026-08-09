import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import {
  CheckIcon,
  ChevronRightIcon,
  EyeIcon,
  JournalIcon,
  RefreshGlyphIcon,
  RouteIcon,
  ScanGlyphIcon,
  TrashIcon,
} from '../components/Icons';
import { Coach } from '../data/coaches';
import { useSettings } from '../data/settings';
import { useMatches } from '../data/matches';
import { useJournal } from '../data/journal';
import MatchVault from './MatchVault';
import LossJournal from './LossJournal';
import MarketingShareCard from '../components/MarketingShareCard';
import { JourneyStage } from '../data/journey';
import { useCloud } from '../data/cloudSync';
import PlayerCard from '../components/PlayerCard';
import StatRing from '../components/StatRing';
import { playerCardData, evidenceFromVault } from '../data/playerCard';
import { useJourneyProgress } from '../data/progress';
import { useLessonThread } from '../data/lessonThread';
import {
  addBenchmarkCheckpoint,
  benchmarkGap,
  benchmarkIdentity,
  benchmarkMatchComplete,
  benchmarkProofStamp,
  BENCHMARK_CYCLE_MONTHS,
  BENCHMARK_MATCH_TARGET,
  BenchmarkDraftMatch,
  BenchmarkGap,
  BenchmarkSnapshot,
  compareBenchmarkSummaries,
  createDraftBenchmarkMatches,
  DEMO_BENCHMARK_SET,
  removeBenchmarkCheckpoint,
  summariseBenchmarkMatches,
  useBenchmarkTracker,
} from '../data/benchmarkTracker';
import {
  bodyFont,
  bodyFontBold,
  bodyFontHeavy,
  colors,
  displayFont,
  monoFont,
} from '../theme';
import { PSA_OCR_URL } from '../config';
import { fieldsForOcrSide, OcrSide, parseStatsFromPastedText, scanStatsScreenshot, StatsScreenOcrResult } from '../data/statsScreenOcr';
import {
  buildComparisonPosterSvg,
  buildShareCardSvg,
  downloadPngAsset,
  downloadSvgAsset,
} from '../data/shareCard';
import {
  pullBenchmarkSnapshotsFromCloud,
  removeBenchmarkSnapshotFromCloud,
  syncBenchmarkSnapshot,
  syncUnsyncedBenchmarkSnapshots,
} from '../data/benchmarkCloud';

// the walkout tunnel stays — but the meaning changes: this is no longer a
// forward stage map. It is the place where evidence is filed and read.
const TUNNEL = require('../../assets/art/journey-tunnel.jpg');

type Sheet = 'vault' | 'journal' | null;
type NumericField = Exclude<
  keyof BenchmarkDraftMatch,
  'id' | 'screenshotName' | 'screenshotUri'
>;
type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

const FIELD_ORDER: { key: NumericField; label: string; suffix?: string; max: number }[] = [
  { key: 'gf', label: 'GF', max: 20 },
  { key: 'ga', label: 'GA', max: 20 },
  { key: 'possession', label: 'POSS', suffix: '%', max: 100 },
  { key: 'shots', label: 'SHOTS', max: 50 },
  { key: 'shotsOnTarget', label: 'ON TARGET', max: 50 },
  { key: 'passAccuracy', label: 'PASS', suffix: '%', max: 100 },
  { key: 'tacklesWon', label: 'TACKLES', max: 50 },
  { key: 'saves', label: 'SAVES', max: 20 },
];

const BENCHMARK_REFERENCE = [
  'HONEST BASELINE',
  'EMOTIONAL CONTROL',
  'PATTERN READING',
  'ROUTINE',
  'COMPETITIVE CALM',
  'PROOF',
];

function clampDraftValue(key: NumericField, raw: number): number {
  const def = FIELD_ORDER.find((field) => field.key === key);
  return Math.max(0, Math.min(def?.max ?? 100, Math.round(raw)));
}

function monthLabel(snapshot: Pick<BenchmarkSnapshot, 'cycle' | 'month'>): string {
  return snapshot.cycle > 1
    ? `CYCLE ${snapshot.cycle} · MONTH ${snapshot.month}`
    : `MONTH ${snapshot.month}`;
}

function shortDate(at: number): string {
  return new Date(at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function signed(value: number, decimals = 1): string {
  const shown = Math.abs(value) < 0.05 ? 0 : value;
  return `${shown > 0 ? '+' : shown < 0 ? '−' : ''}${Math.abs(shown).toFixed(decimals)}`;
}

function StepTile({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.inputTile}>
      <Text style={styles.inputTileLabel}>{label}</Text>
      <View style={styles.inputValueRow}>
        <TextInput
          keyboardType="numeric"
          value={value == null ? '' : String(value)}
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor="rgba(143,184,155,0.4)"
          style={styles.inputTileValue}
        />
        {!!suffix && <Text style={styles.inputTileSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

function MonthRail({ filled, total }: { filled: number; total: number }) {
  return (
    <View style={styles.monthRailRow}>
      {Array.from({ length: total }).map((_, index) => {
        const active = index < filled;
        return (
          <View key={index} style={[styles.monthRailPill, active && styles.monthRailPillOn]}>
            <Text style={[styles.monthRailTxt, active && styles.monthRailTxtOn]}>{index + 1}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.kpiCell}>
      <Text style={[styles.kpiValue, accent && { color: colors.accent }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function DeltaPill({
  label,
  value,
  betterWhenLower,
}: {
  label: string;
  value: number;
  betterWhenLower?: boolean;
}) {
  const improved = betterWhenLower ? value < 0 : value > 0;
  const worse = betterWhenLower ? value > 0 : value < 0;
  return (
    <View
      style={[
        styles.deltaPill,
        improved && styles.deltaPillGood,
        worse && styles.deltaPillBad,
      ]}
    >
      <Text style={styles.deltaLabel}>{label}</Text>
      <Text
        style={[
          styles.deltaValue,
          improved && { color: colors.primary },
          worse && { color: colors.loss },
        ]}
      >
        {signed(value)}
      </Text>
    </View>
  );
}

function TrendRow({ label, value, betterWhenLower }: { label: string; value: number; betterWhenLower?: boolean }) {
  const improved = betterWhenLower ? value < 0 : value > 0;
  const worse = betterWhenLower ? value > 0 : value < 0;
  const arrow = improved ? '↑' : worse ? '↓' : '→';
  return (
    <View style={styles.trendRow}>
      <Text style={styles.trendLabel}>{label}</Text>
      <View style={styles.trendValueRow}>
        <Text style={[styles.trendArrow, improved && { color: colors.primary }, worse && { color: colors.loss }]}>{arrow}</Text>
        <Text style={[styles.trendValue, improved && { color: colors.primary }, worse && { color: colors.loss }]}>
          {signed(value)}
        </Text>
      </View>
    </View>
  );
}

function GapBar({ item }: { item: BenchmarkGap }) {
  const fill = `${Math.max(0, Math.min(100, item.player))}%`;
  return (
    <View style={styles.gapRow}>
      <View style={styles.gapHead}>
        <Text style={styles.gapLabel}>{item.label}</Text>
        <Text style={styles.gapNums}>{item.player}/{item.benchmark}</Text>
      </View>
      <View style={styles.gapTrack}>
        <View style={[styles.gapFill, { width: fill as any }]} />
      </View>
      <Text style={styles.gapNote}>{item.note} · GAP {Math.max(0, item.gap)}</Text>
    </View>
  );
}

function SnapshotCard({
  snapshot,
  compareTo,
  onRemove,
}: {
  snapshot: BenchmarkSnapshot;
  compareTo: BenchmarkSnapshot | null;
  onRemove: () => void;
}) {
  const delta = compareBenchmarkSummaries(snapshot.summary, compareTo?.summary ?? null);
  const identity = benchmarkIdentity(snapshot.summary);
  const proof = benchmarkProofStamp(snapshot.summary);
  return (
    <Animated.View entering={FadeInUp.duration(260)} style={styles.snapshotCard}>
      <View style={styles.snapshotTop}>
        <View>
          <Text style={styles.snapshotTag}>{snapshot.title}</Text>
          <Text style={styles.snapshotDate}>{snapshot.label} · {shortDate(snapshot.createdAt)}</Text>
          <Text style={[styles.snapshotSync, snapshot.syncedAt ? styles.snapshotSyncOn : null]}>
            {snapshot.syncedAt ? `SYNCED · ${shortDate(snapshot.syncedAt)}` : 'LOCAL ONLY'}
          </Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.iconBtn}>
          <TrashIcon size={12} color="rgba(224,96,92,0.9)" />
        </Pressable>
      </View>

      <View style={styles.snapshotProofRow}>
        <Text style={styles.snapshotProof}>{proof.label}</Text>
        <Text style={styles.snapshotProofSub}>{proof.evidenceLine}</Text>
      </View>
      <Text style={styles.snapshotStyle}>{snapshot.summary.style.label}</Text>
      <Text style={styles.snapshotRead}>{snapshot.summary.style.read}</Text>
      <View style={styles.snapshotIdentityRow}>
        <Text style={styles.snapshotIdentityChip}>{identity.secondaryTendency}</Text>
        <Text style={styles.snapshotIdentityChip}>{identity.temperament}</Text>
      </View>

      <View style={styles.snapshotKpis}>
        <Kpi label="W·D·L" value={`${snapshot.summary.wins}-${snapshot.summary.draws}-${snapshot.summary.losses}`} />
        <Kpi label="AVG GF" value={snapshot.summary.avgGoalsFor.toFixed(1)} />
        <Kpi label="AVG GA" value={snapshot.summary.avgGoalsAgainst.toFixed(1)} />
        <Kpi label="PASS" value={`${snapshot.summary.avgPassAccuracy.toFixed(1)}%`} accent />
      </View>

      <View style={styles.metricWrap}>
        <StatRing label="POSS" value={snapshot.summary.avgPossession} suffix="%" size={56} />
        <StatRing label="ON TARGET" value={snapshot.summary.avgShotsOnTarget} size={56} />
        <StatRing label="SHOT ACC" value={snapshot.summary.shotAccuracy} suffix="%" size={56} />
        <StatRing label="TACKLES" value={snapshot.summary.avgTacklesWon} size={56} />
      </View>

      {delta && (
        <>
          <Text style={styles.deltaTitle}>CHANGE VS PREVIOUS CHECKPOINT</Text>
          <View style={styles.deltaRow}>
            <DeltaPill label="PPM" value={delta.pointsPerMatch} />
            <DeltaPill label="GF" value={delta.avgGoalsFor} />
            <DeltaPill label="GA" value={delta.avgGoalsAgainst} betterWhenLower />
            <DeltaPill label="PASS" value={delta.avgPassAccuracy} />
          </View>
        </>
      )}

      <Text style={styles.snapshotFocus}>NEXT FOCUS · {snapshot.summary.style.focus}</Text>
    </Animated.View>
  );
}

export default function EvidenceTrackerScreen({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const tracker = useBenchmarkTracker();
  const cloud = useCloud();
  const settings = useSettings();
  const vault = useMatches();
  const journal = useJournal();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [draft, setDraft] = useState<BenchmarkDraftMatch[]>(() => createDraftBenchmarkMatches());
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [scanState, setScanState] = useState<Record<string, { status: ScanStatus; note: string }>>({});
  const [ocrSummary, setOcrSummary] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [cloudNote, setCloudNote] = useState<string | null>(null);
  const [playerSides, setPlayerSides] = useState<Record<string, OcrSide>>(() =>
    Object.fromEntries(createDraftBenchmarkMatches().map((match) => [match.id, 'left' as OcrSide])),
  );
  const [ocrCache, setOcrCache] = useState<Record<string, StatsScreenOcrResult>>({});
  const [ocrTextDrafts, setOcrTextDrafts] = useState<Record<string, string>>({});

  const completeCount = draft.filter(benchmarkMatchComplete).length;
  const liveSummary = useMemo(() => summariseBenchmarkMatches(draft), [draft]);
  const liveIdentity = useMemo(() => benchmarkIdentity(liveSummary), [liveSummary]);
  const liveGap = useMemo(() => benchmarkGap(liveSummary), [liveSummary]);
  const liveProof = useMemo(() => benchmarkProofStamp(liveSummary), [liveSummary]);
  const liveDelta = useMemo(
    () => compareBenchmarkSummaries(liveSummary, tracker.latest?.summary ?? null),
    [liveSummary, tracker.latest],
  );

  const nextMonth = ((tracker.nextCheckpoint - 1) % BENCHMARK_CYCLE_MONTHS) + 1;
  const coachFirst = coach.name.split(' ')[0].toUpperCase();
  const canSave = completeCount === BENCHMARK_MATCH_TARGET;
  const nativeOcrReady = !!PSA_OCR_URL;
  const shareSummary = tracker.latest?.summary ?? liveSummary;
  const shareCheckpointLabel = tracker.latest
    ? `CHECKPOINT ${tracker.latest.checkpoint} · ${tracker.latest.label}`
    : `LIVE DRAFT · MONTH ${nextMonth}`;
  const shareSvg = useMemo(
    () =>
      buildShareCardSvg({
        displayName: settings.displayName || 'PLAYER',
        checkpointLabel: shareCheckpointLabel,
        summary: shareSummary,
        focus: shareSummary.style.focus,
        generatedAt: tracker.latest?.createdAt ?? Date.now(),
      }),
    [settings.displayName, shareCheckpointLabel, shareSummary, tracker.latest?.createdAt],
  );

  const comparisonSource = useMemo(() => {
    if (tracker.checkpoints.length >= 2) {
      return {
        before: tracker.checkpoints[tracker.checkpoints.length - 1],
        after: tracker.checkpoints[0],
      };
    }
    if (tracker.latest && liveSummary.matches > 0) {
      return {
        before: tracker.latest,
        after: {
          ...tracker.latest,
          label: 'LIVE DRAFT',
          title: 'LIVE DRAFT',
          summary: liveSummary,
          createdAt: Date.now(),
        },
      };
    }
    return null;
  }, [tracker.checkpoints, tracker.latest, liveSummary]);

  const comparisonDelta = useMemo(
    () => (comparisonSource ? compareBenchmarkSummaries(comparisonSource.after.summary, comparisonSource.before.summary) : null),
    [comparisonSource],
  );

  const comparisonSvg = useMemo(() => {
    if (!comparisonSource || !comparisonDelta) return null;
    return buildComparisonPosterSvg({
      displayName: settings.displayName || 'PLAYER',
      beforeLabel: comparisonSource.before.label,
      afterLabel: comparisonSource.after.label,
      before: comparisonSource.before.summary,
      after: comparisonSource.after.summary,
      delta: comparisonDelta,
      generatedAt: comparisonSource.after.createdAt,
    });
  }, [comparisonSource, comparisonDelta, settings.displayName]);

  const liveMovementHeadline = useMemo(() => {
    if (!liveDelta) return 'NO SAVED CHECKPOINT YET — THIS CARD IS BUILDING ITS FIRST REFERENCE.';
    const movements = [
      { label: 'POINTS PER MATCH', value: liveDelta.pointsPerMatch, betterWhenLower: false },
      { label: 'GOALS FOR', value: liveDelta.avgGoalsFor, betterWhenLower: false },
      { label: 'GOALS AGAINST', value: liveDelta.avgGoalsAgainst, betterWhenLower: true },
      { label: 'PASS ACCURACY', value: liveDelta.avgPassAccuracy, betterWhenLower: false },
      { label: 'SHOTS ON TARGET', value: liveDelta.avgShotsOnTarget, betterWhenLower: false },
      { label: 'TACKLES WON', value: liveDelta.avgTacklesWon, betterWhenLower: false },
    ];
    const scored = movements.map((item) => ({
      ...item,
      score: item.betterWhenLower ? -item.value : item.value,
    }));
    const best = [...scored].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0];
    if (!best || Math.abs(best.score) < 0.05) return 'THIS DRAFT IS HOLDING CLOSE TO THE LAST CHECKPOINT — THE IDENTITY IS STABLE FOR NOW.';
    if (best.score > 0) return `BIGGEST MOVE RIGHT NOW · ${best.label} IS TRENDING UP.`;
    return `BIGGEST LEAK RIGHT NOW · ${best.label} HAS SLIPPED FROM THE LAST CHECKPOINT.`;
  }, [liveDelta]);

  useEffect(() => {
    if (!cloud.online) return;
    void pullBenchmarkSnapshotsFromCloud(true).then((ok) => {
      if (ok) setCloudNote('CLOUD SYNC LIVE · PULLED CHECKPOINTS FROM SUPABASE.');
    });
    void syncUnsyncedBenchmarkSnapshots(coach.id).then((count) => {
      if (count > 0) setCloudNote(`SYNCED ${count} UNSENT CHECKPOINT${count === 1 ? '' : 'S'} TO SUPABASE.`);
    });
  }, [cloud.online, coach.id]);

  // PlayerCard wiring: derive the card from local ledger + progress + thread
  const progress = useJourneyProgress();
  const threadState = useLessonThread();
  const evidence = evidenceFromVault({
    played: vault.played,
    w: vault.w,
    d: vault.d,
    l: vault.l,
    ga: vault.ga,
    cleanSheets: vault.cleanSheets,
    matches: vault.matches.map((m) => ({ composure: m.composure, ledAt75: m.ledAt75, decisive: m.decisive, note: m.note })),
    journalTotal: journal.total,
    journalStreakDays: journal.streakDays,
    threadSettled: (threadState.heldCount ?? 0) + (threadState.brokeCount ?? 0) + (threadState.current ? 1 : 0),
    threadHeld: threadState.heldCount ?? 0,
    threadBroke: threadState.brokeCount ?? 0,
  });
  const playerCard = playerCardData(progress, evidence);

  const sideOf = (matchId: string): OcrSide => playerSides[matchId] ?? 'left';

  const updateField = (index: number, key: NumericField, raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    setDraft((previous) =>
      previous.map((match, matchIndex) => {
        if (matchIndex !== index) return match;
        return {
          ...match,
          [key]: cleaned.length ? clampDraftValue(key, Number(cleaned)) : null,
        };
      }),
    );
  };

  const applyScannedFields = (index: number, fields: Partial<Record<NumericField, number>>) => {
    setDraft((previous) =>
      previous.map((match, matchIndex) => {
        if (matchIndex !== index) return match;
        const next: BenchmarkDraftMatch = { ...match };
        for (const key of FIELD_ORDER.map((field) => field.key)) {
          const value = fields[key];
          if (typeof value === 'number' && Number.isFinite(value)) {
            next[key] = clampDraftValue(key, value);
          }
        }
        return next;
      }),
    );
  };

  const reapplyCachedSide = (matchId: string, index: number, side: OcrSide) => {
    const cached = ocrCache[matchId];
    if (!cached) return;
    applyScannedFields(index, fieldsForOcrSide(cached, side) as Partial<Record<NumericField, number>>);
  };

  const setSideForMatch = (matchId: string, index: number, side: OcrSide) => {
    setPlayerSides((previous) => ({ ...previous, [matchId]: side }));
    reapplyCachedSide(matchId, index, side);
  };

  const parsePastedTextForMatch = (matchId: string, index: number) => {
    const raw = (ocrTextDrafts[matchId] ?? '').trim();
    if (!raw) {
      setOcrSummary('PASTE OCR TEXT FIRST, THEN PARSE IT.');
      return;
    }
    const result = parseStatsFromPastedText(raw);
    setOcrCache((previous) => ({ ...previous, [matchId]: result }));
    if (result.suggestedSide !== 'unknown') {
      const suggested = result.suggestedSide as OcrSide;
      setPlayerSides((previous) => ({ ...previous, [matchId]: suggested }));
    }
    applyScannedFields(index, fieldsForOcrSide(result, result.suggestedSide === 'unknown' ? sideOf(matchId) : result.suggestedSide) as Partial<Record<NumericField, number>>);
    setScanState((previous) => ({
      ...previous,
      [matchId]: {
        status: 'done',
        note: `TEXT PARSE FOUND ${result.hitCount}/8 FIELDS${result.suggestedSide !== 'unknown' ? ` · SUGGESTED SIDE ${result.suggestedSide.toUpperCase()}` : ''}.`,
      },
    }));
    setOcrSummary(`PASTED OCR TEXT PARSED FOR MATCH ${index + 1}.`);
  };

  const attachAssetBatch = (assets: Array<{ uri: string; fileName?: string | null }>) => {
    setScanState({});
    setOcrSummary(null);
    setShareNotice(null);
    setCloudNote(null);
    setOcrCache({});
    setOcrTextDrafts({});
    const nextSides: Record<string, OcrSide> = {};
    setDraft((previous) =>
      previous.map((match, index) => {
        const asset = assets[index];
        nextSides[match.id] = 'left';
        if (!asset) return { ...match, screenshotName: null, screenshotUri: null };
        return {
          ...match,
          screenshotName: asset.fileName ?? `match-${index + 1}.png`,
          screenshotUri: asset.uri,
        };
      }),
    );
    setPlayerSides(nextSides);
  };

  const scanOne = async (index: number) => {
    const match = draft[index];
    if (!match?.screenshotUri) return;
    setScanState((previous) => ({
      ...previous,
      [match.id]: { status: 'scanning', note: 'READING SCREENSHOT…' },
    }));
    try {
      const result = await scanStatsScreenshot(match.screenshotUri);
      const resolvedSide = result.suggestedSide === 'unknown' ? sideOf(match.id) : result.suggestedSide;
      setOcrCache((previous) => ({ ...previous, [match.id]: result }));
      if (result.suggestedSide !== 'unknown') {
        const suggested = result.suggestedSide as OcrSide;
        setPlayerSides((previous) => ({ ...previous, [match.id]: suggested }));
      }
      applyScannedFields(index, fieldsForOcrSide(result, resolvedSide) as Partial<Record<NumericField, number>>);
      setScanState((previous) => ({
        ...previous,
        [match.id]: {
          status: 'done',
          note: `OCR FOUND ${result.hitCount}/8 FIELDS — SIDE ${resolvedSide.toUpperCase()}${result.variantLabel ? ` · BEST PASS ${result.variantLabel}` : ''}.`,
        },
      }));
      setOcrSummary(`MATCH ${index + 1} SCANNED · ${result.hitCount}/8 FIELDS PULLED FROM THE IMAGE`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCR could not read this screenshot.';
      setScanState((previous) => ({
        ...previous,
        [match.id]: { status: 'error', note: message.toUpperCase() },
      }));
      setOcrSummary('OCR MISSED THIS SCREENSHOT — MANUAL CONFIRMATION STILL WORKS.');
    }
  };

  const scanAll = async () => {
    const queued = draft
      .map((match, index) => ({ match, index }))
      .filter(({ match }) => !!match.screenshotUri);
    if (!queued.length) {
      setOcrSummary('ADD SCREENSHOTS FIRST, THEN RUN SCAN ALL.');
      return;
    }
    let totalHits = 0;
    for (const { match, index } of queued) {
      setScanState((previous) => ({
        ...previous,
        [match.id]: { status: 'scanning', note: 'READING SCREENSHOT…' },
      }));
      try {
        const result = await scanStatsScreenshot(match.screenshotUri as string);
        totalHits += result.hitCount;
        const resolvedSide = result.suggestedSide === 'unknown' ? sideOf(match.id) : result.suggestedSide;
        setOcrCache((previous) => ({ ...previous, [match.id]: result }));
        if (result.suggestedSide !== 'unknown') {
          const suggested = result.suggestedSide as OcrSide;
          setPlayerSides((previous) => ({ ...previous, [match.id]: suggested }));
        }
        applyScannedFields(index, fieldsForOcrSide(result, resolvedSide) as Partial<Record<NumericField, number>>);
        setScanState((previous) => ({
          ...previous,
          [match.id]: {
            status: 'done',
            note: `OCR FOUND ${result.hitCount}/8 FIELDS — SIDE ${resolvedSide.toUpperCase()}${result.variantLabel ? ` · ${result.variantLabel}` : ''}.`,
          },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'OCR could not read this screenshot.';
        setScanState((previous) => ({
          ...previous,
          [match.id]: { status: 'error', note: message.toUpperCase() },
        }));
      }
    }
    setOcrSummary(`SCAN ALL FINISHED · ${queued.length} SCREENSHOTS READ · ${totalHits} FIELD HITS TOTAL`);
  };

  const attachWebFiles = (event: any) => {
    const list = Array.from(event?.target?.files ?? []).slice(0, BENCHMARK_MATCH_TARGET) as Array<{ name?: string }>;
    const assets = list
      .map((file, index) => ({
        uri:
          typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(file as any)
            : '',
        fileName: file.name ?? `match-${index + 1}.png`,
      }))
      .filter((item) => !!item.uri);
    attachAssetBatch(assets);
  };

  const pickNativeShots = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setOcrSummary('PHOTO LIBRARY PERMISSION IS NEEDED TO LOAD THE STATS SCREENSHOTS.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: BENCHMARK_MATCH_TARGET,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) {
      setOcrSummary('NO SCREENSHOTS SELECTED.');
      return;
    }
    attachAssetBatch(
      result.assets.slice(0, BENCHMARK_MATCH_TARGET).map((asset, index) => ({
        uri: asset.uri,
        fileName: asset.fileName ?? `match-${index + 1}.jpg`,
      })),
    );
    setOcrSummary(`${Math.min(result.assets.length, BENCHMARK_MATCH_TARGET)} SCREENSHOTS LOADED FROM PHONE.`);
  };

  const exportShareSvg = () => {
    if (Platform.OS !== 'web') {
      setShareNotice('SHARE CARD PREVIEW IS LIVE HERE. FILE DOWNLOAD IS CURRENTLY ENABLED IN WEB PREVIEW.');
      return;
    }
    const ok = downloadSvgAsset(shareSvg, `${(settings.displayName || 'player').toLowerCase()}-${tracker.latest ? `checkpoint-${tracker.latest.checkpoint}` : 'live-draft'}.svg`);
    setShareNotice(ok ? 'SVG SHARE CARD DOWNLOADED.' : 'SVG EXPORT DID NOT START.');
  };

  const exportSharePng = async () => {
    if (Platform.OS !== 'web') {
      setShareNotice('PNG DOWNLOAD IS CURRENTLY ENABLED IN WEB PREVIEW.');
      return;
    }
    const ok = await downloadPngAsset(shareSvg, `${(settings.displayName || 'player').toLowerCase()}-${tracker.latest ? `checkpoint-${tracker.latest.checkpoint}` : 'live-draft'}.png`);
    setShareNotice(ok ? 'PNG SHARE CARD DOWNLOADED.' : 'PNG EXPORT DID NOT START.');
  };

  const exportComparisonSvg = () => {
    if (!comparisonSvg) return;
    if (Platform.OS !== 'web') {
      setShareNotice('COMPARISON POSTER DOWNLOAD IS CURRENTLY ENABLED IN WEB PREVIEW.');
      return;
    }
    const ok = downloadSvgAsset(comparisonSvg, `${(settings.displayName || 'player').toLowerCase()}-before-vs-after.svg`);
    setShareNotice(ok ? 'SVG COMPARISON POSTER DOWNLOADED.' : 'COMPARISON SVG EXPORT DID NOT START.');
  };

  const exportComparisonPng = async () => {
    if (!comparisonSvg) return;
    if (Platform.OS !== 'web') {
      setShareNotice('COMPARISON POSTER DOWNLOAD IS CURRENTLY ENABLED IN WEB PREVIEW.');
      return;
    }
    const ok = await downloadPngAsset(comparisonSvg, `${(settings.displayName || 'player').toLowerCase()}-before-vs-after.png`);
    setShareNotice(ok ? 'PNG COMPARISON POSTER DOWNLOADED.' : 'COMPARISON PNG EXPORT DID NOT START.');
  };

  const loadDemo = () => {
    const nextDraft = DEMO_BENCHMARK_SET.map((match, index) => ({
      ...match,
      id: `draft-${index + 1}`,
    }));
    setPlayerSides(Object.fromEntries(nextDraft.map((match) => [match.id, 'left' as OcrSide])));
    setOcrCache({});
    setOcrTextDrafts({});
    setScanState({});
    setShareNotice(null);
    setCloudNote(null);
    setOcrSummary('DEMO DATA LOADED — THIS SHOWS HOW THE CARD WILL READ FROM A FULL CHECKPOINT.');
    setDraft(nextDraft);
  };

  const clearDraft = () => {
    const nextDraft = createDraftBenchmarkMatches();
    setDraft(nextDraft);
    setPlayerSides(Object.fromEntries(nextDraft.map((match) => [match.id, 'left' as OcrSide])));
    setOcrCache({});
    setOcrTextDrafts({});
    setSavedNotice(null);
    setScanState({});
    setOcrSummary(null);
    setShareNotice(null);
    setCloudNote(null);
  };

  const saveCheckpoint = () => {
    if (!canSave) return;
    const snapshot = addBenchmarkCheckpoint(draft);
    setSavedNotice(`CHECKPOINT ${snapshot.checkpoint} SAVED · ${snapshot.label}`);
    setOcrSummary(null);
    setScanState({});
    setShareNotice('CHECKPOINT SAVED — THE MARKETING CARD BELOW NOW REFLECTS THE NEW ARCHIVED RECORD.');
    setCloudNote(cloud.online ? 'SAVING TO SUPABASE…' : 'SAVED LOCALLY — CLOUD WILL PICK IT UP WHEN THE CONNECTION RETURNS.');
    void syncBenchmarkSnapshot(snapshot, coach.id).then((ok) => {
      setCloudNote(ok ? 'CHECKPOINT + SCREENSHOTS SYNCED TO SUPABASE.' : 'LOCAL SAVE HELD. CLOUD SYNC WILL RETRY WHEN ONLINE.');
    });
    const nextDraft = createDraftBenchmarkMatches();
    setPlayerSides(Object.fromEntries(nextDraft.map((match) => [match.id, 'left' as OcrSide])));
    setOcrCache({});
    setOcrTextDrafts({});
    setDraft(nextDraft);
  };

  const removeCheckpoint = (snapshot: BenchmarkSnapshot) => {
    removeBenchmarkCheckpoint(snapshot.id);
    setCloudNote('CHECKPOINT REMOVED LOCALLY.');
    void removeBenchmarkSnapshotFromCloud(snapshot.id).then((ok) => {
      if (ok) setCloudNote('CHECKPOINT REMOVED FROM SUPABASE TOO.');
    });
  };

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.backRow}>
          <Text style={styles.backTxt}>‹ BACK TO PROGRESS</Text>
        </Pressable>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>PROSEASONACADEMY</Text>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillTxt}>6-MONTH PLAYER DEVELOPMENT</Text>
          </View>
        </View>

        <ArtBand
          source={[TUNNEL, require('../../assets/art/home-pitch.png'), require('../../assets/art/coach-touchline.jpg')]}
          width={398}
          height={170}
          style={styles.heroBand}
          warmAt={{ x: 198, y: 48, r: 220 }}
        >
          <Text style={styles.heroTitle}>TRACK THE PLAYER</Text>
          <Text style={styles.heroSub}>NO FORWARD STAGES · ONLY CHECKPOINTS, RECEIPTS AND CHANGE OVER TIME</Text>
        </ArtBand>

        <View style={styles.statementCard}>
          <Text style={styles.statementTag}>THE NEW RULE</Text>
          <Text style={styles.statementBody}>
            The player does not need a forward-looking stage map. He plays, uploads the post-match stats screens,
            and the academy builds the story backward from evidence. Seven stats screens make one checkpoint.
            Six checkpoints make a six-month record.
          </Text>
          <Text style={styles.statementQuote}>
            “You can only see the full story looking backward, not forward.”
          </Text>
        </View>

        <View style={styles.cycleCard}>
          <View style={styles.cycleTop}>
            <View>
              <Text style={styles.cardEyebrow}>THE SIX-MONTH RUN</Text>
              <Text style={styles.cardTitle}>CHECKPOINT {tracker.nextCheckpoint}</Text>
              <Text style={styles.cardSub}>CURRENT SLOT · MONTH {nextMonth} OF {BENCHMARK_CYCLE_MONTHS}</Text>
            </View>
            <View style={styles.cycleBadge}>
              <Text style={styles.cycleBadgeValue}>{Math.min(tracker.checkpoints.length, BENCHMARK_CYCLE_MONTHS)}/{BENCHMARK_CYCLE_MONTHS}</Text>
              <Text style={styles.cycleBadgeLabel}>MONTHS LOGGED</Text>
            </View>
          </View>
          <MonthRail filled={tracker.completedInFirstCycle} total={BENCHMARK_CYCLE_MONTHS} />
          <Text style={styles.cycleFoot}>
            THE PLAYER KEEPS TIME. THE BENCHMARK KEEPS THE REFERENCE. YOUR JOB HERE IS TO BUILD THE RECORD.
          </Text>
          <Text style={styles.syncLine}>
            CLOUD · {cloud.online ? 'ONLINE' : 'OFFLINE'}{cloud.syncedAt ? ` · LAST MATCH SYNC ${new Date(cloud.syncedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
          {cloudNote && <Text style={styles.cloudNote}>{cloudNote}</Text>}
        </View>

        <View style={styles.referenceCard}>
          <Text style={styles.referenceTitle}>BENCHMARK REFERENCE · THE PART THAT ALREADY HAPPENED</Text>
          <View style={styles.referenceRow}>
            {BENCHMARK_REFERENCE.map((item, index) => (
              <View key={item} style={styles.referencePill}>
                <Text style={styles.referenceIndex}>{index + 1}</Text>
                <Text style={styles.referenceTxt}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.captureCard}>
          <View style={styles.captureHead}>
            <View>
              <Text style={styles.cardEyebrow}>STATS SCREEN INGEST</Text>
              <Text style={styles.cardTitle}>SEVEN-MATCH CHECKPOINT</Text>
              <Text style={styles.cardSub}>UPLOAD THE POST-MATCH STATS SCREENS, THEN CONFIRM THE NUMBERS BELOW</Text>
            </View>
            <View style={styles.statusBox}>
              <Text style={styles.statusBig}>{completeCount}/{BENCHMARK_MATCH_TARGET}</Text>
              <Text style={styles.statusSmall}>MATCHES READY</Text>
            </View>
          </View>

          <View style={styles.warningBox}>
            <ScanGlyphIcon size={14} color={colors.accent} />
            <Text style={styles.warningTxt}>
              WEB PREVIEW NOW ATTEMPTS OCR ON THE STATS SCREEN. PICK WHETHER THE PLAYER IS ON THE LEFT OR RIGHT, LET OCR
              PULL A DRAFT, THEN CONFIRM THE NUMBERS HONESTLY BEFORE SAVING THE CHECKPOINT.
            </Text>
          </View>

          {Platform.OS === 'web' ? (
            // Web-only prototype input: lets the founder drop the seven stats screenshots into the UI preview.
            // @ts-ignore - intrinsic DOM element is valid in web builds.
            <input
              key={`uploader-${tracker.nextCheckpoint}`}
              type="file"
              accept="image/*"
              multiple
              onChange={attachWebFiles}
              style={webInputStyle}
            />
          ) : (
            <View style={styles.nativeNote}>
              <Text style={styles.nativeNoteTxt}>
                ON DEVICE, PICK THE SEVEN POST-MATCH STATS SCREENS STRAIGHT FROM THE PLAYER'S PHONE GALLERY.
                {nativeOcrReady
                  ? ' THIS BUILD ALSO HAS SERVER OCR READY — SCAN THE SHOTS AFTER PICKING THEM.'
                  : ' IF SERVER OCR IS NOT CONFIGURED YET, USE THE PASTE OCR TEXT ASSIST UNDER EACH SCREENSHOT.'}
              </Text>
              <Pressable onPress={() => void pickNativeShots()} style={styles.nativePickBtn}>
                <Text style={styles.nativePickBtnTxt}>PICK SCREENSHOTS FROM PHONE</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.actionRow}>
            <Pressable onPress={loadDemo} style={[styles.actionBtn, styles.actionBtnSolid]}>
              <RefreshGlyphIcon size={12} color="#05130a" />
              <Text style={styles.actionBtnSolidTxt}>LOAD DEMO CHECKPOINT</Text>
            </Pressable>
            <Pressable onPress={() => void scanAll()} style={styles.actionBtn}>
              <ScanGlyphIcon size={12} color={colors.primary} />
              <Text style={styles.actionBtnTxt}>SCAN ALL SHOTS</Text>
            </Pressable>
            <Pressable onPress={clearDraft} style={styles.actionBtn}>
              <Text style={styles.actionBtnTxt}>CLEAR DRAFT</Text>
            </Pressable>
          </View>
          {ocrSummary && <Text style={styles.ocrSummary}>{ocrSummary}</Text>}

          <View style={styles.matchList}>
            {draft.map((match, index) => {
              const complete = benchmarkMatchComplete(match);
              return (
                <View key={match.id} style={[styles.matchCard, complete && styles.matchCardReady]}>
                  <View style={styles.matchHead}>
                    <View>
                      <Text style={styles.matchTag}>MATCH {index + 1}</Text>
                      <Text style={styles.matchFile} numberOfLines={1}>
                        {match.screenshotName ?? 'NO SCREENSHOT ATTACHED YET'}
                      </Text>
                    </View>
                    {complete ? (
                      <View style={styles.readyBadge}>
                        <CheckIcon size={10} color="#05130a" />
                        <Text style={styles.readyBadgeTxt}>READY</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <EyeIcon size={10} color={colors.accent} />
                        <Text style={styles.pendingBadgeTxt}>PENDING</Text>
                      </View>
                    )}
                  </View>

                  {match.screenshotUri ? (
                    <Image source={{ uri: match.screenshotUri }} style={styles.shotPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.shotPlaceholder}>
                      <Text style={styles.shotPlaceholderTxt}>POST-MATCH STATS SCREEN</Text>
                    </View>
                  )}

                  <View style={styles.sideRow}>
                    <Text style={styles.sideRowLabel}>PLAYER SIDE IN THIS SCREEN</Text>
                    <View style={styles.sideChipRow}>
                      {(['left', 'right'] as OcrSide[]).map((side) => {
                        const active = sideOf(match.id) === side;
                        return (
                          <Pressable key={side} onPress={() => setSideForMatch(match.id, index, side)} style={[styles.sideChip, active && styles.sideChipOn]}>
                            <Text style={[styles.sideChipTxt, active && styles.sideChipTxtOn]}>{side.toUpperCase()}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {match.screenshotUri && (
                    <>
                      <Pressable onPress={() => void scanOne(index)} style={styles.scanBtn}>
                        <ScanGlyphIcon size={12} color={colors.accent} />
                        <Text style={styles.scanBtnTxt}>
                          {scanState[match.id]?.status === 'scanning' ? 'SCANNING…' : 'SCAN THIS SCREENSHOT'}
                        </Text>
                      </Pressable>
                    </>
                  )}

                  <View style={styles.pasteWrap}>
                    <Text style={styles.pasteLabel}>PASTE OCR TEXT ASSIST</Text>
                    <TextInput
                      value={ocrTextDrafts[match.id] ?? ''}
                      onChangeText={(text) => setOcrTextDrafts((previous) => ({ ...previous, [match.id]: text }))}
                      placeholder="PASTE TEXT FROM IOS/ANDROID LIVE TEXT OR ANY OCR TOOL HERE"
                      placeholderTextColor="rgba(143,184,155,0.35)"
                      style={styles.pasteInput}
                      multiline
                    />
                    <Pressable onPress={() => parsePastedTextForMatch(match.id, index)} style={styles.pasteBtn}>
                      <Text style={styles.pasteBtnTxt}>PARSE PASTED TEXT</Text>
                    </Pressable>
                  </View>

                  {!!scanState[match.id]?.note && (
                    <Text
                      style={[
                        styles.scanNote,
                        scanState[match.id]?.status === 'error' && styles.scanNoteError,
                        scanState[match.id]?.status === 'done' && styles.scanNoteDone,
                      ]}
                    >
                      {scanState[match.id]?.note}
                    </Text>
                  )}

                  <View style={styles.inputGrid}>
                    {FIELD_ORDER.map((field) => (
                      <StepTile
                        key={field.key}
                        label={field.label}
                        value={match[field.key]}
                        suffix={field.suffix}
                        onChange={(value) => updateField(index, field.key, value)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={saveCheckpoint}
            style={[styles.saveBtn, !canSave && styles.saveBtnMuted]}
            disabled={!canSave}
          >
            <CheckIcon size={11} color="#05130a" />
            <Text style={styles.saveBtnTxt}>SAVE THIS CHECKPOINT</Text>
          </Pressable>
          {!canSave && (
            <Text style={styles.helperLine}>
              EVERY CARD MUST BE BUILT FROM SEVEN COMPLETE MATCH STAT LINES.
            </Text>
          )}
          {savedNotice && <Text style={styles.savedNotice}>{savedNotice}</Text>}
        </View>

        <Animated.View entering={FadeInUp.duration(280)} style={styles.cardBuild}>
          <View style={styles.cardBuildHead}>
            <View>
              <Text style={styles.cardEyebrow}>LIVE DEVELOPMENT CARD</Text>
              <Text style={styles.cardTitle}>{settings.displayName || 'PLAYER'}</Text>
              <Text style={styles.cardSub}>BUILT FROM {liveSummary.matches} OF {BENCHMARK_MATCH_TARGET} STATS SCREENS</Text>
            </View>
            <View style={styles.confidencePill}>
              <Text style={styles.confidenceTxt}>{liveSummary.style.confidence}</Text>
            </View>
          </View>

          {/* Inserted PlayerCard component wired to the local ledger + progress */}
          <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
            <PlayerCard
              rating={playerCard.rating}
              stats={playerCard.stats}
              stageN={playerCard.stageN}
              totalStages={playerCard.totalStages}
              clearedCount={playerCard.clearedCount}
              ascent={playerCard.ascent}
              displayName={settings.displayName}
              onPress={() => {
                /* small affordance: open Match Vault when pressing the card */
                setSheet('vault');
              }}
            />
          </View>

          <View style={styles.proofStrip}>
            <Text style={styles.proofStripLabel}>{liveProof.label}</Text>
            <Text style={styles.proofStripSub}>{liveProof.sublabel}</Text>
            <Text style={styles.proofStripMeta}>{liveProof.evidenceLine}</Text>
          </View>

          <Text style={styles.styleTitle}>{liveIdentity.archetype}</Text>
          <Text style={styles.styleRead}>{liveSummary.style.read}</Text>

          <View style={styles.identityGrid}>
            <View style={styles.identityCell}>
              <Text style={styles.identityLabel}>PRIMARY STYLE</Text>
              <Text style={styles.identityValue}>{liveIdentity.primaryStyle}</Text>
            </View>
            <View style={styles.identityCell}>
              <Text style={styles.identityLabel}>SECONDARY TENDENCY</Text>
              <Text style={styles.identityValue}>{liveIdentity.secondaryTendency}</Text>
            </View>
            <View style={styles.identityCell}>
              <Text style={styles.identityLabel}>TEMPERAMENT</Text>
              <Text style={styles.identityValue}>{liveIdentity.temperament}</Text>
            </View>
            <View style={styles.identityCell}>
              <Text style={styles.identityLabel}>CURRENT GROWTH EDGE</Text>
              <Text style={styles.identityValue}>{liveSummary.style.focus}</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <Kpi label="W·D·L" value={`${liveSummary.wins}-${liveSummary.draws}-${liveSummary.losses}`} />
            <Kpi label="PPM" value={liveSummary.pointsPerMatch.toFixed(1)} accent />
            <Kpi label="AVG GF" value={liveSummary.avgGoalsFor.toFixed(1)} />
            <Kpi label="AVG GA" value={liveSummary.avgGoalsAgainst.toFixed(1)} />
          </View>

          <View style={styles.metricWrap}>
            <StatRing label="POSS" value={liveSummary.avgPossession} suffix="%" size={64} />
            <StatRing label="SHOTS" value={liveSummary.avgShots} size={64} />
            <StatRing label="ON TARGET" value={liveSummary.avgShotsOnTarget} size={64} />
            <StatRing label="PASS" value={liveSummary.avgPassAccuracy} suffix="%" size={64} />
            <StatRing label="SHOT ACC" value={liveSummary.shotAccuracy} suffix="%" size={64} />
            <StatRing label="TACKLES" value={liveSummary.avgTacklesWon} size={64} />
            <StatRing label="SAVES" value={liveSummary.avgSaves} size={64} />
            <StatRing label="CLEAN SHEETS" value={liveSummary.cleanSheets} size={64} />
          </View>

          <View style={styles.premiumPanel}>
            <Text style={styles.premiumPanelTitle}>TREND ENGINE</Text>
            <Text style={styles.premiumPanelLead}>{liveMovementHeadline}</Text>
            {liveDelta ? (
              <View style={styles.trendGrid}>
                <TrendRow label="PPM" value={liveDelta.pointsPerMatch} />
                <TrendRow label="GF" value={liveDelta.avgGoalsFor} />
                <TrendRow label="GA" value={liveDelta.avgGoalsAgainst} betterWhenLower />
                <TrendRow label="PASS" value={liveDelta.avgPassAccuracy} />
                <TrendRow label="POSS" value={liveDelta.avgPossession} />
                <TrendRow label="ON TARGET" value={liveDelta.avgShotsOnTarget} />
              </View>
            ) : (
              <Text style={styles.premiumPanelBody}>SAVE THIS FIRST CHECKPOINT AND THE APP WILL START DRAWING REAL MOVEMENT ARROWS AGAINST IT.</Text>
            )}
          </View>

          <View style={styles.premiumPanel}>
            <Text style={styles.premiumPanelTitle}>BENCHMARK GAP</Text>
            <Text style={styles.premiumPanelLead}>YOUR EVIDENCE VS THE ELITE REFERENCE — CLOSE THE GAP, DON’T GUESS IT.</Text>
            {liveGap.map((item) => (
              <GapBar key={item.key} item={item} />
            ))}
          </View>

          {liveDelta && (
            <>
              <Text style={styles.deltaTitle}>LIVE CHANGE VS LAST SAVED CHECKPOINT</Text>
              <View style={styles.deltaRow}>
                <DeltaPill label="PPM" value={liveDelta.pointsPerMatch} />
                <DeltaPill label="GF" value={liveDelta.avgGoalsFor} />
                <DeltaPill label="GA" value={liveDelta.avgGoalsAgainst} betterWhenLower />
                <DeltaPill label="PASS" value={liveDelta.avgPassAccuracy} />
              </View>
            </>
          )}

          <View style={styles.focusCard}>
            <Text style={styles.focusTag}>{coachFirst}'S READ</Text>
            <Text style={styles.focusBody}>{liveSummary.style.focus}</Text>
          </View>
        </Animated.View>

        <View style={styles.shareCardWrap}>
          <Text style={styles.archiveTitle}>AD CARD PREVIEW</Text>
          <Text style={styles.archiveSub}>TURN THE CHECKPOINT INTO SOMETHING YOU CAN POST, SEND OR SELL</Text>
          <View style={styles.sharePreviewCard}>
            <MarketingShareCard svg={shareSvg} width={332} />
            <View style={styles.shareActionRow}>
              <Pressable onPress={() => void exportSharePng()} style={[styles.actionBtn, styles.shareBtnPrimary]}>
                <Text style={styles.shareBtnPrimaryTxt}>DOWNLOAD PNG</Text>
              </Pressable>
              <Pressable onPress={exportShareSvg} style={styles.actionBtn}>
                <Text style={styles.actionBtnTxt}>DOWNLOAD SVG</Text>
              </Pressable>
            </View>
            {shareNotice && <Text style={styles.shareNotice}>{shareNotice}</Text>}
          </View>
        </View>

        {comparisonSvg && comparisonSource && comparisonDelta && (
          <View style={styles.shareCardWrap}>
            <Text style={styles.archiveTitle}>BEFORE VS AFTER POSTER</Text>
            <Text style={styles.archiveSub}>THE PROOF PIECE — FIRST CHECKPOINT AGAINST THE LATEST READ</Text>
            <View style={styles.sharePreviewCard}>
              <MarketingShareCard svg={comparisonSvg} width={332} />
              <Text style={styles.compareMeta}>
                {comparisonSource.before.label} → {comparisonSource.after.label}
              </Text>
              <View style={styles.shareActionRow}>
                <Pressable onPress={() => void exportComparisonPng()} style={[styles.actionBtn, styles.shareBtnPrimary]}>
                  <Text style={styles.shareBtnPrimaryTxt}>DOWNLOAD PNG</Text>
                </Pressable>
                <Pressable onPress={exportComparisonSvg} style={styles.actionBtn}>
                  <Text style={styles.actionBtnTxt}>DOWNLOAD SVG</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <View style={styles.archiveHead}>
          <Text style={styles.archiveTitle}>TRACK RECORD ARCHIVE</Text>
          <Text style={styles.archiveSub}>THE PART YOU CAN SHOW, STUDY AND SELL — REAL CHANGE, CHECKPOINT BY CHECKPOINT</Text>
        </View>

        {tracker.checkpoints.length === 0 ? (
          <View style={styles.emptyArchive}>
            <RouteIcon size={18} color="rgba(143,184,155,0.55)" />
            <Text style={styles.emptyArchiveTitle}>NO SAVED CHECKPOINTS YET</Text>
            <Text style={styles.emptyArchiveBody}>
              The card above updates live, but the archive only starts when the first seven-match checkpoint is sealed.
            </Text>
          </View>
        ) : (
          tracker.checkpoints.map((snapshot, index) => (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              compareTo={tracker.checkpoints[index + 1] ?? null}
              onRemove={() => removeCheckpoint(snapshot)}
            />
          ))
        )}

        <View style={styles.ledgerRow}>
          <Pressable style={styles.ledgerCard} onPress={() => setSheet('vault')}>
            <View style={styles.ledgerHead}>
              <RouteIcon size={14} color={colors.primary} />
              <Text style={styles.ledgerTitle}>MATCH HISTORY</Text>
            </View>
            <Text style={styles.ledgerValue}>{vault.played}</Text>
            <Text style={styles.ledgerBody}>W {vault.w} · D {vault.d} · L {vault.l}</Text>
            <View style={styles.ledgerLinkRow}>
              <Text style={styles.ledgerLink}>OPEN MATCH RECEIPTS</Text>
              <ChevronRightIcon size={11} color={colors.primary} />
            </View>
          </Pressable>

          <Pressable style={styles.ledgerCard} onPress={() => setSheet('journal')}>
            <View style={styles.ledgerHead}>
              <JournalIcon size={14} color={colors.accent} />
              <Text style={styles.ledgerTitle}>LOSS NOTES</Text>
            </View>
            <Text style={[styles.ledgerValue, { color: colors.accent }]}>{journal.total}</Text>
            <Text style={styles.ledgerBody}>{journal.streakDays > 0 ? `${journal.streakDays} DAY STREAK` : 'LINES LOGGED'}</Text>
            <View style={styles.ledgerLinkRow}>
              <Text style={styles.ledgerLink}>OPEN WRITTEN PATTERNS</Text>
              <ChevronRightIcon size={11} color={colors.accent} />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {sheet === 'vault' && <MatchVault coach={coach} onClose={() => setSheet(null)} />}
      {sheet === 'journal' && <LossJournal coach={coach} onClose={() => setSheet(null)} />}
    </View>
  );
}

const webInputStyle = {
  width: '100%',
  marginTop: 12,
  padding: '12px 14px',
  borderRadius: '12px',
  border: `1px dashed ${colors.primary}`,
  background: 'rgba(57,255,106,0.05)',
  color: colors.fg,
  boxSizing: 'border-box' as const,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 28 },

  backRow: { alignSelf: 'flex-start', marginTop: 2, marginBottom: 8 },
  backTxt: { fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 1.6, color: colors.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  brand: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 3,
    color: colors.fg,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
  },
  headerPill: {
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.35)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerPillTxt: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.5, color: colors.muted },

  heroBand: { marginTop: 12, marginHorizontal: -1, borderRadius: 16 },
  heroTitle: {
    fontFamily: displayFont,
    fontSize: 31,
    lineHeight: 31,
    letterSpacing: 0.6,
    color: colors.fg,
  },
  heroSub: {
    marginTop: 7,
    fontFamily: monoFont,
    fontSize: 6.2,
    letterSpacing: 1.9,
    color: 'rgba(238,242,236,0.88)',
  },

  statementCard: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.28)',
    borderRadius: 14,
    backgroundColor: 'rgba(12,20,14,0.9)',
  },
  statementTag: { fontFamily: monoFont, fontSize: 6.6, letterSpacing: 1.9, color: colors.primary },
  statementBody: { marginTop: 8, color: '#d6e3d9', fontFamily: bodyFont, fontSize: 12.5, lineHeight: 18.5 },
  statementQuote: { marginTop: 10, color: colors.warm, fontFamily: monoFont, fontSize: 8.4, lineHeight: 13.5, letterSpacing: 0.6 },

  cycleCard: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 14,
    backgroundColor: 'rgba(10,20,13,0.74)',
  },
  cycleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardEyebrow: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.8, color: colors.primary },
  cardTitle: { marginTop: 5, fontFamily: displayFont, fontSize: 26, lineHeight: 26, color: colors.fg },
  cardSub: { marginTop: 5, fontFamily: monoFont, fontSize: 6, lineHeight: 9, letterSpacing: 1.4, color: colors.muted },
  cycleBadge: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 74,
    backgroundColor: 'rgba(38,30,12,0.55)',
  },
  cycleBadgeValue: { fontFamily: monoFont, fontSize: 14, fontWeight: '900', color: colors.accent },
  cycleBadgeLabel: { marginTop: 3, fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1.2, color: 'rgba(242,192,120,0.75)' },
  monthRailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 14 },
  monthRailPill: {
    flex: 1,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.22)',
    backgroundColor: 'rgba(10,15,10,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthRailPillOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(57,255,106,0.14)',
  },
  monthRailTxt: { fontFamily: monoFont, fontSize: 9.5, fontWeight: '800', color: 'rgba(143,184,155,0.55)' },
  monthRailTxtOn: { color: colors.primary },
  cycleFoot: { marginTop: 10, fontFamily: monoFont, fontSize: 5.8, lineHeight: 10, letterSpacing: 1.2, color: 'rgba(143,184,155,0.7)' },
  syncLine: { marginTop: 10, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.2, color: colors.primary },
  cloudNote: { marginTop: 6, fontFamily: monoFont, fontSize: 5.8, lineHeight: 10, letterSpacing: 1.1, color: colors.accent },

  referenceCard: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    borderRadius: 14,
    backgroundColor: 'rgba(20,16,8,0.84)',
  },
  referenceTitle: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.8, color: colors.accent },
  referenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  referencePill: {
    minWidth: '31%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.24)',
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(10,8,4,0.45)',
    gap: 6,
  },
  referenceIndex: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', color: colors.accent },
  referenceTxt: { fontFamily: monoFont, fontSize: 6.4, lineHeight: 9.5, letterSpacing: 1, color: '#eed3a7' },

  captureCard: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.36)',
    borderRadius: 16,
    backgroundColor: 'rgba(12,20,14,0.92)',
  },
  captureHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  statusBox: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 78,
    alignItems: 'center',
    backgroundColor: 'rgba(57,255,106,0.07)',
  },
  statusBig: { fontFamily: monoFont, fontSize: 14, fontWeight: '900', color: colors.primary },
  statusSmall: { marginTop: 3, fontFamily: monoFont, fontSize: 5.2, letterSpacing: 1.1, color: colors.muted },
  warningBox: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(38,30,12,0.5)',
    padding: 11,
  },
  warningTxt: { flex: 1, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17, color: '#ebdfc7' },
  nativeNote: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 12,
    backgroundColor: 'rgba(57,255,106,0.05)',
    padding: 12,
  },
  nativeNoteTxt: { fontFamily: monoFont, fontSize: 6, lineHeight: 10, letterSpacing: 1.1, color: colors.muted },
  nativePickBtn: {
    marginTop: 10,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  nativePickBtnTxt: { fontFamily: monoFont, fontSize: 7, letterSpacing: 1.3, color: '#05130a' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.3)',
    backgroundColor: 'rgba(10,15,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
  },
  actionBtnSolid: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnTxt: { fontFamily: monoFont, fontSize: 7.2, letterSpacing: 1.4, color: colors.primary },
  actionBtnSolidTxt: { fontFamily: monoFont, fontSize: 7.2, letterSpacing: 1.2, color: '#05130a' },
  ocrSummary: { marginTop: 10, fontFamily: monoFont, fontSize: 5.8, lineHeight: 10, letterSpacing: 1.1, color: colors.accent },

  matchList: { marginTop: 14, gap: 10 },
  matchCard: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.16)',
    borderRadius: 13,
    backgroundColor: 'rgba(10,15,10,0.5)',
    padding: 12,
  },
  matchCardReady: { borderColor: 'rgba(57,255,106,0.42)', backgroundColor: 'rgba(57,255,106,0.06)' },
  matchHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  matchTag: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.8, color: colors.primary },
  matchFile: { marginTop: 4, maxWidth: 220, fontFamily: monoFont, fontSize: 6.6, lineHeight: 10, letterSpacing: 0.9, color: colors.muted },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  readyBadgeTxt: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '900', letterSpacing: 1.2, color: '#05130a' },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(38,30,12,0.4)',
  },
  pendingBadgeTxt: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '900', letterSpacing: 1.1, color: colors.accent },
  shotPreview: { width: '100%', height: 120, marginTop: 10, borderRadius: 11, backgroundColor: colors.surface2 },
  shotPlaceholder: {
    width: '100%',
    height: 120,
    marginTop: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.16)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(12,20,14,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotPlaceholderTxt: { fontFamily: monoFont, fontSize: 7, letterSpacing: 1.5, color: 'rgba(143,184,155,0.55)' },
  sideRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sideRowLabel: { flex: 1, fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.2, color: colors.muted },
  sideChipRow: { flexDirection: 'row', gap: 6 },
  sideChip: {
    minWidth: 52,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(10,15,10,0.4)',
  },
  sideChipOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  sideChipTxt: { fontFamily: monoFont, fontSize: 6, letterSpacing: 1.1, color: colors.muted },
  sideChipTxtOn: { color: colors.primary },
  scanBtn: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    backgroundColor: 'rgba(38,30,12,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  scanBtnTxt: { fontFamily: monoFont, fontSize: 6.6, letterSpacing: 1.3, color: colors.accent },
  pasteWrap: { marginTop: 10, borderWidth: 1, borderColor: 'rgba(57,255,106,0.14)', borderRadius: 10, backgroundColor: 'rgba(10,15,10,0.35)', padding: 10 },
  pasteLabel: { fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.2, color: colors.muted },
  pasteInput: { marginTop: 8, minHeight: 64, borderWidth: 1, borderColor: 'rgba(57,255,106,0.16)', borderRadius: 8, backgroundColor: '#0a0f0a', color: colors.fg, fontFamily: monoFont, fontSize: 9.5, lineHeight: 14, padding: 10, textAlignVertical: 'top' },
  pasteBtn: { marginTop: 8, minHeight: 36, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(57,255,106,0.26)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(57,255,106,0.08)' },
  pasteBtnTxt: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.2, color: colors.primary },
  scanNote: { marginTop: 7, fontFamily: monoFont, fontSize: 5.6, lineHeight: 9.5, letterSpacing: 1.1, color: colors.muted },
  scanNoteDone: { color: colors.primary },
  scanNoteError: { color: colors.loss },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  inputTile: {
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    borderRadius: 10,
    backgroundColor: '#0a0f0a',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputTileLabel: { fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.4, color: colors.muted },
  inputValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 6 },
  inputTileValue: {
    flex: 1,
    padding: 0,
    color: colors.fg,
    fontFamily: bodyFontHeavy,
    fontSize: 18,
  },
  inputTileSuffix: { marginBottom: 2, color: colors.primary, fontFamily: monoFont, fontSize: 9 },
  saveBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnMuted: { opacity: 0.35 },
  saveBtnTxt: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 2, color: '#05130a' },
  helperLine: { marginTop: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.2, color: colors.muted },
  savedNotice: { marginTop: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 6.4, letterSpacing: 1.4, color: colors.accent },

  cardBuild: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.32)',
    borderRadius: 16,
    backgroundColor: 'rgba(15,26,19,0.92)',
  },
  cardBuildHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  confidencePill: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: 'rgba(38,30,12,0.52)',
  },
  confidenceTxt: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.1, color: colors.accent },
  proofStrip: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.28)',
    borderRadius: 12,
    backgroundColor: 'rgba(38,30,12,0.38)',
    padding: 11,
  },
  proofStripLabel: { fontFamily: monoFont, fontSize: 6.1, letterSpacing: 1.5, color: colors.accent },
  proofStripSub: { marginTop: 5, fontFamily: bodyFontHeavy, fontSize: 12, color: colors.fg },
  proofStripMeta: { marginTop: 4, fontFamily: monoFont, fontSize: 5.6, lineHeight: 9.5, letterSpacing: 1, color: colors.muted },
  styleTitle: { marginTop: 10, fontFamily: displayFont, fontSize: 28, lineHeight: 28, color: colors.fg },
  styleRead: { marginTop: 7, color: '#d6e3d9', fontFamily: bodyFont, fontSize: 12, lineHeight: 18 },
  identityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  identityCell: {
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(10,15,10,0.42)',
  },
  identityLabel: { fontFamily: monoFont, fontSize: 5.2, lineHeight: 8.5, letterSpacing: 1.1, color: colors.muted },
  identityValue: { marginTop: 6, fontFamily: bodyFontBold, fontSize: 12.5, lineHeight: 16, color: colors.fg },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  kpiCell: {
    flex: 1,
    minWidth: 72,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(10,15,10,0.52)',
  },
  kpiValue: { fontFamily: bodyFontHeavy, fontSize: 18, color: colors.primary },
  kpiLabel: { marginTop: 4, fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.2, color: colors.muted },
  metricWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, alignItems: 'center', justifyContent: 'flex-start' },
  metricPill: {
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(10,15,10,0.42)',
  },
  metricPillLabel: { fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1.2, color: colors.muted },
  metricPillValue: { marginTop: 6, fontFamily: bodyFontBold, fontSize: 13.5, color: colors.fg },
  premiumPanel: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,15,10,0.38)',
    padding: 12,
  },
  premiumPanelTitle: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.6, color: colors.accent },
  premiumPanelLead: { marginTop: 6, fontFamily: bodyFontBold, fontSize: 11, lineHeight: 16, color: colors.fg },
  premiumPanelBody: { marginTop: 8, fontFamily: bodyFont, fontSize: 11, lineHeight: 16, color: '#bdd0c3' },
  trendGrid: { marginTop: 10, gap: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.08)', paddingBottom: 7 },
  trendLabel: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.2, color: colors.muted },
  trendValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendArrow: { fontFamily: monoFont, fontSize: 10, color: colors.muted },
  trendValue: { fontFamily: bodyFontHeavy, fontSize: 12.5, color: colors.fg },
  gapRow: { marginTop: 10 },
  gapHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gapLabel: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.2, color: colors.fg },
  gapNums: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.1, color: colors.primary },
  gapTrack: { marginTop: 6, height: 8, borderRadius: 4, backgroundColor: 'rgba(31,56,38,0.95)', overflow: 'hidden' },
  gapFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  gapNote: { marginTop: 5, fontFamily: monoFont, fontSize: 5.2, lineHeight: 8.5, letterSpacing: 1, color: colors.muted },
  deltaTitle: { marginTop: 14, fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.6, color: colors.accent },
  deltaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  deltaPill: {
    minWidth: 78,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.2)',
    backgroundColor: 'rgba(12,20,14,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deltaPillGood: { borderColor: 'rgba(57,255,106,0.35)', backgroundColor: 'rgba(57,255,106,0.08)' },
  deltaPillBad: { borderColor: 'rgba(224,96,92,0.35)', backgroundColor: 'rgba(224,96,92,0.08)' },
  deltaLabel: { fontFamily: monoFont, fontSize: 5.2, letterSpacing: 1.2, color: colors.muted },
  deltaValue: { marginTop: 5, fontFamily: bodyFontHeavy, fontSize: 12.5, color: colors.fg },
  focusCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.28)',
    borderRadius: 12,
    backgroundColor: 'rgba(38,30,12,0.45)',
    padding: 12,
  },
  focusTag: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.4, color: colors.accent },
  focusBody: { marginTop: 7, color: '#eadfc8', fontFamily: bodyFont, fontSize: 12, lineHeight: 18 },

  shareCardWrap: { marginTop: 18 },
  sharePreviewCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 16,
    backgroundColor: 'rgba(12,20,14,0.88)',
    padding: 14,
    alignItems: 'center',
  },
  shareActionRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  shareBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  shareBtnPrimaryTxt: { fontFamily: monoFont, fontSize: 7.2, letterSpacing: 1.2, color: '#05130a' },
  shareNotice: { marginTop: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 5.8, lineHeight: 10, letterSpacing: 1.1, color: colors.accent },
  compareMeta: { marginTop: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 5.8, lineHeight: 10, letterSpacing: 1.2, color: colors.primary },

  archiveHead: { marginTop: 18 },
  archiveTitle: { fontFamily: displayFont, fontSize: 26, lineHeight: 26, color: colors.fg },
  archiveSub: { marginTop: 6, fontFamily: monoFont, fontSize: 6.1, lineHeight: 9, letterSpacing: 1.3, color: colors.muted },
  emptyArchive: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.16)',
    borderRadius: 14,
    backgroundColor: 'rgba(12,20,14,0.7)',
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  emptyArchiveTitle: { marginTop: 10, fontFamily: monoFont, fontSize: 7.6, letterSpacing: 1.8, color: colors.muted },
  emptyArchiveBody: { marginTop: 8, textAlign: 'center', color: '#97ae9f', fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17 },

  snapshotCard: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.26)',
    borderRadius: 14,
    backgroundColor: 'rgba(12,20,14,0.86)',
  },
  snapshotTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  snapshotTag: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.7, color: colors.primary },
  snapshotDate: { marginTop: 4, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.2, color: colors.muted },
  snapshotSync: { marginTop: 5, fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1.1, color: colors.muted },
  snapshotSyncOn: { color: colors.primary },
  snapshotProofRow: { marginTop: 8 },
  snapshotProof: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.2, color: colors.accent },
  snapshotProofSub: { marginTop: 3, fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1, color: colors.muted },
  snapshotStyle: { marginTop: 10, fontFamily: bodyFontHeavy, fontSize: 17, color: colors.fg },
  snapshotRead: { marginTop: 5, color: '#d4e0d6', fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17 },
  snapshotIdentityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  snapshotIdentityChip: { borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1, color: colors.primary, backgroundColor: 'rgba(57,255,106,0.06)' },
  snapshotKpis: { flexDirection: 'row', gap: 8, marginTop: 12 },
  snapshotFocus: { marginTop: 12, fontFamily: monoFont, fontSize: 6, lineHeight: 10, letterSpacing: 1.2, color: colors.accent },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224,96,92,0.25)',
    backgroundColor: 'rgba(42,14,12,0.4)',
  },

  ledgerRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  ledgerCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    borderRadius: 14,
    backgroundColor: 'rgba(10,20,13,0.74)',
    padding: 13,
  },
  ledgerHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ledgerTitle: { fontFamily: monoFont, fontSize: 6.4, letterSpacing: 1.6, color: colors.fg },
  ledgerValue: { marginTop: 8, fontFamily: bodyFontHeavy, fontSize: 28, color: colors.primary },
  ledgerBody: { marginTop: 4, fontFamily: monoFont, fontSize: 6, lineHeight: 9.5, letterSpacing: 1.1, color: colors.muted },
  ledgerLinkRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  ledgerLink: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.2, color: colors.primary },
});
