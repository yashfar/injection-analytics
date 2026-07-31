export type AnalysisCycleStageValues = {
  MENGAC: number | null;
  ENJTIME: number | null;
  MALTIME: number | null;
  SOGZAMAN: number | null;
  MENGKAP: number | null;
};

export type AnalysisCyclePoint = {
  cycleId: string;
  machine: string;
  workOrderNumber: string;
  productCode: string;
  castCode: string;
  machineDate: Date;
  cycleCounter: number;
  cycleTime: number;
  stages: AnalysisCycleStageValues;
};

export type AnalysisCyclesResponse = {
  totalCycleCount: number;
  returnedCycleCount: number;
  limit: number;
  isTruncated: boolean;
  points: AnalysisCyclePoint[];
};

export type AnalysisOutlierDirection = 'low' | 'high';

export type AnalysisOutlierCycle = AnalysisCyclePoint & {
  outlierDirection: AnalysisOutlierDirection;
  distanceFromFence: number;
};

export type AnalysisOutliersResponse = {
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
};
