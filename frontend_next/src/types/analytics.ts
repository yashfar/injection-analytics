export interface AnalyticsOverview {
  totalCycles: number;
  machineCount: number;
  productCount: number;
  moldCount: number;
  startDate: string | null;
  endDate: string | null;
}

export interface AnalyticsComparablePair {
  productCode: string;
  castCode: string;
  machineCount: number;
  cycleCount: number;
  machines: string[];
}

export type AnalyticsComparablePairsResponse = AnalyticsComparablePair[];

export interface AnalyticsFilters {
  // Phase 1: independent, optional single-select filters (undefined = no
  // restriction on that dimension). Phase 2 comparison flows still require
  // both to be set before their queries enable.
  productCode?: string;
  castCode?: string;
  machine?: string;
  startDate: string;
  endDate: string;
}

export type MachineComparisonFilters = Pick<
  AnalyticsFilters,
  "productCode" | "castCode" | "startDate" | "endDate"
>;

export interface MachineComparisonRow {
  rank: number;
  machine: string;
  isFastest: boolean;
  cycleCount: number;
  averageCycleTime: number;
  medianCycleTime: number;
  minimumCycleTime: number;
  maximumCycleTime: number;
  q1: number;
  q3: number;
  standardDeviation: number;
  outlierCount: number;
  outlierRate: number;
  differenceFromFastestPercent: number;
}

export type MachineComparisonResponse = MachineComparisonRow[];

export type TrendBucketSize = "hour" | "day" | "week" | null;

export type TrendFilters = Pick<
  AnalyticsFilters,
  "productCode" | "castCode" | "machine" | "startDate" | "endDate"
>;

export interface TrendPoint {
  bucketStart: string;
  cycleCount: number;
  averageCycleTime: number;
  medianCycleTime: number;
  minimumCycleTime: number;
  maximumCycleTime: number;
}

export interface MachineTrendSeries {
  machine: string;
  points: TrendPoint[];
}

export interface TrendResponse {
  bucketSize: TrendBucketSize;
  series: MachineTrendSeries[];
}

export interface HistogramConfiguration {
  binSize: number;
  maxValue: number;
}

export interface HistogramFilters extends HistogramConfiguration {
  productCode: string;
  castCode: string;
  machine: string;
  startDate: string;
  endDate: string;
}

export interface HistogramBin {
  lowerBound: number;
  upperBound: number | null;
  cycleCount: number;
  isOverflow: boolean;
  label: string;
}

export interface HistogramResponse {
  productCode: string;
  castCode: string;
  machine: string;
  binSize: number;
  maxValue: number;
  totalCycleCount: number;
  minimumCycleTime: number | null;
  maximumCycleTime: number | null;
  bins: HistogramBin[];
}

export type BoxPlotFilters = Pick<
  AnalyticsFilters,
  "productCode" | "castCode" | "startDate" | "endDate"
>;

export interface MachineBoxPlotStatistics {
  machine: string;
  cycleCount: number;
  averageCycleTime: number;
  actualMinimum: number;
  actualMaximum: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  lowerWhisker: number;
  upperWhisker: number;
  outlierCount: number;
  outlierRate: number;
}

export interface BoxPlotResponse {
  productCode: string;
  castCode: string;
  machines: MachineBoxPlotStatistics[];
}

export type ProcessStageKey =
  | "MENGAC"
  | "ENJTIME"
  | "MALTIME"
  | "SOGZAMAN"
  | "MENGKAP";

export interface ProcessStageStatistics {
  average: number;
  median: number | null;
}

export interface MachineStageBreakdown {
  machine: string;
  cycleCount: number;
  averageCycleTime: number;
  medianCycleTime: number | null;
  stages: Record<ProcessStageKey, ProcessStageStatistics>;
  averageStageSum: number;
  stageSumDifference: number;
}

export type StageBreakdownFilters = Pick<
  AnalyticsFilters,
  "productCode" | "castCode" | "startDate" | "endDate"
>;

export interface StageBreakdownResponse {
  productCode: string;
  castCode: string;
  machines: MachineStageBreakdown[];
}

// Phase 1 independent-filter analysis types (GET /analytics/filters and
// GET /analytics/analysis/*). Intentionally separate from the comparison
// types above so the two phases never share shape or state.

export interface AnalysisFiltersResponse {
  machines: string[];
  products: string[];
  molds: string[];
  workOrders: string[];
  startDate: string | null;
  endDate: string | null;
}

export interface AnalysisQueryParams {
  startDate: string;
  endDate: string;
  productCode?: string;
  moldCode?: string;
  machineCode?: string;
}

export interface AnalysisSummaryResponse {
  cycleCount: number;
  averageCycleTime: number | null;
  medianCycleTime: number | null;
  minimumCycleTime: number | null;
  maximumCycleTime: number | null;
  q1: number | null;
  q3: number | null;
  standardDeviation: number | null;
  outlierCount: number;
  outlierRate: number;
  machineCount: number;
  productCount: number;
  moldCount: number;
  startDate: string | null;
  endDate: string | null;
}

export type AnalysisTrendBucketSize = "hour" | "day" | "week" | null;

export interface AnalysisTrendPoint {
  bucketStart: string;
  cycleCount: number;
  averageCycleTime: number;
  medianCycleTime: number;
  minimumCycleTime: number;
  maximumCycleTime: number;
}

export interface AnalysisTrendResponse {
  bucketSize: AnalysisTrendBucketSize;
  points: AnalysisTrendPoint[];
}

export interface AnalysisHistogramQueryParams extends AnalysisQueryParams {
  binSize?: number;
  maxValue?: number;
}

export interface AnalysisHistogramBin {
  lowerBound: number;
  upperBound: number | null;
  cycleCount: number;
  isOverflow: boolean;
}

export interface AnalysisHistogramResponse {
  binSize: number;
  maxValue: number;
  totalCycleCount: number;
  minimumCycleTime: number | null;
  maximumCycleTime: number | null;
  bins: AnalysisHistogramBin[];
}

export type AnalysisStageKey =
  | "MENGAC"
  | "ENJTIME"
  | "MALTIME"
  | "SOGZAMAN"
  | "MENGKAP";

export interface AnalysisStageStatistics {
  average: number | null;
  median: number | null;
}

export interface AnalysisStageValues {
  MENGAC: number;
  ENJTIME: number;
  MALTIME: number;
  SOGZAMAN: number;
  MENGKAP: number;
}

export interface AnalysisStagesSummaryResponse {
  cycleCount: number;
  averageCycleTime: number | null;
  medianCycleTime: number | null;
  stages: Record<AnalysisStageKey, AnalysisStageStatistics>;
  averageStageSum: number | null;
  stageSumDifference: number | null;
}

export interface AnalysisStageTrendPoint {
  bucketStart: string;
  cycleCount: number;
  averageCycleTime: number;
  stages: AnalysisStageValues;
  averageStageSum: number;
  stageSumDifference: number;
}

export interface AnalysisStagesTrendResponse {
  bucketSize: AnalysisTrendBucketSize;
  points: AnalysisStageTrendPoint[];
}

export interface AnalysisCycleStageValues {
  MENGAC: number | null;
  ENJTIME: number | null;
  MALTIME: number | null;
  SOGZAMAN: number | null;
  MENGKAP: number | null;
}

export interface AnalysisCyclePoint {
  cycleId: string;
  machine: string;
  workOrderNumber: string;
  productCode: string;
  castCode: string;
  machineDate: string;
  cycleCounter: number;
  cycleTime: number;
  stages: AnalysisCycleStageValues;
}

export interface AnalysisCyclesQueryParams extends AnalysisQueryParams {
  limit?: number;
}

export interface AnalysisCyclesResponse {
  totalCycleCount: number;
  returnedCycleCount: number;
  limit: number;
  isTruncated: boolean;
  points: AnalysisCyclePoint[];
}

export type AnalysisOutlierDirection = "low" | "high";

export interface AnalysisOutlierCycle extends AnalysisCyclePoint {
  outlierDirection: AnalysisOutlierDirection;
  distanceFromFence: number;
}

export interface AnalysisOutliersQueryParams extends AnalysisQueryParams {
  limit?: number;
}

export interface AnalysisOutliersResponse {
  cycleCount: number;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  lowerFence: number | null;
  upperFence: number | null;
  outlierCount: number;
  outlierRate: number;
  returnedOutlierCount: number;
  limit: number;
  isTruncated: boolean;
  outliers: AnalysisOutlierCycle[];
}
