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
  machineCount: number;
  productCount: number;
  moldCount: number;
  startDate: Date | null;
  endDate: Date | null;
};
