"use client";

import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";

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
  formatTurkishPercentage,
  selectAxisBucketSize,
} from "@/lib/analytics-formatters";
import {
  transformAnalysisOutliers,
  type AnalysisOutlierChartRow,
} from "@/lib/analysis-outliers-chart";
import type { AnalysisOutliersResponse } from "@/types/analytics";

const chartConfig = {
  low: {
    label: "Düşük Aykırı Değer",
    color: "var(--chart-2)",
  },
  high: {
    label: "Yüksek Aykırı Değer",
    color: "var(--chart-5)",
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

function isAnalysisOutlierChartRow(
  value: unknown,
): value is AnalysisOutlierChartRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AnalysisOutlierChartRow>;

  return (
    typeof candidate.cycleId === "string" &&
    typeof candidate.machine === "string" &&
    typeof candidate.cycleTime === "number" &&
    (candidate.outlierDirection === "low" ||
      candidate.outlierDirection === "high")
  );
}

type OutliersSummaryProps = {
  data: AnalysisOutliersResponse;
};

function OutliersSummary({ data }: OutliersSummaryProps) {
  const items = [
    {
      label: "Toplam Çevrim",
      value: formatTurkishInteger(data.cycleCount) ?? unavailable,
    },
    {
      label: "Aykırı Değer Sayısı",
      value: formatTurkishInteger(data.outlierCount) ?? unavailable,
    },
    {
      label: "Aykırı Değer Oranı",
      value: formatTurkishPercentage(data.outlierRate / 100) ?? unavailable,
    },
    {
      label: "Alt Sınır",
      value: formatDuration(data.lowerFence),
    },
    {
      label: "Üst Sınır",
      value: formatDuration(data.upperFence),
    },
    {
      label: "Çeyrekler Arası Açıklık (IQR)",
      value: formatDuration(data.iqr),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type OutlierTooltipContentProps = {
  active: boolean;
  row: AnalysisOutlierChartRow | undefined;
};

function OutlierTooltipContent({ active, row }: OutlierTooltipContentProps) {
  if (!active || !row) {
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
        <div className="contents">
          <dt className="text-muted-foreground">Yön</dt>
          <dd className="text-right font-medium text-foreground">
            {row.outlierDirection === "low" ? "Düşük" : "Yüksek"}
          </dd>
        </div>
        <div className="contents">
          <dt className="text-muted-foreground">Sınırdan Uzaklık</dt>
          <dd className="text-right font-medium text-foreground">
            {formatDuration(row.distanceFromFence)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

type AnalysisOutliersChartProps = {
  data: AnalysisOutliersResponse;
};

// Rendered only in AnalysisChartShell's success state (cycleCount > 0).
// outlierCount === 0 is a valid, positive outcome — not treated as "empty"
// by the shell — so that sub-case is handled here with its own message
// rather than the shell's generic "no data" empty state.
export function AnalysisOutliersChart({ data }: AnalysisOutliersChartProps) {
  if (data.outlierCount === 0) {
    return (
      <div className="space-y-5">
        <OutliersSummary data={data} />
        <p className="text-sm text-muted-foreground" role="status">
          Seçili filtrelerde aykırı çevrim bulunamadı — çevrim süreleri
          beklenen aralıkta kalmış.
        </p>
      </div>
    );
  }

  const rows = transformAnalysisOutliers(data);

  if (rows.length === 0) {
    // Defensive only: outlierCount > 0 implies at least one row should be
    // present unless the response itself is malformed.
    return <OutliersSummary data={data} />;
  }

  const axisBucketSize = selectAxisBucketSize(
    rows[0].timestamp,
    rows[rows.length - 1].timestamp,
  );

  return (
    <div className="min-w-0 space-y-5">
      <OutliersSummary data={data} />
      {data.isTruncated ? (
        <div className="flex justify-end">
          <Badge variant="outline">
            İlk {formatTurkishInteger(data.returnedOutlierCount) ??
              data.returnedOutlierCount}{" "}
            aykırı değer gösteriliyor (toplam{" "}
            {formatTurkishInteger(data.outlierCount) ?? data.outlierCount})
          </Badge>
        </div>
      ) : null}
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-80 min-h-80 w-full min-w-0"
        initialDimension={{ width: 760, height: 320 }}
      >
        <ScatterChart
          accessibilityLayer
          margin={{ top: 8, right: 16, bottom: 16, left: 8 }}
        >
          <CartesianGrid
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
            type="number"
            dataKey="cycleTime"
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
          {data.lowerFence !== null ? (
            <ReferenceLine
              y={data.lowerFence}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 3"
              label={{
                value: "Alt Sınır",
                position: "insideBottomLeft",
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
          ) : null}
          {data.upperFence !== null ? (
            <ReferenceLine
              y={data.upperFence}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 3"
              label={{
                value: "Üst Sınır",
                position: "insideTopLeft",
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
          ) : null}
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const candidate =
                payload && payload.length > 0
                  ? payload[0]?.payload
                  : undefined;

              return (
                <OutlierTooltipContent
                  active={Boolean(active)}
                  row={
                    isAnalysisOutlierChartRow(candidate)
                      ? candidate
                      : undefined
                  }
                />
              );
            }}
          />
          <Scatter data={rows} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell
                key={row.cycleId}
                fill={
                  row.outlierDirection === "low"
                    ? "var(--color-low)"
                    : "var(--color-high)"
                }
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ChartContainer>
    </div>
  );
}
