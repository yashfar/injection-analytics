import type {
  AnalysisCyclesResponse,
  AnalysisFiltersResponse,
  AnalysisHistogramResponse,
  AnalysisOutliersResponse,
  AnalysisStagesSummaryResponse,
  AnalysisStagesTrendResponse,
  AnalysisSummaryResponse,
  AnalysisTrendResponse,
  AnalyticsOverview,
} from "@/types/analytics";

// Synthetic, deliberately non-overlapping codes (not real production codes)
// so tests can select an option by name without ever matching more than one
// open dropdown at a time.
export const OVERVIEW_FIXTURE: AnalyticsOverview = {
  totalCycles: 50000,
  machineCount: 2,
  productCount: 2,
  moldCount: 2,
  startDate: "2026-06-24T00:00:00.000Z",
  endDate: "2026-07-24T00:00:00.000Z",
};

export const FILTERS_FIXTURE: AnalysisFiltersResponse = {
  machines: ["MAKINE-A", "MAKINE-B"],
  products: ["URUN-A", "URUN-B"],
  molds: ["KALIP-A", "KALIP-B"],
  workOrders: ["172004"],
  startDate: OVERVIEW_FIXTURE.startDate,
  endDate: OVERVIEW_FIXTURE.endDate,
};

export const EMPTY_SUMMARY_FIXTURE: AnalysisSummaryResponse = {
  cycleCount: 0,
  averageCycleTime: null,
  medianCycleTime: null,
  minimumCycleTime: null,
  maximumCycleTime: null,
  q1: null,
  q3: null,
  standardDeviation: null,
  outlierCount: 0,
  outlierRate: 0,
  machineCount: 0,
  productCount: 0,
  moldCount: 0,
  startDate: null,
  endDate: null,
};

export function createSummaryFixture(cycleCount: number): AnalysisSummaryResponse {
  return {
    cycleCount,
    averageCycleTime: 32.475,
    medianCycleTime: 32.1,
    minimumCycleTime: 31.49,
    maximumCycleTime: 375.83,
    q1: 32.01,
    q3: 32.2,
    standardDeviation: 10.62,
    outlierCount: 37,
    outlierRate: 0.74,
    machineCount: 1,
    productCount: 1,
    moldCount: 1,
    startDate: "2026-07-01T02:22:30.000Z",
    endDate: "2026-07-03T02:24:38.000Z",
  };
}

export const EMPTY_TREND_FIXTURE: AnalysisTrendResponse = {
  bucketSize: "day",
  points: [],
};

export function createTrendFixture(): AnalysisTrendResponse {
  return {
    bucketSize: "day",
    points: [
      {
        bucketStart: "2026-07-01T00:00:00.000Z",
        cycleCount: 2122,
        averageCycleTime: 32.84,
        medianCycleTime: 32.1,
        minimumCycleTime: 31.83,
        maximumCycleTime: 375.83,
      },
      {
        bucketStart: "2026-07-02T00:00:00.000Z",
        cycleCount: 2700,
        averageCycleTime: 32.109,
        medianCycleTime: 32.02,
        minimumCycleTime: 31.49,
        maximumCycleTime: 72.34,
      },
    ],
  };
}

const STAGE_STATS = { average: null, median: null } as const;

export const EMPTY_HISTOGRAM_FIXTURE: AnalysisHistogramResponse = {
  binSize: 5,
  maxValue: 100,
  totalCycleCount: 0,
  minimumCycleTime: null,
  maximumCycleTime: null,
  bins: [],
};

export const EMPTY_STAGES_SUMMARY_FIXTURE: AnalysisStagesSummaryResponse = {
  cycleCount: 0,
  averageCycleTime: null,
  medianCycleTime: null,
  stages: {
    MENGAC: STAGE_STATS,
    ENJTIME: STAGE_STATS,
    MALTIME: STAGE_STATS,
    SOGZAMAN: STAGE_STATS,
    MENGKAP: STAGE_STATS,
  },
  averageStageSum: null,
  stageSumDifference: null,
};

export const EMPTY_STAGES_TREND_FIXTURE: AnalysisStagesTrendResponse = {
  bucketSize: null,
  points: [],
};

export const EMPTY_CYCLES_FIXTURE: AnalysisCyclesResponse = {
  totalCycleCount: 0,
  returnedCycleCount: 0,
  limit: 1000,
  isTruncated: false,
  points: [],
};

export const EMPTY_OUTLIERS_FIXTURE: AnalysisOutliersResponse = {
  cycleCount: 0,
  q1: null,
  q3: null,
  iqr: null,
  lowerFence: null,
  upperFence: null,
  outlierCount: 0,
  outlierRate: 0,
  returnedOutlierCount: 0,
  limit: 100,
  isTruncated: false,
  outliers: [],
};
