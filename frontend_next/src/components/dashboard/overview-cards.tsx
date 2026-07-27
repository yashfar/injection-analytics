import { Boxes, Factory, Gauge, Package } from "lucide-react";

import { OverviewCard } from "@/components/dashboard/overview-card";
import type { AnalyticsOverview } from "@/types/analytics";

type OverviewCardsProps = {
  overview: AnalyticsOverview;
};

export function OverviewCards({ overview }: OverviewCardsProps) {
  return (
    <section
      aria-label="Üretim özeti"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <h2 className="sr-only">Üretim özeti</h2>
      <OverviewCard
        title="Toplam Çevrim"
        value={overview.totalCycles}
        description="Kaydedilen enjeksiyon çevrimleri"
        icon={<Gauge aria-hidden="true" />}
      />
      <OverviewCard
        title="Makine Sayısı"
        value={overview.machineCount}
        description="Veri kümesindeki makineler"
        icon={<Factory aria-hidden="true" />}
      />
      <OverviewCard
        title="Ürün Sayısı"
        value={overview.productCount}
        description="Takip edilen farklı ürünler"
        icon={<Package aria-hidden="true" />}
      />
      <OverviewCard
        title="Kalıp Sayısı"
        value={overview.moldCount}
        description="Takip edilen farklı kalıplar"
        icon={<Boxes aria-hidden="true" />}
      />
    </section>
  );
}
