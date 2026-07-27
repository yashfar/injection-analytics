"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
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
  ChartLegend,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatTrendAxisDate,
  formatTrendTooltipDate,
  formatTurkishAxisNumber,
  formatTurkishCycleTime,
  formatTurkishInteger,
} from "@/lib/analytics-formatters";
import { trMessages } from "@/lib/tr-messages";
import {
  transformTrendResponse,
  type TransformedTrendData,
  type TrendChartSeries,
} from "@/lib/trend-chart";
import type {
  TrendBucketSize,
  TrendPoint,
  TrendResponse,
} from "@/types/analytics";

const messages = trMessages.trend;

type CycleTimeTrendChartProps = {
  data: TrendResponse | undefined;
  machineColorOrder: readonly string[];
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  onRetry: () => void;
};

function getBucketLabel(
  bucketSize: Exclude<TrendBucketSize, null>,
): string {
  switch (bucketSize) {
    case "hour":
      return messages.hourly;
    case "day":
      return messages.daily;
    case "week":
      return messages.weekly;
  }
}

type TrendHeadingProps = {
  bucketSize?: Exclude<TrendBucketSize, null>;
  isUpdating?: boolean;
};

function TrendHeading({
  bucketSize,
  isUpdating = false,
}: TrendHeadingProps) {
  return (
    <CardHeader>
      <CardTitle>
        <h2 id="cycle-time-trend-title">{messages.title}</h2>
      </CardTitle>
      <CardDescription id="cycle-time-trend-description">
        {messages.description}
      </CardDescription>
      {bucketSize || isUpdating ? (
        <CardAction
          className="flex flex-wrap justify-end gap-2"
          aria-live="polite"
        >
          {bucketSize ? (
            <Badge variant="secondary">{getBucketLabel(bucketSize)}</Badge>
          ) : null}
          {isUpdating ? (
            <Badge variant="outline">{trMessages.common.updating}</Badge>
          ) : null}
        </CardAction>
      ) : null}
    </CardHeader>
  );
}

function TooltipStatistic({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (value === null) {
    return null;
  }

  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </>
  );
}

function TrendPointStatistics({ point }: { point: TrendPoint }) {
  const median = formatTurkishCycleTime(point.medianCycleTime);
  const average = formatTurkishCycleTime(point.averageCycleTime);
  const minimum = formatTurkishCycleTime(point.minimumCycleTime);
  const maximum = formatTurkishCycleTime(point.maximumCycleTime);
  const cycleCount = formatTurkishInteger(point.cycleCount);
  const seconds = messages.seconds;

  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
      <TooltipStatistic
        label={messages.medianCycleTime}
        value={median === null ? null : `${median} ${seconds}`}
      />
      <TooltipStatistic
        label={messages.averageCycleTime}
        value={average === null ? null : `${average} ${seconds}`}
      />
      <TooltipStatistic
        label={messages.minimumCycleTime}
        value={minimum === null ? null : `${minimum} ${seconds}`}
      />
      <TooltipStatistic
        label={messages.maximumCycleTime}
        value={maximum === null ? null : `${maximum} ${seconds}`}
      />
      <TooltipStatistic label={messages.cycleCount} value={cycleCount} />
    </dl>
  );
}

type TrendTooltipProps = {
  active: boolean;
  timestamp: number | undefined;
  bucketSize: Exclude<TrendBucketSize, null>;
  chartData: TransformedTrendData;
};

function TrendTooltip({
  active,
  timestamp,
  bucketSize,
  chartData,
}: TrendTooltipProps) {
  if (!active || timestamp === undefined) {
    return null;
  }

  const row = chartData.rows.find(
    (candidate) => candidate.timestamp === timestamp,
  );
  const formattedDate = row
    ? formatTrendTooltipDate(row.timestamp, bucketSize)
    : null;

  if (!row || !formattedDate) {
    return null;
  }

  const visibleSeries = chartData.series.flatMap((series) => {
    const point = row.metadata[series.dataKey];
    return point ? [{ series, point }] : [];
  });

  if (visibleSeries.length === 0) {
    return null;
  }

  return (
    <div className="max-h-80 w-[min(20rem,calc(100vw-2rem))] space-y-3 overflow-y-auto rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <p className="font-medium text-popover-foreground">
        {messages.date}: {formattedDate}
      </p>
      {visibleSeries.map(({ series, point }) => (
        <section
          key={series.dataKey}
          className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0"
        >
          <div className="flex items-center gap-2 font-medium text-popover-foreground">
            <span
              className="h-0.5 w-6 shrink-0 rounded-full"
              style={{ backgroundColor: series.color }}
              aria-hidden="true"
            />
            <span>
              {messages.machine}: {series.machine}
            </span>
          </div>
          <TrendPointStatistics point={point} />
        </section>
      ))}
    </div>
  );
}

type TrendLegendProps = {
  series: TrendChartSeries[];
  focusedMachine: string | null;
  lockedMachine: string | null;
  onFocusMachine: (machine: string | null) => void;
  onToggleMachine: (machine: string) => void;
};

function TrendLegend({
  series,
  focusedMachine,
  lockedMachine,
  onFocusMachine,
  onToggleMachine,
}: TrendLegendProps) {
  return (
    <ul className="flex max-w-full flex-wrap items-center justify-center gap-1.5 pt-3 text-xs">
      {series.map((item) => (
        <li key={item.dataKey}>
          <button
            type="button"
            className={
              lockedMachine === item.machine
                ? "inline-flex min-h-8 items-center gap-2 rounded-md bg-muted px-2 py-1.5 font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                : "inline-flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            }
            aria-label={`${item.machine} ${messages.focusSeries}`}
            aria-pressed={lockedMachine === item.machine}
            onMouseEnter={() => onFocusMachine(item.machine)}
            onMouseLeave={() => onFocusMachine(null)}
            onFocus={() => onFocusMachine(item.machine)}
            onBlur={() => onFocusMachine(null)}
            onClick={() => onToggleMachine(item.machine)}
          >
            <span
              className="h-0.5 w-6 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span
              className={
                focusedMachine === item.machine
                  ? "font-medium text-foreground"
                  : undefined
              }
            >
              {item.machine}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CycleTimeTrendChart({
  data,
  machineColorOrder,
  isPending,
  isError,
  isFetching,
  isPlaceholderData,
  onRetry,
}: CycleTimeTrendChartProps) {
  const [focusedMachine, setFocusedMachine] = useState<string | null>(
    null,
  );
  const [lockedMachine, setLockedMachine] = useState<string | null>(
    null,
  );
  const chartData = useMemo(
    () => transformTrendResponse(data, machineColorOrder),
    [data, machineColorOrder],
  );
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};

    for (const series of chartData.series) {
      config[series.dataKey] = {
        label: series.machine,
        color: series.color,
      };
    }

    return config;
  }, [chartData.series]);

  if (isPending) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="cycle-time-trend-title"
      >
        <TrendHeading />
        <CardContent className="flex flex-1" aria-busy="true">
          <span className="sr-only">{messages.loading}</span>
          <Skeleton className="min-h-80 w-full" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="cycle-time-trend-title"
      >
        <TrendHeading />
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

  const bucketSize = data?.bucketSize;
  const isEmpty =
    bucketSize === null ||
    !bucketSize ||
    data.series.length === 0 ||
    chartData.rows.length === 0;

  if (isEmpty) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="cycle-time-trend-title"
      >
        <TrendHeading />
        <CardContent className="flex flex-1 items-center">
          <p className="text-sm text-muted-foreground">
            {messages.noData}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isUpdating = isFetching || isPlaceholderData;
  const requestedFocusedMachine = focusedMachine ?? lockedMachine;
  const activeFocusedMachine =
    requestedFocusedMachine &&
    chartData.series.some(
      (series) => series.machine === requestedFocusedMachine,
    )
      ? requestedFocusedMachine
      : null;

  return (
    <Card
      className="min-h-112 min-w-0"
      aria-labelledby="cycle-time-trend-title"
      aria-describedby="cycle-time-trend-description cycle-time-trend-accessibility-description"
      aria-busy={isUpdating}
    >
      <TrendHeading bucketSize={bucketSize} isUpdating={isUpdating} />
      <CardContent className="min-w-0 space-y-4">
        <p id="cycle-time-trend-accessibility-description" className="sr-only">
          {messages.accessibilityDescription}
        </p>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-80 min-h-80 w-full min-w-0"
          initialDimension={{ width: 560, height: 320 }}
        >
          <LineChart
            data={chartData.rows}
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
              tickFormatter={(value: number) =>
                formatTurkishAxisNumber(value)
              }
              label={{
                value: messages.yAxisLabel,
                angle: -90,
                position: "insideLeft",
              }}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, label }) => (
                <TrendTooltip
                  active={Boolean(active)}
                  timestamp={
                    typeof label === "number"
                      ? label
                      : typeof label === "string" &&
                          Number.isFinite(Number(label))
                        ? Number(label)
                        : undefined
                  }
                  bucketSize={bucketSize}
                  chartData={chartData}
                />
              )}
            />
            <ChartLegend
              content={() => (
                <TrendLegend
                  series={chartData.series}
                  focusedMachine={activeFocusedMachine}
                  lockedMachine={lockedMachine}
                  onFocusMachine={setFocusedMachine}
                  onToggleMachine={(machine) =>
                    setLockedMachine((current) =>
                      current === machine ? null : machine,
                    )
                  }
                />
              )}
            />
            {chartData.series.map((series) => {
              const isFocused =
                activeFocusedMachine === series.machine;
              const pointCount = chartData.rows.reduce(
                (count, row) =>
                  row.values[series.dataKey] === null
                    ? count
                    : count + 1,
                0,
              );

              return (
                <Line
                  key={series.dataKey}
                  type="linear"
                  dataKey={`values.${series.dataKey}`}
                  name={series.machine}
                  stroke={series.color}
                  strokeWidth={isFocused ? 3.5 : 2.5}
                  strokeOpacity={
                    activeFocusedMachine && !isFocused ? 0.22 : 1
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={
                    pointCount <= 30
                      ? {
                          r: 2.5,
                          fill: series.color,
                          stroke: "var(--background)",
                          strokeWidth: 1.5,
                        }
                      : false
                  }
                  activeDot={{
                    r: 5,
                    fill: series.color,
                    stroke: "var(--background)",
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
