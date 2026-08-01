"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChevronDownIcon } from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatTurkishAxisNumber,
  formatTurkishCycleTime,
  formatTurkishPercentage,
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

type LongestAverageStage = {
  stage: (typeof PROCESS_STAGES)[number];
  average: number;
};

export function getLongestAverageStage(
  data: AnalysisStagesSummaryResponse,
): LongestAverageStage | null {
  let longestStage: LongestAverageStage | null = null;

  for (const stage of PROCESS_STAGES) {
    const average = data.stages[stage.key].average;

    if (
      average !== null &&
      Number.isFinite(average) &&
      (longestStage === null || average > longestStage.average)
    ) {
      longestStage = { stage, average };
    }
  }

  return longestStage;
}

export function getRecordedStageShare(
  longestStageAverage: number,
  averageStageSum: number | null,
): number | null {
  if (
    averageStageSum === null ||
    !Number.isFinite(averageStageSum) ||
    averageStageSum <= 0
  ) {
    return null;
  }

  const share = longestStageAverage / averageStageSum;
  return Number.isFinite(share) ? share : null;
}

export function getStageSumDifferenceExplanation(
  stageSumDifference: number | null,
): string {
  if (stageSumDifference === null || !Number.isFinite(stageSumDifference)) {
    return "Aşama-toplam farkı için karşılaştırılabilir bir değer mevcut değil.";
  }

  const absoluteDifference = Math.abs(stageSumDifference);
  const formattedDifference = formatDuration(absoluteDifference);

  if (formatTurkishCycleTime(absoluteDifference) === "0") {
    return "Kayıtlı aşama toplamı ile ortalama toplam çevrim süresi birbirine yakındır.";
  }

  if (stageSumDifference < 0) {
    return `Ortalama toplam çevrim süresi, kayıtlı aşama toplamından ${formattedDifference} daha uzundur.`;
  }

  return `Kayıtlı aşama toplamı, ortalama toplam çevrim süresinden ${formattedDifference} daha uzundur.`;
}

type StageTooltipContentProps = {
  active: boolean;
  data: AnalysisStagesSummaryResponse;
};

export function StageTooltipContent({
  active,
  data,
}: StageTooltipContentProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <p className="font-medium text-popover-foreground">
        Aşamaların ortalama ve medyan süreleri
      </p>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
        {PROCESS_STAGES.map((stage) => (
          <div
            key={stage.key}
            className="col-span-2 grid grid-cols-subgrid items-start"
            data-testid={`${stage.key}-tooltip-row`}
            style={{ color: stage.color }}
          >
            <dt className="flex items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="h-0.5 w-4 shrink-0 rounded-full"
                data-testid={`${stage.key}-tooltip-marker`}
                style={{ backgroundColor: stage.color }}
              />
              {stage.label} ({stage.key})
            </dt>
            <dd className="space-y-0.5 text-right font-semibold tabular-nums">
              <span className="block">
                Ortalama: {formatDuration(data.stages[stage.key].average)}
              </span>
              <span className="block">
                Medyan: {formatDuration(data.stages[stage.key].median)}
              </span>
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
          <span style={{ color: stage.color }}>
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
  const longestAverageStage = getLongestAverageStage(data);
  const recordedStageShare = longestAverageStage
    ? getRecordedStageShare(longestAverageStage.average, data.averageStageSum)
    : null;
  const stageSumDifferenceExplanation = getStageSumDifferenceExplanation(
    data.stageSumDifference,
  );

  return (
    <div className="min-w-0 space-y-5">
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
      <StageLegend />
      <section
        aria-labelledby="stage-insights-heading"
        className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3"
      >
        <h3
          id="stage-insights-heading"
          className="text-sm font-semibold text-card-foreground"
        >
          Öne çıkanlar
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">
              En uzun ortalama aşama
            </p>
            {longestAverageStage ? (
              <p
                className="flex items-center gap-2 text-sm font-semibold tabular-nums"
                style={{ color: longestAverageStage.stage.color }}
              >
                <span
                  aria-hidden="true"
                  className="h-0.5 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: longestAverageStage.stage.color }}
                />
                {longestAverageStage.stage.label} — {formatDuration(longestAverageStage.average)}
              </p>
            ) : (
              <p className="text-sm font-semibold text-card-foreground">
                {unavailable}
              </p>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">
              Kayıtlı aşamalar içindeki payı
            </p>
            <p className="text-sm font-semibold tabular-nums text-card-foreground">
              {recordedStageShare === null
                ? unavailable
                : formatTurkishPercentage(recordedStageShare) ?? unavailable}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 space-y-1">
            <dt className="text-xs text-muted-foreground">
              Kayıtlı aşamaların ortalama toplamı
            </dt>
            <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
              {formatDuration(data.averageStageSum)}
            </dd>
          </div>
          <div className="min-w-0 space-y-1">
            <dt className="text-xs text-muted-foreground">
              Ortalama toplam çevrim süresi
            </dt>
            <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
              {formatDuration(data.averageCycleTime)}
            </dd>
          </div>
          <div className="min-w-0 space-y-1">
            <dt className="text-xs text-muted-foreground">
              Medyan toplam çevrim süresi
            </dt>
            <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
              {formatDuration(data.medianCycleTime)}
            </dd>
          </div>
          <div className="min-w-0 space-y-1">
            <dt className="text-xs text-muted-foreground">Aradaki fark</dt>
            <dd className="truncate text-sm font-semibold tabular-nums text-card-foreground">
              {formatSignedDuration(data.stageSumDifference)}
            </dd>
          </div>
        </dl>
      </section>
      <details className="group overflow-hidden rounded-lg border border-border/60 bg-muted/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
          <span>Bu grafik nasıl okunur?</span>
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-180"
          />
        </summary>
        <div
          aria-labelledby="stage-reading-heading"
          className="space-y-2 border-t border-border/60 px-3 py-3 text-sm leading-6 text-muted-foreground"
          id="stage-reading-heading"
        >
        <p>
          Renkli bölümler, seçili filtrelere uyan geçerli çevrimlerde her
          aşamanın ortalama süresini gösterir. Daha geniş bölüm, kayıtlı
          aşamalar içinde daha fazla zaman alan işlemi ifade eder.
        </p>
        <p>
          Toplam çevrim göstergesi TIMERCEVRIM ortalamasını, renkli bölümlerin
          toplamı ise kayıtlı beş aşamanın ortalama toplamını gösterir.
        </p>
        <p>
          Bu iki değer arasındaki fark; ölçüm kapsamı, aşamalar arasındaki
          bekleme veya kaydedilmeyen sürelerden kaynaklanabilir. Tek başına
          arıza anlamına gelmez.
        </p>
        <p>
          Ürün, kalıp ve makine Tümü seçildiğinde farklı üretim koşulları
          birlikte ortalanır. Daha ayrıntılı analiz için filtreleri
          daraltabilirsiniz.
        </p>
        <p>
          Ortalama, aşama sürelerinin toplamının çevrim sayısına bölünmesiyle
          hesaplanır. Medyan, sıralanmış aşama sürelerinin ortasındaki değerdir.
          Ortalama medyandan belirgin yüksekse, birkaç uzun aşama süresi
          ortalamayı yükseltiyor olabilir.
        </p>
          <p>{stageSumDifferenceExplanation}</p>
        </div>
      </details>
    </div>
  );
}
