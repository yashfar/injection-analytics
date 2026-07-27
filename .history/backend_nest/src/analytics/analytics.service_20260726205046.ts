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
}
