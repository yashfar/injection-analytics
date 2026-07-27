import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { AnalyticsFilterQueryDto } from './dto/analytics-filter-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { PerformanceQueryDto } from './dto/performance-query.dto';

type OverviewDatabaseRow = {
  totalCycles: bigint;
  machineCount: bigint;
  productCount: bigint;
  moldCount: bigint;
  startDate: Date | null;
  endDate: Date | null;
};

type FiltersDatabaseRow = {
  machines: string[];
  products: string[];
  molds: string[];
  workOrders: string[];
  startDate: Date | null;
  endDate: Date | null;
};

type SummaryDatabaseRow = {
  cycleCount: bigint;
  averageCycleTime: number | null;
  medianCycleTime: number | null;
  minimumCycleTime: number | null;
  maximumCycleTime: number | null;
  q1: number | null;
  q3: number | null;
  outlierCount: bigint;
};

type ComparablePairDatabaseRow = {
  productCode: string;
  castCode: string;
  machineCount: bigint;
  cycleCount: bigint;
  machines: string[];
};

type MachineComparisonDatabaseRow = {
  machine: string;
  cycleCount: bigint;
  averageCycleTime: number;
  medianCycleTime: number;
  minimumCycleTime: number;
  maximumCycleTime: number;
  q1: number;
  q3: number;
  standardDeviation: number;
  outlierCount: bigint;
};

type TrendDatabaseRow = {
  bucketSize: string;
  machine: string;
  bucketStart: Date;
  cycleCount: bigint;
  averageCycleTime: number;
  medianCycleTime: number;
  minimumCycleTime: number;
  maximumCycleTime: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [overview] = await this.prisma.$queryRaw<OverviewDatabaseRow[]>`
        SELECT
          COUNT(*) AS "totalCycles",
          COUNT(DISTINCT "MACHINE") AS "machineCount",
          COUNT(DISTINCT "PRODCODE") AS "productCount",
          COUNT(DISTINCT "CASTCODE") AS "moldCount",
          MIN("MACH_DATE") AS "startDate",
          MAX("MACH_DATE") AS "endDate"
        FROM production_cycles
      `;

    if (!overview) {
      return {
        totalCycles: 0,
        machineCount: 0,
        productCount: 0,
        moldCount: 0,
        startDate: null,
        endDate: null,
      };
    }

    return {
      totalCycles: Number(overview.totalCycles),
      machineCount: Number(overview.machineCount),
      productCount: Number(overview.productCount),
      moldCount: Number(overview.moldCount),
      startDate: overview.startDate,
      endDate: overview.endDate,
    };
  }

  async getFilters() {
    const [filters] = await this.prisma.$queryRaw<FiltersDatabaseRow[]>`
      SELECT
        COALESCE(
          jsonb_agg(
            DISTINCT "MACHINE"
            ORDER BY "MACHINE"
          ),
          '[]'::jsonb
        ) AS "machines",

        COALESCE(
          jsonb_agg(
            DISTINCT "PRODCODE"
            ORDER BY "PRODCODE"
          ),
          '[]'::jsonb
        ) AS "products",

        COALESCE(
          jsonb_agg(
            DISTINCT "CASTCODE"
            ORDER BY "CASTCODE"
          ),
          '[]'::jsonb
        ) AS "molds",

        COALESCE(
          jsonb_agg(
            DISTINCT "ORDERNO"
            ORDER BY "ORDERNO"
          ),
          '[]'::jsonb
        ) AS "workOrders",

        MIN("MACH_DATE") AS "startDate",
        MAX("MACH_DATE") AS "endDate"

      FROM production_cycles
    `;

    if (!filters) {
      return {
        machines: [],
        products: [],
        molds: [],
        workOrders: [],
        startDate: null,
        endDate: null,
      };
    }

    return filters;
  }

  async getSummary(filters: AnalyticsFilterQueryDto) {
    if (
      filters.from &&
      filters.to &&
      new Date(filters.from) > new Date(filters.to)
    ) {
      throw new BadRequestException('"from" must be earlier than "to"');
    }

    const conditions: Prisma.Sql[] = [];

    if (filters.productCode) {
      conditions.push(Prisma.sql`"PRODCODE" = ${filters.productCode}`);
    }

    if (filters.castCode) {
      conditions.push(Prisma.sql`"CASTCODE" = ${filters.castCode}`);
    }

    if (filters.machine) {
      conditions.push(Prisma.sql`"MACHINE" = ${filters.machine}`);
    }

    if (filters.from) {
      conditions.push(Prisma.sql`"MACH_DATE" >= ${new Date(filters.from)}`);
    }

    if (filters.to) {
      conditions.push(Prisma.sql`"MACH_DATE" <= ${new Date(filters.to)}`);
    }

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`
          WHERE ${Prisma.join(conditions, ' AND ')}
        `
        : Prisma.empty;

    const [summary] = await this.prisma.$queryRaw<SummaryDatabaseRow[]>`
      WITH filtered AS (
        SELECT
          "TIMERCEVRIM"::double precision AS cycle_time
        FROM production_cycles
        ${whereClause}
      ),

      stats AS (
        SELECT
          COUNT(*) AS "cycleCount",

          AVG(cycle_time) AS "averageCycleTime",

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (ORDER BY cycle_time)
            AS "medianCycleTime",

          MIN(cycle_time) AS "minimumCycleTime",
          MAX(cycle_time) AS "maximumCycleTime",

          PERCENTILE_CONT(0.25)
            WITHIN GROUP (ORDER BY cycle_time)
            AS "q1",

          PERCENTILE_CONT(0.75)
            WITHIN GROUP (ORDER BY cycle_time)
            AS "q3"

        FROM filtered
      )

      SELECT
        stats.*,

        CASE
          WHEN stats."q1" IS NULL
            OR stats."q3" IS NULL
          THEN 0::bigint

          ELSE (
            SELECT COUNT(*)
            FROM filtered
            WHERE
              cycle_time <
                stats."q1" -
                1.5 * (stats."q3" - stats."q1")

              OR cycle_time >
                stats."q3" +
                1.5 * (stats."q3" - stats."q1")
          )
        END AS "outlierCount"

      FROM stats
    `;

    if (!summary) {
      return {
        cycleCount: 0,
        averageCycleTime: null,
        medianCycleTime: null,
        minimumCycleTime: null,
        maximumCycleTime: null,
        q1: null,
        q3: null,
        outlierCount: 0,
        outlierRate: 0,
      };
    }

    const cycleCount = Number(summary.cycleCount);
    const outlierCount = Number(summary.outlierCount);

    const round = (value: number | null) =>
      value === null ? null : Number(value.toFixed(3));

    return {
      cycleCount,
      averageCycleTime: round(summary.averageCycleTime),
      medianCycleTime: round(summary.medianCycleTime),
      minimumCycleTime: round(summary.minimumCycleTime),
      maximumCycleTime: round(summary.maximumCycleTime),
      q1: round(summary.q1),
      q3: round(summary.q3),
      outlierCount,
      outlierRate:
        cycleCount === 0
          ? 0
          : Number(((outlierCount / cycleCount) * 100).toFixed(2)),
    };
  }

  async getComparablePairs(filters: DateRangeQueryDto) {
    if (
      filters.from &&
      filters.to &&
      new Date(filters.from) > new Date(filters.to)
    ) {
      throw new BadRequestException('"from" must be earlier than "to"');
    }

    const conditions: Prisma.Sql[] = [];

    if (filters.from) {
      conditions.push(Prisma.sql`"MACH_DATE" >= ${new Date(filters.from)}`);
    }

    if (filters.to) {
      conditions.push(Prisma.sql`"MACH_DATE" <= ${new Date(filters.to)}`);
    }

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`
          WHERE ${Prisma.join(conditions, ' AND ')}
        `
        : Prisma.empty;

    const pairs = await this.prisma.$queryRaw<ComparablePairDatabaseRow[]>`
      SELECT
        "PRODCODE" AS "productCode",
        "CASTCODE" AS "castCode",

        COUNT(DISTINCT "MACHINE")
          AS "machineCount",

        COUNT(*) AS "cycleCount",

        jsonb_agg(
          DISTINCT "MACHINE"
          ORDER BY "MACHINE"
        ) AS "machines"

      FROM production_cycles

      ${whereClause}

      GROUP BY
        "PRODCODE",
        "CASTCODE"

      HAVING COUNT(DISTINCT "MACHINE") >= 2

      ORDER BY
        "machineCount" DESC,
        "cycleCount" DESC
    `;

    return pairs.map((pair) => ({
      productCode: pair.productCode,
      castCode: pair.castCode,
      machineCount: Number(pair.machineCount),
      cycleCount: Number(pair.cycleCount),
      machines: pair.machines,
    }));
  }

  async getMachineComparison(filters: PerformanceQueryDto) {
    if (
      filters.from &&
      filters.to &&
      new Date(filters.from) > new Date(filters.to)
    ) {
      throw new BadRequestException('"from" must be earlier than "to"');
    }

    const conditions: Prisma.Sql[] = [
      Prisma.sql`"PRODCODE" = ${filters.productCode}`,
      Prisma.sql`"CASTCODE" = ${filters.castCode}`,
    ];

    if (filters.from) {
      conditions.push(Prisma.sql`"MACH_DATE" >= ${new Date(filters.from)}`);
    }

    if (filters.to) {
      conditions.push(Prisma.sql`"MACH_DATE" <= ${new Date(filters.to)}`);
    }

    const rows = await this.prisma.$queryRaw<MachineComparisonDatabaseRow[]>`
      WITH filtered AS (
        SELECT
          "MACHINE" AS machine,
          "TIMERCEVRIM"::double precision
            AS cycle_time
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      ),

      stats AS (
        SELECT
          machine,

          COUNT(*) AS "cycleCount",

          AVG(cycle_time)
            AS "averageCycleTime",

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (ORDER BY cycle_time)
            AS "medianCycleTime",

          MIN(cycle_time)
            AS "minimumCycleTime",

          MAX(cycle_time)
            AS "maximumCycleTime",

          PERCENTILE_CONT(0.25)
            WITHIN GROUP (ORDER BY cycle_time)
            AS "q1",

          PERCENTILE_CONT(0.75)
            WITHIN GROUP (ORDER BY cycle_time)
            AS "q3",

          STDDEV_POP(cycle_time)
            AS "standardDeviation"

        FROM filtered
        GROUP BY machine
      )

      SELECT
        stats.*,

        (
          SELECT COUNT(*)
          FROM filtered
          WHERE
            filtered.machine = stats.machine
            AND (
              filtered.cycle_time <
                stats."q1" -
                1.5 * (stats."q3" - stats."q1")

              OR filtered.cycle_time >
                stats."q3" +
                1.5 * (stats."q3" - stats."q1")
            )
        ) AS "outlierCount"

      FROM stats

      ORDER BY
        stats."medianCycleTime" ASC
    `;

    if (rows.length === 0) {
      return [];
    }

    const fastestMedian = rows[0].medianCycleTime;

    const round = (value: number) => Number(value.toFixed(3));

    return rows.map((row, index) => {
      const cycleCount = Number(row.cycleCount);
      const outlierCount = Number(row.outlierCount);

      return {
        rank: index + 1,
        machine: row.machine,
        isFastest: index === 0,

        cycleCount,

        averageCycleTime: round(row.averageCycleTime),

        medianCycleTime: round(row.medianCycleTime),

        minimumCycleTime: round(row.minimumCycleTime),

        maximumCycleTime: round(row.maximumCycleTime),

        q1: round(row.q1),
        q3: round(row.q3),

        standardDeviation: round(row.standardDeviation),

        outlierCount,

        outlierRate: Number(((outlierCount / cycleCount) * 100).toFixed(2)),

        differenceFromFastestPercent:
          index === 0
            ? 0
            : Number(
                (
                  ((row.medianCycleTime - fastestMedian) / fastestMedian) *
                  100
                ).toFixed(2),
              ),
      };
    });
  }
}
