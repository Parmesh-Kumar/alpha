/**
 * Factor library.
 *
 * Each factor is a deterministic function of an instrument's OHLCV history and
 * returns a series aligned with the bars array (NaN during the warm-up window).
 * The catalogue follows the spirit of qlib's Alpha158: momentum, volatility,
 * volume/liquidity, trend, candlestick shape, distribution shape and regime
 * descriptors.
 */

import type { Series, Universe } from "./market";
import { mean, std } from "./market";

export type FactorFamily =
  | "Momentum"
  | "Volatility"
  | "Volume & Liquidity"
  | "Trend"
  | "Candlestick"
  | "Distribution"
  | "Regime"
  | "Standardized";

export interface FactorDef {
  id: string;
  name: string;
  family: FactorFamily;
  description: string;
  /** Look-back in trading days before the first valid value. */
  window: number;
  /** +1 when higher values are expected to be favourable, -1 otherwise. */
  direction: 1 | -1;
  compute: (series: Series) => number[];
}

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

const NAN = Number.NaN;

function ema(values: number[], span: number): number[] {
  const k = 2 / (span + 1);
  const out: number[] = new Array(values.length).fill(NAN);
  let prev = values[0];
  out[0] = prev;
  for (let i = 1; i < values.length; i += 1) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

type WindowFn = (slice: number[]) => number;

function rolling(values: number[], window: number, fn: WindowFn, minPeriods = window): number[] {
  const out: number[] = new Array(values.length).fill(NAN);
  for (let i = window - 1; i < values.length; i += 1) {
    const slice = values.slice(i - window + 1, i + 1);
    if (slice.some((v) => !Number.isFinite(v))) continue;
    if (slice.length < minPeriods) continue;
    out[i] = fn(slice);
  }
  return out;
}

function rollingStd(values: number[], window: number): number[] {
  return rolling(values, window, (s) => std(s));
}

function rollingSkew(values: number[], window: number): number[] {
  return rolling(values, window, (s) => {
    const m = mean(s);
    const sd = std(s);
    if (sd === 0) return 0;
    let acc = 0;
    for (const v of s) acc += ((v - m) / sd) ** 3;
    return acc / s.length;
  });
}

function rollingKurt(values: number[], window: number): number[] {
  return rolling(values, window, (s) => {
    const m = mean(s);
    const sd = std(s);
    if (sd === 0) return 0;
    let acc = 0;
    for (const v of s) acc += ((v - m) / sd) ** 4;
    return acc / s.length - 3;
  });
}

function rollingRank(values: number[], window: number): number[] {
  return rolling(values, window, (s) => {
    const last = s[s.length - 1];
    let below = 0;
    for (const v of s) if (v < last) below += 1;
    return below / (s.length - 1);
  });
}

function rollingSlope(values: number[], window: number): number[] {
  return rolling(values, window, (s) => {
    const n = s.length;
    const xMean = (n - 1) / 2;
    const yMean = mean(s);
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      num += (i - xMean) * (s[i] - yMean);
      den += (i - xMean) ** 2;
    }
    if (den === 0 || yMean === 0) return 0;
    return num / den / Math.abs(yMean);
  });
}

function rollingRSquared(values: number[], window: number): number[] {
  return rolling(values, window, (s) => {
    const n = s.length;
    const xMean = (n - 1) / 2;
    const yMean = mean(s);
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < n; i += 1) {
      num += (i - xMean) * (s[i] - yMean);
      dx += (i - xMean) ** 2;
      dy += (s[i] - yMean) ** 2;
    }
    if (dx === 0 || dy === 0) return 0;
    return (num * num) / (dx * dy);
  });
}

function rollingCorr(a: number[], b: number[], window: number): number[] {
  const out: number[] = new Array(a.length).fill(NAN);
  for (let i = window - 1; i < a.length; i += 1) {
    const sa = a.slice(i - window + 1, i + 1);
    const sb = b.slice(i - window + 1, i + 1);
    if (sa.some((v) => !Number.isFinite(v)) || sb.some((v) => !Number.isFinite(v))) continue;
    const ma = mean(sa);
    const mb = mean(sb);
    let num = 0;
    let da = 0;
    let db = 0;
    for (let j = 0; j < sa.length; j += 1) {
      num += (sa[j] - ma) * (sb[j] - mb);
      da += (sa[j] - ma) ** 2;
      db += (sb[j] - mb) ** 2;
    }
    out[i] = da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
  }
  return out;
}

function ratio(numerator: number[], denominator: number[]): number[] {
  return numerator.map((v, i) => {
    const d = denominator[i];
    if (!Number.isFinite(v) || !Number.isFinite(d) || d === 0) return NAN;
    return v / d;
  });
}

function sma(values: number[], window: number): number[] {
  return rolling(values, window, (s) => mean(s));
}

function closeToClose(closes: number[], lag: number): number[] {
  return closes.map((v, i) => (i < lag ? NAN : v / closes[i - lag] - 1));
}

function trueRange(series: Series): number[] {
  const { highs, lows, closes } = series;
  return highs.map((h, i) => {
    if (i === 0) return h - lows[i];
    return Math.max(h - lows[i], Math.abs(h - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  });
}

function rsi(closes: number[], window: number): number[] {
  const out: number[] = new Array(closes.length).fill(NAN);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < closes.length; i += 1) {
    const change = closes[i] - closes[i - 1];
    const up = Math.max(change, 0);
    const down = Math.max(-change, 0);
    if (i <= window) {
      gain += up;
      loss += down;
      if (i === window) {
        gain /= window;
        loss /= window;
        out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
      }
      continue;
    }
    gain = (gain * (window - 1) + up) / window;
    loss = (loss * (window - 1) + down) / window;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

function adx(series: Series, window: number): number[] {
  const { highs, lows } = series;
  const plusDM: number[] = new Array(highs.length).fill(0);
  const minusDM: number[] = new Array(highs.length).fill(0);
  for (let i = 1; i < highs.length; i += 1) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }
  const tr = trueRange(series);
  const smoothed = (values: number[]) => {
    const out = ema(values, window);
    return out;
  };
  const trS = smoothed(tr);
  const plusS = smoothed(plusDM);
  const minusS = smoothed(minusDM);
  const dx: number[] = trS.map((t, i) => {
    if (!t) return NAN;
    const p = (plusS[i] / t) * 100;
    const m = (minusS[i] / t) * 100;
    const sum = p + m;
    return sum === 0 ? 0 : (Math.abs(p - m) / sum) * 100;
  });
  return ema(dx.map((v) => (Number.isFinite(v) ? v : 0)), window);
}

function hurst(values: number[], window: number): number[] {
  return rolling(values, window, (s) => {
    const m = mean(s);
    let cum = 0;
    let maxC = -Infinity;
    let minC = Infinity;
    for (const v of s) {
      cum += v - m;
      maxC = Math.max(maxC, cum);
      minC = Math.min(minC, cum);
    }
    const range = maxC - minC;
    const sd = std(s, false);
    if (sd === 0 || range === 0) return 0.5;
    return Math.log(range / sd) / Math.log(s.length);
  });
}

function permutationEntropy(values: number[], window: number, order = 3): number[] {
  const out: number[] = new Array(values.length).fill(NAN);
  const factorial = (n: number) => {
    let acc = 1;
    for (let i = 2; i <= n; i += 1) acc *= i;
    return acc;
  };
  const patterns = factorial(order);
  const logPatterns = Math.log(patterns);
  for (let i = window - 1; i < values.length; i += 1) {
    const slice = values.slice(i - window + 1, i + 1);
    if (slice.some((v) => !Number.isFinite(v))) continue;
    const counts = new Array(patterns).fill(0);
    for (let j = 0; j + order <= slice.length; j += 1) {
      // Lehmer code of the ordinal pattern, giving a unique index in [0, order!).
      const seq = Array.from({ length: order }, (_, k) => k).sort(
        (a, b) => slice[j + a] - slice[j + b] || a - b,
      );
      let index = 0;
      for (let k = 0; k < order; k += 1) {
        let smaller = 0;
        for (let l = k + 1; l < order; l += 1) if (seq[l] < seq[k]) smaller += 1;
        index += smaller * factorial(order - 1 - k);
      }
      counts[index % patterns] += 1;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    let h = 0;
    for (const c of counts) {
      if (c === 0) continue;
      const p = c / total;
      h -= p * Math.log(p);
    }
    out[i] = logPatterns === 0 ? 0 : h / logPatterns;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

export const FACTORS: FactorDef[] = [
  /* Momentum ------------------------------------------------------------- */
  {
    id: "MOM_ROC_10",
    name: "10D Rate of Change",
    family: "Momentum",
    description: "Close-to-close return over the trailing 10 sessions.",
    window: 10,
    direction: 1,
    compute: (s) => closeToClose(s.closes, 10),
  },
  {
    id: "MOM_ROC_20",
    name: "20D Rate of Change",
    family: "Momentum",
    description: "Close-to-close return over the trailing 20 sessions.",
    window: 20,
    direction: 1,
    compute: (s) => closeToClose(s.closes, 20),
  },
  {
    id: "MOM_ROC_60",
    name: "60D Rate of Change",
    family: "Momentum",
    description: "Medium-term price momentum.",
    window: 60,
    direction: 1,
    compute: (s) => closeToClose(s.closes, 60),
  },
  {
    id: "MOM_ROC_120",
    name: "120D Rate of Change",
    family: "Momentum",
    description: "Semi-annual momentum, the classic cross-sectional factor.",
    window: 120,
    direction: 1,
    compute: (s) => closeToClose(s.closes, 120),
  },
  {
    id: "MOM_RSI_14",
    name: "RSI (14)",
    family: "Momentum",
    description: "Relative strength index — overbought names score high.",
    window: 15,
    direction: -1,
    compute: (s) => rsi(s.closes, 14),
  },
  {
    id: "MOM_TSRANK_20",
    name: "20D Time-Series Rank",
    family: "Momentum",
    description: "Percentile rank of today's close within its 20-day range.",
    window: 20,
    direction: 1,
    compute: (s) => rollingRank(s.closes, 20),
  },

  /* Volatility ----------------------------------------------------------- */
  {
    id: "VOL_STD_20",
    name: "20D Realised Volatility",
    family: "Volatility",
    description: "Standard deviation of daily returns; low volatility is rewarded.",
    window: 21,
    direction: -1,
    compute: (s) => {
      const r = s.closes.map((c, i) => (i === 0 ? NAN : c / s.closes[i - 1] - 1));
      return rollingStd(r, 20);
    },
  },
  {
    id: "VOL_STD_60",
    name: "60D Realised Volatility",
    family: "Volatility",
    description: "Medium-horizon volatility regime.",
    window: 61,
    direction: -1,
    compute: (s) => rollingStd(s.closes, 60),
  },
  {
    id: "VOL_ATR_14",
    name: "ATR / Close (14)",
    family: "Volatility",
    description: "Average true range normalised by price.",
    window: 15,
    direction: -1,
    compute: (s) => ratio(rolling(trueRange(s), 14, (w) => mean(w)), s.closes),
  },
  {
    id: "VOL_DOWNSIDE_20",
    name: "20D Downside Deviation",
    family: "Volatility",
    description: "Semi-deviation of negative returns only.",
    window: 20,
    direction: -1,
    compute: (s) =>
      rolling(s.closes, 20, (w) => {
        const rets: number[] = [];
        for (let i = 1; i < w.length; i += 1) rets.push(w[i] / w[i - 1] - 1);
        const neg = rets.filter((r) => r < 0);
        if (neg.length === 0) return 0;
        return Math.sqrt(mean(neg.map((r) => r * r)));
      }),
  },
  {
    id: "VOL_RATIO_5_20",
    name: "Volatility Term Ratio (5/20)",
    family: "Volatility",
    description: "Short-horizon volatility relative to the 20-day baseline.",
    window: 21,
    direction: -1,
    compute: (s) => {
      const short = rollingStd(s.closes, 5);
      const long = rollingStd(s.closes, 20);
      return ratio(short, long);
    },
  },

  /* Volume & Liquidity --------------------------------------------------- */
  {
    id: "VLM_VMA_20",
    name: "Volume vs 20D Mean",
    family: "Volume & Liquidity",
    description: "Today's volume divided by its 20-day average.",
    window: 20,
    direction: 1,
    compute: (s) => ratio(s.volumes, sma(s.volumes, 20)),
  },
  {
    id: "VLM_VSTD_20",
    name: "Volume Coefficient of Variation",
    family: "Volume & Liquidity",
    description: "Dispersion of volume — unstable liquidity is penalised.",
    window: 20,
    direction: -1,
    compute: (s) => ratio(rollingStd(s.volumes, 20), sma(s.volumes, 20)),
  },
  {
    id: "VLM_AMT_20_120",
    name: "Turnover Trend (20/120)",
    family: "Volume & Liquidity",
    description: "Recent traded value relative to the semi-annual baseline.",
    window: 121,
    direction: 1,
    compute: (s) => {
      const amount = s.closes.map((c, i) => c * s.volumes[i]);
      return ratio(sma(amount, 20), sma(amount, 120));
    },
  },
  {
    id: "VLM_ILLIQ",
    name: "Amihud Illiquidity",
    family: "Volume & Liquidity",
    description: "Absolute return per unit of traded value.",
    window: 20,
    direction: -1,
    compute: (s) => {
      const illiq = s.closes.map((c, i) => {
        if (i === 0) return NAN;
        const amount = c * s.volumes[i];
        if (!amount) return NAN;
        return (Math.abs(c / s.closes[i - 1] - 1) / amount) * 1e8;
      });
      return rolling(illiq, 20, (w) => mean(w));
    },
  },
  {
    id: "VLM_PV_CORR_20",
    name: "Price / Volume Correlation",
    family: "Volume & Liquidity",
    description: "20-day correlation between price and volume.",
    window: 20,
    direction: -1,
    compute: (s) => rollingCorr(s.closes, s.volumes, 20),
  },

  /* Trend ---------------------------------------------------------------- */
  {
    id: "TRD_MA_GAP_5_20",
    name: "MA Gap (5/20)",
    family: "Trend",
    description: "Fast moving average premium over the slow average.",
    window: 20,
    direction: 1,
    compute: (s) => {
      const fast = sma(s.closes, 5);
      const slow = sma(s.closes, 20);
      return ratio(fast, slow);
    },
  },
  {
    id: "TRD_MA_GAP_20_60",
    name: "MA Gap (20/60)",
    family: "Trend",
    description: "Intermediate trend structure.",
    window: 60,
    direction: 1,
    compute: (s) => ratio(sma(s.closes, 20), sma(s.closes, 60)),
  },
  {
    id: "TRD_MACD",
    name: "MACD (12, 26)",
    family: "Trend",
    description: "EMA spread normalised by price.",
    window: 26,
    direction: 1,
    compute: (s) => ratio(ema(s.closes, 12).map((v, i) => v - ema(s.closes, 26)[i]), s.closes),
  },
  {
    id: "TRD_ADX_14",
    name: "ADX (14)",
    family: "Trend",
    description: "Directional movement strength — trending names score high.",
    window: 28,
    direction: 1,
    compute: (s) => adx(s, 14),
  },
  {
    id: "TRD_SLOPE_20",
    name: "Normalised Regression Slope",
    family: "Trend",
    description: "Least-squares slope of the last 20 closes, price-normalised.",
    window: 20,
    direction: 1,
    compute: (s) => rollingSlope(s.closes, 20),
  },
  {
    id: "TRD_REVERSAL_5",
    name: "5D Mean Reversion",
    family: "Trend",
    description: "Short-term reversal — recent losers are favoured.",
    window: 5,
    direction: -1,
    compute: (s) => closeToClose(s.closes, 5),
  },

  /* Candlestick ---------------------------------------------------------- */
  {
    id: "KBR_RANGE",
    name: "High-Low Range",
    family: "Candlestick",
    description: "Intraday range normalised by close.",
    window: 1,
    direction: -1,
    compute: (s) => s.bars.map((b) => (b.high - b.low) / b.close),
  },
  {
    id: "KBR_CLV",
    name: "Close Location Value",
    family: "Candlestick",
    description: "Where the close sits within the day's range.",
    window: 1,
    direction: 1,
    compute: (s) =>
      s.bars.map((b) => {
        const span = b.high - b.low;
        return span === 0 ? 0.5 : (b.close - b.low) / span - 0.5;
      }),
  },
  {
    id: "KBR_GAP",
    name: "Overnight Gap",
    family: "Candlestick",
    description: "Open relative to the previous close.",
    window: 1,
    direction: -1,
    compute: (s) =>
      s.bars.map((b, i) => (i === 0 ? NAN : b.open / s.bars[i - 1].close - 1)),
  },
  {
    id: "KBR_SHADOW",
    name: "Upper Shadow Pressure",
    family: "Candlestick",
    description: "Upper wick relative to the real body.",
    window: 1,
    direction: -1,
    compute: (s) =>
      s.bars.map((b) => (b.high - Math.max(b.close, b.open)) / b.close),
  },

  /* Distribution --------------------------------------------------------- */
  {
    id: "DST_SKEW_20",
    name: "Return Skewness (20)",
    family: "Distribution",
    description: "Third moment of the return distribution.",
    window: 20,
    direction: -1,
    compute: (s) => rollingSkew(s.closes, 20),
  },
  {
    id: "DST_KURT_20",
    name: "Return Kurtosis (20)",
    family: "Distribution",
    description: "Excess fourth moment — tail risk is penalised.",
    window: 20,
    direction: -1,
    compute: (s) => rollingKurt(s.closes, 20),
  },
  {
    id: "DST_MAX_20",
    name: "Max Daily Return (20)",
    family: "Distribution",
    description: "Lottery-like payoffs are penalised.",
    window: 21,
    direction: -1,
    compute: (s) =>
      rolling(s.closes, 20, (w) => {
        let best = -Infinity;
        for (let i = 1; i < w.length; i += 1) best = Math.max(best, w[i] / w[i - 1] - 1);
        return best;
      }),
  },

  /* Regime --------------------------------------------------------------- */
  {
    id: "RGM_HURST_60",
    name: "Hurst Exponent (60)",
    family: "Regime",
    description: "Persistence of the price process — trending above 0.5.",
    window: 60,
    direction: 1,
    compute: (s) => hurst(s.closes, 60),
  },
  {
    id: "RGM_ENTROPY_60",
    name: "Permutation Entropy (60)",
    family: "Regime",
    description: "Randomness of the return ordering; low entropy means structure.",
    window: 60,
    direction: -1,
    compute: (s) => permutationEntropy(s.closes, 60, 3),
  },
  {
    id: "RGM_TREND_R2_60",
    name: "Trend Explanatory Power (60)",
    family: "Regime",
    description: "R² of a linear fit over 60 sessions.",
    window: 60,
    direction: 1,
    compute: (s) => rollingRSquared(s.closes, 60),
  },

  /* Standardized --------------------------------------------------------- */
  {
    id: "STD_ZRET_5",
    name: "Standardised 5D Return",
    family: "Standardized",
    description: "Five-day return divided by its trailing 60-day dispersion.",
    window: 61,
    direction: 1,
    compute: (s) => {
      const r5 = closeToClose(s.closes, 5);
      const sd = rollingStd(s.closes, 60);
      return ratio(r5, sd);
    },
  },
  {
    id: "STD_ZVOL_20",
    name: "Standardised Volume Spike",
    family: "Standardized",
    description: "Volume z-score against its trailing 60-day distribution.",
    window: 60,
    direction: 1,
    compute: (s) => {
      const m = sma(s.volumes, 60);
      const sd = rollingStd(s.volumes, 60);
      return ratio(s.volumes.map((v, i) => v - m[i]), sd);
    },
  },
  {
    id: "STD_TSRANK_60",
    name: "60D Time-Series Rank",
    family: "Standardized",
    description: "Percentile rank of price within its quarterly range.",
    window: 60,
    direction: 1,
    compute: (s) => rollingRank(s.closes, 60),
  },
];

export const FACTOR_MAP: Record<string, FactorDef> = Object.fromEntries(
  FACTORS.map((f) => [f.id, f]),
);

export const FAMILIES: FactorFamily[] = [
  "Momentum",
  "Volatility",
  "Volume & Liquidity",
  "Trend",
  "Candlestick",
  "Distribution",
  "Regime",
  "Standardized",
];

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                  */
/* -------------------------------------------------------------------------- */

const cache = new Map<string, number[][]>();

/** Values indexed [seriesIndex][barIndex]. Cached because factors are immutable. */
export function factorValues(universe: Universe, factorId: string): number[][] {
  const cached = cache.get(factorId);
  if (cached) return cached;
  const def = FACTOR_MAP[factorId];
  if (!def) throw new Error(`Unknown factor: ${factorId}`);
  const values = universe.series.map((series) => def.compute(series));
  cache.set(factorId, values);
  return values;
}
