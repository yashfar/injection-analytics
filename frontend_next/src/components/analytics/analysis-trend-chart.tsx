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

const TREND_SERIES = {
  average: {
    dataKey: "averageCycleTime",
    label: "Ortalama çevrim süresi",
    color: "var(--color-averageCycleTime)",
  },
  median: {
    dataKey: "medianCycleTime",
    label: "Medyan çevrim süresi",
    color: "var(--color-medianCycleTime)",
  },
} as const;

const chartConfig = {
  [TREND_SERIES.average.dataKey]: {
    label: TREND_SERIES.average.label,
    color: "var(--chart-1)",
  },
  [TREND_SERIES.median.dataKey]: {
    label: TREND_SERIES.median.label,
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function getBucketLabel(bucketSize: BucketSize): string {
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

type TrendTooltipSeriesRowProps = {
  series: (typeof TREND_SERIES)["average" | "median"];
  value: number;
};

function TrendTooltipSeriesRow({ series, value }: TrendTooltipSeriesRowProps) {
  return (
    <div
      className="col-span-2 grid grid-cols-subgrid items-center"
      data-testid={`${series.dataKey}-tooltip-row`}
      style={{ color: series.color }}
    >
      <dt className="flex items-center gap-2 font-medium">
        <span
          aria-hidden="true"
          data-testid={`${series.dataKey}-tooltip-marker`}
          className="h-0.5 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: series.color }}
        />
        {series.label}
      </dt>
      <dd className="text-right font-semibold tabular-nums">
        {formatSeconds(value)}
      </dd>
    </div>
  );
}

export function TrendTooltipContent({
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
        <TrendTooltipSeriesRow
          series={TREND_SERIES.average}
          value={row.averageCycleTime}
        />
        <TrendTooltipSeriesRow
          series={TREND_SERIES.median}
          value={row.medianCycleTime}
        />
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
      <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Zaman gruplaması:</span>
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
            dataKey={TREND_SERIES.median.dataKey}
            name={TREND_SERIES.median.label}
            stroke={TREND_SERIES.median.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={
              rows.length <= 30
                ? {
                    r: 2.5,
                    fill: TREND_SERIES.median.color,
                    stroke: "var(--background)",
                    strokeWidth: 1.5,
                  }
                : false
            }
            activeDot={{
              r: 5,
              fill: TREND_SERIES.median.color,
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey={TREND_SERIES.average.dataKey}
            name={TREND_SERIES.average.label}
            stroke={TREND_SERIES.average.color}
            strokeWidth={1.75}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{
              r: 4,
              fill: TREND_SERIES.average.color,
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <div
        aria-label="Trend serileri"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
        role="list"
      >
        {[
          { ...TREND_SERIES.average, prefix: "Mavi çizgi" },
          { ...TREND_SERIES.median, prefix: "Yeşil çizgi" },
        ].map((series) => (
          <div key={series.dataKey} className="flex items-center gap-2" role="listitem">
            <span
              aria-hidden="true"
              className="h-0.5 w-5 shrink-0 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            <span>
              <span className="font-medium">{series.prefix}:</span>{" "}
              {series.label}
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">
        <p>
          Çizgiler birbirine yakınsa çevrim süreleri daha dengeli ilerliyor olabilir. Ortalama medyandan belirgin şekilde yüksekse, uzun süren çevrimler veya ani sıçramalar ortalamayı yukarı çekiyor olabilir. Her iki çizginin birlikte yükselmesi genel çevrim süresinde artışa işaret edebilir.
        </p>
        <p>
          Bu grafik sorunun nedenini tek başına göstermez; değişimin ne zaman ve nasıl gerçekleştiğini anlamaya yardımcı olur.
        </p>
      </div>
    </div>
  );
}
