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
  formatTurkishPercentage,
  selectAxisBucketSize,
} from "@/lib/analytics-formatters";
import {
  transformAnalysisOutliers,
  type AnalysisOutlierChartRow,
} from "@/lib/analysis-outliers-chart";
import type {
  AnalysisOutlierDirection,
  AnalysisOutliersResponse,
} from "@/types/analytics";

const chartConfig = {
  low: {
    label: "Alt sınırın altında",
    color: "var(--outlier-low)",
  },
  high: {
    label: "Üst sınırın üzerinde",
    color: "var(--outlier-high)",
  },
} satisfies ChartConfig;

const unavailable = "Mevcut değil";
const OUTLIER_DIRECTIONS = {
  high: {
    label: "Üst sınırın üzerinde",
    color: "var(--color-high)",
  },
  low: {
    label: "Alt sınırın altında",
    color: "var(--color-low)",
  },
} as const satisfies Record<
  AnalysisOutlierDirection,
  { label: string; color: string }
>;
const neutralTooltipColor = "var(--foreground)";

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
      label: "İncelenen çevrim",
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
      label: "Q1",
      value: formatDuration(data.q1),
    },
    {
      label: "Q3",
      value: formatDuration(data.q3),
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
    <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-3 lg:grid-cols-4">
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
  lowerFence: number | null;
  row: AnalysisOutlierChartRow | undefined;
  upperFence: number | null;
};

type TooltipRowProps = {
  color: string;
  label: string;
  testId: string;
  value: string;
};

function ColoredTooltipRow({ color, label, testId, value }: TooltipRowProps) {
  return (
    <div
      className="col-span-2 grid grid-cols-subgrid items-center"
      data-testid={testId}
      style={{ color }}
    >
      <dt className="flex items-center gap-2 font-medium">
        <span
          aria-hidden="true"
          className="h-0.5 w-4 shrink-0 rounded-full"
          data-testid={`${testId}-marker`}
          style={{ backgroundColor: color }}
        />
        {label}
      </dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function NeutralTooltipRow({ label, testId, value }: Omit<TooltipRowProps, "color">) {
  return (
    <div
      className="col-span-2 grid grid-cols-subgrid items-center"
      data-testid={testId}
      style={{ color: neutralTooltipColor }}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function OutlierTooltipContent({
  active,
  lowerFence,
  row,
  upperFence,
}: OutlierTooltipContentProps) {
  if (!active || !row) {
    return null;
  }

  const formattedDate = formatCycleTimestamp(row.machineDate);
  const direction = OUTLIER_DIRECTIONS[row.outlierDirection];
  const applicableFence =
    row.outlierDirection === "high" ? upperFence : lowerFence;

  return (
    <div className="w-[min(22rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      {formattedDate ? (
        <div>
          <p className="text-muted-foreground">Tarih ve saat</p>
          <p className="font-medium text-popover-foreground">{formattedDate}</p>
        </div>
      ) : null}
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
        <ColoredTooltipRow
          color={direction.color}
          label="Çevrim süresi"
          testId="cycleTime-outlier-tooltip-row"
          value={formatDuration(row.cycleTime)}
        />
        <ColoredTooltipRow
          color={direction.color}
          label="Aykırı yönü"
          testId="direction-outlier-tooltip-row"
          value={direction.label}
        />
        <ColoredTooltipRow
          color={direction.color}
          label="Sınır değeri"
          testId="fence-outlier-tooltip-row"
          value={formatDuration(applicableFence)}
        />
        <ColoredTooltipRow
          color={direction.color}
          label="Sınırdan sapma"
          testId="distance-outlier-tooltip-row"
          value={formatDuration(row.distanceFromFence)}
        />
        <NeutralTooltipRow label="Makine" testId="machine-outlier-tooltip-row" value={row.machine} />
        <NeutralTooltipRow label="Ürün" testId="product-outlier-tooltip-row" value={row.productCode} />
        <NeutralTooltipRow label="Kalıp" testId="mold-outlier-tooltip-row" value={row.castCode} />
        <NeutralTooltipRow label="İş emri" testId="workOrder-outlier-tooltip-row" value={row.workOrderNumber} />
        <NeutralTooltipRow
          label="Çevrim sayacı"
          testId="cycleCounter-outlier-tooltip-row"
          value={formatTurkishInteger(row.cycleCounter) ?? unavailable}
        />
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
          Bu filtrelerde IQR sınırlarının dışında çevrim bulunamadı.
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

  const timestamps = rows.map((row) => row.timestamp);
  const axisBucketSize = selectAxisBucketSize(
    Math.min(...timestamps),
    Math.max(...timestamps),
  );

  return (
    <div className="min-w-0 space-y-5">
      <OutliersSummary data={data} />
      <Badge
        className="h-auto max-w-full whitespace-normal text-left leading-5"
        variant="outline"
      >
        {data.isTruncated
          ? `Toplam ${formatTurkishInteger(data.outlierCount) ?? data.outlierCount} aykırı çevrimden sınırdan en fazla sapan ${formatTurkishInteger(data.returnedOutlierCount) ?? data.returnedOutlierCount} kayıt gösteriliyor.`
          : `Tespit edilen ${formatTurkishInteger(data.outlierCount) ?? data.outlierCount} aykırı çevrimin tamamı gösteriliyor.`}
      </Badge>
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
                  lowerFence={data.lowerFence}
                  row={
                    isAnalysisOutlierChartRow(candidate)
                      ? candidate
                      : undefined
                  }
                  upperFence={data.upperFence}
                />
              );
            }}
          />
          <Scatter data={rows} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell
                key={row.cycleId}
                fill={
                  OUTLIER_DIRECTIONS[row.outlierDirection].color
                }
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ChartContainer>
      <ul
        aria-label="Aykırı yön renk açıklaması"
        className="flex flex-wrap gap-x-5 gap-y-3 text-xs"
      >
        {(Object.keys(OUTLIER_DIRECTIONS) as AnalysisOutlierDirection[]).map(
          (direction) => {
            const series = OUTLIER_DIRECTIONS[direction];

            return (
              <li key={direction} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                <span style={{ color: series.color }}>{series.label}</span>
              </li>
            );
          },
        )}
      </ul>
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
            Aykırı değerler, Q1 ve Q3 kullanılarak hesaplanan IQR sınırlarının
            dışında kalan çevrimlerdir.
          </p>
          <p>
            Üst sınırın üzerindeki noktalar alışılmıştan uzun, alt sınırın
            altındaki noktalar ise alışılmıştan kısa çevrimleri gösterir.
          </p>
          <p>
            Sınırdan sapma değeri büyüdükçe çevrim ilgili sınırdan daha uzakta
            bulunur.
          </p>
          <p>
            Aykırı bir çevrim tek başına arıza anlamına gelmez; ürün, kalıp,
            makine ve aşama süreleriyle birlikte değerlendirilmelidir.
          </p>
          <p className="font-mono text-xs">IQR = Q3 − Q1</p>
        </div>
      </details>
    </div>
  );
}
