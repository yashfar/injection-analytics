import { IsOptional, IsString } from 'class-validator';
import { PerformanceQueryDto } from './performance-query.dto';

export class AnalyticsFilterQueryDto extends PerformanceQueryDto {
  @IsOptional()
  @IsString()
  machine?: string;
}
