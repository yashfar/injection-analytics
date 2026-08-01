"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

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
import type { AnalysisQueryParams, AnalyticsFilters } from "@/types/analytics";

// Shared, repeated query configuration for every /analytics/analysis/*
// hook below (Stage 4). Individual hooks keep their own queryKey/queryFn
// so each stays readable on its own.
const ANALYSIS_QUERY_DEFAULTS = {
  staleTime: 60_000,
  placeholderData: keepPreviousData,
  retry: 1,
} as const;
const DEFAULT_HISTOGRAM_CONFIGURATION = { binSize: 5, maxValue: 60 } as const;
const DEFAULT_CYCLES_LIMIT = 1000;
const DEFAULT_OUTLIERS_LIMIT = 100;

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
) {
  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.histogram({
          ...toAnalysisQueryParams(appliedFilters),
          ...DEFAULT_HISTOGRAM_CONFIGURATION,
        })
      : ([...analysisKeys.all, "histogram", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisHistogram(
        {
          ...toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
          ...DEFAULT_HISTOGRAM_CONFIGURATION,
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
) {
  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.cycles({
          ...toAnalysisQueryParams(appliedFilters),
          limit: DEFAULT_CYCLES_LIMIT,
        })
      : ([...analysisKeys.all, "cycles", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisCycles(
        {
          ...toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
          limit: DEFAULT_CYCLES_LIMIT,
        },
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}

export function useAnalysisOutliersQuery(
  appliedFilters: AnalyticsFilters | null,
) {
  return useQuery({
    queryKey: appliedFilters
      ? analysisKeys.outliers({
          ...toAnalysisQueryParams(appliedFilters),
          limit: DEFAULT_OUTLIERS_LIMIT,
        })
      : ([...analysisKeys.all, "outliers", "disabled"] as const),
    queryFn: ({ signal }) =>
      getAnalysisOutliers(
        {
          ...toAnalysisQueryParams(requireAppliedFilters(appliedFilters)),
          limit: DEFAULT_OUTLIERS_LIMIT,
        },
        signal,
      ),
    enabled: appliedFilters !== null,
    ...ANALYSIS_QUERY_DEFAULTS,
  });
}
