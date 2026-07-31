import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AnalysisFilterQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  castCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  machine?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
