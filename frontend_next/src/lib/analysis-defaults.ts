// Mirrors the validated backend DTO defaults for analysis requests.
export const ANALYSIS_DEFAULTS = {
  histogram: {
    binSize: 5,
    maxValue: 60,
    binSizeOptions: [1, 2, 5, 10],
    maxValueOptions: [40, 60, 80, 100],
  },
  cycles: {
    limit: 1000,
  },
  outliers: {
    limit: 100,
  },
} as const;
