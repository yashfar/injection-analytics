import {
  compareMachineCodes,
  createMachineColorMap,
} from "@/lib/machine-colors";
import type {
  BoxPlotResponse,
  MachineBoxPlotStatistics,
} from "@/types/analytics";

export interface PreparedMachineBoxPlot
  extends MachineBoxPlotStatistics {
  color: string;
  whiskerRange: [number, number];
}

export type BoxPlotInsight = {
  machine: string;
  value: number;
};

export type PreparedBoxPlotData = {
  machines: PreparedMachineBoxPlot[];
  invalidMachines: string[];
  domain: [number, number];
  lowestMedian: BoxPlotInsight | null;
  smallestIqr: BoxPlotInsight | null;
  lowestOutlierRate: BoxPlotInsight | null;
};

const numericFields = [
  "cycleCount",
  "averageCycleTime",
  "actualMinimum",
  "actualMaximum",
  "q1",
  "median",
  "q3",
  "iqr",
  "lowerFence",
  "upperFence",
  "lowerWhisker",
  "upperWhisker",
  "outlierCount",
  "outlierRate",
] as const satisfies readonly (keyof MachineBoxPlotStatistics)[];

function isUsableMachineStatistics(
  statistics: MachineBoxPlotStatistics,
): boolean {
  if (
    !statistics.machine.trim() ||
    numericFields.some(
      (field) => !Number.isFinite(statistics[field]),
    ) ||
    !Number.isInteger(statistics.cycleCount) ||
    statistics.cycleCount <= 0 ||
    !Number.isInteger(statistics.outlierCount) ||
    statistics.outlierCount < 0 ||
    statistics.outlierCount > statistics.cycleCount ||
    statistics.outlierRate < 0 ||
    statistics.outlierRate > 100 ||
    statistics.iqr < 0
  ) {
    return false;
  }

  return (
    statistics.actualMinimum <= statistics.lowerWhisker &&
    statistics.lowerFence <= statistics.lowerWhisker &&
    statistics.lowerWhisker <= statistics.q1 &&
    statistics.q1 <= statistics.median &&
    statistics.median <= statistics.q3 &&
    statistics.q3 <= statistics.upperWhisker &&
    statistics.upperWhisker <= statistics.upperFence &&
    statistics.upperWhisker <= statistics.actualMaximum &&
    statistics.averageCycleTime >= statistics.actualMinimum &&
    statistics.averageCycleTime <= statistics.actualMaximum
  );
}

function selectInsight(
  machines: PreparedMachineBoxPlot[],
  value: (machine: PreparedMachineBoxPlot) => number,
): BoxPlotInsight | null {
  const selected = [...machines].sort(
    (left, right) =>
      value(left) - value(right) ||
      compareMachineCodes(left.machine, right.machine),
  )[0];

  return selected
    ? { machine: selected.machine, value: value(selected) }
    : null;
}

function calculateDomain(
  machines: PreparedMachineBoxPlot[],
): [number, number] {
  const visibleValues = machines.flatMap((machine) => [
    machine.lowerWhisker,
    machine.q1,
    machine.median,
    machine.q3,
    machine.upperWhisker,
    machine.averageCycleTime,
  ]);
  const minimum = Math.min(...visibleValues);
  const maximum = Math.max(...visibleValues);
  const span = maximum - minimum;
  const padding =
    span > 0 ? span * 0.08 : Math.max(Math.abs(maximum) * 0.1, 1);
  const paddedMinimum = minimum >= 0
    ? Math.max(0, minimum - padding)
    : minimum - padding;

  return [paddedMinimum, maximum + padding];
}

export function prepareBoxPlotData(
  response: BoxPlotResponse | undefined,
  machineColorOrder: readonly string[] = [],
): PreparedBoxPlotData {
  if (!response) {
    return {
      machines: [],
      invalidMachines: [],
      domain: [0, 1],
      lowestMedian: null,
      smallestIqr: null,
      lowestOutlierRate: null,
    };
  }

  const validStatistics = response.machines.filter(
    isUsableMachineStatistics,
  );
  const invalidMachines = response.machines
    .filter((machine) => !isUsableMachineStatistics(machine))
    .map((machine) => machine.machine)
    .sort(compareMachineCodes);
  const colorByMachine = createMachineColorMap(
    validStatistics.map((machine) => machine.machine),
    machineColorOrder,
  );
  const machines = validStatistics
    .map((machine) => ({
      ...machine,
      color: colorByMachine.get(machine.machine) ?? "var(--chart-1)",
      whiskerRange: [
        machine.lowerWhisker,
        machine.upperWhisker,
      ] as [number, number],
    }))
    .sort(
      (left, right) =>
        left.median - right.median ||
        compareMachineCodes(left.machine, right.machine),
    );

  return {
    machines,
    invalidMachines,
    domain: machines.length > 0 ? calculateDomain(machines) : [0, 1],
    lowestMedian: selectInsight(machines, (machine) => machine.median),
    smallestIqr: selectInsight(machines, (machine) => machine.iqr),
    lowestOutlierRate: selectInsight(
      machines,
      (machine) => machine.outlierRate,
    ),
  };
}
