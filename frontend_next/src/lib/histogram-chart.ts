import type {
  HistogramBin,
  HistogramConfiguration,
} from "@/types/analytics";

export const DEFAULT_HISTOGRAM_CONFIGURATION = {
  binSize: 5,
  maxValue: 60,
} as const satisfies HistogramConfiguration;

export const HISTOGRAM_BIN_SIZE_OPTIONS = [2.5, 5, 10] as const;
export const HISTOGRAM_MAX_VALUE_OPTIONS = [40, 60, 80, 100] as const;

function isValidHistogramBin(bin: HistogramBin): boolean {
  return (
    Number.isFinite(bin.lowerBound) &&
    Number.isFinite(bin.cycleCount) &&
    bin.cycleCount >= 0 &&
    bin.label.trim().length > 0 &&
    (bin.isOverflow
      ? bin.upperBound === null
      : bin.upperBound !== null &&
        Number.isFinite(bin.upperBound) &&
        bin.upperBound > bin.lowerBound)
  );
}

export function prepareHistogramBins(
  bins: readonly HistogramBin[] | undefined,
): HistogramBin[] {
  if (!bins) {
    return [];
  }

  return bins
    .filter(isValidHistogramBin)
    .map((bin) => ({ ...bin }))
    .sort((left, right) => {
      if (left.isOverflow !== right.isOverflow) {
        return left.isOverflow ? 1 : -1;
      }

      return left.lowerBound - right.lowerBound;
    });
}
