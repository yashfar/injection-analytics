import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const overviewPlaceholders = ["cycles", "machines", "products", "molds"];
const chartPlaceholders = ["machine-performance", "cycle-time-trend"];

export function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Üretim analiz paneli yükleniyor...</span>

      <div className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" aria-hidden="true" />
          <div className="space-y-2">
            <Skeleton
              className="h-10 w-64 max-w-full sm:w-80"
              aria-hidden="true"
            />
            <Skeleton
              className="h-5 w-96 max-w-full"
              aria-hidden="true"
            />
          </div>
        </div>
        <Skeleton className="h-5 w-60 max-w-full" aria-hidden="true" />
      </div>

      <section
        aria-label="Üretim özeti yükleniyor..."
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {overviewPlaceholders.map((placeholder) => (
          <Card key={placeholder} className="h-full" aria-hidden="true">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-9 justify-self-end" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-4 w-36 max-w-full" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section
        aria-label="Analiz grafikleri yükleniyor..."
        className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        {chartPlaceholders.map((placeholder) => (
          <Card key={placeholder} className="min-h-80" aria-hidden="true">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-1 items-end gap-3 pt-4">
              <Skeleton className="h-2/5 flex-1" />
              <Skeleton className="h-3/5 flex-1" />
              <Skeleton className="h-1/2 flex-1" />
              <Skeleton className="h-4/5 flex-1" />
              <Skeleton className="h-2/3 flex-1" />
              <Skeleton className="h-full flex-1" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
