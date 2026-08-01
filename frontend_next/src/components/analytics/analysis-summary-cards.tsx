import { AlertTriangle, Clock, Gauge, Layers, TrendingUp } from "lucide-react";

import { OverviewCard } from "@/components/dashboard/overview-card";
import {
  formatTurkishCycleTime,
  formatTurkishInteger,
  formatTurkishPercentage,
} from "@/lib/analytics-formatters";
import type { AnalysisSummaryResponse } from "@/types/analytics";

const unavailable = "Mevcut değil";

function formatDuration(value: number | null): string {
  if (value === null) {
    return unavailable;
  }

  const formatted = formatTurkishCycleTime(value);
  return formatted ? `${formatted} sn` : unavailable;
}

function formatOutlierRate(value: number): string {
  return formatTurkishPercentage(value / 100) ?? unavailable;
}

function formatScope(
  productCount: number,
  moldCount: number,
  machineCount: number,
): string {
  const products = formatTurkishInteger(productCount) ?? "0";
  const molds = formatTurkishInteger(moldCount) ?? "0";
  const machines = formatTurkishInteger(machineCount) ?? "0";

  return `${products} ürün · ${molds} kalıp · ${machines} makine`;
}

type AnalysisSummaryCardsProps = {
  data: AnalysisSummaryResponse;
};

// Phase 1 summary cards for the applied filter scope — reuses the existing
// OverviewCard primitive as-is (generic title/value/description/icon,
// nothing machine-specific baked in), just with analysis-scoped data.
export function AnalysisSummaryCards({ data }: AnalysisSummaryCardsProps) {
  return (
    <section
      aria-label="Analiz özeti"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <h2 className="sr-only">Analiz özeti</h2>
      <OverviewCard
        title="Toplam Çevrim"
        value={formatTurkishInteger(data.cycleCount) ?? unavailable}
        description="Uygulanan filtre kapsamındaki çevrimler"
        icon={<Gauge aria-hidden="true" />}
      />
      <OverviewCard
        title="Ortalama Çevrim Süresi"
        value={formatDuration(data.averageCycleTime)}
        description="Kapsamın ortalama çevrim süresi"
        icon={<Clock aria-hidden="true" />}
      />
      <OverviewCard
        title="Medyan Çevrim Süresi"
        value={formatDuration(data.medianCycleTime)}
        description="Kapsamın medyan çevrim süresi"
        icon={<TrendingUp aria-hidden="true" />}
      />
      <OverviewCard
        title="Aykırı Değer Oranı"
        value={formatOutlierRate(data.outlierRate)}
        description={`${formatTurkishInteger(data.outlierCount) ?? "0"} aykırı çevrim`}
        icon={<AlertTriangle aria-hidden="true" />}
      />
      <OverviewCard
        title="Kapsam"
        value={formatScope(data.productCount, data.moldCount, data.machineCount)}
        description="Bu sonuçlara katkıda bulunan farklı ürün, kalıp ve makine sayısı"
        icon={<Layers aria-hidden="true" />}
      />
    </section>
  );
}
