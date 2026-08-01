"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatTurkishAxisNumber,
  formatTurkishCycleTime,
  formatTurkishSignedCycleTime,
} from "@/lib/analytics-formatters";
import { PROCESS_STAGES } from "@/lib/process-stages";
import type {
  AnalysisStageKey,
  AnalysisStagesSummaryResponse,
} from "@/types/analytics";

const chartConfig = {
  ...Object.fromEntries(
    PROCESS_STAGES.map((stage) => [
      stage.key,
      { label: stage.label, color: stage.color },
    ]),
  ),
} satisfies ChartConfig;

const unavailable = "Mevcut değil";

function formatDuration(value: number | null): string {
  if (value === null) {
    return unavailable;
  }

  const formatted = formatTurkishCycleTime(value);
  return formatted ? `${formatted} sn` : unavailable;
}

function formatSignedDuration(value: number | null): string {
  if (value === null) {
    return unavailable;
  }

  const formatted = formatTurkishSignedCycleTime(value);
  return formatted ? `${formatted} sn` : unavailable;
}

type StageDistributionRow = { scope: "scope" } & Record<
  AnalysisStageKey,
  number
>;

type StageTooltipContentProps = {
  active: boolean;
  data: AnalysisStagesSummaryResponse;
};

function StageTooltipContent({ active, data }: StageTooltipContentProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5">
        {PROCESS_STAGES.map((stage) => (
          <div key={stage.key} className="contents">
            <dt className="text-muted-foreground">
              {stage.label} ({stage.key})
            </dt>
            <dd className="text-right font-medium text-foreground">
              {formatDuration(data.stages[stage.key].average)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StageLegend() {
  return (
    <ul
      className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground"
      aria-label="Aşama renk açıklaması"
    >
      {PROCESS_STAGES.map((stage) => (
        <li key={stage.key} className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-sm border border-background"
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          <span>
            {stage.label} ({stage.key})
          </span>
        </li>
      ))}
    </ul>
  );
}

type AnalysisStageDistributionChartProps = {
  data: AnalysisStagesSummaryResponse;
};

// Rendered only in AnalysisChartShell's success state. Unlike the legacy
// per-machine stage-breakdown chart, the applied filter scope is a single
// aggregate here, not an array of machines to compare — so this renders
// one stacked bar instead of one row per machine.
export function AnalysisStageDistributionChart({
  data,
}: AnalysisStageDistributionChartProps) {
  const row: StageDistributionRow = {
    scope: "scope",
    ...(Object.fromEntries(
      PROCESS_STAGES.map((stage) => [
        stage.key,
        data.stages[stage.key].average ?? 0,
      ]),
    ) as Record<AnalysisStageKey, number>),
  };

  return (
    <div className="min-w-0 space-y-5">
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-4">
        <div className="min-w-0 space-y-1">
          <dt className="text-xs text-muted-foreground">
            Ortalama Çevrim Süresi
          </dt>
          <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
            {formatDuration(data.averageCycleTime)}
          </dd>
        </div>
        <div className="min-w-0 space-y-1">
          <dt className="text-xs text-muted-foreground">
            Medyan Çevrim Süresi
          </dt>
          <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
            {formatDuration(data.medianCycleTime)}
          </dd>
        </div>
        <div className="min-w-0 space-y-1">
          <dt className="text-xs text-muted-foreground">
            Aşamaların Toplamı
          </dt>
          <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
            {formatDuration(data.averageStageSum)}
          </dd>
        </div>
        <div className="min-w-0 space-y-1">
          <dt className="text-xs text-muted-foreground">
            Toplam − Çevrim Süresi Farkı
          </dt>
          <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
            {formatSignedDuration(data.stageSumDifference)}
          </dd>
        </div>
      </dl>
      <StageLegend />
      <p className="text-xs text-muted-foreground">
        Aşama sürelerinin toplamı, ölçüm ve yuvarlama farkları nedeniyle
        toplam çevrim süresinden az miktarda sapabilir.
      </p>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-32 min-h-24 w-full min-w-0"
        initialDimension={{ width: 760, height: 96 }}
      >
        <BarChart
          data={[row]}
          layout="vertical"
          margin={{ top: 4, right: 20, bottom: 32, left: 8 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--border)"
            strokeDasharray="3 4"
            strokeOpacity={0.55}
          />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => formatTurkishAxisNumber(value)}
            label={{
              value: "Ortalama Süre (sn)",
              position: "insideBottom",
              offset: -20,
            }}
            height={48}
          />
          <YAxis
            type="category"
            dataKey="scope"
            tick={false}
            tickLine={false}
            axisLine={false}
            width={0}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
            content={({ active }) => (
              <StageTooltipContent active={Boolean(active)} data={data} />
            )}
          />
          {PROCESS_STAGES.map((stage, index) => (
            <Bar
              key={stage.key}
              dataKey={stage.key}
              stackId="stages"
              fill={stage.color}
              barSize={56}
              radius={
                index === 0
                  ? [6, 0, 0, 6]
                  : index === PROCESS_STAGES.length - 1
                    ? [0, 6, 6, 0]
                    : 0
              }
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}
