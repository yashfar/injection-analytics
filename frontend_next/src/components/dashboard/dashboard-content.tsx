"use client";

import { useRef, useState } from "react";

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
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createDefaultAnalyticsFilters,
  isoUtcToDateInputValue,
} from "@/lib/analytics-filters";
import { getEmptyReason, type EmptyReasonFilterKey } from "@/lib/empty-reason";
import {
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

type DashboardSuccessProps = {
  overview: AnalyticsOverview;
  initialFilters: AnalyticsFilters;
};

function DashboardSuccess({ overview, initialFilters }: DashboardSuccessProps) {
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(() => ({
    ...initialFilters,
  }));
  // null = the user has not pressed "Filtreleri Uygula" yet. The chip strip
  // and every chart below always read appliedFilters, never draftFilters.
  const [appliedFilters, setAppliedFilters] =
    useState<AnalyticsFilters | null>(null);
  const firstChartRef = useRef<HTMLElement | null>(null);

  const analysisSummaryQuery = useAnalysisSummaryQuery(appliedFilters);
  const analysisTrendQuery = useAnalysisTrendQuery(appliedFilters);
  const analysisHistogramQuery = useAnalysisHistogramQuery(appliedFilters);
  const analysisStagesSummaryQuery =
    useAnalysisStagesSummaryQuery(appliedFilters);
  const analysisStagesTrendQuery =
    useAnalysisStagesTrendQuery(appliedFilters);
  const analysisCyclesQuery = useAnalysisCyclesQuery(appliedFilters);
  const analysisOutliersQuery = useAnalysisOutliersQuery(appliedFilters);

  // Same cache entry DashboardFilters already reads (shared queryKey) —
  // used here only for the dataset's full date bounds in empty-state copy.
  const filtersQuery = useFiltersQuery();
  const datasetBounds = {
    startDate: filtersQuery.data?.startDate ?? null,
    endDate: filtersQuery.data?.endDate ?? null,
  };

  const dateMin = isoUtcToDateInputValue(overview.startDate);
  const dateMax = isoUtcToDateInputValue(overview.endDate);

  function applyFilters() {
    // DashboardFilters only calls onApply when its own disabled-state check
    // (valid dates + draft different from applied) already passed.
    setAppliedFilters(draftFilters);
  }

  function resetDraftFilters() {
    // Reset only clears the draft; appliedFilters (and the rendered charts)
    // stay untouched until Apply is pressed again.
    const defaults = createDefaultAnalyticsFilters(
      [],
      overview.startDate,
      overview.endDate,
    );

    if (defaults) {
      setDraftFilters(defaults);
    }
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
    applyFilters();
    scrollToFirstChart();
  }

  // Removing a filter (from a chip or an empty-state action) re-applies
  // immediately — it does not wait in the draft for another Apply click.
  function removeAppliedFilter(filterKey: EmptyReasonFilterKey) {
    setDraftFilters((current) => ({ ...current, [filterKey]: undefined }));
    setAppliedFilters((current) =>
      current ? { ...current, [filterKey]: undefined } : current,
    );
  }

  function widenDateRangeAndReapply(startDate: string, endDate: string) {
    setDraftFilters((current) => ({ ...current, startDate, endDate }));
    setAppliedFilters((current) =>
      current ? { ...current, startDate, endDate } : current,
    );
  }

  function renderEmptyReason() {
    if (!appliedFilters) {
      return null;
    }

    return (
      <EmptyReasonPanel
        reason={getEmptyReason(appliedFilters, datasetBounds)}
        onClearFilter={removeAppliedFilter}
        onWidenDateRange={widenDateRangeAndReapply}
      />
    );
  }

  // summary is the single source of truth for "is there anything at all in
  // this scope" — when it resolves to zero cycles, every other analysis
  // endpoint will independently be empty too, so the chart grid below is
  // skipped entirely instead of repeating the same "no data" message six
  // more times.
  const isConfirmedEmpty =
    appliedFilters !== null &&
    analysisSummaryQuery.isSuccess &&
    analysisSummaryQuery.data.cycleCount === 0;

  return (
    <>
      <DashboardHeader startDate={overview.startDate} endDate={overview.endDate} />

      <OverviewCards overview={overview} />

      <DashboardFilters
        draftFilters={draftFilters}
        appliedFilters={appliedFilters}
        dateMin={dateMin}
        dateMax={dateMax}
        onDraftFiltersChange={setDraftFilters}
        onApply={applyFiltersAndShowResults}
        onReset={resetDraftFilters}
      />

      {appliedFilters ? (
        <AppliedFiltersChips
          appliedFilters={appliedFilters}
          onRemoveFilter={removeAppliedFilter}
        />
      ) : null}

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
              description="Seçili filtre kapsamında çevrim süresinin zaman içindeki değişimi"
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

type DashboardUnavailableProps = {
  overview: AnalyticsOverview;
  message: string;
};

function DashboardUnavailable({ overview, message }: DashboardUnavailableProps) {
  return (
    <>
      <DashboardHeader startDate={overview.startDate} endDate={overview.endDate} />
      <OverviewCards overview={overview} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Analiz kullanılamıyor</h2>
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}

export function DashboardContent() {
  const overviewQuery = useAnalyticsOverviewQuery();

  let content;

  if (overviewQuery.isPending) {
    content = <DashboardLoading />;
  } else if (overviewQuery.isError) {
    content = (
      <DashboardError
        message="Analiz verileri yüklenemedi. Lütfen tekrar deneyin."
        onRetry={() => void overviewQuery.refetch()}
        isRetrying={overviewQuery.isFetching}
      />
    );
  } else {
    // comparablePairs no longer gates Phase 1 at all — an independent
    // filter scope needs nothing more than a valid date range to exist.
    const initialFilters = createDefaultAnalyticsFilters(
      [],
      overviewQuery.data.startDate,
      overviewQuery.data.endDate,
    );

    content = !initialFilters ? (
      <DashboardUnavailable
        overview={overviewQuery.data}
        message="Analiz tarih aralığı mevcut değil."
      />
    ) : (
      <DashboardSuccess overview={overviewQuery.data} initialFilters={initialFilters} />
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
