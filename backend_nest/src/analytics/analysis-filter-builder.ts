import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AnalysisFilterQueryDto } from './dto/analysis-filter-query.dto';

export type NormalizedAnalysisFilters = {
  productCode?: string;
  castCode?: string;
  machine?: string;
  from?: Date;
  to?: Date;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDate(value: string, field: 'from' | 'to'): Date {
  const dateValue = DATE_ONLY_PATTERN.test(value)
    ? `${value}T${field === 'from' ? '00:00:00.000' : '23:59:59.999'}Z`
    : value;
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`"${field}" must be a valid ISO 8601 date`);
  }

  return date;
}

export function normalizeAnalysisFilters(
  filters: AnalysisFilterQueryDto,
): NormalizedAnalysisFilters {
  const normalized: NormalizedAnalysisFilters = {};

  if (filters.productCode !== undefined) {
    normalized.productCode = filters.productCode;
  }

  if (filters.castCode !== undefined) {
    normalized.castCode = filters.castCode;
  }

  if (filters.machine !== undefined) {
    normalized.machine = filters.machine;
  }

  if (filters.from !== undefined) {
    normalized.from = normalizeDate(filters.from, 'from');
  }

  if (filters.to !== undefined) {
    normalized.to = normalizeDate(filters.to, 'to');
  }

  if (
    normalized.from !== undefined &&
    normalized.to !== undefined &&
    normalized.from > normalized.to
  ) {
    throw new BadRequestException(
      '"from" must be earlier than or equal to "to"',
    );
  }

  return normalized;
}

export function buildProductionCycleWhere(
  filters: NormalizedAnalysisFilters,
): Prisma.ProductionCycleWhereInput {
  const where: Prisma.ProductionCycleWhereInput = {};

  if (filters.productCode !== undefined) {
    where.productCode = filters.productCode;
  }

  if (filters.castCode !== undefined) {
    where.castCode = filters.castCode;
  }

  if (filters.machine !== undefined) {
    where.machine = filters.machine;
  }

  if (filters.from !== undefined || filters.to !== undefined) {
    where.machineDate = {
      ...(filters.from !== undefined ? { gte: filters.from } : {}),
      ...(filters.to !== undefined ? { lte: filters.to } : {}),
    };
  }

  return where;
}

export function buildAnalysisSqlConditions(
  filters: NormalizedAnalysisFilters,
): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];

  if (filters.productCode !== undefined) {
    conditions.push(Prisma.sql`"PRODCODE" = ${filters.productCode}`);
  }

  if (filters.castCode !== undefined) {
    conditions.push(Prisma.sql`"CASTCODE" = ${filters.castCode}`);
  }

  if (filters.machine !== undefined) {
    conditions.push(Prisma.sql`"MACHINE" = ${filters.machine}`);
  }

  if (filters.from !== undefined) {
    conditions.push(Prisma.sql`"MACH_DATE" >= ${filters.from}`);
  }

  if (filters.to !== undefined) {
    conditions.push(Prisma.sql`"MACH_DATE" <= ${filters.to}`);
  }

  return conditions;
}
