import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { BarChart, CHART, Donut, LineChart, MonthlyHeatmap, SERIES_PALETTE, Sparkline } from "@/components/charts";
import { Badge, Button, Panel, Skeleton, Stat, buttonClass } from "@/components/ui";
import { defaultConfig } from "@/lib/engine";
import { FACTOR_MAP } from "@/lib/factors";
import { MODELS } from "@/lib/models";
import { pct, relativeTime, signed, toneClass } from "@/lib/format";
import { useBacktest, useUniverse } from "@/lib/useResearch";
import { useFactorStats } from "@/lib/useFactorStats";
import { useRuns } from "@/lib/runs";
import { useAuth } from "@/lib/auth";

const OVERVIEW_FACTORS = [
  "MOM_ROC_120",
  "TRD_MA_GAP_20_60",
  "VLM_AMT_20_120",
  "VOL_STD_20",
  "RGM_HURST_60",
  "DST_MAX_20",
  "KBR_CLV",
  "TRD_ADX_14",
  "VLM_ILLIQ",
  "STD_ZRET_5",
  "MOM_RSI_14",
  "TRD_SLOPE_20",
];

export default function OverviewPage() {
  const universe = useUniverse();
  const { user } = useAuth();
  const { runs } = useRuns();
  const config = useMemo(() => defaultConfig(), []);
  const { result, running } = useBacktest(config);
  const stats = useFactorStats(OVERVIEW_FACTORS);

  const icItems = useMemo(
    () =>
      OVERVIEW_FACTORS.map((id) => ({ label: id.split("_")[0], value: stats[id]?.ic ?? 0 })).filter(
        (entry) => entry.value !== 0,
      ),
    [stats],
  );

  const bestFactors = useMemo(
    () =>
      OVERVIEW_FACTORS.map((id) => ({ id, stat: stats[id] }))
        .filter((entry) => entry.stat !== undefined)
        .sort((a, b) => (b.stat?.rankIc ?? 0) - (a.stat?.rankIc ?? 0))
        .slice(0, 5),
    [stats],
  );

  const leaderboard = useMemo(
    () => [...MODELS].sort((a, b) => b.benchmark.informationRatio - a.benchmark.informationRatio).slice(0, 5),
    [],
  );

  const metrics = result?.metrics;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Research desk"
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "researcher"}`}
        description={`Default blend evaluated across ${universe.series.length} instruments and ${universe.calendar.length} sessions (${universe.calendar[0]} → ${universe.asOf}).`}
        actions={
          <>
            <Link className={buttonClass("outline", "md")} to="/dashboard/factors">
              Factor library
            </Link>
            <Link className={buttonClass("primary", "md")} to="/dashboard/studio">
              <Sparkles className="h-4 w-4" />
              Open the studio
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Annualised return"
          value={metrics ? pct(metrics.annualizedReturn, 1) : "—"}
          hint={metrics ? `Equal-weight ${pct(metrics.benchmarkReturn, 1)}` : "Running…"}
          tone={metrics ? (metrics.annualizedReturn >= 0 ? "positive" : "negative") : "neutral"}
        />
        <Stat
          label="Sharpe ratio"
          value={metrics ? signed(metrics.sharpe, 2) : "—"}
          hint={metrics ? `Vol ${pct(metrics.annualizedVol, 1)}` : "Running…"}
        />
        <Stat
          label="Rank IC"
          value={metrics ? metrics.rankIc.toFixed(4) : "—"}
          hint={metrics ? `IC IR ${signed(metrics.icIr, 2)}` : "Running…"}
        />
        <Stat
          label="Max drawdown"
          value={metrics ? pct(metrics.maxDrawdown, 1) : "—"}
          hint={metrics ? `Calmar ${signed(metrics.calmar, 2)}` : "Running…"}
          tone="negative"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label">Equity curve · growth of 1</div>
              <div className="mt-1 text-sm text-foreground">
                Momentum + trend + liquidity blend, decile long
              </div>
            </div>
            <Badge tone={running ? "warning" : "positive"}>{running ? "Computing" : "Settled"}</Badge>
          </div>
          <div className="mt-5">
            {result ? (
              <LineChart
                height={280}
                baseline={1}
                formatValue={(value) => value.toFixed(2)}
                xLabels={result.dates.map((date) => date.slice(2, 7))}
                series={[
                  { key: "strategy", label: "Strategy", values: result.equity, color: CHART.primary, fill: true },
                  { key: "bench", label: "Equal-weight", values: result.benchmark, color: CHART.muted, dashed: true },
                ]}
              />
            ) : (
              <Skeleton className="h-[280px] w-full" />
            )}
          </div>
          <div className="mt-5">
            <div className="label">Drawdown</div>
            <div className="mt-2">
              {result ? (
                <LineChart
                  height={120}
                  baseline={0}
                  formatValue={(value) => `${(value * 100).toFixed(0)}%`}
                  series={[{ key: "dd", label: "Drawdown", values: result.drawdown, color: CHART.negative, fill: true }]}
                />
              ) : (
                <Skeleton className="h-[120px] w-full" />
              )}
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="label">Cross-sectional IC · preview set</div>
            <div className="mt-4">
              {icItems.length ? (
                <BarChart items={icItems} height={190} formatValue={(value) => value.toFixed(4)} />
              ) : (
                <Skeleton className="h-[190px] w-full" />
              )}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <div className="label">Strongest factors by rank IC</div>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-2">
              {bestFactors.length === 0
                ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-11 w-full" />)
                : bestFactors.map((entry) => (
                    <div
                      key={entry.id}
                      className="panel-elevated flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-foreground">{FACTOR_MAP[entry.id].name}</div>
                        <div className="text-[11px] text-muted-foreground">{FACTOR_MAP[entry.id].family}</div>
                      </div>
                      <div className="num text-sm text-positive">{entry.stat?.rankIc.toFixed(4)}</div>
                    </div>
                  ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="label">Monthly returns</div>
          <div className="mt-4">
            {result ? <MonthlyHeatmap data={result.monthly} /> : <Skeleton className="h-40 w-full" />}
          </div>
        </Panel>

        <Panel>
          <div className="label">Sector exposure · latest rebalance</div>
          <div className="mt-5">
            {result && result.sectorExposure.length ? (
              <Donut
                items={result.sectorExposure.map((entry, index) => ({
                  label: entry.sector,
                  value: entry.weight,
                  color: SERIES_PALETTE[index % SERIES_PALETTE.length],
                }))}
              />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="label">Reference model leaderboard</div>
            <Link className="text-xs text-primary hover:underline" to="/dashboard/models">
              All {MODELS.length} models
            </Link>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {leaderboard.map((model) => (
                <tr key={model.id} className="border-t border-border/40">
                  <td className="px-5 py-3">
                    <div className="text-foreground">{model.name}</div>
                    <div className="text-[11px] text-muted-foreground">{model.family}</div>
                  </td>
                  <td className="num px-3 py-3 text-right text-positive">
                    {pct(model.benchmark.annualizedReturn, 1)}
                  </td>
                  <td className="num px-5 py-3 text-right text-foreground">
                    IR {model.benchmark.informationRatio.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel className="p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="label">Recent saved runs</div>
            <Link className="flex items-center gap-1 text-xs text-primary hover:underline" to="/dashboard/experiments">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {runs.length === 0 ? (
            <div className="px-5 pb-6 pt-1 text-sm text-muted-foreground">
              No runs saved yet. Configure a blend in the studio and save it to build a research trail.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {runs.slice(0, 4).map((run) => (
                <div key={run.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">{run.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {run.config.factorIds.length} factors · {relativeTime(run.createdAt)}
                    </div>
                  </div>
                  <div className="w-24">
                    <Sparkline values={run.equityPreview} height={32} />
                  </div>
                  <div className={`num w-20 text-right text-sm ${toneClass(run.metrics.annualizedReturn)}`}>
                    {pct(run.metrics.annualizedReturn, 1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-foreground">Ready to change the blend?</div>
          <p className="mt-1 text-sm text-muted-foreground">
            The studio recomputes the full pipeline whenever a parameter changes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className={buttonClass("outline", "md")} to="/dashboard/experiments">
            Saved runs
          </Link>
          <Link className={buttonClass("primary", "md")} to="/dashboard/studio">
            Configure a run
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Panel>

      {result && (
        <Panel className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Turnover", value: `${result.metrics.annualTurnover.toFixed(1)}×` },
            { label: "Positions", value: result.metrics.averagePositions.toFixed(1) },
            { label: "Hit rate", value: pct(result.metrics.hitRate, 1) },
            { label: "Beta", value: result.metrics.beta.toFixed(2) },
            { label: "Alpha", value: pct(result.metrics.alpha, 1) },
            { label: "Best day", value: pct(result.metrics.bestDay, 2) },
          ].map((item) => (
            <div key={item.label}>
              <div className="label">{item.label}</div>
              <div className="num mt-1 text-sm text-foreground">{item.value}</div>
            </div>
          ))}
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Button variant="ghost" size="sm" disabled>
          Data: bundled synthetic universe
        </Button>
        <span>·</span>
        <span>Deterministic seed 20240517 · reproducible on every load</span>
      </div>
    </div>
  );
}
