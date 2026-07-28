// ─────────────────────────────────────────────────────────────
// THE TILL — app-side copy of the charge engine rails.
// The SERVER is the source of truth (catalog, wallet, ledger);
// this file keeps an offline mirror of the price list so the
// store screen still renders (clearly badged OFFLINE) when the
// network is down. Money never moves inside the app: paying
// happens on the founder's own payment links, credits are
// granted from the Founder Desk after he sees the alert.
// ─────────────────────────────────────────────────────────────

export interface StoreProduct {
  code: string;
  title: string;
  /** AFRICA track: credits the pack drops into the wallet */
  credits?: number;
  /** WORLD track: plan the subscription activates */
  plan?: string;
  /** display text — exactly what the founder typed in products.json */
  price: string;
  /** https payment page once merchant links exist; anything else = not set */
  payLink?: string;
}

export interface StoreCatalog {
  live: boolean;
  goLive: string;
  region: string;
  products: { africa: StoreProduct[]; world: StoreProduct[] };
}

/** offline mirror of server/products.json defaults */
export const FALLBACK_PRODUCTS: { africa: StoreProduct[]; world: StoreProduct[] } = {
  africa: [
    { code: 'NG-STARTER', title: 'STARTER PACK', credits: 100, price: '₦500', payLink: 'ASK-IN-HALL' },
    { code: 'NG-REGULAR', title: 'REGULAR PACK', credits: 300, price: '₦1,200', payLink: 'ASK-IN-HALL' },
    { code: 'NG-GRINDER', title: 'GRINDER PACK', credits: 750, price: '₦2,500', payLink: 'ASK-IN-HALL' },
    { code: 'NG-PATRON', title: 'PATRON PACK', credits: 1700, price: '₦5,000', payLink: 'ASK-IN-HALL' },
  ],
  world: [
    { code: 'PRO-MONTHLY', title: 'PRO MONTHLY', plan: 'pro', price: '$4.99 / MONTH', payLink: 'ASK-IN-HALL' },
  ],
};

// app-side assumption for the offline banner; the server always
// overrides with its own GO_LIVE whenever it answers
export const OFFLINE_GO_LIVE = '2027-01-01T00:00:00Z';

/** a pay link only counts when it is a real secure page */
export function isHttpPayLink(link?: string): link is string {
  return !!link && /^https:\/\//i.test(link);
}

/** ribbon label — "JAN 1" when the switch is a new year, else the date */
export function goLiveLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10).toUpperCase();
  if (d.getUTCMonth() === 0 && d.getUTCDate() === 1) return 'JAN 1';
  return d.toUTCString().slice(5, 16).toUpperCase();
}

export const TILL_COPY = {
  eyebrow: 'THE ACADEMY TILL · YOUR OWN SERVER, NOT AN APP STORE',
  title: 'THE TILL',
  closedRibbon:
    'THE SHELVES ARE STOCKED AND THE PRICES ARE PUBLIC. THE TILL ITSELF OPENS {DAY} — THE FOUNDER IS TAKING PRICING VOTES IN THE HALLS UNTIL THEN.',
  howHeader: 'HOW A TOP-UP REACHES YOU — THE HONEST LOOP',
  howLines: [
    '1 · YOU PAY ON THE FOUNDER’S SECURE LINK, WITH YOUR ACADEMY ID IN THE REMARK.',
    '2 · HIS BANK/PAYSTACK ALERT LANDS. HE CONFIRMS IT HIMSELF — A HUMAN, NOT A BOT.',
    '3 · HE CREDITS YOUR WALLET FROM THE FOUNDER DESK. WITHIN 24 HOURS, USUALLY FAR LESS.',
  ],
  howFoot:
    'EARLY ACADEMY, HUMAN PIPELINE — THE MACHINES COME LATER. ANY TOP-UP THAT GOES WRONG IS FIXED BY THE SAME PAIR OF HANDS.',
  africaHead: 'AFRICA TRACK · CREDIT PACKS',
  worldHead: 'WORLD TRACK · PRO SUBSCRIPTION',
  unsetNote: 'YOU SKIPPED THE COUNTRY QUESTION AT SIGN-UP, SO BOTH TRACKS ARE SHOWN. THE JAN 1 SPLIT DECIDES WHICH ONE IS YOURS.',
  remarkNote: 'PAY WITH YOUR ACADEMY ID ({ID}) IN THE REMARK — THAT IS HOW THE FOUNDER FINDS YOUR WALLET.',
  offline: 'OFFLINE — SERVER UNREACHABLE. SHOWING THE POSTED PRICE LIST; WALLETS SYNC WHEN IT IS BACK.',
} as const;
