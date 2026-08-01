import type { AnalysisTrendResponse } from "@/types/analytics";

export type AnalysisTrendChartRow = {
  bucketStart: string;
  timestamp: number;
  cycleCount: number;
  averageCycleTime: number;
  medianCycleTime: number;
  minimumCycleTime: number;
  maximumCycleTime: number;
};

// Single-series equivalent of lib/trend-chart.ts's transformTrendResponse —
// no per-machine grouping/coloring, since /analysis/trend returns one
// unified series for the applied filter scope.
export function transformAnalysisTrend(
  response: AnalysisTrendResponse,
): AnalysisTrendChartRow[] {
  return response.points
    .map((point) => {
      const timestamp = Date.parse(point.bucketStart);
      return Number.isFinite(timestamp) ? { ...point, timestamp } : null;
    })
    .filter((row): row is AnalysisTrendChartRow => row !== null)
    .sort((left, right) => left.timestamp - right.timestamp);
}
