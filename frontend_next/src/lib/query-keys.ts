import { ANALYSIS_DEFAULTS } from "@/lib/analysis-defaults";
import type {
  AnalysisCyclesQueryParams,
  AnalysisHistogramQueryParams,
  AnalysisOutliersQueryParams,
  AnalysisQueryParams,
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

// Phase 1 independent-filter analysis keys. Fully separate from
// analyticsKeys above so invalidating one never affects the other.
export const analysisKeys = {
  all: ["analysis"] as const,
  filters: () => [...analysisKeys.all, "filters"] as const,
  summary: (params: AnalysisQueryParams) =>
    [
      ...analysisKeys.all,
      "summary",
      {
        productCode: params.productCode ?? null,
        moldCode: params.moldCode ?? null,
        machineCode: params.machineCode ?? null,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    ] as const,
  trend: (params: AnalysisQueryParams) =>
    [
      ...analysisKeys.all,
      "trend",
      {
        productCode: params.productCode ?? null,
        moldCode: params.moldCode ?? null,
        machineCode: params.machineCode ?? null,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    ] as const,
  histogram: (params: AnalysisHistogramQueryParams) =>
    [
      ...analysisKeys.all,
      "histogram",
      {
        productCode: params.productCode ?? null,
        moldCode: params.moldCode ?? null,
        machineCode: params.machineCode ?? null,
        startDate: params.startDate,
        endDate: params.endDate,
        binSize: params.binSize ?? ANALYSIS_DEFAULTS.histogram.binSize,
        maxValue: params.maxValue ?? ANALYSIS_DEFAULTS.histogram.maxValue,
      },
    ] as const,
  stagesSummary: (params: AnalysisQueryParams) =>
    [
      ...analysisKeys.all,
      "stages-summary",
      {
        productCode: params.productCode ?? null,
        moldCode: params.moldCode ?? null,
        machineCode: params.machineCode ?? null,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    ] as const,
  stagesTrend: (params: AnalysisQueryParams) =>
    [
      ...analysisKeys.all,
      "stages-trend",
      {
        productCode: params.productCode ?? null,
        moldCode: params.moldCode ?? null,
        machineCode: params.machineCode ?? null,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    ] as const,
  cycles: (params: AnalysisCyclesQueryParams) =>
    [
      ...analysisKeys.all,
      "cycles",
      {
        productCode: params.productCode ?? null,
        moldCode: params.moldCode ?? null,
        machineCode: params.machineCode ?? null,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit ?? ANALYSIS_DEFAULTS.cycles.limit,
      },
    ] as const,
  outliers: (params: AnalysisOutliersQueryParams) =>
    [
      ...analysisKeys.all,
      "outliers",
      {
        productCode: params.productCode ?? null,
        moldCode: params.moldCode ?? null,
        machineCode: params.machineCode ?? null,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit ?? ANALYSIS_DEFAULTS.outliers.limit,
      },
    ] as const,
};
