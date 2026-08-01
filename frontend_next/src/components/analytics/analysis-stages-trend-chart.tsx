"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChevronDownIcon } from "lucide-react";

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
  formatTurkishSignedCycleTime,
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
const neutralTooltipColor = "var(--foreground)";

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

function formatDuration(value: number): string {
  const formatted = formatTurkishCycleTime(value);
  return formatted ? `${formatted} sn` : unavailable;
}

function formatSignedDuration(value: number): string {
  const formatted = formatTurkishSignedCycleTime(value);
  return formatted ? `${formatted} sn` : unavailable;
}

export function getStageTrendDifferenceDescription(
  stageSumDifference: number,
): string {
  const absoluteDifference = Math.abs(stageSumDifference);

  if (formatTurkishCycleTime(absoluteDifference) === "0") {
    return "Değerler birbirine yakındır.";
  }

  return stageSumDifference < 0
    ? "Toplam çevrim, kayıtlı aşama toplamından daha uzundur."
    : "Kayıtlı aşama toplamı, toplam çevrimden daha uzundur.";
}

type StageTrendTooltipContentProps = {
  active: boolean;
  timestamp: number | undefined;
  bucketSize: BucketSize;
  rows: AnalysisStageTrendChartRow[];
};

type NeutralTooltipRowProps = {
  label: string;
  testId: string;
  value: string;
};

function NeutralTooltipRow({ label, testId, value }: NeutralTooltipRowProps) {
  return (
    <div
      className="col-span-2 grid grid-cols-subgrid items-center"
      data-testid={testId}
      style={{ color: neutralTooltipColor }}
    >
      <dt className="flex items-center gap-2 font-medium">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-foreground"
        />
        {label}
      </dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function StageTrendTooltipContent({
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
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
        {PROCESS_STAGES.map((stage) => (
          <div
            key={stage.key}
            className="col-span-2 grid grid-cols-subgrid items-center"
            data-testid={`${stage.key}-trend-tooltip-row`}
            style={{ color: stage.color }}
          >
            <dt className="flex items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="h-0.5 w-4 shrink-0 rounded-full"
                data-testid={`${stage.key}-trend-tooltip-marker`}
                style={{ backgroundColor: stage.color }}
              />
              {stage.label} ortalaması
            </dt>
            <dd className="text-right font-semibold tabular-nums">
              {formatDuration(row.stages[stage.key])}
            </dd>
          </div>
        ))}
        <NeutralTooltipRow
          label="Çevrim sayısı"
          testId="cycleCount-trend-tooltip-row"
          value={formatTurkishInteger(row.cycleCount) ?? unavailable}
        />
        <NeutralTooltipRow
          label="Ortalama toplam çevrim süresi"
          testId="averageCycleTime-trend-tooltip-row"
          value={formatDuration(row.averageCycleTime)}
        />
        <NeutralTooltipRow
          label="Kayıtlı aşamaların ortalama toplamı"
          testId="averageStageSum-trend-tooltip-row"
          value={formatDuration(row.averageStageSum)}
        />
        <NeutralTooltipRow
          label="Aşamalar ile toplam çevrim arasındaki fark"
          testId="stageSumDifference-trend-tooltip-row"
          value={formatSignedDuration(row.stageSumDifference)}
        />
      </dl>
      <p className="text-xs leading-5 text-muted-foreground">
        {getStageTrendDifferenceDescription(row.stageSumDifference)}
      </p>
    </div>
  );
}

function StageTrendLegend() {
  return (
    <ul
      aria-label="Aşama trendi renk açıklaması"
      className="flex flex-wrap gap-x-5 gap-y-3 text-xs"
    >
      {PROCESS_STAGES.map((stage) => (
        <li key={stage.key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0.5 w-5 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span style={{ color: stage.color }}>
            {stage.label} ({stage.key})
          </span>
        </li>
      ))}
    </ul>
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
      <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Zaman gruplaması:</span>
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
      <StageTrendLegend />
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
            Her renkli çizgi, ilgili aşamanın seçili zaman grubundaki ortalama
            süresini gösterir.
          </p>
          <p>
            Tek bir çizginin yükselmesi, o aşamanın ortalama süresinin arttığını
            gösterebilir. Toplam çevrim yükselirken aşama çizgileri sabit
            kalıyorsa, aşamalar dışında ölçülen süre artmış olabilir.
          </p>
          <p>Az sayıda çevrim içeren noktalar daha dikkatli yorumlanmalıdır.</p>
          <p>
            Ürün, kalıp ve makine Tümü seçildiğinde farklı üretim koşulları
            birlikte ortalanır. Bu grafik tek başına arıza nedenini göstermez.
          </p>
        </div>
      </details>
    </div>
  );
}
