import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AnalysisFilterQueryDto } from './analysis-filter-query.dto';

type ValidationResult = {
  dto: AnalysisFilterQueryDto;
  errors: ValidationError[];
};

async function validateQuery(
  query: Record<string, unknown>,
): Promise<ValidationResult> {
  const dto = plainToInstance(AnalysisFilterQueryDto, query);
  const errors = await validate(dto);

  return { dto, errors };
}

describe('AnalysisFilterQueryDto', () => {
  it('accepts an empty query object', async () => {
    const { errors } = await validateQuery({});

    expect(errors).toHaveLength(0);
  });

  it('accepts productCode without requiring castCode', async () => {
    const { errors } = await validateQuery({ productCode: 'Product A' });

    expect(errors).toHaveLength(0);
  });

  it('accepts castCode without requiring productCode', async () => {
    const { errors } = await validateQuery({ castCode: 'Mold 01' });

    expect(errors).toHaveLength(0);
  });

  it('accepts machine alone', async () => {
    const { errors } = await validateQuery({ machine: 'Machine 03' });

    expect(errors).toHaveLength(0);
  });

  it('accepts ISO dates alone, including YYYY-MM-DD values', async () => {
    const { errors } = await validateQuery({
      from: '2026-07-01',
      to: '2026-07-31T23:59:59.999Z',
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts a complete valid filter combination', async () => {
    const { errors } = await validateQuery({
      productCode: 'Product A',
      castCode: 'Mold 01',
      machine: 'Machine 03',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
    });

    expect(errors).toHaveLength(0);
  });

  it.each(['productCode', 'castCode', 'machine'] as const)(
    'rejects an empty supplied %s value',
    async (field) => {
      const { errors } = await validateQuery({ [field]: '' });

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
    },
  );

  it.each(['from', 'to'] as const)(
    'rejects an invalid %s date',
    async (field) => {
      const { errors } = await validateQuery({ [field]: 'not-a-date' });

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
    },
  );

  it('preserves valid identifiers exactly as received', async () => {
    const query = {
      productCode: '  Product-Mixed_Case  ',
      castCode: 'Mold / 01',
      machine: 'Machine-İstanbul',
    };
    const { dto, errors } = await validateQuery(query);

    expect(errors).toHaveLength(0);
    expect(dto.productCode).toBe(query.productCode);
    expect(dto.castCode).toBe(query.castCode);
    expect(dto.machine).toBe(query.machine);
  });
});
