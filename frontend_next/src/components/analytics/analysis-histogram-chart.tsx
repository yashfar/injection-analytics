"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatTurkishAxisNumber,
  formatTurkishCycleTime,
  formatTurkishInteger,
  formatTurkishPercentage,
} from "@/lib/analytics-formatters";
import {
  prepareAnalysisHistogramBins,
  type PreparedAnalysisHistogramBin,
} from "@/lib/analysis-histogram-chart";
import type { AnalysisHistogramResponse } from "@/types/analytics";

const chartConfig = {
  cycleCount: {
    label: "Çevrim Sayısı",
    color: "var(--chart-1)",
  },
  overflow: {
    label: "Üst Gösterim Sınırı",
    color: "var(--chart-3)",
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

type HistogramSummaryProps = {
  data: AnalysisHistogramResponse;
};

function HistogramSummary({ data }: HistogramSummaryProps) {
  const items = [
    {
      label: "Toplam Çevrim",
      value: formatTurkishInteger(data.totalCycleCount) ?? unavailable,
    },
    {
      label: "Minimum Çevrim Süresi",
      value: formatDuration(data.minimumCycleTime),
    },
    {
      label: "Maksimum Çevrim Süresi",
      value: formatDuration(data.maximumCycleTime),
    },
    {
      label: "Aralık Genişliği",
      value: formatDuration(data.binSize),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-4">
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

type HistogramTooltipContentProps = {
  active: boolean;
  label: string;
  bins: PreparedAnalysisHistogramBin[];
  totalCycleCount: number;
};

function HistogramTooltipContent({
  active,
  label,
  bins,
  totalCycleCount,
}: HistogramTooltipContentProps) {
  const bin = bins.find((candidate) => candidate.label === label);

  if (!active || !bin) {
    return null;
  }

  const cycleCount = formatTurkishInteger(bin.cycleCount) ?? unavailable;
  const share =
    totalCycleCount > 0
      ? formatTurkishPercentage(bin.cycleCount / totalCycleCount)
      : null;

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">Çevrim Süresi Aralığı</dt>
        <dd className="text-right font-medium text-foreground">
          {bin.label} sn{bin.isOverflow ? " ve üzeri" : ""}
        </dd>
        <dt className="text-muted-foreground">Çevrim Sayısı</dt>
        <dd className="text-right font-medium text-foreground">
          {cycleCount}
        </dd>
        <dt className="text-muted-foreground">Toplam İçindeki Payı</dt>
        <dd className="text-right font-medium text-foreground">
          {share ?? unavailable}
        </dd>
      </dl>
      {bin.isOverflow ? (
        <p className="border-t border-border pt-2 text-muted-foreground">
          Üst sınır etiketi, bu süreye eşit veya daha uzun çevrimleri
          gösterir; istatistiksel aykırı değer anlamına gelmez.
        </p>
      ) : null}
    </div>
  );
}

type AnalysisHistogramChartProps = {
  data: AnalysisHistogramResponse;
};

// Rendered only in AnalysisChartShell's success state. Unlike the legacy
// distribution chart, machine is not required here — Phase 1 filters are
// independent, so this renders for any applied scope with cycles in it.
export function AnalysisHistogramChart({ data }: AnalysisHistogramChartProps) {
  const bins = prepareAnalysisHistogramBins(data.bins);

  if (bins.length === 0) {
    // Defensive only: the shell's isEmpty already prevents reaching this
    // component with zero cycles.
    return null;
  }

  const overflowBin = bins.find((bin) => bin.isOverflow);

  return (
    <div className="min-w-0 space-y-5">
      <HistogramSummary data={data} />
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-80 min-h-80 w-full min-w-0"
        initialDimension={{ width: 760, height: 320 }}
      >
        <BarChart
          data={bins}
          accessibilityLayer
          margin={{ top: 12, right: 12, bottom: 32, left: 8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 4"
            strokeOpacity={0.55}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={12}
            height={48}
            label={{
              value: "Çevrim Süresi Aralığı (sn)",
              position: "insideBottom",
              offset: -20,
            }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) => formatTurkishAxisNumber(value)}
            label={{
              value: "Çevrim Sayısı",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.45 }}
            content={({ active, label }) => (
              <HistogramTooltipContent
                active={Boolean(active)}
                label={
                  typeof label === "string" || typeof label === "number"
                    ? String(label)
                    : ""
                }
                bins={bins}
                totalCycleCount={data.totalCycleCount}
              />
            )}
          />
          <Bar
            dataKey="cycleCount"
            name="Çevrim Sayısı"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {bins.map((bin) => (
              <Cell
                key={`${bin.label}-${bin.isOverflow}`}
                fill={
                  bin.isOverflow
                    ? "var(--color-overflow)"
                    : "var(--color-cycleCount)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {overflowBin ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {overflowBin.label}:
          </span>{" "}
          Üst sınır etiketi, bu süreye eşit veya daha uzun çevrimleri
          gösterir; istatistiksel aykırı değer anlamına gelmez.
        </p>
      ) : null}
    </div>
  );
}
