import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { BarChart, CHART, LineChart } from "@/components/charts";
import { Badge, Panel } from "@/components/ui";
import { MODELS, MODEL_FAMILIES, MODEL_MAP, type ModelEntry } from "@/lib/models";
import { MODEL_RECIPES, qlibGithub, qlibGithubDir } from "@/lib/qlib";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "annualizedReturn" | "informationRatio" | "ic" | "rankIc" | "maxDrawdown";

const COLUMNS: { key: SortKey; label: string; format: (model: ModelEntry) => string; tone?: string }[] = [
  {
    key: "annualizedReturn",
    label: "Ann. return",
    format: (model) => pct(model.benchmark.annualizedReturn, 1),
    tone: "text-positive",
  },
  {
    key: "informationRatio",
    label: "IR",
    format: (model) => model.benchmark.informationRatio.toFixed(3),
  },
  { key: "ic", label: "IC", format: (model) => model.benchmark.ic.toFixed(4) },
  { key: "rankIc", label: "Rank IC", format: (model) => model.benchmark.rankIc.toFixed(4) },
  {
    key: "maxDrawdown",
    label: "Max DD",
    format: (model) => pct(model.benchmark.maxDrawdown, 1),
    tone: "text-negative",
  },
];

export default function ModelsPage() {
  const [family, setFamily] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("informationRatio");
  const [selected, setSelected] = useState<string>(MODELS[0].id);

  const rows = useMemo(
    () =>
      MODELS.filter((model) => family === "All" || model.family === family).sort(
        (a, b) => b.benchmark[sort] - a.benchmark[sort],
      ),
    [family, sort],
  );

  const detail = MODEL_MAP[selected];

  const byParadigm = useMemo(() => {
    const buckets = new Map<string, { total: number; count: number }>();
    for (const model of MODELS) {
      const current = buckets.get(model.paradigm) ?? { total: 0, count: 0 };
      current.total += model.benchmark.informationRatio;
      current.count += 1;
      buckets.set(model.paradigm, current);
    }
    return Array.from(buckets.entries()).map(([label, value]) => ({
      label,
      value: value.total / value.count,
    }));
  }, []);

  const trendCurves = useMemo(() => {
    // Reference compounded paths derived from each model's published return and drawdown.
    const build = (annualized: number, maxDrawdown: number) => {
      const daily = Math.pow(1 + annualized, 1 / 252) - 1;
      const shock = 1 + maxDrawdown;
      const values: number[] = [1];
      for (let day = 1; day <= 252; day += 1) {
        const dip = day > 130 && day < 190 ? 1 + (shock - 1) / 60 : 1;
        values.push(values[values.length - 1] * (1 + daily) * dip);
      }
      return values;
    };
    return [...MODELS]
      .sort((a, b) => b.benchmark.annualizedReturn - a.benchmark.annualizedReturn)
      .slice(0, 4)
      .map((model, index) => ({
        key: model.id,
        label: model.name,
        values: build(model.benchmark.annualizedReturn, model.benchmark.maxDrawdown),
        color: [CHART.primary, CHART.accent, CHART.info, CHART.positive][index],
      }));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Model zoo"
        title={`${MODELS.length} reference architectures`}
        description="Published qlib results for the Alpha158 feature set on the CSI300 universe. These are orientation benchmarks for the results you produce in the studio, not outputs of this workbench."
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFamily("All")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
            family === "All"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          All families
        </button>
        {MODEL_FAMILIES.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setFamily(entry)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              family === entry
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {entry}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="label">Leaderboard</div>
            <span className="text-xs text-muted-foreground">
              {rows.length} model{rows.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border/60 bg-surface/60 text-left">
                  <th className="label px-5 py-3 font-medium">Model</th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      onClick={() => setSort(column.key)}
                      className={cn(
                        "label cursor-pointer px-3 py-3 text-right font-medium transition-colors hover:text-foreground",
                        sort === column.key && "text-primary",
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((model) => (
                  <tr
                    key={model.id}
                    onClick={() => setSelected(model.id)}
                    className={cn(
                      "cursor-pointer border-b border-border/30 transition-colors",
                      selected === model.id ? "bg-primary/5" : "hover:bg-elevated/40",
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{model.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {model.family} · {model.year}
                      </div>
                    </td>
                    {COLUMNS.map((column) => (
                      <td
                        key={column.key}
                        className={cn("num px-3 py-3 text-right", column.tone ?? "text-foreground")}
                      >
                        {column.format(model)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="space-y-4">
            <div>
              <div className="label">Selected model</div>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">{detail.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="primary">{detail.family}</Badge>
                <Badge>{detail.paradigm}</Badge>
                <Badge>{detail.year}</Badge>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{detail.description}</p>
            {(() => {
              const recipe = MODEL_RECIPES[detail.id];
              if (!recipe) return null;
              return (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {recipe.module ? (
                    <a
                      href={qlibGithub(recipe.module)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-primary transition-colors hover:text-primary/80"
                    >
                      qlib/{recipe.module.replace(/^qlib\//, "")} ↗
                    </a>
                  ) : null}
                  <a
                    href={qlibGithubDir(recipe.benchmarkDir)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-primary transition-colors hover:text-primary/80"
                  >
                    {recipe.benchmarkDir.replace("examples/benchmarks", "benchmark recipe")} ↗
                  </a>
                </div>
              );
            })()}
            <div className="panel-elevated p-3.5">
              <div className="label">Configuration signature</div>
              <div className="num mt-1.5 text-xs text-foreground">{detail.signature}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Ann. return", value: pct(detail.benchmark.annualizedReturn, 1) },
                { label: "Information ratio", value: detail.benchmark.informationRatio.toFixed(3) },
                { label: "IC", value: detail.benchmark.ic.toFixed(4) },
                { label: "Rank IC", value: detail.benchmark.rankIc.toFixed(4) },
              ].map((item) => (
                <div key={item.label} className="panel-elevated p-3.5">
                  <div className="label">{item.label}</div>
                  <div className="num mt-1.5 text-sm text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="label">Average IR by paradigm</div>
            <div className="mt-4">
              <BarChart items={byParadigm} height={170} formatValue={(value) => value.toFixed(2)} />
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <div className="label">Reference growth paths · top four by annualised return</div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Indicative paths reconstructed from each model's published annualised return and maximum drawdown.
        </p>
        <div className="mt-5">
          <LineChart
            height={260}
            baseline={1}
            formatValue={(value) => value.toFixed(2)}
            xLabels={["Y0", "Q2", "Q3", "Q4", "Y1"]}
            series={trendCurves}
          />
        </div>
      </Panel>
    </div>
  );
}
