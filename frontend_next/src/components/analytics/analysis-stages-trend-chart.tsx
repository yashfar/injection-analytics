"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatTrendAxisDate,
  formatTrendTooltipDate,
  formatTurkishAxisNumber,
  formatTurkishCycleTime,
  formatTurkishInteger,
} from "@/lib/analytics-formatters";
import {
  transformAnalysisStagesTrend,
  type AnalysisStageTrendChartRow,
} from "@/lib/analysis-stages-trend-chart";
import { PROCESS_STAGES } from "@/lib/process-stages";
import type { AnalysisStagesTrendResponse } from "@/types/analytics";

type BucketSize = Exclude<AnalysisStagesTrendResponse["bucketSize"], null>;

const chartConfig = {
  ...Object.fromEntries(
    PROCESS_STAGES.map((stage) => [
      stage.key,
      { label: stage.label, color: stage.color },
    ]),
  ),
} satisfies ChartConfig;

const unavailable = "Mevcut değil";

function getBucketLabel(bucketSize: BucketSize): string {
  switch (bucketSize) {
    case "hour":
      return "Saatlik görünüm";
    case "day":
      return "Günlük görünüm";
    case "week":
      return "Haftalık görünüm";
  }
}

function formatDuration(value: number): string {
  const formatted = formatTurkishCycleTime(value);
  return formatted ? `${formatted} sn` : unavailable;
}

type StageTrendTooltipContentProps = {
  active: boolean;
  timestamp: number | undefined;
  bucketSize: BucketSize;
  rows: AnalysisStageTrendChartRow[];
};

function StageTrendTooltipContent({
  active,
  timestamp,
  bucketSize,
  rows,
}: StageTrendTooltipContentProps) {
  if (!active || timestamp === undefined) {
    return null;
  }

  const row = rows.find((candidate) => candidate.timestamp === timestamp);

  if (!row) {
    return null;
  }

  const formattedDate = formatTrendTooltipDate(row.timestamp, bucketSize);

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      {formattedDate ? (
        <p className="font-medium text-popover-foreground">
          {formattedDate}
        </p>
      ) : null}
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5">
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
        <div className="contents">
          <dt className="text-muted-foreground">Aşamaların Toplamı</dt>
          <dd className="text-right font-medium text-foreground">
            {formatDuration(row.averageStageSum)}
          </dd>
        </div>
        <div className="contents">
          <dt className="text-muted-foreground">Çevrim Sayısı</dt>
          <dd className="text-right font-medium text-foreground">
            {formatTurkishInteger(row.cycleCount) ?? unavailable}
          </dd>
        </div>
      </dl>
    </div>
  );
}

type AnalysisStagesTrendChartProps = {
  data: AnalysisStagesTrendResponse;
};

// Rendered only in AnalysisChartShell's success state. No per-machine
// grouping — one stacked area series per stage, for the single applied
// filter scope over time.
export function AnalysisStagesTrendChart({
  data,
}: AnalysisStagesTrendChartProps) {
  const bucketSize = data.bucketSize;
  const rows = transformAnalysisStagesTrend(data);

  if (!bucketSize || rows.length === 0) {
    // Defensive only: the shell's isEmpty already prevents reaching this
    // component with an empty stage trend.
    return null;
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex justify-end">
        <Badge variant="secondary">{getBucketLabel(bucketSize)}</Badge>
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-80 min-h-80 w-full min-w-0"
        initialDimension={{ width: 560, height: 320 }}
      >
        <AreaChart
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
            minTickGap={32}
            tickFormatter={(value: number) =>
              formatTrendAxisDate(value, bucketSize)
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) => formatTurkishAxisNumber(value)}
            label={{
              value: "Ortalama Süre (sn)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, label }) => (
              <StageTrendTooltipContent
                active={Boolean(active)}
                timestamp={typeof label === "number" ? label : undefined}
                bucketSize={bucketSize}
                rows={rows}
              />
            )}
          />
          {PROCESS_STAGES.map((stage) => (
            <Area
              key={stage.key}
              type="linear"
              dataKey={`stages.${stage.key}`}
              name={`${stage.label} (${stage.key})`}
              stackId="stages"
              stroke={stage.color}
              fill={stage.color}
              fillOpacity={0.75}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
