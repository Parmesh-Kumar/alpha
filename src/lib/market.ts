/**
 * Deterministic market universe.
 *
 * Alpha Foundry ships a self-contained research universe so the workbench is
 * fully reproducible without network access. Every price path is generated from
 * a seeded PRNG, so the same universe is produced on every load and on every
 * machine.
 *
 * NOTE: this universe is SYNTHETIC. It is shaped to behave like an equity
 * market (regime shifts, fat tails, sector co-movement, volume clustering) but
 * it is not real market data.
 */

export interface Instrument {
  symbol: string;
  name: string;
  sector: string;
  beta: number;
  alpha: number;
  vol: number;
  startPrice: number;
}

export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Series {
  instrument: Instrument;
  bars: Bar[];
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
}

export interface Universe {
  calendar: string[];
  series: Series[];
  marketReturn: number[];
  asOf: string;
}

export const TRADING_DAYS = 1260;
export const START_DATE = Date.UTC(2021, 0, 4);

/* -------------------------------------------------------------------------- */
/* Randomness                                                                  */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* -------------------------------------------------------------------------- */
/* Calendar                                                                    */
/* -------------------------------------------------------------------------- */

function buildCalendar(days: number): string[] {
  const out: string[] = [];
  const cursor = new Date(START_DATE);
  while (out.length < days) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      out.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Instrument roster                                                           */
/* -------------------------------------------------------------------------- */

interface Spec {
  symbol: string;
  name: string;
  sector: string;
  beta: number;
  alpha: number;
  vol: number;
  startPrice: number;
}

const SPECS: Spec[] = [
  { symbol: "NVX", name: "Novex Systems", sector: "Technology", beta: 1.31, alpha: 0.055, vol: 0.031, startPrice: 148.2 },
  { symbol: "AURA", name: "Aura Semiconductor", sector: "Technology", beta: 1.44, alpha: 0.071, vol: 0.036, startPrice: 92.6 },
  { symbol: "CLDD", name: "Cloudreach Data", sector: "Technology", beta: 1.18, alpha: 0.043, vol: 0.027, startPrice: 203.4 },
  { symbol: "PRSM", name: "Prism Software", sector: "Technology", beta: 1.09, alpha: 0.028, vol: 0.024, startPrice: 76.9 },
  { symbol: "QLNT", name: "Quanta Logic", sector: "Technology", beta: 1.22, alpha: 0.019, vol: 0.029, startPrice: 118.5 },
  { symbol: "HXGN", name: "Hexagon Networks", sector: "Technology", beta: 1.05, alpha: -0.004, vol: 0.026, startPrice: 64.1 },

  { symbol: "MTRB", name: "Metrobank Holdings", sector: "Financials", beta: 1.07, alpha: 0.022, vol: 0.019, startPrice: 51.7 },
  { symbol: "CDLT", name: "Credility Capital", sector: "Financials", beta: 1.13, alpha: 0.031, vol: 0.022, startPrice: 88.3 },
  { symbol: "ASSU", name: "Assurance Mutual", sector: "Financials", beta: 0.86, alpha: 0.014, vol: 0.017, startPrice: 132.9 },
  { symbol: "EQTX", name: "Equitex Exchange", sector: "Financials", beta: 1.19, alpha: 0.037, vol: 0.023, startPrice: 44.2 },
  { symbol: "PNTN", name: "Penton Asset Mgmt", sector: "Financials", beta: 1.28, alpha: -0.011, vol: 0.028, startPrice: 97.4 },

  { symbol: "GNOM", name: "Genomics One", sector: "Healthcare", beta: 0.92, alpha: 0.046, vol: 0.03, startPrice: 62.8 },
  { symbol: "MEDQ", name: "MediQt Diagnostics", sector: "Healthcare", beta: 0.79, alpha: 0.026, vol: 0.021, startPrice: 109.6 },
  { symbol: "BIOV", name: "Bioverge Therapeutics", sector: "Healthcare", beta: 1.02, alpha: 0.068, vol: 0.038, startPrice: 38.5 },
  { symbol: "CLRX", name: "Calyx Medical", sector: "Healthcare", beta: 0.84, alpha: -0.007, vol: 0.019, startPrice: 84.1 },
  { symbol: "VITA", name: "Vitalis Care", sector: "Healthcare", beta: 0.71, alpha: 0.012, vol: 0.016, startPrice: 126.3 },

  { symbol: "PTRM", name: "Petram Energy", sector: "Energy", beta: 1.24, alpha: 0.033, vol: 0.032, startPrice: 71.8 },
  { symbol: "SOLF", name: "Solaris Fuels", sector: "Energy", beta: 1.37, alpha: 0.052, vol: 0.039, startPrice: 29.7 },
  { symbol: "GRDL", name: "Gridline Power", sector: "Energy", beta: 0.93, alpha: 0.008, vol: 0.022, startPrice: 58.4 },
  { symbol: "NRTH", name: "Northwind Utilities", sector: "Energy", beta: 0.62, alpha: 0.003, vol: 0.014, startPrice: 92.2 },

  { symbol: "AXLM", name: "Axiom Machinery", sector: "Industrials", beta: 1.14, alpha: 0.029, vol: 0.023, startPrice: 113.7 },
  { symbol: "FORG", name: "Forgewright Ind.", sector: "Industrials", beta: 1.21, alpha: 0.041, vol: 0.026, startPrice: 67.5 },
  { symbol: "LOGT", name: "Logitrans Freight", sector: "Industrials", beta: 1.06, alpha: 0.017, vol: 0.021, startPrice: 82.9 },
  { symbol: "STRX", name: "Structura Build", sector: "Industrials", beta: 1.09, alpha: -0.013, vol: 0.024, startPrice: 45.6 },
  { symbol: "AERO", name: "Aerodyne Corp", sector: "Industrials", beta: 1.26, alpha: 0.024, vol: 0.028, startPrice: 154.8 },

  { symbol: "CONS", name: "Consumo Brands", sector: "Consumer", beta: 0.68, alpha: 0.018, vol: 0.015, startPrice: 138.4 },
  { symbol: "RETL", name: "Retailix Group", sector: "Consumer", beta: 0.97, alpha: 0.027, vol: 0.022, startPrice: 59.3 },
  { symbol: "FDSR", name: "Foodsphere", sector: "Consumer", beta: 0.54, alpha: 0.009, vol: 0.012, startPrice: 74.7 },
  { symbol: "LSRG", name: "Leisurigo", sector: "Consumer", beta: 1.12, alpha: -0.019, vol: 0.027, startPrice: 36.9 },
  { symbol: "APRL", name: "Aparel House", sector: "Consumer", beta: 0.88, alpha: 0.006, vol: 0.02, startPrice: 102.1 },

  { symbol: "MINX", name: "Mineralex", sector: "Materials", beta: 1.16, alpha: 0.035, vol: 0.027, startPrice: 88.6 },
  { symbol: "STEL", name: "Steelmark Alloys", sector: "Materials", beta: 1.23, alpha: -0.008, vol: 0.029, startPrice: 54.2 },
  { symbol: "CHMX", name: "Chemax Polymers", sector: "Materials", beta: 0.99, alpha: 0.015, vol: 0.021, startPrice: 119.5 },
  { symbol: "GOLD", name: "Goldline Resources", sector: "Materials", beta: 0.74, alpha: 0.044, vol: 0.026, startPrice: 176.3 },

  { symbol: "UTEQ", name: "Utileq Water", sector: "Utilities", beta: 0.48, alpha: 0.011, vol: 0.012, startPrice: 66.4 },
  { symbol: "TRNS", name: "Transcend Grid", sector: "Utilities", beta: 0.52, alpha: 0.005, vol: 0.013, startPrice: 91.8 },
  { symbol: "SOLR", name: "Solara Renewables", sector: "Utilities", beta: 0.83, alpha: -0.014, vol: 0.022, startPrice: 42.7 },
];

export const SECTORS = Array.from(new Set(SPECS.map((s) => s.sector)));

/* -------------------------------------------------------------------------- */
/* Path generation                                                             */
/* -------------------------------------------------------------------------- */

function buildMarketSeries(rand: () => number, days: number): number[] {
  // Regime machine: 0 = expansion, 1 = compression, 2 = drawdown, 3 = recovery.
  // The stationary distribution is roughly (0.42, 0.30, 0.10, 0.18), giving the
  // market a mild positive drift rather than a coin flip.
  const driftByRegime = [0.00095, 0.00012, -0.0012, 0.0007];
  const volByRegime = [0.0072, 0.0061, 0.0158, 0.0103];
  const transition = [
    [0.968, 0.016, 0.008, 0.008],
    [0.02, 0.952, 0.018, 0.01],
    [0.012, 0.03, 0.918, 0.04],
    [0.028, 0.014, 0.014, 0.944],
  ];

  const out: number[] = [];
  let regime = 0;
  for (let i = 0; i < days; i += 1) {
    const roll = rand();
    let acc = 0;
    for (let r = 0; r < 4; r += 1) {
      acc += transition[regime][r];
      if (roll <= acc) {
        regime = r;
        break;
      }
    }
    const shock = rand() < 0.012 ? gaussian(rand) * 3.4 : 0;
    out.push(driftByRegime[regime] + gaussian(rand) * volByRegime[regime] + shock * 0.004);
  }
  return out;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildUniverse(seed = 20240517, days = TRADING_DAYS): Universe {
  const rand = mulberry32(seed);
  const calendar = buildCalendar(days);
  const marketReturn = buildMarketSeries(rand, days);

  // Pin the realised drift so the synthetic market always carries a plausible
  // upward bias, whichever regime path this seed happened to produce.
  const targetDailyDrift = 0.0003;
  const realisedDrift = mean(marketReturn);
  for (let i = 0; i < marketReturn.length; i += 1) {
    marketReturn[i] += targetDailyDrift - realisedDrift;
  }

  const series: Series[] = SPECS.map((spec, index) => {
    const own = mulberry32(seed + (index + 1) * 7919);
    const bars: Bar[] = [];
    let price = spec.startPrice;
    // Deterministic baseline turnover: cheaper names trade in larger share counts.
    let volume = 320_000 + ((index * 37) % 11) * 45_000 + spec.startPrice * 900;
    // Persistent, slowly mean-reverting idiosyncratic state. This is the latent
    // structure that makes trailing-price factors genuinely informative: an
    // instrument that has been strong tends to stay strong for weeks, so
    // momentum and trend descriptors carry real (if noisy) predictive power.
    let latent = gaussian(own) * 0.0013;

    for (let i = 0; i < days; i += 1) {
      latent = 0.965 * latent + gaussian(own) * 0.00036;
      const idio = gaussian(own) * spec.vol * 0.5;
      const gap = i % 47 === 0 ? gaussian(own) * spec.vol * 1.2 : 0;
      const ret = spec.alpha / 252 + spec.beta * marketReturn[i] + idio + gap * 0.5 + latent;

      const open = price * (1 + gap * 0.35);
      const close = Math.max(1.2, price * (1 + ret));
      const span = Math.abs(ret) + spec.vol * (0.5 + own() * 0.7);
      const high = Math.max(open, close) * (1 + span * 0.45);
      const low = Math.min(open, close) * (1 - span * 0.45);

      const activity = 1 + Math.abs(ret) / spec.vol;
      volume = volume * (0.9 + own() * 0.2) * (0.85 + activity * 0.25);

      bars.push({
        date: calendar[i],
        open: round(open),
        high: round(high),
        low: round(Math.max(0.8, low)),
        close: round(close),
        volume: Math.round(volume),
      });

      price = close;
    }

    return {
      instrument: {
        symbol: spec.symbol,
        name: spec.name,
        sector: spec.sector,
        beta: spec.beta,
        alpha: spec.alpha,
        vol: spec.vol,
        startPrice: spec.startPrice,
      },
      bars,
      closes: bars.map((b) => b.close),
      highs: bars.map((b) => b.high),
      lows: bars.map((b) => b.low),
      volumes: bars.map((b) => b.volume),
    };
  });

  return {
    calendar,
    series,
    marketReturn,
    asOf: calendar[calendar.length - 1],
  };
}

let cachedUniverse: Universe | null = null;

export function getUniverse(): Universe {
  if (!cachedUniverse) cachedUniverse = buildUniverse();
  return cachedUniverse;
}

/* -------------------------------------------------------------------------- */
/* Rolling primitives                                                          */
/* -------------------------------------------------------------------------- */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

export function std(values: number[], sample = true): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) ** 2;
  return Math.sqrt(acc / (sample ? n - 1 : n));
}

export function returnsOf(closes: number[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < closes.length; i += 1) {
    out.push(closes[i] / closes[i - 1] - 1);
  }
  return out;
}
