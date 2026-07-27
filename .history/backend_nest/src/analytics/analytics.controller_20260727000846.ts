import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterQueryDto } from './dto/analytics-filter-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { PerformanceQueryDto } from './dto/performance-query.dto';
import { DistributionQueryDto } from './dto/distribution-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }
  @Get('filters')
  getFilters() {
    return this.analyticsService.getFilters();
  }

  @Get('summary')
  getSummary(@Query() filters: AnalyticsFilterQueryDto) {
    return this.analyticsService.getSummary(filters);
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
}
