import { formatShortDate } from "@/lib/analytics-formatters";
import type { AnalyticsFilters } from "@/types/analytics";

export type EmptyReasonFilterKey = "productCode" | "castCode" | "machine";

export type EmptyReasonAction =
  | {
      kind: "clearFilter";
      filterKey: EmptyReasonFilterKey;
      label: string;
    }
  | {
      kind: "widenDateRange";
      label: string;
      startDate: string;
      endDate: string;
    };

export type EmptyReason = {
  message: string;
  actions: EmptyReasonAction[];
};

export type DatasetBounds = {
  startDate: string | null;
  endDate: string | null;
};

const FILTER_LABELS: Record<EmptyReasonFilterKey, string> = {
  productCode: "Ürün",
  castCode: "Kalıp",
  machine: "Makine",
};

function describeFilterValue(key: EmptyReasonFilterKey, value: string): string {
  switch (key) {
    case "productCode":
      return `${value} ürünü`;
    case "castCode":
      return `${value} kalıbı`;
    case "machine":
      return `${value} makinesi`;
  }
}

function clearFilterAction(key: EmptyReasonFilterKey): EmptyReasonAction {
  return {
    kind: "clearFilter",
    filterKey: key,
    label: `${FILTER_LABELS[key]} filtresini kaldır`,
  };
}

function widenDateRangeAction(
  bounds: DatasetBounds,
): EmptyReasonAction | null {
  if (bounds.startDate === null || bounds.endDate === null) {
    return null;
  }

  return {
    kind: "widenDateRange",
    label: "Tarih aralığını genişlet",
    startDate: bounds.startDate,
    endDate: bounds.endDate,
  };
}

// Single source of truth for "why is this empty" copy, used by both the
// page-level empty state and every individual chart's empty state (via
// AnalysisChartShell's renderEmpty), so the reason is always consistent
// regardless of where it's shown.
export function getEmptyReason(
  appliedFilters: AnalyticsFilters,
  datasetBounds: DatasetBounds,
): EmptyReason {
  if (appliedFilters.startDate > appliedFilters.endDate) {
    return {
      message:
        "Bitiş tarihi başlangıç tarihinden önce. Tarih aralığını düzeltin.",
      actions: [],
    };
  }

  const selected: { key: EmptyReasonFilterKey; value: string }[] = [];

  if (appliedFilters.productCode) {
    selected.push({ key: "productCode", value: appliedFilters.productCode });
  }

  if (appliedFilters.castCode) {
    selected.push({ key: "castCode", value: appliedFilters.castCode });
  }

  if (appliedFilters.machine) {
    selected.push({ key: "machine", value: appliedFilters.machine });
  }

  if (selected.length === 3) {
    return {
      message:
        "Seçilen ürün, kalıp ve makine bu tarih aralığında birlikte hiç üretim yapmamış.",
      actions: selected.map((item) => clearFilterAction(item.key)),
    };
  }

  if (selected.length === 1 || selected.length === 2) {
    const phrase = selected
      .map((item) => describeFilterValue(item.key, item.value))
      .join(" ve ");
    const message =
      selected.length === 1
        ? `${phrase} bu tarih aralığında kayıt üretmemiş.`
        : `${phrase} bu tarih aralığında birlikte kayıt üretmemiş.`;
    const widenAction = widenDateRangeAction(datasetBounds);

    return {
      message,
      actions: [
        ...selected.map((item) => clearFilterAction(item.key)),
        ...(widenAction ? [widenAction] : []),
      ],
    };
  }

  const hasBounds = datasetBounds.startDate !== null && datasetBounds.endDate !== null;
  const formattedStart = hasBounds
    ? formatShortDate(datasetBounds.startDate as string)
    : null;
  const formattedEnd = hasBounds
    ? formatShortDate(datasetBounds.endDate as string)
    : null;
  const boundsText =
    formattedStart && formattedEnd
      ? ` Kayıtlar ${formattedStart} – ${formattedEnd} arasında.`
      : "";
  const widenAction = widenDateRangeAction(datasetBounds);

  return {
    message: `Bu tarih aralığında hiç üretim kaydı yok.${boundsText}`,
    actions: widenAction ? [widenAction] : [],
  };
}
