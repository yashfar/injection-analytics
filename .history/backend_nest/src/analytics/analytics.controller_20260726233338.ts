import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterQueryDto } from './dto/analytics-filter-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';

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
}
