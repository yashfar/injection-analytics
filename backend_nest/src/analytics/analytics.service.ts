import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AnalyticsFilterQueryDto } from './dto/analytics-filter-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { PerformanceQueryDto } from './dto/performance-query.dto';
import { DistributionQueryDto } from './dto/distribution-query.dto';
import { AnalyticsFiltersResponse } from './analytics-filters-response.type';
import { AnalysisFilterQueryDto } from './dto/analysis-filter-query.dto';
import {
  buildAnalysisSqlConditions,
  normalizeAnalysisFilters,
  NormalizedAnalysisFilters,
} from './analysis-filter-builder';
import { AnalysisSummaryResponse } from './analysis-summary-response.type';
import {
  AnalysisTrendBucketSize,
  AnalysisTrendResponse,
} from './analysis-trend-response.type';
import {
  AnalysisHistogramQueryDto,
  validateAnalysisHistogramConfiguration,
} from './dto/analysis-histogram-query.dto';
import {
  AnalysisHistogramBin,
  AnalysisHistogramResponse,
} from './analysis-histogram-response.type';
import {
  AnalysisStagesSummaryResponse,
  AnalysisStagesTrendResponse,
} from './analysis-stages-response.type';
import {
  AnalysisCyclesQueryDto,
  AnalysisOutliersQueryDto,
} from './dto/analysis-bounded-query.dto';
import {
  AnalysisCyclePoint,
  AnalysisCyclesResponse,
  AnalysisOutlierCycle,
  AnalysisOutliersResponse,
} from './analysis-cycles-response.type';

type OverviewDatabaseRow = {
  totalCycles: bigint;
  machineCount: bigint;
  productCount: bigint;
  moldCount: bigint;
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

type AnalysisSummaryDatabaseRow = {
  cycleCount: unknown;
  averageCycleTime: unknown;
  medianCycleTime: unknown;
  minimumCycleTime: unknown;
  maximumCycleTime: unknown;
  q1: unknown;
  q3: unknown;
  standardDeviation: unknown;
  outlierCount: unknown;
  machineCount: unknown;
  productCount: unknown;
  moldCount: unknown;
  startDate: unknown;
  endDate: unknown;
};

type AnalysisTrendBoundaryDatabaseRow = {
  startDate: unknown;
  endDate: unknown;
};

type AnalysisTrendDatabaseRow = {
  bucketStart: unknown;
  cycleCount: unknown;
  averageCycleTime: unknown;
  medianCycleTime: unknown;
  minimumCycleTime: unknown;
  maximumCycleTime: unknown;
};

type AnalysisHistogramDatabaseRow = {
  totalCycleCount: unknown;
  minimumCycleTime: unknown;
  maximumCycleTime: unknown;
  lowerBound: unknown;
  cycleCount: unknown;
  isOverflow: unknown;
};

type AnalysisStagesSummaryDatabaseRow = {
  cycleCount: unknown;
  averageCycleTime: unknown;
  medianCycleTime: unknown;
  averageMengac: unknown;
  medianMengac: unknown;
  averageEnjtime: unknown;
  medianEnjtime: unknown;
  averageMaltime: unknown;
  medianMaltime: unknown;
  averageSogzaman: unknown;
  medianSogzaman: unknown;
  averageMengkap: unknown;
  medianMengkap: unknown;
};

type AnalysisStagesTrendDatabaseRow = {
  bucketStart: unknown;
  cycleCount: unknown;
  averageCycleTime: unknown;
  averageMengac: unknown;
  averageEnjtime: unknown;
  averageMaltime: unknown;
  averageSogzaman: unknown;
  averageMengkap: unknown;
};

type AnalysisCycleDatabaseRow = {
  cycleId: unknown;
  machine: unknown;
  workOrderNumber: unknown;
  productCode: unknown;
  castCode: unknown;
  machineDate: unknown;
  cycleCounter: unknown;
  cycleTime: unknown;
  mengac: unknown;
  enjtime: unknown;
  maltime: unknown;
  sogzaman: unknown;
  mengkap: unknown;
};

type AnalysisCyclesDatabaseRow = AnalysisCycleDatabaseRow & {
  totalCycleCount: unknown;
};

type AnalysisOutlierDatabaseRow = AnalysisCycleDatabaseRow & {
  cycleCount: unknown;
  q1: unknown;
  q3: unknown;
  outlierCount: unknown;
  outlierDirection: unknown;
  distanceFromFence: unknown;
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

  async getFilters(): Promise<AnalyticsFiltersResponse> {
    const [filters] = await this.prisma.$queryRaw<AnalyticsFiltersResponse[]>`
      SELECT
        COALESCE(
          jsonb_agg(
            DISTINCT "MACHINE"
            ORDER BY "MACHINE"
          ) FILTER (
            WHERE "MACHINE" IS NOT NULL
              AND "MACHINE" <> ''
          ),
          '[]'::jsonb
        ) AS "machines",

        COALESCE(
          jsonb_agg(
            DISTINCT "PRODCODE"
            ORDER BY "PRODCODE"
          ) FILTER (
            WHERE "PRODCODE" IS NOT NULL
              AND "PRODCODE" <> ''
          ),
          '[]'::jsonb
        ) AS "products",

        COALESCE(
          jsonb_agg(
            DISTINCT "CASTCODE"
            ORDER BY "CASTCODE"
          ) FILTER (
            WHERE "CASTCODE" IS NOT NULL
              AND "CASTCODE" <> ''
          ),
          '[]'::jsonb
        ) AS "molds",

        COALESCE(
          jsonb_agg(
            DISTINCT "ORDERNO"
            ORDER BY "ORDERNO"
          ) FILTER (
            WHERE "ORDERNO" IS NOT NULL
              AND "ORDERNO" <> ''
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

  async getAnalysisSummary(
    filters: AnalysisFilterQueryDto,
  ): Promise<AnalysisSummaryResponse> {
    const normalizedFilters = normalizeAnalysisFilters(filters);
    const conditions = [
      ...buildAnalysisSqlConditions(normalizedFilters),
      Prisma.sql`"TIMERCEVRIM" IS NOT NULL`,
      Prisma.sql`"TIMERCEVRIM"::numeric > 0`,
    ];

    const [summary] = await this.prisma.$queryRaw<AnalysisSummaryDatabaseRow[]>`
      WITH filtered AS (
        SELECT
          "MACHINE" AS machine,
          "PRODCODE" AS product_code,
          "CASTCODE" AS cast_code,
          "MACH_DATE" AS machine_date,
          "TIMERCEVRIM"::double precision AS cycle_time
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      ),

      stats AS (
        SELECT
          COUNT(*) AS "cycleCount",
          AVG(cycle_time) AS "averageCycleTime",
          PERCENTILE_CONT(0.5)
            WITHIN GROUP (ORDER BY cycle_time) AS "medianCycleTime",
          MIN(cycle_time) AS "minimumCycleTime",
          MAX(cycle_time) AS "maximumCycleTime",
          PERCENTILE_CONT(0.25)
            WITHIN GROUP (ORDER BY cycle_time) AS "q1",
          PERCENTILE_CONT(0.75)
            WITHIN GROUP (ORDER BY cycle_time) AS "q3",
          STDDEV_POP(cycle_time) AS "standardDeviation",
          COUNT(DISTINCT machine) AS "machineCount",
          COUNT(DISTINCT product_code) AS "productCount",
          COUNT(DISTINCT cast_code) AS "moldCount",
          MIN(machine_date) AS "startDate",
          MAX(machine_date) AS "endDate"
        FROM filtered
      )

      SELECT
        stats.*,
        CASE
          WHEN stats."q1" IS NULL OR stats."q3" IS NULL
          THEN 0::bigint
          ELSE (
            SELECT COUNT(*)
            FROM filtered
            WHERE
              cycle_time <
                stats."q1" - 1.5 * (stats."q3" - stats."q1")
              OR cycle_time >
                stats."q3" + 1.5 * (stats."q3" - stats."q1")
          )
        END AS "outlierCount"
      FROM stats
    `;

    if (!summary) {
      return this.createEmptyAnalysisSummary();
    }

    const cycleCount = this.toAggregateCount(summary.cycleCount, 'cycleCount');
    const outlierCount = this.toAggregateCount(
      summary.outlierCount,
      'outlierCount',
    );

    return {
      cycleCount,
      averageCycleTime: this.toRoundedAggregate(
        summary.averageCycleTime,
        'averageCycleTime',
      ),
      medianCycleTime: this.toRoundedAggregate(
        summary.medianCycleTime,
        'medianCycleTime',
      ),
      minimumCycleTime: this.toRoundedAggregate(
        summary.minimumCycleTime,
        'minimumCycleTime',
      ),
      maximumCycleTime: this.toRoundedAggregate(
        summary.maximumCycleTime,
        'maximumCycleTime',
      ),
      q1: this.toRoundedAggregate(summary.q1, 'q1'),
      q3: this.toRoundedAggregate(summary.q3, 'q3'),
      standardDeviation: this.toRoundedAggregate(
        summary.standardDeviation,
        'standardDeviation',
      ),
      outlierCount,
      outlierRate:
        cycleCount === 0
          ? 0
          : Number(((outlierCount / cycleCount) * 100).toFixed(2)),
      machineCount: this.toAggregateCount(summary.machineCount, 'machineCount'),
      productCount: this.toAggregateCount(summary.productCount, 'productCount'),
      moldCount: this.toAggregateCount(summary.moldCount, 'moldCount'),
      startDate: this.toAggregateDate(summary.startDate, 'startDate'),
      endDate: this.toAggregateDate(summary.endDate, 'endDate'),
    };
  }

  async getAnalysisTrend(
    filters: AnalysisFilterQueryDto,
  ): Promise<AnalysisTrendResponse> {
    const normalizedFilters = normalizeAnalysisFilters(filters);
    const conditions = [
      ...buildAnalysisSqlConditions(normalizedFilters),
      Prisma.sql`"TIMERCEVRIM" IS NOT NULL`,
      Prisma.sql`"TIMERCEVRIM"::numeric > 0`,
    ];
    let effectiveStart = normalizedFilters.from;
    let effectiveEnd = normalizedFilters.to;

    if (effectiveStart === undefined || effectiveEnd === undefined) {
      const [boundaries] = await this.prisma.$queryRaw<
        AnalysisTrendBoundaryDatabaseRow[]
      >`
        SELECT
          MIN("MACH_DATE") AS "startDate",
          MAX("MACH_DATE") AS "endDate"
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      `;

      if (!boundaries) {
        return { bucketSize: null, points: [] };
      }

      effectiveStart ??=
        this.toAggregateDate(boundaries.startDate, 'startDate') ?? undefined;
      effectiveEnd ??=
        this.toAggregateDate(boundaries.endDate, 'endDate') ?? undefined;

      if (effectiveStart === undefined || effectiveEnd === undefined) {
        return { bucketSize: null, points: [] };
      }
    }

    const bucketSize = this.selectAnalysisTrendBucketSize(
      effectiveStart,
      effectiveEnd,
    );
    const rows = await this.prisma.$queryRaw<AnalysisTrendDatabaseRow[]>`
      WITH bucketed AS (
        SELECT
          date_trunc(${bucketSize}::text, "MACH_DATE")
            AT TIME ZONE 'UTC' AS bucket_start,
          "TIMERCEVRIM"::double precision AS cycle_time
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      )

      SELECT
        bucket_start AS "bucketStart",
        COUNT(*) AS "cycleCount",
        AVG(cycle_time) AS "averageCycleTime",
        PERCENTILE_CONT(0.5)
          WITHIN GROUP (ORDER BY cycle_time) AS "medianCycleTime",
        MIN(cycle_time) AS "minimumCycleTime",
        MAX(cycle_time) AS "maximumCycleTime"
      FROM bucketed
      GROUP BY bucket_start
      ORDER BY bucket_start ASC
    `;

    if (rows.length === 0) {
      return { bucketSize: null, points: [] };
    }

    const points = rows.map((row) => ({
      bucketStart: this.toRequiredAggregateDate(row.bucketStart, 'bucketStart'),
      cycleCount: this.toAggregateCount(row.cycleCount, 'cycleCount'),
      averageCycleTime: this.toRequiredRoundedAggregate(
        row.averageCycleTime,
        'averageCycleTime',
      ),
      medianCycleTime: this.toRequiredRoundedAggregate(
        row.medianCycleTime,
        'medianCycleTime',
      ),
      minimumCycleTime: this.toRequiredRoundedAggregate(
        row.minimumCycleTime,
        'minimumCycleTime',
      ),
      maximumCycleTime: this.toRequiredRoundedAggregate(
        row.maximumCycleTime,
        'maximumCycleTime',
      ),
    }));

    points.sort(
      (left, right) => left.bucketStart.getTime() - right.bucketStart.getTime(),
    );

    return { bucketSize, points };
  }

  async getAnalysisStagesSummary(
    filters: AnalysisFilterQueryDto,
  ): Promise<AnalysisStagesSummaryResponse> {
    const normalizedFilters = normalizeAnalysisFilters(filters);
    const conditions = this.buildCompleteStageConditions(normalizedFilters);
    const [summary] = await this.prisma.$queryRaw<
      AnalysisStagesSummaryDatabaseRow[]
    >`
      SELECT
        COUNT(*) AS "cycleCount",
        AVG("TIMERCEVRIM"::double precision) AS "averageCycleTime",
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY "TIMERCEVRIM"::double precision
        ) AS "medianCycleTime",
        AVG("MENGAC"::double precision) AS "averageMengac",
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY "MENGAC"::double precision
        ) AS "medianMengac",
        AVG("ENJTIME"::double precision) AS "averageEnjtime",
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY "ENJTIME"::double precision
        ) AS "medianEnjtime",
        AVG("MALTIME"::double precision) AS "averageMaltime",
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY "MALTIME"::double precision
        ) AS "medianMaltime",
        AVG("SOGZAMAN"::double precision) AS "averageSogzaman",
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY "SOGZAMAN"::double precision
        ) AS "medianSogzaman",
        AVG("MENGKAP"::double precision) AS "averageMengkap",
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY "MENGKAP"::double precision
        ) AS "medianMengkap"
      FROM production_cycles
      WHERE ${Prisma.join(conditions, ' AND ')}
    `;

    if (!summary) {
      return this.createEmptyAnalysisStagesSummary();
    }

    const cycleCount = this.toAggregateCount(summary.cycleCount, 'cycleCount');

    if (cycleCount === 0) {
      return this.createEmptyAnalysisStagesSummary();
    }

    const averageCycleTime = this.toFiniteAggregateNumber(
      summary.averageCycleTime,
      'averageCycleTime',
    );
    const stageAverages = {
      MENGAC: this.toFiniteAggregateNumber(
        summary.averageMengac,
        'averageMengac',
      ),
      ENJTIME: this.toFiniteAggregateNumber(
        summary.averageEnjtime,
        'averageEnjtime',
      ),
      MALTIME: this.toFiniteAggregateNumber(
        summary.averageMaltime,
        'averageMaltime',
      ),
      SOGZAMAN: this.toFiniteAggregateNumber(
        summary.averageSogzaman,
        'averageSogzaman',
      ),
      MENGKAP: this.toFiniteAggregateNumber(
        summary.averageMengkap,
        'averageMengkap',
      ),
    };
    const averageStageSum = Object.values(stageAverages).reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      cycleCount,
      averageCycleTime: Number(averageCycleTime.toFixed(3)),
      medianCycleTime: this.toRequiredRoundedAggregate(
        summary.medianCycleTime,
        'medianCycleTime',
      ),
      stages: {
        MENGAC: {
          average: Number(stageAverages.MENGAC.toFixed(3)),
          median: this.toRequiredRoundedAggregate(
            summary.medianMengac,
            'medianMengac',
          ),
        },
        ENJTIME: {
          average: Number(stageAverages.ENJTIME.toFixed(3)),
          median: this.toRequiredRoundedAggregate(
            summary.medianEnjtime,
            'medianEnjtime',
          ),
        },
        MALTIME: {
          average: Number(stageAverages.MALTIME.toFixed(3)),
          median: this.toRequiredRoundedAggregate(
            summary.medianMaltime,
            'medianMaltime',
          ),
        },
        SOGZAMAN: {
          average: Number(stageAverages.SOGZAMAN.toFixed(3)),
          median: this.toRequiredRoundedAggregate(
            summary.medianSogzaman,
            'medianSogzaman',
          ),
        },
        MENGKAP: {
          average: Number(stageAverages.MENGKAP.toFixed(3)),
          median: this.toRequiredRoundedAggregate(
            summary.medianMengkap,
            'medianMengkap',
          ),
        },
      },
      averageStageSum: Number(averageStageSum.toFixed(3)),
      stageSumDifference: Number(
        (averageStageSum - averageCycleTime).toFixed(3),
      ),
    };
  }

  async getAnalysisStagesTrend(
    filters: AnalysisFilterQueryDto,
  ): Promise<AnalysisStagesTrendResponse> {
    const normalizedFilters = normalizeAnalysisFilters(filters);
    const conditions = this.buildCompleteStageConditions(normalizedFilters);
    let effectiveStart = normalizedFilters.from;
    let effectiveEnd = normalizedFilters.to;

    if (effectiveStart === undefined || effectiveEnd === undefined) {
      const [boundaries] = await this.prisma.$queryRaw<
        AnalysisTrendBoundaryDatabaseRow[]
      >`
        SELECT
          MIN("MACH_DATE") AS "startDate",
          MAX("MACH_DATE") AS "endDate"
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      `;

      if (!boundaries) {
        return { bucketSize: null, points: [] };
      }

      effectiveStart ??=
        this.toAggregateDate(boundaries.startDate, 'startDate') ?? undefined;
      effectiveEnd ??=
        this.toAggregateDate(boundaries.endDate, 'endDate') ?? undefined;

      if (effectiveStart === undefined || effectiveEnd === undefined) {
        return { bucketSize: null, points: [] };
      }
    }

    const bucketSize = this.selectAnalysisTrendBucketSize(
      effectiveStart,
      effectiveEnd,
    );
    const rows = await this.prisma.$queryRaw<AnalysisStagesTrendDatabaseRow[]>`
      WITH bucketed AS (
        SELECT
          date_trunc(${bucketSize}::text, "MACH_DATE")
            AT TIME ZONE 'UTC' AS bucket_start,
          "TIMERCEVRIM"::double precision AS cycle_time,
          "MENGAC"::double precision AS mengac,
          "ENJTIME"::double precision AS enjtime,
          "MALTIME"::double precision AS maltime,
          "SOGZAMAN"::double precision AS sogzaman,
          "MENGKAP"::double precision AS mengkap
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      )

      SELECT
        bucket_start AS "bucketStart",
        COUNT(*) AS "cycleCount",
        AVG(cycle_time) AS "averageCycleTime",
        AVG(mengac) AS "averageMengac",
        AVG(enjtime) AS "averageEnjtime",
        AVG(maltime) AS "averageMaltime",
        AVG(sogzaman) AS "averageSogzaman",
        AVG(mengkap) AS "averageMengkap"
      FROM bucketed
      GROUP BY bucket_start
      ORDER BY bucket_start ASC
    `;

    if (rows.length === 0) {
      return { bucketSize: null, points: [] };
    }

    const points = rows.map((row) => {
      const averageCycleTime = this.toFiniteAggregateNumber(
        row.averageCycleTime,
        'averageCycleTime',
      );
      const stages = {
        MENGAC: this.toFiniteAggregateNumber(
          row.averageMengac,
          'averageMengac',
        ),
        ENJTIME: this.toFiniteAggregateNumber(
          row.averageEnjtime,
          'averageEnjtime',
        ),
        MALTIME: this.toFiniteAggregateNumber(
          row.averageMaltime,
          'averageMaltime',
        ),
        SOGZAMAN: this.toFiniteAggregateNumber(
          row.averageSogzaman,
          'averageSogzaman',
        ),
        MENGKAP: this.toFiniteAggregateNumber(
          row.averageMengkap,
          'averageMengkap',
        ),
      };
      const averageStageSum = Object.values(stages).reduce(
        (sum, value) => sum + value,
        0,
      );

      return {
        bucketStart: this.toRequiredAggregateDate(
          row.bucketStart,
          'bucketStart',
        ),
        cycleCount: this.toAggregateCount(row.cycleCount, 'cycleCount'),
        averageCycleTime: Number(averageCycleTime.toFixed(3)),
        stages: {
          MENGAC: Number(stages.MENGAC.toFixed(3)),
          ENJTIME: Number(stages.ENJTIME.toFixed(3)),
          MALTIME: Number(stages.MALTIME.toFixed(3)),
          SOGZAMAN: Number(stages.SOGZAMAN.toFixed(3)),
          MENGKAP: Number(stages.MENGKAP.toFixed(3)),
        },
        averageStageSum: Number(averageStageSum.toFixed(3)),
        stageSumDifference: Number(
          (averageStageSum - averageCycleTime).toFixed(3),
        ),
      };
    });

    points.sort(
      (left, right) => left.bucketStart.getTime() - right.bucketStart.getTime(),
    );

    return { bucketSize, points };
  }

  async getAnalysisCycles(
    query: AnalysisCyclesQueryDto,
  ): Promise<AnalysisCyclesResponse> {
    this.validateBoundedLimit(query.limit, 5000, 'limit');
    const normalizedFilters = normalizeAnalysisFilters(query);
    const conditions = [
      ...buildAnalysisSqlConditions(normalizedFilters),
      Prisma.sql`"TIMERCEVRIM" IS NOT NULL`,
      Prisma.sql`"TIMERCEVRIM"::numeric > 0`,
    ];
    const rows = await this.prisma.$queryRaw<AnalysisCyclesDatabaseRow[]>`
      WITH filtered AS (
        SELECT
          id,
          "MACHINE" AS machine,
          "ORDERNO" AS work_order_number,
          "PRODCODE" AS product_code,
          "CASTCODE" AS cast_code,
          "MACH_DATE" AS machine_date,
          "CEVRIMCOUNTER" AS cycle_counter,
          "TIMERCEVRIM" AS cycle_time,
          "MENGAC" AS mengac,
          "ENJTIME" AS enjtime,
          "MALTIME" AS maltime,
          "SOGZAMAN" AS sogzaman,
          "MENGKAP" AS mengkap
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      ),

      latest AS (
        SELECT *, COUNT(*) OVER () AS total_cycle_count
        FROM filtered
        ORDER BY machine_date DESC, id DESC
        LIMIT ${query.limit}
      )

      SELECT
        id AS "cycleId",
        machine AS "machine",
        work_order_number AS "workOrderNumber",
        product_code AS "productCode",
        cast_code AS "castCode",
        machine_date AS "machineDate",
        cycle_counter AS "cycleCounter",
        cycle_time AS "cycleTime",
        mengac AS "mengac",
        enjtime AS "enjtime",
        maltime AS "maltime",
        sogzaman AS "sogzaman",
        mengkap AS "mengkap",
        total_cycle_count AS "totalCycleCount"
      FROM latest
      ORDER BY machine_date ASC, id ASC
    `;

    if (rows.length === 0) {
      return {
        totalCycleCount: 0,
        returnedCycleCount: 0,
        limit: query.limit,
        isTruncated: false,
        points: [],
      };
    }

    const totalCycleCount = this.toAggregateCount(
      rows[0].totalCycleCount,
      'totalCycleCount',
    );
    const points = rows.map((row) => this.mapAnalysisCycle(row));

    points.sort((left, right) => {
      const dateDifference =
        left.machineDate.getTime() - right.machineDate.getTime();
      return dateDifference !== 0
        ? dateDifference
        : Number(BigInt(left.cycleId) - BigInt(right.cycleId));
    });

    return {
      totalCycleCount,
      returnedCycleCount: points.length,
      limit: query.limit,
      isTruncated: totalCycleCount > points.length,
      points,
    };
  }

  async getAnalysisOutliers(
    query: AnalysisOutliersQueryDto,
  ): Promise<AnalysisOutliersResponse> {
    this.validateBoundedLimit(query.limit, 1000, 'limit');
    const normalizedFilters = normalizeAnalysisFilters(query);
    const conditions = [
      ...buildAnalysisSqlConditions(normalizedFilters),
      Prisma.sql`"TIMERCEVRIM" IS NOT NULL`,
      Prisma.sql`"TIMERCEVRIM"::numeric > 0`,
    ];
    const rows = await this.prisma.$queryRaw<AnalysisOutlierDatabaseRow[]>`
      WITH filtered AS (
        SELECT
          id,
          "MACHINE" AS machine,
          "ORDERNO" AS work_order_number,
          "PRODCODE" AS product_code,
          "CASTCODE" AS cast_code,
          "MACH_DATE" AS machine_date,
          "CEVRIMCOUNTER" AS cycle_counter,
          "TIMERCEVRIM"::double precision AS cycle_time,
          "MENGAC" AS mengac,
          "ENJTIME" AS enjtime,
          "MALTIME" AS maltime,
          "SOGZAMAN" AS sogzaman,
          "MENGKAP" AS mengkap
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      ),

      stats AS (
        SELECT
          COUNT(*) AS cycle_count,
          PERCENTILE_CONT(0.25)
            WITHIN GROUP (ORDER BY cycle_time) AS q1,
          PERCENTILE_CONT(0.75)
            WITHIN GROUP (ORDER BY cycle_time) AS q3
        FROM filtered
      ),

      fences AS (
        SELECT
          cycle_count,
          q1,
          q3,
          q1 - 1.5 * (q3 - q1) AS lower_fence,
          q3 + 1.5 * (q3 - q1) AS upper_fence
        FROM stats
      ),

      outlier_rows AS (
        SELECT
          filtered.*,
          CASE WHEN cycle_time < lower_fence THEN 'low' ELSE 'high' END
            AS outlier_direction,
          CASE
            WHEN cycle_time < lower_fence THEN lower_fence - cycle_time
            ELSE cycle_time - upper_fence
          END AS distance_from_fence
        FROM filtered
        CROSS JOIN fences
        WHERE cycle_time < lower_fence OR cycle_time > upper_fence
      ),

      outlier_totals AS (
        SELECT COUNT(*) AS outlier_count FROM outlier_rows
      ),

      ranked AS (
        SELECT *
        FROM outlier_rows
        ORDER BY distance_from_fence DESC, machine_date DESC, id DESC
        LIMIT ${query.limit}
      )

      SELECT
        fences.cycle_count AS "cycleCount",
        fences.q1 AS "q1",
        fences.q3 AS "q3",
        outlier_totals.outlier_count AS "outlierCount",
        ranked.id AS "cycleId",
        ranked.machine AS "machine",
        ranked.work_order_number AS "workOrderNumber",
        ranked.product_code AS "productCode",
        ranked.cast_code AS "castCode",
        ranked.machine_date AS "machineDate",
        ranked.cycle_counter AS "cycleCounter",
        ranked.cycle_time AS "cycleTime",
        ranked.mengac AS "mengac",
        ranked.enjtime AS "enjtime",
        ranked.maltime AS "maltime",
        ranked.sogzaman AS "sogzaman",
        ranked.mengkap AS "mengkap",
        ranked.outlier_direction AS "outlierDirection",
        ranked.distance_from_fence AS "distanceFromFence"
      FROM fences
      CROSS JOIN outlier_totals
      LEFT JOIN ranked ON true
      ORDER BY ranked.distance_from_fence DESC,
        ranked.machine_date DESC,
        ranked.id DESC
    `;

    const firstRow = rows[0];

    if (!firstRow) {
      return this.createEmptyAnalysisOutliers(query.limit);
    }

    const cycleCount = this.toAggregateCount(firstRow.cycleCount, 'cycleCount');
    const outlierCount = this.toAggregateCount(
      firstRow.outlierCount,
      'outlierCount',
    );

    if (cycleCount === 0) {
      return this.createEmptyAnalysisOutliers(query.limit);
    }

    const q1 = this.toFiniteAggregateNumber(firstRow.q1, 'q1');
    const q3 = this.toFiniteAggregateNumber(firstRow.q3, 'q3');
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    const outliers: AnalysisOutlierCycle[] = [];

    for (const row of rows) {
      if (row.cycleId === null || row.cycleId === undefined) {
        continue;
      }

      if (row.outlierDirection !== 'low' && row.outlierDirection !== 'high') {
        throw new TypeError('Invalid outlierDirection aggregate');
      }

      const distanceFromFence = this.toFiniteAggregateNumber(
        row.distanceFromFence,
        'distanceFromFence',
      );

      if (distanceFromFence <= 0) {
        throw new TypeError('Invalid distanceFromFence aggregate');
      }

      outliers.push({
        ...this.mapAnalysisCycle(row),
        outlierDirection: row.outlierDirection,
        distanceFromFence: Number(distanceFromFence.toFixed(3)),
      });
    }

    return {
      cycleCount,
      q1: Number(q1.toFixed(3)),
      q3: Number(q3.toFixed(3)),
      iqr: Number(iqr.toFixed(3)),
      lowerFence: Number(lowerFence.toFixed(3)),
      upperFence: Number(upperFence.toFixed(3)),
      outlierCount,
      outlierRate: Number(((outlierCount / cycleCount) * 100).toFixed(2)),
      returnedOutlierCount: outliers.length,
      limit: query.limit,
      isTruncated: outlierCount > outliers.length,
      outliers,
    };
  }

  async getAnalysisHistogram(
    query: AnalysisHistogramQueryDto,
  ): Promise<AnalysisHistogramResponse> {
    validateAnalysisHistogramConfiguration(query);

    const normalizedFilters = normalizeAnalysisFilters(query);
    const conditions = [
      ...buildAnalysisSqlConditions(normalizedFilters),
      Prisma.sql`"TIMERCEVRIM" IS NOT NULL`,
      Prisma.sql`"TIMERCEVRIM"::numeric > 0`,
    ];
    const rows = await this.prisma.$queryRaw<AnalysisHistogramDatabaseRow[]>`
      WITH filtered AS (
        SELECT "TIMERCEVRIM"::numeric AS cycle_time
        FROM production_cycles
        WHERE ${Prisma.join(conditions, ' AND ')}
      ),

      statistics AS (
        SELECT
          COUNT(*) AS total_cycle_count,
          MIN(cycle_time) AS minimum_cycle_time,
          MAX(cycle_time) AS maximum_cycle_time
        FROM filtered
      ),

      bucket_counts AS (
        SELECT
          CASE
            WHEN cycle_time >= ${query.maxValue}::numeric
              THEN ${query.maxValue}::numeric
            ELSE FLOOR(cycle_time / ${query.binSize}::numeric)
              * ${query.binSize}::numeric
          END AS lower_bound,
          cycle_time >= ${query.maxValue}::numeric AS is_overflow,
          COUNT(*) AS cycle_count
        FROM filtered
        GROUP BY lower_bound, is_overflow
      )

      SELECT
        statistics.total_cycle_count AS "totalCycleCount",
        statistics.minimum_cycle_time AS "minimumCycleTime",
        statistics.maximum_cycle_time AS "maximumCycleTime",
        bucket_counts.lower_bound AS "lowerBound",
        bucket_counts.cycle_count AS "cycleCount",
        bucket_counts.is_overflow AS "isOverflow"
      FROM statistics
      LEFT JOIN bucket_counts ON true
      ORDER BY bucket_counts.lower_bound ASC
    `;

    const firstRow = rows[0];

    if (!firstRow) {
      return this.createEmptyAnalysisHistogram(query.binSize, query.maxValue);
    }

    const totalCycleCount = this.toAggregateCount(
      firstRow.totalCycleCount,
      'totalCycleCount',
    );

    if (totalCycleCount === 0) {
      return this.createEmptyAnalysisHistogram(query.binSize, query.maxValue);
    }

    const unroundedMinimumCycleTime = this.toFiniteAggregateNumber(
      firstRow.minimumCycleTime,
      'minimumCycleTime',
    );
    const minimumCycleTime = Number(unroundedMinimumCycleTime.toFixed(3));
    const maximumCycleTime = this.toRequiredRoundedAggregate(
      firstRow.maximumCycleTime,
      'maximumCycleTime',
    );
    const regularCounts = new Map<number, number>();
    let overflowCount = 0;

    for (const row of rows) {
      if (
        row.lowerBound === null ||
        row.lowerBound === undefined ||
        row.cycleCount === null ||
        row.cycleCount === undefined
      ) {
        continue;
      }

      const lowerBound = this.toFiniteAggregateNumber(
        row.lowerBound,
        'lowerBound',
      );
      const cycleCount = this.toAggregateCount(row.cycleCount, 'cycleCount');

      if (row.isOverflow === true) {
        overflowCount += cycleCount;
      } else if (row.isOverflow === false) {
        regularCounts.set(lowerBound, cycleCount);
      } else {
        throw new TypeError('Invalid isOverflow aggregate');
      }
    }

    const bins: AnalysisHistogramBin[] = [];
    const firstRegularBound = Math.max(
      0,
      Math.floor(unroundedMinimumCycleTime / query.binSize) * query.binSize,
    );

    if (unroundedMinimumCycleTime < query.maxValue) {
      for (
        let lowerBound = firstRegularBound;
        lowerBound < query.maxValue;
        lowerBound += query.binSize
      ) {
        bins.push({
          lowerBound,
          upperBound: Math.min(lowerBound + query.binSize, query.maxValue),
          cycleCount: regularCounts.get(lowerBound) ?? 0,
          isOverflow: false,
        });
      }
    }

    bins.push({
      lowerBound: query.maxValue,
      upperBound: null,
      cycleCount: overflowCount,
      isOverflow: true,
    });

    const binnedCycleCount = bins.reduce((sum, bin) => sum + bin.cycleCount, 0);

    if (binnedCycleCount !== totalCycleCount) {
      throw new TypeError(
        'Histogram bin counts do not match totalCycleCount aggregate',
      );
    }

    return {
      binSize: query.binSize,
      maxValue: query.maxValue,
      totalCycleCount,
      minimumCycleTime,
      maximumCycleTime,
      bins,
    };
  }

  private createEmptyAnalysisHistogram(
    binSize: number,
    maxValue: number,
  ): AnalysisHistogramResponse {
    return {
      binSize,
      maxValue,
      totalCycleCount: 0,
      minimumCycleTime: null,
      maximumCycleTime: null,
      bins: [],
    };
  }

  private validateBoundedLimit(
    limit: number,
    maximum: number,
    field: string,
  ): void {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > maximum) {
      throw new BadRequestException(
        `${field} must be a positive integer no greater than ${maximum}`,
      );
    }
  }

  private mapAnalysisCycle(row: AnalysisCycleDatabaseRow): AnalysisCyclePoint {
    return {
      cycleId: this.toStableCycleId(row.cycleId),
      machine: this.toRequiredString(row.machine, 'machine'),
      workOrderNumber: this.toRequiredString(
        row.workOrderNumber,
        'workOrderNumber',
      ),
      productCode: this.toRequiredString(row.productCode, 'productCode'),
      castCode: this.toRequiredString(row.castCode, 'castCode'),
      machineDate: this.toRequiredAggregateDate(row.machineDate, 'machineDate'),
      cycleCounter: this.toSafeInteger(row.cycleCounter, 'cycleCounter'),
      cycleTime: this.toRequiredRoundedAggregate(row.cycleTime, 'cycleTime'),
      stages: {
        MENGAC: this.toRoundedAggregate(row.mengac, 'MENGAC'),
        ENJTIME: this.toRoundedAggregate(row.enjtime, 'ENJTIME'),
        MALTIME: this.toRoundedAggregate(row.maltime, 'MALTIME'),
        SOGZAMAN: this.toRoundedAggregate(row.sogzaman, 'SOGZAMAN'),
        MENGKAP: this.toRoundedAggregate(row.mengkap, 'MENGKAP'),
      },
    };
  }

  private toStableCycleId(value: unknown): string {
    if (typeof value === 'bigint' && value >= 0n) {
      return value.toString();
    }

    if (
      typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value >= 0
    ) {
      return value.toString();
    }

    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return value;
    }

    throw new TypeError('Invalid cycleId aggregate');
  }

  private toRequiredString(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw new TypeError(`Invalid ${field} aggregate`);
    }

    return value;
  }

  private toSafeInteger(value: unknown, field: string): number {
    const number = Number(value);

    if (!Number.isSafeInteger(number)) {
      throw new TypeError(`Invalid ${field} aggregate`);
    }

    return number;
  }

  private createEmptyAnalysisOutliers(limit: number): AnalysisOutliersResponse {
    return {
      cycleCount: 0,
      q1: null,
      q3: null,
      iqr: null,
      lowerFence: null,
      upperFence: null,
      outlierCount: 0,
      outlierRate: 0,
      returnedOutlierCount: 0,
      limit,
      isTruncated: false,
      outliers: [],
    };
  }

  private buildCompleteStageConditions(
    filters: NormalizedAnalysisFilters,
  ): Prisma.Sql[] {
    return [
      ...buildAnalysisSqlConditions(filters),
      Prisma.sql`"TIMERCEVRIM" IS NOT NULL`,
      Prisma.sql`"TIMERCEVRIM"::numeric > 0`,
      Prisma.sql`"MENGAC" IS NOT NULL`,
      Prisma.sql`"MENGAC"::numeric >= 0`,
      Prisma.sql`"ENJTIME" IS NOT NULL`,
      Prisma.sql`"ENJTIME"::numeric >= 0`,
      Prisma.sql`"MALTIME" IS NOT NULL`,
      Prisma.sql`"MALTIME"::numeric >= 0`,
      Prisma.sql`"SOGZAMAN" IS NOT NULL`,
      Prisma.sql`"SOGZAMAN"::numeric >= 0`,
      Prisma.sql`"MENGKAP" IS NOT NULL`,
      Prisma.sql`"MENGKAP"::numeric >= 0`,
    ];
  }

  private createEmptyAnalysisStagesSummary(): AnalysisStagesSummaryResponse {
    return {
      cycleCount: 0,
      averageCycleTime: null,
      medianCycleTime: null,
      stages: {
        MENGAC: { average: null, median: null },
        ENJTIME: { average: null, median: null },
        MALTIME: { average: null, median: null },
        SOGZAMAN: { average: null, median: null },
        MENGKAP: { average: null, median: null },
      },
      averageStageSum: null,
      stageSumDifference: null,
    };
  }

  private selectAnalysisTrendBucketSize(
    startDate: Date,
    endDate: Date,
  ): AnalysisTrendBucketSize {
    const durationMilliseconds = endDate.getTime() - startDate.getTime();
    const dayMilliseconds = 24 * 60 * 60 * 1000;

    if (durationMilliseconds <= 7 * dayMilliseconds) {
      return 'hour';
    }

    if (durationMilliseconds <= 45 * dayMilliseconds) {
      return 'day';
    }

    return 'week';
  }

  private createEmptyAnalysisSummary(): AnalysisSummaryResponse {
    return {
      cycleCount: 0,
      averageCycleTime: null,
      medianCycleTime: null,
      minimumCycleTime: null,
      maximumCycleTime: null,
      q1: null,
      q3: null,
      standardDeviation: null,
      outlierCount: 0,
      outlierRate: 0,
      machineCount: 0,
      productCount: 0,
      moldCount: 0,
      startDate: null,
      endDate: null,
    };
  }

  private toAggregateCount(value: unknown, field: string): number {
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0) {
      throw new TypeError(`Invalid ${field} aggregate`);
    }

    return number;
  }

  private toRoundedAggregate(value: unknown, field: string): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return Number(this.toFiniteAggregateNumber(value, field).toFixed(3));
  }

  private toFiniteAggregateNumber(value: unknown, field: string): number {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(`Invalid ${field} aggregate`);
    }

    return number;
  }

  private toRequiredRoundedAggregate(value: unknown, field: string): number {
    const number = this.toRoundedAggregate(value, field);

    if (number === null) {
      throw new TypeError(`Missing ${field} aggregate`);
    }

    return number;
  }

  private toAggregateDate(value: unknown, field: string): Date | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (!(value instanceof Date) && typeof value !== 'string') {
      throw new TypeError(`Invalid ${field} aggregate`);
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`Invalid ${field} aggregate`);
    }

    return date;
  }

  private toRequiredAggregateDate(value: unknown, field: string): Date {
    const date = this.toAggregateDate(value, field);

    if (date === null) {
      throw new TypeError(`Missing ${field} aggregate`);
    }

    return date;
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
      upperBound: unknown;
      cycleCount: bigint;
      isOverflow: boolean;
      totalCycleCount: bigint;
      minimumCycleTime: unknown;
      maximumCycleTime: unknown;
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

  async getBoxPlot(query: PerformanceQueryDto) {
    const { productCode, castCode, from, to } = query;

    const conditions: Prisma.Sql[] = [
      Prisma.sql`"PRODCODE" = ${productCode}`,
      Prisma.sql`"CASTCODE" = ${castCode}`,
    ];

    if (from) {
      conditions.push(Prisma.sql`"MACH_DATE" >= ${new Date(from)}`);
    }

    if (to) {
      conditions.push(Prisma.sql`"MACH_DATE" <= ${new Date(to)}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    type BoxPlotRow = {
      machine: string;
      cycleCount: bigint;
      averageCycleTime: unknown;
      actualMinimum: unknown;
      actualMaximum: unknown;
      q1: unknown;
      median: unknown;
      q3: unknown;
      iqr: unknown;
      lowerFence: unknown;
      upperFence: unknown;
      lowerWhisker: unknown;
      upperWhisker: unknown;
      outlierCount: bigint;
    };

    const rows = await this.prisma.$queryRaw<BoxPlotRow[]>(
      Prisma.sql`
      WITH filtered_cycles AS (
        SELECT
          "MACHINE" AS machine,
          "TIMERCEVRIM"::double precision AS cycle_time
        FROM production_cycles
        WHERE ${whereClause}
          AND "TIMERCEVRIM" IS NOT NULL
      ),

      quartiles AS (
        SELECT
          machine,
          COUNT(*) AS cycle_count,
          AVG(cycle_time) AS average_cycle_time,
          MIN(cycle_time) AS actual_minimum,
          MAX(cycle_time) AS actual_maximum,

          PERCENTILE_CONT(0.25)
            WITHIN GROUP (ORDER BY cycle_time) AS q1,

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (ORDER BY cycle_time) AS median,

          PERCENTILE_CONT(0.75)
            WITHIN GROUP (ORDER BY cycle_time) AS q3

        FROM filtered_cycles
        GROUP BY machine
      ),

      limits AS (
        SELECT
          *,
          q3 - q1 AS iqr,
          q1 - 1.5 * (q3 - q1) AS lower_fence,
          q3 + 1.5 * (q3 - q1) AS upper_fence
        FROM quartiles
      ),

      box_statistics AS (
        SELECT
          limits.machine,
          limits.cycle_count,
          limits.average_cycle_time,
          limits.actual_minimum,
          limits.actual_maximum,
          limits.q1,
          limits.median,
          limits.q3,
          limits.iqr,
          limits.lower_fence,
          limits.upper_fence,

          MIN(filtered_cycles.cycle_time)
            FILTER (
              WHERE filtered_cycles.cycle_time
                BETWEEN limits.lower_fence
                AND limits.upper_fence
            ) AS lower_whisker,

          MAX(filtered_cycles.cycle_time)
            FILTER (
              WHERE filtered_cycles.cycle_time
                BETWEEN limits.lower_fence
                AND limits.upper_fence
            ) AS upper_whisker,

          COUNT(*)
            FILTER (
              WHERE filtered_cycles.cycle_time
                < limits.lower_fence

              OR filtered_cycles.cycle_time
                > limits.upper_fence
            ) AS outlier_count

        FROM limits

        INNER JOIN filtered_cycles
          ON filtered_cycles.machine = limits.machine

        GROUP BY
          limits.machine,
          limits.cycle_count,
          limits.average_cycle_time,
          limits.actual_minimum,
          limits.actual_maximum,
          limits.q1,
          limits.median,
          limits.q3,
          limits.iqr,
          limits.lower_fence,
          limits.upper_fence
      )

      SELECT
        machine AS "machine",
        cycle_count AS "cycleCount",
        average_cycle_time AS "averageCycleTime",
        actual_minimum AS "actualMinimum",
        actual_maximum AS "actualMaximum",
        q1 AS "q1",
        median AS "median",
        q3 AS "q3",
        iqr AS "iqr",
        lower_fence AS "lowerFence",
        upper_fence AS "upperFence",
        lower_whisker AS "lowerWhisker",
        upper_whisker AS "upperWhisker",
        outlier_count AS "outlierCount"

      FROM box_statistics
      ORDER BY median ASC
    `,
    );

    const round = (value: unknown) => {
      return Number(Number(value).toFixed(3));
    };

    return {
      productCode,
      castCode,

      machines: rows.map((row) => {
        const cycleCount = Number(row.cycleCount);
        const outlierCount = Number(row.outlierCount);

        return {
          machine: row.machine,
          cycleCount,

          averageCycleTime: round(row.averageCycleTime),

          actualMinimum: round(row.actualMinimum),
          actualMaximum: round(row.actualMaximum),

          q1: round(row.q1),
          median: round(row.median),
          q3: round(row.q3),

          iqr: round(row.iqr),

          lowerFence: round(row.lowerFence),
          upperFence: round(row.upperFence),

          lowerWhisker: round(row.lowerWhisker),
          upperWhisker: round(row.upperWhisker),

          outlierCount,

          outlierRate: cycleCount
            ? Number(((outlierCount / cycleCount) * 100).toFixed(2))
            : 0,
        };
      }),
    };
  }

  async getStageComparison(query: PerformanceQueryDto) {
    const { productCode, castCode, from, to } = query;

    const conditions: Prisma.Sql[] = [
      Prisma.sql`"PRODCODE" = ${productCode}`,
      Prisma.sql`"CASTCODE" = ${castCode}`,
    ];

    if (from) {
      conditions.push(Prisma.sql`"MACH_DATE" >= ${new Date(from)}`);
    }

    if (to) {
      conditions.push(Prisma.sql`"MACH_DATE" <= ${new Date(to)}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    type StageComparisonRow = {
      machine: string;
      cycleCount: bigint;

      averageCycleTime: unknown;
      medianCycleTime: unknown;

      averageMengac: unknown;
      medianMengac: unknown;

      averageEnjtime: unknown;
      medianEnjtime: unknown;

      averageMaltime: unknown;
      medianMaltime: unknown;

      averageSogzaman: unknown;
      medianSogzaman: unknown;

      averageMengkap: unknown;
      medianMengkap: unknown;
    };

    const rows = await this.prisma.$queryRaw<StageComparisonRow[]>(
      Prisma.sql`
        SELECT
          "MACHINE" AS "machine",

          COUNT(*) AS "cycleCount",

          AVG(
            "TIMERCEVRIM"::double precision
          ) AS "averageCycleTime",

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (
              ORDER BY
                "TIMERCEVRIM"::double precision
            ) AS "medianCycleTime",

          AVG(
            "MENGAC"::double precision
          ) AS "averageMengac",

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (
              ORDER BY
                "MENGAC"::double precision
            ) AS "medianMengac",

          AVG(
            "ENJTIME"::double precision
          ) AS "averageEnjtime",

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (
              ORDER BY
                "ENJTIME"::double precision
            ) AS "medianEnjtime",

          AVG(
            "MALTIME"::double precision
          ) AS "averageMaltime",

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (
              ORDER BY
                "MALTIME"::double precision
            ) AS "medianMaltime",

          AVG(
            "SOGZAMAN"::double precision
          ) AS "averageSogzaman",

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (
              ORDER BY
                "SOGZAMAN"::double precision
            ) AS "medianSogzaman",

          AVG(
            "MENGKAP"::double precision
          ) AS "averageMengkap",

          PERCENTILE_CONT(0.5)
            WITHIN GROUP (
              ORDER BY
                "MENGKAP"::double precision
            ) AS "medianMengkap"

        FROM production_cycles

        WHERE ${whereClause}

        GROUP BY "MACHINE"

        ORDER BY "medianCycleTime" ASC
      `,
    );

    const round = (value: unknown) => {
      if (value === null || value === undefined) {
        return null;
      }

      return Number(Number(value).toFixed(3));
    };

    return {
      productCode,
      castCode,

      machines: rows.map((row) => {
        const averageMengac = round(row.averageMengac) ?? 0;

        const averageEnjtime = round(row.averageEnjtime) ?? 0;

        const averageMaltime = round(row.averageMaltime) ?? 0;

        const averageSogzaman = round(row.averageSogzaman) ?? 0;

        const averageMengkap = round(row.averageMengkap) ?? 0;

        const averageCycleTime = round(row.averageCycleTime) ?? 0;

        const averageStageSum = Number(
          (
            averageMengac +
            averageEnjtime +
            averageMaltime +
            averageSogzaman +
            averageMengkap
          ).toFixed(3),
        );

        return {
          machine: row.machine,
          cycleCount: Number(row.cycleCount),

          averageCycleTime,
          medianCycleTime: round(row.medianCycleTime),

          stages: {
            MENGAC: {
              average: averageMengac,
              median: round(row.medianMengac),
            },

            ENJTIME: {
              average: averageEnjtime,
              median: round(row.medianEnjtime),
            },

            MALTIME: {
              average: averageMaltime,
              median: round(row.medianMaltime),
            },

            SOGZAMAN: {
              average: averageSogzaman,
              median: round(row.medianSogzaman),
            },

            MENGKAP: {
              average: averageMengkap,
              median: round(row.medianMengkap),
            },
          },

          averageStageSum,

          stageSumDifference: Number(
            (averageStageSum - averageCycleTime).toFixed(3),
          ),
        };
      }),
    };
  }
}
