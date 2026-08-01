import { X } from "lucide-react";

import type { AnalyticsFilters } from "@/types/analytics";

type ChipDefinition = {
  key: "productCode" | "castCode" | "machine";
  label: string;
};

type AppliedFiltersChipsProps = {
  appliedFilters: AnalyticsFilters;
  onRemoveFilter?: (filterKey: "productCode" | "castCode" | "machine") => void;
};

// Always reflects appliedFilters, never draftFilters — this is the strip
// that tells the user what's actually driving the charts on screen right
// now, independent of whatever is currently selected in the filter bar.
export function AppliedFiltersChips({
  appliedFilters,
  onRemoveFilter,
}: AppliedFiltersChipsProps) {
  const chips: ChipDefinition[] = [];

  chips.push({
    key: "productCode",
    label: `Ürün: ${appliedFilters.productCode ?? "Tümü"}`,
  });
  chips.push({
    key: "castCode",
    label: `Kalıp: ${appliedFilters.castCode ?? "Tümü"}`,
  });
  chips.push({
    key: "machine",
    label: `Makine: ${appliedFilters.machine ?? "Tümü"}`,
  });

  return (
    <div
      role="list"
      aria-label="Uygulanan filtreler"
      className="flex items-center gap-2 overflow-x-auto pb-1"
    >
      <span
        role="listitem"
        className="shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium whitespace-nowrap text-foreground"
      >
        {appliedFilters.startDate} – {appliedFilters.endDate}
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          role="listitem"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted py-1 pr-1 pl-3 text-xs font-medium whitespace-nowrap text-foreground"
        >
          {chip.label}
          {onRemoveFilter ? (
            <button
              type="button"
              onClick={() => onRemoveFilter(chip.key)}
              aria-label={`${chip.label} filtresini kaldır`}
              className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}
