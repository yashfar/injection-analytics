import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AnalyticsFilterQueryDto {
  @IsString()
  @IsNotEmpty()
  productCode!: string;

  @IsString()
  @IsNotEmpty()
  castCode!: string;

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
