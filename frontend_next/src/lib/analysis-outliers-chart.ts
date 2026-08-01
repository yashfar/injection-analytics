import type {
  AnalysisOutlierCycle,
  AnalysisOutliersResponse,
} from "@/types/analytics";

export type AnalysisOutlierChartRow = AnalysisOutlierCycle & {
  timestamp: number;
};

export function transformAnalysisOutliers(
  response: AnalysisOutliersResponse,
): AnalysisOutlierChartRow[] {
  // The API already ranks by fence distance, machine date, then stable ID.
  // Preserve that severity order while omitting only malformed timestamps.
  return response.outliers
    .map((outlier) => {
      const timestamp = Date.parse(outlier.machineDate);
      return Number.isFinite(timestamp) ? { ...outlier, timestamp } : null;
    })
    .filter((row): row is AnalysisOutlierChartRow => row !== null);
}
