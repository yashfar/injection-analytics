import { formatTurkishCycleTime } from "@/lib/analytics-formatters";
import type { AnalysisHistogramBin } from "@/types/analytics";

export type PreparedAnalysisHistogramBin = AnalysisHistogramBin & {
  label: string;
};

function isValidBin(bin: AnalysisHistogramBin): boolean {
  return (
    Number.isFinite(bin.lowerBound) &&
    Number.isFinite(bin.cycleCount) &&
    bin.cycleCount >= 0 &&
    (bin.isOverflow
      ? bin.upperBound === null
      : bin.upperBound !== null &&
        Number.isFinite(bin.upperBound) &&
        bin.upperBound > bin.lowerBound)
  );
}

function formatBinValue(value: number): string {
  return formatTurkishCycleTime(value) ?? String(value);
}

function formatBinLabel(bin: AnalysisHistogramBin): string {
  const lowerBound = formatBinValue(bin.lowerBound);

  if (bin.isOverflow) {
    return `${lowerBound}+`;
  }

  const upperBound =
    bin.upperBound === null ? null : formatBinValue(bin.upperBound);

  return upperBound ? `${lowerBound}-${upperBound}` : lowerBound;
}

// /analysis/histogram doesn't return a pre-formatted label the way the
// legacy /distribution endpoint's HistogramBin does, so it's computed here
// instead of expecting the backend to supply it.
export function prepareAnalysisHistogramBins(
  bins: readonly AnalysisHistogramBin[] | undefined,
): PreparedAnalysisHistogramBin[] {
  if (!bins) {
    return [];
  }

  return bins
    .filter(isValidBin)
    .map((bin) => ({ ...bin, label: formatBinLabel(bin) }))
    .sort((left, right) => {
      if (left.isOverflow !== right.isOverflow) {
        return left.isOverflow ? 1 : -1;
      }

      return left.lowerBound - right.lowerBound;
    });
}
