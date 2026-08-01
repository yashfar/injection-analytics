"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  type BarShapeProps,
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
  formatTurkishPercentage,
} from "@/lib/analytics-formatters";
import {
  prepareBoxPlotData,
  type BoxPlotInsight,
  type PreparedMachineBoxPlot,
} from "@/lib/box-plot-chart";
import { trMessages } from "@/lib/tr-messages";
import type {
  BoxPlotFilters,
  BoxPlotResponse,
} from "@/types/analytics";

const messages = trMessages.boxPlot;

const chartConfig = {
  whiskerRange: {
    label: messages.whiskers,
    color: "var(--chart-1)",
  },
  averageCycleTime: {
    label: messages.averageCycleTime,
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

type MachineBoxPlotChartProps = {
  data: BoxPlotResponse | undefined;
  requestedFilters: BoxPlotFilters | null;
  machineColorOrder: readonly string[];
  selectedMachine?: string;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  onRetry: () => void;
};

function formatDuration(value: number): string {
  const formattedValue = formatTurkishCycleTime(value);
  return formattedValue
    ? `${formattedValue} ${messages.seconds}`
    : messages.unavailable;
}

function formatPercentagePoints(value: number): string {
  return (
    formatTurkishPercentage(value / 100) ?? messages.unavailable
  );
}

function isPreparedMachineBoxPlot(
  value: unknown,
): value is PreparedMachineBoxPlot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PreparedMachineBoxPlot>;

  return (
    typeof candidate.machine === "string" &&
    typeof candidate.color === "string" &&
    typeof candidate.lowerWhisker === "number" &&
    typeof candidate.upperWhisker === "number" &&
    typeof candidate.q1 === "number" &&
    typeof candidate.median === "number" &&
    typeof candidate.q3 === "number"
  );
}

type MachineBoxShapeProps = BarShapeProps & {
  selectedMachine?: string;
};

function MachineBoxShape({
  x,
  y,
  width,
  height,
  payload: rawPayload,
  selectedMachine,
}: MachineBoxShapeProps) {
  const payload: unknown = rawPayload;

  if (!isPreparedMachineBoxPlot(payload)) {
    return <g aria-hidden="true" />;
  }

  const range = payload.upperWhisker - payload.lowerWhisker;
  const centerY = y + height / 2;
  const capHeight = Math.min(18, height * 0.68);
  const boxHeight = Math.min(26, height * 0.72);
  const toX = (value: number) =>
    range > 0
      ? x + ((value - payload.lowerWhisker) / range) * width
      : x;
  const lowerWhiskerX = toX(payload.lowerWhisker);
  const upperWhiskerX = toX(payload.upperWhisker);
  const q1X = toX(payload.q1);
  const medianX = toX(payload.median);
  const q3X = toX(payload.q3);
  const isSelected = payload.machine === selectedMachine;
  const hasSelection = selectedMachine !== undefined;
  const strokeWidth = isSelected ? 2.75 : 1.75;
  const opacity = hasSelection && !isSelected ? 0.68 : 1;
  const boxX = Math.min(q1X, q3X);
  const boxWidth = Math.max(2, Math.abs(q3X - q1X));

  return (
    <g aria-hidden="true" opacity={opacity}>
      <line
        x1={lowerWhiskerX}
        x2={upperWhiskerX}
        y1={centerY}
        y2={centerY}
        stroke={payload.color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={lowerWhiskerX}
        x2={lowerWhiskerX}
        y1={centerY - capHeight / 2}
        y2={centerY + capHeight / 2}
        stroke={payload.color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={upperWhiskerX}
        x2={upperWhiskerX}
        y1={centerY - capHeight / 2}
        y2={centerY + capHeight / 2}
        stroke={payload.color}
        strokeWidth={strokeWidth}
      />
      <rect
        x={boxX}
        y={centerY - boxHeight / 2}
        width={boxWidth}
        height={boxHeight}
        rx={4}
        fill={payload.color}
        fillOpacity={isSelected ? 0.3 : 0.2}
        stroke={payload.color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={medianX}
        x2={medianX}
        y1={centerY - boxHeight / 2}
        y2={centerY + boxHeight / 2}
        stroke="var(--foreground)"
        strokeWidth={isSelected ? 3 : 2.25}
      />
    </g>
  );
}

type AverageMarkerShapeProps = ScatterShapeProps & {
  selectedMachine?: string;
};

function AverageMarkerShape({
  cx,
  cy,
  payload: rawPayload,
  selectedMachine,
}: AverageMarkerShapeProps) {
  const payload: unknown = rawPayload;

  if (
    cx === undefined ||
    cy === undefined ||
    !isPreparedMachineBoxPlot(payload)
  ) {
    return <g aria-hidden="true" />;
  }

  const isSelected = payload.machine === selectedMachine;
  const opacity =
    selectedMachine !== undefined && !isSelected ? 0.68 : 1;
  const radius = isSelected ? 6 : 5;

  return (
    <polygon
      aria-hidden="true"
      points={`${cx},${cy - radius} ${cx + radius},${cy} ${cx},${
        cy + radius
      } ${cx - radius},${cy}`}
      fill="var(--background)"
      stroke={payload.color}
      strokeWidth={isSelected ? 2.75 : 2}
      opacity={opacity}
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
      fontWeight={isSelected ? 700 : 500}
      fontSize={12}
    >
      {machine}
    </text>
  );
}

type BoxPlotTooltipProps = {
  active: boolean;
  machine: string;
  machines: PreparedMachineBoxPlot[];
};

function BoxPlotTooltip({
  active,
  machine,
  machines,
}: BoxPlotTooltipProps) {
  const statistics = machines.find(
    (candidate) => candidate.machine === machine,
  );

  if (!active || !statistics) {
    return null;
  }

  const rows = [
    [messages.cycleCount, formatTurkishInteger(statistics.cycleCount)],
    [
      messages.averageCycleTime,
      formatDuration(statistics.averageCycleTime),
    ],
    [messages.actualMinimum, formatDuration(statistics.actualMinimum)],
    [messages.lowerWhisker, formatDuration(statistics.lowerWhisker)],
    [messages.q1, formatDuration(statistics.q1)],
    [messages.medianValue, formatDuration(statistics.median)],
    [messages.q3, formatDuration(statistics.q3)],
    [messages.upperWhisker, formatDuration(statistics.upperWhisker)],
    [messages.actualMaximum, formatDuration(statistics.actualMaximum)],
    [messages.iqr, formatDuration(statistics.iqr)],
    [
      messages.outlierCount,
      formatTurkishInteger(statistics.outlierCount),
    ],
    [
      messages.outlierRate,
      formatPercentagePoints(statistics.outlierRate),
    ],
  ] as const;

  return (
    <div className="max-h-80 w-[min(22rem,calc(100vw-2rem))] space-y-3 overflow-y-auto rounded-lg border border-border/60 bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <p className="font-semibold text-foreground">
        {messages.machine}: {statistics.machine}
      </p>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {value ?? messages.unavailable}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type BoxPlotHeadingProps = {
  data?: BoxPlotResponse;
  requestedFilters: BoxPlotFilters | null;
  isUpdating?: boolean;
  isPlaceholderData?: boolean;
};

function BoxPlotHeading({
  data,
  requestedFilters,
  isUpdating = false,
  isPlaceholderData = false,
}: BoxPlotHeadingProps) {
  const productCode =
    data?.productCode ?? requestedFilters?.productCode ?? "";
  const castCode = data?.castCode ?? requestedFilters?.castCode ?? "";

  return (
    <CardHeader>
      <CardTitle>
        <h2 id="machine-box-plot-title">{messages.title}</h2>
      </CardTitle>
      <CardDescription id="machine-box-plot-description">
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

function BoxPlotSkeleton() {
  return (
    <div
      className="space-y-5 rounded-lg border border-border/60 p-4"
      aria-hidden="true"
    >
      {[58, 76, 48, 68, 54].map((width, index) => (
        <div
          key={`${width}-${index}`}
          className="grid grid-cols-[5rem_1fr] items-center gap-4"
        >
          <Skeleton className="h-4 w-full" />
          <div className="flex items-center">
            <Skeleton
              className="h-0.5"
              style={{ width: `${width}%` }}
            />
            <Skeleton className="h-7 w-20 -translate-x-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatInsight(
  insight: BoxPlotInsight | null,
  formatter: (value: number) => string,
): string {
  return insight
    ? `${insight.machine} · ${formatter(insight.value)}`
    : messages.unavailable;
}

type BoxPlotSummaryProps = {
  machines: PreparedMachineBoxPlot[];
  lowestMedian: BoxPlotInsight | null;
  smallestIqr: BoxPlotInsight | null;
  lowestOutlierRate: BoxPlotInsight | null;
};

function BoxPlotSummary({
  machines,
  lowestMedian,
  smallestIqr,
  lowestOutlierRate,
}: BoxPlotSummaryProps) {
  const items = [
    {
      label: messages.lowestMedian,
      value: formatInsight(lowestMedian, formatDuration),
    },
    {
      label: messages.smallestIqr,
      value: formatInsight(smallestIqr, formatDuration),
    },
    {
      label: messages.lowestOutlierRate,
      value: formatInsight(lowestOutlierRate, formatPercentagePoints),
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

function BoxPlotExplanation() {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <ul
        className="flex flex-wrap gap-x-4 gap-y-2"
        aria-label={messages.legendLabel}
      >
        <li>{messages.box}</li>
        <li>{messages.median}</li>
        <li>{messages.whiskers}</li>
        <li>{messages.average}</li>
      </ul>
      <p>{messages.outlierExplanation}</p>
    </div>
  );
}

function AccessibleStatistics({
  machines,
  selectedMachine,
}: {
  machines: PreparedMachineBoxPlot[];
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
            {formatTurkishInteger(machine.cycleCount)},{" "}
            {messages.actualMinimum}{" "}
            {formatDuration(machine.actualMinimum)},{" "}
            {messages.lowerWhisker} {formatDuration(machine.lowerWhisker)},{" "}
            {messages.q1} {formatDuration(machine.q1)},{" "}
            {messages.medianValue} {formatDuration(machine.median)},{" "}
            {messages.q3} {formatDuration(machine.q3)},{" "}
            {messages.upperWhisker} {formatDuration(machine.upperWhisker)},{" "}
            {messages.actualMaximum}{" "}
            {formatDuration(machine.actualMaximum)},{" "}
            {messages.averageCycleTime}{" "}
            {formatDuration(machine.averageCycleTime)},{" "}
            {messages.iqr} {formatDuration(machine.iqr)},{" "}
            {messages.outlierCount}{" "}
            {formatTurkishInteger(machine.outlierCount)},{" "}
            {messages.outlierRate}{" "}
            {formatPercentagePoints(machine.outlierRate)}.
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MachineBoxPlotChart({
  data,
  requestedFilters,
  machineColorOrder,
  selectedMachine,
  isPending,
  isError,
  isFetching,
  isPlaceholderData,
  onRetry,
}: MachineBoxPlotChartProps) {
  const prepared = prepareBoxPlotData(data, machineColorOrder);

  if (isPending) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="machine-box-plot-title"
      >
        <BoxPlotHeading requestedFilters={requestedFilters} />
        <CardContent className="space-y-5" aria-busy="true">
          <span className="sr-only">{messages.loading}</span>
          <BoxPlotSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="machine-box-plot-title"
      >
        <BoxPlotHeading data={data} requestedFilters={requestedFilters} />
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

  if (prepared.machines.length === 0) {
    return (
      <Card
        className="min-h-112 min-w-0"
        aria-labelledby="machine-box-plot-title"
      >
        <BoxPlotHeading
          data={data}
          requestedFilters={requestedFilters}
          isUpdating={isUpdating}
          isPlaceholderData={isPlaceholderData}
        />
        <CardContent className="flex flex-1 items-center">
          <p className="text-sm text-muted-foreground">
            {messages.noData}
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(
    320,
    prepared.machines.length * 60 + 100,
  );
  const selectedMachineHasData = selectedMachine
    ? prepared.machines.some(
        (machine) => machine.machine === selectedMachine,
      )
    : false;

  return (
    <Card
      className="min-h-112 min-w-0"
      aria-labelledby="machine-box-plot-title"
      aria-describedby="machine-box-plot-description machine-box-plot-accessibility-description"
      aria-busy={isUpdating}
    >
      <BoxPlotHeading
        data={data}
        requestedFilters={requestedFilters}
        isUpdating={isUpdating}
        isPlaceholderData={isPlaceholderData}
      />
      <CardContent className="min-w-0 space-y-5">
        <BoxPlotSummary
          machines={prepared.machines}
          lowestMedian={prepared.lowestMedian}
          smallestIqr={prepared.smallestIqr}
          lowestOutlierRate={prepared.lowestOutlierRate}
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
        <BoxPlotExplanation />
        <p
          id="machine-box-plot-accessibility-description"
          className="sr-only"
        >
          {messages.accessibilityDescription}
        </p>
        <AccessibleStatistics
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
            className="aspect-auto min-h-80 w-full min-w-0"
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
                  <BoxPlotTooltip
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
              <Bar
                dataKey="whiskerRange"
                barSize={38}
                shape={(props: BarShapeProps) => (
                  <MachineBoxShape
                    {...props}
                    selectedMachine={selectedMachine}
                  />
                )}
                isAnimationActive={false}
              />
              <Scatter
                data={prepared.machines}
                shape={(props: ScatterShapeProps) => (
                  <AverageMarkerShape
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
