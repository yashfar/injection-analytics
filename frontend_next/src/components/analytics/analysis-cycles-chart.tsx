"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChevronDownIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatCycleTimestamp,
  formatTrendAxisDate,
  formatTurkishAxisNumber,
  formatTurkishCycleTime,
  formatTurkishInteger,
  selectAxisBucketSize,
} from "@/lib/analytics-formatters";
import {
  transformAnalysisCycles,
  type AnalysisCycleChartRow,
} from "@/lib/analysis-cycles-chart";
import { PROCESS_STAGES } from "@/lib/process-stages";
import type { AnalysisCyclesResponse } from "@/types/analytics";

const CYCLE_TIME_SERIES = {
  dataKey: "cycleTime",
  label: "Çevrim süresi",
  color: "var(--color-cycleTime)",
} as const;

const chartConfig = {
  [CYCLE_TIME_SERIES.dataKey]: {
    label: CYCLE_TIME_SERIES.label,
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const unavailable = "Mevcut değil";
const neutralTooltipColor = "var(--foreground)";

function formatDuration(value: number | null): string {
  if (value === null) {
    return unavailable;
  }

  const formatted = formatTurkishCycleTime(value);
  return formatted ? `${formatted} sn` : unavailable;
}

type CycleTooltipContentProps = {
  active: boolean;
  timestamp: number | undefined;
  rows: AnalysisCycleChartRow[];
};

type NeutralTooltipRowProps = {
  label: string;
  value: string;
};

function NeutralTooltipRow({ label, value }: NeutralTooltipRowProps) {
  return (
    <div
      className="col-span-2 grid grid-cols-subgrid items-center"
      style={{ color: neutralTooltipColor }}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function CycleTooltipContent({
  active,
  timestamp,
  rows,
}: CycleTooltipContentProps) {
  if (!active || timestamp === undefined) {
    return null;
  }

  const row = rows.find((candidate) => candidate.timestamp === timestamp);

  if (!row) {
    return null;
  }

  const formattedDate = formatCycleTimestamp(row.machineDate);

  return (
    <div className="w-[min(22rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      {formattedDate ? (
        <div>
          <p className="text-muted-foreground">Tarih ve saat</p>
          <p className="font-medium text-popover-foreground">{formattedDate}</p>
        </div>
      ) : null}
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
        <div
          className="col-span-2 grid grid-cols-subgrid items-center"
          data-testid="cycleTime-cycle-tooltip-row"
          style={{ color: CYCLE_TIME_SERIES.color }}
        >
          <dt className="flex items-center gap-2 font-medium">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 shrink-0 rounded-full"
              data-testid="cycleTime-cycle-tooltip-marker"
              style={{ backgroundColor: CYCLE_TIME_SERIES.color }}
            />
            {CYCLE_TIME_SERIES.label}
          </dt>
          <dd className="text-right font-semibold tabular-nums">
            {formatDuration(row.cycleTime)}
          </dd>
        </div>
        <NeutralTooltipRow
          label="Çevrim sayacı"
          value={formatTurkishInteger(row.cycleCounter) ?? unavailable}
        />
        <NeutralTooltipRow label="Makine" value={row.machine} />
        <NeutralTooltipRow label="Ürün" value={row.productCode} />
        <NeutralTooltipRow label="Kalıp" value={row.castCode} />
        <NeutralTooltipRow label="İş emri" value={row.workOrderNumber} />
        {PROCESS_STAGES.map((stage) => (
          row.stages[stage.key] === null ? null : (
          <div
            key={stage.key}
            className="col-span-2 grid grid-cols-subgrid items-center"
            data-testid={`${stage.key}-cycle-tooltip-row`}
            style={{ color: stage.color }}
          >
            <dt className="flex items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="h-0.5 w-4 shrink-0 rounded-full"
                data-testid={`${stage.key}-cycle-tooltip-marker`}
                style={{ backgroundColor: stage.color }}
              />
              {stage.label}
            </dt>
            <dd className="text-right font-semibold tabular-nums">
              {formatDuration(row.stages[stage.key])}
            </dd>
          </div>
          )
        ))}
      </dl>
    </div>
  );
}

type AnalysisCyclesChartProps = {
  data: AnalysisCyclesResponse;
};

// Rendered only in AnalysisChartShell's success state. Renders every
// returned point (up to the backend's default limit of 1000) with dots
// disabled — the line path alone stays responsive at that point count;
// downsampling can be added later if real usage shows it's needed.
export function AnalysisCyclesChart({ data }: AnalysisCyclesChartProps) {
  const rows = transformAnalysisCycles(data);

  if (rows.length === 0) {
    // Defensive only: the shell's isEmpty already prevents reaching this
    // component with zero points.
    return null;
  }

  const axisBucketSize = selectAxisBucketSize(
    rows[0].timestamp,
    rows[rows.length - 1].timestamp,
  );

  return (
    <div className="min-w-0 space-y-4">
      <Badge
        className="h-auto max-w-full whitespace-normal text-left leading-5"
        variant="outline"
      >
        {data.isTruncated
          ? `Toplam ${formatTurkishInteger(data.totalCycleCount) ?? data.totalCycleCount} çevrimden en son ${formatTurkishInteger(data.returnedCycleCount) ?? data.returnedCycleCount} çevrim gösteriliyor.`
          : `Toplam ${formatTurkishInteger(data.totalCycleCount) ?? data.totalCycleCount} çevrimin tamamı gösteriliyor.`}
      </Badge>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-80 min-h-80 w-full min-w-0"
        initialDimension={{ width: 760, height: 320 }}
      >
        <LineChart
          data={rows}
          accessibilityLayer
          margin={{ top: 8, right: 16, bottom: 16, left: 8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 4"
            strokeOpacity={0.55}
          />
          <XAxis
            type="number"
            dataKey="timestamp"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tickFormatter={(value: number) =>
              formatTrendAxisDate(value, axisBucketSize)
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) => formatTurkishAxisNumber(value)}
            label={{
              value: "Çevrim Süresi (sn)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, label }) => (
              <CycleTooltipContent
                active={Boolean(active)}
                timestamp={typeof label === "number" ? label : undefined}
                rows={rows}
              />
            )}
          />
          <Line
            type="linear"
            dataKey={CYCLE_TIME_SERIES.dataKey}
            name={CYCLE_TIME_SERIES.label}
            stroke={CYCLE_TIME_SERIES.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{
              r: 4,
              fill: CYCLE_TIME_SERIES.color,
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <details className="group overflow-hidden rounded-lg border border-border/60 bg-muted/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
          <span>Bu grafik nasıl okunur?</span>
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-180"
          />
        </summary>
        <div className="space-y-2 border-t border-border/60 px-3 py-3 text-sm leading-6 text-muted-foreground">
          <p>
            Her nokta, seçili filtrelere uyan gerçek bir üretim çevrimini
            gösterir.
          </p>
          <p>
            Çizgideki ani yükselişler, bazı çevrimlerin diğerlerinden daha uzun
            sürdüğünü gösterebilir. Sürekli dalgalanma ise çevrim sürelerinin
            kararlı olmadığını düşündürebilir.
          </p>
          <p>Gösterim sınırı varsa grafik yalnızca en son çevrimleri içerir.</p>
          <p>
            Yüksek bir çevrim süresi tek başına arıza anlamına gelmez; aşama
            süreleri ve aykırı değerlerle birlikte incelenmelidir.
          </p>
        </div>
      </details>
    </div>
  );
}
