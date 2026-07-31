export type AnalysisTrendBucketSize = 'hour' | 'day' | 'week';

export type AnalysisTrendPoint = {
  bucketStart: Date;
  cycleCount: number;
  averageCycleTime: number;
  medianCycleTime: number;
  minimumCycleTime: number;
  maximumCycleTime: number;
};

export type AnalysisTrendResponse = {
  bucketSize: AnalysisTrendBucketSize | null;
  points: AnalysisTrendPoint[];
};
