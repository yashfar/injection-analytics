"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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

const chartConfig = {
  cycleTime: {
    label: "Çevrim Süresi",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const unavailable = "Mevcut değil";

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

function CycleTooltipContent({
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
        <p className="font-medium text-popover-foreground">
          {formattedDate}
        </p>
      ) : null}
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5">
        <div className="contents">
          <dt className="text-muted-foreground">Makine</dt>
          <dd className="text-right font-medium text-foreground">
            {row.machine}
          </dd>
        </div>
        <div className="contents">
          <dt className="text-muted-foreground">İş Emri</dt>
          <dd className="text-right font-medium text-foreground">
            {row.workOrderNumber}
          </dd>
        </div>
        <div className="contents">
          <dt className="text-muted-foreground">Çevrim Sayacı</dt>
          <dd className="text-right font-medium text-foreground">
            {formatTurkishInteger(row.cycleCounter) ?? unavailable}
          </dd>
        </div>
        <div className="contents">
          <dt className="text-muted-foreground">Çevrim Süresi</dt>
          <dd className="text-right font-medium text-foreground">
            {formatDuration(row.cycleTime)}
          </dd>
        </div>
        {PROCESS_STAGES.map((stage) => (
          <div key={stage.key} className="contents">
            <dt className="text-muted-foreground">
              {stage.label} ({stage.key})
            </dt>
            <dd className="text-right font-medium text-foreground">
              {formatDuration(row.stages[stage.key])}
            </dd>
          </div>
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
      {data.isTruncated ? (
        <div className="flex justify-end">
          <Badge variant="outline">
            İlk {formatTurkishInteger(data.returnedCycleCount) ?? data.returnedCycleCount}{" "}
            çevrim gösteriliyor (toplam{" "}
            {formatTurkishInteger(data.totalCycleCount) ?? data.totalCycleCount}
            )
          </Badge>
        </div>
      ) : null}
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
            dataKey="cycleTime"
            name="Çevrim Süresi"
            stroke="var(--color-cycleTime)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--color-cycleTime)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
