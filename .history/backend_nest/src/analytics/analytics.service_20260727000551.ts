import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AnalyticsFilterQueryDto } from './dto/analytics-filter-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { PerformanceQueryDto } from './dto/performance-query.dto';
import { DistributionQueryDto } from './dto/distribution-query.dto';

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

  async getTrend(filters: AnalyticsFilterQueryDto) {
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

    if (filters.machine) {
      conditions.push(Prisma.sql`"MACHINE" = ${filters.machine}`);
    }

    if (filters.from) {
      conditions.push(Prisma.sql`"MACH_DATE" >= ${new Date(filters.from)}`);
    }

    if (filters.to) {
      conditions.push(Prisma.sql`"MACH_DATE" <= ${new Date(filters.to)}`);
    }

    const rows = await this.prisma.$queryRaw<TrendDatabaseRow[]>`
      WITH filtered AS (
        SELECT
          "MACHINE" AS machine,
          "MACH_DATE" AS machine_date,

          "TIMERCEVRIM"::double precision
            AS cycle_time

        FROM production_cycles

        WHERE ${Prisma.join(conditions, ' AND ')}
      ),

      bounds AS (
        SELECT
          MIN(machine_date) AS start_date,
          MAX(machine_date) AS end_date
        FROM filtered
      ),

      bucket_config AS (
        SELECT
          CASE
            WHEN end_date - start_date <= INTERVAL '7 days'
              THEN INTERVAL '1 hour'

            WHEN end_date - start_date <= INTERVAL '45 days'
              THEN INTERVAL '1 day'

            ELSE INTERVAL '7 days'
          END AS bucket_interval,

          CASE
            WHEN end_date - start_date <= INTERVAL '7 days'
              THEN 'hour'

            WHEN end_date - start_date <= INTERVAL '45 days'
              THEN 'day'

            ELSE 'week'
          END AS bucket_size

        FROM bounds
      ),

      bucketed AS (
        SELECT
          filtered.machine,

          date_bin(
            bucket_config.bucket_interval,
            filtered.machine_date,
            TIMESTAMP '2000-01-03 00:00:00'
          ) AS bucket_start,

          filtered.cycle_time,
          bucket_config.bucket_size

        FROM filtered
        CROSS JOIN bucket_config
      )

      SELECT
        bucket_size AS "bucketSize",
        machine AS "machine",
        bucket_start AS "bucketStart",

        COUNT(*) AS "cycleCount",

        AVG(cycle_time)
          AS "averageCycleTime",

        PERCENTILE_CONT(0.5)
          WITHIN GROUP (ORDER BY cycle_time)
          AS "medianCycleTime",

        MIN(cycle_time)
          AS "minimumCycleTime",

        MAX(cycle_time)
          AS "maximumCycleTime"

      FROM bucketed

      GROUP BY
        bucket_size,
        machine,
        bucket_start

      ORDER BY
        machine,
        bucket_start
    `;

    if (rows.length === 0) {
      return {
        bucketSize: null,
        series: [],
      };
    }

    const seriesMap = new Map<
      string,
      {
        machine: string;
        points: Array<{
          bucketStart: Date;
          cycleCount: number;
          averageCycleTime: number;
          medianCycleTime: number;
          minimumCycleTime: number;
          maximumCycleTime: number;
        }>;
      }
    >();

    const round = (value: number) => Number(value.toFixed(3));

    for (const row of rows) {
      if (!seriesMap.has(row.machine)) {
        seriesMap.set(row.machine, {
          machine: row.machine,
          points: [],
        });
      }

      seriesMap.get(row.machine)?.points.push({
        bucketStart: row.bucketStart,
        cycleCount: Number(row.cycleCount),

        averageCycleTime: round(row.averageCycleTime),

        medianCycleTime: round(row.medianCycleTime),

        minimumCycleTime: round(row.minimumCycleTime),

        maximumCycleTime: round(row.maximumCycleTime),
      });
    }

    return {
      bucketSize: rows[0].bucketSize,
      series: Array.from(seriesMap.values()),
    };
  }

  async getDistribution(query: DistributionQueryDto) {
    const { productCode, castCode, machine, from, to, binSize, maxValue } =
      query;

    if (maxValue <= binSize) {
      throw new BadRequestException('maxValue must be greater than binSize');
    }

    const conditions: Prisma.Sql[] = [
      Prisma.sql`"PRODCODE" = ${productCode}`,
      Prisma.sql`"CASTCODE" = ${castCode}`,
      Prisma.sql`"MACHINE" = ${machine}`,
    ];

    if (from) {
      conditions.push(Prisma.sql`"MACH_DATE" >= ${new Date(from)}`);
    }

    if (to) {
      conditions.push(Prisma.sql`"MACH_DATE" <= ${new Date(to)}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    type DistributionRow = {
      lowerBound: unknown;
      upperBound: unknown | null;
      cycleCount: bigint;
      isOverflow: boolean;
      totalCycleCount: bigint;
      minimumCycleTime: unknown | null;
      maximumCycleTime: unknown | null;
    };

    const rows = await this.prisma.$queryRaw<DistributionRow[]>(
      Prisma.sql`
      WITH filtered_cycles AS (
        SELECT
          "TIMERCEVRIM"::numeric AS cycle_time
        FROM production_cycles
        WHERE ${whereClause}
          AND "TIMERCEVRIM" IS NOT NULL
      ),

      statistics AS (
        SELECT
          COUNT(*) AS total_cycle_count,
          MIN(cycle_time) AS minimum_cycle_time,
          MAX(cycle_time) AS maximum_cycle_time
        FROM filtered_cycles
      ),

      normal_counts AS (
        SELECT
          FLOOR(
            cycle_time / ${binSize}::numeric
          ) * ${binSize}::numeric AS lower_bound,

          COUNT(*) AS cycle_count

        FROM filtered_cycles
        WHERE cycle_time < ${maxValue}::numeric
        GROUP BY lower_bound
      ),

      bin_limits AS (
        SELECT
          MIN(lower_bound) AS first_bin
        FROM normal_counts
      ),

      bin_starts AS (
        SELECT
          GENERATE_SERIES(
            first_bin,
            ${maxValue - binSize}::numeric,
            ${binSize}::numeric
          ) AS lower_bound
        FROM bin_limits
        WHERE first_bin IS NOT NULL
      ),

      normal_bins AS (
        SELECT
          bin_starts.lower_bound,
          bin_starts.lower_bound
            + ${binSize}::numeric AS upper_bound,

          COALESCE(
            normal_counts.cycle_count,
            0
          ) AS cycle_count,

          false AS is_overflow

        FROM bin_starts

        LEFT JOIN normal_counts
          ON normal_counts.lower_bound =
             bin_starts.lower_bound
      ),

      overflow_bin AS (
        SELECT
          ${maxValue}::numeric AS lower_bound,
          NULL::numeric AS upper_bound,
          COUNT(*) AS cycle_count,
          true AS is_overflow

        FROM filtered_cycles
        WHERE cycle_time >= ${maxValue}::numeric
      )

      SELECT
        bins.lower_bound AS "lowerBound",
        bins.upper_bound AS "upperBound",
        bins.cycle_count AS "cycleCount",
        bins.is_overflow AS "isOverflow",

        statistics.total_cycle_count AS "totalCycleCount",
        statistics.minimum_cycle_time AS "minimumCycleTime",
        statistics.maximum_cycle_time AS "maximumCycleTime"

      FROM (
        SELECT * FROM normal_bins
        UNION ALL
        SELECT * FROM overflow_bin
      ) AS bins

      CROSS JOIN statistics

      ORDER BY bins.lower_bound ASC
    `,
    );

    const firstRow = rows[0];

    const formatValue = (value: number) => {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    };

    return {
      productCode,
      castCode,
      machine,
      binSize,
      maxValue,

      totalCycleCount: firstRow ? Number(firstRow.totalCycleCount) : 0,

      minimumCycleTime:
        firstRow?.minimumCycleTime !== null &&
        firstRow?.minimumCycleTime !== undefined
          ? Number(firstRow.minimumCycleTime)
          : null,

      maximumCycleTime:
        firstRow?.maximumCycleTime !== null &&
        firstRow?.maximumCycleTime !== undefined
          ? Number(firstRow.maximumCycleTime)
          : null,

      bins: rows.map((row) => {
        const lowerBound = Number(row.lowerBound);

        const upperBound =
          row.upperBound !== null ? Number(row.upperBound) : null;

        return {
          lowerBound,
          upperBound,
          cycleCount: Number(row.cycleCount),
          isOverflow: row.isOverflow,

          label: row.isOverflow
            ? `${formatValue(lowerBound)}+`
            : `${formatValue(lowerBound)}-${formatValue(upperBound!)}`,
        };
      }),
    };
  }
}
