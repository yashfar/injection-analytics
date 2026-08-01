import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import {
  AnalysisCyclesQueryDto,
  AnalysisOutliersQueryDto,
} from './dto/analysis-bounded-query.dto';

type QueryRawMock = (
  ...args: [TemplateStringsArray, ...unknown[]]
) => Promise<unknown[]>;

class DecimalLike {
  constructor(private readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

function queryText(call: unknown[]): string {
  return Array.from(call[0] as TemplateStringsArray).join(' ');
}

function queryValues(call: unknown[]): unknown[] {
  return call.slice(1);
}

function cycleRow(overrides: Record<string, unknown> = {}) {
  return {
    cycleId: 1n,
    machine: 'Machine 03',
    workOrderNumber: 'Order 001',
    productCode: 'Product A',
    castCode: 'Mold 01',
    machineDate: new Date('2026-07-01T10:00:00.000Z'),
    cycleCounter: 7,
    cycleTime: new DecimalLike('12.3456'),
    mengac: new DecimalLike('1.1114'),
    enjtime: null,
    maltime: new DecimalLike('2.2225'),
    sogzaman: new DecimalLike('3'),
    mengkap: new DecimalLike('1'),
    ...overrides,
  };
}

describe('AnalyticsService bounded cycle analysis', () => {
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
        { provide: PrismaService, useValue: { $queryRaw: queryRawMock } },
      ],
    }).compile();
    service = module.get(AnalyticsService);
  });

  describe('getAnalysisCycles', () => {
    it('returns the exact empty response with the default bound', async () => {
      queryRawMock.mockResolvedValue([]);

      await expect(
        service.getAnalysisCycles(new AnalysisCyclesQueryDto()),
      ).resolves.toEqual({
        totalCycleCount: 0,
        returnedCycleCount: 0,
        limit: 1000,
        isTruncated: false,
        points: [],
      });
      expect(queryRawMock).toHaveBeenCalledTimes(1);
    });

    it('uses independent parameterized filters and latest-first bounding', async () => {
      queryRawMock.mockResolvedValue([]);
      const query = Object.assign(new AnalysisCyclesQueryDto(), {
        productCode: "Product ' A",
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
        limit: 25,
      });

      await service.getAnalysisCycles(query);

      const call = queryRawMock.mock.calls[0];
      const sql = queryText(call);
      const values = queryValues(call);
      const conditions = values[0] as { strings: string[]; values: unknown[] };
      expect(sql).toContain('ORDER BY machine_date DESC, id DESC');
      expect(sql).toContain('ORDER BY machine_date ASC, id ASC');
      expect(sql).toContain('COUNT(*) OVER ()');
      expect(sql).toContain('LIMIT');
      expect(conditions.strings.join(' ')).toContain(
        '"TIMERCEVRIM"::numeric > 0',
      );
      expect(sql).not.toContain("Product ' A");
      expect(conditions.values).toEqual(
        expect.arrayContaining([
          "Product ' A",
          'Mold 01',
          'Machine 03',
          expect.any(Date),
          expect.any(Date),
        ]),
      );
      expect(values).toContain(25);
    });

    it.each([
      ['productCode', 'Product A'],
      ['castCode', 'Mold 01'],
      ['machine', 'Machine 03'],
    ] as const)('accepts the independent %s filter', async (field, value) => {
      queryRawMock.mockResolvedValue([]);

      await service.getAnalysisCycles(
        Object.assign(new AnalysisCyclesQueryDto(), { [field]: value }),
      );

      const conditions = queryValues(queryRawMock.mock.calls[0])[0] as {
        values: unknown[];
      };
      expect(conditions.values).toEqual([value]);
    });

    it('normalizes rows, preserves identifiers, orders chronologically, and reports truncation', async () => {
      queryRawMock.mockResolvedValue([
        cycleRow({
          cycleId: '12',
          machineDate: '2026-07-02T10:00:00.000Z',
          totalCycleCount: 3n,
        }),
        cycleRow({
          cycleId: 11,
          productCode: ' Product A ',
          totalCycleCount: 3n,
        }),
      ]);
      const query = Object.assign(new AnalysisCyclesQueryDto(), { limit: 2 });

      const response = await service.getAnalysisCycles(query);

      expect(response.totalCycleCount).toBe(3);
      expect(response.returnedCycleCount).toBe(2);
      expect(response.isTruncated).toBe(true);
      expect(response.points.map(({ cycleId }) => cycleId)).toEqual([
        '11',
        '12',
      ]);
      expect(response.points[0]).toMatchObject({
        productCode: ' Product A ',
        cycleTime: 12.346,
        stages: { MENGAC: 1.111, ENJTIME: null, MALTIME: 2.223 },
      });
    });

    it.each([0, 5001, 1.5])(
      'rejects invalid direct limit %s before Prisma',
      async (limit) => {
        const query = Object.assign(new AnalysisCyclesQueryDto(), { limit });

        await expect(service.getAnalysisCycles(query)).rejects.toThrow(
          BadRequestException,
        );
        expect(queryRawMock).not.toHaveBeenCalled();
      },
    );

    it('rejects reversed dates before Prisma and propagates database errors', async () => {
      await expect(
        service.getAnalysisCycles(
          Object.assign(new AnalysisCyclesQueryDto(), {
            from: '2026-07-02',
            to: '2026-07-01',
          }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(queryRawMock).not.toHaveBeenCalled();

      const error = new Error('database unavailable');
      queryRawMock.mockRejectedValue(error);
      await expect(
        service.getAnalysisCycles(new AnalysisCyclesQueryDto()),
      ).rejects.toBe(error);
    });
  });

  describe('getAnalysisOutliers', () => {
    it('returns empty-population semantics', async () => {
      queryRawMock.mockResolvedValue([
        {
          cycleCount: 0n,
          q1: null,
          q3: null,
          outlierCount: 0n,
          cycleId: null,
        },
      ]);

      await expect(
        service.getAnalysisOutliers(new AnalysisOutliersQueryDto()),
      ).resolves.toEqual({
        cycleCount: 0,
        q1: null,
        q3: null,
        iqr: null,
        lowerFence: null,
        upperFence: null,
        outlierCount: 0,
        outlierRate: 0,
        returnedOutlierCount: 0,
        limit: 100,
        isTruncated: false,
        outliers: [],
      });
    });

    it('computes fences from the full population and preserves zero-outlier statistics', async () => {
      queryRawMock.mockResolvedValue([
        {
          cycleCount: 10n,
          q1: '10.1114',
          q3: '20.2225',
          outlierCount: 0n,
          cycleId: null,
        },
      ]);

      const response = await service.getAnalysisOutliers(
        new AnalysisOutliersQueryDto(),
      );

      expect(response).toMatchObject({
        cycleCount: 10,
        q1: 10.111,
        q3: 20.223,
        iqr: 10.111,
        lowerFence: -5.055,
        upperFence: 35.389,
        outlierCount: 0,
        outlierRate: 0,
        outliers: [],
      });
    });

    it('returns bounded severe outliers with direction, distance, and truncation', async () => {
      queryRawMock.mockResolvedValue([
        {
          ...cycleRow({ cycleId: 50n, cycleTime: 50 }),
          cycleCount: 100n,
          q1: 20,
          q3: 30,
          outlierCount: 3n,
          outlierDirection: 'high',
          distanceFromFence: '5.0004',
        },
        {
          ...cycleRow({ cycleId: 2n, cycleTime: 2 }),
          cycleCount: 100n,
          q1: 20,
          q3: 30,
          outlierCount: 3n,
          outlierDirection: 'low',
          distanceFromFence: 3,
        },
      ]);
      const query = Object.assign(new AnalysisOutliersQueryDto(), { limit: 2 });

      const response = await service.getAnalysisOutliers(query);

      expect(response).toMatchObject({
        cycleCount: 100,
        q1: 20,
        q3: 30,
        iqr: 10,
        lowerFence: 5,
        upperFence: 45,
        outlierCount: 3,
        outlierRate: 3,
        returnedOutlierCount: 2,
        limit: 2,
        isTruncated: true,
      });
      expect(response.outliers.map(({ cycleId }) => cycleId)).toEqual([
        '50',
        '2',
      ]);
      expect(response.outliers[0]).toMatchObject({
        outlierDirection: 'high',
        distanceFromFence: 5,
      });
      expect(response.outliers[1]).toMatchObject({
        outlierDirection: 'low',
        distanceFromFence: 3,
      });
    });

    it('uses strict IQR fences, full-population totals, and deterministic severity ordering', async () => {
      queryRawMock.mockResolvedValue([]);
      const query = Object.assign(new AnalysisOutliersQueryDto(), {
        machine: "Machine ' 03",
        limit: 10,
      });

      await service.getAnalysisOutliers(query);

      const call = queryRawMock.mock.calls[0];
      const sql = queryText(call);
      const values = queryValues(call);
      const conditions = values[0] as { values: unknown[] };
      expect(queryRawMock).toHaveBeenCalledTimes(1);
      expect(sql).toContain('PERCENTILE_CONT(0.25)');
      expect(sql).toContain('PERCENTILE_CONT(0.75)');
      expect(sql).toContain(
        'cycle_time < lower_fence OR cycle_time > upper_fence',
      );
      expect(sql).toContain(
        'ORDER BY distance_from_fence DESC, machine_date DESC, id DESC',
      );
      expect(sql.indexOf('outlier_totals')).toBeLessThan(sql.indexOf('LIMIT'));
      expect(sql).not.toContain("Machine ' 03");
      expect(conditions.values).toContain("Machine ' 03");
      expect(values).toContain(10);
    });

    it('applies all independent filters and date boundaries to the IQR population', async () => {
      queryRawMock.mockResolvedValue([]);
      const query = Object.assign(new AnalysisOutliersQueryDto(), {
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
      });

      await service.getAnalysisOutliers(query);

      const conditions = queryValues(queryRawMock.mock.calls[0])[0] as {
        values: unknown[];
      };
      expect(conditions.values).toEqual([
        'Product A',
        'Mold 01',
        'Machine 03',
        expect.any(Date),
        expect.any(Date),
      ]);
    });

    it.each([0, 1001, 2.5])(
      'rejects invalid direct limit %s before Prisma',
      async (limit) => {
        await expect(
          service.getAnalysisOutliers(
            Object.assign(new AnalysisOutliersQueryDto(), { limit }),
          ),
        ).rejects.toThrow(BadRequestException);
        expect(queryRawMock).not.toHaveBeenCalled();
      },
    );

    it('propagates database failures', async () => {
      const error = new Error('database unavailable');
      queryRawMock.mockRejectedValue(error);

      await expect(
        service.getAnalysisOutliers(new AnalysisOutliersQueryDto()),
      ).rejects.toBe(error);
    });

    it('rejects a reversed date range before Prisma', async () => {
      await expect(
        service.getAnalysisOutliers(
          Object.assign(new AnalysisOutliersQueryDto(), {
            from: '2026-07-02',
            to: '2026-07-01',
          }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(queryRawMock).not.toHaveBeenCalled();
    });
  });
});
