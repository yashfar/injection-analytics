"use client";

import { useEffect, useRef, useState } from "react";

import { AnalysisChartShell } from "@/components/analytics/analysis-chart-shell";
import { AnalysisCyclesChart } from "@/components/analytics/analysis-cycles-chart";
import { AnalysisHistogramChart } from "@/components/analytics/analysis-histogram-chart";
import { AnalysisOutliersChart } from "@/components/analytics/analysis-outliers-chart";
import { AnalysisStageDistributionChart } from "@/components/analytics/analysis-stage-distribution-chart";
import { AnalysisStagesTrendChart } from "@/components/analytics/analysis-stages-trend-chart";
import { AnalysisSummaryCards } from "@/components/analytics/analysis-summary-cards";
import { AnalysisTrendChart } from "@/components/analytics/analysis-trend-chart";
import { AppliedFiltersChips } from "@/components/analytics/applied-filters-chips";
import { EmptyReasonPanel } from "@/components/analytics/empty-reason-panel";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDefaultAnalyticsFilters,
  isoUtcToDateInputValue,
  isDateRangeValid,
  normalizeAnalyticsFilters,
} from "@/lib/analytics-filters";
import { getEmptyReason, type EmptyReasonFilterKey } from "@/lib/empty-reason";
import { ANALYSIS_DEFAULTS } from "@/lib/analysis-defaults";
import {
  type AnalysisHistogramQueryOptions,
  useAnalysisCyclesQuery,
  useAnalysisHistogramQuery,
  useAnalysisOutliersQuery,
  useAnalysisStagesSummaryQuery,
  useAnalysisStagesTrendQuery,
  useAnalysisSummaryQuery,
  useAnalysisTrendQuery,
} from "@/hooks/use-analysis-queries";
import {
  useAnalyticsOverviewQuery,
  useFiltersQuery,
} from "@/queries/analytics.queries";
import type { AnalyticsFilters, AnalyticsOverview } from "@/types/analytics";

type DashboardAnalysisProps = {
  appliedFilters: AnalyticsFilters | null;
  datasetBounds: { startDate: string | null; endDate: string | null };
  firstChartRef: React.RefObject<HTMLElement | null>;
  onClearFilter: (filterKey: EmptyReasonFilterKey) => void;
  onWidenDateRange: (startDate: string, endDate: string) => void;
};

type HistogramControlsProps = {
  options: AnalysisHistogramQueryOptions;
  disabled: boolean;
  onChange: (options: AnalysisHistogramQueryOptions) => void;
};

function HistogramControls({
  options,
  disabled,
  onChange,
}: HistogramControlsProps) {
  const binSize = options.binSize ?? ANALYSIS_DEFAULTS.histogram.binSize;
  const maxValue = options.maxValue ?? ANALYSIS_DEFAULTS.histogram.maxValue;

  return (
    <div className="grid min-w-64 grid-cols-2 gap-2">
      <label className="grid gap-1 text-xs text-muted-foreground">
        Aralık Genişliği
        <Select
          value={String(binSize)}
          onValueChange={(value) => onChange({ ...options, binSize: Number(value) })}
          disabled={disabled}
        >
          <SelectTrigger aria-label="Aralık Genişliği" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANALYSIS_DEFAULTS.histogram.binSizeOptions.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value} sn
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Üst Gösterim Sınırı
        <Select
          value={String(maxValue)}
          onValueChange={(value) => onChange({ ...options, maxValue: Number(value) })}
          disabled={disabled}
        >
          <SelectTrigger aria-label="Üst Gösterim Sınırı" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANALYSIS_DEFAULTS.histogram.maxValueOptions.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value} sn
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}

function DashboardAnalysis({
  appliedFilters,
  datasetBounds,
  firstChartRef,
  onClearFilter,
  onWidenDateRange,
}: DashboardAnalysisProps) {
  const [histogramOptions, setHistogramOptions] =
    useState<AnalysisHistogramQueryOptions>({});
  const analysisSummaryQuery = useAnalysisSummaryQuery(appliedFilters);
  const analysisTrendQuery = useAnalysisTrendQuery(appliedFilters);
  const analysisHistogramQuery = useAnalysisHistogramQuery(
    appliedFilters,
    histogramOptions,
  );
  const analysisStagesSummaryQuery =
    useAnalysisStagesSummaryQuery(appliedFilters);
  const analysisStagesTrendQuery =
    useAnalysisStagesTrendQuery(appliedFilters);
  const analysisCyclesQuery = useAnalysisCyclesQuery(appliedFilters);
  const analysisOutliersQuery = useAnalysisOutliersQuery(appliedFilters);

  function renderEmptyReason() {
    if (!appliedFilters) {
      return null;
    }

    return (
      <EmptyReasonPanel
        reason={getEmptyReason(appliedFilters, datasetBounds)}
        onClearFilter={onClearFilter}
        onWidenDateRange={onWidenDateRange}
      />
    );
  }

  const isConfirmedEmpty =
    appliedFilters !== null &&
    analysisSummaryQuery.isSuccess &&
    analysisSummaryQuery.data.cycleCount === 0;

  return (
    <>
      <section
        ref={firstChartRef}
        tabIndex={-1}
        className="scroll-mt-28 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        <AnalysisChartShell
          title="Analiz Özeti"
          description="Seçili filtre kapsamındaki çevrim istatistikleri"
          queryResult={analysisSummaryQuery}
          hasApplied={appliedFilters !== null}
          isEmpty={(data) => data.cycleCount === 0}
          renderEmpty={renderEmptyReason}
        >
          {(data) => <AnalysisSummaryCards data={data} />}
        </AnalysisChartShell>
      </section>

      {isConfirmedEmpty ? null : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnalysisChartShell
              title="Çevrim Süresi Trendi"
              description="Seçili filtre kapsamındaki çevrim süresinin zaman içindeki değişimi"
              queryResult={analysisTrendQuery}
              hasApplied={appliedFilters !== null}
              isEmpty={(data) =>
                data.bucketSize === null || data.points.length === 0
              }
              renderEmpty={renderEmptyReason}
              minHeight={420}
            >
              {(data) => <AnalysisTrendChart data={data} />}
            </AnalysisChartShell>

            <AnalysisChartShell
              title="Çevrim Süresi Dağılımı"
          description="Seçili filtre kapsamındaki çevrimlerin süre aralıklarına göre dağılımı"
          queryResult={analysisHistogramQuery}
          hasApplied={appliedFilters !== null}
          headerAction={
            <HistogramControls
              options={histogramOptions}
              disabled={appliedFilters === null}
              onChange={setHistogramOptions}
            />
          }
              isEmpty={(data) => data.totalCycleCount === 0}
              renderEmpty={renderEmptyReason}
              minHeight={420}
            >
              {(data) => <AnalysisHistogramChart data={data} />}
            </AnalysisChartShell>

            <AnalysisChartShell
              title="Çevrim Aşamaları Dağılımı"
              description="Seçili filtre kapsamında ortalama çevrim süresini oluşturan aşamalar"
              queryResult={analysisStagesSummaryQuery}
              hasApplied={appliedFilters !== null}
              isEmpty={(data) => data.cycleCount === 0}
              renderEmpty={renderEmptyReason}
            >
              {(data) => <AnalysisStageDistributionChart data={data} />}
            </AnalysisChartShell>

            <AnalysisChartShell
              title="Çevrim Aşamaları Trendi"
              description="Seçili filtre kapsamında aşama sürelerinin zaman içindeki değişimi"
              queryResult={analysisStagesTrendQuery}
              hasApplied={appliedFilters !== null}
              isEmpty={(data) =>
                data.bucketSize === null || data.points.length === 0
              }
              renderEmpty={renderEmptyReason}
              minHeight={420}
            >
              {(data) => <AnalysisStagesTrendChart data={data} />}
            </AnalysisChartShell>
          </div>

          <AnalysisChartShell
            title="Çevrim Bazlı Takip"
            description="Seçili filtre kapsamındaki her bir çevrimin kronolojik süresi"
            queryResult={analysisCyclesQuery}
            hasApplied={appliedFilters !== null}
            isEmpty={(data) => data.points.length === 0}
            renderEmpty={renderEmptyReason}
            minHeight={420}
          >
            {(data) => <AnalysisCyclesChart data={data} />}
          </AnalysisChartShell>

          <AnalysisChartShell
            title="Aykırı Değer Analizi"
            description="Seçili filtre kapsamında IQR sınırlarının dışında kalan çevrimler"
            queryResult={analysisOutliersQuery}
            hasApplied={appliedFilters !== null}
            isEmpty={(data) => data.cycleCount === 0}
            renderEmpty={renderEmptyReason}
            minHeight={420}
          >
            {(data) => <AnalysisOutliersChart data={data} />}
          </AnalysisChartShell>
        </>
      )}
    </>
  );
}

export function DashboardContent() {
  const overviewQuery = useAnalyticsOverviewQuery();
  // This query deliberately mounts with the dashboard, independently of the
  // legacy overview query. Its date bounds are authoritative for Phase 1.
  const filtersQuery = useFiltersQuery();
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>();
  const [appliedFilters, setAppliedFilters] =
    useState<AnalyticsFilters | null>(null);
  const [preparedDateRangeMessage, setPreparedDateRangeMessage] = useState<
    string | null
  >(null);
  const didInitializeFilters = useRef(false);
  const firstChartRef = useRef<HTMLElement | null>(null);

  const filterStartDate = filtersQuery.data?.startDate ?? null;
  const filterEndDate = filtersQuery.data?.endDate ?? null;
  const dateMin = isoUtcToDateInputValue(filterStartDate);
  const dateMax = isoUtcToDateInputValue(filterEndDate);
  const datasetBounds = { startDate: filterStartDate, endDate: filterEndDate };

  useEffect(() => {
    if (!filtersQuery.data || didInitializeFilters.current) {
      return;
    }

    // Bootstrap only once from the independent filter endpoint. Refetches
    // must never overwrite a draft edit or silently replace the applied scope.
    const initialDraftFilters = createDefaultAnalyticsFilters(
      [],
      filterStartDate,
      filterEndDate,
    );
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled || didInitializeFilters.current) {
        return;
      }

      didInitializeFilters.current = true;

      setDraftFilters(initialDraftFilters);

      if (!isDateRangeValid(initialDraftFilters.startDate, initialDraftFilters.endDate)) {
        return;
      }

      const normalizedInitialFilters = normalizeAnalyticsFilters(initialDraftFilters);
      setAppliedFilters({
        productCode: normalizedInitialFilters.productCode,
        castCode: normalizedInitialFilters.castCode,
        machine: normalizedInitialFilters.machine,
        startDate: normalizedInitialFilters.startDate,
        endDate: normalizedInitialFilters.endDate,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [filterEndDate, filterStartDate, filtersQuery.data]);

  function updateDraftFilters(filters: AnalyticsFilters) {
    setDraftFilters(filters);
    setPreparedDateRangeMessage(null);
  }

  function applyFilters() {
    if (!draftFilters) {
      return;
    }

    const normalizedDraft = normalizeAnalyticsFilters(draftFilters);
    const nextAppliedFilters: AnalyticsFilters = {
      productCode: normalizedDraft.productCode,
      castCode: normalizedDraft.castCode,
      machine: normalizedDraft.machine,
      startDate: normalizedDraft.startDate,
      endDate: normalizedDraft.endDate,
    };

    setAppliedFilters(nextAppliedFilters);
    setPreparedDateRangeMessage(null);
    scrollToFirstChart();
  }

  function resetDraftFilters() {
    setDraftFilters(
      createDefaultAnalyticsFilters([], filterStartDate, filterEndDate),
    );
    setPreparedDateRangeMessage(null);
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

  function removeDraftFilter(filterKey: EmptyReasonFilterKey) {
    setDraftFilters((current) =>
      current ? { ...current, [filterKey]: undefined } : current,
    );
  }

  function prepareWiderDateRange(startDate: string, endDate: string) {
    setDraftFilters((current) =>
      current
        ? {
            ...current,
            startDate: isoUtcToDateInputValue(startDate),
            endDate: isoUtcToDateInputValue(endDate),
          }
        : current,
    );
    setPreparedDateRangeMessage(
      "Daha geniş tarih aralığı hazırlandı. Sonuçları güncellemek için Filtreleri Uygula'ya basın.",
    );
  }

  const filtersPanel = (
    <DashboardFilters
      draftFilters={draftFilters}
      appliedFilters={appliedFilters}
      dateMin={dateMin}
      dateMax={dateMax}
      onDraftFiltersChange={updateDraftFilters}
      onApply={applyFilters}
      onReset={resetDraftFilters}
      preparedDateRangeMessage={preparedDateRangeMessage}
      filtersQuery={filtersQuery}
    />
  );

  const overviewContent = overviewQuery.isPending ? (
    <DashboardLoading />
  ) : overviewQuery.isError ? (
    <DashboardError
      message="Üretim özeti yüklenemedi. Lütfen tekrar deneyin."
      onRetry={() => void overviewQuery.refetch()}
      isRetrying={overviewQuery.isFetching}
    />
  ) : (
    <>
      <DashboardHeader
        startDate={(overviewQuery.data as AnalyticsOverview).startDate}
        endDate={(overviewQuery.data as AnalyticsOverview).endDate}
      />
      <OverviewCards overview={overviewQuery.data as AnalyticsOverview} />
    </>
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {overviewContent}
        {filtersPanel}
        {appliedFilters ? <AppliedFiltersChips appliedFilters={appliedFilters} /> : null}
        <DashboardAnalysis
          appliedFilters={appliedFilters}
          datasetBounds={datasetBounds}
          firstChartRef={firstChartRef}
          onClearFilter={removeDraftFilter}
          onWidenDateRange={prepareWiderDateRange}
        />
      </div>
    </main>
  );
}
