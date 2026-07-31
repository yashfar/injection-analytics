export type AnalysisHistogramBin = {
  lowerBound: number;
  upperBound: number | null;
  cycleCount: number;
  isOverflow: boolean;
};

export type AnalysisHistogramResponse = {
  binSize: number;
  maxValue: number;
  totalCycleCount: number;
  minimumCycleTime: number | null;
  maximumCycleTime: number | null;
  bins: AnalysisHistogramBin[];
};
