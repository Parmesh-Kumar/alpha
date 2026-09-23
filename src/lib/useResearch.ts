import { useEffect, useMemo, useState } from "react";
import { getUniverse, mean, type Series, type Universe } from "./market";
import { factorValues } from "./factors";
import { runBacktest, type BacktestConfig, type BacktestResult } from "./engine";

export function useUniverse(): Universe {
  return useMemo(() => getUniverse(), []);
}

/**
 * Runs a backtest off the render path so heavy factor evaluation never blocks
 * painting. A run is identified by its serialised config.
 */
export function useBacktest(config: BacktestConfig | null): {
  result: BacktestResult | null;
  running: boolean;
  error: string | null;
} {
  const key = config ? JSON.stringify(config) : "";
  const [state, setState] = useState<{
    key: string;
    result: BacktestResult | null;
    running: boolean;
    error: string | null;
  }>({ key: "", result: null, running: config !== null, error: null });

  useEffect(() => {
    if (!config) {
      setState({ key: "", result: null, running: false, error: null });
      return;
    }
    let cancelled = false;
    setState((previous) => ({ ...previous, running: true, error: null }));

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const result = runBacktest(config);
        if (!cancelled) setState({ key, result, running: false, error: null });
      } catch (cause) {
        if (!cancelled) {
          setState({
            key,
            result: null,
            running: false,
            error: cause instanceof Error ? cause.message : String(cause),
          });
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { result: state.result, running: state.running, error: state.error };
}

const meanCache = new Map<string, number[]>();

/** Cross-sectional average of a factor on each date, for the factor detail chart. */
export function factorMeanSeries(factorId: string): number[] {
  const cached = meanCache.get(factorId);
  if (cached) return cached;
  const universe = getUniverse();
  const matrix = factorValues(universe, factorId);
  const values: number[] = [];
  for (let t = 0; t < universe.calendar.length; t += 1) {
    const day: number[] = [];
    for (let i = 0; i < universe.series.length; i += 1) {
      const value = matrix[i][t];
      if (Number.isFinite(value)) day.push(value);
    }
    values.push(day.length ? mean(day) : Number.NaN);
  }
  meanCache.set(factorId, values);
  return values;
}

export function seriesFor(universe: Universe, symbol: string): Series | undefined {
  return universe.series.find((entry) => entry.instrument.symbol === symbol);
}
