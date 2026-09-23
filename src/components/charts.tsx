import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pct } from "@/lib/format";

export const CHART = {
  primary: "hsl(39 78% 60%)",
  accent: "hsl(187 72% 52%)",
  positive: "hsl(158 62% 52%)",
  negative: "hsl(356 78% 66%)",
  info: "hsl(217 84% 66%)",
  warning: "hsl(33 92% 62%)",
  muted: "hsl(217 14% 60%)",
  grid: "hsl(219 24% 16%)",
};

export const SERIES_PALETTE = [
  CHART.primary,
  CHART.accent,
  CHART.info,
  CHART.positive,
  CHART.warning,
  CHART.negative,
];

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

export interface LineSeries {
  key: string;
  label: string;
  values: number[];
  color: string;
  fill?: boolean;
  dashed?: boolean;
}

export function LineChart({
  series,
  height = 260,
  formatValue = (value: number) => value.toFixed(2),
  yTicks = 5,
  baseline,
  xLabels,
  className,
}: {
  series: LineSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  yTicks?: number;
  baseline?: number;
  xLabels?: string[];
  className?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { left: 52, right: 14, top: 14, bottom: 24 };
  const innerWidth = Math.max(10, width - pad.left - pad.right);
  const innerHeight = Math.max(10, height - pad.top - pad.bottom);
  const length = Math.max(...series.map((s) => s.values.length), 0);

  const { min, max } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of series) {
      for (const v of s.values) {
        if (!Number.isFinite(v)) continue;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    if (baseline !== undefined) {
      lo = Math.min(lo, baseline);
      hi = Math.max(hi, baseline);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1 };
    if (lo === hi) return { min: lo - 1, max: hi + 1 };
    const span = hi - lo;
    return { min: lo - span * 0.06, max: hi + span * 0.06 };
  }, [series, baseline]);

  const x = (index: number) => pad.left + (length <= 1 ? 0 : (index / (length - 1)) * innerWidth);
  const y = (value: number) => pad.top + (1 - (value - min) / (max - min)) * innerHeight;

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < yTicks; i += 1) out.push(min + ((max - min) * i) / (yTicks - 1));
    return out;
  }, [min, max, yTicks]);

  return (
    <div ref={ref} className={cn("relative w-full", className)} style={{ height }}>
      {width > 0 && length > 1 ? (
        <>
          <svg
            width={width}
            height={height}
            className="overflow-visible"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - rect.left - pad.left) / innerWidth;
              const index = Math.round(ratio * (length - 1));
              setHover(Math.max(0, Math.min(length - 1, index)));
            }}
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={pad.left}
                  x2={pad.left + innerWidth}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={CHART.grid}
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 10}
                  y={y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={CHART.muted}
                  fontSize={11}
                  fontFamily="ui-monospace, monospace"
                >
                  {formatValue(tick)}
                </text>
              </g>
            ))}

            {baseline !== undefined && baseline >= min && baseline <= max ? (
              <line
                x1={pad.left}
                x2={pad.left + innerWidth}
                y1={y(baseline)}
                y2={y(baseline)}
                stroke={CHART.muted}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            ) : null}

            {series.map((s) => {
              const points = s.values
                .map((value, index) => (Number.isFinite(value) ? `${x(index)},${y(value)}` : null))
                .filter((point): point is string => point !== null);
              if (points.length === 0) return null;
              const line = `M ${points.join(" L ")}`;
              const area = `${line} L ${x(s.values.length - 1)},${pad.top + innerHeight} L ${x(0)},${
                pad.top + innerHeight
              } Z`;
              return (
                <g key={s.key}>
                  {s.fill ? <path d={area} fill={`url(#fill-${s.key})`} /> : null}
                  <path
                    d={line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.fill ? 2 : 1.5}
                    strokeDasharray={s.dashed ? "5 4" : undefined}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {hover !== null ? (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={pad.top}
                y2={pad.top + innerHeight}
                stroke={CHART.muted}
                strokeOpacity={0.6}
              />
            ) : null}

            {hover !== null
              ? series.map((s) => {
                  const value = s.values[hover];
                  if (!Number.isFinite(value)) return null;
                  return (
                    <circle key={s.key} cx={x(hover)} cy={y(value)} r={3.5} fill={s.color} stroke="hsl(224 47% 4%)" strokeWidth={1.5} />
                  );
                })
              : null}

            {Array.from({ length: 5 }).map((_, i) => {
              const index = Math.round((i * (length - 1)) / 4);
              return (
                <text
                  key={i}
                  x={x(index)}
                  y={height - 6}
                  textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
                  fill={CHART.muted}
                  fontSize={11}
                  fontFamily="ui-monospace, monospace"
                >
                  {xLabels?.[index] ?? `${index + 1}`}
                </text>
              );
            })}
          </svg>

          {hover !== null ? (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-md border border-border bg-surface/95 p-2.5 text-xs shadow-panel backdrop-blur"
              style={{
                left: Math.min(Math.max(x(hover) - 75, 0), Math.max(0, width - 165)),
              }}
            >
              <div className="label mb-1.5">{xLabels?.[hover] ?? `Step ${hover + 1}`}</div>
              {series.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="num text-foreground">{formatValue(s.values[hover] ?? 0)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function Sparkline({
  values,
  height = 40,
  className,
}: {
  values: number[];
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return <div className={cn("h-10", className)} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 160;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" L ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      <path
        d={`M ${points}`}
        fill="none"
        stroke={up ? CHART.positive : CHART.negative}
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={width}
        cy={height - ((values[values.length - 1] - min) / span) * (height - 4) - 2}
        r={2.2}
        fill={up ? CHART.positive : CHART.negative}
      />
    </svg>
  );
}

export function BarChart({
  items,
  height = 180,
  formatValue = (value: number) => pct(value, 1),
}: {
  items: { label: string; value: number }[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { left: 46, right: 10, top: 10, bottom: 22 };
  const innerWidth = Math.max(10, width - pad.left - pad.right);
  const innerHeight = Math.max(10, height - pad.top - pad.bottom);
  const maxAbs = Math.max(0.0001, ...items.map((item) => Math.abs(item.value)));
  const zeroY = pad.top + innerHeight / 2;
  const slot = innerWidth / Math.max(1, items.length);
  const barWidth = Math.max(2, slot * 0.62);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && items.length > 0 ? (
        <svg width={width} height={height} onMouseLeave={() => setHover(null)}>
          <line x1={pad.left} x2={pad.left + innerWidth} y1={zeroY} y2={zeroY} stroke={CHART.grid} />
          {items.map((item, index) => {
            const magnitude = (Math.abs(item.value) / maxAbs) * (innerHeight / 2);
            const barHeight = Math.max(1.5, magnitude);
            const x = pad.left + index * slot + (slot - barWidth) / 2;
            const yPos = item.value >= 0 ? zeroY - barHeight : zeroY;
            return (
              <g key={item.label} onMouseEnter={() => setHover(index)}>
                <rect
                  x={x}
                  y={yPos}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  fill={item.value >= 0 ? CHART.positive : CHART.negative}
                  opacity={hover === null || hover === index ? 0.9 : 0.35}
                />
                {index % Math.ceil(items.length / 8) === 0 ? (
                  <text
                    x={x + barWidth / 2}
                    y={height - 6}
                    textAnchor="middle"
                    fill={CHART.muted}
                    fontSize={10}
                    fontFamily="ui-monospace, monospace"
                  >
                    {item.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {[-maxAbs, 0, maxAbs].map((tick) => (
            <text
              key={tick}
              x={pad.left - 8}
              y={pad.top + innerHeight / 2 - (tick / maxAbs) * (innerHeight / 2)}
              textAnchor="end"
              dominantBaseline="middle"
              fill={CHART.muted}
              fontSize={10}
              fontFamily="ui-monospace, monospace"
            >
              {formatValue(tick)}
            </text>
          ))}
        </svg>
      ) : null}
      {hover !== null && items[hover] ? (
        <div className="pointer-events-none absolute right-0 top-0 rounded-md border border-border bg-surface/95 px-2.5 py-1.5 text-xs shadow-panel">
          <span className="label mr-2">{items[hover].label}</span>
          <span className={cn("num", items[hover].value >= 0 ? "text-positive" : "text-negative")}>
            {formatValue(items[hover].value)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function MonthlyHeatmap({ data }: { data: { key: string; year: number; month: number; value: number }[] }) {
  const years = Array.from(new Set(data.map((d) => d.year))).sort();
  const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const maxAbs = Math.max(0.0001, ...data.map((d) => Math.abs(d.value)));
  const lookup = new Map(data.map((d) => [`${d.year}-${d.month}`, d.value]));

  const colorFor = (value: number | undefined) => {
    if (value === undefined) return "hsl(219 24% 12%)";
    const intensity = Math.min(1, Math.abs(value) / maxAbs);
    const lightness = 20 + intensity * 28;
    const hue = value >= 0 ? 158 : 356;
    const saturation = 30 + intensity * 42;
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5 pl-10">
        {monthLabels.map((label, index) => (
          <div key={index} className="flex-1 text-center text-[10px] text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      {years.map((year) => (
        <div key={year} className="flex items-center gap-1.5">
          <div className="num w-8 text-right text-[11px] text-muted-foreground">{year}</div>
          {Array.from({ length: 12 }).map((_, index) => {
            const value = lookup.get(`${year}-${index + 1}`);
            return (
              <div
                key={index}
                title={value === undefined ? `${year}-${index + 1}: no data` : pct(value, 2)}
                className="h-6 flex-1 rounded-[3px] border border-border/40 transition-transform hover:scale-110"
                style={{ background: colorFor(value) }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Donut({
  items,
  size = 160,
  thickness = 16,
}: {
  items: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = items.reduce((acc, item) => acc + Math.abs(item.value), 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={CHART.grid} strokeWidth={thickness} />
        {items.map((item) => {
          const fraction = Math.abs(item.value) / total;
          const dash = fraction * circumference;
          const element = (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return element;
        })}
      </svg>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="num text-foreground">{pct(Math.abs(item.value) / total, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
