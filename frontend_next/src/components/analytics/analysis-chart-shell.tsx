"use client";

import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { AnalysisEmptyGuide } from "@/components/analytics/analysis-empty-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_MIN_HEIGHT = 320;

type AnalysisChartShellProps<TData> = {
  title: string;
  description?: string;
  queryResult: UseQueryResult<TData>;
  hasApplied: boolean;
  isEmpty: (data: TData) => boolean;
  minHeight?: number;
  headerAction?: ReactNode;
  children: (data: TData) => ReactNode;
  // Optional override for the empty-state content. When omitted, the
  // default generic message below is used — existing callers don't need
  // to change.
  renderEmpty?: (data: TData) => ReactNode;
};

// Single state-management wrapper for every Phase 1 analysis chart, so the
// initial/loading/refetching/error/empty/success handling is written once
// instead of once per chart. State derivation follows a fixed priority
// order (initial -> loading -> refetching -> error -> empty -> success) so
// exactly one branch renders even during the brief windows where more than
// one of the underlying booleans could technically be true at once.
export function AnalysisChartShell<TData>({
  title,
  description,
  queryResult,
  hasApplied,
  isEmpty,
  minHeight = DEFAULT_MIN_HEIGHT,
  headerAction,
  children,
  renderEmpty,
}: AnalysisChartShellProps<TData>) {
  const data = queryResult.data;

  let content: ReactNode;
  let isBusy = false;
  let statusRole: "status" | "alert" | undefined;

  if (!hasApplied) {
    statusRole = "status";
    content = <AnalysisEmptyGuide title={title} description={description} />;
  } else if (queryResult.isPending && queryResult.isFetching) {
    isBusy = true;
    content = (
      <div className="flex w-full flex-col gap-3">
        <span className="sr-only">{title} yükleniyor...</span>
        <Skeleton className="h-6 w-1/3" aria-hidden="true" />
        <Skeleton className="h-40 w-full" aria-hidden="true" />
        <Skeleton className="h-4 w-1/2" aria-hidden="true" />
      </div>
    );
  } else if (
    queryResult.isFetching &&
    !queryResult.isPending &&
    data !== undefined
  ) {
    isBusy = true;
    content = (
      <div className="relative w-full">
        <div className="pointer-events-none opacity-60">
          {children(data)}
        </div>
        <Badge variant="outline" className="absolute top-0 right-0">
          Güncelleniyor...
        </Badge>
      </div>
    );
  } else if (queryResult.isError) {
    statusRole = "alert";
    content = (
      <div className="flex flex-1 flex-col items-start justify-center gap-4">
        <p className="text-sm text-muted-foreground">
          {title} yüklenemedi. Lütfen tekrar deneyin.
        </p>
        <Button
          onClick={() => void queryResult.refetch()}
          disabled={queryResult.isFetching}
        >
          {queryResult.isFetching ? "Yeniden deneniyor..." : "Tekrar dene"}
        </Button>
      </div>
    );
  } else if (queryResult.isSuccess && data !== undefined && isEmpty(data)) {
    statusRole = "status";
    content = renderEmpty ? (
      renderEmpty(data)
    ) : (
      <div className="flex flex-1 flex-col items-start justify-center gap-2">
        <p className="text-sm text-muted-foreground">
          Bu filtrelerle veri bulunamadı.
        </p>
        <p className="text-sm text-muted-foreground">
          Tarih aralığını genişletmeyi veya ürün, kalıp ya da makine
          filtrelerinden birini kaldırmayı deneyebilirsin.
        </p>
      </div>
    );
  } else if (queryResult.isSuccess && data !== undefined) {
    content = <>{children(data)}</>;
  } else {
    // Defensive fallback: TanStack Query's pending/error/success statuses
    // are mutually exclusive, so every real case is covered above.
    content = null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              <h2>{title}</h2>
            </CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent
        style={{ minHeight }}
        className="flex flex-col justify-center"
        aria-busy={isBusy}
        role={statusRole}
      >
        {content}
      </CardContent>
    </Card>
  );
}
