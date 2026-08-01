import type {
  AnalysisStagesTrendResponse,
  AnalysisStageTrendPoint,
} from "@/types/analytics";

export type AnalysisStageTrendChartRow = AnalysisStageTrendPoint & {
  timestamp: number;
};

// Single-scope equivalent of lib/analysis-trend-chart.ts's
// transformAnalysisTrend — same invalid-date filtering and ascending sort,
// but each row keeps its per-stage breakdown instead of a single value.
export function transformAnalysisStagesTrend(
  response: AnalysisStagesTrendResponse,
): AnalysisStageTrendChartRow[] {
  return response.points
    .map((point) => {
      const timestamp = Date.parse(point.bucketStart);
      return Number.isFinite(timestamp) ? { ...point, timestamp } : null;
    })
    .filter((row): row is AnalysisStageTrendChartRow => row !== null)
    .sort((left, right) => left.timestamp - right.timestamp);
}
