import { CalendarDays, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AnalyticsOverview } from "@/types/analytics";

type DashboardHeaderProps = Pick<
  AnalyticsOverview,
  "startDate" | "endDate"
>;

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDateRange(
  startDate: AnalyticsOverview["startDate"],
  endDate: AnalyticsOverview["endDate"],
): string {
  if (!startDate || !endDate) {
    return "Tarih aralığı mevcut değil";
  }

  return `${dateFormatter.format(new Date(startDate))} – ${dateFormatter.format(
    new Date(endDate),
  )} UTC`;
}

export function DashboardHeader({
  startDate,
  endDate,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        <Badge variant="secondary" className="gap-1.5">
          <Database aria-hidden="true" />
          Veri bağlantısı kuruldu
        </Badge>
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Üretim Analiz Paneli
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Üretim faaliyetlerini ve temel enjeksiyon kalıplama ölçümlerini tek
            bakışta izleyin.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
        <span>{formatDateRange(startDate, endDate)}</span>
      </div>
    </header>
  );
}
