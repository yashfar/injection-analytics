import { AnalysisTrendBucketSize } from './analysis-trend-response.type';

export type AnalysisStageStatistics = {
  average: number | null;
  median: number | null;
};

export type AnalysisStageValues = {
  MENGAC: number;
  ENJTIME: number;
  MALTIME: number;
  SOGZAMAN: number;
  MENGKAP: number;
};

export type AnalysisStagesSummaryResponse = {
  cycleCount: number;
  averageCycleTime: number | null;
  medianCycleTime: number | null;
  stages: Record<keyof AnalysisStageValues, AnalysisStageStatistics>;
  averageStageSum: number | null;
  stageSumDifference: number | null;
};

export type AnalysisStageTrendPoint = {
  bucketStart: Date;
  cycleCount: number;
  averageCycleTime: number;
  stages: AnalysisStageValues;
  averageStageSum: number;
  stageSumDifference: number;
};

export type AnalysisStagesTrendResponse = {
  bucketSize: AnalysisTrendBucketSize | null;
  points: AnalysisStageTrendPoint[];
};
