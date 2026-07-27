"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CycleTimeHistogramChart } from "@/components/dashboard/charts/cycle-time-histogram-chart";
import { CycleTimeTrendChart } from "@/components/dashboard/charts/cycle-time-trend-chart";
import { MachineBoxPlotChart } from "@/components/dashboard/charts/machine-box-plot-chart";
import { MachinePerformanceChart } from "@/components/dashboard/charts/machine-performance-chart";
import { ProcessStageBreakdownChart } from "@/components/dashboard/charts/process-stage-breakdown-chart";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
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
import {
  areAnalyticsFiltersValid,
  createFilterEligibilityIdentity,
  createDefaultAnalyticsFilters,
  getValidMachines,
  isoUtcToDateInputValue,
  toBoxPlotFilters,
  toHistogramFilters,
  toMachineComparisonFilters,
  toStageBreakdownFilters,
  toTrendFilters,
} from "@/lib/analytics-filters";
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

type DashboardSuccessProps = {
  overview: AnalyticsOverview;
  comparablePairs: AnalyticsComparablePair[];
  initialFilters: AnalyticsFilters;
};

function ActiveFilterSummary({ filters }: { filters: AnalyticsFilters }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Etkin Filtreler</h2>
        </CardTitle>
        <CardDescription>
          Uygulanan bu değerler analiz sorgularında kullanılacaktır.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <dt className="text-muted-foreground">Ürün</dt>
            <dd className="font-medium text-card-foreground">
              {filters.productCode}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Kalıp</dt>
            <dd className="font-medium text-card-foreground">
              {filters.castCode}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Makine</dt>
            <dd className="font-medium text-card-foreground">
              {filters.machine ?? "Tüm karşılaştırılabilir makineler"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Tarih Aralığı</dt>
            <dd className="font-medium text-card-foreground">
              {filters.startDate} – {filters.endDate}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function DashboardSuccess({
  overview,
  comparablePairs,
  initialFilters,
}: DashboardSuccessProps) {
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(() => ({
    ...initialFilters,
  }));
  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilters>(() => ({
    ...initialFilters,
  }));
  const [histogramConfiguration, setHistogramConfiguration] =
    useState<HistogramConfiguration>(() => ({
      ...DEFAULT_HISTOGRAM_CONFIGURATION,
    }));
  const firstChartRef = useRef<HTMLElement | null>(null);
  const machineFilterRef = useRef<HTMLButtonElement | null>(null);
  const machineAttentionTimeoutRef = useRef<number | null>(null);
  const [
    isMachineFilterAttentionActive,
    setIsMachineFilterAttentionActive,
  ] = useState(false);
  const machineComparisonFilters =
    toMachineComparisonFilters(appliedFilters);
  const machineComparisonQuery = useMachineComparisonQuery(
    machineComparisonFilters,
  );
  const trendFilters = toTrendFilters(appliedFilters);
  const trendQuery = useTrendQuery(trendFilters);
  const boxPlotFilters = toBoxPlotFilters(appliedFilters);
  const boxPlotQuery = useBoxPlotQuery(boxPlotFilters);
  const stageBreakdownFilters =
    toStageBreakdownFilters(appliedFilters);
  const stageBreakdownQuery = useStageBreakdownQuery(
    stageBreakdownFilters,
  );
  const histogramFilters = toHistogramFilters(
    appliedFilters,
    histogramConfiguration,
  );
  const histogramQuery = useHistogramQuery(histogramFilters);
  const machineColorOrder = useMemo(
    () =>
      getValidMachines(
        comparablePairs,
        appliedFilters.productCode,
        appliedFilters.castCode,
      ),
    [
      appliedFilters.castCode,
      appliedFilters.productCode,
      comparablePairs,
    ],
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

  function applyFilters(): boolean {
    if (
      !areAnalyticsFiltersValid(
        draftFilters,
        comparablePairs,
        dateMin || undefined,
        dateMax || undefined,
      )
    ) {
      return false;
    }

    setAppliedFilters({
      ...draftFilters,
      machine: draftFilters.machine || undefined,
    });

    return true;
  }

  function scrollToFirstChart() {
    const target = firstChartRef.current;

    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  function applyFiltersAndShowResults() {
    if (!applyFilters()) {
      return;
    }

    scrollToFirstChart();
  }

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
      <DashboardHeader
        startDate={overview.startDate}
        endDate={overview.endDate}
      />

      <OverviewCards overview={overview} />

      <DashboardFilters
        comparablePairs={comparablePairs}
        draftFilters={draftFilters}
        dateMin={dateMin}
        dateMax={dateMax}
        onDraftFiltersChange={setDraftFilters}
        onApply={applyFiltersAndShowResults}
        machineFilterRef={machineFilterRef}
        isMachineFilterAttentionActive={
          isMachineFilterAttentionActive
        }
      />

      <ActiveFilterSummary filters={appliedFilters} />

      <section
        aria-label="Analiz grafikleri"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <section
          ref={firstChartRef}
          aria-labelledby="machine-performance-title"
          tabIndex={-1}
          className="scroll-mt-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          <MachinePerformanceChart
            rows={machineComparisonQuery.data}
            selectedMachine={appliedFilters.machine}
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
          requestedMachine={appliedFilters.machine}
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
          selectedMachine={appliedFilters.machine}
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
          selectedMachine={appliedFilters.machine}
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

type DashboardUnavailableProps = {
  overview: AnalyticsOverview;
  comparablePairs: AnalyticsComparablePair[];
  message: string;
};

function DashboardUnavailable({
  overview,
  comparablePairs,
  message,
}: DashboardUnavailableProps) {
  const dateMin = isoUtcToDateInputValue(overview.startDate);
  const dateMax = isoUtcToDateInputValue(overview.endDate);

  return (
    <>
      <DashboardHeader
        startDate={overview.startDate}
        endDate={overview.endDate}
      />
      <OverviewCards overview={overview} />
      <DashboardFilters
        comparablePairs={comparablePairs}
        dateMin={dateMin}
        dateMax={dateMax}
        onDraftFiltersChange={() => undefined}
        onApply={() => undefined}
        disabled
      />
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

export function DashboardContent() {
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
        message="Analiz verileri yüklenemedi. Lütfen tekrar deneyin."
        onRetry={retryFailedQueries}
        isRetrying={isRetrying}
      />
    );
  } else {
    const initialFilters = createDefaultAnalyticsFilters(
      comparablePairsQuery.data,
      overviewQuery.data.startDate,
      overviewQuery.data.endDate,
    );

    if (comparablePairsQuery.data.length === 0) {
      content = (
        <DashboardUnavailable
          overview={overviewQuery.data}
          comparablePairs={comparablePairsQuery.data}
          message="Karşılaştırılabilir ürün ve kalıp kombinasyonu bulunamadı."
        />
      );
    } else if (!initialFilters) {
      content = (
        <DashboardUnavailable
          overview={overviewQuery.data}
          comparablePairs={comparablePairsQuery.data}
          message="Analiz tarih aralığı mevcut değil."
        />
      );
    } else {
      const dateMin = isoUtcToDateInputValue(overviewQuery.data.startDate);
      const dateMax = isoUtcToDateInputValue(overviewQuery.data.endDate);
      const filterEligibilityIdentity = createFilterEligibilityIdentity(
        comparablePairsQuery.data,
        dateMin,
        dateMax,
      );

      content = (
        <DashboardSuccess
          key={filterEligibilityIdentity}
          overview={overviewQuery.data}
          comparablePairs={comparablePairsQuery.data}
          initialFilters={initialFilters}
        />
      );
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {content}
      </div>
    </main>
  );
}
