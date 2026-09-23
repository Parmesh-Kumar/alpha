import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Play, RotateCcw, Save, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CHART, Donut, LineChart, MonthlyHeatmap, SERIES_PALETTE } from "@/components/charts";
import {
  Badge,
  Button,
  Input,
  Label,
  Panel,
  Select,
  Skeleton,
  Slider,
  Stat,
  Switch,
  Textarea,
} from "@/components/ui";
import { FACTORS, FAMILIES, FACTOR_MAP } from "@/lib/factors";
import { defaultConfig, warmupFor, type BacktestConfig } from "@/lib/engine";
import { pct, signed, toneClass } from "@/lib/format";
import { useBacktest, useUniverse } from "@/lib/useResearch";
import { useFactorStats } from "@/lib/useFactorStats";
import { useRuns } from "@/lib/runs";
import { cn } from "@/lib/utils";

const ALL_IDS = FACTORS.map((factor) => factor.id);

function downsample(values: number[], target = 120): number[] {
  if (values.length <= target) return values;
  const step = values.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i += 1) out.push(values[Math.floor(i * step)]);
  out.push(values[values.length - 1]);
  return out;
}

export default function StudioPage() {
  const universe = useUniverse();
  const location = useLocation();
  const { create } = useRuns();
  const stats = useFactorStats(ALL_IDS);

  const incoming = (location.state as { config?: BacktestConfig } | null)?.config;

  const [config, setConfig] = useState<BacktestConfig>(() => incoming ?? defaultConfig());
  const [family, setFamily] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [volTargetOn, setVolTargetOn] = useState(config.volatilityTarget !== null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (incoming) setConfig(incoming);
  }, [incoming]);

  const { result, running, error } = useBacktest(config);

  const visibleFactors = useMemo(() => {
    const term = query.trim().toLowerCase();
    return FACTORS.filter((factor) => {
      if (family !== "All" && factor.family !== family) return false;
      if (!term) return true;
      return (
        factor.name.toLowerCase().includes(term) ||
        factor.id.toLowerCase().includes(term) ||
        factor.description.toLowerCase().includes(term)
      );
    });
  }, [family, query]);

  const toggleFactor = (id: string) => {
    setConfig((previous) => {
      const has = previous.factorIds.includes(id);
      const factorIds = has
        ? previous.factorIds.filter((entry) => entry !== id)
        : [...previous.factorIds, id];
      return { ...previous, factorIds };
    });
    setSaved(null);
  };

  const update = <K extends keyof BacktestConfig>(key: K, value: BacktestConfig[K]) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
    setSaved(null);
  };

  const reset = () => {
    setConfig(defaultConfig());
    setVolTargetOn(false);
    setSaved(null);
  };

  const warmup = warmupFor(config.factorIds);
  const startIndexMax = Math.max(warmup + 10, universe.calendar.length - 120);

  const save = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await create({
        name: name.trim() || `Run ${new Date().toLocaleString()}`,
        note,
        config,
        metrics: result.metrics,
        equityPreview: downsample(result.equity),
      });
      setSaved("Run saved to the research trail.");
      setName("");
      setNote("");
    } catch (cause) {
      setSaved(cause instanceof Error ? cause.message : "Could not save the run.");
    } finally {
      setSaving(false);
    }
  };

  const contributions = result
    ? { top: result.contributions.slice(0, 6), bottom: result.contributions.slice(-6).reverse() }
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Backtest studio"
        title="Configure a blend and read the tape"
        description="Every change re-runs the cross-sectional backtest: composite scoring, portfolio construction, commission, slippage and volatility targeting."
        actions={
          <>
            <Badge tone={running ? "warning" : "positive"}>{running ? "Running" : "Settled"}</Badge>
            <Button variant="outline" size="md" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <Panel className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="label">Factor blend</div>
              <span className="num text-xs text-muted-foreground">{config.factorIds.length} selected</span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search factors"
                className="pl-9"
              />
            </div>

            <Select
              value={family}
              onChange={setFamily}
              options={[{ value: "All", label: "All families" }, ...FAMILIES.map((f) => ({ value: f, label: f }))]}
            />

            <div className="max-h-[320px] space-y-1 overflow-auto pr-1 no-scrollbar">
              {visibleFactors.map((factor) => {
                const active = config.factorIds.includes(factor.id);
                const stat = stats[factor.id];
                return (
                  <button
                    key={factor.id}
                    type="button"
                    onClick={() => toggleFactor(factor.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-elevated/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px]",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {active ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{factor.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{factor.family}</span>
                    </span>
                    <span
                      className={cn(
                        "num shrink-0 text-[11px]",
                        stat ? (stat.rankIc >= 0 ? "text-positive" : "text-negative") : "text-muted-foreground",
                      )}
                    >
                      {stat ? stat.rankIc.toFixed(3) : "…"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="space-y-5">
            <div className="label">Portfolio construction</div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rebalance frequency</span>
                <span className="num text-foreground">{config.rebalanceDays}d</span>
              </div>
              <Slider min={1} max={21} step={1} value={config.rebalanceDays} onChange={(value) => update("rebalanceDays", value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Position quantile</span>
                <span className="num text-foreground">{config.quantile.toFixed(2)}</span>
              </div>
              <Slider min={0.05} max={0.5} step={0.05} value={config.quantile} onChange={(value) => update("quantile", value)} />
            </div>

            <Switch
              checked={config.longShort}
              onChange={(value) => update("longShort", value)}
              label="Long / short (dollar neutral)"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Commission</span>
                <span className="num text-foreground">{config.costBps} bps</span>
              </div>
              <Slider min={0} max={30} step={1} value={config.costBps} onChange={(value) => update("costBps", value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Slippage</span>
                <span className="num text-foreground">{config.slippageBps} bps</span>
              </div>
              <Slider min={0} max={30} step={1} value={config.slippageBps} onChange={(value) => update("slippageBps", value)} />
            </div>

            <Switch
              checked={volTargetOn}
              onChange={(value) => {
                setVolTargetOn(value);
                update("volatilityTarget", value ? 0.12 : null);
              }}
              label="Volatility targeting"
            />

            {volTargetOn ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Target volatility</span>
                  <span className="num text-foreground">{pct(config.volatilityTarget ?? 0.12, 0)}</span>
                </div>
                <Slider
                  min={0.04}
                  max={0.3}
                  step={0.01}
                  value={config.volatilityTarget ?? 0.12}
                  onChange={(value) => update("volatilityTarget", value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Backtest start</span>
                <span className="num text-foreground">{universe.calendar[config.startIndex] ?? "—"}</span>
              </div>
              <Slider
                min={Math.min(warmup + 1, startIndexMax)}
                max={startIndexMax}
                step={5}
                value={Math.min(config.startIndex, startIndexMax)}
                onChange={(value) => update("startIndex", value)}
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                The blend needs {warmup} sessions of warm-up before the first signal is valid.
              </p>
            </div>
          </Panel>

          <Panel className="space-y-4">
            <div className="label">Save this run</div>
            <div className="space-y-2">
              <Label htmlFor="run-name">Run name</Label>
              <Input
                id="run-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Momentum + liquidity, weekly"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-note">Research note</Label>
              <Textarea
                id="run-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Why this blend, what you expect to see, what to try next."
              />
            </div>
            <Button className="w-full" onClick={save} disabled={saving || !result || config.factorIds.length === 0}>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save run"}
            </Button>
            {saved ? <div className="text-xs text-muted-foreground">{saved}</div> : null}
          </Panel>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {config.factorIds.length === 0 ? (
            <Panel className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Play className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm text-foreground">Select at least one factor</div>
              <p className="max-w-sm text-sm text-muted-foreground">
                The engine needs a blend to score the universe cross-sectionally.
              </p>
            </Panel>
          ) : null}

          {error ? (
            <Panel className="border-negative/40 bg-negative/5 text-sm text-negative">{error}</Panel>
          ) : null}

          {result ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                  label="Annualised return"
                  value={pct(result.metrics.annualizedReturn, 1)}
                  hint={`Total ${pct(result.metrics.totalReturn, 1)}`}
                  tone={result.metrics.annualizedReturn >= 0 ? "positive" : "negative"}
                />
                <Stat label="Sharpe" value={signed(result.metrics.sharpe, 2)} hint={`Vol ${pct(result.metrics.annualizedVol, 1)}`} />
                <Stat label="Rank IC" value={result.metrics.rankIc.toFixed(4)} hint={`IC IR ${signed(result.metrics.icIr, 2)}`} />
                <Stat
                  label="Max drawdown"
                  value={pct(result.metrics.maxDrawdown, 1)}
                  hint={`Calmar ${signed(result.metrics.calmar, 2)}`}
                  tone="negative"
                />
              </div>

              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="label">Equity vs equal-weight benchmark</div>
                  <Badge>{config.factorIds.length} factors · {config.rebalanceDays}d rebalance</Badge>
                </div>
                <div className="mt-5">
                  <LineChart
                    height={300}
                    baseline={1}
                    formatValue={(value) => value.toFixed(2)}
                    xLabels={result.dates.map((date) => date.slice(0, 7))}
                    series={[
                      { key: "strategy", label: "Strategy", values: result.equity, color: CHART.primary, fill: true },
                      { key: "bench", label: "Equal-weight", values: result.benchmark, color: CHART.muted, dashed: true },
                    ]}
                  />
                </div>
              </Panel>

              <div className="grid gap-4 lg:grid-cols-2">
                <Panel>
                  <div className="label">Drawdown profile</div>
                  <div className="mt-4">
                    <LineChart
                      height={180}
                      baseline={0}
                      formatValue={(value) => `${(value * 100).toFixed(0)}%`}
                      series={[{ key: "dd", label: "Drawdown", values: result.drawdown, color: CHART.negative, fill: true }]}
                    />
                  </div>
                </Panel>
                <Panel>
                  <div className="label">Rolling 60-day Sharpe</div>
                  <div className="mt-4">
                    <LineChart
                      height={180}
                      baseline={0}
                      formatValue={(value) => value.toFixed(1)}
                      series={[{ key: "rs", label: "Rolling Sharpe", values: result.rollingSharpe, color: CHART.accent, fill: true }]}
                    />
                  </div>
                </Panel>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Panel>
                  <div className="label">Daily IC</div>
                  <div className="mt-4">
                    <LineChart
                      height={180}
                      baseline={0}
                      formatValue={(value) => value.toFixed(2)}
                      series={[
                        { key: "ic", label: "IC", values: result.icSeries.map((point) => point.ic), color: CHART.info },
                      ]}
                    />
                  </div>
                </Panel>
                <Panel>
                  <div className="label">Monthly returns</div>
                  <div className="mt-4">
                    <MonthlyHeatmap data={result.monthly} />
                  </div>
                </Panel>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <Panel>
                  <div className="label">Sector exposure · latest rebalance</div>
                  <div className="mt-5">
                    {result.sectorExposure.length ? (
                      <Donut
                        items={result.sectorExposure.map((entry, index) => ({
                          label: entry.sector,
                          value: entry.weight,
                          color: SERIES_PALETTE[index % SERIES_PALETTE.length],
                        }))}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">No positions at the latest rebalance.</div>
                    )}
                  </div>
                </Panel>

                <Panel>
                  <div className="label">Risk decomposition</div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Beta", value: result.metrics.beta.toFixed(3) },
                      { label: "Alpha", value: pct(result.metrics.alpha, 1) },
                      { label: "Sortino", value: signed(result.metrics.sortino, 2) },
                      { label: "Hit rate", value: pct(result.metrics.hitRate, 1) },
                      { label: "Annual turnover", value: `${result.metrics.annualTurnover.toFixed(1)}×` },
                      { label: "Avg positions", value: result.metrics.averagePositions.toFixed(1) },
                    ].map((item) => (
                      <div key={item.label} className="panel-elevated p-3.5">
                        <div className="label">{item.label}</div>
                        <div className="num mt-1.5 text-sm text-foreground">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              {contributions ? (
                <Panel className="p-0">
                  <div className="px-5 py-4">
                    <div className="label">Contribution to return</div>
                  </div>
                  <div className="grid gap-0 sm:grid-cols-2">
                    {[
                      { title: "Top contributors", rows: contributions.top },
                      { title: "Largest detractors", rows: contributions.bottom },
                    ].map((group) => (
                      <div key={group.title} className="border-t border-border/40 px-5 py-4 sm:border-t-0 sm:first:border-r">
                        <div className="label mb-3">{group.title}</div>
                        <div className="space-y-2">
                          {group.rows.map((row) => (
                            <div key={row.symbol} className="flex items-center justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate text-foreground">
                                <span className="num">{row.symbol}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{row.sector}</span>
                              </span>
                              <span className={cn("num", toneClass(row.contribution))}>
                                {pct(row.contribution, 2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}

              <Panel>
                <div className="label">Factor mix in this run</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {config.factorIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated/60 px-3 py-1 text-xs text-muted-foreground"
                    >
                      <span className="text-foreground">{FACTOR_MAP[id]?.name ?? id}</span>
                      <button
                        type="button"
                        className="text-muted-foreground transition-colors hover:text-negative"
                        onClick={() => toggleFactor(id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </Panel>
            </>
          ) : config.factorIds.length > 0 ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-[300px] w-full" />
              <Skeleton className="h-[180px] w-full" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
