import { useEffect, useState } from "react";
import { factorStats, type FactorStats } from "./engine";

/**
 * Computes factor statistics one factor per tick so the main thread stays
 * responsive and the UI can fill in results progressively.
 */
export function useFactorStats(ids: string[]): Record<string, FactorStats> {
  const [stats, setStats] = useState<Record<string, FactorStats>>({});
  const key = ids.join("|");

  useEffect(() => {
    let cancelled = false;
    setStats({});
    const queue = [...ids];
    let cursor = 0;

    const step = () => {
      if (cancelled || cursor >= queue.length) return;
      const id = queue[cursor];
      cursor += 1;
      try {
        const value = factorStats(id);
        if (!cancelled) setStats((previous) => ({ ...previous, [id]: value }));
      } catch {
        /* a single factor failing must not break the table */
      }
      if (!cancelled && cursor < queue.length) window.setTimeout(step, 0);
    };

    const timer = window.setTimeout(step, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return stats;
}
