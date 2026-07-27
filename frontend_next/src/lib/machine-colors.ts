const machineChartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export function compareMachineCodes(
  left: string,
  right: string,
): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function createMachineColorMap(
  machines: readonly string[],
  machineColorOrder: readonly string[] = [],
): Map<string, string> {
  const uniqueMachines = [...new Set(machines)].sort(compareMachineCodes);
  const paletteMachines = [
    ...new Set([...machineColorOrder, ...uniqueMachines]),
  ].sort(compareMachineCodes);

  return new Map(
    uniqueMachines.map((machine) => [
      machine,
      machineChartColors[
        paletteMachines.indexOf(machine) % machineChartColors.length
      ],
    ]),
  );
}
