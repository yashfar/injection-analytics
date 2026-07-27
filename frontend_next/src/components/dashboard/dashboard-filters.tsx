"use client";

import type { FormEvent, Ref } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
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
import {
  areAnalyticsFiltersValid,
  getUniqueProductCodes,
  getValidCastCodes,
  getValidMachines,
  isDateOnlyWithinBounds,
  isValidDateOnly,
} from "@/lib/analytics-filters";
import { MACHINE_FILTER_TRIGGER_ID } from "@/lib/dashboard-element-ids";
import { cn } from "@/lib/utils";
import type {
  AnalyticsComparablePair,
  AnalyticsFilters,
} from "@/types/analytics";

const ALL_MACHINES_VALUE = "__all__";

type DashboardFiltersProps = {
  comparablePairs: AnalyticsComparablePair[];
  draftFilters?: AnalyticsFilters;
  dateMin: string;
  dateMax: string;
  onDraftFiltersChange: (filters: AnalyticsFilters) => void;
  onApply: () => void;
  machineFilterRef?: Ref<HTMLButtonElement>;
  isMachineFilterAttentionActive?: boolean;
  disabled?: boolean;
};

export function DashboardFilters({
  comparablePairs,
  draftFilters,
  dateMin,
  dateMax,
  onDraftFiltersChange,
  onApply,
  machineFilterRef,
  isMachineFilterAttentionActive = false,
  disabled = false,
}: DashboardFiltersProps) {
  const productCodes = getUniqueProductCodes(comparablePairs);
  const castCodes = draftFilters
    ? getValidCastCodes(comparablePairs, draftFilters.productCode)
    : [];
  const machines = draftFilters
    ? getValidMachines(
        comparablePairs,
        draftFilters.productCode,
        draftFilters.castCode,
      )
    : [];
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
  const hasOutOfRangeDate =
    isStartDateOutOfRange || isEndDateOutOfRange;
  const dateValidationMessage = hasInvalidCalendarDate
    ? "Geçerli bir takvim tarihi girin."
    : isDateOrderInvalid
      ? "Başlangıç tarihi bitiş tarihinden sonra olamaz."
      : hasOutOfRangeDate
        ? `${dateMin} ile ${dateMax} arasındaki tarihleri seçin.`
        : undefined;
  const isStartDateInvalid =
    Boolean(draftFilters) &&
    (!isStartDateValid || isDateOrderInvalid || isStartDateOutOfRange);
  const isEndDateInvalid =
    Boolean(draftFilters) &&
    (!isEndDateValid || isDateOrderInvalid || isEndDateOutOfRange);
  const canApply = Boolean(
    draftFilters &&
      !disabled &&
      areAnalyticsFiltersValid(
        draftFilters,
        comparablePairs,
        dateMin || undefined,
        dateMax || undefined,
      ),
  );

  function handleProductChange(productCode: string | null) {
    if (!draftFilters || !productCode) {
      return;
    }

    const castCode = getValidCastCodes(comparablePairs, productCode)[0];

    if (!castCode) {
      return;
    }

    onDraftFiltersChange({
      ...draftFilters,
      productCode,
      castCode,
      machine: undefined,
    });
  }

  function handleCastChange(castCode: string | null) {
    if (!draftFilters || !castCode) {
      return;
    }

    onDraftFiltersChange({
      ...draftFilters,
      castCode,
      machine: undefined,
    });
  }

  function handleMachineChange(machineValue: string | null) {
    if (!draftFilters || !machineValue) {
      return;
    }

    onDraftFiltersChange({
      ...draftFilters,
      machine:
        machineValue === ALL_MACHINES_VALUE ? undefined : machineValue,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canApply) {
      onApply();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Analiz Filtreleri</h2>
        </CardTitle>
        <CardDescription>
          Grafik analizleri için karşılaştırılabilir bir ürün ve kalıp
          kombinasyonu seçin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="product-filter">Ürün</Label>
            <Select
              value={draftFilters?.productCode}
              onValueChange={handleProductChange}
              disabled={disabled || productCodes.length === 0}
            >
              <SelectTrigger id="product-filter" className="w-full">
                <SelectValue placeholder="Ürün seçin" />
              </SelectTrigger>
              <SelectContent>
                {productCodes.map((productCode) => (
                  <SelectItem key={productCode} value={productCode}>
                    {productCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="mold-filter">Kalıp</Label>
            <Select
              value={draftFilters?.castCode}
              onValueChange={handleCastChange}
              disabled={disabled || castCodes.length === 0}
            >
              <SelectTrigger id="mold-filter" className="w-full">
                <SelectValue placeholder="Kalıp seçin" />
              </SelectTrigger>
              <SelectContent>
                {castCodes.map((castCode) => (
                  <SelectItem key={castCode} value={castCode}>
                    {castCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor={MACHINE_FILTER_TRIGGER_ID}>Makine</Label>
            <Select
              value={
                draftFilters
                  ? (draftFilters.machine ?? ALL_MACHINES_VALUE)
                  : undefined
              }
              onValueChange={handleMachineChange}
              disabled={disabled || machines.length === 0}
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
                <SelectValue placeholder="Makine seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MACHINES_VALUE}>
                  Tüm makineler
                </SelectItem>
                {machines.map((machine) => (
                  <SelectItem key={machine} value={machine}>
                    {machine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="start-date-filter">Başlangıç Tarihi</Label>
            <Input
              id="start-date-filter"
              type="date"
              min={dateMin || undefined}
              max={dateMax || undefined}
              value={draftFilters?.startDate ?? dateMin}
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
              value={draftFilters?.endDate ?? dateMax}
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

          <div className="flex items-end lg:col-span-1">
            <Button type="submit" className="w-full" disabled={!canApply}>
              Filtreleri Uygula
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
