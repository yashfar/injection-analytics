import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { PerformanceQueryDto } from './performance-query.dto';

export class DistributionQueryDto extends PerformanceQueryDto {
  @IsString()
  @IsNotEmpty()
  machine: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(100)
  binSize: number = 5;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10000)
  maxValue: number = 60;
}
