import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  buildAnalysisSqlConditions,
  buildProductionCycleWhere,
  normalizeAnalysisFilters,
  type NormalizedAnalysisFilters,
} from './analysis-filter-builder';

describe('analysis filter builder', () => {
  describe('normalizeAnalysisFilters', () => {
    it('normalizes an empty input to an empty filter', () => {
      expect(normalizeAnalysisFilters({})).toEqual({});
    });

    it.each([
      ['productCode', 'Product A'],
      ['castCode', 'Mold 01'],
      ['machine', 'Machine 03'],
    ] as const)('normalizes %s independently', (field, value) => {
      expect(normalizeAnalysisFilters({ [field]: value })).toEqual({
        [field]: value,
      });
    });

    it('normalizes combined identifiers', () => {
      expect(
        normalizeAnalysisFilters({
          productCode: 'Product A',
          castCode: 'Mold 01',
          machine: 'Machine 03',
        }),
      ).toEqual({
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
      });
    });

    it('preserves identifiers exactly', () => {
      const filters = {
        productCode: '  Product-Mixed_Case  ',
        castCode: 'Mold / 01',
        machine: 'Machine-İstanbul',
      };

      expect(normalizeAnalysisFilters(filters)).toEqual(filters);
    });

    it('normalizes a date-only from value to the UTC start of day', () => {
      expect(normalizeAnalysisFilters({ from: '2026-07-24' })).toEqual({
        from: new Date('2026-07-24T00:00:00.000Z'),
      });
    });

    it('normalizes a date-only to value to the UTC end of day', () => {
      expect(normalizeAnalysisFilters({ to: '2026-07-24' })).toEqual({
        to: new Date('2026-07-24T23:59:59.999Z'),
      });
    });

    it('preserves the instants represented by ISO date-times', () => {
      const normalized = normalizeAnalysisFilters({
        from: '2026-07-24T03:15:20.125+03:00',
        to: '2026-07-24T20:45:10.875-02:00',
      });

      expect(normalized.from?.toISOString()).toBe('2026-07-24T00:15:20.125Z');
      expect(normalized.to?.toISOString()).toBe('2026-07-24T22:45:10.875Z');
    });

    it('rejects a reversed normalized date range', () => {
      expect(() =>
        normalizeAnalysisFilters({
          from: '2026-07-25',
          to: '2026-07-24',
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        normalizeAnalysisFilters({
          from: '2026-07-25',
          to: '2026-07-24',
        }),
      ).toThrow('"from" must be earlier than or equal to "to"');
    });
  });

  describe('buildProductionCycleWhere', () => {
    it('creates no restrictions for empty filters', () => {
      expect(buildProductionCycleWhere({})).toEqual({});
    });

    it.each([
      ['productCode', 'Product A'],
      ['castCode', 'Mold 01'],
      ['machine', 'Machine 03'],
    ] as const)('creates an exact %s restriction', (field, value) => {
      expect(buildProductionCycleWhere({ [field]: value })).toEqual({
        [field]: value,
      });
    });

    it('creates inclusive date restrictions', () => {
      const filters = normalizeAnalysisFilters({
        from: '2026-07-24',
        to: '2026-07-24',
      });

      expect(buildProductionCycleWhere(filters)).toEqual({
        machineDate: {
          gte: new Date('2026-07-24T00:00:00.000Z'),
          lte: new Date('2026-07-24T23:59:59.999Z'),
        },
      });
    });

    it('combines a complete filter with implicit AND semantics', () => {
      const filters = normalizeAnalysisFilters({
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
      });

      expect(buildProductionCycleWhere(filters)).toEqual({
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        machineDate: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lte: new Date('2026-07-31T23:59:59.999Z'),
        },
      });
    });
  });

  describe('buildAnalysisSqlConditions', () => {
    function combineConditions(
      filters: NormalizedAnalysisFilters,
      fixedConditions: Prisma.Sql[] = [],
    ): Prisma.Sql {
      return Prisma.join(
        [...buildAnalysisSqlConditions(filters), ...fixedConditions],
        ' AND ',
      );
    }

    it('adds no user condition for empty filters', () => {
      expect(buildAnalysisSqlConditions({})).toEqual([]);
    });

    it.each([
      ['productCode', 'Product A', '"PRODCODE" = ?'],
      ['castCode', 'Mold 01', '"CASTCODE" = ?'],
      ['machine', 'Machine 03', '"MACHINE" = ?'],
    ] as const)(
      'adds %s independently as a parameter',
      (field, value, expectedSql) => {
        const [condition] = buildAnalysisSqlConditions({ [field]: value });

        expect(condition.sql).toBe(expectedSql);
        expect(condition.values).toEqual([value]);
      },
    );

    it.each([
      ['from', '"MACH_DATE" >= ?', new Date('2026-07-24T00:00:00.000Z')],
      ['to', '"MACH_DATE" <= ?', new Date('2026-07-24T23:59:59.999Z')],
    ] as const)(
      'adds %s independently as an inclusive date parameter',
      (field, expectedSql, expectedDate) => {
        const filters = normalizeAnalysisFilters({ [field]: '2026-07-24' });
        const [condition] = buildAnalysisSqlConditions(filters);

        expect(condition.sql).toBe(expectedSql);
        expect(condition.values).toEqual([expectedDate]);
      },
    );

    it('adds all complete-filter conditions in AND-composable order', () => {
      const filters = normalizeAnalysisFilters({
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
      });
      const combined = combineConditions(filters);

      expect(combined.sql).toBe(
        '"PRODCODE" = ? AND "CASTCODE" = ? AND "MACHINE" = ? AND "MACH_DATE" >= ? AND "MACH_DATE" <= ?',
      );
      expect(combined.values).toEqual([
        'Product A',
        'Mold 01',
        'Machine 03',
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-31T23:59:59.999Z'),
      ]);
    });

    it('keeps SQL-like identifier content in parameter values', () => {
      const unsafeIdentifier = `Product' OR 1=1 --`;
      const combined = combineConditions({ productCode: unsafeIdentifier });

      expect(combined.sql).toBe('"PRODCODE" = ?');
      expect(combined.sql).not.toContain(unsafeIdentifier);
      expect(combined.values).toEqual([unsafeIdentifier]);
    });

    it('uses the same normalized date boundaries as the typed builder', () => {
      const filters = normalizeAnalysisFilters({
        from: '2026-07-24',
        to: '2026-07-24',
      });
      const where = buildProductionCycleWhere(filters);
      const combined = combineConditions(filters);

      expect(combined.values).toEqual([
        new Date('2026-07-24T00:00:00.000Z'),
        new Date('2026-07-24T23:59:59.999Z'),
      ]);
      expect(where.machineDate).toEqual({
        gte: combined.values[0],
        lte: combined.values[1],
      });
    });

    it('composes with endpoint-specific fixed conditions', () => {
      const combined = combineConditions({ machine: 'Machine 03' }, [
        Prisma.sql`"TIMERCEVRIM" IS NOT NULL`,
      ]);

      expect(combined.sql).toBe('"MACHINE" = ? AND "TIMERCEVRIM" IS NOT NULL');
      expect(combined.values).toEqual(['Machine 03']);
    });
  });
});
