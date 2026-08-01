export type AnalysisSummaryResponse = {
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
  /** Distinct machine count within the filtered scope, not the dataset-wide total from GET /analytics/filters. */
  machineCount: number;
  /** Distinct product count within the filtered scope, not the dataset-wide total from GET /analytics/filters. */
  productCount: number;
  /** Distinct mold count within the filtered scope, not the dataset-wide total from GET /analytics/filters. */
  moldCount: number;
  startDate: Date | null;
  endDate: Date | null;
};
