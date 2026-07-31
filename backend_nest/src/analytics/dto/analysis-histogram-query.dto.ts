import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { AnalysisFilterQueryDto } from './analysis-filter-query.dto';

export const MAX_ANALYSIS_HISTOGRAM_REGULAR_BIN_COUNT = 200;

export class AnalysisHistogramQueryDto extends AnalysisFilterQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  binSize: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxValue: number = 60;
}

export function validateAnalysisHistogramConfiguration(
  query: AnalysisHistogramQueryDto,
): void {
  if (
    !Number.isSafeInteger(query.binSize) ||
    query.binSize <= 0 ||
    !Number.isSafeInteger(query.maxValue) ||
    query.maxValue <= 0
  ) {
    throw new BadRequestException(
      'binSize and maxValue must be finite positive integers',
    );
  }

  if (query.maxValue < query.binSize) {
    throw new BadRequestException(
      'maxValue must be greater than or equal to binSize',
    );
  }

  if (
    Math.ceil(query.maxValue / query.binSize) >
    MAX_ANALYSIS_HISTOGRAM_REGULAR_BIN_COUNT
  ) {
    throw new BadRequestException(
      `Histogram cannot exceed ${MAX_ANALYSIS_HISTOGRAM_REGULAR_BIN_COUNT} regular bins`,
    );
  }
}
