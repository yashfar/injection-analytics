"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CycleTimeHistogramChart } from "@/components/dashboard/charts/cycle-time-histogram-chart";
import { CycleTimeTrendChart } from "@/components/dashboard/charts/cycle-time-trend-chart";
import { MachineBoxPlotChart } from "@/components/dashboard/charts/machine-box-plot-chart";
import { MachinePerformanceChart } from "@/components/dashboard/charts/machine-performance-chart";
import { ProcessStageBreakdownChart } from "@/components/dashboard/charts/process-stage-breakdown-chart";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  findFirstValidComparablePair,
  getUniqueProductCodes,
  getValidCastCodes,
  getValidMachines,
  isoUtcToDateInputValue,
  isValidDateOnly,
  toBoxPlotFilters,
  toHistogramFilters,
  toMachineComparisonFilters,
  toStageBreakdownFilters,
  toTrendFilters,
} from "@/lib/analytics-filters";
import { MACHINE_FILTER_TRIGGER_ID } from "@/lib/dashboard-element-ids";
import { DEFAULT_HISTOGRAM_CONFIGURATION } from "@/lib/histogram-chart";
import {
  useAnalyticsOverviewQuery,
  useBoxPlotQuery,
  useComparablePairsQuery,
  useHistogramQuery,
  useMachineComparisonQuery,
  useStageBreakdownQuery,
  useTrendQuery,
} from "@/queries/analytics.queries";
import type {
  AnalyticsComparablePair,
  AnalyticsFilters,
  AnalyticsOverview,
  HistogramConfiguration,
} from "@/types/analytics";

// Phase 2 comparison flow, moved out of the Phase 1 dashboard page. Filters
// here are intentionally cascading (product -> mold -> machine) and
// comparablePairs-constrained — this is the multi-machine comparison
// experience Phase 1 explicitly excludes.
const ALL_MACHINES_VALUE = "__all__";

type ComparisonFiltersProps = {
  comparablePairs: AnalyticsComparablePair[];
  filters: AnalyticsFilters;
  dateMin: string;
  dateMax: string;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  machineFilterRef: React.Ref<HTMLButtonElement>;
  isMachineFilterAttentionActive: boolean;
};

function ComparisonFilters({
  comparablePairs,
  filters,
  dateMin,
  dateMax,
  onFiltersChange,
  machineFilterRef,
  isMachineFilterAttentionActive,
}: ComparisonFiltersProps) {
  const productCodes = getUniqueProductCodes(comparablePairs);
  const castCodes = filters.productCode
    ? getValidCastCodes(comparablePairs, filters.productCode)
    : [];
  const machines =
    filters.productCode && filters.castCode
      ? getValidMachines(comparablePairs, filters.productCode, filters.castCode)
      : [];

  function handleProductChange(value: string | null) {
    if (!value) {
      return;
    }

    const castCode = getValidCastCodes(comparablePairs, value)[0];
    onFiltersChange({
      ...filters,
      productCode: value,
      castCode,
      machine: undefined,
    });
  }

  function handleCastChange(value: string | null) {
    if (!value) {
      return;
    }

    onFiltersChange({ ...filters, castCode: value, machine: undefined });
  }

  function handleMachineChange(value: string | null) {
    if (!value) {
      return;
    }

    onFiltersChange({
      ...filters,
      machine: value === ALL_MACHINES_VALUE ? undefined : value,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Karşılaştırma Filtreleri</h2>
        </CardTitle>
        <CardDescription>
          Ürün seçimi, karşılaştırılabilir kalıp ve makine seçeneklerini
          daraltır. Değişiklikler hemen uygulanır.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="comparison-product-filter">Ürün</Label>
            <Select
              value={filters.productCode}
              onValueChange={handleProductChange}
            >
              <SelectTrigger id="comparison-product-filter" className="w-full">
                <SelectValue placeholder="Ürün seçin" />
              </SelectTrigger>
              <SelectContent>
                {productCodes.map((productCode) => (
                  <SelectItem key={productCode} value={productCode}>
                    {productCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comparison-mold-filter">Kalıp</Label>
            <Select
              value={filters.castCode}
              onValueChange={handleCastChange}
              disabled={castCodes.length === 0}
            >
              <SelectTrigger id="comparison-mold-filter" className="w-full">
                <SelectValue placeholder="Kalıp seçin" />
              </SelectTrigger>
              <SelectContent>
                {castCodes.map((castCode) => (
                  <SelectItem key={castCode} value={castCode}>
                    {castCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={MACHINE_FILTER_TRIGGER_ID}>Makine</Label>
            <Select
              value={filters.machine ?? ALL_MACHINES_VALUE}
              onValueChange={handleMachineChange}
              disabled={machines.length === 0}
            >
              <SelectTrigger
                ref={machineFilterRef}
                id={MACHINE_FILTER_TRIGGER_ID}
                data-attention={isMachineFilterAttentionActive}
                className={cn(
                  "w-full scroll-m-6",
                  "data-[attention=true]:border-primary data-[attention=true]:ring-3 data-[attention=true]:ring-primary/40",
                  "motion-safe:data-[attention=true]:animate-pulse",
                )}
              >
                <SelectValue placeholder="Makine seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MACHINES_VALUE}>
                  Tüm makineler
                </SelectItem>
                {machines.map((machine) => (
                  <SelectItem key={machine} value={machine}>
                    {machine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comparison-start-date">Başlangıç Tarihi</Label>
            <Input
              id="comparison-start-date"
              type="date"
              min={dateMin || undefined}
              max={dateMax || undefined}
              value={filters.startDate}
              onChange={(event) =>
                onFiltersChange({ ...filters, startDate: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comparison-end-date">Bitiş Tarihi</Label>
            <Input
              id="comparison-end-date"
              type="date"
              min={dateMin || undefined}
              max={dateMax || undefined}
              value={filters.endDate}
              onChange={(event) =>
                onFiltersChange({ ...filters, endDate: event.target.value })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ComparisonSuccessProps = {
  overview: AnalyticsOverview;
  comparablePairs: AnalyticsComparablePair[];
  initialFilters: AnalyticsFilters;
};

function ComparisonSuccess({
  overview,
  comparablePairs,
  initialFilters,
}: ComparisonSuccessProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => ({
    ...initialFilters,
  }));
  const [histogramConfiguration, setHistogramConfiguration] =
    useState<HistogramConfiguration>(() => ({
      ...DEFAULT_HISTOGRAM_CONFIGURATION,
    }));
  const machineFilterRef = useRef<HTMLButtonElement | null>(null);
  const machineAttentionTimeoutRef = useRef<number | null>(null);
  const [isMachineFilterAttentionActive, setIsMachineFilterAttentionActive] =
    useState(false);

  const machineComparisonFilters = toMachineComparisonFilters(filters);
  const machineComparisonQuery = useMachineComparisonQuery(
    machineComparisonFilters,
  );
  const trendFilters = toTrendFilters(filters);
  const trendQuery = useTrendQuery(trendFilters);
  const boxPlotFilters = toBoxPlotFilters(filters);
  const boxPlotQuery = useBoxPlotQuery(boxPlotFilters);
  const stageBreakdownFilters = toStageBreakdownFilters(filters);
  const stageBreakdownQuery = useStageBreakdownQuery(stageBreakdownFilters);
  const histogramFilters = toHistogramFilters(filters, histogramConfiguration);
  const histogramQuery = useHistogramQuery(histogramFilters);
  const machineColorOrder = useMemo(
    () => getValidMachines(comparablePairs, filters.productCode, filters.castCode),
    [filters.productCode, filters.castCode, comparablePairs],
  );
  const dateMin = isoUtcToDateInputValue(overview.startDate);
  const dateMax = isoUtcToDateInputValue(overview.endDate);

  useEffect(
    () => () => {
      if (machineAttentionTimeoutRef.current !== null) {
        window.clearTimeout(machineAttentionTimeoutRef.current);
      }
    },
    [],
  );

  function focusMachineFilter() {
    const target = machineFilterRef.current;

    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (machineAttentionTimeoutRef.current !== null) {
      window.clearTimeout(machineAttentionTimeoutRef.current);
    }

    setIsMachineFilterAttentionActive(true);
    machineAttentionTimeoutRef.current = window.setTimeout(() => {
      setIsMachineFilterAttentionActive(false);
      machineAttentionTimeoutRef.current = null;
    }, 1800);

    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    });
    target.focus({ preventScroll: true });
  }

  return (
    <>
      <DashboardHeader startDate={overview.startDate} endDate={overview.endDate} />
      <OverviewCards overview={overview} />
      <ComparisonFilters
        comparablePairs={comparablePairs}
        filters={filters}
        dateMin={dateMin}
        dateMax={dateMax}
        onFiltersChange={setFilters}
        machineFilterRef={machineFilterRef}
        isMachineFilterAttentionActive={isMachineFilterAttentionActive}
      />

      <section
        aria-label="Karşılaştırma grafikleri"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <section aria-labelledby="machine-performance-title">
          <MachinePerformanceChart
            rows={machineComparisonQuery.data}
            selectedMachine={filters.machine}
            isPending={machineComparisonQuery.isPending}
            isError={machineComparisonQuery.isError}
            isFetching={machineComparisonQuery.isFetching}
            isPlaceholderData={machineComparisonQuery.isPlaceholderData}
            onRetry={() => void machineComparisonQuery.refetch()}
          />
        </section>
        <CycleTimeTrendChart
          data={trendQuery.data}
          machineColorOrder={machineColorOrder}
          isPending={trendQuery.isPending}
          isError={trendQuery.isError}
          isFetching={trendQuery.isFetching}
          isPlaceholderData={trendQuery.isPlaceholderData}
          onRetry={() => void trendQuery.refetch()}
        />
      </section>

      <section aria-label="Çevrim süresi dağılımı">
        <CycleTimeHistogramChart
          data={histogramQuery.data}
          requestedMachine={filters.machine}
          configuration={histogramConfiguration}
          isPending={histogramQuery.isPending}
          isError={histogramQuery.isError}
          isFetching={histogramQuery.isFetching}
          isPlaceholderData={histogramQuery.isPlaceholderData}
          onConfigurationChange={setHistogramConfiguration}
          onSelectMachine={focusMachineFilter}
          onRetry={() => void histogramQuery.refetch()}
        />
      </section>

      <section aria-label="Makine kutu grafiği">
        <MachineBoxPlotChart
          data={boxPlotQuery.data}
          requestedFilters={boxPlotFilters}
          machineColorOrder={machineColorOrder}
          selectedMachine={filters.machine}
          isPending={boxPlotQuery.isPending}
          isError={boxPlotQuery.isError}
          isFetching={boxPlotQuery.isFetching}
          isPlaceholderData={boxPlotQuery.isPlaceholderData}
          onRetry={() => void boxPlotQuery.refetch()}
        />
      </section>

      <section aria-label="Çevrim aşamaları karşılaştırması">
        <ProcessStageBreakdownChart
          data={stageBreakdownQuery.data}
          requestedFilters={stageBreakdownFilters}
          selectedMachine={filters.machine}
          isPending={stageBreakdownQuery.isPending}
          isError={stageBreakdownQuery.isError}
          isFetching={stageBreakdownQuery.isFetching}
          isPlaceholderData={stageBreakdownQuery.isPlaceholderData}
          onRetry={() => void stageBreakdownQuery.refetch()}
        />
      </section>
    </>
  );
}

type ComparisonUnavailableProps = {
  overview: AnalyticsOverview;
  message: string;
};

function ComparisonUnavailable({ overview, message }: ComparisonUnavailableProps) {
  return (
    <>
      <DashboardHeader startDate={overview.startDate} endDate={overview.endDate} />
      <OverviewCards overview={overview} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Karşılaştırmalı analiz kullanılamıyor</h2>
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}

function buildInitialComparisonFilters(
  comparablePairs: AnalyticsComparablePair[],
  overviewStartDate: string | null,
  overviewEndDate: string | null,
): AnalyticsFilters | undefined {
  const firstPair = findFirstValidComparablePair(comparablePairs);
  const startDate = isoUtcToDateInputValue(overviewStartDate);
  const endDate = isoUtcToDateInputValue(overviewEndDate);

  if (!firstPair || !isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
    return undefined;
  }

  return { ...firstPair, machine: undefined, startDate, endDate };
}

export function ComparisonContent() {
  const overviewQuery = useAnalyticsOverviewQuery();
  const comparablePairsQuery = useComparablePairsQuery();

  let content;

  if (overviewQuery.isPending || comparablePairsQuery.isPending) {
    content = <DashboardLoading />;
  } else if (overviewQuery.isError || comparablePairsQuery.isError) {
    const retryFailedQueries = () => {
      const retries: Promise<unknown>[] = [];

      if (overviewQuery.isError) {
        retries.push(overviewQuery.refetch());
      }

      if (comparablePairsQuery.isError) {
        retries.push(comparablePairsQuery.refetch());
      }

      void Promise.all(retries);
    };
    const isRetrying =
      (overviewQuery.isError && overviewQuery.isFetching) ||
      (comparablePairsQuery.isError && comparablePairsQuery.isFetching);

    content = (
      <DashboardError
        message="Karşılaştırma verileri yüklenemedi. Lütfen tekrar deneyin."
        onRetry={retryFailedQueries}
        isRetrying={isRetrying}
      />
    );
  } else if (comparablePairsQuery.data.length === 0) {
    content = (
      <ComparisonUnavailable
        overview={overviewQuery.data}
        message="Karşılaştırılabilir ürün ve kalıp kombinasyonu bulunamadı."
      />
    );
  } else {
    const initialFilters = buildInitialComparisonFilters(
      comparablePairsQuery.data,
      overviewQuery.data.startDate,
      overviewQuery.data.endDate,
    );

    content = !initialFilters ? (
      <ComparisonUnavailable
        overview={overviewQuery.data}
        message="Analiz tarih aralığı mevcut değil."
      />
    ) : (
      <ComparisonSuccess
        overview={overviewQuery.data}
        comparablePairs={comparablePairsQuery.data}
        initialFilters={initialFilters}
      />
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {content}
      </div>
    </main>
  );
}
