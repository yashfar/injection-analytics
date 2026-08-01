import type {
  AnalyticsComparablePair,
  AnalyticsFilters,
  BoxPlotFilters,
  HistogramConfiguration,
  HistogramFilters,
  MachineComparisonFilters,
  StageBreakdownFilters,
  TrendFilters,
} from "@/types/analytics";

function compareCodes(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function getSortedUniqueCodes(codes: Iterable<string>): string[] {
  return [...new Set(codes)].sort(compareCodes);
}

// Phase 2 (comparison) akışında kullanılıyor. Phase 1'de filtreler bağımsız
// olduğu için bilinçli olarak devre dışı.
export function getUniqueProductCodes(
  comparablePairs: AnalyticsComparablePair[],
): string[] {
  return getSortedUniqueCodes(
    comparablePairs.map((pair) => pair.productCode),
  );
}

// Phase 2 (comparison) akışında kullanılıyor. Phase 1'de filtreler bağımsız
// olduğu için bilinçli olarak devre dışı.
export function getValidCastCodes(
  comparablePairs: AnalyticsComparablePair[],
  productCode: string,
): string[] {
  return getSortedUniqueCodes(
    comparablePairs
      .filter((pair) => pair.productCode === productCode)
      .map((pair) => pair.castCode),
  );
}

// Phase 2 (comparison) akışında kullanılıyor. Phase 1'de filtreler bağımsız
// olduğu için bilinçli olarak devre dışı. Parametreler, appliedFilters artık
// undefined product/mold taşıyabildiği için (dashboard-content.tsx'teki
// machineColorOrder hesaplaması) string | undefined kabul eder.
export function getValidMachines(
  comparablePairs: AnalyticsComparablePair[],
  productCode: string | undefined,
  castCode: string | undefined,
): string[] {
  return getSortedUniqueCodes(
    comparablePairs
      .filter(
        (pair) =>
          pair.productCode === productCode && pair.castCode === castCode,
      )
      .flatMap((pair) => pair.machines),
  );
}

// Phase 2 (comparison) akışında kullanılıyor. Phase 1'de filtreler bağımsız
// olduğu için bilinçli olarak devre dışı.
export function findFirstValidComparablePair(
  comparablePairs: AnalyticsComparablePair[],
): Pick<AnalyticsComparablePair, "productCode" | "castCode"> | undefined {
  const productCode = getUniqueProductCodes(comparablePairs)[0];

  if (!productCode) {
    return undefined;
  }

  const castCode = getValidCastCodes(comparablePairs, productCode)[0];

  return castCode ? { productCode, castCode } : undefined;
}

export function isoUtcToDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const datePart = /^(\d{4}-\d{2}-\d{2})(?:T|$)/.exec(value);
  return datePart?.[1] ?? "";
}

export function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1) {
    return false;
  }

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isDateOnlyWithinBounds(
  value: string,
  dateMin?: string,
  dateMax?: string,
): boolean {
  if (
    !isValidDateOnly(value) ||
    (dateMin !== undefined && !isValidDateOnly(dateMin)) ||
    (dateMax !== undefined && !isValidDateOnly(dateMax)) ||
    (dateMin !== undefined && dateMax !== undefined && dateMin > dateMax)
  ) {
    return false;
  }

  return (
    (dateMin === undefined || value >= dateMin) &&
    (dateMax === undefined || value <= dateMax)
  );
}

export function isDateRangeValid(startDate: string, endDate: string): boolean {
  return (
    isValidDateOnly(startDate) &&
    isValidDateOnly(endDate) &&
    startDate <= endDate
  );
}

export function isAnalyticsSelectionValid(
  filters: AnalyticsFilters,
  comparablePairs: AnalyticsComparablePair[],
): boolean {
  if (filters.productCode === undefined || filters.castCode === undefined) {
    return false;
  }

  const validCasts = getValidCastCodes(
    comparablePairs,
    filters.productCode,
  );

  if (!validCasts.includes(filters.castCode)) {
    return false;
  }

  if (filters.machine === undefined) {
    return true;
  }

  return getValidMachines(
    comparablePairs,
    filters.productCode,
    filters.castCode,
  ).includes(filters.machine);
}

export function areAnalyticsFiltersValid(
  filters: AnalyticsFilters,
  comparablePairs: AnalyticsComparablePair[],
  dateMin?: string,
  dateMax?: string,
): boolean {
  return (
    isAnalyticsSelectionValid(filters, comparablePairs) &&
    isDateRangeValid(filters.startDate, filters.endDate) &&
    isDateOnlyWithinBounds(filters.startDate, dateMin, dateMax) &&
    isDateOnlyWithinBounds(filters.endDate, dateMin, dateMax)
  );
}

// Phase 1: product/mold/machine no longer get an automatic default —
// only the date range does. comparablePairs is kept in the signature
// unchanged (unused now) so existing callers don't need to change.
export function createDefaultAnalyticsFilters(
  comparablePairs: AnalyticsComparablePair[],
  startDateBoundary: string | null,
  endDateBoundary: string | null,
): AnalyticsFilters {
  const startDate = isoUtcToDateInputValue(startDateBoundary);
  const endDate = isoUtcToDateInputValue(endDateBoundary);

  return {
    productCode: undefined,
    castCode: undefined,
    machine: undefined,
    startDate,
    endDate,
  };
}

// Phase 1 represents an unrestricted identifier as undefined. This keeps UI
// sentinels and accidental empty values out of comparisons and API requests.
export function normalizeAnalyticsFilters(
  filters: AnalyticsFilters,
): AnalyticsFilters {
  return {
    productCode: filters.productCode || undefined,
    castCode: filters.castCode || undefined,
    machine: filters.machine || undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

export function toMachineComparisonFilters(
  filters: AnalyticsFilters,
): MachineComparisonFilters {
  return {
    productCode: filters.productCode,
    castCode: filters.castCode,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

export function toBoxPlotFilters(
  filters: AnalyticsFilters,
): BoxPlotFilters {
  return {
    productCode: filters.productCode,
    castCode: filters.castCode,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

export function toStageBreakdownFilters(
  filters: AnalyticsFilters,
): StageBreakdownFilters {
  return {
    productCode: filters.productCode,
    castCode: filters.castCode,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

export function toTrendFilters(filters: AnalyticsFilters): TrendFilters {
  return {
    productCode: filters.productCode,
    castCode: filters.castCode,
    machine: filters.machine,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

export function isHistogramConfigurationValid(
  configuration: HistogramConfiguration,
): boolean {
  const hasAtMostTwoDecimalPlaces = (value: number) =>
    Number.isInteger(value * 100);

  return (
    Number.isFinite(configuration.binSize) &&
    Number.isFinite(configuration.maxValue) &&
    configuration.binSize >= 0.1 &&
    configuration.binSize <= 100 &&
    configuration.maxValue >= 1 &&
    configuration.maxValue <= 10_000 &&
    configuration.maxValue > configuration.binSize &&
    hasAtMostTwoDecimalPlaces(configuration.binSize) &&
    hasAtMostTwoDecimalPlaces(configuration.maxValue)
  );
}

export function toHistogramFilters(
  filters: AnalyticsFilters,
  configuration: HistogramConfiguration,
): HistogramFilters | null {
  if (
    !filters.productCode ||
    !filters.castCode ||
    !filters.machine ||
    !isHistogramConfigurationValid(configuration)
  ) {
    return null;
  }

  return {
    productCode: filters.productCode,
    castCode: filters.castCode,
    machine: filters.machine,
    startDate: filters.startDate,
    endDate: filters.endDate,
    binSize: configuration.binSize,
    maxValue: configuration.maxValue,
  };
}

export function createFilterEligibilityIdentity(
  comparablePairs: AnalyticsComparablePair[],
  dateMin: string,
  dateMax: string,
): string {
  const machinesByProductAndCast = new Map<string, Map<string, Set<string>>>();

  for (const pair of comparablePairs) {
    const casts =
      machinesByProductAndCast.get(pair.productCode) ??
      new Map<string, Set<string>>();
    const machines = casts.get(pair.castCode) ?? new Set<string>();

    for (const machine of pair.machines) {
      machines.add(machine);
    }

    casts.set(pair.castCode, machines);
    machinesByProductAndCast.set(pair.productCode, casts);
  }

  const eligiblePairs = [...machinesByProductAndCast.entries()]
    .flatMap(([productCode, casts]) =>
      [...casts.entries()].map(([castCode, machines]) => ({
        productCode,
        castCode,
        machines: getSortedUniqueCodes(machines),
      })),
    )
    .sort(
      (left, right) =>
        compareCodes(left.productCode, right.productCode) ||
        compareCodes(left.castCode, right.castCode),
    );

  return JSON.stringify({
    eligiblePairs,
    dateMin,
    dateMax,
  });
}

export function toUtcDateRangeBoundaries(
  startDate: string,
  endDate: string,
): { from: string; to: string } {
  if (
    !isValidDateOnly(startDate) ||
    !isValidDateOnly(endDate) ||
    startDate > endDate
  ) {
    throw new RangeError(
      "Analiz istekleri için geçerli bir YYYY-AA-GG tarih aralığı gereklidir.",
    );
  }

  return {
    from: `${startDate}T00:00:00.000Z`,
    to: `${endDate}T23:59:59.999Z`,
  };
}
