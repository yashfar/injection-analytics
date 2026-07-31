import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFiltersResponse } from './analytics-filters-response.type';
import { AnalysisSummaryResponse } from './analysis-summary-response.type';
import { AnalysisFilterQueryDto } from './dto/analysis-filter-query.dto';
import { AnalysisTrendResponse } from './analysis-trend-response.type';
import { AnalyticsFilterQueryDto } from './dto/analytics-filter-query.dto';
import { AnalysisHistogramResponse } from './analysis-histogram-response.type';
import { AnalysisHistogramQueryDto } from './dto/analysis-histogram-query.dto';
import { DistributionQueryDto } from './dto/distribution-query.dto';
import {
  AnalysisStagesSummaryResponse,
  AnalysisStagesTrendResponse,
} from './analysis-stages-response.type';
import { PerformanceQueryDto } from './dto/performance-query.dto';
import {
  AnalysisCyclesQueryDto,
  AnalysisOutliersQueryDto,
} from './dto/analysis-bounded-query.dto';
import {
  AnalysisCyclesResponse,
  AnalysisOutliersResponse,
} from './analysis-cycles-response.type';

describe('AnalyticsController', () => {
  type GetFiltersMock = () => Promise<AnalyticsFiltersResponse>;
  type GetAnalysisSummaryMock = (
    filters: AnalysisFilterQueryDto,
  ) => Promise<AnalysisSummaryResponse>;
  type GetAnalysisTrendMock = (
    filters: AnalysisFilterQueryDto,
  ) => Promise<AnalysisTrendResponse>;
  type GetLegacyTrendMock = (
    filters: AnalyticsFilterQueryDto,
  ) => Promise<unknown>;
  type GetAnalysisHistogramMock = (
    query: AnalysisHistogramQueryDto,
  ) => Promise<AnalysisHistogramResponse>;
  type GetLegacyDistributionMock = (
    query: DistributionQueryDto,
  ) => Promise<unknown>;
  type GetAnalysisStagesSummaryMock = (
    filters: AnalysisFilterQueryDto,
  ) => Promise<AnalysisStagesSummaryResponse>;
  type GetAnalysisStagesTrendMock = (
    filters: AnalysisFilterQueryDto,
  ) => Promise<AnalysisStagesTrendResponse>;
  type GetLegacyStageComparisonMock = (
    query: PerformanceQueryDto,
  ) => Promise<unknown>;
  type GetAnalysisCyclesMock = (
    query: AnalysisCyclesQueryDto,
  ) => Promise<AnalysisCyclesResponse>;
  type GetAnalysisOutliersMock = (
    query: AnalysisOutliersQueryDto,
  ) => Promise<AnalysisOutliersResponse>;

  let controller: AnalyticsController;
  let getFiltersMock: jest.MockedFunction<GetFiltersMock>;
  let getAnalysisSummaryMock: jest.MockedFunction<GetAnalysisSummaryMock>;
  let getAnalysisTrendMock: jest.MockedFunction<GetAnalysisTrendMock>;
  let getLegacyTrendMock: jest.MockedFunction<GetLegacyTrendMock>;
  let getAnalysisHistogramMock: jest.MockedFunction<GetAnalysisHistogramMock>;
  let getLegacyDistributionMock: jest.MockedFunction<GetLegacyDistributionMock>;
  let getAnalysisStagesSummaryMock: jest.MockedFunction<GetAnalysisStagesSummaryMock>;
  let getAnalysisStagesTrendMock: jest.MockedFunction<GetAnalysisStagesTrendMock>;
  let getLegacyStageComparisonMock: jest.MockedFunction<GetLegacyStageComparisonMock>;
  let getAnalysisCyclesMock: jest.MockedFunction<GetAnalysisCyclesMock>;
  let getAnalysisOutliersMock: jest.MockedFunction<GetAnalysisOutliersMock>;

  beforeEach(async () => {
    getFiltersMock = jest.fn<GetFiltersMock>();
    getAnalysisSummaryMock = jest.fn<GetAnalysisSummaryMock>();
    getAnalysisTrendMock = jest.fn<GetAnalysisTrendMock>();
    getLegacyTrendMock = jest.fn<GetLegacyTrendMock>();
    getAnalysisHistogramMock = jest.fn<GetAnalysisHistogramMock>();
    getLegacyDistributionMock = jest.fn<GetLegacyDistributionMock>();
    getAnalysisStagesSummaryMock = jest.fn<GetAnalysisStagesSummaryMock>();
    getAnalysisStagesTrendMock = jest.fn<GetAnalysisStagesTrendMock>();
    getLegacyStageComparisonMock = jest.fn<GetLegacyStageComparisonMock>();
    getAnalysisCyclesMock = jest.fn<GetAnalysisCyclesMock>();
    getAnalysisOutliersMock = jest.fn<GetAnalysisOutliersMock>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: {
            getFilters: getFiltersMock,
            getAnalysisSummary: getAnalysisSummaryMock,
            getAnalysisTrend: getAnalysisTrendMock,
            getTrend: getLegacyTrendMock,
            getAnalysisHistogram: getAnalysisHistogramMock,
            getDistribution: getLegacyDistributionMock,
            getAnalysisStagesSummary: getAnalysisStagesSummaryMock,
            getAnalysisStagesTrend: getAnalysisStagesTrendMock,
            getStageComparison: getLegacyStageComparisonMock,
            getAnalysisCycles: getAnalysisCyclesMock,
            getAnalysisOutliers: getAnalysisOutliersMock,
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('delegates getFilters without requiring a query DTO', async () => {
    const response: AnalyticsFiltersResponse = {
      machines: ['Machine 01'],
      products: ['Product A'],
      molds: ['Mold 01'],
      workOrders: ['Order 001'],
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-31T23:59:59.999Z'),
    };
    getFiltersMock.mockResolvedValue(response);

    await expect(controller.getFilters()).resolves.toEqual(response);
    expect(getFiltersMock).toHaveBeenCalledTimes(1);
    expect(getFiltersMock).toHaveBeenCalledWith();
  });

  describe('getAnalysisSummary', () => {
    const response: AnalysisSummaryResponse = {
      cycleCount: 10,
      averageCycleTime: 12.5,
      medianCycleTime: 12.25,
      minimumCycleTime: 10,
      maximumCycleTime: 16,
      q1: 11,
      q3: 14,
      standardDeviation: 1.5,
      outlierCount: 1,
      outlierRate: 10,
      machineCount: 2,
      productCount: 1,
      moldCount: 1,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-31T23:59:59.999Z'),
    };

    it('delegates the complete analysis DTO unchanged', async () => {
      const filters: AnalysisFilterQueryDto = {
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
      };
      getAnalysisSummaryMock.mockResolvedValue(response);

      await expect(controller.getAnalysisSummary(filters)).resolves.toEqual(
        response,
      );
      expect(getAnalysisSummaryMock).toHaveBeenCalledWith(filters);
    });

    it('delegates an empty analysis DTO', async () => {
      const filters: AnalysisFilterQueryDto = {};
      getAnalysisSummaryMock.mockResolvedValue(response);

      await expect(controller.getAnalysisSummary(filters)).resolves.toEqual(
        response,
      );
      expect(getAnalysisSummaryMock).toHaveBeenCalledWith(filters);
    });
  });

  describe('getAnalysisTrend', () => {
    const response: AnalysisTrendResponse = {
      bucketSize: 'day',
      points: [
        {
          bucketStart: new Date('2026-07-01T00:00:00.000Z'),
          cycleCount: 10,
          averageCycleTime: 12.5,
          medianCycleTime: 12.25,
          minimumCycleTime: 10,
          maximumCycleTime: 16,
        },
      ],
    };

    it('delegates the complete analysis DTO to the new trend method', async () => {
      const filters: AnalysisFilterQueryDto = {
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
      };
      getAnalysisTrendMock.mockResolvedValue(response);

      await expect(controller.getAnalysisTrend(filters)).resolves.toEqual(
        response,
      );
      expect(getAnalysisTrendMock).toHaveBeenCalledWith(filters);
      expect(getLegacyTrendMock).not.toHaveBeenCalled();
    });

    it('delegates an empty analysis DTO', async () => {
      const filters: AnalysisFilterQueryDto = {};
      getAnalysisTrendMock.mockResolvedValue(response);

      await expect(controller.getAnalysisTrend(filters)).resolves.toEqual(
        response,
      );
      expect(getAnalysisTrendMock).toHaveBeenCalledWith(filters);
    });

    it('preserves delegation for the legacy trend method', async () => {
      const filters: AnalyticsFilterQueryDto = {
        productCode: 'Product A',
        castCode: 'Mold 01',
      };
      const legacyResponse = { bucketSize: null, series: [] };
      getLegacyTrendMock.mockResolvedValue(legacyResponse);

      await expect(controller.getTrend(filters)).resolves.toEqual(
        legacyResponse,
      );
      expect(getLegacyTrendMock).toHaveBeenCalledWith(filters);
      expect(getAnalysisTrendMock).not.toHaveBeenCalled();
    });
  });

  describe('getAnalysisHistogram', () => {
    const response: AnalysisHistogramResponse = {
      binSize: 5,
      maxValue: 60,
      totalCycleCount: 2,
      minimumCycleTime: 15,
      maximumCycleTime: 20,
      bins: [
        {
          lowerBound: 15,
          upperBound: 20,
          cycleCount: 1,
          isOverflow: false,
        },
        {
          lowerBound: 60,
          upperBound: null,
          cycleCount: 1,
          isOverflow: true,
        },
      ],
    };

    it('delegates empty dimensions with default parameters', async () => {
      const query = new AnalysisHistogramQueryDto();
      getAnalysisHistogramMock.mockResolvedValue(response);

      await expect(controller.getAnalysisHistogram(query)).resolves.toEqual(
        response,
      );
      expect(getAnalysisHistogramMock).toHaveBeenCalledWith(query);
      expect(query.binSize).toBe(5);
      expect(query.maxValue).toBe(60);
    });

    it('delegates complete filters and explicit parameters', async () => {
      const query: AnalysisHistogramQueryDto = {
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
        binSize: 10,
        maxValue: 100,
      };
      getAnalysisHistogramMock.mockResolvedValue(response);

      await controller.getAnalysisHistogram(query);

      expect(getAnalysisHistogramMock).toHaveBeenCalledWith(query);
      expect(getLegacyDistributionMock).not.toHaveBeenCalled();
    });

    it('preserves legacy distribution delegation', async () => {
      const query: DistributionQueryDto = {
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        binSize: 5,
        maxValue: 60,
      };
      const legacyResponse = { bins: [] };
      getLegacyDistributionMock.mockResolvedValue(legacyResponse);

      await expect(controller.getDistribution(query)).resolves.toEqual(
        legacyResponse,
      );
      expect(getLegacyDistributionMock).toHaveBeenCalledWith(query);
      expect(getAnalysisHistogramMock).not.toHaveBeenCalled();
    });
  });

  describe('analysis stages', () => {
    const summaryResponse: AnalysisStagesSummaryResponse = {
      cycleCount: 1,
      averageCycleTime: 10,
      medianCycleTime: 10,
      stages: {
        MENGAC: { average: 1, median: 1 },
        ENJTIME: { average: 2, median: 2 },
        MALTIME: { average: 2, median: 2 },
        SOGZAMAN: { average: 3, median: 3 },
        MENGKAP: { average: 1, median: 1 },
      },
      averageStageSum: 9,
      stageSumDifference: -1,
    };
    const trendResponse: AnalysisStagesTrendResponse = {
      bucketSize: null,
      points: [],
    };
    const completeFilters: AnalysisFilterQueryDto = {
      productCode: 'Product A',
      castCode: 'Mold 01',
      machine: 'Machine 03',
      from: '2026-07-01',
      to: '2026-07-31',
    };

    it.each([completeFilters, {}])(
      'delegates stage summary filters unchanged',
      async (filters) => {
        getAnalysisStagesSummaryMock.mockResolvedValue(summaryResponse);

        await expect(
          controller.getAnalysisStagesSummary(filters),
        ).resolves.toEqual(summaryResponse);
        expect(getAnalysisStagesSummaryMock).toHaveBeenCalledWith(filters);
        expect(getLegacyStageComparisonMock).not.toHaveBeenCalled();
      },
    );

    it.each([completeFilters, {}])(
      'delegates stage trend filters unchanged',
      async (filters) => {
        getAnalysisStagesTrendMock.mockResolvedValue(trendResponse);

        await expect(
          controller.getAnalysisStagesTrend(filters),
        ).resolves.toEqual(trendResponse);
        expect(getAnalysisStagesTrendMock).toHaveBeenCalledWith(filters);
        expect(getLegacyStageComparisonMock).not.toHaveBeenCalled();
      },
    );

    it('preserves legacy stage-comparison delegation', async () => {
      const query: PerformanceQueryDto = {
        productCode: 'Product A',
        castCode: 'Mold 01',
      };
      const response = { machines: [] };
      getLegacyStageComparisonMock.mockResolvedValue(response);

      await expect(controller.getStageComparison(query)).resolves.toEqual(
        response,
      );
      expect(getLegacyStageComparisonMock).toHaveBeenCalledWith(query);
    });
  });

  describe('bounded cycle analysis', () => {
    it('delegates cycle filters and the default limit unchanged', async () => {
      const query = new AnalysisCyclesQueryDto();
      const response: AnalysisCyclesResponse = {
        totalCycleCount: 0,
        returnedCycleCount: 0,
        limit: 1000,
        isTruncated: false,
        points: [],
      };
      getAnalysisCyclesMock.mockResolvedValue(response);

      await expect(controller.getAnalysisCycles(query)).resolves.toEqual(
        response,
      );
      expect(getAnalysisCyclesMock).toHaveBeenCalledWith(query);
      expect(query.limit).toBe(1000);
    });

    it('delegates complete cycle filters and a custom limit unchanged', async () => {
      const query = Object.assign(new AnalysisCyclesQueryDto(), {
        productCode: 'Product A',
        castCode: 'Mold 01',
        machine: 'Machine 03',
        from: '2026-07-01',
        to: '2026-07-31',
        limit: 50,
      });
      const response: AnalysisCyclesResponse = {
        totalCycleCount: 0,
        returnedCycleCount: 0,
        limit: 50,
        isTruncated: false,
        points: [],
      };
      getAnalysisCyclesMock.mockResolvedValue(response);

      await controller.getAnalysisCycles(query);

      expect(getAnalysisCyclesMock).toHaveBeenCalledWith(query);
      expect(getAnalysisOutliersMock).not.toHaveBeenCalled();
    });

    it('delegates empty outlier filters with the default limit', async () => {
      const query = new AnalysisOutliersQueryDto();
      const response: AnalysisOutliersResponse = {
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
      };
      getAnalysisOutliersMock.mockResolvedValue(response);

      await controller.getAnalysisOutliers(query);

      expect(getAnalysisOutliersMock).toHaveBeenCalledWith(query);
      expect(query.limit).toBe(100);
    });

    it('delegates outlier filters and an explicit limit unchanged', async () => {
      const query: AnalysisOutliersQueryDto = Object.assign(
        new AnalysisOutliersQueryDto(),
        {
          productCode: 'Product A',
          castCode: 'Mold 01',
          machine: 'Machine 03',
          from: '2026-07-01',
          to: '2026-07-31',
          limit: 25,
        },
      );
      const response: AnalysisOutliersResponse = {
        cycleCount: 0,
        q1: null,
        q3: null,
        iqr: null,
        lowerFence: null,
        upperFence: null,
        outlierCount: 0,
        outlierRate: 0,
        returnedOutlierCount: 0,
        limit: 25,
        isTruncated: false,
        outliers: [],
      };
      getAnalysisOutliersMock.mockResolvedValue(response);

      await expect(controller.getAnalysisOutliers(query)).resolves.toEqual(
        response,
      );
      expect(getAnalysisOutliersMock).toHaveBeenCalledWith(query);
      expect(getAnalysisCyclesMock).not.toHaveBeenCalled();
    });
  });
});
