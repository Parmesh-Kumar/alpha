import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, SlidersHorizontal, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Sparkline } from "@/components/charts";
import { Badge, Button, EmptyState, Panel, Skeleton, buttonClass } from "@/components/ui";
import { FACTOR_MAP } from "@/lib/factors";
import { pct, relativeTime, signed } from "@/lib/format";
import { useRuns, type StoredRun } from "@/lib/runs";
import { cn } from "@/lib/utils";

function metricChips(run: StoredRun) {
  return [
    { label: "Ann. return", value: pct(run.metrics.annualizedReturn, 1), tone: run.metrics.annualizedReturn >= 0 },
    { label: "Sharpe", value: signed(run.metrics.sharpe, 2), tone: run.metrics.sharpe >= 0 },
    { label: "Rank IC", value: run.metrics.rankIc.toFixed(4), tone: run.metrics.rankIc >= 0 },
    { label: "Max DD", value: pct(run.metrics.maxDrawdown, 1), tone: false },
  ];
}

export default function ExperimentsPage() {
  const { runs, loading, remove } = useRuns();
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);

  const open = (run: StoredRun) => {
    navigate("/dashboard/studio", { state: { config: run.config } });
  };

  const destroy = async (run: StoredRun) => {
    setPending(run.id);
    try {
      await remove(run.id);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Research trail"
        title="Saved runs"
        description="Every saved run keeps its full configuration — factor blend, rebalance frequency, costs and volatility target — so you can reopen it in the studio and pick up where you left off."
        actions={
          <Button onClick={() => navigate("/dashboard/studio")}>
            <SlidersHorizontal className="h-4 w-4" />
            New run
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          title="No runs saved yet"
          description="Build a blend in the backtest studio and save it. Saved runs are what turn a one-off experiment into a research trail."
          action={
            <Button className={cn(buttonClass("primary", "md"))} onClick={() => navigate("/dashboard/studio")}>
              <FolderOpen className="h-4 w-4" />
              Open the studio
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {runs.map((run) => (
            <Panel key={run.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold tracking-tight text-foreground">{run.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{relativeTime(run.createdAt)}</span>
                    <span>·</span>
                    <span className="num">
                      {run.config.factorIds.length} factors · {run.config.rebalanceDays}d rebalance
                    </span>
                    {run.config.longShort ? <Badge tone="info">Long/short</Badge> : null}
                    {run.config.volatilityTarget ? (
                      <Badge tone="warning">Vol target {pct(run.config.volatilityTarget, 0)}</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <Sparkline values={run.equityPreview} height={40} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metricChips(run).map((chip) => (
                  <div key={chip.label} className="panel-elevated p-3">
                    <div className="label">{chip.label}</div>
                    <div className={cn("num mt-1 text-sm", chip.tone ? "text-positive" : "text-foreground")}>
                      {chip.value}
                    </div>
                  </div>
                ))}
              </div>

              {run.note ? (
                <p className="rounded-md border border-border/60 bg-background/40 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
                  {run.note}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {run.config.factorIds.map((id) => (
                  <span
                    key={id}
                    className="rounded-full border border-border bg-elevated/50 px-2.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {FACTOR_MAP[id]?.name ?? id}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-border/50 pt-4">
                <Button size="sm" onClick={() => open(run)}>
                  Open in studio
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => destroy(run)}
                  disabled={pending === run.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {pending === run.id ? "Removing…" : "Delete"}
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
