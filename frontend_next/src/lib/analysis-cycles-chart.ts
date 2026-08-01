import type { AnalysisCyclePoint, AnalysisCyclesResponse } from "@/types/analytics";

export type AnalysisCycleChartRow = AnalysisCyclePoint & {
  timestamp: number;
};

// Raw per-cycle points, already returned chronologically by the backend —
// still defensively re-sorted here, matching the other analysis transforms.
export function transformAnalysisCycles(
  response: AnalysisCyclesResponse,
): AnalysisCycleChartRow[] {
  return response.points
    .map((point) => {
      const timestamp = Date.parse(point.machineDate);
      return Number.isFinite(timestamp) ? { ...point, timestamp } : null;
    })
    .filter((row): row is AnalysisCycleChartRow => row !== null)
    .sort((left, right) => left.timestamp - right.timestamp);
}
