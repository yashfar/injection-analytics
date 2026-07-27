import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PerformanceQueryDto {
  @IsString()
  @IsNotEmpty()
  productCode!: string;

  @IsString()
  @IsNotEmpty()
  castCode!: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
