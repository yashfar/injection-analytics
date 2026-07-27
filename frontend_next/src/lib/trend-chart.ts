import type {
  TrendPoint,
  TrendResponse,
} from "@/types/analytics";
import {
  compareMachineCodes,
  createMachineColorMap,
} from "@/lib/machine-colors";

export type TrendChartSeries = {
  dataKey: string;
  machine: string;
  color: string;
};

export type TrendChartRow = {
  bucketStart: string;
  timestamp: number;
  values: Record<string, number | null>;
  metadata: Record<string, TrendPoint | null>;
};

export type TransformedTrendData = {
  rows: TrendChartRow[];
  series: TrendChartSeries[];
};

export function transformTrendResponse(
  response: TrendResponse | undefined,
  machineColorOrder: readonly string[] = [],
): TransformedTrendData {
  if (!response) {
    return { rows: [], series: [] };
  }

  const machines = [...new Set(response.series.map((item) => item.machine))]
    .sort(compareMachineCodes);
  const colorByMachine = createMachineColorMap(
    machines,
    machineColorOrder,
  );
  const series = machines.map((machine, index) => ({
    dataKey: `machine_${index}`,
    machine,
    color: colorByMachine.get(machine) ?? "var(--chart-1)",
  }));
  const seriesByMachine = new Map(
    series.map((definition) => [definition.machine, definition]),
  );
  const rowsByTimestamp = new Map<number, TrendChartRow>();

  for (const machineSeries of response.series) {
    const definition = seriesByMachine.get(machineSeries.machine);

    if (!definition) {
      continue;
    }

    for (const point of machineSeries.points) {
      const timestamp = Date.parse(point.bucketStart);

      if (!Number.isFinite(timestamp)) {
        continue;
      }

      let row = rowsByTimestamp.get(timestamp);

      if (!row) {
        row = {
          bucketStart: point.bucketStart,
          timestamp,
          values: Object.fromEntries(
            series.map((item) => [item.dataKey, null]),
          ),
          metadata: Object.fromEntries(
            series.map((item) => [item.dataKey, null]),
          ),
        };
        rowsByTimestamp.set(timestamp, row);
      }

      row.values[definition.dataKey] = Number.isFinite(point.medianCycleTime)
        ? point.medianCycleTime
        : null;
      row.metadata[definition.dataKey] = point;
    }
  }

  const rows = [...rowsByTimestamp.values()]
    .filter((row) =>
      series.some((item) => row.values[item.dataKey] !== null),
    )
    .sort((left, right) => left.timestamp - right.timestamp);

  return { rows, series };
}
