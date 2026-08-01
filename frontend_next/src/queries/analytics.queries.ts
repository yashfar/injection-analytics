"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getBoxPlot,
  getComparablePairs,
  getFilters,
  getHistogram,
  getMachineComparison,
  getOverview,
  getStageBreakdown,
  getTrend,
} from "@/lib/api";
import {
  isDateRangeValid,
  isHistogramConfigurationValid,
} from "@/lib/analytics-filters";
import { analysisKeys, analyticsKeys } from "@/lib/query-keys";
import type {
  BoxPlotFilters,
  HistogramFilters,
  MachineComparisonFilters,
  StageBreakdownFilters,
  TrendFilters,
} from "@/types/analytics";

export function useAnalyticsOverviewQuery() {
  return useQuery({
    queryKey: analyticsKeys.overview(),
    queryFn: ({ signal }) => getOverview(signal),
  });
}

// Phase 1: independent filter options. Loads on mount like the legacy
// comparable-pairs query below; the "wait for Apply" rule only applies to
// /analytics/analysis/* queries, not to this one.
export function useFiltersQuery() {
  return useQuery({
    queryKey: analysisKeys.filters(),
    queryFn: ({ signal }) => getFilters(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useComparablePairsQuery() {
  return useQuery({
    queryKey: analyticsKeys.comparablePairs(),
    queryFn: ({ signal }) => getComparablePairs(signal),
  });
}

export function useMachineComparisonQuery(
  filters: MachineComparisonFilters | null,
) {
  const isEnabled = Boolean(
    filters?.productCode &&
      filters.castCode &&
      isDateRangeValid(filters.startDate, filters.endDate),
  );
  const queryKey = filters
    ? analyticsKeys.machineComparison(filters)
    : ([...analyticsKeys.all, "machine-comparison", "disabled"] as const);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!filters) {
        throw new Error("Makine karşılaştırma filtreleri gereklidir.");
      }

      return getMachineComparison(filters, signal);
    },
    enabled: isEnabled,
    placeholderData: keepPreviousData,
  });
}

export function useTrendQuery(filters: TrendFilters | null) {
  const isEnabled = Boolean(
    filters?.productCode &&
      filters.castCode &&
      isDateRangeValid(filters.startDate, filters.endDate),
  );
  const queryKey = filters
    ? analyticsKeys.trend(filters)
    : ([...analyticsKeys.all, "trend", "disabled"] as const);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!filters) {
        throw new Error("Trend filtreleri gereklidir.");
      }

      return getTrend(filters, signal);
    },
    enabled: isEnabled,
    placeholderData: keepPreviousData,
  });
}

export function useHistogramQuery(filters: HistogramFilters | null) {
  const isEnabled = Boolean(
    filters?.productCode &&
      filters.castCode &&
      filters.machine &&
      isDateRangeValid(filters.startDate, filters.endDate) &&
      isHistogramConfigurationValid(filters),
  );
  const queryKey = filters
    ? analyticsKeys.histogram(filters)
    : ([...analyticsKeys.all, "histogram", "disabled"] as const);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!filters) {
        throw new Error("Histogram filtreleri gereklidir.");
      }

      return getHistogram(filters, signal);
    },
    enabled: isEnabled,
    placeholderData: keepPreviousData,
  });
}

export function useBoxPlotQuery(filters: BoxPlotFilters | null) {
  const isEnabled = Boolean(
    filters?.productCode &&
      filters.castCode &&
      isDateRangeValid(filters.startDate, filters.endDate),
  );
  const queryKey = filters
    ? analyticsKeys.boxPlot(filters)
    : ([...analyticsKeys.all, "box-plot", "disabled"] as const);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!filters) {
        throw new Error("Kutu grafiği filtreleri gereklidir.");
      }

      return getBoxPlot(filters, signal);
    },
    enabled: isEnabled,
    placeholderData: keepPreviousData,
  });
}

export function useStageBreakdownQuery(
  filters: StageBreakdownFilters | null,
) {
  const isEnabled = Boolean(
    filters?.productCode &&
      filters.castCode &&
      isDateRangeValid(filters.startDate, filters.endDate),
  );
  const queryKey = filters
    ? analyticsKeys.stageBreakdown(filters)
    : ([...analyticsKeys.all, "stage-breakdown", "disabled"] as const);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!filters) {
        throw new Error("Aşama karşılaştırma filtreleri gereklidir.");
      }

      return getStageBreakdown(filters, signal);
    },
    enabled: isEnabled,
    placeholderData: keepPreviousData,
  });
}
