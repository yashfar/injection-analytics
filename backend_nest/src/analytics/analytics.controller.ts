import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterQueryDto } from './dto/analytics-filter-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { PerformanceQueryDto } from './dto/performance-query.dto';
import { DistributionQueryDto } from './dto/distribution-query.dto';
import { AnalyticsFiltersResponse } from './analytics-filters-response.type';
import { AnalysisFilterQueryDto } from './dto/analysis-filter-query.dto';
import { AnalysisSummaryResponse } from './analysis-summary-response.type';
import { AnalysisTrendResponse } from './analysis-trend-response.type';
import { AnalysisHistogramQueryDto } from './dto/analysis-histogram-query.dto';
import { AnalysisHistogramResponse } from './analysis-histogram-response.type';
import {
  AnalysisStagesSummaryResponse,
  AnalysisStagesTrendResponse,
} from './analysis-stages-response.type';
import {
  AnalysisCyclesQueryDto,
  AnalysisOutliersQueryDto,
} from './dto/analysis-bounded-query.dto';
import {
  AnalysisCyclesResponse,
  AnalysisOutliersResponse,
} from './analysis-cycles-response.type';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }
  @Get('filters')
  getFilters(): Promise<AnalyticsFiltersResponse> {
    return this.analyticsService.getFilters();
  }

  @Get('summary')
  getSummary(@Query() filters: AnalyticsFilterQueryDto) {
    return this.analyticsService.getSummary(filters);
  }

  @Get('analysis/summary')
  getAnalysisSummary(
    @Query() filters: AnalysisFilterQueryDto,
  ): Promise<AnalysisSummaryResponse> {
    return this.analyticsService.getAnalysisSummary(filters);
  }

  @Get('analysis/trend')
  getAnalysisTrend(
    @Query() filters: AnalysisFilterQueryDto,
  ): Promise<AnalysisTrendResponse> {
    return this.analyticsService.getAnalysisTrend(filters);
  }

  @Get('analysis/histogram')
  getAnalysisHistogram(
    @Query() query: AnalysisHistogramQueryDto,
  ): Promise<AnalysisHistogramResponse> {
    return this.analyticsService.getAnalysisHistogram(query);
  }

  @Get('analysis/stages/summary')
  getAnalysisStagesSummary(
    @Query() filters: AnalysisFilterQueryDto,
  ): Promise<AnalysisStagesSummaryResponse> {
    return this.analyticsService.getAnalysisStagesSummary(filters);
  }

  @Get('analysis/stages/trend')
  getAnalysisStagesTrend(
    @Query() filters: AnalysisFilterQueryDto,
  ): Promise<AnalysisStagesTrendResponse> {
    return this.analyticsService.getAnalysisStagesTrend(filters);
  }

  @Get('analysis/cycles')
  getAnalysisCycles(
    @Query() query: AnalysisCyclesQueryDto,
  ): Promise<AnalysisCyclesResponse> {
    return this.analyticsService.getAnalysisCycles(query);
  }

  @Get('analysis/outliers')
  getAnalysisOutliers(
    @Query() query: AnalysisOutliersQueryDto,
  ): Promise<AnalysisOutliersResponse> {
    return this.analyticsService.getAnalysisOutliers(query);
  }

  @Get('comparable-pairs')
  getComparablePairs(@Query() filters: DateRangeQueryDto) {
    return this.analyticsService.getComparablePairs(filters);
  }

  @Get('machine-comparison')
  getMachineComparison(@Query() filters: PerformanceQueryDto) {
    return this.analyticsService.getMachineComparison(filters);
  }

  @Get('trend')
  getTrend(@Query() filters: AnalyticsFilterQueryDto) {
    return this.analyticsService.getTrend(filters);
  }

  @Get('distribution')
  getDistribution(@Query() query: DistributionQueryDto) {
    return this.analyticsService.getDistribution(query);
  }

  @Get('box-plot')
  getBoxPlot(@Query() query: PerformanceQueryDto) {
    return this.analyticsService.getBoxPlot(query);
  }

  @Get('stage-comparison')
  getStageComparison(@Query() query: PerformanceQueryDto) {
    return this.analyticsService.getStageComparison(query);
  }
}
