import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFiltersResponse } from './analytics-filters-response.type';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AnalysisHistogramQueryDto } from './dto/analysis-histogram-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { PerformanceQueryDto } from './dto/performance-query.dto';

type QueryRawMock = (
  ...args: [TemplateStringsArray, ...unknown[]]
) => Promise<unknown[]>;

class DecimalLike {
  constructor(private readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let queryRawMock: jest.MockedFunction<QueryRawMock>;

  beforeEach(async () => {
    queryRawMock = jest.fn<
      ReturnType<QueryRawMock>,
      Parameters<QueryRawMock>
    >();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: queryRawMock,
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getFilters', () => {
    it('returns all independent option arrays and dataset date boundaries', async () => {
      const response: AnalyticsFiltersResponse = {
        machines: ['Machine 01', 'Machine 02'],
        products: ['Product A', 'Product B'],
        molds: ['Mold 01', 'Mold 02'],
        workOrders: ['Order 001', 'Order 002'],
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-01-31T23:59:59.999Z'),
      };
      queryRawMock.mockResolvedValue([response]);

      await expect(service.getFilters()).resolves.toEqual(response);
    });

    it('uses one aggregate query with distinct ordered non-empty options', async () => {
      queryRawMock.mockResolvedValue([]);

      await service.getFilters();

      expect(queryRawMock).toHaveBeenCalledTimes(1);

      const [template] = queryRawMock.mock.calls[0];
      const sql = Array.from(template).join(' ');

      for (const column of ['MACHINE', 'PRODCODE', 'CASTCODE', 'ORDERNO']) {
        expect(sql).toContain(`DISTINCT "${column}"`);
        expect(sql).toContain(`ORDER BY "${column}"`);
        expect(sql).toContain(`"${column}" IS NOT NULL`);
        expect(sql).toContain(`"${column}" <> ''`);
      }

      expect(sql).toContain('MIN("MACH_DATE")');
      expect(sql).toContain('MAX("MACH_DATE")');
      expect(sql).toContain('FROM production_cycles');
      expect(sql).not.toContain('WHERE "PRODCODE" =');
      expect(sql).not.toContain('HAVING');
    });

    it('returns empty arrays and null boundaries for an empty table', async () => {
      queryRawMock.mockResolvedValue([
        {
          machines: [],
          products: [],
          molds: [],
          workOrders: [],
          startDate: null,
          endDate: null,
        },
      ]);

      await expect(service.getFilters()).resolves.toEqual({
        machines: [],
        products: [],
        molds: [],
        workOrders: [],
        startDate: null,
        endDate: null,
      });
    });
  });

  describe('getAnalysisSummary', () => {
    const emptyResponse = {
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

    function getAppliedConditions(): Prisma.Sql {
      const [, conditions] = queryRawMock.mock.calls[0];

      if (!(conditions instanceof Prisma.Sql)) {
        throw new TypeError('Expected the query conditions to be Prisma.Sql');
      }

      return conditions;
    }

    beforeEach(() => {
      queryRawMock.mockResolvedValue([]);
    });

    it('uses only fixed valid-cycle conditions for empty filters', async () => {
      await expect(service.getAnalysisSummary({})).resolves.toEqual(
        emptyResponse,
      );

      const conditions = getAppliedConditions();

      expect(conditions.sql).toBe(
        '"TIMERCEVRIM" IS NOT NULL AND "TIMERCEVRIM"::numeric > 0',
      );
      expect(conditions.values).toEqual([]);
    });

    it.each([
      ['productCode', 'Product A', '"PRODCODE" = ?'],
      ['castCode', 'Mold 01', '"CASTCODE" = ?'],
      ['machine', 'Machine 03', '"MACHINE" = ?'],
    ] as const)(
      'applies %s independently as a parameter',
      async (field, value, expectedCondition) => {
        await service.getAnalysisSummary({ [field]: value });

        const conditions = getAppliedConditions();

        expect(conditions.sql).toContain(expectedCondition);
        expect(conditions.values).toEqual([value]);
      },
    );

    it('normalizes date-only filters to inclusive UTC boundaries', async () => {
      await service.getAnalysisSummary({
        from: '2026-07-24',
        to: '2026-07-24',
      });

      const conditions = getAppliedConditions();

      expect(conditions.sql).toContain('"MACH_DATE" >= ?');
      expect(conditions.sql).toContain('"MACH_DATE" <= ?');
      expect(conditions.values).toEqual([
        new Date('2026-07-24T00:00:00.000Z'),
        new Date('2026-07-24T23:59:59.999Z'),
      ]);
    });

    it('applies a complete filter with AND semantics', async () => {
      await service.getAnalysisSummary({
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
      });

      const conditions = getAppliedConditions();

      expect(conditions.sql).toBe(
        '"PRODCODE" = ? AND "CASTCODE" = ? AND "MACHINE" = ? AND "MACH_DATE" >= ? AND "MACH_DATE" <= ? AND "TIMERCEVRIM" IS NOT NULL AND "TIMERCEVRIM"::numeric > 0',
      );
      expect(conditions.values).toEqual([
        'Product A',
        'Mold 01',
        'Machine 03',
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-31T23:59:59.999Z'),
      ]);
    });

    it('keeps SQL-like identifiers out of query text', async () => {
      const identifier = `Product' OR 1=1 --`;

      await service.getAnalysisSummary({ productCode: identifier });

      const [template] = queryRawMock.mock.calls[0];
      const queryText = Array.from(template).join(' ');
      const conditions = getAppliedConditions();

      expect(queryText).not.toContain(identifier);
      expect(conditions.sql).not.toContain(identifier);
      expect(conditions.values).toEqual([identifier]);
    });

    it('maps and rounds database aggregate representations', async () => {
      queryRawMock.mockResolvedValue([
        {
          cycleCount: 12n,
          averageCycleTime: '12.34567',
          medianCycleTime: new DecimalLike('12.23456'),
          minimumCycleTime: '9.87654',
          maximumCycleTime: new DecimalLike('18.76543'),
          q1: '11.11149',
          q3: new DecimalLike('14.44451'),
          standardDeviation: '2.34567',
          outlierCount: '2',
          machineCount: 3n,
          productCount: '2',
          moldCount: new DecimalLike('4'),
          startDate: '2026-07-01T01:02:03.004Z',
          endDate: new Date('2026-07-31T20:30:40.500Z'),
        },
      ]);

      await expect(service.getAnalysisSummary({})).resolves.toEqual({
        cycleCount: 12,
        averageCycleTime: 12.346,
        medianCycleTime: 12.235,
        minimumCycleTime: 9.877,
        maximumCycleTime: 18.765,
        q1: 11.111,
        q3: 14.445,
        standardDeviation: 2.346,
        outlierCount: 2,
        outlierRate: 16.67,
        machineCount: 3,
        productCount: 2,
        moldCount: 4,
        startDate: new Date('2026-07-01T01:02:03.004Z'),
        endDate: new Date('2026-07-31T20:30:40.500Z'),
      });
    });

    it('returns the exact empty contract for an empty aggregate population', async () => {
      queryRawMock.mockResolvedValue([
        {
          cycleCount: 0n,
          averageCycleTime: null,
          medianCycleTime: null,
          minimumCycleTime: null,
          maximumCycleTime: null,
          q1: null,
          q3: null,
          standardDeviation: null,
          outlierCount: 0n,
          machineCount: 0n,
          productCount: 0n,
          moldCount: 0n,
          startDate: null,
          endDate: null,
        },
      ]);

      await expect(service.getAnalysisSummary({})).resolves.toEqual(
        emptyResponse,
      );
    });

    it('rejects reversed dates before querying Prisma', async () => {
      await expect(
        service.getAnalysisSummary({
          from: '2026-07-25',
          to: '2026-07-24',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it('propagates database errors', async () => {
      const databaseError = new Error('database unavailable');
      queryRawMock.mockRejectedValue(databaseError);

      await expect(service.getAnalysisSummary({})).rejects.toBe(databaseError);
    });
  });

  describe('getAnalysisTrend', () => {
    const trendRow = {
      bucketStart: new Date('2026-07-01T00:00:00.000Z'),
      cycleCount: 10n,
      averageCycleTime: '12.5',
      medianCycleTime: '12.25',
      minimumCycleTime: '10',
      maximumCycleTime: '16',
    };

    function getConditions(callIndex: number): Prisma.Sql {
      const conditions = queryRawMock.mock.calls[callIndex]
        .slice(1)
        .find((value) => value instanceof Prisma.Sql);

      if (!(conditions instanceof Prisma.Sql)) {
        throw new TypeError('Expected query conditions to be Prisma.Sql');
      }

      return conditions;
    }

    function getQueryText(callIndex: number): string {
      const [template] = queryRawMock.mock.calls[callIndex];
      return Array.from(template).join(' ');
    }

    function getBucketParameter(callIndex: number): string {
      const bucket = queryRawMock.mock.calls[callIndex]
        .slice(1)
        .find((value) => typeof value === 'string');

      if (typeof bucket !== 'string') {
        throw new TypeError('Expected a trend bucket parameter');
      }

      return bucket;
    }

    it('resolves empty-filter boundaries from the valid-cycle population', async () => {
      queryRawMock
        .mockResolvedValueOnce([
          {
            startDate: new Date('2026-07-01T00:00:00.000Z'),
            endDate: new Date('2026-07-31T23:59:59.999Z'),
          },
        ])
        .mockResolvedValueOnce([]);

      await expect(service.getAnalysisTrend({})).resolves.toEqual({
        bucketSize: null,
        points: [],
      });

      expect(queryRawMock).toHaveBeenCalledTimes(2);
      expect(getConditions(0).sql).toBe(
        '"TIMERCEVRIM" IS NOT NULL AND "TIMERCEVRIM"::numeric > 0',
      );
      expect(getConditions(0).values).toEqual([]);
      expect(getConditions(1).sql).toBe(getConditions(0).sql);
    });

    it.each([
      ['productCode', 'Product A', '"PRODCODE" = ?'],
      ['castCode', 'Mold 01', '"CASTCODE" = ?'],
      ['machine', 'Machine 03', '"MACHINE" = ?'],
    ] as const)(
      'applies %s independently to boundary resolution',
      async (field, value, expectedSql) => {
        queryRawMock.mockResolvedValueOnce([
          { startDate: null, endDate: null },
        ]);

        await service.getAnalysisTrend({ [field]: value });

        const conditions = getConditions(0);
        expect(conditions.sql).toContain(expectedSql);
        expect(conditions.values).toEqual([value]);
      },
    );

    it('uses normalized date-only filters without a boundary query', async () => {
      queryRawMock.mockResolvedValueOnce([trendRow]);

      await service.getAnalysisTrend({
        from: '2026-07-01',
        to: '2026-07-07',
      });

      expect(queryRawMock).toHaveBeenCalledTimes(1);
      expect(getConditions(0).values).toEqual([
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-07T23:59:59.999Z'),
      ]);
      expect(getBucketParameter(0)).toBe('hour');
    });

    it('applies complete filters with AND semantics', async () => {
      queryRawMock.mockResolvedValueOnce([trendRow]);

      await service.getAnalysisTrend({
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
      });

      const conditions = getConditions(0);
      expect(conditions.sql).toBe(
        '"PRODCODE" = ? AND "CASTCODE" = ? AND "MACHINE" = ? AND "MACH_DATE" >= ? AND "MACH_DATE" <= ? AND "TIMERCEVRIM" IS NOT NULL AND "TIMERCEVRIM"::numeric > 0',
      );
      expect(conditions.values).toEqual([
        'Product A',
        'Mold 01',
        'Machine 03',
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-31T23:59:59.999Z'),
      ]);
    });

    it('keeps SQL-like identifiers in parameters', async () => {
      const identifier = `Product' OR 1=1 --`;
      queryRawMock.mockResolvedValueOnce([{ startDate: null, endDate: null }]);

      await service.getAnalysisTrend({ productCode: identifier });

      const conditions = getConditions(0);
      expect(getQueryText(0)).not.toContain(identifier);
      expect(conditions.sql).not.toContain(identifier);
      expect(conditions.values).toEqual([identifier]);
    });

    it.each([
      ['hour', '2026-07-01T00:00:00.000Z', '2026-07-08T00:00:00.000Z'],
      ['day', '2026-07-01T00:00:00.000Z', '2026-07-08T00:00:00.001Z'],
      ['day', '2026-07-01T00:00:00.000Z', '2026-08-15T00:00:00.000Z'],
      ['week', '2026-07-01T00:00:00.000Z', '2026-08-15T00:00:00.001Z'],
    ] as const)(
      'selects %s for the requested effective range',
      async (expectedBucket, from, to) => {
        queryRawMock.mockResolvedValueOnce([trendRow]);

        const response = await service.getAnalysisTrend({ from, to });

        expect(response.bucketSize).toBe(expectedBucket);
        expect(getBucketParameter(0)).toBe(expectedBucket);
      },
    );

    it('resolves a missing boundary from the same filtered population', async () => {
      queryRawMock
        .mockResolvedValueOnce([
          {
            startDate: new Date('2026-07-20T00:00:00.000Z'),
            endDate: new Date('2026-07-24T12:00:00.000Z'),
          },
        ])
        .mockResolvedValueOnce([trendRow]);

      const response = await service.getAnalysisTrend({
        machine: 'Machine 03',
        to: '2026-07-24',
      });

      expect(response.bucketSize).toBe('hour');
      expect(queryRawMock).toHaveBeenCalledTimes(2);
      expect(getConditions(0).values).toEqual([
        'Machine 03',
        new Date('2026-07-24T23:59:59.999Z'),
      ]);
      expect(getConditions(1).values).toEqual(getConditions(0).values);
    });

    it.each(['hour', 'day', 'week'] as const)(
      'uses explicit UTC %s grouping with ascending SQL order',
      async (bucket) => {
        const ranges = {
          hour: ['2026-07-01', '2026-07-07'],
          day: ['2026-07-01', '2026-07-31'],
          week: ['2026-07-01', '2026-08-31'],
        } as const;
        queryRawMock.mockResolvedValueOnce([trendRow]);

        await service.getAnalysisTrend({
          from: ranges[bucket][0],
          to: ranges[bucket][1],
        });

        const queryText = getQueryText(0);
        expect(getBucketParameter(0)).toBe(bucket);
        expect(queryText).toContain("AT TIME ZONE 'UTC'");
        expect(queryText).toContain('GROUP BY bucket_start');
        expect(queryText).toContain('ORDER BY bucket_start ASC');
      },
    );

    it('normalizes, rounds, and sorts aggregate points ascending', async () => {
      queryRawMock.mockResolvedValueOnce([
        {
          bucketStart: '2026-07-02T00:00:00.000Z',
          cycleCount: '4',
          averageCycleTime: new DecimalLike('14.44451'),
          medianCycleTime: '14.11149',
          minimumCycleTime: '10.55555',
          maximumCycleTime: new DecimalLike('20.99999'),
        },
        {
          bucketStart: new Date('2026-07-01T00:00:00.000Z'),
          cycleCount: 3n,
          averageCycleTime: '12.34567',
          medianCycleTime: new DecimalLike('12.23456'),
          minimumCycleTime: '9.87654',
          maximumCycleTime: '18.76543',
        },
      ]);

      await expect(
        service.getAnalysisTrend({
          from: '2026-07-01',
          to: '2026-07-07',
        }),
      ).resolves.toEqual({
        bucketSize: 'hour',
        points: [
          {
            bucketStart: new Date('2026-07-01T00:00:00.000Z'),
            cycleCount: 3,
            averageCycleTime: 12.346,
            medianCycleTime: 12.235,
            minimumCycleTime: 9.877,
            maximumCycleTime: 18.765,
          },
          {
            bucketStart: new Date('2026-07-02T00:00:00.000Z'),
            cycleCount: 4,
            averageCycleTime: 14.445,
            medianCycleTime: 14.111,
            minimumCycleTime: 10.556,
            maximumCycleTime: 21,
          },
        ],
      });
    });

    it('returns the exact empty response for an empty population', async () => {
      queryRawMock.mockResolvedValueOnce([{ startDate: null, endDate: null }]);

      await expect(
        service.getAnalysisTrend({ machine: 'Missing' }),
      ).resolves.toEqual({
        bucketSize: null,
        points: [],
      });
      expect(queryRawMock).toHaveBeenCalledTimes(1);
    });

    it('rejects reversed dates before querying Prisma', async () => {
      await expect(
        service.getAnalysisTrend({
          from: '2026-07-25',
          to: '2026-07-24',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it('propagates database errors', async () => {
      const databaseError = new Error('database unavailable');
      queryRawMock.mockRejectedValueOnce(databaseError);

      await expect(
        service.getAnalysisTrend({
          from: '2026-07-01',
          to: '2026-07-07',
        }),
      ).rejects.toBe(databaseError);
    });
  });

  describe('getAnalysisHistogram', () => {
    function createQuery(
      overrides: Partial<AnalysisHistogramQueryDto> = {},
    ): AnalysisHistogramQueryDto {
      return Object.assign(new AnalysisHistogramQueryDto(), overrides);
    }

    function getConditions(): Prisma.Sql {
      const conditions = queryRawMock.mock.calls[0]
        .slice(1)
        .find((value) => value instanceof Prisma.Sql);

      if (!(conditions instanceof Prisma.Sql)) {
        throw new TypeError('Expected histogram conditions to be Prisma.Sql');
      }

      return conditions;
    }

    function histogramRow(
      overrides: Partial<Record<string, unknown>> = {},
    ): Record<string, unknown> {
      return {
        totalCycleCount: 3n,
        minimumCycleTime: '15.44',
        maximumCycleTime: new DecimalLike('60'),
        lowerBound: '15',
        cycleCount: 2n,
        isOverflow: false,
        ...overrides,
      };
    }

    it('uses default configuration and fixed population for empty filters', async () => {
      queryRawMock.mockResolvedValue([
        histogramRow(),
        histogramRow({ lowerBound: '60', cycleCount: 1n, isOverflow: true }),
      ]);

      const response = await service.getAnalysisHistogram(createQuery());

      expect(response.binSize).toBe(5);
      expect(response.maxValue).toBe(60);
      expect(getConditions().sql).toBe(
        '"TIMERCEVRIM" IS NOT NULL AND "TIMERCEVRIM"::numeric > 0',
      );
      expect(getConditions().values).toEqual([]);
    });

    it.each([
      ['productCode', 'Product A', '"PRODCODE" = ?'],
      ['castCode', 'Mold 01', '"CASTCODE" = ?'],
      ['machine', 'Machine 03', '"MACHINE" = ?'],
    ] as const)(
      'applies %s independently',
      async (field, value, expectedSql) => {
        queryRawMock.mockResolvedValue([]);

        await service.getAnalysisHistogram(createQuery({ [field]: value }));

        expect(getConditions().sql).toContain(expectedSql);
        expect(getConditions().values).toEqual([value]);
      },
    );

    it('applies date-only and complete filters with AND semantics', async () => {
      queryRawMock.mockResolvedValue([]);

      await service.getAnalysisHistogram(
        createQuery({
          productCode: 'Product A',
          castCode: 'Mold 01',
          machine: 'Machine 03',
          from: '2026-07-01',
          to: '2026-07-31',
          binSize: 10,
          maxValue: 100,
        }),
      );

      expect(getConditions().sql).toBe(
        '"PRODCODE" = ? AND "CASTCODE" = ? AND "MACHINE" = ? AND "MACH_DATE" >= ? AND "MACH_DATE" <= ? AND "TIMERCEVRIM" IS NOT NULL AND "TIMERCEVRIM"::numeric > 0',
      );
      expect(getConditions().values).toEqual([
        'Product A',
        'Mold 01',
        'Machine 03',
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-31T23:59:59.999Z'),
      ]);
      expect(queryRawMock.mock.calls[0].slice(1)).toEqual(
        expect.arrayContaining([10, 100]),
      );
    });

    it('keeps SQL-like identifiers in parameters', async () => {
      const identifier = `Product' OR 1=1 --`;
      queryRawMock.mockResolvedValue([]);

      await service.getAnalysisHistogram(
        createQuery({ productCode: identifier }),
      );

      const [template] = queryRawMock.mock.calls[0];
      expect(Array.from(template).join(' ')).not.toContain(identifier);
      expect(getConditions().sql).not.toContain(identifier);
      expect(getConditions().values).toEqual([identifier]);
    });

    it('starts at floor(minimum/binSize) and includes zero-count bins', async () => {
      queryRawMock.mockResolvedValue([
        histogramRow({
          totalCycleCount: '2',
          minimumCycleTime: '14.41',
          maximumCycleTime: '21',
          lowerBound: '10',
          cycleCount: '1',
        }),
        histogramRow({
          totalCycleCount: '2',
          minimumCycleTime: '14.41',
          maximumCycleTime: '21',
          lowerBound: '20',
          cycleCount: '1',
        }),
      ]);

      const response = await service.getAnalysisHistogram(
        createQuery({ maxValue: 30 }),
      );

      expect(response.bins).toEqual([
        { lowerBound: 10, upperBound: 15, cycleCount: 1, isOverflow: false },
        { lowerBound: 15, upperBound: 20, cycleCount: 0, isOverflow: false },
        { lowerBound: 20, upperBound: 25, cycleCount: 1, isOverflow: false },
        { lowerBound: 25, upperBound: 30, cycleCount: 0, isOverflow: false },
        { lowerBound: 30, upperBound: null, cycleCount: 0, isOverflow: true },
      ]);
    });

    it('calculates the first bin from the unrounded minimum', async () => {
      queryRawMock.mockResolvedValue([
        histogramRow({
          totalCycleCount: 1n,
          minimumCycleTime: '14.9996',
          maximumCycleTime: '14.9996',
          lowerBound: '10',
          cycleCount: 1n,
        }),
      ]);

      const response = await service.getAnalysisHistogram(
        createQuery({ maxValue: 20 }),
      );

      expect(response.minimumCycleTime).toBe(15);
      expect(response.bins[0]).toEqual({
        lowerBound: 10,
        upperBound: 15,
        cycleCount: 1,
        isOverflow: false,
      });
    });

    it('truncates the final regular bin and assigns maxValue to overflow', async () => {
      queryRawMock.mockResolvedValue([
        histogramRow({
          minimumCycleTime: '14.41',
          maximumCycleTime: '20',
          lowerBound: '12',
          cycleCount: '1',
        }),
        histogramRow({
          minimumCycleTime: '14.41',
          maximumCycleTime: '20',
          lowerBound: '18',
          cycleCount: '1',
        }),
        histogramRow({
          minimumCycleTime: '14.41',
          maximumCycleTime: '20',
          lowerBound: '20',
          cycleCount: '1',
          isOverflow: true,
        }),
      ]);

      const response = await service.getAnalysisHistogram(
        createQuery({ binSize: 6, maxValue: 20 }),
      );

      expect(response.bins).toEqual([
        { lowerBound: 12, upperBound: 18, cycleCount: 1, isOverflow: false },
        { lowerBound: 18, upperBound: 20, cycleCount: 1, isOverflow: false },
        { lowerBound: 20, upperBound: null, cycleCount: 1, isOverflow: true },
      ]);
      expect(response.bins.reduce((sum, bin) => sum + bin.cycleCount, 0)).toBe(
        response.totalCycleCount,
      );
      expect(Array.from(queryRawMock.mock.calls[0][0]).join(' ')).toContain(
        'cycle_time >= ',
      );
    });

    it('returns only overflow for an all-overflow population', async () => {
      queryRawMock.mockResolvedValue([
        histogramRow({
          totalCycleCount: 2n,
          minimumCycleTime: '60',
          maximumCycleTime: new DecimalLike('75.1234'),
          lowerBound: '60',
          cycleCount: '2',
          isOverflow: true,
        }),
      ]);

      await expect(
        service.getAnalysisHistogram(createQuery()),
      ).resolves.toEqual({
        binSize: 5,
        maxValue: 60,
        totalCycleCount: 2,
        minimumCycleTime: 60,
        maximumCycleTime: 75.123,
        bins: [
          {
            lowerBound: 60,
            upperBound: null,
            cycleCount: 2,
            isOverflow: true,
          },
        ],
      });
    });

    it('returns the exact empty contract with effective custom parameters', async () => {
      queryRawMock.mockResolvedValue([
        histogramRow({
          totalCycleCount: 0n,
          minimumCycleTime: null,
          maximumCycleTime: null,
          lowerBound: null,
          cycleCount: null,
          isOverflow: null,
        }),
      ]);

      await expect(
        service.getAnalysisHistogram(createQuery({ binSize: 4, maxValue: 80 })),
      ).resolves.toEqual({
        binSize: 4,
        maxValue: 80,
        totalCycleCount: 0,
        minimumCycleTime: null,
        maximumCycleTime: null,
        bins: [],
      });
    });

    it.each([
      { binSize: 10, maxValue: 9 },
      { binSize: 1, maxValue: 201 },
    ])('rejects invalid configuration before Prisma', async (configuration) => {
      await expect(
        service.getAnalysisHistogram(createQuery(configuration)),
      ).rejects.toThrow(BadRequestException);
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it('rejects reversed dates before Prisma', async () => {
      await expect(
        service.getAnalysisHistogram(
          createQuery({ from: '2026-07-25', to: '2026-07-24' }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it('propagates database errors', async () => {
      const error = new Error('database unavailable');
      queryRawMock.mockRejectedValue(error);

      await expect(service.getAnalysisHistogram(createQuery())).rejects.toBe(
        error,
      );
    });
  });

  describe('analysis stages', () => {
    const emptySummary = {
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

    function getConditions(callIndex = 0): Prisma.Sql {
      const conditions = queryRawMock.mock.calls[callIndex]
        .slice(1)
        .find((value) => value instanceof Prisma.Sql);

      if (!(conditions instanceof Prisma.Sql)) {
        throw new TypeError('Expected stage conditions to be Prisma.Sql');
      }

      return conditions;
    }

    function getQueryText(callIndex = 0): string {
      return Array.from(queryRawMock.mock.calls[callIndex][0]).join(' ');
    }

    function summaryRow(overrides: Record<string, unknown> = {}) {
      return {
        cycleCount: 2n,
        averageCycleTime: '10.0004',
        medianCycleTime: '10.1',
        averageMengac: '1.1114',
        medianMengac: '1.1',
        averageEnjtime: new DecimalLike('2.2224'),
        medianEnjtime: '2.2',
        averageMaltime: '2.3334',
        medianMaltime: '2.3',
        averageSogzaman: '3.4444',
        medianSogzaman: '3.4',
        averageMengkap: '1.5554',
        medianMengkap: '1.5',
        ...overrides,
      };
    }

    describe('getAnalysisStagesSummary', () => {
      it.each([
        [{}, []],
        [{ productCode: 'Product A' }, ['Product A']],
        [{ castCode: 'Mold 01' }, ['Mold 01']],
        [{ machine: 'Machine 03' }, ['Machine 03']],
        [
          { from: '2026-07-01', to: '2026-07-02' },
          [
            new Date('2026-07-01T00:00:00.000Z'),
            new Date('2026-07-02T23:59:59.999Z'),
          ],
        ],
      ] as const)(
        'supports independent filters %#',
        async (filters, values) => {
          queryRawMock.mockResolvedValue([]);

          await expect(
            service.getAnalysisStagesSummary(filters),
          ).resolves.toEqual(emptySummary);
          expect(getConditions().values).toEqual(values);
        },
      );

      it('applies complete filters and every complete-stage condition', async () => {
        queryRawMock.mockResolvedValue([]);

        await service.getAnalysisStagesSummary({
          productCode: 'Product A',
          castCode: 'Mold 01',
          machine: 'Machine 03',
          from: '2026-07-01',
          to: '2026-07-31',
        });

        const conditions = getConditions();
        expect(conditions.values).toEqual([
          'Product A',
          'Mold 01',
          'Machine 03',
          new Date('2026-07-01T00:00:00.000Z'),
          new Date('2026-07-31T23:59:59.999Z'),
        ]);
        for (const column of [
          'TIMERCEVRIM',
          'MENGAC',
          'ENJTIME',
          'MALTIME',
          'SOGZAMAN',
          'MENGKAP',
        ]) {
          expect(conditions.sql).toContain(`"${column}" IS NOT NULL`);
        }
        expect(conditions.sql).toContain('"TIMERCEVRIM"::numeric > 0');
        for (const stage of [
          'MENGAC',
          'ENJTIME',
          'MALTIME',
          'SOGZAMAN',
          'MENGKAP',
        ]) {
          expect(conditions.sql).toContain(`"${stage}"::numeric >= 0`);
        }
      });

      it('keeps SQL-like values parameterized', async () => {
        const identifier = `Product' OR 1=1 --`;
        queryRawMock.mockResolvedValue([]);

        await service.getAnalysisStagesSummary({ productCode: identifier });

        expect(getQueryText()).not.toContain(identifier);
        expect(getConditions().sql).not.toContain(identifier);
        expect(getConditions().values).toEqual([identifier]);
      });

      it.each([
        ['positive', '10.0004', 0.667],
        ['negative', '11.0004', -0.333],
      ] as const)(
        'calculates a %s signed difference from unrounded averages',
        async (_case, averageCycleTime, expectedDifference) => {
          queryRawMock.mockResolvedValue([summaryRow({ averageCycleTime })]);

          const response = await service.getAnalysisStagesSummary({});

          expect(response.averageCycleTime).toBe(
            Number(Number(averageCycleTime).toFixed(3)),
          );
          expect(response.averageStageSum).toBe(10.667);
          expect(response.stageSumDifference).toBe(expectedDifference);
          expect(response.stages.MENGAC).toEqual({
            average: 1.111,
            median: 1.1,
          });
          expect(response.cycleCount).toBe(2);
        },
      );

      it('returns the exact empty summary', async () => {
        queryRawMock.mockResolvedValue([
          summaryRow({
            cycleCount: 0n,
            averageCycleTime: null,
            medianCycleTime: null,
          }),
        ]);

        await expect(service.getAnalysisStagesSummary({})).resolves.toEqual(
          emptySummary,
        );
      });

      it('rejects reversed dates before Prisma and propagates database errors', async () => {
        await expect(
          service.getAnalysisStagesSummary({
            from: '2026-07-25',
            to: '2026-07-24',
          }),
        ).rejects.toThrow(BadRequestException);
        expect(queryRawMock).not.toHaveBeenCalled();

        const error = new Error('database unavailable');
        queryRawMock.mockRejectedValue(error);
        await expect(service.getAnalysisStagesSummary({})).rejects.toBe(error);
      });
    });

    describe('getAnalysisStagesTrend', () => {
      const trendRow = {
        bucketStart: new Date('2026-07-01T00:00:00.000Z'),
        cycleCount: 2n,
        averageCycleTime: '10.0004',
        averageMengac: '1.1114',
        averageEnjtime: '2.2224',
        averageMaltime: '2.3334',
        averageSogzaman: '3.4444',
        averageMengkap: '1.5554',
      };

      it.each([
        [{}, []],
        [{ productCode: 'Product A' }, ['Product A']],
        [{ castCode: 'Mold 01' }, ['Mold 01']],
        [{ machine: 'Machine 03' }, ['Machine 03']],
      ] as const)(
        'resolves filtered boundaries %#',
        async (filters, values) => {
          queryRawMock.mockResolvedValueOnce([
            { startDate: null, endDate: null },
          ]);

          await expect(
            service.getAnalysisStagesTrend(filters),
          ).resolves.toEqual({
            bucketSize: null,
            points: [],
          });
          expect(getConditions(0).values).toEqual(values);
          expect(getConditions(0).sql).toContain('"MENGKAP"::numeric >= 0');
        },
      );

      it.each([
        ['hour', '2026-07-01T00:00:00.000Z', '2026-07-08T00:00:00.000Z'],
        ['day', '2026-07-01T00:00:00.000Z', '2026-07-08T00:00:00.001Z'],
        ['day', '2026-07-01T00:00:00.000Z', '2026-08-15T00:00:00.000Z'],
        ['week', '2026-07-01T00:00:00.000Z', '2026-08-15T00:00:00.001Z'],
      ] as const)(
        'reuses the %s threshold behavior',
        async (bucket, from, to) => {
          queryRawMock.mockResolvedValueOnce([trendRow]);

          const response = await service.getAnalysisStagesTrend({ from, to });

          expect(response.bucketSize).toBe(bucket);
          expect(queryRawMock).toHaveBeenCalledTimes(1);
          expect(queryRawMock.mock.calls[0]).toContain(bucket);
        },
      );

      it('uses the same complete-stage population for boundary and grouped queries', async () => {
        queryRawMock
          .mockResolvedValueOnce([
            {
              startDate: new Date('2026-07-20T00:00:00.000Z'),
              endDate: new Date('2026-07-24T00:00:00.000Z'),
            },
          ])
          .mockResolvedValueOnce([trendRow]);

        await service.getAnalysisStagesTrend({ machine: 'Machine 03' });

        expect(queryRawMock).toHaveBeenCalledTimes(2);
        expect(getConditions(0).sql).toBe(getConditions(1).sql);
        expect(getConditions(0).values).toEqual(['Machine 03']);
        expect(getQueryText(1)).toContain("AT TIME ZONE 'UTC'");
        expect(getQueryText(1)).toContain('ORDER BY bucket_start ASC');
      });

      it('normalizes unrounded stage averages, preserves signs, and sorts points', async () => {
        queryRawMock.mockResolvedValueOnce([
          { ...trendRow, bucketStart: '2026-07-02T00:00:00.000Z' },
          {
            ...trendRow,
            bucketStart: '2026-07-01T00:00:00.000Z',
            averageCycleTime: '11.0004',
          },
        ]);

        const response = await service.getAnalysisStagesTrend({
          from: '2026-07-01',
          to: '2026-07-07',
        });

        expect(
          response.points.map((point) => point.bucketStart.toISOString()),
        ).toEqual(['2026-07-01T00:00:00.000Z', '2026-07-02T00:00:00.000Z']);
        expect(response.points[0].stageSumDifference).toBe(-0.333);
        expect(response.points[1].stageSumDifference).toBe(0.667);
        expect(response.points[0].averageStageSum).toBe(10.667);
        expect(response.points[0].stages.MENGAC).toBe(1.111);
      });

      it('returns an exact empty trend and rejects reversed dates before Prisma', async () => {
        queryRawMock.mockResolvedValueOnce([
          { startDate: null, endDate: null },
        ]);
        await expect(service.getAnalysisStagesTrend({})).resolves.toEqual({
          bucketSize: null,
          points: [],
        });

        queryRawMock.mockClear();
        await expect(
          service.getAnalysisStagesTrend({
            from: '2026-07-25',
            to: '2026-07-24',
          }),
        ).rejects.toThrow(BadRequestException);
        expect(queryRawMock).not.toHaveBeenCalled();
      });

      it('propagates database errors', async () => {
        const error = new Error('database unavailable');
        queryRawMock.mockRejectedValue(error);

        await expect(
          service.getAnalysisStagesTrend({
            from: '2026-07-01',
            to: '2026-07-07',
          }),
        ).rejects.toBe(error);
      });
    });
  });

  describe('legacy endpoints', () => {
    describe('getOverview', () => {
      it('maps dataset-wide aggregate counts and boundaries', async () => {
        const startDate = new Date('2026-07-01T00:00:00.000Z');
        const endDate = new Date('2026-07-31T23:59:59.999Z');
        queryRawMock.mockResolvedValue([
          {
            totalCycles: 185295,
            machineCount: 5,
            productCount: 35,
            moldCount: 30,
            startDate,
            endDate,
          },
        ]);

        await expect(service.getOverview()).resolves.toEqual({
          totalCycles: 185295,
          machineCount: 5,
          productCount: 35,
          moldCount: 30,
          startDate,
          endDate,
        });
      });

      it('returns zeroed counts and null boundaries for an empty table', async () => {
        queryRawMock.mockResolvedValue([]);

        await expect(service.getOverview()).resolves.toEqual({
          totalCycles: 0,
          machineCount: 0,
          productCount: 0,
          moldCount: 0,
          startDate: null,
          endDate: null,
        });
      });
    });

    describe('getComparablePairs', () => {
      it('rejects reversed dates before querying Prisma', async () => {
        const filters: DateRangeQueryDto = {
          from: '2026-07-25',
          to: '2026-07-24',
        };

        await expect(service.getComparablePairs(filters)).rejects.toThrow(
          BadRequestException,
        );
        expect(queryRawMock).not.toHaveBeenCalled();
      });

      it('maps machine-count and cycle-count aggregates to numbers', async () => {
        queryRawMock.mockResolvedValue([
          {
            productCode: 'Product A',
            castCode: 'Mold 01',
            machineCount: 2,
            cycleCount: 100,
            machines: ['Machine 01', 'Machine 02'],
          },
        ]);

        await expect(
          service.getComparablePairs({ from: '2026-07-01', to: '2026-07-31' }),
        ).resolves.toEqual([
          {
            productCode: 'Product A',
            castCode: 'Mold 01',
            machineCount: 2,
            cycleCount: 100,
            machines: ['Machine 01', 'Machine 02'],
          },
        ]);
      });

      it('returns an empty list when no pair has at least two machines', async () => {
        queryRawMock.mockResolvedValue([]);

        await expect(service.getComparablePairs({})).resolves.toEqual([]);
      });
    });

    describe('getMachineComparison', () => {
      it('rejects reversed dates before querying Prisma', async () => {
        const filters: PerformanceQueryDto = {
          productCode: 'Product A',
          castCode: 'Mold 01',
          from: '2026-07-25',
          to: '2026-07-24',
        };

        await expect(service.getMachineComparison(filters)).rejects.toThrow(
          BadRequestException,
        );
        expect(queryRawMock).not.toHaveBeenCalled();
      });

      it('ranks machines by median cycle time and computes relative difference', async () => {
        queryRawMock.mockResolvedValue([
          {
            machine: 'Machine 01',
            cycleCount: 100,
            averageCycleTime: 10.5,
            medianCycleTime: 10,
            minimumCycleTime: 8,
            maximumCycleTime: 12,
            q1: 9,
            q3: 11,
            standardDeviation: 1.25,
            outlierCount: 5,
          },
          {
            machine: 'Machine 02',
            cycleCount: 50,
            averageCycleTime: 11.5,
            medianCycleTime: 11,
            minimumCycleTime: 9,
            maximumCycleTime: 13,
            q1: 10,
            q3: 12,
            standardDeviation: 1.1,
            outlierCount: 2,
          },
        ]);

        const response = await service.getMachineComparison({
          productCode: 'Product A',
          castCode: 'Mold 01',
        });

        expect(response).toEqual([
          {
            rank: 1,
            machine: 'Machine 01',
            isFastest: true,
            cycleCount: 100,
            averageCycleTime: 10.5,
            medianCycleTime: 10,
            minimumCycleTime: 8,
            maximumCycleTime: 12,
            q1: 9,
            q3: 11,
            standardDeviation: 1.25,
            outlierCount: 5,
            outlierRate: 5,
            differenceFromFastestPercent: 0,
          },
          {
            rank: 2,
            machine: 'Machine 02',
            isFastest: false,
            cycleCount: 50,
            averageCycleTime: 11.5,
            medianCycleTime: 11,
            minimumCycleTime: 9,
            maximumCycleTime: 13,
            q1: 10,
            q3: 12,
            standardDeviation: 1.1,
            outlierCount: 2,
            outlierRate: 4,
            differenceFromFastestPercent: 10,
          },
        ]);
      });

      it('returns an empty list when no machine matches the filters', async () => {
        queryRawMock.mockResolvedValue([]);

        await expect(
          service.getMachineComparison({
            productCode: 'Product A',
            castCode: 'Mold 01',
          }),
        ).resolves.toEqual([]);
      });
    });

    describe('getBoxPlot', () => {
      it('rounds statistics and computes outlier rate per machine', async () => {
        queryRawMock.mockResolvedValue([
          {
            machine: 'Machine 01',
            cycleCount: 100,
            averageCycleTime: 10.5,
            actualMinimum: 5,
            actualMaximum: 20,
            q1: 9,
            median: 10,
            q3: 11,
            iqr: 2,
            lowerFence: 6,
            upperFence: 14,
            lowerWhisker: 5,
            upperWhisker: 14,
            outlierCount: 3,
          },
        ]);

        await expect(
          service.getBoxPlot({ productCode: 'Product A', castCode: 'Mold 01' }),
        ).resolves.toEqual({
          productCode: 'Product A',
          castCode: 'Mold 01',
          machines: [
            {
              machine: 'Machine 01',
              cycleCount: 100,
              averageCycleTime: 10.5,
              actualMinimum: 5,
              actualMaximum: 20,
              q1: 9,
              median: 10,
              q3: 11,
              iqr: 2,
              lowerFence: 6,
              upperFence: 14,
              lowerWhisker: 5,
              upperWhisker: 14,
              outlierCount: 3,
              outlierRate: 3,
            },
          ],
        });
      });

      it('returns zero outlier rate for a zero-cycle-count machine', async () => {
        queryRawMock.mockResolvedValue([
          {
            machine: 'Machine 01',
            cycleCount: 0,
            averageCycleTime: 0,
            actualMinimum: 0,
            actualMaximum: 0,
            q1: 0,
            median: 0,
            q3: 0,
            iqr: 0,
            lowerFence: 0,
            upperFence: 0,
            lowerWhisker: 0,
            upperWhisker: 0,
            outlierCount: 0,
          },
        ]);

        const response = await service.getBoxPlot({
          productCode: 'Product A',
          castCode: 'Mold 01',
        });

        expect(response.machines[0].outlierRate).toBe(0);
      });

      it('returns an empty machine list when nothing matches the filters', async () => {
        queryRawMock.mockResolvedValue([]);

        await expect(
          service.getBoxPlot({ productCode: 'Product A', castCode: 'Mold 01' }),
        ).resolves.toEqual({
          productCode: 'Product A',
          castCode: 'Mold 01',
          machines: [],
        });
      });
    });
  });
});
