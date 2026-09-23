import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  ChartCandlestick,
  Database,
  FlaskConical,
  GitBranch,
  LineChart,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { BarChart, CHART, LineChart as LineChartView, Sparkline } from "@/components/charts";
import { Badge, Panel, SectionHeading, buttonClass } from "@/components/ui";
import { defaultConfig, warmupFor } from "@/lib/engine";
import { FACTORS, FAMILIES, FACTOR_MAP, factorValues } from "@/lib/factors";
import { MODELS } from "@/lib/models";
import { pct, signed, signedPct } from "@/lib/format";
import { mean, std } from "@/lib/market";
import { useBacktest, useUniverse } from "@/lib/useResearch";
import { useFactorStats } from "@/lib/useFactorStats";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const PIPELINE = [
  {
    icon: Database,
    title: "Data layer",
    copy: "A point-in-time universe with OHLCV bars, sector map and a shared trading calendar — the substrate every factor reads from.",
  },
  {
    icon: FlaskConical,
    title: "Factor layer",
    copy: "Rolling statistics, momentum, microstructure and regime descriptors evaluated as pure functions of price history.",
  },
  {
    icon: BrainCircuit,
    title: "Model layer",
    copy: "Gradient boosting, sequence models and market-dynamics architectures, benchmarked on the same feature set.",
  },
  {
    icon: ChartCandlestick,
    title: "Backtest layer",
    copy: "Cross-sectional portfolio construction with commission, slippage, turnover and volatility targeting.",
  },
  {
    icon: ShieldCheck,
    title: "Evaluation layer",
    copy: "IC, rank IC, IC IR, drawdown, Calmar and monthly attribution — the metrics a research committee actually asks for.",
  },
];

export default function Landing() {
  const universe = useUniverse();
  const { user } = useAuth();
  const config = useMemo(() => defaultConfig(), []);
  const { result, running } = useBacktest(config);

  const previewFactorIds = useMemo(
    () => ["MOM_ROC_120", "VOL_STD_20", "TRD_MA_GAP_20_60", "VLM_AMT_20_120", "RGM_HURST_60", "DST_MAX_20"],
    [],
  );
  const stats = useFactorStats(previewFactorIds);

  const leaderboard = useMemo(
    () => [...MODELS].sort((a, b) => b.benchmark.annualizedReturn - a.benchmark.annualizedReturn).slice(0, 6),
    [],
  );

  const ticker = useMemo(
    () =>
      universe.series.map((series) => {
        const last = series.closes[series.closes.length - 1];
        const prev = series.closes[series.closes.length - 22];
        return {
          symbol: series.instrument.symbol,
          name: series.instrument.name,
          change: last / prev - 1,
        };
      }),
    [universe],
  );

  const factorCoverage = useMemo(
    () => FAMILIES.map((family) => ({ family, count: FACTORS.filter((f) => f.family === family).length })),
    [],
  );

  const activeFactors = useMemo(() => {
    if (previewFactorIds.length === 0) return [];
    const warmup = warmupFor(previewFactorIds);
    const values = previewFactorIds.map((id) => factorValues(universe, id));
    const out: number[] = [];
    for (let t = warmup; t < universe.calendar.length; t += 6) {
      let sum = 0;
      let count = 0;
      values.forEach((matrix, index) => {
        const day: number[] = [];
        for (let i = 0; i < universe.series.length; i += 1) {
          const value = matrix[i][t];
          if (Number.isFinite(value)) day.push(value);
        }
        if (!day.length) return;
        const m = mean(day);
        const s = std(day, false) || 1;
        sum += (FACTOR_MAP[previewFactorIds[index]].direction * m) / s;
        count += 1;
      });
      out.push(count ? sum / count : 0);
    }
    return out;
  }, [universe, previewFactorIds]);

  const icByFactor = useMemo(
    () =>
      previewFactorIds
        .map((id) => ({ label: id.split("_")[0], value: stats[id]?.ic ?? 0 }))
        .filter((entry) => entry.value !== 0),
    [previewFactorIds, stats],
  );

  const totalSessions = universe.calendar.length;
  const dateRange = `${universe.calendar[0]} → ${universe.asOf}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] grid-backdrop radial-fade opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(39 78% 60% / 0.55), transparent 65%)" }}
        aria-hidden
      />

      {/* Nav */}
      <header className="relative z-20 mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-5">
        <Brand />
        <div className="flex items-center gap-2">
          <a href="#pipeline" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
            Pipeline
          </a>
          <a href="#factors" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
            Factors
          </a>
          <a href="#models" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
            Models
          </a>
          {user ? (
            <Link className={buttonClass("primary", "sm")} to="/dashboard">
              Open workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link className={buttonClass("ghost", "sm")} to="/auth">
                Sign in
              </Link>
              <Link className={buttonClass("primary", "sm")} to="/auth?mode=signup&returnTo=%2Fdashboard">
                Start researching
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Ticker */}
      <div className="relative z-10 border-y border-border/60 bg-surface/40 py-2.5">
        <div className="flex gap-6 overflow-hidden px-5">
          <div className="flex min-w-full shrink-0 animate-ticker gap-6">
            {[...ticker, ...ticker].map((entry, index) => (
              <span key={`${entry.symbol}-${index}`} className="flex shrink-0 items-center gap-2 text-xs">
                <span className="num font-medium text-foreground">{entry.symbol}</span>
                <span className={cn("num", entry.change >= 0 ? "text-positive" : "text-negative")}>
                  {signedPct(entry.change, 1)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-[1240px] gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Badge tone="primary" className="mb-6">
            <Sparkles className="h-3 w-3" />
            qlib-inspired research workbench
          </Badge>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Find the signal.
            <br />
            <span className="text-gradient-gold">Prove the alpha.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Alpha Foundry is a full research loop in the browser: build a factor blend from 33 price and
            microstructure descriptors, run a cost-aware cross-sectional backtest against {universe.series.length}{" "}
            instruments, and compare the result to {MODELS.length} published model architectures.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link className={buttonClass("primary", "lg")} to={user ? "/dashboard" : "/auth?mode=signup&returnTo=%2Fdashboard"}>
              {user ? "Open workspace" : "Create a free account"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a className={buttonClass("outline", "lg")} href="#factors">
              Browse the factor library
            </a>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {[
              { label: "Universe", value: `${universe.series.length}` },
              { label: "Factors", value: `${FACTORS.length}` },
              { label: "Models", value: `${MODELS.length}` },
              { label: "Sessions", value: `${totalSessions}` },
            ].map((item) => (
              <div key={item.label}>
                <dt className="label">{item.label}</dt>
                <dd className="num mt-1 text-2xl font-semibold text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <Panel className="relative overflow-hidden border-border/80 p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <div>
                <div className="label">Live default run</div>
                <div className="mt-1 text-sm text-foreground">
                  3-factor blend · decile long · 5-day rebalance
                </div>
              </div>
              <Badge tone={running ? "warning" : "positive"}>{running ? "Computing" : "Up to date"}</Badge>
            </div>

            <div className="mt-5">
              {result ? (
                <LineChartView
                  height={200}
                  baseline={1}
                  formatValue={(value) => value.toFixed(2)}
                  xLabels={result.dates.map((date) => date.slice(2, 7))}
                  series={[
                    {
                      key: "strategy",
                      label: "Strategy",
                      values: result.equity,
                      color: CHART.primary,
                      fill: true,
                    },
                    {
                      key: "universe",
                      label: "Equal-weight",
                      values: result.benchmark,
                      color: CHART.muted,
                      dashed: true,
                    },
                  ]}
                />
              ) : (
                <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                  Evaluating the default blend…
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
              {[
                { label: "Ann. return", value: result ? pct(result.metrics.annualizedReturn, 1) : "—", tone: "text-positive" },
                { label: "Sharpe", value: result ? signed(result.metrics.sharpe, 2) : "—", tone: "text-foreground" },
                { label: "Max DD", value: result ? pct(result.metrics.maxDrawdown, 1) : "—", tone: "text-negative" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="label">{item.label}</div>
                  <div className={cn("num mt-1 text-lg font-semibold", item.tone)}>{item.value}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="mt-4 p-5">
            <div className="flex items-center justify-between">
              <div className="label">Composite score · standardised</div>
              <span className="num text-xs text-muted-foreground">{dateRange}</span>
            </div>
            <div className="mt-3">
              <Sparkline values={activeFactors} height={54} />
            </div>
          </Panel>
        </motion.div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="relative z-10 mx-auto w-full max-w-[1240px] px-5 py-16">
        <SectionHeading
          eyebrow="Pipeline"
          title="The same five layers qlib ships, rebuilt for the browser"
          description="Every stage is a real computation running on this machine — nothing is mocked. Change a parameter and the whole chain re-evaluates."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
            >
              <Panel className="h-full">
                <item.icon className="h-5 w-5 text-primary" />
                <div className="mt-4 text-sm font-semibold text-foreground">{item.title}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.copy}</p>
              </Panel>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Factors */}
      <section id="factors" className="relative z-10 border-y border-border/60 bg-surface/25 py-16">
        <div className="mx-auto w-full max-w-[1240px] px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Factor library"
              title="Alpha158-style descriptors, evaluated continuously"
              description="Each factor returns a full historical series per instrument. Cross-sectional standardisation and direction handling happen inside the engine."
            />
            <Link className={buttonClass("outline", "md")} to={user ? "/dashboard/factors" : "/auth?returnTo=%2Fdashboard%2Ffactors"}>
              Open the library
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Panel>
              <div className="label">Cross-sectional IC by factor · 1-day horizon</div>
              <div className="mt-4">
                {icByFactor.length ? (
                  <BarChart items={icByFactor} height={210} formatValue={(value) => value.toFixed(4)} />
                ) : (
                  <div className="flex h-[210px] items-center justify-center text-sm text-muted-foreground">
                    Evaluating factors…
                  </div>
                )}
              </div>
            </Panel>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {previewFactorIds.slice(0, 3).map((id) => {
                const def = FACTOR_MAP[id];
                const stat = stats[id];
                return (
                  <Panel key={id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{def.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{def.family}</div>
                    </div>
                    <div className="text-right">
                      <div className="label">Rank IC</div>
                      <div className="num mt-1 text-sm text-foreground">
                        {stat ? stat.rankIc.toFixed(4) : "…"}
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {factorCoverage.map((entry) => (
              <div key={entry.family} className="panel-elevated flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{entry.family}</span>
                <span className="num text-xs text-muted-foreground">{entry.count} factors</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section id="models" className="relative z-10 mx-auto w-full max-w-[1240px] px-5 py-16">
        <SectionHeading
          eyebrow="Model zoo"
          title="Benchmarks to beat, not to hand-wave"
          description="Published qlib results for the Alpha158 feature set, next to whatever you build in the studio."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Panel className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left">
                  <th className="label px-5 py-3 font-medium">Model</th>
                  <th className="label px-3 py-3 text-right font-medium">Ann. ret</th>
                  <th className="label px-3 py-3 text-right font-medium">IR</th>
                  <th className="label px-5 py-3 text-right font-medium">Max DD</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((model) => (
                  <tr key={model.id} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{model.name}</div>
                      <div className="text-xs text-muted-foreground">{model.family}</div>
                    </td>
                    <td className="num px-3 py-3 text-right text-positive">
                      {pct(model.benchmark.annualizedReturn, 1)}
                    </td>
                    <td className="num px-3 py-3 text-right text-foreground">
                      {model.benchmark.informationRatio.toFixed(2)}
                    </td>
                    <td className="num px-5 py-3 text-right text-negative">
                      {pct(model.benchmark.maxDrawdown, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <div className="space-y-4">
            <Panel>
              <div className="label">Reference information ratio</div>
              <div className="mt-4">
                <BarChart
                  height={200}
                  formatValue={(value) => value.toFixed(2)}
                  items={leaderboard.map((model) => ({
                    label: model.name,
                    value: model.benchmark.informationRatio,
                  }))}
                />
              </div>
            </Panel>
            <Panel className="flex items-start gap-4">
              <Waypoints className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Reference figures come from the published qlib benchmark tables. Runs you save in the studio are
                computed locally from the bundled synthetic universe, so treat the comparison as directional
                rather than like-for-like.
              </p>
            </Panel>
          </div>
        </div>
      </section>

      {/* Loop */}
      <section className="relative z-10 border-t border-border/60 bg-surface/25 py-16">
        <div className="mx-auto w-full max-w-[1240px] px-5">
          <SectionHeading
            eyebrow="Research loop"
            title="Iterate in seconds, not overnight"
            description="The studio keeps every run you save, so a factor blend that looked promising on Tuesday is still there on Friday."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: GitBranch,
                title: "Blend and test",
                copy: "Pick factors, weight the blend, set rebalance frequency and costs. The composite score is standardised cross-sectionally before ranking.",
              },
              {
                icon: LineChart,
                title: "Interrogate the result",
                copy: "Equity curve, drawdown path, rolling Sharpe, IC series, monthly attribution and per-name contribution — all from the same run.",
              },
              {
                icon: ShieldCheck,
                title: "Save and compare",
                copy: "Runs persist with their full configuration so you can reopen, re-run and diff parameter sets without re-deriving them by hand.",
              },
            ].map((item) => (
              <Panel key={item.title}>
                <item.icon className="h-5 w-5 text-primary" />
                <div className="mt-4 text-sm font-semibold text-foreground">{item.title}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.copy}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto w-full max-w-[1240px] px-5 py-20">
        <div className="relative overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-surface to-surface px-6 py-14 text-center shadow-glow sm:px-16">
          <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-20" aria-hidden />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your next research hour starts here
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Create an account to open the workspace, run the default blend and start editing the pipeline.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                className={buttonClass("primary", "lg")}
                to={user ? "/dashboard/studio" : "/auth?mode=signup&returnTo=%2Fdashboard%2Fstudio"}
              >
                {user ? "Open the studio" : "Create an account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className={buttonClass("outline", "lg")} to={user ? "/dashboard/factors" : "/auth?returnTo=%2Fdashboard%2Ffactors"}>
                Sign in instead
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center justify-between gap-4 px-5 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Brand compact />
            <span>Alpha Foundry · quant research workbench</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="num">{universe.series.length} instruments</span>
            <span className="num">{FACTORS.length} factors</span>
            <span className="num">{MODELS.length} models</span>
            <span>Inspired by Microsoft qlib research</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
