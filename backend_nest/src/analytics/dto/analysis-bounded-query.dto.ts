import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { AnalysisFilterQueryDto } from './analysis-filter-query.dto';

export class AnalysisCyclesQueryDto extends AnalysisFilterQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit: number = 1000;
}

export class AnalysisOutliersQueryDto extends AnalysisFilterQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 100;
}
