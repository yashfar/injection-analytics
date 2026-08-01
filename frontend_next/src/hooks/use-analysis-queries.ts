"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getAnalysisCycles,
  getAnalysisHistogram,
  getAnalysisOutliers,
  getAnalysisStagesSummary,
  getAnalysisStagesTrend,
  getAnalysisSummary,
  getAnalysisTrend,
} from "@/lib/api";
import { analysisKeys } from "@/lib/query-keys";
import { ANALYSIS_DEFAULTS } from "@/lib/analysis-defaults";
import type { AnalysisQueryParams, AnalyticsFilters } from "@/types/analytics";

// Shared, repeated query configuration for every /analytics/analysis/*
// hook below (Stage 4). Individual hooks keep their own queryKey/queryFn
// so each stays readable on its own.
const ANALYSIS_QUERY_DEFAULTS = {
  staleTime: 60_000,
  retry: 1,
} as const;

export type AnalysisHistogramQueryOptions = {
  binSize?: number;
  maxValue?: number;
};

export type AnalysisCyclesQueryOptions = {
  limit?: number;
};

export type AnalysisOutliersQueryOptions = {
  limit?: number;
};

// Guard used instead of a non-null assertion: queryFn only runs when
// enabled (appliedFilters !== null), but TanStack Query's types don't let
// that narrowing cross into queryFn, so we assert it explicitly at runtime.
function requireAppliedFilters(
  appliedFilters: AnalyticsFilters | null,
): AnalyticsFilters {
  if (appliedFilters === null) {
    throw new Error(
      "appliedFilters gereklidir; bu sorgu appliedFilters null iken enabled=false olmalı.",
    );
  }

  return appliedFilters;
}

function toAnalysisQueryParams(filters: AnalyticsFilters): AnalysisQueryParams {
  return {
    productCode: filters.productCode,
    moldCode: filters.castCode,
    machineCode: filters.machine,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

function requireBoundedInteger(
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a safe integer between ${minimum} and ${maximum}.`);
  }

  return value;
}

function resolveHistogramOptions(
  options: AnalysisHistogramQueryOptions,
): Required<AnalysisHistogramQueryOptions> {
  const binSize = requireBoundedInteger(
    options.binSize ?? ANALYSIS_DEFAULTS.histogram.binSize,
    1,
    Number.MAX_SAFE_INTEGER,
    "binSize",
  );
  const maxValue = requireBoundedInteger(
    options.maxValue ?? ANALYSIS_DEFAULTS.histogram.maxValue,
    1,
    Number.MAX_SAFE_INTEGER,
    "maxValue",
  );

  if (maxValue < binSize || Math.ceil(maxValue / binSize) > 200) {
    throw new Error("Histogram configuration is outside the backend limits.");
  }

  return { binSize, maxValue };
}

export function useAnalysisSummaryQuery(
  appliedFilters: AnalyticsFilters | null,
) {
  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.summary(toAnalysisQueryParams(appliedFilters))
      : ([...analysisKeys.all, "summary", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisSummary(
        toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}

export function useAnalysisTrendQuery(
  appliedFilters: AnalyticsFilters | null,
) {
  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.trend(toAnalysisQueryParams(appliedFilters))
      : ([...analysisKeys.all, "trend", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisTrend(
        toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}

export function useAnalysisHistogramQuery(
  appliedFilters: AnalyticsFilters | null,
  options: AnalysisHistogramQueryOptions = {},
) {
  const histogramOptions = resolveHistogramOptions(options);

  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.histogram({
          ...toAnalysisQueryParams(appliedFilters),
          ...histogramOptions,
        })
      : ([...analysisKeys.all, "histogram", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisHistogram(
        {
          ...toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
          ...histogramOptions,
        },
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}

export function useAnalysisStagesSummaryQuery(
  appliedFilters: AnalyticsFilters | null,
) {
  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.stagesSummary(toAnalysisQueryParams(appliedFilters))
      : ([...analysisKeys.all, "stages-summary", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisStagesSummary(
        toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}

export function useAnalysisStagesTrendQuery(
  appliedFilters: AnalyticsFilters | null,
) {
  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.stagesTrend(toAnalysisQueryParams(appliedFilters))
      : ([...analysisKeys.all, "stages-trend", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisStagesTrend(
        toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}

export function useAnalysisCyclesQuery(
  appliedFilters: AnalyticsFilters | null,
  options: AnalysisCyclesQueryOptions = {},
) {
  const limit = requireBoundedInteger(
    options.limit ?? ANALYSIS_DEFAULTS.cycles.limit,
    1,
    5000,
    "cycles limit",
  );

  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.cycles({ ...toAnalysisQueryParams(appliedFilters), limit })
      : ([...analysisKeys.all, "cycles", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisCycles(
        {
          ...toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
          limit,
        },
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}

export function useAnalysisOutliersQuery(
  appliedFilters: AnalyticsFilters | null,
  options: AnalysisOutliersQueryOptions = {},
) {
  const limit = requireBoundedInteger(
    options.limit ?? ANALYSIS_DEFAULTS.outliers.limit,
    1,
    1000,
    "outliers limit",
  );

  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.outliers({ ...toAnalysisQueryParams(appliedFilters), limit })
      : ([...analysisKeys.all, "outliers", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisOutliers(
        {
          ...toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
          limit,
        },
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}
