"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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
  transformAnalysisTrend,
  type AnalysisTrendChartRow,
} from "@/lib/analysis-trend-chart";
import type { AnalysisTrendResponse } from "@/types/analytics";

type BucketSize = Exclude<AnalysisTrendResponse["bucketSize"], null>;

const chartConfig = {
  medianCycleTime: {
    label: "Medyan Çevrim Süresi",
    color: "var(--chart-1)",
  },
  averageCycleTime: {
    label: "Ortalama Çevrim Süresi",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

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

function formatSeconds(value: number): string {
  const formatted = formatTurkishCycleTime(value);
  return formatted ? `${formatted} sn` : "Mevcut değil";
}

type TrendTooltipContentProps = {
  active: boolean;
  timestamp: number | undefined;
  bucketSize: BucketSize;
  rows: AnalysisTrendChartRow[];
};

function TrendTooltipContent({
  active,
  timestamp,
  bucketSize,
  rows,
}: TrendTooltipContentProps) {
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
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Medyan Çevrim Süresi</dt>
        <dd className="text-right font-medium text-foreground">
          {formatSeconds(row.medianCycleTime)}
        </dd>
        <dt className="text-muted-foreground">Ortalama Çevrim Süresi</dt>
        <dd className="text-right font-medium text-foreground">
          {formatSeconds(row.averageCycleTime)}
        </dd>
        <dt className="text-muted-foreground">Minimum Çevrim Süresi</dt>
        <dd className="text-right font-medium text-foreground">
          {formatSeconds(row.minimumCycleTime)}
        </dd>
        <dt className="text-muted-foreground">Maksimum Çevrim Süresi</dt>
        <dd className="text-right font-medium text-foreground">
          {formatSeconds(row.maximumCycleTime)}
        </dd>
        <dt className="text-muted-foreground">Çevrim Sayısı</dt>
        <dd className="text-right font-medium text-foreground">
          {formatTurkishInteger(row.cycleCount) ?? "Mevcut değil"}
        </dd>
      </dl>
    </div>
  );
}

type AnalysisTrendChartProps = {
  data: AnalysisTrendResponse;
};

// Rendered only in AnalysisChartShell's success state — no loading/error/
// empty handling here, the shell already owns that.
export function AnalysisTrendChart({ data }: AnalysisTrendChartProps) {
  const bucketSize = data.bucketSize;
  const rows = transformAnalysisTrend(data);

  if (!bucketSize || rows.length === 0) {
    // Defensive only: the shell's isEmpty already prevents reaching this
    // component with an empty trend.
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
              value: "Çevrim Süresi (sn)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, label }) => (
              <TrendTooltipContent
                active={Boolean(active)}
                timestamp={typeof label === "number" ? label : undefined}
                bucketSize={bucketSize}
                rows={rows}
              />
            )}
          />
          <Line
            type="linear"
            dataKey="medianCycleTime"
            name="Medyan Çevrim Süresi"
            stroke="var(--color-medianCycleTime)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={
              rows.length <= 30
                ? {
                    r: 2.5,
                    fill: "var(--color-medianCycleTime)",
                    stroke: "var(--background)",
                    strokeWidth: 1.5,
                  }
                : false
            }
            activeDot={{
              r: 5,
              fill: "var(--color-medianCycleTime)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="averageCycleTime"
            name="Ortalama Çevrim Süresi"
            stroke="var(--color-averageCycleTime)"
            strokeWidth={1.75}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--color-averageCycleTime)",
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
