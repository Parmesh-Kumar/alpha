/**
 * Cross-sectional research engine.
 *
 * Factors are combined into a composite score, standardised across the universe
 * on each date, and turned into a long (or long/short) portfolio that is
 * rebalanced on a fixed schedule. Trades are charged commission plus slippage
 * and the resulting path is measured with standard buy-side risk statistics.
 */

import { FACTOR_MAP, FACTORS, factorValues } from "./factors";
import { getUniverse, mean, std, type Universe } from "./market";

export interface BacktestConfig {
  factorIds: string[];
  weights: Record<string, number>;
  startIndex: number;
  rebalanceDays: number;
  quantile: number;
  longShort: boolean;
  costBps: number;
  slippageBps: number;
  volatilityTarget: number | null;
}

export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  annualizedVol: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  calmar: number;
  hitRate: number;
  annualTurnover: number;
  averagePositions: number;
  ic: number;
  rankIc: number;
  icIr: number;
  beta: number;
  alpha: number;
  benchmarkReturn: number;
  bestDay: number;
  worstDay: number;
}

export interface Contribution {
  symbol: string;
  name: string;
  sector: string;
  contribution: number;
  averageWeight: number;
  daysHeld: number;
}

export interface MonthlyReturn {
  key: string;
  label: string;
  year: number;
  month: number;
  value: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  dates: string[];
  equity: number[];
  benchmark: number[];
  drawdown: number[];
  rollingSharpe: number[];
  icSeries: { date: string; ic: number; rankIc: number }[];
  monthly: MonthlyReturn[];
  metrics: BacktestMetrics;
  sectorExposure: { sector: string; weight: number }[];
  contributions: Contribution[];
}

export interface FactorStats {
  id: string;
  coverage: number;
  ic: number;
  rankIc: number;
  icIr: number;
  autocorr: number;
  spreadBps: number;
  bestHorizon: number;
}

/* -------------------------------------------------------------------------- */
/* Math helpers                                                                */
/* -------------------------------------------------------------------------- */

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

function averageRanks(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(values.length).fill(0);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j += 1;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) out[order[k].i] = rank;
    i = j + 1;
  }
  return out;
}

function spearman(a: number[], b: number[]): number {
  if (a.length < 3) return 0;
  return pearson(averageRanks(a), averageRanks(b));
}

export function warmupFor(factorIds: string[]): number {
  if (factorIds.length === 0) return 5;
  return Math.max(...factorIds.map((id) => FACTOR_MAP[id]?.window ?? 5)) + 1;
}

export function defaultConfig(factorIds: string[] = ["MOM_ROC_120", "TRD_MA_GAP_20_60", "VLM_AMT_20_120"]): BacktestConfig {
  return {
    factorIds,
    weights: {},
    startIndex: 140,
    rebalanceDays: 5,
    quantile: 0.2,
    longShort: false,
    costBps: 5,
    slippageBps: 2,
    volatilityTarget: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Composite scores                                                            */
/* -------------------------------------------------------------------------- */

const scoreCache = new Map<string, number[][]>();

function compositeScores(universe: Universe, config: BacktestConfig): number[][] {
  const key = `${config.factorIds.join("|")}::${config.factorIds
    .map((id) => config.weights[id] ?? 1)
    .join(",")}`;
  const cached = scoreCache.get(key);
  if (cached) return cached;

  const { series, calendar } = universe;
  const n = series.length;
  const days = calendar.length;

  const matrices = config.factorIds.map((id) => factorValues(universe, id));
  const totalWeight = config.factorIds.reduce((acc, id) => acc + (config.weights[id] ?? 1), 0) || 1;

  const scores: number[][] = Array.from({ length: days }, () => new Array<number>(n).fill(NaN));

  for (let t = 0; t < days; t += 1) {
    for (let f = 0; f < matrices.length; f += 1) {
      const def = FACTOR_MAP[config.factorIds[f]];
      const matrix = matrices[f];
      const w = (config.weights[config.factorIds[f]] ?? 1) / totalWeight;

      const raw: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i < n; i += 1) {
        const v = matrix[i][t];
        if (Number.isFinite(v)) {
          raw.push(v);
          idx.push(i);
        }
      }
      if (raw.length < 5) continue;

      const m = mean(raw);
      const sd = std(raw, false);
      if (sd === 0) continue;

      for (let j = 0; j < raw.length; j += 1) {
        const z = Math.max(-3, Math.min(3, (raw[j] - m) / sd));
        const target = idx[j];
        const prev = scores[t][target];
        scores[t][target] = (Number.isFinite(prev) ? prev : 0) + def.direction * w * z;
      }
    }
  }

  scoreCache.set(key, scores);
  return scores;
}

/* -------------------------------------------------------------------------- */
/* Portfolio construction                                                      */
/* -------------------------------------------------------------------------- */

function targetWeights(score: number[], config: BacktestConfig, scale: number): number[] {
  const n = score.length;
  const out = new Array<number>(n).fill(0);
  const entries = score
    .map((v, i) => ({ v, i }))
    .filter((e) => Number.isFinite(e.v))
    .sort((a, b) => b.v - a.v);
  if (entries.length < 5) return out;

  const k = Math.max(1, Math.floor(entries.length * config.quantile));
  const longs = entries.slice(0, k);
  const shorts = config.longShort ? entries.slice(entries.length - k) : [];

  const grossLong = config.longShort ? 0.5 : 1;
  const longWeight = (grossLong / k) * scale;
  for (const e of longs) out[e.i] = longWeight;

  if (shorts.length > 0) {
    const shortWeight = (0.5 / k) * scale;
    for (const e of shorts) out[e.i] = -shortWeight;
  }

  return out;
}

function currentRealisedVol(rets: number[], window = 60): number {
  if (rets.length < 10) return 0;
  const slice = rets.slice(-window);
  const sd = std(slice);
  return sd * Math.sqrt(252);
}

/* -------------------------------------------------------------------------- */
/* Backtest                                                                    */
/* -------------------------------------------------------------------------- */

export function runBacktest(config: BacktestConfig, universe: Universe = getUniverse()): BacktestResult {
  const { series, calendar } = universe;
  const n = series.length;
  const daily = series.map((s) =>
    s.closes.map((c, i) => (i === 0 ? 0 : c / s.closes[i - 1] - 1)),
  );
  const scores = compositeScores(universe, config);

  const warmup = warmupFor(config.factorIds);
  const last = calendar.length - 1;
  const start = Math.max(warmup, Math.min(config.startIndex, Math.max(2, last - 60)));

  const equity: number[] = [1];
  const benchmark: number[] = [1];
  const drawdown: number[] = [0];
  const rollingSharpe: number[] = [0];
  const dailyReturns: number[] = [];
  const icSeries: { date: string; ic: number; rankIc: number }[] = [];

  let weights = new Array<number>(n).fill(0);
  const contribution = new Array<number>(n).fill(0);
  const absWeightSum = new Array<number>(n).fill(0);
  const daysHeld = new Array<number>(n).fill(0);
  const positionCounts: number[] = [];

  let turnoverTotal = 0;
  let rebalanceCount = 0;
  let peak = 1;
  let lastSectorExposure: { sector: string; weight: number }[] = [];

  for (let t = start; t <= last; t += 1) {
    const isRebalance = (t - start) % Math.max(1, config.rebalanceDays) === 0;
    let cost = 0;

    if (isRebalance && t - 1 >= 0) {
      let scale = 1;
      if (config.volatilityTarget && dailyReturns.length > 20) {
        const realised = currentRealisedVol(dailyReturns);
        if (realised > 0) scale = Math.max(0.2, Math.min(1.6, config.volatilityTarget / realised));
      }
      const target = targetWeights(scores[t - 1], config, scale);
      let turnover = 0;
      for (let i = 0; i < n; i += 1) turnover += Math.abs(target[i] - weights[i]);
      turnover /= 2;
      cost = (turnover * (config.costBps + config.slippageBps)) / 10000;
      turnoverTotal += turnover;
      rebalanceCount += 1;
      weights = target;

      const bySector = new Map<string, number>();
      let grossTotal = 0;
      for (let i = 0; i < n; i += 1) {
        const w = Math.abs(weights[i]);
        if (w === 0) continue;
        grossTotal += w;
        bySector.set(series[i].instrument.sector, (bySector.get(series[i].instrument.sector) ?? 0) + w);
      }
      lastSectorExposure = Array.from(bySector.entries())
        .map(([sector, w]) => ({ sector, weight: grossTotal ? w / grossTotal : 0 }))
        .sort((a, b) => b.weight - a.weight);
    }

    let gross = 0;
    let positions = 0;
    let benchmarkRet = 0;
    for (let i = 0; i < n; i += 1) {
      benchmarkRet += daily[i][t];
      if (weights[i] !== 0) {
        const piece = weights[i] * daily[i][t];
        gross += piece;
        contribution[i] += piece;
        absWeightSum[i] += Math.abs(weights[i]);
        daysHeld[i] += 1;
        positions += 1;
      }
    }
    benchmarkRet /= n;

    const net = gross - cost;
    dailyReturns.push(net);
    equity.push(equity[equity.length - 1] * (1 + net));
    benchmark.push(benchmark[benchmark.length - 1] * (1 + benchmarkRet));
    peak = Math.max(peak, equity[equity.length - 1]);
    drawdown.push(equity[equity.length - 1] / peak - 1);
    positionCounts.push(positions);

    const trailing = dailyReturns.slice(-60);
    rollingSharpe.push(
      trailing.length > 5 ? (mean(trailing) / (std(trailing) || 1)) * Math.sqrt(252) : 0,
    );

    if (t + 1 <= last) {
      const sats: number[] = [];
      const fwds: number[] = [];
      for (let i = 0; i < n; i += 1) {
        const s = scores[t][i];
        if (!Number.isFinite(s)) continue;
        sats.push(s);
        fwds.push(daily[i][t + 1]);
      }
      if (sats.length >= 8) {
        icSeries.push({ date: calendar[t], ic: pearson(sats, fwds), rankIc: spearman(sats, fwds) });
      }
    }
  }

  const dates = calendar.slice(start);
  const periods = monthly(dates, dailyReturns);
  const years = dailyReturns.length / 252;

  const totalReturn = equity[equity.length - 1] - 1;
  const annualizedReturn = Math.pow(1 + totalReturn, 252 / Math.max(1, dailyReturns.length)) - 1;
  const annualizedVol = std(dailyReturns) * Math.sqrt(252);
  const downside = std(dailyReturns.filter((r) => r < 0));
  const negPeak = Math.min(...drawdown);
  const benchmarkTotal = benchmark[benchmark.length - 1] - 1;
  const benchmarkAnnual = Math.pow(1 + benchmarkTotal, 252 / Math.max(1, dailyReturns.length)) - 1;
  const beta = covarianceBeta(dailyReturns, benchmarkReturnsOf(benchmark));
  const icValues = icSeries.map((p) => p.ic);
  const rankIcValues = icSeries.map((p) => p.rankIc);

  const metrics: BacktestMetrics = {
    totalReturn,
    annualizedReturn,
    annualizedVol,
    sharpe: annualizedVol === 0 ? 0 : annualizedReturn / annualizedVol,
    sortino: downside === 0 ? 0 : annualizedReturn / (downside * Math.sqrt(252)),
    maxDrawdown: negPeak,
    calmar: negPeak === 0 ? 0 : annualizedReturn / Math.abs(negPeak),
    hitRate: dailyReturns.filter((r) => r > 0).length / Math.max(1, dailyReturns.length),
    annualTurnover: years > 0 ? turnoverTotal / years : 0,
    averagePositions: mean(positionCounts),
    ic: mean(icValues),
    rankIc: mean(rankIcValues),
    icIr: std(icValues) === 0 ? 0 : (mean(icValues) / std(icValues)) * Math.sqrt(252),
    beta,
    alpha: annualizedReturn - beta * benchmarkAnnual,
    benchmarkReturn: benchmarkAnnual,
    bestDay: Math.max(0, ...dailyReturns),
    worstDay: Math.min(0, ...dailyReturns),
  };

  const contributions: Contribution[] = series
    .map((s, i) => ({
      symbol: s.instrument.symbol,
      name: s.instrument.name,
      sector: s.instrument.sector,
      contribution: contribution[i],
      averageWeight: daysHeld[i] ? absWeightSum[i] / daysHeld[i] : 0,
      daysHeld: daysHeld[i],
    }))
    .sort((a, b) => b.contribution - a.contribution);

  return {
    config,
    dates,
    equity,
    benchmark,
    drawdown,
    rollingSharpe,
    icSeries,
    monthly: periods,
    metrics,
    sectorExposure: lastSectorExposure,
    contributions,
  };
}

function benchmarkReturnsOf(benchmark: number[]): number[] {
  return benchmark.map((v, i) => (i === 0 ? 0 : v / benchmark[i - 1] - 1));
}

function covarianceBeta(portfolio: number[], bench: number[]): number {
  const n = Math.min(portfolio.length, bench.length);
  if (n < 10) return 0;
  const mp = mean(portfolio.slice(0, n));
  const mb = mean(bench.slice(0, n));
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < n; i += 1) {
    cov += (portfolio[i] - mp) * (bench[i] - mb);
    varB += (bench[i] - mb) ** 2;
  }
  return varB === 0 ? 0 : cov / varB;
}

function monthly(dates: string[], returns: number[]): MonthlyReturn[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < Math.min(dates.length, returns.length); i += 1) {
    const key = dates[i].slice(0, 7);
    buckets.set(key, (buckets.get(key) ?? 1) * (1 + returns[i]));
  }
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, growth]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        label: `${labels[month - 1]} ${String(year).slice(2)}`,
        year,
        month,
        value: growth - 1,
      };
    });
}

/* -------------------------------------------------------------------------- */
/* Factor statistics                                                           */
/* -------------------------------------------------------------------------- */

const statsCache = new Map<string, FactorStats>();

export function factorStats(factorId: string, universe: Universe = getUniverse()): FactorStats {
  const cached = statsCache.get(factorId);
  if (cached) return cached;

  const matrix = factorValues(universe, factorId);
  const n = universe.series.length;
  const days = universe.calendar.length;
  const daily = universe.series.map((s) =>
    s.closes.map((c, i) => (i === 0 ? 0 : c / s.closes[i - 1] - 1)),
  );
  const def = FACTOR_MAP[factorId];
  const start = Math.max(def.window + 1, 140);

  const ics: number[] = [];
  const rankIcs: number[] = [];
  const spreads: number[] = [];
  let finite = 0;
  let total = 0;

  for (let t = start; t < days - 1; t += 1) {
    const vals: number[] = [];
    const fwd: number[] = [];
    for (let i = 0; i < n; i += 1) {
      total += 1;
      const v = matrix[i][t];
      if (!Number.isFinite(v)) continue;
      finite += 1;
      vals.push(def.direction * v);
      fwd.push(daily[i][t + 1]);
    }
    if (vals.length < 8) continue;
    ics.push(pearson(vals, fwd));
    rankIcs.push(spearman(vals, fwd));

    const order = vals.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const k = Math.max(1, Math.floor(order.length * 0.2));
    const top = mean(order.slice(0, k).map((e) => fwd[e.i]));
    const bottom = mean(order.slice(order.length - k).map((e) => fwd[e.i]));
    spreads.push((top - bottom) * 10000);
  }

  const autocorrs: number[] = [];
  for (let t = start; t < days - 1; t += 1) {
    const a: number[] = [];
    const b: number[] = [];
    for (let i = 0; i < n; i += 1) {
      if (Number.isFinite(matrix[i][t]) && Number.isFinite(matrix[i][t + 1])) {
        a.push(matrix[i][t]);
        b.push(matrix[i][t + 1]);
      }
    }
    if (a.length >= 8) autocorrs.push(pearson(a, b));
  }
  const autocorr = mean(autocorrs);

  const stats: FactorStats = {
    id: factorId,
    coverage: total === 0 ? 0 : finite / total,
    ic: mean(ics),
    rankIc: mean(rankIcs),
    icIr: std(ics) === 0 ? 0 : (mean(ics) / std(ics)) * Math.sqrt(252),
    autocorr,
    spreadBps: mean(spreads),
    bestHorizon: 1,
  };
  statsCache.set(factorId, stats);
  return stats;
}

export const ALL_FACTOR_IDS = FACTORS.map((f) => f.id);
