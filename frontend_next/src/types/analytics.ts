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
  productCode: string;
  castCode: string;
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
