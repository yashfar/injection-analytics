import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AnalysisHistogramQueryDto,
  validateAnalysisHistogramConfiguration,
} from './analysis-histogram-query.dto';

async function transformAndValidate(query: Record<string, unknown>) {
  const dto = plainToInstance(AnalysisHistogramQueryDto, query);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('AnalysisHistogramQueryDto', () => {
  it('uses default histogram parameters when they are missing', async () => {
    const { dto, errors } = await transformAndValidate({});

    expect(errors).toHaveLength(0);
    expect(dto.binSize).toBe(5);
    expect(dto.maxValue).toBe(60);
    expect(() => validateAnalysisHistogramConfiguration(dto)).not.toThrow();
  });

  it('transforms valid numeric strings', async () => {
    const { dto, errors } = await transformAndValidate({
      binSize: '4',
      maxValue: '80',
    });

    expect(errors).toHaveLength(0);
    expect(dto.binSize).toBe(4);
    expect(dto.maxValue).toBe(80);
    expect(() => validateAnalysisHistogramConfiguration(dto)).not.toThrow();
  });

  it.each([
    ['binSize', 0],
    ['maxValue', 0],
    ['binSize', -1],
    ['maxValue', -1],
    ['binSize', 1.5],
    ['maxValue', 10.5],
    ['binSize', 'not-a-number'],
    ['maxValue', 'Infinity'],
  ] as const)('rejects invalid %s value %s', async (field, value) => {
    const { errors } = await transformAndValidate({ [field]: value });

    expect(errors.some((error) => error.property === field)).toBe(true);
  });

  it('rejects maxValue smaller than binSize', async () => {
    const { dto, errors } = await transformAndValidate({
      binSize: '10',
      maxValue: '9',
    });

    expect(errors).toHaveLength(0);
    expect(() => validateAnalysisHistogramConfiguration(dto)).toThrow(
      'maxValue must be greater than or equal to binSize',
    );
  });

  it('rejects excessive potential regular-bin counts', async () => {
    const { dto, errors } = await transformAndValidate({
      binSize: '1',
      maxValue: '201',
    });

    expect(errors).toHaveLength(0);
    expect(() => validateAnalysisHistogramConfiguration(dto)).toThrow(
      'Histogram cannot exceed 200 regular bins',
    );
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
