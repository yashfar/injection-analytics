"use client";

import type { FormEvent, Ref } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isDateOnlyWithinBounds,
  isValidDateOnly,
} from "@/lib/analytics-filters";
import { MACHINE_FILTER_TRIGGER_ID } from "@/lib/dashboard-element-ids";
import { cn } from "@/lib/utils";
import { useFiltersQuery } from "@/queries/analytics.queries";
import type { AnalyticsFilters } from "@/types/analytics";

// Shared "no restriction on this dimension" sentinel for all three
// independent selects (Radix Select rejects an actual empty-string value).
const ALL_FILTER_VALUE = "__all__";

function fromSelectValue(value: string): string | undefined {
  return value === ALL_FILTER_VALUE ? undefined : value;
}

// Base UI's SelectValue only resolves a human label once the matching
// SelectItem has mounted at least once (i.e. after the dropdown has been
// opened) — without this, a freshly loaded page shows the raw "__all__"
// sentinel instead of "Tümü" until the user opens a dropdown for the first
// time. Supplying children directly resolves the label immediately.
function resolveSelectDisplayValue(value: string): string {
  return value === ALL_FILTER_VALUE ? "Tümü" : value;
}

function isFiltersIdentical(
  draft: AnalyticsFilters,
  applied: AnalyticsFilters | null,
): boolean {
  if (applied === null) {
    return false;
  }

  return (
    draft.productCode === applied.productCode &&
    draft.castCode === applied.castCode &&
    draft.machine === applied.machine &&
    draft.startDate === applied.startDate &&
    draft.endDate === applied.endDate
  );
}

type DashboardFiltersProps = {
  draftFilters?: AnalyticsFilters;
  appliedFilters: AnalyticsFilters | null;
  dateMin: string;
  dateMax: string;
  onDraftFiltersChange: (filters: AnalyticsFilters) => void;
  onApply: () => void;
  onReset: () => void;
  machineFilterRef?: Ref<HTMLButtonElement>;
  isMachineFilterAttentionActive?: boolean;
  disabled?: boolean;
};

export function DashboardFilters({
  draftFilters,
  appliedFilters,
  dateMin,
  dateMax,
  onDraftFiltersChange,
  onApply,
  onReset,
  machineFilterRef,
  isMachineFilterAttentionActive = false,
  disabled = false,
}: DashboardFiltersProps) {
  const filtersQuery = useFiltersQuery();
  const productCodes = filtersQuery.data?.products ?? [];
  const castCodes = filtersQuery.data?.molds ?? [];
  const machines = filtersQuery.data?.machines ?? [];
  const isFiltersLoading = filtersQuery.isPending;
  const isSelectDisabled = disabled || isFiltersLoading || !draftFilters;

  const isStartDateValid = Boolean(
    draftFilters && isValidDateOnly(draftFilters.startDate),
  );
  const isEndDateValid = Boolean(
    draftFilters && isValidDateOnly(draftFilters.endDate),
  );
  const isDateOrderInvalid = Boolean(
    draftFilters &&
    isStartDateValid &&
    isEndDateValid &&
    draftFilters.startDate > draftFilters.endDate,
  );
  const isStartDateOutOfRange = Boolean(
    draftFilters &&
    isStartDateValid &&
    !isDateOnlyWithinBounds(
      draftFilters.startDate,
      dateMin || undefined,
      dateMax || undefined,
    ),
  );
  const isEndDateOutOfRange = Boolean(
    draftFilters &&
    isEndDateValid &&
    !isDateOnlyWithinBounds(
      draftFilters.endDate,
      dateMin || undefined,
      dateMax || undefined,
    ),
  );
  const hasInvalidCalendarDate = Boolean(
    draftFilters && (!isStartDateValid || !isEndDateValid),
  );
  const hasOutOfRangeDate = isStartDateOutOfRange || isEndDateOutOfRange;
  const dateValidationMessage = hasInvalidCalendarDate
    ? "Geçerli bir takvim tarihi girin."
    : isDateOrderInvalid
      ? "Başlangıç tarihi bitiş tarihinden sonra olamaz."
      : hasOutOfRangeDate
        ? `${dateMin} ile ${dateMax} arasındaki tarihleri seçin.`
        : !isFiltersLoading && (!dateMin || !dateMax)
          ? "Analiz tarih aralığı mevcut değil."
          : undefined;
  const isStartDateInvalid =
    Boolean(draftFilters) &&
    (!isStartDateValid || isDateOrderInvalid || isStartDateOutOfRange);
  const isEndDateInvalid =
    Boolean(draftFilters) &&
    (!isEndDateValid || isDateOrderInvalid || isEndDateOutOfRange);
  const hasValidDateRange =
    isStartDateValid &&
    isEndDateValid &&
    !isDateOrderInvalid &&
    !isStartDateOutOfRange &&
    !isEndDateOutOfRange;
  const canApply = Boolean(
    draftFilters &&
    !disabled &&
    hasValidDateRange &&
    !isFiltersIdentical(draftFilters, appliedFilters),
  );
  // Distinguishes "first apply" from "you have unapplied changes to
  // already-shown results" — the chip strip and charts still reflect
  // appliedFilters until this button is pressed again.
  const hasPendingChanges = Boolean(
    draftFilters &&
    appliedFilters !== null &&
    !isFiltersIdentical(draftFilters, appliedFilters),
  );

  function handleProductChange(value: string | null) {
    if (!draftFilters || value === null) {
      return;
    }

    onDraftFiltersChange({
      ...draftFilters,
      productCode: fromSelectValue(value),
    });
  }

  function handleCastChange(value: string | null) {
    if (!draftFilters || value === null) {
      return;
    }

    onDraftFiltersChange({
      ...draftFilters,
      castCode: fromSelectValue(value),
    });
  }

  function handleMachineChange(value: string | null) {
    if (!draftFilters || value === null) {
      return;
    }

    onDraftFiltersChange({
      ...draftFilters,
      machine: fromSelectValue(value),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canApply) {
      onApply();
    }
  }

  if (filtersQuery.isError) {
    return (
      <Card className="sticky top-3 z-10 shadow-md">
        <CardHeader>
          <CardTitle>
            <h2>Analiz Filtreleri</h2>
          </CardTitle>
          <CardDescription>Filtre seçenekleri yüklenemedi.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={() => void filtersQuery.refetch()}
            disabled={filtersQuery.isFetching}
          >
            {filtersQuery.isFetching ? "Yeniden deneniyor..." : "Tekrar dene"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-3 z-10 shadow-md">
      <CardHeader>
        <CardTitle>
          <h2>Analiz Filtreleri</h2>
        </CardTitle>
        <CardDescription>
          Ürün, kalıp ve makine filtreleri birbirinden bağımsızdır.
        </CardDescription>
        <CardAction>
          <Link
            href="/comparison"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Karşılaştırma görünümü
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="product-filter">Ürün</Label>
            {isFiltersLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={
                  draftFilters?.productCode ?? ALL_FILTER_VALUE
                }
                onValueChange={handleProductChange}
                disabled={isSelectDisabled}
              >
                <SelectTrigger id="product-filter" className="w-full">
                  <SelectValue placeholder="Ürün seçin">
                    {resolveSelectDisplayValue}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Tümü</SelectItem>
                  {productCodes.map((productCode) => (
                    <SelectItem key={productCode} value={productCode}>
                      {productCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="mold-filter">Kalıp</Label>
            {isFiltersLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={
                  draftFilters?.castCode ?? ALL_FILTER_VALUE
                }
                onValueChange={handleCastChange}
                disabled={isSelectDisabled}
              >
                <SelectTrigger id="mold-filter" className="w-full">
                  <SelectValue placeholder="Kalıp seçin">
                    {resolveSelectDisplayValue}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Tümü</SelectItem>
                  {castCodes.map((castCode) => (
                    <SelectItem key={castCode} value={castCode}>
                      {castCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor={MACHINE_FILTER_TRIGGER_ID}>Makine</Label>
            {isFiltersLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={
                  draftFilters?.machine ?? ALL_FILTER_VALUE
                }
                onValueChange={handleMachineChange}
                disabled={isSelectDisabled}
              >
                <SelectTrigger
                  ref={machineFilterRef}
                  id={MACHINE_FILTER_TRIGGER_ID}
                  data-attention={isMachineFilterAttentionActive}
                  className={cn(
                    "w-full scroll-m-6",
                    "data-[attention=true]:border-primary data-[attention=true]:ring-3 data-[attention=true]:ring-primary/40",
                    "motion-safe:data-[attention=true]:animate-pulse",
                  )}
                >
                  <SelectValue placeholder="Makine seçin">
                    {resolveSelectDisplayValue}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Tümü</SelectItem>
                  {machines.map((machine) => (
                    <SelectItem key={machine} value={machine}>
                      {machine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="start-date-filter">Başlangıç Tarihi</Label>
            <Input
              id="start-date-filter"
              type="date"
              min={dateMin || undefined}
              max={dateMax || undefined}
              value={draftFilters?.startDate ?? ""}
              onChange={(event) => {
                if (draftFilters) {
                  onDraftFiltersChange({
                    ...draftFilters,
                    startDate: event.target.value,
                  });
                }
              }}
              disabled={disabled || !draftFilters}
              aria-invalid={isStartDateInvalid}
              aria-describedby={
                isStartDateInvalid ? "date-filter-validation" : undefined
              }
            />
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="end-date-filter">Bitiş Tarihi</Label>
            <Input
              id="end-date-filter"
              type="date"
              min={dateMin || undefined}
              max={dateMax || undefined}
              value={draftFilters?.endDate ?? ""}
              onChange={(event) => {
                if (draftFilters) {
                  onDraftFiltersChange({
                    ...draftFilters,
                    endDate: event.target.value,
                  });
                }
              }}
              disabled={disabled || !draftFilters}
              aria-invalid={isEndDateInvalid}
              aria-describedby={
                isEndDateInvalid ? "date-filter-validation" : undefined
              }
            />
          </div>

          <div className="flex items-end gap-2 lg:col-span-1">
            <Button type="submit" className="w-full" disabled={!canApply}>
              {hasPendingChanges
                ? "Değişiklikleri Uygula"
                : "Filtreleri Uygula"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={isSelectDisabled}
            >
              Sıfırla
            </Button>
          </div>

          {dateValidationMessage ? (
            <p
              id="date-filter-validation"
              role="alert"
              className="text-sm text-destructive sm:col-span-2 lg:col-span-6"
            >
              {dateValidationMessage}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
