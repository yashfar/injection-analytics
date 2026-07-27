"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  type ScatterShapeProps,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatTurkishAxisNumber,
  formatTurkishCycleTime,
  formatTurkishInteger,
  formatTurkishSignedCycleTime,
} from "@/lib/analytics-formatters";
import { PROCESS_STAGES } from "@/lib/process-stages";
import {
  prepareStageBreakdownData,
  type PreparedMachineStageBreakdown,
  type StageBreakdownInsight,
} from "@/lib/stage-breakdown-chart";
import { trMessages } from "@/lib/tr-messages";
import type {
  StageBreakdownFilters,
  StageBreakdownResponse,
} from "@/types/analytics";

const messages = trMessages.stageBreakdown;

const chartConfig = {
  ...Object.fromEntries(
    PROCESS_STAGES.map((stage) => [
      stage.key,
      { label: stage.label, color: stage.color },
    ]),
  ),
  averageCycleTime: {
    label: messages.totalCycleMarker,
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

type ProcessStageBreakdownChartProps = {
  data: StageBreakdownResponse | undefined;
  requestedFilters: StageBreakdownFilters;
  selectedMachine?: string;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  onRetry: () => void;
};

function formatDuration(value: number | null): string {
  if (value === null) {
    return messages.unavailable;
  }

  const formatted = formatTurkishCycleTime(value);
  return formatted ? `${formatted} ${messages.seconds}` : messages.unavailable;
}

function formatSignedDuration(value: number): string {
  const formatted = formatTurkishSignedCycleTime(value);
  return formatted ? `${formatted} ${messages.seconds}` : messages.unavailable;
}

function isPreparedMachineStageBreakdown(
  value: unknown,
): value is PreparedMachineStageBreakdown {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PreparedMachineStageBreakdown>;
  return (
    typeof candidate.machine === "string" &&
    typeof candidate.averageCycleTime === "number"
  );
}

type TotalCycleMarkerProps = ScatterShapeProps & {
  selectedMachine?: string;
};

function TotalCycleMarker({
  cx,
  cy,
  payload: rawPayload,
  selectedMachine,
}: TotalCycleMarkerProps) {
  const payload: unknown = rawPayload;

  if (
    cx === undefined ||
    cy === undefined ||
    !isPreparedMachineStageBreakdown(payload)
  ) {
    return <g aria-hidden="true" />;
  }

  const isSelected = payload.machine === selectedMachine;
  const hasSelection = selectedMachine !== undefined;
  const radius = isSelected ? 7 : 6;

  return (
    <polygon
      aria-hidden="true"
      points={`${cx},${cy - radius} ${cx + radius},${cy} ${cx},${
        cy + radius
      } ${cx - radius},${cy}`}
      fill="var(--background)"
      stroke="var(--foreground)"
      strokeWidth={isSelected ? 3 : 2.25}
      opacity={hasSelection && !isSelected ? 0.72 : 1}
    />
  );
}

type MachineTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
  selectedMachine?: string;
};

function MachineTick({
  x = 0,
  y = 0,
  payload,
  selectedMachine,
}: MachineTickProps) {
  const machine =
    typeof payload?.value === "string" ? payload.value : "";
  const isSelected = machine === selectedMachine;

  return (
    <text
      x={x - 8}
      y={y}
      dy="0.35em"
      textAnchor="end"
      fill="var(--foreground)"
      fillOpacity={isSelected || !selectedMachine ? 1 : 0.72}
      fontSize={12}
      fontWeight={isSelected ? 700 : 500}
    >
      {machine}
    </text>
  );
}

function StageBreakdownTooltip({
  active,
  machine,
  machines,
}: {
  active: boolean;
  machine: string;
  machines: PreparedMachineStageBreakdown[];
}) {
  const statistics = machines.find(
    (candidate) => candidate.machine === machine,
  );

  if (!active || !statistics) {
    return null;
  }

  return (
    <div className="max-h-96 w-[min(24rem,calc(100vw-2rem))] space-y-3 overflow-y-auto rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <p className="font-semibold text-foreground">
        {messages.machine}: {statistics.machine}
      </p>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5">
        <div className="contents">
          <dt className="text-muted-foreground">{messages.cycleCount}</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatTurkishInteger(statistics.cycleCount) ??
              messages.unavailable}
          </dd>
        </div>
        <div className="contents">
          <dt className="text-muted-foreground">
            {messages.averageCycleTime}
          </dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatDuration(statistics.averageCycleTime)}
          </dd>
        </div>
        <div className="contents">
          <dt className="text-muted-foreground">
            {messages.medianCycleTime}
          </dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatDuration(statistics.medianCycleTime)}
          </dd>
        </div>
        {PROCESS_STAGES.flatMap((stage) => [
          <div key={`${stage.key}-average`} className="contents">
            <dt className="text-muted-foreground">
              {stage.label} ({stage.key}) {messages.average}
            </dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {formatDuration(statistics.stages[stage.key].average)}
            </dd>
          </div>,
          <div key={`${stage.key}-median`} className="contents">
            <dt className="text-muted-foreground">
              {stage.label} ({stage.key}) {messages.median}
            </dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {formatDuration(statistics.stages[stage.key].median)}
            </dd>
          </div>,
        ])}
        <div className="contents">
          <dt className="text-muted-foreground">
            {messages.averageStageSum}
          </dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatDuration(statistics.averageStageSum)}
          </dd>
        </div>
        <div className="contents">
          <dt className="text-muted-foreground">
            {messages.stageDifference}
          </dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatSignedDuration(statistics.stageSumDifference)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function StageBreakdownHeading({
  data,
  requestedFilters,
  isUpdating = false,
  isPlaceholderData = false,
}: {
  data?: StageBreakdownResponse;
  requestedFilters: StageBreakdownFilters;
  isUpdating?: boolean;
  isPlaceholderData?: boolean;
}) {
  const productCode = data?.productCode ?? requestedFilters.productCode;
  const castCode = data?.castCode ?? requestedFilters.castCode;

  return (
    <CardHeader>
      <CardTitle>
        <h2 id="process-stage-breakdown-title">{messages.title}</h2>
      </CardTitle>
      <CardDescription id="process-stage-breakdown-description">
        <span>{messages.description}</span>
        <span className="mt-1 block">
          {messages.selectionDescription(productCode, castCode)}
        </span>
        {isPlaceholderData ? (
          <span className="mt-1 block">{messages.updating}</span>
        ) : null}
      </CardDescription>
      {isUpdating ? (
        <CardAction>
          <Badge variant="outline">{trMessages.common.updating}</Badge>
        </CardAction>
      ) : null}
    </CardHeader>
  );
}

function StageBreakdownSkeleton() {
  const segmentWidths = [18, 20, 14, 32, 16];

  return (
    <div
      className="space-y-5 rounded-lg border border-border/60 p-4"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="grid grid-cols-[5rem_1fr] items-center gap-4"
        >
          <Skeleton className="h-4 w-full" />
          <div className="flex h-8 overflow-hidden rounded-md">
            {segmentWidths.map((width, index) => (
              <Skeleton
                key={`${row}-${index}`}
                className="h-full rounded-none border-r border-background last:border-r-0"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StageLegend() {
  return (
    <ul
      className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground"
      aria-label={messages.legendLabel}
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
      <li className="flex items-center gap-2">
        <span
          className="size-3 shrink-0 rotate-45 border-2 border-foreground bg-background"
          aria-hidden="true"
        />
        <span>{messages.totalCycleMarker}</span>
      </li>
    </ul>
  );
}

function formatInsight(
  insight: StageBreakdownInsight | null,
  signed = false,
): string {
  if (!insight) {
    return messages.unavailable;
  }

  return `${insight.machine} · ${
    signed ? formatSignedDuration(insight.value) : formatDuration(insight.value)
  }`;
}

function StageBreakdownSummary({
  machines,
  lowestAverageCycle,
  highestCoolingAverage,
  largestAbsoluteDifference,
}: {
  machines: PreparedMachineStageBreakdown[];
  lowestAverageCycle: StageBreakdownInsight | null;
  highestCoolingAverage: StageBreakdownInsight | null;
  largestAbsoluteDifference: StageBreakdownInsight | null;
}) {
  const items = [
    {
      label: messages.lowestAverageCycle,
      value: formatInsight(lowestAverageCycle),
    },
    {
      label: messages.highestCoolingAverage,
      value: formatInsight(highestCoolingAverage),
    },
    {
      label: messages.largestAbsoluteDifference,
      value: formatInsight(largestAbsoluteDifference, true),
    },
    {
      label: messages.comparedMachines,
      value:
        formatTurkishInteger(machines.length) ?? messages.unavailable,
    },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="break-words text-sm font-semibold tabular-nums text-card-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AccessibleStageStatistics({
  machines,
  selectedMachine,
}: {
  machines: PreparedMachineStageBreakdown[];
  selectedMachine?: string;
}) {
  return (
    <section className="sr-only" aria-label={messages.textualAlternative}>
      <ul>
        {machines.map((machine) => (
          <li key={machine.machine}>
            {machine.machine}
            {machine.machine === selectedMachine
              ? `, ${messages.selectedMachine}`
              : ""}
            : {messages.cycleCount}{" "}
            {formatTurkishInteger(machine.cycleCount) ??
              messages.unavailable}
            , {messages.averageCycleTime}{" "}
            {formatDuration(machine.averageCycleTime)},{" "}
            {messages.medianCycleTime}{" "}
            {formatDuration(machine.medianCycleTime)}.{" "}
            {PROCESS_STAGES.map(
              (stage) =>
                `${stage.label} (${stage.key}) ${messages.average} ${formatDuration(
                  machine.stages[stage.key].average,
                )}, ${messages.median} ${formatDuration(
                  machine.stages[stage.key].median,
                )}`,
            ).join("; ")}
            . {messages.averageStageSum}{" "}
            {formatDuration(machine.averageStageSum)},{" "}
            {messages.stageDifference}{" "}
            {formatSignedDuration(machine.stageSumDifference)}.
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProcessStageBreakdownChart({
  data,
  requestedFilters,
  selectedMachine,
  isPending,
  isError,
  isFetching,
  isPlaceholderData,
  onRetry,
}: ProcessStageBreakdownChartProps) {
  const prepared = prepareStageBreakdownData(data);

  if (isPending) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="process-stage-breakdown-title"
      >
        <StageBreakdownHeading requestedFilters={requestedFilters} />
        <CardContent className="space-y-5" aria-busy="true">
          <span className="sr-only">{messages.loading}</span>
          <StageBreakdownSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="process-stage-breakdown-title"
      >
        <StageBreakdownHeading
          data={data}
          requestedFilters={requestedFilters}
        />
        <CardContent
          className="flex flex-1 flex-col items-start justify-center gap-4"
          role="alert"
        >
          <p className="text-sm text-muted-foreground">
            {messages.loadError}
          </p>
          <Button onClick={onRetry} disabled={isFetching}>
            {isFetching
              ? trMessages.common.retrying
              : trMessages.common.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isUpdating = isFetching || isPlaceholderData;
  const hasInvalidResponse =
    Boolean(data?.machines.length) && prepared.machines.length === 0;

  if (prepared.machines.length === 0) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="process-stage-breakdown-title"
      >
        <StageBreakdownHeading
          data={data}
          requestedFilters={requestedFilters}
          isUpdating={isUpdating}
          isPlaceholderData={isPlaceholderData}
        />
        <CardContent className="flex flex-1 items-center">
          <p className="text-sm text-muted-foreground" role="status">
            {hasInvalidResponse ? messages.invalidData : messages.noData}
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(
    280,
    prepared.machines.length * 58 + 90,
  );
  const selectedMachineHasData = selectedMachine
    ? prepared.machines.some(
        (machine) => machine.machine === selectedMachine,
      )
    : false;

  return (
    <Card
      className="min-h-112 min-w-0"
      aria-labelledby="process-stage-breakdown-title"
      aria-describedby="process-stage-breakdown-description process-stage-breakdown-accessibility-description"
      aria-busy={isUpdating}
    >
      <StageBreakdownHeading
        data={data}
        requestedFilters={requestedFilters}
        isUpdating={isUpdating}
        isPlaceholderData={isPlaceholderData}
      />
      <CardContent className="min-w-0 space-y-5">
        <StageBreakdownSummary
          machines={prepared.machines}
          lowestAverageCycle={prepared.lowestAverageCycle}
          highestCoolingAverage={prepared.highestCoolingAverage}
          largestAbsoluteDifference={prepared.largestAbsoluteDifference}
        />
        <div className="flex flex-wrap items-center gap-2">
          {selectedMachine ? (
            <Badge variant="outline">
              {messages.selectedMachine}: {selectedMachine}
              {selectedMachineHasData
                ? ""
                : ` · ${messages.selectedMachineNoData}`}
            </Badge>
          ) : null}
          {prepared.invalidMachines.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {messages.invalidMachines(prepared.invalidMachines.length)}
            </span>
          ) : null}
        </div>
        <StageLegend />
        <p className="text-xs text-muted-foreground">
          {messages.differenceExplanation}
        </p>
        <p
          id="process-stage-breakdown-accessibility-description"
          className="sr-only"
        >
          {messages.accessibilityDescription}
        </p>
        <AccessibleStageStatistics
          machines={prepared.machines}
          selectedMachine={selectedMachine}
        />
        <div
          className="max-h-180 min-w-0 overflow-y-auto"
          role="img"
          aria-label={messages.accessibilityDescription}
        >
          <ChartContainer
            config={chartConfig}
            className="aspect-auto min-h-70 w-full min-w-0"
            style={{ height: chartHeight }}
            initialDimension={{ width: 760, height: chartHeight }}
            aria-hidden="true"
          >
            <ComposedChart
              data={prepared.machines}
              layout="vertical"
              margin={{ top: 12, right: 20, bottom: 32, left: 8 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="var(--border)"
                strokeDasharray="3 4"
                strokeOpacity={0.55}
              />
              <XAxis
                type="number"
                dataKey="averageCycleTime"
                domain={prepared.domain}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  formatTurkishAxisNumber(value)
                }
                label={{
                  value: messages.xAxisLabel,
                  position: "insideBottom",
                  offset: -20,
                }}
                height={48}
              />
              <YAxis
                type="category"
                dataKey="machine"
                tickLine={false}
                axisLine={false}
                width={112}
                interval={0}
                tick={
                  <MachineTick selectedMachine={selectedMachine} />
                }
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
                content={({ active, label }) => (
                  <StageBreakdownTooltip
                    active={Boolean(active)}
                    machine={
                      typeof label === "string" ||
                      typeof label === "number"
                        ? String(label)
                        : ""
                    }
                    machines={prepared.machines}
                  />
                )}
              />
              {PROCESS_STAGES.map((stage, stageIndex) => (
                <Bar
                  key={stage.key}
                  dataKey={`stageAverages.${stage.key}`}
                  stackId="process-stages"
                  fill={stage.color}
                  barSize={34}
                  radius={
                    stageIndex === 0
                      ? [5, 0, 0, 5]
                      : stageIndex === PROCESS_STAGES.length - 1
                        ? [0, 5, 5, 0]
                        : 0
                  }
                  isAnimationActive={false}
                >
                  {prepared.machines.map((machine) => {
                    const isSelected =
                      machine.machine === selectedMachine;
                    const hasSelection = selectedMachine !== undefined;

                    return (
                      <Cell
                        key={`${stage.key}-${machine.machine}`}
                        fill={stage.color}
                        fillOpacity={
                          hasSelection && !isSelected ? 0.68 : 1
                        }
                        stroke="var(--background)"
                        strokeWidth={isSelected ? 1.75 : 1}
                      />
                    );
                  })}
                </Bar>
              ))}
              <Scatter
                data={prepared.machines}
                shape={(props: ScatterShapeProps) => (
                  <TotalCycleMarker
                    {...props}
                    selectedMachine={selectedMachine}
                  />
                )}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
