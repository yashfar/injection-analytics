import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
