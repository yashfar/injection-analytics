import { compareMachineCodes } from "@/lib/machine-colors";
import { PROCESS_STAGES } from "@/lib/process-stages";
import type {
  MachineStageBreakdown,
  ProcessStageKey,
  StageBreakdownResponse,
} from "@/types/analytics";

const ROUNDING_TOLERANCE = 0.002;

export interface PreparedMachineStageBreakdown
  extends MachineStageBreakdown {
  stageAverages: Record<ProcessStageKey, number>;
}

export type StageBreakdownInsight = {
  machine: string;
  value: number;
};

export type PreparedStageBreakdownData = {
  machines: PreparedMachineStageBreakdown[];
  invalidMachines: string[];
  domain: [number, number];
  lowestAverageCycle: StageBreakdownInsight | null;
  highestCoolingAverage: StageBreakdownInsight | null;
  largestAbsoluteDifference: StageBreakdownInsight | null;
};

function isFiniteNonnegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isNullableDurationValid(value: number | null): boolean {
  return value === null || isFiniteNonnegative(value);
}

function isApproximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= ROUNDING_TOLERANCE;
}

function getCalculatedStageSum(machine: MachineStageBreakdown): number {
  return PROCESS_STAGES.reduce(
    (sum, stage) => sum + machine.stages[stage.key].average,
    0,
  );
}

function isUsableMachineStageBreakdown(
  machine: MachineStageBreakdown,
): boolean {
  if (
    !machine.machine.trim() ||
    !Number.isInteger(machine.cycleCount) ||
    machine.cycleCount <= 0 ||
    !isFiniteNonnegative(machine.averageCycleTime) ||
    !isNullableDurationValid(machine.medianCycleTime) ||
    !isFiniteNonnegative(machine.averageStageSum) ||
    !Number.isFinite(machine.stageSumDifference)
  ) {
    return false;
  }

  const stagesAreValid = PROCESS_STAGES.every((stage) => {
    const statistics = machine.stages[stage.key];

    return (
      statistics !== undefined &&
      isFiniteNonnegative(statistics.average) &&
      isNullableDurationValid(statistics.median)
    );
  });

  if (!stagesAreValid) {
    return false;
  }

  return (
    isApproximatelyEqual(
      getCalculatedStageSum(machine),
      machine.averageStageSum,
    ) &&
    isApproximatelyEqual(
      machine.averageStageSum - machine.averageCycleTime,
      machine.stageSumDifference,
    )
  );
}

function selectInsight(
  machines: PreparedMachineStageBreakdown[],
  value: (machine: PreparedMachineStageBreakdown) => number,
  direction: "lowest" | "highest",
  displayedValue: (
    machine: PreparedMachineStageBreakdown,
  ) => number = value,
): StageBreakdownInsight | null {
  const multiplier = direction === "lowest" ? 1 : -1;
  const selected = [...machines].sort(
    (left, right) =>
      (value(left) - value(right)) * multiplier ||
      compareMachineCodes(left.machine, right.machine),
  )[0];

  return selected
    ? { machine: selected.machine, value: displayedValue(selected) }
    : null;
}

function calculateDomain(
  machines: PreparedMachineStageBreakdown[],
): [number, number] {
  const maximum = Math.max(
    ...machines.flatMap((machine) => [
      machine.averageStageSum,
      machine.averageCycleTime,
    ]),
  );
  const padding = maximum > 0 ? maximum * 0.08 : 1;

  return [0, maximum + padding];
}

export function prepareStageBreakdownData(
  response: StageBreakdownResponse | undefined,
): PreparedStageBreakdownData {
  if (!response) {
    return {
      machines: [],
      invalidMachines: [],
      domain: [0, 1],
      lowestAverageCycle: null,
      highestCoolingAverage: null,
      largestAbsoluteDifference: null,
    };
  }

  const validMachines = response.machines.filter(
    isUsableMachineStageBreakdown,
  );
  const invalidMachines = response.machines
    .filter((machine) => !isUsableMachineStageBreakdown(machine))
    .map((machine) => machine.machine)
    .sort(compareMachineCodes);
  const machines = validMachines
    .map((machine) => ({
      ...machine,
      stages: { ...machine.stages },
      stageAverages: Object.fromEntries(
        PROCESS_STAGES.map((stage) => [
          stage.key,
          machine.stages[stage.key].average,
        ]),
      ) as Record<ProcessStageKey, number>,
    }))
    .sort(
      (left, right) =>
        left.averageCycleTime - right.averageCycleTime ||
        compareMachineCodes(left.machine, right.machine),
    );

  return {
    machines,
    invalidMachines,
    domain: machines.length > 0 ? calculateDomain(machines) : [0, 1],
    lowestAverageCycle: selectInsight(
      machines,
      (machine) => machine.averageCycleTime,
      "lowest",
    ),
    highestCoolingAverage: selectInsight(
      machines,
      (machine) => machine.stages.SOGZAMAN.average,
      "highest",
    ),
    largestAbsoluteDifference: selectInsight(
      machines,
      (machine) => Math.abs(machine.stageSumDifference),
      "highest",
      (machine) => machine.stageSumDifference,
    ),
  };
}
