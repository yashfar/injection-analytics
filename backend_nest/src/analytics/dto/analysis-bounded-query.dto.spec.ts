import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AnalysisCyclesQueryDto,
  AnalysisOutliersQueryDto,
} from './analysis-bounded-query.dto';

describe.each([
  [AnalysisCyclesQueryDto, 1000, 5000],
  [AnalysisOutliersQueryDto, 100, 1000],
] as const)('%s', (Dto, defaultLimit, maximumLimit) => {
  async function transformAndValidate(query: Record<string, unknown>) {
    const dto = plainToInstance(Dto, query);
    const errors = await validate(dto);
    return { dto, errors };
  }

  it('uses its default limit with an empty query', async () => {
    const { dto, errors } = await transformAndValidate({});

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(defaultLimit);
  });

  it('transforms a numeric limit and retains inherited filters', async () => {
    const query = {
      productCode: ' Product-A ',
      castCode: 'Mold-01',
      machine: 'Machine-03',
      from: '2026-07-01',
      to: '2026-07-31',
      limit: '25',
    };
    const { dto, errors } = await transformAndValidate(query);

    expect(errors).toHaveLength(0);
    expect(dto).toMatchObject({ ...query, limit: 25 });
  });

  it.each([1, maximumLimit])('accepts boundary limit %s', async (limit) => {
    const { errors } = await transformAndValidate({ limit });

    expect(errors).toHaveLength(0);
  });

  it.each([0, -1, 1.5, 'not-a-number'])(
    'rejects invalid limit %s',
    async (limit) => {
      const { errors } = await transformAndValidate({ limit });

      expect(errors.some((error) => error.property === 'limit')).toBe(true);
    },
  );

  it('rejects a limit above its endpoint maximum', async () => {
    const { errors } = await transformAndValidate({ limit: maximumLimit + 1 });

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('retains inherited identifier and ISO-date validation', async () => {
    const { errors } = await transformAndValidate({
      productCode: '',
      from: 'not-a-date',
    });

    expect(errors.some((error) => error.property === 'productCode')).toBe(true);
    expect(errors.some((error) => error.property === 'from')).toBe(true);
  });
});
