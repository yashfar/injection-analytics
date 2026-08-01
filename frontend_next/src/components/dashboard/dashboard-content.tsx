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
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
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
  overview: AnalyticsOverview | null;
  overviewError: boolean;
};

function DashboardSuccess({ overview, overviewError }: DashboardSuccessProps) {
  const filtersQuery = useFiltersQuery();
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters | null>(
    null,
  );
  const [appliedFilters, setAppliedFilters] =
    useState<AnalyticsFilters | null>(null);
  const hasBootstrappedInitialFilters = useRef(false);
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

  const datasetBounds = {
    startDate: filtersQuery.data?.startDate ?? null,
    endDate: filtersQuery.data?.endDate ?? null,
  };
  const dateMin = isoUtcToDateInputValue(datasetBounds.startDate);
  const dateMax = isoUtcToDateInputValue(datasetBounds.endDate);

  useEffect(() => {
    if (hasBootstrappedInitialFilters.current || !filtersQuery.data) {
      return;
    }

    const defaults = createDefaultAnalyticsFilters(
      [],
      filtersQuery.data.startDate,
      filtersQuery.data.endDate,
    );

    if (!defaults) {
      return;
    }

    hasBootstrappedInitialFilters.current = true;
    const initialDraftFilters = { ...defaults };
    const initialAppliedFilters = { ...defaults };

    // Queue the initial state transition after the query result has committed.
    // The ref is set before queuing so a refetch/re-render cannot create a
    // second bootstrap or overwrite a user's subsequent draft edits.
    queueMicrotask(() => {
      setDraftFilters(initialDraftFilters);
      setAppliedFilters(initialAppliedFilters);
    });
  }, [filtersQuery.data]);

  function applyFilters() {
    if (draftFilters) {
      setAppliedFilters({ ...draftFilters });
    }
  }

  function resetDraftFilters() {
    const defaults = createDefaultAnalyticsFilters(
      [],
      datasetBounds.startDate,
      datasetBounds.endDate,
    );

    if (defaults) {
      setDraftFilters({ ...defaults });
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

  function removeAppliedFilter(filterKey: EmptyReasonFilterKey) {
    setDraftFilters((current) =>
      current ? { ...current, [filterKey]: undefined } : current,
    );
    setAppliedFilters((current) =>
      current ? { ...current, [filterKey]: undefined } : current,
    );
  }

  function widenDateRangeAndReapply(startDate: string, endDate: string) {
    setDraftFilters((current) =>
      current ? { ...current, startDate, endDate } : current,
    );
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

  const isConfirmedEmpty =
    appliedFilters !== null &&
    analysisSummaryQuery.isSuccess &&
    analysisSummaryQuery.data.cycleCount === 0;

  return (
    <>
      <DashboardHeader
        startDate={overview?.startDate ?? datasetBounds.startDate}
        endDate={overview?.endDate ?? datasetBounds.endDate}
      />

      {overview ? <OverviewCards overview={overview} /> : null}
      {overviewError ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Üretim özeti yüklenemedi</h2>
            </CardTitle>
            <CardDescription>
              Analiz filtreleri ve grafikler kullanılmaya devam edebilir.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <DashboardFilters
        draftFilters={draftFilters ?? undefined}
        appliedFilters={appliedFilters}
        dateMin={dateMin}
        dateMax={dateMax}
        onDraftFiltersChange={(filters) => setDraftFilters(filters)}
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
            description="Her nokta bir üretim çevrimini gösterir. Süre değişimlerini ve ani yükselişleri zaman sırasına göre inceleyin."
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
            description="Alışılmış süre aralığının dışına çıkan çevrimleri ve sınırdan ne kadar saptıklarını inceleyin."
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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <DashboardSuccess
          overview={overviewQuery.data ?? null}
          overviewError={overviewQuery.isError}
        />
      </div>
    </main>
  );
}
