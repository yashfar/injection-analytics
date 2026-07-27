import type {
  AnalyticsComparablePairsResponse,
  AnalyticsOverview,
  BoxPlotFilters,
  BoxPlotResponse,
  HistogramFilters,
  HistogramResponse,
  MachineComparisonFilters,
  MachineComparisonResponse,
  StageBreakdownFilters,
  StageBreakdownResponse,
  TrendFilters,
  TrendResponse,
} from "@/types/analytics";
import { toUtcDateRangeBoundaries } from "@/lib/analytics-filters";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;
type ApiQueryParams = QueryParams | URLSearchParams;

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL yapılandırılmamış. Ön yüz ortamına ekleyin.",
  );
}

export async function apiGet<T>(
  path: string,
  queryParams?: ApiQueryParams,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, apiBaseUrl);

  if (queryParams) {
    const entries =
      queryParams instanceof URLSearchParams
        ? queryParams.entries()
        : Object.entries(queryParams);

    for (const [key, value] of entries) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, { cache: "no-store", signal });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `API isteği ${response.status} ${response.statusText} durumuyla başarısız oldu: ${
        responseBody || "Yanıt gövdesi yok"
      }`,
    );
  }

  return (await response.json()) as T;
}

export function getOverview(signal?: AbortSignal): Promise<AnalyticsOverview> {
  return apiGet<AnalyticsOverview>("/analytics/overview", undefined, signal);
}

export function getComparablePairs(
  signal?: AbortSignal,
): Promise<AnalyticsComparablePairsResponse> {
  return apiGet<AnalyticsComparablePairsResponse>(
    "/analytics/comparable-pairs",
    undefined,
    signal,
  );
}

export function getMachineComparison(
  filters: MachineComparisonFilters,
  signal?: AbortSignal,
): Promise<MachineComparisonResponse> {
  const { from, to } = toUtcDateRangeBoundaries(
    filters.startDate,
    filters.endDate,
  );

  return apiGet<MachineComparisonResponse>(
    "/analytics/machine-comparison",
    {
      productCode: filters.productCode,
      castCode: filters.castCode,
      from,
      to,
    },
    signal,
  );
}

export function getTrend(
  filters: TrendFilters,
  signal?: AbortSignal,
): Promise<TrendResponse> {
  const { from, to } = toUtcDateRangeBoundaries(
    filters.startDate,
    filters.endDate,
  );
  const queryParams = new URLSearchParams({
    productCode: filters.productCode,
    castCode: filters.castCode,
    from,
    to,
  });

  if (filters.machine) {
    queryParams.set("machine", filters.machine);
  }

  return apiGet<TrendResponse>(
    "/analytics/trend",
    queryParams,
    signal,
  );
}

export function getHistogram(
  filters: HistogramFilters,
  signal?: AbortSignal,
): Promise<HistogramResponse> {
  const { from, to } = toUtcDateRangeBoundaries(
    filters.startDate,
    filters.endDate,
  );
  const queryParams = new URLSearchParams({
    productCode: filters.productCode,
    castCode: filters.castCode,
    machine: filters.machine,
    from,
    to,
    binSize: String(filters.binSize),
    maxValue: String(filters.maxValue),
  });

  return apiGet<HistogramResponse>(
    "/analytics/distribution",
    queryParams,
    signal,
  );
}

export function getBoxPlot(
  filters: BoxPlotFilters,
  signal?: AbortSignal,
): Promise<BoxPlotResponse> {
  const { from, to } = toUtcDateRangeBoundaries(
    filters.startDate,
    filters.endDate,
  );
  const queryParams = new URLSearchParams({
    productCode: filters.productCode,
    castCode: filters.castCode,
    from,
    to,
  });

  return apiGet<BoxPlotResponse>(
    "/analytics/box-plot",
    queryParams,
    signal,
  );
}

export function getStageBreakdown(
  filters: StageBreakdownFilters,
  signal?: AbortSignal,
): Promise<StageBreakdownResponse> {
  const { from, to } = toUtcDateRangeBoundaries(
    filters.startDate,
    filters.endDate,
  );
  const queryParams = new URLSearchParams({
    productCode: filters.productCode,
    castCode: filters.castCode,
    from,
    to,
  });

  return apiGet<StageBreakdownResponse>(
    "/analytics/stage-comparison",
    queryParams,
    signal,
  );
}
