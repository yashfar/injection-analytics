import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class AnalyticsFilterQueryDto {
  @IsOptional()
  @IsString()
  productCode?: string;

  @IsOptional()
  @IsString()
  castCode?: string;

  @IsOptional()
  @IsString()
  machine?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
