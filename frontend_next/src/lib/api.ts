import type {
  AnalysisCyclesQueryParams,
  AnalysisCyclesResponse,
  AnalysisFiltersResponse,
  AnalysisHistogramQueryParams,
  AnalysisHistogramResponse,
  AnalysisOutliersQueryParams,
  AnalysisOutliersResponse,
  AnalysisQueryParams,
  AnalysisStagesSummaryResponse,
  AnalysisStagesTrendResponse,
  AnalysisSummaryResponse,
  AnalysisTrendResponse,
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
  if (!filters.productCode || !filters.castCode) {
    throw new Error("Trend isteği için productCode ve castCode gereklidir.");
  }

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
  if (!filters.productCode || !filters.castCode) {
    throw new Error(
      "Kutu grafiği isteği için productCode ve castCode gereklidir.",
    );
  }

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
  if (!filters.productCode || !filters.castCode) {
    throw new Error(
      "Aşama karşılaştırma isteği için productCode ve castCode gereklidir.",
    );
  }

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

// Phase 1 independent-filter analysis endpoints. Kept separate from the
// comparison functions above; nothing here is called yet.

export function getFilters(
  signal?: AbortSignal,
): Promise<AnalysisFiltersResponse> {
  return apiGet<AnalysisFiltersResponse>(
    "/analytics/filters",
    undefined,
    signal,
  );
}

function buildAnalysisQueryParams(params: AnalysisQueryParams): QueryParams {
  return {
    productCode: params.productCode,
    castCode: params.moldCode,
    machine: params.machineCode,
    from: params.startDate,
    to: params.endDate,
  };
}

export function getAnalysisSummary(
  params: AnalysisQueryParams,
  signal?: AbortSignal,
): Promise<AnalysisSummaryResponse> {
  return apiGet<AnalysisSummaryResponse>(
    "/analytics/analysis/summary",
    buildAnalysisQueryParams(params),
    signal,
  );
}

export function getAnalysisTrend(
  params: AnalysisQueryParams,
  signal?: AbortSignal,
): Promise<AnalysisTrendResponse> {
  return apiGet<AnalysisTrendResponse>(
    "/analytics/analysis/trend",
    buildAnalysisQueryParams(params),
    signal,
  );
}

export function getAnalysisHistogram(
  params: AnalysisHistogramQueryParams,
  signal?: AbortSignal,
): Promise<AnalysisHistogramResponse> {
  return apiGet<AnalysisHistogramResponse>(
    "/analytics/analysis/histogram",
    {
      ...buildAnalysisQueryParams(params),
      binSize: params.binSize,
      maxValue: params.maxValue,
    },
    signal,
  );
}

export function getAnalysisStagesSummary(
  params: AnalysisQueryParams,
  signal?: AbortSignal,
): Promise<AnalysisStagesSummaryResponse> {
  return apiGet<AnalysisStagesSummaryResponse>(
    "/analytics/analysis/stages/summary",
    buildAnalysisQueryParams(params),
    signal,
  );
}

export function getAnalysisStagesTrend(
  params: AnalysisQueryParams,
  signal?: AbortSignal,
): Promise<AnalysisStagesTrendResponse> {
  return apiGet<AnalysisStagesTrendResponse>(
    "/analytics/analysis/stages/trend",
    buildAnalysisQueryParams(params),
    signal,
  );
}

export function getAnalysisCycles(
  params: AnalysisCyclesQueryParams,
  signal?: AbortSignal,
): Promise<AnalysisCyclesResponse> {
  return apiGet<AnalysisCyclesResponse>(
    "/analytics/analysis/cycles",
    {
      ...buildAnalysisQueryParams(params),
      limit: params.limit,
    },
    signal,
  );
}

export function getAnalysisOutliers(
  params: AnalysisOutliersQueryParams,
  signal?: AbortSignal,
): Promise<AnalysisOutliersResponse> {
  return apiGet<AnalysisOutliersResponse>(
    "/analytics/analysis/outliers",
    {
      ...buildAnalysisQueryParams(params),
      limit: params.limit,
    },
    signal,
  );
}
