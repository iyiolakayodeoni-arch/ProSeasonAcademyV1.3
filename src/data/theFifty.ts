// ─────────────────────────────────────────────────────────────────────────
// THE FIFTY — a public book of the current FC Pro scene.
//
// Facts only. Tournament results, titles, orgs, and official write-ups.
// No invented lives, no private posts, no generated faces.
// Last compiled: 17 Aug 2026 against FC Pro 26 World Championship (EWC Paris),
// eChampions League 2026, FC Pro Open 26, and the national FC Pro leagues.
// ─────────────────────────────────────────────────────────────────────────

import { mechanicFeedPosts } from './fcMechanics';

export type SceneKind = 'TITLE' | 'SCENE' | 'NEWS' | 'MECHANIC' | 'SOCIAL';

export interface FiftyPlayer {
  id: string;
  handle: string;
  name?: string;
  country: string;
  org: string;
  titles: string[];
  last: string;
  note: string;
}

export interface ScenePost {
  id: string;
  kind: SceneKind;
  handle: string;
  playerId?: string;
  mechanicId?: string;
  date: string;
  headline: string;
  body: string;
  source: string;
  sourceUrl: string;
}

export const SCENE_COMPILED_AT = '2026-08-17';

export const THE_FIFTY: FiftyPlayer[] = [
  {
    id: 'rvplegend',
    handle: 'RvPLegend',
    name: 'Razvan Puiu',
    country: 'Romania',
    org: 'HYPERSPIRIT',
    titles: ['FC Pro 26 World Champion'],
    last: 'Beat levyfinn 6–5 in the EWC Paris grand final, July 2026.',
    note: 'Came into Paris ranked outside the favourites. Left as world champion.',
  },
  {
    id: 'levyfinn',
    handle: 'levyfinn',
    name: 'Levy Rieck',
    country: 'Germany',
    org: 'RBLZ Gaming',
    titles: ['FC Pro 26 World Championship runner-up'],
    last: 'Silver at EWC Paris, July 2026.',
    note: 'League-phase pace setter. One goal from the world title.',
  },
  {
    id: 'bonanno',
    handle: 'Bonanno',
    name: 'Matías Bonanno',
    country: 'Argentina',
    org: 'Manchester City',
    titles: ['ePremier League 2026', 'FC Pro 26 World Championship 3rd'],
    last: 'Perfect 18-point league phase in Paris. Bronze at the World Championship.',
    note: 'The man nobody wanted in the league table.',
  },
  {
    id: 'nassada',
    handle: 'Nassada',
    name: 'Nassim Dahman',
    country: 'Morocco',
    org: 'SC Freiburg',
    titles: ['Virtual Bundesliga 2026', 'FC Pro 26 World Championship 4th'],
    last: 'Fourth in Paris. First VBL title earlier in the cycle.',
    note: 'First-time VBL champion who walked into a world-championship semi.',
  },
  {
    id: 'vejrgang',
    handle: 'Vejrgang',
    name: 'Anders Vejrgang',
    country: 'Denmark',
    org: 'Team Falcons',
    titles: [
      'FC Pro Open 26 champion',
      'eChampions League 2026 champion',
      'eSerie A 2026',
      'eEuro 2025',
      'First FC Pro player past $1M prize money',
    ],
    last: 'Quarter-finals at the World Championship after knocking out ManuBachoore.',
    note: 'The season’s most decorated name. Open, eCL, eSerie A — then Paris.',
  },
  {
    id: 'hhezers',
    handle: 'HHezerS',
    name: 'Lucio Vecchione',
    country: 'Italy',
    org: 'Ninjas in Pyjamas',
    titles: ['eChampions League 2026 runner-up', 'FC Pro 26 World Championship 5–8'],
    last: 'Lost the eCL final to Vejrgang 3–2. Quarter-finals in Paris.',
    note: 'An all-eSerie A eCL final. He was the other Italian.',
  },
  {
    id: 'nicolas99fc',
    handle: 'nicolas99fc',
    name: 'Nicolas Villalba',
    country: 'Argentina',
    org: 'Real Sociedad',
    titles: ['LALIGA FC Pro 2026 — third straight', 'FC Pro 26 World Championship 5–8'],
    last: 'Quarter-finals in Paris. Ninth World Championship appearance.',
    note: 'The Iceman. Three LaLiga titles in a row.',
  },
  {
    id: 'alihan',
    handle: 'Alihan',
    name: 'Alihan Hadzhi',
    country: 'Bulgaria',
    org: 'RBLZ Gaming',
    titles: ['Virtual Bundesliga 2026 runner-up', 'FC Pro 26 World Championship 5–8'],
    last: 'Beat Paulo Neto 10–9 in the Paris round of 16.',
    note: 'RBLZ’s other Paris quarter-finalist.',
  },
  {
    id: 'manubachoore',
    handle: 'ManuBachoore',
    name: 'Manuel Bachoore',
    country: 'Netherlands',
    org: 'Team Liquid',
    titles: ['FC Pro 25 World Champion', 'Two-time FC Pro World Champion'],
    last: 'Eliminated in the Paris round of 16 by Vejrgang, 7–5.',
    note: 'Defending champion. The title did not travel.',
  },
  {
    id: 'emreyilmaz',
    handle: 'EmreYilmaz',
    name: 'Emre Yilmaz',
    country: 'Netherlands',
    org: 'Team Liquid / AZ Alkmaar',
    titles: ['Two-time eChampions League champion', 'KPN eDivisie 2026', 'FC Pro Open 26 runner-up'],
    last: 'Survived the Paris cut in 23rd, then lost 9–2 to Vejrgang in the round of 24.',
    note: 'The first two-time eCL winner. Nearly went out in the league phase.',
  },
  {
    id: 'levidw',
    handle: 'Levi de Weerd',
    country: 'Netherlands',
    org: 'Team Liquid / ESTAC Troyes',
    titles: ['FC Pro Open 26 semi-final'],
    last: 'Lost 7–6 to DFernandes in the Paris round of 24.',
    note: 'Third straight Open semi. Still waiting on the final.',
  },
  {
    id: 'samugamer',
    handle: 'samugamer',
    country: 'Italy',
    org: 'Sassuolo',
    titles: ['eChampions League 2026 semi-final'],
    last: 'Beat PHzin 6–1 in Paris, then lost to Bonanno in the last 16.',
    note: 'Led the World Championship after day one.',
  },
  {
    id: 'abumakkah',
    handle: 'AbuMakkah',
    country: 'Saudi Arabia',
    org: 'Al Qadsiah',
    titles: ['eSaudi Premier League'],
    last: 'Beat Neat 5–2 in the Paris round of 24. Out to HHezerS in the last 16.',
    note: 'Public, consistent, still in every major conversation.',
  },
  {
    id: 'msdossary',
    handle: 'Msdossary',
    country: 'Saudi Arabia',
    org: 'Team Falcons / Al-Ittihad',
    titles: [],
    last: 'Beat Chris de Boer 11–2 in Paris. Out to levyfinn 4–3 in the last 16.',
    note: 'The 11–2 was the loudest scoreline of the knockout.',
  },
  {
    id: 'milkalove',
    handle: 'Milkalove',
    country: 'Germany',
    org: 'Holstein Kiel',
    titles: [],
    last: 'Ranked 108th at the start of Paris. Finished 21st, beat Karimisbak, then out to nicolas99fc.',
    note: 'The lowest-ranked player to survive the league phase.',
  },
  {
    id: 'pauloneto',
    handle: 'Paulo Neto',
    country: 'Brazil',
    org: 'Team Liquid',
    titles: [],
    last: 'Beat Luuk 6–4 in the Paris round of 24. Lost 10–9 to Alihan.',
    note: 'Liquid’s Brazilian. Always in the knockout conversation.',
  },
  {
    id: 'gugaferraz',
    handle: 'GugaFerraz',
    country: 'Brazil',
    org: 'Santa Clara',
    titles: [],
    last: 'League-phase top eight in Paris. Out 7–3 to RvPLegend in the last 16.',
    note: 'Qualified through Portugal. Took the eventual champion to a knockout.',
  },
  {
    id: 'dfernandes',
    handle: 'DFernandes',
    country: 'Portugal',
    org: 'Cádiz CF',
    titles: ['LALIGA FC Pro 2026 qualifier'],
    last: 'Beat Levi de Weerd 7–6. Then 9–1 to Nassada.',
    note: 'Took out a Liquid name, then ran into the VBL champion.',
  },
  {
    id: 'phzin',
    handle: 'PHzin',
    country: 'Brazil',
    org: 'Tuzzy E-Sports / Real Sporting',
    titles: ['Former FC Pro Open champion'],
    last: 'Out 6–1 to samugamer in the Paris round of 24.',
    note: 'The old Open name. Paris was short.',
  },
  {
    id: 'neat',
    handle: 'Neat',
    country: 'Spain',
    org: 'Atlético de Madrid',
    titles: [],
    last: 'Lost 5–2 to AbuMakkah in the Paris round of 24.',
    note: 'Atleti’s man in the 36.',
  },
  {
    id: 'chrisdeboer',
    handle: 'Chris de Boer',
    country: 'Netherlands',
    org: 'Ajax',
    titles: ['KPN eDivisie qualifier'],
    last: 'Beat teammate Paulo Neto 10–7 on day one. Out 11–2 to Msdossary.',
    note: 'Ajax colours. The intra-Liquid win was the highlight.',
  },
  {
    id: 'karimisbak',
    handle: 'Karimisbak',
    country: 'Morocco',
    org: 'AS Monaco Esports',
    titles: ['eLigue 1 2026'],
    last: 'Lost 6–4 to Milkalove in the Paris round of 24.',
    note: 'New eLigue 1 champion. Paris ended in the play-in.',
  },
  {
    id: 'luuk',
    handle: 'LuukWijdeveld',
    country: 'Netherlands',
    org: 'PSV',
    titles: ['KPN eDivisie qualifier'],
    last: 'Lost 6–4 to Paulo Neto in the Paris round of 24.',
    note: 'PSV’s ticket to the 36.',
  },
  {
    id: 'umut',
    handle: 'Umut',
    country: 'Germany',
    org: 'RBLZ Gaming',
    titles: [],
    last: 'Lost 6–3 to RvPLegend in the Paris round of 24. Open 26 last-16 vs Levi.',
    note: 'RBLZ depth. Not the Paris story — levyfinn and Alihan were.',
  },
  {
    id: 'jafonso',
    handle: 'jafonsogv',
    country: 'Portugal',
    org: 'Manchester City',
    titles: ['ePremier League 2026', 'EWC 2024 FC champion'],
    last: 'Eliminated in the Paris league phase. Lost 6–4 to Vejrgang on day four.',
    note: 'City’s other half of the ePL title. First eCL in 2026.',
  },
  {
    id: 'virgil',
    handle: 'Virgil',
    country: 'Italy',
    org: 'Borussia Dortmund',
    titles: [],
    last: 'Eliminated in the Paris league phase, 26th.',
    note: 'Dortmund’s Italian.',
  },
  {
    id: 'caccia',
    handle: 'Caccia',
    country: 'Italy',
    org: 'exeed',
    titles: [],
    last: 'Eliminated in the Paris league phase, 27th.',
    note: 'exeed pair with Obrun.',
  },
  {
    id: 'smalk',
    handle: 'SmalkXVII',
    country: 'Italy',
    org: 'Torino / EKO Esports',
    titles: ['eSerie A 2026 qualifier'],
    last: 'Eliminated in the Paris league phase. Lost 5–1 to nicolas99fc on day two.',
    note: 'eCL field. Paris league phase was the ceiling this time.',
  },
  {
    id: 'ilian',
    handle: 'Ilian',
    country: 'Algeria',
    org: 'Team Vitality',
    titles: [],
    last: 'Eliminated in the Paris league phase, 29th.',
    note: 'Vitality’s Algerian.',
  },
  {
    id: 'marwan',
    handle: 'MarwanMC9',
    country: 'Morocco',
    org: 'AS Monaco Esports',
    titles: ['eLigue 1 2026'],
    last: 'Eliminated in the Paris league phase, 30th.',
    note: 'Monaco’s second eLigue 1 champion alongside Karimisbak.',
  },
  {
    id: 'brice',
    handle: 'Brice',
    country: 'France',
    org: 'Team Vitality',
    titles: [],
    last: 'Eliminated in the Paris league phase, 31st.',
    note: 'Vitality’s French ticket.',
  },
  {
    id: 'k1john',
    handle: 'K1John',
    country: 'Egypt',
    org: 'Evil Geniuses / Austin FC',
    titles: [],
    last: 'Eliminated in the Paris league phase. Lost 7–2 to nicolas99fc.',
    note: 'Egypt’s man in the 36.',
  },
  {
    id: 'redlac',
    handle: 'RedLac',
    country: 'United Kingdom',
    org: 'RBLZ Gaming / Toronto FC',
    titles: [],
    last: 'Eliminated in the Paris league phase, 33rd.',
    note: 'RBLZ’s British line.',
  },
  {
    id: 'obrun',
    handle: 'Obrun2002',
    country: 'Italy',
    org: 'exeed',
    titles: [],
    last: 'Eliminated in the Paris league phase, 34th.',
    note: 'One point from six league matches.',
  },
  {
    id: 'danipitbull',
    handle: 'Danipitbull',
    country: 'Italy',
    org: 'NOVO Esports',
    titles: ['FC Pro Open 26 semi-final'],
    last: 'Open 26 semi, 9–5 to Emre. Zero points from six in the Paris league phase.',
    note: 'London was the peak. Paris was a wipe.',
  },
  {
    id: 'adida',
    handle: 'Adida',
    country: 'United States',
    org: 'San Jose Earthquakes',
    titles: [],
    last: 'Eliminated in the Paris league phase, 36th. Zero points.',
    note: 'The North American ticket. Paris did not land.',
  },
  {
    id: 'tekkz',
    handle: 'Tekkz',
    name: 'Donovan Hunt',
    country: 'United Kingdom',
    org: 'Leeds United',
    titles: ['ePremier League 2026 runner-up'],
    last: 'eCL 2026 field. Open 26 group stage. Took Vejrgang to extra time in the eCL path.',
    note: 'English comeback name. Still the loudest UK handle.',
  },
  {
    id: 'niksneb',
    handle: 'NiKSNEB',
    country: 'United Kingdom',
    org: 'Leeds United',
    titles: ['ePremier League 2026 runner-up'],
    last: 'First eChampions League appearance, 2026.',
    note: 'Leeds’ other half of the ePL silver.',
  },
  {
    id: 'tuga810',
    handle: 'tuga810',
    name: 'Diogo Pombo',
    country: 'Portugal',
    org: 'Málaga CF / Betclic Apogee',
    titles: ['LALIGA FC Pro 2026 qualifier'],
    last: 'Open 26 playoff path. eCL 2026 field.',
    note: 'Portugal’s regular in the Spanish league.',
  },
  {
    id: 'yaskow',
    handle: 'Yaskow',
    name: 'Yanis Boucebaine',
    country: 'France',
    org: 'Clermont Foot 63',
    titles: [],
    last: 'Open 26 knockout path after topping stretches of Group A pace.',
    note: 'The French outsider who kept showing up in London.',
  },
  {
    id: 'anasbadr',
    handle: 'AnasBadr',
    country: 'Egypt',
    org: '',
    titles: [],
    last: 'Open 26 finals field. Round-of-16 path vs ManuBachoore.',
    note: 'Egypt’s other major-weekend name.',
  },
  {
    id: 'musti',
    handle: 'Musti',
    country: 'Germany',
    org: 'Hannover 96',
    titles: ['Virtual Bundesliga 2026 qualifier'],
    last: 'eChampions League 2026 field.',
    note: 'Hannover’s VBL ticket.',
  },
  {
    id: 'maxk',
    handle: 'Maxkoelemaij',
    country: 'Netherlands',
    org: 'FC Volendam',
    titles: ['KPN eDivisie qualifier'],
    last: 'eChampions League 2026 field.',
    note: 'Volendam’s eDivisie line.',
  },
  {
    id: 'leks',
    handle: 'Leks',
    country: 'France',
    org: 'Benfica',
    titles: ['eLigue 1 Europe West ladder winner (prior cycle)'],
    last: 'eChampions League 2026 field.',
    note: 'Benfica’s French handle. Always in the European 36.',
  },
  {
    id: 'stingray',
    handle: 'Stingray',
    name: 'Dan Ray',
    country: 'United Kingdom',
    org: '',
    titles: [],
    last: 'FC Pro Open 26 field.',
    note: 'The other long-running British name beside Tekkz.',
  },
  {
    id: 'guibarros',
    handle: 'GuiBarros',
    country: 'Brazil',
    org: '',
    titles: [],
    last: 'FC Pro Open 26 field. FC Pro 25 World Championship field.',
    note: 'Brazil’s depth behind Neto, PHzin and Guga.',
  },
  {
    id: 'lukas11',
    handle: 'lukas_official11',
    country: 'Germany',
    org: '',
    titles: [],
    last: 'FC Pro Open 26 Group A.',
    note: 'German Open regular.',
  },
  {
    id: 'darkley11',
    handle: 'Darkley11',
    country: 'Portugal',
    org: '',
    titles: [],
    last: 'FC Pro Open 26 field.',
    note: 'Portugal’s second Open line beside tuga810.',
  },
  {
    id: 'ljr',
    handle: 'LJR Peixoto',
    country: 'France',
    org: '',
    titles: [],
    last: 'FC Pro Open 26 Group A.',
    note: 'French Open field.',
  },
  {
    id: 'jonny',
    handle: 'Jonny',
    country: 'Germany',
    org: '',
    titles: ['eChampions League 2024 champion'],
    last: 'Former eCL winner. Still the VBL-era reference point.',
    note: 'Beat levyfinn 5–2 for the 2024 eCL. The name the book still carries.',
  },
];

export const SCENE_FEED: ScenePost[] = [
  {
    id: 'sp-wc-champ',
    kind: 'TITLE',
    handle: 'RvPLegend',
    playerId: 'rvplegend',
    date: '2026-07-26',
    headline: 'RvPLegend is the FC Pro 26 World Champion.',
    body: 'Paris. Esports World Cup. Razvan Puiu beat levyfinn 6–5 in the grand final and took $250,000. He arrived as the underdog from HYPERSPIRIT. He left as world champion.',
    source: 'EA FC Pro · World Championship 26 review',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-pro/news/fc-pro-world-championship-26-review',
  },
  {
    id: 'sp-wc-podium',
    kind: 'SCENE',
    handle: 'THE FIFTY',
    date: '2026-07-26',
    headline: 'Bonanno bronze. Nassada fourth. The podium is new.',
    body: 'Matías Bonanno (Manchester City) took third after a perfect 18-point league phase. Nassada (SC Freiburg), the new Virtual Bundesliga champion, finished fourth. The old names did not fill the top four.',
    source: 'Liquipedia · FC Pro 26 World Championship',
    sourceUrl: 'https://liquipedia.net/easportsfc/FC_Pro_26/World_Championship',
  },
  {
    id: 'sp-wc-manu',
    kind: 'SCENE',
    handle: 'Vejrgang',
    playerId: 'vejrgang',
    date: '2026-07-26',
    headline: 'The defending champion is out. Vejrgang did it.',
    body: 'ManuBachoore, two-time world champion and the man who won this event in 2025, lost 7–5 to Vejrgang in the round of 16. The title did not travel.',
    source: 'EA FC Pro · World Championship 26 review',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-pro/news/fc-pro-world-championship-26-review',
  },
  {
    id: 'sp-wc-emre',
    kind: 'SCENE',
    handle: 'EmreYilmaz',
    playerId: 'emreyilmaz',
    date: '2026-07-26',
    headline: 'Emre nearly went out in the league. Then Vejrgang hit him 9–2.',
    body: 'The two-time eChampions League winner sat 25th after day two. He crawled to 23rd, made the play-in, and Vejrgang beat him 9–2. That is the Paris story for Liquid’s other Dutchman.',
    source: 'EA FC Pro · World Championship 26 review',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-pro/news/fc-pro-world-championship-26-review',
  },
  {
    id: 'sp-wc-format',
    kind: 'NEWS',
    handle: 'FC 26',
    date: '2026-07-26',
    headline: 'New World Championship format: 36-player league, then knockouts.',
    body: 'Six league matches each. Top eight straight to the last 16. Ninth to 24th play a one-off. Bottom twelve go home. Day three was postponed on technical issues. The league finished on day four.',
    source: 'EA FC Pro · World Championship 26 review',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-pro/news/fc-pro-world-championship-26-review',
  },
  {
    id: 'sp-ecl',
    kind: 'TITLE',
    handle: 'Vejrgang',
    playerId: 'vejrgang',
    date: '2026-05-27',
    headline: 'Vejrgang wins the eChampions League in Budapest.',
    body: 'Anders Vejrgang beat HHezerS 3–2 in an all-eSerie A final. He had taken nicolas99fc 6–5 in the quarters and samugamer 6–5 in the semis. Open, eSerie A, eCL — same season.',
    source: 'Soccer Gaming · eChampions League 2026 finals',
    sourceUrl: 'https://soccergaming.com/echampions-league-2026-concludes-with-intense-finals-in-hungary',
  },
  {
    id: 'sp-laliga',
    kind: 'TITLE',
    handle: 'nicolas99fc',
    playerId: 'nicolas99fc',
    date: '2026-05-10',
    headline: 'nicolas99fc makes it three LALIGA FC Pro titles in a row.',
    body: 'The Iceman is back in the eChampions League the same way he always is — by winning Spain again. DFernandes, PHzin and tuga810 came with him.',
    source: 'EA FC Pro · eChampions League 2026 preview',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-pro/news/echampions-league-2026-preview',
  },
  {
    id: 'sp-vbl',
    kind: 'TITLE',
    handle: 'Nassada',
    playerId: 'nassada',
    date: '2026-05-10',
    headline: 'Nassada wins the Virtual Bundesliga. First time.',
    body: 'SC Freiburg’s Moroccan. Alihan finished runner-up. Milkalove and Musti took the other German eCL seats. Then Nassada walked into a world-championship semi.',
    source: 'EA FC Pro · eChampions League 2026 preview',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-pro/news/echampions-league-2026-preview',
  },
  {
    id: 'sp-epl',
    kind: 'TITLE',
    handle: 'Bonanno',
    playerId: 'bonanno',
    date: '2026-05-10',
    headline: 'City take the ePremier League. Bonanno and Jafonso.',
    body: 'Manchester City’s pair are the 2026 ePL champions. Tekkz and NiKSNEB (Leeds) finished runners-up. Jafonso’s first eChampions League came with it.',
    source: 'EA FC Pro · eChampions League 2026 preview',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-pro/news/echampions-league-2026-preview',
  },
  {
    id: 'sp-open',
    kind: 'TITLE',
    handle: 'Vejrgang',
    playerId: 'vejrgang',
    date: '2026-01-26',
    headline: 'Vejrgang keeps the Open. 4–1 Emre. First player past $1 million.',
    body: 'Television Centre, London. He beat ManuBachoore 6–5 in the quarters, Levi de Weerd 6–5 in the semis, Emre Yilmaz 4–1 in the final. $100,000. The first FC Pro player to cross a million in career prizes.',
    source: 'EA FC Pro · Open 26 finals review',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-pro/news/fc-pro-open-26-finals-review',
  },
];

export function sceneTimeLabel(iso: string, now = Date.now()): string {
  const days = Math.max(0, Math.round((now - new Date(iso).getTime()) / 86_400_000));
  if (days <= 0) return 'TODAY';
  if (days === 1) return '1D AGO';
  if (days < 7) return `${days}D AGO`;
  if (days < 30) return `${Math.floor(days / 7)}W AGO`;
  return `${Math.floor(days / 30)}MO AGO`;
}

function livePosts(): ScenePost[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const live = require('./fiftySocialLive.json') as { posts?: ScenePost[] };
    return Array.isArray(live.posts) ? live.posts : [];
  } catch {
    return [];
  }
}

export function sceneFeed(): ScenePost[] {
  return [...livePosts(), ...mechanicFeedPosts(), ...SCENE_FEED].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

export function playerById(id: string): FiftyPlayer | undefined {
  return THE_FIFTY.find((p) => p.id === id);
}

export function fiftySorted(): FiftyPlayer[] {
  return [...THE_FIFTY].sort((a, b) => a.handle.localeCompare(b.handle));
}
