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
  return response.outliers
    .map((outlier) => {
      const timestamp = Date.parse(outlier.machineDate);
      return Number.isFinite(timestamp) ? { ...outlier, timestamp } : null;
    })
    .filter((row): row is AnalysisOutlierChartRow => row !== null)
    .sort((left, right) => left.timestamp - right.timestamp);
}
