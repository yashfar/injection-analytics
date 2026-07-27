"use client";

import {
  ChartNoAxesColumnIncreasing,
  MousePointerClick,
  SearchX,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatTurkishAxisNumber,
  formatTurkishCycleTime,
  formatTurkishInteger,
  formatTurkishPercentage,
} from "@/lib/analytics-formatters";
import {
  HISTOGRAM_BIN_SIZE_OPTIONS,
  HISTOGRAM_MAX_VALUE_OPTIONS,
  prepareHistogramBins,
} from "@/lib/histogram-chart";
import { trMessages } from "@/lib/tr-messages";
import type {
  HistogramBin,
  HistogramConfiguration,
  HistogramResponse,
} from "@/types/analytics";

const messages = trMessages.histogram;

const chartConfig = {
  cycleCount: {
    label: messages.cycleCount,
    color: "var(--chart-1)",
  },
  overflow: {
    label: messages.displayMaximum,
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const skeletonBarHeights = [
  "h-1/4",
  "h-2/5",
  "h-3/5",
  "h-4/5",
  "h-full",
  "h-3/4",
  "h-1/2",
  "h-1/3",
] as const;

type CycleTimeHistogramChartProps = {
  data: HistogramResponse | undefined;
  requestedMachine?: string;
  configuration: HistogramConfiguration;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  onConfigurationChange: (configuration: HistogramConfiguration) => void;
  onSelectMachine: () => void;
  onRetry: () => void;
};

function formatDuration(value: number | null): string {
  if (value === null) {
    return messages.unavailable;
  }

  const formattedValue = formatTurkishCycleTime(value);
  return formattedValue
    ? `${formattedValue} ${messages.shortSeconds}`
    : messages.unavailable;
}

function formatConfigurationValue(value: number): string {
  return formatTurkishCycleTime(value) ?? String(value);
}

function formatInterval(bin: HistogramBin): string {
  const lowerBound = formatTurkishCycleTime(bin.lowerBound);

  if (!lowerBound) {
    return bin.label;
  }

  if (bin.isOverflow) {
    return `${lowerBound} ${messages.seconds} ${messages.overflow}`;
  }

  const upperBound =
    bin.upperBound === null
      ? null
      : formatTurkishCycleTime(bin.upperBound);

  return upperBound
    ? `${lowerBound}–${upperBound} ${messages.seconds}`
    : bin.label;
}

type HistogramTooltipProps = {
  active: boolean;
  label: string;
  bins: HistogramBin[];
  totalCycleCount: number;
};

function HistogramTooltip({
  active,
  label,
  bins,
  totalCycleCount,
}: HistogramTooltipProps) {
  const bin = bins.find((candidate) => candidate.label === label);

  if (!active || !bin) {
    return null;
  }

  const cycleCount =
    formatTurkishInteger(bin.cycleCount) ?? messages.unavailable;
  const share =
    totalCycleCount > 0
      ? formatTurkishPercentage(bin.cycleCount / totalCycleCount)
      : null;

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">{messages.interval}</dt>
        <dd className="text-right font-medium text-foreground">
          {formatInterval(bin)}
        </dd>
        <dt className="text-muted-foreground">{messages.cycleCount}</dt>
        <dd className="text-right font-medium text-foreground">
          {cycleCount}
        </dd>
        <dt className="text-muted-foreground">{messages.shareOfTotal}</dt>
        <dd className="text-right font-medium text-foreground">
          {share ?? messages.unavailable}
        </dd>
      </dl>
      {bin.isOverflow ? (
        <p className="border-t border-border pt-2 text-muted-foreground">
          {messages.overflowExplanation}
        </p>
      ) : null}
    </div>
  );
}

type HistogramHeadingProps = {
  displayedMachine?: string;
  requestedMachine?: string;
  isUpdating?: boolean;
  isPlaceholderData?: boolean;
};

function HistogramHeading({
  displayedMachine,
  requestedMachine,
  isUpdating = false,
  isPlaceholderData = false,
}: HistogramHeadingProps) {
  const headingMachine = displayedMachine ?? requestedMachine;
  const isMachineChange =
    isPlaceholderData &&
    Boolean(
      displayedMachine &&
        requestedMachine &&
        displayedMachine !== requestedMachine,
    );

  return (
    <CardHeader>
      <CardTitle>
        <h2 id="cycle-time-histogram-title">{messages.title}</h2>
      </CardTitle>
      <CardDescription id="cycle-time-histogram-description">
        <span>
          {headingMachine
            ? `${messages.description} Makine: ${headingMachine}.`
            : messages.description}
        </span>
        {isMachineChange && displayedMachine ? (
          <span className="mt-1 block">
            {messages.showingPreviousMachineData(displayedMachine)}
          </span>
        ) : null}
      </CardDescription>
      {isUpdating ? (
        <CardAction>
          <Badge variant="outline">
            {isMachineChange && requestedMachine
              ? messages.loadingMachineData(requestedMachine)
              : trMessages.common.updating}
          </Badge>
        </CardAction>
      ) : null}
    </CardHeader>
  );
}

type HistogramControlsProps = {
  configuration: HistogramConfiguration;
  disabled: boolean;
  onConfigurationChange: (configuration: HistogramConfiguration) => void;
};

function HistogramControls({
  configuration,
  disabled,
  onConfigurationChange,
}: HistogramControlsProps) {
  function updateBinSize(value: string | null) {
    const binSize = HISTOGRAM_BIN_SIZE_OPTIONS.find(
      (option) => String(option) === value,
    );

    if (binSize !== undefined) {
      onConfigurationChange({ ...configuration, binSize });
    }
  }

  function updateMaxValue(value: string | null) {
    const maxValue = HISTOGRAM_MAX_VALUE_OPTIONS.find(
      (option) => String(option) === value,
    );

    if (maxValue !== undefined) {
      onConfigurationChange({ ...configuration, maxValue });
    }
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3"
      aria-label="Histogram ayarları"
    >
      <div className="space-y-1.5">
        <Label htmlFor="histogram-bin-size">{messages.binSize}</Label>
        <Select
          value={String(configuration.binSize)}
          onValueChange={updateBinSize}
          disabled={disabled}
        >
          <SelectTrigger id="histogram-bin-size" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HISTOGRAM_BIN_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {formatConfigurationValue(option)} {messages.shortSeconds}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="histogram-max-value">
          {messages.displayMaximum}
        </Label>
        <Select
          value={String(configuration.maxValue)}
          onValueChange={updateMaxValue}
          disabled={disabled}
        >
          <SelectTrigger id="histogram-max-value" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HISTOGRAM_MAX_VALUE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {formatConfigurationValue(option)} {messages.shortSeconds}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function HistogramSkeleton() {
  return (
    <div
      data-slot="histogram-skeleton"
      className="flex h-72 items-end gap-2 border-b border-l border-border px-4 pt-8"
      aria-hidden="true"
    >
      {skeletonBarHeights.map((height, index) => (
        <Skeleton
          key={`${height}-${index}`}
          className={`min-w-0 flex-1 rounded-t-md rounded-b-none ${height}`}
        />
      ))}
    </div>
  );
}

type HistogramEmptyStateProps = {
  icon: typeof ChartNoAxesColumnIncreasing;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showHistogramVisual?: boolean;
};

function HistogramEmptyState({
  icon: Icon,
  title,
  description,
  action,
  showHistogramVisual = false,
}: HistogramEmptyStateProps) {
  return (
    <div className="my-auto flex flex-col items-center gap-5 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      {showHistogramVisual ? (
        <div
          className="flex h-16 w-full max-w-56 items-end gap-2 border-b border-l border-border px-3 pt-3"
          aria-hidden="true"
        >
          {skeletonBarHeights.slice(0, 6).map((height, index) => (
            <span
              key={`${height}-${index}`}
              className={`min-w-0 flex-1 rounded-t-sm bg-primary/20 ${height}`}
            />
          ))}
        </div>
      ) : null}
      <div className="max-w-xl space-y-2">
        <h3 className="text-base font-semibold text-card-foreground">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? (
        <Button type="button" onClick={action.onClick}>
          <MousePointerClick aria-hidden="true" />
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

function HistogramSummary({ data }: { data: HistogramResponse }) {
  const summaryItems = [
    {
      label: messages.totalCycles,
      value:
        formatTurkishInteger(data.totalCycleCount) ?? messages.unavailable,
    },
    {
      label: messages.minimumCycleTime,
      value: formatDuration(data.minimumCycleTime),
    },
    {
      label: messages.maximumCycleTime,
      value: formatDuration(data.maximumCycleTime),
    },
    {
      label: messages.binSize,
      value: formatDuration(data.binSize),
    },
    {
      label: messages.displayMaximum,
      value: formatDuration(data.maxValue),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-3 lg:grid-cols-5">
      {summaryItems.map((item) => (
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

export function CycleTimeHistogramChart({
  data,
  requestedMachine,
  configuration,
  isPending,
  isError,
  isFetching,
  isPlaceholderData,
  onConfigurationChange,
  onSelectMachine,
  onRetry,
}: CycleTimeHistogramChartProps) {
  const displayedMachine = data?.machine;
  const preparedBins = prepareHistogramBins(data?.bins);

  if (!requestedMachine) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="cycle-time-histogram-title"
      >
        <HistogramHeading />
        <CardContent className="flex flex-1 flex-col gap-5">
          <HistogramControls
            configuration={configuration}
            disabled
            onConfigurationChange={onConfigurationChange}
          />
          <HistogramEmptyState
            icon={ChartNoAxesColumnIncreasing}
            title={messages.noMachineTitle}
            description={messages.noMachineDescription}
            action={{
              label: messages.selectMachineAction,
              onClick: onSelectMachine,
            }}
            showHistogramVisual
          />
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="cycle-time-histogram-title"
      >
        <HistogramHeading requestedMachine={requestedMachine} />
        <CardContent className="space-y-5" aria-busy="true">
          <HistogramControls
            configuration={configuration}
            disabled
            onConfigurationChange={onConfigurationChange}
          />
          <span className="sr-only">{messages.loading}</span>
          <HistogramSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="cycle-time-histogram-title"
      >
        <HistogramHeading
          displayedMachine={displayedMachine}
          requestedMachine={requestedMachine}
        />
        <CardContent
          className="flex flex-1 flex-col items-start gap-5"
          role="alert"
        >
          <HistogramControls
            configuration={configuration}
            disabled={isFetching}
            onConfigurationChange={onConfigurationChange}
          />
          <div className="my-auto space-y-4">
            <p className="text-sm text-muted-foreground">
              {messages.loadError}
            </p>
            <Button onClick={onRetry} disabled={isFetching}>
              {isFetching
                ? trMessages.common.retrying
                : trMessages.common.retry}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEmpty =
    !data ||
    data.totalCycleCount <= 0 ||
    preparedBins.length === 0;

  if (isEmpty) {
    const isUpdating = isFetching || isPlaceholderData;

    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="cycle-time-histogram-title"
      >
        <HistogramHeading
          displayedMachine={displayedMachine}
          requestedMachine={requestedMachine}
          isUpdating={isUpdating}
          isPlaceholderData={isPlaceholderData}
        />
        <CardContent className="flex flex-1 flex-col gap-5">
          <HistogramControls
            configuration={configuration}
            disabled={isFetching}
            onConfigurationChange={onConfigurationChange}
          />
          <HistogramEmptyState
            icon={SearchX}
            title={messages.noDataTitle}
            description={messages.noData}
          />
        </CardContent>
      </Card>
    );
  }

  const isUpdating = isFetching || isPlaceholderData;
  const overflowBin = preparedBins.find((bin) => bin.isOverflow);

  return (
    <Card
      className="min-h-112 min-w-0"
      aria-labelledby="cycle-time-histogram-title"
      aria-describedby="cycle-time-histogram-description cycle-time-histogram-accessibility-description"
      aria-busy={isUpdating}
    >
      <HistogramHeading
        displayedMachine={displayedMachine}
        requestedMachine={requestedMachine}
        isUpdating={isUpdating}
        isPlaceholderData={isPlaceholderData}
      />
      <CardContent className="min-w-0 space-y-5">
        <HistogramControls
          configuration={configuration}
          disabled={false}
          onConfigurationChange={onConfigurationChange}
        />
        <HistogramSummary data={data} />
        <p
          id="cycle-time-histogram-accessibility-description"
          className="sr-only"
        >
          {messages.accessibilityDescription} {messages.xAxisLabel}.{" "}
          {messages.yAxisLabel}.
        </p>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-80 min-h-80 w-full min-w-0"
          initialDimension={{ width: 760, height: 320 }}
        >
          <BarChart
            data={preparedBins}
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
                value: messages.xAxisLabel,
                position: "insideBottom",
                offset: -20,
              }}
            />
            <YAxis
              allowDecimals={false}
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
              cursor={{ fill: "var(--muted)", fillOpacity: 0.45 }}
              content={({ active, label }) => (
                <HistogramTooltip
                  active={Boolean(active)}
                  label={
                    typeof label === "string" || typeof label === "number"
                      ? String(label)
                      : ""
                  }
                  bins={preparedBins}
                  totalCycleCount={data.totalCycleCount}
                />
              )}
            />
            <Bar
              dataKey="cycleCount"
              name={messages.cycleCount}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              {preparedBins.map((bin) => (
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
            {messages.overflowExplanation}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
