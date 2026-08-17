// Official public handles for The Fifty.
// Verified from public player pages (Liquipedia, Esports Charts, official bios).
// We link out. We do not scrape Instagram or X.

export type SocialKey = 'x' | 'instagram' | 'twitch' | 'youtube' | 'liquipedia';

export type FiftySocials = Partial<Record<SocialKey, string>> & {
  liquipedia: string;
};

function wiki(page: string): string {
  return `https://liquipedia.net/easportsfc/${page}`;
}

export const FIFTY_SOCIALS: Record<string, FiftySocials> = {
  vejrgang: {
    liquipedia: wiki('Vejrgang'),
    x: 'https://x.com/FLC_Vejrgang',
    instagram: 'https://www.instagram.com/FLC_vejrgang/',
    twitch: 'https://www.twitch.tv/anders_vejrgang',
    youtube: 'https://www.youtube.com/@AndersVejrgangofficial',
  },
  tekkz: {
    liquipedia: wiki('Tekkz'),
    x: 'https://x.com/Tekkz',
  },
  manubachoore: {
    liquipedia: wiki('ManuBachoore'),
    x: 'https://x.com/ManuelBachoore',
    instagram: 'https://www.instagram.com/manuelbachoore/',
    twitch: 'https://www.twitch.tv/manuelbachoore',
  },
  nicolas99fc: {
    liquipedia: wiki('Nicolas99fc'),
    x: 'https://x.com/nicolas99fc',
    instagram: 'https://www.instagram.com/nicolas99fc/',
    twitch: 'https://www.twitch.tv/nicolas99fc',
  },
  emreyilmaz: {
    liquipedia: wiki('EmreYilmaz'),
    x: 'https://x.com/EmreYilmazz80',
  },
  levyfinn: {
    liquipedia: wiki('Levyfinn'),
    instagram: 'https://www.instagram.com/rblz_levy/',
  },
  phzin: {
    liquipedia: wiki('PHzin'),
    x: 'https://x.com/PHzin',
    instagram: 'https://www.instagram.com/phzinchaves/',
    twitch: 'https://www.twitch.tv/phzinchaves',
  },
  pauloneto: {
    liquipedia: wiki('Paulo_Neto'),
    x: 'https://x.com/pauloneto999',
    instagram: 'https://www.instagram.com/pauloneto999/',
    twitch: 'https://www.twitch.tv/pauloneto_999',
  },
  levidw: { liquipedia: wiki('LevideWeerd') },
  rvplegend: { liquipedia: wiki('RvPLegend') },
  bonanno: { liquipedia: wiki('Bonanno') },
  nassada: { liquipedia: wiki('Nassada') },
  hhezers: { liquipedia: wiki('HHezerS') },
  alihan: { liquipedia: wiki('Alihan') },
  samugamer: { liquipedia: wiki('Samugamer') },
  abumakkah: { liquipedia: wiki('AbuMakkah') },
  msdossary: { liquipedia: wiki('Msdossary') },
  milkalove: { liquipedia: wiki('Milkalove') },
  gugaferraz: { liquipedia: wiki('GugaFerraz') },
  dfernandes: { liquipedia: wiki('DFernandes') },
  neat: { liquipedia: wiki('Neat') },
  chrisdeboer: { liquipedia: wiki('Chris_de_Boer') },
  karimisbak: { liquipedia: wiki('Karimisbak') },
  luuk: { liquipedia: wiki('Luuk') },
  umut: { liquipedia: wiki('Umut') },
  jafonso: { liquipedia: wiki('Jafonso') },
  virgil: { liquipedia: wiki('Virgil') },
  caccia: { liquipedia: wiki('Caccia') },
  smalk: { liquipedia: wiki('SmalkXVII') },
  ilian: { liquipedia: wiki('Ilian') },
  marwan: { liquipedia: wiki('MarwanMC9') },
  brice: { liquipedia: wiki('Brice') },
  k1john: { liquipedia: wiki('K1John') },
  redlac: { liquipedia: wiki('RedLac') },
  obrun: { liquipedia: wiki('Obrun2002') },
  danipitbull: { liquipedia: wiki('Danipitbull') },
  adida: { liquipedia: wiki('Adida') },
  niksneb: { liquipedia: wiki('NiKSNEB') },
  tuga810: { liquipedia: wiki('Tuga810') },
  yaskow: { liquipedia: wiki('Yaskow') },
  anasbadr: { liquipedia: wiki('AnasBadr') },
  musti: { liquipedia: wiki('Musti') },
  maxk: { liquipedia: wiki('Maxkoelemaij') },
  leks: { liquipedia: wiki('Leks') },
  stingray: { liquipedia: wiki('Stingray') },
  guibarros: { liquipedia: wiki('GuiBarros') },
  lukas11: { liquipedia: wiki('Lukas_official11') },
  darkley11: { liquipedia: wiki('Darkley11') },
  ljr: { liquipedia: wiki('LJR_Peixoto') },
  jonny: { liquipedia: wiki('Jonny') },
};

export const SOCIAL_LABEL: Record<SocialKey, string> = {
  x: 'X',
  instagram: 'INSTAGRAM',
  twitch: 'TWITCH',
  youtube: 'YOUTUBE',
  liquipedia: 'LIQUIPEDIA',
};

export function socialsFor(playerId: string): FiftySocials | undefined {
  return FIFTY_SOCIALS[playerId];
}

export function socialEntries(playerId: string): { key: SocialKey; url: string; label: string }[] {
  const s = FIFTY_SOCIALS[playerId];
  if (!s) return [];
  return (Object.keys(SOCIAL_LABEL) as SocialKey[])
    .filter((k) => !!s[k])
    .map((k) => ({ key: k, url: s[k] as string, label: SOCIAL_LABEL[k] }));
}
