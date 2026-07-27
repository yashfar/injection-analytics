import type {
  BoxPlotFilters,
  HistogramFilters,
  MachineComparisonFilters,
  StageBreakdownFilters,
  TrendFilters,
} from "@/types/analytics";

export const analyticsKeys = {
  all: ["analytics"] as const,
  overview: () => [...analyticsKeys.all, "overview"] as const,
  comparablePairs: () =>
    [...analyticsKeys.all, "comparable-pairs"] as const,
  machineComparison: (filters: MachineComparisonFilters) =>
    [...analyticsKeys.all, "machine-comparison", filters] as const,
  trend: (filters: TrendFilters) =>
    [
      ...analyticsKeys.all,
      "trend",
      {
        productCode: filters.productCode,
        castCode: filters.castCode,
        machine: filters.machine ?? null,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    ] as const,
  histogram: (filters: HistogramFilters) =>
    [
      ...analyticsKeys.all,
      "histogram",
      {
        productCode: filters.productCode,
        castCode: filters.castCode,
        machine: filters.machine,
        startDate: filters.startDate,
        endDate: filters.endDate,
        binSize: filters.binSize,
        maxValue: filters.maxValue,
      },
    ] as const,
  boxPlot: (filters: BoxPlotFilters) =>
    [
      ...analyticsKeys.all,
      "box-plot",
      {
        productCode: filters.productCode,
        castCode: filters.castCode,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    ] as const,
  stageBreakdown: (filters: StageBreakdownFilters) =>
    [
      ...analyticsKeys.all,
      "stage-breakdown",
      {
        productCode: filters.productCode,
        castCode: filters.castCode,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    ] as const,
};
