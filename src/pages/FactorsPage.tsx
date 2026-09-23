import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Sparkline } from "@/components/charts";
import { Badge, Button, Input, Panel, Skeleton } from "@/components/ui";
import { FACTORS, FAMILIES, FACTOR_MAP } from "@/lib/factors";
import { factorMeanSeries } from "@/lib/useResearch";
import { useFactorStats } from "@/lib/useFactorStats";
import { bps, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL_IDS = FACTORS.map((factor) => factor.id);

type SortKey = "rankIc" | "ic" | "icIr" | "coverage" | "spreadBps";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rankIc", label: "Rank IC" },
  { key: "ic", label: "IC" },
  { key: "icIr", label: "IC IR" },
  { key: "spreadBps", label: "Spread" },
  { key: "coverage", label: "Coverage" },
];

export default function FactorsPage() {
  const [family, setFamily] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("rankIc");
  const [selected, setSelected] = useState<string>(ALL_IDS[0]);
  const stats = useFactorStats(ALL_IDS);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return FACTORS.filter((factor) => {
      if (family !== "All" && factor.family !== family) return false;
      if (!term) return true;
      return (
        factor.name.toLowerCase().includes(term) ||
        factor.id.toLowerCase().includes(term) ||
        factor.description.toLowerCase().includes(term)
      );
    })
      .map((factor) => ({ factor, stat: stats[factor.id] }))
      .sort((a, b) => {
        const left = a.stat?.[sort];
        const right = b.stat?.[sort];
        if (left === undefined && right === undefined) return 0;
        if (left === undefined) return 1;
        if (right === undefined) return -1;
        return right - left;
      });
  }, [family, query, sort, stats]);

  const evaluated = Object.keys(stats).length;
  const progress = Math.round((evaluated / FACTORS.length) * 100);

  const detail = FACTOR_MAP[selected];
  const detailStat = stats[selected];
  const detailSeries = useMemo(() => factorMeanSeries(selected), [selected]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Factor library"
        title={`${FACTORS.length} descriptors across ${FAMILIES.length} families`}
        description="Each factor is a pure function of an instrument's price history. Statistics below are computed live: cross-sectional IC against next-day returns, rank IC, IC IR, spread between the top and bottom quintile, and signal persistence."
        actions={
          <Badge tone={progress === 100 ? "positive" : "warning"}>
            {progress === 100 ? "Evaluated" : `Evaluating ${progress}%`}
          </Badge>
        }
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
        {FAMILIES.map((entry) => (
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
        <Panel className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search factors, families or descriptions"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {SORTS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setSort(entry.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    sort === entry.key ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[640px] overflow-auto no-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface/95 backdrop-blur">
                <tr className="border-b border-border/70 text-left">
                  <th className="label py-2.5 pr-3 font-medium">Factor</th>
                  <th className="label px-2 py-2.5 text-right font-medium">Rank IC</th>
                  <th className="label px-2 py-2.5 text-right font-medium">IC IR</th>
                  <th className="label px-2 py-2.5 text-right font-medium">Spread</th>
                  <th className="label py-2.5 pl-2 text-right font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ factor, stat }) => (
                  <tr
                    key={factor.id}
                    onClick={() => setSelected(factor.id)}
                    className={cn(
                      "cursor-pointer border-b border-border/30 transition-colors",
                      selected === factor.id ? "bg-primary/5" : "hover:bg-elevated/40",
                    )}
                  >
                    <td className="py-3 pr-3">
                      <div className="font-medium text-foreground">{factor.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="num">{factor.id}</span>
                        <span>·</span>
                        <span>{factor.family}</span>
                      </div>
                    </td>
                    <td className={cn("num px-2 py-3 text-right", (stat?.rankIc ?? 0) >= 0 ? "text-positive" : "text-negative")}>
                      {stat ? stat.rankIc.toFixed(4) : "…"}
                    </td>
                    <td className="num px-2 py-3 text-right text-foreground">
                      {stat ? stat.icIr.toFixed(2) : "…"}
                    </td>
                    <td className="num px-2 py-3 text-right text-foreground">
                      {stat ? bps(stat.spreadBps, 1) : "…"}
                    </td>
                    <td className="num py-3 pl-2 text-right text-muted-foreground">
                      {stat ? pct(stat.coverage, 0) : "…"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No factors match that filter.
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="space-y-5">
          <div>
            <div className="label">Selected factor</div>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">{detail.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="primary">{detail.family}</Badge>
              <Badge>{detail.window}-day look-back</Badge>
              <Badge tone={detail.direction === 1 ? "positive" : "negative"}>
                {detail.direction === 1 ? "Higher is better" : "Lower is better"}
              </Badge>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{detail.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Rank IC", value: detailStat ? detailStat.rankIc.toFixed(4) : "…" },
              { label: "IC", value: detailStat ? detailStat.ic.toFixed(4) : "…" },
              { label: "IC IR", value: detailStat ? detailStat.icIr.toFixed(2) : "…" },
              { label: "Autocorr", value: detailStat ? detailStat.autocorr.toFixed(3) : "…" },
              { label: "Q5–Q1 spread", value: detailStat ? bps(detailStat.spreadBps, 1) : "…" },
              { label: "Coverage", value: detailStat ? pct(detailStat.coverage, 1) : "…" },
            ].map((item) => (
              <div key={item.label} className="panel-elevated p-3.5">
                <div className="label">{item.label}</div>
                <div className="num mt-1.5 text-sm text-foreground">{item.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="label">Cross-sectional mean value</div>
            <div className="mt-3">
              <Sparkline values={detailSeries.filter((value) => Number.isFinite(value))} height={70} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The average factor reading across the universe on each session. A drifting mean usually means the
              descriptor is picking up a regime change rather than a stock-specific signal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(ALL_IDS[0])}>
              Reset selection
            </Button>
            {detailStat ? null : <Skeleton className="h-4 w-24" />}
          </div>
        </Panel>
      </div>
    </div>
  );
}
