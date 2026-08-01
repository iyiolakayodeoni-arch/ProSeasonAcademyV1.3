import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// RECORDING PLAYER — the local match recording (MP4), shared by
// the MIRROR SESSION and the BASELINE WEEK review screens.
//
// FC Mobile runs ~12 real minutes per 90 match-minutes, so the
// timeline mapping used for MARK is ≈ 8 recording-seconds per
// match-minute (honest approximation, shown on the panel).
//
// Raw video is written to app-private storage by the native
// watcher and is NEVER uploaded by default.
// ─────────────────────────────────────────────────────────────

export const SECONDS_PER_MATCH_MIN = 8;

export function fileUri(p: string): string {
  return p.startsWith('file://') ? p : `file://${p}`;
}

export function RecordingPlayer({
  uri,
  seekToSeconds,
  onCurrentSecond,
}: {
  uri: string;
  seekToSeconds?: number;
  onCurrentSecond?: (s: number) => void;
}) {
  const player = useVideoPlayer(fileUri(uri), (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });
  const lastSeek = useRef<number | null>(null);
  useEffect(() => {
    if (seekToSeconds !== undefined && seekToSeconds !== lastSeek.current) {
      try {
        player.currentTime = seekToSeconds;
      } catch {
        /* not ready yet */
      }
      lastSeek.current = seekToSeconds;
      try {
        player.play();
      } catch {
        /* noop */
      }
    }
  }, [seekToSeconds, player]);
  useEffect(() => {
    if (!onCurrentSecond) return;
    const id = setInterval(() => {
      const t = player.currentTime;
      if (Number.isFinite(t)) onCurrentSecond(t);
    }, 400);
    return () => clearInterval(id);
  }, [player, onCurrentSecond]);
  return (
    <View style={styles.wrap}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
      <Text style={styles.note}>RECORDED LOCALLY · NEVER UPLOADED · ≈1 MIN MATCH = {SECONDS_PER_MATCH_MIN} SEC OF RECORDING</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
  video: { width: '100%', height: 170, borderRadius: 10, backgroundColor: '#000' },
  note: {
    marginTop: 6,
    fontFamily: monoFont,
    fontSize: 5.4,
    letterSpacing: 1.2,
    color: 'rgba(143,184,155,0.55)',
    textAlign: 'center',
  },
});
