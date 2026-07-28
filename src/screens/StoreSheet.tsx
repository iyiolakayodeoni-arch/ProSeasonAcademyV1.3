import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { ChevronLeftIcon, TillIcon, RefreshGlyphIcon } from '../components/Icons';
import { colors, monoFont } from '../theme';
import * as backend from '../data/backend';
import PaySheet from './PaySheet';
import { getCloud } from '../data/cloudSync';
import { useSettings } from '../data/settings';
import { FALLBACK_PRODUCTS, OFFLINE_GO_LIVE, TILL_COPY, goLiveLabel, isHttpPayLink, StoreProduct } from '../data/store';

// ─────────────────────────────────────────────────────────────
// THE TILL — the player-facing store of the charge engine.
// What it deliberately is NOT: a card form. Money never moves
// in-app. The player sees their wallet, the posted price list
// (Africa → credit packs · World → PRO subscription, both voted
// in the pricing halls), and taps out to the founder's own
// secure payment link once the till opens. After his bank
// alert, he credits the wallet from the Founder Desk and the
// new balance lands here. A human pipeline on purpose.
// ─────────────────────────────────────────────────────────────

export default function StoreSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const [bundles, setBundles] = useState<Record<string, string[]>>({});
  const [access, setAccess] = useState<backend.MyAccess | null>(null);
  const [fx, setFx] = useState<Record<string, backend.LivePrice>>({});
  const [paying, setPaying] = useState<{ code: string; price: string; title: string; payLink?: string | null } | null>(null);
  const [ladder, setLadder] = useState<backend.TierRow[] | null>(null);
  const [catalog, setCatalog] = useState<backend.StoreCatalogWire | null>(null);
  const [balance, setBalance] = useState<backend.TillBalanceWire | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    void backend.myAccess().then((a) => a && setAccess(a));
    // today's converted prices — naira is the master for Africa
    void backend.livePrices().then((rows) => {
      if (rows) setFx(Object.fromEntries(rows.map((r) => [r.code, r])));
    });
    void backend.tierLadder().then((l) => l && setLadder(l));
    const [cat, bal] = await Promise.all([backend.storeCatalog(settings.geo), backend.tillBalance()]);
    // what each pack bundles beyond credits — the founder's "tricks in the packs"
    if (cat) {
      const codes = [...(cat.products?.africa ?? []), ...(cat.products?.world ?? [])].map((p: any) => p.code);
      const pairs = await Promise.all(
        codes.map(async (c: string) => [c, (await backend.packContents(c)) ?? []] as const),
      );
      setBundles(Object.fromEntries(pairs));
    }
    setCatalog(cat);
    setBalance(bal);
    setOffline(!cat);
  }, [settings.geo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const live = catalog?.live ?? false;
  const goLive = catalog?.goLive ?? OFFLINE_GO_LIVE;
  const day = goLiveLabel(goLive);
  const products = catalog?.products ?? FALLBACK_PRODUCTS;
  const academyId = balance?.academyId ?? getCloud().academyId ?? 'SIGN IN FIRST';
  const showAfrica = settings.geo !== 'world';
  const showWorld = settings.geo !== 'africa';

  /** every purchase goes through the claim flow, so the member gets a
   *  reference and a status instead of paying into silence */
  const buy = (p: StoreProduct) => {
    setPaying({ code: p.code, price: fx[p.code]?.display || p.price, title: p.title, payLink: p.payLink });
  };

  const renderPack = (p: StoreProduct) => {
    const canBuy = live;
    const btnLabel = !live ? `OPENS ${day}` : 'GET IT ›';
    return (
      <View key={p.code} style={styles.packRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.packTitle}>{p.title}</Text>
          <Text style={styles.packMeta}>
            {p.credits != null ? `${p.credits} CREDITS` : `PLAN: ${(p.plan ?? 'PRO').toUpperCase()}`}
          </Text>
          {(fx[p.code]?.priceNote ?? p.priceNote) ? (
            <Text style={styles.priceNote}>{fx[p.code]?.priceNote ?? p.priceNote}</Text>
          ) : null}
          {(bundles[p.code]?.length ?? 0) > 0 && (
            <Text style={styles.packIncludes}>
              + {bundles[p.code].filter((i) => i.startsWith('trick:')).length} TRICK(S)
              {bundles[p.code].some((i) => i.startsWith('stage:'))
                ? ` · ${bundles[p.code].filter((i) => i.startsWith('stage:')).length} STAGE(S)`
                : ''}
              {' '}INCLUDED
            </Text>
          )}
        </View>
        <Text style={styles.packPrice}>{fx[p.code]?.display || p.price}</Text>
        <Pressable onPress={() => buy(p)} disabled={!canBuy} hitSlop={6}>
          <View style={[styles.buyBtn, !canBuy && styles.buyBtnOff]}>
            <Text style={styles.buyTxt}>{btnLabel}</Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.root}>
      <GridBackground />
      <View style={styles.headerWrap}>
        <Text style={styles.eyebrow}>{TILL_COPY.eyebrow}</Text>
        <Text style={styles.title}>{TILL_COPY.title}</Text>
        <Text style={styles.subtitle}>
          {live ? 'YOUR WALLET, YOUR RISE — SPEND IT WELL' : `PRICES POSTED · THE TILL OPENS ${day}`}
        </Text>
      </View>

      {/* WHERE YOU STAND — the same three rungs everywhere */}
      {access && (
        <View style={styles.tierNow}>
          <Text style={styles.tierNowTag}>
            YOU ARE ON {access.tier === 'mid' ? 'ACADEMY' : access.tier.toUpperCase()}
            {access.daysLeft != null ? ` · ${access.daysLeft} DAYS LEFT` : ''}
          </Text>
          <Text style={styles.tierNowSub}>
            {ladder?.find((t) => t.key === access.tier)?.blurb ?? ''}
          </Text>
          <Text style={styles.tierFair}>
            THE SAME THREE TIERS IN EVERY COUNTRY — ONLY THE CURRENCY CHANGES.
          </Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {offline ? <Text style={styles.banner}>{TILL_COPY.offline}</Text> : null}

        {/* wallet */}
        <Animated.View entering={FadeInDown.delay(50).duration(320)} style={styles.balanceCard}>
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceVal}>{balance ? balance.credits : '—'}</Text>
            <Text style={styles.balanceLbl}>CREDITS IN YOUR WALLET</Text>
          </View>
          <View style={styles.balanceRight}>
            <View style={[styles.planChip, balance?.plan === 'pro' && styles.planChipPro]}>
              <Text style={[styles.planChipTxt, balance?.plan === 'pro' && styles.planChipTxtPro]}>
                {balance?.plan === 'pro' ? 'PRO ACADEMY' : 'FREE ACADEMY'}
              </Text>
            </View>
            {balance?.plan === 'pro' && balance.planRenews ? (
              <Text style={styles.renews}>RENEWS {balance.planRenews}</Text>
            ) : null}
          </View>
        </Animated.View>

        {!live && (
          <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.ribbon}>
            <Text style={styles.ribbonTxt}>{TILL_COPY.closedRibbon.replace('{DAY}', day)}</Text>
          </Animated.View>
        )}

        {/* shelves */}
        {settings.geo === 'unset' && (
          <Animated.View entering={FadeInDown.delay(100).duration(320)} style={styles.noteCard}>
            <Text style={styles.noteTxt}>{TILL_COPY.unsetNote}</Text>
          </Animated.View>
        )}
        {showAfrica && (
          <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.card}>
            <Text style={[styles.cardTag, { color: colors.accent }]}>{TILL_COPY.africaHead}</Text>
            {products.africa.map(renderPack)}
          </Animated.View>
        )}
        {showWorld && (
          <Animated.View entering={FadeInDown.delay(150).duration(320)} style={styles.card}>
            <Text style={[styles.cardTag, { color: colors.primary }]}>{TILL_COPY.worldHead}</Text>
            {products.world.map(renderPack)}
          </Animated.View>
        )}

        {/* how it works — the honest loop */}
        <Animated.View entering={FadeInDown.delay(180).duration(320)} style={styles.card}>
          <Text style={[styles.cardTag, { color: colors.accent }]}>{TILL_COPY.howHeader}</Text>
          {TILL_COPY.howLines.map((l) => (
            <Text key={l} style={styles.howLine}>{l}</Text>
          ))}
          <Text style={styles.howFoot}>{TILL_COPY.howFoot}</Text>
          <Text style={styles.remark}>{TILL_COPY.remarkNote.replace('{ID}', academyId)}</Text>
        </Animated.View>

        {/* movements */}
        <Animated.View entering={FadeInDown.delay(210).duration(320)} style={styles.card}>
          <Text style={[styles.cardTag, { color: colors.accent }]}>YOUR MOVEMENTS</Text>
          {!balance && <Text style={styles.dim}>{offline ? 'Wallet history syncs when the server is back.' : 'Reading your wallet…'}</Text>}
          {balance && balance.ledger.length === 0 && <Text style={styles.dim}>Nothing yet — your first top-up will write the opening line.</Text>}
          {(balance?.ledger ?? []).slice(0, 10).map((l) => (
            <View key={l.id} style={styles.ledgerRow}>
              <Text style={[styles.ledgerDelta, { color: l.delta > 0 ? colors.primary : colors.loss }]}>
                {l.delta > 0 ? `+${l.delta}` : String(l.delta)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerReason}>{l.reason}</Text>
                {l.ref ? <Text style={styles.ledgerRef}>REF {l.ref} · BY {l.actor.toUpperCase()}</Text> : null}
              </View>
            </View>
          ))}
        </Animated.View>

        <View style={styles.toolRow}>
          <Pressable onPress={() => void refresh()} style={styles.toolBtn} hitSlop={6}>
            <RefreshGlyphIcon size={11} color={colors.primary} />
            <Text style={styles.toolBtnTxt}>REFRESH WALLET</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
      {paying && (
        <View style={StyleSheet.absoluteFill}>
          <PaySheet
            product={paying.code}
            price={paying.price}
            title={paying.title}
            payLink={paying.payLink}
            onClose={() => { setPaying(null); void refresh(); }}
          />
        </View>
      )}

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingTop: 50, paddingHorizontal: 16 },
  headerWrap: { alignItems: 'center' },
  eyebrow: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '800', letterSpacing: 2.2, color: colors.muted },
  title: { marginTop: 6, fontSize: 19, fontWeight: '900', letterSpacing: 4, color: colors.warm },
  subtitle: { marginTop: 4, fontFamily: monoFont, fontSize: 5.8, fontWeight: '700', letterSpacing: 1.5, color: colors.accent, textAlign: 'center' },

  banner: { marginTop: 14, fontFamily: monoFont, fontSize: 6.6, fontWeight: '800', letterSpacing: 1.2, color: colors.loss, textAlign: 'center', lineHeight: 12 },
  dim: { marginTop: 8, fontFamily: monoFont, fontSize: 7, letterSpacing: 1, color: colors.muted, lineHeight: 12 },

  balanceCard: { marginTop: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: 'rgba(242,192,120,0.5)', borderRadius: 14, backgroundColor: 'rgba(242,192,120,0.05)', padding: 14 },
  balanceLeft: { flex: 1 },
  balanceVal: { fontSize: 26, fontWeight: '900', color: colors.fg },
  balanceLbl: { marginTop: 2, fontFamily: monoFont, fontSize: 5.4, fontWeight: '800', letterSpacing: 1.3, color: colors.muted },
  balanceRight: { alignItems: 'flex-end' },
  planChip: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.4)', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  planChipPro: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.08)' },
  planChipTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.5, color: colors.muted },
  planChipTxtPro: { color: colors.primary },
  renews: { marginTop: 5, fontFamily: monoFont, fontSize: 5.4, fontWeight: '800', letterSpacing: 1.1, color: colors.muted },

  ribbon: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(242,192,120,0.45)', borderRadius: 12, backgroundColor: 'rgba(242,192,120,0.07)', padding: 12 },
  ribbonTxt: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '800', letterSpacing: 1.2, color: colors.warm, lineHeight: 13, textAlign: 'center' },

  noteCard: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(143,184,155,0.25)', borderRadius: 12, padding: 11 },
  noteTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '700', letterSpacing: 1.1, color: colors.muted, lineHeight: 12.5, textAlign: 'center' },

  card: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 14, backgroundColor: 'rgba(15,26,19,0.85)', padding: 13 },
  cardTag: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.8 },

  packRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.12)', paddingTop: 10 },
  packTitle: { fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 1.4, color: colors.fg },
  packMeta: { marginTop: 3, fontFamily: monoFont, fontSize: 6, fontWeight: '800', letterSpacing: 1.1, color: colors.primary },
  tierNow: {
    marginHorizontal: 14, marginBottom: 8, borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.3)', backgroundColor: 'rgba(10,22,14,0.8)',
    borderRadius: 10, padding: 11,
  },
  tierNowTag: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  tierNowSub: { marginTop: 4, fontFamily: monoFont, fontSize: 6.3, lineHeight: 10, letterSpacing: 0.6, color: 'rgba(238,242,236,0.82)' },
  tierFair: { marginTop: 6, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.1, color: 'rgba(143,184,155,0.65)' },
  priceNote: { marginTop: 2, fontFamily: monoFont, fontSize: 5.6, lineHeight: 8.6, letterSpacing: 0.5, color: 'rgba(143,184,155,0.72)' },
  packIncludes: { marginTop: 2, fontFamily: monoFont, fontSize: 5.6, fontWeight: '900', letterSpacing: 0.9, color: colors.accent },
  packPrice: { fontSize: 12, fontWeight: '900', color: colors.warm },
  buyBtn: { backgroundColor: colors.accent, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  buyBtnOff: { backgroundColor: 'rgba(46,42,30,1)' },
  buyTxt: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '900', letterSpacing: 1.1, color: '#0a0f0a' },

  howLine: { marginTop: 8, fontFamily: monoFont, fontSize: 6.4, fontWeight: '700', letterSpacing: 1, color: colors.fg, lineHeight: 13 },
  howFoot: { marginTop: 10, fontFamily: monoFont, fontSize: 6, fontWeight: '700', letterSpacing: 1, color: colors.muted, lineHeight: 12, fontStyle: 'italic' },
  remark: { marginTop: 9, fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.1, color: colors.accent, lineHeight: 13 },

  ledgerRow: { marginTop: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.12)', paddingTop: 9 },
  ledgerDelta: { width: 44, fontSize: 12, fontWeight: '900' },
  ledgerReason: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.1, color: colors.fg },
  ledgerRef: { marginTop: 3, fontFamily: monoFont, fontSize: 5.6, fontWeight: '800', letterSpacing: 1, color: colors.muted },

  toolRow: { marginTop: 14 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 11, paddingVertical: 11 },
  toolBtnTxt: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.4, color: colors.primary },

  backBtn: { position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17, borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)', alignItems: 'center', justifyContent: 'center' },
});
