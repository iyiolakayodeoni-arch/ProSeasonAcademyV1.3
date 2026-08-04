import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import Constants from 'expo-constants';
import { fetchCatalog, updateState, isLive, CatalogApp, AppUpdateState } from './src/manifest';
import {
  installerAvailable,
  canRequestInstalls,
  openInstallPermissionSettings,
  installedVersionCodeOf,
  downloadApk,
  sha256Of,
  installApk,
  purgeDownload,
} from './src/installer';

// Onliversity PM — a private, honest app store. See ONLIVERSITY_PM.md.
// Every install shows the system prompt; nothing installs silently.

const C = {
  bg: '#0a0f0a', surface: '#0f1a13', border: '#1f3826', fg: '#eef2ec',
  muted: '#8fb89b', primary: '#39FF6A', accent: '#f2c078', loss: '#e0605c',
};
const MONO = 'monospace';
const PM_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Phase = 'idle' | 'downloading' | 'verifying' | 'ready' | 'error';

export default function App() {
  const [apps, setApps] = useState<CatalogApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [installed, setInstalled] = useState<Record<string, number>>({});
  const [canInstall, setCanInstall] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [phase, setPhase] = useState<Record<string, Phase>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [note, setNote] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const cat = await fetchCatalog();
      setApps(cat?.apps ?? []);
      setLoading(false);
      const codes: Record<string, number> = {};
      for (const a of cat?.apps ?? []) codes[a.id] = await installedVersionCodeOf(a.package);
      setInstalled(codes);
      setCanInstall(await canRequestInstalls());
      // deep link: onliversitypm://update?app=<id>
      try {
        const url = await Linking.getInitialURL();
        const m = url && url.match(/[?&]app=([^&]+)/);
        if (m) setFocus(decodeURIComponent(m[1]));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // re-check the install permission when the user returns from settings
  useEffect(() => {
    const sub = Linking.addEventListener('url', () => {
      void canRequestInstalls().then(setCanInstall);
    });
    return () => sub.remove();
  }, []);

  const doInstall = async (a: CatalogApp) => {
    const filename = `${a.id}-${a.version}.apk`;
    try {
      setPhase((p) => ({ ...p, [a.id]: 'downloading' }));
      setProgress((p) => ({ ...p, [a.id]: 0 }));
      setNote((n) => ({ ...n, [a.id]: '' }));
      await downloadApk(a.apkUrl, filename, (r) => setProgress((p) => ({ ...p, [a.id]: r })));

      setPhase((p) => ({ ...p, [a.id]: 'verifying' }));
      const hash = await sha256Of(filename);
      if (!hash) {
        throw new Error('cannot verify — installer module missing');
      }
      if (hash !== a.sha256.toLowerCase()) {
        setPhase((p) => ({ ...p, [a.id]: 'error' }));
        setNote((n) => ({ ...n, [a.id]: 'CHECKSUM MISMATCH — the file was tampered with or corrupted. Not installed.' }));
        await purgeDownload(filename);
        return;
      }

      setPhase((p) => ({ ...p, [a.id]: 'ready' }));
      const launched = await installApk(filename);
      if (!launched) {
        setPhase((p) => ({ ...p, [a.id]: 'error' }));
        setNote((n) => ({ ...n, [a.id]: 'could not open the installer — grant "install unknown apps" and retry.' }));
      } else {
        setNote((n) => ({ ...n, [a.id]: 'Android is showing the install prompt — tap INSTALL.' }));
      }
    } catch (e: any) {
      setPhase((p) => ({ ...p, [a.id]: 'error' }));
      setNote((n) => ({ ...n, [a.id]: String(e?.message ?? e) }));
    }
  };

  const avail = installerAvailable();
  const liveApps = apps.filter(isLive);
  const comingSoon = apps.filter((a) => !isLive(a));

  return (
    <View style={S.root}>
      <ScrollView contentContainerStyle={S.scroll} bounces={false}>
        <Text style={S.brand}>ONLIVERSITY</Text>
        <Text style={S.tag}>THE PACKAGE MANAGER · YOUR APPS, YOUR UPDATES</Text>

        {/* the one-time install gate — the single biggest support trap */}
        {!avail && (
          <Banner tone="warn">
            THIS BUILD CAN'T INSTALL APPS (Expo Go / unsupported device). USE A REAL
            ANDROID DEV BUILD OF THE PM TO INSTALL OR UPDATE.
          </Banner>
        )}
        {avail && !canInstall && <InstallGate onOpen={() => void openInstallPermissionSettings()} />}

        {loading ? (
          <Text style={S.empty}>READING THE CATALOG…</Text>
        ) : apps.length === 0 ? (
          <Text style={S.empty}>NO APPS IN THE CATALOG YET. PUBLISH ONLIVERSITY-CATALOG.JSON.</Text>
        ) : (
          <>
          {liveApps.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionLabel}>AVAILABLE NOW</Text>
            {liveApps.map((a) => {
            const state = updateState(a.versionCode, installed[a.id] ?? -1);
            const ph = phase[a.id] ?? 'idle';
            const isFocus = focus === a.id;
            return (
              <View key={a.id} style={[S.card, isFocus && S.cardFocus]}>
                <View style={S.rowBetween}>
                  <Text style={S.appName}>{a.name}</Text>
                  <StateBadge state={state} />
                </View>
                <Text style={S.appMeta}>
                  {a.version} · v{a.versionCode}
                  {installed[a.id] != null && installed[a.id] >= 0 ? ` · INSTALLED v${installed[a.id]}` : ' · NOT INSTALLED'}
                  {a.sizeBytes ? ` · ${Math.round(a.sizeBytes / 1048576)}MB` : ''}
                </Text>
                {!!a.releaseNotes && <Text style={S.notes}>{a.releaseNotes}</Text>}

                {ph === 'downloading' && (
                  <View style={S.progressWrap}>
                    <View style={S.progressTrack}>
                      <View style={[S.progressFill, { width: `${Math.round((progress[a.id] ?? 0) * 100)}%` }]} />
                    </View>
                    <Text style={S.progressTxt}>DOWNLOADING… {Math.round((progress[a.id] ?? 0) * 100)}%</Text>
                  </View>
                )}
                {ph === 'verifying' && <Text style={S.phaseTxt}>VERIFYING SHA-256…</Text>}
                {!!note[a.id] && <Text style={[S.note, ph === 'error' && S.noteErr]}>{note[a.id]}</Text>}

                <View style={[S.rowBetween, { marginTop: 10 }]}>
                  <Pressable onPress={() => void Linking.openURL(a.apkUrl).catch(() => {})} hitSlop={6}>
                    <Text style={S.ghostBtn}>DIRECT DOWNLOAD</Text>
                  </Pressable>
                  {state === 'UP_TO_DATE' ? (
                    <Text style={S.upToDate}>UP TO DATE ✓</Text>
                  ) : (
                    <Pressable
                      disabled={!canInstall || ph === 'downloading' || ph === 'verifying'}
                      onPress={() => void doInstall(a)}
                      hitSlop={6}
                    >
                      <View style={[S.cta, (!canInstall || ph === 'downloading' || ph === 'verifying') && S.ctaOff]}>
                        <Text style={S.ctaTxt}>
                          {ph === 'downloading' ? 'DOWNLOADING…' : ph === 'verifying' ? 'VERIFYING…' : state === 'INSTALL' ? 'INSTALL ›' : 'UPDATE ›'}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
            </View>
          )}
          {comingSoon.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionLabel}>COMING SOON</Text>
              {comingSoon.map((a) => (
                <View key={a.id} style={[S.card, S.teaser]}>
                  <View style={S.rowBetween}>
                    <Text style={S.appName}>{a.name}</Text>
                    <Text style={S.teaserBadge}>SOON</Text>
                  </View>
                  {!!a.tagline && <Text style={S.teaserTag}>{a.tagline}</Text>}
                  {!!a.description && <Text style={S.notes}>{a.description}</Text>}
                  {!!a.eta && <Text style={S.teaserEta}>{a.eta}</Text>}
                </View>
              ))}
            </View>
          )}
          </>
        )}

        <Text style={S.foot}>ONLIVERSITY PM · VERSION {PM_VERSION} · EVERY INSTALL NEEDS YOUR TAP</Text>
      </ScrollView>
    </View>
  );
}

function StateBadge({ state }: { state: AppUpdateState }) {
  const map: Record<AppUpdateState, { t: string; c: string }> = {
    UPDATE: { t: 'UPDATE AVAILABLE', c: C.accent },
    INSTALL: { t: 'INSTALL', c: C.primary },
    UP_TO_DATE: { t: 'UP TO DATE', c: C.muted },
    UNKNOWN: { t: '—', c: C.muted },
  };
  const m = map[state];
  return (
    <View style={[S.badge, { borderColor: m.c }]}>
      <Text style={[S.badgeTxt, { color: m.c }]}>{m.t}</Text>
    </View>
  );
}

// the Restricted Settings walkthrough — the killer Android 13+ gotcha
function InstallGate({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={S.gate}>
      <Text style={S.gateTag}>ONE-TIME SETUP · ALLOW INSTALLS</Text>
      <Text style={S.gateBody}>
        THE PM CAN'T INSTALL APPS YET. ANDROID 13+ BLOCKS THIS FOR sideloaded APPS BY
        DEFAULT ("RESTRICTED SETTINGS"). DO THIS ONCE:
      </Text>
      <Text style={S.gateStep}>1. TAP BELOW → "ALLOW FROM THIS SOURCE" (IF IT'S GREYED OUT, CONTINUE TO STEP 2).</Text>
      <Text style={S.gateStep}>2. IF GREYED OUT: ON THE APP INFO SCREEN, OPEN THE ⋮ MENU → "ALLOW RESTRICTED SETTINGS".</Text>
      <Text style={S.gateStep}>3. COME BACK HERE — THE UPDATE BUTTONS TURN ON.</Text>
      <Pressable onPress={onOpen} hitSlop={6}>
        <View style={S.gateBtn}>
          <Text style={S.gateBtnTxt}>OPEN THE INSTALL PERMISSION SETTING ›</Text>
        </View>
      </Pressable>
    </View>
  );
}

function Banner({ tone, children }: { tone: 'warn'; children: React.ReactNode }) {
  return (
    <View style={S.banner}>
      <Text style={S.bannerTxt}>{children}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 24 },
  brand: { fontFamily: MONO, fontSize: 20, fontWeight: '900', letterSpacing: 5, color: C.primary, textShadowColor: 'rgba(57,255,106,0.5)', textShadowRadius: 10 },
  tag: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.8, color: C.muted, marginTop: 4, marginBottom: 18 },
  empty: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.4, color: C.muted, textAlign: 'center', marginTop: 40 },
  card: { borderWidth: 1.2, borderColor: C.border, borderRadius: 16, backgroundColor: C.surface, padding: 14, marginBottom: 12 },
  cardFocus: { borderColor: C.primary, shadowColor: C.primary, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appName: { fontSize: 15, fontWeight: '900', letterSpacing: 0.6, color: C.fg },
  appMeta: { fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: C.muted, marginTop: 5 },
  notes: { fontFamily: MONO, fontSize: 8, lineHeight: 12, letterSpacing: 0.6, color: '#c4d4c8', marginTop: 8 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeTxt: { fontFamily: MONO, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.3 },
  progressWrap: { marginTop: 10 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(57,255,106,0.14)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  progressTxt: { fontFamily: MONO, fontSize: 6.6, letterSpacing: 1, color: C.primary, marginTop: 4 },
  phaseTxt: { fontFamily: MONO, fontSize: 6.8, letterSpacing: 1, color: C.accent, marginTop: 8 },
  note: { fontFamily: MONO, fontSize: 6.8, lineHeight: 11, letterSpacing: 0.8, color: C.muted, marginTop: 8 },
  noteErr: { color: C.loss },
  ghostBtn: { fontFamily: MONO, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.2, color: C.muted },
  cta: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: C.primary },
  ctaOff: { opacity: 0.35 },
  ctaTxt: { fontFamily: MONO, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.6, color: '#05130a' },
  upToDate: { fontFamily: MONO, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.4, color: C.primary },
  gate: { borderWidth: 1.2, borderColor: C.accent, borderRadius: 14, backgroundColor: 'rgba(38,30,12,0.5)', padding: 14, marginBottom: 16 },
  gateTag: { fontFamily: MONO, fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: C.accent },
  gateBody: { fontFamily: MONO, fontSize: 7.4, lineHeight: 12, letterSpacing: 0.8, color: '#e6d9bf', marginTop: 8 },
  gateStep: { fontFamily: MONO, fontSize: 7, lineHeight: 11, letterSpacing: 0.7, color: '#c4d4c8', marginTop: 6 },
  gateBtn: { marginTop: 11, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent },
  gateBtnTxt: { fontFamily: MONO, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, color: '#0a0f0a' },
  banner: { borderWidth: 1, borderColor: C.loss, borderRadius: 10, backgroundColor: 'rgba(224,96,92,0.08)', padding: 11, marginBottom: 16 },
  bannerTxt: { fontFamily: MONO, fontSize: 7.2, lineHeight: 11, letterSpacing: 0.8, fontWeight: '700', color: C.loss },
  section: { marginTop: 6 },
  sectionLabel: { fontFamily: MONO, fontSize: 8.5, fontWeight: '900', letterSpacing: 2.4, color: C.muted, marginBottom: 10, marginTop: 8 },
  teaser: { borderColor: 'rgba(143,184,155,0.25)', backgroundColor: 'rgba(12,20,14,0.5)', opacity: 0.92 },
  teaserBadge: { fontFamily: MONO, fontSize: 6, fontWeight: '900', letterSpacing: 1.4, color: C.muted, borderWidth: 1, borderColor: 'rgba(143,184,155,0.4)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  teaserTag: { fontFamily: MONO, fontSize: 7.6, lineHeight: 12, letterSpacing: 0.8, color: C.accent, marginTop: 7, fontStyle: 'italic' },
  teaserEta: { fontFamily: MONO, fontSize: 6.4, letterSpacing: 1.4, color: 'rgba(143,184,155,0.6)', marginTop: 6 },
  foot: { fontFamily: MONO, fontSize: 6.4, letterSpacing: 1.8, color: 'rgba(143,184,155,0.4)', textAlign: 'center', marginTop: 18 },
});
