"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { MachineComparisonRow } from "@/types/analytics";

const chartConfig = {
  medianCycleTime: {
    label: "Medyan Çevrim Süresi",
    color: "var(--chart-1)",
  },
  fastest: {
    label: "En hızlı makine",
    color: "var(--chart-2)",
  },
  selected: {
    label: "Seçili makine",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type MachinePerformanceChartProps = {
  rows: MachineComparisonRow[] | undefined;
  selectedMachine?: string;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  onRetry: () => void;
};

function formatNumber(value: number, maximumFractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return "Mevcut değil";
  }

  return value.toLocaleString("tr-TR", {
    maximumFractionDigits,
  });
}

function formatCycleTime(value: number): string {
  return formatNumber(value, 3);
}

function formatPercent(value: number): string {
  const formattedValue = formatNumber(value, 2);
  return formattedValue === "Mevcut değil"
    ? formattedValue
    : `${formattedValue}%`;
}

type MachineTooltipProps = {
  active: boolean;
  machine: string;
  rows: MachineComparisonRow[];
};

function MachineTooltip({ active, machine, rows }: MachineTooltipProps) {
  const row = rows.find((item) => item.machine === machine);

  if (!active || !row) {
    return null;
  }

  return (
    <div className="min-w-64 rounded-lg border border-border bg-background p-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-foreground">{row.machine}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Sıralama</dt>
        <dd className="text-right font-medium text-foreground">{row.rank}</dd>
        <dt className="text-muted-foreground">Medyan Çevrim Süresi</dt>
        <dd className="text-right font-medium text-foreground">
          {formatCycleTime(row.medianCycleTime)} s
        </dd>
        <dt className="text-muted-foreground">Ortalama Çevrim Süresi</dt>
        <dd className="text-right font-medium text-foreground">
          {formatCycleTime(row.averageCycleTime)} s
        </dd>
        <dt className="text-muted-foreground">Çevrim Sayısı</dt>
        <dd className="text-right font-medium text-foreground">
          {formatNumber(row.cycleCount, 0)}
        </dd>
        <dt className="text-muted-foreground">Aykırı Değer Oranı</dt>
        <dd className="text-right font-medium text-foreground">
          {formatPercent(row.outlierRate)}
        </dd>
        <dt className="text-muted-foreground">
          En Hızlı Makineye Göre Fark
        </dt>
        <dd className="text-right font-medium text-foreground">
          {formatPercent(row.differenceFromFastestPercent)}
        </dd>
      </dl>
    </div>
  );
}

function ChartHeading({ isUpdating = false }: { isUpdating?: boolean }) {
  return (
    <CardHeader>
      <CardTitle>
        <h2 id="machine-performance-title">
          Makine Performans Karşılaştırması
        </h2>
      </CardTitle>
      <CardDescription id="machine-performance-description">
        Makinelere göre medyan çevrim süresi
      </CardDescription>
      {isUpdating ? (
        <CardAction>
          <Badge variant="outline">Veriler güncelleniyor...</Badge>
        </CardAction>
      ) : null}
    </CardHeader>
  );
}

export function MachinePerformanceChart({
  rows,
  selectedMachine,
  isPending,
  isError,
  isFetching,
  isPlaceholderData,
  onRetry,
}: MachinePerformanceChartProps) {
  if (isPending) {
    return (
      <Card
        className="min-h-80"
        aria-labelledby="machine-performance-title"
      >
        <ChartHeading />
        <CardContent className="flex flex-1" aria-busy="true">
          <span className="sr-only">
            Makine performans grafiği yükleniyor...
          </span>
          <Skeleton
            className="min-h-64 w-full"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card
        className="min-h-80"
        aria-labelledby="machine-performance-title"
      >
        <ChartHeading />
        <CardContent className="flex flex-1 flex-col items-start justify-center gap-4">
          <p className="text-sm text-muted-foreground">
            Makine karşılaştırma verileri yüklenemedi. Lütfen tekrar deneyin.
          </p>
          <Button onClick={onRetry} disabled={isFetching}>
            {isFetching ? "Yeniden deneniyor..." : "Tekrar dene"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card
        className="min-h-80"
        aria-labelledby="machine-performance-title"
      >
        <ChartHeading />
        <CardContent className="flex flex-1 items-center">
          <p className="text-sm text-muted-foreground">
            Seçili filtreler için makine karşılaştırma verisi bulunamadı.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedRows = [...rows].sort((left, right) => left.rank - right.rank);
  const fastestMachine =
    sortedRows.find((row) => row.isFastest) ?? sortedRows[0];
  const selectedMachineRow = selectedMachine
    ? sortedRows.find((row) => row.machine === selectedMachine)
    : undefined;
  const chartHeight = Math.max(280, sortedRows.length * 52 + 80);
  const isUpdating = isFetching || isPlaceholderData;

  function renderBarShape(props: BarShapeProps) {
    const row = sortedRows[props.index];
    const isSelected = row?.machine === selectedMachine;
    const fill = row?.isFastest
      ? "var(--color-fastest)"
      : "var(--color-medianCycleTime)";

    return (
      <Rectangle
        {...props}
        fill={fill}
        stroke={isSelected ? "var(--color-selected)" : "none"}
        strokeWidth={isSelected ? 3 : 0}
        radius={[0, 4, 4, 0]}
      />
    );
  }

  return (
    <Card
      aria-labelledby="machine-performance-title"
      aria-describedby="machine-performance-description machine-performance-accessibility-description"
    >
      <ChartHeading isUpdating={isUpdating} />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            En hızlı: {fastestMachine.machine} ·{" "}
            {formatCycleTime(fastestMachine.medianCycleTime)} s
          </Badge>
          {selectedMachine ? (
            <Badge variant="outline">
              Seçili: {selectedMachine}
              {selectedMachineRow ? "" : " · Tarih aralığında veri yok"}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Düşük değerler daha iyi performansı gösterir.
          </span>
        </div>

        <p
          id="machine-performance-accessibility-description"
          className="sr-only"
        >
          Sonuçlarda yer alan tüm makinelerin saniye cinsinden medyan çevrim
          sürelerini karşılaştıran, en hızlıdan en yavaşa sıralanmış yatay çubuk
          grafik.
        </p>

        <ChartContainer
          config={chartConfig}
          className="aspect-auto min-h-70 w-full"
          style={{ height: chartHeight }}
          initialDimension={{ width: 560, height: chartHeight }}
        >
          <BarChart
            data={sortedRows}
            layout="vertical"
            accessibilityLayer
            margin={{ top: 8, right: 64, bottom: 20, left: 0 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="medianCycleTime"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCycleTime(value)}
              label={{
                value: "Saniye",
                position: "insideBottom",
                offset: -12,
              }}
              height={44}
            />
            <YAxis
              type="category"
              dataKey="machine"
              tickLine={false}
              axisLine={false}
              width={88}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, label }) => (
                <MachineTooltip
                  active={active}
                  machine={
                    typeof label === "string" || typeof label === "number"
                      ? String(label)
                      : ""
                  }
                  rows={sortedRows}
                />
              )}
            />
            <Bar
              dataKey="medianCycleTime"
              fill="var(--color-medianCycleTime)"
              shape={renderBarShape}
              barSize={24}
              isAnimationActive="auto"
            >
              <LabelList
                dataKey="medianCycleTime"
                position="right"
                formatter={(value) =>
                  typeof value === "number"
                    ? `${formatCycleTime(value)} s`
                    : ""
                }
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
